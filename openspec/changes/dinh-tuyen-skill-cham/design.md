## Context

`fetchVaRouter` (apps/web/src/github.ts) fetch PR về rồi quyết `loai: 'code' | 'doc'` bằng đúng một
dòng: `filesDoi.every(f => f.toLowerCase().endsWith('.md'))`. Quyết định này chi phối cả lượt chấm —
sai đường thì hoặc tốn tiền vô ích (doc → code), hoặc bỏ sót probe (code → doc).

Không luật nào trong `specs/` khai hành vi này (đã grep toàn thư mục), nên tới giờ cổng không có gì
để đối chiếu khi engine định tuyến sai.

## Goals / Non-Goals

**Goals**
- PR chỉ đổi văn bản/cấu hình quy trình đi đường doc, rẻ và đúng bản chất.
- Quyết định định tuyến có luật ràng buộc và có log giải thích.
- Lệch về phía an toàn: nghi ngờ thì đi code.

**Non-Goals**
- KHÔNG làm skill doc chấm nhiều tài liệu trong một lượt (hiện chỉ chấm một file `.md`) — giới hạn
  sẵn có, ghi ở Risks, không sửa trong change này.
- KHÔNG đụng engine `packages/harness`: định tuyến là việc của lớp web.
- KHÔNG cho người dùng ép skill bằng tay ở change này.

## Decisions

**Q1: Allowlist hay blocklist?**
Chọn **allowlist** (chỉ `*.md`, `*.txt`, `openspec/**` là văn bản thuần). Blocklist («không phải
`.ts/.js/.py`… thì là doc») có rủi ro một chiều: mỗi khi repo đích thêm một loại file thực thi được mà
danh sách chưa biết, PR có code sẽ âm thầm đi đường doc — không probe nào chạy, verdict xanh, và không
ai thấy gì bất thường. Allowlist sai thì chỉ tốn tiền.

**Q2: `openspec/**` có an toàn để xếp vào văn bản thuần không?**
Có. Engine chấm KHÔNG đọc `openspec/` — nó đọc `specs/` (luật) và `checkmate.yml` (hợp đồng). Nội dung
`openspec/` chỉ định hình cách con người/agent soạn change về sau. Ngược lại `checkmate.yml` ở gốc
tuy là YAML nhưng engine đọc thật, nên **cố ý không** nằm trong allowlist.

**Q3: Không có `.md` nào thì sao?**
Giữ đường code. Skill doc cần một tài liệu cụ thể để trích dẫn nguyên văn (rubric của nó xây quanh
trích dẫn). PR chỉ đổi `openspec/*.yaml` là ca hiếm và đi đường code chỉ tốn tiền, không sai.

**Q4: Tách hàm hay sửa tại chỗ?**
Tách thành hàm thuần `phanLoaiPr(filesDoi)` trả `{ loai, lyDo, fileDoc? }`. Lý do: `fetchVaRouter` chạm
mạng và git nên không test được rẻ; hàm thuần thì test bằng danh sách tên file, và mọi scenario trong
spec thành ca test trực tiếp. Hàm mới phải khai vào bảng module của `checkmate.yml` (⛔C5).

## Architecture

Chỉ chạm `apps/web/src/github.ts`:
- Thêm hàm thuần `phanLoaiPr(filesDoi: string[]): { loai: 'code' | 'doc'; lyDo: string; fileDoc?: string }`
  — không I/O, không git.
- `fetchVaRouter` gọi nó, rồi nếu `loai === 'doc'` mới chạy `git diff --numstat` để chọn file `.md`
  nhiều dòng đổi nhất (giữ nguyên logic cũ), và `console.log` lý do.

Engine (`packages/harness`) không đổi: nó nhận `loai` đã chốt như trước.

## Data Model

Không đổi hình dạng dữ liệu trên đĩa. `PrDaFetch` thêm trường `lyDoDinhTuyen: string` (chỉ nằm trong
bộ nhớ và log của lượt chấm, không ghi vào sổ cái) → không cần di trú. N/A với R10.13.

## Risks / Trade-offs

- **[PR trộn nhiều .md, chỉ một cái được chấm]** → giới hạn sẵn có của skill doc, không sinh ra từ
  change này; nay lộ rõ hơn vì nhiều PR đi đường doc hơn. Giảm thiểu: log nêu rõ tài liệu nào được
  chọn; ghi thành quan sát để mở việc riêng nếu thành vấn đề thật.
- **[Repo đích khác có thể đặt code trong thư mục tên `openspec/`]** → allowlist `openspec/**` là quy
  ước của CheckMate, áp cho mọi repo đích. Rủi ro thấp và một chiều-an-toàn-ngược: nếu ai đó để code
  trong `openspec/`, PR đó sẽ đi đường doc. Giảm thiểu: luật R13 nói rõ `openspec/**` được coi là tài
  liệu quy trình; repo nào để code ở đó là vi phạm quy ước.
- **[Đổi đường đi của cổng có thể làm PR đang mở đổi hành vi giữa chừng]** → chấp nhận: verdict ghim
  theo commit, lượt sau chấm lại từ đầu.

## Migration Plan

Không có dữ liệu cần di trú. Triển khai theo đường deploy thường (DEPLOY.md). Đường lùi: revert commit
— hành vi trở về «toàn `.md` mới là doc».

## Open Questions

- Có nên cho phép ép skill bằng tay (nhãn PR hoặc nút trên giao diện) không? Chưa cần; ghi lại để bàn
  nếu gặp ca định tuyến sai thật.
