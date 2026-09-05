# sandbox-isolation Specification

## Purpose
TBD - created by archiving change container-isolated-probe-runs. Update Purpose after archive.

## Requirements

### Requirement: Code của artifact đang chấm chạy trong môi trường CÔ LẬP dùng-một-lần

Mọi lượt chạy probe SHALL diễn ra trong một môi trường cô lập **dựng riêng cho lượt ấy** và **huỷ sau khi
xong**. Trạng thái do một lượt để lại MUST NOT nhìn thấy được ở lượt sau.

Tiến trình chạy test SHALL chạy dưới danh tính **không đặc quyền**, và MUST NOT chạy dưới danh tính của
dịch vụ CheckMate.

Runtime cô lập MUST NOT đòi một tiến trình nền chạy quyền quản trị. *(Một daemon chạy root, mà tư cách
thành viên một nhóm hệ điều hành đủ để điều khiển nó, là thêm một đường leo quyền vào đúng cái máy đang
được gia cố — tức trả bằng thứ mình vừa mua.)*

*Vì sao thành luật: CheckMate **chủ động chạy code của pull request đang được review**. Đó là điều kiện
làm việc của nó, không phải một rủi ro phụ. Đo được trên prod trước change: tiến trình test đọc được kho
khoá (457 byte), đọc và GHI được sổ cái verdict (3.7 MB), ghi được thư viện probe, đọc được
`authorized_keys`, và ra được Internet.*

#### Scenario: một lượt chấm bình thường
- **WHEN** engine chạy probe của một lượt chấm
- **THEN** chúng chạy trong môi trường cô lập dựng riêng, và môi trường ấy bị huỷ khi lượt kết thúc

#### Scenario: lượt trước để lại trạng thái
- **WHEN** một lượt chấm ghi file, đặt biến, hoặc sinh tiến trình còn sống
- **THEN** lượt kế tiếp không nhìn thấy thứ nào trong số đó

### Requirement: Không đường ghi nào ra ngoài thư mục của lượt chạy

Tài sản của CheckMate — kho khoá, cấu hình, sổ cái verdict, thư viện probe, bản clone repo đích — MUST NOT
nằm trong cây filesystem mà tiến trình test nhìn thấy được.

Phụ thuộc dựng sẵn (ví dụ `node_modules` của bản clone) MAY được đưa vào, và khi đưa vào thì SHALL ở chế
độ **chỉ đọc**.

Mạng ra ngoài SHALL tắt mặc định.

Lượt chạy SHALL có trần **bộ nhớ**, **CPU** và **số tiến trình**.

*Vì sao vế thứ nhất nặng hơn vế rò bí mật: thư viện probe ghi được nghĩa là **đối tượng bị chấm sửa được
công cụ chấm nó**, và sửa một lần thì bền vững sang mọi lượt sau. Sổ cái ghi được nghĩa là bằng chứng bị
chính đối tượng bị chấm sửa — trigger append-only nằm trong chính file ấy, ghi đè cả file thì trigger đi
theo. Cô lập mà vẫn bind ghi được ra ngoài thì container không chặn gì cả.*

*Vì sao trần tài nguyên là một vế riêng: namespace không tự giới hạn gì. Một lượt chấm hỏng không được kéo
theo sản phẩm khác chạy trên cùng máy.*

#### Scenario: probe cố đọc kho khoá
- **WHEN** code chạy trong môi trường cô lập cố đọc kho khoá hoặc sổ cái của CheckMate
- **THEN** những đường dẫn ấy không tồn tại trong cây nó nhìn thấy

#### Scenario: probe cố sửa thư viện probe
- **WHEN** code chạy trong môi trường cô lập cố ghi vào thư viện probe
- **THEN** thao tác thất bại, và thư viện sau lượt chấm còn nguyên

#### Scenario: probe cố gọi mạng
- **WHEN** code chạy trong môi trường cô lập cố mở kết nối ra ngoài
- **THEN** kết nối không thành

#### Scenario: phụ thuộc dựng sẵn
- **WHEN** bản clone có thư mục phụ thuộc và nó được đưa vào môi trường chạy
- **THEN** nó ở chế độ chỉ đọc, và ghi vào đó thất bại

### Requirement: Mức cô lập phải được KHAI RA, không được giả định

Lượt chấm SHALL khai **mức cô lập thực tế đạt được** trong dữ liệu verdict, và bề mặt đọc SHALL bày nó.

Khi nền không cô lập được — runtime vắng mặt, hệ điều hành không hỗ trợ — lượt chấm MAY vẫn chạy, nhưng
SHALL khai rõ là **chạy KHÔNG cô lập**. MUST NOT im lặng chạy như thể đã cô lập.

Mức cô lập MUST NOT được suy ra từ cấu hình mong muốn; nó SHALL phản ánh thứ **thực sự đã dùng** cho lượt
ấy.

*Vì sao vế này thuộc ⛔C2: một verdict từ nền không cô lập không cùng giá trị với verdict từ nền có, và
người đọc phải thấy điều đó **trong dữ liệu** chứ không phải suy từ lời văn. Máy dev là Windows, prod có
thể thiếu runtime — khoảng cách giữa hai nền càng lớn thì việc im lặng càng đắt. «Đã cấu hình để cô lập»
và «đã cô lập» là hai câu khác nhau, và chỉ câu thứ hai đáng ghi vào verdict.*

#### Scenario: lượt chạy có cô lập
- **WHEN** lượt chấm chạy trong môi trường cô lập
- **THEN** verdict khai mức cô lập ấy kèm runtime đã dùng

#### Scenario: nền không cô lập được
- **WHEN** runtime cô lập không có mặt trên nền đang chạy
- **THEN** lượt chấm khai rõ là chạy KHÔNG cô lập, và bề mặt đọc bày điều đó cạnh các số nói về chỗ yếu
  của lượt chấm

#### Scenario: cấu hình bật nhưng thực tế không dùng được
- **WHEN** cấu hình yêu cầu cô lập mà runtime lỗi lúc dựng
- **THEN** mức khai ra là mức THỰC TẾ, không phải mức mong muốn

### Requirement: Ảnh chạy do repo đích khai, và đọc từ NHÁNH GỐC

Repo đích MAY khai ảnh chạy của riêng nó trong hợp đồng `checkmate.yml`. Không khai thì dùng ảnh mặc định
**ghim phiên bản cụ thể**, MUST NOT dùng thẻ trôi.

Khai báo ấy SHALL đọc từ **bản trên đĩa của clone** (trạng thái nhánh gốc), MUST NOT đọc từ nhánh pull
request.

*Vì sao: cùng luật đã áp cho `runner.test_cmd` và `sources.specs` — pull request không được đổi đầu vào
của chính phép chấm nó bằng nội dung của chính nó. Ở đây hậu quả cụ thể là PR tự chọn được môi trường mà
code của nó sẽ chạy.*

#### Scenario: repo khai ảnh riêng
- **WHEN** `checkmate.yml` trên nhánh gốc khai ảnh chạy
- **THEN** lượt chấm dùng ảnh ấy

#### Scenario: pull request sửa khai báo ảnh
- **WHEN** nhánh pull request đổi khai báo ảnh trong `checkmate.yml`
- **THEN** lượt chấm vẫn dùng khai báo của nhánh gốc

#### Scenario: repo không khai gì
- **WHEN** `checkmate.yml` không khai ảnh
- **THEN** dùng ảnh mặc định ghim phiên bản cụ thể
