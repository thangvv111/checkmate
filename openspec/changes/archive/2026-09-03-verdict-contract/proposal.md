# Proposal — verdict-contract: backfill hợp đồng của verdict, có test khoá

## Why

Verdict là thứ duy nhất mở được nút merge, và **chín điều định nghĩa nó không có ca test nào**. Đo 03/09:
R6.1–R6.5, R6.13, R6.14, R1.12, R1.13 đều đang thi hành, không điều nào có test khoá trực tiếp.

Nguy hiểm nhất là **R1.12 («có hồi quy thì PHẢI FAIL») không được cưỡng chế ở chỗ ai cũng tưởng**:
`cli.ts:180` chỉ nhìn finding mức `high`. Cái thật sự giữ luật là **hai lưới máy** trong `skill-code.ts` —
ép severity của hồi quy máy-xác-nhận về `high` (`:818`), và tự bổ sung finding khi model im lặng (`:836`).
Bỏ một trong hai, model gán `medium` cho một hồi quy là verdict ra PASS: xanh giả đúng loại sản phẩm này
sinh ra để chống. Hai lưới đó hôm nay không có ca test.

Đây là change thứ hai trong bảng chia của `retire-r-rules`, dùng lại khuôn của `merge-gate`.

## What Changes

- **`packages/harness/src/verdict.ts` (mới)** — bốn hàm thuần, chép nguyên logic đang chạy, KHÔNG đổi
  hành vi: `decideResult(findings)` (R6.1, R6.3) · `regressionFloor(trangThai, sevModel)` (sàn cứng của
  R1.12) · `missingRegressionFindings(ungVien, maDaCo)` (bù finding model bỏ sót) · `hasBasis(ungVien)`
  (R6.13). File mới thay vì nhét vào `skill-code.ts` (đã hơn 1000 dòng) — PO chốt 03/09.
- **`cli.ts` và `skill-code.ts` gọi bốn hàm đó**; thông điệp lỗi và log giữ nguyên từng chữ.
- **`test/verdict-contract.test.ts` (mới)** — mỗi scenario một ca, kể cả hai lưới máy (dựng ứng viên giả
  — PO chốt 03/09 là có, vì đó là chỗ R1.12 thật sự sống).
- **Capability `verdict-contract`** 4 requirement; thân ghi mã gốc để probe thư viện neo lại.
- **Bảng tra**: R6.1–R6.5 · R6.13 · R6.14 · R1.12 · R1.13 `pending` → `housed` (cập nhật ở commit archive).

## Bảng phân xử từng điều

| mã | phân xử | cưỡng chế ở đâu | test | bỏ thì xanh giả gì |
|---|---|---|---|---|
| R6.1 hai giá trị PASS/FAIL | giữ | kiểu `Verdict.result`; `cli.ts:180` | không → thêm | «PASS có điều kiện» thành chỗ lách |
| R6.2 ghim `sha_or_hash` | giữ | `cli.ts:179` (code: `branchSha`; doc: hash nội dung) | không → thêm | verdict không thuộc commit nào, cổng không so được head |
| R6.3 high → FAIL | giữ | `cli.ts:180` qua `chuanMuc` | không → thêm | finding chặn mà verdict xanh |
| R6.4 kèm `probe_stats` | giữ | `cli.ts:182` | không → thêm | PASS không nói được nói trên cơ sở nào |
| R6.5 kế hoạch vs ghi nhận tách bạch | **gộp** vào requirement 1 (dữ liệu); phần BÀY RA đã ở `man-run` | `probe_stats.ke_hoach`/`ghi_nhan` | mặt UI có → thêm mặt dữ liệu | PASS với 0 probe chạy trông như PASS thường |
| R6.13 ≥1 pass/hồi quy/cải thiện mới đủ cơ sở | giữ | `skill-code.ts:742–752` (ném ở lần sinh 2) | không → thêm | cả bộ probe hỏng bị dán `ngoai_pham_vi` → PASS rỗng |
| R6.14 sinh lại một lần trước khi bỏ cuộc | giữ | `skill-code.ts:756–770` | không → thêm | bỏ cuộc sớm, hoặc lặp vô hạn |
| R1.12 hồi quy → FAIL | giữ, **nói đúng chỗ cưỡng chế** | `skill-code.ts:818` ép sàn + `:836` bù finding | không → thêm | model gán medium cho hồi quy là PASS |
| R1.13 nghi vấn nêu trong verdict | **gộp** vào requirement 1 | `probe_stats.nghi_van` | mặt UI có | vùng chưa kết luận biến mất khỏi verdict |

Ba câu hỏi bắt buộc: có cưỡng chế (9/9) · có án lệ (R6.13 «trạng thái hút», R1.12 hai lưới) · bỏ thì xanh
giả gì (cột cuối). Không điều nào `bỏ`; hai điều `gộp` (R6.5, R1.13).

## Capabilities

### New Capabilities

- `verdict-contract`: verdict nhị phân, ghim commit, kèm thống kê probe; sàn cứng cho hồi quy; PASS phải
  có bằng chứng.

### Modified Capabilities

Không có. (`man-run › Verdict phải khai cả phần yếu của chính lượt chấm` giữ nguyên phần BÀY RA; capability
này nói phần DỮ LIỆU phải có mặt.)

## Luật chạm tới

- **Luật chạm tới:** `verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ` ·
  `verdict-contract › Hồi quy máy-xác-nhận có sàn cứng high, model không hạ được` ·
  `verdict-contract › PASS phải có bằng chứng: không có probe nào chứng minh được gì thì KHÔNG ra verdict` ·
  `verdict-contract › Trước khi bỏ cuộc phải sinh lại probe một lần, kèm nguyên nhân thật` (ADDED) ·
  ⛔C2 (nêu, không đổi) · hàng bảng tra: R6.1–R6.5 · R6.13 · R6.14 · R1.12 · R1.13 → `housed`.

## Impact

- `packages/harness/src/verdict.ts` (mới) · `packages/harness/src/cli.ts` (`result`) ·
  `packages/harness/src/skill-code.ts` (hai lưới máy + khối `hasBasis`) · `checkmate.yml` bảng module (⛔C5).
- `test/verdict-contract.test.ts` (mới) · `docs/r-rules-map.md` (9 hàng, ở commit archive).
- Không chạm `apps/web`, không chạm kiểu dùng chung.
