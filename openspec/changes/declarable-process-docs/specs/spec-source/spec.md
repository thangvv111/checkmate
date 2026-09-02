## MODIFIED Requirements

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
