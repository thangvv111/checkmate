# Design — retire-r-rules

## Context

Đo 02/09 trên `main` sau PR #32:

```
specs/R*.md            13 file · 968 dong · ~54 muc ## · ~227 dieu (ma con Rn.m)
cho tro vao (ngoai specs/)   test 355 · apps/web 225 · harness 132 · schema/template 37
                             CLAUDE.md 14 · DEPLOY/README 6 · checkmate.yml 4   ~= 780
cho DOC luc chay       duy nhat: checkmate.yml sources.specs = specs/*.md (tu cham: 67/109 don vi)
```

Bản đồ phủ (R-file ↔ capability đang hiệu lực trong `openspec/specs/`):

```
DA CO NHA (du hoac gan du)   R12 -> truc-phan-loai-code · R13 -> dinh-tuyen-skill-cham
                             R6.20-R6.27 -> doi-soat-cong (1:1)
MOT PHAN                     R1 (luat moi, do phu -> spec-source; bang chan tri R1.1-R1.13 CHUA)
                             R2 (nua DOC -> spec-source; nua CHAY CHUA) · R6.9 (giao dien -> man-run)
                             R7 (vung mu -> man-run) · R9 (di tru doi ten -> kien-truc-tang)
CHUA CO NHA                  R3 · R4 · R5 · R8 · R10 · R11 · R6.1-R6.19
```

Hai sự thật đo được chi phối thiết kế:
1. **R đang nói dối**: R1.19 («so mã luật hai nhánh»), R1.22 («mẫu số là mã luật đọc được từ `specs/`»)
   sai kể từ PR #32. Tài liệu tham khảo lệch code là tham khảo sai.
2. **Án lệ đã rơi một lần**: R6.24b — «cột người trả lời AI ĐÃ THỰC HIỆN; đối soát chỉ chép lại; ranh
   giới với R11; ba vòng chấm liên tiếp đề nghị sai» — KHÔNG có trong `doi-soat-cong` dù capability đó
   được coi là phủ đủ R6.20–R6.27. Loại tri thức đắt nhất (cái ngăn tranh luận lặp) là loại dễ mất nhất
   khi «chép luật» mà không có rổ riêng cho án lệ.

Ràng buộc: luật định danh tiếng Anh (tên change, capability, file, thư mục, giá trị máy đọc); 780 chú
thích/tên test KHÔNG đổi hàng loạt (PO chốt); cổng archive — không archive change còn ô trống; mỗi
capability một change (PO chốt 02/09).

## Goals / Non-Goals

**Goals**
- Sau change này, `specs/R*.md` không còn là nguồn luật ở bất kỳ nghĩa nào: không được nạp, không được
  trỏ như «luật đầy đủ», và mỗi con trỏ cũ tra được nhà mới qua một bảng duy nhất.
- Mọi điều R có một hàng trong bảng tra, kể cả khi hàng đó nói «đang chờ backfill» — không điều nào
  biến mất im lặng.
- Router định tuyến đi theo nguồn spec repo khai, không theo thư mục cố định.
- Định nghĩa **giao thức** cho 12 change backfill, để chúng giống nhau và PO đọc được nhanh.

**Non-Goals**
- KHÔNG viết spec cho capability nào (việc của từng change backfill).
- KHÔNG sửa 780 chú thích/tên test.
- KHÔNG quyết bỏ/đổi điều R nào — bảng tra chỉ ghi `pending` kèm ứng viên; quyết ở change capability.
- KHÔNG tạo `RULES.md` chứa luật (xem D1).

## Decisions

### D1 — Luật còn hiệu lực về capability `openspec/specs/`, không về `RULES.md` (PO chốt 02/09)

| | `RULES.md` | capability backfill (chọn) |
|---|---|---|
| tên đọc được | có | có — tiêu đề requirement là câu; nhãn máy đọc dạng `gate-surface-derives-from-ledger` đã là luật CLAUDE.md |
| scenario kiểm được | không | có |
| mọc có kỷ luật | không — file tự do | có — chỉ qua change, archive mới thành luật |
| engine tự chấm đọc | phải khai thêm | đã khai; đường tiêu đề = địa chỉ probe neo được |
| nguy cơ | tái sinh R dưới áo mới | drift nếu viết từ chữ R thay vì từ code (→ D7) |

«Một file CLAUDE.md trỏ tới» vẫn tồn tại, nhưng là **bảng tra** (`docs/r-rules-map.md`), không phải nơi
chứa luật.

### D2 — Umbrella đi trước và dời R ra khỏi `specs/` ngay, không đợi backfill xong

Hôm nay không gì cưỡng chế R; thứ duy nhất đọc nó là tự chấm. Dời sớm được ba thứ: (a) mẫu số độ phủ
tự chấm chỉ còn luật đang hiệu lực (109 → ~42, tăng dần theo backfill) — trung thực hơn con số đang có;
(b) banner «đã gỡ» chấm dứt việc R nói dối; (c) mỗi change backfill chỉ sửa cột «nhà mới» của bảng tra,
không phải chạm `specs/`. Phương án đã cân nhắc — dời sau khi backfill xong — giữ hai nguồn sự thật lệch
nhau thêm nhiều tuần, và mỗi change backfill phải xoá phần của mình khỏi R (12 lần đụng cùng file).

### D3 — Sáu rổ, tiêu chí kiểm được, giá trị máy đọc bằng tiếng Anh

| rổ | tiêu chí | nhà mới |
|---|---|---|
| `invariant` | điều mà vi phạm là chặn merge vô điều kiện, không tuỳ ngữ cảnh (⛔C1–C6 hiện có) | `CLAUDE.md` ⛔C — bỏ ngoặc mã R |
| `housed` | có requirement trong `openspec/specs/<cap>/` nói cùng điều | địa chỉ `<cap> › <tiêu đề requirement>` |
| `pending` | còn được code/test cưỡng chế, chưa có requirement nào | tên change backfill (ứng viên) |
| `precedent` | «vì sao» đúc từ vòng chấm thật, ngăn tranh luận lặp (mốc: số PR, vòng, M-number) | đoạn «Vì sao thành yêu cầu» của requirement (án lệ hành vi) · `an_le` trong `trigger-examples.ts` (án lệ khuôn lỗi) |
| `minutes` | số đo prod, mốc «PO chốt ngày…», nhật ký thay đổi | chỉ archive |
| `obsolete` | mô tả cơ chế không còn tồn tại | ghi «superseded by <capability › requirement>» |

Một điều có thể mang HAI rổ (luật + án lệ đi kèm): bảng tra cho phép hai hàng cùng mã, khác rổ.
Rổ `dropped` (PO bỏ hẳn, kèm cái mất) chỉ được ghi bởi change capability, không bởi umbrella.

### D4 — Bảng tra `docs/r-rules-map.md` là nguồn duy nhất cho 780 con trỏ, có lưới

Khuôn hàng (bảng Markdown, máy parse được):

```
| code  | title                          | bucket    | home                                              | evidence                     |
| R6.19 | máy không bao giờ merge         | invariant | CLAUDE.md ⛔C1                                    | test/cong-merge.test.ts:…    |
| R6.26 | hành động cổng chỉ sống trong sổ | housed    | doi-soat-cong › Hành động cổng chỉ sống trong sổ  | —                            |
| R6.6  | verdict FAIL khoá merge          | pending   | merge-gate                                        | apps/web/src/gate.ts:…       |
| R6.24b| cột người = ai ĐÃ THỰC HIỆN      | precedent | pending: doi-soat-cong (thêm «vì sao»)            | R6-… §Đối soát               |
```

Lưới `test/r-rules-map.test.ts`:
- quét mọi file text được git theo dõi (trừ `docs/archive/r-rules/**` và chính bảng tra) lấy
  `\bR\d{1,2}(\.\d{1,2}[a-z]?)?\b`; mỗi mã phải có hàng trong bảng;
- **ngoại lệ tường minh** trong test: mã là ví dụ minh hoạ trong spec (`openspec/specs/spec-source` dùng
  `R4.21` làm ví dụ mã ngắn) — liệt kê từng chỗ, không dùng regex loại trừ rộng;
- hàng `pending` phải trỏ tới một tên change có trong bảng chia (proposal) — ngăn «pending» thành hố
  vô hạn;
- hàng `housed` phải trỏ tới một requirement CÓ THẬT: parse `openspec/specs/<cap>/spec.md` và so tiêu
  đề — đây là chỗ bắt được đúng loại mất mát của R6.24b lần sau.

### D5 — Cổng duyệt của PO: hai chỗ ngắn, không phải 227 hàng

| PO đọc | ở đâu | dài | quyết gì |
|---|---|---|---|
| bảng chia capability + điều agent không chắc rổ | proposal/`digest` của umbrella | ~20 dòng | ranh giới; xếp rổ |
| bảng phân xử từng điều: giữ / gọn / đổi / bỏ + bằng chứng | proposal của **mỗi** change capability | 10–30 dòng | BỎ điều nào (mất gì) · ĐỔI điều nào |

Mọi việc khác đảo ngược được và máy kiểm được → không qua tay PO. Đúng khuôn: rẻ + đảo được → làm;
đắt + một chiều → cổng.

### D6 — Router hỏi nguồn spec, fail-closed khi không hỏi được

`classifyPr` (`apps/web/src/github.ts`) hiện có hai chỗ gắn cứng `specs/` (dòng ~303 và ~353). Thay bằng:
- đọc `readSourcesCfg(repoPath)`; nếu khai `sources.specs` → mẫu khai; nếu không → `SPEC_CANDIDATES`
  (rộng hơn tập «đang dùng» một chút — cố ý, vì lệch về phía code là lệch an toàn);
- **Phát hiện lúc apply (sửa D6):** lưới `kien-truc-tang` cấm app import engine — web và engine chỉ nói
  chuyện qua tiến trình CLI, web KHÔNG có import tĩnh nào từ harness (giả định «đã có sẵn» của bản đầu
  sai). Phần dùng chung của hợp đồng nguồn spec — kiểu · danh sách ứng viên · glob/`matchPattern` ·
  `readSourcesCfg` · `loiCuPhapAnToan` — dời xuống tầng nền `packages/shared/src/spec-source.ts`;
  `sources.ts`/`runner.ts` re-export để bảng module và chỗ gọi cũ không đổi. Một định nghĩa cho cả router
  lẫn engine — không nới lưới, không nhân đôi glob (khuôn «cửa song sinh»);
- file khớp bất kỳ mẫu nào (`matchPattern`) là **luật engine đọc** → không phải văn bản thuần → PR về
  code; log nêu file và mẫu khớp;
- `checkmate.yml` hỏng/không đọc được → giữ hành vi cũ (allowlist hẹp) VÀ coi mọi file khớp
  `SPEC_CANDIDATES` là luật; log nói rõ không đọc được cấu hình. Không có đường nào làm router rộng tay hơn
  hôm nay.
- `openspec/` vẫn là văn bản thuần **trừ** phần khớp nguồn spec (với repo này: `openspec/specs/**/*.md`);
  `openspec/changes/**` vẫn là tài liệu → đường doc không đổi cho proposal/design.

Phương án đã cân nhắc — chạy đủ `readSources` (dò thật, chỉ tập «đang dùng»): đúng hơn nhưng router
đứng đầu pipeline, chưa có cây git nhánh PR tại đó; giá trị thêm nhỏ, chi phí và mặt lỗi lớn hơn.

### D7 — Giao thức chung cho 12 change backfill

1. proposal có **bảng phân xử**: mỗi điều một hàng — giữ nguyên · gọn (gộp điều trùng) · đổi (kèm hành
   vi mới) · bỏ (kèm cái mất) — và ba câu hỏi bắt buộc trả lời: có test/code cưỡng chế? có án lệ từng
   bắt lỗi thật? bỏ thì cái gì xanh giả? Điều không có cả cưỡng chế lẫn án lệ → ứng viên bỏ hoặc thêm
   test, không có «giữ vì tiếc».
2. spec viết **từ code và test**, R chỉ là gợi ý — mỗi requirement trỏ test khoá nó (thiếu thì change
   phải thêm test, đó là task).
3. án lệ đi kèm requirement dưới dạng đoạn «Vì sao thành yêu cầu» (khuôn `man-run`), không bỏ.
4. `đổi` bất kỳ → design bắt buộc đào sâu; `bỏ` bất kỳ → hàng `dropped` trong bảng tra kèm cái mất.
5. change cập nhật bảng tra: `pending` → `housed`/`precedent`/`obsolete`/`dropped`; lưới D4 xanh mới
   được archive.
6. thứ tự theo rủi ro (bảng chia): cái cạnh ⛔C và ít được phủ nhất đi trước.

### D8 — Đường archive và tên

`docs/archive/r-rules/<tên file gốc>` — giữ nguyên tên file gốc (định danh cũ, không đổi), thư mục mới
tiếng Anh. Banner đầu file: «Đã gỡ khỏi vai trò luật ngày 2026-09-…; tra nhà mới ở `docs/r-rules-map.md`;
nội dung dưới đây KHÔNG còn được cập nhật». Không sửa gì khác trong file.

## Architecture

- `apps/web/src/github.ts` — router `classifyPr`/`laVanBan` (D6); import `readSourcesCfg`, `matchPattern`,
  `SPEC_CANDIDATES` từ **`packages/shared/src/spec-source.ts`** (tầng nền — app không được import engine).
- `apps/web/src/ui-docs.ts` — một câu mô tả sản phẩm; `apps/web/src/cli-tai-khoan.ts` — một chuỗi trợ giúp
  trỏ `specs/R11.19` (bề mặt người vận hành, không phải chú thích).
- `packages/harness/src` — `sources.ts`/`runner.ts` re-export phần đã dời xuống tầng nền; hành vi không đổi.
- `packages/shared/src/spec-source.ts` — MỚI: hợp đồng nguồn spec dùng chung (kiểu, ứng viên, glob, cửa đọc).
- Tài liệu/cấu hình: `docs/`, `AGENTS.md`=`CLAUDE.md`, `openspec/config.yaml`, schema + template,
  `README.md`, `checkmate.yml`.
- Lưới: `test/r-rules-map.test.ts` (mới), test router (thêm ca), `test/huong-dan-harness.test.ts` (bắt
  CLAUDE.md ≡ AGENTS.md — sửa AGENTS rồi `cp`).

## Data Model

N/A cho SQLite và dữ liệu prod (sổ cái, `probes-lib/`, `web-runs/`, `runs/`, `config.json`,
`.secrets.json`, `.ncc-verify.json`) — change này không chạm. Hai chỗ có hình dạng dữ liệu mới nhưng đều
là file nguồn trong repo:
- `docs/r-rules-map.md`: bảng Markdown, cột `code · title · bucket · home · evidence`; ghi bởi agent
  trong change; đọc bởi lưới D4 và người; dọn khi mọi hàng hết `pending` (thời điểm đó bảng thành lịch
  sử, vẫn giữ).
- `checkmate.yml` `sources.specs`: bỏ `specs/*.md` — đầu vào tự chấm đổi, không phải dữ liệu.
Deploy đi đường tar chỉ-source nên việc dời `specs/` không đụng tài sản trên máy chủ; `probes-lib/`
của chính repo có probe neo `spec_rule: "R1"…` — vẫn tra được vì `resolveRule` khớp mã trong
`codes` của đơn vị nếu backfill giữ mã cũ trong thân requirement (xem Risks).

## Risks / Trade-offs

- [Backfill từ chữ R lỗi thời thành luật hiệu lực] → D7.2: spec viết từ code/test, mỗi requirement trỏ
  test khoá; R1.19/R1.22 là ví dụ đã biết.
- [Án lệ rơi tiếp như R6.24b] → rổ `precedent` bắt buộc; lưới D4 đòi `housed` trỏ requirement có thật;
  change capability phải liệt kê án lệ mang theo.
- [Thư viện probe tự chấm mất neo: 16 probe neo `R1`, `R6.15`, `R9.14`…] → mỗi requirement backfill
  ghi mã R gốc trong thân (ví dụ dòng «*(gốc: R6.15)*») để `codes` của đơn vị chứa mã và `resolveRule`
  vẫn khớp; lưới `test/sources.test.ts` kiểu «thư viện không mất neo» chạy lại ở từng change.
- [Mẫu số độ phủ tự chấm tụt 109 → ~42 nhiều tuần] → cố ý (D2); cổng tự chấm đang tạm dừng theo PO
  01/09, số tụt là số thật.
- [Router đổi hành vi, kéo nhầm PR tài liệu về code] → chỉ lệch về phía code (an toàn); ca test cho
  cả bốn nhánh D6; log nêu mẫu khớp để người đọc thấy vì sao.
- [12 change gây mệt review] → thứ tự theo rủi ro; ba change cuối nhỏ, PO gộp được; giao thức D7
  làm proposal giống nhau nên đọc nhanh.
- [Bảng tra thành hố `pending` vĩnh viễn] → lưới D4 đòi `pending` trỏ change có trong bảng chia; change
  `named-debts` KHÔNG nhận các mục này — chúng có change riêng.

## Migration Plan

- `git mv specs/R*.md docs/archive/r-rules/` + banner; sửa `checkmate.yml`; viết lại con trỏ; bảng tra;
  lưới; router — một PR. Đường lùi: revert PR (không có dữ liệu di trú).
- Sau merge: `probes-lib/checkmate/` không cần đổi (xem Risks); `web-runs/` không đụng.
- Thứ tự sau đó: 12 change backfill theo bảng chia; mỗi change land thì bảng tra bớt `pending`.

## Open Questions

Đã chốt (PO 02/09):
- Bảng chia: `model-reply-parsing` · `diff-visibility` · `concurrent-runs` **để riêng**, mỗi cái một change.
- `DEPLOY.md` trích R6.15, R4.28, R8.12, R4.6 — **để bảng tra giải quyết**, không viết lại.
- Vị trí bảng tra: **`docs/r-rules-map.md`**.

Còn treo:
- Schema `checkmate-fix-bug` có ô «Luật R chạm tới» không — soi lúc apply; có thì sửa cùng.
