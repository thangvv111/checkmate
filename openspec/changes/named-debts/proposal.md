# Proposal — named-debts: nợ có tên sau các change đã archive

## Vì sao có change này

Cổng archive (CLAUDE.md, PO chốt 02/09): **không archive change còn ô chưa tick**. Trước đó, nợ sau-merge
được chép từ change này sang change kế tiếp («từ change trước») — cùng một việc bị mang vác qua ba change
mà không có chủ. PO chốt 02/09: **mục chưa tick tách thành change riêng, không để trong file sẽ archive.**

## Change này là gì

Một change **GIỮ CHỖ**: mỗi mục là một việc đã được gọi tên, có nguồn gốc, chưa ai làm.

Luật ra vào:
- Mục chỉ **RỜI** danh sách bằng một trong ba đường PO chốt: **thành change riêng** (schema `checkmate`) ·
  **làm nốt** trong một change đang mở có lý do · **bỏ hẳn** kèm cái mất. Tick ô = ghi đường nào.
- **KHÔNG code** trong change này. Nó không có commit sản phẩm, không có specs/design.
- Archive khi danh sách rỗng.

## Danh sách và nguồn gốc

| # | Việc | Từ change |
|---|---|---|
| 1 | Bộ chia spec cho tài liệu **không phải văn bản có tiêu đề**: OpenAPI · JSON Schema · Gherkin `.feature` | `stop-forcing-target-repo-shape` |
| 2 | **Mức 3** — chạy tiếp lượt dở sau khi server dừng (cần luật ghim SHA trước) | `man-run-va-cong-merge` |
| 3 | **Webhook GitHub** realtime có chữ ký — cửa vào không xác thực đầu tiên của sản phẩm | `man-run-va-cong-merge` |
| 4 | **Bỏ Basic Auth** ở nginx — gói ba việc, rào `/login` đi trước | `man-run-va-cong-merge` |
| 5 | Dựng lại nội dung **5 màn còn lại** theo gói design CCS | `dong-bo-giao-dien-ccs` |
| 10 | `isPrRunning` ở `/api/runs` cùng lỗi với #9 — nửa route không gọi được (PO 03/09: làm sau `verdict-contract`) | soi trong `rerun-guard-testable` |
| 6 | ✅ RỜI 03/09 — Repo đích **khai đè** thư mục tài liệu quy trình (router) và danh sách tự dò nguồn spec qua `checkmate.yml`; gỡ mặc định chỉ khi cửa khai đã có | `product-independent-of-openspec` |
| 8 | Đổi tên chế độ `demo` → **chỉ-đọc** (code + thông điệp + unit systemd prod) — spec đã gọi đúng tên, code giữ giá trị cũ để không đụng prod | `merge-gate` |
| 9 | Tách điều kiện «chấm lại cùng commit» của `/api/runs` thành hàm thuần, để scenario R6.10 khoá được cả nửa route | `merge-gate` |
| 7 | **Xoá / archive một repo khỏi CheckMate** — ưu tiên thấp; «gỡ khỏi danh sách» đã có luật cũ (R4.7, R4.27), «archive» giữ lịch sử và mở lại được thì chưa | PO 02/09 |

## Luật R chạm tới

KHÔNG — cố ý. Change này không đổi hành vi nào; luật của từng việc sống ở change riêng khi việc đó được mở.
