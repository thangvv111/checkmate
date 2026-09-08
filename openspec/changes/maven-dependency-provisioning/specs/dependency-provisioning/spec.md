## ADDED Requirements

### Requirement: Hệ Maven được cấp phụ thuộc bằng kho RIÊNG từng repo, mount chỉ đọc

Với repo đích thuộc hệ Maven, engine SHALL nạp một **kho phụ thuộc riêng cho repo ấy** trong container có
mạng, rồi mount kho ấy vào container chạy probe ở chế độ **chỉ đọc**.

Kho SHALL là **riêng từng repo**, MUST NOT dùng chung giữa các repo đích.

Sau khi nạp, kho SHALL được **mở quyền đọc** cho tiến trình trong container. Không có bước này thì bước
chạy probe báo sai bệnh.

Engine SHALL truyền **cờ ngoại tuyến và đường dẫn kho** cho trình quản lý gói **qua môi trường**, MUST NOT
đòi `runner.test_cmd` của repo đích mang đường dẫn nội bộ của CheckMate.

Ảnh chạy cho hệ Maven SHALL lấy từ bản đồ ghim digest, và ảnh ấy SHALL mang sẵn trình quản lý gói — engine
MUST NOT phụ thuộc vào trình bao bọc (`wrapper`) do repo đích cung cấp.

*Vì sao kho RIÊNG từng repo dù tốn đĩa: kho dùng chung để phụ thuộc của repo A nằm trong bản dựng của repo
B. Với một công cụ mà repo đích là **bên bị chấm**, đó là một đường ảnh hưởng chéo không ai khai. Đo được:
kho của một repo Spring Boot là **248 MB / 501 jar**; máy chủ còn 48 GB, nên cái giá là đĩa chứ không phải
tính đúng.*

*Vì sao KHÔNG dùng trình bao bọc của repo đích — đo trên prod 08/09: `./mvnw` trong container dừng với
«Failed to validate Maven distribution SHA-256». Tải **chính tệp ấy** trong **chính ảnh ấy** cho sha256
**khớp đúng** giá trị repo ghim, và tệp là ZIP hợp lệ ⇒ mạng không sao, artifact không sao, **trình bao bọc
mới là chỗ hỏng**. Một lớp mà engine không kiểm soát được và không cần thiết là một lớp nên bỏ, không phải
một lớp nên sửa.*

*Vì sao quyền đọc thành luật: kho tạo bằng `mktemp` có mode `0700`; tiến trình trong container chạy dưới
một định danh khác nên **không vào được**, và trình quản lý gói báo «artifact absent» — một thông điệp nói
về **thiếu gói** trong khi bệnh là **không đọc được**. Đúng họ với con bệnh mà `probe-environment` tồn tại
để diệt.*

*Vì sao cờ đi qua môi trường: `runner.test_cmd` là hợp đồng của **repo đích**. Bắt nó mang đường mount nội
bộ của CheckMate là buộc hai bên vào nhau không cần thiết, và nó đổi hình dạng cấu hình chung của repo vì
một người tiêu dùng.*

#### Scenario: nạp kho cho một repo Maven
- **WHEN** người vận hành yêu cầu cấp phụ thuộc cho một repo đích hệ Maven
- **THEN** engine nạp kho riêng cho repo ấy trong container có mạng, dùng ảnh lấy từ bản đồ ghim digest

#### Scenario: chạy probe sau khi đã nạp
- **WHEN** lượt chấm chạy probe của repo Maven đã có kho
- **THEN** kho được mount **chỉ đọc**, container chạy probe **không có mạng**, và trình quản lý gói nhận cờ
  ngoại tuyến cùng đường kho **qua môi trường**

#### Scenario: hai repo Maven cùng lúc
- **WHEN** hai repo đích hệ Maven cùng được cấp phụ thuộc
- **THEN** mỗi repo có kho riêng; phụ thuộc của repo này MUST NOT nằm trong bản dựng của repo kia

#### Scenario: kho chưa mở quyền đọc
- **WHEN** kho vừa nạp xong còn ở quyền hạn chế
- **THEN** engine mở quyền đọc trước khi coi lần nạp là thành công

#### Scenario: repo đích khai trình bao bọc
- **WHEN** repo đích có sẵn trình bao bọc trình quản lý gói
- **THEN** engine vẫn dùng trình quản lý gói **trong ảnh**; MUST NOT gọi trình bao bọc của repo đích

### Requirement: Cấp phụ thuộc cho một hệ MUST NOT tự nới cổng của repo đích

Engine MUST NOT tự thêm cờ làm **tắt một phép kiểm của repo đích** (kiểm định dạng, kiểm tĩnh, cổng chất
lượng) vào lệnh chạy probe. Cờ như vậy SHALL do repo đích tự khai trong `runner.test_cmd`.

Khi phép kiểm của repo đích làm probe do engine sinh không chạy được, engine SHALL báo đúng hiện tượng cho
người vận hành, MUST NOT tự gỡ phép kiểm ấy.

*Vì sao thành luật — đo trên prod 08/09: `admin-be` bind bộ kiểm định dạng vào pha chạy test, nên một probe
JUnit **hợp lệ** vẫn làm bản dựng thất bại **trước khi một test nào chạy**, và engine đọc «không có báo cáo»
thành sự cố hạ tầng. Cờ bỏ qua kiểm định dạng làm nó chạy đúng ngay.*

*Nhưng cờ ấy là quyết định về **cái gì được bỏ qua khi chấm chính repo ấy**. Engine tự thêm là maker-checker
đảo chiều: bên chấm tự nới cổng của bên bị chấm, không ai khai, không ai duyệt. Thà lượt chấm không chạy
được và nói rõ vì sao, còn hơn chạy được nhờ một cổng bị tắt lặng lẽ.*

#### Scenario: phép kiểm của repo đích chặn probe
- **WHEN** một cổng chất lượng của repo đích làm probe do engine sinh không chạy được
- **THEN** engine báo đúng hiện tượng ấy; MUST NOT tự thêm cờ tắt cổng vào lệnh chạy

#### Scenario: repo đích tự khai cờ
- **WHEN** repo đích khai cờ bỏ qua phép kiểm trong `runner.test_cmd` của mình
- **THEN** engine chạy đúng lệnh đã khai, không thêm và không bớt

#### Scenario: cổng repo đích chặn probe thì KHÔNG sinh lại probe
- **WHEN** bản dựng của repo đích thất bại **trước khi test chạy** vì một cổng chất lượng, nên không có
  báo cáo test nào
- **THEN** engine xếp đây là lỗi **môi trường/hợp đồng**, nêu tên cổng đã chặn, và MUST NOT sinh lại probe
  để thử lại

*Vì sao phải khai riêng thành scenario dù requirement đã nói «báo đúng hiện tượng» — đo 08/09, sau khi
`oapi-portal-be` bổ phép đo còn thiếu: hiện engine xếp ca này vào «probe lỗi thu thập» và **sinh lại probe
hai lần**. Fail-closed vẫn giữ (lượt chấm ném lỗi, không ra PASS), nhưng nó **kê sai tên bệnh** và tiêu hai
lời gọi model cho một nguyên nhân mà sinh lại không thể sửa. Ranh giới phân biệt phải hẹp: bản dựng gãy ở
bước **biên dịch** chính probe là lỗi của probe ⇒ sinh lại ĐÚNG; gãy ở một cổng chạy **trước** khi test
chạy là lỗi hợp đồng của repo đích ⇒ sinh lại là lãng phí. Rộng tay ở đây sẽ nuốt mất ca sinh-lại-đúng.*
