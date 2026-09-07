## ADDED Requirements

### Requirement: Bước cài phụ thuộc SHALL chạy trong thư mục TẠM, MUST NOT mount bản clone ghi được

Bước cài SHALL dựng một thư mục làm việc **tạm, rỗng, dùng một lần**, chép vào đó một **danh sách ĐÓNG**
các file khai phụ thuộc của repo đích, rồi chạy trình quản lý gói trong thư mục ấy. Bản clone MUST NOT
được mount vào container cài, dù chỉ đọc hay ghi được.

Cây `.git` của bản clone MUST NOT có mặt trong cây filesystem mà bước cài nhìn thấy.

Danh sách file chép sang MUST đóng và MUST nằm trong mã — không mẫu chung, không khoá của `checkmate.yml`.

Sau khi cài xong, quyền sở hữu SHALL được trả về tài khoản chạy CheckMate **trước** khi kết quả được
chuyển vào bản clone. Chuyển thất bại SHALL để bản clone **nguyên trạng như trước khi cài**.

*Vì sao đây là requirement đầu tiên và cứng nhất — đo được 07/09, bằng một sự cố tự gây ra: cách hiển
nhiên (mount bản clone rồi cài tại chỗ) đã được thử, và cờ chuyển-chủ-sở-hữu của runtime container chown
**đệ quy toàn bộ cây được mount**. Nó chạm `.git`, hỏng giữa chừng, và để lại **78 mục của bản clone thuộc
một subuid** mà tài khoản dịch vụ không đọc được — tức bản clone hỏng, và hỏng theo kiểu chỉ lộ ra ở lượt
chấm sau.*

*Vì sao `.git` là thứ phải giấu chứ không chỉ là thứ nên giấu: bản clone ghi được nghĩa là **đối tượng bị
chấm sửa được đối chứng của chính nó**. Viết lại `main` trong bản clone là đổi nhánh gốc mà verdict so
sánh vào — cùng loại tấn công với «probe sửa thư viện probe», chỉ khác cửa.*

*Vì sao danh sách đóng: nó SẼ bỏ sót hình dạng repo chưa gặp, và bỏ sót là hướng an toàn — cài thất bại
thì cửa kiểm của lượt chấm vẫn chặn và vẫn nói đúng bệnh. Nới danh sách phải có repo thật làm bằng chứng.*

#### Scenario: cài phụ thuộc cho một bản clone
- **WHEN** người vận hành yêu cầu cài phụ thuộc cho một repo đích
- **THEN** trình quản lý gói chạy trong một thư mục tạm rỗng, và bản clone không nằm trong bất kỳ mount nào

#### Scenario: cây `.git` không nhìn thấy được
- **WHEN** bước cài đang chạy
- **THEN** đường dẫn `.git` của bản clone không tồn tại trong cây filesystem của container

#### Scenario: cài xong thì kết quả vào bản clone
- **WHEN** bước cài kết thúc thành công
- **THEN** quyền sở hữu được trả về tài khoản chạy CheckMate, rồi thư mục phụ thuộc được chuyển vào clone

#### Scenario: cài hỏng giữa chừng
- **WHEN** bước cài thất bại, hoặc quá hạn, hoặc không trả được quyền sở hữu
- **THEN** bản clone giữ nguyên trạng thái trước đó, và thư mục tạm được dọn

#### Scenario: repo có hình dạng ngoài danh sách đóng
- **WHEN** repo đích cần một file khai phụ thuộc không có trong danh sách
- **THEN** bước cài thất bại kèm thông điệp nêu file nào thiếu; MUST NOT chép thêm file ngoài danh sách

### Requirement: Script cài của repo đích MUST NOT chạy

Bước cài SHALL chạy trình quản lý gói ở chế độ **không thực thi script cài**. Không script nào của repo
đích và không script nào của gói phụ thuộc được chạy.

Chế độ này MUST NOT bật/tắt được bằng khoá trong `checkmate.yml` của repo đích.

*Vì sao: script cài là **code tuỳ ý của repo đang bị chấm**, chạy trên máy chủ của bên chấm, trong container
DUY NHẤT có mạng. Ba thứ ấy cộng lại là bề mặt nặng nhất mà sản phẩm này từng mở. Và cái giá của việc đóng
nó đã đo được: toàn bộ cây phụ thuộc của repo đích thật chỉ có **một** gói khai script cài, và gói ấy chỉ
chạy trên một hệ điều hành khác.*

*Vì sao repo đích MUST NOT tự bật: đó đúng là maker chỉnh checker. Một repo bật script cài rồi ghi bất cứ
thứ gì nó muốn lên máy chủ đang chấm nó. Nếu có ngày cần bật, người quyết là người vận hành CheckMate, và
việc ấy phải đi qua một change khai rõ — không phải một khoá trong file của bên bị chấm.*

#### Scenario: repo đích khai script chạy sau khi cài
- **WHEN** `package.json` của repo đích có script chạy sau khi cài
- **THEN** script ấy không chạy, và bước cài vẫn hoàn tất

#### Scenario: gói phụ thuộc khai script cài
- **WHEN** một gói trong cây phụ thuộc khai script cài
- **THEN** script ấy không chạy

#### Scenario: repo đích cố bật script qua cấu hình
- **WHEN** `checkmate.yml` của repo đích khai một khoá xin chạy script cài
- **THEN** khoá ấy không có tác dụng

### Requirement: Cài xong SHALL được kiểm lại bằng chính cửa đã báo thiếu

Sau khi cài, engine SHALL chạy lại **đúng phép kiểm** đã báo thiếu phụ thuộc. Phép kiểm còn báo thiếu thì
lần cài ấy SHALL được coi là **thất bại**, bất kể trình quản lý gói trả về mã thành công.

Kết quả kiểm lại SHALL đọc từ đĩa ở thời điểm kiểm, MUST NOT đọc từ bộ nhớ đệm (⛔C6).

*Vì sao không tin mã thoát: `npm ci` từng thoát 0 sau khi cài dở dang và để lại thư mục rỗng — đó đúng là
trạng thái đo được trên prod 07/09 và là lý do phép kiểm của nhịp một đếm số mục thay vì chỉ hỏi thư mục
có tồn tại không. «Trình cài nói xong» và «môi trường chạy được probe» là hai câu khác nhau, và chỉ câu
thứ hai đáng ghi lại.*

*Vì sao dùng LẠI đúng cửa cũ chứ không viết một phép kiểm thứ hai: hai biểu thức cho một luật thì sẽ lệch —
khuôn cửa song sinh đã bị bắt chín lần ở repo này. Ở đây lệch nghĩa là bảng điều khiển báo «đã cài» còn
lượt chấm vẫn chặn.*

#### Scenario: cài xong và môi trường đủ điều kiện
- **WHEN** bước cài kết thúc và phép kiểm không còn báo thiếu
- **THEN** lần cài được ghi là thành công

#### Scenario: trình cài báo thành công nhưng phép kiểm vẫn báo thiếu
- **WHEN** trình quản lý gói thoát với mã thành công mà phép kiểm vẫn báo thiếu phụ thuộc
- **THEN** lần cài được ghi là **thất bại**, và thông điệp nêu rõ mâu thuẫn ấy

#### Scenario: sửa tay rồi kiểm lại
- **WHEN** người vận hành tự cài bằng tay rồi yêu cầu kiểm lại
- **THEN** phép kiểm đọc trạng thái đĩa hiện tại (⛔C6)

### Requirement: Máy MUST NOT tự cài; việc cài là hành động có người bấm và để lại vết

Engine MUST NOT tự chạy bước cài như một tác dụng phụ của lượt chấm. Bước cài SHALL do người vận hành khởi
động, SHALL ghi log nêu ảnh dùng, lệnh chạy, thời gian và kết quả kiểm lại.

Lượt chấm gặp môi trường thiếu phụ thuộc SHALL vẫn **dừng** như luật `probe-environment` đã khai, và MAY
chỉ ra chỗ bấm để cài.

*Vì sao không tự cài: bước cài kéo mã từ registry công cộng về máy chủ và ghi vào đĩa. Làm việc ấy im lặng
bên trong một lượt chấm thì người vận hành mất cả chỗ nhìn thấy chi phí lẫn chỗ từ chối — và thứ được kéo
về là phụ thuộc của một repo, tức một quyết định về cái gì được phép nằm trên máy chủ này. Đo được: cài
`admin-fe` mất 9 giây, nên «cho người bấm» không phải cái giá về tốc độ.*

*Ranh giới này KHÁC ⛔C1 và không được nhầm với nó: ⛔C1 nói máy không được nói CÓ ở cổng merge. Ở đây máy
không bị cấm hành động — nó bị cấm hành động **im lặng**.*

#### Scenario: lượt chấm gặp môi trường thiếu phụ thuộc
- **WHEN** cửa kiểm chặn một lượt chấm vì bản clone chưa cài phụ thuộc
- **THEN** lượt dừng như cũ; engine MUST NOT tự cài

#### Scenario: người vận hành bấm cài
- **WHEN** người vận hành khởi động bước cài cho một repo đích
- **THEN** log nêu ảnh đã dùng, lệnh đã chạy, thời gian, và kết quả kiểm lại sau khi cài
