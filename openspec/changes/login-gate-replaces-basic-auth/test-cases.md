# Test cases — login-gate-replaces-basic-auth

**Bề mặt đếm bằng máy** (chạy trước khi viết ca, không liệt kê bằng trí nhớ — luật lưới tầng 2):

```bash
grep -c "app.post('/login'" apps/web/src/server.ts                    # 1  duy nhat mot cua nop mat khau
grep -rn "verifyPassword" apps/web/src/ | grep -v identity.ts | wc -l # 2  (1 dong import + 1 loi goi)
grep -rn "x-forwarded-for" apps/web/src/*.ts                          # 0  chua cho nao doc XFF
grep -n "app.listen(" apps/web/src/server.ts                          # 1  '127.0.0.1'
```

Một cửa nộp mật khẩu và một lời gọi `verifyPassword` — nên gác chỉ phải đứng ở **một** chỗ. Con số 0 ở
dòng ba nghĩa là ca T4.2 là ca **phòng ngừa**: nó giữ cho một cách viết sai không bao giờ vào được, chứ
không sửa cái đang sai.

## Unit / hàm thuần

### `clientKey`

- [x] T1.1 [Spec §3 happy] `X-Real-IP` có → khoá lấy từ nó.
- [x] T1.2 [Spec §3 đối kháng] **Hai request cùng `X-Real-IP`, `X-Forwarded-For` khác nhau do client tự
      đặt → CÙNG một khoá.** *(Nếu ca này xanh mà hiện thực vẫn đọc XFF thì ca sai; xem T4.2.)*
- [x] T1.3 Không có `X-Real-IP` → lấy địa chỉ socket.
- [x] T1.4 Không có cả hai → khoá chung cố định, KHÔNG trả rỗng/`undefined` để rồi bỏ qua việc đếm (⛔C2).
- [x] T1.5 [Biên] `X-Real-IP` là mảng (Node gộp header trùng), chuỗi rỗng, có khoảng trắng thừa.

### `evaluateLoginAttempt`

- [x] T2.1 [Happy] Trạng thái sạch → cho qua.
- [x] T2.2 [Spec §2] Sai liên tiếp → thời gian chờ tăng dần: 0, 0, 1s, 2s, 4s, 8s…
- [x] T2.3 [Spec §2 · biên trùng ngưỡng] Đúng `ACCOUNT_FREE_TRIES` lần sai → vẫn cho qua; lần kế → chờ.
- [x] T2.4 [Spec §2] Thời gian chờ không vượt `ACCOUNT_BACKOFF_CAP_MS` dù sai bao nhiêu lần.
- [x] T2.5 [Spec §2 · biên trùng ngưỡng] Đúng `IP_FAIL_CAP` lần sai trong cửa sổ → vẫn cho qua; lần kế → chặn.
- [x] T2.6 [Spec §2] Sai rải ra ngoài `IP_WINDOW_MS` → không cộng dồn thành chặn.
- [x] T2.7 [Spec §2] Gác IP và gác tài khoản **độc lập**: chỉ một cái đỏ cũng đủ từ chối.
- [x] T2.8 [Spec §2] `clearAccount` sau đăng nhập đúng → chuỗi phạt của tên đó về 0, chuỗi IP KHÔNG bị xoá
      *(người thật vừa vào được thì không có lý do xoá án của cả một IP đang bị dò)*.
- [x] T2.9 [Spec §2 đường sai — DoS ngược] Một tên bị người khác gõ sai liên tục → người thật vẫn vào được
      sau khoảng chờ **có trần**, không bị khoá vô thời hạn.

### Trần bảng & phép loại bỏ

- [x] T3.1 [Spec §4] Bơm `THROTTLE_MAX_ENTRIES * 3` tên khác nhau → số mục không vượt trần.
- [x] T3.2 [Spec §4 đường sai] **Mục có chuỗi sai cao KHÔNG bị đẩy ra trước mục rác chuỗi-0.** *(LRU thuần
      sẽ đỏ ở đây — đó là điểm của ca: bơm tên rác để tự xoá án phạt.)*
- [x] T3.3 [Spec §4] Mục đã hết hạn phạt bị loại trước mục còn hạn.
- [x] T3.4 [Đầu vào khuyết] `state` rỗng · `null` · thiếu trường · số âm · `NaN` trong mốc thời gian → không ném.

### `maskAccountKey`

- [x] T3.5 [⛔C3] Tên gốc không xuất hiện trong bản che.
- [x] T3.6 [⛔C3 — bản che PHẢI phân biệt] Hai tên khác nhau → hai bản che khác nhau.
- [x] T3.7 Cùng một tên → cùng một bản che (không thì không đếm được «một tên bị dò 10 nghìn lần»).

## Tích hợp

### `POST /login`

- [x] T4.1 ⛔ **CA LOAD-BEARING NHẤT CỦA CHANGE — thứ tự.** Đang bị chặn → `verifyPassword` được gọi
      **0 lần** (spy đếm). *(Ca «bị chặn» một mình KHÔNG đủ: gác đặt sau phép băm vẫn cho ra «bị chặn»,
      mà lúc đó rào chống được đoán mật khẩu và KHÔNG chống được DoS — tức mất đúng nửa lý do của change.)*
- [x] T4.2 ⛔ **Quét source: `login-throttle.ts` và `server.ts` KHÔNG đọc `x-forwarded-for`.** Cặp fixture
      bắt buộc (lưới tầng 3): mã đọc XFF → ĐỎ · mã đọc `X-Real-IP` → XANH. *(Đọc XFF là lỗi mà mọi ca đơn
      vị vẫn xanh khi mắc phải — rào biến mất còn log vẫn trông như đang chặn.)*
- [x] T4.3 ⛔ **Quét source: `app.listen` gắn `'127.0.0.1'`.** Tiền đề làm `X-Real-IP` tin được. Đổi sang
      `0.0.0.0` là rào mất hiệu lực **không triệu chứng**. Cặp fixture như trên.
- [x] T4.4 Đăng nhập đúng → chuỗi phạt của tài khoản bị xoá, phiên được tạo.
- [x] T4.5 Đăng nhập sai → `recordFailure` chạy cho **cả hai** xô.
- [x] T4.6 [Spec §6] Bị chặn → trang báo «tạm chặn + số giây», KHÔNG báo «sai mật khẩu».
- [x] T4.7 [Spec §6 không thành cửa dò] Thông điệp chặn không nói gác nào chặn, không nói còn mấy lần.
- [x] T4.8 [identity-session MODIFIED] Tên **không tồn tại** bị sai N lần và tên **có thật** bị sai N lần →
      hành vi rào giống hệt nhau *(nếu khác, rào tự thành cửa dò tài khoản mà R11.10 vừa đóng)*.

## Ca đối kháng & hồi quy

- [x] T5.1 [Đầu vào KHUYẾT mọi tầng] Body thiếu `ten` · `mk` · `null` · sai kiểu → không ném, vẫn tính vào rào.
- [x] T5.2 [Đồng hồ] Mốc thời gian nhảy lùi → án phạt KHÔNG hết sớm (fail-open là thứ ⛔C2 cấm).
- [x] T5.3 [Hồi quy] `OPEN_PATHS` vẫn đúng 4 đường sau change — không nới thêm cửa nào.
- [x] T5.4 [Hồi quy] Ca hiện có của `identity-session` và `session-gate` vẫn xanh.

## Trục nhạy cảm

- [x] T_bimat — ⛔ **Trục CHÍNH của change.** Log/sổ của rào không chứa nguyên văn **mật khẩu** lẫn **tên
      tài khoản đã thử** (ô tên là chỗ người ta gõ nhầm mật khẩu vào — ghi nguyên văn là ghi mật khẩu vào
      log). Bản che phân biệt được hai giá trị khác nhau: T3.5–T3.7.
- [x] T_failclosed — không xác định được danh tính client → dùng khoá chung, KHÔNG bỏ đếm (T1.4); đồng hồ
      nhảy không làm án phạt hết sớm (T5.2); `state` hỏng không làm gác cho qua (T3.4).
- [N/A] T_cong — change không chạm cổng merge, không đổi vai, không thêm đường cho máy merge. `/login`
      không phải bề mặt cổng.
- [N/A] T_khongtincay — change không đưa dữ liệu nào vào prompt; không gọi model.
- [x] T_hopdong — `checkmate.yml` khai `login-throttle.ts` **và** từng hàm export (lưới hợp đồng đã bắt hụt
      5 lần vì quên; lần gần nhất `probe-gate.ts` khai hàm mà quên hàng module).

## Mutation — mỗi chiều HAI lượt, kiểm chứng đột biến đã tới đĩa

- [x] T6.1 Đảo thứ tự (gọi `verifyPassword` trước gác) → T4.1 ĐỎ.
- [x] T6.2 Đọc `x-forwarded-for` thay `x-real-ip` → T1.2 và T4.2 ĐỎ.
- [x] T6.3 Bỏ trần bảng → T3.1 ĐỎ.
- [x] T6.4 Đổi phép loại bỏ thành LRU thuần → T3.2 ĐỎ.
- [x] T6.5 Ghi tên nguyên văn thay bản che → T3.5 ĐỎ.
- [x] T6.6 Che thành hằng (mọi tên ra cùng một chuỗi) → T3.6 ĐỎ.
- [x] T6.7 Bỏ qua gác bằng cách gọi thẳng `verifyPassword` ở handler TRƯỚC `runLoginAttempt` → T7.1 ĐỎ.
      *(Đường vòng mà T4.1 một mình KHÔNG đóng: thứ tự bên trong `runLoginAttempt` vẫn đúng, rào vẫn mất
      tác dụng.)*
- [x] T6.8 Đột biến sống sót → bảng ba đường. **Không đột biến nào sống sót**: 7 đột biến × 2 lượt, giết
      1 / 2 / 3 / 1 / 1 / 2 / 1 ca, hai lượt trùng khớp, mỗi lượt `grep -c` xác nhận đã tới đĩa.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [ ] T7.1 **Trên prod, TRƯỚC khi gỡ nginx:** gõ sai quá ngưỡng qua HTTPS thật → bị từ chối, **và thời gian
      trả lời sụt hẳn**. Sụt là bằng chứng scrypt không chạy, tức gác đứng đúng chỗ — thứ ca test đơn vị
      không chứng minh được trên máy thật.
- [ ] T7.2 **Trên prod:** hết hạn phạt → đăng nhập đúng vào được.
- [ ] T7.3 **Sau khi gỡ nginx:** `curl` không `-u` tới `/` ra **trang đăng nhập** (không phải 401, không
      phải nội dung ứng dụng); `/api/*` không phiên ra JSON 401; webhook vẫn nhận.
- [ ] T7.4 **Sau khi gỡ nginx:** chạy lại T7.1 trên bề mặt thật, không còn lớp nào che.
- [ ] T7.5 Mắt người: trang đăng nhập lúc bị chặn đọc có hiểu không — người vận hành phải biết mình cần
      **chờ**, chứ không đi đổi mật khẩu.
