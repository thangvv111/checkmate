# Tasks — login-gate-replaces-basic-auth

⛔ **Thứ tự ba việc là một phần của thiết kế, không phải gợi ý.** Rào lên (§1–§6) → merge → **deploy + kiểm
rào chạy thật trên prod** (§7) → mới gỡ nginx (§8). Làm ngược thì có một quãng hệ **yếu hơn cả trước lẫn
sau**: lớp ngoài đã gỡ mà rào trong chưa chứng minh được là đang chạy.

## 1. Luật (capability)

- [x] 1.1 `login-throttle` — capability MỚI, 6 requirement ADDED. Test khoá: `test/login-throttle.test.ts`.
- [x] 1.2 `identity-session` — 2 requirement MODIFIED (lớp trong thành lớp DUY NHẤT · từ chối theo tần suất
      là trạng thái riêng và được phép nói ra). Test khoá: bổ sung vào `test/identity-session.test.ts`.
- [x] 1.3 Không viết luật vào `docs/archive/r-rules/`. Mã R mới trích ở đâu thì phải có hàng ở
      `docs/r-rules-map.md` (lưới `r-rules-map` bắt).

## 2. Kiểu & hợp đồng

- [x] 2.1 Không thêm kiểu vào `packages/shared/src/types.ts` — rào không đi qua ranh giới engine↔web.
      Kiểu `LoginThrottleDecision` sống cạnh hàm ở `apps/web/src/login-throttle.ts`.
- [x] 2.2 ⛔C5 — khai `apps/web/src/login-throttle.ts` vào **bảng module** của `checkmate.yml` **và** khai
      từng hàm export. Lưới `test/hop-dong-repo.test.ts` đã bắt hụt 5 lần vì quên; lần gần nhất là
      `probe-gate.ts` (khai hàm, quên hàng module) và nó chỉ lộ ra SAU khi commit.

## 3. Engine (packages/harness)

- [x] 3.1 **Không chạm.** Rào nằm trọn ở tầng web; engine không biết `/login` tồn tại.

## 4. Web (apps/web)

- [x] 4.1 `login-throttle.ts` — **mới**. Hàm thuần, không side effect, không `Date.now()` gọi thẳng, không
      biến module toàn cục (D1):
      - `clientKey(headers, socketAddr)` — `X-Real-IP` → địa chỉ socket → khoá chung. ⛔ **Không** đọc
        `X-Forwarded-For` (D4).
      - `evaluateLoginAttempt({ ipKey, accountKey, state, now })` → cho qua / từ chối kèm số giây chờ.
      - `recordFailure` · `clearAccount` — đổi trạng thái, trả trạng thái mới.
      - `maskAccountKey(ten)` — `sha256` cắt 8 ký tự (D7 · ⛔C3).
      - Trần bảng + phép loại bỏ theo thứ tự «hết hạn trước, chuỗi sai thấp nhất sau» (D5).
- [x] 4.2 `server.ts` — `POST /login`: gọi gác **TRƯỚC** `verifyPassword`; `clearAccount` khi đúng;
      `recordFailure` khi sai. ⛔ Thứ tự này là luật, không phải phong cách (spec §1).
- [x] 4.3 `server.ts` — trạng thái rào khởi tạo một lần lúc dựng app, truyền vào handler.
- [x] 4.4 `ui-login.ts` — trạng thái hiển thị `bi_chan_tan_suat` kèm số giây chờ. Không nói gác nào đang
      chặn, không nói còn mấy lần nữa.
- [x] 4.5 `session-gate.ts` — cập nhật comment R11.2 và chú thích `OPEN_PATHS`: lớp trong nay là lớp DUY
      NHẤT. Đây là sửa **văn bản đang sai sau change**, không phải trang trí.
- [x] 4.6 Ghi sổ có trần tần suất, tên đã che (D7).

## 5. Test

- [x] 5.1 `test/login-throttle.test.ts` — ca khoá cho từng requirement ở §1.1. Chi tiết ở `test-cases.md`.
- [x] 5.2 ⛔ **Ca khoá THỨ TỰ** — không đủ nếu chỉ kiểm «bị chặn». Phải chứng minh `verifyPassword`
      **không được gọi** khi đang bị chặn (spy đếm lời gọi). Đây là ca duy nhất phân biệt «rào chống đoán
      mật khẩu» với «rào chống DoS», và nó là lý do chính của change.
- [x] 5.3 ⛔ **Ca khoá địa chỉ nghe** — `app.listen(port, '127.0.0.1', …)`. Tiền đề làm `X-Real-IP` tin
      được. Đổi sang `0.0.0.0` là rào mất hiệu lực **không triệu chứng**, nên phải có ca đỏ.
- [x] 5.4 ⛔ **Ca khoá KHÔNG đọc `X-Forwarded-For`** — quét source `login-throttle.ts` + `server.ts`. Đây là
      lỗi mà mọi ca đơn vị vẫn xanh khi mắc phải, nên nó cần một ca nhìn vào chính mã nguồn.
- [x] 5.5 Mutation mỗi chiều HAI lượt, kiểm chứng đột biến đã tới đĩa.
- [x] 5.6 `npx tsc --noEmit` sạch + `npm test` xanh **toàn bộ**.

## 6. Tài liệu

- [x] 6.1 `DEPLOY.md` mục Kiến trúc — **VIẾT LẠI** câu «đã an toàn nhờ lớp Basic Auth nginx bên dưới».
      ⛔ Không xoá: đó là chỗ người sau đọc để hiểu **vì sao `MODE=org` được phép mở**. Xoá đi là để lại
      một quyết định không có lý do.
- [x] 6.2 `DEPLOY.md` — thêm **đường thoát khi bị rào chặn oan**: `sudo systemctl restart checkmate` xoá
      sạch trạng thái. Người ta cần biết điều này TRƯỚC lúc cuống, không phải lúc đang cuống.
- [x] 6.3 `DEPLOY.md` — thêm mục gỡ `auth_basic`, kèm đường lùi (giữ `.htpasswd-checkmate`, chỉ comment
      hai dòng; lùi = bỏ comment + `nginx -t` + reload).

## 7. Deploy BƯỚC MỘT — rào lên trước, nginx GIỮ NGUYÊN

- [ ] 7.1 Deploy theo 4 bước `DEPLOY.md` (sao lưu → pack → giải nén + cài → đối chiếu số).
- [ ] 7.2 ⛔ **Kiểm rào chạy THẬT trên prod, không suy từ ca test.** Gõ sai `POST /login` quá ngưỡng qua
      HTTPS thật (vẫn còn Basic Auth nên phải kèm `-u`), xác nhận bị từ chối và **thời gian trả lời sụt
      hẳn** — sụt là bằng chứng scrypt không chạy, tức gác đứng đúng chỗ.
- [ ] 7.3 Xác nhận đăng nhập đúng vẫn vào được sau khi hết hạn phạt.

## 8. Deploy BƯỚC HAI — gỡ Basic Auth (⛔ CHỜ PO CHỐT, tin riêng)

- [ ] 8.1 Trình PO: §7.2 đã đo xong, kết quả cụ thể. Gỡ lớp ngoài là thay đổi **hướng ra Internet** trên
      máy dùng chung với tingpos.vn — PO quyết, agent không tự bấm.
- [ ] 8.2 Comment `auth_basic` + `auth_basic_user_file` ở `location /`; gỡ hai dòng `auth_basic off` đã
      thành thừa. Giữ nguyên `location ^~ /.well-known/acme-challenge/` — certbot cần nó.
- [ ] 8.3 `sudo nginx -t` trước khi reload. Cấu hình sai + reload = mất cả site, không chỉ mất Basic Auth.
- [ ] 8.4 Kiểm sau khi gỡ: `curl` **không** `-u` tới `/` phải ra trang đăng nhập (không phải 401, cũng
      không phải nội dung ứng dụng); `/api/*` không phiên phải ra JSON 401; webhook vẫn nhận.
- [ ] 8.5 Kiểm rào **một lần nữa** sau khi gỡ — lần này là bề mặt thật, không còn lớp nào che.

## § Sau-merge — nợ có tên

- [ ] N1 **Soi được trạng thái rào ở màn Cấu hình** (đang chặn IP nào, tài khoản nào đang lùi). Biến cơ chế
      vô hình thành thứ nhìn được. Không làm trong change này: nó là bề mặt UI mới, trộn vào đây là trộn
      hai hồ sơ rủi ro trong một lần duyệt. Mở nếu PO thấy cần.
