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

## Luật chạm tới

<!-- ⛔ Ô BẮT BUỘC. Luật sống ở openspec/specs/<capability>/ (delta spec của change), hằng + validate
     trong engine (có test khoá), checkmate.yml, và sáu ⛔C của CLAUDE.md. Trả lời bằng một hoặc nhiều:
       capability › requirement — change ADDED/MODIFIED/REMOVED requirement nào (khớp specs/ của change)
       ⛔C<n>                   — change chạm bất biến nào của CLAUDE.md (chỉ nêu; không đổi được ở đây)
       hàng docs/r-rules-map.md — change trả nhà cho điều `pending` nào (change backfill)
       KHÔNG — cố ý            — kèm một câu vì sao change này không đổi luật nào
     Bỏ trống vẫn là done-gate chưa ✓: ô này tồn tại để không ai đổi luật một chỗ mà quên chỗ kia. -->
- **Luật chạm tới:** <capability › requirement | ⛔C<n> | hàng bảng tra | KHÔNG — vì sao>

## Impact

<!-- Code/API/phụ thuộc bị ảnh hưởng. Trỏ file thật: apps/web/src/..., packages/harness/src/... -->
