## Bệnh

`CLAUDE.md` khai cổng merge của repo là:

```bash
npx tsc --noEmit && npm test
```

Cổng ấy **lúc đỏ lúc xanh**. Đo 08/09 trong một buổi làm việc, **sáu file khác nhau** đỏ ở lượt chạy toàn
bộ rồi **xanh khi chạy riêng**: `volume-standard` · `kien-truc-tang` · `deploy-bundle` · `r-rules-map` ·
`message-egress` · `ba-muc-tu-dong`. Không file nào có lỗi thật; tất cả đều là hết-giờ do tranh chấp.

⛔ **Vì sao đây là lỗi đáng sửa, không phải phiền toái:** một cổng lúc đỏ lúc xanh dạy đúng **một** phản
xạ — *chạy lại thay vì đọc*. Và đó chính xác là cách một lỗi thật lọt qua: thấy đỏ, chạy lại, thấy xanh,
đi tiếp. Repo này đã tự khai luật ấy (`test-grid-integrity`, loại 3 — *ca ĐỎ trên hệ thống ĐANG ĐÚNG*),
nhưng loại 3 do **hạ tầng** thì đọc code không bắt được; nó chỉ lộ khi có người đối chiếu nhiều lượt chạy.

**KHÔNG đổi luật đang khai.** Lệnh cổng giữ nguyên `npm test`; change này chỉ làm nó cho **cùng một kết
quả trên cùng một cây mã**. Dùng schema `checkmate-fix-bug`.

## Đo

Cùng cây mã, cùng buổi. Máy dev: **22 CPU logic, 33.7 GB RAM, 9.8 GB trống**.

| cấu hình | kết quả | wall-clock | **tổng thời gian test** |
|---|---|---|---|
| mặc định (~21 worker) | **6 file khác nhau đỏ**, xanh khi chạy riêng | 13–18 s | — |
| `maxWorkers=8` | **1 file đỏ** | 18.1 s | **75.3 s** |
| **`maxWorkers=4`** | **76/76 · 1355/1355 xanh** | 25.4 s | **51.4 s** |

⛔ **Cột đáng đọc là cột CUỐI, không phải wall-clock.** Ở 8 worker tổng thời gian test là 75.3 giây; ở 4
worker chỉ 51.4 giây. Tám worker tiêu **thêm 47% CPU-time** để làm cùng một việc — chúng giành nhau I/O
nên mỗi ca chậm đi. Thứ nó mua được là **7 giây** wall-clock; thứ nó bán đi là **tính tất định**.

⇒ Đây không phải đánh đổi tốc-độ-lấy-an-toàn. Đây là **trả nhiều tài nguyên hơn để nhận kết quả kém tin
hơn** — và một khi thấy thế thì không còn gì để cân.

## Việc

- [x] 1.1 Ghim `maxWorkers: 4` trong `vitest.config.ts`, kèm chú thích mang **bảng số đo** và lý do chọn
      con số cứng.
- [x] 1.2 Chạy `npm test` **trần, không cờ nào**, **ba lượt liên tiếp** — cả ba: 77 file, 1389 ca, xanh.
- [x] 1.3 `npx tsc --noEmit` sạch.
- [ ] 1.4 Sau merge: theo dõi vài lượt chạy tiếp; thấy đỏ ngẫu nhiên lần nữa thì hạ xuống 2 và đo lại.

## Quyết định — vì sao con số CỨNG, không phải tỉ lệ

`'50%'` trên máy 22 CPU ra **11 worker**, cao hơn cả mốc 8 vốn đã đỏ. Nút cổ chai của bộ lưới này là
**I/O đĩa và tiến trình con** — git thật (`volume-standard` dựng 2 upstream + 2 clone), podman, đọc cả cây
mã (`kien-truc-tang`, `deploy-bundle`, `r-rules-map`) — **không phải CPU**. Nên tỉ lệ-theo-CPU chính là
thứ gây ra vấn đề, không phải thứ chữa nó.

Số ghim còn tái lập được giữa máy dev, máy đồng đội và CI; một tỉ lệ thì cho mỗi máy một hành vi khác.

**Vì sao không nới trần thời gian toàn cục thay vào đây:** nó **giấu** sự chậm thay vì bỏ nguyên nhân, và
làm một ca treo thật mất lâu hơn mới đỏ. Hai chỗ đã nới trần (`test/volume-standard.test.ts` — khối dựng
git thật) đều có lý do đo được riêng; cố ý không nới đại trà.

**Cái giá, nói thẳng:** +7 giây mỗi lượt chạy toàn bộ trên máy này. Máy khoẻ hơn ghi đè được bằng
`npx vitest run --maxWorkers=N`.

## § Sau-merge — nợ có tên

- [ ] 2.1 **Con số 4 đo trên MỘT máy.** Nó tái lập được, nhưng chưa ai đo trên máy đồng đội hay CI. Nếu có
      máy yếu hơn (máy chủ prod chỉ **2 CPU / 1 GB**) thì 4 vẫn có thể quá nhiều — chưa gặp vì bộ lưới
      không chạy trên prod, nhưng đừng coi con số này là hằng số vũ trụ.
