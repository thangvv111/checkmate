## ADDED Requirements

### Requirement: Sổ cổng phải phản ánh cả hành động xảy ra ngoài cổng

Hệ thống SHALL đối soát trạng thái thật của pull request với sổ hành động cổng. Khi một PR đã được
merge hoặc đóng mà sổ **không có** hành động cổng tương ứng, hệ thống MUST ghi một hàng vào sổ,
đánh dấu là hành động **NGOÀI CỔNG**.

Một cổng không ngăn được người ta merge bằng đường khác — GitHub luôn có nút merge. Điều nó bắt buộc
phải làm là **biết chuyện đó đã xảy ra**: sổ kiểm toán im lặng ở đúng những lần merge thật thì nó
không còn trả lời được câu hỏi nó sinh ra để trả lời.

#### Scenario: PR được merge bằng đường khác, sổ chưa có hàng nào
- **WHEN** run `R` đã chấm PR #20, PR #20 nay ở trạng thái đã merge, và sổ cổng chưa có hàng nào cho `R`
- **THEN** hệ thống ghi một hàng sổ cho `R` với hành động `merge`, cờ ngoài-cổng BẬT, và trạng thái
  hiển thị của run đổi khỏi «chưa thao tác»

#### Scenario: PR bị đóng không merge
- **WHEN** PR #21 bị đóng mà không merge, run của nó chưa có hàng sổ
- **THEN** hệ thống ghi hàng với hành động `reject`, cờ ngoài-cổng BẬT

#### Scenario: PR còn mở
- **WHEN** PR #22 vẫn đang mở
- **THEN** hệ thống KHÔNG ghi hàng nào — chưa có hành động cổng nào xảy ra

### Requirement: Hàng ngoài-cổng không được trông giống hàng qua-cổng

Hàng ghi bởi đối soát MUST phân biệt được với hàng do người bấm trong CheckMate, ở mức **dữ liệu**
(một trường riêng), không chỉ ở mức chữ trong ghi chú. Người kiểm toán lọc sổ theo hành động phải
tách được hai loại mà không cần đọc văn.

Hàng ngoài-cổng MUST nói rõ **không có xác nhận finding nào**, kèm số finding medium/low của verdict
lúc đó. Để trống chỗ xác nhận là mời người đọc suy diễn thành «không có finding nào để xác nhận» —
hai điều đó khác hẳn nhau.

#### Scenario: verdict có medium nhưng không ai tick
- **WHEN** run có verdict PASS kèm 2 finding medium, và PR được merge ngoài cổng
- **THEN** hàng sổ nêu rõ không có xác nhận nào VÀ nêu số medium chưa được xác nhận là 2

#### Scenario: phân biệt bằng dữ liệu
- **WHEN** đọc sổ cổng
- **THEN** mỗi hàng cho biết nó là hành động qua cổng hay ngoài cổng bằng một trường riêng

### Requirement: Đối soát idempotent và không bịa

Đối soát MUST bỏ qua run đã có hành động cổng — chạy lại nhiều lần KHÔNG được đẻ hàng trùng. Sổ chỉ
ghi thêm và không sửa được, nên một hàng thừa là một hàng sai vĩnh viễn.

Khi không đọc được trạng thái PR (thiếu quyền, mạng hỏng, PR đã bị xoá), hệ thống MUST bỏ qua và nói
ra, TUYỆT ĐỐI không ghi hàng suy đoán.

#### Scenario: chạy đối soát hai lần liên tiếp
- **WHEN** đối soát chạy lần thứ hai trên cùng dữ liệu
- **THEN** không hàng sổ mới nào được ghi

#### Scenario: không đọc được trạng thái PR
- **WHEN** lời gọi GitHub lỗi cho PR #23
- **THEN** không hàng nào được ghi cho run của PR #23, và lý do được ghi ra log

### Requirement: Đối soát không được làm hỏng lượt chấm

Đối soát MUST chạy tách khỏi đường chấm: lỗi của nó KHÔNG được làm dừng chế độ trực hay hỏng một lượt
chấm đang chạy.

#### Scenario: đối soát ném lỗi giữa chừng
- **WHEN** pha đối soát ném lỗi
- **THEN** chu kỳ chế độ trực vẫn tiếp tục quét và chấm PR như thường
