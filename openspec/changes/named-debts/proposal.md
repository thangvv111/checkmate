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

## Luật R chạm tới

KHÔNG — cố ý. Change này không đổi hành vi nào; luật của từng việc sống ở change riêng khi việc đó được mở.
