# Design — identity-session

## Context

Đo trên `main` 03/09 (`43209c1`):

```
21 dieu R11 pending
  co ca test khoa      14   (test/danh-tinh.test.ts 22 ca, + so-cong / doi-soat-cong)
  KHONG ca nao khoa     7   R11.2 R11.4 R11.7 R11.8 R11.14 R11.19 R11.20

R11.5  da la invariant (⛔C3)     R11.18  da la invariant (⛔C1)
R11.15 R11.16  merge-gate DA NOI, va requirement do DA TRO SAN sang identity-session
R11.17 co samePerson + ca test o so-cong.test.ts, nhung KHONG requirement nao khai
```

Bảy điều chưa khoá không cùng loại, và đó là điều quyết định hình dạng change:

| điều | code có làm? | vì sao chưa khoá được | khuôn xử |
|---|---|---|---|
| R11.14 | có | hàm thuần **chưa export** | export + ca (khuôn `retryNoticeNoEvidence`) |
| R11.2 | có | logic nằm trong `app.use()` | tách hàm thuần (khuôn `evaluateMergeLocal`) |
| R11.20 | có, **bằng kỷ luật** | không cơ chế nào ngăn | **lưới quét source** |
| R11.4 | có | luật kiến trúc | **lưới quét source** |
| R11.7 · R11.8 | có | luật hình dạng dữ liệu / quyền file | ca schema, ca spy chmod |
| R11.19 | có | luật quy trình | phần lớn trùng lưới R11.20 |

## Goals / Non-Goals

**Goals**
- 19 điều R11 có nhà; 2 điều chuyển sang `merge-gate`.
- Hai luật đang giữ bằng **kỷ luật** (R11.20, R11.4) chuyển sang giữ bằng **máy**.
- Hai chỗ thi hành mà không gọi được (R11.14, R11.2) tách ra thành hàm thuần.

**Non-Goals**
- KHÔNG đổi hành vi. Backfill: `npm test` xanh y nguyên trừ ca mới.
- KHÔNG đụng `verifyPassword`, `createSession`, `getIdentity`, các hàm quyền — đã thuần, đã khoá.
- KHÔNG viết lại R11.15/R11.16 (D3).
- KHÔNG mở giao diện web quản trị tài khoản — R11.19 nói ngược lại.

## Decisions

### D1 — Hai lưới quét source, và chúng là phần đáng giá nhất của change

Sáu requirement còn lại khai lại thứ đã có test. Hai lưới này khai thứ **chưa ai giữ**.

**Lưới R11.20 — không route nào đọc bảng tài khoản.** Quét tầng route (`server.ts` và các file nó nạp,
trừ công cụ dòng lệnh) tìm lời gọi tới hàm liệt kê tài khoản. Đây là danh sách CHO PHÉP: chỗ hợp lệ duy
nhất là `cli-tai-khoan.ts`.

Điểm phải cẩn thận: lưới quét **tên hàm** thì một route đọc thẳng SQL sẽ lọt. Nên lưới phải bắt cả hai —
lời gọi hàm, và câu SQL chạm bảng tài khoản ở ngoài `identity.ts`. Vẫn còn âm tính giả (ai đó viết SQL động
ghép chuỗi), và điều đó phải được khai chứ không giấu: lưới này thu hẹp bề mặt, không đóng kín nó.

**Lưới R11.4 — một cửa danh tính.** Quét tầng web tìm chỗ đọc cookie phiên. Hợp lệ: đúng một hàm trong
`identity.ts`. Mọi chỗ khác phải gọi lại nó.

### D2 — Tách hàm thuần cho R11.14 và R11.2, không viết lại logic

Cùng khuôn ba change trước: quyết định tách khỏi I/O thì mỗi nhánh từ chối là một ca test.

- **Cookie**: `dungCookiePhien` đã là hàm thuần, chỉ thiếu `export`. Nhưng nó nhận `express.Request` — kéo
  cả kiểu Express vào chữ ký của một hàm ghép chuỗi. Đổi tham số thành đúng thứ nó dùng (giá trị header
  `x-forwarded-proto`), rồi chỗ gọi truyền vào. Tên tiếng Anh.
- **Gác phiên**: tách quyết định `(đường, có phiên?) → cho qua | chặn-JSON | chặn-chuyển-hướng` ra khỏi
  `app.use`. Danh sách đường mở thành hằng export, để ca test khoá được nội dung của nó — nới danh sách ấy
  phải làm một ca đỏ.

### D3 — R11.15 và R11.16 chuyển nhà, không viết lại

`merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm…` đã nói cả hai: «người thực hiện lấy từ phiên đăng nhập»
và «tác giả pull request đóng băng tại thời điểm bấm». Requirement ấy còn **trỏ sẵn** sang `identity-session`
cho luật danh tính, nên hai bên đã khớp. Viết lại ở đây tạo hai chỗ nói cùng một điều, và hai chỗ sẽ lệch.
Bảng tra đổi hai hàng sang `merge-gate`.

R11.17 thì khác: nó có `samePerson` và ca test, nhưng **không requirement nào khai** — nên nó vào capability
này.

### D4 — R11.8: kiểm LỜI GỌI chmod, không kiểm quyền thật trên đĩa

Code có `chmodSync(DB_PATH + duoi, 0o600)` cho cả ba file, bọc `try/catch` nuốt lỗi với comment ghi rõ là
cho Windows (hệ không chmod được). Prod chạy Linux nên luật có hiệu lực thật; máy phát triển thì không.

Một ca đọc quyền thật sẽ **đỏ trên Windows, xanh trên Linux** — tức lưới nói khác nhau tuỳ máy, đúng loại
lưới làm người ta mất niềm tin rồi bỏ qua.

Chọn: ca kiểm **lời gọi** — chmod được gọi cho đủ ba đuôi (`''`, `-wal`, `-shm`) với mode `0o600`. Nó khoá
đúng thứ code chịu trách nhiệm, và chạy giống nhau trên mọi hệ.

**Cái mất, nói thẳng:** ca này KHÔNG chứng minh quyền thật trên đĩa của máy chủ. Nếu tiến trình chạy với
umask lạ hoặc file được tạo lại bởi tiến trình khác, lưới vẫn xanh. Phần ấy thuộc kiểm tay lúc deploy, và
`DEPLOY.md` là chỗ của nó.

### D5 — Tiêu chí «đủ test» của change này khác các backfill trước

Đây là nhóm bảo mật, nên tiêu chí không phải «mỗi requirement một ca» mà **«mỗi đường leo quyền một ca»** —
khuôn vừa dùng ở `error-message-egress-gate`. Ba đường thấy ngay:

1. thêm route đọc bảng tài khoản (R11.20);
2. nới danh sách đường mở để lách gác phiên (R11.2);
3. đọc cookie phiên ở một cửa thứ hai, bỏ qua kiểm hạn (R11.4).

Mỗi đường phải có ca, và ca phải **đỏ khi gác bị gỡ** — mutation chứng minh.

### D6 — Dự đoán TRƯỚC khi đo

Sau archive, thư viện probe tự chấm neo thêm bao nhiêu vế? Hôm nay 11/15. Nhóm R11 **không** xuất hiện
trong 4 mã còn trôi (R3.15 · R4.18 · R4.27 · R9.6), nên **dự đoán: neo KHÔNG tăng, giữ 11/15**. Đo để xác
nhận; nếu tăng thì em dự đoán sai và phải ghi rõ sai ở đâu.

## Architecture

- `apps/web/src/server.ts`: tách hàm dựng cookie (đổi tham số) và hàm quyết định gác phiên; hằng danh sách
  đường mở thành export.
- Lưới mới: hai lưới quét source + ca cho cookie, gác phiên, chmod.
- `apps/web/src/identity.ts`: **không đổi**.
- `checkmate.yml` bảng module (⛔C5) · tên mới tiếng Anh (lưới `identifier-language`).

## Data Model

N/A — không đổi schema, không đổi dữ liệu trên đĩa.

## Risks / Trade-offs

- [Lưới quét source có âm tính giả] → D1 khai thẳng: SQL động ghép chuỗi vẫn lọt. Lưới thu hẹp bề mặt,
  không đóng kín. Khác ⛔C3 ở `error-message-egress-gate` vì ở đây bề mặt là **code của chính repo này**,
  đi qua review — không phải dữ liệu ngoài.
- [Đổi chữ ký hàm cookie chạm chỗ gọi] → `tsc` bắt; hành vi không đổi vì vẫn cùng một phép ghép chuỗi.
- [Tách gác phiên khỏi `app.use` làm lệch thứ tự middleware] → giữ nguyên thứ tự, chỉ chuyển phần *quyết
  định*; ca test khoá cả ba nhánh trả về.
- [8 requirement là nhiều] → PO chốt một change. Chúng cùng một trục và cùng hai file.

## Open Questions

- Không. R11.8 đã quyết ở D4 kèm cái mất.
