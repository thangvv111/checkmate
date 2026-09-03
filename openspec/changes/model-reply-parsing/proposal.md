# Proposal — model-reply-parsing

## Why

Backfill capability thứ sáu: bóc trả lời của model, và rào dữ liệu ngoài trước khi nó vào prompt.

Đo trên `main` 03/09 (`fa2c590`) — **14 điều, 11 đã có ca** trong `test/boc-model.test.ts` (12 ca), **3 chưa**:

```
R3.16  luot nhac lai duoc dua CHINH thong diep loi   CODE DUNG, va da RAO  -> khong luoi nao giu
R3.11  model cham chay KHONG co tool                 CODE DUNG, an le dat  -> khong luoi nao giu
R3.3   nhac lai DUNG MOT LAN                         CODE DUNG             -> khong ca nao dem
```

**R3.16 là chỗ nặng nhất, và nó là ⛔C4.** Khi JSON của model hỏng, `callJson` đưa **chính thông điệp lỗi**
vào prompt lượt hai. Thông điệp ấy mang trích đoạn trả lời của model, mà trả lời đó dẫn xuất từ **diff pull
request** — tức nội dung do maker viết. Code làm đúng: nó **rào bằng nonce** trước khi nhét vào. Comment tại
chỗ nói thẳng vì sao:

> kẻ viết diff chỉ cần làm vỡ JSON theo ý mình là câu chữ của họ được chép nguyên vào lượt gọi sau, ở vị
> trí trông như lời của hệ thống

Không lưới nào giữ điều đó. Ai bỏ `rao(...)` và nhét thẳng `e.message` sẽ mở lại đúng đường tiêm chỉ thị mà
rào nonce sinh ra để chặn — và diff sẽ trông như một dòng đơn giản hoá.

**R3.11 giữ một án lệ đắt, đo được từ vòng chấm thật.** `--tools ""` và `--allowed-tools ""` **không có tác
dụng**: CLI vẫn bật đủ tool, model đi chạy `ls` thật rồi trả về lời gọi tool thay vì code. Chỉ liệt kê
tường minh mới chặn. Và tên tool phải **có thật** trong bản CLI đang cài — một tên lạ làm CLI bỏ chạy với
«Permission deny rule "X" matches no known tool», tức cả đường gói thuê bao chết (`SlashCommand` từng là
thủ phạm). Tri thức ấy sống trong một hằng chuỗi và hai dòng comment, không có ca nào giữ.

## What Changes

- **Capability `model-reply-parsing`** — 5 requirement viết từ code và test đang chạy.
- **Ba ca mới** cho ba điều chưa khoá, trong đó ca R3.16 khoá **cả hai vế**: lượt hai có mang thông điệp
  lỗi, **và** thông điệp ấy đi qua rào nonce.
- **Dọn một comment sai**: `model.ts` dòng ~139 vẫn ghi «`--tools ""`: tắt toàn bộ tool» — mâu thuẫn thẳng
  với comment ở dòng 32 nói cờ ấy KHÔNG có tác dụng. Comment cũ còn lại sau khi sửa code; nó không đổi hành
  vi nhưng làm người đọc sau tin nhầm đúng cái điều đã tốn một vòng chấm để phát hiện.
- KHÔNG đổi hành vi. Backfill.

## Đính chính một phép đo của chính em

Change này được chọn bằng bảng xếp hạng «tỉ lệ điều chưa có ca test», nơi `model-reply-parsing` đứng đầu với
**93%**. Con số ấy **sai**: nó đếm mã `R3.x` xuất hiện trong `test/`, mà 11 điều đã có ca chỉ là ca không
trích mã trong tên. Thực tế là **3/14**, không phải 13/14.

Ghi ra vì hai lẽ: bảng xếp hạng ấy vẫn đang được dùng để chọn change tiếp theo và phải đo lại đúng cách; và
vì đây đúng loại lỗi mà repo này tồn tại để chống — một phép đo cho ra con số trông chắc chắn, không ai kiểm
lại, rồi dẫn tới quyết định sai.

## Luật chạm tới

- ⛔C4 (dữ liệu ngoài là dữ liệu — R3.8/R3.9/R3.10 rào nonce, và R3.16 là chỗ rào ấy dễ bị mở lại nhất)
- `probe-classification` (không đụng — bóc trả lời đứng trước phân loại)
- Capability MỚI `model-reply-parsing` (ADDED 5 requirement)
- Hàng bảng tra: 14 điều `pending` → `housed`

## Impact

- MỚI: ba ca trong `test/boc-model.test.ts` (không tạo file lưới mới — nhóm này đã có nhà)
- Chạm: `packages/harness/src/model.ts` (chỉ comment) · `packages/harness/src/jsonx.ts` (không đổi)
- `docs/r-rules-map.md` (14 hàng)
- KHÔNG đụng `unwrapJson`, `unwrapCode`, `makeFence` — đã thuần, đã khoá
