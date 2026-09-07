import { describe, expect, it } from 'vitest';
import type { Finding, Verdict, VolumeStandard } from '../packages/shared/src/types.js';
import { KNOB_SOURCE_LABEL, VOLUME_UNKNOWN, describeVolumeStandard } from '../packages/shared/src/volume-summary.js';
import { renderAutoVerdict, renderReceipt } from '../apps/web/src/gate.js';
import { verdictHtml } from '../apps/web/src/ui.js';
import { historyPage } from '../apps/web/src/ui-history.js';
import type { RunMeta } from '../apps/web/src/runs.js';

/**
 * `verdict-contract › Verdict nhị phân… kèm volume_standard` — năm bề mặt PHẢI bày chuẩn đã chấm theo, và
 * MUST NOT suy «trước khi cắt» từ `findings.length` (T2.10–T2.14).
 *
 * Dữ liệu thử cố ý lệch: `findings.length = 3` còn `counts.before_cut = 140`. Bề mặt nào hiện «trước cắt 3»
 * là bề mặt đang đếm lại danh sách đã cắt — đúng lỗ mà requirement sinh ra để vá.
 */

const finding = (i: number): Finding => ({
  id: `F${i}`,
  skill: 'doc',
  severity: 'low',
  title_vi: `finding ${i}`,
  what_vi: 'x',
  consequence_vi: 'y',
  evidence: { type: 'quote', loc: `dòng ${i}`, quote: `trích ${i}`, rule: 'r' },
});

const vsDoc: VolumeStandard = {
  finding_cap: { value: 3, source: 'repo' },
  counts: { raw_round1: 160, after_machine_grids: 140, before_cut: 140, after_cut: 3, after_skeptic: 3, final: 3, dropped_by_cap: 137 },
  density: {
    standard: { per_1000_words: { value: 500, source: 'repo' }, floor_words: { value: 300, source: 'default' } },
    words: 1000,
    count_method: 'v1',
    band: '<=1000',
    threshold_per_1000: 500,
    measured_per_1000: 140,
    exceeded: false,
    applied: false,
    reason: 'observe_only',
  },
};

function verdict(vs: VolumeStandard | undefined, skill: 'doc' | 'code' = 'doc'): Verdict {
  return {
    run_id: 'r1',
    skill,
    artifact_ref: { type: 'doc', name: 'prd.md', sha_or_hash: 'abcdef0123456789' },
    result: 'PASS',
    findings: [finding(1), finding(2), finding(3)],
    model: 'm',
    mode: 'live',
    started_at: '2026-09-06T10:00:00.000Z',
    finished_at: '2026-09-06T10:01:00.000Z',
    ...(vs ? { volume_standard: vs } : {}),
  };
}

const runMeta = (v: Verdict): RunMeta => ({ id: v.run_id, tieuDe: 'PR #1 · tài liệu prd.md', skill: v.skill, trangThai: 'xong', batDau: v.started_at, ketThuc: v.finished_at, verdict: v });

describe('describeVolumeStandard — một hàm cho mọi bề mặt', () => {
  it('doc: trần + nguồn, số trước/sau cắt từ trường có kiểu, mật độ kèm nguồn ngưỡng', () => {
    const s = describeVolumeStandard(vsDoc);
    expect(s).toContain('trần finding 3 (checkmate.yml)');
    expect(s).toContain('trước cắt 140');
    expect(s).toContain('sau cắt 3');
    expect(s).toContain('bỏ vì trần 137');
    expect(s).toContain('mật độ 140/1000 từ');
    expect(s).toContain('ngưỡng 500, checkmate.yml');
    expect(s).toContain('chỉ đo, chưa áp');
  });
  it('vắng / hỏng hình ⇒ KHÔNG BIẾT — không hiện 0, không hiện mặc định', () => {
    expect(describeVolumeStandard(undefined)).toBe(VOLUME_UNKNOWN);
    expect(describeVolumeStandard(null)).toBe(VOLUME_UNKNOWN);
    expect(describeVolumeStandard({} as VolumeStandard)).toBe(VOLUME_UNKNOWN);
    expect(describeVolumeStandard({ counts: 'x' } as unknown as VolumeStandard)).toBe(VOLUME_UNKNOWN);
    expect(VOLUME_UNKNOWN).not.toMatch(/\b0\b/);
    expect(VOLUME_UNKNOWN).not.toContain('mặc định');
  });
  it('bốn nguồn có bốn nhãn khác nhau; default_unreadable nói thẳng file KHÔNG ĐỌC ĐƯỢC', () => {
    const nhan = Object.values(KNOB_SOURCE_LABEL);
    expect(new Set(nhan).size).toBe(4);
    expect(KNOB_SOURCE_LABEL.default_unreadable).toContain('KHÔNG ĐỌC ĐƯỢC');
    expect(KNOB_SOURCE_LABEL.default).not.toContain('KHÔNG ĐỌC');
    expect(KNOB_SOURCE_LABEL.no_repo).toContain('không có repo');
    const s = describeVolumeStandard({ ...vsDoc, finding_cap: { value: 100, source: 'default_unreadable' } });
    expect(s).toContain('KHÔNG ĐỌC ĐƯỢC');
  });
  it('code: trần hiệu dụng + nguồn cắn, KHÔNG có mật độ; giá trị bị kẹp và sai kiểu đều lộ', () => {
    const vsCode: VolumeStandard = {
      probe_cap: { value: 6, repo: { value: 100, source: 'repo', clamped_from: 5000 }, operator: 6, bound_by: 'operator' },
      counts: { before_cut: 7, after_cut: 6, candidates: 6, final: 2, dropped_by_cap: 1 },
    };
    const s = describeVolumeStandard(vsCode);
    expect(s).toContain('trần probe 6 (người vận hành 6; repo 100 (checkmate.yml, khai 5000 bị kẹp))');
    expect(s).toContain('trước cắt 7 · sau cắt 6 · bỏ vì trần 1');
    expect(s).not.toContain('mật độ');
    expect(describeVolumeStandard({ ...vsCode, probe_cap: { ...vsCode.probe_cap!, repo: { value: 20, source: 'default', reason: 'invalid_type' } } })).toContain('khai sai kiểu bị bỏ');
  });
  it('mật độ dưới sàn / không đo được / lỗi đếm nói rõ lý do, vẫn hiện số từ', () => {
    const d = vsDoc.density!;
    expect(describeVolumeStandard({ ...vsDoc, density: { ...d, words: 180, reason: 'under_floor', band: undefined, measured_per_1000: undefined } })).toContain('mật độ không đo (180 từ · dưới sàn 300 từ)');
    expect(describeVolumeStandard({ ...vsDoc, density: { ...d, words: 0, reason: 'unmeasurable' } })).toContain('không đo được cỡ');
    expect(describeVolumeStandard({ ...vsDoc, density: { ...d, reason: 'error' } })).toContain('lỗi đếm từ');
  });
});

describe('năm bề mặt: 140 ở nhãn «trước cắt», KHÔNG phải 3 (T2.13); verdict đời cũ ⇒ không biết (T2.12)', () => {
  const v = verdict(vsDoc);
  const vCu = verdict(undefined);

  it('comment PR — receipt', () => {
    const s = renderReceipt(v, 'nguoi', []);
    expect(s).toContain('trước cắt 140');
    expect(s).not.toContain('trước cắt 3 ');
    expect(s).toContain('3 finding (0 high · 0 medium · 3 low)'); // số ĐÃ GIỮ vẫn là 3 — hợp lệ ở nhãn ấy
    expect(renderReceipt(vCu, 'nguoi', [])).toContain(VOLUME_UNKNOWN);
  });
  it('comment PR — verdict tự động', () => {
    const s = renderAutoVerdict(v);
    expect(s).toContain('trước cắt 140');
    expect(s).toContain('ngưỡng 500, checkmate.yml'); // repo hạ chuẩn phải LỘ trên bề mặt công khai (T2.14)
    expect(renderAutoVerdict(vCu)).toContain(VOLUME_UNKNOWN);
  });
  it('màn chấm', () => {
    const html = verdictHtml(v);
    expect(html).toContain('Chuẩn khối lượng');
    expect(html).toContain('trước cắt 140');
    expect(html).not.toMatch(/trước cắt 3\b/);
    const cu = verdictHtml(vCu);
    expect(cu).toContain('không biết (verdict đời cũ)');
    expect(cu).not.toMatch(/trước cắt 0\b/);
  });
  it('lịch sử', () => {
    const html = historyPage([runMeta(v)], { trang: 1 } as Parameters<typeof historyPage>[1], []);
    expect(html).toContain('trước cắt 140');
    const cu = historyPage([runMeta(vCu)], { trang: 1 } as Parameters<typeof historyPage>[1], []);
    expect(cu).toContain('verdict đời cũ');
    expect(cu).toMatch(/trước cắt <span[^>]*>\?<\/span>/);
    expect(cu).not.toMatch(/trước cắt (0|3)\b/);
  });
  it('lượt code: khối mật độ VẮNG trên mọi bề mặt, trần khai cả hai nguồn (T2.11)', () => {
    const vsCode: VolumeStandard = {
      probe_cap: { value: 6, repo: { value: 40, source: 'repo' }, operator: 6, bound_by: 'operator' },
      counts: { before_cut: 7, after_cut: 6, candidates: 6, final: 3, dropped_by_cap: 1 },
    };
    const vc = verdict(vsCode, 'code');
    expect(Object.hasOwn(vc.volume_standard!, 'density')).toBe(false);
    for (const s of [renderReceipt(vc, 'n', []), renderAutoVerdict(vc), verdictHtml(vc)]) {
      expect(s).toContain('trần probe 6 (người vận hành 6; repo 40 (checkmate.yml))');
      expect(s).not.toContain('mật độ');
    }
  });
  it('trường có nhưng hỏng hình (thiếu counts / sai kiểu) ⇒ không biết, không ném', () => {
    const hong = verdict({ finding_cap: { value: 1, source: 'repo' } } as unknown as VolumeStandard);
    expect(() => verdictHtml(hong)).not.toThrow();
    expect(verdictHtml(hong)).toContain('không biết');
    expect(renderAutoVerdict(hong)).toContain(VOLUME_UNKNOWN);
  });
});
