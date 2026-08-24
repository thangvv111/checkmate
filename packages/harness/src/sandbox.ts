import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync, readFileSync, rmSync, rmdirSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

export class Sandbox {
  readonly dir: string;

  constructor(
    private readonly repo: string,
    sha: string,
  ) {
    this.dir = mkdtempSync(join(tmpdir(), 'checker-sb-'));
    git(repo, ['worktree', 'add', '--detach', this.dir, sha]);
    // dùng chung node_modules của repo đích qua junction (repo không phải Node thì bỏ qua)
    const nm = join(repo, 'node_modules');
    if (existsSync(nm)) symlinkSync(nm, join(this.dir, 'node_modules'), 'junction');
  }

  ghiProbe(code: string, ten = 'checker.probe.test.ts'): string {
    const rel = join('test', ten);
    writeFileSync(join(this.dir, rel), code, 'utf8');
    return rel;
  }

  chayVitest(testFilesRel: string | string[]): KetQuaVitest {
    const files = (Array.isArray(testFilesRel) ? testFilesRel : [testFilesRel]).map((f) => f.replace(/\\/g, '/'));
    const outFile = join(this.dir, 'vitest-out.json');
    const kq = spawnSync('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile=${outFile}`], {
      cwd: this.dir,
      shell: true,
      encoding: 'utf8',
      timeout: 300_000,
      env: { ...process.env, CI: 'true' },
    });
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
      const lenh = cfg.test_cmd.replaceAll('{files}', relSach).replaceAll('{out}', out);
      const kq = spawnSync(lenh, {
        cwd: this.dir,
        shell: true,
        encoding: 'utf8',
        timeout: cfg.timeout_s * 1000,
        env: { ...process.env, CI: 'true' },
      });
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
