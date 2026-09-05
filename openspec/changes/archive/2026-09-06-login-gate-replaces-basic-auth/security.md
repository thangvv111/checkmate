# Security — login-gate-replaces-basic-auth

Change này **gỡ một lớp bảo vệ**. Nên hồ sơ này không chỉ hỏi «phần thêm vào có an toàn không», mà hỏi
**«phần bị lấy đi đang che gì, và cái thay nó có che đúng chỗ ấy không»**.

## S1. Bí mật & rò rỉ

- ⚠️ **S1.1 — trục chính.** Giá trị nhạy cảm đi qua change: **mật khẩu người dùng gõ** và **tên tài khoản
  đã thử**. Bề mặt: log của rào, thông điệp trên trang đăng nhập, chuỗi query `?cho=<giây>`.
  Tên tài khoản trông vô hại nên dễ bị coi là dữ liệu thường — nhưng **ô tên là chỗ người ta gõ nhầm mật
  khẩu vào**, chuyện xảy ra thật. Ghi tên thử nguyên văn = ghi mật khẩu của chính người vận hành vào file
  log, ở một hệ mà log không có vòng đời và ai vào được máy đều đọc được.
  **Cơ chế:** `maskAccountKey` ở `apps/web/src/login-throttle.ts` (sẽ có ở §4.1 tasks) — `sha256` cắt 8 ký
  tự; điểm ghi duy nhất ở `login-throttle.ts` (khối ghi sổ, D7). Mật khẩu **không** được truyền vào rào —
  rào chỉ nhận `accountKey`, nên nó không có gì để rò.
- ✅ **S1.2** — không có gì của change chảy ra bề mặt công khai. Rào không viết comment PR, không vào thân
  commit merge, không vào verdict. Nó sống trong tiến trình và trong log máy chủ.
- ⚠️ **S1.3 — bản che phải PHÂN BIỆT.** Che thành một hằng (`***`) là hỏng theo hướng ít ai nghĩ tới:
  người vận hành mất khả năng phân biệt **«một tên bị dò 10 nghìn lần»** (dò mật khẩu một tài khoản) với
  **«10 nghìn tên khác nhau bị thử một lần»** (quét danh sách tên) — hai trận tấn công khác nhau, hai
  phản ứng khác nhau. Ca T3.6 khoá điều này; đột biến T6.6 chứng minh ca ấy load-bearing.

## S2. Danh tính, phiên, vai (R11)

- ✅ **S2.1** — rào **không đọc danh tính người dùng**. Nó đọc `accountKey` (chuỗi người ta gõ, chưa xác
  thực) và `clientKey` (nguồn mạng). Danh tính thật vẫn chỉ đến từ `getIdentity`/`identityIfAny`
  (`apps/web/src/identity.ts:171,191`), không thêm đường nào. Rào đứng **trước** khi có danh tính, nên
  không tạo được fallback danh tính.
- ✅ **S2.2** — rào không đọc bảng `nguoi_dung`, không chạm hash/muối. Nó cố ý **không biết** tên nào có
  thật — đó vừa là tính chất an toàn (không tố cáo tài khoản) vừa là ràng buộc thiết kế (nên bảng phải có
  trần, D5).

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ **S3.1** — **KHÔNG.** Change không thêm đường nào cho máy tự merge. Không chạm `gate.ts`,
  `merge-gate`, hay bất kỳ đường `POST /api/gate*` nào.
- ✅ **S3.2** — vai `tu_dong` không có quyền mới; ba mức tự động không bị đụng. Rào áp cho **mọi** người
  gõ `/login`, không phân vai — vì lúc ấy chưa ai có vai.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- N/A **S4.1** — change không đưa dữ liệu nào vào prompt và không gọi model. Nhưng có một mặt của ⛔C4 vẫn
  áp và đã xử: **header HTTP là dữ liệu ngoài**. `X-Real-IP`, `X-Forwarded-For` do bên ngoài gửi tới; cả
  hai được đối xử như dữ liệu, và quyết định «tin cái nào» dựa trên **cấu hình proxy đo được** chứ không
  dựa trên nội dung header (D4).
- N/A **S4.2** — không có trả lời model trong change.

## S5. Sandbox & thực thi (R8)

- N/A **S5.1 / S5.2** — change không chạy code của ai, không tạo worktree, không sinh probe.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ **S6.1** — **không file mới trên đĩa.** Trạng thái rào nằm trong bộ nhớ tiến trình (D2), nên không có
  quyền file để đặt sai và không có gì lọt vào bản sao lưu.
- ✅ **S6.2** — không ghi file ⇒ không cần atomic. Lựa chọn này có lý do an toàn chứ không chỉ vì gọn: ghi
  một hàng SQLite mỗi lần đăng nhập sai biến `/login` thành máy bơm ghi đĩa, tức **rào chống DoS tự mở một
  đường DoS mới** (D2).

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ **S7.1** — liệt kê từng nhánh lỗi mới và nơi nó dẫn tới:

  | nhánh lỗi | dẫn về | fail-closed? |
  |---|---|---|
  | không có `X-Real-IP` | khoá từ socket | ✅ vẫn đếm |
  | không có cả socket | khoá chung cố định | ✅ vẫn đếm, cùng xô còn hơn không |
  | `state` rỗng / hỏng / thiếu trường | coi như chưa có lần sai nào | ⚠️ xem dưới |
  | mốc thời gian nhảy lùi | án phạt giữ nguyên, không hết sớm | ✅ |
  | bảng đầy | loại theo D5, không ngừng đếm | ✅ |

  ⚠ **Một nhánh KHÔNG fail-closed hoàn toàn, khai ra thay vì giấu:** `state` hỏng dẫn về «chưa có lần sai
  nào», tức **cho qua**. Fail-closed đúng nghĩa sẽ là «chặn hết». Không chọn thế, vì `state` là cấu trúc
  trong bộ nhớ của chính tiến trình — nó hỏng nghĩa là code đã hỏng, và lúc ấy «chặn hết» biến một bug
  thành **mất hẳn đường đăng nhập**, kể cả của người vận hành, kể cả khi không có ai tấn công. Đây là đổi
  một rủi ro chắc chắn (tự khoá mình ra ngoài) lấy một rủi ro có điều kiện (kẻ tấn công phải làm hỏng được
  cấu trúc trong bộ nhớ mà không chạm được vào tiến trình). Ghi ra để người sau biết đây là **lựa chọn**,
  không phải sót.
- N/A **S7.2** — không liên quan probe/verdict.

## S8. Leo quyền & cô lập (per-vector — theo CHANGE này)

- ✅ **S8.1 — liệt kê MỌI đường tới cùng mục tiêu «vào được ứng dụng mà không có phiên»**, đo bằng máy chứ
  không nhớ:

  | đường | trước change | sau change | gác gì đứng đó |
  |---|---|---|---|
  | `POST /login` | Basic Auth + không rào | **rào tần suất** | `evaluateLoginAttempt` |
  | `GET /login`, `POST /logout` | Basic Auth | không rào | không tác dụng phụ; `/logout` chỉ xoá phiên người gọi |
  | `GET /health` | Basic Auth | không rào | chỉ trả `{ok:true}` — không dữ liệu |
  | `POST /api/webhook/github` | **đã miễn** Basic Auth | như cũ | HMAC + repo đã khai (`github-webhook`) |
  | mọi đường còn lại | Basic Auth + phiên | **phiên** | `evaluateSessionGate`, allowlist mặc-định-chặn |

  ⛔ **Vá một đường không đóng cả lớp — và ở đây điều đó có thật:** rào chỉ đứng ở `POST /login`. Ba đường
  mở còn lại **không** có rào tần suất. Chúng đứng được vì không tác dụng phụ và không tốn CPU đáng kể —
  nhưng đó là một **lập luận**, không phải một gác, nên nó phải được viết ra để lần sau ai thêm đường vào
  `OPEN_PATHS` biết mình đang phải chứng minh điều gì. Requirement mới ở `identity-session` khai đúng
  ràng buộc ấy («đường mới phải tự đứng được trước Internet»).
- ⚠️ **S8.2 — test LOAD-BEARING HAI CHIỀU**, không dismiss bằng «đã có lớp khác chặn»:

  | gác | code hiện tại | tạm no-op gác đó | ca đỏ |
  |---|---|---|---|
  | thứ tự «gác trước băm» | `verifyPassword` gọi 0 lần | gọi 1 lần | T4.1 (mutation T6.1) |
  | nguồn khoá IP | 2 request = 1 xô | 2 request = 2 xô | T1.2 (mutation T6.2) |
  | trần bảng | ≤ trần | phình vô hạn | T3.1 (mutation T6.3) |
  | phép loại bỏ | mục phạt nặng ở lại | bị đẩy ra | T3.2 (mutation T6.4) |
  | che tên | không thấy tên | thấy tên | T3.5 (mutation T6.5) |

  Mỗi hàng phải **chạy thật hai lượt** và kiểm chứng đột biến đã tới đĩa — «không ca nào đỏ» vì `sed`
  trượt trông y hệt «ca không load-bearing» (án lệ `error-message-egress-gate`).
- ⚠️ **S8.3 — đối xứng.** Change **gỡ** một gác (Basic Auth) cho **mọi** đường, nên đường đối xứng phải soi
  là **tất cả 40+ route**, không riêng `/login`. Cái giữ chúng là `evaluateSessionGate` — allowlist
  mặc-định-chặn, đã có lưới khoá **nội dung** `OPEN_PATHS`. Ca T5.3 giữ cho change này không nới nó.
  Nhưng đối xứng thật sự nằm ở chỗ khác và phải nói thẳng: **trước change, một lỗ trong `evaluateSessionGate`
  còn Basic Auth che; sau change thì không.** Change không làm gác ấy yếu đi — nó làm **hậu quả của một lỗ
  trong gác ấy** nặng lên. Đó là cái giá thật của việc gỡ lớp ngoài, và nó được chấp nhận vì lớp ngoài đã
  có lỗ sẵn (webhook), không phân biệt được người, và không ghi sổ.

## Notes

**Rủi ro lớn nhất của change không nằm trong code mà nằm trong THỨ TỰ TRIỂN KHAI.** Gỡ nginx trước khi rào
lên và chạy thật trên prod thì có một quãng hệ **yếu hơn cả trước lẫn sau**. `tasks.md` tách §7 (deploy rào,
giữ nginx) và §8 (gỡ nginx) thành hai bước rời, và §8.1 là **cổng PO** — gỡ lớp hướng-ra-Internet trên máy
dùng chung với tingpos.vn là quyết định của PO, không phải của agent.

**Điều một hồ sơ kín không nên tự nhận:** ba tầng lưới của repo (mutation · đếm bề mặt bằng máy · cặp
fixture) bắt được lưới sai, không bắt được **luật sai**. Ở change này, «luật sai» sẽ trông như: tham số
D6 chọn nhầm cỡ (chặn oan người thật, hoặc lỏng tới mức dò được), hoặc lập luận S8.1 về ba đường mở không
rào **sai ở một đường nào đó**. Cả hai chỉ lộ ra khi có người **đọc**, hoặc khi prod bị gõ thật.
