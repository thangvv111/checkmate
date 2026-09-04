# CheckMate trên server — ghi chú vận hành

URL: https://checkmate.botswain.net (Lightsail 47.131.132.95, dùng chung máy với tingpos.vn)

## Kiến trúc
- systemd unit `checkmate` → `npx tsx apps/web/src/server.ts`, cổng nội bộ **4001** (Ting giữ 80/443 qua nginx).
- nginx vhost `/etc/nginx/sites-available/checkmate` → proxy 4001, **tắt buffering** cho SSE (log chấm chảy realtime), timeout 600s.
- SSL Let's Encrypt (certbot --nginx), tự gia hạn, hết hạn 25/11/2026. HTTP tự chuyển HTTPS.
- Source: `/home/ubuntu/checkmate-app/{checkmate,demo-credit-approval,demo-python}`; log: `~/checkmate-app/checkmate.log`.
- `CHECKMATE_MODE=org` → mở /settings và cổng merge/reject (đã an toàn nhờ lớp Basic Auth nginx bên dưới; đổi về `demo` trong unit systemd nếu muốn khoá chỉ-đọc).
- **HTTP Basic Auth** ở tầng nginx: user `checkmate`, mật khẩu do chủ máy chọn (hash apr1 tại
  `/etc/nginx/.htpasswd-checkmate`, quyền 640 root:www-data). Có **hai** đường được miễn trừ auth,
  và chỉ hai: `/.well-known/acme-challenge/` (thiếu thì certbot renew thất bại, SSL chết sau 90 ngày) và
  `/api/webhook/github` (GitHub không gửi được Basic Auth). Xem mục webhook bên dưới trước khi mở đường thứ hai.

### Đổi mật khẩu về sau
```
printf '%s' 'MAT-KHAU-MOI' | openssl passwd -apr1 -stdin   # ra hash
sudo nano /etc/nginx/.htpasswd-checkmate                    # sửa thành  checkmate:HASH
sudo systemctl reload nginx
```

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
    auth_basic off;                 # GitHub khong gui duoc Basic Auth
    proxy_pass http://127.0.0.1:4001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

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

## Trần thư viện probe — con số DUY NHẤT ở màn Cấu hình xoá được dữ liệu

Màn Cấu hình → **Độ sâu review** → ô **Trần thư viện probe** (mặc định **100**, đếm theo probe không
theo file). Nó điều tiết `probes-lib/` — tài sản regression tích luỹ qua từng lượt chấm, nằm trong nhóm
**không đè khi deploy**.

⚠ **Hạ trần là ĐÀO THẢI probe đang có**, ngay ở lượt nạp kế tiếp. Mỗi probe là một phép thử đã từng chứng
minh được điều gì đó; mất rồi thì nâng trần lên lại không lấy lại được. Ô nhập nói thẳng điều này ngay tại
chỗ, nhưng đây là chỗ ghi lại cho người vận hành đọc trước khi động vào.

Gói design đề xuất **40** cho bản cài mới. Con số ấy cố ý **không** được đặt làm mặc định: mọi bản đang
chạy đều chưa khai trường này, nên lấy 40 làm mặc định sẽ đào thải tới 60 probe của họ chỉ vì một lần cập
nhật. Đổi trần là quyết định của người vận hành.

Kiểm trần đang áp trên máy chủ:

```bash
grep -o '"tran_thu_vien":[0-9 ]*' /home/ubuntu/checkmate-app/checkmate/config.json   # trong khong co = 100
for d in /home/ubuntu/checkmate-app/checkmate/probes-lib/*/; do
  echo -n "$(basename $d): "; node -e "console.log(JSON.parse(require('fs').readFileSync('$d/meta.json','utf8')).probes.length)"
done
```

Số probe của repo nào **vượt** trần mới thì phần vượt bị đào thải ở lượt chấm kế tiếp của chính repo đó.

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
> chứ không đọc đường ống. Hệ quả cho việc deploy: `systemctl restart checkmate` **giữa lúc đang chấm**
> nay không còn mất lượt — web sống lại là nối tiếp đúng chỗ đang dở. Đổi lại, **xoá `runs/` là giết
> mọi lượt đang chạy**, không chỉ mất lịch sử. Nó nằm trong nhóm không-đè cùng `web-runs/` và
> `probes-lib/`.

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
