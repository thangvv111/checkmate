## ADDED Requirements

### Requirement: `test_cmd` là template hai chỗ thay, và đường dẫn thay vào phải chịu được khoảng trắng

Lệnh chạy test của repo đích SHALL được dựng bằng cách thay hai chỗ trong `test_cmd`: một chỗ nhận đường
dẫn file probe, một chỗ nhận đường dẫn file JUnit XML đầu ra.

Đường dẫn thay vào SHALL được bọc khi nó chứa khoảng trắng, để lệnh dựng ra vẫn nhận nó như **một** tham số.

*Vì sao vế thứ hai: thư mục tạm và thư mục người dùng trên Windows thường chứa khoảng trắng
(`C:\Users\Nguyen Van A\...`). Không bọc thì shell tách một đường dẫn thành hai tham số — bộ chạy test nhận
sai đối số, không xuất được XML, và lượt chấm báo «không ghi nhận được probe nào». Người đọc sẽ đi tìm lỗi
trong probe hoặc trong repo đích, trong khi nguyên nhân nằm ở tên thư mục của máy chủ.*

*Và ranh giới phải khai rõ: phép bọc này là để đường dẫn ĐÚNG, không phải hàng rào chống chèn lệnh. Hai giá
trị được bọc do chính checker sinh ra. `test_cmd` thì đến từ repo đích và chạy qua shell — đó là thiết kế
cố ý, vì hợp đồng này tồn tại chính để repo đích chọn lệnh chạy test của nó, trong sandbox, dưới quyền của
lượt chấm. Ai đọc chỗ này mà tưởng `quote` là gác an ninh sẽ hoặc tin nó quá mức, hoặc siết nó thành cái
làm hỏng đường dẫn hợp lệ.*

#### Scenario: lệnh dựng ra mang đúng hai đường dẫn
- **WHEN** chạy probe qua `test_cmd` của repo đích
- **THEN** chỗ thay thứ nhất nhận đường dẫn file probe, chỗ thay thứ hai nhận đường dẫn file XML đầu ra

#### Scenario: đường dẫn chứa khoảng trắng
- **WHEN** file probe nằm trong thư mục có khoảng trắng trong tên
- **THEN** lệnh vẫn chạy đúng và XML vẫn được đọc — đường dẫn không bị tách làm hai tham số

### Requirement: Không ghi nhận được probe nào thì thông điệp lỗi phải mang nguyên nhân bộ chạy đã báo

Khi bộ chạy test của repo đích không xuất được JUnit XML, lượt chấm SHALL dừng với thông điệp mang **đầu ra
lỗi của chính bộ chạy đó**, và SHALL nêu file probe liên quan.

*Vì sao: dừng lại là đúng (⛔C2 — không chứng minh được thì không PASS), nhưng dừng mà không nói vì sao là
fail-closed **mù**. Người nhận đứng trước «không ghi nhận được probe nào» mà không biết đó là thiếu gói, sai
lệnh, sai thư mục, hay sai phiên bản. Nguyên nhân đã có sẵn trong `stderr` của bộ chạy; việc duy nhất phải
làm là để nó đi theo thông điệp ra ngoài thay vì bị nuốt.*

#### Scenario: bộ chạy không xuất XML
- **WHEN** lệnh test của repo đích chạy xong mà không tạo file XML
- **THEN** kết quả là thất bại, thông điệp mang đầu ra lỗi của bộ chạy và tên file probe

### Requirement: Đích của symlink node_modules phải là đường dẫn TUYỆT ĐỐI

Khi sandbox dùng chung `node_modules` của repo đích, đích của symlink SHALL được đưa về đường dẫn tuyệt đối
trước khi tạo.

*Vì sao — hỏng ở đây không báo lỗi, và đó là điều nguy hiểm: gọi checker với đường dẫn repo tương đối
(`--repo .`) thì đích thành `node_modules` tương đối, và symlink trỏ ngược vào chính thư mục sandbox. Không
có lỗi nào được ném. `npx` vẫn chạy được bộ chạy test vì nó tự tải về cache, nên lượt chấm **nhìn như đang
chạy bình thường** — nhưng mọi `import` gói từ trong worktree đều hỏng. Kết quả là một loạt probe đỏ với lý
do «Cannot find package», tức một finding sai hẳn bản chất: không phải «code có lỗi» mà là «sandbox dựng
sai», và người đọc verdict không có cách nào biết điều đó.*

#### Scenario: gọi với đường dẫn repo tương đối
- **WHEN** sandbox được dựng từ một repo chỉ ra bằng đường dẫn tương đối
- **THEN** symlink `node_modules` trỏ tới thư mục của repo đích bằng đường dẫn tuyệt đối, không trỏ vào
  chính thư mục sandbox
