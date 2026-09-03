# Test cases — repo-history

Requirement: R-1 «Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn» · R-2 «Vòng đời repo» ·
R-3 «Token gắn từng repo, không nằm trong cấu hình» · R-4 «Lịch sử gắn repo tại thời điểm chạy, lọc tách
bạch» · R-5 «Thang tin cậy lọc theo repo, không lọc thì nói ra» · R-6 «Chuỗi người ngoài viết phải thoát,
khoá hiển thị phải che».

**17 điều đã có ca** trong `token-repo` (24 ca) · `web-loc` (16) · `nhan-probe-log` (16) · `boc-model` —
bảng dưới đối chiếu, không lặp lại. Ca MỚI ở R-1, R-2, R-5 và hai mục của R-4.

## Đối chiếu: scenario ↔ ca đã có

### R-1 nhận dạng repo (R4.5)
- [ ] T1.1 «nhận URL đầy đủ trên thanh địa chỉ» ✓ có.
- [ ] T1.2 «nhận URL có đuôi .git, có nhánh, có dấu / thừa» ✓ có.
- [ ] T1.3 «nhận dạng git@ và dạng owner/repo gõ tay» ✓ có.
- [ ] T1.4 «rác thì trả rỗng chứ không dựng ra một repo không có thật» ✓ có.

### R-3 token theo repo
- [ ] T3.1 «chìa riêng của repo được lấy đúng, repo khác không thấy» ✓ có (R4.18).
- [ ] T3.2 «chìa riêng THẮNG token chung của môi trường» ✓ có (R4.20).
- [ ] T3.3 «gỡ repo thì chìa đi theo, các chìa khác còn nguyên» ✓ có (R4.27).
- [ ] T3.4 «token cũ thành chìa riêng của MỌI repo, rồi biến khỏi config» ✓ có (R4.19, R4.21).
- [ ] T3.5 «cấu hình ĐỜI CŨ chỉ có repo đơn vẫn được di trú» ✓ có (R4.3 — **không trích mã nhưng có ca**).
- [ ] T3.6 «lời kêu của git mang URL có token thì phải bị che trước khi ra ngoài» ✓ có (R4.29).
- [ ] T3.7 «404 khi CHƯA có token thì không đổ lỗi cho quyền» ✓ có (R4.23).

### R-4 lọc lịch sử
- [ ] T4.1 «lọc theo repo tách bạch được lịch sử của từng repo» ✓ có (R4.9).
- [ ] T4.2 «lượt chưa gắn repo KHÔNG lọt vào lịch sử của một repo» ✓ có (R4.9).
- [ ] T4.3 «lọc verdict=loi bắt theo trạng thái tiến trình» ✓ có (R4.10).
- [ ] T4.4 «lọc theo nhà cung cấp dựa vào tiền tố model» ✓ có (R4.11).
- [ ] T4.5 «các bộ lọc chồng nhau theo kiểu VÀ» ✓ có (R4.12).
- [ ] T4.6 «model không mang tiền tố thì để trống nguồn chứ không đoán» ✓ có (R4.13).

### R-6 thoát chuỗi và che khoá
- [ ] T6.1 «escHtml chặn được thẻ script nhét qua tiêu đề PR» ✓ có (R4.14).
- [ ] T6.2 «maskKey không bao giờ để lộ trọn khoá» / «nói rõ khi chưa có khoá» ✓ có (R4.15).

## Ca MỚI

### R-1 hình dạng cấu hình (R4.1 · R4.2 · R4.3 · R4.4)
- [ ] T7.1 Cấu hình có `repos[]` → danh sách ấy là nguồn; `repo` là view khớp `repo_dang_chon`.
- [ ] T7.2 Cấu hình đời cũ chỉ có `repo` → nâng thành danh sách một phần tử.
- [ ] T7.3 `repo_dang_chon` trỏ repo đã bị gỡ → rơi về phần tử ĐẦU; **không ném, không để trống**.
      *Một repo bị gỡ mà cấu hình còn trỏ tới là trạng thái bình thường; làm màn hình chết vì nó là báo sai
      bản chất.*
- [ ] T7.4 `repos[]` rỗng/khuyết → vẫn ra được cấu hình dùng được, không ném.

### R-5 thang tin cậy (R4.17) — HAI vế, hai ca
- [ ] T8.1 [vế lọc] Sổ cái nhiều repo, lọc theo repo A → hồ sơ chỉ tính từ verdict của A.
- [ ] T8.2 [vế nói ra] Không lọc → trang chứa câu nói rõ đang **gộp mọi repo**.
      *Vế này chỉ là một câu trên màn hình — KHÔNG có gì gãy khi nó biến mất. Một lần dọn giao diện là đủ
      để mất nó, và sau đó trang gộp mọi repo mà không ai biết.*

### R-2 vòng đời repo (R4.7 · R4.22 · R4.25)
- [ ] T9.1 Gỡ repo → token riêng bị xoá; clone và lịch sử KHÔNG bị đụng.
- [ ] T9.2 Repo thiếu chìa → chặn NGAY, và phép chặn đứng **trước** khi khởi chạy.
- [ ] T9.3 Bốn bước thêm repo có mặt và theo đúng thứ tự.

### R-4 lịch sử (R4.8 · R4.16)
- [ ] T10.1 Lượt chấm mang trường `repo` gán tại thời điểm chạy.
- [ ] T10.2 Sổ cái verdict lọc được theo repo như lịch sử lượt chấm.

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [ ] T11.1 Bỏ nhánh «`repo_dang_chon` không hợp lệ → phần tử đầu» → T7.3 ĐỎ.
- [ ] T11.2 Bỏ câu «Đang gộp mọi repo» → T8.2 ĐỎ **và T8.1 vẫn xanh** — đó là điểm của hai ca riêng.
- [ ] T11.3 Bỏ lọc repo trước khi tính hồ sơ → T8.1 ĐỎ.
- [ ] T11.4 Dời phép chặn «repo thiếu chìa» xuống sau khi khởi chạy → T9.2 ĐỎ.

## Trục nhạy cảm

- [ ] T_bimat — T3.x: token không nằm trong cấu hình, không lọt vào remote URL, không ra văn bản lỗi.
      `R4.26` (không route nào trả token) thuộc `response-secret-guard`, đã cưỡng chế lúc chạy.
- [ ] T_failclosed — T7.3 · T7.4 · T9.2: cấu hình méo thì rơi về giá trị dùng được chứ không ném; repo
      thiếu chìa thì chặn trước chứ không chạy rồi chết.
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [ ] T_khongtincay — T6.1: tiêu đề pull request đến từ GitHub, tức từ người hệ này không kiểm soát.
- [ ] T_hopdong — hàm mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T12.1 Không có — mọi thứ ở change này kiểm được bằng máy. *(Khác `response-secret-guard`, nơi gác chạy
      trên mọi response nên phải mở giao diện thật; ở đây không có cơ chế mới nào chạy xuyên suốt.)*
