# Tasks — identity-session

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/identity-session/spec.md` (8 requirement) — đã viết.
- [x] 1.2 Đối chiếu từng requirement với ca test đang xanh: mọi scenario có ca, và lần này **không** chỗ
      nào spec nói quá code (khác `probe-classification`, nơi bắt được một chỗ ở R1.20).

## 2. Hai lưới quét source (phần chưa ai giữ — D1)

- [x] 2.1 Lưới R11.20: tầng route KHÔNG được gọi hàm liệt kê tài khoản. Danh sách CHO PHÉP, chỗ hợp lệ duy
      nhất là công cụ dòng lệnh.
- [x] 2.2 Lưới R11.20 phần hai: bắt cả **câu SQL chạm bảng tài khoản** ở ngoài `identity.ts` — quét tên hàm
      thôi thì một route đọc thẳng SQL sẽ lọt.
- [x] 2.3 Lưới R11.4: chỉ đúng một hàm đọc cookie phiên để dựng danh tính, chỗ khác gọi lại nó. Dùng danh
      sách VỊ TRÍ chứ không quét thô — D8: `/logout` cũng đọc cookie, nhưng để XOÁ phiên chứ không dựng danh
      tính, và lưới máy không phân biệt được hai việc đó.
- [x] 2.4 Thông điệp của cả hai lưới phải nêu **file và tên** — người đọc sửa được ngay, không phải chạy lại
      phép quét bằng tay.

## 3. Tách hàm thuần (D2)

- [x] 3.1 → `session-gate.ts` (D7). Export hàm dựng cookie phiên, đổi tham số từ `express.Request` sang đúng thứ nó dùng
      (giá trị header proxy). KHÔNG đổi một chữ nào trong chuỗi cookie. Tên tiếng Anh.
- [x] 3.2 → `session-gate.ts` (D7). Tách quyết định gác phiên `(đường, có phiên?) → cho qua | chặn-JSON | chặn-chuyển-hướng`
      ra khỏi `app.use`; giữ nguyên thứ tự middleware.
- [x] 3.3 Danh sách đường mở thành hằng export, để ca test khoá được nội dung — nới nó phải làm một ca đỏ.
- [x] 3.4 `checkmate.yml` bảng module (⛔C5): khai `session-gate.js`. **Lần này nhớ trước khi lưới bắt** —
      lần đầu sau sáu lần quên.

## 4. Test

- [x] 4.1 Cookie (R11.14): ca HTTP → có `HttpOnly` + `SameSite`, KHÔNG `Secure`; ca HTTPS → đủ ba cờ.
      Từng cờ một ca riêng — ba cờ chặn ba đường khác nhau, gộp thành một ca thì mất cái nào không biết.
- [x] 4.2 Gác phiên (R11.2): ba nhánh trả về + ca danh sách đường mở đúng nội dung đã chốt.
- [x] 4.3 chmod (R11.8, D4): chmod được gọi cho đủ ba đuôi (`''`, `-wal`, `-shm`) với mode `0o600`.
- [x] 4.4 R11.7: schema có bảng tài khoản; R11.19: không route nào tạo/sửa/gỡ tài khoản.
- [x] 4.5 Ba đường leo quyền (D5), mỗi đường một ca: thêm route đọc bảng tài khoản · nới danh sách đường mở ·
      đọc cookie ở cửa thứ hai.
- [x] 4.6 Mutation, **sáu chiều, mỗi chiều chạy hai lần, kết quả nhất quán cả hai lần**:
      M1 bỏ `HttpOnly` → ĐỎ 2 ca · M2 bỏ điều kiện HTTPS (luôn `Secure`) → ĐỎ ca «HTTP không có Secure» ·
      M3 gác phiên luôn cho qua → ĐỎ 3 ca · M4 nhánh API trả redirect → ĐỎ ca «API phải trả JSON» ·
      M5 bỏ phép quét SQL khỏi lưới R11.20 → ĐỎ fixture «route đọc thẳng SQL» ·
      M6 bỏ đuôi `-shm` khỏi vòng chmod → ĐỎ ca chmod.
      Chạy hai lần là để tránh đúng cái bẫy của `error-message-egress-gate`, nơi một lần chạy báo
      «1 failed» hoá ra là flaky.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **50 file / 824 ca xanh**. Dự đoán «802 + ca mới, không ca
      cũ nào đỏ» — ĐÚNG.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 Hai lưới mới bắt được thứ đã biết TRƯỚC khi tin chúng: ba fixture đối kháng (route gọi
      `listAccounts`, route đọc thẳng SQL, cửa thứ hai đọc cookie) đều làm lưới đỏ và nêu đúng file.
      *Ca load-bearing: một phép quét trả rỗng trông giống hệt «repo sạch» và «phép quét hỏng».*
- [ ] 5.4 Đo neo thư viện probe sau archive — **dự đoán TRƯỚC: KHÔNG tăng, giữ 11/15** (D6). Sai thì ghi rõ
      sai ở đâu.

## 6. Bảng tra (ở commit archive)

- [ ] 6.1 `docs/r-rules-map.md`: 19 điều → `housed` `identity-session › <tiêu đề>`; **R11.15 và R11.16 →
      `housed` `merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm…`** (D3); hai hàng `precedent` (R11.2 ranh
      giới đối soát, R11 mở đầu «Basic Auth… `userInfo().username` = ubuntu») trỏ đoạn «Vì sao» tương ứng.
