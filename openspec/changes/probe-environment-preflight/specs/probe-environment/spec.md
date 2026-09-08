## ADDED Requirements

### Requirement: Điều kiện môi trường chạy probe SHALL được kiểm TRƯỚC lời gọi model đầu tiên

Trước khi phát lời gọi model nào trong một lượt chấm code, engine SHALL kiểm rằng môi trường chạy probe
đủ điều kiện. Điều kiện thiếu ở mức **chặn** SHALL làm lượt dừng NGAY, và MUST NOT phát bất kỳ lời gọi
model nào.

Một dự án Node khai phụ thuộc trong `package.json` mà bản clone không có phụ thuộc đã cài SHALL là điều
kiện mức **chặn**. Thư mục phụ thuộc **rỗng** và thư mục phụ thuộc **không tồn tại** SHALL được coi là
cùng một điều kiện.

Repo đích khai một phiên bản runtime khác phiên bản của môi trường sẽ chạy test SHALL là **cảnh báo**,
MUST NOT chặn. Engine SHALL chỉ hỏi phiên bản của môi trường khi repo đích có khai — hỏi là dựng một
container, và câu trả lời không dùng vào đâu khi không có gì để so.

Thiếu một trong hai vế để so SHALL cho ra **không kết luận**, MUST NOT đoán.

*Vì sao phải đứng TRƯỚC chứ không bắt lỗi ở sau: đo trên prod 07/09, một bản clone thiếu phụ thuộc làm
lượt chấm đi hết ba lời gọi model — khoảng 100 000 token vào — rồi mới chết ở bước sandbox. Phép kiểm thư
mục tốn vài mili giây. Đây không phải tối ưu vi mô: nó là khác biệt giữa «hỏng và tốn tiền» với «hỏng và
nói ngay».*

*Vì sao runtime lệch chỉ CẢNH BÁO: repo khai `engines` chặt hơn mức thật sự cần là chuyện thường, và chặn
cứng sẽ chặn oan những lượt chạy được. Cái giá của cảnh báo sai không phải là một dòng thừa — nó dạy người
vận hành bỏ qua cảnh báo, và lần sau cảnh báo thật cũng bị bỏ qua.*

*Vì sao rỗng = không tồn tại: `npm ci` hỏng giữa chừng để lại thư mục rỗng. Đó đúng là trạng thái đo được
trên prod 07/09, và một phép kiểm chỉ hỏi «thư mục có tồn tại không» sẽ nói là đủ điều kiện.*

#### Scenario: bản clone chưa cài phụ thuộc
- **WHEN** repo đích khai phụ thuộc trong `package.json` và bản clone không có thư mục phụ thuộc
- **THEN** lượt dừng trước lời gọi model đầu tiên, thông điệp nêu số gói đã khai và **lệnh cài cụ thể**

#### Scenario: thư mục phụ thuộc tồn tại nhưng rỗng
- **WHEN** thư mục phụ thuộc có mặt nhưng không có mục nào
- **THEN** cùng kết quả với ca không tồn tại — dừng, không phải đi tiếp

#### Scenario: repo không phải dự án Node
- **WHEN** repo đích không có `package.json`
- **THEN** phép kiểm phụ thuộc không kết luận gì, lượt đi tiếp bình thường

#### Scenario: repo khai phụ thuộc rỗng
- **WHEN** `package.json` có mặt nhưng không khai gói nào
- **THEN** không chặn — không có gì để cài

#### Scenario: runtime repo lệch runtime môi trường
- **WHEN** repo đích khai một phiên bản runtime chính khác phiên bản của môi trường chạy test
- **THEN** lượt **vẫn chạy**, kèm cảnh báo nêu cả hai phiên bản và cách khai ảnh chạy riêng

#### Scenario: không đọc được phiên bản của môi trường
- **WHEN** phiên bản của môi trường chạy test không hỏi được
- **THEN** không cảnh báo và không chặn — thiếu vế so thì không kết luận

#### Scenario: repo không khai runtime thì không hỏi ảnh
- **WHEN** repo đích không khai phiên bản runtime
- **THEN** engine MUST NOT dựng container để hỏi phiên bản

### Requirement: Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe

Khi bước chạy probe hỏng, engine SHALL phân biệt **lỗi của probe** với **lỗi của môi trường**. Lỗi môi
trường SHALL làm lượt dừng kèm thông điệp nêu đúng bệnh, và MUST NOT kích hoạt vòng sinh lại probe.

Phân loại SHALL dựa trên **mã lỗi và hình dạng đường dẫn**, MUST NOT so khớp lời văn tự do của thông điệp.

Lượt dừng vì môi trường MUST NOT ra verdict PASS.

*Vì sao: sinh lại chỉ đúng khi probe viết sai — probe không gây ra và không sửa được việc thiếu phụ thuộc.
Với lỗi môi trường, vòng sinh lại tốn thêm một lời gọi sinh code rồi hỏng y hệt. Đo 07/09: ba lượt liên
tiếp, cùng một bệnh, mỗi lượt một lần sinh lại vô ích.*

*Vì sao phân loại bằng mã chứ không bằng lời văn (⛔C4): lời văn đến từ npm, từ Node, và từ chính repo
đích. Nó đổi theo phiên bản. Tệ hơn: một repo đích in ra chuỗi giống lỗi môi trường sẽ tự chọn được lượt
chấm nào của chính nó bị dừng — cùng khuôn với lý do engine không dò `Cannot find module` để nhận lỗi nạp.*

#### Scenario: bộ chạy test không tải được gói vì không có mạng
- **WHEN** bước chạy probe hỏng với mã lỗi phân giải tên miền
- **THEN** lượt dừng, thông điệp nói **thiếu phụ thuộc**, và MUST NOT sinh lại probe

#### Scenario: không ghi được vào thư mục phụ thuộc
- **WHEN** bước chạy probe hỏng với mã lỗi hệ thống tệp chỉ-đọc, hoặc không tạo được thư mục dưới thư mục
  phụ thuộc
- **THEN** lượt dừng, thông điệp nói đây là **môi trường**, không phải pull request

#### Scenario: probe viết sai vẫn được sinh lại
- **WHEN** bước chạy probe hỏng vì file probe không nạp được, không mang mã lỗi môi trường nào
- **THEN** vòng sinh lại chạy như cũ — change này MUST NOT làm hẹp đường sửa probe

#### Scenario: dừng vì môi trường không thành PASS
- **WHEN** một lượt dừng vì điều kiện môi trường
- **THEN** lượt ở trạng thái hỏng; MUST NOT có verdict PASS (⛔C2)

### Requirement: Thông điệp môi trường SHALL gọi đúng tên bệnh và nêu việc phải làm

Thông điệp cho người vận hành khi dừng vì môi trường SHALL nêu **bệnh** và **việc phải làm**, MUST NOT chỉ
nêu triệu chứng ở lớp dưới.

Thông điệp MUST NOT nói lượt hỏng vì hợp đồng kết quả khi bệnh là môi trường.

Điều kiện môi trường SHALL được kiểm và báo **lúc thêm repo đích vào danh sách**, không chỉ lúc chấm. Điều
kiện thiếu MUST NOT chặn việc đăng ký repo — repo vào danh sách hợp lệ và lượt chấm tài liệu vẫn chạy.

*Vì sao đây là luật chứ không phải chuyện lời văn: người vận hành đọc «Runner không xuất JUnit XML» sẽ đi
sửa cấu hình runner — một chỗ không hỏng. Thông điệp sai bệnh không chỉ vô ích, nó **điều hướng sai** công
sức. Và đo được: việc «thêm repo đích mới thì phải cài phụ thuộc» đã được ghi vào tài liệu triển khai cùng
ngày, rồi lỗi vẫn tái diễn — vì tài liệu không nằm trên đường người ta đi.*

#### Scenario: dừng vì thiếu phụ thuộc
- **WHEN** lượt dừng vì bản clone chưa cài phụ thuộc
- **THEN** thông điệp nêu bản clone thiếu phụ thuộc và **lệnh cài**, MUST NOT nói về hợp đồng JUnit XML

#### Scenario: thêm repo đích chưa cài phụ thuộc
- **WHEN** người vận hành thêm một repo đích mà bản clone chưa cài phụ thuộc
- **THEN** repo **vào danh sách**, và trả lời mang cảnh báo nêu bệnh kèm lệnh sửa

#### Scenario: cảnh báo lúc thêm repo phải đến được mắt người vận hành
- **WHEN** cửa thêm repo trả về cảnh báo môi trường
- **THEN** giao diện hiện cảnh báo và MUST NOT chuyển trang ngay — chuyển trang nuốt mất thứ duy nhất nói
  cho người vận hành biết phải làm gì
