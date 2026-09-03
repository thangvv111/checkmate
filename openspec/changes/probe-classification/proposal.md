# Proposal — probe-classification: khai bảng chân trị thành capability

## Why

«Máy phân loại, người đọc kết luận» là nguyên tắc gốc của sản phẩm: probe chạy thật trên hai nhánh, **máy**
dán nhãn theo bảng chân trị, model chỉ viết lời văn dựa trên nhãn đã dán. Bảng chân trị ấy quyết định
verdict FAIL hay PASS — nhưng nó **chưa được khai thành luật**: 18 điều R1 vẫn `pending` trong bảng tra.

**Change này khác bốn change backfill trước.** `merge-gate` có sáu điều lõi không ca test nào; `verdict-contract`
có chín. Ở đây đo 03/09 cho thấy ngược lại: `test/phan-loai.test.ts` đã có **31 ca** phủ gần trọn bảng chân
trị, vân tay hai tầng và nhãn luật-mới. Việc của change là **viết spec từ test đang có**, không phải tách
hàm và thêm lưới. `classifyByMachine` đã thuần, đã export, đã khoá — KHÔNG đụng.

Đúng một chỗ hở: **R1.15** (lượt sinh lại phải được cho biết nhánh gốc không có đối chứng) sống trong chuỗi
prompt ở `skill-code.ts:767`, và điều kiện bật/tắt nó là một biểu thức ba ngôi viết ngay trong lời gọi
`promptSinhCode` — không hàm nào gọi tới được, nên không ca nào khoá được.

## What Changes

- **Capability `probe-classification`** 4 requirement, viết từ code và test đang chạy; thân ghi mã gốc để
  probe thư viện neo lại (9 vế: R1.2 · R1.4–R1.7 · R1.17 · R1.18 · R1.20).
- **Tách hàm thuần `loiSinhLaiKhongBangChung`** + ca khoá R1.15: prompt sinh lại phải nói ra khi nhánh gốc
  không chạy được probe nào, và phải nói rằng probe đỏ khi đó nhiều khả năng là probe sai giả định — còn khi
  nhánh gốc CÓ đối chứng thì KHÔNG được nói câu ấy. Cùng khuôn đã làm với `envSandbox` ở `concurrent-runs`:
  quyết định tách khỏi I/O thì mỗi nhánh là một ca.
- **R1.16 đánh `housed` sang `verdict-contract`** (PO chốt 03/09) — nó là hệ quả, cưỡng chế thật nằm ở
  `hasBasis`, đã khai ở `verdict-contract › PASS phải có bằng chứng`. Không viết lại thành luật riêng.
- **Bảng tra**: R1 · R1.1–R1.11 · R1.14 · R1.15 · R1.17 · R1.18 · R1.20 → `housed` (ở commit archive).
- KHÔNG đụng `classifyByMachine`, `errorFingerprint`, `tightFingerprint`, `looksLikeBrokenProbe`,
  `isNewRule` — chúng đã đúng và đã khoá.

### Chỗ lệch tìm được khi đối chiếu spec với code (D1)

Đối chiếu từng câu SHALL/MUST với ca test đang xanh (task 1.2) bắt được **một chỗ spec nói quá code**, và
theo D1 thì code là bản đúng — spec đã sửa lại, không lặng lẽ chép theo văn bản R:

- **R1.20 «phân biệt được ở MỌI bề mặt người đọc — verdict, log, comment PR»**: code KHÔNG làm đủ vế «mọi
  bề mặt». Dòng log tóm tắt gộp hai nhãn thành một số (`skill-code.ts:1024`
  `demTheo('hoi_quy') + demTheo('vi_pham_luat_moi')` → «N hồi quy»), và bảng từng hàng dùng **cùng mũi tên**
  `✓→✗` cho cả hai (`skill-code.ts:1029`, `ui.ts:1333`). Thứ code THẬT làm là giữ hai nhãn **riêng trong dữ
  liệu**: `thongKe.vi_pham_luat_moi` đếm riêng, `probeCompare.rows[].state` giữ nguyên nhãn, và màn hình run
  dịch nhãn thành chữ riêng «vi phạm luật PR vừa khai» (`ui.ts:1339`). Requirement viết lại đúng mức đó,
  kèm scenario mới «sổ giữ hai nhãn riêng».
- **Hai vế chưa đạt, KHÔNG khai thành luật** (ứng viên nợ có tên, chờ PO): dòng log/comment PR gộp hai nhãn;
  và chữ phân biệt ở màn run **không ca test nào khoá** — `grep 'vi phạm luật PR vừa khai' test/` trả rỗng.

## Bảng phân xử từng điều

| mã | phân xử | test hôm nay | bỏ thì xanh giả gì |
|---|---|---|---|
| R1.1 `br` vắng → `khong_chay` | giữ | ✓ | suy đoán từ nhánh gốc, kết luận về thứ chưa chạy |
| R1.2 `skipped` ≠ `pass` | giữ | ✓ | `it.skip` là đường lách lưới rẻ nhất |
| R1.3 xanh cả hai → `pass` | giữ | ✓ | — |
| R1.4 gốc đỏ, PR xanh → `cai_thien` | giữ | ✓ | PR sửa được lỗi cũ bị tính thành lỗi mới |
| R1.5 PR đỏ, gốc xanh → `hoi_quy` | giữ | ✓ | trạng thái DUY NHẤT đủ tư cách chặn merge biến mất |
| R1.6 thiếu đối chứng → `nghi_van` | giữ | ✓ | thiếu bằng chứng thành bằng chứng có tội |
| R1.7 đỏ hai nhánh cùng nguyên nhân → `ngoai_pham_vi` | giữ | ✓ | quy tội PR cho lỗi có sẵn |
| R1.8 đỏ hai nhánh khác nguyên nhân → `nghi_van` | giữ | ✓ | vứt bằng chứng thật |
| R1.9 vân tay THÔ | giữ | ✓ | hai lần chạy khác dữ liệu thành «khác nguyên nhân» |
| R1.10 vân tay CHẶT | giữ | ✓ | `expected 500` và `expected 404` bị coi là cùng nguyên nhân |
| R1.11 phải trùng CẢ HAI mới `ngoai_pham_vi` | giữ | ✓ | lỗi thật bị dán ngoài-phạm-vi rồi loại khỏi finding |
| R1.14 gốc không chạy được probe nào là ca BÌNH THƯỜNG | giữ | ✓ | PR thêm module mới bị đối xử như hỏng |
| **R1.15** lượt sinh lại phải được báo | giữ, **thêm test** | **không** | model tưởng mình import sai và sửa nhầm chỗ — mất trọn một lượt sinh |
| **R1.16** đường duy nhất là probe pass ở PR | **housed → `verdict-contract`** | (qua `hasBasis`) | — |
| R1.17 luật chỉ có ở nhánh PR: gốc không phải đối chứng hợp lệ | giữ | ✓ | ba probe đỏ bị dán `ngoai_pham_vi`, verdict PASS (án lệ đo được) |
| R1.18 nhãn `vi_pham_luat_moi` chặn merge | giữ | ✓ | PR khai luật rồi vi phạm ngay chính luật vừa khai vẫn qua cổng |
| R1.20 phân biệt `vi_pham_luat_moi` với `hoi_quy` ở mọi bề mặt | giữ | ✓ | người sửa không biết mình đang sửa cái gì |
| R1 (file) | giữ | — | — |

18 điều: 16 giữ · 1 giữ-kèm-test-mới · 1 chuyển nhà. Không điều nào bỏ.

## Capabilities

### New Capabilities

- `probe-classification`: bảng chân trị phân loại probe bằng máy, vân tay lỗi hai tầng, nhãn luật-chỉ-có-ở-
  nhánh-PR, và ca nhánh gốc không chạy được probe nào.

### Modified Capabilities

Không có. (R1.16 chỉ đổi hàng bảng tra sang `verdict-contract`, không sửa văn bản capability đó.)

## Luật chạm tới

- **Luật chạm tới:** `probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh` ·
  `probe-classification › «Cùng nguyên nhân» quyết bằng vân tay hai tầng` ·
  `probe-classification › Luật chỉ có ở nhánh PR: nhánh gốc không phải đối chứng hợp lệ` ·
  `probe-classification › Nhánh gốc không chạy được probe nào là ca bình thường, và phải nói ra`
  (ADDED) · ⛔C2 (nêu, không đổi — bảng chân trị là nơi nó sống ở tầng probe) · hàng bảng tra: R1 ·
  R1.1–R1.11 · R1.14 · R1.15 · R1.17 · R1.18 · R1.20 → `housed`; R1.16 → `housed` (verdict-contract).

## Impact

- `packages/harness/src/skill-code.ts`: tách `loiSinhLaiKhongBangChung` ra khỏi biểu thức tại chỗ gọi
  (chữ trong prompt giữ nguyên từng ký tự); `promptSinhCode` vẫn private.
- `checkmate.yml` bảng module (⛔C5) · `test/phan-loai.test.ts` (ca R1.15) · `docs/r-rules-map.md` (18 hàng).
- Không đụng `apps/web`, không đụng kiểu dùng chung, không đụng bảng chân trị.
