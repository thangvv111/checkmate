# Design — declarable-process-docs

## Context

Đo 03/09 trên `main` (`4f628ce`):

```
github.ts:320   if (f.startsWith('openspec/')) return DUOI_QUY_TRINH.some(d => t.endsWith(d));
                DUOI_QUY_TRINH = ['.md','.txt','.yaml','.yml','.json']   (github.ts:305)
github.ts:421   classifyPr(filesDoi, nguonSpec?.specs)   <- nguon spec DA khai de duoc (retire-r-rules)
spec-source.ts  SourceKey = 'specs' | 'api_doc' | 'test_sample'
                readSourcesCfg  loai duong tuyet doi / co `..`, mang theo `rejected`
```

Nợ #6 ghi hai vế; đo cho thấy **vế «khai đè danh sách tự dò nguồn spec» đã xong** — router nhận
`sources.specs` và chỉ rơi về `SPEC_CANDIDATES` khi repo không khai. Change này chỉ còn vế «thư mục tài
liệu quy trình».

## Goals / Non-Goals

**Goals**
- Repo đích khai được thư mục tài liệu quy trình của nó; không khai thì hành vi y hệt hôm nay.
- Khai báo này KHÔNG mở được cửa né probe rộng hơn hôm nay.

**Non-Goals**
- KHÔNG cho repo khai đè **đuôi file** tài liệu quy trình.
- KHÔNG gỡ mặc định `openspec/` (PO chốt 02/09: giữ mặc định, thêm cửa khai).
- KHÔNG đụng `sources.specs`, `api_doc`, `test_sample`.

## Decisions

### D1 — Khoá thứ tư của `sources`, dùng lại cửa đọc sẵn có

`SourceKey` thêm `process_docs`; `readSourcesCfg` đọc nó bằng đúng hàm `doc()` đang dùng cho ba khoá kia,
nên luật loại đường tuyệt đối / có `..` và cơ chế `rejected` áp y nguyên — một cửa, không phải cửa song
sinh thứ tư (khuôn lỗi bị bắt chín lần trong lịch sử repo).

### D2 — Ba gác, vì khai báo này NỚI chứ không SIẾT

`sources.specs` khai đè chỉ có thể làm router CHẶT hơn (thêm file bị coi là luật → về code). `process_docs`
thì ngược: nó **nới** phía tài liệu, tức lệch về hướng nguy hiểm. Ba gác:

| gác | vì sao |
|---|---|
| mẫu phải có ≥ 1 tầng thư mục (từ chối `**`, `*`, `''`, `.`, `/`) | `**` biến mọi `.md`/`.yaml` của repo thành tài liệu quy trình — kể cả `.github/workflows/ci.yml` nếu ai đó khai `.github/**`. Đòi tầng thư mục không chặn được ca cố ý đó, nhưng chặn ca **vô tình** rộng tay, là ca thường gặp |
| đuôi cố định của engine | repo khai được đuôi thì `rfcs/tool.ts` thành tài liệu — cửa né probe rộng nhất |
| nguồn spec THẮNG | file vừa thuộc `process_docs` vừa thuộc `sources.specs` → về code; thứ tự kiểm giữ nguyên như hôm nay (`laNguonSpec` trước) |

Ca cố ý (`process_docs: .github/`) vẫn khai được. Đó là **quyết định của repo đích về repo của chính họ**,
và nó nằm trong `checkmate.yml` — file mà router đã xếp vào code, nên PR đổi nó luôn bị chấm bằng probe.
Ghi rõ ở security S8.

### D3 — So khớp: tiền tố THƯ MỤC, không phải glob

`sources.specs` dùng `matchPattern` (glob trên cây file). `process_docs` chỉ cần biết «file này có nằm
dưới thư mục kia không», và phép so phải giữ đúng ba tính chất đã chốt ở luật định tuyến: so **đúng hoa
thường** cho tên thư mục (Linux: `OpenSpec/` ≠ `openspec/`), KHÔNG chuẩn hoá `\`, và không nhận tên trơ
(git liệt kê file, không liệt kê thư mục). Nên: chuẩn hoá mẫu về dạng có `/` ở cuối, rồi `startsWith`.
Dùng glob ở đây sẽ kéo theo `matchPattern` không phân biệt hoa thường — phá đúng tính chất đầu.

### D4 — Mẫu bị từ chối phải NÓI RA

`readSourcesCfg` đã có `rejected` cho đường ngoài repo; gác «phải có tầng thư mục» thêm lý do mới vào cùng
danh sách đó. `fetchAndRoute` in mọi mục `rejected` liên quan vào log định tuyến — cùng nguyên tắc «không
cắt âm thầm».

## Architecture

- `packages/shared/src/spec-source.ts` (tầng nền): `SourceKey`, `SourcesCfg.process_docs`,
  `PROCESS_DOC_DIRS` (mặc định `['openspec/']`), `PROCESS_DOC_EXTS`, `laThuMucQuyTrinh(f, mau)`.
- `apps/web/src/github.ts`: `classifyPr` nhận tham số thứ ba (mẫu thư mục quy trình); `fetchAndRoute`
  truyền `nguonSpec?.process_docs` và in `rejected`.
- Engine (`packages/harness`) không đổi — khoá này chỉ router dùng.

## Data Model

N/A — không đổi dữ liệu trên đĩa. `checkmate.yml` của repo đích có thêm một khoá tuỳ chọn; repo cũ không
khai thì hành vi không đổi.

## Risks / Trade-offs

- [Repo khai rộng tay, PR có mã cấu hình đi đường doc] → ba gác D2; ca cố ý vẫn khai được nhưng phải sửa
  `checkmate.yml`, mà PR đổi file đó luôn đi đường code.
- [Phép so tiền tố lệch với glob của `sources.specs`] → D3 ghi rõ vì sao khác nhau; test có ca hoa thường.
- [Thêm tham số thứ ba cho `classifyPr`] → tuỳ chọn, vắng thì mặc định; mọi ca test cũ giữ nguyên chữ ký.

## Migration Plan

N/A. Repo không khai → hành vi y hệt. Đường lùi: revert PR.

## Open Questions

- Không.
