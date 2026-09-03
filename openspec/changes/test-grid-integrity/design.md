# Design — test-grid-integrity

## Context

Sáu lần lưới đo sai trong một ngày, đo trên chính chuỗi backfill vừa làm:

```
LOAI 1-4  ca XANH tren he thong DA HONG        -> mutation bat duoc
  error-message-egress-gate  ca «co thong diep loi» xanh sau khi bo rao
  repo-history               ca «ham loc dung» xanh sau khi bo loc o route
  provider-gate D1           ca «truong ton tai» xanh du gia tri sai
  provider-gate D5           ca «env thang kho» xanh du dao thu tu

LOAI 5    be mat CHUA AI VIET CA                -> mutation KHONG bat duoc
  response-secret-guard      gac boc json+write, bo sot send (10 cho = moi man hinh)
                             16 ca xanh, 5 dot bien giet dung ca, may chu that KHONG chan gi

LOAI 6    ca DO tren he thong DANG DUNG         -> mutation KHONG bat duoc
  data-layer                 luoi bao 6 vi pham, khong cai nao that
                             (quet ca POST; cat khoi cung 1500 ky tu)

Ham quet source dang co trong repo (deu phai thoa tang 3)
  scanSource           test/identifier-language.test.ts
  scanDirectSql        test/data-layer.test.ts
  scanAccountReaders   test/identity-session.test.ts
  scanCookieReaders    test/identity-session.test.ts
```

## Goals / Non-Goals

**Goals**
- Ba loại lỗi đã xảy ra thật có cơ chế bắt, thay vì chỉ có trí nhớ người viết change sau.
- Tầng 3 cưỡng chế được bằng máy.

**Non-Goals**
- KHÔNG hứa đóng kín — loại thứ tư («lưới đúng, luật sai») vẫn cần người đọc, và điều đó được khai thành
  một requirement chứ không giấu trong ghi chú.
- KHÔNG sửa lại chín change đã archive.
- KHÔNG đổi code sản phẩm.

## Decisions

### D1 — Chỉ tầng 3 cưỡng chế bằng máy, hai tầng kia ở tài liệu, và đó là lựa chọn chứ không phải bỏ cuộc

| tầng | cưỡng chế | vì sao |
|---|---|---|
| 1. mutation bắt buộc | tài liệu | máy không biết ca nào «khoá một gác» — phân biệt ấy là ngữ nghĩa |
| 2. đếm bề mặt bằng máy | tài liệu | máy không biết change nào «dựng gác xuyên suốt» |
| 3. cặp fixture cho hàm quét | **lưới** | hàm quét nhận diện được bằng tên và chữ ký; ca của nó đếm được |

Cám dỗ ở đây là ép cả ba vào lưới cho «nhất quán». Nhưng một lưới đoán ngữ nghĩa sẽ sai theo cả hai chiều,
và một lưới sai chính là thứ capability này sinh ra để chống — ép nó vào là tự mâu thuẫn.

Hai tầng đầu sống ở `AGENTS.md` vì chúng là luật về **cách viết change**, cùng chỗ với luật ngôn ngữ định
danh. Khác biệt so với luật ấy: luật định danh cưỡng chế được bằng lưới nên nó có lưới; hai tầng này không,
nên chúng được viết kèm **án lệ có số** để người đọc biết cái giá của việc bỏ qua.

### D2 — Tầng 3 nhận diện hàm quét bằng quy ước tên `scan*` export

Lưới quét `test/*.test.ts`, tìm hàm `export function scan…`, rồi đếm ca trong cùng file có `toEqual([])`
(kỳ vọng rỗng) và ca có kỳ vọng không rỗng.

**Cái mất, nói thẳng:** một hàm quét đặt tên khác sẽ lọt. Đó là danh sách cấm theo quy ước tên — thứ repo
này vốn không tin. Chấp nhận vì: bốn hàm đang có đều theo quy ước, phạm vi là `test/` của chính repo (không
phải dữ liệu ngoài), và cái giá của âm tính giả ở đây là **một lưới không được kiểm** chứ không phải một
bí mật rò ra.

Nếu sau này quy ước bị phá, cách sửa là đổi phép nhận diện — không phải bỏ tầng 3.

### D3 — «Chạy thật một lượt» là mục kiểm tay, và nó KHÔNG được tick trước khi chạy

`response-secret-guard` T7.1 là bằng chứng: 16 ca xanh, 5 đột biến giết đúng ca, và máy chủ thật không chặn
gì. Lượt chạy thật là thứ duy nhất bắt được — vì nó kiểm **mọi bề mặt máy chủ có**, không chỉ bề mặt người
viết nghĩ ra.

Luật viết dưới dạng «mục ấy chỉ được tick sau khi đã chạy» chứ không phải «nên chạy»: cổng archive đã có
sẵn cơ chế chặn ô chưa tick, nên chỗ này mượn được cơ chế đã có thay vì dựng cái mới.

### D4 — Requirement thứ tư nói ba tầng KHÔNG đủ, và nó là một phần của luật

Cám dỗ là để phần này ở ghi chú. Nhưng một hệ thống kiểm tra tự tuyên bố đã kín sẽ làm người ta **thôi
đọc** — và thôi đọc là đúng chỗ loại thứ tư sống («lưới đúng nhưng luật sai»).

Hôm nay loại thứ tư được bắt bằng một câu hỏi của PO, không bằng cơ chế nào. Viết điều đó vào spec là cách
duy nhất để người sau biết họ vẫn phải đọc.

### D5 — Loại lỗi thứ 3 tái diễn NGAY trong change sinh ra để chống nó (ghi lúc apply)

Bản đầu của `test/test-grid-integrity.test.ts` dựng regex từ tên hàm:

```ts
const cua = khoi.filter((k) => new RegExp(`\\b${ten}\\s*\\(`).test(k));
```

Heredoc của shell ăn một lớp backslash, nên file trên đĩa mang `` `\b${ten}\s*\(` `` — TypeScript đọc
`\b` thành ký tự backspace, `\s` thành `s`, `\(` thành `(`. Regex thành `/scanDirectSqls*(/` và ném
`SyntaxError: Unterminated group`. **Năm ca đỏ, không ca nào là lỗi thật.**

Đây đúng là **loại 3** mà capability này sinh ra để bắt: *ca đỏ trên hệ thống đang đúng*. Nó tái diễn ngay
trong lượt apply của chính change ấy, bởi cùng một người vừa viết ra ba tầng.

Bài học không phải «cẩn thận hơn» — bài học là **bỏ hẳn cái regex dựng động**:

```ts
const cua = khoi.filter((k) => k.includes(`${ten}(`));
```

Một phép so chuỗi không có gì để escape sai. Đường hỏng bị **gỡ bỏ**, không phải được canh giữ. Chỗ nào
gác được bằng cách làm cho lỗi không tồn tại thì đừng gác bằng cách nhớ.

*(Ghi chú về tầng 1: chuỗi này KHÔNG bị mutation bắt — regex hỏng làm ca ĐỎ, mà đỏ thì mutation coi là
«lưới hoạt động». Đúng như requirement 4 khai: mutation không phân biệt đỏ đúng với đỏ oan.)*

## Architecture

- `test/<lưới-cho-lưới>.test.ts` (MỚI): quét `test/`, đòi mỗi hàm `scan*` export có cặp fixture.
- `AGENTS.md` → `cp` sang `CLAUDE.md` (lưới `huong-dan-harness` bắt lệch từng ký tự).
- KHÔNG đụng code sản phẩm.

## Data Model

N/A.

## Risks / Trade-offs

- [Quy ước tên `scan*` bị phá] → D2 khai thẳng; cái giá của âm tính giả ở đây thấp.
- [Hai tầng đầu chỉ là tài liệu] → D1: ép chúng vào lưới sẽ tạo một lưới đoán ngữ nghĩa, tức đúng thứ
  capability này chống.
- [Thêm luật quy trình làm change sau nặng hơn] → thật, và đó là cái giá. Đổi lại: sáu lỗi hôm nay đều
  tốn nhiều hơn thế để phát hiện, và một trong số đó chỉ lộ ra vì tình cờ chạy máy chủ thật.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
