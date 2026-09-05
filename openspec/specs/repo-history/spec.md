# repo-history Specification

## Purpose
TBD - created by archiving change repo-history. Update Purpose after archive.

## Requirements

### Requirement: Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó

`config.repos[]` SHALL là **nguồn sự thật** về những repo hệ thống biết (gốc: R4.1). Trường `config.repo`
SHALL chỉ là **khung nhìn** của repo đang chọn, dựng ra lúc đọc cấu hình chứ không lưu song song (gốc:
R4.2) — hai chỗ giữ cùng một sự thật thì sẽ có ngày lệch nhau, và người sửa không biết bên nào đúng.

Cấu hình đời cũ chỉ có một `repo` **và không có trường danh sách** SHALL được nâng thành danh sách một
phần tử (gốc: R4.3), không đòi người dùng làm gì. Trường danh sách **có mặt** thì nó là nguồn sự thật, kể
cả khi rỗng — `repo` đời cũ MUST NOT lấn lên nó.

**Khi danh sách KHÔNG rỗng:** `repo_dang_chon` trỏ vào repo không còn trong danh sách SHALL rơi về phần tử
đầu, KHÔNG được ném và KHÔNG được để trống (gốc: R4.4). Một repo bị gỡ mà cấu hình vẫn trỏ tới nó là trạng
thái bình thường, không phải lỗi — và làm màn hình chết vì nó là báo sai bản chất.

**Khi danh sách RỖNG:** repo đang chọn SHALL để trống và khung nhìn `repo` SHALL vắng mặt. Đọc cấu hình
vẫn KHÔNG được ném.

Người dùng SHALL KHÔNG phải gõ tay `owner/repo` (gốc: R4.5): hệ nhận URL đầy đủ, URL có đuôi `.git`, dạng
`git@`, và cả dạng gõ tay — rác thì trả rỗng chứ không dựng ra một repo không có thật.

*(Bản trước viết vế R4.4 không kèm điều kiện, nên câu «KHÔNG được để trống» đọc thành «luôn có một repo
đang chọn» — và hiện thực làm đúng như thế: danh sách rỗng bị thay bằng một repo hard-code. Vế ấy sinh ra
để chống **màn hình chết vì trỏ nhầm**, không phải để cấm trạng thái «chưa kết nối repo nào»; nay khai rõ
biên của nó. Luật cho danh sách rỗng ở capability `repo-registry`.)*

#### Scenario: cấu hình đời cũ
- **WHEN** đọc cấu hình chỉ có một `repo`, chưa có `repos[]`
- **THEN** ra danh sách một phần tử mang đúng repo ấy

#### Scenario: repo đang chọn không còn trong danh sách
- **WHEN** `repo_dang_chon` trỏ vào một repo đã bị gỡ, danh sách còn phần tử khác
- **THEN** rơi về phần tử đầu của danh sách; không ném, không để trống

#### Scenario: danh sách rỗng thì không có khung nhìn nào
- **WHEN** đọc cấu hình có trường danh sách và nó rỗng
- **THEN** repo đang chọn để trống, khung nhìn `repo` vắng mặt, và việc đọc không ném

#### Scenario: khung nhìn khớp danh sách
- **WHEN** đọc cấu hình có nhiều repo
- **THEN** `repo` là đúng phần tử mà `repo_dang_chon` trỏ tới, không phải một bản sao rời

### Requirement: Vòng đời repo — thêm theo bốn bước, gỡ thì giữ clone và lịch sử

Thêm repo SHALL đi theo bốn bước, bước sau chỉ mở khi bước trước đã qua (gốc: R4.22). Cổng kiểm kết nối
SHALL là một lời gọi **thật** tới GitHub bằng chính chìa vừa dán (gốc: R4.23) — kiểm bằng cách đoán từ hình
dạng chuỗi thì người dùng chỉ biết mình sai sau khi lượt chấm đầu tiên chết. Nhánh gốc SHALL được gợi ý từ
`default_branch` mà bước kiểm trả về (gốc: R4.24).

Gỡ repo khỏi danh sách MUST NOT xoá clone trên đĩa và MUST NOT xoá lịch sử chấm (gốc: R4.7) — «thôi theo
dõi» khác «xoá dấu vết», và người gỡ nhầm phải thêm lại được mà không mất gì. Nhưng gỡ repo SHALL xoá token
riêng của nó khỏi kho bí mật (gốc: R4.27): chìa không còn chủ là chìa mồ côi.

Repo có trong danh sách nhưng không lấy được token SHALL mang trạng thái nói rõ điều đó và bị chặn **ngay**,
không khởi chạy rồi chết ở giữa (gốc: R4.25).

#### Scenario: gỡ repo
- **WHEN** một repo bị gỡ khỏi danh sách
- **THEN** clone và lịch sử chấm còn nguyên; token riêng của nó bị xoá khỏi kho bí mật

#### Scenario: repo thiếu chìa
- **WHEN** khởi chạy lượt chấm cho repo không lấy được token
- **THEN** bị chặn ngay với lời nói rõ nguyên nhân, không khởi chạy rồi chết giữa chừng

### Requirement: Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình

Token GitHub SHALL gắn với **từng repo**; mọi lời gọi API và mọi lệnh git nhắm vào một repo SHALL dùng chìa
của chính repo đó (gốc: R4.18). Token MUST NOT nằm trong `config.json` (gốc: R4.19) — cấu hình là thứ người
ta chép đi chép lại, gửi cho nhau để so, dán vào phiếu lỗi.

Thứ tự lấy chìa cho một repo SHALL là: chìa riêng của repo → biến môi trường (gốc: R4.20). Cấu hình đời cũ
có token dùng chung SHALL được di trú tự động thành chìa riêng của mọi repo (gốc: R4.21).

Clone bằng token thì sau khi clone xong SHALL gỡ token khỏi remote URL (gốc: R4.6) — token nằm trong
`.git/config` là token nằm trên đĩa ở một chỗ không ai nghĩ tới. Vì thế lệnh `git fetch` kéo pull request về
SHALL mang chìa trong URL của **chính lệnh đó**, dùng một lần (gốc: R4.28).

Mọi văn bản lỗi đi ra ngoài — log, sự kiện lượt chấm, màn hình — SHALL được gột token (gốc: R4.29): lời kêu
của `git` nhắc lại nguyên URL, và URL ấy đang mang chìa.

Việc **không route nào được trả token về, kể cả đã che** (gốc: R4.26) được cưỡng chế ở
`response-secret-guard`; ở đây không viết lại, chỉ nhắc để người đọc biết chỗ tìm.

#### Scenario: chìa riêng thắng biến môi trường
- **WHEN** một repo có chìa riêng và máy chủ cũng có biến môi trường
- **THEN** dùng chìa riêng của repo

#### Scenario: lời kêu của git mang URL có chìa
- **WHEN** một lệnh git thất bại và thông điệp lỗi chứa URL mang token
- **THEN** token bị gột trước khi văn bản ấy ra log, sự kiện hay màn hình

### Requirement: Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch

Mỗi lượt chấm SHALL mang trường `repo` được gán **tại thời điểm chạy** (gốc: R4.8) — gán lúc đọc thì lượt
cũ sẽ đổi chủ mỗi lần người dùng chọn repo khác.

Lọc theo repo SHALL tách bạch: lượt chấm của repo A MUST NOT lọt vào lịch sử repo B, và lượt chưa gắn repo
MUST NOT lọt vào lịch sử của bất kỳ repo nào (gốc: R4.9).

Lọc `verdict=loi` SHALL bắt theo **trạng thái tiến trình**, không theo kết quả chấm (gốc: R4.10) — «lượt
chạy hỏng» và «lượt chạy xong với verdict FAIL» là hai chuyện, gộp lại thì người tìm sự cố hạ tầng lẫn vào
người tìm pull request tồi.

Lọc theo nhà cung cấp SHALL dựa vào **tiền tố của chuỗi model đã ghim** (gốc: R4.11). Model không mang tiền
tố thì để trống cột nguồn, MUST NOT đoán bừa (gốc: R4.13). Nhiều bộ lọc cùng lúc SHALL kết hợp theo kiểu VÀ
(gốc: R4.12).

Sổ cái verdict cũng là một dạng lịch sử và SHALL lọc được theo repo như lịch sử lượt chấm (gốc: R4.16).

#### Scenario: hai repo, hai lịch sử
- **WHEN** lọc lịch sử theo repo A
- **THEN** không lượt nào của repo B lọt vào, và lượt chưa gắn repo cũng không

#### Scenario: model không mang tiền tố nhà cung cấp
- **WHEN** chuỗi model đã ghim không có tiền tố
- **THEN** cột nguồn để trống, không đoán ra một nhà cung cấp nào

### Requirement: Thang tin cậy lọc theo repo trước khi tính, và khi không lọc thì phải nói ra

Thang tin cậy tác giả SHALL lọc sổ cái theo repo **trước khi** tính hồ sơ (gốc: R4.17). Track record của
một người ở repo này không nói thay cho repo khác: một người cẩn thận ở repo mình thạo có thể ẩu ở repo
mình mới vào, và một hồ sơ gộp che mất đúng điều người đọc cần biết.

Khi **không** lọc, trang SHALL nói rõ là đang gộp mọi repo. Đây là vế dễ mất nhất: nó chỉ là một câu trên
màn hình, không có gì gãy khi nó biến mất trong một lần dọn giao diện — nhưng mất nó thì trang thành nói
dối bằng cách im lặng, và người đọc tin vào một con số không có nghĩa.

#### Scenario: xem riêng một repo
- **WHEN** trang thang tin cậy được lọc theo một repo
- **THEN** hồ sơ chỉ tính từ verdict của repo ấy, và trang nói rõ đang xem riêng repo nào

#### Scenario: không lọc
- **WHEN** trang thang tin cậy không lọc repo nào
- **THEN** trang nói rõ đang **gộp mọi repo**

### Requirement: Chuỗi do người ngoài viết phải được thoát, khoá hiển thị lại phải bị che

Mọi chuỗi do người ngoài viết — tiêu đề pull request, tên tác giả, tên repo — SHALL được thoát trước khi vào
HTML (gốc: R4.14). Chúng đến từ GitHub, tức từ người mà hệ này không kiểm soát; một tiêu đề pull request
mang thẻ script là đường tấn công có sẵn, không phải giả thiết.

Khoá và token hiển thị lại trên giao diện SHALL bị che (gốc: R4.15), và bản che MUST KHÔNG BAO GIỜ để lộ
trọn khoá.

#### Scenario: tiêu đề pull request mang thẻ script
- **WHEN** một pull request có tiêu đề chứa thẻ script và nó được hiển thị
- **THEN** thẻ ấy bị thoát, không chạy được

#### Scenario: khoá hiển thị lại
- **WHEN** giao diện hiển thị lại một khoá đã lưu
- **THEN** khoá bị che, không lộ trọn; và khi chưa có khoá thì nói rõ là chưa có
