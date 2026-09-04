# principles-screen Specification

## Purpose
TBD - created by archiving change principles-screen-ccs. Update Purpose after archive.

## Requirements

### Requirement: Mỗi nguyên tắc phải trỏ tới chỗ nó HIỆN HÌNH trong sản phẩm, và liên kết ấy kiểm được bằng máy

Trang nguyên tắc SHALL bày **chín** nguyên tắc, đánh số liên tục từ 01 đến 09, mỗi điều gồm tiêu đề, thân,
và một **đường dẫn trong sản phẩm** tới chỗ nguyên tắc ấy hiện hình.

Mọi đường dẫn ấy SHALL trỏ tới một **route có thật**. Lưới SHALL đỏ khi một đường chết.

Nguyên tắc SHALL là **dữ liệu**, không phải chữ viết thẳng trong HTML — đó là điều kiện để đếm được, kiểm
được, và sửa được ở một chỗ.

*Vì sao phần «kiểm được bằng máy» là bắt buộc chứ không phải điểm cộng: gói design viết «giữ liên kết này
khi sửa màn khác — nó là bằng chứng rằng nguyên tắc không chỉ là khẩu hiệu». Một lời dặn thì trôi. Repo
này đã đo được chuyện ấy ở chỗ khác: một luật không có lưới bị vi phạm 16 phút sau khi được chốt, bởi
chính người vừa đọc nó.*

*Và hậu quả ở đây nặng hơn một liên kết hỏng. Sản phẩm này tồn tại để ĐÒI BẰNG CHỨNG. Trang tuyên ngôn của
nó không được là chỗ duy nhất nói mà không phải chứng minh. Một đường chết nghĩa là: hoặc sản phẩm đã bỏ
nguyên tắc ấy, hoặc trang này đang nói dối — cả hai đều phải lộ ra, và lộ ra bằng lưới chứ không bằng may
mắn.*

#### Scenario: đủ chín nguyên tắc, đánh số liên tục
- **WHEN** đọc danh sách nguyên tắc
- **THEN** có đúng chín điều, số từ 01 đến 09, không trùng và không đứt quãng

#### Scenario: mọi đường dẫn đều sống
- **WHEN** kiểm từng đường dẫn «thấy ở» của chín nguyên tắc
- **THEN** mỗi đường trỏ tới một route có thật trong ứng dụng

#### Scenario: một màn bị gỡ khỏi sản phẩm
- **WHEN** route mà một nguyên tắc trỏ tới không còn tồn tại
- **THEN** lưới ĐỎ, nêu nguyên tắc nào và đường nào — không im lặng bày một liên kết chết

#### Scenario: nguyên tắc là dữ liệu
- **WHEN** đếm số nguyên tắc
- **THEN** đếm được từ dữ liệu, không phải bằng cách dò chuỗi trong HTML

### Requirement: Trang nguyên tắc mở bằng một tuyên bố, và giữ nguyên văn câu đã chốt

Trang SHALL mở bằng một **poster nền accent đặc** mang câu tuyên bố của sản phẩm, giữ **nguyên văn**:
«Checker không tin ai. Chỉ tin bằng chứng.»

Khối nguyên tắc SHALL giới hạn bề rộng để đọc được — tối đa 900px.

*Vì sao khoá nguyên văn: gói design liệt kê câu này trong mục «Copy đáng giữ nguyên». Một câu tuyên bố bị
sửa dần qua vài lần refactor thì đến lúc nó không còn là tuyên bố nữa, và không ai nhớ nó đã đổi lúc nào.*

*Vì sao nền accent đặc: gói khai đây là một trong hai chỗ duy nhất accent chạy thành mảng trong toàn app
(chỗ kia là nền màn đăng nhập). Accent dùng thành mảng ở chỗ thứ ba làm cả hai chỗ này mất trọng lượng.*

#### Scenario: câu tuyên bố
- **WHEN** trang nguyên tắc hiện ra
- **THEN** poster mang đúng nguyên văn câu đã chốt

#### Scenario: nền của poster
- **WHEN** kiểm poster
- **THEN** nó dùng accent nền đặc, không phải tint và không phải màu semantic
