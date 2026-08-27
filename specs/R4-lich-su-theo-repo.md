# R4 — Nhiều repo và lịch sử chấm theo repo

CheckMate phục vụ nhiều repo cùng lúc. Cấu hình giữ **danh sách** repo cộng với repo đang chọn; mọi lượt
chấm được ghim vào repo sinh ra nó.

## Mô hình cấu hình

- **R4.1** — `config.repos[]` là nguồn sự thật; `config.repo_dang_chon` trỏ vào một phần tử trong đó.
- **R4.2** — `config.repo` chỉ là **view** (khung nhìn) của repo đang chọn. Trường này KHÔNG ĐƯỢC ghi
  xuống đĩa — ghi là có hai nguồn sự thật và chúng sẽ lệch nhau.
- **R4.3** — Cấu hình đời cũ chỉ có một `repo` PHẢI được nâng thành danh sách một phần tử mà không mất
  thiết lập nào.
- **R4.4** — `repo_dang_chon` trỏ vào repo không còn trong danh sách thì rơi về phần tử đầu, không được
  để cấu hình ở trạng thái trỏ hụt.

## Kết nối repo qua token

- **R4.5** — Danh sách repo để chọn PHẢI lấy từ chính GitHub token đang cấu hình, không bắt người dùng
  gõ tay `owner/repo`.
- **R4.6** — Clone repo bằng token thì sau khi clone xong PHẢI gỡ token khỏi remote URL. Token nằm lại
  trong `.git/config` là token rò ra đĩa.
- **R4.7** — Gỡ repo khỏi danh sách KHÔNG ĐƯỢC xoá clone trên đĩa và KHÔNG ĐƯỢC xoá lịch sử chấm của nó.

## Lịch sử chấm

- **R4.8** — Mỗi lượt chấm PHẢI mang trường `repo` (dạng `owner/repo`) được gán tại thời điểm khởi chạy.
- **R4.9** — Lọc theo repo PHẢI tách bạch: lượt chấm của repo A không được lọt vào lịch sử repo B, và
  lượt **chưa gắn repo** không được lọt vào lịch sử của bất kỳ repo cụ thể nào.
- **R4.10** — Lọc `verdict=loi` bắt theo **trạng thái tiến trình** (`trangThai === 'loi'`), không theo kết
  quả chấm — lượt chết giữa chừng không có verdict nhưng vẫn phải tìm lại được.
- **R4.11** — Lọc theo nhà cung cấp dựa vào **tiền tố** của chuỗi model đã ghim (`claude-cli/…`), không
  dựa vào tên model.
- **R4.12** — Nhiều bộ lọc cùng lúc kết hợp theo kiểu VÀ.
- **R4.13** — Model không mang tiền tố nhà cung cấp thì để trống cột nguồn, KHÔNG được đoán bừa.

## Hiển thị

- **R4.14** — Mọi chuỗi do người ngoài viết (tiêu đề PR, tên tác giả, tên repo) PHẢI được escape trước
  khi ghép vào HTML.
- **R4.15** — Khoá/token hiển thị lại trên giao diện PHẢI bị che: chỉ nêu độ dài và vài ký tự đầu.
