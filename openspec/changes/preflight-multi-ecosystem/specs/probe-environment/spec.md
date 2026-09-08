## MODIFIED Requirements

### Requirement: Điều kiện môi trường chạy probe SHALL được kiểm TRƯỚC lời gọi model đầu tiên

Trước khi phát lời gọi model nào trong một lượt chấm code, engine SHALL kiểm rằng môi trường chạy probe
đủ điều kiện. Điều kiện thiếu ở mức **chặn** SHALL làm lượt dừng NGAY, và MUST NOT phát bất kỳ lời gọi
model nào.

Engine SHALL nhận diện **hệ sinh thái** của repo đích bằng **file dấu hiệu ở gốc**, tra trong một **bảng
đóng** nằm trong mã. Repo không khớp hàng nào SHALL là **không kết luận** — đi tiếp như hôm nay.

Với hệ mà engine **có** cấp được phụ thuộc cho môi trường chạy probe: phụ thuộc đã khai mà chưa cài SHALL
là điều kiện mức **chặn**. Thư mục phụ thuộc **rỗng** và **không tồn tại** SHALL được coi là cùng một
điều kiện.

Với hệ mà engine **chưa** cấp được phụ thuộc: điều kiện SHALL là mức **chặn**, và thông điệp SHALL nói
rằng engine chưa hỗ trợ hệ ấy — MUST NOT bảo người vận hành chạy một lệnh sẽ không có tác dụng.

Repo đích khai một phiên bản runtime khác phiên bản của môi trường sẽ chạy test SHALL là **cảnh báo**,
MUST NOT chặn. Engine SHALL chỉ hỏi phiên bản của môi trường khi repo đích có khai.

Thiếu một trong hai vế để so SHALL cho ra **không kết luận**, MUST NOT đoán.

*Vì sao mở rộng khỏi «dự án Node» — đo trên prod 08/09: `admin-be` là repo Java/Maven, không có
`package.json` nào, nên phép kiểm cũ kết luận «không phải dự án Node» rồi im. Lượt chấm chạy **17 phút**,
tiêu **2 lời gọi model**, rồi chết ở bước chạy probe khi Maven đi tải từ Maven Central qua một container
không có mạng. Bản trước đúng theo chữ của chính nó và vẫn để lọt — vì chữ ấy giả định mọi repo đích là
Node, và giả định đó vỡ ở repo đích thứ ba.*

*Vì sao hệ chưa cấp được phụ thuộc thì CHẶN chứ không cảnh báo: khác với runtime lệch (có thể vẫn chạy),
đây là **chắc chắn hỏng** — môi trường chạy probe không có mạng và không có kho phụ thuộc nào cho hệ ấy.
Chặn sớm tốn của người vận hành một thông điệp; không chặn tốn 17 phút và hai lời gọi model.*

#### Scenario: bản clone Node chưa cài phụ thuộc
- **WHEN** repo đích khai phụ thuộc trong `package.json` và bản clone không có thư mục phụ thuộc
- **THEN** lượt dừng trước lời gọi model đầu tiên, thông điệp nêu số gói đã khai và **lệnh cài của Node**

#### Scenario: thư mục phụ thuộc tồn tại nhưng rỗng
- **WHEN** thư mục phụ thuộc có mặt nhưng không có mục nào
- **THEN** cùng kết quả với ca không tồn tại — dừng, không phải đi tiếp

#### Scenario: repo dùng hệ engine chưa cấp được phụ thuộc
- **WHEN** repo đích có file dấu hiệu của một hệ mà môi trường chạy probe không có kho phụ thuộc
- **THEN** lượt dừng **trước lời gọi model đầu tiên**, và thông điệp nói engine chưa hỗ trợ hệ ấy

#### Scenario: repo không khớp hệ nào trong bảng
- **WHEN** repo đích không có file dấu hiệu nào
- **THEN** phép kiểm không kết luận gì, lượt đi tiếp bình thường

#### Scenario: repo khai phụ thuộc rỗng
- **WHEN** file khai phụ thuộc có mặt nhưng không khai gói nào
- **THEN** không chặn — không có gì để cài

#### Scenario: runtime repo lệch runtime môi trường
- **WHEN** repo đích khai một phiên bản runtime chính khác phiên bản của môi trường chạy test
- **THEN** lượt **vẫn chạy**, kèm cảnh báo nêu cả hai phiên bản và cách khai ảnh chạy riêng

#### Scenario: không đọc được phiên bản của môi trường
- **WHEN** phiên bản của môi trường chạy test không hỏi được
- **THEN** không cảnh báo và không chặn — thiếu vế so thì không kết luận

#### Scenario: repo không khai phiên bản nào thì không hỏi ảnh
- **WHEN** repo đích không khai phiên bản runtime
- **THEN** engine MUST NOT dựng container để hỏi phiên bản

### Requirement: Thông điệp môi trường SHALL gọi đúng tên bệnh và nêu việc phải làm

Thông điệp cho người vận hành khi dừng vì môi trường SHALL nêu **bệnh** và **việc phải làm**, MUST NOT chỉ
nêu triệu chứng ở lớp dưới.

Thông điệp MUST NOT nói lượt hỏng vì hợp đồng kết quả khi bệnh là môi trường.

**Lệnh sửa nêu trong thông điệp SHALL thuộc đúng hệ sinh thái của repo đích.** Khi engine không nhận ra
hệ, hoặc nhận ra một hệ nó chưa hỗ trợ, thông điệp SHALL nói đúng điều đó và **MUST NOT kê lệnh của một
hệ khác**.

Điều kiện môi trường SHALL được kiểm và báo **lúc thêm repo đích vào danh sách**, không chỉ lúc chấm. Điều
kiện thiếu MUST NOT chặn việc đăng ký repo.

*Vì sao vế lệnh-đúng-hệ thành luật: đo trên prod 08/09, một repo Maven nhận được thông điệp «chạy
`npm ci`». Lệnh ấy trong repo Maven không làm gì cả — người vận hành chạy xong sẽ gặp lại đúng lỗi cũ và
kết luận công cụ hỏng ngẫu nhiên. Một thông điệp kê nhầm thuốc **tệ hơn** một thông điệp chỉ nói triệu
chứng: cái thứ hai làm người ta đi tìm, cái thứ nhất làm người ta đi sai hướng một cách tự tin.*

*Vì sao «chưa hỗ trợ» là câu trả lời hợp lệ: nó đúng, nó kiểm chứng được, và nó dẫn người đọc tới đúng
chỗ cần sửa — phía CheckMate, không phải phía repo của họ.*

#### Scenario: dừng vì thiếu phụ thuộc ở repo Node
- **WHEN** lượt dừng vì bản clone Node chưa cài phụ thuộc
- **THEN** thông điệp nêu bản clone thiếu phụ thuộc và **lệnh cài của Node**, MUST NOT nói về JUnit XML

#### Scenario: dừng vì hệ chưa được hỗ trợ
- **WHEN** lượt dừng vì repo đích dùng một hệ engine chưa cấp được phụ thuộc
- **THEN** thông điệp **nêu tên hệ ấy**, nói rõ engine chưa hỗ trợ, và MUST NOT kê lệnh của hệ khác

#### Scenario: thông điệp không bao giờ kê nhầm hệ
- **WHEN** engine sinh thông điệp cho một repo không phải Node
- **THEN** thông điệp không chứa lệnh cài của Node

#### Scenario: thêm repo đích chưa đủ điều kiện
- **WHEN** người vận hành thêm một repo đích chưa đủ điều kiện chạy probe
- **THEN** repo **vào danh sách**, và trả lời mang cảnh báo nêu bệnh kèm việc phải làm cho **đúng hệ**

#### Scenario: cảnh báo lúc thêm repo phải đến được mắt người vận hành
- **WHEN** cửa thêm repo trả về cảnh báo môi trường
- **THEN** giao diện hiện cảnh báo và MUST NOT chuyển trang ngay
