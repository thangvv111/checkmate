# Test cases — app-shell-narrow-viewport

Bề mặt đo bằng máy ở `tasks.md` §0: **4 màn** đo, `scrollWidth` 683–685 ở 375px, header các con tổng
**612px** trong khung 375px.

⛔ **Giới hạn phải nói ra trước:** vitest không có trình duyệt, nên **không ca nào ở đây đo được
`scrollWidth` thật**. Lưới quét CSS là **chốt chống hồi quy**; **phép chứng minh** là số đo trình duyệt ở
mục «Kiểm tay». Nhầm hai vai này là đúng lỗi lưới loại 1 — một ca xanh không có nghĩa là màn đã hết tràn.

## Quét CSS vỏ

- [x] T1.1 Media query vỏ tồn tại, và trong đó `.app-nav` **thôi cố định bề rộng** + đổi hướng.
- [x] T1.2 `.app-hd` khai `flex-wrap: wrap`.
- [x] T1.3 `.repo-btn` có **trần bề rộng** và `text-overflow: ellipsis`.
- [x] T1.4 [fixture đối kháng] CSS thiếu một trong ba vế trên → lưới ĐỎ, nêu vế nào thiếu.
- [x] T1.5 [fixture đối chứng] CSS đủ ba vế → lưới XANH.

## Không giấu mục, không cần JS

- [x] T2.1 HTML vỏ dựng ra **đủ bảy mục** điều hướng, ở mọi màn.
- [x] T2.2 CSS KHÔNG có luật nào ẩn `.app-nav a` (giấu bớt mục là cách nhanh nhất làm hết tràn — và nó
      lấy mất đường tới đúng những màn cần khi đang cầm điện thoại).
- [x] T2.3 Dải điều hướng không phụ thuộc script: HTML của `.app-nav` không có `onclick`/`data-` nào điều
      khiển hiện/ẩn.
- [x] T2.4 Thứ tự bảy mục KHÔNG đổi theo trang đang mở.

## Hồi quy desktop

- [x] T3.1 Ngoài media query, `.app-nav` vẫn khai `width:210px` — bố cục desktop không đổi.
- [x] T3.2 Mục đang mở vẫn được đánh dấu (`.on`), ở cả hai bố cục.

## Mutation

- [x] T4.1 Gỡ `flex-wrap: wrap` khỏi `.app-hd` → T1.2 ĐỎ.
- [x] T4.2 Trả `.app-nav` về `width:210px` trong media query → T1.1 ĐỎ.
- [x] T4.3 Gỡ trần bề rộng `.repo-btn` → T1.3 ĐỎ.
- [x] T4.4 Thêm `display:none` cho một mục điều hướng ở màn hẹp → T2.2 ĐỎ.
- [x] T4.5 Đột biến sống sót → bảng ba đường, ghi rõ rơi vào hàng nào.

## Kiểm tay — ĐO TRÊN TRÌNH DUYỆT (KHÔNG tick trước khi chạy)

- [x] T5.1 Bốn màn × 375px: `scrollWidth ≤ clientWidth`, phần tử tràn = 0.
- [x] T5.2 Bốn màn × 320px: như trên. *(320px là cận dưới requirement khai.)*
- [x] T5.3 Cột nội dung ở 375px rộng gần đủ khung (trước: 64–165px).
- [x] T5.4 Desktop 1400px: sidebar vẫn 210px, header một hàng — bố cục desktop KHÔNG đổi.
- [x] T5.5 Tên repo dài: cắt ellipsis, `title` mang tên đầy đủ.

## Kết quả

`npx tsc --noEmit` sạch · `npm test` **69 tệp / 1214 ca xanh** · mutation **4/4 bị bắt** hai lượt · kiểm
tay đo trước-sau trên trình duyệt (bảng ở `tasks.md` §8).

**Nhắc lại giới hạn đã khai ở đầu:** lưới ở đây quét CSS, và CSS xanh KHÔNG chứng minh màn hết tràn. Bốn
màn × hai bề rộng, `scrollWidth = clientWidth` và **0 phần tử tràn** — đó mới là phép chứng minh, và nó
nằm ở tài liệu chứ không ở lưới.

**Một ca của change TRƯỚC phải sửa theo:** `history-filter-layout` › T1.3 dùng `indexOf` cho
`@media (max-width: 720px)` và giả định chỉ có MỘT khối như thế. Change này thêm khối thứ hai (cho vỏ),
nên ca ấy bắt trúng khối sai và đỏ oan — đúng cái bẫy «cắt cứng theo vị trí». Đã sửa thành duyệt MỌI khối.
