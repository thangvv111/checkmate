import { chuanMuc, type Finding, type Verdict } from '../../../packages/shared/src/types.js';
import { docSoCong, ghiSoCong, runChuaCoHanhDongCong } from './kho/kho-socai.js';
import { capNhatCongRun, docMeta } from './kho/kho-run.js';

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
/**
 * Ghi chú cho một hàng NGOÀI CỔNG (R6.22).
 *
 * Phải nói đủ ba điều: hành động xảy ra ngoài CheckMate · KHÔNG có xác nhận finding nào · verdict lúc
 * đó ra sao và còn bao nhiêu medium/low chưa ai tick. Để trống chỗ xác nhận là mời người đọc suy diễn
 * thành «không có finding nào để xác nhận» — hai điều đó khác hẳn nhau, và đường qua cổng vốn BẮT
 * tick từng cái.
 */
export function chiTietNgoaiCong(v: { result?: string; findings?: Finding[] } | null): string {
  // Hàm đứng CUỐI mọi đường ghi hàng ngoài-cổng: nó mà ném thì hàng không được ghi và lượt đối soát
  // gãy — lệch ngược hướng an toàn. Lọc phần tử méo thay vì tin hình dạng (vòng một của cổng bắt).
  const ds = Array.isArray(v?.findings) ? v.findings.filter((f) => f && typeof f === 'object') : [];
  const d = demMuc(ds);
  const chuaTick = d.medium + d.low;
  return [
    '⚠ Hành động xảy ra NGOÀI CheckMate (không qua cổng)',
    'KHÔNG có xác nhận finding nào — không ai tick trước khi merge',
    `verdict lúc chấm: ${v?.result ?? 'không rõ'} · ${d.high} high · ${d.medium} medium · ${d.low} low` +
      (chuaTick ? ` · ${chuaTick} cảnh báo medium/low CHƯA được xác nhận` : ' · không có cảnh báo medium/low nào'),
  ].join(' · ');
}

/**
 * Đối soát sổ cổng với trạng thái THẬT của pull request (R6.20–R6.25).
 *
 * Một cổng không ngăn được người ta merge bằng đường khác; điều nó bắt buộc phải làm là BIẾT chuyện
 * đó đã xảy ra. Hàm nhận `docTrangThai` từ ngoài để test được mà không cần mạng.
 */
export async function doiSoatCong(
  docTrangThai: (pr: number) => Promise<{ trang_thai: 'mo' | 'merged' | 'dong'; nguoi_merge?: string; tac_gia?: string }>,
  log: (msg: string) => void = () => {},
): Promise<{ daGhi: number; boQua: number; loi: number }> {
  const canSoat = runChuaCoHanhDongCong();
  if (!canSoat.length) return { daGhi: 0, boQua: 0, loi: 0 };
  // Gom THEO PR chứ không theo run: một PR có thể có chục lượt chấm (chuỗi vá nhiều vòng), và hỏi
  // GitHub một lần cho mỗi lượt là tự đốt quota vào cùng một câu trả lời.
  const theoPr = new Map<number, string[]>();
  for (const r of canSoat) theoPr.set(r.pr_so, [...(theoPr.get(r.pr_so) ?? []), r.run_id]);

  let daGhi = 0;
  let boQua = 0;
  let loi = 0;
  for (const [pr, dsRun] of theoPr) {
    let tt: Awaited<ReturnType<typeof docTrangThai>>;
    try {
      tt = await docTrangThai(pr);
    } catch (e) {
      // R6.24 — không đọc được thì BỎ QUA và nói ra. Sổ chỉ ghi thêm và không sửa được, nên thà thiếu
      // một hàng còn hơn mang một hàng suy đoán vĩnh viễn.
      loi++;
      log(`Đối soát cổng: không đọc được trạng thái PR #${pr} — bỏ qua, không ghi hàng nào: ${(e as Error).message.slice(0, 120)}`);
      continue;
    }
    if (tt.trang_thai === 'mo') {
      boQua += dsRun.length;
      continue;
    }
    // R6.24 — chỉ HAI giá trị nói được điều gì. Mọi thứ khác (giá trị lạ, trường khuyết) là «không
    // đọc được trạng thái» ⇒ BỎ QUA. Rơi mềm thành `reject` là ghi một hàng SUY ĐOÁN vào cuốn sổ
    // không sửa được — đúng thứ R6.24 cấm (vòng một của cổng bắt).
    const hd = tt.trang_thai === 'merged' ? 'merge' : tt.trang_thai === 'dong' ? 'reject' : null;
    if (!hd) {
      loi++;
      log(`Đối soát cổng: PR #${pr} trả trạng thái ngoài miền («${String(tt.trang_thai)}») — bỏ qua, không ghi hàng suy đoán`);
      continue;
    }
    for (const runId of dsRun) {
      // R6.25 — một run hỏng KHÔNG được giết trọn lượt đối soát các run còn lại. Lưới bọc TỪNG run,
      // không chỉ bọc lời gọi GitHub (vòng một của cổng bắt: verdict hỏng ở run giữa làm hàm ném ra
      // ngoài và hai run kia không bao giờ được ghi).
      try {
      // Kiểm LẠI ngay trước khi ghi: giữa lúc lấy danh sách và lúc ghi có thể có người vừa bấm cổng
      // thật (R6.23 — chạy lại không được đẻ hàng trùng).
      if (docSoCong(runId).length) {
        boQua++;
        continue;
      }
      const r = docMeta(runId);
      const luc = new Date().toISOString();
      const chiTiet = chiTietNgoaiCong(r?.verdict ?? null);
      ghiSoCong({
        run_id: runId,
        luc,
        hanh_dong: hd,
        // R6.24 — người của hàng này lấy từ chính GitHub, hoặc để «không rõ». KHÔNG mượn tên tài
        // khoản nào trong hệ này: hàng đó ghi lại việc người khác làm ở nơi khác (R11.1).
        nguoi: tt.nguoi_merge ? `${tt.nguoi_merge} (GitHub)` : '(ngoài cổng — không rõ)',
        tac_gia_pr: tt.tac_gia,
        ngoai_cong: true,
        chi_tiet: chiTiet,
      });
      capNhatCongRun(runId, hd, luc, tt.nguoi_merge ? `${tt.nguoi_merge} (GitHub)` : '(ngoài cổng — không rõ)', chiTiet, true);
      daGhi++;
      log(`Đối soát cổng: PR #${pr} đã ${tt.trang_thai} ngoài cổng — ghi sổ cho run ${runId}`);
      } catch (e) {
        loi++;
        log(`Đối soát cổng: run ${runId} lỗi khi ghi — bỏ qua run này, các run khác vẫn chạy: ${(e as Error).message.slice(0, 120)}`);
      }
    }
  }
  return { daGhi, boQua, loi };
}

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
