# Test cases — github-webhook

Requirement: R-1 «HMAC trên raw body, timing-safe, thiếu bí mật là từ chối» · R-2 «payload phải trỏ repo đã
khai, chỉ sự kiện pull request mới chạy» · R-3 «không rò bí mật, không mở ở chế độ chỉ-đọc».

Đây là cửa vào **không xác thực người dùng** đầu tiên, nên mỗi nhánh từ chối là một ca — không gộp.

## R-1 xác thực chữ ký

- [ ] T1.1 Chữ ký đúng → chấp nhận.
- [ ] T1.2 Chữ ký sai → từ chối.
- [ ] T1.3 **Thiếu chữ ký** → từ chối (nhánh riêng, không gộp với T1.2).
- [ ] T1.4 Chữ ký sai **định dạng** (thiếu tiền tố, không phải hex) → từ chối.
- [ ] T1.5 Chữ ký đúng độ dài nhưng sai nội dung → từ chối.
- [ ] T1.6 Chữ ký **sai độ dài** → từ chối, và KHÔNG ném.
      *So sánh timing-safe ném khi độ dài khác nhau; không kiểm trước thì cửa đổ vì một chuỗi ngắn.*
- [ ] T1.7 **Body sửa một byte**, chữ ký giữ nguyên → từ chối.
      *Ca load-bearing: đây là thứ chứng minh HMAC tính trên RAW BODY chứ không trên bản dựng lại.*
- [ ] T1.8 Body có thứ tự khoá / khoảng trắng khác nhưng nội dung JSON tương đương → **từ chối**.
      *Vế ngược của T1.7: hai body «cùng nghĩa» vẫn là hai chuỗi byte khác nhau.*
- [ ] T1.9 **Chưa cấu hình bí mật** → từ chối MỌI webhook, kể cả cái mang chữ ký hợp lệ theo một bí mật nào
      đó. *Gác ⛔C2 của một cửa mở ra Internet.*
- [ ] T1.10 Phép so là **timing-safe** — không dừng sớm ở byte đầu khác nhau.

## R-2 payload và điều kiện chạy

- [ ] T2.1 `pull_request` + hành động cần chấm + repo đã khai → khởi lượt chấm.
- [ ] T2.2 **Repo không có trong cấu hình** → từ chối, không lượt nào khởi.
      *Ca load-bearing: gác thứ hai độc lập với chữ ký. Thiếu nó, một webhook hợp lệ trỏ repo lạ khiến
      CheckMate clone và chạy test của repo chưa ai khai — chạy code lạ trên máy chủ.*
- [ ] T2.3 Sự kiện khác `pull_request` → nhận và bỏ qua, KHÔNG coi là lỗi.
- [ ] T2.4 Hành động không cần chấm (ví dụ gắn nhãn) → không khởi lượt nào.
- [ ] T2.5 **Cùng pull request, cùng commit, đến lần hai** → không lượt thứ hai.
- [ ] T2.6 Chạm trần chạy đồng thời → từ chối khởi, đi qua ĐÚNG `evaluateStartRun`.
- [ ] T2.7 Lượt khởi từ webhook dùng cấu hình của **repo trong payload**, không phải repo đang chọn.
      *`chamPr` chấm theo `cfg.repo`; bỏ qua điểm này thì webhook repo A khởi lượt trên repo B.*
- [ ] T2.8 Trường payload méo (thiếu `repository`, `number` không phải số) → từ chối, không ném.

## R-3 không rò, không mở ở chế độ chỉ-đọc

- [ ] T3.1 Phản hồi từ chối KHÔNG chứa bí mật.
- [ ] T3.2 Phản hồi từ chối KHÔNG chứa chữ ký nhận được.
      *Chữ ký là một hàm của bí mật — rò nhiều chữ ký cho body đã biết là rò dữ liệu tấn công bí mật.*
- [ ] T3.3 Phản hồi KHÔNG phân biệt «chữ ký sai» với «chưa cấu hình bí mật».
      *Phân biệt ấy có ích cho người vận hành nên nó thuộc LOG, không thuộc phản hồi.*
- [ ] T3.4 Log máy chủ thì CÓ nói lý do — hai bề mặt, hai mức chi tiết.
- [ ] T3.5 Chế độ chỉ-đọc → từ chối.

## Đường vào (D1, D6)

- [ ] T4.1 `OPEN_PATHS` sau change có đúng **4** đường, và ca khoá nội dung được sửa kèm lý do.
- [ ] T4.2 Raw body chỉ được giữ cho đường webhook — `express.raw` mounted theo đường, đặt trước
      `express.json`.

## Mutation (load-bearing) — mỗi chiều chạy HAI lần, CHẠY NỀN

- [ ] T5.1 Bỏ phép kiểm chữ ký → T1.2 ĐỎ.
- [ ] T5.2 So bằng `===` thay vì timing-safe → T1.10 ĐỎ.
- [ ] T5.3 Thiếu bí mật thì cho qua → T1.9 ĐỎ.
- [ ] T5.4 Tính HMAC trên body đã parse rồi dựng lại → T1.7 hoặc T1.8 ĐỎ.
- [ ] T5.5 Bỏ phép kiểm repo đã khai → T2.2 ĐỎ.
- [ ] T5.6 Bỏ `evaluateStartRun` → T2.6 ĐỎ.
- [ ] T5.7 Cho chế độ chỉ-đọc chạy → T3.5 ĐỎ.
- [ ] T5.8 Phản hồi nói rõ lý do → T3.3 ĐỎ.
- [ ] T5.9 Đột biến sống sót → bảng ba đường; `git diff` sạch trước commit.

## Trục nhạy cảm

- [ ] T_bimat — bí mật webhook không ra phản hồi/log; và nó nằm trong danh sách `response-secret-guard` gác (⛔C3).
- [ ] T_failclosed — thiếu bí mật · chữ ký sai · repo lạ · chỉ-đọc: đều TỪ CHỐI (⛔C2).
- [ ] T_cong — webhook KHÔNG merge được gì; nó chỉ khởi lượt chấm (⛔C1 không đụng).
- [ ] T_khongtincay — payload là dữ liệu ngoài hạng cao nhất: kiểm hình dạng trước khi dùng, không đi thẳng
  vào lệnh nào (⛔C4).
- [ ] T_hopdong — export mới khai bảng module `checkmate.yml` (⛔C5).

## Kiểm tay — CHẠY THẬT (tầng 2; KHÔNG tick trước khi chạy)

- [ ] T6.1 Webhook giả chữ ký ĐÚNG → lượt chấm khởi.
- [ ] T6.2 Webhook giả chữ ký SAI → từ chối, phản hồi không nói gì thêm.
- [ ] T6.3 Webhook trỏ repo LẠ → từ chối.
- [ ] T6.4 Xoá bí mật khỏi kho khoá → mọi webhook bị từ chối.
