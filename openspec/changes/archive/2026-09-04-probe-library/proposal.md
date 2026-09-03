# Proposal — probe-library

## Why

Thư viện probe là chỗ CheckMate tích luỹ giá trị theo thời gian: mỗi lượt chấm để lại những probe đã bắt
được lỗi thật, và lượt sau chạy lại chúng như một bộ regression. Nó cũng là **chỗ duy nhất trong hệ có ba
tiến trình cùng ghi vào một file sổ**, nên phần lớn luật ở đây là luật về đua và về mất dữ liệu.

Bảng tra có **28 hàng `pending`** trỏ change này. Đối chiếu bằng đọc từng ca thật trong `thu-vien.test.ts`
(30 ca) · `dedup-probe.test.ts` (26 ca) · `kho-run.test.ts` · `phan-loai.test.ts`: **20 điều đã có ca**.
Tám điều còn lại chia làm hai loại khác nhau về bản chất:

| điều | hiện thực | vấn đề |
|---|---|---|
| R8.5 | `tenFileProbe()` — nới hậu tố hash [6,12,24,64] | nhánh chống đụng chưa ca nào chạm |
| R8.8 | `if (Date.now() > hetHan) break` | chờ hết giờ thì VẪN làm việc — chưa có ca |
| R9.15 | code probe ghi ra file, không vào bảng | chưa khai vì sao |
| R10.3 | `lich_su: []` + verify trước khi nạp | chưa có ca |
| R10.11 | **chỉ một comment** ở `skill-code.ts:948` | gác thật, không gì đỏ khi vi phạm |
| R10.14 | `/^\d+$/` + kẹp [6,200] | giá trị hỏng dùng mặc định — chưa có ca |
| R10.15 | `try/catch` quanh `readFileSync` | chưa có ca |
| **R8.9** | **FIFO đã bị thay** bằng `pickEvictionVictim` | **luật nói về một cơ chế đã chết** |

## R8.9 là án lệ đầu tiên của loại lỗi thứ tư

`test-grid-integrity` (merge hôm nay) khai một loại lỗi mà **không cơ chế nào bắt được**: *lưới đúng nhưng
luật sai*. R8.9 là ca đầu tiên đo được.

Luật khai: «đẩy file ra khỏi thư viện theo trần **FIFO** phải xoá luôn file trên đĩa». Code đã thay FIFO
bằng chấm điểm bốn nấc từ lâu, và `probe-library.ts:61` còn ghi rõ vì sao FIFO sai — *«FIFO cũ loại theo
tuổi là loại đúng probe im lặng lâu năm»*. Vế «xoá luôn file trên đĩa» vẫn sống và đã có ca; vế «theo FIFO»
nói về một cơ chế không còn tồn tại.

Không lưới nào đỏ. Không mã trích nào lệch. Nó lộ ra vì có người đọc code.

## What Changes

- Bảy điều → bảy requirement có ca khoá.
- **R8.9 → `obsolete`**, kèm «thay bằng R10.22 đào thải theo điểm». KHÔNG viết ca cho FIFO: viết ca cho một
  cơ chế đã chết là khai một hành vi không tồn tại — đúng thứ cổng archive của repo này cấm.

## Luật chạm tới

- Capability MỚI `probe-library` (ADDED, 7 requirement)
- Bảng tra: 7 hàng → `housed`, 1 hàng → `obsolete`
- KHÔNG đổi code sản phẩm — change này chỉ viết ca và khai luật

## Impact

- MỚI: `test/probe-library.test.ts`
- KHÔNG đụng `packages/harness/src/probe-library.ts` (⛔C5 N/A — không thêm export)
