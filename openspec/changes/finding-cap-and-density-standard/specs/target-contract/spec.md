## MODIFIED Requirements

### Requirement: `checkmate.yml` là tuỳ chọn; khai thiếu hoặc khai hỏng thì rơi về mặc định

Repo đích MAY không có `checkmate.yml`; khi đó engine SHALL dùng đường chạy test mặc định thay vì từ chối
chấm.

Khối `runner` MAY khai thêm **ảnh chạy** cho môi trường cô lập. Không khai thì dùng ảnh mặc định ghim
phiên bản cụ thể; MUST NOT dùng thẻ trôi. Cùng luật đọc như `test_cmd`: giá trị lấy từ **nhánh gốc**, MUST
NOT lấy từ nhánh pull request — pull request không được chọn môi trường mà chính code của nó sẽ chạy.

Khối `standards` MAY khai chuẩn khối lượng — `finding_cap`, `probe_cap`, `density_per_1000_words`,
`density_floor_words`. Luật về nghĩa, dải kẹp, điểm áp và cách đọc của khối này sống ở capability
`finding-volume-standard`; ở đây chỉ khai rằng khối ấy **thuộc hợp đồng** và **thừa hưởng luật fail-safe**
của file: thiếu, sai kiểu, hay sai cú pháp đều rơi về mặc định và MUST NOT làm đổ lượt chấm.

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

*Vì sao bỏ chữ «bản trên đĩa của clone» khỏi luật đọc nhánh gốc (06/09): đó là mô tả một cơ chế, không phải
một luật — và cơ chế ấy sai. Clone chỉ `clone` + `fetch` vào `refs/checkmate/*`, không checkout; bản trên
đĩa là snapshot nhánh default lúc kết nối, không phải nhánh gốc hiện tại. Luật là «nhánh gốc»; cơ chế đúng
là `git show <baseRef>:<file>`. Ba cửa đọc `runner`/`review`/`sources` hôm nay vẫn đọc đĩa — kéo chúng khớp
luật là change `checkmate-fix-bug` riêng.*

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

#### Scenario: khối `standards` sai kiểu
- **WHEN** `standards` là chuỗi, mảng, hoặc `null` thay vì object
- **THEN** mọi khoá của nó rơi về mặc định, lượt chấm vẫn chạy, và verdict khai nguồn là mặc định
