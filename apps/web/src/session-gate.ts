/**
 * Hai quyết định thuần của lớp phiên (capability `identity-session`).
 *
 * Vì sao **không** để chúng trong `server.ts`: file đó có side effect nặng — mở cơ sở dữ liệu, dựng
 * `express()`, gắn route. Một ca test chỉ muốn kiểm ba chữ trong chuỗi cookie mà phải khởi động cả máy chủ
 * thì nó không còn là ca của hàm thuần nữa; đo lúc apply, hai ca đầu tiên chạm trần 5 giây rồi đỏ. Tách ra
 * đây thì mỗi nhánh từ chối là một ca chạy trong vài mili giây, đúng khuôn `evaluateMergeLocal`
 * (`merge-gate`) và `evaluateStartRun` (`concurrent-runs`).
 */

/**
 * Đường KHÔNG cần phiên. Danh sách CHO PHÉP: route mới mặc định phải đăng nhập, không phải nhớ bổ sung.
 *
 * Export để lưới khoá được NỘI DUNG của nó: thêm một đường vào đây là mở một cửa vào hệ thống, nên việc đó
 * phải làm một ca test đỏ chứ không lặng lẽ đi qua review.
 */
/**
 * Đường KHÔNG cần phiên.
 *
 * Nới danh sách này là mở một cửa vào hệ thống, và **từ change `login-gate-replaces-basic-auth` thì đây
 * là HÀNG RÀO DUY NHẤT** giữa Internet và ứng dụng — Basic Auth ở nginx đã gỡ, không còn lớp nào phía
 * ngoài. Ba đường đầu không gây tác dụng phụ nào: `/login` là cửa vào, `/logout` xoá phiên của chính
 * người gọi, `/health` chỉ đọc.
 *
 * ⛔ `/login` không tác dụng phụ nhưng **có chi phí**: mỗi lượt POST tốn một lần scrypt N=16384 của máy
 * chủ. Nên nó có rào riêng (`login-throttle`), và rào ấy phải đứng TRƯỚC phép băm. Ba đường còn lại đứng
 * được **không phải vì có gác**, mà vì chúng không tốn gì đáng kể — đó là một LẬP LUẬN, không phải một
 * cơ chế. Ai thêm đường thứ tư vào đây phải chứng minh lại đúng điều đó cho đường của mình.
 *
 * `/api/webhook/github` là đường ĐẦU TIÊN vừa không cần phiên vừa GÂY TÁC DỤNG PHỤ (khởi lượt chấm,
 * tiêu token, chiếm trần). Nó đứng được ở đây vì có hai gác riêng, độc lập với nhau: chữ ký HMAC trên
 * raw body, VÀ repo phải nằm trong danh sách người vận hành đã khai (`github-webhook` S4.2).
 */
export const OPEN_PATHS: ReadonlySet<string> = new Set(['/login', '/logout', '/health', '/api/webhook/github']);

export type SessionGateDecision =
  | { pass: true }
  | { pass: false; as: 'json'; status: 401; body: { loi: string; can_dang_nhap: true } }
  | { pass: false; as: 'redirect'; status: 303; to: string };

/**
 * R11.2 — không có phiên hợp lệ thì chặn. Gác này KHÔNG tựa vào bất kỳ lớp nào bên ngoài ứng dụng.
 *
 * Lớp ngoài (Basic Auth ở proxy) trả lời «có ai đó được vào», không trả lời «ai» — nó không phân vai,
 * không ghi sổ, không hết hạn, và đã phải bị đục thủng cho webhook GitHub. Nó **đã được gỡ**
 * (`login-gate-replaces-basic-auth`), nên gác này nay là lớp DUY NHẤT.
 *
 * Điều đó không đổi hành vi của gác — nó đổi **hậu quả của một lỗi trong gác**: trước, một lỗ ở đây còn
 * một lớp nữa che; nay một lỗ ở đây là một lỗ ra thẳng Internet.
 *
 * Hình dạng từ chối khác nhau theo bề mặt là có chủ đích: client gọi API mà nhận HTML thì lỗi biến thành
 * «JSON hỏng», tức lại một ca báo sai bản chất.
 */
export function evaluateSessionGate(input: {
  path: string;
  hasSession: boolean;
  method?: string;
  originalUrl?: string;
}): SessionGateDecision {
  if (OPEN_PATHS.has(input.path)) return { pass: true };
  if (input.hasSession) return { pass: true };
  if (input.path.startsWith('/api/')) {
    return {
      pass: false,
      as: 'json',
      status: 401,
      body: { loi: 'Chưa đăng nhập hoặc phiên đã hết hạn.', can_dang_nhap: true },
    };
  }
  const url = input.originalUrl ?? '/';
  const tiep = input.method === 'GET' && url !== '/' ? `?tiep=${encodeURIComponent(url)}` : '';
  return { pass: false, as: 'redirect', status: 303, to: `/login${tiep}` };
}

/**
 * R11.14 — `HttpOnly` + `SameSite` luôn; `Secure` khi đi qua HTTPS (nginx báo bằng `x-forwarded-proto`).
 *
 * Ba cờ chặn ba đường khác nhau và không thay thế nhau: thiếu `HttpOnly` thì một lỗ XSS đọc được token
 * phiên; thiếu `SameSite` thì một trang khác bấm được cổng merge thay người dùng; thiếu `Secure` trên
 * HTTPS thì token đi cả qua kênh không mã hoá.
 *
 * Nhận **giá trị header** thay vì cả `express.Request`: hàm này chỉ ghép chuỗi, kéo kiểu Express vào chữ
 * ký của nó là buộc mọi ca test phải dựng một request giả để kiểm ba chữ.
 *
 * Header `x-forwarded-proto` là dữ liệu không tin được, và nó chỉ quyết một việc: THÊM cờ `Secure`. Giả
 * mạo theo hướng «https» làm cookie chặt hơn; theo hướng «http» làm mất `Secure` — nhưng khi ấy request
 * đã đi qua kênh không mã hoá rồi, nên header không tạo ra rủi ro mới.
 */
export function buildSessionCookie(
  forwardedProto: unknown,
  cookieName: string,
  token: string,
  hetHan: Date,
): string {
  // Nhiều lớp proxy thì header thành «https, http» — lấy nhầm giá trị cuối là mất `Secure` trên đúng
  // những triển khai có nhiều lớp nhất.
  const https = (forwardedProto ?? '').toString().split(',')[0].trim() === 'https';
  return [
    `${cookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    https ? 'Secure' : '',
    `Expires=${hetHan.toUTCString()}`,
  ]
    .filter(Boolean)
    .join('; ');
}
