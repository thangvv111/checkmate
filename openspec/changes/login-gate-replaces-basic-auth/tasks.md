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

- [x] 7.1 Deploy theo 4 bước `DEPLOY.md` (sao lưu → pack → giải nén + cài → đối chiếu số).
- [x] 7.2 ⛔ **Kiểm rào chạy THẬT trên prod, không suy từ ca test.** Gõ sai `POST /login` quá ngưỡng qua
      HTTPS thật (vẫn còn Basic Auth nên phải kèm `-u`), xác nhận bị từ chối và **thời gian trả lời sụt
      hẳn** — sụt là bằng chứng scrypt không chạy, tức gác đứng đúng chỗ.
- [x] 7.3 Xác nhận đăng nhập đúng vẫn vào được sau khi hết hạn phạt.

## § Đo được ở §7 (06/09, prod)

Đo trên máy chủ, qua `127.0.0.1:4001`, tên tài khoản KHÔNG tồn tại (để không khoá tài khoản thật —
`verifyPassword` vẫn băm với muối giả cho tên không tồn tại, nên thời gian so sánh được).

```
gác tài khoản — cùng một tên, sai liên tiếp:
  lần 1-3    83 / 52 / 48 ms   ?sai=1     <- scrypt CHAY
  lần 4-16    1 -  2 ms        ?cho=1     <- scrypt KHONG chay   (~40x nhanh hon)

gác IP — quét nhiều tên khác nhau từ MỘT ip:
  lần 1-11   47 - 56 ms        ?sai=1
  lần 12+     1 -  2 ms        ?cho=900   <- chan IP 15 phut

hết hạn phạt:
  ngay sau khi bị phạt    1 ms   ?cho=1
  sau khi chờ 2 giây     47 ms   ?sai=1   <- bam chay lai, nguoi that vao duoc

đường thoát:  systemctl restart  ->  lần thử kế 80 ms ?sai=1  (trạng thái đã xoá)
log:          «rào đăng nhập: chặn 1 lượt · tài khoản d008e82c · nguồn 198.51.100.77»
              tên đã CHE; không tên thô nào lọt ra log
dữ liệu prod: so_cai 3->3 · run 5->5 · probes-lib 8->8 · runs 8->8 · quyền DB 600
bind:         127.0.0.1:4001  (tiền đề của X-Real-IP còn nguyên)
```

**Tụt từ ~50 ms xuống 1–2 ms là bằng chứng gác đứng TRƯỚC phép băm** — thứ ca test đơn vị không chứng
minh được trên máy thật.

**Giới hạn của rào, nói thẳng ra:** kẻ tấn công vẫn đốt được **11 lượt scrypt cho mỗi IP mỗi 15 phút**
(~0,55 giây CPU). Một mạng khoảng **27 IP** trở lên là giữ được một lõi bận liên tục. Rào này cắt chi phí
xuống hai bậc độ lớn, **không** đưa nó về không — ai đọc số ở trên nên biết cả điều đó.

⚠ **Đo được một chỗ CHƯA TỐT:** 13 lượt bị chặn mà log chỉ ghi «chặn 1 lượt». Hàm chặn-tần-suất-ghi-sổ
báo số dồn ở lần phát **kế tiếp**, nên một đợt ngắn hơn 60 giây kết thúc bằng đúng một dòng nói «1».
Không sai về luật — trần tần suất vẫn đúng như spec đòi — nhưng **con số làm người vận hành ước lượng
thấp đi một bậc độ lớn**, tức sổ thành thứ đọc xong tin nhầm.

✅ **Đã sửa trong chính change này (§7b) trước khi gỡ nginx** — PO chốt 06/09: sửa N2 rồi gỡ một thể.

## 7b. Sửa N2 — sổ phải nói đúng độ lớn

- [x] 7b.1 Hai điều kiện phát thay vì một: **mốc luỹ tiến** (lượt 1, 10, 100, 1000…) cho tín hiệu ngay và
      độ lớn · **trần thời gian** cho nhịp đều khi đợt kéo dài không chạm mốc mới.
- [x] 7b.2 Trần vẫn còn: mốc là luỹ thừa của 10 ⇒ đợt N lượt phát không quá bậc logarit của N dòng. Ca
      T4.3 khoá điều này — thêm tín hiệu KHÔNG được mở lại đường làm đầy đĩa.
- [x] 7b.3 Đếm theo **ĐỢT**, reset khi im lặng trọn một khoảng. Không thì đợt hôm nay thừa hưởng con số
      của đợt hôm qua và mốc không bao giờ chạm nữa.
- [x] 7b.4 Log mang **hai** con số: `chặn N lượt (đợt này M)` — chúng trả lời hai câu khác nhau.
- [x] 7b.5 Spec `login-throttle` bổ sung yêu cầu «con số phải phản ánh độ lớn thật» + 2 scenario.
- [x] 7b.6 Mutation 4 đột biến × 2 lượt (bỏ mốc · bỏ trần thời gian · mốc tuyến tính · không reset đợt) —
      giết 3 / 4 / 3 / 1 ca, không cái nào sống sót.
- [x] 7b.7 ⛔ **Ca T4.3 lần đầu viết SAI trần**: chỉ tính mốc, quên trần thời gian cũng phát. Đỏ ở
      `expected 8 to be less than or equal to 7`. Sửa bằng cách viết trần thành CÔNG THỨC trong ca
      (`log10(N)+1` + `khoảng-đợt / khoảng-log + 1`) chứ không phải một con số ma.

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

- [x] N2 ✅ XONG 06/09 ngay trong change này (§7b), trước khi gỡ nginx — PO chốt «sửa N2 trước rồi gỡ một thể». **Log của rào báo số thấp hơn thực tế ở đợt ngắn** (đo 06/09 §7): 13 lượt chặn → log ghi «chặn
      1 lượt». Hướng sửa: phát theo MỐC luỹ tiến (lần 1, 10, 100, 1000…) BÊN CẠNH trần thời gian — vừa
      có tín hiệu ngay vừa có độ lớn, mà không mở lại đường làm đầy đĩa.
- [ ] N1 **Soi được trạng thái rào ở màn Cấu hình** (đang chặn IP nào, tài khoản nào đang lùi). Biến cơ chế
      vô hình thành thứ nhìn được. Không làm trong change này: nó là bề mặt UI mới, trộn vào đây là trộn
      hai hồ sơ rủi ro trong một lần duyệt. Mở nếu PO thấy cần.
