import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface FileOutOfView {
  file: string;
  kyTu: number;
  lyDo: string;
}

export interface TargetInfo {
  repo: string;
  branch: string;
  base: string;
  branchSha: string;
  baseSha: string;
  diff: string;
  /** File có trong PR nhưng KHÔNG nằm trong diff mà model nhìn thấy — phải nói ra, không được giấu */
  ngoaiTamNhin: FileOutOfView[];
  specs: Array<{ file: string; noiDung: string }>;
  /**
   * Mã luật CHỈ có ở nhánh PR (R1.19). Probe neo vào những mã này KHÔNG được lấy nhánh gốc làm đối
   * chứng: luật chưa tồn tại ở đó thì «cũng đỏ ở gốc» không nói lên điều gì về phạm vi của PR.
   */
  luatMoi: string[];
  apiDoc: string;
  testMau: string;
}

/**
 * Lỗi nạp probe kiểu `Cannot find module '../apps/web/src/di-tru.js'` nói ĐÚNG rằng module không có,
 * nhưng KHÔNG nói đường đúng nằm đâu — nên lượt sinh lại đoán tiếp và trượt tiếp. Đo được ở chính repo
 * này: hai lượt sinh liên tiếp cùng chết vì một đường dẫn lệch đúng MỘT thư mục (`src/` vs `src/kho/`).
 *
 * Engine thì biết repo có file gì. Tra ra rồi đưa thẳng cho model là chênh lệch giữa sửa được và không —
 * cùng nguyên tắc đã áp cho JSON hỏng: đưa CHỖ HỎNG chứ đừng chỉ nói "hỏng".
 */
export function suggestModulePath(loi: string, repo: string): string {
  const thieu = [...new Set([...loi.matchAll(/Cannot find module '([^']+)'/g)].map((m) => m[1]))];
  if (!thieu.length) return '';
  let dsFile: string[];
  try {
    dsFile = git(repo, ['ls-files', '*.ts']).split('\n').filter(Boolean);
  } catch {
    return '';
  }
  const dong = thieu.map((duong) => {
    const ten = duong.split('/').pop()!.replace(/\.(js|ts)$/, '');
    const khop = dsFile.filter((f) => f.endsWith(`/${ten}.ts`) || f === `${ten}.ts`);
    if (!khop.length) {
      return `  '${duong}' KHÔNG có thật, và repo cũng KHÔNG có file nào tên '${ten}'. Hàm bạn định gọi nằm ở module khác — đọc lại bảng đường dẫn trong hợp đồng repo.`;
    }
    const dung = khop.map((f) => `'../${f.replace(/\.ts$/, '.js')}'`).join(' hoặc ');
    return `  '${duong}' KHÔNG có thật. Đường ĐÚNG (tính từ thư mục test/): ${dung}`;
  });
  return `\n\nĐƯỜNG DẪN MODULE SAI — SỬA ĐÚNG NHỮNG DÒNG NÀY:\n${dong.join('\n')}\n`;
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}

// Trần kích thước diff đưa vào prompt. Vượt trần thì model không trả lời nổi và lượt chấm chết vì
// timeout sau hai lần thử — mất mười phút để nhận một thông báo không nói được nguyên nhân.
const TRAN_DIFF = 120_000;

// File sinh tự động: có mặt trong PR nhưng đọc chúng không nói lên điều gì về hành vi phần mềm,
// trong khi chúng chiếm phần lớn ngân sách prompt. Repo khai thêm mẫu riêng qua checkmate.yml.
const MAU_SINH_TU_DONG: Array<[RegExp, string]> = [
  [/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Gemfile\.lock|composer\.lock|go\.sum|Cargo\.lock)$/, 'lockfile sinh tự động'],
  [/\.min\.(js|css)$/, 'file đã minify'],
  [/\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|otf|mp4|mov)$/i, 'file nhị phân'],
  [/(^|\/)(dist|build|coverage|node_modules)\//, 'thư mục sinh khi build'],
];

function lyDoSinhTuDong(file: string, boQuaThem: RegExp[]): string | null {
  for (const [mau, lyDo] of MAU_SINH_TU_DONG) if (mau.test(file)) return lyDo;
  for (const mau of boQuaThem) if (mau.test(file)) return 'repo khai bỏ qua trong checkmate.yml';
  return null;
}

/**
 * Dựng diff cho prompt: bỏ file sinh tự động, rồi kẹp vào trần kích thước.
 * Nguyên tắc: KHÔNG cắt âm thầm. Mọi file bị bỏ đều trả về trong `ngoaiTamNhin` để log và prompt
 * nói thẳng ra — một checker cắt bớt trong im lặng sẽ ra PASS trên phần nó chưa từng nhìn thấy.
 */
/**
 * Trích mọi mã luật khai trong một tập văn bản spec. Nhận cả dạng `R4.21` lẫn `R4` — repo đích có thể
 * đánh số theo mục con hoặc chỉ theo file.
 */
export function extractRuleIds(vanBan: string): Set<string> {
  const ra = new Set<string>();
  for (const m of vanBan.matchAll(/\b([A-Z]{1,3}\d{1,3}(?:\.\d{1,3})?)\b/g)) ra.add(m[1]);
  return ra;
}

/**
 * R1.19 — luật chỉ có ở nhánh PR, tìm bằng cách so `specs/` hai nhánh.
 *
 * Đọc spec của nhánh gốc bằng `git show`, không bằng cách đọc đĩa: cây làm việc đang ở nhánh PR, nên
 * đọc đĩa sẽ ra chính spec của nhánh PR và phép so thành vô nghĩa.
 *
 * Fail-closed: không đọc được spec nhánh gốc (nhánh gốc chưa có thư mục `specs/`, hay lệnh git hỏng)
 * thì coi như MỌI luật đều mới. Thà chặn một PR đáng ra qua được, còn hơn cho qua một PR khai luật rồi
 * vi phạm ngay luật vừa khai.
 */
export function findNewRules(repo: string, base: string, specsPr: Array<{ file: string; noiDung: string }>): string[] {
  // Danh sách spec méo (khuyết, không phải mảng, phần tử lạ) KHÔNG được làm hàm ném: nó nằm trên
  // đường quyết định nhãn `vi_pham_luat_moi`, và ném ở đây là cả lượt chấm chết thay vì rơi về
  // «không có luật mới» — hướng an toàn (quan sát ngoài phạm vi P6 của cổng).
  const ds = Array.isArray(specsPr) ? specsPr : [];
  // ÉP KIỂU, không NUỐT: bản vá trước biến mọi thứ không-phải-string thành rỗng, nên nội dung spec ở
  // dạng Buffer/String-object bị mất sạch và mã luật biến mất cùng nhãn chặn merge — vá «không ném»
  // bằng cách đánh rơi dữ liệu thật (vòng bảy của cổng bắt). Nhánh gốc dùng join() nên vẫn ép được.
  const maPr = extractRuleIds(ds.map((x) => (x?.noiDung == null ? '' : String(x.noiDung))).join('\n'));
  if (maPr.size === 0) return [];
  let vanBanGoc = '';
  try {
    const ds = git(repo, ['ls-tree', '-r', '--name-only', base, 'specs/'])
      .split('\n')
      .map((x) => x.trim())
      .filter((x) => x.endsWith('.md'));
    if (ds.length === 0) return [...maPr]; // nhánh gốc chưa có spec — mọi luật đều mới
    vanBanGoc = ds.map((f) => git(repo, ['show', `${base}:${f}`])).join('\n');
  } catch {
    return [...maPr]; // không so được thì fail-closed
  }
  const maGoc = extractRuleIds(vanBanGoc);
  return [...maPr].filter((m) => !maGoc.has(m));
}


export function buildDiff(
  dsFile: string[],
  diffTungFile: (file: string) => string,
  boQuaThem: RegExp[] = [],
  tran = TRAN_DIFF,
): { diff: string; ngoaiTamNhin: FileOutOfView[] } {
  const ngoaiTamNhin: FileOutOfView[] = [];
  const conLai: Array<{ file: string; noiDung: string }> = [];

  for (const file of dsFile) {
    const noiDung = diffTungFile(file);
    const lyDo = lyDoSinhTuDong(file, boQuaThem);
    if (lyDo) ngoaiTamNhin.push({ file, kyTu: noiDung.length, lyDo });
    else conLai.push({ file, noiDung });
  }

  // Còn vượt trần thì ưu tiên giữ file NHỎ — giữ được nhiều file nhất, tức nhiều bề mặt hành vi nhất.
  // File to bị loại được nêu tên rõ ràng chứ không biến mất.
  conLai.sort((a, b) => a.noiDung.length - b.noiDung.length);
  const giu: Array<{ file: string; noiDung: string }> = [];
  let tong = 0;
  for (const f of conLai) {
    if (tong + f.noiDung.length > tran && giu.length > 0) {
      ngoaiTamNhin.push({ file: f.file, kyTu: f.noiDung.length, lyDo: 'vượt trần kích thước diff' });
      continue;
    }
    giu.push(f);
    tong += f.noiDung.length;
  }

  const thuTuGoc = new Map(dsFile.map((f, i) => [f, i]));
  giu.sort((a, b) => (thuTuGoc.get(a.file) ?? 0) - (thuTuGoc.get(b.file) ?? 0));
  return { diff: giu.map((f) => f.noiDung).join('\n'), ngoaiTamNhin };
}

export function readTarget(repo: string, branch: string, base = 'main', boQuaThem: RegExp[] = []): TargetInfo {
  const branchSha = git(repo, ['rev-parse', branch]);
  const baseSha = git(repo, ['rev-parse', base]);
  const dsFile = git(repo, ['diff', '--name-only', `${base}...${branch}`]).split('\n').filter(Boolean);
  const { diff, ngoaiTamNhin } = buildDiff(dsFile, (f) => git(repo, ['diff', `${base}...${branch}`, '--', f]), boQuaThem);
  if (!diff) {
    throw new Error(
      ngoaiTamNhin.length
        ? `Diff giữa ${base} và ${branch} chỉ gồm file sinh tự động (${ngoaiTamNhin.map((x) => x.file).join(', ')}) — không có hành vi nào để chấm`
        : `Diff rỗng giữa ${base} và ${branch}`,
    );
  }

  const specsDir = join(repo, 'specs');
  const specs = existsSync(specsDir)
    ? readdirSync(specsDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({ file: `specs/${f}`, noiDung: readFileSync(join(specsDir, f), 'utf8') }))
    : [];

  // R1.19 — luật nào CHỈ có ở nhánh PR. Xác định bằng cách so `specs/` giữa hai nhánh, không hỏi model.
  const luatMoi = findNewRules(repo, base, specs);

  const apiDoc = existsSync(join(repo, 'README.md')) ? readFileSync(join(repo, 'README.md'), 'utf8') : '';

  // File test sẵn có làm khuôn import/inject cho probe sinh ra
  const testDir = join(repo, 'test');
  let testMau = '';
  if (existsSync(testDir)) {
    // file test mẫu: ưu tiên .test.ts (đường mặc định), rồi mọi file test khác — repo đa stack (B4.5)
    const ds = readdirSync(testDir).sort();
    const f = ds.find((x) => x.endsWith('.test.ts')) ?? ds.find((x) => /test/i.test(x) && !x.startsWith('checker.probe'));
    if (f) testMau = readFileSync(join(testDir, f), 'utf8');
  }

  return { repo, branch, base, branchSha, baseSha, diff, ngoaiTamNhin, specs, luatMoi, apiDoc, testMau };
}
