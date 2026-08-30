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

- **R4.5** — Người dùng KHÔNG phải gõ tay `owner/repo`: đường dẫn repo lấy từ URL họ dán vào, còn nhánh
  gốc lấy từ nhánh mặc định GitHub trả về. Gõ tay là đường sinh lỗi chính tả rồi báo "không thấy repo".
- **R4.6** — Clone repo bằng token thì sau khi clone xong PHẢI gỡ token khỏi remote URL. Token nằm lại
  trong `.git/config` là token rò ra đĩa.
- **R4.7** — Gỡ repo khỏi danh sách KHÔNG ĐƯỢC xoá clone trên đĩa và KHÔNG ĐƯỢC xoá lịch sử chấm của nó.

## Token theo TỪNG repo

Một token dùng chung cho mọi repo là mô hình sai với thực tế: mỗi repo thuộc một tổ chức khác nhau, cấp
quyền khác nhau, và người vận hành hiếm khi có một chìa mở được tất cả. Chìa chung còn nghĩa là mất một
chìa thì mất cả chùm.

- **R4.18** — Token GitHub gắn với TỪNG repo. Mọi lời gọi API và mọi lệnh git nhắm vào một repo PHẢI đi
  bằng token của chính repo đó, kể cả khi nhiều repo cùng chạy song song trong một tiến trình.
- **R4.19** — Token KHÔNG ĐƯỢC nằm trong `config.json`. Nơi lưu là kho bí mật riêng quyền 600 (R9.13).
- **R4.20** — Thứ tự lấy token cho một repo: token riêng của repo → biến môi trường `GITHUB_TOKEN` (đường
  vận hành của chủ máy, dùng chung cho repo chưa có chìa riêng) → `gh` CLI của máy. Hết cả ba thì lỗi
  PHẢI nêu ĐÚNG repo nào đang thiếu chìa, không được báo chung chung.
- **R4.21** — Cấu hình đời cũ có `github_token` dùng chung PHẢI được di trú tự động: token cũ trở thành
  token riêng của MỌI repo đang có trong danh sách, rồi bị xoá khỏi `config.json`. Di trú không được làm
  mất kết nối của repo nào, và chạy lại lần hai không được đổi gì thêm.
- **R4.22** — Thêm repo đi theo bốn bước, bước sau chỉ mở khi bước trước đã qua: (1) dán URL repo,
  (2) nhập token, (3) kiểm kết nối, (4) chọn nhánh gốc rồi clone.
- **R4.23** — Cổng kiểm kết nối PHẢI là một lời gọi THẬT `GET /repos/{owner}/{repo}` bằng chính token vừa
  nhập, và phải phân biệt được ba kết cục bằng ba lời khác nhau: token sai hoặc hết hạn (401), token đúng
  nhưng không thấy repo (404 — repo riêng tư mà chìa thiếu quyền, hoặc URL gõ sai), và trục trặc
  mạng/dịch vụ. Gộp cả ba thành "kết nối thất bại" là đẩy người dùng đi mò.
- **R4.24** — Nhánh gốc PHẢI được gợi ý từ `default_branch` mà bước kiểm trả về; người dùng đổi được sang
  nhánh khác nhưng không phải gõ từ con số không.
- **R4.25** — Repo có trong danh sách nhưng không lấy được token theo R4.20 PHẢI mang trạng thái **thiếu
  token** và KHÔNG được đem đi chấm. Khởi chạy rồi chết ở giữa là đốt thời gian người dùng và để lại một
  lượt hỏng trong lịch sử.
- **R4.26** — Không route nào được trả token về, kể cả đã che (R9.17). Trạng thái token của một repo lộ ra
  ngoài chỉ là giá trị có/không.
- **R4.27** — Gỡ repo khỏi danh sách PHẢI xoá token riêng của nó khỏi kho bí mật. Khác R4.7 ở chỗ: clone
  và lịch sử thì giữ lại, chìa khoá thì không — chìa của repo đã gỡ nằm lại là rác có hại.
- **R4.28** — Lệnh `git fetch` kéo PR về PHẢI mang chìa của repo trong URL của CHÍNH lệnh đó (dùng một
  lần, không ghi vào `.git/config`). Remote đã bị gỡ token theo R4.6, nên fetch qua `origin` sẽ đứng chờ
  credential ở repo riêng tư — hỏng này chỉ lộ ra ở lượt chấm, sau khi người dùng đã thấy "kết nối thành
  công" ở bước thêm repo.
- **R4.29** — Mọi văn bản lỗi đi ra ngoài (log, sự kiện run, màn hình) PHẢI được gột token trước: git
  nhắc lại nguyên URL trong lời kêu của nó, và URL đó đang mang chìa.

## Lịch sử chấm

- **R4.8** — Mỗi lượt chấm PHẢI mang trường `repo` (dạng `owner/repo`) được gán tại thời điểm khởi chạy.
- **R4.9** — Lọc theo repo PHẢI tách bạch: lượt chấm của repo A không được lọt vào lịch sử repo B, và
  lượt **chưa gắn repo** không được lọt vào lịch sử của bất kỳ repo cụ thể nào.
- **R4.10** — Lọc `verdict=loi` bắt theo **trạng thái tiến trình** (`trangThai === 'loi'`), không theo kết
  quả chấm — lượt chết giữa chừng không có verdict nhưng vẫn phải tìm lại được.
- **R4.11** — Lọc theo nhà cung cấp dựa vào **tiền tố** của chuỗi model đã ghim (`claude-cli/…`), không
  dựa vào tên model.
- **R4.12** — Nhiều bộ lọc cùng lúc kết hợp theo kiểu VÀ.
- **R4.16** — Sổ cái verdict cũng là một dạng lịch sử: PHẢI có cột repo và lọc được theo repo, và con
  số tổng ở đầu trang PHẢI tính trên phần đã lọc.
- **R4.17** — Thang tin cậy tác giả PHẢI lọc theo repo **trước khi** tính hồ sơ. Track record của một
  người ở repo này không nói thay cho repo khác. Không lọc thì trang phải nói rõ là đang gộp mọi repo.
- **R4.13** — Model không mang tiền tố nhà cung cấp thì để trống cột nguồn, KHÔNG được đoán bừa.

## Hiển thị

- **R4.14** — Mọi chuỗi do người ngoài viết (tiêu đề PR, tên tác giả, tên repo) PHẢI được escape trước
  khi ghép vào HTML.
- **R4.15** — Khoá/token hiển thị lại trên giao diện PHẢI bị che. Từ R4.26, che nghĩa là KHÔNG lộ ký
  tự nào của chìa — chỉ nêu độ dài. Bản trước cho lộ vài ký tự đầu; điều đó bị R4.26 siết lại, vì mấy
  ký tự ấy không giúp phân biệt hai token nhưng vẫn là một phần chìa thật nằm trên ảnh chụp màn hình.
