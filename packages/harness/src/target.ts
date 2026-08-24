import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface TargetInfo {
  repo: string;
  branch: string;
  base: string;
  branchSha: string;
  baseSha: string;
  diff: string;
  specs: Array<{ file: string; noiDung: string }>;
  apiDoc: string;
  testMau: string;
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}

export function docTarget(repo: string, branch: string, base = 'main'): TargetInfo {
  const branchSha = git(repo, ['rev-parse', branch]);
  const baseSha = git(repo, ['rev-parse', base]);
  const diff = git(repo, ['diff', `${base}...${branch}`]);
  if (!diff) throw new Error(`Diff rỗng giữa ${base} và ${branch}`);

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
    const f = readdirSync(testDir).find((x) => x.endsWith('.test.ts'));
    if (f) testMau = readFileSync(join(testDir, f), 'utf8');
  }

  return { repo, branch, base, branchSha, baseSha, diff, specs, apiDoc, testMau };
}
