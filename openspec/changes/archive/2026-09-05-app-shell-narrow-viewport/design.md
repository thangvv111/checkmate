## Context

Vỏ cuộn ngang ở mọi màn khi bề rộng hẹp. Phát hiện khi sửa khối lọc màn Lịch sử — lỗi ấy không phải của
khối lọc, mà của vỏ.

### Tầng 2 — ĐO BẰNG MÁY (chạy trước khi viết ca), viewport 375px

| màn | `scrollWidth` | phần tử tràn | cột nội dung |
|---|---|---|---|
| Dashboard | 685 | 23 | 165px |
| Lịch sử chạy | 683 | 22 | 165px |
| Sổ cái | 685 | 45 | 64px |
| Thư viện probe | 685 | 30 | 64px |

Bóc header ra:

```
.app-hd  flex-wrap: nowrap   khung 375px, các con tổng 612px
  a.wordmark        102px
  div.hd-menu       288px   ← nút chuyển repo, mono + white-space:nowrap
  div.hd-space        0px
  a.truc            105px   ← nowrap
  div.hd-menu       117px   ← nút tài khoản
.app-nav  width:210px flex:none      .app-main  flex:1  → 165px
```

## Goals / Non-Goals

**Goals**
- Không cuộn ngang mức trang từ 320px trở lên, trên MỌI màn.
- Điều hướng vẫn tới được đủ mục ở màn hẹp, và mục đang mở nhìn thấy được.
- Không cần JavaScript.

**Non-Goals**
- Không đổi bố cục desktop.
- Không dựng menu hamburger.
- Không sửa từng màn: nếu một màn còn tràn sau khi vỏ đã đúng thì đó là lỗi riêng của màn ấy.

## Decisions

### D1 — Hai nguyên nhân ĐỘC LẬP, phải sửa cả hai

Sửa header mà giữ sidebar 210px thì hết tràn nhưng cột nội dung còn 165px — không đọc được. Sửa sidebar mà
giữ header nowrap thì cột nội dung rộng ra nhưng trang vẫn cuộn ngang. Không cái nào là «nguyên nhân
chính»; chúng cộng vào nhau.

### D2 — Header: cho xuống dòng, và cắt đúng chỗ dữ liệu người dùng quyết định bề rộng

```css
.app-hd { flex-wrap: wrap; }
.repo-btn { max-width: 46vw; overflow: hidden; text-overflow: ellipsis; }
```

Chỗ đẩy header rộng ra là nút chuyển repo (288px) — và bề rộng của nó do **tên repo** quyết định, tức do
dữ liệu người dùng. Một phần tử mà người khác quyết định bề rộng thì phải có trần; không có trần thì bố
cục của mình phụ thuộc vào chuỗi người khác gõ.

Cắt bằng ellipsis chứ không bỏ `nowrap`: một tên `owner/repo` gãy làm hai dòng đọc còn khó hơn. Tên đầy
đủ vẫn ở `title` và trong danh sách xổ xuống.

Cân nhắc ẩn nút trực / nút tài khoản ở màn hẹp: **bác**. Đó là giấu bớt đường đi để con số tràn về 0 —
đúng thứ requirement này cấm.

### D3 — Sidebar: dải NGANG cuộn được, không phải menu bật/tắt

```css
@media (max-width: 720px) {
  .app-body { flex-direction: column; }
  .app-nav  { width:auto; flex-direction:row; overflow-x:auto; border-right:0;
              border-bottom:2px solid var(--color-divider); }
}
```

Bảy mục nằm trên một dải ngang cuộn được, đặt trên vùng nội dung. Cột nội dung lấy lại toàn bộ bề rộng.

Cân nhắc menu hamburger: **bác**. Nó gọn hơn, nhưng đòi JavaScript — mà vỏ hôm nay chạy được khi JS tắt,
và đổi tính chất ấy lấy một bố cục gọn hơn là một cái giá không ai xin phép trả. Dải ngang giữ mọi mục
hiện diện, không cần một cú bấm nào.

**Mục đang mở phải nhìn thấy được.** Dải cuộn ngang có bảy mục; mục thứ bảy nằm ngoài khung. Dùng
`scroll-margin-inline` cộng thuộc tính `autofocus`? Không — `autofocus` cướp tiêu điểm bàn phím. Cách
không-JS đúng: trong dải ngang, **mục đang mở đứng đầu** không được (đổi thứ tự điều hướng theo trang là
làm người dùng mất bản đồ). Chọn: `scroll-snap` cộng `.app-nav a.on { scroll-margin-left: 12px }` và để
trình duyệt tự cuộn tới phần tử `:target`… cũng không chắc chắn.

**Chốt:** giữ thứ tự cố định, và cho dải **xuống dòng** (`flex-wrap: wrap`) thay vì cuộn ngang. Bảy mục
ngắn xuống hai hàng ở 375px — mọi mục nhìn thấy được cùng lúc, không cuộn, không JS, không đổi thứ tự.
Đổi lại là chiếm thêm một hàng dọc; ở màn hẹp thì chiều dọc là thứ rẻ nhất.

### D4 — Lưới: quét CSS được, nhưng NÓ KHÔNG PHẢI phép chứng minh

Ca test chạy trong vitest **không có trình duyệt**, nên không ca nào đo được `scrollWidth` thật. Thứ lưới
làm được là quét CSS: media query có tồn tại không, `.app-nav` có thôi cố định bề rộng không, `.repo-btn`
có trần không.

Phải nói thẳng giới hạn ấy: **phép chứng minh là số đo trên trình duyệt thật**, ghi vào `tasks.md`; lưới
là **cái chốt chống hồi quy** cho lần sửa vỏ sau. Nhầm hai vai này là đúng lỗi lưới loại 1 mà
`test-grid-integrity` mô tả — một ca xanh không có nghĩa là màn đã hết tràn.

## Architecture

Chỉ `apps/web/src/ui.ts`, phần CSS của vỏ. Vỏ là một chỗ — đó là lý do sửa một lần cho mọi màn.

## Data Model

Không đổi. Change thuần trình bày.

## Risks / Trade-offs

**[Dải điều hướng chiếm thêm chiều dọc ở màn hẹp]** → chấp nhận: ở màn hẹp chiều dọc là thứ rẻ nhất, và
đổi lại cột nội dung đi từ 165px lên gần đủ bề rộng.

**[`max-width` trên nút repo cắt tên ở desktop hẹp]** → dùng `46vw` nên nó chỉ cắt khi khung thật sự hẹp;
ở 1280px trở lên không cắt gì. Có ca đo hai đầu.

**[Lưới CSS xanh mà màn vẫn tràn]** → D4 nói rõ: lưới là chốt hồi quy, số đo trình duyệt mới là chứng
minh. Ghi cả số đo vào tài liệu để lần sau so được.

## Migration Plan

Không có. Đường lùi: revert — trang quay lại cuộn ngang ở màn hẹp như hôm nay.

## Open Questions

Không còn. Ranh giới với menu hamburger chốt ở D3.
