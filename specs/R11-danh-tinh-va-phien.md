# R11 — Danh tính người thao tác và phiên đăng nhập

Một cổng maker–checker chỉ có giá trị khi sổ trả lời được câu **"AI đã bấm"**. Basic Auth ở nginx giữ
được cửa vào site nhưng không phân biệt được người: một tài khoản dùng chung nghĩa là mọi hành động
cổng mang cùng một cái tên, và sổ kiểm toán trở thành một danh sách không ai chịu trách nhiệm.

Bản trước lấy người thao tác từ `userInfo().username` — tài khoản **hệ điều hành** chạy tiến trình. Trên
máy chủ đó là `ubuntu`. Sổ có hàng, chỉ là hàng vô nghĩa.

> **Phạm vi:** R11 nói về **phiên của người dùng**. Đừng lẫn với "phiên hết hạn" ở R3 — chỗ đó nói về
> phiên với nhà cung cấp model. Hai khái niệm khác nhau, không được dùng chung thông điệp hay bộ nhận diện.

## Người thao tác

- **R11.1** — Người thao tác cổng PHẢI là danh tính của **phiên đăng nhập**. KHÔNG phải tài khoản hệ
  điều hành, KHÔNG phải giá trị do client gửi lên, KHÔNG phải header do proxy đặt. Luật này siết R6.11:
  bản trước chỉ đòi "kèm người thực hiện" mà không nói người thực hiện lấy từ đâu, nên một giá trị vô
  nghĩa vẫn lọt lưới.
- **R11.2** — Không có phiên hợp lệ thì mọi hành động cổng PHẢI bị từ chối, **kể cả khi lớp xác thực
  bên ngoài đã cho qua**. Hai lớp trả lời hai câu khác nhau: nginx hỏi "có được vào site không", ứng
  dụng hỏi "ai đang bấm". Lớp ngoài KHÔNG ĐƯỢC coi là nguồn danh tính.
- **R11.3** — Hàm đọc danh tính KHÔNG ĐƯỢC có bất kỳ giá trị mặc định nào. Thiếu phiên, phiên hết hạn,
  tài khoản đã bị gỡ, hay tên không hợp lệ → **ném lỗi**, route từ chối. Chính một `catch { return … }`
  đã sinh ra lỗi mà R11 tồn tại để sửa; vá một fallback bằng một fallback khác là không vá gì.
- **R11.4** — Mọi chỗ đọc danh tính PHẢI đi qua **đúng một hàm**. Nguồn danh tính hiện tại là kho tài
  khoản cục bộ; thay bằng thư mục doanh nghiệp (AD/LDAP/SSO) về sau phải chỉ sửa một chỗ. Đây là điều
  kiện để câu "L3 làm cơ chế danh tính, không làm nguồn danh tính" là một cam kết kiểm chứng được chứ
  không phải một lời hứa.

## Tài khoản và mật khẩu

- **R11.5** — Mật khẩu KHÔNG BAO GIỜ được lưu ở dạng đọc được, và KHÔNG BAO GIỜ rời khỏi máy chủ dưới
  bất kỳ hình thức nào — kể cả đã che, kể cả trong log, kể cả trong thông báo lỗi.
- **R11.6** — Băm mật khẩu PHẢI dùng hàm chậm có muối riêng cho từng tài khoản. Muối phải ngẫu nhiên và
  lưu cùng hash. So sánh hash PHẢI dùng phép so **thời gian hằng định** — so bằng `===` để lộ độ dài
  tiền tố khớp qua thời gian trả lời.
- **R11.7** — Tài khoản lưu trong cơ sở dữ liệu. Đây là **ngoại lệ có chủ đích** với R9.13 (bí mật ở
  dạng file): hash mật khẩu không mở được thứ gì bên ngoài hệ này, nên lý do "bản sao lưu mang theo
  khoá" của R9.13 không áp; đổi lại, tài khoản cần truy vấn và nối, tức đúng chỗ của cơ sở dữ liệu.
- **R11.8** — Vì R11.7, file cơ sở dữ liệu và các file đi kèm (`-wal`, `-shm`) PHẢI ở quyền 600, và tài
  liệu vận hành PHẢI nói rõ bản sao lưu cơ sở dữ liệu từ nay là **dữ liệu nhạy cảm**.
- **R11.9** — Tên đăng nhập PHẢI được ép khuôn **lúc tạo tài khoản**, không phải lúc hiển thị. Tên chảy
  ra hai bề mặt khác bản chất: HTML, và **markdown của comment PR cùng thân commit merge** — hai thứ sau
  đăng công khai và không thu hồi được. Một tên sạch từ gốc thì không phải nhớ gột ở từng chỗ.
- **R11.10** — Sai mật khẩu PHẢI trả về cùng một thông điệp với sai tên đăng nhập. Nói "không có tài
  khoản này" là xác nhận tài khoản nào có thật.

## Phiên

- **R11.11** — Token phiên PHẢI là giá trị ngẫu nhiên đủ dài, và trong cơ sở dữ liệu chỉ lưu **hash**
  của nó. Ai đọc được file cơ sở dữ liệu cũng không dựng lại được phiên đang sống. Hệ quả có chủ đích:
  hệ thống KHÔNG có bí mật ký dùng chung nào — không có thứ để rò.
- **R11.12** — Phiên PHẢI có hạn. Hết hạn thì bị từ chối như không có phiên, và người dùng được đưa về
  màn đăng nhập kèm lời nói rõ vì sao bị đá về.
- **R11.13** — Đăng xuất PHẢI xoá phiên ở **phía máy chủ**, không chỉ xoá cookie ở trình duyệt. Xoá mỗi
  cookie là để lại một token còn sống mà người dùng tưởng đã huỷ.
- **R11.14** — Cookie phiên PHẢI đặt `HttpOnly` và `SameSite`, và đặt `Secure` khi phục vụ qua HTTPS.

## Cổng và sổ kiểm toán

- **R11.15** — Sổ hành động cổng ghi tên người bấm lấy từ phiên (R11.1). Hàng đã ghi không sửa được
  (R9.4), nên tên ghi sai là sai vĩnh viễn — càng phải chắc ở đầu vào.
- **R11.16** — Tên tác giả PR PHẢI được **đóng băng** vào chính hàng của sổ cổng tại thời điểm bấm, chứ
  không tra bằng cách nối sang bảng khác. Bảng `run` được phép sửa; trả lời một câu hỏi kiểm toán bằng
  dữ liệu sửa được là phá đúng tính chất mà trigger chỉ-ghi-thêm sinh ra để giữ.
- **R11.17** — Khi người bấm cổng trùng với tác giả PR, hệ thống PHẢI cảnh báo tại chỗ trước khi bấm và
  ghi dấu vào sổ, nhưng KHÔNG chặn. Lý do không chặn: chặn cứng đòi một ánh xạ tài khoản ↔ định danh
  GitHub, mà ánh xạ sai thì chặn nhầm đúng lúc cần merge gấp. Lý do vẫn phải ghi: hai cái tên nằm cạnh
  nhau trên cùng một hàng thì người kiểm toán tự thấy được — kể cả những ca hệ thống nhận diện sót.
- **R11.18** — Tác nhân máy (agent, lượt chạy tự động) PHẢI mang danh tính riêng và KHÔNG được **merge**.
  Trong một cổng phê duyệt, "tác nhân tự động không tự merge được" là điều khoản, không phải tuỳ chọn.
- **R11.18b** — Vai dành cho tác nhân máy là `tu_dong`: chạy chấm và — khi được bật theo R6.17 — trả về
  dev, nhưng KHÔNG sửa cấu hình và KHÔNG merge. Tách khỏi `van_hanh` vì vai đó sửa được cấu hình, trong
  đó có cả token và nhà cung cấp model; một tài khoản chạy tự động không cần quyền ấy, và mọi quyền thừa
  của một tài khoản chạy không người trông là bề mặt tấn công không ai canh.

## Vòng đời tài khoản

- **R11.19** — Thêm tài khoản, đổi mật khẩu, đổi vai, gỡ tài khoản đi bằng **lệnh trên máy chủ**, không
  qua giao diện. Ai vào được máy chủ thì đã có quyền cao hơn mọi thứ giao diện cấp được; dựng thêm màn
  quản lý chỉ thêm một bề mặt tấn công cho đúng thứ R11 sinh ra để bảo vệ, mà không cho thêm quyền nào.
- **R11.20** — KHÔNG route nào được trả danh sách tài khoản, hash, hay muối — kể cả cho người đã đăng
  nhập, kể cả đã che (mở rộng R9.17).
- **R11.21** — Gỡ một tài khoản PHẢI huỷ mọi phiên đang sống của tài khoản đó. Gỡ mà phiên còn chạy là
  người đã bị thu quyền vẫn bấm được cổng cho tới khi phiên hết hạn.
