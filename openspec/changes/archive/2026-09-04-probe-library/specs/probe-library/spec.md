## ADDED Requirements

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

*Vì sao: đọc diễn ra ngoài khoá, nên giữa lúc đọc sổ và lúc đọc file, một lượt song song có thể đã đào thải
đúng probe ấy. Mất một probe thư viện ở lượt này là thiệt hại nhỏ và tự khỏi — lượt sau đọc sổ mới sẽ không
còn mục đó. Đổ cả lượt chấm vì một file vừa bị dọn là biến một cuộc đua bình thường thành một lượt chấm
hỏng, và hỏng theo kiểu người đọc không hiểu vì sao.*

#### Scenario: sổ có mục mà file đã mất
- **WHEN** đọc thư viện trong lúc một mục vừa bị dọn khỏi đĩa
- **THEN** mục đó bị bỏ qua, các probe còn lại vẫn về đủ, không ném lỗi
