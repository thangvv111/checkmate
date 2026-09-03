# Tasks — identity-session

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/identity-session/spec.md` (8 requirement) — đã viết.
- [ ] 1.2 Đối chiếu từng requirement với ca test đang xanh. Chỗ nào spec nói mà không ca nào khoá thì sửa
      SPEC cho khớp code hoặc thêm ca — KHÔNG chép từ văn bản R (bài học `probe-classification` task 1.2,
      bắt được một chỗ spec nói quá code).

## 2. Hai lưới quét source (phần chưa ai giữ — D1)

- [ ] 2.1 Lưới R11.20: tầng route KHÔNG được gọi hàm liệt kê tài khoản. Danh sách CHO PHÉP, chỗ hợp lệ duy
      nhất là công cụ dòng lệnh.
- [ ] 2.2 Lưới R11.20 phần hai: bắt cả **câu SQL chạm bảng tài khoản** ở ngoài `identity.ts` — quét tên hàm
      thôi thì một route đọc thẳng SQL sẽ lọt.
- [ ] 2.3 Lưới R11.4: chỉ đúng một hàm đọc cookie phiên để dựng danh tính; chỗ khác gọi lại nó.
- [ ] 2.4 Thông điệp của cả hai lưới phải nêu **file và tên** — người đọc sửa được ngay, không phải chạy lại
      phép quét bằng tay.

## 3. Tách hàm thuần (D2)

- [ ] 3.1 `server.ts`: export hàm dựng cookie phiên, đổi tham số từ `express.Request` sang đúng thứ nó dùng
      (giá trị header proxy). KHÔNG đổi một chữ nào trong chuỗi cookie. Tên tiếng Anh.
- [ ] 3.2 `server.ts`: tách quyết định gác phiên `(đường, có phiên?) → cho qua | chặn-JSON | chặn-chuyển-hướng`
      ra khỏi `app.use`; giữ nguyên thứ tự middleware.
- [ ] 3.3 Danh sách đường mở thành hằng export, để ca test khoá được nội dung — nới nó phải làm một ca đỏ.
- [ ] 3.4 `checkmate.yml` bảng module (⛔C5). **Chạy `npm test` để lưới `hop-dong-repo` xác nhận** — đã quên
      6 lần, lần nào cũng nghĩ là nhớ.

## 4. Test

- [ ] 4.1 Cookie (R11.14): ca HTTP → có `HttpOnly` + `SameSite`, KHÔNG `Secure`; ca HTTPS → đủ ba cờ.
      Từng cờ một ca riêng — ba cờ chặn ba đường khác nhau, gộp thành một ca thì mất cái nào không biết.
- [ ] 4.2 Gác phiên (R11.2): ba nhánh trả về + ca danh sách đường mở đúng nội dung đã chốt.
- [ ] 4.3 chmod (R11.8, D4): chmod được gọi cho đủ ba đuôi (`''`, `-wal`, `-shm`) với mode `0o600`.
- [ ] 4.4 R11.7: schema có bảng tài khoản; R11.19: không route nào tạo/sửa/gỡ tài khoản.
- [ ] 4.5 Ba đường leo quyền (D5), mỗi đường một ca: thêm route đọc bảng tài khoản · nới danh sách đường mở ·
      đọc cookie ở cửa thứ hai.
- [ ] 4.6 Mutation: gỡ từng gác → lưới phải đỏ ĐÚNG ca. Chạy **ít nhất hai lần** cho mỗi đột biến — bài học
      `error-message-egress-gate`: một lần chạy báo «1 failed» hoá ra là flaky, suýt kết luận sai.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — **dự đoán TRƯỚC: 802 + số ca mới, không ca cũ
      nào đỏ** (backfill, không đổi hành vi).
- [ ] 5.2 `npx openspec validate --changes` xanh.
- [ ] 5.3 Hai lưới mới phải bắt được thứ đã biết TRƯỚC khi tin chúng: dựng fixture một route gọi hàm liệt kê
      tài khoản và một cửa đọc cookie thứ hai → cả hai lưới phải đỏ. *Ca load-bearing: một phép quét trả
      rỗng trông giống hệt «repo sạch» và «phép quét hỏng».*
- [ ] 5.4 Đo neo thư viện probe sau archive — **dự đoán TRƯỚC: KHÔNG tăng, giữ 11/15** (D6). Sai thì ghi rõ
      sai ở đâu.

## 6. Bảng tra (ở commit archive)

- [ ] 6.1 `docs/r-rules-map.md`: 19 điều → `housed` `identity-session › <tiêu đề>`; **R11.15 và R11.16 →
      `housed` `merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm…`** (D3); hai hàng `precedent` (R11.2 ranh
      giới đối soát, R11 mở đầu «Basic Auth… `userInfo().username` = ubuntu») trỏ đoạn «Vì sao» tương ứng.
