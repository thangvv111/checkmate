import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, readFileSync, rmSync, rmdirSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export interface ProbeResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  file: string; // basename file probe — nhiều bộ probe (mới + thư viện) chạy chung một lượt
}

/**
 * Một file probe KHÔNG NẠP ĐƯỢC — không import/parse được, nên không đóng góp phép thử nào.
 *
 * ⛔ Đây là **nguyên nhân DUY NHẤT** được phép kích hoạt cách ly (PO chốt 05/09). Nó KHÔNG bao gồm:
 * probe chạy lâu / làm treo lệnh test (đường `treo` riêng, và đó là bằng chứng về code đích), probe fail,
 * probe flaky, hay probe làm verdict xấu đi. Nới danh sách ấy là hạ tiêu chuẩn của cổng.
 */
export interface LoadFailure {
  file: string;
  ly_do: string;
}

export interface VitestResult {
  ok: boolean;
  tongTest: number;
  probes: ProbeResult[];
  loiThu: string; // lỗi thu thập/biên dịch nếu có
  treo?: boolean; // C7: lệnh test vượt timeout (PR có thể chứa vòng lặp vô hạn)
  /**
   * File không nạp được, quy về TỪNG file. Rỗng KHÔNG có nghĩa là mọi file đều nạp được — nó cũng có
   * nghĩa là **không quy được về file nào** (bộ chạy chết trước khi ghi kết quả). Hai ca ấy khác nhau, và
   * bên gọi phân biệt chúng bằng `ok`: `ok=false` + `loiNap` rỗng = không biết gì, đừng đoán.
   */
  loiNap?: LoadFailure[];
}

// S2: code PR chạy trong sandbox KHÔNG được thấy secrets của checker (API key, token GitHub).
// Allowlist tối thiểu cho Windows + Node toolchain; thiếu biến nào thì test hợp lệ sẽ lộ ra ngay khi chạy thử.
const ENV_CHO_PHEP = [
  'PATH', 'PATHEXT', 'COMSPEC', 'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'OS',
  'TEMP', 'TMP', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'HOME',
  'APPDATA', 'LOCALAPPDATA', 'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432',
  'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'USERNAME', 'COMPUTERNAME', 'LANG', 'LC_ALL',
  'NODE', 'NODE_PATH', 'NPM_CONFIG_CACHE', 'PYTHONIOENCODING', 'VIRTUAL_ENV', 'JAVA_HOME', 'MAVEN_HOME', 'GRADLE_HOME',
];
/**
 * Môi trường cho tiến trình chạy TEST — nơi code của pull request chạy THẬT, nên phải coi nó là code
 * không tin được.
 *
 * Danh sách CHO PHÉP, không bao giờ danh sách cấm: danh sách cấm đòi người viết biết trước mọi bí mật sẽ
 * tồn tại trong tương lai, nên thêm một khoá vào file môi trường là rò thêm một bí mật mà không ai phải
 * sửa code — không ai nhận ra. Nhận `nguon` để lưới gọi được với môi trường dựng sẵn.
 */
export function envSandbox(nguon: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const ra: NodeJS.ProcessEnv = { CI: 'true' };
  for (const k of Object.keys(nguon)) {
    if (ENV_CHO_PHEP.includes(k.toUpperCase())) ra[k] = nguon[k];
  }
  return ra;
}

// C7: spawnSync timeout trên Windows chỉ giết cmd vỏ — dọn cây tiến trình con best-effort
function donCayTienTrinh(pid: number | undefined): void {
  if (!pid || process.platform !== 'win32') return;
  try { spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { encoding: 'utf8', timeout: 15_000 }); } catch { /* best-effort */ }
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

/**
 * File probe không nạp được (lỗi import, lỗi cú pháp) thì bộ chạy vẫn xuất JUnit XML hợp lệ, nhưng bên
 * trong chỉ có ĐÚNG MỘT testcase mang tên chính file đó và mang trạng thái failed. Đếm nó như một test
 * đã chạy là tự báo xanh trên một lượt chưa chạy gì — nhận ra và trả về nguyên nhân thay vì đếm.
 * Trả về thông điệp lỗi nếu đúng là ca này, null nếu file chạy bình thường.
 */
export function fileLoadError(probes: ProbeResult[], duongDanRel: string): string | null {
  if (probes.length !== 1) return null;
  const p = probes[0];
  if (p.status !== 'failed') return null;
  const ten = duongDanRel.replace(/\\/g, '/');
  const title = p.title.replace(/\\/g, '/').trim();
  if (title !== ten && title !== (ten.split('/').pop() ?? ten)) return null;
  return p.message.trim() || 'bộ chạy test không nói lý do';
}

/**
 * Nhận diện file KHÔNG NẠP ĐƯỢC từ kết quả thô của vitest — hàm THUẦN.
 *
 * ⛔ Nhận diện bằng HÌNH DẠNG kết quả (`assertionResults` rỗng + có `message`), KHÔNG bắt chuỗi lời văn
 * lỗi. Lời văn ấy đến từ Node, từ vitest, và từ chính code repo đích: nó đổi theo phiên bản, và nó là
 * **dữ liệu ngoài** (⛔C4). Một repo đích cố ý in ra chuỗi giống lỗi nạp sẽ tự chọn được phép thử nào bị
 * gỡ khỏi lượt chấm của chính nó.
 *
 * File test RỖNG (không assert nào, cũng không lỗi) KHÔNG phải lỗi nạp — nó nạp được, chỉ là không có gì.
 */
export function detectLoadFailures(testResults: unknown): LoadFailure[] {
  if (!Array.isArray(testResults)) return [];
  const ra: LoadFailure[] = [];
  for (const tr of testResults) {
    const o = (tr ?? {}) as { name?: unknown; message?: unknown; assertionResults?: unknown };
    const msg = typeof o.message === 'string' ? o.message.trim() : '';
    const coTest = Array.isArray(o.assertionResults) && o.assertionResults.length > 0;
    if (coTest || !msg) continue;
    const ten = typeof o.name === 'string' ? o.name : '';
    ra.push({ file: ten.replace(/\\/g, '/').split('/').pop() ?? '', ly_do: msg });
  }
  return ra;
}

export class Sandbox {
  readonly dir: string;

  constructor(
    private readonly repo: string,
    sha: string,
  ) {
    this.dir = mkdtempSync(join(tmpdir(), 'checker-sb-'));
    git(repo, ['worktree', 'add', '--detach', this.dir, sha]);
    // Dùng chung node_modules của repo đích qua junction (repo không phải Node thì bỏ qua).
    // ⚠ ĐÍCH PHẢI TUYỆT ĐỐI. Gọi checker với `--repo .` thì đích thành 'node_modules' tương đối, và
    // junction trỏ ngược vào chính thư mục sandbox — hỏng mà KHÔNG báo lỗi. Hậu quả rất khó lần: npx
    // vẫn chạy được vitest (nó tự tải về cache) nên nhìn như đang chạy bình thường, nhưng mọi `import`
    // gói từ trong worktree đều "Cannot find package", cả file probe lẫn file cấu hình của repo.
    const nm = resolve(repo, 'node_modules');
    if (existsSync(nm)) symlinkSync(nm, join(this.dir, 'node_modules'), 'junction');
  }

  ghiProbe(code: string, ten = 'checker.probe.test.ts', thuMuc = 'test'): string {
    const rel = join(thuMuc, ten);
    mkdirSync(join(this.dir, thuMuc), { recursive: true });
    writeFileSync(join(this.dir, rel), code, 'utf8');
    return rel;
  }

  chayVitest(testFilesRel: string | string[]): VitestResult {
    const files = (Array.isArray(testFilesRel) ? testFilesRel : [testFilesRel]).map((f) => f.replace(/\\/g, '/'));
    const outFile = join(this.dir, 'vitest-out.json');
    const kq = spawnSync('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile="${outFile}"`], {
      cwd: this.dir,
      shell: true,
      encoding: 'utf8',
      timeout: 300_000,
      env: envSandbox(),
    });
    if ((kq.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' || kq.signal) {
      donCayTienTrinh(kq.pid);
      // ⛔ Đường TREO trả về KHÔNG kèm `loiNap` — có chủ đích, và đây là ranh giới PO chốt 05/09.
      // «Chạy lâu» không phải «không nạp được»: nó là bằng chứng về code đích và đã có finding riêng (C7).
      // Nhét file vào `loiNap` ở đây là để một PR làm treo test tự gỡ được phép thử bắt nó.
      return { ok: false, tongTest: 0, probes: [], loiThu: `TIMEOUT: lệnh test không kết thúc trong 300s — PR có thể chứa vòng lặp vô hạn/treo I/O`, treo: true };
    }
    if (!existsSync(outFile)) {
      return { ok: false, tongTest: 0, probes: [], loiThu: (kq.stderr || kq.stdout || 'vitest không ra output').slice(0, 2000) };
    }
    const data = JSON.parse(readFileSync(outFile, 'utf8')) as {
      numTotalTests: number;
      testResults: Array<{
        name?: string;
        message?: string;
        assertionResults: Array<{ title: string; status: string; failureMessages: string[] }>;
      }>;
    };
    // ⛔ Nhận diện lỗi nạp bằng HÌNH DẠNG kết quả, KHÔNG bắt chuỗi lời văn lỗi.
    //
    // Một file không nạp được xuất hiện thành một mục `testResults` có `message` và `assertionResults`
    // RỖNG — không phép thử nào thu được. Đó là dấu hiệu cấu trúc.
    //
    // Vì sao không dò `Cannot find module` / `SyntaxError`: lời văn ấy đến từ Node, từ vitest, và từ chính
    // code repo đích. Nó đổi theo phiên bản. Tệ hơn: nó là **dữ liệu ngoài** (⛔C4) — một repo đích cố ý
    // in ra chuỗi giống lỗi nạp sẽ tự chọn được phép thử nào bị gỡ khỏi lượt chấm của chính nó.
    const loiNap = detectLoadFailures(data.testResults);
    const probes: ProbeResult[] = data.testResults.flatMap((tr) => {
      const file = (tr.name ?? '').replace(/\\/g, '/').split('/').pop() ?? '';
      return tr.assertionResults.map((a) => ({
        title: a.title,
        status: (a.status as ProbeResult['status']) ?? 'failed',
        message: (a.failureMessages ?? []).join('\n').slice(0, 1500),
        file,
      }));
    });
    const loiThu = data.numTotalTests === 0 ? (data.testResults.map((t) => t.message ?? '').join('\n') || 'Không thu thập được test nào').slice(0, 2000) : '';
    return { ok: data.numTotalTests > 0, tongTest: data.numTotalTests, probes, loiThu, loiNap };
  }

  // Runner cấu hình được (B4.5): chạy TỪNG file probe một lệnh riêng theo template của repo đích,
  // đọc kết quả qua hợp đồng JUnit XML — file attribution chắc chắn, không phụ thuộc framework.
  chayTheoRunner(
    testFilesRel: string[],
    cfg: { test_cmd: string; timeout_s: number },
    parseJUnit: (xml: string, file: string) => ProbeResult[],
  ): VitestResult {
    const probes: ProbeResult[] = [];
    // Đường này chạy TỪNG file một lệnh riêng, nên nó đã cô lập sẵn về mặt thực thi. Thứ nó chưa làm là
    // **báo cáo**: bản trước bỏ cuộc ngay ở file hỏng đầu tiên, tức cùng một sự cố prod, chỉ khác lối.
    // Hai đường chạy phải cho CÙNG một quyết định trên cùng đầu vào — hai cửa cùng vai viết bằng hai
    // biểu thức riêng thì sẽ lệch, và khuôn ấy đã bị bắt chín lần ở repo này.
    const loiNap: LoadFailure[] = [];
    let tong = 0;
    for (const rel of testFilesRel) {
      const relSach = rel.replace(/\\/g, '/');
      const out = join(this.dir, `junit-${probes.length}-${Date.now()}.xml`);
      // L7: path chứa dấu cách (username Windows) phải được quote khi thế vào template shell
      const quote = (x: string) => (/\s/.test(x) ? `"${x}"` : x);
      const lenh = cfg.test_cmd.replaceAll('{files}', quote(relSach)).replaceAll('{out}', quote(out));
      const kq = spawnSync(lenh, {
        cwd: this.dir,
        shell: true,
        encoding: 'utf8',
        timeout: cfg.timeout_s * 1000,
        env: envSandbox(),
      });
      if ((kq.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' || kq.signal) {
        donCayTienTrinh(kq.pid);
        // Cùng ranh giới với `chayVitest`: treo KHÔNG sinh `loiNap`.
        return { ok: false, tongTest: tong, probes, loiThu: `TIMEOUT: lệnh test cho ${relSach} không kết thúc trong ${cfg.timeout_s}s`, treo: true };
      }
      if (!existsSync(out)) {
        return {
          ok: false,
          tongTest: tong,
          probes,
          loiThu: `Runner không xuất JUnit XML cho ${relSach}: ${(kq.stderr || kq.stdout || 'không có output').slice(0, 1800)}`,
        };
      }
      const cua = parseJUnit(readFileSync(out, 'utf8'), relSach.split('/').pop() ?? relSach);
      try { unlinkSync(out); } catch { /* không sao */ }
      const loi = fileLoadError(cua, relSach);
      if (loi) {
        // KHÔNG đếm nó là test đã chạy, và KHÔNG bỏ cuộc: file sau vẫn có thể chạy được.
        loiNap.push({ file: relSach.split('/').pop() ?? relSach, ly_do: loi.slice(0, 1800) });
        continue;
      }
      probes.push(...cua);
      tong += cua.length;
    }
    return {
      ok: tong > 0,
      tongTest: tong,
      probes,
      loiThu: tong > 0 ? '' : `Không thu thập được test nào từ JUnit XML${loiNap.length ? ` — ${loiNap.length} file không nạp được` : ''}`,
      loiNap,
    };
  }

  huy(): void {
    const nm = join(this.dir, 'node_modules');
    try { if (existsSync(nm)) rmdirSync(nm); } catch { /* junction có thể đã gỡ */ }
    try { unlinkSync(join(this.dir, 'vitest-out.json')); } catch { /* không sao */ }
    try {
      git(this.repo, ['worktree', 'remove', '--force', this.dir]);
    } catch {
      try { rmSync(this.dir, { recursive: true, force: true }); git(this.repo, ['worktree', 'prune']); } catch { /* bỏ qua */ }
    }
  }
}
