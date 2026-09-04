# Security — ui-token-alias-cleanup

Change này đổi **chỗ lấy màu** của 38 vị trí trong giao diện. Nó không mở cửa vào, không đọc bí mật,
không chạm cổng, không chạm dữ liệu. Nên phần lớn danh sách chuẩn là N/A — và ghi rõ N/A kèm lý do có
giá trị hơn là bịa ra rủi ro để lấp đầy mục.

Nhưng có **một trục thật**, và nó không nằm trong danh sách chuẩn.

## S0. Trục thật: màu là một kênh thông tin, và đổi màu là đổi thông tin

Verdict của sản phẩm này được đọc bằng mắt trước khi được đọc bằng chữ. PASS/jade và FAIL/crimson là
kênh nhanh nhất mà người vận hành dùng để quyết «có nên nhìn kỹ cái này không». Bất kỳ chỗ nào **không
phải verdict** mà mang màu verdict đều làm loãng kênh ấy — và loãng dần thì đến lúc người ta thôi tin nó.

Change này siết theo hướng ĐÚNG (gỡ màu verdict khỏi 6 chỗ không phải verdict), nhưng cùng cơ chế ấy có
thể sai theo chiều ngược: đẩy nhầm một **kết quả phép kiểm** sang accent, làm mất tín hiệu chất lượng ở
một chỗ đang có. Đó là rủi ro thật duy nhất của change, và nó được canh bằng **cặp ca hai chiều** T3.1 /
T3.2 — thiếu vế thứ hai thì «không chỗ nào dùng semantic» xanh cả khi xoá sạch màu semantic.

## S1. Bí mật & rò rỉ

- N/A S1.1 — Không giá trị nào của change là bí mật. Thứ change đụng là tên biến CSS và mã màu, cả hai
  vốn nằm nguyên văn trong HTML gửi ra trình duyệt.
- N/A S1.2 — Không có gì mới chảy ra bề mặt công khai. Change không thêm chữ nào vào comment PR hay thân
  commit merge.
- N/A S1.3 — Không có giá trị nào bị che.

## S2. Danh tính, phiên, vai

- N/A S2.1 / S2.2 — Không route mới, không đường nào đọc danh tính, không bề mặt nào trả tài khoản.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Change không chạm `apps/web/src/cong.ts`, không chạm `gate.ts`, không đổi điều kiện
  nào của nút Merge. Màu không mở được nút: điều kiện mở nút Merge nằm ở `evaluateMergeLocal` /
  `evaluateMergeAgainstPr` (`apps/web/src/gate.js`), và change không đụng file đó.
- ⚠️ S3.2 — **Một chỗ đáng soi, tuy không phải quyền.** Cổng merge dùng màu để nói tình trạng: checklist
  cảnh báo medium tô amber, banner FAIL tô crimson. Nếu change định tuyến nhầm một trong hai sang accent
  thì **nút vẫn khoá đúng** (điều kiện là logic, không phải màu) nhưng người đọc mất tín hiệu. Đã kiểm:
  38 chỗ của change **không có chỗ nào nằm trong `khoiCong`** — cổng dùng `--medium` và `--fail` trực
  tiếp, không đi qua bí danh. Ca T3.2 giữ vế «chỗ đúng là kết quả phép kiểm vẫn dùng semantic».

## S4. Dữ liệu không tin cậy & prompt injection

- N/A S4.1 / S4.2 — Change không đưa gì vào prompt, không tin thêm gì từ model.

## S5. Sandbox & thực thi

- N/A S5.1 / S5.2 — Không chạy code nào, không dựng worktree nào.

## S6. Tầng dữ liệu & quyền file

- N/A S6.1 / S6.2 — Không file mới, không cột mới, không đường ghi nào. Màu dựng lại mỗi lần render nên
  không có gì để di trú và không có gì để dọn.

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — Change không thêm nhánh lỗi nào. Một biến CSS không tồn tại làm khai báo ấy vô hiệu và
  thuộc tính rơi về giá trị kế thừa — nó KHÔNG làm hỏng trang, và không nhánh nào biến lỗi thành PASS.
- ✅ S7.2 — Không đụng đường đếm hồi quy, không đụng nhãn máy dán.
- ⚠️ S7.3 — **Bất biến verdict ở tầng THỊ GIÁC.** `decideResult` không đổi, nhưng bất biến «FAIL trông
  khác PASS» sống ở CSS chứ không ở TypeScript. Sau change, phải còn đúng ba màu cho ba nghĩa và không
  màu nào bị dùng lại cho chuyện khác. Canh bằng: cả năm phép đếm ở Tầng 2 về 0 · lưới `scanTokenAliases`
  · và kiểm tay T5.2 nhìn tag accent cạnh pill jade.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 — **Liệt kê mọi đường tới cùng mục tiêu «một thứ không phải verdict mang màu verdict»:**
  (1) khai bí danh trong khối `:root` · (2) dùng `var(--pass…)` thẳng ở chỗ không phải kết quả kiểm ·
  (3) hard-code hex của semantic ở chỗ không phải kết quả kiểm. Change này đóng (1) bằng
  `scanTokenAliases` và (2) bằng T3.1; (3) đã có lưới hex từ trước. Vá (1) mà bỏ (2) thì người sau chỉ
  cần gõ thẳng `var(--pass)` là lọt — nên hai ca phải đi cùng nhau.
- ✅ S8.2 — **Load-bearing hai chiều.** Năm chiều mutation ở `tasks.md` §5, trong đó 5.3 là chiều ĐỐI
  CHỨNG (bí danh look→look phải vẫn XANH) và 5.5 canh chính phép nhận diện họ — thiếu nó thì một regex
  gãy làm cả lưới thành trang trí mà vẫn xanh.
- ✅ S8.3 — **Đối xứng.** Cấm trộn họ phải cấm CẢ HAI CHIỀU: look mang tên semantic (T1.1) và semantic
  mang tên look (T1.2). Bản đầu của phép quét chỉ nghĩ tới chiều thứ nhất, vì đó là chiều đang có bệnh —
  mà chiều thứ hai tạo ra đúng cùng một hậu quả.

## Notes

**Rủi ro không nằm ở mục nào ở trên: change này đổi VẺ của sản phẩm, và PO chưa nhìn.** Thay đổi lớn nhất
là tag «đang chọn» / «đang dùng» chuyển từ jade sang accent — nhìn khá khác. Giảm thiểu: liệt kê thẳng
trong PR, kèm lý do từ gói design (*«tag đang dùng accent»*), và kiểm tay T5.1/T5.2 nhìn thật trước khi
merge. Đây là loại thay đổi mà chỉ có mắt người mới nói được là đúng hay không — không lưới nào thay được.
