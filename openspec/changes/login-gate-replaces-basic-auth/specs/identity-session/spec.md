# identity-session

## MODIFIED Requirements

### Requirement: Không phiên hợp lệ thì chặn tất cả, kể cả khi lớp xác thực bên ngoài đã cho qua

Không có phiên hợp lệ thì mọi hành động SHALL bị từ chối (gốc: R11.2). Gác này MUST NOT tựa vào bất kỳ lớp
xác thực nào bên ngoài ứng dụng.

**Change `login-gate-replaces-basic-auth` đổi lớp này từ «lớp thứ hai» thành «lớp duy nhất».** Trước đó
prod còn HTTP Basic Auth ở nginx; luật cũ viết «kể cả khi lớp ngoài đã cho qua» — tức lớp trong được thiết
kế để không tựa vào lớp ngoài, nhưng thực tế vẫn có lớp ngoài đứng đó. Nay không còn. Điều này KHÔNG đổi
hành vi của gác — nó đổi **hậu quả của một lỗi trong gác**: trước, một lỗ ở đây còn một lớp nữa che; sau,
một lỗ ở đây là một lỗ ra thẳng Internet. Ghi ra vì người sửa sau này cần biết mình đang sửa cái gì.

Lý do lớp ngoài bị gỡ chứ không được giữ làm lớp phòng thủ thứ hai: Basic Auth trả lời «có ai đó được vào»
chứ không trả lời «ai», nên nó không phân vai, không ghi sổ, không hết hạn, và mật khẩu của nó dùng chung
cho mọi người. Nó cũng đã phải bị đục thủng cho webhook GitHub. Một lớp không phân biệt được người và đã có
lỗ sẵn thì giá trị phòng thủ của nó thấp hơn cái giá nó gây ra: một cửa mở mà không ai theo dõi.

Đường không cần phiên SHALL được khai bằng **danh sách CHO PHÉP** đóng, không bằng danh sách chặn. Nới danh
sách ấy là mở một cửa vào hệ thống, nên nó phải là thay đổi nhìn thấy được và có lưới khoá.

Từ chối MUST phân biệt theo loại bề mặt: đường API trả JSON, đường trang trả chuyển hướng về màn đăng nhập.
Client gọi API mà nhận HTML thì lỗi biến thành «JSON hỏng» — lại một ca báo sai bản chất.

Luật này MUST NOT áp cho **đối soát**: đối soát chép lại hành động đã xảy ra ở hệ khác (GitHub), nên hàng
của nó không có người bấm trong hệ này — ranh giới ấy thuộc `doi-soat-cong`.

#### Scenario: request không phiên tới đường thường
- **WHEN** một request không mang phiên hợp lệ tới đường không nằm trong danh sách cho phép
- **THEN** bị chặn, không được đi tiếp

#### Scenario: đường trong danh sách cho phép
- **WHEN** request tới `/login`, `/logout` hoặc `/health`
- **THEN** đi tiếp không cần phiên

#### Scenario: hình dạng từ chối theo bề mặt
- **WHEN** đường bị chặn bắt đầu bằng `/api/`
- **THEN** trả JSON kèm mã lỗi, KHÔNG trả HTML chuyển hướng

#### Scenario: không còn lớp ngoài để dựa
- **WHEN** một đường được thêm vào danh sách cho phép
- **THEN** nó phải tự đứng được trước Internet — không được biện minh bằng «đã có lớp xác thực ngoài»

### Requirement: Mật khẩu băm chậm có muối riêng, và thông điệp đăng nhập sai không phân biệt được

Băm mật khẩu SHALL dùng hàm chậm có **muối riêng cho từng tài khoản** (gốc: R11.6). Mật khẩu MUST NOT nằm
ở dạng đọc được trong cơ sở dữ liệu (⛔C3).

Sai mật khẩu SHALL trả về **cùng một thông điệp** với sai tên đăng nhập (gốc: R11.10). Hai thông điệp khác
nhau là một cửa dò: kẻ tấn công thử một danh sách tên và biết tên nào có thật, rồi mới dồn sức đoán mật khẩu
của đúng những tên đó.

**Từ chối vì tần suất là một trạng thái KHÁC, và nó được phép nói ra** (`login-throttle`). Luật trên giấu
*tài khoản nào có thật*; thông điệp tần suất chỉ nói về *hành vi của chính người đang gõ*, thứ họ đã biết.
Gộp hai trạng thái làm một thì người vận hành gõ sai vài lần sẽ thấy mật khẩu đúng bị báo là sai, và đi đổi
mật khẩu — hỏng một thứ đang không hỏng. Đổi lại, thông điệp tần suất MUST NOT phụ thuộc vào việc tên ấy có
thật hay không: rào SHALL đếm tên không tồn tại y như tên có thật, không thì chính nó thành cửa dò mà luật
này vừa đóng.

#### Scenario: sai mật khẩu và tên không tồn tại
- **WHEN** đăng nhập với mật khẩu sai, và đăng nhập với một tên không tồn tại
- **THEN** hai lần đều trả cùng một kết quả — không lần nào xác nhận tài khoản nào có thật

#### Scenario: mật khẩu trong cơ sở dữ liệu
- **WHEN** đọc thẳng bảng tài khoản
- **THEN** không tìm thấy mật khẩu ở dạng đọc được

#### Scenario: tên không tồn tại bị dò nhiều lần
- **WHEN** một tên KHÔNG tồn tại bị thử sai nhiều lần liên tiếp, và một tên CÓ thật cũng vậy
- **THEN** hai bên bị lùi dần y như nhau — hành vi của rào không tố cáo tên nào có thật
