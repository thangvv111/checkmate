# Design — đồng bộ giao diện theo gói CCS

## Đọc gói: prototype không chạy được, nhưng template đọc được

Gói ở `E:\Projects\ai-checker\design-ccs` gồm `CheckMate SPA.dc.html` (150KB) · `README.md` ·
`styles.css` · `modernist-goc/`. File `.dc.html` là **Design Component** — chạy bằng runtime Claude
Design (`sc-if`, `sc-for`, binding `{{ }}`), và nó gọi ba tệp **không có trong gói**:

```
./support.js                                    thieu
_ds/modernist-a23baac0-.../\_ds_bundle.js       thieu
_ds/modernist-a23baac0-.../styles.css           co o goc, sai duong dan
```

Mở bằng trình duyệt chỉ thấy khung và `{{ }}` chưa render. **Layout dưới đây đọc từ chính template**,
không suy từ mô tả — chính xác hơn nhìn ảnh. Muốn xem nó sống thì mở trong Claude Design, hoặc đồng bộ
thêm hai tệp kia về `design-ccs/`.

## Layout đọc được từ template

```
+--------------------------------------------------------------+
| HEADER                       rule 2px duoi                    |
| wordmark | repo ▾ | <-- flex:1 --> | ●Truc | user ▾           |
+---------+----------------------------------------------------+
| NAV     |  MAIN   max-width 1240  ·  padding 26px 32px 64px   |
| 210px   |                                                     |
| rule 2px|  h6 accent    <repo>                                |
| ben phai|  h2           Dashboard                             |
|         |  muted 13px   mot cau dinh vi                       |
| 8 muc   |  ---- hr ----                                       |
| nut     |  h4 Hang doi PR  + dem mono                         |
| flush   |  grid 52px | 1.5fr | 1.1fr | 90px | 170px | 290px   |
| left    |     header cot: rule 2px · moi dong: rule 1px       |
| (day)   |                                                     |
| mono 10 |                                                     |
+---------+-----------------------------------------------------+
```

Ba điều template nói mà `README` không nói:

1. **Prototype không có class riêng** — CSS inline của nó vỏn vẹn **108 ký tự**; mọi thứ dựng bằng
   `style=""` cộng `var(--*)` của Modernist. Nghĩa là **không copy được class**, phải tự đặt tên theo
   cấu trúc của mình và chỉ mượn token. Đó lại là chỗ tốt: tên class là của repo này, không phải của
   prototype.
2. **Grid hàng đợi là hằng số cứng**, lặp ở cả hàng tiêu đề lẫn hàng dữ liệu:
   `52px minmax(220px,1.5fr) 1.1fr 90px 170px 290px`.
3. **Có panel `Handoff` 300px gập phải** — công cụ ghi chú bàn giao của prototype, không phải tính
   năng sản phẩm. Bỏ có chủ đích, ghi ra để không ai tưởng là sót.

## Quyết định 1 — server-rendered, nhưng LẤY cảm giác SPA bằng hai API trình duyệt

Gói nói «SPA thuần: đổi panel, không reload». Cùng gói cũng nói dựng lại bằng «Express +
server-rendered TS hiện tại **hoặc** framework FE mà đội chọn» — nó để ngỏ. Câu hỏi thật không phải
«SPA hay không» mà **«thứ gói design muốn là gì»**: nó muốn điều hướng *cảm thấy* liền mạch. Có đường
lấy đúng thứ đó mà không đụng kiến trúc.

```
1. Speculation Rules   prerender trang khi chuot di vao link
                       --> bam xong trang da dung san
2. View Transitions    @view-transition { navigation: auto }
   (cross-document)    --> chuyen canh muot giua HAI trang that
```

Khoảng **10 dòng**: một khối `@view-transition` trong hằng `CSS`, một `<script type="speculationrules">`
trong `shell()`. Không build step, không router, không state client.

| | Server-rendered thuần | **+ VT + prerender** ✔ | SPA thật |
|---|---|---|---|
| Thêm gì | — | ~10 dòng, 0 dependency | build step · router · state · tầng thứ 5 |
| Điều hướng | thấy rõ reload | **cảm giác liền mạch** | liền mạch |
| Thoái hoá | — | trình duyệt cũ chạy y như cũ | không có gì để thoái hoá |
| Đảo ngược | — | **xoá 10 dòng** | viết lại app |

**Mức hỗ trợ, tra 01/09/2026:** Chromium từ 126 · Safari từ 18.2 · Firefox đang làm dở (146–151 hỗ trợ
một phần); cross-document view transitions nằm trong phạm vi Interop 2026. Trình duyệt chưa hỗ trợ thì
**trang chạy y như cũ** — mất hiệu ứng, không mất chức năng. Đó là điều kiện phải giữ, và spec khai nó
thành yêu cầu chứ không để làm lời hứa miệng.

Một điều kiện kỹ thuật khớp tự nhiên với change này: view transition chỉ mượt khi hai trang **dùng
chung vỏ** — mà `shell()` đúng là vậy. Nên nó thuộc commit 2, không tách ra được.

Cái vẫn KHÔNG có: state giữ qua trang (bộ lọc đang chọn, vị trí cuộn giữa hai màn khác nhau). Mình
chưa cần — và ngày cần thì vỏ với token đã đúng, chỉ đổi tầng điều hướng.

## Quyết định 2 — hai họ token, giữ riêng biến

Đây là chỗ dễ sai nhất của đợt này. Accent hệ thống `#ec3013` và FAIL `#D0342C` **đều là đỏ**, nhìn
gần giống nhau, và cám dỗ là gộp thành một biến.

```
--color-accent   #ec3013   he thong: nut primary, nav active   "BAM DI"
--fail           #D0342C   semantic: verdict FAIL, high        "HONG ROI"
```

Gộp thì một lần đổi look kéo theo đổi nghĩa verdict. Gói design tự nó cũng tách: bộ semantic được khai
riêng và ghi rõ *«KHÔNG nằm trong Modernist, hard-code đúng các hex này»*. Lưới token vì thế phải cho
phép hard-code **đúng ba hex semantic** và cấm mọi hex khác — cấm hết là lưới báo oan, mà lưới báo oan
thì người ta tắt chứ không sửa code.

Gói cũng đã tự giới hạn: accent chỉ chạy **thành mảng** ở đúng hai chỗ (nền đăng nhập, poster Nguyên
tắc). Chỗ còn lại nó là viền, chữ, nền nút — không cạnh tranh thị giác với pill FAIL.

## Quyết định 3 — sidebar đủ 8 mục, mục chưa có màn nói thẳng (PO chốt B)

Nav của gói có 8 mục, trong đó **Thư viện probe** chưa có API (README ghi rõ «backend làm sau khi chốt
design»).

| | Cách | Đổi lại |
|---|---|---|
| A | dựng 7 mục | sidebar lệch gói, phải sửa lần hai khi có API |
| **B** ✔ | **dựng đủ 8, mục đó mở màn «đang xây»** | có một cửa cụt — nhưng cụt **có nhãn** |
| C | dựng đủ 8 + làm luôn API | change phình gấp đôi, gộp giao diện với tính năng |

Chọn **B**. Màn «đang xây» phải nói **vì sao** chưa có (API chưa dựng) chứ không chỉ «coming soon» —
cùng nguyên tắc với mọi chỗ khác trong sản phẩm: không đủ dữ liệu thì nói ra, không giả vờ.

## Bảy trang hiện có ánh xạ vào 8 route của gói

| Route gói | Trang hiện có | Đợt này làm gì |
|---|---|---|
| `dashboard` | `homePage` (`/`) | **dựng lại nội dung** |
| `run` | `runPage` (`/runs/:id`) | nhận vỏ mới |
| `hist` | `historyPage` (`/lich-su`) | nhận vỏ mới |
| `ledger` | `ledgerPage` (`/ledger`) | nhận vỏ mới |
| `trust` | `trustPage` (`/tin-cay`) | nhận vỏ mới |
| `config` | `settingsPage` (`/settings`) | nhận vỏ mới |
| `rules` | `docsPage` (`/docs`) | nhận vỏ mới |
| `probes` | **chưa có** | route mới, màn «đang xây» |

Bảy trang chỉ **nhận vỏ** vì chúng đi qua `shell()`. Việc còn lại của mỗi trang là gỡ chỗ hard-code
màu cũ — lưới token sẽ chỉ đúng chỗ nào.

## Thứ tự thi công

```
1. TOKEN     hang CSS trong ui.ts -> token Modernist + semantic
             luoi token bat hard-code hex la
2. SHELL     shell() -> header + sidebar 8 muc + main 1240
             7 trang tu doi vo; luoi shell dem du muc
3. DASHBOARD homePage dung lai theo grid cua goi
4. PROBES    route moi + man "dang xay" noi ro vi sao
```

Bước 1 và 2 không tách được khỏi nhau về mặt nhìn (đổi vỏ mà chưa đổi token thì vỏ mới mang màu cũ),
nhưng **tách được về commit** — và nên tách, để lỗi nào thuộc tầng nào còn thấy được trong lịch sử.

## Rủi ro đã biết

- **Vỏ dùng chung nghĩa là một lỗi vỏ hỏng cả bảy trang.** Đổi lại: một lần sửa cũng chữa cả bảy.
  Lưới shell phải chạy trên **mọi trang thật**, không chỉ trang mẫu.
- **`ui-docs.ts` 320 dòng** là trang dài nhất và mang nhiều style riêng — nhiều khả năng là nơi lưới
  token đỏ nhiều nhất. Đợt này chỉ gỡ màu cứng, không dựng lại nội dung theo poster của gói.
- **Font Archivo + IBM Plex Mono tải từ Google Fonts.** Máy chủ prod chạy sau nginx — cần chắc chắn
  trang vẫn đọc được khi font không tải được (fallback stack thật, không để trống).
