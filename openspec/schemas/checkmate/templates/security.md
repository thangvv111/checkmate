<!-- ⛔ Ô ✅ PHẢI trỏ file:line của CƠ CHẾ THẬT (gác/rào/khoá nằm ở đâu), không trỏ ý định hay tên
     test suông. Mục không áp dụng → N/A kèm lý do. Đánh dấu: ✅ OK / ⚠️ Cần xử / N/A. -->

## S1. Bí mật & rò rỉ

- <!-- ✅/⚠️/N/A --> S1.1 Giá trị nào của change có thể là bí mật (token · khoá API · mật khẩu · token phiên · giá trị người dùng gõ vào ô cấu hình) và chúng đi qua bề mặt nào (thông điệp lỗi, log, sổ đĩa, verdict, comment PR, HTML)
- <!-- ✅/⚠️/N/A --> S1.2 Bề mặt CÔNG KHAI (comment PR, thân commit merge) không thu hồi được — cái gì chảy ra đó
- <!-- ✅/⚠️/N/A --> S1.3 Bản che PHÂN BIỆT được hai giá trị khác nhau (R5.20), không che trần theo độ dài

## S2. Danh tính, phiên, vai (R11)

- <!-- ✅/⚠️/N/A --> S2.1 Đường mới đọc danh tính qua đúng MỘT hàm, không fallback (R11.3/R11.4)
- <!-- ✅/⚠️/N/A --> S2.2 Không route nào trả tài khoản/hash/muối, kể cả đã che (R11.20)

## S3. Cổng & quyền của máy (R6, R11.18)

- <!-- ✅/⚠️/N/A --> S3.1 Change KHÔNG thêm đường nào cho MÁY tự merge (câu trả lời phải là KHÔNG)
- <!-- ✅/⚠️/N/A --> S3.2 Vai `tu_dong` không có quyền mới; ba mức tự động không bị gộp hay đảo mặc định

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- <!-- ✅/⚠️/N/A --> S4.1 Dữ liệu ngoài (diff PR, tài liệu, nội dung repo đích) được RÀO trước khi vào prompt; chỉ thị cài trong diff không đổi được hành vi engine
- <!-- ✅/⚠️/N/A --> S4.2 Trả lời model được kiểm hình dạng trước khi tin (R3)

## S5. Sandbox & thực thi (R8)

- <!-- ✅/⚠️/N/A --> S5.1 Code repo đích / probe do model sinh chỉ chạy trong sandbox worktree
- <!-- ✅/⚠️/N/A --> S5.2 Worktree/thư mục tạm được dọn KỂ CẢ khi lỗi; hai lượt song song không đụng nhau

## S6. Tầng dữ liệu & quyền file (R9)

- <!-- ✅/⚠️/N/A --> S6.1 File mới trên đĩa: quyền đúng, bí mật không lọt vào bản sao lưu
- <!-- ✅/⚠️/N/A --> S6.2 Ghi atomic; file rách thì GIỮ bằng chứng, không ghi đè im lặng (R10.12)

## S7. Fail-closed & bất biến verdict (R1, R6)

- <!-- ✅/⚠️/N/A --> S7.1 Mọi nhánh lỗi mới dẫn về đâu — không nhánh nào biến lỗi thành PASS hay nuốt lỗi thành «không có finding»
- <!-- ✅/⚠️/N/A --> S7.2 Probe hỏng không bị đếm nhầm thành bằng chứng hồi quy (R1.20)

## S8. Leo quyền & cô lập (per-vector — theo CHANGE này, không generic)

- <!-- ✅/⚠️/N/A --> S8.1 Enumerate vectors: MỌI đường tới cùng mục tiêu (đọc bí mật / bấm cổng / sửa cấu hình / đổi verdict) — vá một đường KHÔNG đóng cả lớp
- <!-- ✅/⚠️/N/A --> S8.2 Không dismiss bằng «đã có lớp khác chặn» khi chưa reproduce — test LOAD-BEARING HAI CHIỀU: code hiện tại → BỊ CHẶN, tạm no-op gác đó → LỌT
- <!-- ✅/⚠️/N/A --> S8.3 Đối xứng: đổi/gỡ gác cho một đường thì soi đường đối xứng

## Notes

<!-- Rủi ro riêng của change chưa nằm ở trên, kèm cách giảm thiểu -->
