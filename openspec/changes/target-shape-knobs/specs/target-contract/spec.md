## ADDED Requirements

### Requirement: Repo đích khai được thời hạn chạy test cho CẢ đường mặc định, không chỉ đường runner

Khoá thời hạn trong `checkmate.yml` SHALL có tác dụng kể cả khi repo đích **không** khai lệnh chạy test —
tức khi lượt chấm đi đường vitest mặc định. Repo khai thời hạn mà không khai lệnh chạy MUST NOT bị bỏ
nguyên khối như cấu hình dở dang; thời hạn là khoá **hình dạng**, không phải một mảnh của cấu hình runner.

*Vì sao đây là requirement riêng và HẸP hơn bản trước: cửa song sinh — con số dùng để cắt lệnh và con số
in trong thông điệp `TIMEOUT` phải là một — **đã được đóng** ở change `probe-environment-preflight`
(07/09), cùng với dải `[30, 3600]` và nguồn dùng chung `TIMEOUT_RANGE`. Còn lại đúng một mảnh chưa làm:
hôm nay đường mặc định luôn dùng **mặc định của dải**, vì khối `runner` thiếu `test_cmd` bị bỏ nguyên khối
theo luật «khai runner mà thiếu lệnh chạy test = không khai». Giữ hai change cùng khai một luật là đúng
khuôn lệch mà repo này tồn tại để chống, nên requirement này chỉ nhận phần chưa ai làm.*

*Vì sao vẫn đáng làm: hai đường có cùng công dụng. Để một đường cấu hình được còn đường kia thì không là
bất đối xứng do lịch sử, không do thiết kế — và repo đích không khai `test_cmd` thường đúng là repo cần
thời hạn khác nhất, vì engine đang đoán cách chạy test của họ.*

#### Scenario: repo khai thời hạn nhưng không khai lệnh chạy test
- **WHEN** `checkmate.yml` khai khoá thời hạn và **không** khai lệnh chạy test
- **THEN** đường vitest mặc định áp đúng thời hạn ấy, đã kẹp vào dải

#### Scenario: khai thời hạn không làm khối runner dở dang thành khối được dùng
- **WHEN** repo khai thời hạn và `framework` nhưng không khai lệnh chạy test
- **THEN** lượt vẫn đi đường mặc định; chỉ thời hạn được lấy, phần còn lại của khối vẫn bị bỏ

#### Scenario: repo không khai gì
- **WHEN** `checkmate.yml` không khai khoá thời hạn
- **THEN** cả hai đường dùng mặc định của dải

### Requirement: Tên file probe của đường mặc định đi qua cùng cửa với `runner.probe_file`

Tên file probe SHALL đi qua **một cửa duy nhất**: khai `runner.probe_file` thì dùng giá trị ấy, không
khai thì dùng mặc định của engine — và đường vitest mặc định dùng đúng cửa ấy, không giữ hằng riêng.

*Vì sao: cùng khuôn cửa song sinh. Hai chỗ quyết định cùng một thứ thì sớm muộn chúng lệch nhau, và ở đây
lệch nghĩa là probe được ghi ra một tên còn được tìm bằng một tên khác — biểu hiện là probe «thất lạc»,
một triệu chứng chỉ về sai chỗ.*

#### Scenario: repo khai tên file probe
- **WHEN** repo khai `runner.probe_file` và chạy đường mặc định
- **THEN** file probe được ghi và được tìm bằng đúng tên ấy

#### Scenario: repo không khai
- **WHEN** repo không khai `runner.probe_file`
- **THEN** dùng mặc định của engine, và chỗ ghi với chỗ tìm dùng cùng một giá trị
