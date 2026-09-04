import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cửa webhook GitHub — `github-webhook`.
 *
 * Đây là CỬA VÀO KHÔNG XÁC THỰC NGƯỜI DÙNG đầu tiên của sản phẩm: nó nằm trong `OPEN_PATHS`, và sau khi
 * bỏ Basic Auth ở nginx (nợ #4) thì `OPEN_PATHS` là hàng rào DUY NHẤT giữa Internet và ứng dụng.
 *
 * Nên mọi quyết định ở file này suy ra từ một bất đối xứng (security S7.3):
 *
 *     tu choi oan  ->  polling nhat lai pull request ay o chu ky sau  ->  mat nhieu nhat 3 phut
 *     cho qua oan  ->  mot tac nhan ngoai chay duoc code tren may chu
 *
 * Mọi lúc phân vân, nghiêng về TỪ CHỐI. Và chính vì thế polling phải giữ — nó là thứ làm cho «từ chối
 * oan» rẻ.
 */

/** Tiền tố GitHub dùng cho chữ ký HMAC-SHA256. */
const SIGNATURE_PREFIX = 'sha256=';

/** Hành động của sự kiện `pull_request` mở ra một commit cần chấm. */
const ACTIONS_TO_SCORE = new Set(['opened', 'synchronize', 'reopened']);

/** Vì sao một webhook bị từ chối — dùng cho LOG máy chủ, KHÔNG cho phản hồi (D4). */
export type WebhookRejectReason =
  | 'chua_cau_hinh_bi_mat'
  | 'thieu_chu_ky'
  | 'chu_ky_sai_dinh_dang'
  | 'chu_ky_sai_do_dai'
  | 'chu_ky_khong_khop';

export type WebhookAuthResult = { ok: true } | { ok: false; ly_do: WebhookRejectReason };

/**
 * Xác thực chữ ký HMAC-SHA256 — HÀM THUẦN.
 *
 * `raw` phải là ĐÚNG chuỗi byte đã nhận. Tính trên bản đã `JSON.parse` rồi dựng lại thì không bao giờ
 * khớp — thứ tự khoá, khoảng trắng, cách thoát unicode đều đổi được — và người dựng sẽ bị cám dỗ nới phép
 * kiểm cho nó khớp, tức mở đúng cái cửa mình vừa dựng để đóng.
 *
 * Bí mật rỗng ⇒ TỪ CHỐI, không phải bỏ qua xác thực: một máy chủ chưa cấu hình xong mà nhận webhook nghĩa
 * là ai cũng chạy được lượt chấm trên nó (⛔C2).
 */
export function verifyWebhookSignature(raw: Buffer | string, chuKy: unknown, biMat: string | undefined): WebhookAuthResult {
  if (typeof biMat !== 'string' || biMat.trim().length === 0) return { ok: false, ly_do: 'chua_cau_hinh_bi_mat' };
  if (typeof chuKy !== 'string' || chuKy.length === 0) return { ok: false, ly_do: 'thieu_chu_ky' };
  if (!chuKy.startsWith(SIGNATURE_PREFIX)) return { ok: false, ly_do: 'chu_ky_sai_dinh_dang' };

  const hex = chuKy.slice(SIGNATURE_PREFIX.length);
  if (!/^[0-9a-f]+$/i.test(hex)) return { ok: false, ly_do: 'chu_ky_sai_dinh_dang' };

  const mong = createHmac('sha256', biMat).update(raw).digest();
  let nhan: Buffer;
  try {
    nhan = Buffer.from(hex, 'hex');
  } catch {
    return { ok: false, ly_do: 'chu_ky_sai_dinh_dang' };
  }
  // Kiểm độ dài TRƯỚC: `timingSafeEqual` NÉM khi hai bên khác độ dài, nên không kiểm là cả cửa đổ vì một
  // chuỗi ngắn — và đổ ở đây là 500, tức nói cho người gửi biết họ vừa chạm đúng chỗ.
  if (nhan.length !== mong.length) return { ok: false, ly_do: 'chu_ky_sai_do_dai' };
  // So sánh THỜI GIAN KHÔNG ĐỔI: so chuỗi thường dừng ở byte đầu tiên khác nhau, nên thời gian trả lời rò
  // ra bao nhiêu byte đầu đã đúng. Với một cửa nhận được số lần thử tuỳ ý từ Internet, đó là đường dò
  // từng byte một.
  return timingSafeEqual(nhan, mong) ? { ok: true } : { ok: false, ly_do: 'chu_ky_khong_khop' };
}

/** Điều engine phải làm với một payload đã qua xác thực chữ ký. */
export type WebhookAction =
  | { lam: 'cham'; repo: string; so: number; headSha: string }
  | { lam: 'bo_qua'; ly_do: string }
  | { lam: 'tu_choi'; ly_do: string };

/**
 * Payload này có đáng khởi một lượt chấm không — HÀM THUẦN.
 *
 * `repoDaKhai` là danh sách repo người vận hành đã khai trong cấu hình. Đây là GÁC THỨ HAI, độc lập với
 * chữ ký, và nó tồn tại vì chữ ký chỉ chứng minh «người gửi biết bí mật», KHÔNG chứng minh «việc này nên
 * làm»: một webhook hợp lệ trỏ repo lạ khiến CheckMate clone và chạy test của repo chưa ai khai — tức
 * chạy code lạ trên máy chủ (security S4.2).
 *
 * Phân biệt `bo_qua` với `tu_choi` có chủ đích: sự kiện GitHub gửi mà ta không quan tâm là chuyện BÌNH
 * THƯỜNG, trả lỗi cho nó sẽ làm GitHub thử lại rồi tắt webhook. Còn repo lạ là chuyện phải từ chối.
 */
export function decideWebhookAction(
  suKien: unknown,
  than: unknown,
  repoDaKhai: readonly string[],
): WebhookAction {
  if (suKien !== 'pull_request') return { lam: 'bo_qua', ly_do: `sự kiện không dùng: ${String(suKien).slice(0, 40)}` };

  const p = (than ?? {}) as {
    action?: unknown;
    number?: unknown;
    repository?: { full_name?: unknown };
    pull_request?: { head?: { sha?: unknown }; number?: unknown };
  };

  if (typeof p.action !== 'string' || !ACTIONS_TO_SCORE.has(p.action)) {
    return { lam: 'bo_qua', ly_do: `hành động không cần chấm: ${String(p.action).slice(0, 40)}` };
  }

  // Payload là dữ liệu ngoài hạng KHÔNG TIN CẬY CAO NHẤT (⛔C4): mọi trường phải kiểm hình dạng trước khi
  // dùng, và không trường nào đi thẳng vào một lệnh.
  const repo = typeof p.repository?.full_name === 'string' ? p.repository.full_name.trim() : '';
  if (!repo) return { lam: 'tu_choi', ly_do: 'payload thiếu repository.full_name' };

  const khop = repoDaKhai.find((r) => r.toLowerCase() === repo.toLowerCase());
  if (!khop) return { lam: 'tu_choi', ly_do: `repo không có trong cấu hình: ${repo.slice(0, 80)}` };

  const soTho = typeof p.number === 'number' ? p.number : p.pull_request?.number;
  const so = typeof soTho === 'number' && Number.isInteger(soTho) && soTho > 0 ? soTho : 0;
  if (!so) return { lam: 'tu_choi', ly_do: 'payload thiếu số pull request hợp lệ' };

  const shaTho = p.pull_request?.head?.sha;
  const headSha = typeof shaTho === 'string' && /^[0-9a-f]{7,64}$/i.test(shaTho) ? shaTho : '';
  if (!headSha) return { lam: 'tu_choi', ly_do: 'payload thiếu head sha hợp lệ' };

  return { lam: 'cham', repo: khop, so, headSha };
}
