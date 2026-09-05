## MODIFIED Requirements

### Requirement: Gỡ trùng bốn tầng — cơ học trước, model sau, và nghiêng về GIỮ

Probe mới trùng **cả ba** (commit sinh, id, và luật spec) với probe đã có SHALL bị coi là bản chạy-lại và
không được nạp.

Probe mới có luật spec **giao** với probe đã có SHALL vào diện nghi, và chỉ diện nghi mới được đưa ra hỏi
model.

Model SHALL được hỏi bằng đúng một câu hẹp, và phán xử của nó SHALL chỉ được dùng để **bỏ** khi nó vừa chắc
chắn vừa trỏ đúng một ứng viên trong diện nghi.

Mỗi quyết định **gỡ một probe đã có** SHALL để lại một bản ghi trong sổ thư viện, mang đủ: probe bị gỡ,
probe được giữ, lý do, bằng chứng, và thời điểm. Sổ ấy SHALL **chỉ ghi thêm** — bản ghi cũ MUST NOT bị sửa
hay xoá khi thư viện thay đổi, kể cả khi probe được giữ về sau bị đào thải.

*Vì sao cơ học đứng trước: hai tầng đầu không tốn lời gọi model nào và đã loại phần lớn ca. Hỏi model cho
mọi cặp là trả tiền cho một câu trả lời mà phép so chuỗi đã biết.*

*Vì sao nghiêng về GIỮ: bỏ nhầm một probe là mất vĩnh viễn một phép kiểm đã chạy thật; giữ nhầm một probe
trùng chỉ tốn vài giây mỗi lượt. Hai sai lầm này không cùng giá, nên ngưỡng phải lệch — model trả lời mơ
hồ, trỏ tên ngoài diện nghi, hay không trả lời được thì ứng viên **được giữ**.*

*Vì sao phải ghi lại: gỡ một probe là thay đổi VĨNH VIỄN một tài sản, và hôm nay quyết định ấy được tính
rồi vứt đi — verdict của lượt chấm chỉ giữ `probe_id · action · reason`, tức mất đúng vế «giữ cái nào» và
mất bằng chứng. Người vận hành nhìn thư viện sáu tháng sau không có cách nào biết vì sao một probe biến
mất, và không có cách nào phản bác một lần gỡ sai. Một hệ thống tồn tại để đòi bằng chứng thì chính nó
không được ra quyết định một chiều mà không để lại bằng chứng.*

#### Scenario: probe là bản chạy-lại cùng commit
- **WHEN** trùng cả commit sinh, id và luật spec
- **THEN** probe bị bỏ với lý do bản chạy-lại

#### Scenario: luật spec giao nhau
- **WHEN** probe mới neo vào luật giao với probe đã có
- **THEN** nó vào diện nghi và được đưa ra hỏi model

#### Scenario: model trả lời mơ hồ hoặc trỏ sai
- **WHEN** phán xử không chắc chắn, trỏ tên ngoài diện nghi, hoặc thiếu ứng viên
- **THEN** probe được GIỮ

#### Scenario: một probe đã có bị gỡ vì trùng lặp
- **WHEN** một probe đang nằm trong thư viện bị gỡ vì trùng với probe khác
- **THEN** sổ thư viện có thêm một bản ghi nêu probe bị gỡ, probe được giữ, lý do và bằng chứng

#### Scenario: thư viện đổi sau khi đã ghi sổ gỡ
- **WHEN** probe được giữ về sau bị đào thải hoặc thư viện được nạp thêm
- **THEN** các bản ghi gỡ đã có vẫn nguyên vẹn, không bản nào bị sửa hay xoá

#### Scenario: probe MỚI không được nạp
- **WHEN** một probe mới bị từ chối nạp vì trùng
- **THEN** đó không phải một lần gỡ, và MUST NOT được ghi vào sổ gỡ như một probe đã bị xoá khỏi thư viện

### Requirement: Trần đếm theo probe, và đào thải chọn nạn nhân theo ĐIỂM bốn nấc

Trần thư viện SHALL đếm theo số probe.

Khi vượt trần, nạn nhân SHALL được chọn theo bốn nấc, xét lần lượt: probe **chết kéo dài** → probe **flaky**
cao nhất → probe **cũ nhất chưa từng bắt hồi quy** → cũ nhất tuyệt đối.

Probe từng bắt hồi quy SHALL mang cờ vĩnh viễn, không trôi theo trần lịch sử.

Điểm flaky SHALL đếm số lần **cùng một sha lượt chấm cho ra hai trạng thái khác nhau**.

Nấc thứ tư SHALL tồn tại như van chống kẹt: khi mọi probe đều được miễn trừ, vẫn phải chọn được một nạn nhân.

Mỗi lần đào thải SHALL để lại một bản ghi trong **cùng** sổ gỡ append-only với các lần gỡ vì trùng lặp, mang
đủ: probe bị gỡ, nấc đã chọn nó, và thời điểm. Bản ghi SHALL phân biệt được đào-thải-vì-trần với gỡ-vì-trùng
— hai lý do khác nhau thì người đọc phải đọc ra hai điều khác nhau.

*Vì sao không dùng FIFO: loại theo tuổi là loại đúng **probe im lặng lâu năm** — mà một probe an toàn canh
đúng một biên chưa ai phá thì im lặng là hành vi ĐÚNG của nó, không phải dấu hiệu vô dụng. Điểm chỉ nhìn tín
hiệu **xấu đo được** (chết kéo dài, flaky) và miễn trừ thành tích thật (đã bắt hồi quy).*

*Vì sao cờ phải vĩnh viễn: nếu «từng bắt hồi quy» đọc từ lịch sử có trần 20 lượt, thì một probe bắt được lỗi
thật ở lượt thứ 21 trước đó sẽ **mất thành tích** và bị đào thải như probe thường. Thành tích không được
phép trôi theo cửa sổ trượt.*

*Vì sao nấc bốn: kho toàn hàng miễn trừ mà không có van thì trần không bao giờ giải phóng được — kho hoá
thạch, và probe mới không bao giờ vào được.*

*Vì sao phải ghi lại: đo được hôm nay, đào thải vì trần để lại dấu vết duy nhất là một dòng `console.log`
trên máy chủ — verdict của lượt chấm không mang nó. Người vận hành thấy thư viện tụt từ 89 xuống 40 không có
cách nào biết cái gì đã đi, chứ đừng nói vì sao. Đó là mất tài sản trong im lặng, và im lặng ở đây tệ hơn ở
ca gỡ-trùng vì đào thải xảy ra hàng loạt.*

#### Scenario: thư viện vượt trần và có probe chết kéo dài
- **WHEN** vượt trần
- **THEN** probe chết kéo dài bị loại trước

#### Scenario: không có probe chết nhưng có probe flaky
- **WHEN** vượt trần và có probe flaky
- **THEN** probe flaky cao nhất bị loại

#### Scenario: probe từng bắt hồi quy
- **WHEN** chọn nạn nhân ở nấc ba
- **THEN** probe từng bắt hồi quy được miễn trừ

#### Scenario: mọi probe đều được miễn trừ
- **WHEN** cả kho toàn probe từng bắt hồi quy
- **THEN** van nấc bốn mở và cũ nhất tuyệt đối bị loại

#### Scenario: một probe bị đào thải vì trần
- **WHEN** thư viện vượt trần và một probe bị loại
- **THEN** sổ gỡ có thêm bản ghi nêu probe ấy, nấc đã chọn nó, và thời điểm

#### Scenario: người đọc phân biệt hai lý do gỡ
- **WHEN** sổ gỡ có cả bản ghi vì trần lẫn bản ghi vì trùng lặp
- **THEN** hai loại đọc ra khác nhau, không bị trình bày như cùng một chuyện
