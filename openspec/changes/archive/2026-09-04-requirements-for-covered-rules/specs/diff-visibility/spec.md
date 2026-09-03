## ADDED Requirements

### Requirement: File sinh tự động bị loại khỏi diff, và repo khai thêm được mẫu của riêng nó

Diff đưa vào prompt SHALL loại bỏ file sinh tự động — lockfile, file nhị phân, file đã minify, thư mục
build — theo danh mục mẫu của checker.

Repo đích SHALL khai thêm được mẫu của riêng nó qua khối `review` trong `checkmate.yml`.

Mẫu regex khai sai cú pháp SHALL bị bỏ qua **ngay tại cửa đọc cấu hình**, và MUST NOT làm đổ lượt chấm;
những mẫu đúng trong cùng danh sách vẫn được giữ.

*Vì sao mẫu hỏng bị bỏ tại cửa chứ không lúc dùng: một regex hỏng ném lỗi ở giữa vòng lọc file thì lượt
chấm chết sau khi đã clone, đã đọc spec, đã tốn thời gian — và chết vì một dòng cấu hình của repo đích chứ
không vì code đang xét. Bỏ tại cửa cũng giữ được vế thứ hai: một mẫu hỏng không kéo theo những mẫu đúng
đứng cạnh nó.*

#### Scenario: file sinh tự động trong PR
- **WHEN** PR đổi lockfile, file nhị phân, file minify hoặc file trong thư mục build
- **THEN** những file ấy không vào diff, và mỗi file được ghi lại kèm lý do

#### Scenario: repo khai mẫu riêng
- **WHEN** `checkmate.yml` khai thêm mẫu file cần bỏ qua
- **THEN** file khớp mẫu ấy cũng bị loại khỏi diff

#### Scenario: mẫu regex sai cú pháp
- **WHEN** một mẫu trong danh sách sai cú pháp regex
- **THEN** mẫu ấy bị bỏ qua tại cửa đọc, các mẫu đúng vẫn được giữ, và lượt chấm không đổ

### Requirement: Vượt trần thì cắt tiếp theo hướng phủ nhiều nhất, và không bao giờ cắt xuống rỗng

Sau khi loại file sinh tự động mà diff vẫn vượt trần kích thước, engine SHALL cắt tiếp, **ưu tiên giữ file
nhỏ** để số file giữ lại là nhiều nhất.

Khi chỉ còn đúng một file mà chính nó đã vượt trần, file ấy SHALL vẫn được giữ.

Thứ tự file trong diff dựng ra SHALL theo đúng thứ tự git trả về, không theo thứ tự dùng để chọn.

*Vì sao ưu tiên file nhỏ: mục tiêu của diff không phải là nhiều ký tự nhất mà là nhiều **bề mặt hành vi**
nhất — mười file nhỏ cho model mười chỗ để nhìn, một file to cho nó một chỗ.*

*Vì sao vẫn giữ file duy nhất đã vượt trần: cắt nốt nó là chấm trên diff rỗng, tức một lượt chấm không nói
gì mà vẫn ra verdict. Thà một prompt quá dài còn hơn một verdict không có căn cứ.*

*Vì sao thứ tự phải theo git: engine sắp xếp theo kích thước để CHỌN, nhưng nếu thứ tự ấy đi luôn vào diff
thì model đọc một PR bị xáo — các thay đổi liên quan nhau nằm rời rạc, và nó khó thấy được ý đồ của PR.*

#### Scenario: diff vượt trần sau khi đã loại file sinh tự động
- **WHEN** phần còn lại vẫn vượt trần
- **THEN** file to bị loại trước, số file giữ lại là nhiều nhất có thể

#### Scenario: chỉ còn một file và nó vượt trần
- **WHEN** diff chỉ còn đúng một file, lớn hơn trần
- **THEN** file ấy vẫn được giữ, không có file nào bị loại

#### Scenario: thứ tự file trong diff dựng ra
- **WHEN** diff được dựng sau khi chọn file
- **THEN** thứ tự các file theo đúng thứ tự git trả về

### Requirement: Mọi file bị bỏ đều được trả về kèm tên, kích thước và lý do

Mỗi file không vào được diff SHALL được trả về kèm **tên file**, **số ký tự** của phần diff của nó, và **lý
do** bị bỏ.

*Vì sao cả ba trường: tên để biết mất phủ ở đâu; lý do để phân biệt «bị loại vì là rác» với «bị loại vì
trần» — hai chuyện khác hẳn nhau về hệ quả; số ký tự để người vận hành biết chỉnh trần thì có cứu được
không. Thiếu một trường thì bề mặt còn nói được là «có file bị bỏ», nhưng không đủ để ai làm gì với nó.*

*Đây là nền của cả capability: ba bề mặt hiển thị (log, prompt, thông điệp lỗi) đều đọc từ đúng cấu trúc
này. Cắt được nhưng không cắt âm thầm — và «không âm thầm» bắt đầu từ chỗ dữ liệu ấy tồn tại.*

#### Scenario: file bị loại vì là file sinh tự động
- **WHEN** một file bị loại khỏi diff
- **THEN** nó được trả về kèm tên, số ký tự và lý do

#### Scenario: file bị loại vì trần
- **WHEN** một file mã nguồn bị loại vì diff vượt trần
- **THEN** lý do nói rõ là vượt trần, phân biệt được với lý do file sinh tự động
