## ADDED Requirements

### Requirement: Một khoảng giá trị có đúng MỘT nguồn

Với mỗi giá trị người vận hành chỉnh được, khoảng hợp lệ SHALL có **một nguồn duy nhất**, và ba thứ sau
SHALL suy ra từ nguồn ấy: nhãn hiển thị · ràng buộc của ô nhập · phép kẹp giá trị ở engine.

Mặc định của giá trị ấy SHALL nằm trong chính khoảng đó.

*Vì sao thành luật — đo được: trần đầu dò có BỐN con số cho cùng một thứ. Nhãn nói «2–12», ô nhập cho
tới 20, mặc định trong cấu hình là 10, gói design chốt 6. Người vận hành đọc nhãn rồi gõ 15 thì máy nhận,
và không ai biết 15 có nằm trong khoảng đã thử hay không. Không có chỗ nào SAI rõ ràng để sửa — mỗi con số
đều đúng ở chỗ của nó, chỉ là bốn chỗ không nói chuyện với nhau.*

#### Scenario: nhãn và ô nhập cùng một khoảng
- **WHEN** màn Cấu hình hiện một ô có khoảng giá trị
- **THEN** con số trong nhãn và ràng buộc của ô nhập lấy từ cùng một nguồn

#### Scenario: mặc định nằm trong khoảng
- **WHEN** đọc cấu hình chưa khai giá trị ấy
- **THEN** giá trị mặc định nằm trong khoảng đã khai

#### Scenario: giá trị ngoài khoảng
- **WHEN** một giá trị ngoài khoảng lọt tới engine
- **THEN** engine kẹp về biên của CHÍNH khoảng ấy, không kẹp về một biên khác

### Requirement: Ô chỉnh được tài sản prod phải nói ra cái mất trước khi người ta bấm

Ô cấu hình nào mà một giá trị NHỎ HƠN sẽ **xoá dữ liệu đang có** SHALL nói ra điều đó ngay tại chỗ nhập,
trước khi người dùng bấm lưu.

Đường di trú của một change MUST NOT tự hạ một trần như vậy. Đổi trần là quyết định của người vận hành;
một lần deploy không được biến nó thành hệ quả âm thầm.

*Vì sao: trần thư viện probe điều tiết `probes-lib/` — tài sản regression tích luỹ qua từng lượt chấm, và
deploy không được đè. Hạ trần từ 100 xuống 40 đào thải tới 60 probe, mỗi probe là một phép thử đã từng
chứng minh được điều gì đó. Cái mất ấy không lấy lại được bằng cách nâng trần lên lại.*

*Gói design đề xuất 40. Đề xuất ấy có ích cho một bản cài MỚI và có hại cho một bản đang chạy — nên nó
được BÀY RA ở ô nhập, không được ÁP vào bằng mặc định.*

#### Scenario: hạ trần thư viện probe
- **WHEN** người vận hành nhìn ô trần thư viện probe
- **THEN** ô nói rõ hạ trần sẽ đào thải probe đang có, và nói rõ con số gói design đề xuất

#### Scenario: nâng cấp bản cài đang chạy
- **WHEN** một bản cài đang chạy được cập nhật lên phiên bản có ô này
- **THEN** trần đang áp KHÔNG đổi, và không probe nào bị đào thải vì lần cập nhật đó

#### Scenario: cấu hình đời cũ chưa có trường
- **WHEN** đọc cấu hình chưa khai trần thư viện
- **THEN** giá trị dùng là trần đang áp trước đó, không phải con số gói design đề xuất

### Requirement: Nhãn trạng thái ở màn Cấu hình không mượn màu verdict

Chip và nhãn trạng thái ở màn Cấu hình SHALL dùng bộ semantic **chỉ khi** chúng nói kết quả một phép kiểm
hoặc một mức nghiêm trọng. Trạng thái vòng đời của một mục — đang chọn, đang dùng, đã ngừng — SHALL dùng
accent hoặc ramp trung tính.

*Vì sao «đã ngừng» không phải FAIL: một nhà cung cấp bị khai tử không hỏng — nó chỉ không còn tồn tại.
Tô nó bằng màu FAIL nói với người đọc rằng có gì đó cần sửa, trong khi thứ cần làm là chọn nhà cung cấp
khác.*

#### Scenario: nhà cung cấp đã khai tử
- **WHEN** một nhà cung cấp được đánh dấu ngừng
- **THEN** nhãn của nó dùng ramp trung tính, không dùng màu FAIL

#### Scenario: repo thiếu chìa riêng
- **WHEN** một repo không có chìa riêng và không có đường đi thay thế
- **THEN** nó mang cảnh báo dùng bộ semantic — đây là một trạng thái HỎNG thật, không phải vòng đời
