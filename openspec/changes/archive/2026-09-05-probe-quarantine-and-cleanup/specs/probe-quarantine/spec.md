## ADDED Requirements

### Requirement: Probe không NẠP ĐƯỢC bị cô lập, không được kéo cả lượt chấm chết theo

Khi bộ probe không chạy được vì **lỗi nạp** ở một hoặc vài file, engine SHALL xác định những file ấy, loại
chúng khỏi lượt chấm hiện tại, và chạy lại phần còn lại.

Số lần chạy lại SHALL có trần. Hết trần mà vẫn không chạy được, lượt chấm SHALL thất bại như trước — MUST
NOT ra verdict.

Lỗi nạp SHALL được phân biệt với **test fail**: một probe chạy được và không đạt là bằng chứng về code
đích; một probe không nạp được thì không nói gì về code đích cả. Engine MUST NOT coi lỗi nạp là finding.

⛔ **Danh sách ĐÓNG — chỉ LỖI NẠP mới kích hoạt cách ly.** Cách ly SHALL chỉ được kích hoạt bởi việc một
file probe **không nạp được** (không import/parse được, nên không đóng góp phép thử nào). MUST NOT có
nguyên nhân nào khác kích hoạt nó, kể cả:

| tình trạng | vì sao KHÔNG cách ly |
|---|---|
| probe **chạy lâu / làm treo lệnh test** | đó là bằng chứng về code đích — đường `treo` đã có finding riêng của nó |
| probe **fail** | đó là bằng chứng, có thể chính là hồi quy cần bắt |
| probe **flaky** | đã có đường đào thải theo điểm; nó cân nhắc cả thành tích, cách ly thì không |
| probe làm verdict **xấu đi** | không phải một tình trạng kỹ thuật — đó là một mong muốn |

Danh sách này SHALL đóng: nới nó là hạ tiêu chuẩn của cổng, và phải đi qua một change khai rõ điều đó.

*Vì sao phải khai thành danh sách đóng thay vì mô tả: change này dạy hệ thống phản xạ «gặp trở ngại thì bỏ
bớt phép thử rồi đi tiếp». Mỗi lần nới thêm một nguyên nhân đều có vẻ hợp lý một mình — bỏ probe chạy lâu
cho nhanh, bỏ probe flaky cho đỡ nhiễu — và điểm đến là một cổng chỉ chạy những phép thử dễ. Ranh giới
không giữ được bằng thiện chí; nó phải là một danh sách đếm được, có lưới gác.*

⛔ **Chỉ probe không nạp được trên NHÁNH GỐC mới được cách ly.** Probe nạp được trên nhánh gốc mà không
nạp được trên nhánh PR SHALL KHÔNG bị cách ly: đó là bằng chứng về **PR**, không phải dấu hiệu probe mục.
Nó SHALL đi đường phân loại bình thường như một probe không chạy được trên nhánh PR.

*Vì sao vế này là vế dễ làm sai nhất: cách ly theo triệu chứng «không nạp được» mà không hỏi «trên nhánh
nào» sẽ âm thầm gỡ đúng những probe mà PR vừa làm hỏng — tức lấy một finding thật rồi biến nó thành một
dòng bảo trì. Cả sản phẩm này đứng trên phép so hai nhánh; chỗ nào quên hỏi «nhánh nào» thì chỗ đó sai
theo hướng nguy hiểm nhất là XANH GIẢ.*

*Vì sao: đo được trên prod 31/08 — năm lượt webhook chết liên tiếp vì MỘT probe thư viện import ba module
đã đổi tên. Cả thư viện chạy trong một lệnh test, nên một file hỏng giết cả lượt. Điều đáng nói không phải
là lượt chấm chết, mà là nó chết vì một thứ **không liên quan gì tới PR đang chấm** — thư viện là tài sản
của chính CheckMate, và tài sản mục nát của mình không được thành phán quyết về code của người khác.*

#### Scenario: một file thư viện không nạp được
- **WHEN** bộ probe đổ vì một file thư viện không import được
- **THEN** file ấy bị loại khỏi lượt, phần còn lại chạy tiếp, và lượt chấm vẫn ra được verdict

#### Scenario: hết trần chạy lại mà vẫn đổ
- **WHEN** đã loại và chạy lại tới trần mà bộ probe vẫn không chạy được
- **THEN** lượt chấm THẤT BẠI, không ra verdict — «không chứng minh được là sai» không thành «đã chứng
  minh là đúng»

#### Scenario: probe chạy được nhưng không đạt
- **WHEN** một probe nạp được, chạy, và fail
- **THEN** nó đi đường phân loại bình thường, KHÔNG bị coi là lỗi nạp và KHÔNG bị cách ly

#### Scenario: probe làm TREO lệnh test
- **WHEN** bộ probe không kết thúc trong thời hạn
- **THEN** đường xử lý treo đã có giữ nguyên, và KHÔNG probe nào bị cách ly — «chạy lâu» không phải
  «không nạp được»

#### Scenario: probe flaky hoặc làm verdict xấu đi
- **WHEN** một probe không tất định, hoặc là probe duy nhất khiến verdict thành FAIL
- **THEN** nó KHÔNG bị cách ly — hai tình trạng ấy nằm ngoài danh sách đóng

#### Scenario: probe nạp được trên nhánh gốc, KHÔNG nạp được trên nhánh PR
- **WHEN** một probe thư viện chạy được trên nhánh gốc nhưng không nạp được trên nhánh PR
- **THEN** nó KHÔNG bị cách ly, và tình trạng ấy đi đường phân loại như bằng chứng về PR

#### Scenario: probe MỚI của lượt này không nạp được
- **WHEN** file probe do model vừa sinh không nạp được
- **THEN** nó đi đường sinh-lại đã có, MUST NOT bị ghi dấu cách ly vào thư viện — nó chưa thuộc thư viện

### Requirement: Cô lập làm lượt chấm YẾU ĐI, và điều đó phải hiện ra

Lượt chấm có probe bị cách ly SHALL khai số ấy trong dữ liệu verdict, cùng chỗ với những số nói về vùng
chưa kết luận được.

Probe thư viện **thất lạc** — có trong danh sách chạy nhưng không có kết quả — SHALL được đếm như probe
mới thất lạc. MUST NOT có nhóm probe nào chạy mà không được đếm ở đâu cả.

Một lượt chấm mất phép thử MUST NOT trông giống một lượt chấm đủ phép thử.

*Vì sao: đo được hôm nay, `thongKe.that_lac` chỉ tính trên `keHoach` — tức probe MỚI. Probe thư viện biến
mất không được đếm ở bất kỳ đâu. Nếu một phần thư viện không nạp được mà phần khác vẫn thu được test, lượt
chấm chạy tiếp và verdict trông bình thường trong khi 20 phép thử đã không chạy. Cách ly mà không khai ra
thì nó biến một lỗi ỒN ÀO (lượt chấm chết) thành một lỗi IM LẶNG (PASS mỏng hơn tưởng) — đổi một cái dở
lấy một cái nguy hiểm hơn.*

#### Scenario: lượt chấm có probe bị cách ly
- **WHEN** một lượt chấm loại bỏ probe vì lỗi nạp rồi chạy tiếp
- **THEN** verdict khai số probe bị cách ly trong lượt ấy

#### Scenario: probe thư viện không có kết quả
- **WHEN** một probe thư viện nằm trong danh sách chạy nhưng không có kết quả nào
- **THEN** nó được đếm là thất lạc, giống hệt probe mới thất lạc

#### Scenario: lượt chấm không cách ly gì
- **WHEN** mọi probe đều nạp được
- **THEN** số probe cách ly khai là không — im lặng và số không là hai điều khác nhau

### Requirement: Cách ly là ĐÁNH DẤU, không phải xoá

Probe bị cách ly SHALL ở lại thư viện kèm dấu và lý do. Engine MUST NOT xoá nó.

Probe mang dấu cách ly SHALL KHÔNG được chọn vào lượt chấm nào cho tới khi dấu ấy được gỡ.

Chỉ **người** mới gỡ được dấu hoặc xoá probe; MUST NOT có đường nào để máy tự làm việc đó.

*Vì sao: một probe không nạp được hôm nay có thể chỉ đang chờ một lần đổi tên được sửa lại — chính năm
lượt chết trên prod là do đổi tên module, và code probe vẫn đúng về nội dung. Máy xoá nó đi là quyết định
một việc một chiều dựa trên một triệu chứng tạm thời. Đánh dấu thì đảo ngược được; xoá thì không, và cặp
«rẻ + đảo-ngược-được» với «đắt + một-chiều» phải nghiêng về phía đầu.*

#### Scenario: probe bị cách ly ở lượt này
- **WHEN** engine cách ly một probe thư viện
- **THEN** file và mục sổ của nó vẫn còn, kèm dấu cách ly và lý do đọc được

#### Scenario: lượt chấm kế tiếp
- **WHEN** một lượt chấm mới đọc thư viện
- **THEN** probe mang dấu cách ly không nằm trong danh sách chạy

#### Scenario: máy cố xoá probe
- **WHEN** rà mọi đường tự động của engine
- **THEN** không đường nào xoá probe vì lý do không nạp được
