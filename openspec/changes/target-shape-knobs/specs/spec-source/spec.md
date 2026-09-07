## ADDED Requirements

### Requirement: Độ sâu chia đơn vị luật là khoá của repo đích, và mẫu số độ phủ phải khai theo nó

Độ sâu tiêu đề dùng để chia spec thành đơn vị luật SHALL đọc được từ `checkmate.yml` của repo đích, kẹp
vào một dải khai trước, mặc định giữ nguyên giá trị đang chạy hôm nay.

Khoá này SHALL chịu đủ ba lớp của `target-knob-defense`. Riêng lớp **khai lên verdict** là bắt buộc
tuyệt đối ở đây, vì độ sâu chia đơn vị là **mẫu số của phép đo độ phủ luật**: đổi nó thì con số
`x/y đơn vị luật có probe neo vào` đổi nghĩa mà chữ số trông y hệt.

Khoá này MUST NOT làm đổi cách đơn vị luật được đánh địa chỉ — địa chỉ vẫn lấy từ tiêu đề, mã ngắn vẫn
là trường tuỳ chọn, đúng như requirement «Luật là ĐƠN VỊ CÓ ĐỊA CHỈ, không phải một mã có khuôn».

*Vì sao khai lên verdict là bắt buộc ở đây: hai lượt chấm cùng báo «7/12 đơn vị luật có probe» nhưng một
lượt chia tới `###` còn lượt kia chia tới `#####` đang nói hai điều khác nhau. Con số so được với nhau
chỉ khi mẫu số đi kèm nó.*

*Vì sao vẫn phải có trần độ sâu: một spec 30 trang chia tới `#####` vỡ thành hàng trăm đơn vị, và độ phủ
thành mẫu số vô nghĩa theo chiều ngược lại — nới thoải mái không phải là cải thiện.*

#### Scenario: repo không khai độ sâu
- **WHEN** `checkmate.yml` không khai độ sâu chia đơn vị
- **THEN** dùng mặc định đang chạy hôm nay, và verdict khai mẫu số kèm nguồn mặc định

#### Scenario: repo khai độ sâu khác
- **WHEN** repo khai độ sâu trong dải
- **THEN** đơn vị luật chia theo độ sâu ấy, và verdict khai độ sâu đã áp kèm nguồn `checkmate.yml`

#### Scenario: độ sâu không đổi cách đánh địa chỉ
- **WHEN** repo khai độ sâu khác trên một spec không có mã luật nào
- **THEN** mọi đơn vị vẫn có địa chỉ lấy từ tiêu đề, và probe vẫn neo vào được

#### Scenario: khai ngoài dải bị kẹp và bị khai ra
- **WHEN** repo khai độ sâu ngoài dải
- **THEN** giá trị bị kẹp, và verdict khai cả giá trị đã áp lẫn giá trị gốc đã khai

#### Scenario: pull request đổi mẫu số cho chính nó
- **WHEN** nhánh pull request sửa `checkmate.yml` đổi độ sâu, nhánh gốc để mặc định
- **THEN** lượt chấm áp giá trị của nhánh gốc — độ phủ MUST NOT đo bằng mẫu số do chính pull request chọn
