# kien-truc-tang Specification

## Purpose
TBD - created by archiving change kien-truc-va-doi-ten. Update Purpose after archive.

## Requirements

### Requirement: Tầng và chiều phụ thuộc một chiều

Repo SHALL khai một tập tầng với chiều phụ thuộc **một chiều từ trên xuống**. Tầng nền (kiểu dùng
chung, hằng đường dẫn) MUST NOT import bất kỳ tầng nào khác. Engine MUST NOT import tầng ứng dụng
web. Tầng adapter MUST NOT **value-import** ngược lên tầng ứng dụng.

`import type` KHÔNG bị luật này chặn: nó bị xoá lúc biên dịch nên không tạo phụ thuộc lúc chạy.
Chặn nó là cưỡng chế một thứ không tồn tại khi chương trình chạy, và cái giá phải trả là những nhát
dao tách file không đổi hành vi gì.

#### Scenario: adapter value-import ngược lên tầng ứng dụng
- **WHEN** một file trong tầng adapter có câu `import { x } from '../<file tầng ứng dụng>'` (không
  phải `import type`)
- **THEN** lưới kiến trúc ĐỎ, nêu đúng file nguồn, file đích và cặp tầng vi phạm

#### Scenario: adapter type-import ngược lên tầng ứng dụng
- **WHEN** một file trong tầng adapter có câu `import type { T } from '../<file tầng ứng dụng>'`
- **THEN** lưới kiến trúc XANH — đây là phụ thuộc lúc-biên-dịch, được phép

#### Scenario: tầng nền giữ sạch
- **WHEN** một file ở tầng nền import bất kỳ tầng nào khác, kể cả type
- **THEN** lưới kiến trúc ĐỎ

### Requirement: Ranh giới tầng phải kiểm được bằng máy

Luật tầng MUST được cưỡng chế bằng một test đọc **câu `import` thật trong mã nguồn** rồi đối chiếu
ma trận cho phép — không phải bằng tài liệu hay quy ước truyền miệng. Test MUST nêu tên file cụ thể
khi đỏ, đủ để sửa mà không phải đi tìm.

Một luật kiến trúc không kiểm được bằng máy là luật trang trí: nó chỉ đúng cho tới lần đầu có người
bận việc.

#### Scenario: thêm một import vi phạm
- **WHEN** một import vi phạm ma trận được thêm vào bất kỳ file nào của repo
- **THEN** `npm test` đỏ ở lưới kiến trúc, kèm tên file nguồn và file đích

### Requirement: Ngôn ngữ định danh là tiếng Anh, có ranh giới phân lớp

Định danh **mới sinh** trong mã nguồn (hàm, biến, kiểu, khoá cấu hình nội bộ, mã enum nội bộ, tên
file) SHALL viết bằng tiếng Anh. Văn trình bày cho người đọc (tài liệu, thông điệp, chú thích giải
thích) giữ tiếng Việt.

Định danh hiện có SHALL được phân ba lớp trước khi đổi:

- **Lớp A** — định danh KHÔNG băng qua ranh giới serialize. Đổi được: trình biên dịch bắt mọi chỗ sót.
- **Lớp B** — tên trường nằm trong object bị serialize nguyên khối rồi ghi xuống đĩa hoặc cơ sở dữ
  liệu, và tên cột. **KHÔNG được đổi** khi không có đường di trú: dữ liệu đã lưu đọc ra thành khuyết,
  và không lưới nào bắt được vì đó là JSON tự do.
- **Lớp C** — khoá trong hợp đồng mà **repo đích** khai. **KHÔNG được đổi** khi chưa có đường tương
  thích ngược: đổi là bắt mọi repo khách sửa file của họ.

Quy tắc phân lớp cơ học: *field nào nằm trong một object bị `JSON.stringify` nguyên khối rồi ghi
xuống đĩa/DB thì thuộc lớp B; còn lại thuộc lớp A.* Một kiểu có thể **nửa A nửa B** — tên kiểu là A,
một số field bên trong là B.

#### Scenario: đổi tên lớp A
- **WHEN** một hàm lớp A được đổi tên và một chỗ gọi bị sót
- **THEN** `npx tsc --noEmit` đỏ ngay — không cần lưới riêng

#### Scenario: đổi nhầm một field lớp B
- **WHEN** một field thuộc object được serialize nguyên khối bị đổi tên
- **THEN** lưới đọc-dữ-liệu-cũ ĐỎ: dữ liệu đời thật nạp lên thiếu đúng trường đó

#### Scenario: kiểu nửa A nửa B
- **WHEN** một kiểu có tên thuộc lớp A nhưng có field được lưu xuống đĩa
- **THEN** tên kiểu đổi được, các field đã lưu giữ nguyên, và lưới đọc-dữ-liệu-cũ vẫn xanh

### Requirement: Dữ liệu đã lưu phải đọc lại được sau khi đổi tên

Sau bất kỳ đợt đổi tên nào, hệ thống MUST đọc lại nguyên vẹn dữ liệu ghi trước đợt đổi. Lưới kiểm
MUST dùng **mẫu dữ liệu đời thật** (một verdict đã lưu và một sổ thư viện probe đã lưu) làm fixture,
không dùng object dựng trong test — object dựng trong test mang tên MỚI nên nó không chứng minh được
gì về dữ liệu cũ.

#### Scenario: nạp verdict đời cũ
- **WHEN** đọc một verdict ghi trước đợt đổi tên
- **THEN** mọi trường của nó đọc ra đủ, không trường nào thành khuyết

#### Scenario: nạp sổ thư viện probe đời cũ
- **WHEN** đọc một sổ thư viện probe ghi trước đợt đổi tên
- **THEN** mọi probe trong sổ đọc ra đủ, kèm kế hoạch probe của nó

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

Engine đọc hợp đồng và hồ sơ của mọi repo đích từ **bản clone của repo đó** — không đọc từ thư mục của
bản deploy.

#### Scenario: cắt hồ sơ xây dựng, sản phẩm vẫn chạy
- **WHEN** `openspec/`, `docs/`, `test/`, `bench/`, `.claude/` không tồn tại bên cạnh `apps/` và `packages/`
- **THEN** biên dịch sạch và sản phẩm khởi động, chấm được repo đích như thường

#### Scenario: mã sản phẩm nhắc `openspec`
- **WHEN** một chuỗi `openspec` xuất hiện trong `apps/` hoặc `packages/`
- **THEN** nó chỉ được là tri thức về quy ước của repo đích (danh sách ứng viên tự dò, danh sách thư mục
  tài liệu quy trình) — không được là đường đọc hồ sơ của chính repo này
