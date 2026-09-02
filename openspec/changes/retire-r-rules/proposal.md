# Proposal — retire-r-rules: gỡ `specs/R*.md` khỏi vai trò luật, di trú có bản đồ

## Why

`specs/R*.md` (13 file · 968 dòng · ~227 điều) từng là nơi luật của CheckMate sống, và từ 01/09 chỉ còn
là «tài liệu tham khảo». Nhưng nó vẫn là thứ **duy nhất** ghi ~55% luật đang được cưỡng chế (R3, R4,
R5, R8, R10, R11, nửa R1/R2/R6/R9), vẫn được `checkmate.yml` nạp làm nguồn spec tự chấm, và **đã nói
dối** sau PR #32 (R1.19, R1.22 mô tả cơ chế mã luật không còn tồn tại). Một tài liệu tham khảo lệch code
là tham khảo sai; giữ nó là giữ hai nguồn sự thật lệch nhau.

Vì sao bây giờ: change `stop-forcing-target-repo-shape` vừa biến đường tiêu đề thành địa chỉ luật, nên
capability trong `openspec/specs/` nay đủ sức làm nơi luật sống cho cả người lẫn máy — không cần mã R.

## What Changes

- **Kiểm kê 227 điều** thành bảng tra `docs/r-rules-map.md`: mã · rổ · nhà mới · bằng chứng. Bảng là đồ
  nghề của agent và máy, KHÔNG phải văn bản để PO đọc từng hàng (PO chốt 02/09).
- **Dời** 13 file `specs/R*.md` sang `docs/archive/r-rules/` (giữ nguyên nội dung + banner «đã gỡ, xem
  bảng tra»). `specs/` không còn là nguồn spec tự chấm; `checkmate.yml` `sources.specs` chỉ còn
  `openspec/specs/**/*.md`.
- **Viết lại con trỏ**: CLAUDE.md/AGENTS.md (dòng «luật đầy đủ ở specs/R…», sáu ⛔C bỏ ngoặc mã R, mục
  «Chỗ sống của luật»), `openspec/config.yaml`, schema + template ô «Luật R chạm tới» → «Luật chạm tới»
  (trỏ capability / ⛔C / hàng bảng tra), `README.md`, `checkmate.yml`. **780 chỗ trỏ trong code, test và
  DEPLOY.md giữ nguyên** — chúng tra được qua bảng.
- **Lưới «không con trỏ mồ côi»**: test quét mọi mã `R<n>[.<m>]` trong repo, đòi từng mã có hàng trong
  bảng tra; ngoại lệ liệt kê tường minh.
- **Router định tuyến hỏi nguồn spec đã khai** thay vì gắn cứng `specs/` (`apps/web/src/github.ts`):
  sau khi dời, luật thật của repo này nằm ở `openspec/specs/**` — router hiện coi đó là văn bản quy
  trình, nên PR chỉ sửa luật sẽ bị chấm bằng rubric tài liệu. **Đổi hành vi định tuyến** — không
  BREAKING với người dùng, nhưng là đổi luật của capability `dinh-tuyen-skill-cham`.
- **Mở đường cho các change backfill**: mỗi capability một change riêng (PO chốt 02/09), theo bảng chia
  ở dưới; mỗi change tự phân xử từng điều — giữ / gọn / đổi / bỏ — có bằng chứng. Change này KHÔNG viết
  spec cho các capability đó.

## Capabilities

### New Capabilities

Không có ở change này. Các capability mới sinh ở từng change backfill (bảng chia — PO cắt/gộp được):

| change (đề xuất, tiếng Anh) | điều R | vì sao đi trước |
|---|---|---|
| `merge-gate` | R6.6–R6.12, R6.15–R6.18 | cạnh ⛔C1, chưa có nhà |
| `verdict-contract` | R6.1–R6.5, R6.13–R6.14 | cạnh ⛔C2, chưa có nhà |
| `identity-session` | R11 | cạnh ⛔C3 |
| `probe-classification` | R1.1–R1.16, R1.18 (chặn merge) | lõi phân loại; `spec-source` mới phủ R1.17/R1.19–R1.22 |
| `data-layer` | R9 (phần `kien-truc-tang` chưa phủ) | cạnh ⛔C6 |
| `probe-library` | R10 | tài sản regression |
| `target-contract` | R2 nửa CHẠY (runner, JUnit, đường dẫn) | nửa ĐỌC đã ở `spec-source` |
| `repo-history` | R4 | |
| `provider-gate` | R5 | |
| `model-reply-parsing` | R3 | nhỏ — có thể gộp |
| `diff-visibility` | R7 (phần `man-run` chưa phủ) | nhỏ — có thể gộp |
| `concurrent-runs` | R8 | nhỏ — có thể gộp |
| *(không change mới)* | R12 → `truc-phan-loai-code`, R13 → `dinh-tuyen-skill-cham`, R6.20–R6.27 → `doi-soat-cong` | chỉ kiểm dư, cập nhật bảng tra |

### Modified Capabilities

- `dinh-tuyen-skill-cham`: yêu cầu «Định tuyến theo file thực thi được, fail-closed» — file thuộc **nguồn
  spec mà engine đọc** (theo `sources.specs` repo khai, hoặc danh sách tự dò) MUST kéo PR về code, bất
  kể đuôi hay thư mục; router MUST NOT lấy thư mục cố định `specs/` làm tiêu chí.

## Luật R chạm tới

- **Luật R chạm tới:** **CÓ** — change này cố ý đụng văn bản `specs/R*.md`: **dời cả 13 file**
  (`R1-phan-loai-probe.md` · `R2-hop-dong-repo-dich.md` · `R3-boc-tra-loi-model.md` ·
  `R4-lich-su-theo-repo.md` · `R5-cong-nha-cung-cap.md` · `R6-verdict-va-cong-merge.md` ·
  `R7-tam-nhin-diff.md` · `R8-chay-song-song.md` · `R9-tang-du-lieu.md` · `R10-thu-vien-tung-probe.md` ·
  `R11-danh-tinh-va-phien.md` · `R12-kho-khuon-loi-common.md` · `R13-dinh-tuyen-skill.md`) sang
  `docs/archive/r-rules/`, chỉ thêm banner, không sửa nội dung. Không điều R nào bị đổi nghĩa ở đây;
  điều nào đổi/bỏ là việc của change backfill tương ứng, có bảng phân xử riêng. Luật của chính change
  này sống ở: `openspec/specs/dinh-tuyen-skill-cham/` (router) · `test/r-rules-map.test.ts` (lưới) ·
  `docs/r-rules-map.md` (bảng tra) · `checkmate.yml` (`sources`).

## Impact

- `specs/R*.md` (13 file) → `docs/archive/r-rules/`; `docs/r-rules-map.md` mới.
- `AGENTS.md` = `CLAUDE.md` (lưới `test/huong-dan-harness.test.ts` ép khớp từng ký tự): dòng 3–4, sáu
  ⛔C (18–29), mục «Chỗ sống của luật» (63–66), dòng 158.
- `openspec/config.yaml` (context nhắc `specs/R*`), `openspec/schemas/checkmate/schema.yaml`,
  `openspec/schemas/checkmate/templates/proposal.md` — ô «Luật R chạm tới»; soi cả schema
  `checkmate-fix-bug` nếu có ô tương tự.
- `README.md:48`, `checkmate.yml` (dòng 1, mục `sources`, chú thích `review`), `apps/web/src/ui-docs.ts:295`
  (câu «vài file markdown trong `specs/`» — sản phẩm nay không đòi thư mục đó).
- `apps/web/src/github.ts` (`classifyPr`, `laVanBan`): đọc `sources` qua `readSourcesCfg` +
  `matchPattern` của `packages/harness/src/sources.ts` — chiều phụ thuộc web → harness đã có sẵn.
- `test/r-rules-map.test.ts` (mới) · `test/no-internal-refs.test.ts` (mở rộng sang `apps/web/src` nếu
  rẻ) · test router hiện có (`test/dinh-tuyen*.test.ts` hoặc tương đương) thêm ca nguồn spec.
- Tự chấm: mẫu số độ phủ luật giảm từ 109 xuống ~42 đơn vị cho tới khi các change backfill land — cố ý
  và trung thực: mẫu số chỉ đếm luật đang hiệu lực.
