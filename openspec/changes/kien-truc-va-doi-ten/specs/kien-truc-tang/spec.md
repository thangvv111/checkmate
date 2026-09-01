## ADDED Requirements

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
