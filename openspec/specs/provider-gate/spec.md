# provider-gate Specification

## Purpose
TBD - created by archiving change provider-gate. Update Purpose after archive.

## Requirements

### Requirement: Danh mục nhà cung cấp phải tự khai đủ để giao diện và cổng kiểm dùng được

Nhà cung cấp đã ngừng dịch vụ SHALL mang cờ `ngung` và MUST NOT cho chọn (gốc: R5.1) — để nó trong danh
sách mà không đánh dấu thì người dùng chọn rồi mới biết, sau một lượt kiểm thất bại không rõ nguyên nhân.

Mọi nhà cung cấp còn hoạt động SHALL khai ít nhất một model (gốc: R5.2). Nhà cung cấp hỗ trợ phương thức
`api` SHALL khai tên biến môi trường chứa khoá (gốc: R5.3) — không khai thì đường lấy khoá phải đoán, và
đoán sai thì lỗi hiện ra ở tận lúc gọi model.

#### Scenario: nhà cung cấp đã ngừng
- **WHEN** duyệt danh mục
- **THEN** nhà cung cấp đã ngừng mang cờ `ngung` và không nằm trong danh sách chọn được

#### Scenario: khai thiếu
- **WHEN** một nhà cung cấp còn hoạt động không khai model nào, hoặc hỗ trợ `api` mà không khai tên biến
  môi trường
- **THEN** đó là lỗi của danh mục, phải bị bắt

### Requirement: Cổng kiểm bắt buộc — chưa kiểm thành công thì không được chọn để chấm

Chọn một nhà cung cấp làm nơi chấm SHALL chỉ hợp lệ khi nhà cung cấp đó **đã kiểm thành công** (gốc: R5.4).
Cổng kiểm vừa là nút «Kiểm tra» trong giao diện vừa là **cổng**: không có nó thì lỗi cấu hình lộ ra ở giữa
một lượt chấm, sau khi đã tốn thời gian và tiền.

Phản hồi **rỗng** từ nhà cung cấp SHALL bị coi là kiểm **THẤT BẠI** (gốc: R5.6), kể cả khi lời gọi trả về
mã thành công. «Khoá hợp lệ nhưng model không sinh được nội dung» vẫn là không dùng được để chấm — một cổng
báo xanh ở đây là cổng vô nghĩa.

Kiểm thất bại SHALL nói rõ nguyên nhân (gốc: R5.7): sai khoá, hết hạn mức, model không tồn tại là ba việc
phải sửa theo ba cách khác nhau. Dán nhầm khoá của nhà cung cấp này vào ô của nhà cung cấp khác SHALL cho
thông điệp nói đúng chuyện đó (gốc: R5.8) — và giá trị khoá MUST NOT vọng ra thông điệp lẫn sổ kiểm.

#### Scenario: phản hồi rỗng
- **WHEN** nhà cung cấp nhận request và trả về nội dung rỗng
- **THEN** kiểm THẤT BẠI, và thông điệp nói rõ là model chưa sinh được nội dung chứ không phải khoá sai

#### Scenario: dán nhầm khoá
- **WHEN** khoá của nhà cung cấp A bị dán vào ô của nhà cung cấp B
- **THEN** thông điệp nói đúng chuyện ấy, và KHÔNG chứa giá trị khoá

### Requirement: «Kiểm còn hiệu lực» nghĩa là đã kiểm OK với ĐÚNG cấu hình hiện tại

Một lần kiểm thành công SHALL chỉ còn hiệu lực khi cấu hình hiện tại **khớp** với cấu hình lúc kiểm (gốc:
R5.5). Đổi model rồi vẫn dùng kết quả kiểm cũ là mở cổng bằng một bằng chứng nói về chuyện khác.

Phép so SHALL dùng **cùng một phép chiếu** với lúc ghi sổ. Sổ giữ bản che của giá trị ngoài danh mục, nên so
bản thô là tổ hợp model lạ vừa kiểm xong đã «hết hiệu lực» ngay — người dùng model mới không bao giờ chọn
được nhà cung cấp.

Cấu hình khuyết trường SHALL bị từ chối **êm** (trả về «không có kết quả kiểm»), MUST NOT ném: đường cứu hộ
cấu hình không hứa hình dạng đủ, và cửa kiểm nổ là đánh sập cả lượt chấm thay vì bỏ qua một nhà cung cấp.

#### Scenario: tổ hợp vừa kiểm xong
- **WHEN** vừa kiểm OK một tổ hợp model + phương thức
- **THEN** tổ hợp ấy còn hiệu lực

#### Scenario: đổi model sau khi kiểm
- **WHEN** model bị đổi sang giá trị khác sau lần kiểm
- **THEN** kết quả kiểm cũ KHÔNG còn hiệu lực

#### Scenario: cấu hình khuyết trường
- **WHEN** cấu hình thiếu `model` hoặc `phuong_thuc`
- **THEN** trả về «không có kết quả kiểm», KHÔNG ném

### Requirement: Khoá lấy theo thứ tự đã khai, tới được tiến trình con, và kho ở quyền hạn chế

Thứ tự lấy khoá SHALL là: **biến môi trường của dịch vụ trước, kho khoá sau** (gốc: R5.9). Khoá dán qua
giao diện SHALL tới được tiến trình con khi chấm (gốc: R5.10) — dán xong mà tiến trình chấm không thấy thì
người dùng không phân biệt được «dán sai» với «hệ không truyền».

Kho khoá trên đĩa SHALL đặt quyền hạn chế trên hệ hỗ trợ (gốc: R5.11).

#### Scenario: khoá tới tiến trình con
- **WHEN** một lượt chấm khởi chạy với khoá dán qua giao diện
- **THEN** tiến trình con nhận được khoá ấy

#### Scenario: quyền kho khoá
- **WHEN** kho khoá được ghi
- **THEN** quyền file bị siết trên hệ hỗ trợ

### Requirement: Phương thức gói thuê bao phải chạy THẬT bằng gói

Phương thức gói thuê bao SHALL chạy thật bằng gói (gốc: R5.12). Nếu để khoá API trong môi trường thì công
cụ dòng lệnh sẽ **lặng lẽ** dùng khoá đó và tính tiền API — người vận hành tưởng đang tiêu gói thuê bao mà
thực ra đang đốt credit, và phép thử vẫn báo xanh trong khi tiền vẫn ra từ ví API.

Vì thế khoá API MUST bị cắt khỏi môi trường của tiến trình chạy bằng gói thuê bao.

#### Scenario: chạy bằng gói thuê bao
- **WHEN** lượt chấm chạy bằng phương thức gói thuê bao
- **THEN** môi trường tiến trình con KHÔNG mang khoá API của nhà cung cấp

### Requirement: Verdict ghim nguồn model, và số token phải nói rõ khi là ước tính

Verdict SHALL ghim chuỗi model dạng `<nhà cung cấp>/<tên model>` để tra ngược được (gốc: R5.13). Model không
mang tiền tố thì để trống cột nguồn, MUST NOT đoán.

Số token vào/ra SHALL được ghi lại, và SHALL nêu rõ khi con số là **ước tính** (gốc: R5.14). Công cụ dòng
lệnh không trả `usage` nên số phải ước theo ký tự; một con số ước mà trình bày như số thật là báo sai bản
chất, và người đọc sẽ dựng ngân sách trên nó.

#### Scenario: số token từ usage thật
- **WHEN** nhà cung cấp trả `usage`
- **THEN** số token lấy từ đó và cờ ước-tính là **sai**

#### Scenario: số token phải ước
- **WHEN** không có `usage` (đường công cụ dòng lệnh)
- **THEN** số token ước theo ký tự và cờ ước-tính là **đúng**

### Requirement: Danh mục là gợi ý, nhà cung cấp là trọng tài — nhưng giới hạn phương thức thì cứng

Danh mục `models` SHALL là **gợi ý** cho giao diện và nguồn giá trị mặc định, KHÔNG phải danh sách đóng
(gốc: R5.18): model lạ đi qua được, và lỗi — nếu có — phải là lỗi của nhà cung cấp trả về, không phải lỗi
đoán trước của hệ này.

Nhưng danh mục SHALL khai được rằng một model **chỉ dùng với một số phương thức** (gốc: R5.15), và cổng
kiểm gặp tổ hợp nằm ngoài giới hạn SHALL từ chối (gốc: R5.16). Cửa đọc cấu hình MUST NOT tự thay tổ hợp cấm
bằng một tổ hợp hợp lệ (gốc: R5.17) — sửa lặng lẽ nghĩa là người dùng chấm bằng thứ họ không chọn.

Đường chấm gặp cấu hình **khuyết** trường model SHALL **hỏi**, không đoán (gốc: R5.19).

#### Scenario: model chỉ-thuê-bao đi đường API
- **WHEN** một model chỉ dùng được với gói thuê bao bị cấu hình đi đường API
- **THEN** bị từ chối với lời nói đúng chuyện phương thức, và KHÔNG gọi model

#### Scenario: model ngoài danh mục
- **WHEN** cấu hình dùng một model không có trong danh mục
- **THEN** vẫn đi qua — danh mục là gợi ý, nhà cung cấp là trọng tài

### Requirement: Mất xác thực là lỗi CÔNG CỤ, không phải câu trả lời của model, và KHÔNG thử lại

Công cụ dòng lệnh báo mất xác thực bằng cách in ra `stdout` rồi thoát với mã thành công (gốc: R3.12).
Harness SHALL nhận ra và báo đúng bản chất — không nhận ra thì nó coi câu báo lỗi là câu trả lời của model
rồi ném tiếp «không tìm thấy JSON», và người đọc log đi sửa nhầm chỗ.

Mẫu nhận diện SHALL phủ cả **phiên hết hạn**, không chỉ ca chưa đăng nhập bao giờ (gốc: R3.13). Nhưng mẫu
chữ chỉ là điều kiện CẦN: repo nào có spec về xác thực thì probe sinh ra gần như luôn chứa `unauthorized`,
`session expired`… và mẫu hẹp cỡ nào cũng dính — đo được 3/4 câu trả lời hợp lệ bị bắt nhầm, một lượt chấm
chết oan dù đăng nhập vừa chạy tốt.

Kết luận SHALL dựa thêm vào **chỗ xuất hiện và hình dạng**: chuỗi ở `stderr` là chắc chắn (model không trả
lời qua `stderr`); chuỗi ở `stdout` chỉ tính khi output KHÔNG mang hình dạng một câu trả lời — không khối
fence, không JSON trọn vẹn, không dài.

Mất xác thực là lỗi **CẤU HÌNH**: MUST NOT thử lại (gốc: R3.14). Phiên hết hạn không tự sống lại ở lượt thứ
hai, và thử lại chỉ tốn thêm một lượt gọi rồi hỏng y hệt.

#### Scenario: báo lỗi trên stdout, ngắn và trơ
- **WHEN** công cụ in một dòng ngắn khớp mẫu ra `stdout` rồi thoát 0
- **THEN** nhận ra là mất xác thực, không coi đó là câu trả lời của model

#### Scenario: probe nói về 401 Unauthorized
- **WHEN** câu trả lời hợp lệ của model có nội dung nói về `401 Unauthorized` hoặc `session expired`
- **THEN** KHÔNG bị nhận nhầm là mất xác thực — nó mang hình dạng một câu trả lời

#### Scenario: mất xác thực thì không thử lại
- **WHEN** phát hiện mất xác thực
- **THEN** dừng và báo lỗi cấu hình, KHÔNG gọi lại lần hai
