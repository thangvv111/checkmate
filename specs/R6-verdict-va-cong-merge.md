# R6 — Verdict và cổng merge

Verdict (kết luận chấm) là thứ duy nhất mở được nút merge. Nó nhị phân, ghim vào một commit cụ thể, và
hết hiệu lực khi commit đổi.

## Tính chất của verdict

- **R6.1** — Kết quả chỉ có hai giá trị: `PASS` hoặc `FAIL`. Không có trạng thái thứ ba kiểu "PASS có
  điều kiện" — mập mờ ở đây là chỗ để lách.
- **R6.2** — Verdict PHẢI ghim `artifact_ref.sha_or_hash` — commit SHA với code, hash nội dung với tài liệu.
- **R6.3** — Có finding mức `high` thì kết quả PHẢI là `FAIL`.
- **R6.4** — Verdict PHẢI kèm `probe_stats` (thống kê probe) để người đọc biết `PASS` nói trên cơ sở nào:
  bao nhiêu probe được lên kế hoạch, bao nhiêu thực chạy, phân bố các trạng thái ở [R1](R1-phan-loai-probe.md).
- **R6.5** — Số probe **lên kế hoạch** và số **thực chạy** phải được nêu tách bạch. `PASS` với 0 probe chạy
  được không phải là `PASS` có giá trị, và người đọc phải thấy điều đó ngay trong verdict.

## Cổng merge

- **R6.6** — Verdict `FAIL`, hoặc còn finding `high`, thì nút merge PHẢI khoá. Không có đường vòng trên
  giao diện.
- **R6.7** — Finding mức `medium` chỉ được bỏ qua khi người dùng **tick xác nhận từng cái**. Máy chủ PHẢI
  đối chiếu tập id đã tick với tập finding medium thật của verdict, không tin danh sách client gửi lên.
- **R6.8** — Trước khi merge PHẢI hỏi lại GitHub trạng thái PR hiện tại. PR không còn mở thì từ chối.
- **R6.9** — PR đã có commit mới (`headSha` khác `headSha` lúc chấm) thì verdict cũ **hết hiệu lực**
  (stale): PHẢI từ chối merge và yêu cầu chấm lại. Đây là luật chống đẩy code mới lên sau khi đã lấy được
  PASS.
- **R6.10** — Chấm lại đúng một commit đã có verdict thì PHẢI cảnh báo trước rằng kết quả gần như chắc
  chắn lặp lại, để người dùng không đốt thời gian và token vô ích.
- **R6.11** — Mọi hành động qua cổng (merge / trả về dev) PHẢI ghi vào sổ cái kèm người thực hiện, thời
  điểm, và các finding medium đã được chấp nhận.
- **R6.12** — Chế độ demo KHÔNG ĐƯỢC cho thao tác cổng merge và KHÔNG ĐƯỢC cho sửa cấu hình.
