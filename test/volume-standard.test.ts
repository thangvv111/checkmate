import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chuanMuc } from '../packages/shared/src/types.js';
import {
  DENSITY_BANDS,
  DENSITY_RANGE,
  FINDING_CAP_RANGE,
  FLOOR_RANGE,
  PROBE_CAP_RANGE,
  bandFor,
  clampKnob,
  countDocWords,
  cutBySeverity,
  defaultStandards,
  effectiveProbeCap,
  isKnownSeverity,
  measureDensity,
  parseOperatorMaxProbe,
  resolveVolumeStandard,
  severityRank,
} from '../packages/harness/src/volume-standard.js';
import { readStandardsCfg } from '../packages/harness/src/runner.js';
import { docCandidateRank, effectiveDocSeverity } from '../packages/harness/src/skill-doc.js';
import { dedupeFindingsByCandidate } from '../packages/harness/src/skill-code.js';

/**
 * Capability `finding-volume-standard` — hàm thuần + cửa đọc qua git THẬT.
 *
 * Ca chết người của change (security S7.1): `finding_cap: "nhiều"` → `Number()` → `NaN` → `[].slice(0, NaN)`
 * trả mảng rỗng ⇒ 0 finding ⇒ PASS. `tsc` không thấy vì `NaN` hợp kiểu `number`. Rào ở `clampKnob`, và
 * ca T1.3 dưới đây là thứ giữ rào ấy.
 */

describe('clampKnob — kẹp dải bằng predicate chặt (T1.1–T1.4)', () => {
  it('T1.1 biên finding_cap [4, 1000] mặc định 100', () => {
    expect(clampKnob(4, FINDING_CAP_RANGE)).toEqual({ value: 4, source: 'repo' });
    expect(clampKnob(1000, FINDING_CAP_RANGE)).toEqual({ value: 1000, source: 'repo' });
    expect(clampKnob(3, FINDING_CAP_RANGE)).toEqual({ value: 4, source: 'repo', clamped_from: 3 });
    expect(clampKnob(1001, FINDING_CAP_RANGE)).toEqual({ value: 1000, source: 'repo', clamped_from: 1001 });
    expect(clampKnob(0, FINDING_CAP_RANGE)).toEqual({ value: 4, source: 'repo', clamped_from: 0 });
    expect(clampKnob(-5, FINDING_CAP_RANGE)).toEqual({ value: 4, source: 'repo', clamped_from: -5 });
    expect(clampKnob(4.9, FINDING_CAP_RANGE), 'lấy phần nguyên trước khi kẹp').toEqual({ value: 4, source: 'repo' });
    expect(clampKnob(undefined, FINDING_CAP_RANGE), 'vắng khoá = mặc định, KHÔNG có lý do').toEqual({ value: 100, source: 'default' });
  });

  it('T1.2 giá trị không phải số hữu hạn → mặc định + invalid_type, không clamped_from', () => {
    for (const xau of ['100', 'nhiều', null, true, [5], {}, Number.POSITIVE_INFINITY, Number.NaN, 1e309]) {
      expect(clampKnob(xau, FINDING_CAP_RANGE), String(xau)).toEqual({ value: 100, source: 'default', reason: 'invalid_type' });
    }
  });

  it('T1.3 CA CHẾT NGƯỜI — không bao giờ ra NaN; slice trên mảng 12 luôn trả min(12, value)', () => {
    const mang = Array.from({ length: 12 }, (_, i) => i);
    for (const v of [true, 'nhiều', '100', null, Number.NaN, Number.POSITIVE_INFINITY, [5], {}, 4.9, 0, 5000, undefined]) {
      const k = clampKnob(v, FINDING_CAP_RANGE);
      expect(Number.isFinite(k.value), `${String(v)} → ${k.value}`).toBe(true);
      expect(mang.slice(0, k.value)).toHaveLength(Math.min(12, k.value));
    }
  });

  it('T1.4 dải các khoá còn lại, kể cả sàn — .inf sàn về 2000 kèm clamped_from', () => {
    expect(clampKnob(2, PROBE_CAP_RANGE)).toEqual({ value: 2, source: 'repo' });
    expect(clampKnob(100, PROBE_CAP_RANGE)).toEqual({ value: 100, source: 'repo' });
    expect(clampKnob(101, PROBE_CAP_RANGE)).toEqual({ value: 100, source: 'repo', clamped_from: 101 });
    expect(clampKnob(1, PROBE_CAP_RANGE)).toEqual({ value: 2, source: 'repo', clamped_from: 1 });
    expect(clampKnob(undefined, PROBE_CAP_RANGE)).toEqual({ value: 100, source: 'default' });
    expect(clampKnob(0, DENSITY_RANGE)).toEqual({ value: 1, source: 'repo', clamped_from: 0 });
    expect(clampKnob(1001, DENSITY_RANGE)).toEqual({ value: 1000, source: 'repo', clamped_from: 1001 });
    expect(clampKnob(49, FLOOR_RANGE)).toEqual({ value: 50, source: 'repo', clamped_from: 49 });
    expect(clampKnob(2001, FLOOR_RANGE)).toEqual({ value: 2000, source: 'repo', clamped_from: 2001 });
    expect(clampKnob(1_000_000_000, FLOOR_RANGE)).toEqual({ value: 2000, source: 'repo', clamped_from: 1_000_000_000 });
    // `.inf` của YAML là Infinity — không phải số hữu hạn ⇒ bỏ (không kẹp), dùng mặc định
    expect(clampKnob(Number.POSITIVE_INFINITY, FLOOR_RANGE)).toEqual({ value: 300, source: 'default', reason: 'invalid_type' });
  });
});

describe('countDocWords v1 — đơn vị «từ» là hàm máy có phiên bản (T1.5–T1.8)', () => {
  it('T1.5 cùng ô chữ, dạng bảng markdown vs dạng dòng trơn — bằng nhau (ống bảng, dòng phân cách không đếm)', () => {
    const bang = '| Vai | Han muc | Ghi chu |\n|---|---|---|\n| Chuyen vien | 500 trieu | duyet truc tiep |\n| Truong phong | 2 ty | can hai chu ky |';
    const tron = 'Vai Han muc Ghi chu\nChuyen vien 500 trieu duyet truc tiep\nTruong phong 2 ty can hai chu ky';
    expect(countDocWords(bang).words).toBe(countDocWords(tron).words);
    expect(countDocWords(bang).words).toBe(20);
  });

  it('T1.6 thêm tiền tố `N| ` vào mỗi dòng không đổi số đếm', () => {
    const goc = readFileSync('test/fixtures/volume/prd-1048w.md', 'utf8');
    const coSoDong = goc.split(/\r?\n/).map((l, i) => `${i + 1}| ${l}`).join('\n');
    expect(countDocWords(coSoDong).words).toBe(countDocWords(goc).words);
  });

  it('T1.7 biên: rỗng · chỉ front-matter · chỉ code fence · dòng phân cách bảng · token x1 giữ, --- bỏ · tiếng Việt = âm tiết', () => {
    expect(countDocWords('').words).toBe(0);
    expect(countDocWords('---\ntitle: x\nauthor: y\n---\n').words).toBe(0);
    expect(countDocWords('```ts\nconst a = 1;\nexport function b() {}\n```').words).toBe(0);
    expect(countDocWords('| --- | :-- | --: |').words).toBe(0);
    expect(countDocWords('x1 ---').words).toBe(1);
    expect(countDocWords('phê duyệt hạn mức').words).toBe(4);
    expect(countDocWords('# Tiêu đề\n\n> trích **đậm** _nghiêng_ `mã`').words).toBe(6);
    expect(countDocWords(undefined as unknown as string).words).toBe(0);
  });

  it('T1.8 fixture PRD 1048 từ (wc) → 917 từ (v1) — số ghim SAU khi chạy, đổi cách đếm là đổi phiên bản', () => {
    const goc = readFileSync('test/fixtures/volume/prd-1048w.md', 'utf8');
    expect(goc.split(/\s+/).filter(Boolean).length).toBe(1014); // wc-style, để thấy v1 khác nó ở đâu
    expect(countDocWords(goc)).toEqual({ words: 917, method: 'v1' });
  });
});

describe('bậc thang và phép đo mật độ (T1.16–T1.19)', () => {
  it('bảng công bố: ≤1000 → 20 · ≤5000 → 12 · >5000 → 8', () => {
    expect(DENSITY_BANDS.map((b) => [b.band, b.base_per_1000])).toEqual([['<=1000', 20], ['<=5000', 12], ['>5000', 8]]);
    expect(bandFor(300).band).toBe('<=1000');
    expect(bandFor(1000).band).toBe('<=1000');
    expect(bandFor(1001).band).toBe('<=5000');
    expect(bandFor(5000).band).toBe('<=5000');
    expect(bandFor(5001).band).toBe('>5000');
  });

  const std = defaultStandards();
  const do_ = (after_grids: number, words: number, extra?: Partial<Parameters<typeof measureDensity>[0]>) =>
    measureDensity({ after_grids, words, per_1000_words: std.density_per_1000_words, floor_words: std.density_floor_words, ...extra });

  it('T1.16 đo và ghi: 12 / 400 từ = 30 > 20 ⇒ exceeded, applied=false, observe_only', () => {
    const d = do_(12, 400);
    expect(d).toMatchObject({ words: 400, count_method: 'v1', band: '<=1000', threshold_per_1000: 20, measured_per_1000: 30, exceeded: true, applied: false, reason: 'observe_only' });
  });
  it('T1.17 dưới sàn: 180 từ ⇒ under_floor, vẫn ghi words, không có exceeded', () => {
    const d = do_(9, 180);
    expect(d.reason).toBe('under_floor');
    expect(d.words).toBe(180);
    expect(d.exceeded).toBeUndefined();
    expect(d.measured_per_1000).toBeUndefined();
  });
  it('T1.18 repo chỉnh MỨC, không chỉnh HÌNH: 40/1000 ở 3000 từ ⇒ ngưỡng 24', () => {
    const d = do_(30, 3000, { per_1000_words: { value: 40, source: 'repo' } });
    expect(d.band).toBe('<=5000');
    expect(d.threshold_per_1000).toBe(24);
    expect(d.measured_per_1000).toBe(10);
    expect(d.exceeded).toBe(false);
  });
  it('T1.19 biên trùng ngưỡng: đúng 20.0 không vượt, 20.1 vượt; 299/300/301; 0 từ ⇒ unmeasurable; lỗi đếm ⇒ error', () => {
    expect(do_(8, 400).exceeded).toBe(false); // 20.0
    expect(do_(201, 10_000).exceeded).toBe(true); // 20.1 > 8? — dải >5000 ngưỡng 8 ⇒ vượt rõ
    expect(do_(6, 300).exceeded).toBe(false); // 20.0 đúng sàn: ÁP (300 không dưới sàn)
    expect(do_(6, 299).reason).toBe('under_floor');
    expect(do_(6, 301).reason).toBe('observe_only');
    expect(do_(5, 0).reason).toBe('unmeasurable');
    expect(do_(5, Number.NaN).reason).toBe('unmeasurable');
    expect(do_(5, 500, { count_failed: true }).reason).toBe('error');
  });
  it('mật độ đo trước cắt — hàm chỉ nhận số sau lưới, không biết trần: 30 / 1000 từ = 30 bất kể trần', () => {
    expect(do_(30, 1000).measured_per_1000).toBe(30);
  });
});

describe('sắp theo severity hiệu lực rồi cắt một chỗ (T1.11–T1.15)', () => {
  it('isKnownSeverity / severityRank: high hợp lệ 0 · lạ (→high) 1 · medium 2 · low 3', () => {
    expect(isKnownSeverity('high')).toBe(true);
    expect(isKnownSeverity(' HIGH ')).toBe(true);
    for (const x of ['blocker', 'critical', 3, true, {}, undefined, null, '']) expect(isKnownSeverity(x), String(x)).toBe(false);
    expect(severityRank('high', true)).toBe(0);
    expect(severityRank('high', false)).toBe(1);
    expect(severityRank('medium', true)).toBe(2);
    expect(severityRank('low', true)).toBe(3);
  });

  it('T1.11 cắt giữ finding nặng theo severity HIỆU LỰC: 11 thieu_ac/high + 1 mau_thuan/low (đứng CUỐI), trần 10 ⇒ mau_thuan giữ, T10–T11 bị cắt', () => {
    type U = { id: string; rubric: string; severity: unknown };
    const items: U[] = [...Array.from({ length: 11 }, (_, i) => ({ id: `T${i + 1}`, rubric: 'thieu_ac', severity: 'high' })), { id: 'M1', rubric: 'mau_thuan', severity: 'low' }];
    // Cả 12 đều hiệu lực medium. Nếu chỉ sắp theo mức rồi ổn định theo thứ tự gốc thì M1 (đứng cuối) bị cắt —
    // đo được khi viết ca này. Tie-break theo sức bằng chứng (hai vế trước rubric mềm) là thứ giữ M1 lại.
    const kq = cutBySeverity([items], 10, (u) => docCandidateRank(u.rubric, u.severity));
    expect(kq.before).toBe(12);
    expect(kq.dropped).toBe(2);
    expect(kq.kept[0].id).toBe('M1');
    expect(kq.kept.map((u) => u.id)).not.toContain('T10');
    expect(kq.kept.map((u) => u.id)).not.toContain('T11');
    // Đối chứng: chỉ sắp theo mức (không tie-break) thì M1 mất — chứng minh ca này load-bearing
    const chiMuc = cutBySeverity([items], 10, (u) => severityRank(effectiveDocSeverity(u.rubric, u.severity), isKnownSeverity(u.severity)));
    expect(chiMuc.kept.map((u) => u.id)).not.toContain('M1');
  });

  it('T1.12 severity lạ không chiếm suất của high thật: 3 high hợp lệ + 2 blocker + 1 số, trần 4 ⇒ 3 high giữ, không ném', () => {
    type U = { id: string; severity: unknown };
    const items: U[] = [{ id: 'B1', severity: 'blocker' }, { id: 'H1', severity: 'high' }, { id: 'N1', severity: 3 }, { id: 'H2', severity: 'high' }, { id: 'B2', severity: 'blocker' }, { id: 'H3', severity: 'high' }];
    const rank = (u: U) => severityRank(chuanMuc(u.severity), isKnownSeverity(u.severity));
    const kq = cutBySeverity([items], 4, rank);
    expect(kq.kept.map((u) => u.id).slice(0, 3)).toEqual(['H1', 'H2', 'H3']);
    expect(kq.kept).toHaveLength(4);
    expect(['B1', 'N1', 'B2']).toContain(kq.kept[3].id);
  });

  it('T1.14 vòng 2 không đẩy vòng 1 đã neo: 9 vòng-1 (low) + 3 vòng-2 (high), trần 10 ⇒ 9 + 1', () => {
    type U = { id: string; severity: string };
    const v1: U[] = Array.from({ length: 9 }, (_, i) => ({ id: `A${i}`, severity: 'low' }));
    const v2: U[] = Array.from({ length: 3 }, (_, i) => ({ id: `B${i}`, severity: 'high' }));
    const kq = cutBySeverity([v1, v2], 10, (u) => severityRank(chuanMuc(u.severity), true));
    expect(kq.kept.filter((u) => u.id.startsWith('A'))).toHaveLength(9);
    expect(kq.kept.filter((u) => u.id.startsWith('B'))).toHaveLength(1);
    expect(kq.dropped).toBe(2);
  });

  it('sắp ỔN ĐỊNH: cùng hạng thì giữ thứ tự gốc; trần không hữu hạn/âm ⇒ KHÔNG cắt (không slice(0, NaN))', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(cutBySeverity([items], 2, () => 0).kept).toEqual(['a', 'b']);
    expect(cutBySeverity([items], Number.NaN, () => 0).kept).toEqual(items);
    expect(cutBySeverity([items], -1, () => 0).kept).toEqual(items);
    expect(cutBySeverity([items], Number.POSITIVE_INFINITY, () => 0).dropped).toBe(0);
    expect(cutBySeverity([items], 2.9, () => 0).kept).toHaveLength(2);
  });
});

describe('chuanMuc nhận unknown, không ném (T1.13) — cặp fixture', () => {
  it('ĐỔI: số, boolean, object, mảng, undefined, null → high', () => {
    for (const x of [3, true, {}, [], undefined, null]) expect(chuanMuc(x), String(x)).toBe('high');
  });
  it('GIỮ: chuỗi hợp lệ giữ mức, chuỗi lạ/đời cũ → high, non_blocking → medium', () => {
    expect(chuanMuc('medium')).toBe('medium');
    expect(chuanMuc(' LOW ')).toBe('low');
    expect(chuanMuc('HIGH')).toBe('high');
    expect(chuanMuc('blocker')).toBe('high');
    expect(chuanMuc('blocking')).toBe('high');
    expect(chuanMuc('non_blocking')).toBe('medium');
  });
});

describe('effectiveDocSeverity — một cửa cho sắp xếp và verdict', () => {
  it('rubric mềm: high → medium; rubric số liệu: low → medium; còn lại giữ; lạ → high rồi kẹp theo rubric', () => {
    expect(effectiveDocSeverity('thieu_ac', 'high')).toBe('medium');
    expect(effectiveDocSeverity('khong_do_duoc', 'high')).toBe('medium');
    expect(effectiveDocSeverity('tham_chieu_chet', 'high')).toBe('medium');
    expect(effectiveDocSeverity('dieu_kien_thieu_ve', 'high')).toBe('medium');
    expect(effectiveDocSeverity('mau_thuan', 'low')).toBe('medium');
    expect(effectiveDocSeverity('lech_cheo', 'low')).toBe('medium');
    expect(effectiveDocSeverity('khoang_ho_nguong', 'low')).toBe('medium');
    expect(effectiveDocSeverity('mau_thuan', 'high')).toBe('high');
    expect(effectiveDocSeverity('thieu_ac', 'low')).toBe('low');
    expect(effectiveDocSeverity('thieu_ac', 3)).toBe('medium'); // 3 → high (lạ) → mềm kẹp về medium
    expect(effectiveDocSeverity('mau_thuan', undefined)).toBe('high');
  });
});

describe('dedupeFindingsByCandidate — mỗi ứng viên một finding (T3.9)', () => {
  it('3 finding cùng ma ⇒ giữ cái đầu, 2 bản trùng trả riêng; phần tử rỗng bị bỏ', () => {
    const kq = dedupeFindingsByCandidate([{ ma: 'U1', t: 1 }, { ma: 'U2', t: 2 }, { ma: 'U1', t: 3 }, { ma: 'U1', t: 4 }, null as never]);
    expect(kq.kept.map((x) => x.t)).toEqual([1, 2]);
    expect(kq.duplicates.map((x) => x.t)).toEqual([3, 4]);
  });
});

describe('readStandardsCfg — cửa đọc thứ tư, ba trạng thái phân biệt được (T1.9)', () => {
  it('reader trả null ⇒ absent; yml hỏng ⇒ unreadable (không ném); khối sai kiểu ⇒ unreadable; khối null ⇒ present/undefined', () => {
    expect(readStandardsCfg(() => null)).toEqual({ state: 'absent' });
    expect(readStandardsCfg(() => 'standards: [1, 2').state).toBe('unreadable');
    expect(readStandardsCfg(() => 'standards: "x"').state).toBe('unreadable');
    expect(readStandardsCfg(() => 'standards:\n  - 1\n').state).toBe('unreadable');
    expect(readStandardsCfg(() => 'standards:\n').state).toBe('present');
    expect(readStandardsCfg(() => ''), 'yml rỗng = có file mà không khai gì').toEqual({ state: 'present', standards: undefined });
    expect(readStandardsCfg(() => '---\n'), 'chỉ dấu ---').toEqual({ state: 'present', standards: undefined });
    expect(readStandardsCfg(() => 'runner:\n  test_cmd: x\n')).toEqual({ state: 'present', standards: undefined });
    expect(readStandardsCfg(() => 'standards:\n  finding_cap: 250\n')).toEqual({ state: 'present', standards: { finding_cap: 250 } });
    expect(readStandardsCfg(() => {
      throw new Error('git chết');
    }).state).toBe('unreadable');
  });
});

describe('effectiveProbeCap — min(repo, operator), khai nguồn cắn (T1.10)', () => {
  it('repo 40 + operator 6 ⇒ 6 operator · repo 4 + operator 12 ⇒ 4 repo · không khai + operator 6 ⇒ 6 operator, repo.source default · không operator ⇒ repo', () => {
    const s = defaultStandards();
    expect(effectiveProbeCap({ ...s, probe_cap: { value: 40, source: 'repo' }, operator_max_probe: 6 })).toEqual({ value: 6, repo: { value: 40, source: 'repo' }, operator: 6, bound_by: 'operator' });
    expect(effectiveProbeCap({ ...s, probe_cap: { value: 4, source: 'repo' }, operator_max_probe: 12 })).toEqual({ value: 4, repo: { value: 4, source: 'repo' }, operator: 12, bound_by: 'repo' });
    expect(effectiveProbeCap({ ...s, operator_max_probe: 6 })).toEqual({ value: 6, repo: { value: 100, source: 'default' }, operator: 6, bound_by: 'operator' });
    expect(effectiveProbeCap(s)).toEqual({ value: 100, repo: { value: 100, source: 'default' }, bound_by: 'repo' });
  });
  it('parseOperatorMaxProbe: env là số ≥ 1 ⇒ số; vắng/rỗng/rác ⇒ undefined', () => {
    expect(parseOperatorMaxProbe('6')).toBe(6);
    expect(parseOperatorMaxProbe(' 12 ')).toBe(12);
    expect(parseOperatorMaxProbe('0')).toBeUndefined();
    expect(parseOperatorMaxProbe('')).toBeUndefined();
    expect(parseOperatorMaxProbe(undefined)).toBeUndefined();
    expect(parseOperatorMaxProbe('abc')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------
// ĐỌC CHUẨN TỪ NHÁNH GỐC QUA GIT — repo git THẬT, ba giá trị KHÁC NHAU: đĩa · nhánh gốc · nhánh PR.
// Đây là ca phân biệt «đọc git» với «đọc đĩa»: working tree của clone giữ giá trị lúc clone (20), nhánh gốc
// đã đổi (40), nhánh PR khai 500. Đọc đĩa ra 20, đọc PR ra 500, đọc đúng ra 40.
// Đo trên prod 06/09: clone `thangvv111-checkmate` HEAD 727d0a8 (05/09) ≠ refs/checkmate/base-pr74 09ca3ea
// (06/09), reflog HEAD đúng 1 dòng, blob checkmate.yml trên đĩa fb930f8… ≠ blob ở nhánh gốc 2b3043c… .
// ---------------------------------------------------------------------------------------------------
function git(cwd: string, args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=cm', '-c', 'user.email=cm@test.local', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
function repoMoi(dir: string, yml: string | null): void {
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q']);
  git(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  writeFileSync(join(dir, 'README.md'), '# t\n', 'utf8');
  if (yml !== null) writeFileSync(join(dir, 'checkmate.yml'), yml, 'utf8');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'one']);
}
const ymlDensity = (n: number | string) => `standards:\n  density_per_1000_words: ${n}\n`;

let goc: string;
let upstream: string;
let clone: string;
let upstream2: string;
let clone2: string;

beforeAll(() => {
  goc = mkdtempSync(join(tmpdir(), 'cm-git-'));
  upstream = join(goc, 'upstream');
  clone = join(goc, 'clone');
  repoMoi(upstream, ymlDensity(20));
  git(goc, ['clone', '-q', '--no-single-branch', upstream, clone]);
  // Đội sửa chuẩn trên nhánh gốc SAU khi kết nối
  writeFileSync(join(upstream, 'checkmate.yml'), ymlDensity(40), 'utf8');
  git(upstream, ['commit', '-q', '-am', 'raise to 40']);
  // PR nới lên 500 — và một PR khác siết xuống 2
  git(upstream, ['checkout', '-q', '-b', 'pr-noi']);
  writeFileSync(join(upstream, 'checkmate.yml'), ymlDensity(500), 'utf8');
  git(upstream, ['commit', '-q', '-am', 'pr raises to 500']);
  git(upstream, ['checkout', '-q', 'main']);
  git(upstream, ['checkout', '-q', '-b', 'pr-siet']);
  writeFileSync(join(upstream, 'checkmate.yml'), ymlDensity(2), 'utf8');
  git(upstream, ['commit', '-q', '-am', 'pr tightens to 2']);
  git(upstream, ['checkout', '-q', 'main']);
  // Fetch đúng như github.ts: vào refs/checkmate/*, KHÔNG checkout
  git(clone, ['fetch', '-q', 'origin', '+refs/heads/main:refs/checkmate/base-pr1', '+refs/heads/pr-noi:refs/checkmate/pr1', '+refs/heads/pr-siet:refs/checkmate/pr2']);

  // Repo thứ hai: nhánh gốc KHÔNG có checkmate.yml, PR thêm mới
  upstream2 = join(goc, 'upstream2');
  clone2 = join(goc, 'clone2');
  repoMoi(upstream2, null);
  git(goc, ['clone', '-q', '--no-single-branch', upstream2, clone2]);
  git(upstream2, ['checkout', '-q', '-b', 'pr-them']);
  writeFileSync(join(upstream2, 'checkmate.yml'), ymlDensity(500), 'utf8');
  git(upstream2, ['add', '-A']);
  git(upstream2, ['commit', '-q', '-m', 'pr adds standards']);
  git(upstream2, ['checkout', '-q', 'main']);
  git(clone2, ['fetch', '-q', 'origin', '+refs/heads/main:refs/checkmate/base-pr1', '+refs/heads/pr-them:refs/checkmate/pr1']);
});
afterAll(() => {
  rmSync(goc, { recursive: true, force: true });
});

describe('resolveVolumeStandard — đọc nhánh gốc qua git, không đọc đĩa (T2.5–T2.8)', () => {
  it('T2.5 đội sửa chuẩn trên nhánh gốc sau khi kết nối ⇒ lượt kế áp 40, dù đĩa vẫn ghi 20', () => {
    expect(readFileSync(join(clone, 'checkmate.yml'), 'utf8')).toContain('density_per_1000_words: 20');
    const s = resolveVolumeStandard(clone, 'refs/checkmate/base-pr1', undefined);
    expect(s.file_state).toBe('present');
    expect(s.density_per_1000_words).toEqual({ value: 40, source: 'repo' });
    expect(s.finding_cap).toEqual({ value: 100, source: 'default' });
  });
  it('T2.6 PR nới lên 500 không ăn — vẫn 40', () => {
    expect(resolveVolumeStandard(clone, 'refs/checkmate/base-pr1', undefined).density_per_1000_words.value).toBe(40);
    // và đối chứng: nếu ai đó trót đọc ref PR thì ra 500 — phép đọc phân biệt được hai ref
    expect(resolveVolumeStandard(clone, 'refs/checkmate/pr1', undefined).density_per_1000_words.value).toBe(500);
  });
  it('T2.7 PR siết xuống 2 cũng không ăn — luật là «đọc nhánh gốc», không phải «lấy giá trị nghiêm hơn»', () => {
    expect(resolveVolumeStandard(clone, 'refs/checkmate/base-pr1', undefined).density_per_1000_words.value).toBe(40);
    expect(resolveVolumeStandard(clone, 'refs/checkmate/pr2', undefined).density_per_1000_words.value).toBe(2);
  });
  it('T2.8 nhánh gốc không có file, PR thêm mới ⇒ absent, mọi khoá mặc định nguồn default', () => {
    const s = resolveVolumeStandard(clone2, 'refs/checkmate/base-pr1', undefined);
    expect(s.file_state).toBe('absent');
    expect(s.density_per_1000_words).toEqual({ value: 20, source: 'default' });
    expect(s.finding_cap.source).toBe('default');
  });
  it('T2.9 không repo ⇒ no_repo; ref sai ⇒ default (fail-safe, có log); operator đi kèm', () => {
    const logs: string[] = [];
    expect(resolveVolumeStandard(null, null, 6).finding_cap).toEqual({ value: 100, source: 'no_repo' });
    expect(resolveVolumeStandard(null, null, 6).operator_max_probe).toBe(6);
    const s = resolveVolumeStandard(clone, 'refs/khong/ton/tai', undefined, (m) => logs.push(m));
    expect(s.file_state).toBe('absent');
    expect(logs.some((m) => m.includes('git show'))).toBe(true);
  });
  it('T1.9 yml hỏng ở nhánh gốc ⇒ default_unreadable (phân biệt với chưa khai), giá trị sai kiểu ⇒ invalid_type', () => {
    const u3 = join(goc, 'upstream3');
    repoMoi(u3, 'standards: [1, 2\n');
    const c3 = join(goc, 'clone3');
    git(goc, ['clone', '-q', u3, c3]);
    git(c3, ['fetch', '-q', 'origin', '+refs/heads/main:refs/checkmate/base-pr1']);
    const logs: string[] = [];
    const s = resolveVolumeStandard(c3, 'refs/checkmate/base-pr1', undefined, (m) => logs.push(m));
    expect(s.file_state).toBe('unreadable');
    expect(s.finding_cap).toEqual({ value: 100, source: 'default_unreadable' });
    expect(logs.some((m) => m.includes('default_unreadable'))).toBe(true);

    const u4 = join(goc, 'upstream4');
    repoMoi(u4, 'standards:\n  finding_cap: "nhiều"\n  probe_cap: 5000\n  density_floor_words: 10\n');
    const c4 = join(goc, 'clone4');
    git(goc, ['clone', '-q', u4, c4]);
    git(c4, ['fetch', '-q', 'origin', '+refs/heads/main:refs/checkmate/base-pr1']);
    const s4 = resolveVolumeStandard(c4, 'refs/checkmate/base-pr1', undefined);
    expect(s4.finding_cap).toEqual({ value: 100, source: 'default', reason: 'invalid_type' });
    expect(s4.probe_cap).toEqual({ value: 100, source: 'repo', clamped_from: 5000 });
    expect(s4.density_floor_words).toEqual({ value: 50, source: 'repo', clamped_from: 10 });
  });
});
