## MODIFIED Requirements

### Requirement: Đọc thư viện ngoài khoá phải chịu được file bị lượt song song dọn

Đường đọc thư viện SHALL bỏ qua mục nào có file đã mất, và MUST NOT làm đổ lượt chấm.

Đường đọc thư viện **cho một lượt chấm** SHALL bỏ qua mục nào mang **dấu cách ly**. Dấu ấy MUST NOT làm
mục biến mất khỏi các đường đọc khác — bề mặt đọc của người vận hành vẫn phải thấy nó, kèm lý do.

*Vì sao tách hai đường đọc: probe bị cách ly là probe **không chạy được**, nên để nó vào lượt chấm là lặp
lại đúng lỗi đã làm chết năm lượt trên prod. Nhưng giấu nó khỏi màn thư viện thì người vận hành mất đúng
thứ họ cần để sửa — và một probe biến mất không lời giải thích là thứ change trước vừa mất công đóng lại.*

*Vì sao: đọc diễn ra ngoài khoá, nên giữa lúc đọc sổ và lúc đọc file, một lượt song song có thể đã đào thải
đúng probe ấy. Mất một probe thư viện ở lượt này là thiệt hại nhỏ và tự khỏi — lượt sau đọc sổ mới sẽ không
còn mục đó. Đổ cả lượt chấm vì một file vừa bị dọn là biến một cuộc đua bình thường thành một lượt chấm
hỏng, và hỏng theo kiểu người đọc không hiểu vì sao.*

#### Scenario: sổ có mục mà file đã mất
- **WHEN** đọc thư viện trong lúc một mục vừa bị dọn khỏi đĩa
- **THEN** mục đó bị bỏ qua, các probe còn lại vẫn về đủ, không ném lỗi

### Requirement: Gỡ trùng bốn tầng — cơ học trước, model sau, và nghiêng về GIỮ

Probe mới trùng **cả ba** (commit sinh, id, và luật spec) với probe đã có SHALL bị coi là bản chạy-lại và
không được nạp.

Probe mới có luật spec **giao** với probe đã có SHALL vào diện nghi, và chỉ diện nghi mới được đưa ra hỏi
model.

Model SHALL được hỏi bằng đúng một câu hẹp, và phán xử của nó SHALL chỉ được dùng để **bỏ** khi nó vừa chắc
chắn vừa trỏ đúng một ứng viên trong diện nghi.

Mỗi quyết định **gỡ một probe đã có** SHALL để lại một bản ghi trong sổ thư viện, mang đủ: probe bị gỡ,
probe được giữ, lý do, bằng chứng, và thời điểm. Sổ ấy SHALL **chỉ ghi thêm** — bản ghi cũ MUST NOT bị sửa
hay xoá khi thư viện thay đổi, kể cả khi probe được giữ về sau bị đào thải.

Gỡ **do người vận hành** SHALL ghi vào cùng sổ ấy, mang loại riêng và **tên người thao tác**. Ba loại gỡ —
đào thải vì trần, gỡ vì trùng lặp, gỡ do người — SHALL phân biệt được khi đọc; chỉ loại thứ ba mới có người
chịu trách nhiệm, và đó là thông tin không được mất.

*Vì sao cơ học đứng trước: hai tầng đầu không tốn lời gọi model nào và đã loại phần lớn ca. Hỏi model cho
mọi cặp là trả tiền cho một câu trả lời mà phép so chuỗi đã biết.*

*Vì sao nghiêng về GIỮ: bỏ nhầm một probe là mất vĩnh viễn một phép kiểm đã chạy thật; giữ nhầm một probe
trùng chỉ tốn vài giây mỗi lượt. Hai sai lầm này không cùng giá, nên ngưỡng phải lệch — model trả lời mơ
hồ, trỏ tên ngoài diện nghi, hay không trả lời được thì ứng viên **được giữ**.*

*Vì sao phải ghi lại: gỡ một probe là thay đổi VĨNH VIỄN một tài sản, và hôm nay quyết định ấy được tính
rồi vứt đi — verdict của lượt chấm chỉ giữ `probe_id · action · reason`, tức mất đúng vế «giữ cái nào» và
mất bằng chứng. Người vận hành nhìn thư viện sáu tháng sau không có cách nào biết vì sao một probe biến
mất, và không có cách nào phản bác một lần gỡ sai. Một hệ thống tồn tại để đòi bằng chứng thì chính nó
không được ra quyết định một chiều mà không để lại bằng chứng.*

#### Scenario: probe là bản chạy-lại cùng commit
- **WHEN** trùng cả commit sinh, id và luật spec
- **THEN** probe bị bỏ với lý do bản chạy-lại

#### Scenario: luật spec giao nhau
- **WHEN** probe mới neo vào luật giao với probe đã có
- **THEN** nó vào diện nghi và được đưa ra hỏi model

#### Scenario: model trả lời mơ hồ hoặc trỏ sai
- **WHEN** phán xử không chắc chắn, trỏ tên ngoài diện nghi, hoặc thiếu ứng viên
- **THEN** probe được GIỮ

#### Scenario: một probe đã có bị gỡ vì trùng lặp
- **WHEN** một probe đang nằm trong thư viện bị gỡ vì trùng với probe khác
- **THEN** sổ thư viện có thêm một bản ghi nêu probe bị gỡ, probe được giữ, lý do và bằng chứng

#### Scenario: thư viện đổi sau khi đã ghi sổ gỡ
- **WHEN** probe được giữ về sau bị đào thải hoặc thư viện được nạp thêm
- **THEN** các bản ghi gỡ đã có vẫn nguyên vẹn, không bản nào bị sửa hay xoá

#### Scenario: probe MỚI không được nạp
- **WHEN** một probe mới bị từ chối nạp vì trùng
- **THEN** đó không phải một lần gỡ, và MUST NOT được ghi vào sổ gỡ như một probe đã bị xoá khỏi thư viện
