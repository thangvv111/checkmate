## ADDED Requirements

### Requirement: Trần kích thước diff là khoá của repo đích, kẹp dải và khai lên verdict

Trần kích thước diff SHALL đọc được từ `checkmate.yml` của repo đích, kẹp vào một dải khai trước, mặc
định giữ nguyên giá trị đang chạy hôm nay. Khoá này làm đổi **đầu vào của phép chấm**, nên nó chịu đủ ba
lớp của `target-knob-defense`: kẹp dải · đọc từ nhánh gốc · khai lên verdict kèm nguồn.

Nới trần MUST NOT làm mất khai báo file ngoài tầm nhìn: mọi file bị bỏ vẫn được trả về kèm tên, kích
thước và lý do, đúng như requirement «Mọi file bị bỏ đều được trả về kèm tên, kích thước và lý do».

*Vì sao repo đích được khai: một monorepo có diff lớn hơn một cách chính đáng, và trần cứng của engine
biến «PR này lớn» thành «engine không nhìn thấy phần lớn PR này» mà không ai chọn điều đó. Nhưng trần là
**ngân sách prompt của bên chấm**, nên nới nó là chuyện phải nhìn thấy được — do đó bắt buộc khai lên
verdict.*

#### Scenario: repo không khai trần
- **WHEN** `checkmate.yml` không khai trần diff
- **THEN** dùng mặc định đang chạy hôm nay, verdict ghi nguồn là mặc định của engine

#### Scenario: repo nới trần
- **WHEN** repo khai trần rộng hơn mặc định, trong dải
- **THEN** lượt chấm áp trần ấy, và verdict khai giá trị kèm nguồn `checkmate.yml`

#### Scenario: nới trần vẫn phải khai file bị bỏ
- **WHEN** trần đã nới mà diff vẫn vượt
- **THEN** file bị bỏ vẫn được trả về đủ tên, kích thước và lý do — không vì đã nới mà thôi khai

#### Scenario: pull request tự nới trần cho chính nó
- **WHEN** nhánh pull request sửa `checkmate.yml` nới trần, nhánh gốc để mặc định
- **THEN** lượt chấm áp giá trị của nhánh gốc
