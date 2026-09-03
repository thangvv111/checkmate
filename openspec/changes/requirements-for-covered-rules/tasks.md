# Tasks — requirements-for-covered-rules

## 1. Luật (hai capability)

- [ ] 1.1 Delta ADDED `specs/diff-visibility/spec.md` (3 requirement) — đã viết.
- [ ] 1.2 Delta ADDED `specs/target-contract/spec.md` (5 requirement) — đã viết.
- [ ] 1.3 Đối chiếu **từng điều trong 23 điều** với ca cụ thể (file + tiêu đề ca) đang cưỡng chế nó. Điều
      nào không chỉ được ra ca thì KHÔNG khai — ghi vào D-x thay vì viết bừa.

## 2. Mutation — phép kiểm CHÍNH của change này (D1)

Mỗi đột biến gỡ gác trung tâm của một requirement, chạy **hai lần**, kiểm chứng đã áp dụng.

- [ ] 2.1 `diff-visibility` R-1: bỏ phép loại file sinh tự động → ca `dung-diff` ĐỎ.
- [ ] 2.2 `diff-visibility` R-1 vế mẫu hỏng: cho mẫu sai cú pháp đi qua cửa đọc → ĐỎ.
- [ ] 2.3 `diff-visibility` R-2: đảo hướng chọn (giữ file to trước) → ĐỎ.
- [ ] 2.4 `diff-visibility` R-2 vế file duy nhất: bỏ điều kiện `giu.length > 0` → ĐỎ.
- [ ] 2.5 `diff-visibility` R-3: bỏ trường `kyTu` khỏi bản ghi file bị bỏ → ĐỎ.
- [ ] 2.6 `target-contract` R-4: bỏ phép kẹp `timeout_s` → ca `runner-cfg` ĐỎ.
- [ ] 2.7 `target-contract` R-5: đọc thẻ báo lỗi theo NỘI DUNG thay vì sự có mặt → ĐỎ.
- [ ] 2.8 `target-contract` R-6: bỏ phép kiểm ranh giới id → ĐỎ.
- [ ] 2.9 `target-contract` R-7: cho `fileLoadError` nhận vơ mọi testcase đỏ → ĐỎ.
- [ ] 2.10 `target-contract` R-8: bỏ đường đọc khối `review` → ĐỎ.
- [ ] 2.11 Với mỗi đột biến KHÔNG giết được ca nào: đi theo bảng ba đường ở D1 — **không im lặng khai bừa**.
      Nếu hoá ra một điều chưa được gác thật thì viết ca cho nó, hoặc thu hẹp requirement cho đúng thực tế.
- [ ] 2.12 `git diff --stat packages/` sạch sau lượt mutation.

## 3. Kiểm cơ học

- [ ] 3.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 3.2 `npx openspec validate --changes` xanh.
- [ ] 3.3 Tầng 2 và tầng 3 của `test-grid-integrity` — **N/A có lý do** (D4).

## 4. Bảng tra

- [ ] 4.1 **23 hàng** → `housed` trỏ `<capability> › <tiêu đề>`. Cập nhật dòng Đếm.
      **Làm ở commit ARCHIVE** (lưới đòi spec đã vào `openspec/specs/`).
- [ ] 4.2 Sau change này **không hàng nào** của `diff-visibility` và `target-contract` còn `pending` —
      kiểm bằng máy, không bằng trí nhớ.
- [ ] 4.3 Đo neo thư viện probe — **dự đoán TRƯỚC: vẫn 15/15**.
