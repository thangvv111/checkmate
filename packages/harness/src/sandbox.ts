import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync, readFileSync, rmSync, rmdirSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface KetQuaProbe {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
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
    // dùng chung node_modules của repo đích qua junction — các PR demo không đổi dependency
    symlinkSync(join(repo, 'node_modules'), join(this.dir, 'node_modules'), 'junction');
  }

  ghiProbe(code: string): string {
    const rel = join('test', 'checker.probe.test.ts');
    writeFileSync(join(this.dir, rel), code, 'utf8');
    return rel;
  }

  chayVitest(testFileRel: string): KetQuaVitest {
    const outFile = join(this.dir, 'vitest-out.json');
    const kq = spawnSync('npx', ['vitest', 'run', testFileRel.replace(/\\/g, '/'), '--reporter=json', `--outputFile=${outFile}`], {
      cwd: this.dir,
      shell: true,
      encoding: 'utf8',
      timeout: 180_000,
      env: { ...process.env, CI: 'true' },
    });
    if (!existsSync(outFile)) {
      return { ok: false, tongTest: 0, probes: [], loiThu: (kq.stderr || kq.stdout || 'vitest không ra output').slice(0, 2000) };
    }
    const data = JSON.parse(readFileSync(outFile, 'utf8')) as {
      numTotalTests: number;
      testResults: Array<{
        message?: string;
        assertionResults: Array<{ title: string; status: string; failureMessages: string[] }>;
      }>;
    };
    const probes: KetQuaProbe[] = data.testResults.flatMap((tr) =>
      tr.assertionResults.map((a) => ({
        title: a.title,
        status: (a.status as KetQuaProbe['status']) ?? 'failed',
        message: (a.failureMessages ?? []).join('\n').slice(0, 1500),
      })),
    );
    const loiThu = data.numTotalTests === 0 ? (data.testResults.map((t) => t.message ?? '').join('\n') || 'Không thu thập được test nào').slice(0, 2000) : '';
    return { ok: data.numTotalTests > 0, tongTest: data.numTotalTests, probes, loiThu };
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
