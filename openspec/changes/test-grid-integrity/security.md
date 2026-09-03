# Security — test-grid-integrity

Change này không chạm sản phẩm — nó thêm luật về **cách viết lưới**. Nhưng nó lại chạm thứ mọi luật bảo mật
của repo đứng lên: **niềm tin rằng lưới đang gác thật**. Nên soi ở đây là soi xem change có làm niềm tin ấy
vững hơn hay chỉ làm nó dày hơn.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Không chạm bí mật. Lưới mới chỉ đọc `test/` của chính repo.
- ✅ S1.2 Gián tiếp nhưng đáng kể: **hai trong sáu lỗi lưới hôm nay nằm ở lưới ⛔C3**.
  `error-message-egress-gate` có ca xanh sau khi bỏ rào (bí mật repo đích vào prompt), và
  `response-secret-guard` có 16 ca xanh trong khi máy chủ thật **không chặn gì** (bí mật của checker ra
  response). Cả hai đều là lưới bảo mật, và cả hai đều trông như đang gác.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính, không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường cho máy tự merge. Lưới chỉ biết nói KHÔNG.
- ⚠️ S3.2 Nhưng có một tác động gián tiếp lên cổng đáng nói: ⛔C1 và ⛔C2 được cưỡng chế **bằng lưới**. Một
  lưới đo sai ở đó nghĩa là bất biến ấy chỉ còn là câu chữ — và không ai biết, vì lưới vẫn xanh.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Lưới đọc `test/` của chính repo, không phải dữ liệu ngoài.
- ⚠️ S4.2 Quy ước tên `scan*` là **danh sách cấm theo tên** — thứ repo này vốn không tin. Chấp nhận vì bề
  mặt là code của chính repo đi qua review, và cái giá của âm tính giả ở đây là **một lưới không được
  kiểm**, không phải một bí mật rò ra. Đánh đổi này KHÔNG được đem áp cho ⛔C3.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không ghi file lúc chạy.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Lưới thiếu cặp fixture → ĐỎ, không im lặng cho qua.
- ⚠️ S7.2 **Chỗ nguy hiểm nhất của change này là chính nó.** Ba tầng có thể tạo cảm giác «lưới từ nay đúng»,
  và cảm giác ấy làm người ta **thôi đọc** — đúng chỗ loại lỗi thứ tư sống. Vì thế requirement thứ tư khai
  thẳng rằng ba tầng KHÔNG đủ, và nó là một phần của luật chứ không phải ghi chú cuối trang.

  Một hệ thống kiểm tra tự tuyên bố đã kín thì nguy hiểm hơn một hệ thống thừa nhận chỗ hở của mình.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **để một lưới hỏng đi qua mà không ai biết**.

- ✅ S8.1 (a) viết hàm quét chỉ có fixture đối kháng → tầng 3 bắt (T1.2).
- ⚠️ S8.2 (b) đặt tên hàm quét khác quy ước `scan*` → **lọt** (S4.2). Cách sửa khi phát hiện: đổi phép nhận
  diện, không bỏ tầng 3.
- ⚠️ S8.3 (c) viết ca không khoá gác nào rồi bỏ mutation → tầng 1 chỉ ở tài liệu, không có lưới. Đây là
  đánh đổi có ý thức (D1): một lưới đoán ngữ nghĩa «ca này có khoá gác không» sẽ sai theo cả hai chiều, tức
  đúng thứ capability này chống.
- ⚠️ S8.4 (d) dựng gác xuyên suốt mà không đếm bề mặt → tầng 2 cũng chỉ ở tài liệu. Giảm nhẹ bằng mục kiểm
  tay «chạy thật một lượt», và cổng archive đã chặn ô chưa tick.
- ⚠️ S8.5 (e) **lưới đúng nhưng luật sai** → không cơ chế nào bắt. Khai thành requirement.

## Notes

- Bốn chỗ mở (S8.2–S8.5) đều đã khai, và ba trong số đó là **đánh đổi có ý thức** chứ không phải sơ suất.
- S7.2 là điều đáng nhớ nhất: change này làm lưới đáng tin hơn ở ba chỗ đã đo được, và **không** làm nó
  đáng tin ở chỗ thứ tư. Viết ra sự khác biệt ấy là phần việc chính của capability, không phải phần phụ.
