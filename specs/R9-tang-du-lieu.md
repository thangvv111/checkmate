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
- **R9.4b** — `PRAGMA recursive_triggers` là thiết lập **theo từng kết nối**, không lưu trong file cơ sở
  dữ liệu. Nghĩa là lưới chặn `INSERT OR REPLACE` của R9.4 chỉ có hiệu lực trên kết nối do `moDb()` mở.
  Ai mở thẳng file bằng `sqlite3` CLI hay một script khác vẫn ghi đè được, và trigger sẽ không kêu.
  Đo được trên máy chủ thật: cùng một câu REPLACE, đi qua `moDb()` thì bị chặn, mở kết nối riêng thì lọt.
  ⇒ Tính chỉ-ghi-thêm của sổ cái là **bất biến của ứng dụng**, KHÔNG phải bất biến của file. Bảo vệ ở
  tầng ngoài (quyền tệp, ai được chạm máy chủ) là phần không thể thay bằng code, và tài liệu vận hành
  PHẢI nói rõ điều đó thay vì để người đọc tưởng cơ sở dữ liệu tự khoá được chính nó.
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

## Cái gì KHÔNG vào cơ sở dữ liệu

- **R9.13** — Cấu hình (`config.json`) và kho khoá (`.secrets.json`) cố ý **ở lại dạng file**, không vào
  cơ sở dữ liệu, vì hai lý do: sửa file bằng tay là đường cứu hộ khi cấu hình sai làm giao diện không lên
  được; và bí mật nằm trong cơ sở dữ liệu thì **mọi bản sao lưu đều mang theo khoá**. Chúng vẫn phải đi
  qua một cửa duy nhất trong mã nguồn, không được đọc rải rác.
- **R9.14** — Cấu hình được cache theo thời điểm sửa file, và cache bị bỏ ngay khi ghi. Sửa file bằng tay
  vẫn phải có hiệu lực ở lượt đọc kế tiếp — cache không được che mất đường cứu hộ.
- **R9.15** — File probe trong thư viện ở lại trên đĩa vì chúng là mã nguồn phải chạy được; chỉ phần
  metadata vào bảng.

## API JSON

- **R9.16** — Các route `/api/*` chỉ đọc qua lớp kho và trả dữ liệu thuần: không dựng HTML, không chạm đĩa.
- **R9.17** — KHÔNG route nào được trả về khoá, token hay bí mật — kể cả dạng đã che. Route cấu hình chỉ
  trả trạng thái đủ để giao diện hiển thị (có token hay chưa), không trả giá trị.
- **R9.18** — Lọc và phân trang chạy dưới cơ sở dữ liệu, không nạp cả bảng lên rồi cắt. Số bản ghi mỗi
  trang phải có trần để một tham số truy vấn không kéo được cả bảng về.
