# Proposal — github-webhook

## Why

Hôm nay pull request vào hệ bằng **polling**: `setInterval` gọi `listPrs` mỗi chu kỳ (cấu hình hiện 180s,
kẹp `[60, 3600]`). Nó hoạt động, nhưng độ trễ tới ba phút và mỗi chu kỳ tốn một lời gọi GitHub dù không có
gì đổi.

Webhook đổi độ trễ về gần 0. PO chốt hướng này 05/09 sau khi cân ba phương án (webhook · giảm chu kỳ xuống
60s · giữ nguyên).

## Cái giá — nói trước, vì nó là lý do mục nợ đòi review riêng

`/webhook` là **cửa vào không xác thực người dùng đầu tiên** của sản phẩm.

```
Internet -> nginx (HTTPS + Basic Auth TAM THOI) -> 127.0.0.1:4001 -> app (CUA PHIEN — lop that)
              |                                                       |
              +-- webhook can ngoai le (het vai khi no #4 xong)       +-- webhook can vao OPEN_PATHS
```

**PO bổ sung 05/09: Basic Auth ở nginx sẽ bỏ (nợ #4) — sản phẩm đã có lớp xác thực riêng không dựa nginx**,
đó là cửa phiên cộng tài khoản trong cơ sở dữ liệu. Thông tin ấy đổi trọng tâm của change này, và **theo
hướng nặng thêm chứ không nhẹ đi**:

- ngoại lệ Basic Auth chỉ là chuyện **tạm** — nó hết vai khi #4 xong, nên không phải chỗ đáng lo nhất;
- nhưng sau #4, **`OPEN_PATHS` là hàng rào DUY NHẤT** giữa Internet và ứng dụng. Đưa một đường POST vào
  danh sách ấy vì thế nặng hơn, không nhẹ hơn.

Sau change, `/api/webhook/github` là **đường duy nhất từ Internet vào ứng dụng không qua xác thực nào ngoài
HMAC**. Đó là điều change này phải làm cho đúng, và là lý do `security.md` ở đây dài hơn phần còn lại.

## What Changes

- Route `POST /api/webhook/github` nhận sự kiện `pull_request`, xác thực **HMAC-SHA256** trên **raw body**.
- Bí mật webhook lưu trong kho khoá (`.secrets.json`), **không** trong `config.json`.
- Chưa cấu hình bí mật ⇒ **từ chối mọi webhook** (fail-closed), không phải cho qua.
- Payload phải trỏ **repo đã khai trong cấu hình**; repo lạ bị từ chối.
- Chạy chấm đi qua **đúng** `evaluateStartRun` như đường polling và đường bấm tay.
- Polling **giữ nguyên** — webhook là đường nhanh, polling là lưới an toàn khi webhook rớt.
- `DEPLOY.md`: khai ngoại lệ Basic Auth cho đúng một đường, và cách đặt bí mật.

## Non-Goals

- KHÔNG bỏ Basic Auth (nợ #4) — change này chỉ xin **một ngoại lệ cho một đường**.
- KHÔNG tắt polling.
- KHÔNG nhận sự kiện nào ngoài `pull_request`.
- KHÔNG mở webhook ở chế độ demo.

## Luật chạm tới

- Capability MỚI `github-webhook` (ADDED)
- ⛔C2 — thiếu bí mật, chữ ký sai, repo lạ: đều là **từ chối**, không phải cho qua
- ⛔C3 — bí mật webhook không được vọng ra log/response; kho khoá đã có `readVault`
- ⛔C4 — payload webhook là **dữ liệu ngoài** đến từ một cửa không xác thực người dùng
- ⛔C5 — export mới khai bảng module
- `session-gate` — thêm một đường vào `OPEN_PATHS` (đường POST đầu tiên không cần phiên)

## Impact

- `apps/web/src/webhook.ts` (MỚI) · `server.ts` (route + raw body) · `session-gate.ts` (`OPEN_PATHS`) ·
  `secret-vault.ts` (bí mật webhook) · `DEPLOY.md`
- Lưới mới; và `session-gate` có lưới sẵn đang khoá **đúng nội dung** `OPEN_PATHS` — nó sẽ đỏ, đó là ý muốn.
