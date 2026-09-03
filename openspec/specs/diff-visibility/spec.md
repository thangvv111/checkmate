# diff-visibility Specification

## Purpose
TBD - created by archiving change diff-visibility. Update Purpose after archive.

## Requirements

### Requirement: Log của lượt chấm phải nêu file không vào diff, và PHÂN BIỆT hai lý do

Khi có file bị loại khỏi diff, log của lượt chấm SHALL nêu số lượng và tên từng file kèm lý do.

Riêng những file bị loại vì **vượt trần kích thước** SHALL có thêm một cảnh báo riêng nói rõ verdict lượt
này không kết luận gì về chúng.

*Vì sao tách làm hai: hai lý do loại file khác nhau về hệ quả. File sinh tự động bị loại là đúng — đó là
rác, không ai cần chấm lockfile. File mã nguồn bị loại vì trần là **mất phủ thật**: nó có hành vi, nó nằm
trong PR, và không ai nhìn nó. Gộp cả hai vào một dòng «đã bỏ N file» thì người vận hành đọc xong yên tâm,
trong khi đúng nửa nguy hiểm của con số N nằm im trong đó.*

#### Scenario: có file bị loại
- **WHEN** một lượt chấm loại bỏ file khỏi diff
- **THEN** log nêu số lượng, tên từng file và lý do

#### Scenario: có file mã nguồn bị loại vì trần
- **WHEN** ít nhất một file bị loại với lý do vượt trần kích thước
- **THEN** log có thêm cảnh báo riêng nói verdict lượt này KHÔNG kết luận gì về những file đó

### Requirement: Prompt phải mang khối «file bạn không được xem», kèm chỉ dẫn không kết luận

Khi có file ngoài tầm nhìn, prompt gửi cho model SHALL chứa một khối liệt kê những file đó — tên, kích
thước, lý do — và SHALL kèm chỉ dẫn rằng model không được đề xuất probe nhắm vào chúng và không được kết
luận gì về chúng.

Khi không có file nào ngoài tầm nhìn, khối này MUST NOT xuất hiện.

*Vì sao cả hai vế: bỏ danh sách thì model không biết tầm nhìn của nó bị khuyết ở đâu — nó kết luận chắc nịch
về phần chưa từng đọc. Bỏ chỉ dẫn thì nó biết mình khuyết mà vẫn suy đoán, vì suy đoán là việc model làm rất
tự nhiên khi thiếu dữ liệu. Và khối này phải BIẾN MẤT khi không có gì bị loại: một khối rỗng đứng đó dạy
model rằng luôn có phần khuất, tức mời nó dè dặt ngay cả khi đã nhìn đủ.*

#### Scenario: có file ngoài tầm nhìn
- **WHEN** dựng prompt cho một lượt chấm có file bị loại
- **THEN** prompt mang tên từng file, kích thước, lý do, và chỉ dẫn không kết luận về chúng

#### Scenario: không có file nào bị loại
- **WHEN** mọi file trong PR đều vào được diff
- **THEN** prompt không có khối ấy

### Requirement: Diff chỉ còn file sinh tự động thì lỗi phải nói đúng nguyên nhân đó

Khi mọi file trong PR đều bị loại vì là file sinh tự động, lượt chấm SHALL dừng với thông điệp nói rõ diff
chỉ gồm file sinh tự động, **kèm tên chúng**, và MUST NOT báo là diff rỗng.

*Vì sao: hai trạng thái này khác hẳn nhau về việc người nhận phải làm gì. «Diff rỗng» nghĩa là PR không đổi
gì — kiểm lại nhánh, kiểm lại base. «Chỉ gồm file sinh tự động» nghĩa là PR CÓ thay đổi thật, chỉ là chúng
đều bị luật lọc bỏ — người nhận cần biết file nào, để hoặc chấp nhận rằng PR này không có gì để chấm, hoặc
sửa mẫu lọc vì nó bắt nhầm file mã nguồn. Báo «diff rỗng» ở ca thứ hai là đẩy người ta đi tìm ở đúng chỗ
không có gì.*

#### Scenario: PR chỉ đổi file sinh tự động
- **WHEN** mọi file trong PR đều khớp mẫu file sinh tự động
- **THEN** thông điệp lỗi nói diff chỉ gồm file sinh tự động và nêu tên chúng

#### Scenario: PR không đổi gì
- **WHEN** không có file nào khác giữa hai nhánh
- **THEN** thông điệp lỗi nói diff rỗng — khác với thông điệp trên

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
