# Security — probe-library

Thư viện probe là **chỗ duy nhất trong hệ có nhiều tiến trình cùng ghi vào một file sổ**, và là chỗ tích
luỹ tài sản lâu dài của sản phẩm. Soi ở đây chủ yếu là soi mất dữ liệu và soi đua, không phải soi kẻ tấn công.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Không chạm bí mật. Ca dùng thư mục tạm, không đọc kho khoá.
- ⚠️ S1.2 Code probe có thể chứa chuỗi lấy từ repo đích. Change này không đổi đường ghi, nhưng đáng ghi:
  probe nằm trên đĩa dạng mã nguồn, nên bất cứ thứ gì lọt vào probe là lọt vào một file **ở lại lâu dài**.
  Đó là lý do `response-secret-guard` và `error-message-egress-gate` phải đứng trước.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính, không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường cho máy tự merge.
- ✅ S3.2 R-4 giữ đúng chiều: mảnh tách không chạy sạch thì **bỏ**, không nạp mù — máy nói KHÔNG được, nói
  CÓ thì không.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ⚠️ S4.1 Probe thư viện là **code sinh từ model, chạy thật trong sandbox**. Change này không đổi điều đó,
  nhưng R-4 siết một vế thật: mảnh tách phải chạy sạch một mình trên nhánh gốc TRƯỚC khi được nạp — tức
  không có đường nào để một mảnh hỏng nằm im trong thư viện rồi phát tác ở lượt sau.
- ✅ S4.2 R-5 giữ lớp thư viện **không biết tới model**: nội dung model trả về không đi thẳng vào lớp ghi đĩa.

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 R-2 và R-7 đều thuộc nhóm «đua giữa các lượt» — cả hai chọn hướng *mất ít, tự khỏi* thay vì *đổ cả
  lượt*: hết giờ chờ thì đua nhau ghi chứ không bỏ probe; file vừa bị dọn thì bỏ qua chứ không ném.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 R-3 khai rõ vì sao code probe là **ngoại lệ có chủ đích** của luật lớp kho — nó là mã nguồn phải
  chạy được, không phải bản ghi. Không có ngoại lệ nào được thêm.
- ⚠️ S6.2 `probes-lib/` là **dữ liệu prod** (`DEPLOY.md`). Mọi ca dùng thư mục tạm; một ca ghi nhầm vào kho
  thật là xoá tài sản tích luỹ của người dùng. Tick T_prod là chỗ chặn.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 R-4 là fail-closed đúng nghĩa: không chứng minh được mảnh chạy được thì không nạp.
- ⚠️ S7.2 R-6 là một fail-closed **ngược chiều đáng chú ý**: một trần hỏng không làm lượt chấm đổ — nó làm
  thư viện **bị đào thải gần hết ở lượt sau**, im lặng và không hồi được. Loại hỏng nguy hiểm nhất ở tầng
  này không phải cái làm mọi thứ dừng, mà cái chạy tiếp trong khi đang xoá tài sản.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **làm mất một probe đã bắt được lỗi thật, mà không ai biết**.

- ✅ S8.1 (a) đặt biến môi trường trần thành giá trị hỏng để ép trần nhỏ → R-6 chặn, dùng mặc định.
- ✅ S8.2 (b) đặt trần thấp hợp lệ → R-6 kẹp lên cận dưới.
- ✅ S8.3 (c) đua hai lượt cùng commit để ghi đè file của nhau → R-1 nới hậu tố hash.
- ✅ S8.4 (d) giữ khoá để lượt khác bỏ probe → R-2: hết giờ thì vẫn làm việc.
- ⚠️ S8.5 (e) sửa tay sổ để trỏ sai file → không lưới nào bắt. Đây là **quyền quản trị trên máy chủ**, cùng
  hạng với `R11.19` (tài khoản quản trị bằng lệnh trên máy chủ): người có quyền ghi đĩa máy chủ đã ở trong
  vòng tin cậy. Ghi ra để người sau không nhầm là đã bịt.

## Notes

- S7.2 là chỗ đáng nhớ nhất của change: hỏng nguy hiểm nhất ở tầng này không dừng hệ thống, nó **chạy tiếp
  trong khi đang xoá tài sản**. Cả R-6 lẫn R-1 đều là gác cho loại hỏng ấy.
- S8.5 là một chỗ hở có ý thức, ranh giới đã khai.
