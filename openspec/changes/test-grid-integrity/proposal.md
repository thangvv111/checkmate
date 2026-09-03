# Proposal — test-grid-integrity

## Why

Repo này đứng trên một mệnh đề: **một luật không có lưới thì không phải luật đang thi hành** — nó chỉ là
một câu chữ mà người ta tin là luật. Chín change backfill hôm nay đều dựa vào đó.

Nhưng hôm nay cũng cho thấy vế còn thiếu: **lưới cũng sai được, và khi sai thì nó vẫn trông như đang gác.**

Sáu lần trong một ngày, tất cả đều do em viết:

| # | change | lưới sai kiểu gì | thứ bắt được nó |
|---|---|---|---|
| 1 | `error-message-egress-gate` | ca xanh sau khi bỏ rào | **mutation** |
| 2 | `repo-history` | ca xanh sau khi bỏ lọc ở route | **mutation** |
| 3 | `provider-gate` D1 | ca «trường tồn tại» xanh dù giá trị sai | **mutation** |
| 4 | `provider-gate` D5 | ca «env thắng kho» xanh dù đảo thứ tự | **mutation** |
| 5 | `response-secret-guard` | 16 ca xanh mà máy chủ thật **không chặn gì** | **chạy thật** |
| 6 | `data-layer` | lưới **ĐỎ** trên code đang đúng — 6 báo động giả | **đọc code** |

Mutation bắt **4/6**. Hai cái còn lại nó **không bắt được về nguyên tắc**:

- **#5** — mutation chỉ giết ca *đã có*; nó không phát hiện được **bề mặt chưa ai viết ca**. Gác bọc
  `res.json` và `res.write` trong khi bề mặt lớn nhất là `res.send` (10 chỗ, mọi màn hình). Mutation trên
  hai bề mặt ấy vẫn chạy đúng — và cả lưới vẫn xanh trong khi máy chủ thật không chặn gì.
- **#6** — đột biến làm lưới đỏ, mà đỏ thì mutation coi là «lưới hoạt động». Nó không phân biệt **đỏ đúng**
  với **đỏ oan**.

## What Changes

Ba tầng, mỗi tầng bắt một loại. Không tầng nào thay được tầng khác.

- **Tầng 1 — mutation là bắt buộc, không phải thói quen.** Mọi ca mới khoá một gác phải có đột biến giết
  được nó, chạy **ít nhất hai lần** (bài học flaky của `error-message-egress-gate`). Chỗ ở: `AGENTS.md`
  và một dòng trong khuôn `tasks.md`.
- **Tầng 2 — đếm bề mặt bằng MÁY, không bằng trí nhớ.** Change nào dựng một gác chạy xuyên suốt (bọc
  response, bọc lời gọi, middleware) phải ghi **lệnh đếm và con số** vào `design.md` trước khi viết ca.
- **Tầng 3 — lưới quét source phải có CẶP fixture**: cái sai phải ĐỎ, **và** cái đúng phải XANH. Đây là
  tầng duy nhất cưỡng chế được bằng máy, và nó bắt đúng loại 6.

Bốn hàm quét đang có trong repo — `scanSource`, `scanDirectSql`, `scanAccountReaders`, `scanCookieReaders`
— sẽ phải thoả tầng 3.

## Chỗ em phải tự bác bỏ: ba tầng KHÔNG đủ

Còn loại thứ tư không cơ chế nào bắt được: **lưới đúng nhưng luật sai** — spec khai một điều mà điều ấy
không nên là luật. Chỉ người đọc bắt được, và hôm nay chính PO bắt bằng một câu hỏi.

Change này KHÔNG hứa đóng kín. Nó hứa đúng một điều: ba loại lỗi đã xảy ra thật sẽ có cơ chế bắt, thay vì
chỉ có trí nhớ của người viết change sau.

## Đây KHÔNG phải backfill

Chín change trước khai thành luật thứ code **đã làm**. Change này **thêm luật mới về cách viết change** —
nó đổi quy trình, không đổi sản phẩm. Ghi rõ vì hai loại có tiêu chí duyệt khác nhau.

## Luật chạm tới

- `AGENTS.md` § quy trình (tầng 1 và 2) — sửa `AGENTS.md` rồi `cp` sang `CLAUDE.md`, lưới
  `huong-dan-harness` bắt lệch
- Capability MỚI `test-grid-integrity` (ADDED) cho tầng 3
- KHÔNG đụng capability nào đã archive; KHÔNG đổi bảng tra

## Impact

- MỚI: lưới-cho-lưới (`test/*.test.ts` quét chính `test/`)
- Chạm: `AGENTS.md` + `CLAUDE.md` · khuôn `tasks.md` của schema (nếu sửa được mà không phá change đang mở)
- KHÔNG đổi code sản phẩm
