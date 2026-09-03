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
export const OPEN_PATHS: ReadonlySet<string> = new Set(['/login', '/logout', '/health']);

export type SessionGateDecision =
  | { pass: true }
  | { pass: false; as: 'json'; status: 401; body: { loi: string; can_dang_nhap: true } }
  | { pass: false; as: 'redirect'; status: 303; to: string };

/**
 * R11.2 — không có phiên hợp lệ thì chặn, KỂ CẢ khi lớp xác thực bên ngoài đã cho qua.
 *
 * Lớp ngoài (Basic Auth ở proxy) trả lời «có ai đó được vào», không trả lời «ai». Khi lớp ấy được gỡ
 * (nợ có tên #4) thì gác này thành lớp DUY NHẤT — nên nó phải gọi được từ test TRƯỚC khi việc đó xảy ra.
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
