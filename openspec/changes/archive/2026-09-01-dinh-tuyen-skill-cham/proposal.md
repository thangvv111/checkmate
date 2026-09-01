## Why

PR chỉ đổi tài liệu và cấu hình quy trình vẫn bị đẩy vào pipeline **code**, vì luật định tuyến hiện
tại là «toàn bộ file đổi phải là `.md`» ([github.ts:264](../../../apps/web/src/github.ts)). Một file
`.yaml` trong `openspec/` cũng đủ làm PR rơi sang đường code.

Đo được trên PR #17 (chỉ đổi schema OpenSpec + `CLAUDE.md` + `openspec/config.yaml`): engine sinh 10
probe code cho một PR **không đổi dòng code nào**, 6/10 fail cùng nguyên nhân trên cả hai nhánh (probe
sai contract vì không có gì thật để thử), phải sinh lại probe, tốn **4 lượt gọi model · ~52k token
vào · ~6k token ra** rồi mới ra verdict PASS. Skill doc làm việc đó rẻ hơn nhiều và nói đúng thứ cần
nói về một tài liệu.

Từ giờ **mọi change đi qua OpenSpec đều trộn `.md` + `.yaml`**, nên đây không phải ca hiếm — nó là
đường đi mặc định của mọi PR quy trình về sau.

## What Changes

- Định tuyến skill dựa trên **có file THỰC THI được nào đổi hay không**, thay vì «toàn bộ có phải
  `.md` không».
- Danh sách «văn bản thuần» hẹp và **fail-closed**: chỉ `*.md`, `*.txt`, và file dưới `openspec/`.
  Bất cứ thứ gì ngoài danh sách — kể cả `checkmate.yml` ở gốc (engine ĐỌC nó) và `.github/workflows/`
  (CI thật) — đều kéo PR về pipeline code.
- Vẫn đòi có **ít nhất một `.md` đổi** mới đi đường doc, vì skill doc cần một tài liệu để đọc; PR chỉ
  đổi `openspec/*.yaml` mà không có `.md` nào thì giữ nguyên đường code.
- Ghi quyết định định tuyến ra **log lượt chấm** kèm lý do — hiện router quyết trong im lặng, người
  đọc verdict không biết vì sao PR của mình đi đường nào.

## Capabilities

### New Capabilities
- `dinh-tuyen-skill-cham`: chọn skill (code hay doc) cho một PR dựa trên loại file đã đổi, theo hướng
  fail-closed, và nói ra quyết định đó.

### Modified Capabilities
<!-- không có: đây là năng lực chưa từng được khai ở openspec/specs/ -->

## Luật R chạm tới

- **Luật R chạm tới:** CÓ — thêm file mới `specs/R13-dinh-tuyen-skill.md` với R13.1–R13.5. Hiện
  **KHÔNG luật nào** trong `specs/` khai hành vi định tuyến (đã grep toàn thư mục) — engine đang chạy
  một quyết định quan trọng mà không có hợp đồng nào ràng buộc, nên cổng cũng không có gì để đối chiếu.

## Impact

- `apps/web/src/github.ts` — `fetchVaRouter` (nơi quyết định `loai: 'code' | 'doc'`).
- `checkmate.yml` — khai hàm mới nếu tách hàm phân loại ra khỏi `fetchVaRouter`.
- Không đụng engine chấm (`packages/harness`): quyết định định tuyến nằm ở lớp web, engine chỉ nhận
  `loai` đã chốt.
- Ảnh hưởng vận hành: các PR quy trình về sau đi đường doc → rẻ hơn và bớt probe vô nghĩa; đổi lại
  chúng KHÔNG còn được chạy probe code — đúng ý, vì không có code nào để chạy.
