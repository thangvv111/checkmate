## ADDED Requirements

### Requirement: `checkmate.yml` là tuỳ chọn; khai thiếu hoặc khai hỏng thì rơi về mặc định

Repo đích MAY không có `checkmate.yml`; khi đó engine SHALL dùng đường chạy test mặc định thay vì từ chối
chấm.

Khai khối `runner` mà thiếu lệnh chạy test SHALL được coi như **không khai runner** — cấu hình nửa vời
không được dùng.

Các trường còn lại của khối `runner` SHALL có mặc định, và `timeout_s` SHALL bị kẹp vào dải đã chốt.

`checkmate.yml` sai cú pháp SHALL làm đường đọc cấu hình trả về mặc định, và MUST NOT làm đổ lượt chấm.

*Vì sao «thiếu lệnh chạy test = không khai»: một khối `runner` có `framework: pytest` mà không có lệnh chạy
là cấu hình dở dang. Dùng nó nửa chừng thì engine đi đường runner với một lệnh rỗng và hỏng ở chỗ khó hiểu;
coi như không khai thì nó rơi về đường mặc định và vẫn chấm được. Cấu hình dở dang phải bị bỏ nguyên khối,
không được dùng từng mảnh.*

*Vì sao kẹp `timeout_s` hai đầu: cận trên để một repo khai nhầm không giữ máy chủ mãi mãi; cận dưới để một
trần quá thấp không giết mọi probe rồi báo như thể code có lỗi.*

*Vì sao yml hỏng phải fail-safe chứ không fail-closed: đây là cấu hình **tuỳ chọn**. Từ chối chấm vì một
dấu hai chấm sai là biến một tiện ích thành một cửa chặn — trong khi bỏ qua nó chỉ mất phần tuỳ biến, và
lượt chấm vẫn chạy trên mặc định. Khác hẳn ⛔C2, chỗ dữ liệu thiếu làm verdict mất căn cứ.*

#### Scenario: repo không có `checkmate.yml`
- **WHEN** repo đích không khai gì
- **THEN** đường đọc cấu hình runner trả về rỗng và luồng rơi về đường chạy test mặc định

#### Scenario: khai `runner` mà thiếu lệnh chạy test
- **WHEN** khối `runner` có mặt nhưng không có lệnh chạy test
- **THEN** coi như không khai runner

#### Scenario: `timeout_s` ngoài dải
- **WHEN** repo khai một giá trị vượt cận trên hoặc dưới cận dưới
- **THEN** giá trị bị kẹp vào dải đã chốt

#### Scenario: `checkmate.yml` sai cú pháp
- **WHEN** file cấu hình không phân tích được
- **THEN** đường đọc trả về mặc định, lượt chấm vẫn chạy

### Requirement: JUnit XML là hợp đồng kết quả, và đường đọc phải chịu được mọi biến thể

Kết quả chạy probe SHALL được đọc từ JUnit XML, bất kể repo đích chạy bằng bộ chạy nào.

Thẻ báo lỗi **rỗng** SHALL vẫn được đọc là thất bại — đường đọc kiểm **sự có mặt** của thẻ, không kiểm nội
dung của nó.

`testcase` nằm trong `testsuite` lồng nhau SHALL được gom hết.

XML không phải JUnit SHALL cho ra danh sách rỗng và MUST NOT ném lỗi làm đổ lượt chấm.

*Vì sao JUnit XML: đó là định dạng duy nhất mà vitest, pytest và surefire đều xuất được. Chọn nó nghĩa là
checker không phải biết gì về bộ chạy của repo đích — hợp đồng nằm ở đầu ra, không ở công cụ.*

*Vì sao thẻ rỗng vẫn là thất bại: nhiều bộ chạy xuất `<failure/>` không nội dung khi lỗi không có thông
điệp. Đọc theo nội dung thì một probe đỏ bị ghi thành xanh — sai đúng theo chiều nguy hiểm nhất.*

*Vì sao XML lạ trả rỗng thay vì ném: một file XML không đúng dạng là dấu hiệu bộ chạy hỏng hoặc khai sai
lệnh, và cả hai đã có đường báo riêng. Ném ở đây chỉ thay một thông điệp nói đúng bản chất bằng một stack
trace của bộ phân tích XML.*

#### Scenario: probe chạy bằng bộ chạy bất kỳ
- **WHEN** bộ chạy của repo đích xuất JUnit XML
- **THEN** engine đọc được pass / fail / skip từ đó

#### Scenario: thẻ báo lỗi rỗng
- **WHEN** một `testcase` mang thẻ báo lỗi không có nội dung
- **THEN** nó được đọc là thất bại

#### Scenario: suite lồng nhau
- **WHEN** XML có `testsuite` lồng trong `testsuite`
- **THEN** mọi `testcase` bên trong đều được gom

#### Scenario: XML không phải JUnit
- **WHEN** file XML không đúng dạng JUnit
- **THEN** kết quả là danh sách rỗng, không ném lỗi

### Requirement: Nối id probe với testcase nhận đủ ba dạng tên, và kiểm ranh giới id

Việc nối một probe với testcase tương ứng SHALL nhận đủ ba dạng tên mà các bộ chạy sinh ra: tên bắt đầu
bằng id, tên có tiền tố của bộ chạy python, và tên lồng qua nhiều cấp `describe`.

Phép nối SHALL kiểm **ranh giới** của id: một id MUST NOT khớp với một id dài hơn bắt đầu bằng chính nó.

*Vì sao ranh giới: `P1` khớp nhầm `P10` là một lỗi im lặng và đắt. Kết quả của probe này bị gán cho probe
kia; một probe đỏ thật có thể được ghi thành xanh, hoặc ngược lại. Không có gì gãy, chỉ có nhãn sai — và
mọi tầng phía sau (phân loại, verdict, thư viện) đều tin cái nhãn ấy.*

#### Scenario: tên testcase theo dạng bộ chạy python
- **WHEN** testcase mang tên có tiền tố python trước id
- **THEN** probe được nối đúng

#### Scenario: tên lồng qua nhiều cấp
- **WHEN** tên testcase gồm nhiều đoạn ngăn cách bởi dấu phân cấp
- **THEN** probe được nối đúng theo đoạn mang id

#### Scenario: id là tiền tố của một id khác
- **WHEN** thư viện có cả `P1` và `P10`
- **THEN** mỗi id chỉ khớp testcase của chính nó

### Requirement: File probe không nạp được là trạng thái RIÊNG, không phải probe đỏ

Khi một file probe không nạp được — lỗi import, lỗi cú pháp — bộ chạy vẫn cho ra JUnit XML hợp lệ, và
engine SHALL nhận ra trạng thái ấy là **lỗi nạp file**, kèm nguyên nhân khi có.

Trạng thái này MUST NOT bị coi là probe phát hiện lỗi trong code đích.

*Vì sao: đây là chỗ một finding sai hẳn bản chất được sinh ra. File probe hỏng làm bộ chạy báo một testcase
thất bại; đọc thô thì đó là «probe bắt được lỗi», và verdict sẽ nói code đích có vấn đề trong khi vấn đề
nằm ở chính probe. Người nhận đi sửa code không hỏng.*

*Và vế ngược cũng phải đúng: một probe thật bị đỏ KHÔNG được nhận vơ thành lỗi nạp file — làm thế là biến
một phát hiện thật thành lỗi kỹ thuật rồi bỏ qua.*

#### Scenario: file probe lỗi import
- **WHEN** bộ chạy báo thất bại vì file probe không nạp được
- **THEN** engine nhận ra là lỗi nạp file, kèm nguyên nhân khi bộ chạy có nói

#### Scenario: probe thật bị đỏ
- **WHEN** một probe nạp được và thất bại vì khẳng định của nó không đúng
- **THEN** đó KHÔNG phải lỗi nạp file

### Requirement: Khối `review` cho repo khai góc tấn công và thang severity của riêng nó

`checkmate.yml` MAY khai khối `review` gồm danh sách góc tấn công ưu tiên của miền nghiệp vụ và thang phân
mức nghiêm trọng của riêng repo.

*Vì sao để repo tự khai: «cái gì là `high`» không phải câu hỏi kỹ thuật thuần. Một lỗi làm sai số dư tài
khoản và một lỗi làm lệch một nhãn hiển thị có thể cùng hình dạng trong code, và chỉ người biết nghiệp vụ
mới xếp hạng được. Checker áp một thang cứng thì hoặc nó kêu quá nhiều ở repo này, hoặc bỏ sót ở repo kia —
và cả hai đều dẫn tới cùng một kết cục: người ta thôi đọc verdict.*

*Góc tấn công cũng vậy: danh sách ấy đi vào prompt để model biết miền này thường hỏng ở đâu. Nó là tri thức
của repo, không phải của checker.*

#### Scenario: repo khai góc tấn công ưu tiên
- **WHEN** `checkmate.yml` khai danh sách góc tấn công
- **THEN** danh sách ấy đọc được và đi vào prompt sinh probe

#### Scenario: repo khai thang severity riêng
- **WHEN** `checkmate.yml` khai thang phân mức nghiêm trọng
- **THEN** thang ấy đọc được và dùng cho repo đó
