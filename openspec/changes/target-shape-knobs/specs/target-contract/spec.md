## ADDED Requirements

### Requirement: Đường chạy test MẶC ĐỊNH chịu cùng khoá timeout với đường runner, và con số sống ở đúng MỘT chỗ

Hai đường chạy test — đường runner do repo khai (`test_cmd`) và đường vitest mặc định — SHALL đọc thời
hạn từ **cùng một khoá** `checkmate.yml`, cùng dải kẹp, cùng mặc định.

Thời hạn SHALL sống ở **đúng một chỗ** trong mã: con số dùng để cắt lệnh và con số in trong thông điệp
`TIMEOUT` MUST là cùng một giá trị, không phải hai hằng viết cạnh nhau.

Đổi khoá timeout MUST NOT đổi ranh giới «treo» đã khai: đường treo vẫn trả về **không kèm** `loiNap`, vì
«chạy lâu» không phải «không nạp được».

*Vì sao: đây đúng khuôn **cửa song sinh** đã bị bắt 9 lần trong repo. Hôm nay đường runner dùng
`cfg.timeout_s` và in đúng `${cfg.timeout_s}s` (`sandbox.ts:373`), còn đường mặc định cứng `300_000` ở
chỗ cắt (`sandbox.ts:305`) **và** cứng chuỗi `"300s"` ở thông điệp (`sandbox.ts:311`). Ai đó nới thời hạn
mặc định sẽ sửa một chỗ, và người vận hành đọc được một thông điệp nói sai con số — thứ họ dùng để phán
đoán PR có treo thật hay không.*

*Vì sao repo đích được khai cả cho đường mặc định: hai đường có cùng một công dụng, nên để một đường cấu
hình được còn đường kia thì không là một bất đối xứng chỉ do lịch sử, không do thiết kế.*

#### Scenario: repo khai timeout, chạy đường mặc định
- **WHEN** repo khai khoá timeout nhưng không khai `test_cmd` (nên chạy đường vitest mặc định)
- **THEN** đường mặc định áp đúng thời hạn ấy

#### Scenario: thông điệp TIMEOUT nói đúng con số đã áp
- **WHEN** lệnh test bị cắt vì quá hạn ở đường mặc định với thời hạn đã cấu hình
- **THEN** thông điệp `TIMEOUT` nêu đúng con số đã áp, không nêu một hằng khác

#### Scenario: ranh giới treo không đổi
- **WHEN** đường mặc định cắt lệnh vì quá hạn
- **THEN** kết quả trả về KHÔNG kèm `loiNap` — treo vẫn không bị đọc thành «không nạp được»

#### Scenario: repo không khai gì
- **WHEN** `checkmate.yml` không khai khoá timeout
- **THEN** cả hai đường dùng mặc định đang chạy hôm nay

### Requirement: Tên file probe của đường mặc định đi qua cùng cửa với `runner.probe_file`

Tên file probe SHALL đi qua **một cửa duy nhất**: khai `runner.probe_file` thì dùng giá trị ấy, không
khai thì dùng mặc định của engine — và đường vitest mặc định dùng đúng cửa ấy, không giữ hằng riêng.

*Vì sao: cùng lý do cửa song sinh ở trên. Hai chỗ quyết định cùng một thứ thì sớm muộn chúng lệch nhau,
và ở đây lệch nghĩa là probe được ghi ra một tên còn được tìm bằng một tên khác — biểu hiện là probe
«thất lạc», một triệu chứng chỉ về sai chỗ.*

#### Scenario: repo khai tên file probe
- **WHEN** repo khai `runner.probe_file` và chạy đường mặc định
- **THEN** file probe được ghi và được tìm bằng đúng tên ấy

#### Scenario: repo không khai
- **WHEN** repo không khai `runner.probe_file`
- **THEN** dùng mặc định của engine, và chỗ ghi với chỗ tìm dùng cùng một giá trị
