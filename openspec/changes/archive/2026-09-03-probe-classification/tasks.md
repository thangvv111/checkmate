# Tasks — probe-classification

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/probe-classification/spec.md` (4 requirement) — đã viết. Test khoá:
      `test/phan-loai.test.ts` (31 ca sẵn có + 2 ca mới cho R1.15).
- [x] 1.2 Đối chiếu từng requirement với ca test đang xanh. Bắt được **một chỗ spec nói quá code**: R1.20
      «phân biệt ở MỌI bề mặt người đọc» — dòng log tóm tắt GỘP hai nhãn và bảng hàng dùng cùng mũi tên
      `✓→✗`. Sửa SPEC cho khớp code (giữ riêng **trong dữ liệu**, có scenario mới «sổ giữ hai nhãn riêng»),
      ghi chỗ lệch thành mục riêng trong proposal. Hai vế chưa đạt để lại làm ứng viên nợ, KHÔNG khai.

## 2. Engine (packages/harness)

- [x] 2.1 `skill-code.ts`: tách hàm thuần `loiSinhLaiKhongBangChung(baseKq, viSao)` ra khỏi biểu thức ba
      ngôi tại chỗ gọi và export nó. KHÔNG đổi một chữ nào trong prompt (D3 sửa lúc apply — export
      `promptSinhCode` không khoá được điều kiện vì điều kiện nằm ở chỗ gọi, không nằm trong hàm).
- [x] 2.2 `checkmate.yml` bảng module: thêm `loiSinhLaiKhongBangChung` vào dòng `skill-code.js` (⛔C5).

## 3. Test

- [x] 3.1 `test/phan-loai.test.ts`: hai ca cho R1.15 — (a) nhánh gốc không chạy được probe nào → prompt sinh
      lại CÓ lời cảnh báo, nói cả ba ý (không đối chứng · probe đỏ thành nghi vấn · probe sai giả định);
      (b) nhánh gốc CÓ kết quả → prompt KHÔNG có lời đó (nói thừa cũng là nói sai).
- [x] 3.2 Mutation: gác `baseKq === undefined || baseKq.length === 0` thay bằng `false` → ca (a) ĐỎ, 32 ca
      còn lại xanh; thay bằng `true` → ca (b) ĐỎ, 32 ca còn lại xanh. Mỗi chiều giết ĐÚNG một ca, không
      đỏ lan — gác load-bearing cả hai vế. Ghi kết quả vào PR.

## 4. Kiểm cơ học

- [x] 4.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — 47 file / 764 ca.
- [x] 4.2 `git diff packages/harness/src/skill-code.ts`: `29 14`. Kỳ vọng cũ («đúng 1 dòng») thuộc về D3
      bản sai; theo D3 đã sửa, con số đúng là: chỗ gọi thu 14 dòng → 1, hàm mới 28 dòng (13 dòng chữ
      prompt chuyển nguyên văn + JSDoc + chữ ký).
- [x] 4.3 `npx openspec validate --changes` xanh.
- [x] 4.4 Đo neo thư viện sau archive. **Dự đoán TRƯỚC: 3 → 12. Đo được: 3 → 11.** Sai 1, và sai ở phép
      ĐẾM chứ không ở nội dung: dự đoán viết «9 vế» nhưng danh sách liệt kê chỉ có 8 mã (`R1.4–R1.7` là 4
      mã, không phải 5). Cả 8 mã dự đoán đều neo đúng — R1.2 · R1.4 · R1.5 · R1.6 · R1.7 · R1.17 · R1.18 ·
      R1.20. Thư viện tự chấm: 16 probe, 15 mã R riêng biệt, **11 neo · 4 còn trôi** (R3.15 · R4.18 ·
      R4.27 · R9.6, thuộc `data-layer` và `target-contract` chưa backfill).

## 5. Bảng tra (ở commit archive)

- [x] 5.1 `docs/r-rules-map.md`: 18 hàng `pending` → `housed`, 2 hàng `precedent` trỏ đúng đoạn. Đếm bảng:
      pending 181 → 163 · housed 55 → 73. Lưới `test/r-rules-map.test.ts` xanh 6/6. Chi tiết: R1 · R1.1–R1.11 · R1.14 · R1.15 · R1.17 · R1.18 · R1.20 → `housed` với địa
      chỉ `probe-classification › <tiêu đề>`; **R1.16 → `housed` `verdict-contract › PASS phải có bằng
      chứng…`** (D2); hàng `precedent` R1.2 và R1.17 trỏ đoạn «Vì sao» của requirement tương ứng.
