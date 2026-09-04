# Security — github-webhook

Mục nợ #3 tự đòi **«security review riêng, không gộp việc khác»**, và lý do nằm ở một câu: đây là **cửa vào
không xác thực người dùng đầu tiên** của sản phẩm. Mọi mục dưới đây xoay quanh câu ấy.

## S0. Bề mặt mới — hai lớp bảo vệ cùng bị chọc

```
Internet -> nginx (HTTPS + BASIC AUTH) -> 127.0.0.1:4001 -> app (cua phien) -> route
              ^                                              ^
              | webhook can NGOAI LE                         | webhook can vao OPEN_PATHS
              | (GitHub khong gui credential)                | (POST dau tien khong can phien)
```

Đếm bằng máy trước change: `OPEN_PATHS` **3** đường (`/login`, `/logout`, `/health`) — **không đường POST
nào**; 15 route POST **đều** sau cửa phiên; nginx có **1** ngoại lệ Basic Auth (`acme-challenge`).

Sau change: `OPEN_PATHS` **4**, một route POST không cần phiên, nginx **2** ngoại lệ.

**Sau hai việc đó, an ninh của cửa dồn vào HMAC.** Đó là lý do change này có gác thứ hai (S4.2) — không
phải phòng xa, mà vì một gác duy nhất trên một cửa Internet là một điểm hỏng đơn.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 **Bí mật webhook là bí mật mới của hệ.** Nó vào kho khoá (`.secrets.json`, quyền 600), KHÔNG vào
  `config.json` — `config.json` được đọc và trả ra nhiều bề mặt, kho khoá thì không.
- ⚠️ S1.2 Phản hồi và log MUST NOT chứa bí mật hay chữ ký nhận được. Chữ ký là **một hàm của bí mật**: rò
  nhiều chữ ký cho những body đã biết là rò dữ liệu để tấn công bí mật.
- ⚠️ S1.3 **Đối chiếu `response-secret-guard`** (task 5.3): gác ấy quét response tìm bí mật đã biết. Bí mật
  webhook phải nằm trong danh sách nó gác — cửa mới không được là chỗ hở của gác cũ.
- ✅ S1.4 Payload webhook không mang bí mật của CheckMate; nó mang dữ liệu công khai của pull request.

## S2. Danh tính, phiên, vai (R11)

- ⚠️ S2.1 Đây là đường **đầu tiên** bỏ qua cửa phiên mà vẫn **gây tác dụng phụ** (khởi lượt chấm, tiêu
  token, chiếm trần). Ba đường mở hiện có đều không gây gì: `/login` là cửa vào, `/logout` xoá phiên của
  chính người gọi, `/health` chỉ đọc.
- ⚠️ S2.2 Lượt chấm khởi từ webhook **không có người bấm**. Sổ phải ghi được điều đó — cùng nguyên tắc chế
  độ trực đã dùng: *«rỗng = lượt do máy chạy, đó là khẳng định, không phải thiếu dữ liệu»*.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Webhook **không** merge được gì. Nó chỉ khởi một lượt chấm; ⛔C1 không bị đụng.
- ⚠️ S3.2 Nhưng nó **đưa verdict vào sổ**, và verdict là thứ cổng đọc. Một tác nhân ký được webhook có thể
  ép sinh verdict cho các commit nó chọn — không merge được, nhưng làm nhiễu sổ và tốn token. Trần chạy
  đồng thời là thứ giới hạn thiệt hại ấy (S5.2).

## S4. Dữ liệu không tin cậy & prompt injection (R7, ⛔C4)

- ⚠️ S4.1 Payload webhook là **dữ liệu ngoài đến từ một cửa không xác thực người dùng** — hạng không tin
  cậy cao nhất trong hệ. Mọi trường đọc từ nó (`repository.full_name`, `number`, `pull_request.head.sha`)
  phải được kiểm hình dạng trước khi dùng, và MUST NOT đi thẳng vào lệnh nào.
- ⚠️ S4.2 **Chữ ký KHÔNG được là gác duy nhất** (D3). Repo trong payload phải nằm trong danh sách đã khai.
  Thiếu gác này, một webhook hợp lệ trỏ repo lạ khiến CheckMate **clone và chạy test của repo chưa ai
  khai** — tức chạy code lạ trên máy chủ. Hai gác độc lập: biết bí mật, VÀ repo đã được người vận hành khai.
- ✅ S4.3 Nội dung pull request đi tiếp vào prompt theo đúng đường cũ, đã có rào (`fence`) và gác diff.

## S5. Sandbox & thực thi (R8)

- ⚠️ S5.1 Webhook **kích hoạt chạy code của repo đích** trong sandbox. Đó là hành vi vốn có của sản phẩm,
  nhưng trước change này nó chỉ khởi được từ người đã đăng nhập hoặc từ chế độ trực do người vận hành bật.
  Sau change, một cửa Internet cũng khởi được — với hai gác ở S4.2 đứng trước.
- ✅ S5.2 Trần chạy đồng thời và luật «một verdict một commit» áp cho MỌI đường vào. Webhook dồn dập không
  vượt được trần; webhook lặp cho cùng commit không sinh lượt thứ hai.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Không đổi hình dạng cơ sở dữ liệu; kho khoá thêm một trường tuỳ chọn.
- ✅ S6.2 Kho khoá đã ở quyền 600 (`R11.8` / `R5.11`), bí mật mới thừa hưởng.

## S7. Fail-closed & bất biến verdict (R1, R6, ⛔C2)

- ✅ S7.1 **Chưa cấu hình bí mật ⇒ từ chối TẤT.** Không phải «bỏ qua xác thực cho tiện lúc thử». Một máy
  chủ chưa cấu hình xong mà nhận webhook nghĩa là ai cũng chạy được lượt chấm trên nó.
- ✅ S7.2 Chữ ký sai, repo lạ, chế độ chỉ-đọc: đều **từ chối**.
- ⚠️ S7.3 **Hướng sai không đối xứng, và đây là chỗ dễ nghiêng nhầm nhất:** từ chối oan một webhook thì
  polling vẫn nhặt được pull request ấy trong chu kỳ sau — **mất nhiều nhất 3 phút**. Cho qua oan một
  webhook thì một tác nhân ngoài chạy được code trên máy chủ. Mọi lúc phân vân, nghiêng về từ chối.

  *Chính vì thế polling phải giữ (D5): nó là thứ làm cho «từ chối oan» rẻ.*

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **dùng cửa webhook để chạy được thứ gì đó trên máy chủ**.

- ✅ S8.1 (a) POST thẳng vào `/api/webhook/github` không chữ ký → từ chối (S7.2).
- ✅ S8.2 (b) chép lại một webhook hợp lệ đã bắt được (replay) → `findByPr` chặn: cùng pull request cùng
  commit không sinh lượt thứ hai.
- ✅ S8.3 (c) sửa một byte trong body rồi giữ nguyên chữ ký → HMAC trên **raw body** bắt được.
- ✅ S8.4 (d) dò từng byte chữ ký bằng cách đo thời gian trả lời → so sánh **timing-safe**.
- ✅ S8.5 (e) ký đúng nhưng trỏ **repo lạ** để ép chạy code lạ → gác repo đã khai (S4.2).
- ✅ S8.6 (f) gửi dồn dập để làm nghẽn máy chủ → trần chạy đồng thời.
- ⚠️ S8.7 (g) **bí mật rò** (lộ ở phía GitHub, hoặc người vận hành dùng lại bí mật ở nơi khác) → chữ ký
  không còn nghĩa. Còn lại **đúng một gác**: repo đã khai. Kẻ có bí mật vẫn ép được lượt chấm trên những
  repo đã khai — tốn token, làm nhiễu sổ, **không merge được gì**. Đây là chỗ hở còn lại sau change, và
  nó là lý do bí mật phải ở kho khoá 600 chứ không ở cấu hình.
- ⚠️ S8.8 (h) người có quyền ghi đĩa máy chủ sửa `.secrets.json` → ngoài vòng, cùng hạng `R11.19`.

## Notes

- **S7.3 là mục quan trọng nhất của change này.** Bất đối xứng «từ chối oan mất 3 phút / cho qua oan mất
  máy chủ» là thứ mọi quyết định nhỏ trong code phải suy ra từ đó — và nó chỉ đúng khi polling còn sống.
  Ai định tắt polling sau này phải đọc lại mục này trước.
- S8.7 là chỗ hở **có ý thức**: sau khi bí mật rò, hệ còn một gác chứ không phải không còn gác nào — nhưng
  một gác thì không đủ để gọi là an toàn, và tài liệu vận hành phải nói cách xoay bí mật.
