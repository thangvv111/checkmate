/**
 * `runner-contract-selftest` › D1 — vì sao 0 test phải nói bằng KIỂU ở tầng sandbox.
 *
 * Bốn điểm trả về «0 test mà không treo» của hai đường chạy (`sandbox.ts`, đếm ở design › Context) phải gắn
 * `reason` đúng bệnh và giữ đầu ra bộ chạy: `output_missing` khi không có file kết quả · `not_collected` khi
 * có file mà 0 test và không lỗi nạp. Có `loiNap` thì KHÔNG gắn — thứ tự ấy là luật (D5 hàng 3 trước 4).
 *
 * Ca đã gãy (T3.3): admin-fe PR #83, 17/09, run wmu4u2abqap9w — vitest ghi JSON `numTotalTests: 0`,
 * `testResults: []`, in lý do ra stdout; nhánh JSON đi tiếp, stdout bị nuốt, `loiThu` rơi về chuỗi dự phòng.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { RUNNER_OUTPUT_CAP, Sandbox, capRunnerOutput, type VitestResult } from '../packages/harness/src/sandbox.js';
import { parseJUnit } from '../packages/harness/src/runner.js';

const TRAN_MS = 60_000;
const CODE_PROBE = "import { it, expect } from 'vitest';\n\nit('P1: thử', () => { expect(1).toBe(1); });\n";

// Bộ chạy giả cho đường runner: ghi XML RỖNG (0 test) và nói lý do ra stdout — đúng hình dạng vitest/surefire
// khi không file test nào khớp `include`.
const SCRIPT_XML_RONG = `
const fs = require('fs');
process.stdout.write('No test files found matching ' + process.argv[2]);
fs.writeFileSync(process.argv[3], '<?xml version="1.0"?><testsuites name="vitest tests" tests="0" failures="0"></testsuites>');
`;
const SCRIPT_KHONG_XML = `
process.stderr.write('LOI_THAT_SU_ABC: template nuot that bai');
process.exit(1);
`;
const SCRIPT_STDOUT_DAI = `
const fs = require('fs');
process.stdout.write('x'.repeat(50000));
fs.writeFileSync(process.argv[3], '<?xml version="1.0"?><testsuites tests="0"></testsuites>');
`;
// Bộ chạy giả cho đường runner: XML có ĐÚNG MỘT testcase đỏ mang tên file probe = lỗi nạp file theo hợp đồng.
const SCRIPT_XML_LOI_NAP = `
const fs = require('fs');
const ten = process.argv[2].split(/[\\\\/]/).pop();
fs.writeFileSync(process.argv[3], '<?xml version="1.0"?><testsuites tests="1" failures="1"><testsuite name="s"><testcase classname="c" name="' + ten + '"><failure message="Cannot find module x">Cannot find module x</failure></testcase></testsuite></testsuites>');
`;

const goc = mkdtempSync(join(tmpdir(), 'cm-srr-'));
afterAll(() => {
  try {
    rmSync(goc, { recursive: true, force: true });
  } catch {
    /* Windows giữ file .git một lúc */
  }
});
const gitRun = (d: string, args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd: d, encoding: 'utf8' }).trim();
let dem = 0;
const repoMoi = (): { dir: string; sha: string } => {
  const dir = join(goc, `r${dem++}`);
  mkdirSync(dir);
  gitRun(dir, ['init', '-q', '-b', 'main']);
  writeFileSync(join(dir, 'a.ts'), 'export const a = 1;\n');
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  gitRun(dir, ['add', '-A']);
  gitRun(dir, ['commit', '-q', '-m', 'goc']);
  return { dir, sha: gitRun(dir, ['rev-parse', 'HEAD']) };
};

/** Lái đường vitest mặc định mà không chạy vitest thật: giả `chayTrongSandbox`, tự đặt `vitest-out.json`. */
function chayVitestGia(sb: Sandbox, json: object | null, ra: { stdout?: string; stderr?: string; status?: number }): VitestResult {
  if (json) writeFileSync(join(sb.dir, 'vitest-out.json'), JSON.stringify(json), 'utf8');
  vi.spyOn(sb as unknown as { chayTrongSandbox: () => unknown }, 'chayTrongSandbox').mockReturnValue({
    status: ra.status ?? 1,
    stdout: ra.stdout ?? '',
    stderr: ra.stderr ?? '',
    signal: null,
    pid: 1,
    output: [],
  });
  const rel = sb.ghiProbe(CODE_PROBE, 'checker.probe.test.ts', 'test');
  return sb.chayVitest([rel]);
}

describe('đường vitest mặc định — hai điểm trả về 0 test', () => {
  it('T2.1 [417 — JSON rỗng] ⇒ reason not_collected, stdout của bộ chạy được giữ, loiThu vẫn là chuỗi cũ', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      const kq = chayVitestGia(sb, { numTotalTests: 0, testResults: [] }, { stdout: 'No test files found, exiting with code 1' });
      expect(kq.ok).toBe(false);
      expect(kq.tongTest).toBe(0);
      expect(kq.reason).toBe('not_collected');
      expect(kq.runnerOutput?.stdout).toContain('No test files found');
      expect(kq.loiNap).toEqual([]);
      // 13 người đọc cũ của `loiThu` không được thấy gì đổi.
      expect(kq.loiThu).toBe('Không thu thập được test nào');
    } finally {
      sb.huy();
    }
  }, TRAN_MS);

  it('T2.2 [417 — JSON có lỗi nạp] ⇒ loiNap có, reason VẮNG (hàng 3 đứng trước hàng 4)', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      const kq = chayVitestGia(
        sb,
        { numTotalTests: 0, testResults: [{ name: '/work/test/checker.probe.test.ts', message: 'Cannot find module ./x', assertionResults: [] }] },
        { stdout: '' },
      );
      expect(kq.ok).toBe(false);
      expect(kq.loiNap?.length).toBe(1);
      expect(kq.reason).toBeUndefined();
      expect(kq.runnerOutput).toBeUndefined();
    } finally {
      sb.huy();
    }
  }, TRAN_MS);

  it('T2.3 [388 — vitest không ra file] ⇒ reason output_missing, stderr được giữ', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      const kq = chayVitestGia(sb, null, { stderr: 'vitest: command not found' });
      expect(kq.ok).toBe(false);
      expect(kq.reason).toBe('output_missing');
      expect(kq.runnerOutput?.stderr).toContain('command not found');
    } finally {
      sb.huy();
    }
  }, TRAN_MS);

  it('[XANH đối chứng] JSON có test ⇒ ok, không reason, không runnerOutput', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      const kq = chayVitestGia(
        sb,
        { numTotalTests: 1, testResults: [{ name: 'checker.probe.test.ts', assertionResults: [{ title: 'P1: thử', status: 'passed', failureMessages: [] }] }] },
        { stdout: 'ok', status: 0 },
      );
      expect(kq.ok).toBe(true);
      expect(kq.reason).toBeUndefined();
      expect(kq.runnerOutput).toBeUndefined();
    } finally {
      sb.huy();
    }
  }, TRAN_MS);
});

describe('đường runner (JUnit XML) — hai điểm trả về 0 test', () => {
  it('T2.4 [468 — XML rỗng] ⇒ reason not_collected, stdout của lệnh cuối được giữ', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      writeFileSync(join(sb.dir, 'rong.cjs'), SCRIPT_XML_RONG, 'utf8');
      const rel = sb.ghiProbe(CODE_PROBE, 'p.probe.test.ts', 'test');
      const kq = sb.chayTheoRunner([rel], { test_cmd: 'node rong.cjs {files} {out}', timeout_s: 60 }, parseJUnit);
      expect(kq.ok).toBe(false);
      expect(kq.tongTest).toBe(0);
      expect(kq.reason).toBe('not_collected');
      expect(kq.runnerOutput?.stdout).toContain('No test files found matching');
      expect(kq.loiThu).toContain('Không thu thập được test nào từ JUnit XML');
    } finally {
      sb.huy();
    }
  }, TRAN_MS);

  it('T2.5 [450 — runner không ra XML] ⇒ reason output_missing, stderr được giữ', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      writeFileSync(join(sb.dir, 'hong.cjs'), SCRIPT_KHONG_XML, 'utf8');
      const rel = sb.ghiProbe(CODE_PROBE, 'p.probe.test.ts', 'test');
      const kq = sb.chayTheoRunner([rel], { test_cmd: 'node hong.cjs {files} {out}', timeout_s: 60 }, parseJUnit);
      expect(kq.reason).toBe('output_missing');
      expect(kq.runnerOutput?.stderr).toContain('LOI_THAT_SU_ABC');
    } finally {
      sb.huy();
    }
  }, TRAN_MS);

  it('T1.9 [468 — XML 0 test hợp lệ vì lỗi nạp file] ⇒ loiNap có, reason VẮNG', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      writeFileSync(join(sb.dir, 'nap.cjs'), SCRIPT_XML_LOI_NAP, 'utf8');
      const rel = sb.ghiProbe(CODE_PROBE, 'p.probe.test.ts', 'test');
      const kq = sb.chayTheoRunner([rel], { test_cmd: 'node nap.cjs {files} {out}', timeout_s: 60 }, parseJUnit);
      expect(kq.tongTest).toBe(0);
      expect(kq.loiNap?.length).toBe(1);
      expect(kq.reason).toBeUndefined();
    } finally {
      sb.huy();
    }
  }, TRAN_MS);

  it('T2.6 [cắt độ dài] stdout 50 000 ký tự ⇒ runnerOutput.stdout ≤ RUNNER_OUTPUT_CAP', () => {
    const { dir, sha } = repoMoi();
    const sb = new Sandbox(dir, sha);
    try {
      writeFileSync(join(sb.dir, 'dai.cjs'), SCRIPT_STDOUT_DAI, 'utf8');
      const rel = sb.ghiProbe(CODE_PROBE, 'p.probe.test.ts', 'test');
      const kq = sb.chayTheoRunner([rel], { test_cmd: 'node dai.cjs {files} {out}', timeout_s: 60 }, parseJUnit);
      expect(kq.reason).toBe('not_collected');
      expect(kq.runnerOutput?.stdout.length).toBe(RUNNER_OUTPUT_CAP);
    } finally {
      sb.huy();
    }
  }, TRAN_MS);
});

describe('capRunnerOutput — không ném với đầu vào khuyết (T3.1)', () => {
  it('vắng kết quả ⇒ hai chuỗi rỗng', () => {
    expect(capRunnerOutput(undefined)).toEqual({ stdout: '', stderr: '' });
  });
  it('stdout không phải chuỗi (Buffer/số/null) ⇒ ép về chuỗi hoặc rỗng, và cắt về trần', () => {
    expect(capRunnerOutput({ stdout: 42, stderr: null })).toEqual({ stdout: '42', stderr: '' });
    expect(capRunnerOutput({ stdout: 'y'.repeat(5000) }).stdout.length).toBe(RUNNER_OUTPUT_CAP);
  });
});
