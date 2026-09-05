# probe-library Specification

## Purpose
TBD - created by archiving change probe-library. Update Purpose after archive.

## Requirements

### Requirement: Tên file probe suy từ NỘI DUNG, và hậu tố nới dài ra khi còn đụng

Tên file của một probe trong thư viện SHALL suy từ nội dung của nó — commit sinh cộng hash code — và MUST
NOT suy từ số thứ tự hay số đếm.

Khi tên tính ra đã thuộc về một probe có **hash khác**, hậu tố hash SHALL được nới dài cho tới khi hết đụng.

*Vì sao: hai lượt chấm song song cùng chấm một commit sẽ sinh probe cùng lúc. Tên theo số thứ tự thì cả hai
tính ra cùng một số và ghi đè file của nhau. Tên theo hash thì chỉ đụng khi nội dung giống hệt — nhưng hậu
tố cắt ngắn 6 hex vẫn đụng được giữa hai probe KHÁC nội dung, và đụng ở đây nghĩa là một probe ghi đè file
của probe kia **trong im lặng**: sổ vẫn có hai mục, đĩa chỉ còn một file, và lượt sau chạy hai mục ấy trên
cùng một nội dung mà không ai biết.*

#### Scenario: nạp hai probe khác nội dung cùng một commit
- **WHEN** hai probe khác nội dung được nạp với cùng `sha_sinh`
- **THEN** hai tên file khác nhau, mỗi tên mang hash của chính probe đó

#### Scenario: tên tính ra đã thuộc probe có hash khác
- **WHEN** sổ đã có một mục mang đúng tên mà probe mới tính ra, nhưng hash khác
- **THEN** probe mới nhận tên có hậu tố hash DÀI HƠN, và không file nào bị ghi đè

#### Scenario: tên không mang số thứ tự
- **WHEN** đọc tên file của một probe thư viện
- **THEN** tên suy từ commit sinh và hash, không chứa số đếm theo thứ tự nạp

### Requirement: Chờ khoá hết giờ thì VẪN làm việc, không bỏ probe

Khi không lấy được khoá thư viện trong thời hạn chờ, đường nạp SHALL vẫn chạy phần việc bên trong.

*Vì sao: hai lựa chọn khi hết giờ chờ là «bỏ probe» và «đua nhau ghi». Bỏ probe là mất vĩnh viễn một probe
đã bắt được lỗi thật — thiệt hại một chiều. Đua nhau ghi thì tệ nhất là một mục sổ bị mất trong lần ghi
cuối, và lượt sau sinh lại được. Chọn cái đảo-ngược-được.*

#### Scenario: khoá bị tiến trình khác giữ suốt thời hạn chờ
- **WHEN** khoá còn tươi và không được nhả trong suốt thời hạn chờ
- **THEN** phần việc bên trong VẪN chạy, và giá trị của nó được trả về

#### Scenario: khoá được nhả bình thường
- **WHEN** phần việc chạy xong, kể cả khi nó ném lỗi
- **THEN** khoá được nhả để lượt sau vào được

### Requirement: Code probe ở lại dạng FILE vì nó là mã nguồn phải chạy được

Code của probe thư viện SHALL được lưu thành file trên đĩa, và MUST NOT được chuyển vào bảng cơ sở dữ liệu.

*Vì sao: đây là ngoại lệ CÓ CHỦ ĐÍCH của luật «mọi truy cập dữ liệu đi qua lớp kho» (`data-layer`). Probe
không phải bản ghi — nó là mã nguồn mà một trình chạy test phải nạp được từ đĩa. Đưa nó vào bảng thì mỗi
lượt chấm phải ghi ngược ra file tạm trước khi chạy, tức thêm một bước có thể hỏng vào đúng đường nóng, để
đổi lấy một tính chất (truy vấn được) mà không ai cần ở đây.*

#### Scenario: nạp một probe rồi đọc lại
- **WHEN** một probe được nhận vào thư viện
- **THEN** file của nó có mặt trên đĩa và đọc lại được nguyên văn code

#### Scenario: không đường nào đưa code probe vào bảng
- **WHEN** rà lớp thư viện probe
- **THEN** không chỗ nào ghi code probe vào cơ sở dữ liệu

### Requirement: Probe tách ra là artifact MỚI chưa từng chạy, và phải chạy sạch trước khi được nạp

Một probe tách từ file của lượt chấm SHALL vào thư viện với lịch sử **rỗng**, và SHALL phải chạy sạch một
mình trên nhánh gốc trước khi được nhận.

*Vì sao: file gốc chạy được KHÔNG chứng minh mảnh tách ra chạy được — mảnh có thể mất một helper cấp module,
mất một import, hoặc dính nửa khối của probe anh em. Nạp mù một mảnh như thế thì lượt sau nhận một finding
sai hoàn toàn về bản chất: không phải «code có lỗi» mà là «probe không chạy nổi». Và lịch sử phải rỗng vì
mảnh này chưa từng chạy dưới dạng đó — mang lịch sử của file gốc sang là gán bằng chứng của một artifact
cho một artifact khác.*

#### Scenario: probe mới được nhận
- **WHEN** một probe vào thư viện
- **THEN** lịch sử hành vi của nó rỗng

#### Scenario: mảnh tách không chạy sạch một mình
- **WHEN** file tách chạy trên nhánh gốc mà không `passed`
- **THEN** probe đó bị bỏ, kèm lý do nói rõ là «không chạy sạch một mình», không phải lỗi của code đích

### Requirement: Lời gọi model phân xử trùng lặp nằm NGOÀI khoá thư viện

Lời gọi model để phân xử hai probe có trùng nhau SHALL nằm ngoài khoá thư viện. Lớp thư viện MUST NOT gọi
model từ trong khoá.

Việc kiểm trùng SHALL được làm **lại** bên trong khoá, vì phán xử của model tính trên trạng thái đọc lúc
ngoài khoá và trạng thái ấy có thể đã đổi.

*Vì sao: một lời gọi model mất từ vài giây tới vài phút. Giữ khoá suốt thời gian đó làm mọi lượt chấm song
song đứng chờ, rồi lần lượt hết giờ chờ — tức biến một tối ưu (hỏi model cho chắc) thành một điểm nghẽn
toàn hệ. Hiện điều này chỉ được ghi bằng một comment: chuyển lời gọi vào trong khoá thì không có gì đỏ.*

#### Scenario: lớp thư viện không biết tới model
- **WHEN** rà `probe-library.ts`
- **THEN** không có import hay lời gọi nào tới lớp model

#### Scenario: thứ tự ở đường nạp
- **WHEN** một lượt chấm nạp probe sau khi hỏi model phân xử
- **THEN** lời gọi model đứng TRƯỚC vòng nạp, và vòng nạp tự kiểm trùng lại trong khoá

### Requirement: Trần thư viện đọc từ biến môi trường chỉ nhận số nguyên sạch, và bị kẹp hai đầu

Trần số probe SHALL đọc từ biến môi trường; giá trị không phải số nguyên sạch SHALL bị bỏ qua để dùng mặc
định, và giá trị hợp lệ SHALL bị kẹp trong khoảng đã chốt.

*Vì sao: một giá trị hỏng bị đoán thành số sẽ ra trần nhỏ bất thường — `parseInt('3abc')` cho 3 — và một
trần nhỏ nghĩa là **đào thải phần lớn thư viện ngay lượt sau**, mất vĩnh viễn những probe đã bắt được lỗi
thật. Kẹp cận dưới để một trần đặt quá thấp không xoá gần hết kho; kẹp cận trên để một trần đặt quá cao
không làm mỗi lượt chấm phải chạy hàng nghìn probe.*

#### Scenario: giá trị không phải số nguyên sạch
- **WHEN** biến môi trường mang giá trị không phải số nguyên sạch
- **THEN** trần lấy giá trị mặc định, KHÔNG đoán phần đầu của chuỗi

#### Scenario: giá trị dưới cận
- **WHEN** biến môi trường mang một số nguyên nhỏ hơn cận dưới
- **THEN** trần bị kẹp lên cận dưới, không dùng số đã đặt

### Requirement: Đọc thư viện ngoài khoá phải chịu được file bị lượt song song dọn

Đường đọc thư viện SHALL bỏ qua mục nào có file đã mất, và MUST NOT làm đổ lượt chấm.

Đường đọc thư viện **cho một lượt chấm** SHALL bỏ qua mục nào mang **dấu cách ly**. Dấu ấy MUST NOT làm
mục biến mất khỏi các đường đọc khác — bề mặt đọc của người vận hành vẫn phải thấy nó, kèm lý do.

*Vì sao tách hai đường đọc: probe bị cách ly là probe **không chạy được**, nên để nó vào lượt chấm là lặp
lại đúng lỗi đã làm chết năm lượt trên prod. Nhưng giấu nó khỏi màn thư viện thì người vận hành mất đúng
thứ họ cần để sửa — và một probe biến mất không lời giải thích là thứ change trước vừa mất công đóng lại.*

*Vì sao: đọc diễn ra ngoài khoá, nên giữa lúc đọc sổ và lúc đọc file, một lượt song song có thể đã đào thải
đúng probe ấy. Mất một probe thư viện ở lượt này là thiệt hại nhỏ và tự khỏi — lượt sau đọc sổ mới sẽ không
còn mục đó. Đổ cả lượt chấm vì một file vừa bị dọn là biến một cuộc đua bình thường thành một lượt chấm
hỏng, và hỏng theo kiểu người đọc không hiểu vì sao.*

#### Scenario: sổ có mục mà file đã mất
- **WHEN** đọc thư viện trong lúc một mục vừa bị dọn khỏi đĩa
- **THEN** mục đó bị bỏ qua, các probe còn lại vẫn về đủ, không ném lỗi

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

Gỡ **do người vận hành** SHALL ghi vào cùng sổ ấy, mang loại riêng và **tên người thao tác**. Ba loại gỡ —
đào thải vì trần, gỡ vì trùng lặp, gỡ do người — SHALL phân biệt được khi đọc; chỉ loại thứ ba mới có người
chịu trách nhiệm, và đó là thông tin không được mất.

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
