## Context

<!-- Bối cảnh, hiện trạng, ràng buộc. Change đơn giản: 2–3 câu là đủ. -->

## Goals / Non-Goals

**Goals**
-

**Non-Goals**
<!-- Cố ý KHÔNG làm gì trong change này -->
-

## Decisions

<!-- Lựa chọn kỹ thuật + lý do (vì sao X thay vì Y), nêu phương án đã cân nhắc.
     Không có quyết định đáng kể → ghi «Không có quyết định thiết kế đáng kể» + một câu lý do. -->

## Architecture

<!-- Chạm tầng nào:
     apps/web/src         — server Express + UI dựng chuỗi HTML + cấu hình + cổng
     packages/harness/src — engine: target → sinh probe → sandbox 2 nhánh → phân loại máy → verdict
     packages/shared/src  — kiểu dùng chung
     Nêu rõ luồng dữ liệu đi qua đâu. -->

## Data Model

<!-- Hình dạng dữ liệu mới/đổi trên đĩa và trong SQLite; ai đọc, ai ghi, ai dọn.
     ⛔ Ba ràng buộc bắt buộc soi:
     1. Dữ liệu prod (sổ cái, probes-lib/, web-runs/, runs/, config.json, .secrets.json,
        .ncc-verify.json) là TÀI SẢN — đổi hình dạng phải có đường DI TRÚ tự động, ghi sổ mới
        TRƯỚC rồi mới xoá bản cũ (R10.13).
     2. Ghi file dùng chung: atomic + khoá liên tiến trình khi cần (R8, R10.12) — hai lượt chấm
        song song trên prod là trạng thái BÌNH THƯỜNG. Không gọi model trong khoá (R10.11).
     3. Cache đọc file phải tôn trọng R9.14: sửa file bằng tay PHẢI có hiệu lực ở lượt đọc kế tiếp.
     Không chạm dữ liệu → N/A kèm lý do. -->

## Risks / Trade-offs

<!-- [Rủi ro] → Giảm thiểu -->
-

## Migration Plan

<!-- Dữ liệu đời cũ lên đời mới thế nào. Đường lùi khi hỏng. Không cần migration → N/A + lý do. -->

## Open Questions

<!-- Còn treo gì, ai quyết -->
-
