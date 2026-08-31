import { chuanMuc, type Finding, type Verdict } from '../../../packages/shared/src/types.js';
import { ghiSoCong } from './kho/kho-socai.js';

/**
 * ĐÃ GỠ: `nguoiThaoTac()` lấy `userInfo().username` — tài khoản HỆ ĐIỀU HÀNH chạy tiến trình. Trên máy
 * chủ đó là `ubuntu`, nên sổ kiểm toán ghi cùng một cái tên cho mọi hành động của mọi người, và một
 * cổng phê duyệt không truy được ai phê duyệt thì không phải cổng.
 *
 * Người thao tác nay lấy từ PHIÊN ĐĂNG NHẬP qua `layDanhTinh(req)` — cửa duy nhất, R11.1 và R11.4.
 * Không để lại hàm thay thế nào ở đây: có một hàm tiện tay trả về «một cái tên nào đó» là mời chỗ gọi
 * sau này dùng lại đúng cái bệnh vừa chữa (R11.3).
 */

/**
 * So tên người bấm với tác giả PR. Hai định danh đến từ hai hệ khác nhau (tài khoản CheckMate và định
 * danh GitHub) nên KHÔNG khớp được chắc chắn — đây là phép so thô, cố ý bắt sót hơn là bắt oan. Bắt
 * sót thì hai cái tên vẫn nằm cạnh nhau trong sổ cho người đọc tự thấy; bắt oan thì cảnh báo dựng lên
 * ở đúng lúc người ta cần merge gấp, và lần sau không ai đọc cảnh báo nữa.
 */
export function trungNguoi(nguoiBam: string, tacGiaPr: string): boolean {
  const gon = (x: string) => x.trim().toLowerCase().replace(/[._-]/g, '');
  return gon(nguoiBam) !== '' && gon(nguoiBam) === gon(tacGiaPr);
}

export function demMuc(findings: Finding[]): { high: number; medium: number; low: number } {
  const d = { high: 0, medium: 0, low: 0 };
  for (const f of findings) d[chuanMuc(f.severity)]++;
  return d;
}

// Sổ hành động cổng nay là bảng chỉ-ghi-thêm trong cơ sở dữ liệu (specs/R9.6).
export function ghiSo(entry: Record<string, unknown>): void {
  const hd = entry.hanhDong === 'merge' ? 'merge' : entry.hanhDong === 'reject' ? 'reject' : null;
  if (!hd || typeof entry.run_id !== 'string') {
    // Bỏ hàng trong im lặng là mất dấu vết một hành động cổng ĐÃ XẢY RA THẬT — người merge vẫn merge,
    // chỉ có sổ là không biết. Sổ kiểm toán mất hàng mà không ai hay còn tệ hơn sổ có hàng xấu.
    console.error(
      `Sổ hành động cổng: KHÔNG ghi được một hành động vừa xảy ra (hanhDong=${String(entry.hanhDong)}, ` +
        `run_id=${String(entry.run_id)}). Hàng này mất khỏi sổ kiểm toán — cần xem lại chỗ gọi.`,
    );
    return;
  }
  // Giữ DANH SÁCH cảnh báo medium được chấp nhận, không chỉ con số. Người kiểm toán hỏi «ai đã đồng ý
  // bỏ qua cảnh báo NÀO» — một con số 3 không trả lời được câu đó, và bản thân nó cũng không kiểm chứng
  // lại được với verdict đã ghim.
  const ds = Array.isArray(entry.xac_nhan_medium) ? entry.xac_nhan_medium.map((x) => String(x)) : [];
  const tacGiaPr = typeof entry.tac_gia_pr === 'string' && entry.tac_gia_pr ? entry.tac_gia_pr : undefined;
  // R11.17 — người bấm trùng tác giả PR thì GHI DẤU, không chặn. Hai cái tên nằm cạnh nhau trên cùng
  // một hàng thì người kiểm toán tự thấy, kể cả những ca hệ thống nhận diện sót.
  const tuDuyet = tacGiaPr && typeof entry.nguoi === 'string' && trungNguoi(entry.nguoi, tacGiaPr);
  const moTaXacNhan = ds.length ? `chấp nhận ${ds.length} cảnh báo medium: ${ds.join(', ')}` : '';
  const ghiChu = typeof entry.ghi_chu === 'string' ? entry.ghi_chu.trim() : '';
  // R6.18 — sổ phải phân biệt «người trả về» với «máy trả về»: hai mức trách nhiệm khác nhau
  const boiMay = entry.tu_dong === true ? 'do TÁC NHÂN MÁY thực hiện tự động' : '';
  ghiSoCong({
    run_id: entry.run_id,
    luc: new Date().toISOString(),
    hanh_dong: hd,
    nguoi: typeof entry.nguoi === 'string' ? entry.nguoi : 'không rõ',
    // Cả hai vế đều giữ khi cùng có — ghi chú của người và danh sách đã chấp nhận trả lời hai câu khác nhau
    tac_gia_pr: tacGiaPr,
    chi_tiet:
      [boiMay, ghiChu, moTaXacNhan, tuDuyet ? '⚠ người bấm cổng TRÙNG tác giả PR (tự duyệt)' : '']
        .filter(Boolean)
        .join(' · ') || undefined,
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
