# Security — retire-r-rules (umbrella)

Change này dời tài liệu, viết lại con trỏ, thêm một bảng tra và một lưới, và đổi MỘT quyết định của
router (`classifyPr` hỏi nguồn spec). Rủi ro thật nằm ở router — mọi mục khác N/A có lý do.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Giá trị mới duy nhất đi qua bề mặt log là **mẫu glob** và **tên file** từ `checkmate.yml` của
  repo đích — không phải bí mật. Lỗi cú pháp `checkmate.yml` chỉ in dòng đầu thông điệp parser qua
  `loiCuPhapAnToan` (`packages/harness/src/runner.ts:54-57`), dùng bởi `readSourcesCfg`
  (`packages/harness/src/runner.ts:103-131`); router nhận `SourcesCfg` đã chuẩn hoá, không nhận nội dung file.
- N/A S1.2 Change không ghi gì lên comment PR hay thân commit merge; `lyDo` của router vào log lượt chấm
  (bề mặt nội bộ) và chỉ chứa tên file + mẫu.
- N/A S1.3 Không có bản che nào mới.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đường nào mới đọc danh tính; `classifyPr` là hàm thuần trên danh sách tên file.
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG. Change không chạm `gate.ts`, `identity.ts`; cơ chế «máy không bao giờ merge» vẫn là
  `canOperateGate`/`requireGateRole` (`apps/web/src/identity.ts:208-213`) và vai `tu_dong` không nằm
  trong tập được cổng (`apps/web/src/identity.ts:229`). Bảng tra ghi R6.19 → `CLAUDE.md` ⛔C1 (`invariant`)
  và lưới `test/r-rules-map.test.ts` đòi hàng đó tồn tại — dời R không làm luật này mất nhà.
- N/A S3.2 Ba mức tự động không đụng.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Mẫu nguồn từ `checkmate.yml` của repo đích là DỮ LIỆU và chỉ được đem **so tên file**:
  `matchPattern` (`packages/harness/src/sources.ts:162-176`) → `globToRegExp`
  (`packages/harness/src/sources.ts:128-154`) escape mọi ký tự regex (`escapeRe`, `:119-121`) và chỉ
  phát `[^/]*` · `.*` · `(?:.*/)?` · `[^/]` — không lồng định lượng nên không có ReDoS; đầu vào so là
  đường file ngắn. Mẫu độc nhất có thể (`**`) chỉ làm router CHẶT hơn (mọi PR về code) — chiều an toàn
  (T3.2). Mẫu không vào prompt.
- N/A S4.2 Không gọi model.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích hay probe ở chỗ mới; `readSourcesCfg` chỉ parse YAML.
- N/A S5.2 Không tạo worktree/thư mục tạm.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 File mới trên đĩa chỉ là nguồn trong repo (`docs/r-rules-map.md`, `docs/archive/r-rules/*.md`) —
  nội dung công khai sẵn (đã nằm trong `specs/`), không bí mật. Deploy đi đường tar chỉ-source
  (`DEPLOY.md` bốn bước), không đụng tài sản prod.
- N/A S6.2 Không ghi file lúc chạy.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Mọi nhánh không chắc của router dẫn về **code**: phần tử không phải chuỗi → không phải văn bản
  (`apps/web/src/github.ts:297`); cụm vào không phải mảng → code (`:289-291`); mẫu nguồn vắng/không phải
  mảng → danh sách mặc định `SPEC_CANDIDATES` (task 3.1, ca T1.4/T1.6/T3.1); `checkmate.yml` hỏng →
  mặc định + log (T2.3). Không nhánh nào biến «không đọc được cấu hình» thành «mọi thứ là tài liệu».
- N/A S7.2 Không chạm phân loại probe hay verdict.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu duy nhất kẻ xấu có được từ change này: **làm một PR có luật/code đi đường doc để không probe
nào chạy** (xanh giả). Mọi đường tới đó:

- ✅ S8.1 (a) PR sửa `checkmate.yml` để thu hẹp `sources.specs` → PR đụng `checkmate.yml` đã bị kéo về
  code trước khi mẫu được dùng (`apps/web/src/github.ts:301-303`, scenario «file cấu hình mà ENGINE đọc»);
  (b) mẫu router đọc từ `checkmate.yml` **trên đĩa của bản clone** (`fetchAndRoute`, đọc tại `lp` —
  `apps/web/src/github.ts:393`), KHÔNG từ nhánh PR — PR không đổi được đầu vào của router bằng nội dung
  của chính nó; (c) PR giấu code trong `.md` ngoài nguồn spec → đi doc: rủi ro **có sẵn** của allowlist
  R13, change này không mở rộng nó (vẫn chỉ `.md`/`.txt`/`openspec/` không thuộc nguồn) — ghi nhận,
  không dismiss; (d) `openspec/specs/**` của repo này: TRƯỚC change đi doc (lỗ đang mở), SAU change về
  code (T3.3).
- ⚠️ S8.2 Test load-bearing hai chiều cho (d): T3.3 phải đỏ trên router hôm nay và xanh sau fix; kèm biến
  thể no-op phép khớp nguồn → đỏ lại. Task 5.2 — chưa có cho tới khi apply.
- ✅ S8.3 Đối xứng: đường doc (`md` lọc ở `apps/web/src/github.ts:353`) và đường phân loại (`laVanBan`,
  `:303`) cùng gắn cứng `specs/` — task 3.1 gỡ CẢ HAI cùng một mẫu nguồn; T1.3 và T1.7 canh hai phía
  (file ngoài nguồn vẫn doc; file trong nguồn dù đuôi lạ vẫn code).

## Notes

- **Mất neo tạm thời của thư viện tự chấm** (16 probe `probes-lib/checkmate` neo mã R): không phải rủi ro
  an toàn — cổng tự chấm đang tạm dừng (PO 01/09) — nhưng là số phải nói ra (task 5.4), và các change
  backfill có nghĩa vụ trả lại neo bằng cách ghi mã gốc trong thân requirement (design › Risks).
- **Bảng tra là nơi duy nhất nói «điều này còn hiệu lực»** trong lúc chờ backfill; lưới `pending → change
  có trong bảng chia` là thứ ngăn nó thành hố quên. Change `named-debts` không nhận các mục này.
