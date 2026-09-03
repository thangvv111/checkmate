# Tasks — target-contract

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/target-contract/spec.md` (3 requirement) — đã viết.
- [x] 1.2 Đối chiếu 18 hàng pending: 15 điều đã có ca (`runner-cfg` 13 · `loi-nap-file` 7 · `phan-loai` +
      `nhan-probe-log`), 3 điều change này khoá. KHÔNG viết ca trùng.

## 2. Lưới — ba nhóm ca, CẢ BA chạy thật

- [x] 2.1 `R2.3` hai chỗ thay (D2): `test_cmd` là `node -e` do ca viết, ghi XML mang **chính chuỗi nhận ở
      chỗ thay thứ nhất** → đọc lại được giá trị đã thay, không chỉ biết «lệnh chạy xong».
- [x] 2.2 `R2.3` vế quote (D3): thư mục probe có KHOẢNG TRẮNG → lệnh vẫn chạy đúng, XML vẫn đọc được.
- [x] 2.3 `R2.16`: `test_cmd` không xuất XML và in stderr một chuỗi đặc trưng → `loiThu` mang chuỗi ấy VÀ
      tên file probe.
- [x] 2.4 `R2.17` (D4): `chdir` sang thư mục cha, dựng `Sandbox` bằng đường dẫn TƯƠNG ĐỐI → symlink
      `node_modules` trỏ tuyệt đối tới repo đích, KHÔNG trỏ vào thư mục sandbox. `finally` khôi phục cwd.
- [x] 2.5 Mỗi ca dựng repo git tạm riêng, dọn worktree (`sb.huy()`) và thư mục tạm; `timeout` riêng cho
      từng ca, KHÔNG nới trần toàn cục.

## 3. Tuân thủ `test-grid-integrity` (D5)

- [x] 3.1 Tầng 2 «đếm bề mặt bằng máy» — **N/A có lý do**: không dựng gác chạy xuyên suốt.
- [x] 3.2 Tầng 3 «cặp fixture»: lưới không dựng hàm quét `scan*`; `test/test-grid-integrity.test.ts` XANH.

## 4. Mutation — mỗi chiều chạy HAI lần, kiểm chứng đột biến đã áp dụng

- [x] 4.1 Bỏ `quote` → ĐỎ đúng ca 2.2, nhất quán hai lần.
- [x] 4.2 Bỏ `resolve()` → ĐỎ đúng ca 2.4, nhất quán hai lần.
- [x] 4.3 `loiThu` bỏ `stderr` → ĐỎ đúng ca 2.3, nhất quán hai lần.
- [x] 4.4 Bỏ phép thay chỗ thứ nhất → **2 ca ĐỎ** (2.1 và 2.2), nhất quán hai lần.
- [x] 4.5 **Dự đoán ở D5 SAI** — 4/4 đột biến đúng ngay lần đầu. D6 ghi lại cách phân loại đúng: không
      phải «văn bản vs luồng điều khiển» mà là **gác có ĐƯỜNG LUI hay không**.
- [x] 4.6 `git diff --stat packages/` **sạch** sau lượt mutation.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **58 file / 913 ca xanh** (909 + 4 ca mới). Vế «không ca
      cũ nào đỏ» — ĐÚNG.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 ⛔C5: `Sandbox` · `envSandbox` · `fileLoadError` **đã khai sẵn** ở bảng module; không thêm
      export nào. `test/hop-dong-repo.test.ts` xanh.
- [x] 5.4 Ca load-bearing: lưới phải bắt được thứ đã biết TRƯỚC khi tin nó — 4.1–4.4 là phép thử ấy.

## 6. Bảng tra

- [x] 6.1 **3 hàng** (`R2.3` · `R2.16` · `R2.17`) → `housed` trỏ `target-contract › <tiêu đề>`.
      **15 hàng còn `pending`** — có ca nhưng chưa có requirement. Làm ở commit archive.
      Đếm bảng: pending 46 -> **43** · housed 189 -> **192**. Lưới `r-rules-map` xanh 6/6.
- [x] 6.2 Đo neo thư viện probe. **Dự đoán TRƯỚC «vẫn 15/15» — đo được đúng 15/15.**

## § Sau-merge — nợ có tên

- [x] N1 PO chốt 04/09: **gộp với N1 của `diff-visibility`** thành một change riêng. Nợ này chuyển sang
      change ấy, không còn mở ở đây.
      *(nguyên văn)* Khai requirement cho **15 điều còn `pending`** của capability này để đóng hẳn `target-contract`.
      **KHÔNG thuộc change này** — cùng loại nợ với N1 của `diff-visibility`; trình PO gộp hai cái làm một
      change «đóng nốt hai capability» hay để riêng.
