import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, readFileSync, rmSync, rmdirSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export interface KetQuaProbe {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  file: string; // basename file probe — nhiều bộ probe (mới + thư viện) chạy chung một lượt
}

export interface KetQuaVitest {
  ok: boolean;
  tongTest: number;
  probes: KetQuaProbe[];
  loiThu: string; // lỗi thu thập/biên dịch nếu có
  treo?: boolean; // C7: lệnh test vượt timeout (PR có thể chứa vòng lặp vô hạn)
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
function envSandbox(): NodeJS.ProcessEnv {
  const ra: NodeJS.ProcessEnv = { CI: 'true' };
  for (const k of Object.keys(process.env)) {
    if (ENV_CHO_PHEP.includes(k.toUpperCase())) ra[k] = process.env[k];
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
export function loiNapFile(probes: KetQuaProbe[], duongDanRel: string): string | null {
  if (probes.length !== 1) return null;
  const p = probes[0];
  if (p.status !== 'failed') return null;
  const ten = duongDanRel.replace(/\\/g, '/');
  const title = p.title.replace(/\\/g, '/').trim();
  if (title !== ten && title !== (ten.split('/').pop() ?? ten)) return null;
  return p.message.trim() || 'bộ chạy test không nói lý do';
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

  chayVitest(testFilesRel: string | string[]): KetQuaVitest {
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
    const probes: KetQuaProbe[] = data.testResults.flatMap((tr) => {
      const file = (tr.name ?? '').replace(/\\/g, '/').split('/').pop() ?? '';
      return tr.assertionResults.map((a) => ({
        title: a.title,
        status: (a.status as KetQuaProbe['status']) ?? 'failed',
        message: (a.failureMessages ?? []).join('\n').slice(0, 1500),
        file,
      }));
    });
    const loiThu = data.numTotalTests === 0 ? (data.testResults.map((t) => t.message ?? '').join('\n') || 'Không thu thập được test nào').slice(0, 2000) : '';
    return { ok: data.numTotalTests > 0, tongTest: data.numTotalTests, probes, loiThu };
  }

  // Runner cấu hình được (B4.5): chạy TỪNG file probe một lệnh riêng theo template của repo đích,
  // đọc kết quả qua hợp đồng JUnit XML — file attribution chắc chắn, không phụ thuộc framework.
  chayTheoRunner(
    testFilesRel: string[],
    cfg: { test_cmd: string; timeout_s: number },
    parseJUnit: (xml: string, file: string) => KetQuaProbe[],
  ): KetQuaVitest {
    const probes: KetQuaProbe[] = [];
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
      const loiNap = loiNapFile(cua, relSach);
      if (loiNap) {
        return {
          ok: false,
          tongTest: tong,
          probes,
          loiThu: `File probe ${relSach} KHÔNG nạp được (không test nào chạy): ${loiNap.slice(0, 1800)}`,
        };
      }
      probes.push(...cua);
      tong += cua.length;
    }
    return { ok: tong > 0, tongTest: tong, probes, loiThu: tong > 0 ? '' : 'Không thu thập được test nào từ JUnit XML' };
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
