# Design — github-webhook

## Context

```
HOM NAY (polling)
  setInterval -> listPrs(cfg) -> moi PR: evaluateStartRun -> chamPr
  chu ky 180s (kep [60,3600]) · do tre <= 3 phut · 1 loi goi GitHub moi chu ky

SAU CHANGE (webhook + polling)
  Internet -> nginx (Basic Auth TAM) -> 127.0.0.1:4001 -> app (CUA PHIEN — lop that)
                |                                          |
                v                                          v
              HMAC-SHA256 tren RAW BODY -> kiem repo da khai -> evaluateStartRun -> chamPr
  polling GIU NGUYEN — luoi an toan khi webhook rot

SAU KHI NO #4 XONG (bo Basic Auth)
  Internet -> nginx (chi HTTPS) -> app: OPEN_PATHS la HANG RAO DUY NHAT
  => /api/webhook/github = duong DUY NHAT vao ung dung khong qua xac thuc nao ngoai HMAC
```

## Goals / Non-Goals

**Goals**
- Độ trễ ≈ 0 cho pull request mới.
- Cửa mới có gác **không phụ thuộc một mình chữ ký**.
- Không nới lỏng gì đang có: polling giữ, Basic Auth giữ (trừ đúng một đường).

**Non-Goals**
- KHÔNG bỏ Basic Auth (nợ #4).
- KHÔNG tắt polling — xem D5.
- KHÔNG nhận sự kiện nào ngoài `pull_request`.
- KHÔNG mở webhook ở chế độ chỉ-đọc.

## Decisions

### D1 — Raw body lấy bằng `express.raw` mounted THEO ĐƯỜNG, không bằng `verify` toàn cục

`express.json()` đứng ở đầu chuỗi middleware và đã tiêu thụ body trước khi tới route. HMAC phải tính trên
**đúng chuỗi byte đã nhận**, nên cần raw.

| cách | cái mất |
|---|---|
| `express.json({ verify })` giữ raw vào `req` | **mọi** request giữ thêm một bản body trong bộ nhớ, kể cả request mang mật khẩu đăng nhập — giữ dữ liệu nhạy cảm lâu hơn cần, cho một tính năng dùng nó ở đúng một đường |
| **`app.use('/api/webhook/github', express.raw(...))` đặt TRƯỚC `express.json()`** | không có; `express.json` thấy body đã đọc thì bỏ qua |

Chọn cách hai. Nó cũng làm phạm vi đọc được bằng mắt: chỉ đường webhook có raw.

### D2 — Hàm thuần cho phép xác thực, I/O để bên ngoài

Phép kiểm chữ ký là **hàm thuần**: nhận `(raw, chữ ký, bí mật)` trả quyết định. Đọc kho khoá, đọc cấu hình,
khởi lượt chấm nằm ngoài.

Khuôn này repo đã dùng ở `session-gate`, `message-egress`, `response-secret-guard`, và lý do ở đây mạnh hơn
mọi lần trước: mỗi nhánh từ chối là **một ca** — thiếu bí mật, thiếu chữ ký, sai định dạng, sai độ dài, sai
nội dung. Với một cửa mở ra Internet, «mỗi nhánh một ca» là điều kiện tối thiểu.

### D3 — Chữ ký KHÔNG được là gác duy nhất: phải kiểm repo đã khai

Cám dỗ là dừng ở HMAC — «ai ký đúng thì tin». Không đủ:

- chữ ký chứng minh **người gửi biết bí mật**, không chứng minh **việc này nên làm**;
- bí mật rò được (lộ ở phía GitHub, hoặc dùng chung cho nhiều repo);
- một webhook hợp lệ trỏ repo lạ khiến CheckMate **clone và chạy test của repo chưa ai khai** — tức chạy
  code lạ trên máy chủ, đúng thứ sandbox tồn tại để giới hạn chứ không phải để mời vào.

Nên: `repository.full_name` phải nằm trong `cfg.repos`. Đây là gác **thứ hai độc lập** với chữ ký — hai
gác cùng hỏng mới thủng.

*Và nó sửa một chỗ lệch sẵn có:* `chamPr(cfg, so)` chấm theo `cfg.repo` — **repo đang chọn**. Webhook đến
từ repo bất kỳ đã cài, nên phải dựng cấu hình theo đúng repo trong payload, không dùng repo đang chọn.
Bỏ qua điểm này thì webhook của repo A khởi một lượt chấm trên repo B, và verdict ghi sai chỗ.

### D4 — Thông điệp từ chối HẸP ở phản hồi, ĐẦY ĐỦ ở log máy chủ

Trả lời khác nhau cho «chữ ký sai» và «bí mật chưa cấu hình» là nói cho người gửi biết trạng thái bên trong.
Nhưng người vận hành cần đúng phân biệt ấy để sửa.

Hai bề mặt, hai mức chi tiết: phản hồi nói **loại** (từ chối), log máy chủ nói **lý do**. Cùng nguyên tắc
mà `stalled-run-recovery` vừa áp cho thông điệp cổng — khác ở chỗ đây có thêm một người đọc **không đáng
tin**.

### D5 — Polling GIỮ NGUYÊN, và đó không phải là dư thừa

Cám dỗ là tắt polling khi có webhook. Không làm:

- webhook **rớt được** — GitHub thử lại vài lần rồi thôi; máy chủ nghỉ bảo trì đúng lúc ấy là mất luôn;
- webhook **cấu hình được ở phía GitHub**, tức nằm ngoài tầm kiểm soát của máy chủ;
- polling là đường **tự phục hồi**: nó không cần biết đã bỏ lỡ gì, cứ mỗi chu kỳ lại hỏi lại từ đầu.

Cái giá của việc giữ cả hai: một lời gọi `listPrs` mỗi chu kỳ, và khả năng hai đường cùng thấy một PR —
điều mà `findByPr` («một verdict một commit») đã chặn sẵn.

### D5b — Basic Auth sắp bỏ, nên trọng tâm dịch sang `OPEN_PATHS` (PO bổ sung 05/09)

PO cho biết Basic Auth ở nginx sẽ bỏ (nợ #4), và sản phẩm **đã có lớp xác thực riêng không dựa nginx** —
cửa phiên cộng tài khoản trong cơ sở dữ liệu.

Điều đó **không** làm change này nhẹ đi; nó dịch trọng tâm:

| | trước khi biết | sau khi biết |
|---|---|---|
| ngoại lệ Basic Auth ở nginx | «lỗ trên lớp đang che toàn bộ» | chuyện **tạm**, hết vai khi #4 xong |
| `/api/webhook/github` trong `OPEN_PATHS` | một trong hai lớp bị chọc | **hàng rào duy nhất** sau #4 |

Nên phần đáng đầu tư là **HMAC và gác repo**, không phải cấu hình nginx. Và D6 dưới đây — giữ cho việc mở
thêm một đường là *thay đổi nhìn thấy được* — quan trọng hơn lúc viết bản đầu.

*Một quan sát đáng ghi, không phải để phản đối:* change này **thêm** một đường mở đúng lúc #4 sắp **bỏ**
lớp che bên ngoài. Hai việc cộng lại làm `OPEN_PATHS` thành bề mặt tấn công chính của sản phẩm. Không phải
lý do dừng — nhưng là lý do #4 phải rào `/login` cho xong trước khi bỏ lớp ngoài, đúng như chính mục nợ ấy
đã viết. Đo được 05/09: `/login` hiện **chưa có** rào tần suất.

### D6 — `OPEN_PATHS` có lưới khoá ĐÚNG NỘI DUNG, và nó sẽ đỏ

`session-gate` có ca *«danh sách đường mở đúng nội dung đã chốt — thêm một đường làm ca này ĐỎ»*. Thêm
`/api/webhook/github` sẽ làm nó đỏ, và **đó là ý muốn**: mở thêm một đường không cần phiên là quyết định
phải được nhìn thấy, không phải một dòng lặng lẽ.

Sửa ca ấy là một phần của change, kèm lý do — không phải phiền toái phải né.

### D7 — Ba tầng của `test-grid-integrity`

- **tầng 1 mutation** — bắt buộc; đặc biệt cho từng nhánh từ chối. Chạy nền, `git diff` sạch trước commit.
- **tầng 2 đếm bề mặt** — **ÁP DỤNG**: change dựng một cửa mới. Đếm bằng máy mọi đường vào không cần phiên,
  và có mục **kiểm tay chạy thật** (gửi một webhook giả có chữ ký đúng và một cái sai).
- **tầng 3 cặp fixture** — nếu lưới dựng hàm quét `scan*`.

## Architecture

- `apps/web/src/webhook.ts` (MỚI) — hàm thuần xác thực + hàm thuần quyết định «có chấm không».
- `server.ts` — `express.raw` theo đường (trước `express.json`), route `POST /api/webhook/github`.
- `session-gate.ts` — thêm `/api/webhook/github` vào `OPEN_PATHS`.
- `secret-vault.ts` — đọc/ghi bí mật webhook.
- `DEPLOY.md` — ngoại lệ Basic Auth cho đúng một đường + cách đặt bí mật.

## Data Model

Kho khoá thêm một trường tuỳ chọn. Không đụng cơ sở dữ liệu, không cần di trú.

## Risks / Trade-offs

- [Cửa mở ra Internet] → D3: hai gác độc lập; và security S0 liệt kê đủ bề mặt.
- [Ngoại lệ Basic Auth ở nginx] → phạm vi đúng một đường, khai trong `DEPLOY.md`.
- [Bí mật rò] → gác repo vẫn đứng; `⛔C3` cấm vọng bí mật ra bề mặt.
- [Webhook dồn dập] → đi qua `evaluateStartRun` như mọi đường khác.

## Migration Plan

Không có bí mật ⇒ webhook từ chối tất — tức bản deploy chưa cấu hình vẫn chạy y như hôm nay (polling).
Đường lùi: gỡ ngoại lệ nginx là cửa đóng lại hoàn toàn.

## Open Questions

- Không.
