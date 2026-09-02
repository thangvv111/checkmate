## MODIFIED Requirements

### Requirement: Đối soát idempotent và không bịa

Đối soát MUST bỏ qua run đã có hành động cổng — chạy lại nhiều lần KHÔNG được đẻ hàng trùng. Sổ chỉ
ghi thêm và không sửa được, nên một hàng thừa là một hàng sai vĩnh viễn.

Khi không đọc được trạng thái PR (thiếu quyền, mạng hỏng, PR đã bị xoá), hệ thống MUST bỏ qua và nói
ra, TUYỆT ĐỐI không ghi hàng suy đoán.

Cột «người» của hàng đối soát trả lời câu **AI ĐÃ THỰC HIỆN**, không phải ai đã ghi lại (gốc: R6.24b):
hành động do người khác làm ở GitHub, máy chỉ chép lại → cột «người» mang danh tính lấy từ GitHub, hoặc
«không rõ» — KHÔNG mượn tên tài khoản nào của hệ này, và KHÔNG ghi tên tác nhân máy vào đó (máy không
merge gì cả; sổ ghi «ci-bot merge» tự mâu thuẫn với ⛔C1). Việc «máy ghi nhận» thể hiện bằng cờ
`ngoai_cong` và phần mô tả.

*Vì sao phải ghi thành luật: ranh giới với `identity-session`. Đối soát KHÔNG PHẢI một hành động cổng —
nó ghi nhận một hành động đã xảy ra ở nơi khác, chạy trong chu kỳ chế độ trực nên không có phiên người
dùng. Vì thế luật «không phiên thì từ chối hành động cổng» và «mọi chỗ đọc danh tính đi qua một hàm»
KHÔNG áp cho cột «người» của hàng ngoài-cổng: cột ấy chép danh tính của một hệ khác, không đọc danh tính
của hệ này. Ba vòng chấm liên tiếp đã đề nghị đổi cột này sang danh tính hệ thống (M15); ghi ở đây để
vòng thứ tư không phải tái lập lại từ đầu.*

#### Scenario: chạy đối soát hai lần liên tiếp
- **WHEN** đối soát chạy lần thứ hai trên cùng dữ liệu
- **THEN** không hàng sổ mới nào được ghi

#### Scenario: không đọc được trạng thái PR
- **WHEN** lời gọi GitHub lỗi cho PR #23
- **THEN** không hàng nào được ghi cho run của PR #23, và lý do được ghi ra log

#### Scenario: hàng ngoài-cổng ghi đúng người thực hiện
- **WHEN** đối soát thấy PR #40 đã được một người merge trên GitHub
- **THEN** hàng sổ có `ngoai_cong = true` và cột «người» là danh tính GitHub của người đó hoặc «không rõ» —
  không phải `ci-bot`, không phải tài khoản nào của CheckMate
