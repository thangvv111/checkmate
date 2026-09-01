# Security — màn Run và cổng merge

## Bề mặt thay đổi

Change này chạm đúng ba chỗ nhạy nhất của sản phẩm cùng lúc: **cổng merge** (hành động một chiều),
**dòng sự kiện ghi ra đĩa** (nơi bí mật dễ rơi vào nhất), và **danh tính** (ai bấm chạy, ai bấm
merge). Nên rủi ro ở đây không nằm ở tính năng mới mà ở chỗ **nới một ranh giới sẵn có mà không thấy**.

## Rà theo trục

### Máy không bao giờ merge (⛔C1)

Change này **không** thêm đường tự động nào tới merge. Nó làm ngược lại — bịt một đường đang hở:
`/runs/<id>?replay=1` hôm nay bày một nút Merge thật, và chế độ đó được dựng cho lúc trình bày trước
người khác, tức đúng lúc một cú bấm nhầm gây hậu quả một chiều.

Chỗ dễ hỏng khi hiện thực: điều kiện chỉ-đọc phải đọc **thẳng từ trạng thái màn**, không phải một
tham số truyền qua nhiều lớp hàm. Bản hiện tại hỏng đúng vì lý do đó — `khoiCong(meta)` không hề nhận
`replay`, nên không ai ở đó *biết* mình đang trong bản phát lại. Cái gì phải nhớ truyền thì sẽ có
ngày quên, và ngày đó không có lỗi nào nổ ra.

Ca T3.1 và T7.1 canh: không đường nào từ chế độ trình diễn gọi được hành động cổng, và ba lớp ghim
SHA ở đường ghi (so head trước khi merge · gửi SHA kỳ vọng lên GitHub · chặn theo `pr_head_sha` ở
hàng đợi) phải còn nguyên. Banner stale là chỗ **nói**, không được coi là chỗ **chặn** — thêm nó vào
không cho phép bớt bất kỳ lớp chặn nào.

### Fail-closed (⛔C2)

Hai chỗ mới có thể lặng lẽ biến «không biết» thành «không có»:

- **Dòng sự kiện đọc từ file.** File đọc lỗi, thiếu, hay JSON hỏng ở dòng cuối (ghi dở lúc chết) phải
  cho ra «đọc được tới đây» chứ không phải một lượt chấm rỗng trông như chưa từng chạy. Dòng cuối
  hỏng là chuyện **bình thường** khi tiến trình chết giữa lúc ghi — phải xử lý như trạng thái thường,
  không phải ngoại lệ.
- **Trường mới vắng mặt.** Verdict đời cũ không có `vung_mu_diff` — vắng nghĩa là *không biết*, và
  giao diện không hiện khối đó. Đúng. Nhưng nó MUST NOT hiện thành «không có vùng mù», vì hai điều
  đó khác nhau và cái sau là một lời khẳng định mình không có quyền đưa ra.

### Bí mật không rò (⛔C3)

Đây là trục rủi ro **tăng thêm** của change này, vì nó thêm một nơi ghi dữ liệu xuống đĩa.

- `runs/<id>/events.jsonl` chứa toàn bộ log của lượt chấm. Log hiện đã đi qua che bí mật trước khi
  phát (`maskTokenInText`), nhưng nay chúng **nằm lại trên đĩa lâu dài** thay vì thoáng qua bộ nhớ.
  Ca T7.2 canh: dòng sự kiện ghi ra đĩa không mang token hay khoá.
- **«Người chạy» là dữ liệu cá nhân.** Chỉ ghi **tên đăng nhập** — thứ vốn đã vào sổ cổng — chứ không
  ghi phiên, cookie, hay bất cứ thứ gì dùng lại được để mạo danh.
- Bản trình diễn phát lại **đúng những gì đã ghi**. Nếu một bí mật lọt vào log, chế độ trình diễn sẽ
  chiếu nó lên màn hình trước khán giả. Đó là lý do việc che phải đúng ở chỗ **ghi**, không phải ở
  chỗ hiện.

**Không** bật lưu phiên của Claude CLI để cứu lời gọi model. Nó đang chạy với
`--no-session-persistence` một cách cố ý; bật lên thì transcript chứa nguyên văn prompt — tức toàn bộ
diff của repo đích — nằm trên đĩa ngoài tầm kiểm soát của mình. Đổi một vấn đề lấy một vấn đề lớn hơn.

### Dữ liệu ngoài là dữ liệu (⛔C4)

Màn Run bày nhiều nội dung không tin được hơn bất kỳ màn nào khác: tiêu đề PR và tên nhánh từ GitHub,
**lời văn finding do model viết**, tên file trong vùng mù, thông điệp lỗi từ nhánh gốc, và nay thêm
lý do nạp/gỡ probe. Tất cả phải qua escape trước khi vào HTML (T7.3).

Chỗ dễ sót nhất là hai chỗ **mới**: khối bằng chứng hai cột (KỲ VỌNG / THỰC TẾ đều là chuỗi thô từ
quá trình chạy probe) và khối Thư viện. Bản prototype của gói viết `{{ }}` và runtime của nó tự
escape — chép sang chuỗi HTML thì không ai escape hộ.

Chiều ngược lại cũng phải giữ: dữ liệu mới đọc từ `events.jsonl` là **dữ liệu**, không phải chỉ thị.
File đó nằm trên đĩa máy chủ, nhưng nội dung trong nó đến từ diff và từ model — nó không được đổi
hành vi engine.

### Hợp đồng dữ liệu

`Verdict` bị `JSON.stringify` nguyên khối xuống cột `run.verdict`, và cũng vào sổ cái. Chỉ **thêm**
trường tuỳ chọn. Đổi tên hay đổi kiểu một trường đang có sẽ làm 29 bản ghi hiện tại đọc sai **mà
không ném lỗi** — đúng loại hỏng tệ nhất: im lặng và chỉ lộ ra khi ai đó tra một lượt chấm cũ để cãi
về một quyết định merge.

### Ghi hai nơi

File `.jsonl` và bảng `run_su_kien` giữ cùng một dữ liệu. Hai nguồn cho cùng một sự thật là khuôn lỗi
«cửa song sinh» — khuôn đã bị bắt chín lần trong repo này. Chốt ranh giới bằng cấu trúc, không bằng
kỷ luật: **file là nguồn, bảng là bản đọc**, và việc dựng lại bảng từ file phải chạy được (T4.3). Khi
hai bên lệch, tin file.

## Hai thứ KHÔNG làm ở đây, và vì sao chúng nguy hiểm nếu làm lẻ

**Webhook GitHub** (nợ 8.4) sẽ là **cửa vào không-xác-thực-người-dùng đầu tiên** của sản phẩm. Nó
kéo theo cả một bộ: HMAC-SHA256 so timing-safe · giữ raw body · chống phát lại theo delivery id ·
trần payload · secret theo từng repo. Change hiện tại nằm trọn trong vòng xác thực; ghép webhook vào
là trộn hai hồ sơ rủi ro khác hẳn nhau vào một lần duyệt.

**Bỏ Basic Auth ở nginx** (nợ 8.5) chỉ an toàn khi **rào đăng nhập đi cùng chuyến**. Lớp trong đã
được viết để không tựa vào lớp ngoài — middleware là allowlist mặc-định-chặn và comment R11.2 nói
thẳng điều đó — nhưng nó **không có rào chống dò mật khẩu nào**. Bỏ lớp ngoài trước khi có rào là mở
`/login` cho vòng lặp dò, mà scrypt cố ý chậm biến mỗi lần thử thành chi phí CPU của chính máy chủ.
Làm lẻ hai việc đó theo thứ tự sai thì có một quãng thời gian hệ yếu hơn cả trước lẫn sau.

## Kết luận

Change này **thu hẹp** bề mặt rủi ro ở chỗ quan trọng nhất — bịt đường merge trong chế độ phát lại,
và bắt trả-về-dev phải có lý do. Nó **mở rộng** bề mặt ở một chỗ: dòng sự kiện nay nằm lại trên đĩa.
Hai rủi ro thật, cả hai đều là rủi ro của việc *dựng lại*, không phải của tính năng: **quên escape
nội dung ngoài ở hai khối mới**, và **để một trạng thái đọc-lại quên mất mình là đọc-lại**. Cả hai
`tsc` không bắt được, nên cả hai có ca test riêng và có bước mở thật bằng mắt.
