# Security — identity-session

Đây là capability của **chính lớp xác thực**: ai là người bấm, phiên nào còn sống, vai nào mở được merge.
Nên security review ở đây không soi tác dụng phụ của một tính năng — nó soi **cái khoá cửa**. Và change này
chủ yếu là backfill, nghĩa là rủi ro lớn nhất không phải «code mới sai» mà là **khai một hành vi là đã có
trong khi nó chưa có** — đúng kiểu nói dối mà cả sản phẩm tồn tại để chống.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Mật khẩu băm chậm có muối riêng từng tài khoản, không ở dạng đọc được trong cơ sở dữ liệu (R11.6,
  ⛔C3). Có ca sẵn.
- ✅ S1.2 Token phiên chỉ lưu **hash** (R11.11) — đọc được cơ sở dữ liệu không mạo danh được phiên đang
  sống. Có ca sẵn.
- ⚠️ S1.3 **Trục chính của change: R11.20 đang giữ bằng KỶ LUẬT.** Hàm liệt kê tài khoản trả tên và vai của
  mọi tài khoản; hôm nay chỉ công cụ dòng lệnh gọi nó, và không cơ chế nào ngăn một route mới gọi thẳng.
  Danh sách tài khoản của hệ mở được cổng merge cho biết đúng những cái tên đáng đi đoán mật khẩu. Change
  này chuyển nó sang giữ bằng máy (lưới D1).
- ⚠️ S1.4 **Âm tính giả của lưới R11.20, khai thẳng:** lưới bắt lời gọi hàm và câu SQL tĩnh chạm bảng tài
  khoản. Một route dựng SQL động bằng ghép chuỗi vẫn lọt. Chấp nhận vì bề mặt ở đây là **code của chính repo
  này**, đi qua review người — khác hẳn `error-message-egress-gate`, nơi đầu vào là dữ liệu ngoài không ai
  đọc trước. Lưới thu hẹp bề mặt, không đóng kín nó.
- ✅ S1.5 Sai mật khẩu và sai tên đăng nhập trả cùng một kết quả (R11.10) — không có cửa dò tên tài khoản.

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 Đây là capability của trục này. Danh tính đến từ phiên (R11.1), một cửa (R11.4), không mặc định
  (R11.3). Hai điều đầu chưa có lưới → change này thêm.
- ⚠️ S2.2 **R11.2 và lớp Basic Auth.** Gác phiên phải chặn kể cả khi lớp xác thực ngoài đã cho qua — lớp
  ngoài trả lời «có ai đó được vào», không trả lời «ai». Đây là chỗ nối với nợ **#4** (bỏ Basic Auth ở
  nginx): khi lớp ngoài bị gỡ, gác này thành **lớp duy nhất**, nên nó phải có test trước khi việc đó xảy ra.
  Change này làm đúng thứ tự ấy.
- ✅ S2.3 Danh sách đường mở là danh sách CHO PHÉP đóng và có ca khoá nội dung (T2.5) — nới nó làm ca đỏ,
  tức việc mở một cửa vào hệ thống trở thành thay đổi nhìn thấy được trong diff.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 ⛔C1 sống ở tầng vai: chỉ vai duyệt cổng mở được merge, tác nhân máy mang vai riêng và bị chặn
  **ở tầng vai** chứ không bằng việc không vẽ nút. Có ca sẵn, change không nới.
- ✅ S3.2 Vai `tu_dong` tách khỏi vai vận hành vì vai đó sửa được cấu hình — mà cấu hình quyết định lượt
  chấm chạy thế nào. Change giữ nguyên ranh giới ấy.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Cookie là dữ liệu **client gửi**. Nó chỉ được dùng để tra phiên trong cơ sở dữ liệu, không được
  dùng làm tên người, không vào prompt, không vào sổ. Ca cookie rác khoá điều đó.
- ✅ S4.2 Header `x-forwarded-proto` cũng là dữ liệu không tin được (client gửi được nếu proxy cấu hình
  sai). Nó chỉ quyết một việc: **thêm** cờ `Secure`. Giả mạo nó theo hướng «https» làm cookie chặt hơn;
  theo hướng «http» làm mất `Secure` — nhưng khi ấy request đã đi qua kênh không mã hoá rồi, nên header
  không tạo ra rủi ro mới. Ghi ra để không ai tưởng đây là chỗ chưa soi.
- ✅ S4.3 Tên đăng nhập ép khuôn **lúc tạo** (R11.9) — tên là thứ đi vào comment pull request, nên ép tại
  nguồn chặn cả đường phá HTML/markdown ở bề mặt công khai.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích.
- N/A S5.2 Không worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Tài khoản ở cơ sở dữ liệu (R11.7); file chính **và** `-wal`, `-shm` đều chmod 600 (R11.8) — hai
  file đi kèm mang cùng dữ liệu, chmod mỗi file chính là khoá cửa trước rồi mở cửa sau.
- ⚠️ S6.2 **Ca test chỉ kiểm LỜI GỌI chmod, không kiểm quyền thật trên đĩa** (D4). Lý do: ca đọc quyền thật
  đỏ trên Windows, xanh trên Linux — lưới nói khác nhau tuỳ máy là lưới người ta sẽ bỏ qua. Cái mất: nếu
  tiến trình chạy với umask lạ hoặc file bị tạo lại bởi tiến trình khác, lưới vẫn xanh. Phần ấy thuộc kiểm
  tay lúc deploy (`DEPLOY.md`), và test-cases ghi nó ở mục «Kiểm tay» chứ không giả vờ đã phủ.
- ✅ S6.3 `try/catch` nuốt lỗi chmod là fail-open **có chủ đích** cho máy phát triển Windows. Prod chạy
  Linux nên luật có hiệu lực thật. Change không đổi hành vi này; nếu đổi thì phải là change riêng vì nó làm
  server không khởi động được trên máy dev.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Mọi ca thiếu dữ liệu đều là TỪ CHỐI: không cookie, cookie rác, phiên hết hạn, tài khoản đã gỡ —
  ném lỗi, không dựng danh tính. Không nhánh nào biến «không biết» thành «một cái tên nào đó».
- ✅ S7.2 Tài khoản bị gỡ đi cùng đường với «chưa đăng nhập» (JOIN không ra hàng), nên không có cửa phân
  biệt «tài khoản này từng tồn tại».
- ✅ S7.3 Change KHÔNG đụng verdict, không đụng nhãn probe.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **thao tác cổng mà không phải là người có quyền**, hoặc **lấy được danh sách tài khoản**.

- ✅ S8.1 (a) thêm route đọc bảng tài khoản → lưới R11.20 (T7.4 fixture đối kháng).
- ✅ S8.2 (b) nới danh sách đường mở để lách gác phiên → T2.5 khoá nội dung danh sách.
- ✅ S8.3 (c) đọc cookie ở cửa thứ hai, bỏ kiểm hạn → lưới R11.4 (T1.6 fixture đối kháng).
- ✅ S8.4 (d) dùng token của phiên đã đăng xuất → phiên xoá phía máy chủ (R11.13), có ca.
- ✅ S8.5 (e) dùng phiên của tài khoản đã gỡ → JOIN không ra hàng (R11.21), có ca.
- ✅ S8.6 (f) đọc token từ JavaScript trong trang → `HttpOnly` (T6.1).
- ✅ S8.7 (g) bấm cổng từ trang khác thay người dùng → `SameSite` (T6.2).
- ⚠️ S8.8 (h) **tự merge PR của chính mình** → hệ thống CẢNH BÁO và ghi vào sổ (R11.17), nhưng KHÔNG chặn.
  Đó là lựa chọn có sẵn, không phải sơ suất: ba vai hiện tại **chưa** tách người viết code khỏi người
  duyệt — comment trong `canOperateGate` nói thẳng điều đó. Change này khai đúng mức ấy chứ không khai
  thành «đã có phân tách nhiệm vụ».
- ⚠️ S8.9 (i) SQL động ghép chuỗi để đọc bảng tài khoản → **đường này MỞ** (S1.4). Khai thẳng.

## Notes

- Hai chỗ chưa kín và đã khai: S1.4/S8.9 (SQL động lọt lưới) và S6.2 (chmod chỉ kiểm lời gọi). Cả hai đều
  ghi rõ cái mất chứ không lấp.
- S8.8 không phải chỗ hở của change mà là **giới hạn đã biết của mô hình vai**. Nếu PO muốn chặn tự-duyệt
  thì đó là change riêng, và nó đổi luật chứ không backfill.
- Tiêu chí «đủ ca» cho change này: **mỗi đường ở S8 có một ca**, và ca phải đỏ khi gác bị gỡ. Một lưới bảo
  mật thiếu ca cho một đường thì đường đó coi như chưa được gác.
