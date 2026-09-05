## Context

Prod (`checkmate.botswain.net`, Lightsail dùng chung máy với tingpos.vn) đang có hai lớp: HTTP Basic Auth ở
nginx, và cửa phiên trong ứng dụng. Change này gỡ lớp ngoài và bù vào lớp trong thứ nó đang thiếu.

Đo trước khi thiết kế:

```bash
grep -rn "rate\|throttl\|lockout\|attempt" apps/web/src/*.ts   # 0 cho ket qua thuc su
grep -n "listen(" apps/web/src/server.ts                       # app.listen(port, '127.0.0.1', …)
ssh … 'ss -tlnp | grep 4001'                                   # LISTEN 127.0.0.1:4001  (khong 0.0.0.0)
ssh … 'sudo cat /etc/nginx/sites-available/checkmate'          # X-Real-IP $remote_addr        (GHI DE)
                                                               # X-Forwarded-For $proxy_add_…  (NOI THEM)
```

Lớp trong đã chắc ở mọi chỗ khác: allowlist mặc-định-chặn, scrypt N=16384, `timingSafeEqual`, băm giả cho
tài khoản không tồn tại, token phiên chỉ lưu hash, cookie HttpOnly + SameSite + Secure. Thiếu đúng một thứ,
và nó là thứ duy nhất lớp ngoài đang che.

## Goals / Non-Goals

**Goals**
- Rào `/login` chống dò mật khẩu **và** chống DoS-bằng-scrypt, tự viết, không thêm phụ thuộc.
- Gỡ `auth_basic` ở nginx sau khi rào đã đứng.
- Viết lại — không xoá — biện minh cho `CHECKMATE_MODE=org` trong `DEPLOY.md`.

**Non-Goals**
- **Không** làm 2FA, CAPTCHA, hay danh sách IP cho phép. Chúng giải bài toán khác và mỗi cái là một change.
- **Không** đụng `/api/webhook/github` — nó có hai gác riêng (HMAC + repo đã khai) và hồ sơ rủi ro khác hẳn.
- **Không** ghi trạng thái rào vào SQLite (xem D2).
- **Không** đổi thuật toán băm, hạn phiên, hay hình dạng cookie.

## Decisions

### D1 — Rào là hàm THUẦN, tách khỏi `server.ts`

Cùng khuôn `session-gate.ts` / `probe-gate.ts`: `server.ts` mở cơ sở dữ liệu, dựng `express()`, gắn 40+
route, nên một ca test muốn kiểm «sai lần thứ 4 thì chờ 2 giây» mà phải khởi động cả máy chủ thì nó không
còn là ca của hàm thuần — án lệ đã đo: hai ca đầu tiên của `session-gate` chạm trần 5 giây rồi đỏ.

Trạng thái nằm trong một đối tượng truyền vào, đồng hồ truyền vào. Không có `Date.now()` gọi thẳng, không
có biến module toàn cục — cả hai làm ca test phụ thuộc thứ tự chạy.

### D2 — Trạng thái trong BỘ NHỚ, không trong SQLite

**Đã cân nhắc SQLite** (bền qua restart, có vết để soi sau). **Bỏ, vì nó tự mâu thuẫn:** ghi một hàng cho
mỗi lần đăng nhập sai biến `/login` thành một máy bơm ghi đĩa — tức chính cái rào chống DoS lại mở một
đường DoS mới, rẻ hơn đường nó vừa bịt (ghi đĩa đắt hơn tra bảng bộ nhớ). Sổ cái ở đây là **chỉ-ghi-thêm và
có trigger**, nên mỗi lần thử sai còn kéo theo chi phí trigger.

Mất trạng thái khi restart là mất thật, nhưng **kẻ tấn công không gây ra được restart** — họ chỉ chạm tới
nginx, và `systemctl restart` là thao tác của người vận hành. Deploy làm mất chuỗi phạt: chấp nhận, vì
deploy hiếm và do người chủ động.

Hệ quả kèm theo, và nó là một cặp nhất quán: trạng thái sống trong tiến trình ⇒ dùng được **đồng hồ đơn
điệu** (`performance.now()`), thứ không nhảy khi NTP chỉnh giờ. `Date.now()` nhảy lùi thì án phạt kéo dài
bất thường; nhảy tiến thì án phạt **hết sớm** — tức fail-open, đúng thứ ⛔C2 cấm.

### D3 — Từ chối bằng TRẢ LỜI NGAY, không bằng `sleep`

Cách viết quen thuộc của backoff là `await sleep(delay)` rồi mới xử lý. Ở đây nó sai theo đúng hướng nguy
hiểm: connection bị giữ suốt thời gian ngủ, nên kẻ tấn công mở 500 request là chiếm 500 connection **miễn
phí** — rào tự biến thành công cụ vắt cạn pool. Trả lời ngay kèm «thử lại sau N giây» tốn của họ đúng một
round-trip.

### D4 — Khoá đếm lấy từ `X-Real-IP`, và vì sao đó KHÔNG phải chuyện gu

`$proxy_add_x_forwarded_for` = `$http_x_forwarded_for, $remote_addr` — nó **nối** `$remote_addr` vào **sau**
giá trị client tự khai. Nên:

```
Client gui:   X-Forwarded-For: 1.2.3.4
Nginx chuyen: X-Forwarded-For: 1.2.3.4, <ip that>      <- phan tu DAU do client viet
              X-Real-IP:       <ip that>               <- nginx GHI DE, client khong chen duoc
```

Đọc phần tử đầu của XFF (cách viết phổ biến nhất) thì đổi header mỗi request là mỗi request thành một IP
mới ⇒ **rào biến mất hoàn toàn, trong khi mọi ca test đơn vị vẫn xanh và log vẫn trông như đang chặn.** Đây
là loại hỏng nguy hiểm nhất trong repo này: xanh trên hệ đã hỏng.

Tiền đề làm `X-Real-IP` tin được: app nghe **`127.0.0.1` only** (đo bằng `ss`), nên nginx là đường vào duy
nhất. Tiền đề ấy nằm trong spec, và có ca khoá địa chỉ nghe — vì nếu ai đó đổi sang `0.0.0.0` thì header
này thành client-tự-khai và rào mất hiệu lực **mà không có triệu chứng gì**.

Không dùng `app.set('trust proxy')`: nó khiến `req.ip` đọc XFF theo quy tắc riêng của express, tức đưa
quyết định an toàn ra khỏi tầm mắt và vào một cấu hình khung. Đọc header thẳng, một hàm, có ca test.

### D5 — Đếm cả tên KHÔNG tồn tại, nên bảng phải có trần

Chuỗi ràng buộc, mỗi bước ép bước sau:

```
R11.10: thong diep khong duoc phan biet tai khoan co that
   -> rao phai xu ly ten khong ton tai Y HET ten co that
        (khong thi HANH VI CHAN tro thanh cua do, dung cua vua bit)
      -> ke tan cong gui ten ngau nhien lam bang phinh vo han
         -> bang PHAI co tran + phep loai bo
```

Phép loại bỏ **không được** là LRU thuần: kẻ tấn công bơm tên rác để đẩy mục phạt của chính mình ra khỏi
bảng là **tự xoá án**. Thứ tự loại bỏ: (1) mục đã hết hạn phạt, (2) mục có chuỗi sai **thấp nhất**. Mục bị
phạt nặng là mục đắt nhất để mất, nên nó ra sau cùng.

### D6 — Tham số

| hằng | trị | vì sao trị đó |
|---|---|---|
| `IP_FAIL_CAP` | 10 | Người thật gõ sai 3–5 lần là nhiều; 10 chừa biên cho gõ nhầm bàn phím/khoá caps. |
| `IP_WINDOW_MS` | 15 phút | Đủ dài để một trận dò chậm vẫn dồn vào cùng cửa sổ. |
| `IP_BLOCK_MS` | 15 phút | Bằng cửa sổ: đơn giản, và đủ để dò-vét-cạn thành vô vọng. |
| `ACCOUNT_FREE_TRIES` | 2 | Hai lần đầu không phạt — gõ nhầm một lần là chuyện thường ngày. |
| `ACCOUNT_BACKOFF_BASE_MS` | 1 giây | Từ lần sai thứ 3: 1s, 2s, 4s, 8s… |
| `ACCOUNT_BACKOFF_CAP_MS` | 60 giây | Trần. Đủ để dò tự động chết, đủ ngắn để người thật không bỏ cuộc. |
| `THROTTLE_MAX_ENTRIES` | 4096 | Trần bảng, cho cả hai xô. |
| `LOG_MIN_INTERVAL_MS` | 60 giây | Trần tần suất ghi log của rào (xem D7). |

Con số ở đây là **quyết định vận hành, không phải hằng số vật lý** — chúng nằm cạnh nhau trong một khối có
tên để đổi được mà không phải lần theo code.

### D7 — Ghi sổ: che tên, và có trần tần suất

Hai bẫy, cả hai đã có án lệ ở lớp khác của repo này:

1. **⛔C3 — tên tài khoản là dữ liệu nhạy cảm ở đây.** Ô tên là chỗ người ta gõ nhầm mật khẩu vào. Ghi tên
   thử nguyên văn = ghi mật khẩu của chính người vận hành vào log. Che bằng `sha256(tên)` cắt 8 ký tự đầu:
   **phân biệt được hai giá trị khác nhau** (⛔C3 đòi đúng điều đó) mà không đọc ngược được.
2. **Log là đường DoS thứ hai.** Một dòng mỗi lần thử ⇒ trận dò thành trận làm đầy đĩa. Nên rào ghi **tổng
   hợp**: nhiều nhất một dòng mỗi `LOG_MIN_INTERVAL_MS` cho mỗi xô, kèm số lần đã dồn.

## Architecture

`apps/web/src` — trọn vẹn. Không chạm `packages/harness` (engine) hay `packages/shared`.

```
POST /login
  │
  ├─ clientKey(req)            <- X-Real-IP; fallback socket; fallback khoa chung   [D4]
  │
  ├─ evaluateLoginAttempt({ ipKey, accountKey, state, now })                        [D1]
  │      │
  │      ├─ tu choi ──> 303 /login?cho=<giay>   ── KHONG goi verifyPassword ────┐
  │      │                                                                       │  ⛔ thu tu
  │      └─ cho qua                                                              │
  │            │                                                                 │
  │            ├─ verifyPassword()   <- scrypt N=16384, cham CO CHU DICH ────────┘
  │            │
  │            ├─ dung  ─> clearAccount(accountKey) + createSession
  │            └─ sai   ─> recordFailure(ipKey, accountKey)
  │
  └─ ghi so (che ten + tran tan suat)                                            [D7]
```

Hàm thuần nằm ở `apps/web/src/login-throttle.ts`; `server.ts` chỉ nối dây và giữ đúng thứ tự.

## Data Model

**Không chạm dữ liệu prod.** Không bảng SQLite mới, không file mới trên đĩa, không đổi hình dạng gì trong
`web-runs/`, `probes-lib/`, `runs/`, `config.json`, `.secrets.json` — nên ba ràng buộc bắt buộc soi đều
không áp: không có di trú (R10.13), không có ghi file dùng chung (R8/R10.12), không có cache đọc file
(R9.14 / ⛔C6).

Trạng thái duy nhất là hai `Map` trong tiến trình, mỗi mục:

```ts
{ soLanSai: number; phatToiLuc: number /* mốc đồng hồ đơn điệu */; lanCuoi: number }
```

Không ghi ra ngoài, không đọc lại lúc khởi động, chết cùng tiến trình — đó là lựa chọn ở D2, không phải
thiếu sót.

## Risks / Trade-offs

- **[Gỡ lớp ngoài rồi mới phát hiện lớp trong có lỗ]** → Thứ tự bắt buộc: rào lên trước, merge, **deploy và
  kiểm rào chạy thật trên prod**, xong mới sửa nginx. Nếu làm ngược thì có một quãng hệ yếu hơn cả trước lẫn
  sau. `DEPLOY.md` ghi hai bước tách rời, không gộp.
- **[Rào chặn oan người vận hành lúc cần vào gấp]** → Lùi dần có trần 60s, không khoá cứng; và người chủ
  máy còn đường SSH — `systemctl restart checkmate` xoá sạch trạng thái. Đường thoát ấy ghi vào `DEPLOY.md`,
  không để người ta phải tự nghĩ ra lúc đang cuống.
- **[Trạng thái mất khi restart ⇒ kẻ dò được reset]** → Kẻ tấn công không gây được restart (chỉ chạm tới
  nginx). Deploy có gây, nhưng deploy hiếm và do người chủ động.
- **[Nhiều người sau một NAT chung một IP]** → Gác IP đếm chung cả nhóm. Chấp nhận: hệ này có một–hai người
  dùng, và gác tài khoản vẫn tính riêng nên người thứ hai không bị chuỗi phạt của người thứ nhất.
- **[Đổi địa chỉ nghe sang `0.0.0.0` sau này ⇒ `X-Real-IP` thành client-tự-khai]** → Có ca khoá địa chỉ
  nghe, và spec khai tiền đề. Không có nó thì rào mất hiệu lực **không triệu chứng**.

## Migration Plan

**N/A** — không có dữ liệu đời cũ. Rào là thành phần mới, trạng thái rỗng lúc khởi động là trạng thái đúng.

Đường lùi cho phần nginx (phần duy nhất có thể phải lùi): giữ nguyên `/etc/nginx/.htpasswd-checkmate`, chỉ
comment hai dòng `auth_basic`. Muốn lùi thì bỏ comment + `systemctl reload nginx`, không cần đặt lại mật
khẩu. Lệnh ghi trong `DEPLOY.md`.

## Open Questions

- Có nên **thấy được** trạng thái rào ở màn Cấu hình (đang chặn IP nào, tài khoản nào đang bị lùi) không?
  Nó biến một cơ chế vô hình thành thứ soi được. **Chưa làm trong change này** — nó là một bề mặt UI mới và
  làm kèm sẽ trộn hai hồ sơ rủi ro. Ghi thành nợ có tên nếu PO thấy cần.
