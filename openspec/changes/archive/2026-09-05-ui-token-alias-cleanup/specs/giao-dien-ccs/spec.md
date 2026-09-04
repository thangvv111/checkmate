## MODIFIED Requirements

### Requirement: Token có đúng một nguồn, và hai họ token không được trộn

Giao diện SHALL lấy mọi màu, phông, khoảng cách, bo góc từ **biến token**, không hard-code giá trị.
Hệ thống có **hai họ token, vai khác nhau**, và MUST NOT trộn:

- **Token hệ thống (Modernist)** — nền, chữ, accent, ramp trung tính, divider, shadow. Đây là look của
  design system; đổi look là đổi ở đây.
- **Semantic của CheckMate** — PASS/jade · FAIL/crimson · medium/amber. Ba màu này mang **nghĩa
  nghiệp vụ**, không phải trang trí: chúng nói verdict và mức severity.

Accent của hệ thống và màu FAIL đều là sắc đỏ nhưng MUST giữ biến riêng. Gộp chúng làm một là để một
lần đổi look kéo theo đổi nghĩa của verdict — nút «bấm đi» và nhãn «hỏng rồi» sẽ cùng đổi màu.

Bộ semantic SHALL chỉ dùng cho **kết quả của một phép kiểm** — đạt, hỏng, hoặc cảnh báo. Trạng thái của
giao diện — đang chọn · đang dùng · đang xem · vừa lưu · một con số đếm — SHALL dùng accent và ramp trung
tính, MUST NOT dùng bộ semantic.

Giao diện MUST NOT khai **bí danh** nối một tên thuộc họ này sang một token thuộc họ kia. Cấm hard-code
mã màu là chưa đủ: một bí danh đi qua tên biến chứ không qua mã màu, nên nó lọt qua mọi phép cấm hex mà
vẫn trộn đúng hai họ.

*Vì sao phải cấm riêng bí danh — đo được: bản trước của luật này chỉ cấm hard-code, và một khối bí danh
(`--teal: var(--pass)`, `--amber: var(--medium)`, …) đã đưa **38 chỗ** trong giao diện đi vòng qua nó.
Trong đó có tag «đang chọn», tag «đang dùng», mục nav đang mở, card «đã lưu» và một con số đếm — tất cả
đang tô bằng đúng màu PASS. Lưới xanh suốt thời gian đó vì nó soi mã màu, mà chỗ hỏng không có mã màu nào.*

*Hướng rò cũng đáng ghi: scenario «đổi accent không đổi nghĩa verdict» canh một chiều, còn bí danh làm
hỏng chiều KIA — đổi màu PASS sẽ đổi màu của «đang chọn».*

#### Scenario: hard-code màu ngoài bộ semantic
- **WHEN** một file giao diện viết thẳng mã màu không thuộc bộ semantic đã khai
- **THEN** lưới token ĐỎ, nêu file và mã màu đó

#### Scenario: semantic được phép hard-code
- **WHEN** một file dùng đúng hex của PASS/FAIL/medium đã khai trong bộ semantic
- **THEN** lưới token XANH — gói design khai đây là hard-code có chủ đích

#### Scenario: đổi accent không đổi nghĩa verdict
- **WHEN** giá trị accent của hệ thống đổi
- **THEN** màu PASS/FAIL/medium giữ nguyên

#### Scenario: đổi màu PASS không đổi vẻ của trạng thái giao diện
- **WHEN** giá trị của màu PASS đổi
- **THEN** tag «đang chọn», tag «đang dùng», mục điều hướng đang mở và card «đã lưu» giữ nguyên vẻ —
  không chỗ nào trong số đó lấy màu từ bộ semantic

#### Scenario: khai bí danh trộn hai họ
- **WHEN** một biến mang tên thuộc họ look được khai bằng một token thuộc bộ semantic (hoặc ngược lại)
- **THEN** lưới token ĐỎ, nêu tên biến và token nó trỏ tới

#### Scenario: bí danh trong CÙNG một họ
- **WHEN** một biến look được khai bằng một token look khác (ví dụ tên cũ nối vào tên mới cùng họ)
- **THEN** lưới token XANH — đổi tên biến trong cùng một họ không trộn nghĩa gì
