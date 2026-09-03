# Proposal — data-layer

## Why

Backfill capability thứ chín, và là **change đóng nốt neo**: `R9.6` là mã cuối cùng của thư viện probe tự
chấm còn trôi — archive xong, neo về **15/15**.

18 điều về lớp kho và sổ cái chỉ-ghi-thêm. Đo bằng cách **đọc**: khoảng **11 đã có ca**
(`kho-run` 18 · `kho-socai` 15 · `di-tru` 8 · `di-tru-bo-cot-cong` 7 · `doc-du-lieu-cu` 10 ·
`goc-du-lieu-chung` 3), **7 chưa**.

## Phát hiện chính: một nguyên tắc chưa ai khai

`R9.1` viết «Route, tầng dựng giao diện và harness KHÔNG được đọc/ghi đĩa hay gọi SQL trực tiếp». Đo trên
code thì **ba chỗ ngoài lớp kho vẫn đọc/ghi đĩa**, và cả ba đều hợp lệ vì ba lý do khác nhau:

```
server.ts:755,769  ghi file TAM de truyen cho harness qua --file   -> khong phai du lieu ung dung
ui.ts:22           doc package.json lay version                     -> metadata build
runs.ts:73         doc events.jsonl                                 -> FILE LA NGUON, bang la ban doc
```

Chỗ thứ ba là nguyên tắc kiến trúc **chưa requirement nào nói ra**, và comment tại chỗ giải thích tại sao:

> Bảng trống mà sổ trên đĩa có → ĐỌC SỔ. Bảng chỉ được ghi lúc lượt chấm đóng, nên một lượt bị giết giữa
> chừng có đủ dấu vết trên đĩa mà bảng thì trống. Đọc mỗi bảng ở đây nghĩa là mở lại một lượt đã chết và
> thấy TRỐNG RỖNG — đúng thứ ⛔C2 cấm: «không đọc được» hiện thành «không có gì».

Có cả đường **một chiều** dựng lại bảng từ đĩa, và không có đường ngược lại.

Nếu spec viết `R9.1` tuyệt đối thì nó **nói quá code**, và người sau đọc nó sẽ đi «sửa» đúng đường cứu hộ
mà ⛔C2 cần. Nên capability này khai riêng một requirement cho «file là nguồn, bảng là bản đọc», và khai
`R9.1` kèm đúng ba ngoại lệ.

## What Changes

- **Capability `data-layer`** — 6 requirement viết từ code và test đang chạy.
- **Requirement riêng cho «file là nguồn, bảng là bản đọc»** — nguyên tắc giải thích cả ba ngoại lệ của
  `R9.1`, và là chỗ ⛔C2 sống ở tầng dữ liệu.
- **Lưới quét source cho ba luật kiến trúc** (`R9.1` · `R9.2` · `R9.16`), dùng lại khuôn `identity-session`:
  danh sách CHO PHÉP vị trí, mỗi ngoại lệ ghi kèm lý do.
- **`R9.17` mang con trỏ** sang `response-secret-guard` — không viết lại cơ chế (cùng `R4.26`).
- KHÔNG đổi hành vi. Backfill.

## Luật chạm tới

- ⛔C2 (fail-closed — «file là nguồn» tồn tại để «không đọc được» không hiện thành «không có gì»)
- ⛔C3 (bí mật không rò — `R9.13` kho khoá cố ý ở lại file vì **bí mật trong cơ sở dữ liệu thì mọi bản sao
  lưu đều mang theo khoá**; `R9.17` con trỏ)
- ⛔C6 (sửa file bằng tay phải có hiệu lực ở lượt đọc kế tiếp — `R9.13` là chỗ luật ấy sinh ra)
- `response-secret-guard` (nhận `R9.17` bằng con trỏ)
- Capability MỚI `data-layer` (ADDED 6 requirement)
- Hàng bảng tra: 18 điều `pending` → `housed`

## Impact

- MỚI: lưới quét source cho ba luật kiến trúc + ca cho «file là nguồn»
- Chạm: không đổi code sản phẩm nếu task 1.2 không phát hiện lệch
- `docs/r-rules-map.md` (18 hàng)
- KHÔNG đụng `store/`, `runs.ts`, `config.ts`, `secret-vault.ts`

## Đo sẽ làm sau archive

Thư viện probe tự chấm neo **14/15**, còn trôi đúng `R9.6` — thuộc nhóm này và **đã có ca** ở
`kho-socai.test.ts` («cũng chỉ ghi thêm — sửa và xoá đều bị từ chối», «hành động ngoài merge và reject bị
chặn»). **Dự đoán: neo lên 15/15, không còn mã nào trôi.**
