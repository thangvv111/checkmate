/**
 * `runner-contract-selftest` — mồi và gác «không thu thập được» TRONG `runCodeSkill`, lái từ đầu tới cuối.
 *
 * Khoá: `probe-environment › Hợp đồng chạy probe SHALL tự chứng minh bằng mồi trước lời gọi model đầu tiên`
 * (vị trí, hậu quả, bỏ qua có log) · `Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe` (scenario «file probe
 * không được thu thập», «pull request đổi phạm vi thu thập chỉ ở nhánh của nó») · ⛔C2 · ⛔C3.
 *
 * Cách lái: repo tạm hai nhánh + `checkmate.yml` khai runner; `Sandbox.prototype.chayTheoRunner` giả theo
 * HÀNG ĐỢI (mồi là lần gọi 1, rồi PR · gốc · PR · gốc…); model giả đếm lời gọi — lời gọi 1 là kế hoạch, các
 * lời gọi sau là sinh code. Mọi thứ khác (git archive, readTarget, đọc yml, phân loại) chạy THẬT.
 *
 * Mutation: gỡ nhánh `reason === 'not_collected'` ở gác đường thật ⇒ T2.18 đỏ (thành 2 lời gọi sinh code);
 * gỡ `redactMessage` ở đường mồi ⇒ T_bimat đỏ.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { runCodeSkill } from '../packages/harness/src/skill-code.js';
import { Sandbox, type ProbeResult, type VitestResult } from '../packages/harness/src/sandbox.js';
import type { ModelProvider } from '../packages/harness/src/model.js';
import type { RunEvent } from '../packages/shared/src/types.js';

const TRAN_MS = 90_000;

// ---- Fixture repo: main + pr, runner khai, KHÔNG package.json (cửa môi trường đi qua) ------------------------
const goc = mkdtempSync(join(tmpdir(), 'cm-gate-'));
afterAll(() => {
  try {
    rmSync(goc, { recursive: true, force: true });
  } catch {
    /* Windows giữ .git một lúc */
  }
});
afterEach(() => vi.restoreAllMocks());

const gitRun = (d: string, args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd: d, encoding: 'utf8' }).trim();
const ghi = (d: string, files: Record<string, string>, msg: string): void => {
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(d, p)), { recursive: true });
    writeFileSync(join(d, p), c);
  }
  gitRun(d, ['add', '-A']);
  gitRun(d, ['commit', '-q', '-m', msg]);
};
const YML = (them = ''): string =>
  "runner:\n  test_cmd: 'node runner.cjs {files} {out}'\n  framework: vitest\n  probe_dir: src\n  probe_ext: .test.tsx\n  timeout_s: 60\n" + them;
let dem = 0;
/** Repo hai nhánh; `nhanh.txt` = 'goc' ở main, 'pr' ở pr — để ca kiểm mồi archive đúng sha. */
const repoHaiNhanh = (opts: { yml?: string; nodeThieuPhuThuoc?: boolean } = {}): string => {
  const d = join(goc, `r${dem++}`);
  mkdirSync(d);
  gitRun(d, ['init', '-q', '-b', 'main']);
  const files: Record<string, string> = {
    'src/a.ts': 'export const a = 1;\n',
    'nhanh.txt': 'goc\n',
    'runner.cjs': '// bo chay gia — bi spy thay the trong test\n',
    'checkmate.yml': opts.yml ?? YML(),
  };
  if (opts.nodeThieuPhuThuoc) files['package.json'] = '{"name":"x","dependencies":{"react":"1.0.0"}}\n';
  ghi(d, files, 'goc');
  if (opts.nodeThieuPhuThuoc) mkdirSync(join(d, 'node_modules'), { recursive: true }); // rỗng ⇒ chặn
  gitRun(d, ['checkout', '-q', '-b', 'pr']);
  ghi(d, { 'src/a.ts': 'export const a = 2;\n', 'nhanh.txt': 'pr\n' }, 'doi a');
  gitRun(d, ['checkout', '-q', 'main']);
  return d;
};

// ---- Kết quả chạy giả ---------------------------------------------------------------------------------------
const probe = (title: string, status: ProbeResult['status'] = 'failed'): ProbeResult => ({ title, status, message: '', file: 'checker_probe.test.tsx' });
const proven = (): VitestResult => ({ ok: true, tongTest: 1, probes: [probe('CANARY: CheckMate runner contract')], loiThu: '', loiNap: [] });
const passP1 = (): VitestResult => ({ ok: true, tongTest: 1, probes: [probe('P1: t', 'passed')], loiThu: '', loiNap: [] });
const notCollected = (stdout = 'No test files found, exiting with code 1'): VitestResult => ({
  ok: false, tongTest: 0, probes: [], loiThu: 'Không thu thập được test nào', loiNap: [], reason: 'not_collected', runnerOutput: { stdout, stderr: '' },
});
const loadErr = (): VitestResult => ({
  ok: false, tongTest: 0, probes: [], loiThu: 'Không thu thập được test nào từ JUnit XML — 1 file không nạp được',
  loiNap: [{ file: 'checker_probe.test.tsx', ly_do: 'Cannot find module ./x' }],
});
/** Spy `chayTheoRunner` theo hàng đợi; hết hàng thì trả cái cuối. Ghi lại `nhanh.txt` của sandbox mỗi lần. */
function hangDoi(kq: VitestResult[]): { spy: ReturnType<typeof vi.spyOn>; nhanh: string[] } {
  const nhanh: string[] = [];
  let i = 0;
  const spy = vi.spyOn(Sandbox.prototype, 'chayTheoRunner').mockImplementation(function (this: Sandbox) {
    nhanh.push(readFileSync(join(this.dir, 'nhanh.txt'), 'utf8').trim());
    const r = kq[Math.min(i, kq.length - 1)]!;
    i++;
    return r;
  });
  return { spy, nhanh };
}

// ---- Model giả ------------------------------------------------------------------------------------------------
const MODEL_CALLED = 'MODEL_CALLED_SENTINEL';
function modelGia(opts: { chan?: boolean } = {}): { model: ModelProvider; goi: string[]; sinhCode: () => number } {
  const goi: string[] = [];
  const model: ModelProvider = {
    ten: 'gia',
    async complete(prompt: string) {
      goi.push(prompt);
      if (opts.chan) throw new Error(MODEL_CALLED);
      if (goi.length === 1) return JSON.stringify({ probes: [{ id: 'P1', ten: 't', muc_dich: 'm', spec_rule: 'R1', ky_vong: 'k' }] });
      return "```ts\nimport { it, expect } from 'vitest';\nit('P1: t', () => { expect(1).toBe(1); });\n```";
    },
  };
  return { model, goi, sinhCode: () => Math.max(0, goi.length - 1) };
}
const gom = (): { phat: (e: RunEvent) => void; logs: string[] } => {
  const logs: string[] = [];
  return { logs, phat: (e) => { if (e.type === 'log') logs.push(e.msg); } };
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
describe('mồi trong runCodeSkill — vị trí và hậu quả', () => {
  it('T2.13 mồi probe_not_collected ⇒ ném TRƯỚC lời gọi model, 0 lời gọi, log «DỪNG TRƯỚC KHI GỌI MODEL»', async () => {
    const repo = repoHaiNhanh();
    const { spy } = hangDoi([notCollected()]);
    const m = modelGia({ chan: true });
    const g = gom();
    await expect(runCodeSkill(m.model, repo, 'pr', 'main', g.phat)).rejects.toThrow(/probe_not_collected/);
    expect(m.goi).toHaveLength(0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(g.logs.some((l) => l.includes('⛔ DỪNG TRƯỚC KHI GỌI MODEL') && l.includes('mồi hợp đồng runner'))).toBe(true);
  }, TRAN_MS);

  it('T2.13b thông điệp ném nêu đường file probe và hai núm — không «probe viết sai»', async () => {
    const repo = repoHaiNhanh();
    hangDoi([notCollected()]);
    const m = modelGia({ chan: true });
    const loi = await runCodeSkill(m.model, repo, 'pr', 'main', gom().phat).catch((e: Error) => e.message);
    expect(loi).toContain('src/checker_probe.test.tsx');
    expect(loi).toContain('runner.probe_dir');
    expect(loi).toContain('runner.probe_ext');
    expect(loi).not.toMatch(/probe viết sai/);
  }, TRAN_MS);

  it('T2.14 cửa môi trường chặn ⇒ mồi KHÔNG chạy (spy = 0)', async () => {
    const repo = repoHaiNhanh({ nodeThieuPhuThuoc: true });
    const { spy } = hangDoi([proven()]);
    const m = modelGia({ chan: true });
    await expect(runCodeSkill(m.model, repo, 'pr', 'main', gom().phat)).rejects.toThrow(/Môi trường chưa chạy được probe/);
    expect(spy).toHaveBeenCalledTimes(0);
    expect(m.goi).toHaveLength(0);
  }, TRAN_MS);

  it('T2.15 bỏ qua LUÔN có đúng một dòng log, model vẫn được gọi — đuôi lạ (.kt)', async () => {
    const repo = repoHaiNhanh({ yml: YML().replace('probe_ext: .test.tsx', 'probe_ext: .kt') });
    const { spy } = hangDoi([proven()]);
    const m = modelGia({ chan: true });
    const g = gom();
    await expect(runCodeSkill(m.model, repo, 'pr', 'main', g.phat)).rejects.toThrow(MODEL_CALLED);
    expect(spy).toHaveBeenCalledTimes(0); // không dựng sandbox cho mồi không có
    expect(g.logs.filter((l) => l.startsWith('Mồi hợp đồng runner: bỏ qua —'))).toHaveLength(1);
    expect(m.goi).toHaveLength(1);
  }, TRAN_MS);

  it('T2.15b bỏ qua — mồi không nạp được (loiNap) ⇒ log nêu lý do nạp, model vẫn được gọi', async () => {
    const repo = repoHaiNhanh();
    hangDoi([loadErr()]);
    const m = modelGia({ chan: true });
    const g = gom();
    await expect(runCodeSkill(m.model, repo, 'pr', 'main', g.phat)).rejects.toThrow(MODEL_CALLED);
    const dong = g.logs.filter((l) => l.startsWith('Mồi hợp đồng runner: bỏ qua —'));
    expect(dong).toHaveLength(1);
    expect(dong[0]).toContain('skipped_load_error');
  }, TRAN_MS);

  it('T2.16 đã chứng minh ⇒ log có số giây; T2.17 mồi chạy trên nhánh GỐC', async () => {
    const repo = repoHaiNhanh();
    const { nhanh } = hangDoi([proven()]);
    const m = modelGia({ chan: true });
    const g = gom();
    await expect(runCodeSkill(m.model, repo, 'pr', 'main', g.phat)).rejects.toThrow(MODEL_CALLED);
    expect(g.logs.some((l) => /^Mồi hợp đồng runner: đã chứng minh — \d+(\.\d)?s$/.test(l))).toBe(true);
    expect(nhanh[0], 'sandbox của mồi phải bung từ nhánh gốc').toBe('goc');
  }, TRAN_MS);

  it('T3.5 xanh giả — mồi được báo đạt ⇒ chặn, 0 lời gọi model', async () => {
    const repo = repoHaiNhanh();
    hangDoi([{ ...proven(), probes: [probe('CANARY: CheckMate runner contract', 'passed')] }]);
    const m = modelGia({ chan: true });
    await expect(runCodeSkill(m.model, repo, 'pr', 'main', gom().phat)).rejects.toThrow(/canary_not_failed/);
    expect(m.goi).toHaveLength(0);
  }, TRAN_MS);
});

describe('gác đường thật — probe_not_collected không sinh lại', () => {
  it('T2.18 nhánh PR không thu thập được (mồi đã proven ở gốc) ⇒ ném, nêu «nhánh pull request», ĐÚNG 1 lời gọi sinh code', async () => {
    const repo = repoHaiNhanh();
    const { nhanh } = hangDoi([proven(), notCollected(), passP1()]);
    const m = modelGia();
    const g = gom();
    const loi = await runCodeSkill(m.model, repo, 'pr', 'main', g.phat).catch((e: Error) => e.message);
    expect(loi).toContain('probe_not_collected');
    expect(loi).toContain('nhánh pull request');
    expect(m.sinhCode()).toBe(1);
    expect(nhanh.slice(0, 3)).toEqual(['goc', 'pr', 'goc']);
    expect(g.logs.some((l) => l.includes('KHÔNG NHẶT file probe') && l.includes('pull request'))).toBe(true);
  }, TRAN_MS);

  it('T2.19 nhánh GỐC không thu thập được (PR chạy được) ⇒ ném, nêu «nhánh gốc», không sinh lại', async () => {
    const repo = repoHaiNhanh();
    hangDoi([proven(), passP1(), notCollected()]);
    const m = modelGia();
    const loi = await runCodeSkill(m.model, repo, 'pr', 'main', gom().phat).catch((e: Error) => e.message);
    expect(loi).toContain('probe_not_collected');
    expect(loi).toContain('nhánh gốc');
    expect(m.sinhCode()).toBe(1);
  }, TRAN_MS);

  it('T2.20 đường cũ giữ: lỗi nạp file ⇒ sinh lại như cũ, 2 lời gọi sinh code, rồi «sau 2 lần sinh»', async () => {
    const repo = repoHaiNhanh();
    hangDoi([proven(), loadErr(), passP1(), loadErr(), passP1()]);
    const m = modelGia();
    const loi = await runCodeSkill(m.model, repo, 'pr', 'main', gom().phat).catch((e: Error) => e.message);
    expect(loi).toContain('sau 2 lần sinh');
    expect(loi).not.toContain('probe_not_collected');
    expect(m.sinhCode()).toBe(2);
  }, TRAN_MS);

  it('T2.21 thứ tự gác: reason not_collected THẮNG chuỗi loiThu trông như lỗi mạng', async () => {
    const repo = repoHaiNhanh();
    hangDoi([proven(), { ...notCollected(), loiThu: 'getaddrinfo EAI_AGAIN registry.npmjs.org' }]);
    const m = modelGia();
    const loi = await runCodeSkill(m.model, repo, 'pr', 'main', gom().phat).catch((e: Error) => e.message);
    expect(loi).toContain('probe_not_collected');
    expect(loi).not.toContain('thiếu phụ thuộc');
    expect(m.sinhCode()).toBe(1);
  }, TRAN_MS);
});

describe('⛔C3 — stdout của bộ chạy repo đích không rò nguyên văn (T_bimat)', () => {
  const TOKEN = 'ghp_AbCdEf0123456789AbCdEf0123456789AbCd';
  it('đường mồi: token trong stdout KHÔNG có trong thông điệp ném; bản che có mặt', async () => {
    const repo = repoHaiNhanh();
    hangDoi([notCollected(`leak ${TOKEN} here`)]);
    const m = modelGia({ chan: true });
    const loi = await runCodeSkill(m.model, repo, 'pr', 'main', gom().phat).catch((e: Error) => e.message);
    expect(loi).toContain('probe_not_collected');
    expect(loi).not.toContain(TOKEN);
    expect(loi).toContain('Bộ chạy nói:');
    expect(loi).toMatch(/không nhận dạng được, \d+ ký tự/);
  }, TRAN_MS);

  it('đường thật: token trong stdout của nhánh PR KHÔNG có trong thông điệp ném, KHÔNG vào prompt model', async () => {
    const repo = repoHaiNhanh();
    hangDoi([proven(), notCollected(`leak ${TOKEN} here`)]);
    const m = modelGia();
    const loi = await runCodeSkill(m.model, repo, 'pr', 'main', gom().phat).catch((e: Error) => e.message);
    expect(loi).not.toContain(TOKEN);
    expect(loi).toContain('Bộ chạy nói:');
    for (const p of m.goi) expect(p).not.toContain(TOKEN);
  }, TRAN_MS);
});
