# Tasks — stalled-run-recovery

## 0. Tầng 2 của `test-grid-integrity` — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -c "'dang_chay'" apps/web/src/store/run-store.ts   # 3
grep -c "dang_chay"   apps/web/src/runs.ts              # 4
grep -c "dang_chay"   apps/web/src/ui.ts                # 3
grep -c "runningCount" apps/web/src/server.ts           # 4
grep -rc "isPrRunning" apps/web/src/*.ts store/*.ts     # 7 (gom dinh nghia + comment)
```

- [ ] 0.1 Rà từng chỗ: chỗ nào **quyết định** theo «đang chạy» thì phải đúng sau khi lượt chết thành `loi`;
      chỗ nào chỉ **hiển thị** thì phải đúng theo trạng thái mới.
- [ ] 0.2 Ghi lại chỗ nào KHÔNG đổi và vì sao. **Dự đoán TRƯỚC (D3): `runningCount` và `isPrRunning` KHÔNG
      phải sửa** — chúng đã lọc theo `dang_chay`, nên đánh dấu `loi` là tự giải phóng. Sai thì ghi rõ.

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/stalled-run-recovery/spec.md` (5 requirement) — đã viết.
- [ ] 1.2 Gỡ khẳng định sai ở `run-store.ts:183` (D7) — sau change chỉ còn MỘT khẳng định, và nó có ca.

## 2. Mục (1) — lượt chết thành lỗi ngay

- [ ] 2.1 `store/db.ts`: thêm cột định danh tiến trình vào bảng `run` qua khuôn `napCotThieu`.
- [ ] 2.2 `runs.ts` `batDau`: lưu pid ngay khi spawn.
- [ ] 2.3 **Hàm thuần** quyết định «lượt này còn sống không» (pid + trạng thái → quyết định). Tách khỏi I/O
      để mỗi nhánh là một ca — khuôn đã dùng ở `session-gate`, `message-egress`.
- [ ] 2.4 Lượt đời cũ (pid rỗng) → **đã chết** (D2), không suy đoán.
- [ ] 2.5 `noiLaiLuotDangChay` phân đôi: pid sống → nối lại; pid chết → **đánh dấu `loi` NGAY** + ghi dòng
      sự kiện nói rõ nguyên nhân.
- [ ] 2.6 KHÔNG dựng trạng thái trung gian, KHÔNG route «tiếp tục» (D3).

## 3. Mục (1b) — huỷ lượt đang chạy

- [ ] 3.1 Route **huỷ**: từ chối nếu lượt không còn đang chạy.
- [ ] 3.2 Huỷ → trạng thái lỗi + ghi sổ **ai** huỷ.
- [ ] 3.3 Kill chỉ khi **xác minh được** dòng lệnh mang run id (D1). Không đọc được dòng lệnh ⇒ coi như
      không xác minh được ⇒ KHÔNG kill, và bề mặt nói rõ.
- [ ] 3.4 `ui.ts`: nút Huỷ trên lượt đang chạy.
- [ ] 3.5 Route huỷ phải sau cửa phiên, và **chế độ demo từ chối** — cùng hạng route sửa cấu hình.
- [ ] 3.6 ⛔C5: export mới → khai bảng module `checkmate.yml`.

## 4. Mục (2) — thông điệp cổng nhà cung cấp

- [ ] 4.1 Đường dựng thông điệp nói theo **phương thức đang cấu hình** (D4).
- [ ] 4.2 Sổ kiểm mang phương thức khác cấu hình → nói «cần kiểm lại theo phương thức đang chọn».
- [ ] 4.3 KHÔNG sửa/xoá `.ncc-verify.json` — dữ liệu lịch sử (D4).

## 5. Mục (3) — dòng ứng viên

- [ ] 5.1 `skill-doc.ts:188`: dòng liệt kê mang **chỗ nhắm** của từng ứng viên.
- [ ] 5.2 Dùng `quotes` đã có — không thêm lời gọi model nào.

## 6. Ca khoá GIẢ ĐỊNH NỀN (D6)

- [ ] 6.1 Ca dựng lại khuôn `spawn` của `batDau` (`shell: true`, ghi ra **file**), giết tiến trình cha, và
      khẳng định tiến trình cháu **vẫn ghi tiếp**. Không cần lượt chấm thật.
- [ ] 6.2 Ca này khoá điều mà cả `noiLaiLuotDangChay` lẫn `cleanupOrphanRuns` dựa vào — hôm nay nó chỉ tồn
      tại dưới dạng hai comment, một cái sai.

## 7. Mutation — mỗi chiều chạy HAI lần, kiểm chứng đã áp dụng, CHẠY NỀN

- [ ] 7.1 Quay lại `existsSync` → ca «lượt chết bị coi là còn sống» ĐỎ.
- [ ] 7.2 Lượt đời cũ coi là còn sống → ca 2.4 ĐỎ.
- [ ] 7.3 Bỏ đánh dấu `loi` (chỉ bỏ qua, không nối) → ca «trần và PR được giải phóng» ĐỎ.
- [ ] 7.4 Bỏ dòng sự kiện khi đánh dấu lỗi → ca 2.5 ĐỎ.
- [ ] 7.5 Bỏ phép xác minh trước khi kill → ca 3.3 ĐỎ. *(Gác thiệt hại NGOÀI phạm vi sản phẩm.)*
- [ ] 7.6 Bỏ ghi «ai huỷ» → ca 3.2 ĐỎ.
- [ ] 7.7 Route huỷ nhận cả lượt đã kết thúc → ca 3.1 ĐỎ.
- [ ] 7.8 Thông điệp cổng đọc phương thức từ sổ → ca 4.1 ĐỎ.
- [ ] 7.9 Dòng ứng viên quay lại chỉ in nhãn → ca 5.1 ĐỎ.
- [ ] 7.10 Đổi `spawn` sang ghi qua pipe → ca 6.1 ĐỎ.
- [ ] 7.11 Đột biến sống sót → bảng ba đường. Không im lặng khai bừa.
- [ ] 7.12 `git diff --stat packages/ apps/` **sạch** — cổng bắt buộc trước commit.

## 8. Kiểm tay — CHẠY THẬT (tầng 2; KHÔNG tick trước khi chạy)

- [ ] 8.1 Bật server → xác `wmtlc846uh8nk` (PR #7) **thành lỗi ngay ở lần khởi động đầu**, sổ có dòng lý do.
- [ ] 8.2 Chấm lại PR #7 → **không còn 409 `pr_dang_cham`**.
- [ ] 8.3 Chạy một lượt, bấm **Huỷ** → lượt thành lỗi, sổ ghi ai huỷ, tiến trình dừng.
- [ ] 8.4 Cấu hình về thuê bao, bấm Kiểm tra lại → thông điệp nói đúng phương thức, không đòi API key.
- [ ] 8.5 Một lượt doc → dòng ứng viên phân biệt được từng cái.

## 9. Kiểm cơ học

- [ ] 9.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 9.2 `npx openspec validate --changes` xanh.
- [ ] 9.3 Tầng 3: lưới có hàm quét `scan*` thì phải có cặp fixture; `test-grid-integrity` XANH.
- [ ] 9.4 Di trú: mở cơ sở dữ liệu cũ → cột mới thêm tự động, dữ liệu cũ nguyên vẹn.
