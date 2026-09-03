# Design — data-layer

## Context

Đo trên `main` 03/09 (`e5c998e`) bằng cách **đọc**:

```
18 dieu R9
  DA co ca  ~11   kho-run (18) · kho-socai (15) · di-tru (8) · di-tru-bo-cot-cong (7) ·
                  doc-du-lieu-cu (10) · goc-du-lieu-chung (3)
  CHUA co ca ~7   R9 R9.1 R9.2 R9.3 R9.11 R9.13 R9.16 R9.17

Doc/ghi dia NGOAI lop kho — ba cho, ba ban chat khac nhau
  server.ts:755,769  ghi file TAM truyen cho harness qua --file   khong phai du lieu ung dung
  ui.ts:22           doc package.json lay so phien ban            metadata build
  runs.ts:73         doc events.jsonl                             FILE LA NGUON, bang la ban doc
```

## Goals / Non-Goals

**Goals**
- 18 điều có nhà, và `R9.6` — mã cuối còn trôi của thư viện probe — được neo.
- Nguyên tắc «file là nguồn, bảng là bản đọc» có requirement riêng.
- Ba luật kiến trúc (`R9.1` · `R9.2` · `R9.16`) chuyển từ quy ước sang lưới.

**Non-Goals**
- KHÔNG đổi hành vi. Backfill.
- KHÔNG viết lại `R9.17` — con trỏ sang `response-secret-guard` (D3).
- KHÔNG đụng `store/`, `runs.ts`, `config.ts`, `secret-vault.ts`.

## Decisions

### D1 — «File là nguồn, bảng là bản đọc» phải có requirement RIÊNG

Nguyên tắc này giải thích ngoại lệ thứ ba của `R9.1`, và nó chưa được khai ở đâu — chỉ sống trong một
comment. Nếu spec viết `R9.1` tuyệt đối («không được đọc đĩa») thì nó **nói quá code**, và người sau đọc
spec sẽ đi «sửa» đúng đường cứu hộ mà ⛔C2 cần: bảng chỉ được ghi lúc lượt chấm đóng, nên lượt bị giết giữa
chừng chỉ còn dấu vết trên đĩa.

Đây là ca «spec nói quá code» thứ hai bắt được trong chuỗi backfill (sau `R1.20` ở `probe-classification`),
và lần này bắt được **trước khi viết spec** chứ không phải lúc đối chiếu.

Requirement khai kèm hai vế mà comment nhấn: đường dựng lại là **một chiều**, và **dòng hỏng bị bỏ đúng
dòng đó** — «đọc được tới đây» là câu trả lời đúng, «không có gì» thì không.

### D2 — `R9.1`/`R9.2`/`R9.16`: lưới quét source, danh sách CHO PHÉP vị trí

Cùng khuôn `identity-session` (`R11.4` một cửa danh tính, `R11.20` không route nào đọc bảng tài khoản):
lưới quét, danh sách cho phép **kèm lý do**, chỗ mới phải giải trình trong pull request.

Khác một điểm: ở đây danh sách ngoại lệ **có ba loại lý do khác nhau** (file tạm · metadata build · file là
nguồn), nên danh sách phải ghi loại chứ không chỉ ghi đường dẫn. Một danh sách chỉ có đường dẫn sẽ được nới
bằng cách thêm dòng; một danh sách đòi lý do buộc người thêm phải nói lý do ấy thuộc loại nào.

### D3 — `R9.17` mang con trỏ, không viết lại

`response-secret-guard` đã cưỡng chế «không route nào trả bí mật ra» lúc chạy, phủ cả JSON, HTML và luồng sự
kiện — và nó **biết giá trị** khoá vì chúng nằm trong kho. Viết lại ở đây tạo hai chỗ nói cùng một điều.

Bảng tra: `R9.17` → `housed` trỏ `response-secret-guard`.

### D4 — `R9.3` và `R9.11` khoá bằng ca đọc schema, không bằng đo hiệu năng

`R9.3` (bật khoá ngoại, chế độ nhật ký) và `R9.11` (index cho cột lọc/sắp xếp) là tính chất của schema. Ca
đo hiệu năng thì mong manh và phụ thuộc máy; ca đọc schema thì ổn định và bắt đúng đường hỏng hay gặp —
ai đó thêm cột lọc mới mà quên index.

**Cái mất:** ca không chứng minh truy vấn *thật sự* dùng index. Phần ấy thuộc quan sát lúc vận hành.

### D5 — Dự đoán TRƯỚC khi đo

Thư viện probe tự chấm neo **14/15**, còn trôi đúng `R9.6`. Nó thuộc nhóm này và đã có ca ở
`kho-socai.test.ts`. **Dự đoán: neo lên 15/15 — không còn mã nào trôi.** Đây là mốc đóng của cả chuỗi
backfill về mặt neo.

### D6 — Phép quét của em sai hai lần, và code thì đúng (ghi lúc apply)

Lưới `R9.1`/`R9.16` bản đầu báo **sáu vi phạm**. Đọc kỹ thì **không cái nào là vi phạm**, và cả sáu đều do
phép quét viết ẩu:

| lưới báo | thực tế |
|---|---|
| `identity.ts` chạy SQL ngoài lớp kho | nó **là** cửa duy nhất của dữ liệu danh tính — vai lớp kho, chỉ nằm ngoài `store/` vì mang cả phép kiểm quyền |
| 5 route `/api/*` dựng HTML | `R9.16` nói về route **ĐỌC**; bốn cái bị bắt là POST hoặc bị cắt khối dính sang route kế tiếp |

Hai lỗi của phép quét: (a) quét cả `POST` trong khi luật nói «chỉ **đọc**» — route hành động là cửa dùng
chung cho form HTML lẫn client JS, và `POST /api/runs` có hẳn cờ `muonJson` để phân biệt; (b) cắt khối cứng
1500 ký tự nên dính sang route sau.

Ghi lại vì nó là mặt ngược của bài học năm lần trước: ở đó **ca xanh trên hệ thống đã hỏng**; ở đây **ca đỏ
trên hệ thống đang đúng**. Cả hai đều là lưới đo sai thứ nó tưởng đang đo, và cả hai đều chỉ lộ ra khi đối
chiếu với code thật thay vì tin vào con số lưới trả về.

`identity.ts` được khai thành **loại ngoại lệ riêng** (`cua-du-lieu-danh-tinh`) chứ không lặng lẽ cho qua:
người đọc phải thấy đây là ngoại lệ có lý do, không phải một chỗ ai đó quên dọn.

## Architecture

- Lưới mới: quét source cho ba luật kiến trúc + ca cho «file là nguồn».
- Code sản phẩm: **không đổi**, trừ khi task 1.2 phát hiện lệch.

## Data Model

N/A — không đổi schema.

## Risks / Trade-offs

- [Lưới quét source có âm tính giả] → cùng cái mất đã khai ở `identity-session` S1.4: SQL động ghép chuỗi
  vẫn lọt. Bề mặt ở đây là code của chính repo, đi qua review người.
- [Danh sách ngoại lệ bị nới] → D2: danh sách đòi **loại lý do**, không chỉ đường dẫn.
- [Ca schema không chứng minh truy vấn dùng index] → D4 khai thẳng.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
