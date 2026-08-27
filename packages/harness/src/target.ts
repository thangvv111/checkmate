import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface FileNgoaiTamNhin {
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
  ngoaiTamNhin: FileNgoaiTamNhin[];
  specs: Array<{ file: string; noiDung: string }>;
  apiDoc: string;
  testMau: string;
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
export function dungDiff(
  dsFile: string[],
  diffTungFile: (file: string) => string,
  boQuaThem: RegExp[] = [],
  tran = TRAN_DIFF,
): { diff: string; ngoaiTamNhin: FileNgoaiTamNhin[] } {
  const ngoaiTamNhin: FileNgoaiTamNhin[] = [];
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

export function docTarget(repo: string, branch: string, base = 'main', boQuaThem: RegExp[] = []): TargetInfo {
  const branchSha = git(repo, ['rev-parse', branch]);
  const baseSha = git(repo, ['rev-parse', base]);
  const dsFile = git(repo, ['diff', '--name-only', `${base}...${branch}`]).split('\n').filter(Boolean);
  const { diff, ngoaiTamNhin } = dungDiff(dsFile, (f) => git(repo, ['diff', `${base}...${branch}`, '--', f]), boQuaThem);
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

  return { repo, branch, base, branchSha, baseSha, diff, ngoaiTamNhin, specs, apiDoc, testMau };
}
