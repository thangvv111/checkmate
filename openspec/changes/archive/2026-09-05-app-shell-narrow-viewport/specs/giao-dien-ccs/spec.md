## ADDED Requirements

### Requirement: Vỏ ứng dụng phải dùng được ở màn hẹp, và không đánh đổi lấy JavaScript

Trang SHALL KHÔNG cuộn ngang ở mức **trang** tại bất kỳ bề rộng nào từ **320px** trở lên. Nội dung rộng
(bảng, khối code, dải hành vi) vẫn cuộn **trong chính khối của nó** — thứ bị cấm là cuộn ngang của cả tài
liệu.

Header SHALL xuống dòng được khi không đủ chỗ. Nhãn dài do dữ liệu người dùng quyết định — tên
`owner/repo`, tên đăng nhập — SHALL bị **cắt bằng ellipsis** thay vì đẩy rộng cả hàng; giá trị đầy đủ vẫn
phải đọc được ở nơi khác (thuộc tính `title`, hoặc danh sách xổ xuống).

Điều hướng SHALL đổi hình ở màn hẹp thay vì giữ một cột cố định: cột 210px cộng một viewport 375px để lại
cột nội dung 165px, và một cột 165px thì không đọc được. Sau khi đổi hình, **đủ mọi mục** vẫn phải tới
được, và **mục đang mở phải nhìn thấy được** mà không phải cuộn đi tìm.

Việc đổi hình ấy MUST NOT đòi JavaScript. Vỏ hôm nay chạy được khi JS tắt, và một menu bật/tắt bằng JS
đổi tính chất đó lấy một bố cục gọn hơn.

MUST NOT giấu bớt mục điều hướng để hết tràn. Giấu bớt là cách nhanh nhất làm con số tràn về 0, và nó lấy
mất đường tới đúng những màn người vận hành cần khi đang cầm điện thoại.

*Vì sao viết thành luật thay vì sửa lặng lẽ: đo được ở 375px trên bốn màn — Dashboard, Lịch sử, Sổ cái,
Thư viện probe — tất cả đều `scrollWidth` 683–685px với 22–45 phần tử tràn. Đây không phải lỗi của màn
nào; nó là một tính chất của vỏ, và một tính chất không được khai thì lần sửa vỏ sau sẽ đạp lên nó mà
không ai biết.*

#### Scenario: mở một màn bất kỳ ở bề rộng hẹp
- **WHEN** mở bất kỳ màn nào ở bề rộng 375px
- **THEN** tài liệu không cuộn ngang: `scrollWidth` không vượt bề rộng khung nhìn

#### Scenario: tên repo dài trên header
- **WHEN** repo đang chọn có tên dài
- **THEN** nút chuyển repo cắt bằng ellipsis, không đẩy header rộng ra; tên đầy đủ vẫn đọc được ở chỗ khác

#### Scenario: điều hướng ở màn hẹp
- **WHEN** vỏ đổi hình ở màn hẹp
- **THEN** đủ mọi mục điều hướng vẫn tới được, và mục đang mở nhìn thấy được ngay

#### Scenario: JavaScript bị tắt
- **WHEN** trình duyệt tắt JavaScript và mở một màn ở bề rộng hẹp
- **THEN** bố cục vẫn đúng và điều hướng vẫn dùng được — không mục nào cần một cú bấm JS mới hiện ra

#### Scenario: nội dung rộng hơn khung
- **WHEN** một bảng hoặc khối code rộng hơn cột nội dung
- **THEN** nó cuộn ngang TRONG khối của nó, và trang vẫn không cuộn ngang
