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

<!-- ⛔ Ô BẮT BUỘC. Luật đã đổi (PO chốt 01/09, THAY phương án A 31/08): specs/R*.md nay là TÀI
     LIỆU THAM KHẢO, change mới KHÔNG đẻ thêm điều R*. Chọn MỘT:
       KHÔNG — cố ý (câu trả lời THƯỜNG ĐÚNG), kèm nơi luật của change này thật sự sống: hằng +
               validate trong engine (có test khoá) · checkmate.yml · openspec/specs/<capability>/
       CÓ    — chỉ khi change cố ý sửa văn bản specs/R*.md; liệt kê file sẽ sửa
     Bỏ trống vẫn là done-gate chưa ✓: ô này tồn tại để không ai đổi luật một chỗ mà quên chỗ kia. -->
- **Luật R chạm tới:** <CÓ — mã luật + file | KHÔNG — vì sao>

## Impact

<!-- Code/API/phụ thuộc bị ảnh hưởng. Trỏ file thật: apps/web/src/..., packages/harness/src/... -->
