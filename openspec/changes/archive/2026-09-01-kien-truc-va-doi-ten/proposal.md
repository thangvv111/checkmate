## Why

Repo chưa từng khai kiến trúc. Bốn ranh giới tốt đã mọc tự nhiên (engine tách web · lớp kho là cửa
duy nhất chạm SQLite · provider adapter · máy tất định tách model) nhưng sống rải rác trong luật chứ
không thành sơ đồ, nên **không ai kiểm được** khi có người import sai chiều.

Đo hiện trạng 01/09 cho kết quả tốt hơn dự đoán: `shared` không import ai, `engine` không import
`app` — sạch. Chỉ còn **một vòng `app(web) ↔ adapter(kho)`**, và mổ ra thì **5/7 cạnh ngược là
`import type`** (bị xoá lúc biên dịch, không phải phụ thuộc runtime). Hai cạnh VALUE thật đều import
đúng một thứ: hằng `GOC` từ `paths.ts` — **một file 5 dòng đang bị xếp nhầm vào tầng app** trong khi
nó là infrastructure.

⇒ Không cần đại tu. Cần **đặt tên cho thứ đã đúng**, dời một file, và **cưỡng chế bằng test** —
đúng văn hoá repo: luật không máy-kiểm-được là luật trang trí.

Gộp cùng việc thứ hai vì nó chạm đúng những file ấy: **87 export mang tên tiếng Việt** trải 29 file.
PO chốt 01/09 định danh mới sinh viết tiếng Anh; code cũ chờ một change refactor có kế hoạch — đây
là change đó. Tách hai việc ra thì phải chạm cùng một tập file hai lần.

Và một thứ phép đo lôi ra khi khảo sát: **luật đã hết hiệu lực còn nằm ở hai chỗ agent đọc**.
`openspec/config.yaml` mục `context` và instruction của artifact `proposal` trong
`schemas/checkmate/schema.yaml` vẫn khai «HAI TẦNG SPEC — phương án A 31/08» và «chờ verdict → PASS
mới merge». `config.yaml` inject vào **mọi artifact của mọi change**, nên đây là chỗ nguy nhất: mọi
agent viết proposal đều đọc luật cũ.

## What Changes

1. **Khai kiến trúc bốn tầng + cưỡng chế bằng test import-graph.** Sơ đồ tầng và ma trận phụ thuộc
   cho phép, kiểm bằng một test đọc câu `import` thật. Chặn **value-import ngược**; **cho phép**
   type-import (nó bị xoá lúc biên dịch — chặn nó là chặn một thứ không tồn tại lúc chạy).
2. **Dời `paths.ts` xuống tầng nền** — cắt vòng runtime `app ↔ kho`. Đây là toàn bộ phần «di chuyển
   file» của change; không có đại tu thư mục nào khác.
3. **Đổi tên định danh LỚP A sang tiếng Anh.** Lớp A = định danh **không băng qua ranh giới
   serialize**: tên hàm, biến, kiểu, file. Kèm **lưới chống chạm nhầm lớp B/C** (dưới).
4. **Sửa hai chỗ còn khai luật đã hết hiệu lực**: `openspec/config.yaml` mục `context` và
   instruction artifact `proposal` trong `schemas/checkmate/schema.yaml`.

**KHÔNG làm trong change này** (ghi nợ có tên, không bỏ quên):
- Đổi tên **lớp B/C** — cần đường di trú riêng, xem `design.md`.
- **`Storage` port** — PO chốt giữ SQLite; port một-adapter là interface trang trí, và chữ ký viết
  hôm nay (`node:sqlite` sync) sẽ sai ngày đổi thật (`pg` async). `R9` đã giữ đúng tài sản đó.
- Tách `RunMeta` khỏi `RunManager` trong `runs.ts` — nhát dao riêng, không đổi hành vi gì.

## Capabilities

### New Capabilities
- `kien-truc-tang`: ranh giới tầng của repo và luật phụ thuộc một chiều, cưỡng chế được bằng máy;
  kèm luật ngôn ngữ định danh và ranh giới A/B/C của việc đổi tên.

### Modified Capabilities
<!-- không capability nào trong openspec/specs/ mô tả kiến trúc hay định danh trước change này -->

## Luật R chạm tới

- **KHÔNG — cố ý.** PO chốt 01/09 (thay phương án A 31/08): `specs/R*.md` là **tài liệu tham khảo**,
  không được dùng ép kiến trúc mới, và change mới không đẻ thêm điều R*. Luật của change này sống ở
  ba chỗ máy đọc được: **ma trận tầng + test import-graph trong engine** · **quy ước đặt tên có test
  khoá** · **hành vi khai trong `openspec/specs/kien-truc-tang/`**.
- Ô này chính nó đang mâu thuẫn với instruction sinh ra nó — sửa instruction là task 1.2.

## Impact

- `apps/web/src/paths.ts` — dời xuống tầng nền (cắt vòng runtime).
- `apps/web/src/**`, `packages/harness/src/**`, `packages/shared/src/**` — đổi tên lớp A; 87 export
  cộng định danh nội bộ, trải 29 file.
- `checkmate.yml` — khai lại bảng module theo tên mới (⛔C5: quên khai thì probe chết với «... is
  not a function» và thành finding sai hẳn bản chất — đã xảy ra 5 lần).
- `test/` — thêm test import-graph + test đọc-dữ-liệu-cũ; 30 file test hiện có sẽ chạm tên mới.
- `openspec/config.yaml`, `openspec/schemas/checkmate/schema.yaml` — bỏ luật đã hết hiệu lực.
- **Không đụng**: hình dạng dữ liệu trên đĩa/DB, hợp đồng `checkmate.yml` mà repo đích khai, nhãn
  máy trong verdict đã lưu.
