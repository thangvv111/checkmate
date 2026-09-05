# Tasks — app-shell-narrow-viewport

## 0. Tầng 2 — ĐO BẰNG MÁY (đã chạy trước khi viết ca), viewport 375px

| màn | `scrollWidth` TRƯỚC | phần tử tràn | cột nội dung |
|---|---|---|---|
| Dashboard | 685 | 23 | 165px |
| Lịch sử chạy | 683 | 22 | 165px |
| Sổ cái | 685 | 45 | 64px |
| Thư viện probe | 685 | 30 | 64px |

Header bóc ra: khung 375px, các con tổng **612px**, `flex-wrap: nowrap`. Nút chuyển repo **288px**.

- [x] 0.1 Sau change: `scrollWidth` **≤ bề rộng khung** trên cả bốn màn, ở 375px và 320px.
- [x] 0.2 Cột nội dung ở 375px: từ 64–165px lên **gần đủ bề rộng** (trừ padding).

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/giao-dien-ccs/spec.md` — 1 requirement, 5 scenario (đã viết).
- [x] 1.2 Chỗ sống của luật: hành vi ở CSS của `ui.ts` + lưới quét; **số đo** ở tài liệu này.

## 2. Header

- [x] 2.1 `.app-hd` cho **xuống dòng** (`flex-wrap: wrap`).
- [x] 2.2 `.repo-btn` có **trần bề rộng** + ellipsis — bề rộng của nó do TÊN REPO quyết định, tức do dữ
      liệu người dùng; không có trần thì bố cục phụ thuộc chuỗi người khác gõ.
- [x] 2.3 Tên repo đầy đủ vẫn đọc được: thuộc tính `title` trên nút, và danh sách xổ xuống không cắt.
- [x] 2.4 KHÔNG ẩn nút trực / nút tài khoản để hết tràn.

## 3. Điều hướng ở màn hẹp

- [x] 3.1 `@media (max-width: 720px)`: `.app-body` xếp dọc; `.app-nav` thành dải NGANG, thôi cố định 210px,
      rule 2px chuyển từ phải xuống dưới.
- [x] 3.2 Dải **xuống dòng** (`flex-wrap: wrap`), không cuộn ngang — bảy mục nhìn thấy CÙNG LÚC, mục đang
      mở không phải đi tìm.
- [x] 3.3 KHÔNG JavaScript, KHÔNG giấu mục nào, KHÔNG đổi thứ tự mục theo trang.
- [x] 3.4 `.app-nav-day` (khoảng đệm đẩy chân trang xuống) không được làm dải cao vống ở màn hẹp.

## 4. Lưới

- [x] 4.1 `test/app-shell-narrow.test.ts`: quét CSS — media query vỏ tồn tại; `.app-nav` trong đó thôi cố
      định bề rộng và đổi hướng; `.app-hd` cho xuống dòng; `.repo-btn` có trần + ellipsis.
- [x] 4.2 Ca khoá **đủ bảy mục** vẫn dựng ra ở HTML (không mục nào bị bỏ ở màn hẹp — CSS không ẩn `.app-nav a`).
- [x] 4.3 Ca khoá **không JS**: dải điều hướng không phụ thuộc script nào.
- [x] 4.4 ⛔ Ghi rõ trong file lưới: quét CSS là **chốt hồi quy**, KHÔNG phải phép chứng minh hết tràn.
      Phép chứng minh là số đo trình duyệt ở §6.

## 5. Mutation — mỗi chiều HAI lượt

- [x] 5.1 Gỡ `flex-wrap: wrap` khỏi `.app-hd` → ca ĐỎ.
- [x] 5.2 Trả `.app-nav` về `width:210px` trong media query → ca ĐỎ.
- [x] 5.3 Gỡ trần bề rộng của `.repo-btn` → ca ĐỎ.
- [x] 5.4 Ẩn bớt mục điều hướng ở màn hẹp (`display:none`) → ca ĐỎ.
- [x] 5.5 Đột biến sống sót → bảng ba đường.

## 6. Kiểm tay — ĐO TRÊN TRÌNH DUYỆT THẬT (KHÔNG tick trước khi chạy)

- [x] 6.1 Bốn màn × hai bề rộng (375px, 320px): `scrollWidth ≤ clientWidth`, số phần tử tràn = **0**.
- [x] 6.2 Cột nội dung ở 375px rộng gần đủ khung.
- [x] 6.3 Bảy mục điều hướng đều nhìn thấy được, mục đang mở đánh dấu đúng.
- [x] 6.4 Desktop 1400px: bố cục KHÔNG đổi — sidebar vẫn 210px, header vẫn một hàng.
- [x] 6.5 Tên repo dài: cắt ellipsis, `title` mang tên đầy đủ.

## 7. Kiểm cơ học

- [x] 7.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 7.2 `npx openspec validate --changes` xanh.

## 8. Kết quả đo

**Mutation 4/4 chiều bị bắt**, mỗi chiều hai lượt: gỡ `flex-wrap:wrap` khỏi header → 1/1 · trả `.app-nav`
về `width:210px` trong media query → 2/2 · gỡ trần bề rộng nút repo → 1/1 · **ẩn bớt mục điều hướng** →
1/1 *(chiều canh đúng cách-làm-hại ở `security.md` S0)*.

**Kiểm tay — đo trên trình duyệt thật, TRƯỚC và SAU:**

| màn | `scrollWidth` @375 trước → sau | phần tử tràn trước → sau | cột nội dung trước → sau |
|---|---|---|---|
| Dashboard | 685 → **375** | 23 → **0** | 165 → **375** |
| Lịch sử chạy | 683 → **375** | 22 → **0** | 165 → **375** |
| Sổ cái | 685 → **375** | 45 → **0** | 64 → **375** |
| Thư viện probe | 685 → **375** | 30 → **0** | 64 → **375** |

Cận dưới **320px** (Thư viện probe): `scrollWidth` 320 = `clientWidth`, **0 phần tử tràn**, đủ **7/7** mục
điều hướng nhìn thấy được. Dải điều hướng cao 112px — hai hàng, không cuộn.

**Hồi quy desktop 1400px:** sidebar vẫn **210px** hướng `column`, nút repo vẫn **288px** (không bị cắt),
header vẫn **MỘT hàng**, `scrollWidth` = 1400.

⚠️ **Phép đo «header một hàng» suýt báo sai.** Gom theo `top` cho ra «5 hàng» — vì `.nav` có
`align-items:center`, nên con khác chiều cao có `top` khác nhau TRONG CÙNG một hàng. Đo bằng **tâm dọc**:
cả năm con đều ở 32 → đúng một hàng. Đây là **lần thứ hai trong ngày** cùng cái bẫy đo ấy (lần đầu ở khối
lọc màn Lịch sử, với `align-items:flex-end`); lần này bắt được trước khi báo.
