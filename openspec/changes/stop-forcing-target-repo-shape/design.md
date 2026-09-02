# Design — bỏ ép hình dạng repo đích

## Đo trước: chỗ khớp bị lệch nằm ở đâu

`checkmate.yml` của repo đích đã mở **nửa CHẠY** từ lâu, và mở khá tốt. Nửa **ĐỌC** thì chưa từng mở.

```
checkmate.yml cua repo dich          hien trang
-------------------------------      ----------
runner:  test_cmd                    MO   repo tu khai lenh chay test
         framework                   MO   pytest | junit | vitest…
         probe_dir · probe_ext       MO
         probe_file · timeout_s      MO
review:  khuon_loi · triggers        MO
         severity_map · bo_qua_diff  MO
-------------------------------      ----------
spec o dau                           DONG  join(repo, 'specs')
dinh dang gi                         DONG  .endsWith('.md')
sau bao nhieu tang                   DONG  readdirSync phang
don vi luat nhan dien the nao        DONG  /[A-Z]{1,3}\d{1,3}(\.\d{1,3})?/
tai lieu API                         DONG  'README.md'
file test mau                        DONG  'test/' + uu tien .test.ts
```

Một sản phẩm cho phép repo khai **cách chạy test của nó** nhưng bắt repo **viết spec theo khuôn của
mình** thì chưa phải sản phẩm — nó là một công cụ dùng được đúng trên những repo chịu chiều nó.

## Bằng chứng: cả hai repo đích hiện có đều chứng minh điều đó

**`demo-credit-approval`** — spec mở đầu bằng `## R1 —`, `## R2 —`, đủ 8 mã. Nó khớp vì **nó được
viết để khớp**. PO đã nói rõ: cái demo là một ca ví dụ về cách sản phẩm hoạt động, nó **không quyết
định sản phẩm phải thế nào**. Nên nó KHÔNG được dùng làm khuôn thiết kế — chỉ dùng làm phép thử rằng
đường tổng quát vẫn ăn được ca cũ.

**`repos/thangvv111-checkmate`** — đứng ở commit mà `specs/` chưa tồn tại. `readTarget` trả
`specs: []`, và prompt sinh probe nhận:

```
# SPEC HANH VI (nguon su that — moi probe phai neo vao mot luat o day)
  <khoi rong>
```

Không guard nào. `specs.length` chỉ được đem đi **log**, không đem đi **chặn**.

## Cái gì thật sự hỏng khi không có mã luật

Truy ngược từng chỗ dùng:

```
PHU THUOC ma luat            luat_tong / luat_da_phu    -> do phu hoa vo nghia
                             isNewRule -> vi_pham_luat_moi -> CA MOT LOP BAO VE TAT
                             chuanRule trong khu trung thu vien

KHONG phu thuoc              doc diff · sinh probe · chay probe
                             phan loai chinh (pass/hoi_quy/cai_thien/ngoai_pham_vi)
                             cong merge
```

Nghĩa là hỏng này **không làm gãy** cổng — nó làm cổng **nói dối bằng cách im lặng**. Verdict trên
repo không có luật trông giống hệt verdict trên repo có luật đầy đủ. Đó là cùng một khuôn lỗi mà
change trước vừa vá ở tầng vùng-xám probe, chỉ là ở tầng cao hơn.

## Quyết định 1 — hỏi lại: engine THẬT SỰ cần gì từ spec

Đừng bắt đầu bằng «hỗ trợ thêm định dạng nào». Bắt đầu bằng danh sách thứ engine dùng spec để làm:

```
1. VAN BAN de bo vao prompt                 --> bat ky dinh dang van ban nao
2. DON VI DIA CHI DUOC de probe neo vao     <-- yeu cau THAT
3. So hai nhanh de biet DON VI NAO MOI      <-- can (2)
4. Tong so don vi de tinh do phu            <-- can (2)
```

Chỉ mục 2 là ràng buộc thật, và nó **không** nói gì về mã. Nó nói: **spec phải chia được thành đơn vị
trỏ tới được.**

| Cách đánh địa chỉ | Repo nào có sẵn |
|---|---|
| mã ngắn `R4.21` | repo viết theo khuôn CheckMate |
| **đường tiêu đề** `Phê duyệt › Ngưỡng theo vai` | **mọi tài liệu Markdown / AsciiDoc / text có mục** |
| tên kịch bản | Gherkin `.feature` |
| đường khoá | OpenAPI, JSON Schema |

**Chọn đường tiêu đề làm nền**, vì nó là mẫu số chung rộng nhất của tài liệu người ta thật sự viết.
Mã ngắn không bị bỏ — nó thành trường hợp riêng: một tiêu đề tình cờ mở đầu bằng mã, và cái mã đó
cũng dùng làm địa chỉ được.

Hệ quả sạch: probe khai `spec_rule: "R1"` vẫn neo đúng vào tiêu đề `## R1 — Ngưỡng phê duyệt theo
vai`, mà không cần một đường mã riêng chạy song song.

## Quyết định 2 — luật-mới so theo KHỐI, không so theo mã

Bản hiện tại: `findNewRules` lấy tập mã ở nhánh PR trừ tập mã ở nhánh gốc.

```
HIEN NAY    tap_ma(PR) \ tap_ma(goc)     --> repo khong danh ma: tap rong, LUON rong
DE XUAT     tap_donvi(PR) \ tap_donvi(goc)
```

Tổng quát hơn và không mất khả năng nào: repo có mã thì đơn vị mang mã, phép trừ cho ra đúng kết quả cũ.

Một điều phải giữ nguyên: **fail-closed khi không đọc được spec nhánh gốc**. Bản hiện tại đã đúng ở
chỗ này (không đọc được → không phong luật-mới cho ai) và change này không được nới nó ra.

## Quyết định 3 — không có spec thì VẪN CHẤM, nhưng khai ra (PO chốt vế hai)

Hai đường, PO chọn đường thứ hai:

| | Cách | Đổi lại |
|---|---|---|
| A | từ chối chấm khi không có spec | đúng ⛔C2 theo nghĩa hẹp, nhưng **sản phẩm không vào được cửa** — rất nhiều repo thật chưa có spec viết ra |
| **B** ✔ | **vẫn chấm, và KHAI RÕ là chấm không có luật đối chiếu** | verdict yếu hơn, nhưng người đọc **biết** nó yếu ở đâu |

B chỉ đúng nếu phần «khai rõ» làm thật, ở cả ba chỗ:

1. **prompt** — không được nói «mọi probe phải neo vào một luật ở đây» rồi đưa khối rỗng. Bảo model
   neo vào chỗ trống là đẩy nó đi bịa ra chỗ neo.
2. **verdict** — trường khai nguồn luật + số đơn vị đọc được.
3. **màn Run** — cảnh báo cùng hạng với «vùng mù của diff» và «không có đối chứng»: nó đổi **cách
   đọc** verdict, nên đứng trước verdict.

Và độ phủ khi đó là **không đo được**, không phải `0`. Đây không phải chi tiết chữ nghĩa: `0` là một
phép đo đã thực hiện; không-đo-được là **không có mẫu số**. Nhét cả hai vào cùng một chữ số là đúng
lỗi mà cả sản phẩm này tồn tại để chống.

## Quyết định 4 — dò tìm là PHÁN ĐOÁN, nên phải nói ra

Repo không khai nguồn spec thì engine tự dò. Dò tìm âm thầm là cách êm ái nhất để đọc nhầm chỗ và
không ai biết. Nên đường dò phải **báo cáo**: đã tìm ở đâu, mỗi chỗ thấy gì.

```
Nguon luat: khong khai trong cau hinh — da do
  specs/        4 file, 12 don vi     <-- dung
  docs/         khong co
  README.md     1 file, 0 don vi
```

Cùng nguyên tắc với `ngoaiTamNhin` của diff: **không cắt âm thầm**. Chỗ này là không **chọn** âm thầm.

## Ba chỗ hard-code còn lại, gộp cùng (PO chốt «gộp hết»)

**Tài liệu API và file test mẫu** — cùng cách: repo khai được, không khai thì dò và báo cáo. Chúng
cũng đi vào prompt, nên chúng cũng là đầu vào.

**Án lệ nội bộ rò vào prompt sản phẩm.** `skill-doc.ts:114` nhắc `specs/R12` của chính CheckMate
trong prompt chấm PRD của người khác. Tri thức đúc từ án lệ thì giữ; **con trỏ tới file nội bộ** thì
bỏ — repo đích không có file đó, và một sản phẩm nói về tài liệu nội bộ của mình giữa lượt phục vụ
khách là rò rỉ ranh giới.

**Nhãn bước sai số.** Bước 2 của skill doc ghi «4 loại lỗi khách quan» trong khi rubric có **bảy**.
Nhãn sót lại từ đời rubric cũ. Với công cụ mà toàn bộ giá trị là nói đúng, một nhãn khai sai về chính
mình nặng hơn vẻ ngoài của nó.

## Rủi ro đã biết

- **Đơn vị theo tiêu đề có thể vỡ vụn.** Tài liệu chia tiêu đề quá sâu cho ra hàng trăm đơn vị, và
  độ phủ thành mẫu số vô nghĩa theo chiều ngược lại. Cần trần độ sâu, và cần đo trên tài liệu thật
  chứ không đoán.
- **Thư viện probe đang neo theo mã.** `chuanRule` so chuỗi mã; đổi sang địa chỉ đơn vị phải đọc lại
  được probe cũ, kẻo cả thư viện regression mất neo — đó là tài sản đắt nhất của sản phẩm.
- **Dò tìm rộng tay có thể nuốt nhầm.** `docs/` của nhiều repo chứa cả tài liệu marketing. Thà dò hẹp
  và báo «không thấy» còn hơn nạp nhầm rồi chấm theo một văn bản không phải spec.
- **`Verdict` là lớp B** — chỉ thêm trường tuỳ chọn, không đổi hình dạng trường đã có.
