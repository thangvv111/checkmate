## ADDED Requirements

### Requirement: Sổ dùng chung được bảo vệ HAI lớp — khoá cho cuộc đua, ghi atomic cho cái chết giữa chừng

Nạp probe vào thư viện là chuỗi **đọc → sửa → ghi** trên một file sổ dùng chung, và toàn bộ chuỗi ấy SHALL
chạy trong khoá.

Khoá SHALL được nhả cả khi phần việc bên trong ném lỗi.

Khoá của một tiến trình đã chết SHALL bị phá sau một ngưỡng quá hạn.

Việc ghi sổ SHALL atomic — ghi ra file tạm rồi đổi tên, không ghi đè trực tiếp.

*Vì sao cần cả hai lớp, chúng chống hai thứ khác nhau:*

*Khoá chống **cuộc đua**: hai lượt cùng đọc sổ rồi cùng ghi thì lượt ghi sau xoá mất mục của lượt trước —
không lỗi nào được ném, chỉ mất một probe.*

*Ghi atomic chống **cái chết giữa chừng**: một `writeFileSync` bị kill hoặc mất điện ở giữa để lại sổ cụt.
Khoá không cứu được ca này vì tiến trình chết khi đang GIỮ khoá — nó vừa để lại sổ hỏng vừa để lại khoá kẹt.
Đó là lý do phải có ngưỡng phá khoá quá hạn, và vì sao nhả khoá phải nằm ở nhánh dọn dẹp chứ không ở cuối
đường thành công.*

#### Scenario: hai lượt cùng nạp probe
- **WHEN** hai tiến trình cùng nạp vào một thư viện
- **THEN** mỗi lượt đọc–sửa–ghi trọn vẹn trong khoá

#### Scenario: việc bên trong ném lỗi
- **WHEN** phần việc trong khoá ném
- **THEN** khoá vẫn được nhả

#### Scenario: khoá của tiến trình đã chết
- **WHEN** một khoá cũ hơn ngưỡng quá hạn
- **THEN** khoá bị phá và lượt hiện tại đi tiếp

#### Scenario: ghi sổ bị cắt giữa chừng
- **WHEN** ghi sổ thư viện
- **THEN** nội dung được ghi ra file tạm rồi đổi tên, không có trạng thái sổ cụt

### Requirement: Hạt nạp là TỪNG PROBE, và thư viện đời bộ được di trú tự động

Đơn vị nạp, lưu và đào thải của thư viện SHALL là **một probe**, không phải cả file của lượt chấm.

File của từng probe SHALL được tách ra từ file chung mà lượt chấm sinh.

Thư viện lưu theo định dạng đời cũ (theo bộ) SHALL được di trú sang định dạng theo probe **tự động ở lần đọc
đầu**, và di trú SHALL chạy đúng một lần — đọc lại không nhân đôi.

*Vì sao hạt là probe chứ không phải bộ: một file lượt chấm chứa nhiều probe, trong đó thường chỉ vài cái
đáng giữ. Giữ cả bộ nghĩa là mỗi lần nạp kéo theo cả những probe vô giá trị, và trần thư viện đầy bằng rác.
Quan trọng hơn: gỡ trùng và đào thải chỉ có nghĩa ở mức probe — hai bộ khác nhau gần như không bao giờ trùng
nhau hoàn toàn, nên ở mức bộ thì mọi phép so đều vô dụng.*

*Vì sao di trú tự động chứ không bắt người vận hành chạy lệnh: thư viện là dữ liệu tích luỹ trên máy chủ
đang chạy. Một bước thủ công ở đây nghĩa là có máy chủ chạy đời mới trên dữ liệu đời cũ, và nhánh đọc đời
cũ sẽ sống mãi trong code vì không ai dám bỏ.*

#### Scenario: nạp probe từ một lượt chấm
- **WHEN** một lượt chấm sinh file chứa nhiều probe
- **THEN** từng probe được tách ra và nạp riêng

#### Scenario: đọc thư viện đời cũ
- **WHEN** thư viện còn ở định dạng theo bộ
- **THEN** nó được di trú sang định dạng theo probe ngay ở lần đọc đầu

#### Scenario: đọc lại sau khi đã di trú
- **WHEN** thư viện đã di trú được đọc lại
- **THEN** không probe nào bị nhân đôi

### Requirement: Trần đếm theo probe, và đào thải chọn nạn nhân theo ĐIỂM bốn nấc

Trần thư viện SHALL đếm theo số probe.

Khi vượt trần, nạn nhân SHALL được chọn theo bốn nấc, xét lần lượt: probe **chết kéo dài** → probe **flaky**
cao nhất → probe **cũ nhất chưa từng bắt hồi quy** → cũ nhất tuyệt đối.

Probe từng bắt hồi quy SHALL mang cờ vĩnh viễn, không trôi theo trần lịch sử.

Điểm flaky SHALL đếm số lần **cùng một sha lượt chấm cho ra hai trạng thái khác nhau**.

Nấc thứ tư SHALL tồn tại như van chống kẹt: khi mọi probe đều được miễn trừ, vẫn phải chọn được một nạn nhân.

*Vì sao không dùng FIFO: loại theo tuổi là loại đúng **probe im lặng lâu năm** — mà một probe an toàn canh
đúng một biên chưa ai phá thì im lặng là hành vi ĐÚNG của nó, không phải dấu hiệu vô dụng. Điểm chỉ nhìn tín
hiệu **xấu đo được** (chết kéo dài, flaky) và miễn trừ thành tích thật (đã bắt hồi quy).*

*Vì sao cờ phải vĩnh viễn: nếu «từng bắt hồi quy» đọc từ lịch sử có trần 20 lượt, thì một probe bắt được lỗi
thật ở lượt thứ 21 trước đó sẽ **mất thành tích** và bị đào thải như probe thường. Thành tích không được
phép trôi theo cửa sổ trượt.*

*Vì sao nấc bốn: kho toàn hàng miễn trừ mà không có van thì trần không bao giờ giải phóng được — kho hoá
thạch, và probe mới không bao giờ vào được.*

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

### Requirement: Gỡ trùng bốn tầng — cơ học trước, model sau, và nghiêng về GIỮ

Probe mới trùng **cả ba** (commit sinh, id, và luật spec) với probe đã có SHALL bị coi là bản chạy-lại và
không được nạp.

Probe mới có luật spec **giao** với probe đã có SHALL vào diện nghi, và chỉ diện nghi mới được đưa ra hỏi
model.

Model SHALL được hỏi bằng đúng một câu hẹp, và phán xử của nó SHALL chỉ được dùng để **bỏ** khi nó vừa chắc
chắn vừa trỏ đúng một ứng viên trong diện nghi.

*Vì sao cơ học đứng trước: hai tầng đầu không tốn lời gọi model nào và đã loại phần lớn ca. Hỏi model cho
mọi cặp là trả tiền cho một câu trả lời mà phép so chuỗi đã biết.*

*Vì sao nghiêng về GIỮ: bỏ nhầm một probe là mất vĩnh viễn một phép kiểm đã chạy thật; giữ nhầm một probe
trùng chỉ tốn vài giây mỗi lượt. Hai sai lầm này không cùng giá, nên ngưỡng phải lệch — model trả lời mơ
hồ, trỏ tên ngoài diện nghi, hay không trả lời được thì ứng viên **được giữ**.*

#### Scenario: probe là bản chạy-lại cùng commit
- **WHEN** trùng cả commit sinh, id và luật spec
- **THEN** probe bị bỏ với lý do bản chạy-lại

#### Scenario: luật spec giao nhau
- **WHEN** probe mới neo vào luật giao với probe đã có
- **THEN** nó vào diện nghi và được đưa ra hỏi model

#### Scenario: model trả lời mơ hồ hoặc trỏ sai
- **WHEN** phán xử không chắc chắn, trỏ tên ngoài diện nghi, hoặc thiếu ứng viên
- **THEN** probe được GIỮ

### Requirement: Lịch sử hành vi là BẰNG CHỨNG, và không phải nhãn nào cũng tính

Mỗi probe thư viện SHALL tích luỹ lịch sử kết quả theo từng lượt chấm; cùng một lượt chạy lại SHALL thay bản
ghi cũ chứ không nhân đôi.

Lịch sử SHALL có trần số lượt gần nhất.

Phép so hành vi giữa hai probe SHALL chỉ tính những lượt mà trạng thái nói về **hành vi riêng của probe**;
nhãn phản ánh hoàn cảnh chung MUST NOT được tính.

Hai probe cùng `pass` mãi MUST NOT được coi là bằng chứng chúng trùng nhau.

*Vì sao loại nhãn hoàn cảnh: khi cả lượt chấm hỏng vì môi trường — mất mạng, hết khoá model, sandbox dựng
sai — thì mọi probe cùng mang một nhãn. Tính nó vào phép so hành vi là kết luận «hai probe giống nhau» từ
một sự kiện chẳng nói gì về probe nào cả.*

*Vì sao cùng xanh không phải bằng chứng: hai probe cùng `pass` suốt chỉ chứng minh **chưa có gì xảy ra**.
Gỡ một trong hai dựa trên đó là bỏ đúng thứ chưa được thử thách — và nếu cái bị bỏ là cái duy nhất canh một
biên, thì lần biên ấy vỡ sẽ không ai bắt.*

#### Scenario: cùng một lượt chạy lại
- **WHEN** cùng một sha lượt chấm được ghi lần thứ hai
- **THEN** bản ghi cũ bị thay, lịch sử không nhân đôi

#### Scenario: cả lượt hỏng vì hoàn cảnh chung
- **WHEN** nhiều probe cùng mang nhãn phản ánh hoàn cảnh
- **THEN** những lượt ấy không được tính vào phép so hành vi

#### Scenario: hai probe cùng xanh suốt
- **WHEN** hai probe có lịch sử toàn `pass` giống hệt nhau
- **THEN** không probe nào bị gỡ

### Requirement: Máy tách phải hiểu regex literal khi đếm ngoặc

Khi tách một probe khỏi file chung, phép đếm ngoặc để tìm biên khối SHALL nhận diện **regex literal**, và
ngoặc nằm trong regex MUST NOT được tính là ngoặc cấu trúc.

*Vì sao: một probe chứa `/x\)/` làm phép đếm ngoặc lệch một đơn vị, và khối bị cắt cụt giữa chừng. File tách
ra vẫn là file hợp lệ về mặt tên — nó chỉ thiếu nửa cuối. Nạp nó vào thư viện là nạp một probe **không chạy
được**, và lượt sau nó đỏ với lý do cú pháp; người đọc thấy một finding nói code đích có lỗi, trong khi lỗi
nằm ở phép cắt.*

#### Scenario: probe chứa regex literal có ngoặc
- **WHEN** tách một probe mà thân nó chứa regex literal mang ngoặc
- **THEN** khối được cắt trọn vẹn, không cụt giữa chừng
