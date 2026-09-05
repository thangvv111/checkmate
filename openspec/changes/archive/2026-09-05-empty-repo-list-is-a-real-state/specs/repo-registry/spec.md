## ADDED Requirements

### Requirement: Danh sách repo rỗng là một trạng thái THẬT, không được đoán ra một repo

Khi cấu hình khai danh sách repo **rỗng**, engine SHALL coi đó là «chưa kết nối repo nào». Nó MUST NOT
thay bằng một repo mặc định, và MUST NOT suy ra một repo từ bất kỳ nguồn nào khác.

Cấu hình đời cũ chỉ có MỘT repo đơn lẻ và **không có** trường danh sách SHALL vẫn được nâng thành danh
sách một phần tử — đó là một ca khác hẳn: ở đó người vận hành CÓ khai một repo.

Bề mặt đọc SHALL nói thẳng «chưa kết nối repo nào» kèm lối đi tới chỗ thêm repo. Nó MUST NOT bày một repo
không có trong cấu hình.

*Vì sao — đo được trên prod: bản trước thay danh sách rỗng bằng một repo hard-code, âm thầm, không lỗi và
không cảnh báo. Sau khi người vận hành xoá sạch repo, chế độ trực tự khởi hai lượt chấm trên chính repo ma
ấy trong vòng một phút, dựng lại clone và thư viện probe vừa được dọn. Một trạng thái mà sản phẩm không
biểu diễn được thì người dùng không đạt tới được — và ở đây «không đạt tới được» có nghĩa là máy vẫn chạy
code của một repo không ai khai.*

#### Scenario: danh sách rỗng khai tường minh
- **WHEN** cấu hình có trường danh sách repo và nó rỗng
- **THEN** engine đọc ra danh sách rỗng, không có repo đang chọn, và không repo mặc định nào xuất hiện

#### Scenario: cấu hình đời cũ một repo đơn lẻ
- **WHEN** cấu hình KHÔNG có trường danh sách nhưng có một repo đơn lẻ
- **THEN** nó được nâng thành danh sách một phần tử — đây là khai báo thật, không phải chỗ trống

#### Scenario: cấu hình trắng
- **WHEN** cấu hình không có cả danh sách lẫn repo đơn lẻ
- **THEN** danh sách rỗng — một bản vừa cài không có repo nào

#### Scenario: bề mặt đọc khi chưa có repo
- **WHEN** người dùng mở màn chính mà chưa kết nối repo nào
- **THEN** màn nói rõ chưa có repo và chỉ đường tới chỗ thêm; không bày tên repo nào

### Requirement: Mọi đường khởi một lượt chấm phải hỏi CÙNG một gác repo-đã-khai

Câu hỏi «CheckMate được phép đụng repo nào» SHALL có **một** chỗ trả lời. Mọi đường có thể khởi một lượt
chấm — bấm tay, chế độ trực, webhook — SHALL hỏi chỗ ấy.

Repo không nằm trong danh sách đã khai SHALL bị từ chối ở MỌI đường, và lý do từ chối phải giống nhau về
bản chất dù lời văn mỗi bề mặt một khác.

Khi chưa có repo nào, mọi đường khởi lượt chấm SHALL từ chối — MUST NOT chạy với một repo suy đoán.

*Vì sao phải là MỘT chỗ: gác này đã tồn tại ở đường webhook, dựng cẩn thận với lý do «chữ ký chỉ chứng
minh người gửi biết bí mật, không chứng minh việc này NÊN LÀM». Đường trực bỏ qua đúng vế thứ hai — và
hậu quả giống hệt: máy clone và chạy test của một repo chưa ai khai. Hai cửa cùng vai viết bằng hai biểu
thức riêng sẽ lệch nhau; khuôn ấy đã bị bắt chín lần trong repo này.*

#### Scenario: repo lạ đến từ webhook
- **WHEN** webhook mang payload trỏ một repo không có trong danh sách đã khai
- **THEN** bị từ chối, không lượt chấm nào khởi

#### Scenario: chế độ trực khi chưa có repo
- **WHEN** chế độ trực đang bật mà danh sách repo rỗng
- **THEN** nó không quét gì và không khởi lượt chấm nào

#### Scenario: bấm tay khi chưa có repo
- **WHEN** người dùng bấm chạy kiểm mà chưa kết nối repo nào
- **THEN** yêu cầu bị từ chối kèm lý do đọc được, không lượt chấm nào khởi

### Requirement: Ràng buộc «phải có repo» do KIỂU cưỡng chế, không do người nhớ

Hàm nào cần một repo cụ thể để làm việc SHALL khai điều đó trong **chữ ký** của nó, sao cho gọi mà chưa
qua phép kiểm là **lỗi biên dịch**.

Điều kiện «đã có repo» MUST NOT là một tham số hay một quy ước phải nhớ truyền qua nhiều lớp hàm.

*Vì sao: có 47 chỗ đọc repo đang chọn. Một điều kiện phải nhớ ở 47 chỗ thì sẽ có ngày quên, và ngày đó
không có lỗi nào nổ ra — đúng cùng một lý do mà luật «chế độ chỉ-đọc phải đọc thẳng từ trạng thái của màn»
đã ghi ở capability `man-run`.*

#### Scenario: gọi hàm cần repo mà chưa kiểm
- **WHEN** một hàm đòi cấu hình CÓ repo được gọi với cấu hình có thể rỗng
- **THEN** mã nguồn không biên dịch được

#### Scenario: đã qua phép kiểm
- **WHEN** cấu hình đi qua phép kiểm «có repo» rồi mới dùng
- **THEN** biên dịch được, và bên trong không cần kiểm lại lần nữa
