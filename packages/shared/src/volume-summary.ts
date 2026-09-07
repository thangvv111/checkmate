import type { Knob, KnobSource, VolumeStandard } from './types.js';

/**
 * Lời mô tả MỘT DÒNG cho `volume_standard` — dùng chung cho comment PR, màn chấm, lịch sử, CLI.
 *
 * Một hàm cho mọi bề mặt, vì đây là lớp phòng thứ ba của mọi khoá `checkmate.yml`: kẹp dải chặn giá
 * trị hoang, đọc nhánh gốc chặn pull request tự nới, còn KHAI RA là thứ duy nhất làm việc hạ chuẩn
 * HỢP LỆ nhìn thấy được. Năm bề mặt mà mỗi bề mặt tự dựng chữ thì sớm muộn một trong năm im lặng.
 *
 * Mọi số lấy từ trường có kiểu — KHÔNG đếm lại `findings.length`, không so khớp chuỗi.
 */

export const KNOB_SOURCE_LABEL: Record<KnobSource, string> = {
  default: 'mặc định',
  repo: 'checkmate.yml',
  default_unreadable: 'mặc định — checkmate.yml KHÔNG ĐỌC ĐƯỢC',
  no_repo: 'mặc định — không có repo',
};

export function describeKnob(k: Knob): string {
  const goc = k.clamped_from !== undefined ? `, khai ${k.clamped_from} bị kẹp` : k.reason === 'invalid_type' ? ', khai sai kiểu bị bỏ' : '';
  return `${k.value} (${KNOB_SOURCE_LABEL[k.source] ?? k.source}${goc})`;
}

/** Nhãn khi verdict KHÔNG mang trường — đời cũ. Phải khác hẳn «0» và khác «mặc định». */
export const VOLUME_UNKNOWN = 'Chuẩn khối lượng: không biết (verdict đời cũ)';

export function describeVolumeStandard(vs: VolumeStandard | undefined | null): string {
  if (!vs || typeof vs !== 'object' || !vs.counts || typeof vs.counts !== 'object') return VOLUME_UNKNOWN;
  const c = vs.counts;
  const phan: string[] = [];
  if (vs.finding_cap) phan.push(`trần finding ${describeKnob(vs.finding_cap)}`);
  if (vs.probe_cap) {
    const p = vs.probe_cap;
    const nguon = p.bound_by === 'operator' ? `người vận hành ${p.operator}; repo ${describeKnob(p.repo)}` : `${describeKnob(p.repo)}${p.operator !== undefined ? `; người vận hành ${p.operator}` : ''}`;
    phan.push(`trần probe ${p.value} (${nguon})`);
  }
  phan.push(`trước cắt ${c.before_cut} · sau cắt ${c.after_cut} · bỏ vì trần ${c.dropped_by_cap}`);
  if (vs.density) {
    const d = vs.density;
    if (d.reason === 'observe_only' && d.measured_per_1000 !== undefined) {
      phan.push(
        `mật độ ${d.measured_per_1000}/1000 từ (${d.words} từ · dải ${d.band} · ngưỡng ${d.threshold_per_1000}, ${KNOB_SOURCE_LABEL[d.standard.per_1000_words.source]}${d.exceeded ? ' · VƯỢT' : ''}) — chỉ đo, chưa áp`,
      );
    } else {
      const lyDo = d.reason === 'under_floor' ? `dưới sàn ${d.standard.floor_words.value} từ` : d.reason === 'unmeasurable' ? 'không đo được cỡ' : 'lỗi đếm từ';
      phan.push(`mật độ không đo (${d.words} từ · ${lyDo})`);
    }
  }
  return `Chuẩn khối lượng: ${phan.join(' · ')}`;
}
