# Design — model-reply-parsing

## Context

Đo trên `main` 03/09 (`fa2c590`):

```
14 dieu R3 pending -> model-reply-parsing
  DA co ca khoa   11   test/boc-model.test.ts (12 ca)
  CHUA co ca       3   R3.3  R3.11  R3.16

R3.12 R3.13 R3.14 (loi cong cu / mat xac thuc) -> provider-gate, co test/mat-xac-thuc.test.ts
```

Ba điều chưa khoá, và chúng không cùng loại:

| điều | code có làm? | vì sao chưa khoá | khuôn xử |
|---|---|---|---|
| R3.16 | có, **và đã rào** | không ai kiểm prompt lượt hai | ca dựng model giả, soi prompt |
| R3.11 | có | tri thức sống trong một hằng chuỗi | ca khoá hằng + lời gọi CLI |
| R3.3 | có | không ai đếm số lần gọi | ca đếm lời gọi |

## Goals / Non-Goals

**Goals**
- 14 điều R3 có nhà.
- Ba điều chưa khoá được khoá, trong đó R3.16 khoá **cả hai vế** (có thông điệp lỗi · thông điệp ấy được rào).
- Án lệ của R3.11 chuyển từ comment sang ca test.

**Non-Goals**
- KHÔNG đổi hành vi. Backfill.
- KHÔNG đụng `unwrapJson`, `unwrapCode`, `makeFence` — đã thuần, đã khoá.
- KHÔNG đổi `callCode` để nó chép thông điệp lỗi như `callJson` (D2).

## Decisions

### D1 — Ca R3.16 phải khoá VẾ RÀO, không chỉ vế «có thông điệp lỗi»

Một ca chỉ kiểm «prompt lượt hai chứa thông điệp lỗi» sẽ **vẫn xanh** sau khi ai đó bỏ `rao(...)` và nhét
thẳng `e.message` — mà đó chính là lỗ hổng. Nên ca phải kiểm thông điệp ấy nằm **giữa cặp mốc rào**.

Cách: model giả (`ModelProvider` dựng bằng tay) trả JSON hỏng ở lượt một, ghi lại prompt lượt hai, rồi
khẳng định đoạn lỗi nằm giữa `<<<DU_LIEU_LOI_PARSE_…>>>` và `<<<HET_LOI_PARSE_…>>>`.

Mutation chứng minh: bỏ `rao(...)` → ca phải đỏ.

### D2 — `callCode` KHÔNG chép thông điệp lỗi, và đó là đúng

Đọc bản gốc: R3.16 nằm trong mục «Lỗi của công cụ, không phải câu trả lời của model», ngay sau R3.15 nói về
**JSON parse fail**. «Thông điệp lỗi đó» là thông điệp của R3.15. Nên luật áp cho đường JSON.

`callCode` nhắc lại bằng lời theo **loại lỗi** (model dùng tool / model quên fence) — hai loại cần hai lời
nhắc khác nhau, và cả hai đều không cần chép nguyên văn trả lời hỏng. Requirement khai rõ đây là khác biệt
có chủ đích, để người sau không đọc thành thiếu sót rồi đi «sửa cho nhất quán».

Quan sát ngoài phạm vi: đưa thông điệp lỗi vào lượt hai của `callCode` **có thể** giúp model sửa đúng chỗ,
như đã đo được ở đường JSON. Nhưng đó là đổi hành vi, không phải backfill — nếu làm thì phải là change riêng
và phải rào y như đường JSON.

### D3 — R3.11 khoá bằng ca đọc HẰNG và LỜI GỌI, không bằng chạy CLI thật

Chạy CLI thật trong test là chậm, cần `claude` cài sẵn, và phụ thuộc phiên bản CLI — đúng loại lưới nói
khác nhau tuỳ máy mà `identity-session` D4 đã bác.

Ca khoá hai tính chất tĩnh:
1. Danh sách tool cấm **không rỗng** và mang các tool đọc/ghi file, chạy lệnh.
2. Lời gọi CLI dùng cờ liệt kê tường minh, KHÔNG dùng chuỗi rỗng để tắt-hết.

**Cái mất:** ca không chứng minh CLI thật sự chặn tool — phần ấy đã đo bằng tay hai lần và ghi thành án lệ
trong requirement. Nó cũng không bắt được ca một tên tool không còn tồn tại trong bản CLI mới; đó là thứ chỉ
lộ ra khi chạy thật, và nó làm cả đường gói thuê bao chết chứ không âm thầm hỏng, nên sẽ được phát hiện ngay.

### D4 — Dọn comment sai ở `model.ts`, và ghi vì sao đây không phải việc vặt

`model.ts` dòng ~139 còn comment «`--tools ""`: tắt toàn bộ tool» — mâu thuẫn thẳng với comment ở dòng 32
nói cờ ấy KHÔNG có tác dụng. Comment cũ còn lại sau khi sửa code.

Nó không đổi hành vi, nhưng nó nói sai đúng cái điều đã tốn một vòng chấm thật để phát hiện. Người đọc sau
tin vào nó sẽ «đơn giản hoá» danh sách tool về chuỗi rỗng, và model có tool trở lại mà không lưới nào đỏ —
vì ca của D3 kiểm cờ liệt kê tường minh, không kiểm comment.

### D5 — Dự đoán TRƯỚC khi đo

Thư viện probe tự chấm hôm nay neo 11/15, còn trôi `R3.15` · `R4.18` · `R4.27` · `R9.6`. `R3.15` thuộc
change này, nên **dự đoán: neo tăng 11 → 12**. Đây là lần đầu neo tăng sau ba change.

## Architecture

- `test/boc-model.test.ts`: thêm ba ca (nhóm này đã có nhà — không tạo file lưới mới).
- `packages/harness/src/model.ts`: chỉ sửa comment (D4).
- `packages/harness/src/jsonx.ts`: **không đổi**.

## Data Model

N/A.

## Risks / Trade-offs

- [Ca R3.16 dựng model giả có thể lệch khỏi đường thật] → ca gọi đúng `callJson`, không chép lại logic của
  nó; model giả chỉ đóng vai `complete`.
- [Ca R3.11 không chứng minh CLI thật chặn tool] → D3 khai thẳng cái mất và vì sao chấp nhận.
- [Ca R3.3 đếm số lần gọi có thể khoá chặt quá] → chỉ khoá đúng con số 2 và «không có lần ba»; nếu sau này
  cần nhắc hai lần thì đó là đổi luật, và ca đỏ là đúng việc của nó.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
