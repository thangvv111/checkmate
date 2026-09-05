# Security — probe-handover-replaces-library

Change này **gỡ một lớp phủ**. Hồ sơ này vì thế hỏi ngược hướng thường lệ: không phải «phần thêm vào có an
toàn không», mà **«phần bị lấy đi đang che gì, và cái thay nó có che đúng chỗ ấy không»**.

## S1. Bí mật & rò rỉ

- ✅ **S1.1** — change không đưa giá trị nhạy cảm mới nào ra bề mặt nào. Thứ đi ra là **mã probe** (code do
  model sinh cho repo đích) và **mã luật spec** — cả hai vốn đã hiện trên màn thư viện hôm nay.
  ⚠ Nhưng đường đi của mã probe **đổi**: trước nó nằm trong kho và chỉ hiện để đọc; nay nó là thứ người vận
  hành **copy sang một repo khác**. Cơ chế giữ nguyên (`textContent`, không `innerHTML` —
  `apps/web/src/ui-probes.ts`), và ca T6.4 khoá nó.
- ✅ **S1.2** — không có gì của change chảy ra bề mặt công khai. Đề xuất giao nằm trong verdict và trên màn
  nội bộ; change này **không** đẩy gì sang repo đích (đó là nợ N2, cần PO chốt).
- N/A **S1.3** — không có giá trị nào phải che.

## S2. Danh tính, phiên, vai (R11)

- ✅ **S2.1** — không đường mới nào đọc danh tính. Màn hàng đợi dùng đúng cửa phiên như màn thư viện nó
  thay thế; route gỡ đi nhiều hơn route thêm vào.
- ✅ **S2.2** — không route nào trả tài khoản/hash/muối.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ **S3.1** — **KHÔNG.** Change không thêm đường nào cho máy tự merge.
  ⛔ Và nó chạm ⛔C1 ở một chỗ cần nói rõ: đề xuất giao **là đề xuất**. Máy MUST NOT tự đưa test vào repo
  đích. Requirement «Đề xuất giao là ĐẦU RA của lượt chấm» khai đúng ranh giới ấy; nợ N2 (đẩy PR sang repo
  đích) nếu làm sau này thì **phải qua PO** vì nó là máy ghi vào một repo khác.
- ✅ **S3.2** — vai `tu_dong` không có quyền mới; ba mức tự động không bị đụng.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ **S4.1** — change không thêm đường nào cho dữ liệu ngoài vào prompt. Ngược lại, nó **bớt** một đường:
  probe thư viện (code sinh từ lượt trước) thôi được nạp vào bộ chạy.
- N/A **S4.2** — không thêm chỗ nào tin trả lời model. Cửa đột biến là phép **cơ học**, cố ý không dùng
  model — đó cũng là lý do chọn phủ định khẳng định thay vì nhờ model viết bản hỏng (design D2).

## S5. Sandbox & thực thi (R8)

- ✅ **S5.1** — mọi code vẫn chỉ chạy trong sandbox. Cửa đột biến chạy probe **đã phủ định khẳng định**,
  vẫn trong cùng sandbox, không thêm bề mặt thực thi nào.
- ⚠️ **S5.2** — cửa đột biến là **lượt chạy sandbox THÊM** cho probe hạng 2. Phải dọn kể cả khi lỗi, và
  không được để hai lượt song song đụng nhau. Đây là mục **cần xử khi hiện thực**, không phải mục đã xong:
  hiện thực phải dùng đúng khuôn `try/finally` + `sbV.huy()` mà khối nạp cũ đang dùng — khối ấy bị gỡ, nên
  khuôn phải được **chuyển sang** chứ không đánh rơi cùng nó.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ **S6.1** — **không file mới trên đĩa.** Đề xuất đi theo verdict, dùng đường ghi đã có.
- ⚠️ **S6.2 — mục quan trọng nhất của hồ sơ này.** Change gỡ **code đọc** `probes-lib/`, và MUST NOT xoá
  **dữ liệu** ở đó. Ba lý do (design D3): xoá dữ liệu prod là việc một chiều; nếu quyết định này sai thì 7
  probe ấy là dữ liệu duy nhất còn lại; và chính luật `probe-quarantine` bị gỡ trong change này nói *«máy
  được phép đánh dấu vì việc đó đảo ngược được; xoá thì chỉ người mới làm»* — **gỡ một luật không có nghĩa
  là được phép làm ngược nó**.
  Cưỡng chế: T9.1 (kiểm tay sau deploy, đếm 7 file + `meta.json`) và task 7.2.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ⚠️ **S7.1 — trục chính.** Từng nhánh mới và nơi nó dẫn tới:

  | nhánh | dẫn về | fail-closed? |
  |---|---|---|
  | probe không xếp được hạng | hạng 3 → **vứt** | ✅ vứt là hướng an toàn: không đề xuất thứ chưa chứng minh |
  | cửa đột biến **lỗi** (sandbox chết, hết giờ) | **vứt** probe | ✅ không được mặc định đề xuất |
  | cửa đột biến cho ra «vẫn xanh» | vứt | ✅ |
  | không tách được probe thành file độc lập | không đề xuất + **nói lý do** | ✅ |
  | `ruleCoverage`/`findNewRules` trả rỗng | không có hạng 2 → mọi probe xanh về hạng 3 | ✅ |

  ⛔ **Nhưng rủi ro fail-closed thật của change này không nằm trong bảng trên.** Nó nằm ở chỗ khác và phải
  nói thẳng: **change làm giảm khả năng bắt lỗi**. Probe sinh mới chỉ dò quanh diff, nên hồi quy tác động-
  từ-xa mất người canh. Đó không phải một nhánh lỗi để «xử cho fail-closed» — đó là **một cái mất đã chọn**.
  Điều ⛔C2 đòi ở đây là: không chỗ nào được để «thôi kiểm» đọc thành «đã kiểm và sạch». Requirement «Bỏ lớp
  phủ hồi quy là một mất mát, và nó phải hiện ra» + ca T5.1 giữ điều đó.
- ✅ **S7.2** — probe hỏng vẫn không bị đếm nhầm thành bằng chứng hồi quy; bảng chân trị không đổi.

## S8. Leo quyền & cô lập (per-vector — theo CHANGE này)

- ⚠️ **S8.1 — liệt kê mọi đường tới mục tiêu «một hành vi hỏng lọt qua cổng»**, và change đổi gì ở từng đường:

  | đường bắt lỗi | trước | sau | đổi |
  |---|---|---|---|
  | probe sinh mới, dò quanh diff | có | có | **không đổi** |
  | probe thư viện, dò hành vi cũ | có | **KHÔNG CÒN** | ⚠ **mất** |
  | test của chính repo đích (`test_cmd`) | có | có | không đổi — và là chỗ cơ chế giao đẩy phủ **về** |
  | skill doc (tài liệu) | có | có | không đụng |
  | lưới máy phân loại + sàn severity | có | có | không đụng |

  Hàng thứ hai là **cái mất duy nhất**, và nó được khai ở spec chứ không giấu trong design.
- ⚠️ **S8.2 — test LOAD-BEARING HAI CHIỀU**, không dismiss bằng «đã có lớp khác chặn»:

  | gác | code sau change | tạm no-op gác đó | ca đỏ |
  |---|---|---|---|
  | hạng 1 không chạy đột biến | gọi 0 lần | gọi ≥1 | T2.1 (mutation T8.1) |
  | hạng 2 phải qua cửa | trượt thì vứt | đề xuất thẳng | T2.3 (T8.2) |
  | danh sách hạng đóng | luôn rơi vào 1/2/3 | có nhánh thứ tư | T1.6 (T8.3) |
  | không đọc `probes-lib/` | 0 chỗ đọc | 1 chỗ đọc | T3.1 (T8.4) |
  | hàng đợi không trần | giữ đủ | loại khi đầy | T6.3 (T8.5) |
  | verdict khai phạm vi | có câu | bỏ câu | T5.1 (T8.6) |

  Mỗi hàng **chạy thật hai lượt** và kiểm chứng đột biến đã tới đĩa — «không ca nào đỏ» vì `sed` trượt trông
  y hệt «ca không load-bearing» (án lệ `error-message-egress-gate`).
- ⚠️ **S8.3 — đối xứng.** Change **gỡ** một lớp cho **mọi** repo đích, nên đường đối xứng phải soi là mọi
  repo đang được chấm, không riêng repo demo. Hiện prod có **một** repo có thư viện (`demo-credit-approval`,
  7 probe). Nhưng đối xứng thật nằm ở chỗ khác: **repo đích nào KHÔNG có CI riêng thì cơ chế giao không có
  chỗ để giao về.** Với repo ấy, change là mất phủ mà không có bù. Chưa có repo nào như thế trên prod, và
  điều kiện đó phải được kiểm lại khi thêm repo mới — ghi ở đây vì nó không tự lộ ra.

## Notes

**Rủi ro lớn nhất của change không nằm ở code mới mà ở việc GỠ.** 155 ca test và 20 requirement bị đụng;
hỏng nguy hiểm nhất là **gỡ nhầm một ca đang khoá một luật vẫn còn hiệu lực** — nó không làm gì đỏ, nó chỉ
lặng lẽ mở một lỗ. Task 0.2 và ca T7.6 (đối chiếu tổng số ca) là hai thứ duy nhất bắt được nó.

**Điều một hồ sơ kín không nên tự nhận:** cửa đột biến ở đây là **phủ định khẳng định**, một điều kiện
**CẦN chứ không ĐỦ** — `expect(1).toBe(1)` phủ định cũng đỏ mà chẳng canh gì (ca T2.5 khoá đúng giới hạn
ấy). Cửa mạnh hơn là đột biến hiện thực repo đích, và nó **chưa có lời giải** vì engine không biết phá chỗ
nào cho đúng. Ghi thành nợ N1 thay vì để tài liệu ngụ ý cửa này chứng minh probe có giá trị.
