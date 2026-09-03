# Proposal — diff-visibility

## Why

Engine không đưa cả PR vào prompt. Nó **loại** file sinh tự động (lockfile, bundle, ảnh) và **cắt** tiếp khi
diff vẫn vượt trần. Cả hai đều đúng: một diff 400 nghìn ký tự toàn lockfile làm model đọc rác thay vì đọc
hành vi.

Nhưng cắt thì được, **cắt âm thầm thì không**. Một verdict PASS dựng trên nửa PR mà không nói ra là đúng thứ
xanh giả cả công cụ này sinh ra để chống — người duyệt đọc «PASS» và tin rằng máy đã nhìn hết.

Bảng tra có **11 hàng `pending`** trỏ change này. Đối chiếu bằng đọc từng ca ở `dung-diff.test.ts` (9 ca):
**8 điều đã có ca** — loại file sinh tự động, mẫu riêng của repo, regex sai cú pháp, cắt theo trần, giữ file
duy nhất, giữ thứ tự git, và trả về `{file, kyTu, lyDo}` cho từng file bị bỏ.

Ba điều còn lại **đã hiện thực nhưng chưa ca nào chạm**, và cả ba là **cùng một nguyên tắc trên ba bề mặt**:

| điều | hiện thực | ai đọc bề mặt đó |
|---|---|---|
| R7.8 | `skill-code.ts:499–511` — hai thông điệp log | **người vận hành** |
| R7.10 | `khoiNgoaiTamNhin()` trong `promptPhanTich` | **model** |
| R7.11 | `readTarget` throw phân biệt hai nguyên nhân | **người đọc lỗi** |

Ba người khác nhau đọc ba bề mặt khác nhau. Sự thật «có file máy không nhìn» phải hiện ra ở cả ba, vì mất
nó ở bề mặt nào thì đúng người đọc bề mặt ấy bị lừa.

## Ba chỗ tinh tế đọc được trong code

**R7.8 có HAI thông điệp, và cái thứ hai mới là gác.** Thông điệp chung liệt kê mọi file bị bỏ; thông điệp
riêng cảnh báo *«⚠ N file mã nguồn bị loại vì diff quá lớn — verdict lượt này KHÔNG nói gì về chúng»*. Gộp
làm một thì người vận hành không phân biệt được file bị loại vì **sinh tự động** (không sao, đó là rác) với
file bị loại vì **trần** (mã nguồn thật, không ai chấm).

**R7.10 không chỉ liệt kê — nó có chỉ dẫn.** Khối prompt kết bằng *«Đừng đề xuất probe nhắm vào các file này
và đừng kết luận gì về chúng — bạn không có dữ liệu»*. Bỏ danh sách thì model không biết mình khuyết; bỏ
chỉ dẫn thì nó biết mà vẫn suy đoán.

**R7.11 phân biệt hai nguyên nhân.** «Chỉ gồm file sinh tự động (danh sách)» khác hẳn «diff rỗng»: cái đầu
là PR **có** thay đổi thật nhưng toàn rác, cái sau là PR không đổi gì. Báo sai bản chất thì người ta đi tìm
nhầm chỗ — mở PR ra thấy đầy file mà công cụ bảo rỗng.

## What Changes

- Ba requirement, mỗi cái một bề mặt.
- KHÔNG viết ca trùng cho 8 điều đã có.

## Điều change này KHÔNG đóng, và nói thẳng ra

Tám điều kia **đã có ca** nhưng **chưa có requirement** — nên chúng ở lại `pending`, không thành `housed`.
Bảng tra chỉ nhận `housed` khi hàng trỏ được tới một requirement CÓ THẬT, và viết requirement cho tám điều
ấy là việc riêng, không nằm trong phạm vi PO đã duyệt cho change này.

Ghi ra đây thay vì lặng lẽ để lại: sau change này capability `diff-visibility` **chưa đóng**, và bảng tra
vẫn còn 8 hàng trỏ về nó. Nó rẻ — tám điều đã có ca, chỉ thiếu phần khai luật — nhưng nó là một change
khác, và PO là người quyết có làm hay không.

## Luật chạm tới

- Capability MỚI `diff-visibility` (ADDED, 3 requirement)
- Bảng tra: **3 hàng** → `housed`; 8 hàng còn `pending` (xem mục trên)
- ⛔C5 **N/A**: `promptPhanTich`, `buildDiff`, `readTarget` đều đã export và đã khai `checkmate.yml`

## Impact

- MỚI: `test/diff-visibility.test.ts`
- KHÔNG đổi code sản phẩm
