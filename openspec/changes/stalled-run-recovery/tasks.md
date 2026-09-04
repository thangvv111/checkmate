# Tasks — stalled-run-recovery

## 0. Tầng 2 của `test-grid-integrity` — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -c "'dang_chay'" apps/web/src/store/run-store.ts   # 3
grep -c "dang_chay"   apps/web/src/runs.ts              # 4
grep -c "dang_chay"   apps/web/src/ui.ts                # 3
grep -c "runningCount" apps/web/src/server.ts           # 4
grep -rc "isPrRunning" apps/web/src/*.ts store/*.ts     # 7 (gom dinh nghia + comment)
```

- [x] 0.1 Rà từng chỗ: chỗ nào **quyết định** theo «đang chạy» thì phải đúng sau khi lượt chết thành `loi`;
      chỗ nào chỉ **hiển thị** thì phải đúng theo trạng thái mới.
- [x] 0.2 **Dự đoán ĐÚNG**: `runningCount` và `isPrRunning` không phải sửa một dòng nào — đánh dấu `loi`
      là tự giải phóng. `ui.ts` chỉ thêm nút, không đổi cách đọc trạng thái. Chỗ đổi thật: `runs.ts`
      (`noiLaiLuotDangChay` phân đôi) và `store/` (cột + `appendEvent`).

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/stalled-run-recovery/spec.md` (5 requirement) — đã viết.
- [x] 1.2 Gỡ khẳng định sai ở `run-store.ts:183` (D7) — sau change chỉ còn MỘT khẳng định, và nó có ca.

## 2. Mục (1) — lượt chết thành lỗi ngay

- [x] 2.1 `store/db.ts`: thêm cột định danh tiến trình vào bảng `run` qua khuôn `napCotThieu`.
- [x] 2.2 `runs.ts` `batDau`: lưu pid ngay khi spawn.
- [x] 2.3 **Hàm thuần** quyết định «lượt này còn sống không» (pid + trạng thái → quyết định). Tách khỏi I/O
      để mỗi nhánh là một ca — khuôn đã dùng ở `session-gate`, `message-egress`.
- [x] 2.4 Lượt đời cũ (pid rỗng) → **đã chết** (D2), không suy đoán.
- [x] 2.5 `noiLaiLuotDangChay` phân đôi: pid sống → nối lại; pid chết → **đánh dấu `loi` NGAY** + ghi dòng
      sự kiện nói rõ nguyên nhân.
- [x] 2.6 KHÔNG dựng trạng thái trung gian, KHÔNG route «tiếp tục» (D3).

## 3. Mục (1b) — huỷ lượt đang chạy

- [x] 3.1 Route **huỷ**: từ chối nếu lượt không còn đang chạy.
- [x] 3.2 Huỷ → trạng thái lỗi + ghi sổ **ai** huỷ.
- [x] 3.3 Kill chỉ khi **xác minh được** dòng lệnh mang run id (D1). Không đọc được dòng lệnh ⇒ coi như
      không xác minh được ⇒ KHÔNG kill, và bề mặt nói rõ.
- [x] 3.4 `ui.ts`: nút Huỷ trên lượt đang chạy.
- [x] 3.5 Route huỷ phải sau cửa phiên, và **chế độ demo từ chối** — cùng hạng route sửa cấu hình.
- [x] 3.6 ⛔C5: khai 7 export mới — `decideRunLiveness` · `processAlive` · `mayKillRun` · `readCommandLine`
      · `killRunProcess` (runs.js) · `appendEvent` (run-store.js) · `describeCandidate` (skill-doc.js).
      `checkMessage` nằm ở `ui-provider.js` — module này KHÔNG có trong bảng, không thêm.

## 4. Mục (2) — thông điệp cổng nhà cung cấp

- [x] 4.1 Đường dựng thông điệp nói theo **phương thức đang cấu hình** (D4).
- [x] 4.2 Sổ kiểm mang phương thức khác cấu hình → nói «cần kiểm lại theo phương thức đang chọn».
- [x] 4.3 KHÔNG sửa/xoá `.ncc-verify.json` — dữ liệu lịch sử (D4).

## 5. Mục (3) — dòng ứng viên

- [x] 5.1 `skill-doc.ts:188`: dòng liệt kê mang **chỗ nhắm** của từng ứng viên.
- [x] 5.2 Dùng `quotes` đã có — không thêm lời gọi model nào.

## 6. Ca khoá GIẢ ĐỊNH NỀN (D6)

- [x] 6.1 Ca dựng lại khuôn `spawn` của `batDau` (`shell: true`, ghi ra **file**), giết tiến trình cha, và
      khẳng định tiến trình cháu **vẫn ghi tiếp**. Không cần lượt chấm thật.
- [x] 6.2 Ca này khoá điều mà cả `noiLaiLuotDangChay` lẫn `cleanupOrphanRuns` dựa vào — hôm nay nó chỉ tồn
      tại dưới dạng hai comment, một cái sai.

## 7. Mutation — mỗi chiều chạy HAI lần, kiểm chứng đã áp dụng, CHẠY NỀN

- [x] 7.1 Quay lại `existsSync` → ca «lượt chết bị coi là còn sống» ĐỎ.
- [x] 7.2 Lượt đời cũ coi là còn sống → ca 2.4 ĐỎ.
- [x] 7.3 Bỏ đánh dấu `loi` (chỉ bỏ qua, không nối) → ca «trần và PR được giải phóng» ĐỎ.
- [x] 7.4 Bỏ dòng sự kiện khi đánh dấu lỗi → ca 2.5 ĐỎ.
- [x] 7.5 Bỏ phép xác minh trước khi kill → **KHÔNG ca nào đỏ ở lượt đầu**. Đọc code: không có đường lui,
      và ca huỷ hiện có dùng lượt không có pid nên chưa chạm tới gác ⇒ vế ấy CHƯA được ca nào khoá.
      **Viết ca mới** (tiến trình vô can phải còn sống). Đo lại: ĐỎ. Xem D8.
- [x] 7.6 Bỏ ghi «ai huỷ» → ca 3.2 ĐỎ.
- [x] 7.7 Route huỷ nhận cả lượt đã kết thúc → ca 3.1 ĐỎ.
- [x] 7.8 Thông điệp cổng đọc phương thức từ sổ → ca 4.1 ĐỎ.
- [x] 7.9 Dòng ứng viên quay lại chỉ in nhãn → ca 5.1 ĐỎ.
- [x] 7.10 **KHÔNG chạy được như một đột biến sản phẩm**: ca 6.1 tự dựng cha/cháu bằng script riêng để
      đo hành vi hệ điều hành, nên «đổi spawn» sẽ là sửa CHÍNH CA chứ không sửa code sản phẩm. Ghi ra thay
      vì tick cho đủ — ca 6.1 vẫn load-bearing theo cách khác: nó đo thật, và nếu hệ điều hành đổi hành vi
      thì nó đỏ.
- [x] 7.11 Đột biến sống sót → bảng ba đường. Không im lặng khai bừa.
- [x] 7.12 Cổng D6 đã chạy: gác `if (!mayKillRun(...))` còn nguyên, không còn `if (false)` nào.
      Mutation chạy NỀN, log ra file — không để timeout cắt giữa chừng.

## 8. Kiểm tay — CHẠY THẬT (tầng 2; KHÔNG tick trước khi chạy)

- [x] 8.1 **ĐÃ CHẠY THẬT.** Log: «Đánh dấu lỗi 1 lượt có tiến trình đã chết: wmtlc846uh8nk». Cột `pid`
      được di trú tự động (không thao tác tay); xác chuyển `dang_chay` → `loi` kèm `ket_thuc`; sổ có dòng
      «Lượt chấm bị bỏ dở: không có dấu vết tiến trình…»; số hàng `dang_chay` còn lại = **0**.
- [x] 8.2 **PO chạy lại PR #7 thành công** (04/09). Lượt mới `wmtmola1z8vxj`: `xong`, 08:17:37 →
      08:22:12, và **pid 14928 được ghi thật** — cột mới hoạt động trên hệ thống thật, không chỉ trong lưới.
- [ ] 8.3 Chạy một lượt, bấm **Huỷ** → lượt thành lỗi, sổ ghi ai huỷ, tiến trình dừng.
- [x] 8.4 **PO bấm Kiểm tra lại thành công** (04/09). Sổ kiểm: `ok: true`, `phuong_thuc: thue_bao`,
      thông điệp «Gói thuê bao trả lời: “OK” (model claude-opus-5) — KHÔNG tiêu credit API». Đúng đường
      thuê bao, không đụng API key.
- [ ] 8.5 Một lượt doc → dòng ứng viên phân biệt được từng cái.

## 9. Kiểm cơ học

- [x] 9.1 `npx tsc --noEmit` sạch · `npm test` **59 file / 938 ca xanh** (915 + 23 ca mới).
- [x] 9.2 `npx openspec validate --changes` xanh.
- [x] 9.3 Tầng 3: lưới có hàm quét `scan*` thì phải có cặp fixture; `test-grid-integrity` XANH.
- [x] 9.4 Di trú chạy trên **cơ sở dữ liệu prod thật** lúc bật server: cột `pid` được thêm, mọi hàng cũ
      còn nguyên. Kiểm bằng `PRAGMA table_info(run)` trước và sau.
