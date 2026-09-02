# spec-source Specification

## Purpose
Engine đọc spec, tài liệu API và file test mẫu của repo đích từ đâu, và chia spec thành đơn vị luật
để probe neo vào. Capability này nói: repo đích khai nguồn của nó (engine không áp đặt hình dạng
repo), không khai thì engine tự dò và nói ra đã dò ở đâu; luật là đơn vị có địa chỉ chứ không phải
một mã có khuôn; và lượt chấm không có luật đối chiếu phải được khai ra ở prompt, verdict lẫn giao
diện thay vì im lặng. Sinh từ change `stop-forcing-target-repo-shape` (02/09/2026).

## Requirements

### Requirement: Nguồn spec do repo đích khai, không do engine áp đặt

Repo đích SHALL khai được **spec của nó nằm ở đâu** — nhiều đường, có mẫu glob, và đọc được cả thư
mục con. Engine MUST NOT giả định một tên thư mục, một đuôi file, hay một độ sâu cố định nào.

Không khai thì engine SHALL **tự dò** theo một thứ tự thông dụng, và SHALL nói ra **đã tìm ở đâu và
thấy được gì** — việc dò tìm là một phán đoán, mà phán đoán không nói ra thì người dùng không sửa được.

Cùng cách đó cho **tài liệu API**, **file test mẫu**, và **thư mục tài liệu quy trình**: chúng cũng là đầu
vào của lượt chấm — ba thứ đầu đi vào prompt, thứ tư quyết định PR đi đường code hay đường doc — nên repo
đích được quyền khai. Mọi khoá của mục `sources` MUST đi qua cùng một cửa đọc và cùng luật loại đường
không hợp lệ: đường tuyệt đối hay có `..` bị loại NGAY tại cửa và MANG THEO lý do để lượt chấm ghi ra.

Vì sao thành yêu cầu: bản trước đọc cứng `specs/*.md` phẳng, `README.md`, `test/`. Repo demo của
chính dự án này được viết vừa khớp bộ ba đó — tức sản phẩm chỉ chạy trên repo được dựng cho nó.

#### Scenario: repo khai nguồn spec
- **WHEN** repo đích khai đường dẫn spec trong cấu hình của nó
- **THEN** engine đọc đúng những đường đó, kể cả nhiều đường, có mẫu glob và có thư mục con

#### Scenario: repo không khai gì
- **WHEN** repo đích không khai nguồn spec
- **THEN** engine tự dò theo thứ tự thông dụng, và ghi ra đã dò những chỗ nào cùng kết quả từng chỗ

#### Scenario: đường khai trỏ vào chỗ không có gì
- **WHEN** repo khai một đường spec nhưng không file nào khớp
- **THEN** engine nói rõ đường nào không khớp — im lặng ở đây khiến người dùng tin spec đã được nạp

#### Scenario: khoá tài liệu quy trình cũng qua cùng cửa đọc
- **WHEN** repo khai `sources.process_docs` với một đường tuyệt đối hoặc có `..`
- **THEN** đường đó bị loại ở cửa đọc kèm lý do, như với `sources.specs`, và phần khai hợp lệ vẫn dùng được

### Requirement: Luật là ĐƠN VỊ CÓ ĐỊA CHỈ, không phải một mã có khuôn

Engine SHALL chia spec thành **đơn vị có địa chỉ** để probe neo vào, và địa chỉ đó MUST NOT phụ thuộc
việc repo đích đánh mã theo khuôn nào.

Một mã ngắn kiểu `R4.21` SHALL được nhận như **một trường hợp riêng** của địa chỉ, không phải điều
kiện để có địa chỉ. Repo viết spec bằng tiêu đề thường, bằng tên kịch bản, hay bằng bất cứ lối nào
chia được thành khối, đều SHALL neo probe được.

Việc so hai nhánh để tìm **luật mới** SHALL so theo đơn vị, không so theo mã.

Vì sao: yêu cầu thật của engine không phải «luật phải có mã» mà «luật phải **trỏ tới được**» — để
probe khai mình kiểm cái gì, để biết luật nào chỉ có ở nhánh PR, và để đếm độ phủ. Mã là một cách
đánh địa chỉ; ép nó thành cách DUY NHẤT là thu hẹp sản phẩm xuống đúng những repo chịu viết theo
khuôn của mình.

#### Scenario: spec không có mã luật nào
- **WHEN** spec của repo đích chia thành mục nhưng không dùng mã ngắn
- **THEN** mỗi mục vẫn là một đơn vị có địa chỉ, và probe vẫn neo vào được

#### Scenario: spec có mã luật
- **WHEN** một mục spec mở đầu bằng một mã ngắn
- **THEN** mã đó dùng được làm địa chỉ, và probe khai theo mã vẫn neo đúng mục ấy

#### Scenario: nhánh PR thêm một đơn vị luật mới
- **WHEN** nhánh PR có một đơn vị spec mà nhánh gốc không có
- **THEN** đơn vị đó được nhận là luật mới, bất kể repo có đánh mã hay không

### Requirement: Chấm KHÔNG có spec là trạng thái phải KHAI RA, không phải im lặng

Lượt chấm trên repo không có spec đọc được SHALL vẫn chạy — nhiều repo thật không có spec viết ra, và
từ chối thẳng thì công cụ không vào được cửa. Nhưng verdict SHALL **khai rõ** lượt đó chạy **không có
luật đối chiếu**, và giao diện SHALL bày điều đó ở chỗ đọc được trước khi đọc kết luận.

Độ phủ luật khi đó SHALL khai là **không đo được**, và MUST NOT khai là `0`. Hai điều đó khác nhau:
`0` nghĩa là đã đếm và không probe nào neo được; **không đo được** nghĩa là không có mẫu số.

Prompt sinh probe MUST NOT nói với model rằng «mọi probe phải neo vào một luật ở đây» khi khối luật
rỗng — bảo model neo vào chỗ trống là đẩy nó đi bịa ra một chỗ neo.

Vì sao thành yêu cầu: bản trước để chuyện này diễn ra hoàn toàn im lặng. Cổng vẫn chạy, vẫn ra
verdict, vẫn cho merge, trong khi nhãn `vi_pham_luat_moi` không bao giờ bật được và độ phủ hoá vô
nghĩa. Một verdict yếu trông giống hệt một verdict dày — đúng thứ ⛔C2 cấm.

#### Scenario: repo không có spec nào đọc được
- **WHEN** engine không tìm được đơn vị spec nào ở repo đích
- **THEN** lượt chấm vẫn chạy; verdict khai rõ nó chạy không có luật đối chiếu; độ phủ khai là không
  đo được; và prompt sinh probe KHÔNG đòi model neo vào luật

#### Scenario: giao diện của lượt chấm không có spec
- **WHEN** người dùng mở một lượt chấm chạy không có luật đối chiếu
- **THEN** trang nói ra điều đó trước phần verdict, cùng hạng với các cảnh báo đổi cách đọc khác

#### Scenario: repo CÓ spec
- **WHEN** engine đọc được ít nhất một đơn vị spec
- **THEN** không cảnh báo nào hiện, và độ phủ được đo bình thường

### Requirement: Sản phẩm không mang án lệ nội bộ của chính nó vào lượt chấm của người khác

Prompt gửi model MUST NOT tham chiếu tài liệu nội bộ của CheckMate. Tri thức đúc từ án lệ SHALL được
diễn đạt thành nội dung tự đứng được, không thành con trỏ tới một file mà repo đích không có.

Nhãn hiển thị của mỗi bước SHALL khớp với thứ bước đó thật sự làm. Nhãn lệch là một lời khai sai về
chính mình — và với công cụ mà toàn bộ giá trị là nói đúng, đó là lỗi nặng hơn vẻ ngoài của nó.

#### Scenario: prompt chấm tài liệu của repo khác
- **WHEN** engine dựng prompt chấm một tài liệu
- **THEN** prompt không chứa tham chiếu tới file hay mã luật nội bộ của CheckMate

#### Scenario: nhãn bước khai đúng số loại lỗi
- **WHEN** giao diện hiện tên bước nạp rubric
- **THEN** con số trong nhãn khớp đúng số loại rubric mà bước đó thật sự dùng
