# Test cases — stalled-run-recovery

Requirement: R-1 «lượt còn sống phân biệt bằng TIẾN TRÌNH» · R-2 «lượt kẹt có đường thoát: tiếp tục / huỷ» ·
R-3 «thông điệp cổng nói đúng phương thức» · R-4 «danh sách ứng viên phân biệt được».

## R-1 nhận diện lượt còn sống

- [ ] T1.1 Tiến trình chấm còn sống → lượt được nối lại, vẫn tính là đang chạy.
- [ ] T1.2 Tiến trình chấm đã chết → lượt thành **kẹt**.
      *Ca load-bearing: hôm nay phép kiểm là `existsSync(sổ)`, mà sổ tồn tại mãi sau khi tiến trình chết.*
- [ ] T1.3 Lượt đời cũ (không có định danh tiến trình) → **kẹt**, không suy đoán là còn sống (D2).
- [ ] T1.4 Quyết định nằm ở **hàm thuần** — mỗi nhánh một ca, không cần dựng tiến trình thật.

## R-1b lượt kẹt không còn khoá gì

- [ ] T1.5 `runningCount()` KHÔNG đếm lượt kẹt.
- [ ] T1.6 `isPrRunning()` KHÔNG trả true vì một lượt kẹt.
      *Đây là vế giải phóng pull request — vế mà nếu thiếu thì bản vá vô nghĩa.*

## R-2 đường thoát

- [ ] T2.1 Tiếp tục khi còn chỗ → chạy lại.
- [ ] T2.2 Tiếp tục khi chạm trần → từ chối kèm lý do `qua_tai`.
- [ ] T2.3 Tiếp tục khi pull request đang được chấm → từ chối kèm lý do `pr_dang_cham`.
      *T2.2 và T2.3 phải đi qua ĐÚNG `evaluateStartRun`, không viết lại điều kiện (D4 — khuôn «cửa song
      sinh» đã bị bắt chín lần).*
- [ ] T2.4 Huỷ → trạng thái lỗi VÀ sổ sự kiện có dòng nói rõ người vận hành huỷ.
- [ ] T2.5 Huỷ khi **không xác minh được** tiến trình → KHÔNG kill tiến trình nào, bề mặt nói rõ.
      *Ca load-bearing nặng nhất của change: gác một thiệt hại NGOÀI phạm vi sản phẩm — giết nhầm tiến
      trình vô can của người dùng vì pid bị hệ điều hành tái dùng.*

## R-3 thông điệp cổng

- [ ] T3.1 Cấu hình thuê bao + sổ kiểm mang phương thức `api` → thông điệp nói **cần kiểm lại theo phương
      thức đang chọn**, KHÔNG đòi API key.
      *Ca đối chứng của chính bệnh PO gặp: thông điệp cũ đẩy người đọc đi tìm khoá cho chế độ không dùng khoá.*
- [ ] T3.2 Cấu hình API + thật sự thiếu khoá → thông điệp nói thiếu khoá.
      *Vế ngược: sửa quá tay thành «không bao giờ nhắc API key» là hỏng theo chiều khác.*

## R-4 dòng ứng viên

- [ ] T4.1 Hai ứng viên cùng nhãn rubric, nhắm hai chỗ khác nhau → dòng liệt kê cho thấy hai chỗ ấy.
- [ ] T4.2 Không thêm lời gọi model nào — dùng `quotes` đã có.

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [ ] T5.1 Quay lại `existsSync` → T1.2 ĐỎ.
- [ ] T5.2 Lượt đời cũ coi là còn sống → T1.3 ĐỎ.
- [ ] T5.3 `runningCount` đếm cả lượt kẹt → T1.5 ĐỎ.
- [ ] T5.4 Route tiếp tục bỏ qua `evaluateStartRun` → T2.2/T2.3 ĐỎ.
- [ ] T5.5 Bỏ phép xác minh trước khi kill → T2.5 ĐỎ.
- [ ] T5.6 Bỏ dòng sự kiện khi huỷ → T2.4 ĐỎ.
- [ ] T5.7 Thông điệp đọc phương thức từ sổ → T3.1 ĐỎ.
- [ ] T5.8 Dòng ứng viên chỉ in nhãn → T4.1 ĐỎ.
- [ ] T5.9 Đột biến sống sót → bảng ba đường; chạy NỀN + `git diff` sạch trước commit.

## Trục nhạy cảm

- [ ] T_bimat — thông điệp cổng KHÔNG được vọng giá trị khoá ra ngoài (⛔C3); chỉ nói phương thức và trạng thái.
- [ ] T_failclosed — lượt kẹt không im lặng biến mất: huỷ phải ghi sổ; tiếp tục phải qua cửa điều kiện (⛔C2).
- [ ] T_cong — KHÔNG đổi luật cổng merge; lượt kẹt được giải phóng không đồng nghĩa verdict cũ có hiệu lực.
- [N/A] T_khongtincay — không đổi đường dữ liệu ngoài vào prompt.
- [ ] T_hopdong — export mới khai bảng module `checkmate.yml` (⛔C5).
- [ ] T_prod — cột mới thêm qua khuôn di trú; `web-runs/checkmate.db` không bị dựng lại.

## Kiểm tay — CHẠY THẬT (tầng 2; KHÔNG tick trước khi chạy)

- [ ] T6.1 Xác `wmtlc846uh8nk` (PR #7) được giải phóng ở lần khởi động đầu sau bản vá.
- [ ] T6.2 Bấm Huỷ → lỗi + dòng sổ.
- [ ] T6.3 Chấm lại PR #7 → không còn 409.
- [ ] T6.4 Cổng nhà cung cấp ở chế độ thuê bao → thông điệp đúng.
- [ ] T6.5 Một lượt doc → dòng ứng viên phân biệt được.
