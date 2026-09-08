## Why

PR #91 — một bản vá **một dòng** — nhận thông điệp:

> `Độ phủ luật: 1/195 đơn vị luật đọc được từ spec có probe neo vào`

Đọc tự nhiên nhất của câu ấy là **«phủ 0,5%, tệ quá»**, và đọc ấy **sai**. Mẫu số là **toàn bộ kho luật
của repo**; tử số là phần mà **diff này** chạm tới. Không có lý do gì để một bản vá một dòng neo vào 195
đơn vị luật — 1 là con số **đúng**.

Tệ hơn, tỉ lệ ấy tạo một **khuyến khích ngược**, đo được trên hai repo trong cùng một ngày:

| repo | đơn vị luật | một lượt neo | tỉ lệ hiện ra |
|---|---|---|---|
| `checkmate` | **195** | 1 | 1/195 = **0,5%** |
| `demo-credit-approval` | **9** | 3 | 3/9 = **33%** |

⇒ **Repo viết ÍT luật hơn thì điểm cao hơn.** Một con số thưởng cho việc viết ít luật lại nằm trong một
công cụ tồn tại để bắt người ta viết luật rõ hơn.

## What Changes

- **Số đơn vị luật có probe neo khai như SỐ ĐẾM**, không phải tỉ lệ. Không bề mặt nào được ghép nó với
  tổng số đơn vị thành `x/y`.
- **Bề mặt nào bày cả hai số phải nói rõ** tổng số **không phải mẫu số của độ phủ**.
- **Khai TÊN các đơn vị đã neo**, không chỉ số lượng — tên nói được điều một con số không nói.
- **Cả bốn bề mặt** đổi cùng lúc: `spec-units.ts` (nguồn số) · `skill-code.ts` (log) · `cli.ts` (dòng tóm
  tắt) · `ui.ts` (bảng số liệu). Vá một chỗ mà quên ba chỗ kia là dựng lại đúng **cửa song sinh**.
- **Hình dạng dữ liệu KHÔNG đổi**: `luat_da_phu` và `luat_tong` giữ nguyên trên verdict, nên bản ghi đời
  cũ vẫn đọc được và không cần đường di trú.
- Vế **«không đo được» ≠ `0`** giữ nguyên — đó vẫn là phân biệt đúng.

**Cố ý KHÔNG làm — thu hẹp mẫu số về «luật mà diff chạm tới».** Engine **không biết** diff chạm luật nào.
Thứ duy nhất nó có là mã luật do model khai trên từng probe — mà đó chính là **tử số**. Dựng mẫu số từ tử
số là vòng tròn. Khi không có mẫu số thật thì câu trả lời đúng là **đừng bày tỉ lệ**, không phải bịa một
mẫu số trông hợp lý.

## Capabilities

### Modified Capabilities

- `man-run`: số luật đã neo khai dạng **số đếm** kèm **tên đơn vị**, và cấm dạng tỉ lệ.

## Luật chạm tới

- `man-run › Verdict phải khai cả phần yếu của chính lượt chấm` — MODIFIED. Giữ nguyên vế vùng xám probe,
  vế mức cô lập, và vế «không đo được ≠ 0»; đổi vế độ phủ và thêm hai scenario.
- ⛔C2 — cùng họ: một con số **gợi ra kết luận mà phép đo không đỡ được** là một dạng «chưa chứng minh»
  bị đọc thành «đã chứng minh», chỉ ngược dấu.
