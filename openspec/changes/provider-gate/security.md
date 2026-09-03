# Security — provider-gate

Đây là cổng quyết định lượt chấm chạy bằng gì và bằng khoá của ai. Hai loại thiệt hại khác nhau: **rò khoá**
(⛔C3) và **tiêu tiền nhầm ví** — cái thứ hai không phải lỗ bảo mật kinh điển nhưng nó im lặng, và im lặng
là thứ khó phát hiện nhất.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Dán nhầm khoá của nhà cung cấp này vào ô nhà cung cấp khác → thông điệp nói đúng chuyện đó mà
  **KHÔNG chứa giá trị khoá** (R5.8). Có ca sẵn, và ca thứ hai khoá rằng hai model lạ **cùng độ dài** không
  trùng một hàng sổ kiểm — tức bản che phân biệt được, đúng ⛔C3.
- ✅ S1.2 Kho khoá siết quyền trên hệ hỗ trợ (R5.11).
- ⚠️ S1.3 Ca cho S1.2 kiểm **lời gọi**, không kiểm quyền thật trên đĩa (D2) — cùng cái mất đã khai ở
  `identity-session` D4: một ca đọc quyền sẽ đỏ trên Windows và xanh trên Linux, mà lưới nói khác nhau tuỳ
  máy là lưới người ta sẽ bỏ qua.
- ✅ S1.4 Khoá và token KHÔNG lọt vào môi trường tiến trình chạy code của pull request (R5.10 mặt trái) —
  `envSandbox` là danh sách CHO PHÉP, có ca ở `env-cli.test.ts`.
- ✅ S1.5 Giá trị khoá không ra route: `response-secret-guard` chặn lúc chạy, và nó **biết giá trị** khoá
  nhà cung cấp vì chúng nằm trong kho.

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 Sửa cấu hình nhà cung cấp là quyền `van_hanh` trở lên; vai `tu_dong` chạy chấm được nhưng KHÔNG
  sửa cấu hình — đó chính là lý do hai vai ấy tách nhau (`identity-session`). Change không nới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge.
- ✅ S3.2 Cổng kiểm chỉ biết nói KHÔNG: chưa kiểm thành công thì không chọn được (R5.4). Đúng ⛔C1 ở tầng
  cấu hình — tự động hoá được phép chặn, không được phép cho qua.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ⚠️ S4.1 **Chỗ tinh tế nhất của nhóm này.** Câu trả lời hợp lệ của model có thể chứa chữ giống lời báo lỗi
  của công cụ — repo nào có spec về xác thực thì probe sinh ra gần như luôn chứa `unauthorized`,
  `session expired`. Đo được: **3/4 câu trả lời hợp lệ bị bắt nhầm**, một lượt chấm chết oan dù đăng nhập
  vừa chạy tốt (R3.13).
  Nên phép nhận diện phải xét **chỗ xuất hiện và hình dạng**, không chỉ mẫu chữ: `stderr` là chắc chắn vì
  model không trả lời qua đó; `stdout` chỉ tính khi output không mang hình dạng một câu trả lời. Có ca sẵn
  cho cả hai chiều.
- ✅ S4.2 Model lạ đi qua được (R5.18) — không đoán trước, để nhà cung cấp làm trọng tài. Đây là fail-open
  **có chủ đích** và đúng: đoán trước thì một model mới ra đời là hệ này chặn oan.

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 Không chạy code repo đích ở chỗ mới.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Sổ kiểm nhà cung cấp giữ **bản che** của giá trị ngoài danh mục (R5.5 phần phép chiếu), nên đọc
  sổ không lấy được model lạ nguyên văn.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Phản hồi **rỗng** là kiểm THẤT BẠI (R5.6) — «khoá hợp lệ nhưng model không sinh được nội dung»
  vẫn là không dùng được, và cổng báo xanh ở đó là cổng vô nghĩa.
- ✅ S7.2 Mất xác thực **không thử lại** (R3.14): lỗi cấu hình không tự khỏi ở lượt hai.
- ✅ S7.3 Cấu hình khuyết trường → từ chối **êm**, không ném (R5.5): cửa kiểm nổ là đánh sập cả lượt chấm
  thay vì bỏ qua một nhà cung cấp.
- ✅ S7.4 Đường chấm gặp cấu hình khuyết model thì **hỏi**, không đoán (R5.19).

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **chấm bằng thứ không được chọn**, hoặc **tiêu tiền nhầm ví**.

- ✅ S8.1 (a) chọn nhà cung cấp chưa kiểm → R5.4, ca T9.4.
- ✅ S8.2 (b) kiểm xong rồi đổi model → R5.5, có ca cả hai chiều.
- ✅ S8.3 (c) dùng model chỉ-thuê-bao qua đường API → R5.15/R5.16, có ca.
- ✅ S8.4 (d) sửa cấu hình để cửa đọc **tự thay** tổ hợp cấm bằng tổ hợp hợp lệ → R5.17, có ca.
- ⚠️ S8.5 (e) **để khoá API trong môi trường khi chạy gói thuê bao** → công cụ dòng lệnh lặng lẽ dùng khoá
  đó và tính tiền API; phép thử vẫn báo xanh trong khi tiền ra từ ví API (R5.12). Đã chặn bằng cách cắt
  khoá khỏi môi trường, có ca ở `env-cli`. **Ghi ra vì nó là đường im lặng nhất của cả nhóm** — không có
  lỗi, không có cảnh báo, chỉ có hoá đơn.
- ✅ S8.6 (f) đọc khoá từ sổ kiểm → sổ giữ bản che (S6.1).

## Notes

- Chỗ chưa kín duy nhất và đã khai: S1.3 (ca chmod kiểm lời gọi, không kiểm quyền thật) — cùng cái mất đã
  ghi ở `identity-session` D4, và phần không với tới thuộc kiểm tay lúc deploy.
- S8.5 đáng đọc kỹ hơn vẻ ngoài: nó không làm hỏng gì, không báo gì, và chỉ lộ ra ở hoá đơn cuối tháng.
