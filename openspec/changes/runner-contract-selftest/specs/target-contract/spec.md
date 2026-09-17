## MODIFIED Requirements

### Requirement: Không ghi nhận được probe nào thì thông điệp lỗi phải mang nguyên nhân bộ chạy đã báo

Khi bộ chạy test của repo đích không xuất được JUnit XML, lượt chấm SHALL dừng với thông điệp mang **đầu ra
lỗi của chính bộ chạy đó**, và SHALL nêu file probe liên quan.

Khi bộ chạy **có xuất đầu ra nhưng đầu ra không ghi nhận test nào** và không có lỗi nạp file, lượt chấm SHALL
dừng với kết cục có tên `probe_not_collected`, và thông điệp SHALL mang **cả** đường file probe engine đã ghi
**lẫn** stdout/stderr của bộ chạy (sau bộ che). Đường đọc đầu ra có cấu trúc MUST NOT nuốt stdout/stderr khi
đầu ra ấy rỗng — đầu ra rỗng là lúc lời văn của bộ chạy là thứ duy nhất nói vì sao.

*Vì sao: dừng lại là đúng (⛔C2 — không chứng minh được thì không PASS), nhưng dừng mà không nói vì sao là
fail-closed **mù**. Người nhận đứng trước «không ghi nhận được probe nào» mà không biết đó là thiếu gói, sai
lệnh, sai thư mục, hay sai phiên bản. Nguyên nhân đã có sẵn trong `stderr` của bộ chạy; việc duy nhất phải
làm là để nó đi theo thông điệp ra ngoài thay vì bị nuốt.*

*Vì sao vế «xuất ra nhưng rỗng» phải thành luật riêng: đo 17/09 trên admin-fe, vitest ghi file JSON với 0 test
và in lý do ra stdout; vì file tồn tại nên nhánh đọc JSON đi tiếp, stdout bị bỏ, và thông điệp cuối cùng là
chuỗi dự phòng «Không thu thập được test nào» — một câu không mang thông tin. Scenario «không xuất XML» không
phủ ca này, và nó là ca xảy ra thật.*

#### Scenario: bộ chạy không xuất XML
- **WHEN** lệnh test của repo đích chạy xong mà không tạo file XML
- **THEN** kết quả là thất bại, thông điệp mang đầu ra lỗi của bộ chạy và tên file probe

#### Scenario: bộ chạy xuất kết quả rỗng
- **WHEN** lệnh test của repo đích tạo được file đầu ra nhưng đầu ra ghi nhận 0 test và không có lỗi nạp file
- **THEN** kết cục là `probe_not_collected`, thông điệp mang đường file probe đã ghi và stdout/stderr của bộ
  chạy sau bộ che, MUST NOT là chuỗi dự phòng không mang thông tin

#### Scenario: đầu ra rỗng nhưng có lỗi nạp file thì không phải «không thu thập được»
- **WHEN** đầu ra ghi nhận 0 test và bộ chạy báo lỗi nạp cho file probe
- **THEN** đó là lỗi nạp file, MUST NOT bị gán `probe_not_collected`

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

**`probe_dir` và `probe_ext` là hai núm để repo đích khớp chỗ engine ghi probe với phạm vi thu thập của bộ chạy
chính nó.** Engine MUST NOT tự đọc cấu hình thu thập của repo đích để đoán hai giá trị này; engine SHALL kiểm
hai giá trị ấy có khớp không bằng cách **chạy thật** (mồi — `probe-environment`), và khi lệch SHALL nêu đúng
hai tên núm này trong thông điệp. Mặc định `test` · `.test.txt` của đường runner, và `test/checker.probe.test.ts`
của đường vitest mặc định, SHALL được ghi rõ trong hồ sơ hợp đồng để repo đích biết mình đang lệch với cái gì.

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

*Vì sao engine không tự đoán `probe_dir` từ cấu hình repo đích: mỗi bộ chạy một cú pháp và chúng đổi theo
phiên bản; đoán là nuôi một bảng không bao giờ đủ, và đoán sai thì lỗi nhìn y hệt hôm nay. Repo đích khai
một lần, engine kiểm bằng chạy thật — đúng phân công «repo khai, engine kiểm» của cả hợp đồng này. Đo 17/09:
admin-fe thu thập `src/**` và `kiem/**`, engine ghi vào `test/`; khai `probe_dir: src` + `probe_ext: .test.tsx`
thì probe được nhặt, JSX biên dịch, JUnit ra 1 test — kiểm chạy thật trong thư mục tạm dựng từ chính cấu hình
của họ.*

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

#### Scenario: `probe_dir`/`probe_ext` lệch phạm vi thu thập
- **WHEN** repo đích khai (hoặc để mặc định) `probe_dir`/`probe_ext` mà bộ chạy của nó không nhặt file ở đường ấy
- **THEN** mồi dừng lượt với `probe_not_collected` trước lời gọi model đầu tiên, thông điệp nêu đúng hai tên
  núm và đường file đã ghi — engine MUST NOT tự đổi hai giá trị ấy

#### Scenario: `probe_dir`/`probe_ext` khớp
- **WHEN** repo đích khai hai núm trỏ vào phạm vi thu thập của bộ chạy chính nó
- **THEN** mồi được thu thập, hợp đồng tự chứng minh, lượt đi tiếp
