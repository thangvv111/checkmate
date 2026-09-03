# response-secret-guard Specification

## Purpose
TBD - created by archiving change response-secret-guard. Update Purpose after archive.

## Requirements

### Requirement: Bí mật của chính checker không được rời máy chủ qua thân response

Mọi dữ liệu máy chủ trả về client SHALL được đối chiếu với **bí mật đang lưu của chính checker** trước khi
rời máy chủ. Trùng thì **chặn** — không ghi sổ rồi cho qua (⛔C2: rò một lần là không thu hồi được).

Bí mật đang lưu gồm ba nhánh của kho (`claude_code_oauth_token` · `khoa` theo nhà cung cấp · `repo_token`
theo repo) và các biến môi trường mà checker thật sự đọc. Danh sách nguồn SHALL là **danh sách CHO PHÉP về
phía nguồn**: thêm một chỗ lưu bí mật mà quên khai vào đây thì gác không biết nó tồn tại.

Phép đối chiếu ở đây SHALL là **so khớp chính xác giá trị**, không phải dò theo hình dạng. Đây là chỗ khác
căn bản với `error-message-egress-gate`: bí mật ở đó là của **repo đích** nên checker không biết giá trị và
phải chấp nhận âm tính giả; bí mật ở đây là của **chính checker** nên so khớp được, và một đường rò lọt qua
gác này là lỗi cài đặt chứ không phải giới hạn của phương pháp.

Chuỗi ngắn hơn ngưỡng SHALL bị bỏ qua khi đối chiếu. Một bí mật rỗng hoặc vài ký tự sẽ khớp mọi response và
biến gác thành cỗ máy chặn mù.

#### Scenario: response JSON mang token
- **WHEN** một route trả về dữ liệu có chứa giá trị token đang lưu
- **THEN** response bị chặn, client nhận lỗi máy chủ, và **không** nhận được token

#### Scenario: response không mang bí mật
- **WHEN** response không chứa giá trị bí mật nào
- **THEN** đi qua nguyên vẹn

#### Scenario: bí mật rỗng hoặc quá ngắn
- **WHEN** kho có một mục bí mật rỗng hoặc ngắn hơn ngưỡng
- **THEN** mục ấy bị bỏ qua khi đối chiếu — response bình thường KHÔNG bị chặn oan

### Requirement: Hai bề mặt trả dữ liệu, hai cách chặn, và cách yếu hơn phải được khai là yếu hơn

Gác SHALL phủ **cả hai** đường dữ liệu rời máy chủ:

| bề mặt | trạng thái lúc phát hiện | cách chặn |
|---|---|---|
| route trả JSON | chưa gửi gì | đổi sang **lỗi máy chủ**, thân response bị bỏ |
| luồng sự kiện (`text/event-stream`) | header `200` **đã gửi** | **cắt kết nối**; không đổi được mã trạng thái |

Cách thứ hai yếu hơn và MUST được khai rõ là yếu hơn: mẩu dữ liệu bị bắt không được gửi, nhưng client đã
nhận một response `200` và các mẩu trước đó. Nó chặn được **rò bí mật**, không chặn được việc client tưởng
lượt chấm đang chạy bình thường.

Luồng sự kiện là bề mặt dễ quên nhất vì nó không đi qua đường trả JSON — một gác chỉ bọc đường trả JSON sẽ
để trống nó, và đó đúng là đường phát **log của lượt chấm**, nơi bí mật hay lọt vào nhất.

#### Scenario: mẩu sự kiện mang bí mật
- **WHEN** một mẩu của luồng sự kiện chứa giá trị bí mật đang lưu
- **THEN** mẩu ấy KHÔNG được gửi và kết nối bị cắt

#### Scenario: luồng sự kiện bình thường
- **WHEN** các mẩu không chứa bí mật
- **THEN** luồng chạy bình thường, kể cả nhịp giữ kết nối

### Requirement: Thông điệp chặn nêu TÊN NGUỒN, không bao giờ nêu giá trị

Khi gác chặn, thông điệp trả về client, dòng ghi log và mọi bản ghi trên đĩa SHALL nêu **tên nguồn** bí mật
bị bắt (ví dụ `repo_token`, `khoa.<nhà cung cấp>`, `oauth_token`) và MUST NOT chứa giá trị, kể cả một phần
hay bản đã che.

Đây là bẫy tự nhiên nhất của một gác bảo mật: lời báo «response chứa `ghp_abc…`» đưa chính bí mật vào log và
lên màn hình — tức gác sinh ra để chặn rò lại trở thành đường rò, và ở một bề mặt còn dai hơn (log lưu lại,
response thì không).

#### Scenario: chặn rồi báo
- **WHEN** gác chặn một response
- **THEN** thông điệp nêu tên nguồn, và KHÔNG chứa giá trị bí mật dù chỉ vài ký tự

### Requirement: Gác hỏng thì không được chặn oan, và không được im lặng cho qua

Gác chạy trên **mọi** response, nên một lỗi trong nó làm hỏng toàn bộ giao diện chứ không hỏng một chỗ.

Đầu vào méo — kho bí mật đọc không được, thân response không phải chuỗi, dữ liệu có tham chiếu vòng — MUST
NOT làm gác ném. Khi gác **không đọc được kho bí mật**, nó SHALL nói ra qua log chứ không im lặng: một gác
không biết bí mật nào tồn tại là một gác không gác gì, và trạng thái ấy trông y hệt «không có bí mật nào để
rò».

#### Scenario: kho bí mật không đọc được
- **WHEN** kho bí mật hỏng hoặc không đọc được
- **THEN** gác không ném, response đi qua, và có dòng log nói rõ gác đang chạy mà không có nguồn đối chiếu

#### Scenario: thân response không phải chuỗi
- **WHEN** thân response là số, `null`, hoặc đối tượng có tham chiếu vòng
- **THEN** gác không ném
