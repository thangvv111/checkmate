# Tasks — model-reply-parsing

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/model-reply-parsing/spec.md` (5 requirement) — đã viết.
- [ ] 1.2 Đối chiếu từng requirement với 12 ca sẵn có trong `test/boc-model.test.ts`; chỗ nào spec nói mà
      không ca nào khoá thì sửa SPEC cho khớp code hoặc thêm ca.

## 2. Ba ca mới (`test/boc-model.test.ts`)

- [ ] 2.1 **R3.16 — hai vế**: model giả trả JSON hỏng ở lượt một; prompt lượt hai (a) chứa thông điệp lỗi
      của lượt đầu, và (b) thông điệp ấy nằm **giữa cặp mốc rào**, không nằm trần. Vế (b) là vế thật —
      một ca chỉ kiểm (a) vẫn xanh sau khi ai đó bỏ `rao(...)`.
- [ ] 2.2 **R3.3** — lượt đầu hỏng, lượt hai cũng hỏng → model được gọi ĐÚNG hai lần rồi ném; không gọi
      lần ba.
- [ ] 2.3 **R3.11** — danh sách tool cấm không rỗng và mang tool đọc/ghi file, chạy lệnh; lời gọi CLI dùng
      cờ liệt kê tường minh, KHÔNG dùng chuỗi rỗng (D3).

## 3. Dọn comment sai (D4)

- [ ] 3.1 `model.ts` dòng ~139: bỏ câu «`--tools ""`: tắt toàn bộ tool» — nó mâu thuẫn với comment ở dòng
      32 và nói sai đúng điều đã tốn một vòng chấm thật để phát hiện.

## 4. Kiểm cơ học

- [ ] 4.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — **dự đoán TRƯỚC: 824 + 3, không ca cũ nào đỏ**.
- [ ] 4.2 `npx openspec validate --changes` xanh.
- [ ] 4.3 Mutation, mỗi chiều chạy **hai lần**:
      bỏ `rao(...)` ở `callJson` → ca 2.1 vế (b) ĐỎ ·
      bọc lượt hai trong `try` để nhắc lần ba → ca 2.2 ĐỎ ·
      đổi danh sách tool cấm thành chuỗi rỗng → ca 2.3 ĐỎ.
- [ ] 4.4 `git diff packages/harness/src/jsonx.ts` phải RỖNG — change này không đổi hành vi bóc.

## 5. Bảng tra (ở commit archive)

- [ ] 5.1 `docs/r-rules-map.md`: 14 điều → `housed` `model-reply-parsing › <tiêu đề>`.
- [ ] 5.2 Đo neo thư viện probe sau archive — **dự đoán TRƯỚC: tăng 11 → 12** (D5, `R3.15` thuộc change
      này). Sai thì ghi rõ sai ở đâu.

## 6. Sau-merge — việc có tên (KHÔNG thuộc change này)

- [ ] 6.1 **Đo lại sáu change backfill còn lại bằng cách ĐÚNG** (PO chốt 03/09). Bảng xếp hạng «tỉ lệ điều
      chưa có ca» đang đếm mã `R*.x` xuất hiện trong `test/`, và chính change này chứng minh nó sai: đo ra
      93% chưa khoá, thực tế 21%. Phải đọc từng nhóm thay vì đếm mã trích.
- [ ] 6.2 Ứng viên nợ: đưa thông điệp lỗi vào lượt hai của `callCode` (D2) — đổi hành vi, phải rào y như
      đường JSON, nên là change riêng chứ không backfill.
