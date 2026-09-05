# Test cases — history-filter-layout

Bề mặt đếm bằng máy ở `tasks.md` §1: **1** chỗ dùng `.card` kèm `display:flex` nội tuyến · **0** chỗ khai
lại `flex-direction`.

## Ca tái hiện lỗi

- [x] T1.1 [Ca PO báo, 05/09] Khối lọc màn Lịch sử KHÔNG được thừa hưởng `flex-direction:column` từ
      `.card`. Quét HTML dựng ra: khối lọc mang class riêng, và class ấy khai `flex-direction:row`.
- [x] T1.2 Ô tìm kiếm vẫn `flex:1` — nó là ô co giãn duy nhất của hàng, nở theo chiều NGANG.

## Ca chặn CÁI BẪY, không chỉ ca này

- [x] T2.1 **Mọi** phần tử mang `class="card"` và khai `display:flex` nội tuyến thì phải khai luôn
      `flex-direction`. Quét toàn `apps/web/src/*.ts`.
      *(`.card` ép `column`; ai viết một hàng ngang trên nền `.card` mà quên khai hướng sẽ dính đúng lỗi
      này. Sửa mỗi `ui-history.ts` là để nguyên cái bẫy cho người kế tiếp.)*
- [x] T2.2 [fixture đối kháng] Chuỗi `class="card" style="display:flex;gap:8px"` → lưới ĐỎ, nêu tên file.
- [x] T2.3 [fixture đối chứng] Cùng chuỗi ấy **có** `flex-direction:row` → lưới XANH.
- [x] T2.4 [đối chứng] `class="card"` KHÔNG kèm `display:flex` → không bị bắt (nó dùng đúng cột mặc định).

## Ca hồi quy

- [x] T3.1 Khối lọc vẫn có đủ **bảy** ô như trước: repo · kết quả · loại · nhà cung cấp · từ ngày ·
      đến ngày · tìm — cộng nút Lọc. *(Sửa layout không được làm rơi mất một bộ lọc nào.)*
- [x] T3.2 Nút «Bỏ lọc» vẫn chỉ hiện khi có bộ lọc đang bật.
- [x] T3.3 Ngữ nghĩa lọc KHÔNG đổi — dòng tổng vẫn tính trên phần đã lọc (`data-table-screens`). Ca ấy đã
      có ở lưới `data-table-screens`, ở đây chỉ xác nhận nó vẫn xanh.

## Mutation

- [x] T4.1 Gỡ `flex-direction:row` khỏi `.loc-bar` → T1.1 ĐỎ.
- [x] T4.2 Trả `<form>` về `class="card"` + `display:flex` nội tuyến không kèm hướng → T2.1 ĐỎ.
- [x] T4.3 Đột biến sống sót → bảng ba đường, ghi rõ rơi vào hàng nào.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T5.1 Mở màn Lịch sử bằng mắt trên trình duyệt: khối lọc là MỘT hàng ngang, không mảng xám thừa bên
      trái. *(Đây là lỗi chỉ mắt người xác nhận được — nó đã đi qua toàn bộ lưới hiện có mà không ai đỏ.)*
- [x] T5.2 Thu hẹp: khối lọc xếp dọc và không tràn ở cả 700px lẫn 375px. **Vế «trang không cuộn ngang»
      KHÔNG đạt ở 375px, và không phải do change này**: header vỏ app đẩy tài liệu ra 685px. Đã đo thủ
      phạm bằng máy (`div.hd-menu`, nút tài khoản ở mép 685) và ghi nợ #23 thay vì sửa lấn sang.

## Kết quả

`npx tsc --noEmit` sạch · `npm test` **68 tệp / 1202 ca xanh** · mutation **2/2 bị bắt** hai lượt · kiểm
tay đo bằng số trên trình duyệt.

Ca đáng giá nhất của change này không phải ca sửa màn mà là **T2.1 — cái bẫy đã đóng**: `.card` ép
`flex-direction:column`, nên ai viết một hàng ngang trên nền `.card` mà quên khai hướng sẽ dính đúng lỗi
này. Sửa mỗi `ui-history.ts` là để nguyên cái bẫy cho người kế tiếp.
