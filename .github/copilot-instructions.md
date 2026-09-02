# CheckMate ♞ — hướng dẫn cho GitHub Copilot

Luật repo (luật cứng C1–C6, quy trình SDD bằng OpenSpec, điều kiện merge) nằm ở [AGENTS.md](../AGENTS.md)
— Copilot tự nạp `AGENTS.md` từ 08/2025 nên nội dung đó đã có sẵn trong context; file này chỉ để
đánh dấu cho các bề mặt Copilot cũ chưa hỗ trợ.

Ba điều quan trọng nhất, chép ra đây để không phụ thuộc việc đi theo liên kết:

- **Máy không bao giờ merge.** Tự động hoá được phép nói KHÔNG, không được phép nói CÓ.
- **Fail-closed.** Lỗi, thiếu dữ liệu, hết giờ → KHÔNG được thành PASS.
- **Trước khi mở PR:** `npx tsc --noEmit && npm test` (toàn bộ, không riêng file vừa sửa).
