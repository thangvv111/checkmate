/**
 * `runner-contract-selftest` D9 — mồi hợp đồng runner ở CỬA THÊM REPO.
 *
 * Khoá: `probe-environment › Hợp đồng chạy probe SHALL tự chứng minh bằng mồi…` (vế cửa thêm repo: cảnh báo
 * không chặn đăng ký · thời hạn riêng · hết giờ = chưa kết luận · một mồi một lúc) · `Thông điệp môi trường…`
 * (scenario «cảnh báo mồi đi cùng kênh»).
 *
 * Hai nửa, đúng nếp repo (`login-throttle`, `probe-gate`): quyết định là hàm thuần tầng app (`newAddTimeCanary`)
 * — lái trực tiếp với deps giả; route `/api/repo/them` chỉ nối dây — khoá bằng lưới quét nguồn có cặp fixture.
 *
 * Mutation (hai lần, kiểm diff): gỡ `finally` hạ cờ ⇒ T2.29 đỏ · gỡ kiểm `blockedByEnvironment` ⇒ T2.24 đỏ ·
 * đẩy cảnh báo cho `proven` ⇒ T2.26 đỏ.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  ADD_TIME_CANARY_BUSY,
  ADD_TIME_CANARY_FAILED,
  ADD_TIME_CANARY_INCONCLUSIVE,
  newAddTimeCanary,
  type AddTimeCanaryDeps,
  type CanaryReportLike,
} from '../apps/web/src/repo-add-canary.js';

const BLOCKING = new Set(['probe_not_collected', 'runner_output_missing', 'canary_not_in_output', 'canary_not_failed']);
const bao = (outcome: string, them: Partial<CanaryReportLike> = {}): CanaryReportLike => ({ outcome, timedOut: false, seconds: 1.2, probePath: 'src/checker_probe.test.tsx', ...them });
const dauVao = (them: Partial<Parameters<ReturnType<typeof newAddTimeCanary>['run']>[0]> = {}) => ({
  repo: '/clone/r',
  sha: 'abc',
  fileName: 'checker_probe.test.tsx',
  probeDir: 'src',
  probeExt: '.test.tsx',
  hasTestCmd: true,
  ...them,
});
function depsGia(runCanary: AddTimeCanaryDeps['runCanary']): AddTimeCanaryDeps & { logs: string[] } {
  const logs: string[] = [];
  return {
    logs,
    runCanary,
    describeOutcome: (kind, ctx) => `[${kind}] probe ở ${ctx.probePath} — runner.probe_dir=${ctx.probeDir} · runner.probe_ext=${ctx.probeExt}`,
    redact: (t) => `<che:${t.length}>`,
    isBlocking: (o) => BLOCKING.has(o),
    timeoutCapS: 180,
    log: (m) => logs.push(m),
  };
}

describe('newAddTimeCanary — quyết định ở cửa thêm repo', () => {
  it('T2.23 kết cục chặn ⇒ MỘT cảnh báo mang tên bệnh + đường file + hai núm; không ném', () => {
    const d = depsGia(() => bao('probe_not_collected', { runnerOutput: { stdout: 'No test files found', stderr: '' } }));
    const ra = newAddTimeCanary(d).run(dauVao(), false);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('probe_not_collected');
    expect(ra[0]).toContain('src/checker_probe.test.tsx');
    expect(ra[0]).toContain('runner.probe_dir');
    expect(ra[0]).toContain('runner.probe_ext');
    // ⛔C3: đầu ra bộ chạy đi qua bộ che, không nguyên văn.
    expect(ra[0]).not.toContain('No test files found');
    expect(ra[0]).toContain('<che:');
  });

  it('T2.24 cửa môi trường chặn ⇒ mồi KHÔNG chạy, không cảnh báo thêm', () => {
    const spy = vi.fn(() => bao('probe_not_collected'));
    expect(newAddTimeCanary(depsGia(spy)).run(dauVao(), true)).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('T2.25 hết giờ ⇒ «chưa kết luận», KHÔNG tên bệnh nào trong bốn tên', () => {
    const ra = newAddTimeCanary(depsGia(() => bao('runner_output_missing', { timedOut: true }))).run(dauVao(), false);
    expect(ra).toEqual([ADD_TIME_CANARY_INCONCLUSIVE]);
    for (const b of BLOCKING) expect(ra[0]).not.toContain(b);
    expect(ra[0]).toContain('lượt chấm đầu tiên');
  });

  it('T2.26 proven ⇒ im lặng (không cảnh báo), có log kèm giây', () => {
    const d = depsGia(() => bao('proven', { seconds: 4.2 }));
    expect(newAddTimeCanary(d).run(dauVao(), false)).toEqual([]);
    expect(d.logs.some((l) => l.includes('đã chứng minh') && l.includes('4.2s'))).toBe(true);
  });

  it('T2.27 skipped ⇒ không cảnh báo, nhưng LUÔN một dòng log nêu lý do', () => {
    const d = depsGia(() => bao('skipped_no_canary', { note: 'không có mồi cho đuôi .kt' }));
    expect(newAddTimeCanary(d).run(dauVao(), false)).toEqual([]);
    const dong = d.logs.filter((l) => l.includes('bỏ qua'));
    expect(dong).toHaveLength(1);
    expect(dong[0]).toContain('không có mồi cho đuôi .kt');
  });

  it('T2.28 single-flight: mồi đang chạy ⇒ yêu cầu thứ hai bỏ qua kèm cảnh báo, KHÔNG gọi runCanary lần hai', () => {
    let goi = 0;
    let trongLuc: string[] | undefined;
    let gate: ReturnType<typeof newAddTimeCanary>;
    const d = depsGia(() => {
      goi++;
      // Trong lúc mồi 1 đang chạy, một yêu cầu thêm repo khác đến.
      trongLuc = gate.run(dauVao({ repo: '/clone/khac' }), false);
      return bao('proven');
    });
    gate = newAddTimeCanary(d);
    expect(gate.busy()).toBe(false);
    const ra = gate.run(dauVao(), false);
    expect(ra).toEqual([]);
    expect(trongLuc).toEqual([ADD_TIME_CANARY_BUSY]);
    expect(goi).toBe(1);
    expect(gate.busy()).toBe(false);
  });

  it('T2.29 runCanary ném ⇒ cảnh báo chung, cờ bận được hạ, lần sau lại chạy', () => {
    let lan = 0;
    const d = depsGia(() => {
      lan++;
      if (lan === 1) throw new Error('sandbox khong dung duoc: token=ghp_xyz');
      return bao('proven');
    });
    const gate = newAddTimeCanary(d);
    const ra1 = gate.run(dauVao(), false);
    expect(ra1).toEqual([ADD_TIME_CANARY_FAILED]);
    expect(gate.busy()).toBe(false);
    // log lỗi cũng qua bộ che
    expect(d.logs.some((l) => l.includes('hỏng') && l.includes('<che:') && !l.includes('ghp_xyz'))).toBe(true);
    expect(gate.run(dauVao(), false)).toEqual([]);
    expect(lan).toBe(2);
  });

  it('T2.30 thời hạn = min(runner.timeout_s, trần cửa); không khai ⇒ trần cửa; ≥ 1', () => {
    const thoiHan: number[] = [];
    const d = depsGia((i) => { thoiHan.push(i.timeoutS); return bao('proven'); });
    const gate = newAddTimeCanary(d);
    gate.run(dauVao({ runnerTimeoutS: 3600 }), false);
    gate.run(dauVao({ runnerTimeoutS: 60 }), false);
    gate.run(dauVao(), false);
    gate.run(dauVao({ runnerTimeoutS: 0 }), false);
    expect(thoiHan).toEqual([180, 60, 180, 180]);
  });

  it('T2.30b [F6 · PR #94] runnerTimeoutS rác (NaN · Infinity · âm · chuỗi) ⇒ trần cửa, KHÔNG bao giờ NaN đi xuống', () => {
    const thoiHan: number[] = [];
    const d = depsGia((i) => { thoiHan.push(i.timeoutS); return bao('proven'); });
    const gate = newAddTimeCanary(d);
    for (const x of [Number.NaN, Number.POSITIVE_INFINITY, -5, '60' as unknown as number, null as unknown as number]) gate.run(dauVao({ runnerTimeoutS: x }), false);
    expect(thoiHan).toEqual([180, 180, 180, 180, 180]);
    for (const t of thoiHan) expect(Number.isFinite(t)).toBe(true);
  });

  it('T2.31 đầu vào tên file/thư mục đi thẳng tới runCanary — tầng app không tự ghép tên', () => {
    const nhan: Array<{ fileName: string; probeDir: string; sha: string }> = [];
    const d = depsGia((i) => { nhan.push({ fileName: i.fileName, probeDir: i.probeDir, sha: i.sha }); return bao('proven'); });
    newAddTimeCanary(d).run(dauVao({ fileName: 'CheckerProbeTest.java', probeDir: 'src/test/java', sha: 'deadbeef' }), false);
    expect(nhan).toEqual([{ fileName: 'CheckerProbeTest.java', probeDir: 'src/test/java', sha: 'deadbeef' }]);
  });

  it('T3.1 kết cục lạ (không proven, không chặn, không skipped) ⇒ coi như bỏ qua có log, không ném, không cảnh báo', () => {
    const d = depsGia(() => bao('gi_do_la'));
    expect(newAddTimeCanary(d).run(dauVao(), false)).toEqual([]);
    expect(d.logs.some((l) => l.includes('gi_do_la'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// Route `/api/repo/them` — lưới quét nguồn, cặp fixture ĐỎ/XANH (tầng 3)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/** Trả danh sách vi phạm trong thân route thêm repo. */
export function scanAddRepoRoute(nguon: string): string[] {
  const loi: string[] = [];
  const i = nguon.indexOf("app.post('/api/repo/them'");
  if (i < 0) return ['không thấy route thêm repo — mỏ neo đã đổi, lưới đang mù'];
  const j = nguon.indexOf('\napp.', i + 10);
  const than = nguon.slice(i, j < 0 ? undefined : j);
  const viTri = (s: string): number => than.indexOf(s);
  if (viTri("MODE === 'demo'") < 0) loi.push('route thêm repo mất gác chế độ demo');
  if (viTri('addTimeCanary.run(') < 0) loi.push('route thêm repo không gọi mồi');
  if (viTri('writeConfig(') < 0 || viTri('writeConfig(') > viTri('addTimeCanary.run(')) loi.push('mồi phải chạy SAU khi đăng ký đã ghi (writeConfig) — đăng ký không phụ thuộc mồi');
  if (viTri("MODE === 'demo'") > viTri('addTimeCanary.run(')) loi.push('gác demo phải đứng trước mồi');
  if (viTri('kiem.chan.length > 0') < 0) loi.push('mồi phải nhận cờ «cửa môi trường chặn» (kiem.chan)');
  if (!/nodeVersionOfImage\(runner\?\.image \?\? DEFAULT_IMAGE\)/.test(than)) loi.push('cửa môi trường lúc thêm repo phải so với ảnh repo khai (runner?.image ?? DEFAULT_IMAGE)');
  if (/nodeVersionOfImage\(DEFAULT_IMAGE\)/.test(than)) loi.push('cửa môi trường lúc thêm repo còn so với DEFAULT_IMAGE trần — cảnh báo lệch runtime oan cho repo khai runner.image');
  if (!/testCmd: runner\?\.test_cmd/.test(than)) loi.push('cửa môi trường lúc thêm repo phải nhận test_cmd của repo (cùng nguồn với đường chấm)');
  if (!/fileName: probeFileNameFor\(runner\)/.test(than) || !/probeDir: probeDirFor\(runner\)/.test(than)) loi.push('tên file/thư mục probe phải qua probeFileNameFor/probeDirFor — không ghép tay ở route');
  return loi;
}

describe('route /api/repo/them nối dây đúng (quét nguồn, cặp fixture)', () => {
  const SERVER = readFileSync('apps/web/src/server.ts', 'utf8');
  const XANH = [
    "app.post('/api/repo/them', async (req, res) => {",
    "  if (MODE === 'demo') return res.status(403).json({});",
    '  writeConfig({});',
    '  const runner = readRunnerCfg(dich);',
    "  const kiem = preflightProbeEnvironment({ repo: dich, nodeMoiTruong: () => nodeVersionOfImage(runner?.image ?? DEFAULT_IMAGE), testCmd: runner?.test_cmd });",
    '  canhBao.push(...addTimeCanary.run({ fileName: probeFileNameFor(runner), probeDir: probeDirFor(runner) }, kiem.chan.length > 0));',
    '});',
    'app.post(\'/x\', () => {});',
  ].join('\n');

  it('XANH: fixture đủ dây', () => {
    expect(scanAddRepoRoute(XANH)).toEqual([]);
  });
  it('ĐỎ: mồi chạy TRƯỚC writeConfig', () => {
    const gia = XANH.replace('  writeConfig({});\n', '').replace('});\napp.post', '  writeConfig({});\n});\napp.post');
    expect(scanAddRepoRoute(gia).some((x) => x.includes('SAU khi đăng ký'))).toBe(true);
  });
  it('ĐỎ: cửa môi trường so với DEFAULT_IMAGE trần (bản trước change)', () => {
    const gia = XANH.replace('nodeVersionOfImage(runner?.image ?? DEFAULT_IMAGE), testCmd: runner?.test_cmd', 'nodeVersionOfImage(DEFAULT_IMAGE)');
    const ra = scanAddRepoRoute(gia);
    expect(ra.some((x) => x.includes('DEFAULT_IMAGE trần'))).toBe(true);
    expect(ra.some((x) => x.includes('test_cmd'))).toBe(true);
  });
  it('ĐỎ: không gọi mồi / mất cờ kiem.chan / ghép tên tay', () => {
    expect(scanAddRepoRoute(XANH.replace('addTimeCanary.run(', 'khac(')).some((x) => x.includes('không gọi mồi'))).toBe(true);
    expect(scanAddRepoRoute(XANH.replace('kiem.chan.length > 0', 'false')).some((x) => x.includes('kiem.chan'))).toBe(true);
    expect(scanAddRepoRoute(XANH.replace('fileName: probeFileNameFor(runner)', "fileName: 'checker_probe' + runner.probe_ext")).some((x) => x.includes('probeFileNameFor'))).toBe(true);
  });
  it('ĐỎ khi mỏ neo biến mất — chống xanh oan', () => {
    expect(scanAddRepoRoute('const x = 1;')[0]).toContain('lưới đang mù');
  });
  it('T2.32 · T5.10 · T2.31 mã nguồn HIỆN TẠI: gác demo trước mồi, mồi sau writeConfig, cửa môi trường cùng nguồn với đường chấm, tên probe qua engine', () => {
    expect(scanAddRepoRoute(SERVER)).toEqual([]);
  });
  it('T2.31b bọc runCanary ở server đọc runner + ảnh từ CLONE mỗi lần gọi, truyền matchProbeId và parseJUnit thật', () => {
    const i = SERVER.indexOf('const addTimeCanary = newAddTimeCanary({');
    expect(i).toBeGreaterThan(0);
    const than = SERVER.slice(i, i + 1600);
    expect(than).toContain('const runner = readRunnerCfg(repo);');
    expect(than).toMatch(/runCanary\(\{ repo, sha, runner, image: runner\?\.image,/);
    expect(than).toContain('matchId: matchProbeId');
    expect(than).toContain('parseJUnit');
    expect(than).toContain('timeoutCapS: CANARY_TIMEOUT_AT_ADD_S');
    expect(than).toContain("redactMessage(text, '')");
  });
});
