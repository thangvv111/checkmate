# target-contract Specification

## Purpose
TBD - created by archiving change target-contract. Update Purpose after archive.

## Requirements

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

### Requirement: `checkmate.yml` là tuỳ chọn; khai thiếu hoặc khai hỏng thì rơi về mặc định

Repo đích MAY không có `checkmate.yml`; khi đó engine SHALL dùng đường chạy test mặc định thay vì từ chối
chấm.

Khối `runner` MAY khai thêm **ảnh chạy** cho môi trường cô lập. Không khai thì dùng ảnh mặc định ghim
phiên bản cụ thể; MUST NOT dùng thẻ trôi. Cùng luật đọc như `test_cmd`: giá trị lấy từ bản trên đĩa của
clone (nhánh gốc), MUST NOT lấy từ nhánh pull request — pull request không được chọn môi trường mà chính
code của nó sẽ chạy.

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
