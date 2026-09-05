# github-webhook Specification

## Purpose
TBD - created by archiving change github-webhook. Update Purpose after archive.

## Requirements

### Requirement: Chữ ký HMAC tính trên RAW BODY, so sánh timing-safe, và thiếu bí mật là TỪ CHỐI

Engine SHALL xác thực mỗi webhook bằng HMAC-SHA256 tính trên **đúng chuỗi byte đã nhận**, không phải trên
bản đã phân tích rồi dựng lại.

Phép so chữ ký SHALL dùng so sánh **thời gian không đổi**, và SHALL kiểm độ dài trước khi so.

Khi bí mật webhook chưa được cấu hình, engine SHALL **từ chối mọi webhook**.

*Vì sao phải là raw body: `JSON.parse` rồi `JSON.stringify` cho ra một chuỗi khác — thứ tự khoá, khoảng
trắng, cách thoát ký tự unicode đều có thể đổi. HMAC trên chuỗi dựng lại thì **không bao giờ khớp**, và
người dựng sẽ bị cám dỗ nới phép kiểm cho nó khớp — tức mở đúng cái cửa mình vừa dựng để đóng.*

*Vì sao timing-safe: so sánh chuỗi thông thường dừng ở byte đầu tiên khác nhau, nên thời gian trả lời rò
ra bao nhiêu byte đầu đã đúng. Với một cửa nhận được số lần thử tuỳ ý từ Internet, đó là đường dò từng
byte một.*

*Vì sao thiếu bí mật là TỪ CHỐI chứ không phải bỏ qua xác thực: một máy chủ chưa cấu hình xong mà nhận
webhook nghĩa là ai cũng chạy được lượt chấm trên nó. «Chưa cấu hình» phải nghiêng về phía đóng — đúng
⛔C2, và ở đây hậu quả của việc nghiêng nhầm là một cửa mở ra Internet.*

#### Scenario: chữ ký đúng
- **WHEN** webhook mang chữ ký khớp với HMAC-SHA256 của raw body và bí mật đã cấu hình
- **THEN** yêu cầu được chấp nhận

#### Scenario: chữ ký sai, thiếu, hoặc sai định dạng
- **WHEN** chữ ký không khớp, không có, hoặc không đúng dạng đã khai
- **THEN** yêu cầu bị từ chối

#### Scenario: body bị sửa một byte
- **WHEN** raw body khác đi dù chỉ một byte so với lúc ký
- **THEN** yêu cầu bị từ chối

#### Scenario: bí mật chưa được cấu hình
- **WHEN** kho khoá không có bí mật webhook
- **THEN** mọi webhook bị từ chối, kể cả webhook mang chữ ký hợp lệ theo một bí mật nào đó

### Requirement: Payload phải trỏ repo ĐÃ KHAI, và chỉ sự kiện pull request mới chạy chấm

Engine SHALL chỉ xử lý sự kiện `pull_request`, và chỉ với những hành động mở ra một commit mới cần chấm.

Repo trong payload SHALL được đối chiếu với danh sách repo đã khai trong cấu hình; repo không có trong danh
sách SHALL bị từ chối.

Phép đối chiếu ấy SHALL là **hàm dùng chung** với mọi đường vào khác có thể khởi một lượt chấm. Đường
webhook MUST NOT giữ một bản hiện thực riêng của cùng phép kiểm.

Lượt chấm khởi từ webhook SHALL đi qua **đúng** phép kiểm điều kiện chạy như đường polling và đường bấm tay.

*Vì sao phải kiểm repo: chữ ký chỉ chứng minh «người gửi biết bí mật», không chứng minh «việc này nên
làm». Một webhook hợp lệ trỏ tới repo lạ sẽ khiến CheckMate clone và chạy test của một repo chưa ai khai —
tức chạy code lạ trên máy chủ. Bí mật có thể rò theo nhiều đường (lộ ở GitHub, lộ ở một repo khác cùng
dùng chung bí mật), nên chữ ký KHÔNG được là gác duy nhất.*

*Vì sao phép đối chiếu phải dùng chung — đo được: bản trước dựng gác này riêng cho đường webhook, và đường
polling KHÔNG có gác tương ứng. Khi danh sách repo rỗng, webhook trả «repo không có trong cấu hình» đúng
như luật, còn chế độ trực vẫn tự khởi hai lượt chấm trên một repo suy đoán. Cùng một câu hỏi, hai đường
trả lời khác nhau — và đường không có gác là đường thật sự chạy code.*

*Vì sao đi qua cùng phép kiểm điều kiện chạy: webhook có thể tới dồn dập — một lần push nhiều commit, hoặc
một tác nhân gửi lặp. Trần chạy đồng thời và luật «một verdict một commit» là thứ giữ máy chủ khỏi bị dồn
việc, và chúng phải áp cho MỌI đường vào, không riêng đường người bấm.*

#### Scenario: sự kiện pull request trên repo đã khai
- **WHEN** nhận `pull_request` với hành động cần chấm, repo có trong cấu hình
- **THEN** một lượt chấm được khởi, qua đúng phép kiểm điều kiện chạy

#### Scenario: repo không có trong cấu hình
- **WHEN** payload trỏ một repo chưa khai
- **THEN** yêu cầu bị từ chối và không lượt chấm nào được khởi

#### Scenario: chưa khai repo nào
- **WHEN** danh sách repo rỗng và webhook mang một payload hợp lệ
- **THEN** yêu cầu bị từ chối — không repo nào được suy ra để chấm

#### Scenario: sự kiện khác pull request
- **WHEN** nhận một loại sự kiện khác
- **THEN** engine nhận và bỏ qua, không coi là lỗi

#### Scenario: cùng một commit đến hai lần
- **WHEN** webhook cho cùng pull request và cùng commit tới lần thứ hai
- **THEN** không lượt chấm thứ hai nào được khởi

### Requirement: Cửa webhook không được rò bí mật, và không mở ở chế độ chỉ-đọc

Phản hồi và log của đường webhook MUST NOT chứa bí mật webhook, chữ ký nhận được, hay bất kỳ phần nào của
chúng.

Thông điệp từ chối SHALL nói **loại** lý do, và MUST NOT nói chi tiết đủ để người gửi dò dần tới chữ ký đúng.

Ở chế độ chỉ-đọc, engine SHALL từ chối webhook.

*Vì sao thông điệp phải hẹp: một cửa mở ra Internet trả lời khác nhau cho «chữ ký sai» và «bí mật chưa cấu
hình» là đang nói cho người gửi biết trạng thái bên trong máy chủ. Phân biệt ấy có ích cho người vận hành —
nên nó thuộc về **log máy chủ**, không thuộc về phản hồi.*

*Vì sao chế độ chỉ-đọc phải từ chối: chế độ ấy tồn tại để một bản deploy không sửa được gì. Chạy một lượt
chấm là ghi vào sổ, tiêu token, và chiếm trần — không phải hành động chỉ-đọc.*

#### Scenario: từ chối vì chữ ký sai
- **WHEN** webhook bị từ chối
- **THEN** phản hồi không chứa chữ ký, không chứa bí mật, và không nói cụ thể sai ở đâu

#### Scenario: chế độ chỉ-đọc
- **WHEN** engine chạy ở chế độ chỉ-đọc
- **THEN** webhook bị từ chối
