## MODIFIED Requirements

### Requirement: Không đường ghi nào ra ngoài thư mục của lượt chạy

Tài sản của CheckMate — kho khoá, cấu hình, sổ cái verdict, thư viện probe, bản clone repo đích — MUST NOT
nằm trong cây filesystem mà tiến trình test nhìn thấy được.

Phụ thuộc dựng sẵn (ví dụ `node_modules` của bản clone) MAY được đưa vào, và khi đưa vào thì SHALL ở chế
độ **chỉ đọc**.

Bộ chạy test MAY đòi ghi vào một vài đường **bên trong** thư mục phụ thuộc — ví dụ chỗ vite sinh file
bundle tạm để nạp file cấu hình TypeScript. Với những đường ấy, engine MAY phủ một lớp **tạm, nằm trong
bộ nhớ, không bền** (tmpfs), và khi làm vậy thì:

- danh sách đường được phủ SHALL là **danh sách ĐÓNG khai trong mã**, mỗi mục kèm lý do — MUST NOT là một
  mẫu chung, một biến môi trường, hay một khoá của `checkmate.yml`;
- lớp phủ SHALL biến mất cùng lượt chạy, và ghi vào đó MUST NOT chạm tới thư mục phụ thuộc thật của bản
  clone;
- mọi đường **khác** trong thư mục phụ thuộc SHALL vẫn chỉ đọc.

Mạng ra ngoài SHALL tắt mặc định.

Lượt chạy SHALL có trần **bộ nhớ**, **CPU** và **số tiến trình**.

*Vì sao vế thứ nhất nặng hơn vế rò bí mật: thư viện probe ghi được nghĩa là **đối tượng bị chấm sửa được
công cụ chấm nó**, và sửa một lần thì bền vững sang mọi lượt sau. Sổ cái ghi được nghĩa là bằng chứng bị
chính đối tượng bị chấm sửa — trigger append-only nằm trong chính file ấy, ghi đè cả file thì trigger đi
theo. Cô lập mà vẫn bind ghi được ra ngoài thì container không chặn gì cả.*

*Vì sao trần tài nguyên là một vế riêng: namespace không tự giới hạn gì. Một lượt chấm hỏng không được kéo
theo sản phẩm khác chạy trên cùng máy.*

*Vì sao nới một đường ghi tạm, và vì sao nó KHÔNG phá vế trên: đo được 07/09 — mọi lượt chấm code hỏng vì
vite phải ghi `node_modules/.vite-temp` để nạp `vitest.config.ts`, mà mount là `:ro`. Cái mà luật này cấm
là **sửa được thứ bền vững sang lượt sau**; một lớp tmpfs biến mất cùng container không sửa được gì bền,
và `node_modules` thật của bản clone không hề bị chạm. Danh sách phải ĐÓNG và nằm trong mã vì đây là bề
mặt ⛔C4 — để repo đích tự khai đường ghi là trả lại đúng thứ vừa lấy đi.*

*Vì sao không đổi file cấu hình của repo đích thay vì sửa công cụ: CheckMate phục vụ nhiều đội. Bắt mỗi
repo đích tự sửa cấu hình test của mình để chạy được trong sandbox là đẩy chi phí sang N đội, và đội nào
quên thì lượt chấm của họ chết ở một chỗ khó hiểu.*

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
- **THEN** nó ở chế độ chỉ đọc, và ghi vào đó thất bại — trừ đúng những đường trong danh sách đóng ở trên

#### Scenario: bộ chạy test ghi được đường tạm đã khai
- **WHEN** bộ chạy test ghi vào một đường nằm trong danh sách đóng (ví dụ chỗ vite sinh bundle cấu hình)
- **THEN** thao tác thành công và bộ test chạy tới nơi, xuất được kết quả theo hợp đồng

#### Scenario: ghi vào phụ thuộc thật vẫn thất bại
- **WHEN** code chạy trong môi trường cô lập ghi vào một file bất kỳ của thư mục phụ thuộc NGOÀI danh sách
  đóng — ví dụ sửa mã một gói đã cài
- **THEN** thao tác thất bại, và thư mục phụ thuộc của bản clone sau lượt chấm còn nguyên từng byte

#### Scenario: lớp phủ tạm không bền qua hai lượt
- **WHEN** một lượt chạy ghi dữ liệu vào đường tạm rồi kết thúc, và một lượt sau dựng môi trường mới
- **THEN** lượt sau KHÔNG thấy dữ liệu ấy — lớp phủ mới rỗng

#### Scenario: không có thư mục phụ thuộc thì không phủ gì
- **WHEN** bản clone không có thư mục phụ thuộc để đưa vào
- **THEN** không mount tạm nào được thêm — không có gì để phủ, và một mount thừa là một bề mặt thừa
