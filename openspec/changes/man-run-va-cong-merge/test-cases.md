# Test cases — màn Run và cổng merge

## Hợp đồng dữ liệu — chỉ thêm, không sửa

- [ ] T1.1 [reproduce] Nạp fixture `Verdict` **đời cũ** (không có `vung_mu_diff` · `thu_vien` ·
      `khong_co_doi_chung` · `nguoi_chay`) → parse ra được, màn Run dựng được, các khối mới không hiện.
      *(Đây là ca canh lớp B: `Verdict` bị `JSON.stringify` nguyên khối xuống DB, và 29 bản ghi đang
      có đều thiếu mọi trường mới.)*
- [ ] T1.2 Vế đối chứng: verdict **có đủ** trường mới → cả bốn khối hiện đúng.
- [ ] T1.3 Trường mới đều tuỳ chọn — bỏ từng cái một, màn vẫn dựng không ném lỗi.

## Server-render

- [ ] T2.1 [reproduce] Lượt đã xong: **phản hồi đầu tiên** đã chứa verdict, danh sách finding và bảng
      số liệu. *(Trước fix: rỗng — nội dung chỉ tới sau khi luồng sự kiện chạy.)*
- [ ] T2.2 Không kịch bản: lượt đã xong vẫn hiện đủ nội dung, mọi liên kết đúng.
- [ ] T2.3 Lượt đang chạy vừa kết thúc → cổng merge hiện **tại chỗ**; không còn chuỗi «Tải lại trang
      để mở cổng Merge» ở bất kỳ đâu trong mã nguồn.
- [ ] T2.4 Hàm dựng finding và verdict là **một** — dùng ở cả đường server lẫn đường luồng, không có
      bản thứ hai ghép lại phía client.

## Trình diễn và ranh giới chỉ-đọc

- [ ] T3.1 [reproduce] **Đang trình diễn thì KHÔNG có đường nào tới hành động cổng.** *(Trước fix:
      `/runs/<id>?replay=1` bày nút Merge thật và bấm là merge thật.)*
- [ ] T3.2 Máy chủ không còn nhánh `timed`/`speed` — chỉ một đường phát sự kiện.
- [ ] T3.3 Đổi tốc độ giữa chừng không tải lại trang và không mất vị trí đang xem.
- [ ] T3.4 Thoát trình diễn → cổng hoạt động lại bình thường.
- [ ] T3.5 Tắt kịch bản → màn Run của lượt đã xong vẫn đủ nội dung và đủ chức năng mặc định.

## Bền dòng sự kiện

- [ ] T4.1 Sự kiện được ghi xuống `runs/<id>/events.jsonl` **ngay khi sinh ra**, không phải lúc lượt
      chấm kết thúc.
- [ ] T4.2 [reproduce] Giết tiến trình web giữa lượt chấm rồi khởi động lại → sự kiện đã sinh vẫn
      đọc được, màn dựng lại đúng tới thời điểm đó. *(Trước fix: mất sạch — sự kiện chỉ nằm trong RAM.)*
- [ ] T4.3 Dựng lại bảng `run_su_kien` từ file cho ra đúng dòng sự kiện — chứng minh «file là nguồn».
- [ ] T4.4 [reproduce] Đứt kết nối rồi nối lại → **không** finding hay dòng log nào lặp. *(Trước fix:
      máy chủ đổ lại toàn bộ từ đầu, giao diện nối thêm, mọi thứ hiện hai lần.)*
- [ ] T4.5 Lượt mồ côi thật (tiến trình con đã chết) → đánh dấu hỏng, có lý do, không chiếm trần chạy
      song song.
- [ ] T4.6 Lượt còn tiến trình sống sau khi web khởi động lại → **không** bị đánh dấu mồ côi.

## Màn Run nói thật về chính nó

- [ ] T5.1 Vùng xám probe hiện đủ **bốn** số (nghi vấn · bỏ qua · thất lạc · nghi lỗi có sẵn), kể cả
      khi bằng không — im lặng và số không là hai điều khác nhau.
- [ ] T5.2 Vùng mù: file **mã nguồn** vượt trần → CÓ banner.
- [ ] T5.3 **Vế đối chứng**: chỉ lockfile / kết quả build bị loại → **KHÔNG** banner, nhưng vẫn có
      dòng log. Thiếu ca này thì banner nổi lên ở mọi PR có lockfile và người ta học cách bỏ qua nó.
- [ ] T5.4 Không có đối chứng → banner đứng **trước** phần chạy probe, không phải chú thích cuối.
- [ ] T5.5 Thư viện: `⊘ không nạp vào` và `✕ gỡ khỏi thư viện` phân biệt được ở mức dấu hiệu, không
      chỉ ở lời văn.
- [ ] T5.6 Thư viện không đổi → khối không hiện.
- [ ] T5.7 Card KHÔNG RA VERDICT khác hẳn card PASS/FAIL và kèm đủ số probe.

## Cổng merge

- [ ] T6.1 [reproduce] **Verdict stale** (head PR khác SHA verdict ghim) → trang nói ra và cổng khoá
      TRƯỚC khi người dùng bấm. *(Trước fix: thấy PASS to, nút Merge sáng, chỉ nhận 409 sau khi bấm.)*
- [ ] T6.2 FAIL → Merge vô hiệu, **Trả về dev vẫn hoạt động**.
- [ ] T6.3 PASS + medium → Merge chỉ sáng khi tick đủ; hint mono đếm đúng số còn thiếu.
- [ ] T6.4 [reproduce] Ghi chú trả về dev **trống** → không thực hiện được, nói rõ là bắt buộc.
      *(Trước fix: ô ghi chú ghi «tuỳ chọn» và trả về được với lý do rỗng.)*
- [ ] T6.5 Lượt không gắn PR → nói thẳng «không có cổng merge», không bỏ trống chỗ đó.
- [ ] T6.6 Người chạy hiện trong bảng meta; lượt do chế độ trực khai là lượt máy chạy, không gán tên
      một người nào.

## Trục nhạy cảm

- [ ] T7.1 Tiêu cực: **đổi giao diện KHÔNG nới đường quyết định cổng** — chạy lại bộ ca phân loại và
      bộ ca cổng, không được xanh nhờ sửa kỳ vọng. Ba lớp ghim SHA ở đường ghi phải còn nguyên.
- [ ] T7.2 Tiêu cực: không rò bí mật qua bề mặt mới — dòng sự kiện ghi ra đĩa, tên người chạy và bảng
      meta đều không mang token hay khoá.
- [ ] T7.3 Tiêu cực: nội dung ngoài (tiêu đề PR, tên nhánh, tên file trong vùng mù, lời văn finding
      do model viết) đều qua escape trước khi vào HTML.

## Chạy

`npx tsc --noEmit` + `npm test` toàn bộ. Rồi **chạy thật một lượt** trên gốc dữ liệu riêng và làm ba
việc mà không test đơn vị nào thay được: mở màn Run lúc **đang chạy**; **giết tiến trình web giữa
chừng rồi khởi động lại**; và thử mọi đường tới hành động cổng khi **đang trình diễn**.
