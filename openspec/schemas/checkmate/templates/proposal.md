## Why

<!-- Vấn đề/cơ hội, 1–2 câu. Vì sao bây giờ? -->

## What Changes

<!-- Thay đổi cụ thể. Đánh dấu **BREAKING** khi phá tương thích. -->

## Capabilities

### New Capabilities
<!-- Capability mới, kebab-case. Mỗi cái tạo specs/<name>/spec.md -->
- `<name>`: <capability này phủ cái gì>

### Modified Capabilities
<!-- Capability đã có mà YÊU CẦU đổi (không phải chỉ đổi hiện thực).
     Tra tên có thật ở openspec/specs/. Không đổi yêu cầu thì để trống. -->
- `<existing-name>`: <yêu cầu nào đang đổi>

## Luật R chạm tới

<!-- ⛔ Ô BẮT BUỘC (PO chốt 31/08, phương án A). Luật hành vi sống ở specs/R*.md của repo và là
     ĐẦU VÀO MÁY ĐỌC: engine nạp specs/ để sinh probe, R1.19 so specs/ hai nhánh để phát hiện
     «luật chỉ có ở nhánh PR». Chọn MỘT:
       CÓ    — liệt kê mã luật dự kiến (vd R10.25–R10.28) + file specs/R*.md sẽ sửa
       KHÔNG — kèm lý do (vd: chỉ đổi cách hiện thực, hành vi khai trong spec giữ nguyên)
     Bỏ trống là done-gate chưa ✓: cổng sẽ thấy code đổi mà luật không đổi (hoặc ngược lại) và
     biến chuyện đó thành finding. -->
- **Luật R chạm tới:** <CÓ — mã luật + file | KHÔNG — vì sao>

## Impact

<!-- Code/API/phụ thuộc bị ảnh hưởng. Trỏ file thật: apps/web/src/..., packages/harness/src/... -->
