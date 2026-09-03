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
