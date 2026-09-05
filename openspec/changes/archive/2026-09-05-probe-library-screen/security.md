# Security — probe-library-screen

Change chỉ-đọc, không thêm hành động ghi nào từ giao diện. Nhưng nó làm **một việc chưa từng làm**: đưa
**mã nguồn do model sinh từ nội dung repo đích** lên trang HTML. Đó là dữ liệu ngoài hạng không tin cậy
cao nhất, và nó là thứ trông giống «code của mình» nhất trong cả sản phẩm — nên phần S4 mới là phần thật
sự của tài liệu này, không phải phần bí mật.

## S0. Trục thật: thứ dài nhất trên màn là thứ ít bị nghi nhất

Người viết màn dễ tự thuyết phục rằng code probe «phải để nguyên mới đọc được». Nó không phải: nó phải
hiện **nguyên văn dưới dạng chữ**, mà nguyên-văn-dưới-dạng-chữ chính là kết quả của việc thoát HTML. Hai
điều ấy nghe giống nhau và đối lập nhau.

Đo được: **13 chỗ** dữ liệu ngoài lên màn (`design.md` §Tầng 2). Mười hai chỗ là chuỗi ngắn dễ nhớ thoát;
chỗ thứ mười ba dài hàng nghìn ký tự và nằm trong một panel riêng — đúng chỗ dễ được miễn nhất.

## S1. Bí mật & rò rỉ

- ✅ S1.1 — Change **không thêm** giá trị bí mật nào. Nó đọc `probes-lib/` (mã probe và siêu dữ liệu),
  không đọc kho khoá. Kho khoá vẫn ở `secret-vault.ts` và không đường nào của change chạm tới.
- ⚠️ S1.2 — **Cần soi khi apply.** Đường đọc thư viện đi qua `repoSlug(cfg.repo.local_path)` — tức chạm
  cấu hình. Phải bảo đảm phần trả về chỉ mang **slug**, không mang `local_path` đầy đủ: đường dẫn tuyệt
  đối trên máy chủ là thông tin hạ tầng, không cần cho màn. Ca T_bimat khoá điều này.
- ⚠️ S1.3 — Thông điệp lỗi của `GET /api/probes/code` khi không tìm thấy **không được** vọng lại đường
  dẫn đã thử. Nói «probe không có trong thư viện của repo này» là đủ; in đường dẫn là vẽ bản đồ đĩa cho
  người hỏi.
- N/A S1.4 — Không giá trị nào bị che trong change này, nên vế «bản che phải phân biệt được hai giá trị»
  không áp dụng.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — Ba đường mới (`/probes`, `/api/probes`, `/api/probes/code`) **không** nằm trong `OPEN_PATHS`
  (`apps/web/src/session-gate.ts:28`), nên chúng đi qua cửa phiên như mọi đường khác. Danh sách cho phép
  ấy là danh sách ĐÓNG: route mới mặc định phải đăng nhập, không phải nhớ bổ sung.
- ✅ S2.2 — Không đường nào trả tài khoản, hash hay muối. Change không đọc `identity.ts`.
- ⚠️ S2.3 — **Cần một ca tiêu cực thật**, không suy luận: gọi cả ba đường **không có phiên** phải bị chặn.
  «Đã có lớp khác chặn» không được tính khi chưa có ca reproduce (scenario «người chưa đăng nhập gọi
  đường đọc thư viện»).

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Change không thêm đường nào cho máy merge. Cả ba route là `GET`, không route nào
  gọi `mergePr`. Ca T_cong quét điều này bằng máy chứ không bằng lời hứa.
- ✅ S3.2 — Vai `tu_dong` không làm được gì mới: change không thêm hành động nào. Ba công tắc tự động
  không bị đụng.

## S4. Dữ liệu không tin cậy & prompt injection

- ⚠️ S4.1 — **Trục chính.** Toàn bộ 13 chỗ phải qua `escHtml` (`apps/web/src/ui.ts:614`). Ca đối kháng
  phải đặt chuỗi đóng thẻ **trong THÂN probe**, không chỉ trong tiêu đề — bởi chỗ dễ quên là chỗ dài.
- ⚠️ S4.2 — Panel code hiện trong khối nền tối theo gói design. Nội dung **MUST NOT** đi vào tài liệu
  dưới dạng phần tử chạy được: không `innerHTML` với chuỗi thô, không nhúng vào `<script>`, không đưa qua
  thuộc tính `on*`. Ca khoá hình dạng chứ không chỉ khoá kết quả.
- ✅ S4.3 — Change **không** đưa gì mới vào prompt. Nó không gọi model; luật «không gọi model trong khoá»
  không bị đụng vì chỗ ghi sổ nằm trong khoá nhưng chỉ ghi một dòng.
- ⚠️ S4.4 — `title` của ô hành vi mang `commit · ngày · trạng thái`, tức ba trường ngoài đi vào **thuộc
  tính** HTML chứ không vào thân. Thoát cho thuộc tính và thoát cho thân không phải một chuyện; ca phải
  đặt dấu nháy kép vào một trong ba trường ấy.

## S5. Sandbox & thực thi

- ✅ S5.1 — **Không có gì mới được CHẠY.** Code probe được ĐỌC và HIỂN THỊ, không được nạp, không được
  `import`, không đi vào trình chạy test nào. Đây là khác biệt cần giữ rõ trong đầu suốt change: cùng một
  chuỗi ký tự, hai vai hoàn toàn khác nhau.
- N/A S5.2 — Không dựng worktree, không thư mục tạm mới.

## S6. Tầng dữ liệu & quyền file

- ⚠️ S6.1 — File mới `probes-lib/<slug>/removals.jsonl` nằm cùng thư mục với `meta.json`, thừa hưởng
  quyền của thư mục ấy. Nó **không** chứa bí mật: chỉ tên file probe, lý do, bằng chứng hành vi. Cần soi
  lúc apply rằng «bằng chứng» chép vào đó không kéo theo đoạn code nào.
- ⚠️ S6.2 — Ghi bằng `appendFileSync` **trong khoá** (`probe-library.ts:129` `withLibraryLock`). Không
  dùng ghi-tạm-rồi-rename như `ghiMeta` vì ở đây không có chuỗi đọc-sửa-ghi nào để mất. Rủi ro còn lại là
  **dòng cuối cụt**, và đường đọc phải **giữ bằng chứng**: bỏ dòng hỏng và ĐẾM, không ghi đè im lặng.
- ✅ S6.3 — `meta.json` không đổi hình dạng ⇒ không có đường di trú nào để hỏng, và bản sao lưu prod đọc
  được nguyên như cũ.
- ⚠️ S6.4 — ⛔C6: màn đọc thẳng từ đĩa, **không thêm cache**. Sửa tay `meta.json` hay `removals.jsonl`
  phải có hiệu lực ở lượt đọc kế tiếp.

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — Change không sinh verdict và không chạm đường phân loại; không nhánh lỗi nào biến thành PASS.
- ⚠️ S7.2 — Vế fail-closed tương ứng ở màn này là **«không đo được thì nói không đo được»**: `meta.json`
  rách phải ra «không đo được», MUST NOT ra `0 probe`. `0` nghĩa là đã đếm và thư viện trống — cùng lỗi
  mà `man-run` đã cấm ở bảng độ phủ luật.
- ✅ S7.3 — Sổ gỡ **không tham gia quyết định nào**: đường chấm không đọc nó. Một sổ hỏng không đổi được
  verdict nào, và đó là lý do nó được phép dùng cơ chế ghi nhẹ hơn `meta.json`.

## S8. Leo quyền & cô lập (per-vector)

- ⚠️ S8.1 — **Mọi đường tới mục tiêu «đọc một file trên máy chủ mà không được phép»:**
  (1) `GET /api/probes/code` với tên chứa `..` · (2) tên là đường tuyệt đối · (3) tên hợp lệ nhưng thuộc
  slug khác · (4) tên có trên đĩa mà không có trong sổ. Cả bốn phải bị chặn bởi **một** phép kiểm: tra
  tên trong `meta.probes` trước, không bao giờ ghép tên vào đường dẫn. Vá riêng ca `..` là vá một đường
  trong bốn.
- ⚠️ S8.2 — **Load-bearing hai chiều, bắt buộc.** Đột biến 6.4 ở `tasks.md`: cho `readProbeCode` ghép
  thẳng tên vào đường dẫn → ca T3.2 phải ĐỎ. Không có phép thử ấy thì «đã tra trong sổ» là một câu trong
  tài liệu.
- ⚠️ S8.3 — Đối xứng giữa hai đường ghi sổ: cùng một sự kiện «probe biến mất» phải để lại bản ghi ở **cả
  hai** đường. Đo được trước change: một đường ghi vào verdict, đường kia chỉ `console.log` — đúng khuôn
  «hai cửa cùng vai viết bằng hai biểu thức riêng» đã bị bắt chín lần trong repo này.

## Notes

**Rủi ro không nằm ở mục nào ở trên: change này biến một thứ vô hình thành thứ nhìn được, và người ta sẽ
bắt đầu QUYẾT ĐỊNH dựa trên nó.** Hôm nay không ai tin hay không tin thư viện, vì không ai thấy nó. Sau
change, một dải hành vi vẽ sai — đệm ô, ánh xạ lệch trạng thái, đếm nhầm «bắt hồi quy» — sẽ dẫn tới người
vận hành giữ nhầm hoặc bỏ nhầm một probe. Màn này không có quyền ghi nào, nhưng nó có quyền **định hướng
một quyết định ghi** ở change kế tiếp.

Đó là lý do các ca của dải hành vi và dòng tóm tắt được viết như ca đúng-sai, không phải ca giao diện.
