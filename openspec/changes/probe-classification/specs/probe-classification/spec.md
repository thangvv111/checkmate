## ADDED Requirements

### Requirement: Máy phân loại probe theo bảng chân trị hai nhánh

Probe do model đề xuất SHALL được chạy thật trên **hai nhánh** — nhánh pull request và nhánh gốc — và
việc kết luận một probe nói lên điều gì SHALL là việc của **máy**, không phải của model. Model chỉ nhận
nhãn đã dán rồi viết finding dựa trên nhãn đó.

Bảng chân trị (`br` = kết quả nhánh PR, `bs` = kết quả nhánh gốc):

| `br` | `bs` | nhãn | gốc |
|---|---|---|---|
| không có | — | `khong_chay` — MUST NOT suy đoán từ nhánh gốc | R1.1 |
| `skipped` | — | `bo_qua` — MUST NOT tính là `pass` | R1.2 |
| xanh | xanh | `pass` | R1.3 |
| xanh | đỏ | `cai_thien` — PR sửa được lỗi có sẵn | R1.4 |
| đỏ | xanh | `hoi_quy` | R1.5 |
| đỏ | không có | `nghi_van` — MUST NOT phong `hoi_quy` | R1.6 |
| đỏ | đỏ, cùng nguyên nhân | `ngoai_pham_vi` | R1.7 |
| đỏ | đỏ, khác nguyên nhân | `nghi_van` | R1.8 |

`hoi_quy` là trạng thái DUY NHẤT của bảng này đủ tư cách làm bằng chứng chặn merge (cùng với
`vi_pham_luat_moi` ở requirement dưới). Thiếu dữ liệu đối chứng là **thiếu bằng chứng**, không phải bằng
chứng có tội — nên nó thành `nghi_van`, không thành `hoi_quy`.

Nhãn `ngoai_pham_vi` MUST NOT được đọc thành «probe hỏng»: đỏ cả hai nhánh cùng nguyên nhân có thể là
probe sai hợp đồng, cũng có thể là lỗi có sẵn của repo. Nhãn phải trung thực về chỗ máy không biết.

#### Scenario: probe bị vô hiệu hoá
- **WHEN** một probe trả về trạng thái `skipped` trên nhánh PR
- **THEN** nhãn là `bo_qua`, KHÔNG phải `pass` — `it.skip` là đường lách lưới rẻ nhất

#### Scenario: probe không chạy trên nhánh PR
- **WHEN** không có kết quả nào cho probe trên nhánh PR
- **THEN** nhãn là `khong_chay`; máy không suy đoán từ kết quả nhánh gốc

#### Scenario: PR làm gãy hành vi đang đúng
- **WHEN** probe pass trên nhánh gốc và fail trên nhánh PR
- **THEN** nhãn là `hoi_quy`

#### Scenario: nhánh gốc không có kết quả cho probe đỏ
- **WHEN** probe fail trên nhánh PR và nhánh gốc không có kết quả cho probe đó
- **THEN** nhãn là `nghi_van`, KHÔNG phải `hoi_quy`

#### Scenario: lỗi có sẵn của repo
- **WHEN** probe fail trên cả hai nhánh với cùng nguyên nhân
- **THEN** nhãn là `ngoai_pham_vi` — không quy tội pull request, và cũng không kết luận probe hỏng

### Requirement: «Cùng nguyên nhân» quyết bằng vân tay hai tầng

Việc hai kết quả đỏ có **cùng nguyên nhân** hay không SHALL quyết bằng hai tầng vân tay, cả hai chỉ lấy
**dòng đầu** của thông điệp lỗi:

- vân tay **THÔ** gột mọi chữ số, chuỗi hex dài và khoảng trắng thừa — hai lần chạy khác dữ liệu (id khác,
  request id khác) MUST cho cùng vân tay thô (gốc: R1.9);
- vân tay **CHẶT** giữ lại chữ số ngắn (status code, số đếm) nhưng vẫn gột thời lượng `ms`, số dài và hex
  dài — `expected 500 to be 200` và `expected 404 to be 200` MUST ra hai vân tay chặt KHÁC nhau (gốc: R1.10).

Chỉ khi vân tay thô trùng **và** vân tay chặt cũng trùng mới được kết luận `ngoai_pham_vi`; thô trùng mà
chặt khác thì rơi về `nghi_van` để model phân xử (gốc: R1.11). Một tầng là không đủ: gột hết chữ số thì hai
lỗi khác hẳn status code trông giống nhau, và một vi phạm thật bị dán ngoài-phạm-vi rồi loại khỏi finding.

#### Scenario: hai lần chạy khác dữ liệu
- **WHEN** hai kết quả đỏ chỉ khác nhau ở id bản ghi và request id
- **THEN** vân tay thô trùng nhau — khác dữ liệu không phải khác nguyên nhân

#### Scenario: khác status code
- **WHEN** một bên báo `expected 500 to be 200`, bên kia `expected 404 to be 200`
- **THEN** vân tay chặt khác nhau, nhãn là `nghi_van`, KHÔNG phải `ngoai_pham_vi`

#### Scenario: chỉ dòng đầu được xét
- **WHEN** thông điệp lỗi kèm stack trace nhiều dòng khác nhau giữa hai nhánh
- **THEN** vân tay chỉ tính trên dòng đầu, phần stack không làm lệch kết luận

### Requirement: Luật chỉ có ở nhánh PR: nhánh gốc không phải đối chứng hợp lệ

Khi một luật spec **chỉ tồn tại ở nhánh PR**, nhánh gốc MUST NOT được dùng làm đối chứng cho probe neo vào
luật đó (gốc: R1.17). Probe đỏ ở nhánh gốc khi ấy chỉ nói lên rằng luật **chưa từng được thực hiện**, không
nói lên «lỗi có sẵn, ngoài phạm vi PR».

Trong ca đó, probe đỏ ở nhánh PR SHALL mang nhãn `vi_pham_luat_moi`, và nhãn này **chặn merge** như
`hoi_quy` (gốc: R1.18). Lý do chặn không phải «code sai so với một luật cũ» — thứ đó có thể là nợ kỹ thuật
đã biết. Lý do là **pull request tự mâu thuẫn**: nó khai một luật rồi vi phạm ngay chính luật vừa khai,
trong cùng một lần thay đổi.

Nhãn này thay chỗ của `ngoai_pham_vi`/`nghi_van`, MUST NOT thay chỗ của `hoi_quy`: nhánh gốc **pass thật**
là bằng chứng mạnh nhất có thể có, nên khi gốc chạy đúng mà PR làm đỏ thì đó là hồi quy đúng nghĩa.

Probe **hỏng** (lỗi nạp module, sai chữ ký hàm) MUST bị loại trước khi phong nhãn này — nó chưa chạy tới
hành vi cần kiểm nên không kết luận được gì. Phép nhận diện probe hỏng MUST hẹp: mẫu quá rộng sẽ bắt nhầm
lỗi nghiệp vụ tiếng Anh tự nhiên, và một vi phạm THẬT bị loại khỏi `hoi_quy` là vá false-FAIL bằng cách mở
một đường false-PASS.

Hai nhãn cùng chặn merge nhưng nói hai chuyện khác nhau, và người sửa cần biết mình đang sửa cái gì: «PR
làm hỏng thứ đang chạy» khác «PR chưa làm được thứ nó vừa hứa». Nên `vi_pham_luat_moi` MUST được giữ
**riêng trong dữ liệu lượt chấm** — thống kê đếm nó thành một khoá riêng, mỗi hàng đối chiếu mang trạng
thái riêng của nó — và MUST NOT bị thu về `hoi_quy` khi ghi sổ (gốc: R1.20). Dữ liệu giữ riêng thì mọi bề
mặt đọc sổ đều còn đường phân biệt; dữ liệu thu về một thì không bề mặt nào cứu lại được.

*Vì sao thành luật: đo được bằng hai lượt chấm khác nhau đúng một biến — cùng một luật «danh sách trả tối
đa 20 mục», cùng một dòng code vi phạm, ba probe đỏ như nhau trên nhánh PR. Lượt có luật sẵn ở nhánh gốc ra
FAIL; lượt mà PR mang cả luật lẫn code thì ba probe ấy bị dán `ngoai_pham_vi` và verdict ra PASS. Bằng
chứng nằm sẵn trong tay máy, và cổng vẫn xanh.*

#### Scenario: PR mang cả luật lẫn code vi phạm
- **WHEN** probe neo vào một luật chỉ có ở nhánh PR, và probe đỏ trên cả hai nhánh
- **THEN** nhãn là `vi_pham_luat_moi` và nó chặn merge

#### Scenario: nhánh gốc pass thật
- **WHEN** probe neo vào luật mới, pass trên nhánh gốc và đỏ trên nhánh PR
- **THEN** nhãn là `hoi_quy` — bằng chứng đối chứng thắng nhãn luật-mới

#### Scenario: probe hỏng, không phải vi phạm
- **WHEN** probe neo luật mới, đỏ cả hai nhánh, nhưng lỗi mang dấu hiệu nạp module hay sai chữ ký hàm
- **THEN** KHÔNG phong `vi_pham_luat_moi` — probe chưa chạy tới hành vi cần kiểm

#### Scenario: lỗi nghiệp vụ trùng chữ với lỗi kỹ thuật
- **WHEN** thông điệp lỗi nghiệp vụ chứa cụm tiếng Anh tự nhiên giống lỗi kỹ thuật
- **THEN** nó KHÔNG bị nhận là probe hỏng — vá false-FAIL không được mở đường false-PASS

#### Scenario: luật mới mà probe xanh
- **WHEN** probe neo luật mới và pass trên nhánh PR
- **THEN** nhãn là `pass` — luật mới không tự nó thành lỗi

#### Scenario: sổ giữ hai nhãn riêng
- **WHEN** một lượt chấm ghi thống kê và bảng đối chiếu probe
- **THEN** `vi_pham_luat_moi` là một khoá đếm riêng, tách khỏi `hoi_quy`, và trạng thái từng hàng đối chiếu
  giữ nguyên nhãn máy đã dán

### Requirement: Nhánh gốc không chạy được probe nào là ca bình thường, và phải nói ra

Pull request **thêm module mới** thì nhánh gốc chưa có file đó, nên nhánh gốc không chạy được probe nào.
Đây là ca BÌNH THƯỜNG, không phải hỏng (gốc: R1.14): máy vẫn dán nhãn đúng theo bảng chân trị — thiếu đối
chứng thì `nghi_van`, không phong hồi quy.

Trong ca đó, lượt **sinh lại probe** MUST được cho biết rằng nhánh gốc không có đối chứng, và rằng probe đỏ
ở đây nhiều khả năng là **probe sai giả định** chứ không phải code sai (gốc: R1.15). Không nói ra thì model
tưởng mình import sai đường và đi sửa nhầm chỗ — mất trọn một lượt sinh lại.

Prompt sinh lại cũng MUST nói rằng muốn lượt chấm có cơ sở thì probe phải **chạy được và pass trên nhánh
PR**. Việc cưỡng chế «không có bằng chứng thì không ra verdict» thuộc `verdict-contract › PASS phải có bằng
chứng` (gốc R1.16 nằm ở đó, không lặp lại ở đây).

#### Scenario: nhánh gốc không chạy được probe nào
- **WHEN** lượt chấm sinh lại probe sau khi nhánh gốc không cho ra kết quả nào
- **THEN** prompt sinh lại nói rõ nhánh gốc không có đối chứng, mọi probe đỏ thành nghi vấn chứ không thành
  hồi quy, và probe đỏ ở đây nhiều khả năng là probe sai giả định

#### Scenario: nhánh gốc CÓ đối chứng
- **WHEN** lượt sinh lại xảy ra khi nhánh gốc vẫn chạy được probe
- **THEN** prompt KHÔNG chứa lời cảnh báo về việc thiếu đối chứng — nói thừa cũng là nói sai
