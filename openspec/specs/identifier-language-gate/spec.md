# identifier-language-gate Specification

## Purpose
TBD - created by archiving change identifier-language-gate. Update Purpose after archive.

## Requirements

### Requirement: Định danh cấp module viết tiếng Anh, và luật này được lưới cưỡng chế

Định danh **cấp module** trong mã nguồn của repo — thứ khai báo ở cột 0 của file `.ts` dưới
`packages/*/src/` và `apps/web/src/`: hàm, hằng, biến, lớp, kiểu, interface, enum — SHALL đặt tên bằng
tiếng Anh.

Luật này SHALL được cưỡng chế bằng một lưới test chạy trong `npm test`, KHÔNG chỉ bằng câu chữ trong tài
liệu. Một luật đặt tên chỉ sống trong tài liệu là luật không thi hành được: nó tác động lúc người ta ĐỌC,
còn vi phạm xảy ra lúc người ta GÕ, và giữa hai thời điểm ấy không có gì bắt lại.

Ngoài phạm vi, khai rõ để không ai phải đoán:

- **Trường của object hoặc kiểu** KHÔNG tính (`{ chay, lyDo, soProbe }` không vi phạm) — PO chốt 03/09.
- **Biến cục bộ trong thân hàm** KHÔNG tính. Chúng không phải bề mặt người khác đọc, và một đợt đổi tên
  trong thân hàm tạo trạng thái nửa nạc nửa mỡ tệ hơn cả hai đầu.
- **Giá trị chuỗi** KHÔNG tính (`'hoi_quy'`, `'vi_pham_luat_moi'`) — chúng nằm trong sổ đã ghi và verdict
  cũ; đổi chúng là đổi dữ liệu, không phải đổi tên.
- Văn trình bày, comment, tài liệu vẫn tiếng Việt; thuật ngữ giữ tiếng Anh.

*Vì sao thành luật: đo được, và số đo là bằng chứng đối chứng hiếm có. Luật «định danh mới viết tiếng Anh»
được chốt 01/09/2026 lúc 17:00 và ghi vào `CLAUDE.md` — file nạp vào đầu mỗi phiên agent. Định danh tiếng
Việt đầu tiên vi phạm nó sinh lúc **17:16 cùng ngày**, bởi chính agent đã đọc luật ấy. Trong 48 giờ sau đó
có 10 định danh cấp module vi phạm, không cái nào bị máy phát hiện — tất cả lọt qua `tsc`, qua 764 ca test,
qua sáu lượt review PR, và chỉ lộ ra khi người đọc code bằng mắt. Cùng lúc đó ⛔C5 nằm trong CÙNG file
`CLAUDE.md`, cũng dễ quên như thế, nhưng có `test/hop-dong-repo.test.ts` — nên khi agent quên khai export,
lưới đỏ ngay trong phiên. Khác biệt duy nhất giữa hai luật là cái lưới.*

#### Scenario: định danh cấp module tiếng Việt mới sinh
- **WHEN** một file nguồn khai báo ở cột 0 một định danh mang âm tiết tiếng Việt, không có trong danh sách
  miễn trừ
- **THEN** lưới `npm test` ĐỎ, và thông điệp nêu đúng tên đó cùng file chứa nó

#### Scenario: định danh tiếng Anh
- **WHEN** định danh cấp module đặt bằng tiếng Anh
- **THEN** lưới xanh — kể cả khi tên chứa âm trùng tiếng Việt (`API_DOC_CANDIDATES`, `getDocExamples`,
  `ChatCompletionsProvider`: «doc» là *document*, «chat» là *chat*)

#### Scenario: biến cục bộ
- **WHEN** một biến tiếng Việt được khai báo trong thân hàm (có thụt đầu dòng)
- **THEN** lưới KHÔNG đỏ — nằm ngoài phạm vi luật

### Requirement: Danh sách miễn trừ là danh sách CHO PHÉP, đóng băng, mỗi dòng có lý do

Code cũ mang tên tiếng Việt SHALL được miễn qua một danh sách **CHO PHÉP** ghi tại
`docs/identifier-allowlist.md`, đóng băng ngày 03/09/2026 với 89 mục.

Mỗi dòng SHALL mang một lý do miễn, và lý do hợp lệ chỉ có hai loại: **code cũ có trước ngày đóng băng**,
hoặc **tên tiếng Anh bị từ điển bắt nhầm**. Lưới SHALL kiểm định dạng dòng, vì một danh sách miễn trừ không
có lý do là chỗ để hợp thức hoá vi phạm mới — và khi ấy lưới còn tệ hơn không có lưới, do nó tạo cảm giác
đang được gác.

Danh sách này MUST NOT được nới ra để chứa định danh mới sinh. Cách duy nhất để một định danh mới đi qua
lưới là **đặt tên tiếng Anh**.

Phép nhận diện tiếng Việt là một **tín hiệu**, không phải phép quyết định đúng-sai: nó dựa trên từ điển âm
tiết nên có âm tính giả — tên tiếng Việt dùng âm ngoài từ điển vẫn lọt. Chấp nhận được ở đây vì lưới này
gác **quy ước viết code**, không gác verdict hay cổng merge: một âm tính giả làm luật phủ chưa hết, chứ
không làm một pull request sai lọt cổng. Đánh đổi này KHÔNG được đem áp cho ⛔C3, nơi một âm tính giả là
một bí mật rò ra ngoài và không thu hồi được.

#### Scenario: code cũ trong danh sách
- **WHEN** một định danh tiếng Việt có trong `docs/identifier-allowlist.md`
- **THEN** lưới xanh

#### Scenario: dòng miễn trừ thiếu lý do
- **WHEN** danh sách miễn trừ có một dòng không kèm lý do
- **THEN** lưới ĐỎ — danh sách không lý do là cửa hợp thức hoá vi phạm
