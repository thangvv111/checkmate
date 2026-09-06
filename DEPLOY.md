# CheckMate trên server — ghi chú vận hành

URL: https://checkmate.botswain.net (Lightsail 47.131.132.95, dùng chung máy với tingpos.vn)

## Kiến trúc
- systemd unit `checkmate` → `npx tsx apps/web/src/server.ts`, cổng nội bộ **4001** (Ting giữ 80/443 qua nginx).
- nginx vhost `/etc/nginx/sites-available/checkmate` → proxy 4001, **tắt buffering** cho SSE (log chấm chảy realtime), timeout 600s.
- SSL Let's Encrypt (certbot --nginx), tự gia hạn, hết hạn 25/11/2026. HTTP tự chuyển HTTPS.
- Source: `/home/ubuntu/checkmate-app/{checkmate,demo-credit-approval,demo-python}`; log: `~/checkmate-app/checkmate.log`.
- `CHECKMATE_MODE=org` → mở /settings và cổng merge/reject. Đổi về `demo` trong unit systemd nếu muốn khoá chỉ-đọc.

### Vì sao `MODE=org` được phép mở — lập luận SAU khi đã gỡ Basic Auth

> Đến 05/09/2026 câu biện minh ở đây là «đã an toàn nhờ lớp Basic Auth nginx bên dưới». Lớp ấy **đã được
> gỡ** (change `login-gate-replaces-basic-auth`), nên câu ấy không còn đúng. Nó được **viết lại** chứ
> không xoá: đây là chỗ người sau đọc để hiểu vì sao một chế độ mở cổng merge lại được bật trên một máy
> chủ có mặt trên Internet. Xoá đi là để lại một quyết định không có lý do.

Lập luận hiện hành đứng trên **bốn** chân, không chân nào là «có một lớp nữa ở ngoài»:

1. **Cửa phiên là allowlist mặc-định-chặn.** `evaluateSessionGate` từ chối mọi đường không nằm trong
   `OPEN_PATHS`; danh sách ấy đóng, có lưới khoá **nội dung**, nên thêm một cửa là một thay đổi nhìn thấy
   được chứ không phải một dòng lọt qua review.
2. **Bốn đường mở đều tự đứng được.** `/login` là cửa vào và **có rào tần suất riêng**; `/logout` chỉ xoá
   phiên của chính người gọi; `/health` chỉ trả `{ok:true}`; `/api/webhook/github` có hai gác độc lập
   (HMAC-SHA256 trên raw body **và** repo phải nằm trong danh sách đã khai).
3. **`MODE=org` mở *bề mặt*, không mở *quyền*.** Ai bấm được cổng vẫn do **vai** quyết định
   (`canOperateGate`), và ⛔C1 vẫn đứng: máy không bao giờ merge. Basic Auth chưa bao giờ tham gia vào
   quyết định ấy — nó chỉ trả lời «có ai đó được vào», không trả lời «ai».
4. **Mỗi hành động cổng đều để lại vết** trong sổ chỉ-ghi-thêm, gắn tên người bấm. Basic Auth không làm
   được điều này: mật khẩu của nó dùng chung, nên nó không phân biệt được người.

Chân số 2 là chân duy nhất phải **chứng minh lại mỗi khi thêm đường vào `OPEN_PATHS`** — requirement
«đường mới phải tự đứng được trước Internet» ở capability `identity-session` khai đúng nghĩa vụ đó.

**Không còn HTTP Basic Auth ở nginx.** File `/etc/nginx/.htpasswd-checkmate` được **giữ lại** làm đường
lùi (xem mục «Gỡ / khôi phục Basic Auth» bên dưới), nhưng không cấu hình nào còn trỏ tới nó.

### Rào đăng nhập — và đường thoát khi nó chặn oan

`POST /login` có rào chống dò: **đếm theo IP** (quá 10 lần sai trong 15 phút → chặn IP đó 15 phút) và
**lùi dần theo tài khoản** (từ lần sai thứ 3: chờ 1s, 2s, 4s… tối đa 60s). Trạng thái nằm **trong bộ nhớ
tiến trình**, không trong cơ sở dữ liệu.

Hệ quả vận hành quan trọng — **đường thoát khi chính chủ máy bị chặn oan**:

```bash
sudo systemctl restart checkmate    # xoa sach trang thai rao, dang nhap lai duoc ngay
```

Ghi ở đây vì người ta cần biết điều này **trước** lúc cuống, không phải lúc đang cuống. Mất trạng thái khi
restart là chấp nhận được: kẻ tấn công không gây được restart — họ chỉ chạm tới nginx.

Rào **cố ý không phân biệt** tên tài khoản có thật với tên không tồn tại; nếu nó phân biệt thì chính nó
thành cửa dò tài khoản. Và log của nó ghi tên đã **che** — ô tên đăng nhập là chỗ người ta gõ nhầm mật
khẩu vào, nên ghi nguyên văn là ghi mật khẩu vào log.

### Gỡ / khôi phục Basic Auth ở nginx

Basic Auth **đã gỡ** 06/09/2026. Cách gỡ đã dùng — và cách lùi nếu cần:

```bash
sudo nano /etc/nginx/sites-available/checkmate
#   trong `server { … }`: COMMENT hai dòng
#       # auth_basic "CheckMate";
#       # auth_basic_user_file /etc/nginx/.htpasswd-checkmate;
#   và bỏ hai dòng `auth_basic off;` đã thành thừa (miễn trừ của một lớp không còn tồn tại
#   thì đọc lên gây hiểu nhầm là nó còn). GIỮ NGUYÊN `location ^~ /.well-known/acme-challenge/`
#   — certbot renew cần nó, thiếu thì SSL chết sau 90 ngày.

sudo nginx -t          # ⛔ BẮT BUỘC trước reload: cấu hình sai + reload = mất cả site, không chỉ mất auth
sudo systemctl reload nginx
```

**Lùi lại** (nếu cần bật lại lớp ngoài): bỏ comment hai dòng trên, `sudo nginx -t`, reload. File
`/etc/nginx/.htpasswd-checkmate` **được giữ nguyên** nên không phải đặt lại mật khẩu.

Đổi mật khẩu của file ấy (chỉ có nghĩa khi đã bật lại):
```
printf '%s' 'MAT-KHAU-MOI' | openssl passwd -apr1 -stdin   # ra hash
sudo nano /etc/nginx/.htpasswd-checkmate                    # sửa thành  checkmate:HASH
sudo systemctl reload nginx
```

**Kiểm sau khi gỡ** (ba phép, làm cả ba — kết quả thật đo 06/09/2026 ghi bên phải):
```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://checkmate.botswain.net/   # 303 -> /login
curl -s -D - -o /dev/null https://checkmate.botswain.net/ | grep -ci www-authenticate      # 0  <- Basic Auth da di that
curl -s https://checkmate.botswain.net/api/runs | head -c 120                              # JSON 401, khong phai HTML
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://checkmate.botswain.net/api/webhook/github  # 401 CUA APP
```
`401` ở phép thứ nhất nghĩa là chưa gỡ xong; **nội dung ứng dụng** ở đó nghĩa là cửa phiên đang hỏng —
dừng lại và lùi ngay.

⛔ **Phép thứ tư: 401 nào cũng phải hỏi «của ai».** Webhook không chữ ký bị từ chối bằng 401 — và Basic
Auth chưa gỡ cũng trả 401. Hai thứ cùng mã, nghĩa ngược nhau. Phân biệt bằng **thân và header**:

| nguồn | Content-Type | thân | `WWW-Authenticate` |
|---|---|---|---|
| gác HMAC của app (ĐÚNG) | `application/json` | `{"ok":false}` | không có |
| Basic Auth chưa gỡ (SAI) | `text/html` | trang lỗi nginx | **có** |

⛔ **Kiểm thứ năm — nginx có THẬT SỰ ghi đè `X-Real-IP` không.** Cả rào đăng nhập đứng trên mệnh đề này,
và đọc cấu hình chỉ là *suy*; đây là cách *đo*:

```bash
for i in $(seq 1 14); do
  curl -s -o /dev/null -w '%{redirect_url}\n' -X POST https://checkmate.botswain.net/login \
    -H "X-Real-IP: 10.$i.$i.$i" --data-urlencode "ten=khong-ton-tai-$i" --data-urlencode 'mk=sai'
done
```
Mười bốn IP giả **khác nhau** mà vẫn bị chặn (`?cho=900` từ khoảng lượt 12) ⇒ nginx đã ghi đè, client
không chèn được. Nếu KHÔNG lượt nào bị chặn thì header client đang lọt qua và **rào đã mất hiệu lực** —
kiểm ngay dòng `proxy_set_header X-Real-IP $remote_addr;` trong `location /`.
Chạy xong thì `sudo systemctl restart checkmate` để xoá án phạt vừa tự tạo.

## Webhook GitHub — chấm ngay khi PR mở, thay vì đợi chu kỳ trực

Đường `POST /api/webhook/github`. Đây là **cửa vào không xác thực người dùng duy nhất** của sản phẩm — nó
nằm trong `OPEN_PATHS`, tức không đi qua cửa phiên như 39 route còn lại. Hai gác ĐỘC LẬP đứng ở đó và cả
hai phải qua: **chữ ký HMAC-SHA256 trên raw body**, và **repo trong payload phải nằm trong danh sách đã
khai** ở Cấu hình. Chữ ký một mình không đủ: nó chỉ chứng minh người gửi biết bí mật, không chứng minh việc
này nên làm — mà «nên làm» ở đây nghĩa là clone và chạy test của một repo trên chính máy chủ này.

**Chưa đặt bí mật thì cửa từ chối TẤT** (⛔C2). Bản deploy không đặt gì chạy y như hôm nay — vẫn polling
theo chu kỳ trực, không mất gì ngoài độ trễ. Đó cũng là lý do polling phải giữ: nó là thứ làm cho «từ
chối oan» chỉ tốn thêm một chu kỳ, thay vì mất hẳn một lượt chấm.

### Đặt bí mật

Bí mật nằm ở **kho khoá** `.secrets.json` (quyền 600), khoá `github_webhook_secret` — không ở
`config.json`, vì `config.json` được đọc rồi trả ra nhiều bề mặt còn kho khoá thì không.

```bash
openssl rand -hex 32                                  # sinh bi mat, luu lai de dan sang GitHub
cd /home/ubuntu/checkmate-app/checkmate
sudo -u ubuntu nano .secrets.json                     # them  "github_webhook_secret": "<bi-mat>"
chmod 600 .secrets.json
```

Không cần restart: kho khoá được đọc lại ở **mỗi lượt** (⛔C6 — sửa tay phải có hiệu lực ở lượt đọc kế
tiếp). Xoá khoá ấy đi là tắt webhook ngay, không cần đổi gì khác.

### Mở đường ở nginx — ĐÚNG một đường

```nginx
location = /api/webhook/github {
    proxy_pass http://127.0.0.1:4001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;          # GHI DE — rao dang nhap doc header nay
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> Khối này từng có `auth_basic off;` — đã bỏ cùng lúc gỡ Basic Auth: miễn trừ của một lớp không còn tồn
> tại thì đọc lên gây hiểu nhầm là lớp ấy còn.

⛔ **`X-Real-IP` không phải dòng trang trí.** Rào đăng nhập đếm theo header này, và nó tin được **chỉ vì**
nginx **ghi đè** nó. Dòng `X-Forwarded-For $proxy_add_x_forwarded_for` bên dưới thì **nối thêm** vào giá
trị client tự gửi — phần tử đầu của nó do client viết, nên nó **không** dùng được để đếm. Bỏ dòng
`X-Real-IP` đi thì rào tụt về đếm theo địa chỉ socket (tức đếm chung cả nginx thành một nguồn) và mọi
người dùng chung một xô. Ứng dụng nghe trên `127.0.0.1` là tiền đề của cả lập luận này — đổi sang
`0.0.0.0` là rào mất hiệu lực **không có triệu chứng gì**; có lưới khoá địa chỉ nghe ở
`test/login-throttle.test.ts`.

Dùng `location =` (khớp **chính xác**) chứ không `location /api/webhook` — tiền tố sẽ miễn auth cho mọi
đường con thêm về sau, tức một cửa mở ra mà không ai định mở. Đo được từ ngoài sau khi đặt (05/09):
`/api/webhook/github` tới được ứng dụng, còn `/api/webhook/github/x` và `/api/webhook/khac` vẫn ăn `401` kèm
`WWW-Authenticate: Basic realm="CheckMate"` của nginx.

KHÔNG cần `proxy_set_header X-Hub-Signature-256` — nginx chuyển tiếp header nó không biết theo mặc định;
khai lại chỉ thêm một chỗ sai được mà không thêm gì.

### Khai báo ở GitHub

Repo → Settings → Webhooks → Add webhook:

| Ô | Giá trị |
|---|---|
| Payload URL | `https://checkmate.botswain.net/api/webhook/github` |
| Content type | `application/json` |
| Secret | bí mật vừa sinh |
| Events | chỉ **Pull requests** |

### Kiểm nó đang hoạt động

GitHub ⇒ tab **Recent Deliveries** của webhook: `200` là nhận, `401` là chữ ký không qua, `422` là repo
chưa khai trong Cấu hình, `403` là máy đang ở chế độ chỉ-đọc. **Phản hồi không nói lý do** — chủ ý, vì
người đọc phản hồi có thể là người đang dò. Lý do đầy đủ nằm ở log máy chủ:

```bash
journalctl -u checkmate -f | grep Webhook
```

## `probes-lib/` — thư mục KHÔNG AI ĐỌC NỮA, và vẫn không được xoá

> Mục này trước đây tên là «Trần thư viện probe — con số DUY NHẤT ở màn Cấu hình xoá được dữ liệu». Ô
> trần ấy **không còn tồn tại**. Mục được **viết lại chứ không xoá**: nó là chỗ người vận hành đọc để
> hiểu vì sao trên máy chủ có một thư mục dữ liệu mà không phần mềm nào chạm tới.

Từ change `probe-handover-replaces-library` (06/09/2026), CheckMate **không đọc và không ghi**
`probes-lib/` nữa. Probe là **đầu dò dùng một lần**: nó chạy trong lượt chấm sinh ra nó, trả lời câu hỏi
của lượt ấy, rồi bị vứt. Probe đủ bằng chứng thì đi ra ngoài dưới dạng **đề xuất giao cho repo đích** (màn
**Hàng đợi giao**), chứ không ở lại trong một kho engine tự đọc lại.

**Vì sao gỡ** — đo được trên chính máy chủ này ngày 06/09:

| | |
|---|---|
| `probes-lib/demo-credit-approval` | 7 probe · 5 lượt chạy |
| probe **từng bắt hồi quy** | **0 / 7** |
| trần cũ (mặc định) | 100 ⇒ cho phép **200 lượt thực thi test** mỗi lượt chấm |

Tiêu chí nạp cũ là «probe **xanh** trên nhánh gốc» — tức giữ probe vì nó **không nổ**. Luật lưới của chính
sản phẩm nói một ca xanh chưa chứng minh được gì. Và thứ được tích luỹ vốn là **test hồi quy của repo
đích**: chỗ đúng của nó là bộ test repo ấy, nơi nó chạy ở mọi commit, chạy **một** lần thay vì hai, và có
người trông khi nó mục.

⛔ **Thư mục vẫn nằm nguyên trên đĩa, và vẫn trong nhóm KHÔNG ĐÈ khi deploy.** Ba lý do:

1. Xoá dữ liệu prod là việc **một chiều**; gỡ code thì lùi được bằng một lần revert.
2. Nếu quyết định này về sau tỏ ra sai, 7 probe ấy là dữ liệu duy nhất còn lại để đo.
3. Chính luật bị gỡ trong change này (`probe-quarantine`) nói: *«máy được phép đánh dấu vì việc đó đảo
   ngược được; xoá thì chỉ người mới làm»*. **Gỡ một luật không có nghĩa là được phép làm ngược nó.**

**Kiểm sau mỗi lần deploy** — phép kiểm quan trọng nhất của lượt deploy gỡ thư viện:

```bash
ls /home/ubuntu/checkmate-app/checkmate/probes-lib/demo-credit-approval/ | wc -l   # phai con 8 (7 probe + meta.json)
```

Con số nhỏ đi nghĩa là đã mất dữ liệu — khôi phục ngay từ `~/checkmate-backup-<mốc>`.

Muốn dọn thư mục ấy thì đó là **quyết định của chủ máy**, làm bằng tay, sau khi đã chắc không cần lùi nữa.
Không quy trình tự động nào được đụng vào.

## ⛔ Cô lập container CHẾT khi không ai đang SSH vào máy — bật `linger`, một lần, cho mọi máy

**Triệu chứng** (gặp thật 06/09 lúc 03:37, PO báo):

```
LỖI: Probe không thu thập được sau 2 lần sinh:
  level=warning msg="The cgroupv2 manager is set to systemd but there is no systemd user session available"
  level=warning msg="XDG_RUNTIME_DIR is pointing to a path which is not writable. Most likely podman will fail."
  Error: error creating tmpdir: mkdir /run/user/1000: permission denied
```

**Nguyên nhân, đo được:**

| | |
|---|---|
| `/run/user/1000` | do **systemd-logind** tạo khi có phiên đăng nhập, và **XOÁ** khi phiên cuối cùng đóng |
| `loginctl show-user ubuntu` | `Linger=no` ⇒ không có phiên thì không có thư mục |
| môi trường tiến trình dịch vụ | **không có** `XDG_RUNTIME_DIR` ⇒ podman rơi về `/run/user/$UID` |

Tức **cô lập container chỉ chạy được trong lúc có người đang SSH vào máy**. Đóng phiên cuối là mọi lượt
chấm chết ở bước sandbox. Nó KHÔNG lộ ra khi cài đặt, vì lúc cài thì người cài đang đăng nhập — chính
phiên của họ đang giữ thư mục sống. Bẫy chỉ bung sau khi họ thoát ra.

**Sửa, một lần cho mỗi máy:**

```bash
sudo loginctl enable-linger ubuntu          # <-- user chay dich vu
loginctl show-user ubuntu --property=Linger # phai ra Linger=yes
systemctl is-active user@1000.service       # phai ra active
ls -ld /run/user/1000                       # phai ton tai, chu so huu la user do
```

`enable-linger` bảo systemd giữ **user manager** của tài khoản ấy chạy độc lập với phiên đăng nhập, nên
`/run/user/1000` tồn tại vĩnh viễn. Đảo ngược được bằng `disable-linger`.

**Xác minh HAI tầng — tầng thứ hai mới là tầng chứng minh được:**

1. *Lượt chấm thật* sau khi bật (06/09, 03:41→03:44, 191 giây, VERDICT PASS, không cảnh báo podman nào).
   ⚠ Nhưng lượt ấy chạy **trong lúc có phiên SSH mở**, nên `/run/user/1000` tồn tại dù có linger hay không.
   Nó chứng minh đường sandbox chạy được — **không** chứng minh linger làm được việc của nó.
2. *Chạy podman khi KHÔNG có phiên nào* — đây mới là ca đã hỏng. Dựng bằng cách hẹn giờ rồi thoát SSH:

```bash
sudo systemd-run --on-active=70 --unit=kiem-podman --uid=1000 --gid=1000 --setenv=HOME=/home/ubuntu \r
  /bin/bash -c '{ loginctl list-sessions --no-legend | wc -l; ls -ld /run/user/1000; \r
     podman run --rm <anh> node -e "console.log(42)"; } > /tmp/kq.txt 2>&1'
# roi THOAT SSH va khong ket noi lai cho den khi no chay xong
```

Kết quả đo 06/09 lúc 04:01: `phiên đang mở: 0` · `/run/user/1000` tồn tại · container in ra `42` · `exit=0`.

⛔ **Bật xong đừng tin suông, và đừng kiểm trong lúc đang SSH.** Lỗi này nằm ở bước sandbox chứ không ở
bước khởi động, nên `systemctl is-active` xanh không nói gì; và chính phiên SSH của người đi kiểm sẽ che
mất lỗi. Phép kiểm phải chạy ở trạng thái KHÔNG có ai đăng nhập, nếu không nó đo một máy khác với máy thật.

⚠ **Thêm một máy chủ mới thì phải làm lại bước này** — nó là cấu hình của máy, không nằm trong gói deploy.

⚠ **Phép kiểm cô lập của engine YẾU HƠN yêu cầu thật.** `detectIsolation` chạy `podman --version`, tức nó
trả lời *«podman có cài không»* chứ không trả lời *«podman có chạy nổi một container ở đây không»*. Hai câu
ấy khác nhau đúng ở ca này. Chưa đo được engine đã báo mức nào cho lượt hỏng — lượt ấy chết trước khi ghi
verdict — nên đừng suy; nhưng khoảng cách giữa hai câu hỏi là có thật và ghi ở nợ #29.

## Bốn khác biệt so với chạy trên máy dev (đều đã xử, ghi để lần sau khỏi mò)

| # | Trên máy dev | Trên server | Đã xử thế nào |
|---|---|---|---|
| 1 | Model gọi qua **Claude Code CLI** (đã đăng nhập) | Headless — nhưng CLI **vẫn đăng nhập được** qua terminal SSH (`claude login` bằng user `ubuntu`) hoặc dán token thuê bao qua giao diện; prod hiện chạy gói thuê bao theo đường này | Không có gói thuê bao thì dùng **API key** trong `/etc/checkmate.env`. ⚠ Tài khoản API tính **credit riêng** — hết credit thì API trả 400 "credit balance is too low" |
| 2 | Không token thì lùi về lệnh **`gh`** của máy | Không có `gh` | Bắt buộc `GITHUB_TOKEN`; code đọc env (env thắng config.json) |
| 3 | `git fetch` repo private dùng credential manager của Windows | Không có credential nào | **App** tự mang `GITHUB_TOKEN` vào URL của chính lệnh fetch, dùng một lần, không ghi ra đĩa (R4.28). **Shell tay thì KHÔNG** — `git pull` từ SSH trả Authentication failed vì shell không nạp `/etc/checkmate.env`; đó là lý do deploy đi đường tar chứ không git pull |
| 4 | `HOME` luôn có | systemd không tự set | `Environment=HOME=/home/ubuntu` trong unit — thiếu thì git không đọc `~/.gitconfig` (safe.directory…) và Claude Code CLI không tìm thấy phiên đăng nhập ở `~/.claude` |

**Token GitHub với repo private:** phải là fine-grained có repo đó trong *Only select repositories*.
Nếu chưa cấp, GitHub trả **404 (không phải 403)** để giấu sự tồn tại của repo — đừng tưởng sai tên repo.

## Nhà cung cấp model — nhiều nguồn, đổi trong Cấu hình, có cổng kiểm

Từ 27/08, **nhà cung cấp** (ai chạy model) và **phương thức** (tiền ra từ đâu) là hai thứ tách bạch:

| Nhà cung cấp | Phương thức hỗ trợ | Khoá cần | Ghi chú |
|---|---|---|---|
| Anthropic (Claude) | Gói thuê bao · API | `ANTHROPIC_API_KEY` (chỉ cho phương thức API) | Gói thuê bao chạy qua Claude Code CLI, không tiêu credit |
| GitHub Models | API | `GITHUB_MODELS_TOKEN` (scope `models:read`) | Có hạn mức miễn phí — hợp làm đường dự phòng |
| OpenAI | API | `OPENAI_API_KEY` | Tính tiền theo tài khoản OpenAI |

Mỗi nhà cung cấp là một **thẻ gập** trong ⚙ Cấu hình, giữ cấu hình riêng (phương thức + model + khoá)
nên đổi qua đổi lại không mất thiết lập.

**Cổng kiểm (không bỏ qua được):** nút *Dùng nhà cung cấp này* chỉ bật sau khi *Kiểm tra* thành công
**với đúng model + phương thức đang chọn**. Đổi model hay phương thức sau khi kiểm → huy hiệu chuyển
"cần kiểm lại" và cổng từ chối (HTTP 409). Lý do: nguồn model chạy được với model này chưa chắc chạy
được với model kia, và một verdict sai vì chọn nhầm nguồn thì tốn hơn nhiều so với 3 giây bấm kiểm.

Khoá của từng nhà cung cấp lưu ở `.secrets.json` quyền 600 (gitignore); trạng thái kiểm ở
`.ncc-verify.json`. Biến môi trường của dịch vụ **thắng** khoá dán qua giao diện — với MỘT ngoại lệ có
chủ đích: khi phương thức là **gói thuê bao**, `ANTHROPIC_API_KEY` bị CẮT khỏi môi trường của tiến trình
CLI (danh sách cho phép R8.12), vì Claude Code thấy key là lặng lẽ tính tiền API trong khi người vận
hành tưởng đang tiêu gói. «Thắng» áp cho việc CHỌN khoá của phương thức đang dùng, không có nghĩa là
key API len được vào đường thuê bao.

## Chọn nguồn model: gói Claude Code hay API — đổi ngay trong Cấu hình

Trang **⚙ Cấu hình → Agent review** hiện trạng thái cả hai đường trên chính máy chủ này, và có nút
**Thử nguồn đang chọn** để biết ngay dùng được chưa — prompt cố định `«Trả lời đúng hai ký tự: OK»` (~10 token vào), trần **16 token ra** ở đường API, timeout **120 giây** ở đường CLI.

| Nguồn | Khi nào chọn | Điều kiện trên máy chủ |
|---|---|---|
| **Anthropic API** | Muốn chạy ngay, không phụ thuộc phiên đăng nhập | `ANTHROPIC_API_KEY` trong `/etc/checkmate.env` + ví credit **đúng tổ chức/workspace của key** |
| **Claude Code CLI** | Muốn dùng gói thuê bao sẵn có, không tốn credit API | Đã cài `claude` (xong) **và** đã đăng nhập bằng **user `ubuntu`** — user chạy dịch vụ |

> ⚠ **Bẫy tiền đã chặn:** theo tài liệu Claude Code, `ANTHROPIC_API_KEY` **thắng** cả token gói thuê bao
> lẫn phiên `claude login`. Nghĩa là nếu để nguyên key trong môi trường rồi chọn "Claude Code CLI",
> lượt chấm **vẫn tiêu credit API** trong khi màn hình báo xanh. CheckMate nay **cắt `ANTHROPIC_API_KEY`
> khỏi tiến trình CLI** — chọn CLI là thật sự dùng gói thuê bao, hoặc báo đỏ "chưa đăng nhập". Hai nguồn
> tiền không bao giờ lẫn nhau.

### Ba cách cho CLI dùng gói thuê bao

1. **`claude login` trên máy chủ** — cần terminal, chạy bằng **đúng user `ubuntu`** (đừng `sudo`).
2. **Dán token qua giao diện** (không cần SSH): chạy `claude setup-token` trên **máy có trình duyệt**,
   copy token, dán vào ⚙ Cấu hình → *Token gói thuê bao Claude Code* → Lưu. Token vào `.secrets.json`
   quyền 600 (gitignore), không nằm trong `config.json`.
3. **Đặt `CLAUDE_CODE_OAUTH_TOKEN` trong `/etc/checkmate.env`** rồi restart — hợp khi quản trị bằng script.

`claude setup-token` **không chạy được qua web**: nó cần terminal thật (thử `echo | claude setup-token`
thì không in gì), nên không có cách bấm-một-nút-là-đăng-nhập-xong ngay trong tool.

### Đăng nhập CLI trên máy chủ (chủ máy tự làm)
```
ssh ubuntu@47.131.132.95
claude login          # hoặc: claude setup-token   (mở link, dán mã trên máy có trình duyệt)
claude --version && claude -p --tools "" --no-session-persistence <<< "Trả lời OK"
```
Đăng nhập bằng **đúng user `ubuntu`** (đừng dùng `sudo`), vì systemd chạy dịch vụ dưới user đó và
đọc thông tin đăng nhập trong `/home/ubuntu`. Xong thì vào Cấu hình chọn **Claude Code CLI** → *Lưu* →
bấm **Thử nguồn đang chọn**: xanh là dùng được, đỏ sẽ nói rõ thiếu gì.

## Hai thứ CHỦ MÁY phải tự điền (không ai điền hộ được)
```
sudo nano /etc/checkmate.env      # quyền 600
  ANTHROPIC_API_KEY=sk-ant-...    # CHỈ cần khi dùng phương thức API; gói thuê bao qua CLI thì không (xem «Ba cách cho CLI dùng gói thuê bao»)
  GITHUB_TOKEN=ghp_...            # để hàng đợi PR tự nạp (server không có lệnh gh như máy dev)
sudo systemctl restart checkmate
```

## Tự động ở cổng — ba công tắc riêng (R6.15)

| việc | mặc định | ghi chú |
|---|---|---|
| đăng verdict + finding lên PR | **bật** | chạy cho MỌI lượt chấm, không riêng chế độ trực |
| gắn trạng thái commit success/failure | **bật** | chặn nút merge trên GitHub, gỡ được |
| tự trả về dev (ĐÓNG pull request) | **tắt** | chỉ khi FAIL có finding mức high; bật trong ⚙ Cấu hình |

Nguyên tắc: tự động hoá được phép nói KHÔNG, không được phép nói CÓ — máy không bao giờ tự merge,
không có công tắc nào bật được điều đó. Hành động do máy ghi sổ dưới tên `ci-bot`, không mượn tên người.

Tài khoản cho tác nhân máy dùng vai `tu_dong` (chạy chấm + trả về dev, KHÔNG sửa cấu hình, KHÔNG merge):

```
npm run tai-khoan -- them ci-bot --vai tu_dong
```

## Chế độ trực

Repo nào đã thêm trong ⚙ Cấu hình và bật `truc.bat: true` thì prod tự động chấm mọi PR mới của repo đó
(poller theo chu kỳ), đăng verdict + gắn commit status theo ba công tắc ở trên. Engine đọc hợp đồng
`checkmate.yml` và hồ sơ của repo từ bản clone dưới `repos/`, không từ thư mục deploy.

Clone này KHÔNG tự cập nhật cây làm việc (fetch chỉ cập nhật refs). Hợp đồng `checkmate.yml` đọc từ cây
làm việc của clone — mỗi lần deploy cập nhật nó bằng lệnh MANG TOKEN (shell tay không nạp env, `git pull`
trần sẽ trả Authentication failed như bảng trên đã nói):

```
sudo bash -c '. /etc/checkmate.env; git -C /home/ubuntu/checkmate-app/checkmate/repos/thangvv111-checkmate   pull https://x-access-token:$GITHUB_TOKEN@github.com/thangvv111/checkmate.git main'
```

Token chỉ nằm trong URL của đúng lệnh đó, không ghi vào `.git/config` (R4.6).

## Lệnh hay dùng
```
sudo systemctl status checkmate          # trạng thái
sudo systemctl restart checkmate         # nạp lại sau khi đổi env/config
tail -f ~/checkmate-app/checkmate.log    # log chạy
```

## Cập nhật code

### Kiểm sau mỗi lần deploy: quyền file cơ sở dữ liệu (R11.8)

```bash
ls -l web-runs/checkmate.db web-runs/checkmate.db-wal web-runs/checkmate.db-shm
```

Cả ba phải là `-rw-------` (600). File `-wal` và `-shm` mang **cùng dữ liệu** với file chính — trong đó có
hash mật khẩu — nên để hở chúng là khoá cửa trước rồi mở cửa sau.

Lưới `test/identity-session.test.ts` chỉ kiểm được **lời gọi** `chmodSync`, không kiểm được quyền thật trên
đĩa: một ca đọc quyền sẽ đỏ trên máy dev Windows và xanh trên Linux, mà lưới nói khác nhau tuỳ máy là lưới
người ta sẽ bỏ qua. Nên phần này là kiểm tay, và đây là chỗ của nó.


> ⚠ **Bản hướng dẫn cũ ở mục này XOÁ SỔ DỮ LIỆU PROD.** Lệnh `tar --exclude=node_modules` gói theo cả
> `config.json`, `.secrets.json`, `web-runs/`, `probes-lib/` và `runs/` của MÁY DEV rồi giải nén đè lên
> server — tức thay sổ cái, lịch sử chấm và thư viện probe của prod bằng dữ liệu máy dev. Chính tài
> liệu này có câu «mất volume là mất tài sản regression»; lệnh cũ là cách nhanh nhất để làm đúng điều
> đó. Không dùng lại. Quy trình đúng bên dưới.

> ⚠ **`runs/` nay là DỮ LIỆU ĐANG SỐNG, không còn chỉ là kết xuất cuối.** Mỗi lượt chấm ghi sổ sự kiện
> chỉ-ghi-thêm vào `runs/<id>/events.jsonl` **ngay khi sự kiện sinh ra**, và tiến trình web đọc file đó
> chứ không đọc đường ống. **Xoá `runs/` là giết mọi lượt đang chạy**, không chỉ mất lịch sử. Nó nằm
> trong nhóm không-đè cùng `web-runs/` và `probes-lib/`.

> ⛔ **`systemctl restart` GIỮA LÚC ĐANG CHẤM VẪN GIẾT LƯỢT ẤY — đo được 4 lần ngày 05/09.**
>
> Bản trước của mục này viết: *«restart giữa lúc đang chấm nay không còn mất lượt — web sống lại là nối
> tiếp đúng chỗ đang dở»*. Câu ấy **sai**, và nó sai theo hướng nguy hiểm: người deploy đọc xong sẽ restart
> mà không nhìn hàng đợi.
>
> Thứ sổ sự kiện cứu được là **SỰ KIỆN**, không phải **LƯỢT CHẤM**. Tiến trình engine là con của dịch vụ,
> nằm cùng cgroup systemd, nên `restart` giết nó theo. Web sống lại đọc được mọi sự kiện đã ghi, rồi
> **đánh dấu lượt ấy là `loi`** — log ghi `Đánh dấu lỗi 1 lượt có tiến trình đã chết: <id>`.
>
> Đo được 05/09, bốn lượt, mỗi lượt bắt đầu ngay trước một lần deploy:
>
> | lượt bắt đầu | restart | cách nhau |
> |---|---|---|
> | 16:52:08 | 16:54:31 | 2 phút |
> | 18:06:14 | 18:09:03 | 3 phút |
> | 18:23:52 | 18:24:10 | **18 giây** |
> | 21:21:16 | 21:47:55 | 26 phút (PR 34 file, còn đang chạy) |
>
> **Trước khi deploy, xem hàng đợi có lượt nào đang chạy không:**
> ```bash
> curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4001/    # tren may chu
> # hoac doc thang:
> cd ~/checkmate-app/checkmate && node -e "const {DatabaseSync}=require('node:sqlite');
>   const d=new DatabaseSync('web-runs/checkmate.db',{readOnly:true});
>   console.log(d.prepare(\"select count(*) c from run where trang_thai='dang_chay'\").get().c)"
> ```
> Khác 0 thì **chờ nó xong rồi hãy deploy**, hoặc chấp nhận mất lượt ấy và chấm lại sau — mất một lượt
> chấm không phải mất dữ liệu, nhưng nó là một PR tạm thời không có checker đứng sau.

**Bước 1 — sao lưu trên server TRƯỚC (không có bước này thì không có đường lùi):**
```
ssh -i ~/.ssh/lightsail-key.pem ubuntu@47.131.132.95
cd ~/checkmate-app/checkmate
MOC=$(date +%Y%m%d-%H%M%S); SL=~/checkmate-backup-$MOC; mkdir -p $SL
cp -p .secrets.json config.json .ncc-verify.json $SL/ 2>/dev/null
cp -rp web-runs probes-lib runs $SL/ 2>/dev/null
du -sh $SL          # ghi lại số này
```

**Bước 2 — đóng gói CHỈ SẢN PHẨM trên máy dev** (script tự kiểm ba lớp: bí mật · dữ liệu prod · hồ sơ xây dựng):
```
cd <thư mục cha của checkmate>
bash checkmate/scripts/pack-deploy.sh checkmate-deploy.tar.gz   # in "OK: …" — có mục vi phạm thì liệt kê tên, xoá gói, thoát 1
scp checkmate-deploy.tar.gz ubuntu@47.131.132.95:~
```
Gói KHÔNG mang `openspec/`, `docs/`, `test/`, `bench/`, `_ref/`, `.claude/`, `scripts/`, `checkmate.yml`, luật
của agent (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) — đó là hồ sơ xây dựng, không phải sản phẩm (PO chốt
02/09). Engine đọc hợp đồng và hồ sơ của mọi repo đích từ bản clone `repos/…`, không từ thư mục deploy.
Lưới `test/deploy-bundle.test.ts` giữ danh sách loại đủ; thêm thư mục xây dựng mới thì thêm vào script,
kẻo lưới đỏ.

**Bước 3 — giải nén, cài, khởi động lại:**
```
tar -xzf ~/checkmate-deploy.tar.gz -C ~/checkmate-app
# DỌN MỘT LẦN (lần deploy đầu sau change product-independent-of-openspec): tar không xoá thứ các lần
# deploy trước đã đẩy lên. Chỉ xoá hồ sơ xây dựng — KHÔNG đụng web-runs, probes-lib, runs, repos, bí mật.
rm -rf ~/checkmate-app/checkmate/{openspec,docs,test,bench,_ref,.claude,.github,probes-lib-bench,scripts}
rm -f  ~/checkmate-app/checkmate/{checkmate.yml,AGENTS.md,CLAUDE.md,GEMINI.md,vitest.config.ts,.gitignore}
cd ~/checkmate-app/checkmate && npm install --no-audit --no-fund
sudo systemctl restart checkmate
```
Sau lần deploy đầu bằng script: chạy một lượt chấm trên repo demo để xác nhận gói không thiếu thứ sản
phẩm cần (sai về phía «thiếu» phải lộ ngay ở đây, không phải ở người dùng).

**Bước 4 — xác nhận dữ liệu còn nguyên (đối chiếu với số ở bước 1):**
```
systemctl is-active checkmate
tail -20 ~/checkmate-app/checkmate.log     # tìm dòng di trú và dòng chuyển token
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4001/     # phải 200
```
Đếm lại số hàng `so_cai` / `so_cong` / `run` trong `web-runs/checkmate.db` và số probe trong
`probes-lib/`; chúng phải bằng hoặc lớn hơn trước khi deploy. Nhỏ đi là đã mất dữ liệu — khôi phục
ngay từ `~/checkmate-backup-<mốc>`.

**Vì sao không `git pull`:** repo là private, và token chỉ được APP tự mang vào lệnh fetch của nó
(R4.28) — **shell tay không nạp** `/etc/checkmate.env`, nên `git pull` từ SSH trả `Authentication failed`. Cây trên server cũng đã lệch khỏi lịch sử git vì các lần deploy tar trước ghi
đè lên nó — nên «deploy» ở đây là ghi đè source, không phải cập nhật theo git.
