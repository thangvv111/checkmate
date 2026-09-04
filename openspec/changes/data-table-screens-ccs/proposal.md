## Why

Ba màn bảng — **Lịch sử chạy · Sổ cái · Tin cậy** — nhận vỏ mới ở `dong-bo-giao-dien-ccs` nhưng nội dung
chưa dựng lại theo gói design CCS. Đối chiếu gói (`design-ccs/README.md`, mục 4 · 5 · 6) với code, đo được
bốn chỗ lệch, và **một trong bốn cái là lỗi đọc sai dữ liệu chứ không phải lỗi thẩm mỹ**:

1. **Bảng Tin cậy sắp SAI TRỤC.** Gói: *«Bảng sắp theo tỉ lệ PASS giảm dần (cột Tỉ lệ PASS =
   pass/tổng verdict)»*. Code (`trust.ts:57`) sắp theo `b.soVerdict - a.soVerdict` — tức **số verdict**,
   và **không có cột tỉ lệ PASS nào cả**. Người chấm nhiều pull request nhất trồi lên đầu bảng; ai đọc
   lướt sẽ hiểu đó là người đáng chú ý nhất, trong khi bảng này sinh ra để nói **ai hay bị bắt lỗi**.
   Đây là chỗ duy nhất trong bốn cái làm người đọc rút ra một kết luận SAI về một con người.
2. **Lịch sử phân trang 25, gói chốt 8.** Gói ghi thẳng *«Phân trang thống nhất 8 dòng — con số chốt cho
   cả code»*. Và thiếu **bộ lọc ngày** (gói khai 6 bộ lọc, code có 5).
3. **Sổ cái không có dòng tổng.** Gói: *«dòng tổng đặt ở ĐẦU trang và tính trên phần đã lọc … nền surface:
   n verdict · n PASS · n FAIL · tổng H·M·L · token»*. Code nhét vài con số vào câu phụ đề, **không có
   tổng H·M·L**, và bộ lọc repo thiếu lựa chọn **«tài liệu rời»**.
4. **Ba bảng bày định danh artifact theo ba kiểu khác nhau.** Gói khai một khuôn dùng chung: *tên đậm +
   dòng phụ mono `repo#PR @ SHA`*. Code cho `repo` và `commit` thành **cột riêng** ở cả Lịch sử lẫn Sổ
   cái, nên bảng rộng ra và mắt phải ghép ba cột mới biết một hàng nói về cái gì.

## What Changes

1. **Tin cậy — sắp theo tỉ lệ PASS giảm dần, và bày tỉ lệ ấy thành cột.** Thêm `tiLePass` vào
   `AuthorProfile` (tính từ sổ cái, không thêm nguồn dữ liệu mới). Cột theo gói: tác giả · verdict · PR ·
   **tỉ lệ PASS** · PASS/FAIL · PASS vòng đầu · streak PASS · **high bị bắt** (đỏ).
2. **Lịch sử — phân trang 8**, thêm **bộ lọc ngày**, và gộp `repo`+`SHA` thành dòng phụ của cột artifact.
3. **Sổ cái — dòng tổng nền surface ở ĐẦU trang**, tính trên phần đã lọc, có đủ `n verdict · n PASS ·
   n FAIL · tổng H·M·L · token`. Bộ lọc repo thêm lựa chọn **«tài liệu rời»**.
4. **Một khuôn định danh artifact dùng chung cho cả ba bảng** — hàm thuần, một chỗ sửa.

**KHÔNG làm trong change này:**
- Không đổi dữ liệu trên đĩa. `tiLePass` là **phép chia lúc đọc**, không phải cột mới trong sổ.
- Không đụng màn Cấu hình và màn Nguyên tắc — hai change sau.
- Không thêm bộ lọc nào ngoài hai cái gói khai (ngày ở Lịch sử · tài liệu rời ở Sổ cái).

## Capabilities

### New Capabilities
- `data-table-screens`: ba màn bảng đọc từ sổ — trục sắp xếp phải khớp câu hỏi màn ấy trả lời, con số
  tổng phải tính trên phần ĐÃ LỌC, và định danh artifact có một khuôn dùng chung.

### Modified Capabilities
<!-- không capability nào hiện mô tả ba màn này -->

## Luật chạm tới

- **Luật chạm tới:** `data-table-screens › ba requirement ADDED` (capability mới). Không chạm ⛔C nào:
  change không đụng bí mật, không đụng cổng, không đụng đường verdict, không đổi hình dạng dữ liệu.

## Impact

- `apps/web/src/trust.ts` — `AuthorProfile.tiLePass` + đổi trục sắp xếp.
- `apps/web/src/ui-trust.ts` — cột mới, bỏ cột gộp.
- `apps/web/src/ui-history.ts` — `MOI_TRANG` 25 → 8; bộ lọc ngày; cột artifact gộp repo + SHA.
- `apps/web/src/ui-ledger.ts` — dòng tổng ở đầu; lựa chọn «tài liệu rời»; cột artifact gộp.
- `apps/web/src/ui.ts` — hàm thuần dựng định danh artifact dùng chung.
- `apps/web/src/server.ts` — nhận tham số lọc ngày.
- `checkmate.yml` — khai export mới.
- **Không đụng**: schema SQLite, sổ cái, cổng merge, đường quyết định verdict.
