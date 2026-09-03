# Design — probe-library

## Context

Đo bằng ĐỌC từng ca, không bằng đếm mã trích (phép đếm ấy đã cho con số cao hơn thực tế ba lần liên tiếp):

```
28 hang pending  ->  20 dieu DA co ca  +  7 dieu chua co ca  +  1 dieu LOI THOI

Ca hien co:  thu-vien.test.ts 30 ·  dedup-probe.test.ts 26 ·  kho-run.test.ts 18 ·  phan-loai.test.ts 33
```

Dự đoán trước khi đo là «9 điều chưa khoá». Đo được **7 chưa khoá + 1 lỗi thời**. Ghi lệch ra đây vì con số
dự đoán là thứ dùng để chọn change tiếp theo.

## Goals / Non-Goals

**Goals**
- Bảy điều có ca khoá đúng gác của chúng.
- R8.9 được khai `obsolete` với lý do đọc được, thay vì im lặng bỏ qua.

**Non-Goals**
- KHÔNG đổi code sản phẩm. Không thêm export (⛔C5 N/A), không đổi hằng, không đổi hành vi.
- KHÔNG viết ca cho FIFO — xem D2.
- KHÔNG chạm 20 điều đã có ca.

## Decisions

### D1 — R8.9: `obsolete`, không phải `housed`

Luật khai «đẩy file ra khỏi thư viện theo trần **FIFO** phải xoá luôn file trên đĩa». Trong code:

| vế của R8.9 | trạng thái |
|---|---|
| «xoá luôn file trên đĩa, không để lại file mồ» | **còn sống**, đã có ca ở `thu-vien.test.ts` |
| «theo trần FIFO» | **cơ chế không còn tồn tại** — thay bằng `pickEvictionVictim` bốn nấc |

Viết một requirement khai FIFO là khai một hành vi không tồn tại; viết ca cho nó là dựng lưới gác một cái
cửa đã bị tháo. Cả hai đều là thứ cổng archive của repo này cấm, chỉ theo chiều ngược lại thường gặp.

Vế còn sống đã có nhà ở `R10.22` (đào thải theo điểm) — nên R8.9 không mất gì khi thành `obsolete`.

### D2 — R8.9 là án lệ đầu tiên của loại lỗi thứ tư, và nó lộ ra đúng như dự đoán của capability trước

`test-grid-integrity` khai: còn một loại lỗi mà **không cơ chế nào bắt được** — *lưới đúng nhưng luật sai* —
và nó chỉ lộ ra khi có người ĐỌC.

R8.9 là ca đầu tiên đo được, và cách nó lộ ra khớp đúng dự đoán ấy:

- lưới `r-rules-map` **xanh** — R8.9 có hàng, hàng trỏ change có thật;
- không mã trích nào lệch — không chỗ nào trong code trích `R8.9`;
- `npm test` **xanh** — 20 điều có ca đều đúng;
- `probe-library.ts:61` ghi rõ vì sao FIFO sai, ngay trong repo, suốt thời gian đó.

Thứ bắt được nó là đọc `pickEvictionVictim` và thấy nó không phải FIFO. Đúng một lần đọc, không cơ chế nào.

### D3 — R8.5: khoá nhánh nới hậu tố bằng SỔ GIẢ, không brute-force hash

Nhánh chống đụng nới hậu tố qua `[6, 12, 24, 64]`. Để chạm nó cần một probe mà 6 hex đầu hash đụng với một
mục đã có **mang hash khác** — brute-force `16^6` trong lưới thì không ai chạy.

Cách rẻ: dựng `meta.json` bằng tay với một mục mang **đúng cái tên mà probe mới sẽ tính ra** nhưng `hash`
khác. Tính được vì hash là sha256 của code do chính ca test viết ra.

Đây cũng là một lượt kiểm ⛔C6 đi kèm: sổ sửa bằng tay phải có hiệu lực ở lượt đọc kế tiếp.

*Cái mất: ca không chứng minh hậu tố nới tới 24 hay 64 — chỉ chứng minh nó nới khỏi 6. Nới tiếp là cùng một
nhánh vòng lặp, và một ca đụng ba tầng đòi ba hash dựng khớp, không đáng.*

### D4 — R8.8: chạy THẬT, và trả giá 10 giây

Thời hạn chờ khoá là hằng biên dịch `CHO_KHOA_MS = 10_000`. Ba lựa chọn:

| cách | cái được | cái mất |
|---|---|---|
| đọc source tìm `break` | tức thời | không chứng minh phần việc THỰC SỰ chạy — đúng loại «ca xanh trên hệ thống đã hỏng» |
| cho hằng đọc từ env | ca nhanh | **đổi code sản phẩm** để lưới dễ viết — đổi thứ được đo cho vừa phép đo |
| **dựng khoá giả, chờ thật** | chứng minh hành vi thật | **một ca ~10 giây** |

Chọn cách ba. Ca này phải khai `timeout` riêng vì trần mặc định của vitest là 5 giây.

Mười giây cho một ca trong 888 ca là cái giá đúng cho vế «không bao giờ bỏ probe» — vế mà nếu hỏng thì
thiệt hại là mất vĩnh viễn một probe đã bắt được lỗi thật.

### D5 — R10.14: `vi.resetModules()`, KHÔNG export hàm đọc trần

`docTranProbe()` không export, và trần là hằng tính lúc nạp module. Hai cách khoá:

- **export nó ra** — phải khai `checkmate.yml` (⛔C5), và tên `docTranProbe` là tên tiếng Việt cũ, nên
  export nó là đẩy một định danh tiếng Việt lên bề mặt công khai giữa lúc luật đặt tên đang siết;
- **`vi.stubEnv` + `vi.resetModules()` + `await import()`** — nạp lại module với env khác rồi đo trần qua
  hành vi thật của `admitToLibrary`.

Chọn cách hai. Nó đo **hành vi**, không đo hằng — và ca «giá trị hỏng» phân biệt được ba khả năng, chứ không
chỉ hai: `CHECKER_LIB_TRAN=3` mà trần thành 6 (kẹp) khác hẳn trần thành 3 (dùng thẳng) và khác hẳn trần
thành 100 (coi như hỏng).

### D6 — R10.11: hai ca, và ca mạnh hơn là ca «không biết tới»

| ca | khoá được gì | cái mất |
|---|---|---|
| `probe-library.ts` không import lớp model | **cấu trúc** — lớp thư viện không có cách nào gọi model | không chặn người ta truyền hàm model vào như tham số |
| thứ tự ở `skill-code.ts`: lời gọi model đứng TRƯỚC vòng nạp | chỗ gọi hiện tại | ca đọc source, không chứng minh hành vi lúc chạy |

Ca thứ nhất mạnh hơn vì nó khoá **khả năng**, không khoá một lần viết. Ghi cả hai vì chúng bắt hai đường
hỏng khác nhau, và ghi rõ cái mất của từng ca — cùng khuôn `repo-history` D4.

### D7 — Ba tầng của `test-grid-integrity` áp vào change này

Capability ấy vừa archive hôm nay, nên đây là change đầu tiên phải khai việc tuân thủ:

- **tầng 1 mutation** — bắt buộc. Mỗi ca khoá một gác phải có đột biến giết được nó, chạy HAI lần, và phải
  kiểm chứng đột biến đã áp dụng trước khi đọc kết quả.
- **tầng 2 đếm bề mặt** — **N/A có lý do**: change này không dựng gác chạy xuyên suốt nào; nó viết ca cho
  hành vi đã có. Không có bề mặt nào để đếm, nên không có mục kiểm tay «chạy thật một lượt».
- **tầng 3 cặp fixture** — áp dụng nếu lưới có hàm quét `scan*`. Ca R9.15 và R10.11 rà source, nên nếu chúng
  thành hàm quét thì phải có cả fixture đối kháng lẫn đối chứng; `test/test-grid-integrity.test.ts` sẽ đỏ
  nếu thiếu.

## Architecture

- `test/probe-library.test.ts` (MỚI) — 7 nhóm ca, mỗi nhóm một requirement.
- Thư mục thư viện tạm cho từng ca (thư viện thật `probes-lib/` là **dữ liệu prod**, không được chạm).
- KHÔNG đụng `packages/harness/src/`.

## Data Model

Không đổi. `meta.json` được dựng bằng tay trong ca D3 nhưng đúng hình dạng hiện hành.

## Risks / Trade-offs

- [Ca 10 giây] → D4: cái giá đã cân, và ca này khoá vế thiệt hại một chiều.
- [Ca đọc source không chứng minh hành vi lúc chạy] → D6 khai rõ từng ca mất gì.
- [Ghi vào thư viện thật] → mỗi ca dùng thư mục tạm riêng; `probes-lib/` là tài sản prod.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
