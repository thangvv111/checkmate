import { userInfo } from 'node:os';
import { chuanMuc, type Finding, type Verdict } from '../../../packages/shared/src/types.js';
import { ghiSoCong } from './kho/kho-socai.js';

export function nguoiThaoTac(): string {
  try {
    return userInfo().username;
  } catch {
    return 'operator';
  }
}

export function demMuc(findings: Finding[]): { high: number; medium: number; low: number } {
  const d = { high: 0, medium: 0, low: 0 };
  for (const f of findings) d[chuanMuc(f.severity)]++;
  return d;
}

// Sổ hành động cổng nay là bảng chỉ-ghi-thêm trong cơ sở dữ liệu (specs/R9.6).
export function ghiSo(entry: Record<string, unknown>): void {
  const hd = entry.hanhDong === 'merge' ? 'merge' : entry.hanhDong === 'reject' ? 'reject' : null;
  if (!hd || typeof entry.run_id !== 'string') return; // không dựng được hàng thì không ghi rác vào sổ
  const xacNhan = Array.isArray(entry.xac_nhan_medium) ? entry.xac_nhan_medium.length : 0;
  ghiSoCong({
    run_id: entry.run_id,
    luc: new Date().toISOString(),
    hanh_dong: hd,
    nguoi: typeof entry.nguoi === 'string' ? entry.nguoi : 'không rõ',
    chi_tiet:
      typeof entry.ghi_chu === 'string' && entry.ghi_chu
        ? entry.ghi_chu
        : xacNhan
          ? `${xacNhan} cảnh báo medium được chấp nhận`
          : undefined,
  });
}

function dongFinding(f: Finding): string {
  const muc = chuanMuc(f.severity).toUpperCase();
  let bc = '';
  if (f.evidence.type === 'test_run') {
    bc = `kỳ vọng: ${f.evidence.expected.slice(0, 200)} → thực tế: ${f.evidence.actual.split('\n')[0].slice(0, 200)}`;
  } else if (f.evidence.type === 'quote_pair') {
    bc = `${f.evidence.loc_a}: «${f.evidence.quote_a.slice(0, 150)}» ⟷ ${f.evidence.loc_b}: «${f.evidence.quote_b.slice(0, 150)}»`;
  } else {
    bc = `${f.evidence.loc}: «${f.evidence.quote.slice(0, 200)}»`;
  }
  return `- **[${muc}] ${f.title_vi}**\n  - Điều gì sai: ${f.what_vi}\n  - Hậu quả: ${f.consequence_vi}\n  - Bằng chứng: ${bc}`;
}

export function banReceipt(v: Verdict, nguoi: string, xacNhanMedium: string[]): string {
  const d = demMuc(v.findings);
  const dsFinding = v.findings.length ? v.findings.map(dongFinding).join('\n') : '_Không có finding._';
  const xn = xacNhanMedium.length
    ? `\n**Cảnh báo MEDIUM đã được \`${nguoi}\` đọc và chấp nhận trước khi merge:**\n${xacNhanMedium.map((t) => `- ${t}`).join('\n')}\n`
    : '';
  return `## ♞ CheckMate — Receipt review

**Verdict: ${v.result}** · \`${v.artifact_ref.name}\` @ \`${v.artifact_ref.sha_or_hash.slice(0, 10)}\`
${v.findings.length} finding (${d.high} high · ${d.medium} medium · ${d.low} low) · model \`${v.model}\` · run \`${v.run_id}\`
${xn}
${dsFinding}

_Verdict ghim đúng commit trên — push mới là verdict hết hiệu lực._`;
}

// Chế độ trực: comment verdict tự động khi run xong (không phải receipt merge)
export function banVerdictTuDong(v: Verdict): string {
  const d = demMuc(v.findings);
  const dsFinding = v.findings.length
    ? v.findings.map(dongFinding).join('\n')
    : '_Không có finding — hành vi khớp spec trên mọi probe đã chạy._';
  return `## ♞ CheckMate — Verdict tự động (chế độ trực)

**${v.result}** · \`${v.artifact_ref.name}\` @ \`${v.artifact_ref.sha_or_hash.slice(0, 10)}\` · ${v.findings.length} finding (${d.high} high · ${d.medium} medium · ${d.low} low) · run \`${v.run_id}\`

${dsFinding}
${(v.quan_sat_ngoai_pr ?? []).length ? `\n**Quan sát ngoài phạm vi PR** (không tính vào verdict — lỗi tồn tại trên cả nhánh gốc, đề nghị mở việc riêng):\n${(v.quan_sat_ngoai_pr ?? []).map((q) => `- ${q.loai === 'nghi_loi_co_san' ? '⚠ nghi LỖI CÓ SẴN' : 'ngoài phạm vi'} · \`${q.probe_id}\` (${q.spec_rule}) — ${q.ten}`).join('\n')}\n` : ''}
_Verdict ghim đúng commit trên — push mới sẽ được chấm lại tự động. Thao tác cổng (Merge / Trả về dev) thực hiện trong CheckMate._`;
}

export function banPhanQuyet(v: Verdict, ghiChu: string, dongPr = false): string {
  const d = demMuc(v.findings);
  return `## ♞ CheckMate — Trả về dev

**Verdict: ${v.result}** · \`${v.artifact_ref.name}\` @ \`${v.artifact_ref.sha_or_hash.slice(0, 10)}\` · ${v.findings.length} finding (${d.high} high · ${d.medium} medium · ${d.low} low)

${v.findings.map(dongFinding).join('\n')}
${ghiChu ? `\n**Ghi chú của người review:** ${ghiChu}\n` : ''}
Vá theo từng finding rồi push lên chính nhánh này — CheckMate sẽ chấm lại trên commit mới (verdict cũ tự hết hiệu lực).
${dongPr ? '\n> ⚠ **PR này đã được đóng.** Nhánh vẫn còn nguyên: vá xong hãy bấm **Reopen** chính PR này (đừng tạo PR mới) để giữ lịch sử review. PR đang đóng sẽ không xuất hiện trong hàng đợi review của CheckMate, và push commit mới KHÔNG tự mở lại PR.\n' : ''}`;
}
