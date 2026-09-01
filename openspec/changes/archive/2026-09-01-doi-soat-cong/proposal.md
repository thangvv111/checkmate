## Why

Sổ hành động cổng đang **trống ở đúng những lần merge thật**. Số đo trên prod 01/09:

- **66 run có `pr_so` nhưng không một hành động cổng nào được ghi** (`cong_hanh_dong` rỗng).
- `so_cong` vỏn vẹn **4 hàng**, hàng gần nhất 30/08 — trong khi ngày 31/08 có **8 PR được merge**
  (#12–#19). Không PR nào trong số đó để lại một dòng nào trong sổ.
- Ba hàng cũ nhất còn mang tên `vinac` / `ubuntu` (tài khoản hệ điều hành) — di tích đúng cái bệnh
  [R11](../../../specs/R11-danh-tinh-va-phien.md) sinh ra để chữa.

Nguyên nhân: những lần merge đó đi bằng `gh pr merge` trên GitHub, **không qua** `/api/runs/:id/merge`
— đường duy nhất bắt **tick từng finding medium/low** (server đối chiếu tập id với verdict, thiếu là
422) và ghi sổ kèm danh tính người bấm.

Hậu quả kép, và cái thứ hai nặng hơn:
1. Trạng thái trên CheckMate **sai sự thật**: run treo vĩnh viễn ở «chưa thao tác» trong khi PR đã
   đóng từ lâu.
2. Cổng maker–checker mà **sổ kiểm toán trống ở đúng những lần merge thật** thì nó không còn trả lời
   được câu hỏi nó sinh ra để trả lời: *ai đã bấm, và đã chấp nhận cảnh báo nào*.

Một cổng không thể ngăn người ta merge ngoài nó — GitHub luôn có nút merge. Nhưng nó **phải biết
chuyện đó đã xảy ra** và ghi lại đúng bản chất, thay vì im lặng.

## What Changes

- **Đối soát trạng thái PR**: với mỗi run có `pr_so` mà chưa có hành động cổng, hỏi GitHub xem PR đó
  giờ ra sao. PR đã merge/đóng ⇒ ghi vào sổ cổng một hàng **đánh dấu NGOÀI CỔNG**.
- Hàng ngoài-cổng phải nói rõ ba điều: (a) merge/đóng xảy ra **ngoài** CheckMate, (b) **không có xác
  nhận finding nào** — không được để trống rồi đọc nhầm thành «không có finding», (c) verdict lúc đó
  là gì và **còn bao nhiêu medium/low chưa ai tick**.
- Cột mới `ngoai_cong` trên `so_cong` (thêm cột, KHÔNG dựng lại bảng — `CHECK` và trigger chỉ-ghi-thêm
  giữ nguyên).
- Cập nhật `run.cong_*` để màn hình nói đúng trạng thái.
- Đối soát chạy **nhàn**: gom theo PR (không theo run), một lời gọi GitHub cho mỗi PR, và bỏ qua run
  đã có hàng sổ (idempotent — chạy lại không đẻ hàng trùng).

## Capabilities

### New Capabilities
- `doi-soat-cong`: phát hiện hành động cổng xảy ra NGOÀI CheckMate và ghi vào sổ kiểm toán đúng bản
  chất, kể cả phần «không ai xác nhận finding nào».

### Modified Capabilities
<!-- không có capability nào trong openspec/specs/ mô tả cổng merge trước change này -->

## Luật R chạm tới

- **Luật R chạm tới:** CÓ — thêm R6.20–R6.24 vào `specs/R6-verdict-va-cong-merge.md`: sổ cổng phải
  phản ánh cả hành động xảy ra ngoài cổng · hàng ngoài-cổng KHÔNG được trông giống hàng qua-cổng ·
  cấm suy diễn «không tick = không có finding» · đối soát phải idempotent · thiếu quyền đọc GitHub thì
  im lặng bỏ qua chứ KHÔNG được ghi hàng sai.

## Impact

- `apps/web/src/kho/db.ts` — thêm cột `ngoai_cong` (ALTER TABLE ADD COLUMN; SQLite cho phép, không
  đụng `CHECK` lẫn trigger chỉ-ghi-thêm).
- `apps/web/src/kho/kho-socai.ts` — `MucSoCong` + `ghiSoCong`.
- `apps/web/src/cong.ts` — `ghiSo` nhận hàng ngoài-cổng.
- `apps/web/src/github.ts` — hàm đọc trạng thái PR (merged/closed/open).
- `apps/web/src/server.ts` — một pha đối soát trong chu kỳ chế độ trực.
- `checkmate.yml` — khai hàm mới.
- **Dữ liệu prod**: 66 run tồn đọng sẽ được đối soát ở lần chạy đầu — đây là mục đích, nhưng phải
  chạy được trên dữ liệu thật mà không hỏng sổ (xem Migration Plan).
