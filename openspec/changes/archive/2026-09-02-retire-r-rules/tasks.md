# Tasks — retire-r-rules (umbrella)

Một PR, thứ tự theo D2: kiểm kê → bảng tra → dời R → viết lại con trỏ → lưới → router. Change này
KHÔNG viết spec cho capability nào và KHÔNG quyết bỏ/đổi điều R nào — đó là việc của 12 change backfill.

## 1. Luật — dời `specs/R*.md` (ô «Luật R chạm tới» = CÓ)

- [x] 1.1 Kiểm kê 227 điều thành `docs/r-rules-map.md` theo khuôn D4 (`code · title · bucket · home ·
      evidence`): mọi mã trong 13 file có hàng; rổ theo D3; điều mang cả luật lẫn án lệ có HAI hàng;
      `pending` trỏ đúng tên change trong bảng chia của proposal; `housed` trỏ requirement có thật;
      `evidence` trỏ test/code/capability. Umbrella KHÔNG ghi `dropped`.
- [x] 1.2 Trình PO **danh sách điều không chắc rổ** (< 10 dòng, không phải cả bảng); PO xếp; cập nhật
      bảng. Đây là cổng duyệt duy nhất của umbrella (D5). — PO chốt 02/09: giữ nguyên cả 9 đề xuất
      (R12.1 · R13.5 · R13.7 · R1.21 · R1.22 housed như ghi; R8.4–R8.9 và R9.15 → `probe-library`;
      R3.12–R3.14 → `provider-gate`; R1.12–R1.13 → `verdict-contract`).
- [x] 1.3 `git mv specs/R*.md docs/archive/r-rules/` (13 file, giữ nguyên tên) + banner đầu file theo D8;
      không sửa dòng nào khác — kiểm bằng máy: bỏ banner thì khớp byte với bản cũ.
- [x] 1.4 `checkmate.yml`: `sources.specs` bỏ `specs/*.md`; chú thích dòng 1 («xem specs/R2») và mục
      `review` («xem specs/R7») → trỏ bảng tra.

## 2. Con trỏ & cấu hình quy trình

- [x] 2.1 `AGENTS.md`: dòng 3–4 («luật đầy đủ ở specs/R1..R12») → `openspec/specs/` + bảng tra; sáu ⛔C
      bỏ ngoặc mã R (thay bằng `capability › requirement` khi đã `housed`, còn lại bỏ ngoặc); mục
      «⛔ Chỗ sống của luật» gỡ đoạn về `specs/R*.md` và lưu ý kỹ thuật `target.ts` (đã hết hiệu lực
      sau PR #32); dòng 158 (R10.13). Rồi `cp AGENTS.md CLAUDE.md` — lưới `test/huong-dan-harness.test.ts`.
- [x] 2.2 `openspec/config.yaml`: dòng 19–20 (context) và dòng 41 (rule tasks «PHẢI viết luật vào
      specs/R*.md») → luật sống ở capability + bảng tra.
- [x] 2.3 `openspec/schemas/checkmate/schema.yaml` + `templates/proposal.md` + `templates/tasks.md`: ô
      «Luật R chạm tới» → «Luật chạm tới» (trả lời bằng `capability › requirement` · ⛔C · hàng bảng
      tra); mục «## 1. Luật (specs/R*.md)» của template tasks → «## 1. Luật (capability)»; gỡ mọi câu
      «engine đọc thư mục specs/». `checkmate-fix-bug` không có ô này (soi 02/09) — không sửa.
- [x] 2.4 `README.md:48` («specs/ (R1–R7…)») và `apps/web/src/ui-docs.ts:295` («vài file markdown trong
      `specs/`») → nguồn spec do repo khai.
- [x] 2.5 `DEPLOY.md`: KHÔNG sửa (PO chốt 02/09 — bảng tra giải quyết); chỉ kiểm bốn mã R6.15 · R4.28 ·
      R8.12 · R4.6 có hàng.

## 3. Web — router hỏi nguồn spec (D6)

- [x] 3.1 `apps/web/src/github.ts` `classifyPr`: nhận thêm tham số **mẫu nguồn spec** (tuỳ chọn; vắng
      hoặc không phải mảng → `SPEC_CANDIDATES` của `packages/harness/src/sources.ts`); file khớp
      `matchPattern` → KHÔNG phải văn bản thuần → code; `lyDo` nêu file và mẫu khớp. Gỡ hai chỗ gắn cứng
      `specs/` (`laVanBan` và bộ lọc `md`). Bốn scenario cũ giữ nguyên hành vi.
- [x] 3.2 `fetchAndRoute` đọc `readSourcesCfg(<đường clone>)` và truyền `sources.specs` vào 3.1; cấu hình
      hỏng/không có → mặc định + log «không đọc được cấu hình nguồn — lệch về phía code».
- [x] 3.3 Lưới `kien-truc-tang` ĐỎ khi web import harness: app không được import engine (web và engine chỉ
      nói chuyện qua tiến trình CLI — bản đầu của task này giả định sai). Xử lý: dời phần dùng chung của hợp
      đồng nguồn spec (kiểu · ứng viên · glob/`matchPattern` · `readSourcesCfg` · `loiCuPhapAnToan`) xuống
      tầng nền `packages/shared/src/spec-source.ts`; `sources.ts`/`runner.ts` re-export; bảng module thêm
      dòng. Không nới lưới, không nhân đôi glob.

## 4. Kiểu & hợp đồng

- [x] 4.1 Không thêm kiểu dùng chung. Nếu 3.1 tách hàm mới có export ở `github.ts` → khai vào bảng module
      `checkmate.yml` (lưới `test/hop-dong-repo.test.ts`).

## 5. Test

- [x] 5.1 `test/r-rules-map.test.ts` (D4): quét mọi file text git theo dõi (trừ `docs/archive/r-rules/**`,
      `openspec/changes/archive/**`, chính bảng tra) lấy mã `R\d{1,2}(\.\d{1,2}[a-z]?)?`; mỗi mã có hàng;
      ngoại lệ liệt kê tường minh từng chỗ (ví dụ `openspec/specs/spec-source/spec.md` dùng `R4.21` làm
      ví dụ); `pending` → tên change trong bảng chia; `housed` → parse `openspec/specs/<cap>/spec.md`
      và so tiêu đề requirement. Thông điệp đỏ nêu `file:line` của mã mồ côi.
- [x] 5.2 `test/dinh-tuyen-skill.test.ts`: bốn scenario mới của requirement «Định tuyến theo file thực
      thi được, fail-closed» + ca tái lập lỗi hiện nay (PR chỉ sửa `openspec/specs/**` đang đi doc).
- [x] 5.3 `test/no-internal-refs.test.ts` mở rộng sang `apps/web/src`: không chuỗi `specs/R`; chuỗi
      `'specs/'` gắn cứng chỉ được phép ở `sources.ts` (danh sách ứng viên tự dò).
- [x] 5.4 Đo và ghi (không phải lưới): thư viện `probes-lib/checkmate` sau khi dời — bao nhiêu vế
      `spec_rule` mất neo tạm cho tới khi backfill (kỳ vọng: phần lớn trong 25 vế, vì nguồn chỉ còn
      `openspec/specs/**`). Ghi số vào thân PR; các change backfill có nghĩa vụ trả lại neo (D7, Risks).
      ĐO 02/09: 25/25 vế mất neo tạm — 15 mã: R1.2 · R1.4–R1.7 · R1.17 · R1.18 · R1.20 · R3.15 · R4.18 ·
      R4.27 · R6.15 · R6.19 · R9.6 · R9.14; nguồn tự chấm nay 8 file · 47 đơn vị (chỉ openspec/specs).
- [x] 5.5 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.

## 6. Kiểm cơ học

- [x] 6.1 `npx openspec validate --changes` xanh; tự chấm đọc nguồn ra ~42 đơn vị (chỉ `openspec/specs/**`).
- [x] 6.2 `grep -rn "specs/R" .` ngoài `docs/archive/r-rules/`, `docs/r-rules-map.md`,
      `openspec/changes/archive/` → 0 dòng TRONG CHUỖI (lưới no-internal-refs cho harness + web); chú thích
      trỏ mã R giữ nguyên theo PO, tra được qua bảng — đã đo: chỉ còn chú thích và câu «đã gỡ» ở AGENTS.md.
- [x] 6.3 Lưới 5.1 xanh trên chính `main` sau merge — không con trỏ mồ côi ở ngày đầu. (Đã chạy toàn lưới trên main sau merge PR #33 — xanh, 02/09; lần đầu đỏ vì chính
      test-cases.md T3.4 chứa mã thử — sửa lời, không sửa lưới.)
