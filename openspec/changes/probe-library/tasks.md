# Tasks — probe-library

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/probe-library/spec.md` (7 requirement) — đã viết.
- [x] 1.2 Đối chiếu 28 hàng pending: 20 điều đã có ca (ghi rõ ca nào ở đâu), 7 điều change này khoá,
      1 điều (`R8.9`) lỗi thời. KHÔNG viết ca trùng cho 20 điều đã có.

## 2. Lưới — bảy nhóm ca

- [x] 2.1 `R8.5` tên file suy từ nội dung: hai probe khác nội dung cùng `sha_sinh` → hai tên khác nhau,
      mỗi tên mang hash của chính nó; tên không chứa số thứ tự.
- [x] 2.2 `R8.5` nhánh nới hậu tố (D3): dựng `meta.json` bằng tay mang đúng tên probe mới sẽ tính ra nhưng
      `hash` khác → probe mới nhận hậu tố DÀI HƠN, file cũ KHÔNG bị ghi đè. *Đây cũng là một lượt kiểm ⛔C6.*
- [x] 2.3 `R8.8` chờ hết giờ vẫn làm việc (D4): dựng khoá giả còn tươi, gọi `withLibraryLock` → phần việc
      VẪN chạy và trả về giá trị. **Ca ~10 giây, phải khai `timeout` riêng** (trần vitest mặc định 5s).
- [x] 2.4 `R9.15` code probe ở lại dạng file: nạp probe → file có trên đĩa, đọc lại nguyên văn; và không
      chỗ nào trong lớp thư viện ghi code probe vào cơ sở dữ liệu.
- [x] 2.5 `R10.3` artifact mới: probe được nhận có `lich_su` RỖNG; và đường nạp bỏ mảnh tách không chạy
      sạch một mình trên nhánh gốc, kèm lý do nói đúng bản chất.
- [x] 2.6 `R10.11` (D6): (a) `probe-library.ts` không import lớp model; (b) ở `skill-code.ts` lời gọi model
      phân xử đứng TRƯỚC vòng `admitToLibrary`.
- [x] 2.7 `R10.14` (D5): `vi.stubEnv` + `vi.resetModules()` — giá trị hỏng thì dùng mặc định (KHÔNG đoán
      phần đầu); giá trị dưới cận thì kẹp lên cận dưới. Ca phải phân biệt được BA khả năng, không chỉ hai.
- [x] 2.8 `R10.15` đọc ngoài khoá: sổ có mục mà file đã mất → mục ấy bị bỏ qua, các probe còn lại về đủ,
      không ném.
- [x] 2.9 Mọi ca dùng thư mục thư viện TẠM riêng — `probes-lib/` là dữ liệu prod, không được chạm.

## 3. Tuân thủ `test-grid-integrity` (D7)

- [x] 3.1 Tầng 2 «đếm bề mặt bằng máy» — **N/A có lý do**: change này không dựng gác chạy xuyên suốt nào.
      Không có mục kiểm tay «chạy thật một lượt».
- [x] 3.2 Lưới này KHÔNG có hàm quét `scan*` — hai ca rà source (`R9.15`, `R10.11`) viết thẳng, không
      dựng hàm quét. `test/test-grid-integrity.test.ts` XANH.

## 4. Mutation — mỗi chiều chạy HAI lần, và kiểm chứng đột biến đã áp dụng

- [x] 4.1 **Đột biến đầu tiên SAI** (D8): rút dãy xuống `[6]` không gỡ gác vì hàm còn đường lui trả hash
      đầy đủ 64 hex → 0 ca đỏ. Đột biến đúng gỡ **phép kiểm đụng** → ca 2.2 ĐỎ, nhất quán hai lần.
- [x] 4.2 `break` → `throw` → ca 2.3 ĐỎ. **Lượt đầu LỆCH (1 đỏ / 2 đỏ)**, lượt sau nhất quán 1/1 — đúng
      thứ luật «chạy hai lần» sinh ra để bắt.
- [x] 4.3 Bỏ `try/catch` → ca 2.8 ĐỎ, nhất quán hai lần. *(Lượt đầu báo `MISS` vì chuỗi nhiều dòng không
      khớp CRLF — D8.)*
- [x] 4.4 `parseInt` → ca 2.7 ĐỎ, nhất quán hai lần: `parseInt('3abc')` cho 3, kẹp lên 6, còn 6 thay vì 7.
- [x] 4.5 `git diff --stat packages/` **sạch** sau lượt mutation.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **56 file / 902 ca xanh** (888 + 14 ca mới). Vế «không ca cũ
      nào đỏ» — ĐÚNG.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 Ca load-bearing: lưới phải bắt được thứ đã biết TRƯỚC khi tin nó — 4.1–4.4 là phép thử ấy.

## 6. Bảng tra

- [ ] 6.1 7 hàng → `housed` trỏ `probe-library › <tiêu đề>`; **`R8.9` → `obsolete`** kèm «thay bằng R10.22
      đào thải theo điểm» (D1). Cập nhật dòng Đếm. **Làm ở commit ARCHIVE** — lưới `r-rules-map` đòi hàng
      `housed` trỏ requirement CÓ THẬT trong `openspec/specs/`, mà spec chỉ vào đó lúc archive. Đã thử sớm
      một lần: lưới đỏ đúng chỗ ấy, và đó là lưới làm đúng việc của nó.
- [ ] 6.2 Đo neo thư viện probe — **dự đoán TRƯỚC: vẫn 15/15, change này không thêm mã nào vào thư viện.**
