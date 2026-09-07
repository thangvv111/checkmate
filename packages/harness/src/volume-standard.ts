import { execFileSync } from 'node:child_process';
import type { DensityBand, DensityReason, Knob, KnobSource, Severity, VolumeStandard } from '../../shared/src/types.js';
import { readStandardsCfg } from './runner.js';

/**
 * Chuẩn khối lượng — capability `finding-volume-standard`.
 *
 * Bước hiện tại CHỈ ĐO: đếm theo tầng, cắt đúng một chỗ, đo mật độ rồi ghi lên verdict. Không nhánh nào
 * trong file này đổi PASS/FAIL, bỏ vòng nào, hay sinh finding nào — luật nhị phân vẫn ở `verdict.ts`.
 *
 * Mọi giá trị ở đây đến từ `checkmate.yml` của REPO ĐANG BỊ CHẤM (⛔C4): kẹp dải bằng predicate chặt,
 * đọc từ nhánh gốc qua `git show` (không đọc đĩa — working tree của clone là snapshot lúc kết nối, đo
 * 06/09), và khai nguồn lên verdict. Giá trị KHÔNG đi vào prompt nào.
 */

export interface KnobRange {
  min: number;
  max: number;
  default: number;
}

/** Trần finding của skill-doc. */
export const FINDING_CAP_RANGE: KnobRange = { min: 4, max: 1000, default: 100 };
/** Trần probe của skill-code — mặc định GIỮ trần hôm nay (20); nâng cần bốn điều kiện tiên quyết (tasks 7.2). */
export const PROBE_CAP_RANGE: KnobRange = { min: 2, max: 100, default: 20 };
/** Mức mật độ dải đầu (finding / 1000 từ); nhân tỉ lệ cả bảng DENSITY_BANDS. */
export const DENSITY_RANGE: KnobRange = { min: 1, max: 1000, default: 20 };
/** Sàn cỡ (từ) — dưới sàn không đo. Kẹp hai đầu: sàn 10⁹ là cách vô hiệu chuẩn triệt để nhất. */
export const FLOOR_RANGE: KnobRange = { min: 50, max: 2000, default: 300 };

/**
 * Kẹp một khoá số. Nhận CHỈ `typeof === 'number'` hữu hạn — mọi thứ khác (chuỗi kể cả chuỗi số, null,
 * boolean, mảng, object, ±Infinity, NaN) rơi về mặc định kèm lý do.
 *
 * Vì sao chặt hơn khuôn `Number(x) || d` của `timeout_s`: khuôn ấy nhận `true → 1`, `"100" → 100`,
 * `[5] → 5`, `.inf → ∞`. Với một khoá quyết cách CẮT finding, mỗi ca ấy là một cách ra `NaN` hoặc một
 * số không ai khai — và `[].slice(0, NaN)` trả mảng rỗng ⇒ 0 finding ⇒ PASS.
 */
export function clampKnob(v: unknown, range: KnobRange): Knob {
  if (v === undefined) return { value: range.default, source: 'default' };
  if (typeof v !== 'number' || !Number.isFinite(v)) return { value: range.default, source: 'default', reason: 'invalid_type' };
  const t = Math.trunc(v);
  if (t < range.min) return { value: range.min, source: 'repo', clamped_from: t };
  if (t > range.max) return { value: range.max, source: 'repo', clamped_from: t };
  return { value: t, source: 'repo' };
}

/**
 * Đơn vị «từ», phương pháp v1 — đếm trên `docGoc`, KHÔNG trên bản có tiền tố số dòng.
 *
 * Bỏ front-matter YAML và khối code fence; thay ký tự markdown/ống bảng bằng khoảng trắng; tách theo
 * khoảng trắng; giữ token có ít nhất một chữ hoặc số Unicode. Với tiếng Việt, token khoảng trắng ≈ âm
 * tiết — mặc định của chuẩn chốt cho tài liệu tiếng Việt.
 *
 * Đo 06/09 trên cùng một PRD: `\S+` trên docGoc = 1014 · trên docCoSoDong = 1201 · bỏ dòng bảng = 718.
 * Ba con số, ba kết luận PASS/FAIL khác nhau — nên «từ» phải là một hàm máy có phiên bản, không phải
 * một chữ trong spec.
 */
export function countDocWords(docGoc: string): { words: number; method: 'v1' } {
  let s = String(docGoc ?? '').normalize('NFC');
  // Tiền tố số dòng `N| ` (hình của docCoSoDong) bị gột — không phải vì hàm này được gọi trên bản ấy (nó
  // KHÔNG được), mà để số đếm không phụ thuộc bố cục: đo 06/09, không gột thì 917 → 1012 vì `|` thành
  // khoảng trắng để lại một chữ số mỗi dòng.
  s = s.replace(/^\d{1,6}\| /gm, '');
  s = s.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, ' ');
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/~~~[\s\S]*?~~~/g, ' ');
  s = s.replace(/[|*_`>#\-:]/g, ' ');
  const tokens = s.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
  return { words: tokens.length, method: 'v1' };
}

/**
 * Bậc thang theo cỡ — bảng công bố, dưới tuyến tính. Ranh trên theo số từ; `base_per_1000` là mức
 * khi `density_per_1000_words` = mặc định (20). Repo khai mức khác thì cả bảng nhân tỉ lệ — repo chỉnh
 * MỨC, không chỉnh HÌNH.
 *
 * SỐ TẠM (PO chốt 06/09): căn cứ là sức xử lý của người nhận trong một lượt — hằng số theo lượt, không
 * tỉ lệ theo số từ — nên tuyến tính siết mạnh nhất ở tài liệu nhỏ và không bao giờ chạm ở tài liệu lớn.
 * Chốt lại ở change ép chuẩn, khi sổ cái có ≥ 30 verdict doc mang `volume_standard.counts`. Không suy
 * từ dữ liệu của một đội: chuẩn đi theo thứ nó đo thì không còn là chuẩn.
 */
export const DENSITY_BANDS: ReadonlyArray<{ band: DensityBand; max_words: number; base_per_1000: number }> = [
  { band: '<=1000', max_words: 1000, base_per_1000: 20 },
  { band: '<=5000', max_words: 5000, base_per_1000: 12 },
  { band: '>5000', max_words: Number.POSITIVE_INFINITY, base_per_1000: 8 },
];

/** Số từ có nằm trong dải này không — dùng ở `bandFor`, tách ra để lượt chấm code có một hàm thuần để dò. */
export function inBand(words: number, maxWords: number): boolean {
  return Number.isFinite(words) && words <= maxWords;
}

export function bandFor(words: number): { band: DensityBand; base_per_1000: number } {
  const b = DENSITY_BANDS.find((x) => inBand(words, x.max_words)) ?? DENSITY_BANDS[DENSITY_BANDS.length - 1];
  return { band: b.band, base_per_1000: b.base_per_1000 };
}

const round2 = (x: number): number => Math.round(x * 100) / 100;

/**
 * Đo mật độ — số ứng viên ĐÃ QUA LƯỚI MÁY (rubric + tham chiếu chết + neo trích dẫn), TRƯỚC khi cắt,
 * trên 1000 từ. Đếm thô là để model quyết; đếm sau cắt là để trần do repo khai quyết (hạ `finding_cap`
 * xuống 4 thì không bao giờ vượt). Chỉ số sau lưới là số máy đã kiểm.
 *
 * `applied` luôn `false` ở bước này — thứ duy nhất phép đo này làm là được GHI.
 */
export function measureDensity(input: {
  after_grids: number;
  words: number;
  count_failed?: boolean;
  per_1000_words: Knob;
  floor_words: Knob;
}): NonNullable<VolumeStandard['density']> {
  const standard = { per_1000_words: input.per_1000_words, floor_words: input.floor_words };
  const base = { standard, words: Math.max(0, Math.trunc(Number(input.words) || 0)), count_method: 'v1' as const, applied: false as const };
  if (input.count_failed) return { ...base, reason: 'error' };
  if (!Number.isFinite(input.words) || input.words <= 0) return { ...base, reason: 'unmeasurable' };
  if (input.words < input.floor_words.value) return { ...base, reason: 'under_floor' };
  const { band, base_per_1000 } = bandFor(input.words);
  const threshold = round2(base_per_1000 * (input.per_1000_words.value / DENSITY_RANGE.default));
  const measured = round2((Math.max(0, input.after_grids) * 1000) / input.words);
  return { ...base, band, threshold_per_1000: threshold, measured_per_1000: measured, exceeded: measured > threshold, reason: 'observe_only' };
}

/** Severity model gán có nằm trong ba mức hợp lệ không — chuỗi lạ, số, object đều là «không biết». */
export function isKnownSeverity(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const t = raw.toLowerCase().trim();
  return t === 'high' || t === 'medium' || t === 'low';
}

/**
 * Hạng sắp xếp trước khi cắt. `high` hợp lệ đứng đầu; giá trị LẠ (fail-closed về `high` trên verdict)
 * đứng SAU `high` hợp lệ và TRƯỚC `medium` — để một model ghi `blocker`/số/trống không đẩy được finding
 * `high` thật ra khỏi trần.
 */
export function severityRank(effective: Severity, known: boolean): number {
  if (effective === 'high') return known ? 0 : 1;
  return effective === 'medium' ? 2 : 3;
}

/**
 * Chỗ cắt DUY NHẤT theo trần. Nhận các NHÓM theo thứ tự ưu tiên (vòng 1 đã neo trước, vòng 2 sau): mỗi
 * nhóm sắp ổn định theo hạng, nối theo thứ tự nhóm, cắt đuôi — nên ứng viên vòng 1 đã neo không bị
 * vòng 2 đẩy ra. Trần không hữu hạn hoặc âm ⇒ KHÔNG cắt (fail-closed về phía giữ), không bao giờ
 * `slice(0, NaN)`.
 */
export function cutBySeverity<T>(
  groups: ReadonlyArray<ReadonlyArray<T>>,
  cap: number,
  rankOf: (item: T) => number,
): { kept: T[]; before: number; dropped: number } {
  const ordered = groups.flatMap((g) => [...g].sort((a, b) => rankOf(a) - rankOf(b)));
  const before = ordered.length;
  const c = Number.isFinite(cap) && cap >= 0 ? Math.trunc(cap) : Number.POSITIVE_INFINITY;
  const kept = c === Number.POSITIVE_INFINITY ? ordered : ordered.slice(0, c);
  return { kept, before, dropped: before - kept.length };
}

/** Bộ chuẩn đã giải cho MỘT lượt chấm — cả hai skill đọc từ đây, mỗi skill lấy phần của mình. */
export interface ResolvedStandards {
  finding_cap: Knob;
  probe_cap: Knob;
  density_per_1000_words: Knob;
  density_floor_words: Knob;
  /** Núm `agent.max_probe` của người vận hành (env `CHECKER_MAX_PROBE`). Vắng = CLI tay, không có núm. */
  operator_max_probe?: number;
  file_state: 'absent' | 'unreadable' | 'present' | 'no_repo';
}

export function defaultStandards(source: KnobSource = 'default', fileState: ResolvedStandards['file_state'] = 'absent'): ResolvedStandards {
  const k = (r: KnobRange): Knob => ({ value: r.default, source });
  return {
    finding_cap: k(FINDING_CAP_RANGE),
    probe_cap: k(PROBE_CAP_RANGE),
    density_per_1000_words: k(DENSITY_RANGE),
    density_floor_words: k(FLOOR_RANGE),
    file_state: fileState,
  };
}

/** Núm operator là cấu hình của CHÍNH CheckMate (đã kẹp ở tầng web) — chỉ cần chắc nó là số. */
export function parseOperatorMaxProbe(env: string | undefined): number | undefined {
  if (env === undefined || env.trim() === '') return undefined;
  const n = Number(env);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : undefined;
}

/** Đọc một file ở một ref bằng `git show` — null khi không có (file vắng ở ref, ref sai, git hỏng). */
function gitShowOrNull(repo: string, ref: string, path: string, log?: (msg: string) => void): string | null {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const msg = String((e as { stderr?: string })?.stderr ?? (e as Error)?.message ?? '').split('\n')[0].slice(0, 200);
    log?.(`standards: không đọc được ${path} ở ${ref} qua git show — dùng mặc định${msg ? ` (${msg})` : ''}`);
    return null;
  }
}

/**
 * Giải bộ chuẩn cho một lượt. Đọc ở NHÁNH GỐC qua `git show <baseRef>:checkmate.yml` (khuôn
 * `target.ts` đã dùng cho spec nhánh gốc) — KHÔNG đọc file trên đĩa của clone: working tree của clone là
 * snapshot nhánh default lúc kết nối và không bao giờ được checkout lại (đo 06/09), nên đọc đĩa là đọc một
 * bản đã chết, và đội sửa chuẩn trên nhánh gốc sau khi kết nối sẽ không có hiệu lực.
 */
export function resolveVolumeStandard(
  repo: string | null | undefined,
  baseRef: string | null | undefined,
  operatorMaxProbe: number | undefined,
  log?: (msg: string) => void,
): ResolvedStandards {
  const withOperator = (s: ResolvedStandards): ResolvedStandards => (operatorMaxProbe === undefined ? s : { ...s, operator_max_probe: operatorMaxProbe });
  if (!repo) return withOperator(defaultStandards('no_repo', 'no_repo'));
  if (!baseRef) {
    log?.('standards: không có nhánh gốc để đọc checkmate.yml — dùng mặc định');
    return withOperator(defaultStandards('default', 'absent'));
  }
  const read = readStandardsCfg((path) => gitShowOrNull(repo, baseRef, path, log));
  if (read.state === 'absent') return withOperator(defaultStandards('default', 'absent'));
  if (read.state === 'unreadable') {
    log?.(`standards: checkmate.yml ở ${baseRef} không đọc được (${read.error}) — dùng mặc định, nguồn default_unreadable`);
    return withOperator(defaultStandards('default_unreadable', 'unreadable'));
  }
  const s = read.standards ?? {};
  const resolved: ResolvedStandards = {
    finding_cap: clampKnob(s.finding_cap, FINDING_CAP_RANGE),
    probe_cap: clampKnob(s.probe_cap, PROBE_CAP_RANGE),
    density_per_1000_words: clampKnob(s.density_per_1000_words, DENSITY_RANGE),
    density_floor_words: clampKnob(s.density_floor_words, FLOOR_RANGE),
    file_state: 'present',
  };
  for (const [ten, k] of Object.entries(resolved) as Array<[string, Knob]>) {
    if (typeof k !== 'object' || k === null || !('value' in k)) continue;
    if (k.clamped_from !== undefined) log?.(`standards.${ten}: ${k.clamped_from} ngoài dải, kẹp về ${k.value}`);
    if (k.reason === 'invalid_type') log?.(`standards.${ten}: không phải số hữu hạn — bỏ, dùng mặc định ${k.value}`);
  }
  return withOperator(resolved);
}

/**
 * Trần probe HIỆU DỤNG = min(repo, operator). Tài nguyên sandbox là của bên chấm: repo đích được ĐỀ NGHỊ,
 * người vận hành mới ÁP. Hoà thì ghi `repo` — hai bên cùng đồng ý một số.
 */
export function effectiveProbeCap(s: ResolvedStandards): NonNullable<VolumeStandard['probe_cap']> {
  const repo = s.probe_cap;
  if (s.operator_max_probe !== undefined && s.operator_max_probe < repo.value) {
    return { value: s.operator_max_probe, repo, operator: s.operator_max_probe, bound_by: 'operator' };
  }
  return { value: repo.value, repo, ...(s.operator_max_probe !== undefined ? { operator: s.operator_max_probe } : {}), bound_by: 'repo' };
}
