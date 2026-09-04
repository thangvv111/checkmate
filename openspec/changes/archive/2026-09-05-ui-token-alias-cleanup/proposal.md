## Why

`apps/web/src/ui.ts` giữ một khối **bí danh** nối tên biến đời cũ vào token mới:

```css
--teal:       var(--pass);        --teal-soft:  var(--pass-tint);
--amber:      var(--medium);      --amber-soft: var(--medium-tint);
--fail-soft:  var(--fail-tint);
```

Nó được dựng có chủ đích trong change `dong-bo-giao-dien-ccs`, kèm lý do đúng ở thời điểm ấy: *«đổi tên
biến là một việc khác, trộn hai việc vào một commit thì hỏng cái nào cũng không biết tại đâu»*. Đây là
change trả món nợ đó — và món nợ hoá ra không chỉ là tên biến.

**Năm bí danh này TRỘN HAI HỌ TOKEN**, đúng thứ mà capability `giao-dien-ccs` cấm bằng requirement đầu
tiên của nó. Hệ quả đo được: **38 chỗ** trong giao diện đang dùng chúng, và nhiều chỗ **không mang nghĩa
nghiệp vụ nào**:

| Chỗ | Đang tô bằng | Nghĩa thật |
|---|---|---|
| tag «đang chọn» ở danh sách repo | **màu PASS** | repo đang được chọn |
| tag «đang dùng» ở nhà cung cấp | **màu PASS** | nhà cung cấp đang dùng |
| mục nav đang mở ở màn Nguyên tắc | **màu PASS** | trang đang xem |
| card «✓ Đã lưu cấu hình» viền | **màu PASS** | vừa lưu xong |
| «số PR đã chấm» ở màn Tin cậy | **màu PASS** | một con số đếm |
| tag «trực» ở thẻ repo | **màu medium** | chế độ trực đang bật |

Trong một sản phẩm mà cả nghề là làm cho màu verdict chỉ có MỘT nghĩa, đó là rò nghĩa. Và nó rò theo
chiều ngược với thứ spec đang canh: spec có scenario «đổi accent không đổi nghĩa verdict», nhưng ở đây
**đổi màu PASS sẽ đổi màu của «đang chọn»**.

**Lưới hiện tại không thấy gì.** `test/design-tokens.test.ts` chỉ cấm **mã hex** viết ngoài khối `:root`.
Bí danh đi qua *tên biến*, không qua hex, nên 38 chỗ ấy đi qua lưới sạch sẽ. Đây đúng lỗi lưới **loại 2**
của `test-grid-integrity`: bề mặt chưa ai viết ca.

Change này đứng TRƯỚC ba change đồng bộ màn hình còn lại: nó cắt ngang mọi file `ui-*`, làm sau thì ba
change kia phải sửa lại lần hai.

## What Changes

1. **Xoá năm bí danh trộn họ** — `--teal` · `--teal-soft` · `--amber` · `--amber-soft` · `--fail-soft`.
2. **Định tuyến lại 38 chỗ dùng theo MỘT luật khai rõ** (xem `design.md` D1):
   - Bộ semantic (`--pass` · `--fail` · `--medium`) chỉ dùng cho **kết quả của một phép kiểm**:
     đạt · hỏng · cảnh báo.
   - Trạng thái của giao diện — đang chọn · đang dùng · đang xem · vừa lưu · số đếm — dùng **accent** và
     **ramp trung tính** của hệ.
3. **Lưới mới bắt được bí danh trộn họ**, thứ lưới hex hiện tại không thấy: một tên look khai bằng một
   token semantic là ĐỎ, kèm cặp fixture theo tầng 3.
4. **Đổi hai chỗ màu theo đúng gói design**, cả hai đều là hệ quả trực tiếp của luật ở mục 2:
   - tag «đang dùng» ở nhà cung cấp → **accent** (gói khai thẳng: *«tag đang dùng accent»*);
   - badge «trực» → **jade** (gói khai: *«badge trực ● Trực · 300s, jade khi bật»*), thay cho amber hiện
     tại — bật chế độ trực không phải một cảnh báo.

**KHÔNG làm trong change này:**
- **Không đụng năm bí danh look→look** (`--bg` · `--surface` · `--ink` · `--muted` · `--line`). Chúng nối
  tên cũ vào token cùng họ, không trộn nghĩa. Đổi tên chúng là change refactor riêng đã xếp lịch.
- **Không dựng lại nội dung màn nào.** Ba change sau làm. Ở đây chỉ đổi *chỗ lấy màu*, không đổi bố cục,
  không đổi cột, không đổi chữ.
- **Không đổi nghĩa màu «ngừng» của nhà cung cấp khai tử** — nó đang dùng tint FAIL trong khi «ngừng»
  không phải một thất bại. Ghi lại làm việc của change `settings-screen-ccs`, vì màn ấy sở hữu chỗ đó.

## Capabilities

### New Capabilities
<!-- không có -->

### Modified Capabilities
- `giao-dien-ccs`: siết requirement «Token có đúng một nguồn, và hai họ token không được trộn» — thêm vế
  cấm **bí danh**, vì bản hiện hành chỉ cấm hard-code mã màu và 38 chỗ đã đi vòng qua nó bằng tên biến.

## Luật chạm tới

- **Luật chạm tới:** `giao-dien-ccs › Token có đúng một nguồn, và hai họ token không được trộn`
  (MODIFIED — thêm vế cấm bí danh và một scenario cho nó).

## Impact

- `apps/web/src/ui.ts` — xoá năm bí danh khỏi khối `:root`; 1 chỗ dùng.
- `apps/web/src/ui-docs.ts` (5) · `ui-provider.ts` (8) · `ui-repo.ts` (10) · `ui-trust.ts` (3) — định
  tuyến lại chỗ dùng.
- `test/design-tokens.test.ts` — hàm quét bí danh + cặp fixture.
- **Không đụng**: API JSON, schema dữ liệu, đường quyết định verdict, cổng merge, bố cục màn nào.
