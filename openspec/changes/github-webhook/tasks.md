# Tasks — github-webhook

## 0. Tầng 2 của `test-grid-integrity` — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

Change này dựng một **cửa vào mới**, nên bề mặt phải đếm chứ không nhớ:

```bash
grep -o "'/[a-z-]*'" apps/web/src/session-gate.ts   # OPEN_PATHS: /login /logout /health  (3)
grep -c "app.post(" apps/web/src/server.ts          # 15 route POST — TAT CA dang sau cua phien
grep -c "app.get("  apps/web/src/server.ts          # 20 route GET
grep -c "acme-challenge" DEPLOY.md                  # 1 ngoai le Basic Auth dang co
```

- [x] 0.1 Sau change: `OPEN_PATHS` **4 đường**; `app.post(` **16** (tăng 1), `app.get(` **20** (không đổi).
      ⚠ Câu đặt ra ban đầu — «route POST đầu tiên không cần phiên» — **sai**: đếm bằng máy cho thấy
      `/login` và `/logout` vốn đã là POST trong `OPEN_PATHS`. Điều đúng là: đây là đường đầu tiên vừa
      không cần phiên vừa **gây tác dụng phụ ra ngoài phiên của chính người gọi** (khởi lượt chấm, tiêu
      token, chiếm trần). Đúng thứ tầng 2 sinh ra để bắt: trí nhớ nói một đằng, máy đếm ra một nẻo.
- [x] 0.2 Ngoại lệ Basic Auth ở nginx: **2** (acme-challenge + webhook), `location =` khớp chính xác —
      `DEPLOY.md` đếm được 2 mốc.
- [x] 0.3 Rà 16 route POST: đúng **3** nằm trong `OPEN_PATHS` — `/login`, `/logout` (cả hai chỉ đụng phiên
      của chính người gọi) và `/api/webhook/github`. Không route nào khác đi vào nhờ change này.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/github-webhook/spec.md` (3 requirement) — đã viết.
- [x] 1.2 `security.md` được đọc TRƯỚC khi viết code — mục nợ #3 đòi «security review riêng».

## 2. Hàm thuần (D2)

- [x] 2.1 `apps/web/src/webhook.ts`: hàm thuần xác thực chữ ký — nhận `(raw, chữ ký, bí mật)`.
- [x] 2.2 Mỗi nhánh từ chối là một quyết định phân biệt được: thiếu bí mật · thiếu chữ ký · sai định dạng ·
      sai độ dài · sai nội dung.
- [x] 2.3 So sánh **timing-safe**, và kiểm độ dài TRƯỚC (so timing-safe ném khi độ dài khác nhau).
- [x] 2.4 Hàm thuần quyết định «có chấm không» từ payload: loại sự kiện · hành động · repo đã khai.

## 3. Đường vào

- [x] 3.1 `server.ts`: `express.raw` mounted THEO ĐƯỜNG, đặt **trước** `express.json` (D1).
- [x] 3.2 Route `POST /api/webhook/github`.
- [x] 3.3 `session-gate.ts`: thêm `/api/webhook/github` vào `OPEN_PATHS`.
- [x] 3.4 **Sửa ca đang khoá nội dung `OPEN_PATHS`** (`identity-session.test.ts:183`) kèm lý do — nó đỏ là
      ĐÚNG Ý MUỐN (D6), không phải phiền toái phải né.
- [x] 3.5 Chế độ chỉ-đọc → từ chối.
- [x] 3.6 Chạy chấm qua ĐÚNG `evaluateStartRun`, và dựng cấu hình theo **repo trong payload** chứ không
      theo repo đang chọn (D3).

## 4. Kho khoá

- [x] 4.1 `secret-vault.ts`: đọc/ghi bí mật webhook.
- [x] 4.2 Bí mật KHÔNG vào `config.json` — nó là bí mật, không phải cấu hình.
- [x] 4.3 ⛔C5: export mới khai bảng module `checkmate.yml`.

## 5. Không rò (⛔C3)

- [x] 5.1 Phản hồi không chứa bí mật, không chứa chữ ký nhận được, không nói sai ở đâu.
- [x] 5.2 Log máy chủ nói ĐỦ lý do cho người vận hành (D4) — hai bề mặt, hai mức chi tiết.
- [x] 5.3 Đối chiếu `response-secret-guard`: bí mật webhook có nằm trong danh sách nó gác không? Nếu chưa
      thì thêm — cửa mới không được là chỗ hở của gác cũ.

## 6. Mutation — mỗi chiều chạy HAI lần, CHẠY NỀN, `git diff` sạch trước commit

- [x] 6.1 Bỏ phép kiểm chữ ký → ca ĐỎ.
- [x] 6.2 So chữ ký bằng `===` thay vì timing-safe → ca ĐỎ.
- [x] 6.3 Thiếu bí mật → cho qua thay vì từ chối → ca ĐỎ. *(Gác ⛔C2 của cửa Internet.)*
- [x] 6.4 Tính HMAC trên body đã parse rồi dựng lại thay vì raw → ca ĐỎ.
- [x] 6.5 Bỏ phép kiểm repo đã khai → ca ĐỎ. *(Gác thứ hai độc lập với chữ ký — D3.)*
- [x] 6.6 Bỏ `evaluateStartRun` ở đường webhook → ca ĐỎ.
- [x] 6.7 Cho chế độ chỉ-đọc chạy webhook → ca ĐỎ.
- [x] 6.8 Phản hồi nói rõ lý do sai → ca ĐỎ.
- [x] 6.9 **6.2 ĐÃ SỐNG SÓT ở lượt đầu.** Đọc theo bảng ba đường: đột biến có vào đĩa (bản chụp lệch),
      và nó gỡ đúng gác — nên là đường thứ nhất: **ca không load-bearing**. Ca cũ chỉ
      `toContain('timingSafeEqual')`, mà chuỗi ấy vẫn còn ở dòng `import` sau khi phép so thật đã thành
      `===`. Đã thay bằng hàm quét `scanTimingSafeCall` (đòi đúng hình dạng lời gọi + cấm so bằng toán tử
      thường) kèm cặp fixture; chạy lại toàn bộ 8 chiều → **8/8 GIẾT cả hai lượt**, file khôi phục nguyên vẹn.

## 7. Kiểm tay — CHẠY THẬT (tầng 2; KHÔNG tick trước khi chạy)

- [x] 7.1 Gửi webhook giả **chữ ký đúng** → lượt chấm khởi.
- [x] 7.2 Gửi webhook giả **chữ ký sai** → từ chối, và phản hồi không nói gì thêm.
- [x] 7.3 Gửi webhook trỏ **repo lạ** → từ chối.
- [x] 7.4 Xoá bí mật khỏi kho khoá → mọi webhook bị từ chối.

## 8. Tài liệu vận hành

- [x] 8.1 `DEPLOY.md`: ngoại lệ Basic Auth cho ĐÚNG một đường, kèm cấu hình nginx.
- [x] 8.2 `DEPLOY.md`: cách đặt bí mật webhook, và cách kiểm nó đang hoạt động.
- [x] 8.3 Nói rõ: chưa đặt bí mật thì webhook từ chối tất — bản deploy chạy y như hôm nay (polling).

## 9. Kiểm cơ học

- [x] 9.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 9.2 `npx openspec validate --changes` xanh.
- [x] 9.3 Tầng 3: lưới có hàm quét `scan*` thì phải có cặp fixture; `test-grid-integrity` XANH.
