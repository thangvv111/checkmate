## ADDED Requirements

### Requirement: Màn thư viện bày cả phần YẾU của tài sản, không chỉ phần đẹp

Màn thư viện probe SHALL hiện, cho **từng** probe: dấu vết hành vi qua các lượt gần nhất, và một dòng tóm
tắt **bằng chữ** nói probe ấy đã bắt được hồi quy hay chưa.

Probe **chưa từng bắt hồi quy nào** SHALL được nói ra bằng đúng câu ấy, MUST NOT bị bỏ trống hay trộn lẫn
với probe có thành tích. Probe **fail ở cả hai nhánh** SHALL được khai là lỗi có sẵn, không phải hồi quy.

Màu SHALL KHÔNG là kênh duy nhất mang một trạng thái: mỗi ô hành vi phải đọc được bằng chữ khi rê chuột, và
dòng tóm tắt phải nói cùng điều ấy bằng chữ.

*Vì sao: thư viện là tài sản người vận hành phải QUYẾT ĐỊNH trên nó — giữ hay bỏ, tin hay nghi. Một màn chỉ
đếm «89 probe» làm mọi probe trông ngang giá nhau, trong khi 20 cái trong đó có thể đang chết. Bày số đẹp
và giấu chỗ yếu là đúng thứ mà luật «verdict phải khai vùng xám của chính nó» (`man-run`) đã cấm ở một màn
khác của cùng sản phẩm này.*

#### Scenario: probe từng bắt hồi quy
- **WHEN** một probe có ít nhất một lượt mang nhãn hồi quy
- **THEN** dòng tóm tắt của nó nói số lần bắt được hồi quy

#### Scenario: probe im lặng suốt
- **WHEN** một probe chưa từng bắt hồi quy nào
- **THEN** màn nói thẳng «chưa bắt được hồi quy nào», không để trống chỗ ấy

#### Scenario: probe chết kéo dài
- **WHEN** một probe fail ở cả hai nhánh qua nhiều lượt
- **THEN** nó được khai là lỗi có sẵn, không bị đếm như một lần bắt hồi quy

#### Scenario: đọc được khi không phân biệt được màu
- **WHEN** người đọc không dựa vào màu
- **THEN** trạng thái từng lượt vẫn đọc được bằng chữ, và dòng tóm tắt vẫn nói đủ kết luận

### Requirement: Hai trạng thái rỗng nói HAI câu khác nhau

«Repo đang chọn chưa có probe nào» và «chưa kết nối repo nào» SHALL là hai thông điệp khác nhau trên màn
thư viện.

Cả hai SHALL KHÔNG dùng ngôn ngữ hay màu của trạng thái hỏng, và MUST NOT bày một danh sách rỗng khi thực
tế là **chưa tra được** — chưa tra và đã tra mà không có gì là hai chuyện.

*Vì sao: đây chính là luật mà trang «chưa dựng» đời trước dựng lên để tôn trọng, và nó vẫn đúng sau khi màn
thật có mặt. Một danh sách rỗng nghĩa là ĐÃ TRA, CHƯA CÓ GÌ — mượn nó để khoả lấp một chỗ không tra được là
để người dùng ngồi đợi thứ không bao giờ tới.*

#### Scenario: repo đã kết nối nhưng thư viện trống
- **WHEN** repo đang chọn chưa có probe nào
- **THEN** màn nói thư viện dựng dần từ các lượt chấm trên repo này

#### Scenario: chưa kết nối repo nào
- **WHEN** cấu hình không có repo nào
- **THEN** màn nói chưa kết nối repo nào và chỉ đường tới chỗ thêm repo, KHÔNG nói thư viện trống

#### Scenario: rỗng không phải hỏng
- **WHEN** màn ở một trong hai trạng thái rỗng
- **THEN** nó không dùng màu hay lời văn của trạng thái hỏng

### Requirement: Nội dung do model và repo đích sinh ra là DỮ LIỆU, kể cả khi nó là mã nguồn

Mọi trường của probe hiện lên màn — tên file, mục đích, luật spec, và **code probe** — SHALL được thoát
trước khi vào HTML.

Code probe SHALL hiện dưới dạng văn bản, MUST NOT được nhúng vào tài liệu như mã chạy được, và MUST NOT
được đưa ra ngoài phạm vi những người đã qua cửa phiên.

Đường đọc thư viện SHALL KHÔNG mang theo giá trị cấu hình, chìa riêng của repo, hay biến môi trường nào vào
nội dung trả về.

*Vì sao: probe do model sinh, dựa trên nội dung repo đích — tức nó là dữ liệu ngoài hạng không tin cậy
(⛔C4), và nó lại đúng là thứ trông giống mã nguồn nhất trong cả sản phẩm. Một `</script>` nằm trong thân
probe mà không thoát thì màn thư viện thành đường tiêm; và người viết dễ tự thuyết phục rằng «code thì phải
để nguyên mới đọc được».*

#### Scenario: probe chứa ký tự đóng thẻ
- **WHEN** code hoặc mục đích của một probe chứa chuỗi đóng thẻ HTML
- **THEN** nó hiện ra nguyên văn dưới dạng chữ, không tạo phần tử nào trong tài liệu

#### Scenario: người chưa đăng nhập gọi đường đọc thư viện
- **WHEN** một yêu cầu không có phiên hợp lệ gọi đường đọc thư viện
- **THEN** bị từ chối như mọi đường sau cửa phiên, không trả về probe nào

#### Scenario: nội dung trả về không mang bí mật
- **WHEN** rà nội dung màn và API thư viện
- **THEN** không có chìa riêng, token, hay giá trị người vận hành gõ vào ô cấu hình

### Requirement: Số trên màn phải là số ĐO ĐƯỢC, và trần đọc từ cấu hình

Số probe và trần thư viện hiện trên màn SHALL đọc từ thư viện thật và từ cấu hình đang có hiệu lực, và
MUST NOT hard-code.

Khi một số không đo được, màn SHALL nói **không đo được** và MUST NOT hiện `0` thay cho nó.

Màn SHALL đọc thư viện của **repo đang chọn**, và MUST NOT gộp thư viện của nhiều repo vào một danh sách.

*Vì sao: trần từng bị hạ nhầm là một tai nạn có thật ở sản phẩm này — trần nhỏ nghĩa là đào thải probe, một
chiều. Một màn hiển thị trần hard-code sẽ nói dối đúng vào lúc người vận hành cần con số ấy nhất. Và `0`
thay cho «không đo được» là cùng một lỗi mà `man-run` đã cấm ở bảng độ phủ luật: `0` nghĩa là đã đếm.*

#### Scenario: trần đổi trong cấu hình
- **WHEN** người vận hành đổi trần thư viện rồi mở lại màn
- **THEN** màn hiện đúng trần mới, không phải một số cố định

#### Scenario: nhiều repo đã khai
- **WHEN** hệ thống có nhiều repo và người dùng đang chọn một repo
- **THEN** màn chỉ bày probe của repo ấy

#### Scenario: không đọc được thư viện
- **WHEN** thư viện của repo đang chọn không đọc được
- **THEN** màn nói không đo được kèm nguyên nhân, KHÔNG hiện `0 probe`
