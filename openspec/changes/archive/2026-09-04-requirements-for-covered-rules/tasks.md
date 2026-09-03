# Tasks — requirements-for-covered-rules

## 1. Luật (hai capability)

- [x] 1.1 Delta ADDED `specs/diff-visibility/spec.md` (3 requirement) — đã viết.
- [x] 1.2 Delta ADDED `specs/target-contract/spec.md` (5 requirement) — đã viết.
- [x] 1.3 Đối chiếu **từng điều trong 23 điều** với ca cụ thể (file + tiêu đề ca) đang cưỡng chế nó. Điều
      nào không chỉ được ra ca thì KHÔNG khai — ghi vào D-x thay vì viết bừa.

## 2. Mutation — phép kiểm CHÍNH của change này (D1)

Mỗi đột biến gỡ gác trung tâm của một requirement, chạy **hai lần**, kiểm chứng đã áp dụng.

- [x] 2.1 `diff-visibility` R-1: bỏ phép loại file sinh tự động → ca `dung-diff` ĐỎ.
- [x] 2.2 `diff-visibility` R-1 vế mẫu hỏng: cho mẫu sai cú pháp đi qua cửa đọc → ĐỎ.
- [x] 2.3 `diff-visibility` R-2: đảo hướng chọn (giữ file to trước) → ĐỎ.
- [x] 2.4 `diff-visibility` R-2 vế file duy nhất: bỏ điều kiện `giu.length > 0` → ĐỎ.
- [x] 2.5 `diff-visibility` R-3: bỏ trường `kyTu` khỏi bản ghi file bị bỏ → ĐỎ.
- [x] 2.6 `target-contract` R-4: bỏ phép kẹp `timeout_s` → ca `runner-cfg` ĐỎ.
- [x] 2.7 `target-contract` R-5: đọc thẻ báo lỗi theo NỘI DUNG thay vì sự có mặt → ĐỎ.
- [x] 2.8 `target-contract` R-6: bỏ phép kiểm ranh giới id → ĐỎ.
- [x] 2.9 `target-contract` R-7: cho `fileLoadError` nhận vơ mọi testcase đỏ → ĐỎ.
- [x] 2.10 `target-contract` R-8: bỏ đường đọc khối `review` → ĐỎ.
- [x] 2.11 **Thêm lượt HAI: 11 đột biến cho các vế phụ** (mỗi vế là một điều R riêng). 9/11 đỏ; **hai cái
      sống sót** — `R7.6` (ca không load-bearing) và `R2.15` (đột biến gỡ nhầm chỗ, vế đếm chưa ai chạm).
      Xử theo D1: **viết ca**, không thu hẹp requirement. Đo lại: cả hai ĐỎ. **Tổng 21/21.** Xem D5.
- [x] 2.12 `git diff --stat packages/` **sạch** sau cả hai lượt mutation.

## 3. Kiểm cơ học

- [x] 3.1 `npx tsc --noEmit` sạch · `npm test` **58 file / 914 ca xanh** (913 + 1 ca mới cho `R2.15`;
      ca `R7.6` được sửa tại chỗ, không thêm ca).
- [x] 3.2 `npx openspec validate --changes` xanh.
- [x] 3.3 Tầng 2 và tầng 3 của `test-grid-integrity` — **N/A có lý do** (D4).

## 4. Bảng tra

- [x] 4.1 **23 hàng** → `housed` trỏ `<capability> › <tiêu đề>`. Cập nhật dòng Đếm.
      Làm ở commit archive.
      Đếm bảng: pending 43 -> **20** · housed 192 -> **215**. Lưới `r-rules-map` xanh 6/6.
- [x] 4.2 Kiểm bằng máy (quét lại bảng sau khi sửa): **KHÔNG CÒN HÀNG NÀO** của hai capability ở `pending`.
      Cả hai **đóng hẳn**.
- [x] 4.3 Đo neo thư viện probe. **Dự đoán TRƯỚC «vẫn 15/15» — đo được đúng 15/15.**
