import { chuanMuc, type Finding, type Severity } from '../../shared/src/types.js';

/**
 * Hợp đồng của VERDICT — bốn quyết định thuần, tách khỏi vòng chấm để khoá được bằng test.
 *
 * Vì sao tách: chín điều định nghĩa verdict đang thi hành mà không có ca test nào (đo 03/09). Nguy hiểm
 * nhất là câu «có hồi quy thì FAIL» KHÔNG được cưỡng chế ở chỗ ai cũng tưởng — `result` chỉ nhìn finding
 * mức `high`. Thứ thật sự giữ luật là hai lưới máy: ép sàn severity cho hồi quy máy-xác-nhận, và tự bù
 * finding khi model im lặng. Bỏ một trong hai thì model gán `medium` cho một hồi quy là verdict ra `PASS`
 * trên PR vừa làm gãy hành vi đang chạy — xanh giả đúng loại sản phẩm này sinh ra để chống.
 */

/** Nhãn máy phong cho một probe. Lấy hình dạng tối thiểu để test dựng được bằng tay. */
export type ProbeStateLabel = string;

/** Ứng viên finding, hình dạng TỐI THIỂU mà quyết định verdict cần. */
export interface MinimalCandidate {
  ma: string;
  trangThai: ProbeStateLabel;
  probe: { id: string; ten?: string; spec_rule?: string; muc_dich?: string };
  br?: { message?: string };
}

/**
 * Hai nhãn máy-xác-nhận là hồi quy: PR làm gãy thứ đang chạy (`hoi_quy`), và PR khai một luật rồi vi
 * phạm ngay chính luật vừa khai (`vi_pham_luat_moi`). Hai chuyện khác nhau, cùng chặn merge (R1.20).
 */
const REGRESSION_STATES = new Set(['hoi_quy', 'vi_pham_luat_moi']);

/** Bốn nhãn nói được điều gì đó về pull request — mẫu số của «đủ cơ sở kết luận». */
const CONCLUSIVE_STATES = new Set(['pass', 'hoi_quy', 'vi_pham_luat_moi', 'cai_thien']);

/**
 * Kết quả của một lượt chấm — NHỊ PHÂN (gốc: R6.1). `FAIL` khi có ít nhất một finding mức `high`
 * (gốc: R6.3); severity lạ hoặc đời cũ đi qua `chuanMuc` nên fail-closed về `high` chứ không rơi về
 * mức thấp. Danh sách méo (không phải mảng) KHÔNG được thành `PASS`: không đọc được finding thì không
 * chứng minh được gì.
 */
export function decideResult(findings: unknown): 'PASS' | 'FAIL' {
  if (!Array.isArray(findings)) return 'FAIL';
  return (findings as Finding[]).some((f) => chuanMuc(f?.severity as string) === 'high') ? 'FAIL' : 'PASS';
}

/**
 * SÀN CỨNG cho hồi quy (gốc: R1.12) — model gán mức nào cũng không hạ được dưới `high`.
 *
 * Máy đã xác nhận probe pass ở nhánh gốc và fail ở nhánh PR; đó là bằng chứng chạy thật, không phải
 * ý kiến. Để model hạ mức là để nó quyết verdict bằng một chữ trong JSON.
 *
 * Nhãn KHÔNG phải hồi quy giữ nguyên mức model gán (đã chuẩn hoá) — sàn không lan sang chỗ khác.
 */
export function regressionFloor(trangThai: ProbeStateLabel, sevModel: unknown): Severity {
  const sev = chuanMuc(sevModel as string);
  return REGRESSION_STATES.has(trangThai) ? 'high' : sev;
}

/**
 * Hồi quy máy-xác-nhận mà model KHÔNG viết finding — máy phải tự bù (gốc: R1.12, vế hai).
 *
 * Model im lặng cũng là một cách hạ mức: không có finding thì không có `high`, và verdict ra `PASS`.
 * Trả về danh sách ứng viên cần bù; chỗ gọi dựng `Finding` mức `high` với bằng chứng chạy thật.
 */
export function missingRegressionFindings<T extends MinimalCandidate>(ungVien: readonly T[], maDaCo: unknown): T[] {
  // Generic: hàm chỉ cần hình dạng TỐI THIỂU để lọc, nhưng phải trả đúng kiểu nó nhận — chỗ gọi còn
  // dựng `Finding` với evidence từ ứng viên đầy đủ, và ép kiểu ở đó là mở đường cho một `as` sai sau này.
  const daCo = maDaCo instanceof Set ? maDaCo : new Set(Array.isArray(maDaCo) ? maDaCo : []);
  if (!Array.isArray(ungVien)) return [];
  return ungVien.filter((u) => REGRESSION_STATES.has(u?.trangThai) && !daCo.has(u?.ma));
}

/**
 * ĐỦ CƠ SỞ KẾT LUẬN chưa (gốc: R6.13) — ít nhất một probe nói được điều gì đó về pull request.
 *
 * Lưới chống PASS-rỗng ở tầng trên chỉ hỏi «có probe nào được GHI NHẬN không», mà probe ghi nhận đầy đủ
 * vẫn có thể không chứng minh được gì: `ngoai_pham_vi` là TRẠNG THÁI HÚT — cả bộ probe import sai module
 * đỏ trên cả hai nhánh cùng nguyên nhân, bị dán nhãn đó rồi loại khỏi finding, và verdict ra `PASS` trên
 * một lượt không có lấy một phép thử chạy được.
 *
 * Trả LÝ DO chứ không chỉ trả boolean: thông điệp lỗi phải nói người đọc biết vì sao lượt chấm không kết
 * luận được, và lời đó phải khoá được bằng test thay vì dựng lại ở chỗ gọi.
 */
export function hasBasis(ungVien: readonly MinimalCandidate[]): { ok: true } | { ok: false; lyDo: string; soProbe: number } {
  const ds = Array.isArray(ungVien) ? ungVien : [];
  if (ds.some((u) => CONCLUSIVE_STATES.has(u?.trangThai))) return { ok: true };
  const lyDo = ds
    .slice(0, 3)
    .map((u) => `${u?.probe?.id} (${u?.trangThai}): ${String(u?.br?.message ?? '').split('\n')[0]!.slice(0, 200)}`)
    .join('\n');
  return { ok: false, lyDo, soProbe: ds.length };
}
