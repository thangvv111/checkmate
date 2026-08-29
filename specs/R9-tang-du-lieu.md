# R9 — Tầng dữ liệu: lớp kho và sổ cái chỉ-ghi-thêm

Dữ liệu của CheckMate sống trong một cơ sở dữ liệu SQLite duy nhất. Mọi thứ chạm tới nó phải đi qua
**lớp kho** (`apps/web/src/kho/`); không tầng nào khác được mở file hay chạy câu lệnh SQL.

## Lớp kho

- **R9.1** — Route, tầng dựng giao diện và harness KHÔNG được đọc/ghi đĩa hay gọi SQL trực tiếp. Mọi truy
  cập dữ liệu đi qua lớp kho. Đây là điều kiện để đổi được nền lưu trữ mà không phải sờ vào chỗ khác.
- **R9.2** — Lớp kho là nơi DUY NHẤT biết mình đang chạy trên SQLite. Kiểu dữ liệu nó trả ra là kiểu
  nghiệp vụ của ứng dụng, không phải hàng của cơ sở dữ liệu.
- **R9.3** — Mở cơ sở dữ liệu phải bật `foreign_keys` và dùng chế độ nhật ký `WAL`, vì nhiều lượt chấm
  chạy song song cùng ghi (xem [R8](R8-chay-song-song.md)).

## Sổ cái chỉ-ghi-thêm

Sổ cái verdict là bề mặt truy vết cho kiểm toán. Tính chỉ-ghi-thêm là **bất biến sản phẩm**, không phải
quy ước lập trình.

- **R9.4** — Bảng sổ cái chỉ nhận `INSERT`. `UPDATE` và `DELETE` lên bảng đó PHẢI bị **cơ sở dữ liệu** từ
  chối bằng trigger, không phải bằng kỷ luật của người viết code. Đây là điểm chặt hơn file JSONL trước
  đây: file thì mở trình soạn thảo lên là sửa được và không để lại dấu vết.
- **R9.5** — Một verdict chỉ vào sổ đúng một lần. Ghi lại cùng `run_id` PHẢI bị từ chối, không âm thầm
  ghi đè cũng không âm thầm bỏ qua.
- **R9.6** — Sổ hành động cổng (ai merge, ai trả về dev, chấp nhận cảnh báo nào) là một bảng riêng, cũng
  chỉ-ghi-thêm, và nối với sổ cái qua `run_id`.

## Di trú

- **R9.7** — Dữ liệu đang nằm trên đĩa (file run JSON, `verdict-ledger.jsonl`, `review-log.jsonl`,
  `config.json`) PHẢI được nạp vào cơ sở dữ liệu ở lần khởi động đầu tiên, một lần duy nhất, và được ghi
  nhận là đã di trú để lần sau không nạp lại.
- **R9.8** — Di trú KHÔNG được xoá file gốc. Chúng ở lại làm bản đối chứng cho tới khi có quyết định dọn.
- **R9.9** — Dòng hỏng trong file nguồn không được làm sập cả lượt di trú: bỏ qua dòng đó, đếm lại và báo
  ra số dòng bỏ qua. Im lặng nuốt dòng hỏng là mất dữ liệu mà không ai biết.

## Truy vấn

- **R9.10** — Lọc theo repo, verdict, skill, nhà cung cấp và tìm chữ (xem [R4](R4-lich-su-theo-repo.md))
  chạy bằng câu lệnh SQL, không nạp toàn bộ bảng lên bộ nhớ rồi lọc.
- **R9.11** — Các cột dùng để lọc và sắp xếp thường xuyên phải có index: thời điểm, repo, run id, tác giả.
- **R9.12** — Mọi giá trị do người dùng nhập vào câu truy vấn PHẢI đi qua tham số ràng buộc. Không ghép
  chuỗi SQL.
