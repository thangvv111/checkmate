/**
 * `runner-contract-selftest` — hợp đồng chạy probe phải TỰ CHỨNG MINH bằng mồi.
 *
 * Khoá: `probe-environment › Hợp đồng chạy probe SHALL tự chứng minh bằng mồi trước lời gọi model đầu tiên`
 * (bảy hàng của bảng D5, thứ tự là luật) · `Thông điệp môi trường SHALL gọi đúng tên bệnh…` (ba tên bệnh của
 * mồi) · `target-contract › checkmate.yml là tuỳ chọn…` (vế probe_dir/probe_ext).
 *
 * Mutation (chạy hai lần, kiểm diff đã áp): đảo hàng 3↔4 ⇒ T1.7/T1.9 đỏ · gỡ kiểm `status !== 'failed'` ⇒
 * T1.6 đỏ · thay matchProbeId bằng includes ⇒ T1.12 đỏ · mồi tự dựng sandbox riêng ⇒ T2.10 đỏ.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import {
  CANARY_BLOCKING,
  CANARY_BY_LANGUAGE,
  CANARY_ID,
  CANARY_TIMEOUT_AT_ADD_S,
  canaryLanguage,
  classifyCanaryOutcome,
  runCanary,
  runProbeFile,
  writeCanary,
  type CanaryOutcome,
} from '../packages/harness/src/runner-canary.js';
import { describeCanaryOutcome } from '../packages/harness/src/probe-preflight.js';
import { matchProbeId } from '../packages/harness/src/skill-code.js';
import { Sandbox, type ProbeResult, type VitestResult } from '../packages/harness/src/sandbox.js';
import { parseJUnit } from '../packages/harness/src/runner.js';

const TRAN_MS = 60_000;
const moi = { id: CANARY_ID, matchId: matchProbeId };
const probe = (title: string, status: ProbeResult['status'] = 'failed'): ProbeResult => ({ title, status, message: '', file: 'f' });
const kqRong = (): VitestResult => ({ ok: false, tongTest: 0, probes: [], loiThu: '', loiNap: [] });

afterEach(() => vi.restoreAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// classifyCanaryOutcome — bảng D5
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe('classifyCanaryOutcome — bảy hàng, THỨ TỰ là luật', () => {
  it('T1.1 hợp đồng đúng — mồi đỏ đi tới được đầu ra ⇒ proven', () => {
    const kq: VitestResult = { ok: true, tongTest: 1, probes: [probe('CANARY: CheckMate runner contract')], loiThu: '', loiNap: [] };
    expect(classifyCanaryOutcome(kq, moi)).toBe('proven');
  });

  it('T1.2 bộ chạy không nhặt file probe ⇒ probe_not_collected', () => {
    expect(classifyCanaryOutcome({ ...kqRong(), reason: 'not_collected' }, moi)).toBe('probe_not_collected');
  });

  it('T1.3 template nuốt thất bại ⇒ runner_output_missing', () => {
    expect(classifyCanaryOutcome({ ...kqRong(), reason: 'output_missing' }, moi)).toBe('runner_output_missing');
  });

  it('T1.4 treo cũng là bộ chạy — mồi một dòng không thể treo ⇒ runner_output_missing', () => {
    expect(classifyCanaryOutcome({ ...kqRong(), treo: true }, moi)).toBe('runner_output_missing');
  });

  it('T1.5 đầu ra có test nhưng không cái nào là mồi ⇒ canary_not_in_output', () => {
    const kq: VitestResult = { ok: true, tongTest: 3, probes: [probe('P1: a'), probe('P2: b', 'passed'), probe('MYCANARY2: c')], loiThu: '', loiNap: [] };
    expect(classifyCanaryOutcome(kq, moi)).toBe('canary_not_in_output');
  });

  it('T1.6 mồi có mặt mà KHÔNG đỏ — xanh giả bị chặn ⇒ canary_not_failed', () => {
    const kq: VitestResult = { ok: true, tongTest: 1, probes: [probe('CANARY: CheckMate runner contract', 'passed')], loiThu: '', loiNap: [] };
    expect(classifyCanaryOutcome(kq, moi)).toBe('canary_not_failed');
  });

  it('T1.7 mồi không nạp được ⇒ skipped_load_error, KHÔNG phải probe_not_collected (hàng 3 trước hàng 4)', () => {
    const kq: VitestResult = { ...kqRong(), loiNap: [{ file: 'checker_probe.test.tsx', ly_do: "Cannot find package 'vitest'" }] };
    expect(classifyCanaryOutcome(kq, moi)).toBe('skipped_load_error');
    // Kể cả khi sandbox (bị mutate) gắn nhầm reason cùng lúc — lỗi nạp vẫn thắng.
    expect(classifyCanaryOutcome({ ...kq, reason: 'not_collected' }, moi)).toBe('skipped_load_error');
  });

  it('T1.8 đường thật (không canary) — CHỈ hàng 4 có nghĩa, còn lại null', () => {
    expect(classifyCanaryOutcome({ ...kqRong(), reason: 'not_collected' })).toBe('probe_not_collected');
    expect(classifyCanaryOutcome({ ...kqRong(), reason: 'output_missing' })).toBeNull();
    expect(classifyCanaryOutcome({ ...kqRong(), treo: true })).toBeNull();
    expect(classifyCanaryOutcome({ ok: true, tongTest: 1, probes: [probe('P1', 'passed')], loiThu: '', loiNap: [] })).toBeNull();
    expect(classifyCanaryOutcome({ ok: true, tongTest: 1, probes: [probe('P1')], loiThu: '', loiNap: [] })).toBeNull();
  });

  it('T1.9 biên — 0 test vì lỗi nạp, reason VẮNG ⇒ đường thật null, mồi skipped_load_error', () => {
    const kq: VitestResult = { ...kqRong(), loiNap: [{ file: 'x', ly_do: 'y' }] };
    expect(classifyCanaryOutcome(kq)).toBeNull();
    expect(classifyCanaryOutcome(kq, moi)).toBe('skipped_load_error');
  });

  it('T1.12 nối bằng matchProbeId thật: MYCANARY2 KHÔNG phải mồi, CANARY: x là mồi, test_CANARY_x là mồi, Suite > CANARY: x là mồi', () => {
    // `includes('CANARY')` sẽ nhận MYCANARY2 — mutation ấy làm ca này đỏ.
    expect(classifyCanaryOutcome({ ok: true, tongTest: 1, probes: [probe('MYCANARY2: c')], loiThu: '', loiNap: [] }, moi)).toBe('canary_not_in_output');
    expect(classifyCanaryOutcome({ ok: true, tongTest: 1, probes: [probe('CANARY2: c')], loiThu: '', loiNap: [] }, moi)).toBe('canary_not_in_output');
    for (const ten of ['CANARY', 'CANARY: x', 'test_CANARY_x', 'Suite > CANARY: x', 'CANARY_runner_contract']) {
      expect(classifyCanaryOutcome({ ok: true, tongTest: 1, probes: [probe(ten)], loiThu: '', loiNap: [] }, moi), ten).toBe('proven');
    }
  });

  it('T3.1 đầu vào KHUYẾT ở mọi tầng — không ném; mồi nghiêng về dừng, đường thật null, KHÔNG BAO GIỜ proven', () => {
    const khuyet = [undefined, null, {}, { probes: undefined }, { loiNap: null }, { tongTest: 'abc' }, { probes: [null] }, { probes: [{}] }];
    for (const k of khuyet) {
      const ra = classifyCanaryOutcome(k as never, moi);
      expect(ra, JSON.stringify(k)).not.toBe('proven');
      expect(CANARY_BLOCKING.has(ra as CanaryOutcome) || ra === 'skipped_load_error', JSON.stringify(k)).toBe(true);
      expect(classifyCanaryOutcome(k as never), JSON.stringify(k)).toBeNull();
    }
  });

  it('CANARY_BLOCKING đúng bốn kết cục chặn, không chứa proven/skipped', () => {
    expect([...CANARY_BLOCKING].sort()).toEqual(['canary_not_failed', 'canary_not_in_output', 'probe_not_collected', 'runner_output_missing']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// canaryLanguage · writeCanary — bảng đóng, thân là hằng
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe('canaryLanguage — bảng đóng theo đuôi cuối', () => {
  it('T1.13 đuôi kép và tên file', () => {
    expect(canaryLanguage('.probe.test.ts')).toBe('ts');
    expect(canaryLanguage('checker_probe.test.tsx')).toBe('tsx');
    expect(canaryLanguage('.py')).toBe('py');
    expect(canaryLanguage('CheckerProbeTest.java')).toBe('java');
    expect(canaryLanguage('a.mjs')).toBe('mjs');
    expect(canaryLanguage('.JS')).toBe('js');
  });
  it('T1.14 ngoài bảng ⇒ null', () => {
    for (const x of ['.kt', '.go', '.cs', '', undefined, null, 42, 'khongco', 'a.']) expect(canaryLanguage(x), String(x)).toBeNull();
  });
  it('T1.15 cặp fixture tầng 3 — XANH và ĐỎ trong cùng một ca', () => {
    expect(canaryLanguage('.test.ts')).not.toBeNull();
    expect(canaryLanguage('.test.kt')).toBeNull();
  });
});

describe('writeCanary — thân mồi là hằng, tên test bắt đầu CANARY', () => {
  it('T1.16 với mọi ngôn ngữ, tên test trong thân nối được với CANARY bằng CHÍNH matchProbeId', () => {
    for (const lang of CANARY_BY_LANGUAGE.keys()) {
      const code = writeCanary(lang, { className: 'CheckerProbeTest' })!;
      expect(code, lang).not.toBeNull();
      const ten = lang === 'py' ? /def (\w+)\(/.exec(code)![1]! : lang === 'java' ? /void (\w+)\(/.exec(code)![1]! : /test\('([^']+)'/.exec(code)![1]!;
      expect(matchProbeId(ten, CANARY_ID), `${lang}: ${ten}`).toBe(true);
    }
  });
  it('T1.17 khuôn theo framework: vitest/mặc định có import, jest không', () => {
    expect(writeCanary('ts')).toContain("from 'vitest'");
    expect(writeCanary('ts', { framework: 'vitest' })).toContain("from 'vitest'");
    expect(writeCanary('tsx', { framework: 'jest' })).not.toContain('import');
    expect(writeCanary('js', { framework: 'Jest 29' })).not.toContain('import');
    expect(writeCanary('ts', { framework: 'theo file test mẫu của repo' })).toContain("from 'vitest'");
  });
  it('T1.18 Java cần tên lớp', () => {
    expect(writeCanary('java')).toBeNull();
    expect(writeCanary('java', { className: 'CheckerProbeTest' })).toContain('class CheckerProbeTest {');
    expect(writeCanary('java', { className: 'CheckerProbeTest' })).not.toContain('__CLASS__');
  });
  it('T1.19 ⛔C4 — tên lớp rác bị từ chối, KHÔNG nội suy', () => {
    for (const x of ['Foo; rm -rf /', '../X', '1Abc', 'A B', 'A-B', '', '${x}', 'A/B']) expect(writeCanary('java', { className: x }), x).toBeNull();
  });
  it('T1.20 thân mồi không chứa gì từ repo đích — framework rác không lọt vào thân', () => {
    const doc = "vitest'; process.exit(1); //";
    const code = writeCanary('ts', { framework: doc })!;
    expect(code).not.toContain('process.exit');
    expect(code).toBe(writeCanary('ts', { framework: 'vitest' }));
    // Snapshot đóng: thân TS = import + body, không có gì khác.
    expect(code).toBe("import { test, expect } from 'vitest';\n\ntest('CANARY: CheckMate runner contract', () => {\n  expect(1).toBe(2);\n});\n");
  });
  it('ngôn ngữ null ⇒ null', () => {
    expect(writeCanary(null)).toBeNull();
  });
  it('CANARY_TIMEOUT_AT_ADD_S nằm trong dải timeout của runner và ngắn hơn mặc định lượt chấm', () => {
    expect(CANARY_TIMEOUT_AT_ADD_S).toBeGreaterThanOrEqual(30);
    expect(CANARY_TIMEOUT_AT_ADD_S).toBeLessThan(3600);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// describeCanaryOutcome — thông điệp bằng tên núm
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe('describeCanaryOutcome — bệnh + việc phải làm bằng tên núm, không đổ cho probe/pull request', () => {
  const ctx = { probePath: 'src/checker_probe.test.tsx', probeDir: 'src', probeExt: '.test.tsx', hasTestCmd: true };
  const cam = (s: string) => {
    expect(s).not.toMatch(/probe viết sai/i);
    expect(s).not.toMatch(/pull request (có|bị) lỗi/i);
    expect(s).toContain('KHÔNG phải lỗi của pull request');
  };
  it('T1.21 probe_not_collected: đường file + hai núm', () => {
    const s = describeCanaryOutcome('probe_not_collected', ctx);
    expect(s).toContain('src/checker_probe.test.tsx');
    expect(s).toContain('runner.probe_dir');
    expect(s).toContain('runner.probe_ext');
    cam(s);
  });
  it('T1.22 runner_output_missing: có test_cmd thì nêu test_cmd; đường mặc định thì nói mặc định', () => {
    expect(describeCanaryOutcome('runner_output_missing', ctx)).toContain('runner.test_cmd');
    const macDinh = describeCanaryOutcome('runner_output_missing', { ...ctx, hasTestCmd: false });
    expect(macDinh).toContain('vitest mặc định');
    expect(macDinh.split('`runner.test_cmd`').length - 1, 'đường mặc định chỉ nhắc test_cmd khi nói repo KHÔNG khai').toBeLessThanOrEqual(2);
    cam(macDinh);
  });
  it('T1.23 canary_not_failed: báo đạt cho phép thử cố tình đỏ, trỏ test_cmd', () => {
    const s = describeCanaryOutcome('canary_not_failed', ctx);
    expect(s).toContain('cố tình đỏ');
    expect(s).toContain('runner.test_cmd');
    cam(s);
  });
  it('T1.24 canary_not_in_output: đầu ra không chứa phép thử vừa ghi', () => {
    const s = describeCanaryOutcome('canary_not_in_output', ctx);
    expect(s).toContain('không chứa phép thử');
    expect(s).toContain(ctx.probePath);
    cam(s);
  });
  it('T1.25 nhánh: pr ⇒ «nhánh pull request», goc ⇒ «nhánh gốc», vắng ⇒ không nhắc nhánh', () => {
    expect(describeCanaryOutcome('probe_not_collected', { ...ctx, nhanh: 'pr' })).toContain('nhánh pull request');
    expect(describeCanaryOutcome('probe_not_collected', { ...ctx, nhanh: 'goc' })).toContain('nhánh gốc');
    expect(describeCanaryOutcome('probe_not_collected', ctx)).not.toContain('nhánh');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// runProbeFile · runCanary — chạy thật trong sandbox tạm (đường không container trên máy dev)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

// Bộ chạy giả cho đường runner, COMMIT vào repo tạm để `git archive` mang nó vào sandbox. Đối số 1 = file
// probe, đối số 2 = đường XML. Hành vi chọn bằng biến `CM_KICH_BAN` đọc từ file kịch bản cùng thư mục.
const SCRIPT_RUNNER = `
const fs = require('fs');
const probe = process.argv[2];
const out = process.argv[3];
const kichBan = fs.readFileSync('kich-ban.txt', 'utf8').trim();
const ten = probe.split(/[\\\\/]/).pop();
const xml = (tc) => '<?xml version="1.0"?><testsuites tests="1"><testsuite name="s">' + tc + '</testsuite></testsuites>';
if (kichBan === 'do') fs.writeFileSync(out, xml('<testcase classname="c" name="CANARY: CheckMate runner contract"><failure message="expected 1 to be 2">x</failure></testcase>'));
else if (kichBan === 'xanh-gia') fs.writeFileSync(out, xml('<testcase classname="c" name="CANARY: CheckMate runner contract"/>'));
else if (kichBan === 'khac') fs.writeFileSync(out, xml('<testcase classname="c" name="P1: cua repo"><failure message="m">x</failure></testcase>'));
else if (kichBan === 'rong') { process.stdout.write('No test files found matching ' + probe); fs.writeFileSync(out, '<?xml version="1.0"?><testsuites tests="0"></testsuites>'); }
else if (kichBan === 'nap') fs.writeFileSync(out, xml('<testcase classname="c" name="' + ten + '"><failure message="Cannot find package vitest">x</failure></testcase>'));
else if (kichBan === 'khong-xml') { process.stderr.write('template nuot that bai'); process.exit(1); }
`;

const goc = mkdtempSync(join(tmpdir(), 'cm-canary-'));
afterAll(() => {
  try {
    rmSync(goc, { recursive: true, force: true });
  } catch {
    /* Windows giữ .git một lúc */
  }
});
const gitRun = (d: string, args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd: d, encoding: 'utf8' }).trim();
let dem = 0;
/** Repo tạm mang bộ chạy giả và kịch bản đã chọn. */
const repoKichBan = (kichBan: string): { dir: string; sha: string } => {
  const dir = join(goc, `r${dem++}`);
  mkdirSync(dir);
  gitRun(dir, ['init', '-q', '-b', 'main']);
  writeFileSync(join(dir, 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(dir, 'runner.cjs'), SCRIPT_RUNNER, 'utf8');
  writeFileSync(join(dir, 'kich-ban.txt'), kichBan, 'utf8');
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  gitRun(dir, ['add', '-A']);
  gitRun(dir, ['commit', '-q', '-m', 'goc']);
  return { dir, sha: gitRun(dir, ['rev-parse', 'HEAD']) };
};
const runnerCfg = { test_cmd: 'node runner.cjs {files} {out}', framework: 'vitest', probe_dir: 'src', probe_ext: '.test.tsx', timeout_s: 60 };
const dauVao = (r: { dir: string; sha: string }, them: Partial<Parameters<typeof runCanary>[0]> = {}) => ({
  repo: r.dir,
  sha: r.sha,
  runner: runnerCfg,
  fileName: 'checker_probe.test.tsx',
  probeDir: 'src',
  parseJUnit,
  matchId: matchProbeId,
  ...them,
});

describe('runProbeFile — một hàm, ba người gọi', () => {
  it('T2.9 sandbox được huỷ KỂ CẢ khi bộ chạy ném', () => {
    const r = repoKichBan('do');
    let dir = '';
    vi.spyOn(Sandbox.prototype, 'chayTheoRunner').mockImplementation(function (this: Sandbox) {
      dir = this.dir;
      throw new Error('bo chay nem');
    });
    expect(() => runProbeFile({ repo: r.dir, sha: r.sha, code: 'x', fileName: 'f.test.tsx', probeDir: 'src', runner: runnerCfg, parseJUnit })).toThrow('bo chay nem');
    expect(dir).not.toBe('');
    expect(existsSync(dir), 'thư mục sandbox phải bị huỷ trong finally').toBe(false);
  }, TRAN_MS);

  it('T2.10 đúng đường: runner có test_cmd ⇒ chayTheoRunner; không có ⇒ chayVitest — và timeoutS đi tới đúng chỗ', () => {
    const r = repoKichBan('do');
    const theoRunner = vi.spyOn(Sandbox.prototype, 'chayTheoRunner').mockReturnValue(kqRong());
    const vitest = vi.spyOn(Sandbox.prototype, 'chayVitest').mockReturnValue(kqRong());
    runProbeFile({ repo: r.dir, sha: r.sha, code: 'x', fileName: 'f.test.tsx', probeDir: 'src', runner: runnerCfg, parseJUnit, timeoutS: 7 });
    expect(theoRunner).toHaveBeenCalledTimes(1);
    expect(vitest).toHaveBeenCalledTimes(0);
    expect((theoRunner.mock.calls[0]![1] as { timeout_s: number }).timeout_s).toBe(7);
    runProbeFile({ repo: r.dir, sha: r.sha, code: 'x', fileName: 'f.test.ts', probeDir: 'test', runner: null, parseJUnit, timeoutS: 9 });
    expect(vitest).toHaveBeenCalledTimes(1);
    expect(vitest.mock.calls[0]![1]).toBe(9);
    // Không truyền timeoutS ⇒ runner giữ nguyên timeout_s của nó (hành vi cũ).
    runProbeFile({ repo: r.dir, sha: r.sha, code: 'x', fileName: 'f.test.tsx', probeDir: 'src', runner: runnerCfg, parseJUnit });
    expect((theoRunner.mock.calls[1]![1] as { timeout_s: number }).timeout_s).toBe(60);
  }, TRAN_MS);

  it('T2.12 hai lượt cùng repo ⇒ hai sandbox khác nhau, không đụng file', () => {
    const r = repoKichBan('do');
    const dirs: string[] = [];
    vi.spyOn(Sandbox.prototype, 'chayTheoRunner').mockImplementation(function (this: Sandbox) {
      dirs.push(this.dir);
      return kqRong();
    });
    runProbeFile({ repo: r.dir, sha: r.sha, code: 'x', fileName: 'f.test.tsx', probeDir: 'src', runner: runnerCfg, parseJUnit });
    runProbeFile({ repo: r.dir, sha: r.sha, code: 'y', fileName: 'f.test.tsx', probeDir: 'src', runner: runnerCfg, parseJUnit });
    expect(dirs).toHaveLength(2);
    expect(dirs[0]).not.toBe(dirs[1]);
  }, TRAN_MS);
});

describe('runCanary — bảy kết cục chạy THẬT qua đường runner của repo tạm', () => {
  it('proven: mồi đỏ đi tới được XML — có giây, không timedOut, probePath đúng', () => {
    const bao = runCanary(dauVao(repoKichBan('do')));
    expect(bao.outcome).toBe('proven');
    expect(bao.timedOut).toBe(false);
    expect(bao.seconds).toBeGreaterThanOrEqual(0);
    expect(bao.probePath).toBe('src/checker_probe.test.tsx');
  }, TRAN_MS);

  it('T3.5 xanh giả: bộ chạy báo đạt cho mồi ⇒ canary_not_failed', () => {
    expect(runCanary(dauVao(repoKichBan('xanh-gia'))).outcome).toBe('canary_not_failed');
  }, TRAN_MS);

  it('canary_not_in_output: XML có test nhưng không phải mồi', () => {
    expect(runCanary(dauVao(repoKichBan('khac'))).outcome).toBe('canary_not_in_output');
  }, TRAN_MS);

  it('T3.3 ca đã gãy admin-fe: XML rỗng ⇒ probe_not_collected kèm stdout của bộ chạy', () => {
    const bao = runCanary(dauVao(repoKichBan('rong')));
    expect(bao.outcome).toBe('probe_not_collected');
    expect(bao.runnerOutput?.stdout).toContain('No test files found matching');
  }, TRAN_MS);

  it('T3.4 nợ 32 hàng 2: template nuốt thất bại ⇒ runner_output_missing kèm stderr', () => {
    const bao = runCanary(dauVao(repoKichBan('khong-xml')));
    expect(bao.outcome).toBe('runner_output_missing');
    expect(bao.runnerOutput?.stderr).toContain('template nuot that bai');
  }, TRAN_MS);

  it('T3.6 mồi không nạp ⇒ skipped_load_error có note, KHÔNG đổ cho probe_dir', () => {
    const bao = runCanary(dauVao(repoKichBan('nap')));
    expect(bao.outcome).toBe('skipped_load_error');
    expect(bao.note).toContain('Cannot find package vitest');
  }, TRAN_MS);

  it('đuôi lạ ⇒ skipped_no_canary, KHÔNG dựng sandbox', () => {
    const r = repoKichBan('do');
    const spy = vi.spyOn(Sandbox.prototype, 'chayTheoRunner');
    const bao = runCanary(dauVao(r, { fileName: 'checker_probe.kt', runner: { ...runnerCfg, probe_ext: '.kt' } }));
    expect(bao.outcome).toBe('skipped_no_canary');
    expect(bao.note).toContain('không có mồi');
    expect(spy).toHaveBeenCalledTimes(0);
  }, TRAN_MS);

  it('Java thiếu tên lớp hợp lệ ⇒ skipped_no_canary với note nêu probe_file', () => {
    const r = repoKichBan('do');
    const bao = runCanary(dauVao(r, { fileName: 'bad name.java' }));
    expect(bao.outcome).toBe('skipped_no_canary');
    expect(bao.note).toContain('probe_file');
  }, TRAN_MS);

  it('T5.5 mồi đi đúng đường của probe thật — không runner ⇒ chayVitest, có runner ⇒ chayTheoRunner; sha đúng', () => {
    const r = repoKichBan('do');
    const vitest = vi.spyOn(Sandbox.prototype, 'chayVitest').mockReturnValue({ ok: true, tongTest: 1, probes: [probe('CANARY: CheckMate runner contract')], loiThu: '' });
    const bao = runCanary(dauVao(r, { runner: null, fileName: 'checker.probe.test.ts', probeDir: 'test' }));
    expect(vitest).toHaveBeenCalledTimes(1);
    expect(bao.outcome).toBe('proven');
    expect(bao.probePath).toBe('test/checker.probe.test.ts');
  }, TRAN_MS);

  it('timedOut phản ánh treo của bộ chạy; outcome khi ấy là runner_output_missing', () => {
    const r = repoKichBan('do');
    vi.spyOn(Sandbox.prototype, 'chayTheoRunner').mockReturnValue({ ...kqRong(), treo: true, loiThu: 'TIMEOUT' });
    const bao = runCanary(dauVao(r, { timeoutS: 1 }));
    expect(bao.timedOut).toBe(true);
    expect(bao.outcome).toBe('runner_output_missing');
  }, TRAN_MS);
});
