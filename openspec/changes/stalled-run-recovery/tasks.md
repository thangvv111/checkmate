# Tasks — stalled-run-recovery

## 0. Tầng 2 của `test-grid-integrity` — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

Mục (1) đổi cách một lượt được tính là «đang chạy», và con số ấy đọc ở nhiều chỗ. Lệnh đếm và số đo:

```bash
grep -c "'dang_chay'" apps/web/src/store/run-store.ts   # 3
grep -c "dang_chay"   apps/web/src/runs.ts              # 4
grep -c "dang_chay"   apps/web/src/ui.ts                # 3
grep -c "runningCount" apps/web/src/server.ts           # 4
grep -rc "isPrRunning" apps/web/src/*.ts store/*.ts     # 7 (gom dinh nghia + comment)
```

- [ ] 0.1 Mọi chỗ trong danh sách trên phải được rà: chỗ nào đọc «đang chạy» để **quyết định** thì phải
      thấy được trạng thái kẹt; chỗ nào chỉ **hiển thị** thì phải nói được «kẹt» khác «đang chạy».
- [ ] 0.2 Ghi lại chỗ nào KHÔNG đổi và vì sao — bỏ sót im lặng là đúng lỗi tầng 2 sinh ra để chống.

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/stalled-run-recovery/spec.md` (4 requirement) — đã viết.
- [ ] 1.2 Gỡ mâu thuẫn hai comment (D7): `run-store.ts:183` nói «mọi hàng còn sót đều là xác»,
      `runs.ts:255` nói «lượt còn sổ là lượt còn sống». Sau change chỉ còn MỘT khẳng định đúng.

## 2. Mục (1) — lượt kẹt

- [ ] 2.1 `store/db.ts`: thêm cột định danh tiến trình vào bảng `run` qua khuôn `napCotThieu`.
- [ ] 2.2 `runs.ts` `batDau`: lưu pid ngay khi spawn; ghi xuống sổ cùng meta.
- [ ] 2.3 **Hàm thuần** quyết định «lượt này còn sống không» — nhận pid + trạng thái, trả quyết định.
      Tách khỏi I/O để mỗi nhánh là một ca (khuôn đã dùng ở `session-gate`, `message-egress`).
- [ ] 2.4 Lượt đời cũ (pid rỗng) → **kẹt** (D2), không suy đoán là còn sống.
- [ ] 2.5 `runningCount()` và `isPrRunning()` KHÔNG còn tính lượt kẹt — đây là vế giải phóng PR.
- [ ] 2.6 Route **tiếp tục**: gọi ĐÚNG `evaluateStartRun` (D4), từ chối kèm lý do khi không đủ điều kiện.
- [ ] 2.7 Route **huỷ**: kết thúc lượt ở trạng thái lỗi + ghi dòng sự kiện nói rõ người vận hành huỷ.
- [ ] 2.8 Huỷ chỉ kill khi **xác minh được** tiến trình đúng của lượt này (D1 — dòng lệnh mang run id).
      Không xác minh được → KHÔNG kill, và bề mặt nói rõ.
- [ ] 2.9 `ui.ts`: hai nút trên lượt kẹt; trạng thái «kẹt» phân biệt được với «đang chạy» ở bề mặt đọc.
- [ ] 2.10 ⛔C5: export mới → khai bảng module `checkmate.yml`.

## 3. Mục (2) — thông điệp cổng nhà cung cấp

- [ ] 3.1 Đường dựng thông điệp nói theo **phương thức đang cấu hình** (D5), không theo phương thức trong sổ.
- [ ] 3.2 Sổ kiểm mang phương thức khác cấu hình → nói «cần kiểm lại theo phương thức đang chọn».
- [ ] 3.3 KHÔNG sửa/xoá sổ `.ncc-verify.json` — nó là dữ liệu lịch sử, sửa là viết lại quá khứ (D5).

## 4. Mục (3) — dòng ứng viên

- [ ] 4.1 `skill-doc.ts:188`: dòng liệt kê mang **chỗ nhắm** của từng ứng viên, không chỉ nhãn rubric.
- [ ] 4.2 Dùng dữ liệu ĐÃ CÓ (`quotes` kèm vị trí) — không thêm lời gọi model nào.

## 5. Mutation — mỗi chiều chạy HAI lần, kiểm chứng đã áp dụng

- [ ] 5.1 Bỏ phép kiểm pid (quay lại `existsSync`) → ca «lượt chết bị coi là còn sống» ĐỎ.
- [ ] 5.2 Cho lượt đời cũ (pid rỗng) được coi là còn sống → ca 2.4 ĐỎ.
- [ ] 5.3 Cho `runningCount` đếm cả lượt kẹt → ca 2.5 ĐỎ.
- [ ] 5.4 Route tiếp tục bỏ qua `evaluateStartRun` → ca 2.6 ĐỎ.
- [ ] 5.5 Bỏ phép xác minh trước khi kill → ca 2.8 ĐỎ. *(Ca này gác thiệt hại ngoài phạm vi sản phẩm.)*
- [ ] 5.6 Bỏ dòng sự kiện khi huỷ → ca 2.7 ĐỎ.
- [ ] 5.7 Thông điệp cổng đọc phương thức từ sổ thay vì cấu hình → ca 3.1 ĐỎ.
- [ ] 5.8 Dòng ứng viên quay lại chỉ in nhãn → ca 4.1 ĐỎ.
- [ ] 5.9 Đột biến sống sót → bảng ba đường (`requirements-for-covered-rules` D1). Không im lặng.
- [ ] 5.10 **Mutation dài chạy NỀN**, ghi log ra file (`close-probe-library-spec` D6).
- [ ] 5.11 `git diff --stat packages/ apps/` **sạch** — cổng bắt buộc trước commit (D6 change trước).

## 6. Kiểm tay — CHẠY THẬT MỘT LƯỢT (tầng 2, không được tick trước khi chạy)

- [ ] 6.1 Bật server, xác nhận xác `wmtlc846uh8nk` (PR #7) **được giải phóng ở lần khởi động đầu**.
- [ ] 6.2 Bấm **Huỷ** trên lượt ấy → trạng thái lỗi, sổ có dòng nói người vận hành huỷ.
- [ ] 6.3 Chấm lại PR #7 → **không còn 409 `pr_dang_cham`**.
- [ ] 6.4 Đặt cấu hình về thuê bao, bấm Kiểm tra lại → thông điệp nói đúng phương thức (không đòi API key).
- [ ] 6.5 Chạy một lượt doc → dòng ứng viên phân biệt được từng cái.

## 7. Kiểm cơ học

- [ ] 7.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 7.2 `npx openspec validate --changes` xanh.
- [ ] 7.3 Tầng 3: nếu lưới dựng hàm quét `scan*` thì phải có cặp fixture; `test-grid-integrity` XANH.
- [ ] 7.4 Di trú: mở cơ sở dữ liệu cũ → cột mới được thêm tự động, dữ liệu cũ nguyên vẹn.
