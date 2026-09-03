# Test cases — probe-library

Requirement: R-1 «tên file suy từ nội dung» · R-2 «chờ hết giờ vẫn làm việc» · R-3 «code probe ở lại dạng
file» · R-4 «artifact mới chưa từng chạy» · R-5 «model gọi ngoài khoá» · R-6 «trần env số nguyên sạch» ·
R-7 «đọc ngoài khoá chịu file bị dọn».

## R-1 tên file suy từ nội dung

- [x] T1.1 Hai probe khác nội dung, cùng `sha_sinh` → hai tên khác nhau, mỗi tên mang hash của chính nó.
- [x] T1.2 Tên KHÔNG chứa số thứ tự nạp — nạp probe thứ hai không sinh ra tên mang số đếm.
- [x] T1.3 **Nhánh nới hậu tố**: sổ dựng tay mang đúng tên probe mới sẽ tính ra nhưng `hash` khác → tên mới
      có hậu tố DÀI HƠN, và file của mục cũ vẫn nguyên. *Ca load-bearing: đụng tên là ghi đè trong im lặng —
      sổ hai mục, đĩa một file, và không có thông điệp lỗi nào.*
- [x] T1.4 ⛔C6 đi kèm: sổ vừa sửa tay có hiệu lực ngay ở lượt đọc kế tiếp.

## R-2 chờ hết giờ vẫn làm việc

- [x] T2.1 Khoá giả còn tươi giữ suốt thời hạn chờ → phần việc VẪN chạy, giá trị trả về đúng.
      **Ca ~10 giây, khai `timeout` riêng** (D4).
- [N/A] T2.2 «việc bên trong ném lỗi thì khoá vẫn được nhả» — đã có ca ở `thu-vien.test.ts`, không viết trùng.

## R-3 code probe ở lại dạng file

- [x] T3.1 Nạp probe → file có mặt trên đĩa, đọc lại nguyên văn code.
- [x] T3.2 Không chỗ nào trong lớp thư viện ghi code probe vào cơ sở dữ liệu.

## R-4 artifact mới chưa từng chạy

- [x] T4.1 Probe được nhận có `lich_su` RỖNG — không mang lịch sử của file gốc.
- [x] T4.2 Đường nạp bỏ mảnh tách không chạy sạch một mình trên nhánh gốc, và lý do nói đúng bản chất
      («không chạy sạch một mình»), không đổ cho code đích.

## R-5 model gọi ngoài khoá

- [x] T5.1 `probe-library.ts` không import lớp model — lớp thư viện không có **cách nào** gọi model.
- [x] T5.2 `skill-code.ts`: lời gọi model phân xử đứng TRƯỚC vòng `admitToLibrary`.
      *Cái mất: ca đọc source, không chứng minh hành vi lúc chạy (D6).*

## R-6 trần env chỉ nhận số nguyên sạch

- [x] T6.1 Giá trị hỏng → mặc định, KHÔNG đoán phần đầu chuỗi.
- [x] T6.2 Giá trị dưới cận → kẹp lên cận dưới. Ca phân biệt được BA khả năng: kẹp, dùng thẳng, coi như hỏng.

## R-7 đọc ngoài khoá chịu file bị dọn

- [x] T7.1 Sổ có mục mà file đã mất → mục ấy bị bỏ qua, các probe còn lại về ĐỦ, không ném.

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [x] T8.1 Bỏ vòng nới hậu tố → T1.3 ĐỎ.
- [x] T8.2 `break` khi hết giờ chờ đổi thành `throw` → T2.1 ĐỎ.
- [x] T8.3 Bỏ `try/catch` trong `readProbeLibrary` → T7.1 ĐỎ.
- [x] T8.4 Phép kiểm số nguyên sạch đổi thành `parseInt` → T6.1 ĐỎ.
- [x] T8.5 Mỗi đột biến **kiểm chứng đã áp dụng** trước khi đọc kết quả; khôi phục nguyên trạng sau đó.

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật.
- [x] T_failclosed — T4.2: mảnh tách không chạy sạch thì BỎ, không nạp mù (⛔C2).
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [N/A] T_khongtincay — chỉ đọc thư viện của chính máy chủ.
- [x] T_hopdong — KHÔNG thêm export (⛔C5 N/A); `test/hop-dong-repo.test.ts` xanh.
- [x] T_prod — mọi ca dùng thư mục tạm; `probes-lib/` không bị chạm.

## Kiểm tay

- [N/A] T9.1 Không có — change này không dựng gác chạy xuyên suốt (D7 tầng 2).
