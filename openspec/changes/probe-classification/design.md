# Design — probe-classification

## Context

Đo 03/09 trên `main` (`5997d0a`):

```
classifyByMachine   skill-code.ts — HAM THUAN, DA export, 8 nhanh bang chan tri
errorFingerprint    tho:  gột hex>=7, MOI chu so, khoang trang     -> dong dau, 160 ky tu
tightFingerprint    chat: gột hex>=7, `<so> ms`, so >=5 chu so     -> dong dau, 200 ky tu
looksLikeBrokenProbe  mau HEP (is not a function · Cannot find module · ten lop loi runtime · …)
test/phan-loai.test.ts  31 ca — bang chan tri 8 nhanh · van tay 4 ca · luat moi 9 ca · probe hong 2 ca
R1.15  chuoi trong promptSinhCode (skill-code.ts:767) — DIEU KIEN la bieu thuc ? : ngay tai cho goi
R1.16  cuong che that o hasBasis (verdict-contract), khong co cho rieng
```

Đây là điểm khác bốn change backfill trước: ở đó luật thi hành mà **không** có test (merge-gate 6 điều,
verdict-contract 9 điều); ở đây luật **đã khoá tốt**, chỉ chưa được khai. Nên change này ít code, nhiều chữ.

## Goals / Non-Goals

**Goals**
- 18 điều R1 có nhà: 16 thành requirement của capability này, 1 chuyển sang `verdict-contract`, 1 kèm test mới.
- Chỗ hở duy nhất (R1.15) khoá được bằng ca thật.
- Thư viện probe tự chấm neo lại 9 vế (R1.2 · R1.4–R1.7 · R1.17 · R1.18 · R1.20).

**Non-Goals**
- KHÔNG đụng `classifyByMachine`, hai hàm vân tay, `looksLikeBrokenProbe`, `isNewRule` — đã thuần, đã khoá.
- KHÔNG viết lại 31 ca test đang có; chỉ thêm ca cho R1.15.
- KHÔNG đổi hành vi nào.

## Decisions

### D1 — Spec viết từ TEST và CODE đang chạy, không từ văn bản R

Giao thức D7.2 của `retire-r-rules`. Cụ thể ở đây: bảng chân trị trong requirement 1 chép từ tám nhánh
`if` của `classifyByMachine`, không từ tám gạch đầu dòng của R1. Hai bên trùng nhau — nhưng nếu lệch thì
**code là bản đúng**, và chỗ lệch phải thành một dòng trong proposal chứ không lặng lẽ theo văn bản R.

### D2 — R1.16 chuyển nhà, không viết lại (PO chốt 03/09)

R1.16 nói «với PR thêm tính năng mới, đường DUY NHẤT để lượt chấm có cơ sở là probe chạy được và pass trên
nhánh PR». Đó là **hệ quả** của bảng chân trị, và chỗ cưỡng chế thật là `hasBasis` — đã khai ở
`verdict-contract › PASS phải có bằng chứng`. Viết lại thành requirement riêng ở đây tạo hai chỗ nói cùng
một điều, và hai chỗ sẽ lệch nhau. Bảng tra đổi hàng R1.16 sang `verdict-contract`; requirement 4 của
capability này nhắc một câu kèm con trỏ, không lặp luật.

### D3 — Tách `loiSinhLaiKhongBangChung` để khoá R1.15 (sửa 03/09 khi apply)

**Bản đầu của D3 sai, và cái sai lộ ra lúc viết ca test.** Nó nói: export `promptSinhCode` là đủ. Không đủ —
lời cảnh báo R1.15 KHÔNG do `promptSinhCode` quyết. Nó được dựng ở **chỗ gọi**, bằng một biểu thức ba ngôi
`baseKq === undefined || baseKq.length === 0 ? <cảnh báo> : <rỗng>`, rồi truyền vào qua tham số `loiLanTruoc`.
Export hàm nhận tham số ấy chỉ khoá được «prompt có chèn `loiLanTruoc` vào không» — tức khoá nửa dữ liệu mà
bỏ nửa quyết định, đúng chỗ luật sống. Một ca test dựa vào nó vẫn xanh sau khi ai đó xoá hẳn điều kiện.

Nên tách đúng chỗ quyết định: `loiSinhLaiKhongBangChung(baseKq, viSao)` — hàm thuần, nhận đúng hai thứ nó
cần, trả về chuỗi `loiLanTruoc` đầy đủ. Chữ trong prompt giữ **nguyên từng ký tự**. `promptSinhCode` không
export nữa (bản apply đã hoàn tác) vì nó không phục vụ ca nào — thêm bề mặt công khai không dùng đến là nợ.

Bài học lặp lại của backfill: **chỗ export phải là chỗ QUYẾT ĐỊNH, không phải chỗ gần nó.** Ở `merge-gate`
và `concurrent-runs` hai chỗ đó trùng nhau nên không lộ; ở đây chúng cách nhau một tham số.

Ca khoá cần **hai vế**: có cảnh báo khi nhánh gốc rỗng, và KHÔNG có cảnh báo khi nhánh gốc còn chạy được —
nói thừa cũng là nói sai, và một ca một chiều sẽ xanh cả khi ai đó nhét câu ấy vào mọi lượt sinh lại.
Mutation đo được cả hai chiều (task 3.2), mỗi chiều giết đúng một ca.

### D4 — Bảng chân trị viết dạng BẢNG trong requirement

Tám nhánh với hai biến đầu vào đọc bằng văn xuôi rất dễ sót một ô. Bảng hai cột đầu vào + cột nhãn + cột mã
gốc cho người đọc soi đủ tổ hợp, và cho người viết test đối chiếu từng hàng. Đây là chỗ hiếm mà bảng đúng
hơn câu.

### D5 — Mã gốc ghi trong thân requirement

Như các change trước. Ở đây có giá trị đo được: 9/22 vế mất neo của thư viện probe tự chấm trỏ đúng nhóm
R1 này, nên archive xong neo phải tăng từ 3 lên 12. **Dự đoán trước, đo sau** — bài học từ `verdict-contract`
§4.4 (viết kỳ vọng lúc chưa đo thì kỳ vọng sai).

## Architecture

- `packages/harness/src/skill-code.ts`: tách `loiSinhLaiKhongBangChung` (export) ra khỏi biểu thức ba ngôi
  tại chỗ gọi; chỗ gọi thu về một dòng. Chữ trong prompt không đổi một ký tự.
- `checkmate.yml` bảng module (⛔C5) · `test/phan-loai.test.ts` (2 ca cho R1.15).
- `apps/web`, `packages/shared`: không đổi.

## Data Model

N/A — không đổi kiểu, không đổi dữ liệu trên đĩa.

## Risks / Trade-offs

- [Spec chép từ R thay vì từ code] → D1; mỗi requirement đối chiếu với ca test đang xanh.
- [Export thêm một hàm mở rộng bề mặt công khai] → `loiSinhLaiKhongBangChung` là hàm thuần dựng chuỗi,
  không I/O, không trạng thái; cùng loại với `promptPhanTich` đã export từ trước. `promptSinhCode` giữ private.
- [Ca R1.15 chỉ một chiều] → D3 đòi hai vế (có và không có cảnh báo).

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
