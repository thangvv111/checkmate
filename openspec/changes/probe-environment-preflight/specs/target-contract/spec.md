## ADDED Requirements

### Requirement: Đường chạy test MẶC ĐỊNH chịu cùng khoá timeout với đường runner

Hai đường chạy probe — đường theo `runner.test_cmd` của repo đích và đường mặc định khi repo không khai —
SHALL lấy trần thời gian từ **cùng một nguồn**. Đường mặc định MUST NOT giữ một hằng thời gian riêng.

Thông điệp báo hết giờ SHALL đọc **chính giá trị đã dùng để cắt**, MUST NOT giữ một biểu thức thứ hai của
cùng con số.

Dải kẹp `timeout_s` SHALL rộng đủ cho một bộ test bình thường của repo đích; việc siết SHALL thuộc về núm
của người vận hành CheckMate, không thuộc về mặc định mà engine áp lên repo đích.

Ranh giới «treo» không đổi: đường hết giờ SHALL kết luận bằng finding riêng và MUST NOT sinh `loiNap`.

*Vì sao đây là luật riêng: đây là **cửa song sinh** — hai biểu thức cho một luật, khuôn đã bị bắt chín lần
trong repo này. Đường runner in đúng con số nó dùng; đường mặc định cứng `300_000` ở lệnh cắt và cứng chuỗi
`"300s"` ở thông điệp. Sửa một chỗ thì chỗ kia nói dối, và không lưới nào đang bắt được.*

*Vì sao mặc định phải RỘNG (PO chốt 07/09): trần 5 phút biến một bộ test bình thường thành finding «PR làm
treo test». Đó là engine kết luận sai về pull request vì một hằng của chính nó — đúng loại sai tệ nhất mà
sản phẩm này tồn tại để chống. Cận dưới giữ nguyên vì lý do đối xứng: một trần quá thấp giết mọi probe rồi
báo như thể code có lỗi.*

#### Scenario: repo không khai runner, bộ test chạy lâu hơn trần cũ
- **WHEN** repo đích không khai lệnh chạy test và bộ test chạy quá năm phút nhưng dưới trần đã chốt
- **THEN** lượt chạy tới hết, MUST NOT kết luận là treo

#### Scenario: thông điệp hết giờ nêu đúng số giây đã dùng
- **WHEN** đường chạy mặc định hết giờ ở một trần khác mặc định
- **THEN** thông điệp nêu **đúng** số giây ấy, không nêu một con số khác

#### Scenario: repo khai timeout vượt cận trên
- **WHEN** repo đích khai một trần lớn hơn cận trên đã chốt
- **THEN** giá trị bị kẹp về cận trên

#### Scenario: hai đường chạy cho cùng một quyết định treo
- **WHEN** cùng một bộ test vượt trần, một lần qua đường runner và một lần qua đường mặc định
- **THEN** cả hai kết luận treo, cả hai MUST NOT sinh `loiNap`
