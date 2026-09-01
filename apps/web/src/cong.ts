import { chuanMuc, type Finding, type Verdict } from '../../../packages/shared/src/types.js';
import { ghiSoCong, hanhDongCongCuaPr, prCanDoiSoat } from './kho/kho-socai.js';
import { cheTokenTrongVan } from './github.js';
import { MODE } from './config.js';
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
  // Danh sách finding CÓ MẶT nhưng KHÔNG ĐỌC ĐƯỢC (chuỗi, số, object) thì phải NÓI RA — rơi mềm về
  // mảng rỗng rồi ghi «0 high · không có cảnh báo» là khai DỮ LIỆU KHÔNG ĐỌC ĐƯỢC THÀNH BẰNG KHÔNG,
  // đúng thứ R6.22 cấm: người đọc sổ sẽ tưởng lượt chấm sạch (vòng chín của cổng bắt).
  if (v?.findings !== undefined && !Array.isArray(v.findings)) {
    return [
      '⚠ Hành động xảy ra NGOÀI CheckMate (không qua cổng)',
      `ghi nhận tự động bởi ${TEN_TAC_NHAN_MAY} khi đối soát — máy chỉ GHI LẠI, không phải máy thực hiện (R6.18)`,
      'KHÔNG có xác nhận finding nào — không ai tick trước khi merge',
      `verdict lúc chấm: ${v?.result ?? 'không rõ'} · danh sách finding KHÔNG ĐỌC ĐƯỢC (kiểu ${typeof v.findings}) — KHÔNG đếm được, đừng đọc thành «không có finding»`,
    ].join(' · ');
  }
  // Hàm đứng CUỐI mọi đường ghi hàng ngoài-cổng: nó mà ném thì hàng không được ghi và lượt đối soát
  // gãy — lệch ngược hướng an toàn. Lọc phần tử méo thay vì tin hình dạng (vòng một của cổng bắt).
  // Loại phần tử KHÔNG PHẢI finding (null, chuỗi, thiếu hẳn severity) — nhưng KHÔNG nuốt finding có
  // severity LẠ: `chuanMuc` đã lo việc chuẩn hoá (`'critical'`, `'HIGH'` viết hoa, `'blocker'` đều
  // fail-closed về high). Bản trước lọc theo đúng ba giá trị nên finding thật mang nhãn lạ bị đánh
  // rơi và số liệu trong sổ khai THIẾU — vá «đếm sai» bằng cách NUỐT dữ liệu, đúng lớp lỗi mà chuỗi
  // vá này đã bị bắt hai lần (vòng năm của cổng bắt lần thứ ba).
  // RANH GIỚI, chốt sau bốn vòng bị bắt qua lại:
  //  · KHÔNG phải object, hoặc object KHÔNG có khoá `severity` → không đủ hình dạng một finding → loại.
  //  · CÓ khoá `severity` → LÀ finding thật, dù giá trị méo (null, số, khoảng trắng) → PHẢI đếm, và
  //    `chuanMuc` fail-closed đưa mọi nhãn lạ về high.
  // Hai vòng trước bắt hai đầu của ranh giới này: vòng bốn bắt «đếm rác thành high», vòng sáu bắt
  // «nuốt finding thật có nhãn méo». Lọc rộng quá thì khai THỪA, lọc hẹp quá thì khai THIẾU — cả hai
  // đều là con số sai trong một cuốn sổ không sửa được.
  // MỌI mục bị bộ lọc loại đều PHẢI được đếm và nói ra. Vòng chín chỉ chặn ca `findings` sai kiểu ở
  // NGOÀI (chuỗi/số/object); vòng mười một bắt đúng khuôn ấy ở TRONG: findings LÀ mảng nhưng mọi
  // phần tử đều bị loại, danh sách còn rỗng, và chuỗi mô tả ghi «0 high · không có cảnh báo» y hệt
  // một lượt chấm sạch. Đây là lần thứ hai cùng một khuôn «khai dữ liệu KHÔNG ĐỌC ĐƯỢC thành BẰNG
  // KHÔNG» — nên phép đếm nằm ở CHỖ LỌC, không phải ở từng ca đầu vào (R6.22).
  const tho = Array.isArray(v?.findings) ? v.findings : [];
  const ds = (tho
    .filter((f) => f !== null && typeof f === 'object' && 'severity' in (f as object))
    // chuanMuc chỉ nhận chuỗi: severity là số thì `.toLowerCase` không tồn tại và hàm mô tả sẽ ném
    .map((f) => ({ ...(f as object), severity: String((f as { severity?: unknown }).severity ?? '') })) as Finding[]);
  const boLoai = tho.length - ds.length;
  const d = demMuc(ds);
  const chuaTick = d.medium + d.low;
  const nghiVe = boLoai
    ? ` · ${boLoai} mục KHÔNG đọc được (không đủ hình dạng một finding) — con số trên chỉ tính phần đọc được, KHÔNG phải toàn bộ`
    : '';
  return [
    '⚠ Hành động xảy ra NGOÀI CheckMate (không qua cổng)',
    `ghi nhận tự động bởi ${TEN_TAC_NHAN_MAY} khi đối soát — máy chỉ GHI LẠI, không phải máy thực hiện (R6.18)`,
    'KHÔNG có xác nhận finding nào — không ai tick trước khi merge',
    `verdict lúc chấm: ${v?.result ?? 'không rõ'} · ${d.high} high · ${d.medium} medium · ${d.low} low` +
      (chuaTick
        ? ` · ${chuaTick} cảnh báo medium/low CHƯA được xác nhận`
        : boLoai
          ? ''
          : ' · không có cảnh báo medium/low nào') +
      nghiVe,
  ].join(' · ');
}

/**
 * Đối soát sổ cổng với trạng thái THẬT của pull request (R6.20–R6.25).
 *
 * Một cổng không ngăn được người ta merge bằng đường khác; điều nó bắt buộc phải làm là BIẾT chuyện
 * đó đã xảy ra. Hàm nhận `docTrangThai` từ ngoài để test được mà không cần mạng.
 */
/** R6.18 — danh tính của TÁC NHÂN MÁY. Sổ phải phân biệt «người làm» với «máy làm». */
export const TEN_TAC_NHAN_MAY = 'ci-bot';

/**
 * Mô tả một thứ vừa bị ném ra — KHÔNG được tự ném.
 *
 * Nhiều client HTTP ném chuỗi trần hoặc object `{ code: 404 }` không có `.message`; gọi thẳng
 * `(e as Error).message.slice(...)` trong khối bắt lỗi làm chính khối đó ném, lỗi bị đếm hai lần và
 * nguyên nhân thật mất hẳn (vòng hai của cổng bắt).
 */
function moTaLoi(e: unknown): string {
  let van: string;
  if (e instanceof Error && typeof e.message === 'string') van = e.message;
  else {
    try {
      van = String(typeof e === 'object' && e !== null ? JSON.stringify(e) : e);
    } catch {
      van = Object.prototype.toString.call(e);
    }
  }
  // CHE TRƯỚC KHI CẮT: lỗi mạng của lệnh fetch mang nguyên URL `https://x-access-token:ghp_…@github.com`,
  // và cắt 120 ký tự rồi mới đẩy vào log là đẩy nguyên cái token ra sổ (vòng ba của cổng bắt). Hàm che
  // đã có sẵn trong repo — không dùng nó ở đây là bỏ quên, không phải thiếu công cụ.
  return cheTokenTrongVan(van).slice(0, 160);
}

export async function doiSoatCong(
  docTrangThai: (pr: number, repo: string) => Promise<{ trang_thai?: string; nguoi_merge?: string; tac_gia?: string } | null | undefined>,
  logTho: (msg: string) => void = () => {},
): Promise<{ daGhi: number; boQua: number; loi: number }> {
  // R6.12 — chế độ demo KHÔNG được thao tác cổng. Đối soát tuy chỉ GHI LẠI nhưng hàng nó ghi nằm
  // trong đúng cuốn sổ kiểm toán ấy, và sổ chỉ ghi thêm nên một hàng demo là một hàng sai vĩnh viễn.
  if (MODE === 'demo') return { daGhi: 0, boQua: 0, loi: 0 };
  // Logger do CHỖ GỌI đưa vào: nó ném thì không được kéo cả lượt đối soát xuống (R6.25). Bọc ngay tại
  // đây thay vì mong mọi chỗ gọi tự cẩn thận.
  const log = (msg: string): void => {
    try {
      logTho(msg);
    } catch {
      /* logger hỏng không phải lý do để bỏ sót các pull request còn lại */
    }
  };
  const canSoat = prCanDoiSoat();
  if (!canSoat.length) return { daGhi: 0, boQua: 0, loi: 0 };
  // Gom theo CẶP (repo, pull request) — không theo run (một PR có chục lượt chấm, hỏi lại cùng một
  // câu là tự đốt quota) và không theo số PR trơ (hai repo trùng số PR là chuyện thường).
  const theoPr = new Map<string, { repo: string; pr: number; dsRun: string[] }>();
  for (const r of canSoat) {
    const khoa = `${r.repo}#${r.pr_so}`;
    const o = theoPr.get(khoa) ?? { repo: r.repo, pr: r.pr_so, dsRun: [] };
    o.dsRun.push(r.run_id);
    theoPr.set(khoa, o);
  }

  let daGhi = 0;
  let boQua = 0;
  let loi = 0;
  for (const { repo, pr, dsRun } of theoPr.values()) {
    // R6.25 — lưới bọc TỪNG pull request: một PR hỏng không được làm chết lượt đối soát của các PR
    // còn lại (vòng hai của cổng bắt: lỗi ở PR đầu làm hai PR sau không bao giờ được ghi).
    try {
      // R6.23 — phép kiểm RẺ chặn trước phép gọi ĐẮT: PR đã có cả merge lẫn reject ghi sổ thì không
      // còn hành động nào để phát hiện, hỏi GitHub thêm một lần là tốn quota vào câu trả lời không
      // dùng tới. Danh sách phải cạn dần về 0 sau lần đầu, đúng như change này tự khai.
      const daCo = hanhDongCongCuaPr(repo, pr).map((x) => x.hanh_dong);
      // Đã có `merge` là hết chuyện: pull request đã merge không còn hành động cổng nào khác để phát
      // hiện. Đòi ĐỦ CẢ merge lẫn reject thì PR đã xử xong vẫn bị hỏi GitHub mãi, trái chính điều
      // R6.23 khai «danh sách cạn dần về 0» (vòng bốn của cổng bắt).
      if (daCo.includes('merge')) {
        boQua += dsRun.length;
        continue;
      }
      let tt: { trang_thai?: string; nguoi_merge?: string; tac_gia?: string } | null | undefined;
      try {
        tt = await docTrangThai(pr, repo);
      } catch (e) {
        loi++;
        log(`Đối soát cổng: không đọc được trạng thái ${repo}#${pr} — bỏ qua, không ghi hàng nào: ${moTaLoi(e)}`);
        continue;
      }
      // R6.24 — CHỈ hai giá trị nói được điều gì. Trả về khuyết, null, hay giá trị ngoài miền đều là
      // «không đọc được trạng thái» ⇒ bỏ qua. Rơi mềm thành `reject` là ghi một hàng SUY ĐOÁN vào
      // cuốn sổ không sửa được.
      const tthai = tt?.trang_thai;
      if (tthai === 'mo') {
        boQua += dsRun.length;
        continue;
      }
      const hd = tthai === 'merged' ? 'merge' : tthai === 'dong' ? 'reject' : null;
      if (!hd) {
        loi++;
        log(`Đối soát cổng: ${repo}#${pr} trả trạng thái ngoài miền («${String(tthai)}») — bỏ qua, không ghi hàng suy đoán`);
        continue;
      }
      // «Đã qua cổng» phải xét theo HÀNH ĐỘNG, không phải theo «có hàng sổ nào chưa»: một PR từng bị
      // trả về dev qua cổng rồi sau đó bị merge thẳng bằng `gh` thì lần MERGE đó vẫn chưa ai ghi.
      // Idempotent xét theo HÀNH ĐỘNG, không phân biệt hàng người-bấm hay hàng máy-ghi: cả hai đều
      // nghĩa là hành động ấy ĐÃ được ghi, không cần ghi lần nữa.
      if (hanhDongCongCuaPr(repo, pr).some((x) => x.hanh_dong === hd)) {
        boQua += dsRun.length;
        continue;
      }
      // MỘT hành động = MỘT hàng. Một PR vá nhiều vòng có nhiều lượt chấm, nhưng chỉ có ĐÚNG MỘT lần
      // merge/đóng xảy ra — ghi ba hàng cho ba lượt là khai «có ba hành động», sai sự thật trong một
      // cuốn sổ không sửa được. Gắn vào lượt MỚI NHẤT (danh sách đã ORDER BY rowid DESC): đó là lượt
      // có verdict còn hiệu lực lúc PR bị đóng; các lượt cũ hơn đã bị push mới làm hết hiệu lực và
      // thật sự KHÔNG có hành động cổng nào trên chúng.
      for (const runId of dsRun.slice(0, 1)) {
        try {
          // Kiểm LẠI ở mức pull request ngay trước khi ghi: giữa lúc liệt kê và lúc ghi có thể có
          // người vừa bấm cổng thật — kể cả trên một run ANH EM cùng PR (R6.23).
          // Kiểm LẠI ở mức pull request ngay trước khi ghi (R6.23): giữa lúc liệt kê và lúc ghi có
          // thể có người vừa bấm cổng thật — kể cả trên một lượt chấm ANH EM cùng PR. Phép kiểm theo
          // run_id KHÔNG dùng nữa: một lượt có thể mang hàng `reject` của người rồi vẫn cần một hàng
          // `merge` ngoài cổng — hai hành động khác nhau.
          if (hanhDongCongCuaPr(repo, pr).some((x) => x.hanh_dong === hd)) {
            boQua++;
            continue;
          }
          const r = docMeta(runId);
          const luc = new Date().toISOString();
          const aiLam = tt?.nguoi_merge ? `người thực hiện trên GitHub: ${tt.nguoi_merge}` : 'không rõ ai thực hiện trên GitHub';
          const chiTiet = `${chiTietNgoaiCong(r?.verdict ?? null)} · ${aiLam}`;
          // Cột «người» trả lời câu «AI ĐÃ THỰC HIỆN», không phải «ai đã ghi lại». Hành động này do
          // người trên GitHub thực hiện; máy chỉ CHÉP LẠI. Ghi tên tác nhân máy vào đây là nói sai:
          // ci-bot không merge gì cả, và R6.19 nói máy KHÔNG BAO GIỜ merge — sổ mà ghi ci-bot merge
          // thì tự mâu thuẫn với chính điều khoản ấy.
          // Việc «máy ghi nhận» thể hiện bằng cột `ngoai_cong` + phần mô tả, không chiếm cột này.
          // (Vòng ba của cổng đẩy sang danh tính máy, vòng bốn bác lại — chốt ở đây, ghi vào R6.24.)
          const nguoi = tt?.nguoi_merge ? `${tt.nguoi_merge} (GitHub)` : '(ngoài cổng — không rõ)';
          ghiSoCong({ run_id: runId, luc, hanh_dong: hd, nguoi, tac_gia_pr: tt?.tac_gia, ngoai_cong: true, chi_tiet: chiTiet });
          capNhatCongRun(runId, hd); // bề mặt chép TỪ hàng sổ vừa ghi — không truyền giá trị song song (R6.26)
          daGhi++;
          log(`Đối soát cổng: ${repo}#${pr} đã ${tthai} ngoài cổng — ghi sổ cho run ${runId}`);
        } catch (e) {
          loi++;
          log(`Đối soát cổng: run ${runId} lỗi khi ghi — bỏ qua run này, các run khác vẫn chạy: ${moTaLoi(e)}`);
        }
      }
    } catch (e) {
      loi++;
      log(`Đối soát cổng: ${repo}#${pr} lỗi ngoài dự tính — bỏ qua PR này, các PR khác vẫn chạy: ${moTaLoi(e)}`);
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
