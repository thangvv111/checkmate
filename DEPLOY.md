# CheckMate trên server — ghi chú vận hành

URL: https://checkmate.botswain.net (Lightsail 47.131.132.95, dùng chung máy với tingpos.vn)

## Kiến trúc
- systemd unit `checkmate` → `npx tsx apps/web/src/server.ts`, cổng nội bộ **4001** (Ting giữ 80/443 qua nginx).
- nginx vhost `/etc/nginx/sites-available/checkmate` → proxy 4001, **tắt buffering** cho SSE (log chấm chảy realtime), timeout 600s.
- SSL Let's Encrypt (certbot --nginx), tự gia hạn, hết hạn 25/11/2026. HTTP tự chuyển HTTPS.
- Source: `/home/ubuntu/checkmate-app/{checkmate,demo-credit-approval,demo-python}`; log: `~/checkmate-app/checkmate.log`.
- `CHECKMATE_MODE=org` → mở /settings và cổng merge/reject (đã an toàn nhờ lớp Basic Auth nginx bên dưới; đổi về `demo` trong unit systemd nếu muốn khoá chỉ-đọc).
- **HTTP Basic Auth** ở tầng nginx: user `checkmate`, mật khẩu do chủ máy chọn (hash apr1 tại
  `/etc/nginx/.htpasswd-checkmate`, quyền 640 root:www-data). Đường `/.well-known/acme-challenge/`
  được **miễn trừ auth** — nếu không, certbot renew sẽ thất bại và SSL chết sau 90 ngày.

### Đổi mật khẩu về sau
```
printf '%s' 'MAT-KHAU-MOI' | openssl passwd -apr1 -stdin   # ra hash
sudo nano /etc/nginx/.htpasswd-checkmate                    # sửa thành  checkmate:HASH
sudo systemctl reload nginx
```

## Bốn khác biệt so với chạy trên máy dev (đều đã xử, ghi để lần sau khỏi mò)

| # | Trên máy dev | Trên server | Đã xử thế nào |
|---|---|---|---|
| 1 | Model gọi qua **Claude Code CLI** (đã đăng nhập) | Headless, không đăng nhập CLI được | Dùng **API key** trong `/etc/checkmate.env`. ⚠ Tài khoản API tính **credit riêng**, không dùng chung gói Claude Code — hết credit thì API trả 400 "credit balance is too low" |
| 2 | Không token thì lùi về lệnh **`gh`** của máy | Không có `gh` | Bắt buộc `GITHUB_TOKEN`; code đọc env (env thắng config.json) |
| 3 | `git fetch` repo private dùng credential manager của Windows | Không có credential nào | Git credential helper đọc thẳng `$GITHUB_TOKEN` — **token không ghi ra đĩa lần hai** |
| 4 | `HOME` luôn có | systemd không tự set | `Environment=HOME=/home/ubuntu` trong unit (nếu thiếu, git không đọc `~/.gitconfig` → mất helper ở mục 3) |

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
`.ncc-verify.json`. Biến môi trường của dịch vụ luôn **thắng** khoá dán qua giao diện.

## Chọn nguồn model: gói Claude Code hay API — đổi ngay trong Cấu hình

Trang **⚙ Cấu hình → Agent review** hiện trạng thái cả hai đường trên chính máy chủ này, và có nút
**Thử nguồn đang chọn** (gọi một câu cực ngắn, vài giây, gần như không tốn gì) để biết ngay dùng được chưa.

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
  ANTHROPIC_API_KEY=sk-ant-...    # bắt buộc: server headless không đăng nhập Claude Code CLI được
  GITHUB_TOKEN=ghp_...            # để hàng đợi PR tự nạp (server không có lệnh gh như máy dev)
sudo systemctl restart checkmate
```

## Lệnh hay dùng
```
sudo systemctl status checkmate          # trạng thái
sudo systemctl restart checkmate         # nạp lại sau khi đổi env/config
tail -f ~/checkmate-app/checkmate.log    # log chạy
```

## Cập nhật code

> ⚠ **Bản hướng dẫn cũ ở mục này XOÁ SỔ DỮ LIỆU PROD.** Lệnh `tar --exclude=node_modules` gói theo cả
> `config.json`, `.secrets.json`, `web-runs/` và `probes-lib/` của MÁY DEV rồi giải nén đè lên server —
> tức thay sổ cái, lịch sử chấm và thư viện probe của prod bằng dữ liệu máy dev. Chính tài liệu này có
> câu «mất volume là mất tài sản regression»; lệnh cũ là cách nhanh nhất để làm đúng điều đó.
> Không dùng lại. Quy trình đúng bên dưới.

**Bước 1 — sao lưu trên server TRƯỚC (không có bước này thì không có đường lùi):**
```
ssh -i ~/.ssh/lightsail-key.pem ubuntu@47.131.132.95
cd ~/checkmate-app/checkmate
MOC=$(date +%Y%m%d-%H%M%S); SL=~/checkmate-backup-$MOC; mkdir -p $SL
cp -p .secrets.json config.json .ncc-verify.json $SL/ 2>/dev/null
cp -rp web-runs probes-lib runs $SL/ 2>/dev/null
du -sh $SL          # ghi lại số này
```

**Bước 2 — đóng gói CHỈ SOURCE trên máy dev:**
```
cd <thư mục cha của checkmate>
tar --exclude=node_modules --exclude=.git     --exclude=config.json --exclude=.secrets.json --exclude=.ncc-verify.json     --exclude=web-runs --exclude=probes-lib --exclude='probes-lib-*'     --exclude=runs --exclude=repos --exclude='*.log' --exclude='bench/kq'     --exclude=.worktrees --exclude='*.tar.gz'     -czf checkmate-deploy.tar.gz checkmate demo-credit-approval demo-python
# KIỂM gói trước khi gửi — lệnh dưới phải KHÔNG in ra dòng nào:
tar -tzf checkmate-deploy.tar.gz | grep -E "secrets|/config\.json|ncc-verify|web-runs/|probes-lib/|checkmate/runs/"
scp checkmate-deploy.tar.gz ubuntu@47.131.132.95:~
```

**Bước 3 — giải nén, cài, khởi động lại:**
```
tar -xzf ~/checkmate-deploy.tar.gz -C ~/checkmate-app
cd ~/checkmate-app/checkmate && npm install --no-audit --no-fund
sudo systemctl restart checkmate
```

**Bước 4 — xác nhận dữ liệu còn nguyên (đối chiếu với số ở bước 1):**
```
systemctl is-active checkmate
tail -20 ~/checkmate-app/checkmate.log     # tìm dòng di trú và dòng chuyển token
curl -s -o /dev/null -w '%{http_code}
' http://127.0.0.1:4001/     # phải 200
```
Đếm lại số hàng `so_cai` / `so_cong` / `run` trong `web-runs/checkmate.db` và số probe trong
`probes-lib/`; chúng phải bằng hoặc lớn hơn trước khi deploy. Nhỏ đi là đã mất dữ liệu — khôi phục
ngay từ `~/checkmate-backup-<mốc>`.

**Vì sao không `git pull`:** repo là private và trên server không có token cho git, `git fetch` trả
`Authentication failed`. Cây trên server cũng đã lệch khỏi lịch sử git vì các lần deploy tar trước ghi
đè lên nó — nên «deploy» ở đây là ghi đè source, không phải cập nhật theo git.
