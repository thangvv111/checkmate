# Test cases — stalled-run-recovery

Requirement: R-1 «lượt còn sống phân biệt bằng TIẾN TRÌNH» · R-2 «lượt chết thành LỖI ngay» ·
R-3 «huỷ lượt đang chạy, không kill mù» · R-4 «thông điệp cổng nói đúng phương thức» ·
R-5 «danh sách ứng viên phân biệt được».

## R-1 nhận diện lượt còn sống

- [ ] T1.1 Tiến trình chấm còn sống thì lượt được nối lại, vẫn tính là đang chạy.
- [ ] T1.2 Tiến trình chấm đã chết thì lượt thành **lỗi**.
      *Ca load-bearing: hôm nay phép kiểm là `existsSync(sổ)`, mà sổ tồn tại mãi sau khi tiến trình chết.*
- [ ] T1.3 Lượt đời cũ (không có định danh tiến trình) thì coi là **đã chết** (D2), không suy đoán.
- [ ] T1.4 Quyết định nằm ở **hàm thuần** — mỗi nhánh một ca, không cần dựng tiến trình thật.

## R-2 lượt chết thành lỗi ngay, và tự giải phóng

- [ ] T2.1 Khởi động thấy lượt chết thì trạng thái thành `loi` và sổ có dòng nói nguyên nhân.
- [ ] T2.2 Sau đó `runningCount()` KHÔNG đếm nó và `isPrRunning()` KHÔNG trả true vì nó.
      *Đây là vế giải phóng pull request — vế mà nếu thiếu thì bản vá vô nghĩa.*
      *Dự đoán TRƯỚC (tasks 0.2): hai hàm này KHÔNG phải sửa, vì chúng đã lọc theo `dang_chay`.*
- [ ] T2.3 KHÔNG có trạng thái trung gian nào — chỉ `dang_chay`, `xong`, `loi` (D3).

## R-3 huỷ lượt đang chạy

- [ ] T3.1 Huỷ lượt đang chạy thì trạng thái thành lỗi VÀ sổ ghi **ai** huỷ.
- [ ] T3.2 Huỷ lượt đã kết thúc thì bị từ chối.
- [ ] T3.3 Huỷ khi **không xác minh được** tiến trình thì KHÔNG kill tiến trình nào, và bề mặt nói rõ.
      *Ca load-bearing nặng nhất của change: gác một thiệt hại NGOÀI phạm vi sản phẩm — giết nhầm tiến
      trình vô can của người dùng, vì pid bị hệ điều hành tái dùng.*
- [ ] T3.4 Chế độ demo thì route huỷ từ chối.

## R-4 thông điệp cổng

- [ ] T4.1 Cấu hình thuê bao + sổ kiểm mang phương thức `api` thì thông điệp nói **cần kiểm lại theo phương
      thức đang chọn**, KHÔNG đòi API key.
      *Ca đối chứng của chính bệnh PO gặp: thông điệp cũ đẩy người đọc đi tìm khoá cho chế độ không dùng khoá.*
- [ ] T4.2 Cấu hình API + thật sự thiếu khoá thì thông điệp nói thiếu khoá.
      *Vế ngược: sửa quá tay thành «không bao giờ nhắc API key» là hỏng theo chiều khác.*

## R-5 dòng ứng viên

- [ ] T5.1 Hai ứng viên cùng nhãn rubric, nhắm hai chỗ khác nhau thì dòng liệt kê cho thấy hai chỗ ấy.
- [ ] T5.2 Không thêm lời gọi model nào — dùng `quotes` đã có.

## Giả định nền (D6) — chưa từng có ca

- [ ] T6.1 Dựng lại khuôn `spawn` của `batDau` (`shell: true`, ghi ra **file**), giết tiến trình cha, thì
      tiến trình cháu **vẫn ghi tiếp**.
      *Đo được 04/09: 5 dòng trước khi giết, 13 sau 4 giây, rồi 40 — chạy trọn vẹn tới hết. Đây là giả định
      nền của CẢ `noiLaiLuotDangChay` LẪN `cleanupOrphanRuns`, mà hôm nay nó chỉ tồn tại dưới dạng hai
      comment, một cái sai (D7).*

## Mutation (load-bearing) — mỗi chiều chạy HAI lần, CHẠY NỀN

- [ ] T7.1 Quay lại `existsSync` thì T1.2 ĐỎ.
- [ ] T7.2 Lượt đời cũ coi là còn sống thì T1.3 ĐỎ.
- [ ] T7.3 Bỏ đánh dấu `loi` thì T2.1 và T2.2 ĐỎ.
- [ ] T7.4 Bỏ dòng sự kiện khi đánh dấu lỗi thì T2.1 ĐỎ.
- [ ] T7.5 Bỏ phép xác minh trước khi kill thì T3.3 ĐỎ.
- [ ] T7.6 Bỏ ghi «ai huỷ» thì T3.1 ĐỎ.
- [ ] T7.7 Route huỷ nhận cả lượt đã kết thúc thì T3.2 ĐỎ.
- [ ] T7.8 Thông điệp đọc phương thức từ sổ thì T4.1 ĐỎ.
- [ ] T7.9 Dòng ứng viên chỉ in nhãn thì T5.1 ĐỎ.
- [ ] T7.10 Đổi `spawn` sang ghi qua pipe thì T6.1 ĐỎ.
- [ ] T7.11 Đột biến sống sót thì đi theo bảng ba đường; `git diff` sạch trước commit.

## Trục nhạy cảm

- [ ] T_bimat — thông điệp cổng KHÔNG được vọng giá trị khoá ra ngoài (⛔C3); chỉ nói phương thức và trạng thái.
- [ ] T_failclosed — lượt chết không im lặng biến mất: đánh dấu lỗi phải ghi sổ lý do, huỷ phải ghi ai làm (⛔C2).
- [ ] T_cong — KHÔNG đổi luật cổng merge; lượt chết thành lỗi không đồng nghĩa gì đó có hiệu lực ở cổng.
- [N/A] T_khongtincay — không đổi đường dữ liệu ngoài vào prompt.
- [ ] T_hopdong — export mới khai bảng module `checkmate.yml` (⛔C5).
- [ ] T_prod — cột mới thêm qua khuôn di trú; `web-runs/checkmate.db` không bị dựng lại.

## Kiểm tay — CHẠY THẬT (tầng 2; KHÔNG tick trước khi chạy)

- [ ] T8.1 Xác `wmtlc846uh8nk` (PR #7) **thành lỗi ngay** ở lần khởi động đầu sau bản vá, sổ có dòng lý do.
- [ ] T8.2 Chấm lại PR #7 thì không còn 409 `pr_dang_cham`.
- [ ] T8.3 Chạy một lượt rồi bấm Huỷ: lỗi, sổ ghi ai huỷ, tiến trình dừng.
- [ ] T8.4 Cổng nhà cung cấp ở chế độ thuê bao: thông điệp đúng.
- [ ] T8.5 Một lượt doc: dòng ứng viên phân biệt được.
