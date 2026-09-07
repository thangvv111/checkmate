## ADDED Requirements

### Requirement: Khoá `checkmate.yml` là núm của bên BỊ CHẤM, và mọi khoá SHALL kẹp dải

`checkmate.yml` nằm trong repo đích, nên người viết nó là **người đang bị chấm**. Mọi khoá số của
`checkmate.yml` SHALL bị **kẹp vào một dải khai trước**; mọi khoá chuỗi SHALL bị kiểm hình dạng trước
khi dùng.

Giá trị hỏng, sai kiểu, hoặc ngoài dải MUST NOT làm lượt chấm ném. Nó SHALL rơi về mặc định của engine,
và mặc định ấy MUST là giá trị **nghiêm hơn hoặc bằng** giá trị mà repo có thể khai — không được có khoá
nào mà «bỏ trống» lỏng hơn «khai một số».

*Vì sao mặc định phải nghiêm hơn: nếu bỏ trống lỏng hơn khai số thì cách dễ nhất để nới cổng là **làm
hỏng `checkmate.yml`** — một dấu nháy sai là xong, và nó trông y hệt một lỗi gõ vô tình.*

*Vì sao kẹp chứ không từ chối: một số sai dải không được phép giết cả lượt chấm; kẹp rồi khai ra giữ
được lượt chấm mà không giấu.*

#### Scenario: giá trị ngoài dải bị kẹp
- **WHEN** repo khai một khoá số vượt đầu trên của dải
- **THEN** giá trị bị kẹp về đầu dải, và lượt chấm ghi lại giá trị gốc đã bị kẹp

#### Scenario: giá trị sai kiểu rơi về mặc định
- **WHEN** repo khai một khoá số bằng chuỗi, `null`, mảng, hay object
- **THEN** khoá dùng mặc định của engine — MUST NOT ra `NaN` và MUST NOT ném

#### Scenario: làm hỏng file KHÔNG nới được cổng
- **WHEN** `checkmate.yml` hỏng cú pháp YAML
- **THEN** mọi khoá rơi về mặc định, và không khoá nào vì thế mà lỏng hơn so với khi khai hợp lệ

### Requirement: Khoá làm đổi PHÉP CHẤM SHALL đọc từ nhánh gốc

Khoá nào của `checkmate.yml` làm đổi cách lượt chấm được thực hiện — môi trường chạy, lệnh test, nguồn
spec, trần đầu vào, ngưỡng kết luận — SHALL đọc từ **bản trên đĩa của clone ở trạng thái nhánh gốc**,
MUST NOT đọc từ nhánh pull request đang được chấm.

Luật này SHALL áp cho **mọi khoá thuộc loại ấy**, không phải cho từng khoá được nêu tên. Khoá thêm vào
sau này thừa hưởng luật bằng cơ chế, không bằng việc ai đó nhớ ra.

Luật SHALL đối xứng: giá trị của nhánh pull request không có tác dụng **kể cả khi nó nghiêm hơn** nhánh
gốc.

*Vì sao đối xứng: một gác chỉ chặn theo chiều nới là một gác đang đoán ý đồ, và lần sau nó sẽ đoán sai.
Luật là «đọc nhánh gốc», không phải «lấy giá trị nghiêm hơn».*

*Tiền lệ: `sandbox-isolation › Ảnh chạy do repo đích khai, và đọc từ NHÁNH GỐC` đã khai đúng luật này
cho `image`, và lý lẽ của nó nói cùng luật áp cho `runner.test_cmd` và `sources.specs`. Requirement này
nâng nó thành luật chung; nó KHÔNG sửa requirement ấy.*

#### Scenario: pull request nới một khoá cho chính nó
- **WHEN** nhánh pull request sửa `checkmate.yml` nới một khoá đổi phép chấm
- **THEN** lượt chấm áp giá trị của **nhánh gốc**

#### Scenario: pull request siết một khoá cũng không ăn
- **WHEN** nhánh pull request sửa `checkmate.yml` siết một khoá chặt hơn nhánh gốc
- **THEN** lượt chấm vẫn áp giá trị của nhánh gốc — KHÔNG lấy giá trị nghiêm hơn

#### Scenario: repo chưa từng có `checkmate.yml`, pull request thêm mới
- **WHEN** nhánh gốc không có `checkmate.yml` và nhánh pull request thêm file ấy
- **THEN** lượt chấm chạy bằng mặc định của engine — file mới của pull request KHÔNG có tác dụng ở
  lượt chấm chính nó

### Requirement: Khoá làm đổi phép chấm SHALL khai lên verdict kèm nguồn

Mỗi lượt chấm SHALL khai trên verdict giá trị **đã áp** của mọi khoá làm đổi phép chấm, kèm **nguồn**:
mặc định của engine hay `checkmate.yml` của repo đích; và kèm giá trị gốc khi giá trị đã bị kẹp.

*Vì sao đây là lớp phòng thứ ba, không phải một tiện ích: kẹp dải chặn giá trị hoang, đọc nhánh gốc chặn
pull request tự nới — nhưng **hạ chuẩn một cách HỢP LỆ** thì hai lớp ấy đều cho qua, đúng như thiết kế.
Khai lên verdict là thứ duy nhất làm việc hạ chuẩn ấy **nhìn thấy được**. CheckMate phục vụ nhiều đội;
`PASS` của đội chấm theo cấu hình nới và `PASS` của đội chấm theo mặc định trông giống hệt nhau nếu
verdict không nói, và giá trị duy nhất của một cổng là verdict của nó mang cùng một nghĩa ở mọi nơi.*

#### Scenario: repo không khai gì
- **WHEN** repo đích không khai khoá nào
- **THEN** verdict khai giá trị mặc định đã áp, ghi nguồn là mặc định của engine

#### Scenario: repo nới một khoá
- **WHEN** repo đích khai một khoá lỏng hơn mặc định
- **THEN** verdict khai giá trị ấy và ghi nguồn `checkmate.yml` — người đọc phân biệt được với lượt chấm
  theo mặc định

#### Scenario: giá trị bị kẹp thì khai cả hai
- **WHEN** repo khai một giá trị ngoài dải và bị kẹp
- **THEN** verdict khai giá trị đã áp **và** giá trị gốc đã khai

#### Scenario: verdict đời cũ
- **WHEN** đọc verdict ghi trước change này
- **THEN** các khoá của nó đọc ra KHÔNG BIẾT, phân biệt được bằng máy với «đã đo và bằng mặc định»

### Requirement: Mọi khoá `checkmate.yml` engine đọc SHALL có hàng trong sổ khoá, và lưới bắt khoá thiếu hàng

Repo SHALL giữ **một sổ khoá** liệt kê mọi khoá `checkmate.yml` mà engine đọc, mỗi hàng khai: dải kẹp
(hoặc phép kiểm hình dạng) · có đổi phép chấm không (⇒ có phải đọc nhánh gốc không) · có khai lên verdict
không.

Một lưới SHALL đối chiếu **khoá mà cửa đọc thật sự parse** với sổ ấy, và ĐỎ khi có khoá không có hàng.

⛔ Lưới này SHALL chỉ khẳng định điều nó kiểm được bằng máy: **khoá đã được khai và đã có người xét**.
Nó MUST NOT được mô tả như thứ bảo đảm ba lớp phòng đã đúng — «khoá này có cần đọc nhánh gốc không» là
ngữ nghĩa, và một lưới đoán ngữ nghĩa sẽ sai theo cả hai chiều.

*Vì sao chỉ đếm mà không phán: đây đúng loại thứ tư của luật lưới trong `CLAUDE.md` — lưới đúng nhưng
luật sai, chỉ lộ ra khi có người đọc. Sổ khoá làm cho việc đọc ấy có chỗ bám và có thời điểm; nó không
thay được việc đọc. Tiền lệ cùng hình dạng: `docs/identifier-allowlist.md`.*

#### Scenario: thêm khoá mới mà quên khai
- **WHEN** một cửa đọc bắt đầu parse một khoá `checkmate.yml` chưa có hàng trong sổ
- **THEN** lưới ĐỎ và nêu đúng tên khoá còn thiếu hàng

#### Scenario: sổ có hàng thừa
- **WHEN** sổ có hàng cho một khoá không cửa đọc nào còn parse
- **THEN** lưới ĐỎ — sổ mô tả sai hợp đồng thật cũng là một sổ nói dối

#### Scenario: lưới có cặp fixture
- **WHEN** chạy lưới trên fixture khoá-thiếu-hàng và fixture khoá-đủ-hàng
- **THEN** cái thứ nhất ĐỎ, cái thứ hai XANH — lưới quét source phải có cặp fixture
  (`test-grid-integrity`)
