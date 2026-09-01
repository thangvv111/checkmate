## Context

`so_cong` là sổ kiểm toán chỉ-ghi-thêm (trigger cấm SỬA và cấm XOÁ), cột `hanh_dong` có
`CHECK (hanh_dong IN ('merge','reject'))`. Hành động cổng chỉ được ghi khi đi qua
`/api/runs/:id/merge` hoặc `/api/runs/:id/tra-ve` — merge bằng `gh` trên GitHub không để lại dấu vết.

Đo trên prod 01/09: 66 run có `pr_so` mà `cong_hanh_dong` rỗng; sổ có 4 hàng, mới nhất 30/08.

## Goals / Non-Goals

**Goals**
- Sổ và màn hình nói đúng sự thật về những PR đã merge/đóng ngoài cổng.
- Phân biệt hàng ngoài-cổng với hàng qua-cổng ở mức DỮ LIỆU.
- Không đẻ hàng trùng, không bịa khi không đọc được trạng thái.

**Non-Goals**
- KHÔNG ngăn merge ngoài cổng (không làm được, và cũng không nên — GitHub luôn có nút merge).
- KHÔNG tick bù finding thay người: đối soát ghi «không có xác nhận nào», việc tick bù (nếu muốn) là
  hành động NGƯỜI làm sau, không phải máy suy diễn.
- KHÔNG sửa các hàng sổ cũ mang tên `vinac`/`ubuntu` — sổ chỉ ghi thêm; di tích đó là bằng chứng
  lịch sử, xoá đi mới là làm hỏng sổ.

## Decisions

**Q1: Thêm giá trị `hanh_dong` mới, hay thêm cột cờ?**
Chọn **thêm cột** `ngoai_cong INTEGER NOT NULL DEFAULT 0`. Thêm giá trị vào `CHECK` đòi dựng lại bảng
(SQLite không ALTER được CHECK): tạo bảng mới → copy → drop bảng cũ → rename → dựng lại trigger. Bảng
này có trigger CẤM XOÁ và đang giữ dữ liệu kiểm toán thật của prod — dựng lại nó là đúng thao tác
nguy hiểm nhất có thể làm với một sổ kiểm toán, để sửa một chuyện có cách rẻ hơn nhiều.
`ALTER TABLE ADD COLUMN` thì SQLite cho phép, không đụng `CHECK`, không đụng trigger, không copy hàng
nào. Đổi lại: hàng ngoài-cổng vẫn mang `hanh_dong='merge'` — đúng bản chất, vì **nó LÀ một merge**;
cái khác là nó không đi qua cổng, và đó chính là điều cột mới nói.

**Q2: Lấy trạng thái PR ở đâu?**
GitHub API `GET /repos/{owner}/{repo}/pulls/{so}` → `merged` (bool) + `state`. Gom **theo PR** chứ
không theo run: 66 run tồn đọng chỉ thuộc ~10 PR, tức ~10 lời gọi chứ không phải 66.

**Q3: Ai là «người» của hàng ngoài-cổng?**
Lấy `merged_by.login` của GitHub khi có; không có thì `'(ngoài cổng — không rõ)'`. TUYỆT ĐỐI không
mượn tên tài khoản CheckMate nào: hàng này ghi lại việc người khác làm ở nơi khác, gán bừa một cái
tên trong hệ mình là làm hỏng đúng câu hỏi «ai đã bấm» (R11.1).

**Q4: Chạy ở đâu, nhịp nào?**
Một pha riêng trong chu kỳ chế độ trực, chạy TRƯỚC pha quét PR, bọc `try` riêng — lỗi đối soát không
được làm dừng việc chấm (cùng nguyên tắc ba khối try riêng của R6.15).

## Architecture

- `apps/web/src/kho/db.ts` — thêm cột qua bước di trú có ghi `da_di_tru` (idempotent sẵn có).
- `apps/web/src/kho/kho-socai.ts` — `MucSoCong.ngoai_cong?: boolean`, `ghiSoCong` ghi cột mới;
  `runChuaCoHanhDongCong()` trả danh sách run cần đối soát.
- `apps/web/src/github.ts` — `trangThaiPr(cfg, so)` → `{ trang_thai: 'mo'|'merged'|'dong', nguoi_merge? }`.
- `apps/web/src/cong.ts` — `ghiSo` nhận `ngoai_cong` và dựng `chi_tiet` nói đủ ba điều (ngoài cổng ·
  không xác nhận nào · verdict + số medium/low chưa tick).
- `apps/web/src/server.ts` — `doiSoatCong(cfg)` gọi trong `setInterval` của chế độ trực.

## Data Model

- `so_cong` **thêm một cột**, không rebuild: `ngoai_cong INTEGER NOT NULL DEFAULT 0`. Hàng cũ mặc
  định 0 — đúng, vì chúng do người bấm trong CheckMate.
- `run.cong_hanh_dong / cong_luc / cong_nguoi / cong_chi_tiet` được cập nhật để màn hình nói đúng.
  Bảng `run` sửa được (R11.16 đã tính chuyện này: sổ mới là nguồn kiểm toán, `run` chỉ là bề mặt).
- Di trú ghi vào `da_di_tru` nên chạy lại không thêm cột hai lần.

## Risks / Trade-offs

- **[Hàng ngoài-cổng lọt vào thống kê «đã qua cổng»]** → mọi chỗ đếm/lọc phải xét `ngoai_cong`; test
  khoá ca này.
- **[Đối soát gọi GitHub mỗi chu kỳ tốn quota]** → chỉ gọi cho PR còn run chưa có hành động cổng;
  danh sách này cạn dần về 0 sau lần đầu.
- **[Chạy lần đầu trên prod ghi ~10 hàng cùng lúc]** → đúng mục đích; và vì idempotent nên chạy lại
  không đẻ thêm. Đường lùi: sổ chỉ-ghi-thêm nên KHÔNG xoá được — chấp nhận có ý thức, đây là lý do
  test idempotent phải xanh TRƯỚC khi deploy.

## Migration Plan

Bước di trú `so_cong_them_ngoai_cong` chạy tự động lúc mở DB, ghi `da_di_tru`. Cột mới có DEFAULT nên
hàng cũ hợp lệ ngay. Không có bước lùi cho dữ liệu đã ghi (sổ chỉ ghi thêm) — bù lại, mọi hàng đối
soát ghi ra đều **tự khai là do máy đối soát ghi**, nên người đọc phân biệt được với hàng người bấm.

## Open Questions

- Có nên cho phép người tick bù finding cho một PR đã merge ngoài cổng không? Chưa làm ở change này —
  cần nghĩ kỹ vì nó tạo ra một hành động cổng SAU khi merge đã xong, dễ đọc nhầm thành đã-kiểm-trước.
