# Tasks — probe-library

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/probe-library/spec.md` (7 requirement) — đã viết.
- [ ] 1.2 Đối chiếu 28 hàng pending: 20 điều đã có ca (ghi rõ ca nào ở đâu), 7 điều change này khoá,
      1 điều (`R8.9`) lỗi thời. KHÔNG viết ca trùng cho 20 điều đã có.

## 2. Lưới — bảy nhóm ca

- [ ] 2.1 `R8.5` tên file suy từ nội dung: hai probe khác nội dung cùng `sha_sinh` → hai tên khác nhau,
      mỗi tên mang hash của chính nó; tên không chứa số thứ tự.
- [ ] 2.2 `R8.5` nhánh nới hậu tố (D3): dựng `meta.json` bằng tay mang đúng tên probe mới sẽ tính ra nhưng
      `hash` khác → probe mới nhận hậu tố DÀI HƠN, file cũ KHÔNG bị ghi đè. *Đây cũng là một lượt kiểm ⛔C6.*
- [ ] 2.3 `R8.8` chờ hết giờ vẫn làm việc (D4): dựng khoá giả còn tươi, gọi `withLibraryLock` → phần việc
      VẪN chạy và trả về giá trị. **Ca ~10 giây, phải khai `timeout` riêng** (trần vitest mặc định 5s).
- [ ] 2.4 `R9.15` code probe ở lại dạng file: nạp probe → file có trên đĩa, đọc lại nguyên văn; và không
      chỗ nào trong lớp thư viện ghi code probe vào cơ sở dữ liệu.
- [ ] 2.5 `R10.3` artifact mới: probe được nhận có `lich_su` RỖNG; và đường nạp bỏ mảnh tách không chạy
      sạch một mình trên nhánh gốc, kèm lý do nói đúng bản chất.
- [ ] 2.6 `R10.11` (D6): (a) `probe-library.ts` không import lớp model; (b) ở `skill-code.ts` lời gọi model
      phân xử đứng TRƯỚC vòng `admitToLibrary`.
- [ ] 2.7 `R10.14` (D5): `vi.stubEnv` + `vi.resetModules()` — giá trị hỏng thì dùng mặc định (KHÔNG đoán
      phần đầu); giá trị dưới cận thì kẹp lên cận dưới. Ca phải phân biệt được BA khả năng, không chỉ hai.
- [ ] 2.8 `R10.15` đọc ngoài khoá: sổ có mục mà file đã mất → mục ấy bị bỏ qua, các probe còn lại về đủ,
      không ném.
- [ ] 2.9 Mọi ca dùng thư mục thư viện TẠM riêng — `probes-lib/` là dữ liệu prod, không được chạm.

## 3. Tuân thủ `test-grid-integrity` (D7)

- [ ] 3.1 Tầng 2 «đếm bề mặt bằng máy» — **N/A có lý do**: change này không dựng gác chạy xuyên suốt nào.
      Không có mục kiểm tay «chạy thật một lượt».
- [ ] 3.2 Tầng 3 «cặp fixture»: nếu lưới có hàm quét `scan*` thì phải có cả fixture đối kháng lẫn đối chứng.
      `test/test-grid-integrity.test.ts` phải XANH.

## 4. Mutation — mỗi chiều chạy HAI lần, và kiểm chứng đột biến đã áp dụng

- [ ] 4.1 Bỏ vòng nới hậu tố (dùng thẳng 6 hex) → ca 2.2 ĐỎ.
- [ ] 4.2 Đổi `break` khi hết giờ chờ thành `throw` → ca 2.3 ĐỎ.
- [ ] 4.3 Bỏ `try/catch` quanh `readFileSync` trong `readProbeLibrary` → ca 2.8 ĐỎ.
- [ ] 4.4 Đổi phép kiểm số nguyên sạch thành `parseInt` → ca 2.7 ĐỎ (giá trị hỏng bị đoán thành số).
- [ ] 4.5 **Khôi phục nguyên trạng sau mỗi đột biến** — `git diff --stat` phải sạch trước khi chạy 5.1.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — dự đoán chỉ nêu vế **«không ca cũ nào đỏ»**.
- [ ] 5.2 `npx openspec validate --changes` xanh.
- [ ] 5.3 Ca load-bearing: lưới phải bắt được thứ đã biết TRƯỚC khi tin nó — 4.1–4.4 là phép thử ấy.

## 6. Bảng tra

- [ ] 6.1 7 hàng → `housed` trỏ `probe-library › <tiêu đề>`; **`R8.9` → `obsolete`** kèm «thay bằng R10.22
      đào thải theo điểm» (D1). Cập nhật dòng Đếm.
- [ ] 6.2 Đo neo thư viện probe — **dự đoán TRƯỚC: vẫn 15/15, change này không thêm mã nào vào thư viện.**
