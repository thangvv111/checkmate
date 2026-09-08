## Vì sao không có mẫu số thật

Câu hỏi mà «độ phủ» định trả lời là *«lượt chấm này có kiểm những luật đáng kiểm không?»*. Engine có ba
thứ, và không thứ nào trả lời được:

| engine có | nói được gì |
|---|---|
| toàn bộ đơn vị luật đọc từ spec | kho luật **to bao nhiêu** — không nói luật nào liên quan |
| danh sách file diff chạm | file nào đổi — **không có ánh xạ** file → đơn vị luật |
| `spec_rule` model khai trên mỗi probe | luật nào probe **tự nhận** neo vào — đây là **tử số** |

Dựng mẫu số từ hàng thứ ba là lấy tử số làm mẫu số: mọi lượt sẽ ra 100%. Hàng thứ hai không nối được vì
đơn vị luật sinh từ **tiêu đề trong file markdown**, không mang tham chiếu tới mã nguồn.

⇒ Không có mẫu số ⇒ **không bày tỉ lệ**. Đây là cùng một lý lẽ đã có sẵn trong `ruleCoverage`: *«0 là một
phép đo đã thực hiện, không-đo-được là không có mẫu số»* — change này áp chính câu ấy lên một tầng cao hơn.

## Bề mặt đã ĐẾM BẰNG MÁY

```bash
grep -rn "luat_tong" packages/harness/src apps/web/src | wc -l          # 10 lan xuat hien
grep -rn "luat_tong" packages/harness/src apps/web/src | sed 's/:.*//' | sort | uniq -c
#   3 apps/web/src/ui.ts
#   1 packages/harness/src/cli.ts
#   4 packages/harness/src/skill-code.ts
#   2 packages/harness/src/spec-units.ts
```

Bốn tệp. Lưới `scanRatioSurfaces` quét cả bốn và ĐỎ khi bất kỳ tệp nào mất mỏ neo `luat_tong` — chống
việc đổi tên rồi lưới im lặng bỏ sót.

## Quyết định

### D1. Giữ nguyên hình dạng dữ liệu

`luat_da_phu` (mảng địa chỉ) và `luat_tong` (số) **không đổi** trên verdict. Chỉ **cách bày** đổi. Nên:
verdict đời cũ đọc y như trước, không cần đường di trú, và lưới `doc-du-lieu-cu` không phải sửa.

### D2. Bày TÊN, không chỉ số

`luat_da_phu` vốn đã là mảng **địa chỉ đơn vị luật** — dữ liệu hữu ích nhất ở đây, và trước nay bị nén
thành một con số rồi vứt. «Neo vào `probe-handover › danh sách lý do vứt probe là danh sách ĐÓNG`» nói
cho người đọc biết lượt chấm nhắm vào đâu; «1/195» thì không.

### D3. Vẫn bày tổng số, nhưng nói rõ nó không phải mẫu số

Bỏ hẳn tổng số cũng là một lựa chọn, và bị loại: kho luật to bao nhiêu **là** thông tin thật — nó nói
repo có bao nhiêu luật máy đọc được. Cái phải chặn là **phép chia**, không phải con số.

Trên giao diện, hàng «Luật đối chiếu» ngay phía trên đã bày tổng số, nên hàng mới chỉ bày số neo + tên —
hai số vẫn cạnh nhau nhưng không còn ở dạng mời chia.
