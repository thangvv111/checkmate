## ADDED Requirements

### Requirement: Gói deploy chỉ mang sản phẩm, không mang hồ sơ xây dựng

Gói deploy SHALL chỉ chứa những gì sản phẩm cần để chạy: mã nguồn ứng dụng và engine, khai báo gói, cấu
hình biên dịch, và tài liệu vận hành. Hồ sơ xây dựng — `openspec/`, `docs/`, `test/`, `bench/`, `_ref/`,
`.claude/`, luật của agent, hợp đồng tự chấm — MUST NOT có trong gói.

Danh sách «sản phẩm» MUST được khai tường minh ở một chỗ, và mọi mục cấp một của repo ngoài danh sách đó
MUST bị loại khỏi gói — thêm một thư mục xây dựng mới mà quên loại là gói mang thêm hồ sơ mà không ai
thấy. Loại MUST theo đường neo trong repo (`checkmate/<tên>`), không theo tên trơ: gói còn mang repo demo
có thư mục trùng tên (`test/`), loại trơ là cắt nhầm dữ liệu của repo đích.

Bước đóng gói SHALL tự kiểm danh sách gói trước khi gửi: không bí mật, không dữ liệu prod, không hồ sơ
xây dựng — lệnh kiểm phải KHÔNG in ra dòng nào.

Vì sao thành yêu cầu: PO chốt 02/09 — OpenSpec chỉ dùng để xây sản phẩm, không phải một phần của sản
phẩm. Đo cùng ngày: sản phẩm chạy nguyên khi cắt `openspec/` trên máy dev, nhưng gói deploy vẫn đẩy nó
lên máy chủ. Độc lập phải được kiểm ở bản chạy thật, không ở máy dev.

#### Scenario: đóng gói đúng
- **WHEN** chạy bước đóng gói
- **THEN** danh sách gói không có mục nào dưới `checkmate/openspec`, `checkmate/docs`, `checkmate/test`,
  `checkmate/bench`, `checkmate/_ref`, `checkmate/.claude`, và lệnh tự kiểm không in ra dòng nào

#### Scenario: thêm thư mục xây dựng mới mà quên loại
- **WHEN** repo có thêm một mục cấp một không thuộc danh sách sản phẩm và exclude của bước đóng gói chưa
  có nó
- **THEN** lưới đỏ, nêu đúng tên mục chưa được loại

#### Scenario: repo demo đóng gói cùng không bị cắt nhầm
- **WHEN** gói còn mang `demo-credit-approval/test/`
- **THEN** thư mục đó vẫn có trong gói — loại `checkmate/test` không đụng nó

### Requirement: Sản phẩm không đọc hồ sơ xây dựng của chính nó lúc chạy

Mã sản phẩm (`apps/`, `packages/`) MUST NOT đọc `openspec/`, `docs/`, hay bất kỳ hồ sơ xây dựng nào của
chính repo này lúc chạy. Sản phẩm SHALL chạy nguyên khi những thư mục đó không tồn tại.

Tri thức về **quy ước của repo đích** — ví dụ «repo dùng OpenSpec giữ spec ở `openspec/specs/` và tài
liệu quy trình dưới `openspec/`» — KHÔNG phải phụ thuộc: nó cùng loại với việc biết `package-lock.json` là
file sinh. Tri thức đó được phép làm **mặc định**, và repo đích SHALL được khai đè (nợ có tên).

Tự chấm (CheckMate là repo đích của chính nó) đọc hồ sơ từ **bản clone của repo**, như với mọi repo đích
— không đọc từ thư mục của bản deploy.

#### Scenario: cắt hồ sơ xây dựng, sản phẩm vẫn chạy
- **WHEN** `openspec/`, `docs/`, `test/`, `bench/`, `.claude/` không tồn tại bên cạnh `apps/` và `packages/`
- **THEN** biên dịch sạch và sản phẩm khởi động, chấm được repo đích như thường

#### Scenario: mã sản phẩm nhắc `openspec`
- **WHEN** một chuỗi `openspec` xuất hiện trong `apps/` hoặc `packages/`
- **THEN** nó chỉ được là tri thức về quy ước của repo đích (danh sách ứng viên tự dò, danh sách thư mục
  tài liệu quy trình) — không được là đường đọc hồ sơ của chính repo này
