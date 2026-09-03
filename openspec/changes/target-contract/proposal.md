# Proposal — target-contract

## Why

`checkmate.yml` là hợp đồng giữa checker và repo đích: repo khai lệnh chạy test của mình, checker chạy nó
trong sandbox rồi đọc JUnit XML. Hợp đồng ấy là **văn bản** — cho tới đúng một dòng, nơi nó trở thành một
lệnh shell thật chạy trên máy chủ.

Bảng tra có **18 hàng `pending`** trỏ change này. Đối chiếu bằng đọc từng ca: **15 điều đã có ca** —
`runner-cfg.test.ts` (13 ca: không có yml → `null` · thiếu `test_cmd` → `null` · mặc định · kẹp `timeout_s`
· yml hỏng fail-safe · `<failure/>` rỗng là failed · suite lồng nhau · XML lạ trả rỗng · khuôn lỗi và
severity riêng) · `loi-nap-file.test.ts` (7 ca) · `phan-loai` + `nhan-probe-log` (đủ ba dạng tên probe).

Ba điều còn lại **đã hiện thực nhưng chưa ca nào chạm**, và cả ba nằm cùng một chỗ — `sandbox.ts`, đúng
chặng hợp đồng-trên-giấy thành lệnh-chạy-thật:

| điều | hiện thực | vấn đề |
|---|---|---|
| R2.3 | `sandbox.ts:149` — thay `{files}` và `{out}`, quote khi có khoảng trắng | ca hiện có chỉ kiểm `readRunnerCfg` **giữ** chuỗi; vế **thay** chưa ai đo |
| R2.16 | `sandbox.ts:112, 166` — `loiThu` mang `stderr \|\| stdout` | không ca nào chạm `loiThu` |
| R2.17 | `sandbox.ts:86` — `resolve(repo, 'node_modules')` rồi symlink | không ca nào |

## Ba chỗ đáng nói đọc được trong code

**R2.17 là một luật chỉ sống trong comment**, và comment ấy đã ghi sẵn hậu quả: gọi checker với `--repo .`
thì đích junction thành `'node_modules'` tương đối, junction trỏ ngược vào chính thư mục sandbox, *«hỏng mà
KHÔNG báo lỗi»* — `npx` vẫn chạy được vitest vì nó tự tải về cache, nên **nhìn như đang chạy bình thường**,
trong khi mọi `import` gói từ trong worktree đều «Cannot find package». Một finding sai hẳn bản chất: không
phải «code có lỗi» mà là «sandbox dựng sai». Cùng mẫu với R10.11 của `probe-library`.

**R2.3 — `quote` không phải gác chống injection, và chỗ này dễ đọc nhầm.**
```ts
const quote = (x: string) => (/\s/.test(x) ? `"${x}"` : x);
```
Nó bọc **đường dẫn do checker tự sinh** khi chúng chứa khoảng trắng (username Windows). `test_cmd` thì đúng
là dữ liệu ngoài và nó chạy qua shell — nhưng đó là **thiết kế cố ý**: repo đích tự chọn lệnh chạy test của
mình, trong sandbox, dưới quyền của chính lượt chấm. Khai ranh giới ấy thành luật để người sau không nhầm
`quote` là hàng rào an ninh, rồi hoặc tin nó quá mức, hoặc «siết» nó thành cái làm hỏng đường dẫn hợp lệ.

**R2.16 — «0 probe» mà không nói vì sao là fail-closed nhưng MÙ.** Đúng ⛔C2 (không thành PASS), nhưng người
nhận không biết phải sửa gì: thiếu gói? sai lệnh? sai thư mục? Nguyên nhân nằm trong `stderr` của bộ chạy và
phải đi theo thông điệp lỗi ra ngoài.

## What Changes

- Ba requirement, mỗi cái một chặng của `sandbox.ts`.
- Cả ba khoá bằng **chạy thật** trên repo git tạm + sandbox thật — không ca nào đọc source.

## Điều change này KHÔNG đóng

15 điều kia **đã có ca** nhưng **chưa có requirement**, nên ở lại `pending`. Cùng tình trạng với
`diff-visibility` (nợ N1). Ghi ra thay vì lặng lẽ để lại.

## Luật chạm tới

- Capability MỚI `target-contract` (ADDED, 3 requirement)
- Bảng tra: **3 hàng** → `housed`; 15 hàng còn `pending`
- ⛔C5: `Sandbox`, `envSandbox`, `fileLoadError`, `parseJUnit`, `readRunnerCfg` — kiểm lại bảng module

## Impact

- MỚI: `test/target-contract.test.ts`
- KHÔNG đổi code sản phẩm
