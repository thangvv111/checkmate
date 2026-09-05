/**
 * Quyết định thuần của các hành động phá huỷ trên thư viện probe (capability `probe-quarantine`).
 *
 * Vì sao tách khỏi `server.ts`: file đó có side effect nặng (mở cơ sở dữ liệu, dựng `express()`), nên một
 * ca chỉ muốn kiểm «gõ sai tên repo thì không xoá» mà phải khởi động cả máy chủ thì nó không còn là ca của
 * một hàm thuần nữa. Cùng khuôn với `evaluateSessionGate` (`session-gate.ts`) và `evaluateMergeLocal`
 * (`merge-gate`).
 *
 * Và có một lý do thứ hai, đo được: bản đầu của lưới kiểm cửa này bằng cách quét chuỗi
 * `xacNhan !== g.repo` trong source. Đột biến `if (false && xacNhan !== g.repo)` **vẫn khớp chuỗi ấy** —
 * ca xanh, cửa đã hỏng. Một quyết định gọi được từ test thì không có chỗ cho kiểu trượt đó.
 */

export type PurgeDecision = { ok: true } | { ok: false; status: 400; loi: string };

/**
 * Xoá TOÀN BỘ thư viện probe của một repo — đường một chiều nhất của sản phẩm này.
 *
 * Xác nhận bằng cách **gõ lại đúng tên repo**, không phải một hộp «có/không». Một hộp có/không cạnh một
 * nút bấm nhầm không phải một quyết định — nó là một cú bấm thứ hai. Thư viện là tài sản tích luỹ qua
 * nhiều tháng chấm và không dựng lại được.
 *
 * So khớp CHÍNH XÁC sau khi cắt khoảng trắng hai đầu: không bỏ qua hoa thường, không so một phần. Người
 * gõ đúng tên repo là người đã đọc tên repo; nới phép so ở đây là bỏ đúng cái mà bước này tồn tại để có.
 */
export function evaluatePurgeRequest(input: { xacNhan: unknown; repo: string }): PurgeDecision {
  const repo = typeof input.repo === 'string' ? input.repo.trim() : '';
  // Repo rỗng thì không có gì để xác nhận — và cho qua ở đây nghĩa là một chuỗi rỗng cũng xoá được.
  if (!repo) return { ok: false, status: 400, loi: 'Chưa kết nối repo nào — không có thư viện để xoá.' };
  const go = typeof input.xacNhan === 'string' ? input.xacNhan.trim() : '';
  if (go !== repo) return { ok: false, status: 400, loi: `Chưa xoá gì. Để xác nhận, gõ đúng tên repo: ${repo}` };
  return { ok: true };
}
