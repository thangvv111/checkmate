# Tasks — diff-visibility

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/diff-visibility/spec.md` (3 requirement) — đã viết.
- [x] 1.2 Đối chiếu 11 hàng pending: 8 điều đã có ca ở `dung-diff.test.ts` (ghi rõ ca nào khoá điều nào),
      3 điều change này khoá. KHÔNG viết ca trùng.

## 2. Lưới — ba nhóm ca

- [x] 2.1 `R7.10` prompt (**chạy thật**, D1): `promptPhanTich` với target có file ngoài tầm nhìn → prompt
      mang tên file, số ký tự, lý do, VÀ chỉ dẫn không kết luận về chúng.
- [x] 2.2 `R7.10` vế ngược: không có file nào bị loại → khối ấy KHÔNG xuất hiện.
      *Một khối rỗng đứng đó dạy model rằng luôn có phần khuất.*
- [x] 2.3 `R7.11` (**chạy thật** trên repo git tạm, D3): PR chỉ đổi file sinh tự động → `readTarget` ném
      thông điệp nói rõ «chỉ gồm file sinh tự động» kèm TÊN file.
- [x] 2.4 `R7.11` ca đối chứng: PR không đổi gì → thông điệp KHÁC («diff rỗng»).
      *Ca này mới khoá được luật: một hiện thực ném cùng một câu cho cả hai trạng thái vẫn qua ca 2.3.*
- [x] 2.5 `R7.8` log (**đọc source**, D1 — cái mất đã khai): nhánh log nêu số lượng + tên + lý do; và có
      cảnh báo RIÊNG lọc theo `lyDo === 'vượt trần kích thước diff'` nói verdict không kết luận gì về chúng.
- [x] 2.6 Repo git tạm dùng `GIT_TIMEOUT` như `sources.test.ts`, dọn ở `afterAll`, không nới trần toàn cục.

## 3. Tuân thủ `test-grid-integrity` (D4)

- [x] 3.1 Tầng 2 «đếm bề mặt bằng máy» — **N/A có lý do**: không dựng gác chạy xuyên suốt.
- [x] 3.2 Tầng 3 «cặp fixture»: lưới không dựng hàm quét `scan*`; `test/test-grid-integrity.test.ts` XANH.

## 4. Mutation — mỗi chiều chạy HAI lần, kiểm chứng đột biến đã áp dụng

- [x] 4.1 Bỏ chỉ dẫn «đừng kết luận gì» → ĐỎ đúng ca, nhất quán hai lần.
- [x] 4.2 Bỏ nhánh trả rỗng → ĐỎ đúng ca 2.2, nhất quán hai lần.
- [x] 4.3 `readTarget` ném cùng một câu ở cả hai trạng thái → ĐỎ đúng ca 2.3, nhất quán hai lần.
- [x] 4.4 Bỏ cảnh báo riêng cho file vượt trần → ĐỎ đúng ca 2.5, nhất quán hai lần.
- [x] 4.5 Không đột biến nào trượt — **cả bốn đúng ngay lần đầu**, khác hẳn `probe-library` (3/4 sai).
      D5 ghi vì sao: gác ở đây nằm trong CHUỖI VĂN BẢN, không nằm trong luồng điều khiển, nên không có chỗ
      để gỡ nhầm. Đó là lý do lượt mutation dễ — không phải bằng chứng lưới chắc hơn.
- [x] 4.6 `git diff --stat packages/` **sạch** sau lượt mutation.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **57 file / 909 ca xanh** (902 + 7 ca mới). Vế «không ca
      cũ nào đỏ» — ĐÚNG.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 Ca load-bearing: lưới phải bắt được thứ đã biết TRƯỚC khi tin nó — 4.1–4.4 là phép thử ấy.

## 6. Bảng tra

- [x] 6.1 **3 hàng** (`R7.8` · `R7.10` · `R7.11`) → `housed` trỏ `diff-visibility › <tiêu đề>`.
      **8 hàng còn `pending`** — chúng có ca nhưng chưa có requirement; bảng tra chỉ nhận `housed` khi trỏ
      được tới requirement có thật. Làm ở commit archive.
      Đếm bảng: pending 49 -> **46** · housed 186 -> **189**. Lưới `r-rules-map` xanh 6/6.
- [x] 6.2 Đo neo thư viện probe. **Dự đoán TRƯỚC «vẫn 15/15» — đo được đúng 15/15.**

## § Sau-merge — nợ có tên

- [ ] N1 Khai requirement cho **8 điều còn `pending`** của capability này (đã có ca ở `dung-diff.test.ts`,
      chỉ thiếu phần khai luật) để đóng hẳn `diff-visibility`. **KHÔNG thuộc change này** — PO chưa duyệt
      phạm vi ấy; trình PO quyết sau khi merge.
