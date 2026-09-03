# Proposal — response-secret-guard

## Why

Ba luật **cùng một họ**, rải ở ba capability, tất cả đều thuộc ⛔C3:

```
R11.20  KHONG route nao tra danh sach tai khoan     -> identity-session (DA co luoi)
R9.17   KHONG route nao tra khoa, token hay bi mat  -> data-layer,   chua ai giu
R4.26   KHONG route nao tra token ve, ke ca da che  -> repo-history, chua ai giu
```

Hai điều sau đang được giữ **bằng kỷ luật**. Nhưng khuôn lưới đã dùng cho `R11.20` — «tầng route không được
gọi hàm đọc nguồn bí mật» — **không mở rộng được sang chúng**, và lý do đáng ghi:

```
:392  token_rieng: Boolean(readOwnToken(r.github))   -> chi lay CO/KHONG
:551  daCoChiaTruoc = Boolean(readOwnToken(github))  -> chi lay CO/KHONG
:438  chiaCu = readOwnToken(tenCu)                   -> GIU gia tri, de chuyen chia
                                                        sang ten repo moi khi doi ten
```

`server.ts` **đang gọi** hàm đọc token ở ba chỗ và cả ba đều đúng. Luật viết là «không route nào **trả**
token về» — không phải «không route nào **đọc** token». Một lưới cấm gọi sẽ đỏ ngay trên code đúng, và
người ta sẽ nới danh sách cho phép cho tới khi lưới thành hình thức. `R11.20` mở rộng được chỉ vì ở đó
không chỗ nào cần gọi ngoài công cụ dòng lệnh.

## Điểm đối xứng khiến change này làm được thứ `error-message-egress-gate` không làm nổi

```
error-message-egress-gate:  bi mat cua REPO DICH   -> KHONG biet gia tri
                            -> danh sach CHO PHEP theo cau truc, chap nhan AM TINH GIA

change nay:                 bi mat cua CHINH CHECKER -> BIET gia tri
                            -> SO KHOP CHINH XAC, khong am tinh gia
```

Checker tự lưu token và khoá của nó. Nên luật này chuyển được từ «quy ước có lưới quét source» sang
**cưỡng chế lúc chạy**: một lớp gác quét thân response, thấy chuỗi trùng bí mật đang lưu thì chặn.

## What Changes

- **Gác runtime** (PO chốt 03/09, hướng (b) + chặn): lớp gác bọc đường trả dữ liệu, so thân response với
  bí mật đang lưu, trùng thì **chặn**.
- **Hai bề mặt, hai cách chặn** — chúng khác nhau về bản chất, không gộp được:
  - **19 route JSON**: chưa gửi gì khi `res.json` được gọi → đổi sang lỗi máy chủ.
  - **luồng SSE** (`text/event-stream`, phát log lượt chấm): header `200` đã gửi từ trước → chỉ **cắt kết
    nối** được, không đổi được mã trạng thái. Cách chặn này yếu hơn và phải khai rõ là yếu hơn.
- **Thông điệp chặn nêu TÊN NGUỒN, không nêu giá trị** — nếu gác báo «response chứa `ghp_abc…`» thì chính
  lời báo ấy đưa bí mật vào log và lên màn hình.
- **`R4.26` và `R9.17` vẫn ở lại** `repo-history` và `data-layer` (PO chốt phương án (a)); khi backfill tới
  đó, chúng mang con trỏ sang capability này thay vì viết lại cơ chế.

## Đây KHÔNG phải backfill — nói rõ vì nó đổi luật

Sáu change trước đều là backfill: khai thành luật thứ code **đã làm**. Change này **thêm một cơ chế chưa
từng có**. `R4.26`/`R9.17` hôm nay đúng vì không ai viết route trả token, không phải vì có gì chặn.

Hệ quả phải cân: gác chạy trên **mọi** response, nên một lỗi trong nó làm hỏng toàn bộ giao diện chứ không
hỏng một chỗ. Đó là lý do requirement đòi gác phải fail-safe theo hướng «gác hỏng thì không chặn oan», và
test-cases có mục riêng cho đầu vào méo.

## Luật chạm tới

- ⛔C3 (bí mật không rò — đây là chỗ nó được cưỡng chế ở bề mặt HTTP)
- ⛔C2 (fail-closed — thấy bí mật thì chặn, không «ghi sổ rồi cho qua»)
- `identity-session › Không bề mặt nào phát danh sách tài khoản…` (lớp source-scan, bổ sung chứ không thay)
- Capability MỚI `response-secret-guard` (ADDED)
- Bảng tra: KHÔNG đổi hàng nào — `R4.26` và `R9.17` vẫn `pending` ở change của chúng

## Impact

- MỚI: module gác (hàm thuần + lớp bọc) + lưới test
- Chạm: `apps/web/src/server.ts` (gắn gác, giữ nguyên thứ tự middleware hiện có)
- `checkmate.yml` bảng module (⛔C5)
- KHÔNG đụng `secret-vault.ts`, `provider.ts`, `config.ts` — nguồn bí mật giữ nguyên
