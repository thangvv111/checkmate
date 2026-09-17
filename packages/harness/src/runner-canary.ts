import { Sandbox, type IsolationInfo, type ProbeResult, type VitestResult } from './sandbox.js';
import type { RunnerCfg } from './runner.js';

/**
 * Hợp đồng chạy probe của repo đích — capability `probe-environment` (mồi) và `target-contract`.
 *
 * File này giữ MỘT đường «ghi file probe → chạy → đọc kết quả» cho ba người gọi: đường chấm thật, cửa đột
 * biến, và mồi. Trước 17/09 hai người gọi đầu tự dựng sandbox riêng và đã lệch nhau một lần về tên file
 * probe (chú thích ở cửa đột biến, `skill-code.ts`). Mồi là người gọi thứ ba, và **mồi chỉ có giá trị khi nó
 * đi đúng đường probe thật sẽ đi** — đường riêng thì nó chứng minh một hợp đồng khác.
 *
 * Mồi (canary): một phép thử CỐ TÌNH ĐỎ, thân là hằng của CheckMate, ghi vào đúng chỗ probe thật sẽ được
 * ghi, chạy qua đúng đường, rồi đòi thấy nó ĐỎ trong đầu ra. Đề xuất đến từ đội repo đích (nợ 32, 08/09):
 * «chạy thử một probe cố tình đỏ, và đòi thấy FAIL chứ không phải "không xuất XML" — đó mới là cổng thật».
 */

// ---------------------------------------------------------------------------------------------------
// Tên file và thư mục probe — MỘT chỗ quyết cho đường chấm, cửa đột biến, mồi, và cửa thêm repo
// ---------------------------------------------------------------------------------------------------

/** Tên file probe của đường vitest mặc định (repo không khai runner). */
export const DEFAULT_PROBE_FILE = 'checker.probe.test.ts';
/** Thư mục probe mặc định. */
export const DEFAULT_PROBE_DIR = 'test';

/**
 * Tên file probe theo hợp đồng repo đích: `runner.probe_file` (Java cần trùng tên lớp) → `checker_probe` +
 * `runner.probe_ext` → mặc định của đường vitest. Cửa song sinh thứ mười của repo (08/09) là hai chỗ cùng
 * quyết tên này; nay cửa thêm repo là người gọi thứ tư, nên quy tắc sống ở đây.
 */
export function probeFileNameFor(runner: Pick<RunnerCfg, 'probe_file' | 'probe_ext'> | null | undefined): string {
  return runner ? (runner.probe_file ?? `checker_probe${runner.probe_ext}`) : DEFAULT_PROBE_FILE;
}

/** Thư mục probe theo hợp đồng repo đích, hoặc mặc định. */
export function probeDirFor(runner: Pick<RunnerCfg, 'probe_dir'> | null | undefined): string {
  return runner?.probe_dir ?? DEFAULT_PROBE_DIR;
}

// ---------------------------------------------------------------------------------------------------
// runProbeFile — một đường cho ba người gọi
// ---------------------------------------------------------------------------------------------------

export interface RunProbeFileInput {
  repo: string;
  sha: string;
  /** Nội dung file probe. */
  code: string;
  /** Tên file probe — CHÍNH tên đường thật dùng (`fileProbeMoi`), không tên riêng. */
  fileName: string;
  /** Thư mục ghi probe trong sandbox — `runner.probe_dir` hoặc mặc định `test`. */
  probeDir: string;
  runner: RunnerCfg | null;
  image?: string;
  parseJUnit: (xml: string, file: string) => ProbeResult[];
  /**
   * Thời hạn riêng (giây). Vắng ⇒ đường vitest dùng mặc định của nó, đường runner dùng `runner.timeout_s` —
   * đúng hành vi trước khi hàm này tồn tại. Chỉ mồi ở cửa thêm repo đặt giá trị này.
   */
  timeoutS?: number;
  /** Mức cô lập THỰC TẾ của sandbox vừa dựng — bên gọi ghi lại để đưa lên verdict. */
  onIsolation?: (info: IsolationInfo) => void;
}

/**
 * Ghi một file probe vào sandbox dựng từ `sha`, chạy qua đúng đường repo đích sẽ dùng (runner khai hay
 * vitest mặc định), trả kết quả. Sandbox được huỷ trong `finally`, kể cả khi bộ chạy ném.
 */
export function runProbeFile(input: RunProbeFileInput): VitestResult {
  const sb = new Sandbox(input.repo, input.sha, input.image);
  input.onIsolation?.(sb.coLap);
  try {
    const files = [sb.ghiProbe(input.code, input.fileName, input.probeDir)];
    if (input.runner) {
      const cfg = input.timeoutS !== undefined ? { ...input.runner, timeout_s: input.timeoutS } : input.runner;
      return sb.chayTheoRunner(files, cfg, input.parseJUnit);
    }
    return sb.chayVitest(files, input.timeoutS);
  } finally {
    sb.huy();
  }
}

// ---------------------------------------------------------------------------------------------------
// Bảng mồi — ĐÓNG theo ngôn ngữ
// ---------------------------------------------------------------------------------------------------

/**
 * Id của mồi trong tên test — nối bằng chính `matchProbeId` của đường thật (cắt `test_`, so tiền tố, ký tự
 * sau không phải chữ số). Không đụng dải `P<n>` của probe thật.
 */
export const CANARY_ID = 'CANARY';

export type CanaryLanguage = 'ts' | 'tsx' | 'js' | 'mjs' | 'py' | 'java';

/** Trần thời gian mồi ở CỬA THÊM REPO (giây) — thời hạn của một yêu cầu HTTP, không phải của bộ test (D9). */
export const CANARY_TIMEOUT_AT_ADD_S = 180;

const JS_BODY = "test('CANARY: CheckMate runner contract', () => {\n  expect(1).toBe(2);\n});\n";
const JS_VITEST_IMPORT = "import { test, expect } from 'vitest';\n\n";
const PY_BODY = 'def test_CANARY_runner_contract():\n    assert 1 == 2\n';
const JAVA_BODY =
  'import org.junit.jupiter.api.Test;\n' +
  'import static org.junit.jupiter.api.Assertions.fail;\n\n' +
  'class __CLASS__ {\n' +
  '    @Test\n' +
  '    void CANARY_runner_contract() {\n' +
  '        fail("CheckMate canary: this test is meant to fail");\n' +
  '    }\n' +
  '}\n';

/**
 * Thân mồi theo ngôn ngữ — bảng ĐÓNG. Thêm một hàng là một change, kèm fixture chạy thật trên một repo của
 * hệ ấy (nợ 8.3). Java mang chỗ trống `__CLASS__` — chỉ được điền bằng tên lớp đã qua kiểm hình dạng (⛔C4).
 */
export const CANARY_BY_LANGUAGE: ReadonlyMap<CanaryLanguage, string> = new Map<CanaryLanguage, string>([
  ['ts', JS_BODY],
  ['tsx', JS_BODY],
  ['js', JS_BODY],
  ['mjs', JS_BODY],
  ['py', PY_BODY],
  ['java', JAVA_BODY],
]);

/** Tên lớp Java hợp lệ — kiểm HÌNH DẠNG trước khi nội suy; đây là giá trị đến từ `checkmate.yml` của repo đích. */
const JAVA_CLASS_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Ngôn ngữ của mồi từ đuôi file probe (`.probe.test.ts` → `ts`, `checker_probe.test.tsx` → `tsx`). Nhận cả
 * đuôi lẫn tên file — lấy đoạn sau dấu chấm CUỐI. Ngoài bảng ⇒ `null`: mồi bỏ qua kèm log, không chặn (D6).
 */
export function canaryLanguage(probeExtOrName: unknown): CanaryLanguage | null {
  const s = typeof probeExtOrName === 'string' ? probeExtOrName.trim() : '';
  const i = s.lastIndexOf('.');
  if (i < 0 || i === s.length - 1) return null;
  const duoi = s.slice(i + 1).toLowerCase();
  return CANARY_BY_LANGUAGE.has(duoi as CanaryLanguage) ? (duoi as CanaryLanguage) : null;
}

/**
 * Thân mồi cho một ngôn ngữ — HẰNG, không nội suy gì từ repo đích ngoài tên lớp Java đã kiểm.
 *
 * `framework` là giá trị repo tự khai, chỉ so với bảng đóng để chọn khuôn: `/jest/i` ⇒ dùng global (jest
 * không có module `vitest`); còn lại (vitest, hoặc đường mặc định không khai) ⇒ import từ `vitest`. Đoán
 * sai ⇒ mồi không nạp ⇒ bỏ qua kèm log — fail-safe, không đổ cho repo đích.
 *
 * Trả `null` khi không viết được mồi (ngôn ngữ ngoài bảng · Java thiếu/rác tên lớp).
 */
export function writeCanary(lang: CanaryLanguage | null, opts: { framework?: string; className?: string } = {}): string | null {
  if (lang === null) return null;
  const body = CANARY_BY_LANGUAGE.get(lang);
  if (body === undefined) return null;
  if (lang === 'java') {
    const ten = typeof opts.className === 'string' ? opts.className.trim() : '';
    if (!JAVA_CLASS_NAME.test(ten)) return null;
    return body.replace('__CLASS__', ten);
  }
  if (lang === 'py') return body;
  const laJest = /jest/i.test(typeof opts.framework === 'string' ? opts.framework : '');
  return (laJest ? '' : JS_VITEST_IMPORT) + body;
}

// ---------------------------------------------------------------------------------------------------
// Phân loại kết cục — THỨ TỰ là luật (design D5)
// ---------------------------------------------------------------------------------------------------

export type CanaryOutcome =
  /** hợp đồng đã tự chứng minh — mồi đỏ đi tới được đầu ra */
  | 'proven'
  /** có đầu ra, 0 test, không lỗi nạp — bộ chạy không nhặt file probe */
  | 'probe_not_collected'
  /** không có đầu ra (hoặc treo) — template nuốt thất bại / bộ chạy chết sớm */
  | 'runner_output_missing'
  /** có test nhưng không testcase nào là của mồi — đầu ra không phải của lượt này */
  | 'canary_not_in_output'
  /** testcase mồi có mặt mà KHÔNG đỏ — bộ chạy báo xanh cho phép thử đỏ (xanh giả) */
  | 'canary_not_failed'
  /** mồi không nạp được — CheckMate viết mồi không hợp khuôn repo này; bỏ qua, không kết luận */
  | 'skipped_load_error'
  /** không có mồi cho đuôi này / Java thiếu tên lớp; bỏ qua, không kết luận */
  | 'skipped_no_canary';

/** Bốn kết cục làm lượt DỪNG trước lời gọi model đầu tiên (đường chấm) / thành cảnh báo (cửa thêm repo). */
export const CANARY_BLOCKING: ReadonlySet<CanaryOutcome> = new Set<CanaryOutcome>([
  'probe_not_collected',
  'runner_output_missing',
  'canary_not_in_output',
  'canary_not_failed',
]);

export interface CanaryMatcher {
  id: string;
  /** Chính `matchProbeId` của đường thật — truyền vào để không thêm phép nối riêng và không tạo vòng import. */
  matchId: (title: string, id: string) => boolean;
}

/**
 * Phân loại một kết quả chạy thành kết cục — bằng SỐ ĐẾM và TRẠNG THÁI của đầu ra có cấu trúc, không bằng
 * lời văn stdout (⛔C4).
 *
 * Với mồi (`canary` có): bảy hàng theo đúng thứ tự. Với đường thật (`canary` vắng): CHỈ hàng «không thu thập
 * được» có nghĩa, còn lại `null` để đường cũ chạy như cũ — cùng một hàm cho một luật, không hai biểu thức.
 *
 * ⛔ Thứ tự: lỗi nạp (3) đứng TRƯỚC «0 test» (4). Lỗi nạp cũng cho 0 test; đảo lại thì mồi viết sai khuôn bị kê
 * thành «không thu thập được» và đổ cho `probe_dir` của repo đích.
 */
export function classifyCanaryOutcome(kq: Partial<VitestResult> | null | undefined, canary?: CanaryMatcher): CanaryOutcome | null {
  const laMoi = canary !== undefined;
  const k = kq ?? {};
  const loiNap = Array.isArray(k.loiNap) ? k.loiNap : [];
  const probes = Array.isArray(k.probes) ? k.probes : null;

  // 1 · treo: mồi một dòng không thể treo — treo là bộ chạy.
  if (k.treo === true) return laMoi ? 'runner_output_missing' : null;
  // 2 · không có đầu ra.
  if (k.reason === 'output_missing') return laMoi ? 'runner_output_missing' : null;
  // Hình dạng không đọc được (khuyết cả `probes`) — không biết gì; mồi nghiêng về dừng, đường thật để đường cũ xử.
  if (probes === null) return laMoi ? 'runner_output_missing' : null;
  // 3 · lỗi nạp file: một file duy nhất được ghi, nên lỗi nạp nào cũng là của nó.
  if (loiNap.length > 0) return laMoi ? 'skipped_load_error' : null;
  // 4 · có đầu ra, 0 test, không lỗi nạp — bộ chạy không nhặt file probe. Hàng duy nhất của đường thật.
  if (k.reason === 'not_collected') return 'probe_not_collected';
  if (!laMoi) return null;
  // 5 · có test nhưng không cái nào là mồi.
  const cuaMoi = probes.filter((p) => canary.matchId(typeof p?.title === 'string' ? p.title : '', canary.id));
  if (cuaMoi.length === 0) return 'canary_not_in_output';
  // 6 · mồi có mặt mà không đỏ — xanh giả.
  if (!cuaMoi.some((p) => p.status === 'failed')) return 'canary_not_failed';
  // 7 · đỏ đúng chỗ.
  return 'proven';
}

// ---------------------------------------------------------------------------------------------------
// runCanary — một hàm cho hai cửa (đường chấm · cửa thêm repo)
// ---------------------------------------------------------------------------------------------------

export interface RunCanaryInput {
  repo: string;
  /** Nhánh GỐC của lượt (đường chấm) hoặc HEAD của bản clone (cửa thêm repo) — hợp đồng đọc từ nhánh gốc. */
  sha: string;
  runner: RunnerCfg | null;
  image?: string;
  /** CHÍNH `fileProbeMoi` và `probe_dir` của đường thật — mồi và probe thật cùng tên, cùng chỗ (security S8·2). */
  fileName: string;
  probeDir: string;
  parseJUnit: (xml: string, file: string) => ProbeResult[];
  matchId: CanaryMatcher['matchId'];
  timeoutS?: number;
  onIsolation?: (info: IsolationInfo) => void;
}

export interface CanaryReport {
  outcome: CanaryOutcome;
  /** Thời gian chạy mồi, giây, một chữ số thập phân — ghi vào log để nợ 8.1 có số. */
  seconds: number;
  /** Bộ chạy không kết thúc trong `timeoutS`. Cửa thêm repo đọc cờ này TRƯỚC `outcome` (hết giờ = chưa kết luận). */
  timedOut: boolean;
  /** Đường file mồi đã ghi (tương đối trong sandbox) — để thông điệp trỏ tới. */
  probePath: string;
  /** Lý do bỏ qua (khi `skipped_*`). */
  note?: string;
  /** Đầu ra bộ chạy khi có — ⛔C3: CHƯA che, bên gọi phải qua `redactMessage` trước khi phát. */
  runnerOutput?: { stdout: string; stderr: string };
}

/** Ghi mồi → chạy qua `runProbeFile` → phân loại → đo giây. Không ném vì kết cục; chỉ ném khi sandbox không dựng được. */
export function runCanary(input: RunCanaryInput): CanaryReport {
  const probePath = `${input.probeDir.replace(/\\/g, '/').replace(/\/+$/, '')}/${input.fileName}`;
  const lang = canaryLanguage(input.fileName);
  if (lang === null) {
    return { outcome: 'skipped_no_canary', seconds: 0, timedOut: false, probePath, note: `không có mồi cho đuôi của ${input.fileName}` };
  }
  const className = lang === 'java' ? input.fileName.replace(/\.java$/i, '') : undefined;
  const code = writeCanary(lang, { framework: input.runner?.framework, className });
  if (code === null) {
    return { outcome: 'skipped_no_canary', seconds: 0, timedOut: false, probePath, note: lang === 'java' ? 'mồi Java cần runner.probe_file là tên lớp hợp lệ' : `không viết được mồi cho ${lang}` };
  }
  const t0 = Date.now();
  const kq = runProbeFile({
    repo: input.repo,
    sha: input.sha,
    code,
    fileName: input.fileName,
    probeDir: input.probeDir,
    runner: input.runner,
    image: input.image,
    parseJUnit: input.parseJUnit,
    timeoutS: input.timeoutS,
    onIsolation: input.onIsolation,
  });
  const seconds = Math.round((Date.now() - t0) / 100) / 10;
  const outcome = classifyCanaryOutcome(kq, { id: CANARY_ID, matchId: input.matchId }) ?? 'runner_output_missing';
  const bao: CanaryReport = { outcome, seconds, timedOut: kq.treo === true, probePath };
  if (outcome === 'skipped_load_error') bao.note = kq.loiNap?.[0]?.ly_do ?? 'bộ chạy không nói lý do nạp';
  if (kq.runnerOutput) bao.runnerOutput = kq.runnerOutput;
  return bao;
}
