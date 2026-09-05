## Why

CheckMate trên prod đang được che bởi **HTTP Basic Auth ở nginx**. Lớp ấy trả lời «có ai đó được vào»
chứ không trả lời «ai» — nó không phân vai, không ghi sổ, không hết hạn, và mật khẩu của nó nằm trong
một file hash apr1 mà mọi người dùng chung. Nó cũng chặn đúng thứ không nên chặn: GitHub không gửi được
Basic Auth, nên webhook đã phải đục một lỗ xuyên qua nó.

Lớp trong **đã được viết để không tựa vào lớp ngoài** — `evaluateSessionGate` là allowlist mặc-định-chặn,
`OPEN_PATHS` đúng bốn đường, cookie HttpOnly + SameSite + Secure, scrypt N=16384, `timingSafeEqual`, băm
giả khi tài khoản không tồn tại, cùng một câu cho «sai tên» lẫn «sai mật khẩu». Comment R11.2 nói thẳng
điều đó.

Thiếu **đúng một thứ**: không có rào chống dò mật khẩu nào. `grep` toàn `apps/web/src/` ra **0** chỗ đếm
tần suất. Và chỗ ấy sắc hơn vẻ ngoài của nó: scrypt N=16384 **cố ý chậm**, nên mỗi lần gõ `/login` tiêu
CPU của chính máy chủ — vòng lặp dò mật khẩu vừa là tấn công đoán mật khẩu vừa là **đòn DoS rẻ**, trên một
Lightsail **dùng chung máy với tingpos.vn**.

Vì thế ba việc đi **một chuyến, đúng thứ tự**. Làm lẻ theo thứ tự sai thì có một quãng thời gian hệ **yếu
hơn cả trước lẫn sau**: lớp ngoài đã gỡ mà rào trong chưa có.

## What Changes

**(a) Rào `/login` — làm TRƯỚC, hai gác độc lập:**

- **Đếm theo IP** — quá N lần sai trong cửa sổ W thì từ chối IP đó trong D.
- **Lùi dần theo tài khoản** — mỗi lần sai liên tiếp của cùng một tên tài khoản thì lần thử kế tiếp phải
  chờ lâu hơn, tăng theo cấp số nhân tới trần.

Hai gác vì mỗi cái bịt lỗ hổng của cái kia: đếm-theo-IP một mình bị nguồn phân tán đi vòng; khoá-theo-tài-khoản
một mình là **cửa DoS ngược** — kẻ tấn công khoá được người vận hành ra ngoài. **Lùi dần** thay vì **khoá**
là cách chặn dò mà vẫn để người thật vào được sau vài giây, tức thiệt hại có trần.

⛔ **Gác phải chặn TRƯỚC `verifyPassword`.** Đặt sau thì scrypt vẫn chạy, tức rào chống được đoán mật khẩu
mà **không chống được DoS** — mà DoS mới là nửa nguy hiểm hơn ở đây. Đây là ràng buộc THỨ TỰ, và `tsc`
không bắt được nó.

⛔ **Danh tính client lấy từ `X-Real-IP`, KHÔNG từ `X-Forwarded-For`.** Đo được ở nginx prod: `X-Real-IP
$remote_addr` là **ghi đè** (nginx đặt, client không chèn được), còn `X-Forwarded-For
$proxy_add_x_forwarded_for` là **nối thêm** vào giá trị client gửi. Lấy phần tử đầu của XFF thì kẻ tấn công
chỉ cần đổi header mỗi request là mỗi request thành một IP khác — rào biến mất mà vẫn trông như đang chạy.
App bind `127.0.0.1` (đo: `ss -tlnp` trên prod) nên nginx là đường vào duy nhất, đó là điều làm `X-Real-IP`
tin được; nếu bind đổi thì tiền đề này đổ, nên nó phải nằm trong spec chứ không phải trong đầu người viết.

**(b) Bỏ `auth_basic` ở nginx** — cùng lúc gỡ hai dòng `auth_basic off` đã thành thừa (miễn trừ của một
lớp không còn tồn tại thì đọc lên gây hiểu nhầm là còn).

**(c) VIẾT LẠI — không xoá — câu biện minh trong `DEPLOY.md`.** Dòng «`CHECKMATE_MODE=org` … đã an toàn
nhờ lớp Basic Auth nginx bên dưới» là chỗ người sau đọc để hiểu **vì sao `MODE=org` được phép mở**. Xoá nó
đi là để lại một quyết định không có lý do; phải thay bằng lập luận mới đứng trên lớp trong.

## Capabilities

### New Capabilities
- `login-throttle`: rào chống dò mật khẩu ở `/login` — đếm theo IP, lùi dần theo tài khoản, thứ tự
  «từ chối trước khi băm», cách lấy danh tính client, và cách ghi sổ mà không rò thứ người ta gõ vào.

### Modified Capabilities
- `identity-session`: `/login` nay có thể từ chối vì **tần suất** chứ không chỉ vì **sai mật khẩu** — một
  trạng thái trả lời mới ở cửa vào, và một ràng buộc thứ tự lên đường xử lý POST.

## Luật chạm tới

- **Luật chạm tới:**
  - `login-throttle › <mọi requirement>` — capability MỚI, toàn bộ là ADDED.
  - `identity-session › Requirement: Đăng nhập` — MODIFIED: thêm trạng thái từ chối theo tần suất và
    ràng buộc «gác đứng trước `verifyPassword`».
  - **⛔C3** — sổ và log của rào KHÔNG được vọng nguyên văn thứ người dùng gõ. Đặc biệt là **ô tên tài
    khoản**: người ta gõ nhầm mật khẩu vào ô tên là chuyện xảy ra thật, nên ghi tên thử nguyên văn là ghi
    mật khẩu vào log. Che thì bản che phải **phân biệt được hai giá trị khác nhau** — không được che thành
    một hằng, vì như thế người vận hành mất luôn khả năng thấy «một tên bị dò 10 nghìn lần» khác
    «10 nghìn tên khác nhau bị thử một lần».
  - **⛔C2** — rào lỗi (hết bộ nhớ, đồng hồ nhảy) không được thành «cho qua».
  - **⛔C5** — thêm module mới thì khai vào bảng module của `checkmate.yml`.

## Impact

- `apps/web/src/login-throttle.ts` — **mới**: quyết định thuần, không side effect, không đụng `express`
  (cùng khuôn `session-gate.ts` / `probe-gate.ts` — tách để ca test chạy mili-giây thay vì dựng máy chủ).
- `apps/web/src/server.ts` — handler `POST /login`: gọi gác **trước** `verifyPassword`; ghi nhận thất bại
  sau khi biết kết quả; xoá trạng thái khi đăng nhập thành công.
- `apps/web/src/ui-login.ts` — thêm trạng thái hiển thị «thử lại sau …».
- `apps/web/src/session-gate.ts` — cập nhật comment R11.2 và chú thích `OPEN_PATHS`: sau change này lớp
  trong **là** lớp duy nhất, không còn là «lớp thứ hai».
- `checkmate.yml` — hàng module cho file mới (⛔C5).
- `DEPLOY.md` — mục Kiến trúc (viết lại biện minh) + hướng dẫn gỡ `auth_basic` và **kiểm sau khi gỡ**.
- nginx trên prod: `/etc/nginx/sites-available/checkmate`.
