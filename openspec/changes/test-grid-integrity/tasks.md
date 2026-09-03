# Tasks — test-grid-integrity

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/test-grid-integrity/spec.md` (4 requirement) — đã viết.
- [x] 1.2 Đối chiếu: requirement thứ tư («ba tầng KHÔNG đủ») không khoá được bằng ca — nó là luật cho
      **người đọc**. Ghi rõ trong test-cases là N/A có chủ đích, không phải bỏ sót.

## 2. Tầng 3 — lưới cho lưới

- [x] 2.1 `test/test-grid-integrity.test.ts` (9 ca). Phép nhận diện «kỳ vọng không rỗng» phải mang **bốn
      mẫu** — bốn hàm quét đang có dùng bốn cách viết khác nhau (`toHaveLength(n)` · `toEqual(` cuối dòng ·
      `toEqual([<nội dung>])` · `toContain`). Một mẫu duy nhất báo động giả trên ba hàm.
- [x] 2.2 Bốn hàm quét đang có đều **đã đủ cặp** — không phải thêm ca nào. Đo trước khi viết lưới, nên
      con số này là kết quả đo chứ không phải kết luận từ việc lưới xanh.
- [x] 2.3 Thông điệp nêu tên hàm, file, và **vế nào thiếu** (đối kháng hay đối chứng).
- [x] 2.4 KHÔNG phải khai: bảng module `checkmate.yml` khai export mà **probe** gọi tới trong
      `packages/*` và `apps/web`; hàm quét sống trong `test/` và không có probe nào gọi (bốn hàm sẵn có cũng
      không khai). Lưới `hop-dong-repo` xanh xác nhận. Tên `scanGridPairs` · `listScanners` — tiếng Anh.

## 3. Tầng 1 và 2 — luật quy trình

- [x] 3.1 `AGENTS.md`: thêm mục về lưới — mutation bắt buộc (chạy hai lần, kiểm chứng đột biến đã áp dụng);
      gác chạy xuyên suốt phải đếm bề mặt bằng máy; mục «chạy thật một lượt» không được tick trước khi chạy.
      Viết kèm **án lệ có số** vì hai tầng này không có lưới.
- [x] 3.2 `cp AGENTS.md CLAUDE.md` — lưới `huong-dan-harness` bắt lệch từng ký tự.

## 4. Mutation — mỗi chiều chạy HAI lần

- [x] 4.1 Bỏ phép kiểm «có ca kỳ vọng rỗng» → **2 ca ĐỎ**, gồm đúng ca dự đoán. Dự đoán nêu 1 ca; ca thứ
      hai («lời gọi ngoài khối ca») đỏ theo là hệ quả đúng.
- [x] 4.2 Bỏ phép kiểm «có ca kỳ vọng không rỗng» → **2 ca ĐỎ**, gồm đúng ca dự đoán.
      **Thêm M3 và M4 ngoài kế hoạch:** bỏ từng mẫu `KHONG_RONG` → ca «mã nguồn hiện tại» ĐỎ. Chúng chứng
      minh bốn dạng kỳ vọng là THẬT — không phải phòng xa. **Bốn đột biến, mỗi cái chạy hai lần, nhất quán.**
- [x] 4.3 `scanGridPairs` tự thoả tầng 3 (ca đối kháng `toHaveLength(1)` + ca đối chứng `toEqual([])`), và
      ca «mã nguồn hiện tại» quét cả chính nó. Ca «phép quét TÌM THẤY đúng hàm» liệt `scanGridPairs` tường
      minh — không được miễn luật nó cưỡng chế.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **55 file / 888 ca xanh** (879 + 9 ca mới). Vế «không ca cũ
      nào đỏ» — ĐÚNG.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 Bắt được, cả hai chiều. **Và ca load-bearing quan trọng hơn nằm ở chỗ khác:** «phép quét TÌM
      THẤY đúng những hàm quét đang có» — `scanGridPairs` trả rỗng trong hai trường hợp trông giống hệt nhau
      («mọi hàm đủ cặp» và «phép nhận diện hỏng»). Không có ca ấy thì một regex gãy làm cả tầng 3 thành
      trang trí mà lưới vẫn xanh.

## 6. Bảng tra

- [x] 6.1 KHÔNG đổi hàng nào — change này thêm luật mới, không nhận điều `R` nào.
