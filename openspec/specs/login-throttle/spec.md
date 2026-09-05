# login-throttle Specification

## Purpose
TBD - created by archiving change login-gate-replaces-basic-auth. Update Purpose after archive.

## Requirements

### Requirement: Gác tần suất đứng TRƯỚC phép băm mật khẩu

Quyết định «có cho thử lần này không» SHALL được lấy **trước khi** gọi phép kiểm mật khẩu.

Đây là ràng buộc **thứ tự**, không phải ràng buộc sự tồn tại. Băm mật khẩu ở đây là scrypt N=16384 — chậm
**có chủ đích**, để mỗi lần đoán tốn CPU của người đoán. Nhưng người đoán gửi request còn CPU tiêu là của
máy chủ, nên khi rào đứng SAU phép băm thì nó chống được **đoán mật khẩu** mà không chống được **DoS** —
và trên máy dùng chung với dịch vụ khác, DoS mới là nửa nguy hiểm hơn. Rào đặt đúng chỗ biến một request
tấn công thành một phép tra bảng trong bộ nhớ.

Gác SHALL từ chối bằng **trả lời ngay**, MUST NOT bằng cách ngủ rồi mới trả lời. Ngủ giữ connection sống,
tức biến chính rào chống DoS thành công cụ vắt cạn connection pool.

#### Scenario: đang bị từ chối thì không băm

- **WHEN** một IP hoặc một tên tài khoản đang trong thời gian bị từ chối, và có request `POST /login` tới
- **THEN** trả lời từ chối mà **không** gọi phép kiểm mật khẩu lần nào

#### Scenario: đường sai — gác đặt sau phép băm

- **WHEN** hiện thực gọi phép kiểm mật khẩu rồi mới hỏi gác
- **THEN** đó là vi phạm: rào không còn chặn được chi phí CPU, dù mọi hành vi nhìn từ ngoài vẫn y hệt

### Requirement: Hai gác độc lập — đếm theo IP, lùi dần theo tài khoản

Rào SHALL gồm **hai** gác tính riêng, và request bị từ chối khi **bất kỳ** gác nào từ chối.

- **Theo IP:** quá `IP_FAIL_CAP` lần sai trong cửa sổ `IP_WINDOW_MS` thì IP đó bị từ chối trong
  `IP_BLOCK_MS`.
- **Theo tài khoản:** mỗi lần sai **liên tiếp** của cùng một tên làm lần thử kế tiếp phải chờ lâu hơn, tăng
  theo cấp số nhân tới trần `ACCOUNT_BACKOFF_CAP_MS`. Đăng nhập đúng SHALL xoá sạch chuỗi ấy.

Hai gác vì mỗi cái bịt lỗ hổng của cái kia: đếm-theo-IP một mình bị nguồn phân tán đi vòng; còn chặn theo
tài khoản một mình là **cửa DoS ngược** — kẻ tấn công gõ sai vài lần là khoá được người vận hành ra khỏi
chính hệ của họ.

Gác theo tài khoản SHALL là **lùi dần**, MUST NOT là **khoá cứng**. Lùi dần chặn được dò tự động (nó cần
hàng nghìn lần thử mỗi giây) mà vẫn để người thật vào được sau vài giây — tức thiệt hại của việc bị nhắm có
trần, thay vì thành một nút «khoá người khác ra ngoài» ai cũng bấm được.

#### Scenario: sai liên tiếp thì chờ lâu dần

- **WHEN** cùng một tên tài khoản sai nhiều lần liên tiếp
- **THEN** thời gian phải chờ trước lần thử kế tiếp tăng dần, và không vượt trần

#### Scenario: đăng nhập đúng xoá chuỗi phạt của tài khoản

- **WHEN** một tài khoản đang có chuỗi sai, rồi đăng nhập đúng
- **THEN** chuỗi phạt của tên đó bị xoá — lần sai kế tiếp bắt đầu lại từ đầu

#### Scenario: đường sai — chặn theo tài khoản thành cửa DoS ngược

- **WHEN** một kẻ tấn công cố tình gõ sai mật khẩu của người vận hành nhiều lần
- **THEN** người vận hành vẫn vào được sau một khoảng chờ có trần, KHÔNG bị khoá ra ngoài vô thời hạn

### Requirement: Danh tính client lấy từ header nginx GHI ĐÈ, không từ header nginx NỐI THÊM

Khoá đếm theo IP SHALL lấy từ header mà proxy **ghi đè** (`X-Real-IP`), MUST NOT lấy từ header mà proxy
**nối thêm** vào giá trị client gửi (`X-Forwarded-For`).

Khác biệt này quyết định rào có tồn tại hay không. `proxy_set_header X-Forwarded-For
$proxy_add_x_forwarded_for` nối `$remote_addr` vào **sau** giá trị client tự khai, nên phần tử đầu của XFF
là **do client viết**. Đọc phần tử đầu thì kẻ tấn công chỉ cần đổi header mỗi request là mỗi request thành
một IP mới: rào biến mất hoàn toàn **mà mọi ca test vẫn xanh và log vẫn trông như đang chặn**.

Khi không có header ấy, khoá SHALL lấy từ địa chỉ socket. Không có cả hai thì SHALL dùng một khoá chung cố
định — cùng chung một xô còn hơn không đếm (⛔C2: không xác định được danh tính không phải lý do để cho qua).

Tiền đề khiến `X-Real-IP` tin được là **ứng dụng chỉ nghe trên loopback**, nên proxy là đường vào duy nhất.
Tiền đề ấy SHALL được khai ở đây chứ không nằm trong đầu người viết: nếu địa chỉ nghe đổi thành công khai
thì header này thành client-tự-khai và rào mất hiệu lực.

#### Scenario: client tự khai IP trong X-Forwarded-For

- **WHEN** hai request mang cùng `X-Real-IP` nhưng `X-Forwarded-For` khác nhau do client tự đặt
- **THEN** cả hai được tính vào **cùng một** xô đếm

#### Scenario: không có header proxy

- **WHEN** request tới thẳng, không có `X-Real-IP`
- **THEN** vẫn có khoá đếm (từ địa chỉ socket, hoặc khoá chung), KHÔNG bỏ qua việc đếm

### Requirement: Trạng thái rào có trần và không tự trở thành cửa DoS

Bộ nhớ trạng thái của rào SHALL có **trần số mục** và có phép loại bỏ khi đầy.

Ràng buộc này sinh ra từ một ràng buộc khác: rào MUST đếm cả những tên tài khoản **không tồn tại**, y như
tên có thật — không thì thời gian trả lời và hành vi chặn tự tố cáo tài khoản nào có thật, đúng cửa dò mà
`identity-session` đã đóng. Mà đếm mọi tên nghĩa là kẻ tấn công gửi tên ngẫu nhiên là làm bảng phình vô
hạn. Rào không có trần thì **chính nó** là đường DoS mới.

Khi đầy, phép loại bỏ SHALL ưu tiên bỏ mục đã hết hạn phạt trước, rồi tới mục có chuỗi sai **thấp nhất**.
MUST NOT loại bỏ thuần theo «ít dùng gần đây nhất»: như thế kẻ tấn công chỉ cần bơm tên rác là đẩy được mục
phạt của nạn nhân ra khỏi bảng, tức xoá án phạt của chính mình.

#### Scenario: bơm tên ngẫu nhiên

- **WHEN** rất nhiều tên tài khoản khác nhau bị thử
- **THEN** số mục trạng thái không vượt trần

#### Scenario: đường sai — bơm tên rác để xoá án phạt

- **WHEN** một tên đang có chuỗi phạt cao, và bảng bị làm đầy bằng tên rác chưa có chuỗi phạt
- **THEN** mục có chuỗi phạt cao KHÔNG bị đẩy ra trước những mục rác ấy

### Requirement: Sổ của rào không vọng thứ người dùng gõ

Log và sổ của rào MUST NOT chứa nguyên văn mật khẩu, và MUST NOT chứa nguyên văn **tên tài khoản đã thử**
(⛔C3).

Tên tài khoản trông như dữ liệu vô hại, nhưng ô tên là chỗ người ta gõ nhầm mật khẩu vào — chuyện xảy ra
thật, không phải giả thuyết. Ghi tên thử nguyên văn là ghi mật khẩu của chính người vận hành vào file log.

Bản che SHALL **phân biệt được hai giá trị khác nhau** (⛔C3). Che thành một hằng thì người vận hành mất
đúng thứ họ cần thấy: «một tên bị dò mười nghìn lần» khác hẳn «mười nghìn tên khác nhau bị thử một lần» —
cái đầu là dò mật khẩu một tài khoản, cái sau là quét danh sách tên.

Việc ghi sổ SHALL có trần tần suất của riêng nó. Ghi một dòng cho mỗi lần thử biến một trận dò thành một
trận làm đầy đĩa, tức rào lại đẻ ra đường DoS thứ hai.

Nhưng con số trong sổ SHALL phản ánh **độ lớn thật** của đợt. Trần thời gian một mình không đủ, và điều đó
đo được chứ không phải suy đoán: bản đầu của change này chạy trên prod 06/09 với **13 lượt bị chặn** và
ghi đúng một dòng nói **«chặn 1 lượt»** — vì nó báo số dồn ở lần phát *kế tiếp*, mà đợt kết thúc trước khi
có lần phát kế tiếp. Không sai luật, nhưng làm người vận hành ước lượng thấp đi một bậc độ lớn, tức sổ
trở thành thứ đọc xong tin nhầm.

Nên phải có **hai** điều kiện phát: theo **mốc luỹ tiến** của số lượt trong đợt (cho tín hiệu ngay và cho
độ lớn) và theo **trần thời gian** (cho nhịp đều khi đợt kéo dài không chạm mốc mới). Mốc SHALL thưa dần
theo cấp số nhân để trần vẫn còn: một đợt N lượt phát không quá bậc logarit của N dòng.

#### Scenario: tên thử xuất hiện trong log

- **WHEN** đăng nhập sai với một tên bất kỳ, rồi đọc log
- **THEN** không thấy tên ấy nguyên văn, và không thấy mật khẩu đã gõ

#### Scenario: hai tên khác nhau

- **WHEN** hai tên khác nhau bị thử
- **THEN** hai bản che khác nhau — người đọc phân biệt được đây là hai tên, không phải một tên thử hai lần

#### Scenario: một đợt ngắn kết thúc trước khi hết khoảng thời gian

- **WHEN** một đợt chặn gồm nhiều lượt xảy ra rồi dừng, tất cả gọn trong một khoảng thời gian
- **THEN** sổ vẫn cho biết đợt ấy có nhiều lượt — KHÔNG chỉ ghi một dòng nói «1 lượt»

#### Scenario: đường sai — đợt rất dài làm đầy đĩa

- **WHEN** một đợt kéo dài với rất nhiều lượt bị chặn
- **THEN** số dòng sinh ra tăng theo bậc logarit chứ không theo số lượt — trần vẫn còn nguyên

### Requirement: Người bị từ chối được biết mình bị từ chối vì tần suất

Trang đăng nhập SHALL nói rõ đây là **từ chối vì tần suất** và **còn phải chờ bao lâu**, phân biệt với
«sai mật khẩu».

Đây là ngoại lệ có chủ đích của luật «không phân biệt thông điệp» ở `identity-session`: luật ấy giấu
**tài khoản nào có thật**, còn thông điệp này chỉ nói về **hành vi của chính người đang gõ**, thứ họ đã
biết. Giấu nó đi thì người vận hành thật gõ sai vài lần sẽ thấy mật khẩu đúng bị báo sai, và đi đổi mật
khẩu — làm hỏng thứ đang không hỏng.

Thông điệp MUST NOT tiết lộ gác nào đang từ chối, hay ngưỡng còn lại bao nhiêu lần.

#### Scenario: đang bị chặn

- **WHEN** người dùng gửi `POST /login` trong lúc đang bị từ chối vì tần suất
- **THEN** trang báo đang bị tạm chặn và thời gian chờ, không báo «sai mật khẩu»

#### Scenario: thông điệp không thành cửa dò

- **WHEN** đọc thông điệp bị chặn
- **THEN** nó không cho biết tài khoản có thật hay không, không cho biết còn bao nhiêu lần nữa thì bị chặn
