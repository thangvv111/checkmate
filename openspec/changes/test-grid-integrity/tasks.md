# Tasks — test-grid-integrity

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/test-grid-integrity/spec.md` (4 requirement) — đã viết.
- [ ] 1.2 Đối chiếu: requirement thứ tư («ba tầng KHÔNG đủ») không khoá được bằng ca — nó là luật cho
      **người đọc**. Ghi rõ trong test-cases là N/A có chủ đích, không phải bỏ sót.

## 2. Tầng 3 — lưới cho lưới

- [ ] 2.1 `test/<lưới>.test.ts`: quét `test/*.test.ts`, tìm `export function scan*`, đòi mỗi hàm có **cả**
      ca kỳ vọng rỗng lẫn ca kỳ vọng không rỗng.
- [ ] 2.2 Chạy trên repo hiện tại: bốn hàm (`scanSource` · `scanDirectSql` · `scanAccountReaders` ·
      `scanCookieReaders`) phải **thoả**. Nếu có hàm thiếu cặp fixture thì **thêm ca cho nó** — đó chính là
      lỗ mà change này sinh ra để bịt.
- [ ] 2.3 Thông điệp lưới nêu **tên hàm và file**.
- [ ] 2.4 `checkmate.yml` bảng module nếu có export mới (⛔C5) + tên tiếng Anh.

## 3. Tầng 1 và 2 — luật quy trình

- [ ] 3.1 `AGENTS.md`: thêm mục về lưới — mutation bắt buộc (chạy hai lần, kiểm chứng đột biến đã áp dụng);
      gác chạy xuyên suốt phải đếm bề mặt bằng máy; mục «chạy thật một lượt» không được tick trước khi chạy.
      Viết kèm **án lệ có số** vì hai tầng này không có lưới.
- [ ] 3.2 `cp AGENTS.md CLAUDE.md` — lưới `huong-dan-harness` bắt lệch từng ký tự.

## 4. Mutation — mỗi chiều chạy HAI lần

- [ ] 4.1 Bỏ phép kiểm «có ca kỳ vọng rỗng» → lưới 2.1 phải ĐỎ trên một fixture chỉ có ca đối kháng.
- [ ] 4.2 Bỏ phép kiểm «có ca kỳ vọng không rỗng» → ĐỎ trên fixture chỉ có ca đối chứng.
- [ ] 4.3 Lưới 2.1 tự nó phải thoả tầng 3 — nếu nó có hàm `scan*` thì nó cũng cần cặp fixture.
      *Lưới-cho-lưới không được miễn chính luật nó cưỡng chế.*

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — dự đoán chỉ nêu vế **«không ca cũ nào đỏ»**.
- [ ] 5.2 `npx openspec validate --changes` xanh.
- [ ] 5.3 Lưới 2.1 phải bắt được thứ đã biết TRƯỚC khi tin nó: fixture một hàm quét chỉ có ca đối kháng
      → ĐỎ. *Ca load-bearing.*

## 6. Bảng tra

- [ ] 6.1 KHÔNG đổi hàng nào — change này thêm luật mới, không nhận điều `R` nào.
