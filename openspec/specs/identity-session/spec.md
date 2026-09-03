# identity-session Specification

## Purpose
TBD - created by archiving change identity-session. Update Purpose after archive.

## Requirements

### Requirement: Danh tính người thao tác đến từ phiên đăng nhập, qua đúng một cửa, không có mặc định

Người thao tác cổng SHALL là danh tính của **phiên đăng nhập** (gốc: R11.1) — không phải giá trị client
gửi lên, không phải tài khoản hệ điều hành đang chạy tiến trình.

Hàm đọc danh tính MUST NOT có bất kỳ giá trị mặc định nào (gốc: R11.3): không cookie, cookie rác, phiên hết
hạn, hay tài khoản đã bị gỡ đều phải **ném lỗi**, không được dựng ra một danh tính nào đó. Và mọi chỗ đọc
danh tính SHALL đi qua **đúng một hàm** (gốc: R11.4) — cửa duy nhất ấy là nơi luật sống; hàm bao ngoài chỉ
được phép biến lỗi thành `null` cho chỗ chỉ cần biết để vẽ giao diện, không được tự đọc cookie lần nữa.

Luật «một cửa» MUST được cưỡng chế bằng lưới quét source, không bằng quy ước: một cửa thứ hai đọc thẳng
cookie phiên là một chỗ luật không đi qua, và nó sẽ trông y hệt code đúng.

*Vì sao thành luật: bản đầu của sản phẩm lấy người thao tác từ `userInfo().username` của tiến trình máy
chủ, phía sau một lớp Basic Auth ở nginx. Mọi hành động cổng vào sổ dưới cùng một cái tên — `ubuntu` — nên
sổ có đủ hàng mà không trả lời được câu duy nhất nó sinh ra để trả lời: ai đã bấm.*

#### Scenario: không có cookie phiên
- **WHEN** đọc danh tính từ một request không mang cookie phiên
- **THEN** NÉM lỗi, KHÔNG trả về một cái tên nào

#### Scenario: cookie rác
- **WHEN** cookie phiên mang giá trị không khớp phiên nào
- **THEN** NÉM lỗi, không dựng ra danh tính

#### Scenario: một cửa duy nhất
- **WHEN** quét mã nguồn tầng web tìm chỗ đọc cookie phiên để dựng danh tính
- **THEN** chỉ có đúng một hàm làm việc đó; chỗ khác gọi lại nó chứ không đọc cookie lần nữa

### Requirement: Không phiên hợp lệ thì chặn tất cả, kể cả khi lớp xác thực bên ngoài đã cho qua

Không có phiên hợp lệ thì mọi hành động SHALL bị từ chối (gốc: R11.2), **kể cả khi** một lớp xác thực bên
ngoài (Basic Auth ở proxy) đã cho request đi qua. Lớp ngoài trả lời «có ai đó được vào», không trả lời «ai».

Đường không cần phiên SHALL được khai bằng **danh sách CHO PHÉP** đóng, không bằng danh sách chặn. Nới danh
sách ấy là mở một cửa vào hệ thống, nên nó phải là thay đổi nhìn thấy được và có lưới khoá.

Từ chối MUST phân biệt theo loại bề mặt: đường API trả JSON, đường trang trả chuyển hướng về màn đăng nhập.
Client gọi API mà nhận HTML thì lỗi biến thành «JSON hỏng» — lại một ca báo sai bản chất.

Luật này MUST NOT áp cho **đối soát**: đối soát chép lại hành động đã xảy ra ở hệ khác (GitHub), nên hàng
của nó không có người bấm trong hệ này — ranh giới ấy thuộc `doi-soat-cong`.

#### Scenario: request không phiên tới đường thường
- **WHEN** một request không mang phiên hợp lệ tới đường không nằm trong danh sách cho phép
- **THEN** bị chặn, không được đi tiếp, dù lớp xác thực ngoài đã cho qua

#### Scenario: đường trong danh sách cho phép
- **WHEN** request tới `/login`, `/logout` hoặc `/health`
- **THEN** đi tiếp không cần phiên

#### Scenario: hình dạng từ chối theo bề mặt
- **WHEN** đường bị chặn bắt đầu bằng `/api/`
- **THEN** trả JSON kèm mã lỗi, KHÔNG trả HTML chuyển hướng

### Requirement: Tài khoản sống trong cơ sở dữ liệu, tên ép khuôn tại nguồn, quản trị bằng lệnh trên máy chủ

Tài khoản SHALL lưu trong cơ sở dữ liệu (gốc: R11.7). Vì thế file cơ sở dữ liệu **và các file đi kèm**
(`-wal`, `-shm`) SHALL được đặt quyền 600 (gốc: R11.8) — hai file đi kèm mang cùng dữ liệu, đặt quyền cho
mỗi file chính là khoá cửa trước rồi mở cửa sau.

Tên đăng nhập SHALL được ép khuôn **lúc tạo tài khoản**, không phải lúc hiển thị (gốc: R11.9). Ép lúc hiển
thị nghĩa là dữ liệu bẩn đã nằm trong cơ sở dữ liệu và mọi bề mặt mới phải nhớ tự ép — một trong số đó sẽ
quên. Tên xấu MUST làm lệnh tạo tài khoản **ném lỗi**, không được lặng lẽ chuẩn hoá: người tạo phải biết
tên họ gõ không được nhận.

Thêm tài khoản, đổi mật khẩu, đổi vai, gỡ tài khoản SHALL đi bằng lệnh chạy trên máy chủ (gốc: R11.19),
không qua giao diện web. Một bề mặt web quản trị tài khoản là bề mặt tấn công có sẵn cho thứ mở được cổng
merge, và nhu cầu thật của hệ này quá thấp để đánh đổi.

#### Scenario: tên đăng nhập có ký tự phá được HTML
- **WHEN** tạo tài khoản với tên chứa ký tự có thể phá HTML hoặc markdown của comment pull request
- **THEN** lệnh NÉM lỗi; tài khoản không được tạo, tên không bị lặng lẽ chuẩn hoá

#### Scenario: file cơ sở dữ liệu và file đi kèm
- **WHEN** cơ sở dữ liệu được mở
- **THEN** file chính và các file `-wal`, `-shm` đều được đặt quyền 600 trên hệ có hỗ trợ

### Requirement: Mật khẩu băm chậm có muối riêng, và thông điệp đăng nhập sai không phân biệt được

Băm mật khẩu SHALL dùng hàm chậm có **muối riêng cho từng tài khoản** (gốc: R11.6). Mật khẩu MUST NOT nằm
ở dạng đọc được trong cơ sở dữ liệu (⛔C3).

Sai mật khẩu SHALL trả về **cùng một thông điệp** với sai tên đăng nhập (gốc: R11.10). Hai thông điệp khác
nhau là một cửa dò: kẻ tấn công thử một danh sách tên và biết tên nào có thật, rồi mới dồn sức đoán mật khẩu
của đúng những tên đó.

#### Scenario: sai mật khẩu và tên không tồn tại
- **WHEN** đăng nhập với mật khẩu sai, và đăng nhập với một tên không tồn tại
- **THEN** hai lần đều trả cùng một kết quả — không lần nào xác nhận tài khoản nào có thật

#### Scenario: mật khẩu trong cơ sở dữ liệu
- **WHEN** đọc thẳng bảng tài khoản
- **THEN** không tìm thấy mật khẩu ở dạng đọc được

### Requirement: Phiên có token ngẫu nhiên chỉ lưu hash, có hạn, và chết thật khi đăng xuất hoặc gỡ tài khoản

Token phiên SHALL là giá trị ngẫu nhiên đủ dài, và cơ sở dữ liệu SHALL chỉ lưu **hash** của nó (gốc:
R11.11) — đọc được cơ sở dữ liệu không có nghĩa là mạo danh được phiên đang sống.

Phiên SHALL có hạn; hết hạn thì bị từ chối **như không có phiên**, và phiên hết hạn bị dọn ngay tại chỗ
phát hiện (gốc: R11.12).

Đăng xuất SHALL xoá phiên ở **phía máy chủ**, không chỉ xoá cookie ở trình duyệt (gốc: R11.13). Xoá mỗi
cookie thì token vẫn mở được phiên nếu ai đó còn giữ nó.

Gỡ một tài khoản SHALL huỷ **mọi phiên đang sống** của tài khoản đó (gốc: R11.21). Đổi mật khẩu cũng vậy:
đổi vì nghi lộ mà để phiên cũ sống là không đổi gì.

#### Scenario: cơ sở dữ liệu chỉ giữ hash
- **WHEN** tạo phiên rồi đọc thẳng bảng phiên
- **THEN** không tìm thấy token thô, chỉ có hash của nó

#### Scenario: đăng xuất
- **WHEN** đăng xuất rồi dùng lại chính token cũ
- **THEN** phiên không còn hiệu lực — phiên bị xoá ở phía máy chủ, không phải chỉ ở trình duyệt

#### Scenario: gỡ tài khoản khi còn phiên sống
- **WHEN** một tài khoản đang có phiên sống bị gỡ
- **THEN** phiên ấy không dùng được nữa

### Requirement: Cookie phiên đặt HttpOnly và SameSite, và Secure khi phục vụ qua HTTPS

Cookie phiên SHALL luôn mang `HttpOnly` và `SameSite`, và SHALL mang `Secure` khi request đi qua HTTPS
(gốc: R11.14). Sản phẩm đứng sau proxy nên «có phải HTTPS không» đọc từ header proxy báo lên, không đoán từ
cổng đang lắng nghe.

Ba cờ ấy chặn ba đường khác nhau và không thay thế nhau: thiếu `HttpOnly` thì một lỗ XSS đọc được token
phiên; thiếu `SameSite` thì một trang khác bấm được cổng merge thay người dùng; thiếu `Secure` trên HTTPS
thì token đi cả qua kênh không mã hoá.

Hàm dựng cookie MUST gọi được từ test — nó là hàm thuần dựng chuỗi, và khi không gọi được thì ba cờ trên
chỉ là ba chữ trong source mà không lưới nào giữ.

#### Scenario: cookie phiên qua HTTP
- **WHEN** dựng cookie phiên cho request không đi qua HTTPS
- **THEN** cookie có `HttpOnly` và `SameSite`, KHÔNG có `Secure`

#### Scenario: cookie phiên qua HTTPS
- **WHEN** proxy báo request đi qua HTTPS
- **THEN** cookie có đủ `HttpOnly`, `SameSite` và `Secure`

### Requirement: Không bề mặt nào phát danh sách tài khoản, hash hay muối ra ngoài

KHÔNG route nào được trả danh sách tài khoản, hash mật khẩu, hay muối (gốc: R11.20).

Luật này MUST được cưỡng chế bằng **lưới quét source**, không bằng quy ước. Hôm nay nó đúng vì hàm liệt kê
tài khoản chỉ được gọi từ công cụ dòng lệnh — tức nó đang được giữ bằng **kỷ luật**, và một pull request
thêm một route gọi thẳng hàm ấy sẽ không làm gì đỏ. Danh sách tài khoản của một hệ thống mở được cổng merge
là mục tiêu có giá trị: nó cho biết đúng những cái tên đáng đi đoán mật khẩu.

#### Scenario: hàm liệt kê tài khoản bị gọi từ tầng route
- **WHEN** một file tầng route gọi hàm liệt kê tài khoản
- **THEN** lưới ĐỎ, nêu đúng file và hàm

#### Scenario: công cụ dòng lệnh
- **WHEN** công cụ quản trị chạy trên máy chủ gọi hàm ấy
- **THEN** lưới xanh — đó là chỗ hợp lệ duy nhất

### Requirement: Vai tách theo việc, và người bấm trùng tác giả pull request phải bị nêu tên

Vai dành cho tác nhân máy là `tu_dong` (gốc: R11.18b): chạy chấm được, nhưng KHÔNG sửa cấu hình và KHÔNG
merge. Nó tách khỏi vai vận hành vì vai đó sửa được cấu hình — mà cấu hình quyết định lượt chấm chạy thế
nào, nên «sửa được cấu hình» và «chạy được chấm» không phải một quyền.

Việc máy không bao giờ merge là ⛔C1; chỗ nó sống ở tầng vai là phép kiểm quyền cổng, và điều đó MUST được
chặn **ở tầng vai**, không phải bằng kỷ luật hay bằng việc không vẽ nút.

Khi người bấm cổng trùng với tác giả pull request, hệ thống SHALL cảnh báo tại chỗ trước khi bấm và ghi
việc trùng ấy vào sổ (gốc: R11.17). Phép so tên MUST chịu được khác biệt hình thức giữa hai hệ — dấu chấm,
gạch nối, gạch dưới, hoa thường — vì tên trong hệ này và tên tài khoản GitHub hiếm khi trùng từng ký tự,
và một phép so ngây thơ sẽ im lặng đúng lúc cần nói.

#### Scenario: vai tự động không mở được cổng
- **WHEN** tài khoản mang vai `tu_dong` thử thao tác cổng
- **THEN** bị từ chối ở tầng vai

#### Scenario: không vai nào ngoài vai duyệt cổng mở được merge
- **WHEN** thử lần lượt mọi vai khác
- **THEN** không vai nào mở được cổng merge

#### Scenario: người bấm trùng tác giả, khác hình thức viết tên
- **WHEN** người bấm và tác giả pull request là cùng một người nhưng tên viết khác nhau về dấu chấm, gạch
  hay hoa thường
- **THEN** hệ thống vẫn nhận ra là trùng và ghi vào sổ
