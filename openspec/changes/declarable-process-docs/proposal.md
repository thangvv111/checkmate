# Proposal — declarable-process-docs: repo đích khai được thư mục tài liệu quy trình

## Why

Router định tuyến PR coi `openspec/**` là **tài liệu quy trình** (với các đuôi cấu hình) — một tri thức
mặc định về quy ước repo đích, gắn cứng ở `apps/web/src/github.ts:320`. Repo đích dùng công cụ quy trình
khác (`.bmad/`, `rfcs/`, `adr/`, `process/`…) không khai đè được: PR chỉ đổi tài liệu quy trình của họ sẽ
đi đường **code**, tốn tiền và ồn — đúng cái đo được ở PR #17 (10 probe cho PR không có dòng code nào,
~52k token).

Đây là nợ có tên #6 của `named-debts`, PO chốt 02/09 «giữ mặc định, thêm cửa khai sau».

**Đo lại 03/09 — nợ #6 nhỏ hơn lúc ghi**: vế thứ hai của nó («khai đè danh sách tự dò nguồn spec») **đã
xong** từ change `retire-r-rules` — router nhận `sources.specs` (`github.ts:421`) và chỉ dùng
`SPEC_CANDIDATES` khi repo không khai. Change này chỉ còn vế một.

## What Changes

- **`sources.process_docs`** (khoá mới trong `checkmate.yml` của repo đích): danh sách thư mục chứa tài
  liệu quy trình. Không khai → mặc định `openspec/` như hôm nay.
- **Router đọc khai báo đó** thay cho tên thư mục gắn cứng; **đuôi vẫn là danh sách cố định**
  (`.md`, `.txt`, `.yaml`, `.yml`, `.json`) — repo KHÔNG khai đè được đuôi.
- **Ba gác giữ hướng an toàn** (xem design D2): mẫu phải có ít nhất một tầng thư mục (không nhận `**`,
  `*`, chuỗi rỗng); file thuộc **nguồn spec** vẫn thắng và về code; đường tuyệt đối hoặc có `..` bị loại
  ở cửa đọc như các khoá `sources` khác.
- **Lời từ chối nói ra**: mẫu bị loại được ghi vào log định tuyến, không im lặng bỏ qua.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `dinh-tuyen-skill-cham`: requirement «Định tuyến theo file thực thi được, fail-closed» — thư mục tài
  liệu quy trình do repo đích khai, không phải một tên cố định; kèm ba gác chống nới cổng.
- `spec-source`: requirement «Nguồn spec do repo đích khai, không do engine áp đặt» — mục `sources` nay
  có khoá thứ tư `process_docs`, cùng luật loại đường ngoài repo.

## Luật chạm tới

- **Luật chạm tới:** `dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed` (MODIFIED) ·
  `spec-source › Nguồn spec do repo đích khai, không do engine áp đặt` (MODIFIED). Không chạm ⛔C. Trả nợ
  #6 của `named-debts` (một nửa; nửa kia đã xong ở `retire-r-rules`).

## Impact

- `packages/shared/src/spec-source.ts`: `SourceKey` thêm `process_docs`; `SourcesCfg` thêm trường;
  `readSourcesCfg` đọc + loại mẫu không hợp lệ; hằng `PROCESS_DOC_DIRS` (mặc định) và `PROCESS_DOC_EXTS`.
- `apps/web/src/github.ts`: `classifyPr` nhận thêm mẫu thư mục quy trình; `fetchAndRoute` truyền vào.
- `checkmate.yml` bảng module (⛔C5) · `test/dinh-tuyen-skill.test.ts` + `test/sources.test.ts` (ca mới).
- Không chạm engine chấm, không chạm verdict, không chạm cổng.
