# Proposal — provider-gate

## Why

Backfill capability thứ tám: **23 điều** về nhà cung cấp model và cổng kiểm bắt buộc — `R5` cùng ba điều
`R3.12`–`R3.14` (mất xác thực là lỗi công cụ, không phải câu trả lời của model).

Đây là cổng quyết định lượt chấm chạy bằng gì. Hỏng ở đây thì hoặc lượt chấm chết giữa chừng vì khoá sai,
hoặc — tệ hơn — **tiền ra từ ví API trong khi người vận hành tưởng đang tiêu gói thuê bao**; `model.ts` có
comment về đúng ca ấy.

## Đính chính phép đo, lần thứ ba

Bảng xếp hạng nói `provider-gate` có **12 điều chưa khoá**. Đọc thật thì khoảng **7–8**:

| điều | tưởng chưa khoá | thực tế |
|---|---|---|
| `R5.1` · `R5.2` · `R5.3` | chưa | **có ca** ở `web-loc.test.ts` |
| `R5.5` | chưa | **có ca** ở `ba-muc-tu-dong.test.ts` (kể cả ca ngược) |
| `R5.13` | chưa | **có ca** ở `web-loc.test.ts` |
| `R5.14` | chưa | **có một phần** — `doc-du-lieu-cu` khoá *trường tồn tại*, không khoá `uoc_tinh` đặt đúng |

Lần thứ ba trong ngày phép đếm mã cho ra con số **cao hơn thực tế**, và luôn cùng một hướng. Ghi lại vì
`tasks.md` §1.2 của mọi change backfill còn lại phải đọc chứ không đếm.

## What Changes

- **Capability `provider-gate`** — 8 requirement viết từ code và test đang chạy.
- **Ca cho những điều chưa khoá**, trong đó ba cái đáng kể:
  - `R5.6` phản hồi **rỗng** từ nhà cung cấp là kiểm **thất bại** — «khoá hợp lệ nhưng model không sinh
    được nội dung» vẫn là không dùng được, và một cổng báo xanh ở đây là cổng vô nghĩa;
  - `R5.14` vế hành vi: `uoc_tinh` phải **đúng** — `true` khi số token là ước theo ký tự, `false` khi lấy
    từ `usage` thật. Một con số ước mà trình bày như số thật là báo sai bản chất;
  - `R3.14` mất xác thực là lỗi **cấu hình**, KHÔNG thử lại — phiên hết hạn không tự sống lại ở lượt hai,
    và thử lại chỉ tốn thêm một lượt gọi rồi hỏng y hệt.
- KHÔNG đổi hành vi. Backfill.

## Luật chạm tới

- ⛔C3 (bí mật không rò — `R5.8` dán nhầm khoá không được vọng ra thông điệp, `R5.11` kho khoá quyền hạn chế)
- ⛔C2 (fail-closed — `R5.4` chưa kiểm thì không được chọn; `R5.6` rỗng là thất bại)
- `model-reply-parsing` (`R3.12`–`R3.14` là mặt kia của cùng đường: nhận ra **lỗi công cụ** để không coi
  câu báo lỗi là câu trả lời của model)
- Capability MỚI `provider-gate` (ADDED 8 requirement)
- Hàng bảng tra: 23 điều `pending` → `housed`

## Impact

- MỚI: lưới cho cổng kiểm, kế toán token, và ba điều mất-xác-thực
- Chạm: không đổi code sản phẩm nếu đối chiếu không phát hiện lệch (task 1.2 quyết)
- `docs/r-rules-map.md` (23 hàng)
- KHÔNG đụng `provider.ts`, `model-source.ts`, `secret-vault.ts` — đã thuần hoặc đã khoá

## Đo sẽ làm sau archive

Thư viện probe tự chấm hôm nay neo **14/15**, chỉ còn `R9.6` trôi — và `R9.6` thuộc `data-layer`, không
thuộc nhóm này. **Dự đoán: neo KHÔNG đổi, vẫn 14/15.**
