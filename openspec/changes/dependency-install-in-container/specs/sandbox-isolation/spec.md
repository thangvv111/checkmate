## ADDED Requirements

### Requirement: Ngoại lệ mạng CHỈ cho bước cài phụ thuộc, và chỉ ở container KHÔNG chạy code repo đích

Container chạy probe SHALL giữ mạng **tắt**, không có ngoại lệ.

Container **cài phụ thuộc** MAY có mạng, và chỉ được phép khi **cả bốn** điều kiện dưới đây cùng đúng:

1. không script nào của repo đích hoặc của gói phụ thuộc được chạy trong đó;
2. thư mục làm việc là thư mục tạm rỗng, không phải bản clone;
3. không mount nào trỏ tới tài sản của CheckMate — kho khoá, cấu hình, sổ cái, thư viện probe, bản clone;
4. vẫn có đủ trần **bộ nhớ**, **CPU**, **số tiến trình**, và cờ không-leo-quyền.

Ngoại lệ này MUST được khai ở **một chỗ trong mã** và MUST NOT suy ra từ việc thiếu cờ tắt mạng.

*Vì sao ngoại lệ phải viết thành luật thay vì thành một dòng code: `sandbox-isolation › Không đường ghi nào
ra ngoài thư mục của lượt chạy` khai «mạng ra ngoài SHALL tắt mặc định». Chữ «mặc định» cho phép ngoại lệ,
nhưng một ngoại lệ không có tên là một ngoại lệ không ai rà lại được. Đây là container DUY NHẤT của sản
phẩm có mạng — nó xứng đáng có tên.*

*Vì sao điều kiện 1 là điều kiện then chốt: mạng một mình không nguy hiểm, và code repo đích một mình đã bị
`--network=none` chặn. Thứ nguy hiểm là **giao** của hai cái. Đóng điều kiện 1 nghĩa là thứ duy nhất chạy
trong container có mạng là trình quản lý gói — một chương trình của bên chấm, không phải của bên bị chấm.*

#### Scenario: container chạy probe
- **WHEN** engine dựng container để chạy probe
- **THEN** mạng tắt

#### Scenario: container cài phụ thuộc
- **WHEN** engine dựng container để cài phụ thuộc
- **THEN** mạng bật, script cài tắt, thư mục làm việc là thư mục tạm, và các trần tài nguyên vẫn có

#### Scenario: đọc mã nguồn tìm chỗ bật mạng
- **WHEN** rà mã nguồn các chỗ dựng đối số container
- **THEN** đúng **một** chỗ bật mạng, và chỗ ấy là đường cài phụ thuộc

### Requirement: Ảnh chạy chọn theo phiên bản runtime repo đích, từ một BẢN ĐỒ ghim digest

Engine SHALL chọn ảnh chạy theo phiên bản runtime mà repo đích khai, tra trong một **bản đồ đóng** ánh xạ
phiên bản chính → **digest**. Bản đồ MUST nằm trong mã. Thêm một phiên bản MUST là một change.

Ảnh **cài phụ thuộc** và ảnh **chạy probe** của cùng một repo SHALL lấy từ cùng bản đồ và cùng phiên bản.

Phiên bản đọc từ repo đích là **dữ liệu ngoài** (⛔C4): nó SHALL chỉ dùng làm **khoá tra bản đồ**, MUST NOT
ghép vào tên ảnh.

Repo khai một phiên bản **không có trong bản đồ** SHALL làm bước cài **từ chối**, kèm thông điệp nêu phiên
bản ấy; MUST NOT lặng lẽ rơi về ảnh mặc định.

`runner.image` do repo đích khai SHALL vẫn thắng bản đồ — nhưng khi ấy nó cũng dùng cho **cả hai** container.

*Vì sao ảnh cài và ảnh chạy phải khớp — đo được 07/09, và đây là số đo quan trọng nhất của change này:
sau khi cài `admin-fe` bằng Node 24, cửa kiểm hết chặn nhưng **cảnh báo runtime vẫn còn**, vì probe vẫn
chạy trong ảnh Node 22. Cây phụ thuộc xây cho một runtime đem chạy trên runtime khác sẽ hỏng, và lỗi khi
ấy lại KHÔNG nói gì về pull request đang chấm — đúng loại lỗi hai nhịp này sinh ra để diệt. Cài trong
container mà không sửa ảnh chạy là đổi một cái bẫy lấy một cái bẫy khác.*

*Vì sao từ chối chứ không rơi về mặc định: rơi về mặc định là tái tạo đúng con bệnh vừa mất công làm cho
nhìn thấy được. Thà nói «chưa có ảnh cho phiên bản này» còn hơn chạy trên một runtime không ai khai và báo
kết quả như thể nó đúng.*

*Vì sao ghim digest chứ không dùng thẻ: cùng lý lẽ đã khai cho ảnh mặc định — thẻ trôi làm hai lượt chấm
cùng một commit chạy trong hai môi trường khác nhau, và trôi trong im lặng.*

#### Scenario: repo khai phiên bản có trong bản đồ
- **WHEN** repo đích khai một phiên bản runtime có hàng trong bản đồ
- **THEN** cả bước cài lẫn lượt chạy probe dùng đúng digest của hàng ấy

#### Scenario: repo khai phiên bản KHÔNG có trong bản đồ
- **WHEN** repo đích khai một phiên bản không có hàng
- **THEN** bước cài từ chối kèm thông điệp nêu phiên bản; MUST NOT dùng ảnh mặc định

#### Scenario: repo không khai phiên bản nào
- **WHEN** repo đích không khai phiên bản runtime
- **THEN** dùng ảnh mặc định cho cả hai container

#### Scenario: chuỗi phiên bản kỳ lạ từ repo đích
- **WHEN** repo đích khai một chuỗi phiên bản không đọc được thành số
- **THEN** coi như không khai; chuỗi ấy MUST NOT xuất hiện trong tên ảnh

#### Scenario: repo khai thẳng ảnh chạy
- **WHEN** repo đích khai `runner.image`
- **THEN** ảnh ấy dùng cho cả bước cài lẫn lượt chạy probe
