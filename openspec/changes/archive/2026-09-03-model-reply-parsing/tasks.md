# Tasks — model-reply-parsing

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/model-reply-parsing/spec.md` (5 requirement) — đã viết.
- [x] 1.2 Đối chiếu từng requirement với 12 ca sẵn có trong `test/boc-model.test.ts`; chỗ nào spec nói mà
      không ca nào khoá thì sửa SPEC cho khớp code hoặc thêm ca.

## 2. Ba ca mới (`test/boc-model.test.ts`)

- [x] 2.1 **R3.16 — hai vế**: model giả trả JSON hỏng ở lượt một; prompt lượt hai (a) chứa thông điệp lỗi
      của lượt đầu, và (b) thông điệp ấy nằm **giữa cặp mốc rào**, không nằm trần. Vế (b) là vế thật —
      một ca chỉ kiểm (a) vẫn xanh sau khi ai đó bỏ `rao(...)`.
- [x] 2.2 **R3.3** — lượt đầu hỏng, lượt hai cũng hỏng → model được gọi ĐÚNG hai lần rồi ném; không gọi
      lần ba.
- [x] 2.3 **R3.11** — danh sách tool cấm không rỗng và mang tool đọc/ghi file, chạy lệnh; lời gọi CLI dùng
      cờ liệt kê tường minh, KHÔNG dùng chuỗi rỗng (D3).

## 3. Dọn comment sai (D4)

- [x] 3.1 `model.ts` dòng ~139: bỏ câu «`--tools ""`: tắt toàn bộ tool» — nó mâu thuẫn với comment ở dòng
      32 và nói sai đúng điều đã tốn một vòng chấm thật để phát hiện.

## 4. Kiểm cơ học

- [x] 4.1 `npx tsc --noEmit` sạch · `npm test` **50 file / 829 ca xanh**. Dự đoán TRƯỚC «824 + 3»: vế
      «không ca cũ nào đỏ» ĐÚNG, vế số ca **sai** — thêm 5 ca chứ không 3, vì R3.16 tách hai vế thành hai
      ca (đúng như D1 đòi) và R3.11 tách hằng với lời gọi thành hai ca. Đếm nhầm ở khâu dự đoán, không ở
      khâu làm.
- [x] 4.2 `npx openspec validate --changes` xanh.
- [x] 4.3 Mutation, ba chiều, **mỗi chiều chạy hai lần, kết quả nhất quán**:
      M1 bỏ `rao(...)` ở `callJson` → ĐỎ đúng ca «nằm giữa cặp mốc rào», và ca «có thông điệp lỗi» **vẫn
      XANH** — đúng lý do D1 đòi tách hai vế thành hai ca ·
      M2 bọc lượt hai trong `try` để nhắc lần ba → ĐỎ ca đếm số lần gọi ·
      M3 `TOOL_CAM` thành chuỗi rỗng → ĐỎ ca danh sách tool.
- [x] 4.4 `git diff packages/harness/src/jsonx.ts` RỖNG — không đổi một dòng hành vi bóc.

## 5. Bảng tra (ở commit archive)

- [x] 5.1 `docs/r-rules-map.md`: 14 hàng → `housed`. Đếm bảng: pending 142 → 128 · housed 94 → 108. Lưới
      `r-rules-map` xanh 6/6.
- [x] 5.2 Đo neo thư viện probe. **Dự đoán TRƯỚC 11 → 12 — đo được đúng 12/15.** `R3.15` đã neo. Còn trôi
      3: `R4.18` · `R4.27` (`repo-history`) · `R9.6` (`data-layer`). Đây là lần đầu neo tăng sau ba change.

## 6. Sau-merge — việc có tên (KHÔNG thuộc change này)

- [x] 6.1 **Đã đo lại sáu change bằng cách đúng (đọc, không đếm mã)** — PO chốt 03/09, làm ngay trong
      lượt này. Kết quả: bảng cũ sai ở MỌI dòng, và ở hai dòng đầu thì **đảo ngược thứ tự**.

      | change | điều | có ca | chưa | % chưa (đúng) | % chưa (bảng cũ) |
      |---|---|---|---|---|---|
      | repo-history | 30 | 17 | **13** | 43% | 60% |
      | provider-gate | 23 | 11 | **12** | 52% | 61% |
      | probe-library | 28 | 19 | **9** | 32% | 68% |
      | data-layer | 18 | 11 | **7** | 39% | 56% |
      | diff-visibility | 11 | 8 | **3** | 27% | **91%** |
      | target-contract | 18 | 15 | **3** | 17% | 67% |
      | *model-reply-parsing* | *14* | *11* | *3* | *21%* | ***93%*** |

      Hai change em xếp đầu bảng cũ (93%, 91%) hoá ra là hai change **được khoá tốt nhất**: chúng ít điều
      và có một file test tập trung, nên tỉ lệ mã-trích thấp nhất trong khi độ phủ thật cao nhất.

      Cột «lưới» của bảng tra cũng đã thử làm phép đo thay thế và **cũng hỏng**: R3.1 và R3.9 có ca nhưng
      cột ghi `—`. Kết luận: **không có phép đo tự động nào dùng được** cho câu hỏi «điều này có ca test
      chưa» — ca test không tham chiếu mã, và bảng tra không ghi đủ. Phải đọc.

      Phát hiện đáng giá hơn cả bảng: ba luật **cùng một họ** rải ở ba change, đều thuộc ⛔C3, đều đang
      giữ bằng kỷ luật — `R11.20` (danh sách tài khoản, ĐÃ làm ở `identity-session`) · `R9.17` (khoá,
      token — `data-layer`) · `R4.26` (token, kể cả đã che — `repo-history`). PO chốt gộp thành một change
      lưới dùng chung, làm ngay sau change này.
- [x] 6.2 → `named-debts` **#16** (vào backlog 03/09). Ứng viên nợ: đưa thông điệp lỗi vào lượt hai của `callCode` (D2) — đổi hành vi, phải rào y như
      đường JSON, nên là change riêng chứ không backfill.
