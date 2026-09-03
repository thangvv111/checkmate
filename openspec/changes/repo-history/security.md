# Security — repo-history

Backfill nhóm lớn nhất còn lại. Rủi ro chính không phải «code mới sai» — change này gần như không thêm hành
vi — mà là **khai một luật là đã có trong khi nó chưa được ai giữ**. Nhóm R4 lại là nhóm mang nhiều luật
⛔C3 nhất sau `identity-session`, nên soi kỹ phần token.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Token gắn **từng repo**, không nằm trong `config.json` (R4.18, R4.19). Cấu hình là thứ người ta
  chép đi chép lại và dán vào phiếu lỗi — token ở đó là token đã ra ngoài. Có ca sẵn.
- ✅ S1.2 Clone xong gỡ token khỏi remote URL (R4.6); `git fetch` mang chìa trong URL của **chính lệnh đó**,
  dùng một lần (R4.28). Token trong `.git/config` là token nằm trên đĩa ở chỗ không ai nghĩ tới.
- ✅ S1.3 Mọi văn bản lỗi ra ngoài được gột token (R4.29) — lời kêu của `git` nhắc lại nguyên URL, và URL ấy
  đang mang chìa. Có ca sẵn ở `boc-model.test.ts` và `token-repo.test.ts`.
- ✅ S1.4 Gỡ repo thì xoá token riêng (R4.27) — chìa không còn chủ là chìa mồ côi, và nó vẫn mở được repo.
- ✅ S1.5 `R4.26` («không route nào trả token về, kể cả đã che») **không viết lại ở đây**: nó đã được
  `response-secret-guard` cưỡng chế lúc chạy, phủ cả JSON, HTML và luồng sự kiện. Con trỏ chứ không bản sao
  — hai chỗ nói cùng một điều thì hai chỗ sẽ lệch.
- ✅ S1.6 Khoá hiển thị lại bị che, không bao giờ lộ trọn (R4.15). Có ca sẵn.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính, không route mới. Trang thang tin cậy đã đứng sau gác phiên.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge.
- ⚠️ S3.2 `R4.17` chạm gián tiếp vào cổng: thang tin cậy là thứ người duyệt nhìn trước khi bấm. Một hồ sơ
  **gộp mọi repo** mà không nói ra làm người duyệt tin vào một con số không có nghĩa — đó là ảnh hưởng lên
  quyết định merge, dù không phải cơ chế cổng. Vì thế vế «nói ra» có ca riêng và có mutation riêng.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Tiêu đề pull request, tên tác giả, tên repo đến từ **GitHub** — tức từ người hệ này không kiểm
  soát. Chúng được thoát trước khi vào HTML (R4.14); có ca sẵn. Một tiêu đề mang thẻ script là đường tấn
  công có sẵn, không phải giả thiết.
- ✅ S4.2 Tên repo do người dùng dán được nhận dạng bằng hàm thuần, và **rác thì trả rỗng** chứ không dựng
  ra một repo không có thật (R4.5) — không đoán bừa là fail-closed đúng chỗ.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích ở chỗ mới.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Gỡ repo MUST NOT xoá clone và lịch sử (R4.7). «Thôi theo dõi» khác «xoá dấu vết»: người gỡ nhầm
  phải thêm lại được mà không mất gì, và lịch sử chấm là bằng chứng — xoá nó là xoá thứ dùng để đối chất.
- ✅ S6.2 Tách hàm ở `config.ts` **không** đổi hình dạng dữ liệu; hàm trả đúng cấu trúc hiện có.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 `repo_dang_chon` trỏ repo đã gỡ → rơi về phần tử đầu, KHÔNG ném (R4.4). Đây là fail-safe đúng
  hướng: trạng thái ấy là bình thường, và làm màn hình chết vì nó là báo sai bản chất.
- ✅ S7.2 Repo thiếu chìa → chặn **ngay**, không khởi chạy rồi chết giữa chừng (R4.25). Người dùng mất vài
  phút chờ một lượt chấm sẽ hỏng là thứ tránh được bằng một phép kiểm ở đầu.
- ✅ S7.3 Lọc `verdict=loi` bắt theo **trạng thái tiến trình**, không theo kết quả chấm (R4.10) — gộp hai
  thứ ấy làm người tìm sự cố hạ tầng lẫn vào người tìm pull request tồi.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **lấy được token của một repo**, hoặc **thấy lịch sử của repo mình không có quyền**.

- ✅ S8.1 (a) đọc token từ `config.json` → token không nằm ở đó (R4.19), có ca.
- ✅ S8.2 (b) đọc token từ `.git/config` của clone → gỡ khỏi remote sau clone (R4.6).
- ✅ S8.3 (c) đọc token từ thông điệp lỗi git → gột (R4.29), có ca.
- ✅ S8.4 (d) gọi một route để lấy token → `response-secret-guard` chặn lúc chạy (S1.5).
- ✅ S8.5 (e) dùng chìa của repo A cho repo B → chìa lấy theo repo (R4.18), có ca.
- ✅ S8.6 (f) giữ chìa sau khi repo bị gỡ → xoá theo (R4.27), có ca.
- ⚠️ S8.7 (g) **xem lịch sử của repo mình không có quyền** → change này KHÔNG chặn. Lọc theo repo là lọc
  **hiển thị**, không phải phân quyền: bất kỳ ai đăng nhập được đều xem được lịch sử mọi repo trong danh
  sách. Đó là mô hình hiện tại (một máy chủ, một nhóm người dùng), không phải sơ suất của change — nhưng
  phải khai, vì một người đọc `R4.9` («lọc theo repo PHẢI tách bạch») dễ tưởng đó là ranh giới quyền.

## Notes

- Chỗ duy nhất chưa kín và đã khai: S8.7 — lọc theo repo là ranh giới **hiển thị**, không phải quyền. Nếu
  sau này cần phân quyền theo repo thì đó là change đổi luật, không phải backfill.
- S3.2 đáng để ý hơn vẻ ngoài: thang tin cậy không phải cơ chế cổng, nhưng nó là thứ người duyệt nhìn trước
  khi bấm merge. Vế «nói ra khi gộp» vì thế không phải chi tiết giao diện.
