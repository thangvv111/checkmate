# CheckMate trên server — ghi chú vận hành

URL: https://checkmate.botswain.net (Lightsail 47.131.132.95, dùng chung máy với tingpos.vn)

## Kiến trúc
- systemd unit `checkmate` → `npx tsx apps/web/src/server.ts`, cổng nội bộ **4001** (Ting giữ 80/443 qua nginx).
- nginx vhost `/etc/nginx/sites-available/checkmate` → proxy 4001, **tắt buffering** cho SSE (log chấm chảy realtime), timeout 600s.
- SSL Let's Encrypt (certbot --nginx), tự gia hạn, hết hạn 25/11/2026. HTTP tự chuyển HTTPS.
- Source: `/home/ubuntu/checkmate-app/{checkmate,demo-credit-approval,demo-python}`; log: `~/checkmate-app/checkmate.log`.
- `CHECKMATE_MODE=demo` → khoá /settings và cổng merge/reject (chỉ xem).
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
```
# trên máy dev
tar --exclude=node_modules -czf checkmate-deploy.tar.gz checkmate demo-credit-approval demo-python
scp checkmate-deploy.tar.gz ubuntu@47.131.132.95:~
# trên server
tar -xzf checkmate-deploy.tar.gz -C ~/checkmate-app && cd ~/checkmate-app/checkmate && npm install
sudo systemctl restart checkmate
```
