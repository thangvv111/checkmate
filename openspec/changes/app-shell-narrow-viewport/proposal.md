## Why

Vỏ ứng dụng **cuộn ngang ở mọi màn** khi bề rộng hẹp. Phát hiện lúc sửa khối lọc màn Lịch sử (nợ #23):
lỗi ấy không phải của khối lọc, mà của vỏ — và nó chạm mọi trang.

Đo trên viewport **375px**, bốn màn khác nhau:

| màn | `scrollWidth` | phần tử tràn | bề rộng cột nội dung |
|---|---|---|---|
| Dashboard | 685 | 23 | 165px |
| Lịch sử chạy | 683 | 22 | 165px |
| Sổ cái | 685 | 45 | 64px |
| Thư viện probe | 685 | 30 | 64px |

**Hai nguyên nhân ĐỘC LẬP** — sửa một cái không cứu được cái kia:

1. **Header không xuống dòng.** `.app-hd` là flex `nowrap`; các con tổng **612px** trong một khung 375px.
   Riêng nút chuyển repo chiếm **288px** vì nó in `owner/repo` bằng mono với `white-space:nowrap`.
2. **Sidebar cố định 210px.** `.app-nav { width:210px; flex:none }` cộng `.app-main { flex:1 }` — ở 375px
   thì cột nội dung còn **165px**, và trên màn có bảng thì còn **64px**. Kể cả khi header thôi tràn, một
   cột 165px vẫn không đọc được.

Hôm nay **không có luật nào khai về màn hẹp**. Repo có sẵn media query ở 1080/900/720px cho từng khối
riêng lẻ, nhưng vỏ thì chưa — nên đây là khai một luật MỚI, không phải kéo hiện thực về luật cũ.

## What Changes

- **Vỏ không được cuộn ngang** ở bất kỳ bề rộng nào được hỗ trợ. Nội dung rộng (bảng, code, dải) vẫn cuộn
  **trong chính nó**, như luật đã có — thứ bị cấm là cuộn ngang ở mức TRANG.
- **Header xuống dòng được**, và nút chuyển repo **cắt bằng ellipsis** thay vì đẩy rộng cả hàng. Tên repo
  đầy đủ vẫn đọc được qua `title` và trong danh sách xổ xuống.
- **Sidebar đổi hình ở màn hẹp**: từ cột 210px thành một **dải ngang cuộn được** đặt trên vùng nội dung.
  Đủ bảy mục vẫn tới được, **không cần JavaScript** — vỏ hôm nay chạy không cần JS và không được đánh đổi
  điều đó lấy một menu bật/tắt.
- **Mục đang mở phải nhìn thấy được** trong dải ngang mà không phải cuộn tay đi tìm.
- **KHÔNG** trong change này: đổi bố cục desktop · đổi nội dung màn nào · dựng menu hamburger có JS ·
  sửa từng màn riêng (nếu một màn còn tràn sau khi vỏ đã đúng thì đó là lỗi RIÊNG của màn ấy).

## Capabilities

### Modified Capabilities

- `giao-dien-ccs`: thêm yêu cầu **vỏ ứng dụng phải dùng được ở màn hẹp** — không cuộn ngang mức trang,
  điều hướng vẫn tới được đủ mục, và không đánh đổi lấy JavaScript.

## Luật chạm tới

- **Luật chạm tới:** `giao-dien-ccs › requirement ADDED (vỏ ở màn hẹp)`. Không ⛔C nào bị chạm: change
  thuần trình bày, không đụng cổng, verdict, bí mật, hay dữ liệu ngoài.
- Một vế đáng nói dù không phải ⛔C: **không được giấu mục điều hướng nào** ở màn hẹp. Giấu bớt mục là
  cách nhanh nhất để hết tràn, và nó lấy mất đường tới đúng những màn người vận hành cần khi đang ở điện
  thoại.

## Impact

- `apps/web/src/ui.ts` — CSS của `.app-hd`, `.hd-menu`/`.repo-btn`, `.app-body`, `.app-nav`, `.app-main`;
  thêm một media query cho vỏ.
- Không đụng file nào khác: vỏ là một chỗ, và đó là lý do sửa được một lần cho mọi màn.
