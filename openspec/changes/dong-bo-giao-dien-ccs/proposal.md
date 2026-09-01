## Why

Gói design CCS (`E:\Projects\ai-checker\design-ccs`, đồng bộ 30/08) là **high-fidelity, quyết định
cuối** — màu, chữ, khoảng cách, trạng thái đều đã chốt. Giao diện hiện tại chưa theo nó ở cả ba tầng:

- **Token**: teal `#0B6E66` · radius 10px · Segoe UI → gói dùng accent `#ec3013` · **radius 0 mọi nơi**
  · Archivo + IBM Plex Mono, rule 2px giữa section lớn / 1px giữa dòng.
- **Vỏ app**: hiện là top-bar ngang + 4 icon → gói là **header 2px rule + sidebar 210px + main 1240px**.
- **Màn**: 7 trang hiện có đều dựng trước khi có gói.

Màn đăng nhập đã đi theo **cấu trúc** gói từ 30/08 nhưng cố ý **giữ palette cũ**, và ghi rõ lý do
trong chính file: *«đổi màu ở đúng một trang trong khi mọi trang khác còn teal thì được một trang đẹp
và một sản phẩm lệch»*. Đợt này là đợt trả món nợ đó.

Thứ tự bắt buộc: **token + vỏ trước, Dashboard sau**. Dựng Dashboard trên vỏ cũ rồi mới đổi vỏ là làm
Dashboard hai lần. Và vì `shell()` là hàm chung của cả 7 trang, đổi nó một lần thì các trang còn lại
**tự mang vỏ mới** ngay cả khi nội dung chưa dựng lại — dở dang có kiểm soát, đúng ý «làm đến đâu cập
nhật đến đó».

## What Changes

1. **Token Modernist thay palette hiện tại** — `styles.css` của gói là nguồn; hằng `CSS` trong `ui.ts`
   đổi sang biến `var(--color-*)`, cộng bộ **semantic riêng của CheckMate** (PASS/jade `#0E9F7E` ·
   FAIL/crimson `#D0342C` · medium/amber `#C77A16`) mà gói khai là hard-code đúng hex.
2. **`shell()` thành app shell mới** — header (wordmark · repo switcher · badge trực · user menu) +
   sidebar 210px 7 mục + main 1240px. Bảy trang hiện có đi qua hàm này nên đổi một lần là xong vỏ.
3. **Dashboard dựng lại theo gói** — hàng đợi PR grid `52px 1.5fr 1.1fr 90px 170px 290px`, khối «đã
   trả về dev», card kiểm nhanh tài liệu rời, card lượt chấm gần đây, hai trạng thái (repo trống ·
   lỗi token).
4. **«Trông như SPA» bằng hai API trình duyệt, không framework** (PO chốt 01/09) — cross-document
   **View Transitions** (`@view-transition { navigation: auto }`) cho chuyển cảnh mượt giữa hai trang
   thật, cộng **Speculation Rules** prerender khi chuột vào link cho cảm giác tức thì. Khoảng 10 dòng,
   **không build step, không dependency, không state client**. Trình duyệt chưa hỗ trợ thì trang chạy
   y như cũ — thoái hoá sạch, không hỏng.
5. **Mục «Thư viện probe» trong sidebar hiện ĐANG XÂY** (PO chốt phương án B 01/09): dựng đủ 7 mục để
   không phải sửa sidebar lần hai; mục này mở ra một màn nói thẳng là chưa có, kèm lý do. Cửa cụt có
   nhãn thành thật hơn một sidebar lệch gói.

**KHÔNG làm trong change này** (ghi nợ có tên):
- **SPA thật** (router + state client + build step). Gói mô tả «đổi panel không reload», nhưng chính
  nó cũng nói được dựng bằng «server-rendered TS hiện tại». Giữ server-rendered và lấy *cảm giác* SPA
  bằng hai API trình duyệt — xem `design.md` quyết định 1.
- **Màn Thư viện probe thật** — README của gói ghi rõ *«API màn này backend làm sau khi chốt design»*.
  Là change tính năng riêng, không phải đồng bộ giao diện.
- **Panel Handoff 300px** — công cụ bàn giao của prototype, không phải tính năng sản phẩm. Bỏ có chủ đích.
- Dựng lại nội dung 6 màn còn lại (run · lịch sử · sổ cái · tin cậy · cấu hình · nguyên tắc) — chúng
  nhận vỏ mới ở change này, nội dung theo gói làm ở các đợt sau.

## Capabilities

### New Capabilities
- `giao-dien-ccs`: vỏ ứng dụng và hệ token theo gói design CCS — luật một-nguồn-token, cấu trúc shell
  dùng chung, và ranh giới giữa token hệ thống (Modernist) với semantic riêng của CheckMate.

### Modified Capabilities
<!-- không capability nào trong openspec/specs/ mô tả giao diện trước change này -->

## Luật R chạm tới

- **KHÔNG — cố ý.** Luật của change này sống ở: hằng token + `shell()` trong `apps/web/src/ui.ts` (có
  test khoá) · hành vi khai trong `openspec/specs/giao-dien-ccs/`. `specs/R*.md` là tài liệu tham
  khảo từ 01/09, change mới không đẻ thêm điều R*.

## Impact

- `apps/web/src/ui.ts` — hằng `CSS` (~90 dòng) và `shell()`; `homePage` dựng lại.
- `apps/web/src/ui-login.ts` — bỏ ghi chú «giữ palette cũ», trang tự đi theo token mới.
- `apps/web/src/ui-{docs,history,ledger,provider,repo,trust}.ts` — **không sửa nội dung**, chúng nhận
  vỏ mới qua `shell()`; chỉ gỡ chỗ nào hard-code màu cũ.
- `apps/web/src/server.ts` — route cho màn Thư viện probe (trạng thái đang xây).
- Chuyển cảnh: khối `@view-transition` trong hằng `CSS` + `<script type="speculationrules">` trong
  `shell()` — không thêm gói phụ thuộc nào.
- `test/` — lưới token (cấm hard-code hex ngoài bộ semantic) + lưới shell (7 mục sidebar).
- **Không đụng**: API JSON, schema dữ liệu, đường quyết định verdict, cổng merge.
