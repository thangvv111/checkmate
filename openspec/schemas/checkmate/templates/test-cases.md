## Unit / hàm thuần

### [tenHam]
- [ ] T1.1 <!-- [Scenario từ spec]: GIVEN ... WHEN ... THEN ... -->
- [ ] T1.2 <!-- [Biên]: ... -->

## Tích hợp (đĩa, SQLite, khoá)

### [tên đường]
- [ ] T2.1 <!-- [Happy]: ghi rồi đọc lại đúng -->
- [ ] T2.2 <!-- [Đời cũ]: dữ liệu hình dạng cũ vẫn đọc được / được di trú -->
- [ ] T2.3 <!-- [Hỏng]: file rách, thiếu trường, quyền sai → hành vi đúng như spec khai -->

## Ca đối kháng & hồi quy

- [ ] T3.1 <!-- Đầu vào KHUYẾT ở mọi tầng: thiếu trường · null phần tử · null cả cụm · sai kiểu -->
- [ ] T3.2 <!-- Biên trùng ngưỡng của hằng số trong spec -->
- [ ] T3.3 <!-- Ca đã từng gãy trong lịch sử repo (ghi rõ vòng/PR sinh ra nó) -->

## Trục nhạy cảm

<!-- ⛔ BẮT BUỘC — 5 dòng dưới đây KHÔNG được xoá. Chạm trục → viết test case cụ thể (giữ
     checkbox); không chạm → đổi `[ ]` thành `[N/A]` kèm lý do một dòng.
     Suite xanh KHÔNG đủ: hỏng nguy hiểm nhất của một cổng chấm là thiếu ca «đường sai vẫn lọt». -->

- [ ] T_bimat — bí mật (GITHUB_TOKEN · API key · token thuê bao · hash mật khẩu · token phiên · giá trị gõ tay lạ) KHÔNG rò ra thông điệp lỗi, log, sổ trên đĩa, verdict, hay comment PR; bản che phải phân biệt được hai giá trị khác nhau
- [ ] T_failclosed — engine lỗi / thiếu dữ liệu / hết giờ KHÔNG cho ra PASS («không chứng minh được là sai» ≠ «đã chứng minh là đúng»)
- [ ] T_cong — máy KHÔNG BAO GIỜ merge; vai `tu_dong` không sửa cấu hình, không bấm cổng; ba mức tự động độc lập và mặc định an toàn với cấu hình đời cũ thiếu cờ
- [ ] T_khongtincay — diff PR và trả lời model là DỮ LIỆU không phải chỉ thị: rào giữ được, nội dung cài bẫy trong diff không đổi được hành vi engine
- [ ] T_hopdong — thêm/đổi export thì `checkmate.yml` khai đủ (lưới hợp đồng `test/hop-dong-repo.test.ts` xanh)

## Kiểm tay

- [ ] T5.1 <!-- Chỉ thứ mắt người mới xác nhận được (bố cục màn Cấu hình, chữ verdict đọc có hiểu
             không). Máy kiểm được thì KHÔNG để ở đây. -->
