## Unit / hàm thuần

### [chiTietNgoaiCong]
- [x] T1.1 [Scenario «verdict có medium nhưng không ai tick»]: GIVEN verdict PASS + 2 medium WHEN dựng chi_tiet cho hàng ngoài cổng THEN chuỗi nêu ĐỦ ba điều: ngoài cổng · KHÔNG có xác nhận nào · số medium chưa tick là 2
- [x] T1.2 [Biên]: verdict 0 finding → vẫn phải nói «không có xác nhận nào», KHÔNG được im lặng (im lặng đọc nhầm thành «không có gì để xác nhận»)

## Tích hợp (đĩa, SQLite, khoá)

### [di trú so_cong thêm cột ngoai_cong]
- [x] T2.1 [Happy]: sau di trú, cột tồn tại và hàng cũ có giá trị 0
- [x] T2.2 [Đời cũ]: DB đã có hàng sổ trước đó vẫn đọc được, `CHECK` và trigger cấm-sửa/xoá còn nguyên
- [x] T2.3 [Chạy lại]: gọi di trú hai lần không ném, không thêm cột hai lần

### [doiSoatCong]
- [x] T2.4 PR đã merge + run chưa có hàng → ghi đúng một hàng, `ngoai_cong` bật, `run.cong_*` được cập nhật
- [x] T2.5 PR đóng không merge → hành động `reject`, `ngoai_cong` bật
- [x] T2.6 PR còn mở → KHÔNG ghi hàng nào
- [x] T2.7 [Idempotent] chạy hai lần liên tiếp → tổng số hàng sổ không đổi
- [x] T2.8 [Lỗi] đọc trạng thái PR ném → không hàng nào được ghi, không ném ra ngoài

## Ca đối kháng & hồi quy

- [x] T3.1 Run đã có hành động cổng THẬT (người bấm trong CheckMate) → đối soát bỏ qua, không đè
- [x] T3.2 Nhiều run cùng một PR (chuỗi vá nhiều vòng) → chỉ ghi cho run đã chấm, mỗi run một hàng, và số lời gọi GitHub = số PR chứ không phải số run
- [x] T3.3 Hàng ngoài-cổng KHÔNG được đếm lẫn vào thống kê hành động qua-cổng

## Trục nhạy cảm

- [N/A] T_bimat — không chạm token/khoá/mật khẩu; tên người merge lấy từ GitHub là dữ liệu công khai của PR
- [x] T_failclosed — đọc trạng thái PR lỗi → KHÔNG ghi hàng suy đoán (T2.8); thà sổ thiếu một hàng còn hơn sổ có một hàng sai vĩnh viễn (sổ không sửa được)
- [x] T_cong — đối soát KHÔNG merge, KHÔNG đóng PR, KHÔNG tick finding thay người; nó chỉ GHI LẠI việc đã xảy ra
- [N/A] T_khongtincay — không đưa dữ liệu ngoài vào prompt model; đối soát không gọi model
- [x] T_hopdong — ba hàm mới phải khai vào bảng module `checkmate.yml`

## Kiểm tay

- [ ] T5.1 (chưa làm — chờ deploy) Sau deploy: mở màn hình lịch sử, xác nhận các run của PR #12–#20 không còn treo «chưa thao tác», và hàng sổ nói rõ là ngoài cổng

## Ca cho vòng chấm

Vòng một:
- [x] T4.1 PR đã qua cổng ở MỘT run → run anh em không bị vu ngoài cổng
- [x] T4.2 Trạng thái ngoài miền / khuyết → bỏ qua, không rơi mềm thành reject
- [x] T4.3 Run KHÔNG có verdict vẫn được đối soát
- [x] T4.4 Cờ ngoài-cổng sang cả bề mặt `run.ketQuaCong`
- [x] T4.5 Một PR hỏng không giết lượt của các PR còn lại
- [x] T4.6 `chiTietNgoaiCong` không ném với `findings` méo

Vòng hai:
- [x] T5.1 Hai REPO trùng số PR → hai lời gọi riêng, không dùng chung kết luận
- [x] T5.2 PR có hàng REJECT qua cổng rồi merge ngoài cổng → lần merge vẫn được ghi
- [x] T5.3 Hàng merge gắn vào lượt MỚI NHẤT, không rơi xuống lượt cũ
- [x] T5.4 Run không gắn repo → bỏ ra ngoài diện
- [x] T5.5 Lỗi không phải Error → đếm đúng một lần, không tự ném
- [x] T5.6 `chi_tiet` nói rõ máy chỉ GHI LẠI, kèm danh tính tác nhân máy
- [ ] T5.7 (chưa làm — chờ deploy) Xác nhận trên prod: đối soát chạy được cả khi `truc.bat=false`

