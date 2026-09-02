# Proposal — merge-gate: backfill luật cổng merge thành capability, có test khoá

## Why

Cổng merge là chỗ ⛔C1/⛔C2 sống thật, và **sáu điều lõi của nó (R6.6–R6.11) đang thi hành mà không có
test nào**: chúng nằm trong hai handler Express (`/api/runs/:id/merge`, `/reject`), trộn quyết định với
I/O GitHub và HTTP. Đó là đúng loại «luật thi hành mà chưa khoá» mà backfill phải trả. Đây là change đầu
trong bảng chia của `retire-r-rules` — đi trước vì cạnh ⛔C1 và ít được phủ nhất.

## What Changes

- **Tách quyết định cổng thành hàm thuần** trong `apps/web/src/gate.ts` (gọn — KHÔNG đổi hành vi, KHÔNG
  đổi một chữ thông điệp): `evaluateMergeLocal` (chế độ chỉ-đọc · run tồn tại · đã qua cổng · FAIL/high ·
  danh tính/vai · medium chưa tick), `evaluateMergeAgainstPr` (PR không còn mở · head đã đổi),
  `evaluateRejectLocal` (chế độ chỉ-đọc · run · đã qua cổng · danh tính · ghi chú trống), và
  `decideAutomation` (ba công tắc → đăng verdict / gắn trạng thái / đóng PR). Hai route và hook
  `rm.onXong` chỉ còn gọi hàm rồi làm I/O.
- **Test khoá từng scenario**, thông điệp giữ nguyên từng chữ, kể cả **độ ưu tiên** khi nhiều điều kiện
  cùng sai (FAIL đứng trước thiếu quyền; thiếu quyền đứng trước medium; mọi kiểm cục bộ đứng trước lời gọi
  GitHub).
- **Capability `merge-gate`** (5 requirement) viết từ code và test; thân requirement ghi mã gốc để thư viện
  probe tự chấm neo lại được (`R6.15`, `R6.19` — 2/25 vế).
- **Án lệ R6.24b** («cột người = AI ĐÃ THỰC HIỆN», ba vòng đề nghị sai) vào «Vì sao» của
  `doi-soat-cong › Đối soát idempotent và không bịa` — điều duy nhất chạm capability khác.
- **Bảng tra**: R6 · R6.6–R6.12 · R6.15–R6.18 `pending` → `housed`; R6.12 và R6.24b `precedent` → housed.
- **Kèm theo (PO chốt 02/09)**: `test/thu-vien.test.ts` hai ca I/O (dòng 61, 271) nới trần 20 s — flaky
  hai lần trong bốn lượt chạy toàn lưới, chạy riêng luôn xanh.
- Ứng viên kho khuôn (đích b, KHÔNG nạp ở đây): «khoá lạ trong file cấu hình không được thành công tắc»
  — bài học P10 ba vòng (`ba-muc-tu-dong.test.ts`), khái quát được cho mọi repo có config file.

## Bảng phân xử từng điều (giao thức D7 của `retire-r-rules`)

| mã | phân xử | cưỡng chế ở đâu | án lệ / test | bỏ thì xanh giả gì |
|---|---|---|---|---|
| R6.6 FAIL/high → khoá merge | giữ | `server.ts:898` | không test → thêm | PR FAIL merge được — chính cái cổng |
| R6.7 medium tick từng cái, máy chủ đối chiếu | giữ | `:910–913` | không test → thêm | client gửi danh sách rỗng là qua |
| R6.8 hỏi lại GitHub trạng thái PR | giữ | `:915–916` | không test → thêm | merge PR đã đóng/đã merge |
| R6.9 head đổi → verdict hết hiệu lực | giữ | `:917–919` + `mergePr(sha)` GitHub 409 | UI có (`man-run`), cổng không → thêm | đẩy code mới sau khi lấy PASS |
| R6.10 chấm lại cùng commit phải cảnh báo | **gọn** → scenario của requirement 1 | `:708–717` trang «đã có verdict», nút «Vẫn chạy lại» | không test → thêm | không xanh giả — chỉ tốn tiền; vẫn giữ vì nó là «một verdict một commit» |
| R6.11 hành động cổng vào sổ kèm người | giữ | `:926`, `:967`; người từ `getIdentity` | `so-cong` (đủ trường) | sổ không trả lời «ai đã bấm» |
| R6.12 chế độ demo không thao tác cổng/cấu hình | giữ, gọi đúng tên **chế độ chỉ-đọc** (PO 03/09) | `MODE === 'demo'` 10 chỗ; mặc định `demo` khi không đặt `CHECKMATE_MODE=org` | `doi-soat-cong-demo`, `di-tru-bo-cot-cong`; án lệ M16 | bản deploy trình bày cho người lạ bấm cổng |
| R6.15 ba công tắc riêng | giữ | `config.ts:42–46, 98` | `ba-muc-tu-dong` | bật comment là bật luôn đóng PR |
| R6.16 đăng verdict không chỉ ở chế độ trực | giữ | `rm.onXong` chạy cho MỌI lượt có PR (`server.ts:176`) | không test trực tiếp → thêm qua `decideAutomation` | lượt bấm tay không đăng verdict |
| R6.17 tự trả về chỉ khi FAIL có high | giữ | `:183` | không test trực tiếp → thêm | máy đóng PR theo suy đoán |
| R6.18 máy ghi sổ bằng danh tính máy | giữ | `MACHINE_ACTOR_NAME` `:209` | `so-cong` | sổ mượn tên người cho việc máy làm |
| R6.19 máy không bao giờ merge | giữ ở ⛔C1; requirement 4 nhắc mã | `config.ts:143,169,198` lọc khoá lạ | `ba-muc-tu-dong` P10 | — |

Ba câu hỏi bắt buộc đã trả lời cho mọi điều: có cưỡng chế (12/12); có án lệ (R6.12, R6.19, R6.24b); bỏ thì
xanh giả (cột cuối). Không điều nào `bỏ`; một điều `gọn` (R6.10).

## Capabilities

### New Capabilities

- `merge-gate`: quyết định cổng merge/trả về dev, xác nhận medium, sổ hành động cổng, tự động ở cổng, chế
  độ chỉ-đọc.

### Modified Capabilities

- `doi-soat-cong`: requirement «Đối soát idempotent và không bịa» thêm đoạn «Vì sao» (án lệ R6.24b) — không
  đổi scenario.

## Luật chạm tới

- **Luật chạm tới:** `merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở` ·
  `merge-gate › Cảnh báo medium phải được xác nhận từng cái, máy chủ đối chiếu tập id` ·
  `merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm với danh tính phiên và danh sách cảnh báo đã chấp nhận` ·
  `merge-gate › Tự động ở cổng: ba công tắc riêng, máy chỉ được nói KHÔNG` ·
  `merge-gate › Chế độ chỉ-đọc không cho thao tác cổng và không cho sửa cấu hình` (ADDED) ·
  `doi-soat-cong › Đối soát idempotent và không bịa` (MODIFIED, chỉ «Vì sao») · ⛔C1 (nêu, không đổi) ·
  hàng bảng tra: R6 · R6.6–R6.12 · R6.15–R6.18 · R6.24b → `housed`.

## Impact

- `apps/web/src/gate.ts` (bốn hàm thuần mới, export) · `apps/web/src/server.ts` (hai route + `rm.onXong`
  gọi hàm; thông điệp không đổi) · `checkmate.yml` bảng module (`gate.js` thêm bốn tên — ⛔C5).
- `test/merge-gate.test.ts` (mới) · `test/thu-vien.test.ts` (hai trần).
- `docs/r-rules-map.md` (13 hàng) · `openspec/specs/doi-soat-cong` (qua archive).
- Không chạm harness, không chạm kiểu dùng chung.
