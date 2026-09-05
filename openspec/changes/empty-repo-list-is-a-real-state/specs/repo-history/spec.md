## MODIFIED Requirements

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
