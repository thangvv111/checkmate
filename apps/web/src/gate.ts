import { chuanMuc, type Finding, type Verdict } from '../../../packages/shared/src/types.js';
import { appendGateLedger, gateActionsOfPr, prsNeedingReconcile } from './store/ledger-store.js';
import { maskTokenInText } from './github.js';
import { MODE } from './config.js';
import { readMeta } from './store/run-store.js';

/**
 * ĐÃ GỠ: `nguoiThaoTac()` lấy `userInfo().username` — tài khoản HỆ ĐIỀU HÀNH chạy tiến trình. Trên máy
 * chủ đó là `ubuntu`, nên sổ kiểm toán ghi cùng một cái tên cho mọi hành động của mọi người, và một
 * cổng phê duyệt không truy được ai phê duyệt thì không phải cổng.
 *
 * Người thao tác nay lấy từ PHIÊN ĐĂNG NHẬP qua `getIdentity(req)` — cửa duy nhất, R11.1 và R11.4.
 * Không để lại hàm thay thế nào ở đây: có một hàm tiện tay trả về «một cái tên nào đó» là mời chỗ gọi
 * sau này dùng lại đúng cái bệnh vừa chữa (R11.3).
 */

/**
 * So tên người bấm với tác giả PR. Hai định danh đến từ hai hệ khác nhau (tài khoản CheckMate và định
 * danh GitHub) nên KHÔNG khớp được chắc chắn — đây là phép so thô, cố ý bắt sót hơn là bắt oan. Bắt
 * sót thì hai cái tên vẫn nằm cạnh nhau trong sổ cho người đọc tự thấy; bắt oan thì cảnh báo dựng lên
 * ở đúng lúc người ta cần merge gấp, và lần sau không ai đọc cảnh báo nữa.
 */
export function samePerson(nguoiBam: string, tacGiaPr: string): boolean {
  const gon = (x: string) => x.trim().toLowerCase().replace(/[._-]/g, '');
  return gon(nguoiBam) !== '' && gon(nguoiBam) === gon(tacGiaPr);
}

export function countBySeverity(findings: Finding[]): { high: number; medium: number; low: number } {
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
/**
 * Đổi sang chuỗi mà KHÔNG ném — dùng trên đường ghi hàng sổ (R6.25).
 *
 * Cả `${x}` lẫn `String(x)` đều ném được: Symbol trong nội suy chuỗi, và mọi giá trị có `toString`
 * tự ném. Hàm đứng ngay trước `appendGateLedger` mà ném là **mất trọn hàng sổ** của một hành động cổng đã
 * xảy ra thật — lệch ngược hướng an toàn.
 *
 * Trả `ok:false` thay vì một chuỗi thay thế im lặng: bọc `try` rồi nuốt lỗi sẽ cho một mô tả nghèo
 * hơn mà KHÔNG AI BIẾT là đã nghèo đi — đúng khuôn «khai dữ liệu không đọc được thành bằng không»
 * mà R6.27 cấm. Người gọi phải NÓI RA chỗ không đọc được (M17).
 */
export function safeString(x: unknown): { ok: true; giaTri: string } | { ok: false; kieu: string } {
  try {
    return { ok: true, giaTri: String(x) };
  } catch {
    return { ok: false, kieu: x === null ? 'null' : typeof x };
  }
}

export function outsideGateDetail(v: { result?: string; findings?: Finding[] } | null): string {
  // `result` do bên ngoài đưa vào nên đổi chuỗi phải an toàn — tính MỘT LẦN ở đầu, dùng cho cả ba
  // nhánh trả về bên dưới, để không còn nhánh nào nội suy thẳng (M17).
  const cr = safeString((v as { result?: unknown } | null)?.result ?? 'không rõ');
  const ketQua = cr.ok ? cr.giaTri : `KHÔNG ĐỌC ĐƯỢC (kiểu ${cr.kieu})`;
  // Chính THAM SỐ verdict cũng phải kiểm, không chỉ trường `findings` bên trong nó (R6.27). Verdict là
  // chuỗi 'PASS', số 42, hay một MẢNG finding đặt nhầm ở gốc đều rơi mềm vào nhánh «không có finding»
  // và cho ra đúng câu của một lượt chấm sạch — lần thứ ba cùng khuôn, ở cửa thứ ba.
  if (v !== null && v !== undefined && (typeof v !== 'object' || Array.isArray(v))) {
    return [
      '⚠ Hành động xảy ra NGOÀI CheckMate (không qua cổng)',
      `ghi nhận tự động bởi ${MACHINE_ACTOR_NAME} khi đối soát — máy chỉ GHI LẠI, không phải máy thực hiện (R6.18)`,
      'KHÔNG có xác nhận finding nào — không ai tick trước khi merge',
      `verdict KHÔNG ĐỌC ĐƯỢC (kiểu ${Array.isArray(v) ? 'array' : typeof v}) — KHÔNG đếm được finding, đừng đọc thành «không có finding»`,
    ].join(' · ');
  }
  // Danh sách finding CÓ MẶT nhưng KHÔNG ĐỌC ĐƯỢC (chuỗi, số, object) thì phải NÓI RA — rơi mềm về
  // mảng rỗng rồi ghi «0 high · không có cảnh báo» là khai DỮ LIỆU KHÔNG ĐỌC ĐƯỢC THÀNH BẰNG KHÔNG,
  // đúng thứ R6.22 cấm: người đọc sổ sẽ tưởng lượt chấm sạch (vòng chín của cổng bắt).
  if (v?.findings !== undefined && !Array.isArray(v.findings)) {
    return [
      '⚠ Hành động xảy ra NGOÀI CheckMate (không qua cổng)',
      `ghi nhận tự động bởi ${MACHINE_ACTOR_NAME} khi đối soát — máy chỉ GHI LẠI, không phải máy thực hiện (R6.18)`,
      'KHÔNG có xác nhận finding nào — không ai tick trước khi merge',
      `verdict lúc chấm: ${ketQua} · danh sách finding KHÔNG ĐỌC ĐƯỢC (kiểu ${typeof v.findings}) — KHÔNG đếm được, đừng đọc thành «không có finding»`,
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
    .map((f) => {
      // `String()` cũng ném được (toString tự ném). Đổi không được thì mục đó rơi vào `boLoai` và
      // được ĐẾM + NÓI RA bên dưới, chứ không biến mất im lặng (M17 + R6.27).
      const c = safeString((f as { severity?: unknown }).severity ?? '');
      return c.ok ? { ...(f as object), severity: c.giaTri } : null;
    })
    .filter((f) => f !== null) as Finding[]);
  const boLoai = tho.length - ds.length;
  const d = countBySeverity(ds);
  const chuaTick = d.medium + d.low;
  const nghiVe = boLoai
    ? ` · ${boLoai} mục KHÔNG đọc được (không đủ hình dạng một finding) — con số trên chỉ tính phần đọc được, KHÔNG phải toàn bộ`
    : '';
  return [
    '⚠ Hành động xảy ra NGOÀI CheckMate (không qua cổng)',
    `ghi nhận tự động bởi ${MACHINE_ACTOR_NAME} khi đối soát — máy chỉ GHI LẠI, không phải máy thực hiện (R6.18)`,
    'KHÔNG có xác nhận finding nào — không ai tick trước khi merge',
    `verdict lúc chấm: ${ketQua} · ${d.high} high · ${d.medium} medium · ${d.low} low` +
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
export const MACHINE_ACTOR_NAME = 'ci-bot';

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
  return maskTokenInText(van).slice(0, 160);
}

export async function reconcileGate(
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
  const canSoat = prsNeedingReconcile();
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
      const daCo = gateActionsOfPr(repo, pr).map((x) => x.hanh_dong);
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
      if (gateActionsOfPr(repo, pr).some((x) => x.hanh_dong === hd)) {
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
          if (gateActionsOfPr(repo, pr).some((x) => x.hanh_dong === hd)) {
            boQua++;
            continue;
          }
          const r = readMeta(runId);
          const luc = new Date().toISOString();
          const aiLam = tt?.nguoi_merge ? `người thực hiện trên GitHub: ${tt.nguoi_merge}` : 'không rõ ai thực hiện trên GitHub';
          const chiTiet = `${outsideGateDetail(r?.verdict ?? null)} · ${aiLam}`;
          // Cột «người» trả lời câu «AI ĐÃ THỰC HIỆN», không phải «ai đã ghi lại». Hành động này do
          // người trên GitHub thực hiện; máy chỉ CHÉP LẠI. Ghi tên tác nhân máy vào đây là nói sai:
          // ci-bot không merge gì cả, và R6.19 nói máy KHÔNG BAO GIỜ merge — sổ mà ghi ci-bot merge
          // thì tự mâu thuẫn với chính điều khoản ấy.
          // Việc «máy ghi nhận» thể hiện bằng cột `ngoai_cong` + phần mô tả, không chiếm cột này.
          // (Vòng ba của cổng đẩy sang danh tính máy, vòng bốn bác lại — chốt ở đây, ghi vào R6.24.)
          const nguoi = tt?.nguoi_merge ? `${tt.nguoi_merge} (GitHub)` : '(ngoài cổng — không rõ)';
          appendGateLedger({ run_id: runId, luc, hanh_dong: hd, nguoi, tac_gia_pr: tt?.tac_gia, ngoai_cong: true, chi_tiet: chiTiet });
          // Bề mặt tự suy ra từ hàng sổ vừa ghi — không có bước ghi bề mặt nào nữa (R6.26).
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

export function appendGateLedgerEntry(entry: Record<string, unknown>): void {
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
  const tuDuyet = tacGiaPr && typeof entry.nguoi === 'string' && samePerson(entry.nguoi, tacGiaPr);
  const moTaXacNhan = ds.length ? `chấp nhận ${ds.length} cảnh báo medium: ${ds.join(', ')}` : '';
  const ghiChu = typeof entry.ghi_chu === 'string' ? entry.ghi_chu.trim() : '';
  // R6.18 — sổ phải phân biệt «người trả về» với «máy trả về»: hai mức trách nhiệm khác nhau
  const boiMay = entry.tu_dong === true ? 'do TÁC NHÂN MÁY thực hiện tự động' : '';
  appendGateLedger({
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

export function renderReceipt(v: Verdict, nguoi: string, xacNhanMedium: string[]): string {
  const d = countBySeverity(v.findings);
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
export function renderAutoVerdict(v: Verdict): string {
  const d = countBySeverity(v.findings);
  const dsFinding = v.findings.length
    ? v.findings.map(dongFinding).join('\n')
    : '_Không có finding — hành vi khớp spec trên mọi probe đã chạy._';
  return `## ♞ CheckMate — Verdict tự động (chế độ trực)

**${v.result}** · \`${v.artifact_ref.name}\` @ \`${v.artifact_ref.sha_or_hash.slice(0, 10)}\` · ${v.findings.length} finding (${d.high} high · ${d.medium} medium · ${d.low} low) · run \`${v.run_id}\`

${dsFinding}
${(v.quan_sat_ngoai_pr ?? []).length ? `\n**Quan sát ngoài phạm vi PR** (không tính vào verdict — lỗi tồn tại trên cả nhánh gốc, đề nghị mở việc riêng):\n${(v.quan_sat_ngoai_pr ?? []).map((q) => `- ${q.loai === 'nghi_loi_co_san' ? '⚠ nghi LỖI CÓ SẴN' : 'ngoài phạm vi'} · \`${q.probe_id}\` (${q.spec_rule}) — ${q.ten}`).join('\n')}\n` : ''}
_Verdict ghim đúng commit trên — push mới sẽ được chấm lại tự động. Thao tác cổng (Merge / Trả về dev) thực hiện trong CheckMate._`;
}

export function renderRuling(v: Verdict, ghiChu: string, closePr = false): string {
  const d = countBySeverity(v.findings);
  return `## ♞ CheckMate — Trả về dev

**Verdict: ${v.result}** · \`${v.artifact_ref.name}\` @ \`${v.artifact_ref.sha_or_hash.slice(0, 10)}\` · ${v.findings.length} finding (${d.high} high · ${d.medium} medium · ${d.low} low)

${v.findings.map(dongFinding).join('\n')}
${ghiChu ? `\n**Ghi chú của người review:** ${ghiChu}\n` : ''}
Vá theo từng finding rồi push lên chính nhánh này — CheckMate sẽ chấm lại trên commit mới (verdict cũ tự hết hiệu lực).
${closePr ? '\n> ⚠ **PR này đã được đóng.** Nhánh vẫn còn nguyên: vá xong hãy bấm **Reopen** chính PR này (đừng tạo PR mới) để giữ lịch sử review. PR đang đóng sẽ không xuất hiện trong hàng đợi review của CheckMate, và push commit mới KHÔNG tự mở lại PR.\n' : ''}`;
}

// ---------- Quyết định cổng: hàm THUẦN, tách khỏi I/O ----------

/**
 * Bốn hàm dưới đây là quyết định cổng merge, tách khỏi route Express.
 *
 * Vì sao tách: sáu điều lõi của cổng sống trong hai handler trộn quyết định với I/O GitHub và HTTP, nên
 * KHÔNG có test nào gọi được chúng — cổng là chỗ ⛔C1/⛔C2 sống thật mà lại là vùng không được khoá. Tách
 * ra thì mỗi nhánh từ chối là một ca test chạy được, và thông điệp khoá được từng chữ.
 *
 * THỨ TỰ KIỂM LÀ MỘT PHẦN CỦA HỢP ĐỒNG, không phải chi tiết hiện thực:
 *  - mọi kiểm CỤC BỘ đứng trước lời gọi GitHub — không để người thiếu quyền kích được một lời gọi ra
 *    ngoài, và không tốn một lời gọi cho verdict đã FAIL;
 *  - verdict FAIL đứng trước thiếu quyền: người bấm cần biết cổng khoá vì kết quả chấm, không phải vì họ;
 *  - thiếu quyền đứng trước cảnh báo medium: bảo người ta đi tick 3 ô rồi mới nói họ không có quyền là
 *    đùa với người dùng.
 * Đổi thứ tự này là đổi hành vi — lưới `test/merge-gate.test.ts` khoá bằng ca «nhiều điều kiện cùng sai».
 */

/** Kết quả đọc danh tính, đã tính ở route: hàm thuần KHÔNG đọc `req`. */
export type IdentityCheck = { ok: true; ten: string } | { ok: false; status: 401 | 403; message: string };

/** Từ chối của cổng — mã HTTP và thông điệp đi thẳng ra trang lỗi, nên cả hai là hợp đồng. */
export interface GateRefusal {
  ok: false;
  status: number;
  message: string;
}

/** Dữ liệu lượt chấm mà quyết định cổng cần. Nhận hình dạng tối thiểu để test dựng được bằng tay. */
export interface GateRun {
  id: string;
  tieuDe?: string;
  verdict?: Verdict | null;
  pr?: { so: number; headSha: string; tacGia?: string } | null;
}

/** Hàng sổ cổng đã có cho run này (đọc TƯƠI từ sổ, không tin bản trong bộ nhớ). */
export type GateDone = { hanhDong: 'merge' | 'reject'; luc: string } | null | undefined;

function refuse(status: number, message: string): GateRefusal {
  return { ok: false, status, message };
}

/** Danh sách id đã tick từ client — DỮ LIỆU, không phải bằng chứng. Chuỗi lạ/khuyết → danh sách rỗng. */
function tickList(x: unknown): string[] {
  if (Array.isArray(x)) return x.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return String(x ?? '').split(',').filter(Boolean);
}

/** Finding của verdict, chịu được `findings` méo (không phải mảng) — fail-closed, không ném. */
function findingsOf(v: Verdict | null | undefined): Finding[] {
  return Array.isArray(v?.findings) ? (v.findings as Finding[]) : [];
}

/**
 * Kiểm CỤC BỘ trước khi merge — không chạm mạng. Thứ tự: chế độ chỉ-đọc → run/verdict/pr → đã qua cổng
 * → verdict FAIL hoặc còn high → danh tính và vai → cảnh báo medium chưa tick đủ.
 */
export function evaluateMergeLocal(input: {
  mode: string;
  run: GateRun | null | undefined;
  gateDone: GateDone;
  identity: IdentityCheck;
  tickIds: unknown;
}): { ok: true; nguoi: string; mediumIds: string[] } | GateRefusal {
  const { mode, run, gateDone, identity } = input;
  if (mode === 'demo') return refuse(403, 'Chế độ demo không cho thao tác cổng merge (chỉ xem).');
  if (!run || !run.verdict || !run.pr) {
    return refuse(404, 'Run không tồn tại hoặc không gắn PR. <a href="/">← về trang chính</a>');
  }
  if (gateDone) return refuse(409, `Run này đã ${gateDone.hanhDong} lúc ${gateDone.luc}.`);
  const v = run.verdict;
  const d = countBySeverity(findingsOf(v));
  if (d.high > 0 || v.result === 'FAIL') {
    return refuse(403, 'Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.');
  }
  if (!identity.ok) return refuse(identity.status, identity.message);
  // Client gửi DANH SÁCH id đã tick — máy chủ so TẬP với các finding medium THẬT của verdict. Id thừa
  // vô tác dụng; id thiếu mới chặn. Tin danh sách client gửi là mở đường bỏ qua cảnh báo bằng một POST.
  const tickIds = tickList(input.tickIds);
  const mediumIds = findingsOf(v).filter((f) => chuanMuc(f.severity) === 'medium').map((f) => f.id);
  const thieu = mediumIds.filter((id) => !tickIds.includes(id));
  if (thieu.length > 0) {
    return refuse(422, `Phải xác nhận đủ ${d.medium} cảnh báo MEDIUM — còn thiếu: ${thieu.join(', ')}.`);
  }
  return { ok: true, nguoi: identity.ten, mediumIds };
}

/**
 * Đối chiếu với trạng thái THẬT của pull request — chạy SAU khi mọi kiểm cục bộ đã qua.
 * Head đổi còn một lớp nữa ở `mergePr(..., sha)`: GitHub tự từ chối nếu head đổi sau lần kiểm này.
 */
export function evaluateMergeAgainstPr(input: {
  run: GateRun;
  currentPr: { state: string; merged?: boolean; headSha: string };
}): { ok: true } | GateRefusal {
  const { run, currentPr } = input;
  const so = run.pr?.so;
  if (currentPr.state !== 'open') {
    return refuse(409, `PR #${so} không còn mở (${currentPr.merged ? 'đã merge' : currentPr.state}).`);
  }
  if (currentPr.headSha !== run.pr?.headSha) {
    return refuse(
      409,
      `PR đã có commit mới (${currentPr.headSha.slice(0, 7)} ≠ ${String(run.pr?.headSha).slice(0, 7)}) — verdict cũ hết hiệu lực, chạy kiểm lại rồi mới merge. <a href="/">← về trang chính</a>`,
    );
  }
  return { ok: true };
}

/**
 * Kiểm cục bộ trước khi trả về dev. Cùng khuôn thứ tự với merge, thêm gác GHI CHÚ.
 *
 * Ghi chú ép ở MÁY CHỦ chứ không chỉ ở nút: `required` phía trình duyệt chỉ chặn được người bấm nút, một
 * POST thẳng đi qua nó như không có. Mà trả về dev là hành động ĐÓNG PR — một chiều — và nó đi vào sổ
 * chỉ-ghi-thêm: một dòng sổ không nói được vì sao là một dòng sổ vô dụng đúng lúc người ta cần nó nhất.
 */
export function evaluateRejectLocal(input: {
  mode: string;
  run: GateRun | null | undefined;
  gateDone: GateDone;
  identity: IdentityCheck;
  ghiChu: unknown;
}): { ok: true; nguoi: string; ghiChu: string } | GateRefusal {
  const { mode, run, gateDone, identity } = input;
  if (mode === 'demo') return refuse(403, 'Chế độ demo không cho thao tác cổng merge (chỉ xem).');
  if (!run || !run.verdict || !run.pr) return refuse(404, 'Run không tồn tại hoặc không gắn PR.');
  if (gateDone) return refuse(409, `Run này đã ${gateDone.hanhDong} lúc ${gateDone.luc}.`);
  if (!identity.ok) return refuse(identity.status, identity.message);
  const ghiChu = String(input.ghiChu ?? '').trim();
  if (!ghiChu) {
    return refuse(422, 'Trả về dev phải có ghi chú — dev cần biết vá gì. <a href="javascript:history.back()">← quay lại</a>');
  }
  return { ok: true, nguoi: identity.ten, ghiChu };
}

/**
 * Ba việc tự động sau một lượt chấm — BA CÔNG TẮC RIÊNG (R6.15), quyết định thuần trên (cấu hình, verdict).
 *
 * KHÔNG có trường `merge` trong kiểu trả về, và đó là điều khoản chứ không phải thiếu sót: tác nhân máy
 * KHÔNG ĐƯỢC merge trong mọi cấu hình (R6.19, ⛔C1). Tự động hoá được phép nói KHÔNG, không được nói CÓ.
 *
 * `closePr` chỉ bật khi verdict FAIL VÀ có ít nhất một finding mức high (R6.17): chỉ đóng khi có probe
 * chạy thật và đỏ — đóng dựa trên suy đoán là thứ làm người ta tắt cổng.
 * Hàm KHÔNG nhận «lượt do ai khởi động»: đăng verdict chạy cho MỌI lượt có PR, không riêng chế độ trực
 * (R6.16) — người viết code cần đọc finding ở đúng chỗ họ làm việc.
 */
export function decideAutomation(
  truc: { tu_dong_comment?: boolean; tu_dong_trang_thai?: boolean; tu_dong_tra_ve?: boolean } | null | undefined,
  verdict: Verdict | null | undefined,
): { comment: boolean; commitStatus: boolean; closePr: boolean } {
  const d = countBySeverity(findingsOf(verdict));
  return {
    comment: truc?.tu_dong_comment === true,
    commitStatus: truc?.tu_dong_trang_thai === true,
    closePr: truc?.tu_dong_tra_ve === true && verdict?.result === 'FAIL' && d.high > 0,
  };
}
