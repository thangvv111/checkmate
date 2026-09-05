import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
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


// ---- Cô lập lượt chạy (capability `sandbox-isolation`) ----

/**
 * Ảnh mặc định, GHIM THEO DIGEST.
 *
 * Thẻ trôi (`node:latest`, kể cả `node:22`) làm hai lượt chấm cùng một commit chạy trong hai môi trường
 * khác nhau — tức phá tính tái lập mà cả sản phẩm này đứng trên, và phá trong im lặng. Digest thì không
 * trôi được. Đổi ảnh là một change, không phải một lần `pull`.
 */
export const DEFAULT_IMAGE =
  'docker.io/library/node@sha256:2fa754a9ba4d7adbd2a51d182eaabbe355c82b673624035a38c0d42b08724854';

/** Trần tài nguyên một lượt chạy. Namespace KHÔNG tự giới hạn gì — ba con số này là thứ giới hạn. */
export const MEMORY_CAP = '512m';
export const CPU_CAP = '1';
export const PIDS_CAP = 128;

export type IsolationLevel = 'container' | 'none';

/**
 * Mức cô lập THỰC TẾ của một lượt chạy — không phải cấu hình mong muốn.
 *
 * «Đã cấu hình để cô lập» và «đã cô lập» là hai câu khác nhau, và chỉ câu thứ hai đáng ghi vào verdict.
 * Dán nhãn `container` lên một lượt chạy không cô lập tệ hơn không dán gì.
 */
export interface IsolationInfo {
  muc: IsolationLevel;
  runtime?: string;
  ly_do_khong?: string;
}

/** Tên ảnh OCI hợp lệ — kiểm HÌNH DẠNG trước khi đưa vào dòng lệnh runtime. */
const IMAGE_NAME_SHAPE = /^[a-z0-9]+([._-][a-z0-9]+)*(\.[a-z0-9-]+)*(:[0-9]+)?(\/[a-z0-9]+([._-][a-z0-9]+)*)*(:[\w][\w.-]{0,127}|@sha256:[a-f0-9]{64})?$/;

/**
 * Tên ảnh đến từ `checkmate.yml` của repo đích — dữ liệu ngoài (⛔C4).
 *
 * Kiểm hình dạng rồi mới dùng, và KHÔNG BAO GIỜ ghép vào một chuỗi shell: nó đi vào mảng đối số. Tên rác
 * thì rơi về ảnh mặc định chứ không ném — cùng chiều fail-safe mà `readRunnerCfg` đã chọn.
 */
export function safeImageName(tho: unknown): string {
  const s = typeof tho === 'string' ? tho.trim() : '';
  return s && s.length <= 300 && IMAGE_NAME_SHAPE.test(s) ? s : DEFAULT_IMAGE;
}

export interface ContainerSpec {
  /** thư mục lượt chạy trên host — thứ DUY NHẤT được ghi */
  thuMucChay: string;
  /** node_modules của bản clone; đưa vào thì CHỈ ĐỌC */
  thuMucPhuThuoc?: string;
  anh: string;
  lenh: string[];
}

/**
 * Dựng đối số cho runtime — hàm THUẦN, và là chỗ luật của change này sống.
 *
 * ⛔ Container KHÔNG chặn gì nếu vẫn bind ghi được ra ngoài. Hai thứ nặng nhất — thư viện probe và sổ cái
 * verdict — chỉ được bảo vệ bởi việc chúng **không có mặt** trong cây, chứ không bởi cái container. Nên
 * danh sách `-v` ở đây là bề mặt cần soi, không phải cờ `--network`.
 *
 * Ba trần tài nguyên đi cùng nhau: namespace không giới hạn gì, và một lượt chấm ngốn hết RAM là sự cố
 * của sản phẩm KHÁC đang chạy cùng máy.
 */
export function buildContainerArgs(spec: ContainerSpec): string[] {
  const a = [
    'run', '--rm',
    '--network=none',
    `--memory=${MEMORY_CAP}`,
    `--cpus=${CPU_CAP}`,
    `--pids-limit=${PIDS_CAP}`,
    '--user', '1000:1000',
    '--security-opt', 'no-new-privileges',
    '--read-only',
    '--tmpfs', '/tmp',
    // `U` = podman đổi chủ sở hữu thư mục lượt chạy sang SUBUID của container.
    //
    // Không có nó thì `--user 1000:1000` ánh xạ sang subuid, và thư mục do tài khoản dịch vụ sở hữu lại
    // KHÔNG ghi được — đo được: vitest không ghi nổi `vitest-out.json`, cả lượt chấm chết.
    //
    // Hướng khác là `--userns=keep-id` (ánh xạ uid host vào container). Nó chạy được và dọn dẹp dễ hơn,
    // nhưng đổi lại uid trong container thành CHÍNH tài khoản dịch vụ — thoát container là thoát ra
    // thành tài khoản ấy. Với `U`, thoát ra rơi vào một subuid không đặc quyền. Đo được cả hai đường
    // ~0.35s nên giá như nhau; chọn đường có hậu quả nhẹ hơn khi hỏng.
    '-v', `${spec.thuMucChay}:/work:Z,U`,
  ];
  if (spec.thuMucPhuThuoc) a.push('-v', `${spec.thuMucPhuThuoc}:/work/node_modules:ro,Z`);
  a.push('-w', '/work', safeImageName(spec.anh), ...spec.lenh);
  return a;
}

/**
 * Runtime cô lập có dùng được không — hỏi bằng cách CHẠY, không bằng cách kiểm tên file.
 *
 * `podman` có mặt trên PATH không chứng minh nó chạy được rootless trên nền này (thiếu uỷ quyền cgroup,
 * thiếu subuid, kernel cấm user namespace). Hỏi sai câu ở đây thì mức cô lập khai ra là mức MONG MUỐN.
 */
export function detectIsolation(chay = spawnSync): IsolationInfo {
  const r = chay('podman', ['--version'], { encoding: 'utf8', timeout: 20_000 });
  if (r.error || r.status !== 0) {
    return { muc: 'none', ly_do_khong: `không gọi được podman: ${r.error?.message ?? `mã thoát ${r.status}`}` };
  }
  return { muc: 'container', runtime: (r.stdout ?? '').trim() || 'podman' };
}

export class Sandbox {
  readonly dir: string;

  /** Mức cô lập THỰC TẾ của sandbox này — đo một lần lúc dựng, không đoán lại. */
  readonly coLap: IsolationInfo;
  private readonly phuThuoc: string | null;

  constructor(
    private readonly repo: string,
    sha: string,
    private readonly anh: string = DEFAULT_IMAGE,
  ) {
    this.dir = mkdtempSync(join(tmpdir(), 'checker-sb-'));
    this.coLap = detectIsolation();

    // ⛔ `git archive`, KHÔNG `git worktree`.
    //
    // `worktree add` để lại một file `.git` trong thư mục chạy, trỏ ngược vào `<clone>/.git/worktrees/…`
    // — tức một đường GHI vào git dir của bản clone. Code chạy trong đó cài được hook (`post-checkout`,
    // `post-merge`), và hook ấy chạy ở những lượt SAU, không cần pull request nào nữa. Đường bền vững.
    //
    // `archive` trải ra một cây sạch: không `.git`, không đường về. Mất khả năng chạy lệnh `git` trong
    // sandbox — chưa probe nào cần, và nếu cần thì đó là một quyết định phải xin riêng.
    const TEN_TAR = '.checkmate-src.tar';
    git(repo, ['archive', '--format=tar', '-o', join(this.dir, TEN_TAR), sha]);
    // Chạy tar với `cwd` và tên TƯƠNG ĐỐI, không đưa đường dẫn tuyệt đối vào đối số.
    // GNU tar đọc `C:\...` thành đặc tả máy-từ-xa (`host:path`) và trả «Cannot connect to C» — bẫy chỉ
    // lộ trên Windows. `--force-local` chữa được cho GNU tar nhưng bsdtar (tar sẵn có của Windows) không
    // hiểu cờ ấy, nên nó đổi một lỗi lấy một lỗi khác tuỳ máy. Đường tương đối thì cả hai đều hiểu.
    const bung = spawnSync('tar', ['-xf', TEN_TAR], { cwd: this.dir, encoding: 'utf8', timeout: 120_000 });
    try { unlinkSync(join(this.dir, TEN_TAR)); } catch { /* không sao */ }
    if (bung.status !== 0) throw new Error(`không bung được mã nguồn của ${sha.slice(0, 7)}: ${(bung.stderr || '').slice(0, 300)}`);
    // Dùng chung node_modules của repo đích qua junction (repo không phải Node thì bỏ qua).
    // ⚠ ĐÍCH PHẢI TUYỆT ĐỐI. Gọi checker với `--repo .` thì đích thành 'node_modules' tương đối, và
    // junction trỏ ngược vào chính thư mục sandbox — hỏng mà KHÔNG báo lỗi. Hậu quả rất khó lần: npx
    // vẫn chạy được vitest (nó tự tải về cache) nên nhìn như đang chạy bình thường, nhưng mọi `import`
    // gói từ trong worktree đều "Cannot find package", cả file probe lẫn file cấu hình của repo.
    const nm = resolve(repo, 'node_modules');
    this.phuThuoc = existsSync(nm) ? nm : null;
    // Đường KHÔNG cô lập được (máy dev Windows) vẫn dùng junction như trước — nó là hành vi cũ, và nó
    // được KHAI RA là `none` chứ không giấu. Đường container bind cùng thư mục ấy ở chế độ CHỈ ĐỌC.
    if (this.phuThuoc && this.coLap.muc === 'none') symlinkSync(this.phuThuoc, join(this.dir, 'node_modules'), 'junction');
  }

  /**
   * Chạy một lệnh trong sandbox — qua container nếu cô lập được, chạy thẳng nếu không.
   *
   * Hai đường phải nhận CÙNG mức cô lập: repo khai `runner.test_cmd` và repo không khai đi qua đúng hàm
   * này. Hai cửa cùng vai viết bằng hai biểu thức riêng sẽ lệch nhau, và khuôn ấy đã bị bắt chín lần ở
   * repo này.
   */
  private chayTrongSandbox(lenh: string[], timeoutMs: number): SpawnSyncReturns<string> {
    if (this.coLap.muc === 'container') {
      const argv = buildContainerArgs({
        thuMucChay: this.dir,
        thuMucPhuThuoc: this.phuThuoc ?? undefined,
        anh: this.anh,
        lenh,
      });
      return spawnSync('podman', argv, { encoding: 'utf8', timeout: timeoutMs, env: envSandbox() });
    }
    // Không cô lập được: chạy như trước. `shell: true` chỉ còn ở đường này, và đường này đã tự khai `none`.
    return spawnSync(lenh[0]!, lenh.slice(1), {
      cwd: this.dir,
      shell: true,
      encoding: 'utf8',
      timeout: timeoutMs,
      env: envSandbox(),
    });
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
    // Đường ghi kết quả phải là đường TRONG môi trường chạy: trong container là `/work`, ngoài là host.
    const outArg = this.coLap.muc === 'container' ? '/work/vitest-out.json' : `"${outFile}"`;
    const kq = this.chayTrongSandbox(['npx', 'vitest', 'run', ...files, '--reporter=json', `--outputFile=${outArg}`], 300_000);
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
      // Trong container, đường dẫn là đường của container; shell nằm BÊN TRONG container chứ không
      // trên host — đó là khác biệt đáng kể, không phải một chi tiết viết lại.
      const outTrong = this.coLap.muc === 'container' ? `/work/${out.slice(this.dir.length + 1).replace(/\\/g, '/')}` : out;
      const lenh = cfg.test_cmd.replaceAll('{files}', quote(relSach)).replaceAll('{out}', quote(outTrong));
      const kq = this.chayTrongSandbox(this.coLap.muc === 'container' ? ['sh', '-c', lenh] : [lenh], cfg.timeout_s * 1000);
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

  /**
   * Huỷ môi trường lượt chạy.
   *
   * Không còn worktree để gỡ (nguồn mã nay là cây trải ra từ `git archive`), nên đây chỉ còn là xoá thư
   * mục. Junction `node_modules` phải gỡ TRƯỚC khi xoá đệ quy, kẻo `rmSync` đi xuyên qua nó và xoá vào
   * `node_modules` THẬT của bản clone.
   */
  huy(): void {
    const nm = join(this.dir, 'node_modules');
    try { if (existsSync(nm)) rmdirSync(nm); } catch { /* junction có thể đã gỡ, hoặc là thư mục thật */ }
    // Sau `:U`, thư mục lượt chạy thuộc SUBUID của container — tài khoản dịch vụ không xoá nổi nó
    // (đo được: `rm -rf` thất bại, thư mục còn lại). Dọn qua `podman unshare` là đường duy nhất, và nó
    // phải chạy TRƯỚC `rmSync` chứ không phải sau: `rmSync` thất bại im lặng rồi thư mục ở lại mãi.
    if (this.coLap.muc === 'container') {
      const don = spawnSync('podman', ['unshare', 'rm', '-rf', this.dir], { encoding: 'utf8', timeout: 60_000 });
      if (don.status !== 0) console.error(`không dọn được thư mục lượt chạy ${this.dir}: ${(don.stderr || '').slice(0, 200)}`);
    }
    try { rmSync(this.dir, { recursive: true, force: true }); } catch { /* bỏ qua — thư mục tạm */ }
  }
}
