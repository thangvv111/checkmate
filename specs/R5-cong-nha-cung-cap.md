# R5 — Nhà cung cấp model và cổng kiểm bắt buộc

Hai khái niệm vốn hay bị gộp làm một, ở đây tách riêng:

- **Nhà cung cấp** (Anthropic, Google, OpenAI…) — ai chạy model.
- **Phương thức** (gói thuê bao / API) — tiền ra từ đâu.

Mỗi nhà cung cấp cấu hình độc lập, và chỉ nhà cung cấp đã **kiểm thành công** mới được chọn để chấm.

## Danh mục

- **R5.1** — Nhà cung cấp đã ngừng dịch vụ PHẢI mang cờ `ngung` và KHÔNG ĐƯỢC cho chọn; vẫn giữ trong
  danh mục để giải thích cho người dùng đang cấu hình dở.
- **R5.2** — Mọi nhà cung cấp còn hoạt động PHẢI khai ít nhất một model.
- **R5.3** — Nhà cung cấp hỗ trợ phương thức `api` PHẢI khai tên biến môi trường chứa khoá. Thiếu tên
  biến là khoá dán vào không bao giờ tới được tiến trình chấm.

## Cổng kiểm (verify gate)

- **R5.4** — Chọn một nhà cung cấp làm nơi chấm chỉ hợp lệ khi nhà cung cấp đó đã kiểm THÀNH CÔNG. Chọn
  khi chưa kiểm PHẢI bị từ chối, không được im lặng chấp nhận.
- **R5.5** — Kiểm còn hiệu lực nghĩa là đã kiểm OK **với đúng cấu hình hiện tại**. Đổi model hoặc đổi
  phương thức PHẢI làm mất hiệu lực và bắt kiểm lại — cái chạy được với model này chưa chắc chạy với
  model kia.
- **R5.6** — Phản hồi **rỗng** từ nhà cung cấp PHẢI bị coi là kiểm THẤT BẠI, kể cả khi HTTP trả 200.
  Xanh giả ở cổng kiểm là thứ nguy hiểm hơn đỏ thật.
- **R5.7** — Kiểm thất bại PHẢI nói rõ nguyên nhân (sai khoá, hết hạn mức, model không tồn tại, dịch vụ
  đã ngừng), không được gộp về một dòng chung chung.
- **R5.8** — Dán nhầm khoá của nhà cung cấp này vào ô của nhà cung cấp khác thì thông báo PHẢI đoán và
  nêu ra khả năng đó.

## Khoá

- **R5.9** — Thứ tự ưu tiên khi lấy khoá: biến môi trường của dịch vụ trước, khoá dán qua giao diện sau.
- **R5.10** — Khoá dán qua giao diện PHẢI tới được tiến trình con khi chấm; đọc mỗi `process.env` là
  không đủ.
- **R5.11** — Kho khoá trên đĩa PHẢI đặt quyền hạn chế (chmod 600 trên hệ hỗ trợ).
- **R5.12** — Phương thức gói thuê bao PHẢI chạy thật bằng gói: biến khoá API phải bị **gỡ khỏi môi
  trường** của tiến trình con, nếu không nó sẽ âm thầm tiêu credit API.

## Ghi nhận chi phí

- **R5.13** — Verdict PHẢI ghim chuỗi model dạng `<nhà cung cấp>/<tên model>` để tra ngược được lượt chấm
  đã chạy ở đâu.
- **R5.14** — Số token vào/ra PHẢI được ghi lại, và phải nêu rõ khi con số là **ước tính** chứ không phải
  số nhà cung cấp trả về.

## Model giới hạn theo phương thức

- **R5.15** — Danh mục nhà cung cấp được phép khai một model CHỈ dùng với một số phương thức (ví dụ:
  model chỉ có trong gói thuê bao, không mở cho đường API). Khi đã khai, MỌI cửa phải tôn trọng giới
  hạn đó: form lưu cấu hình, cổng kiểm nhà cung cấp, và giao diện chọn model. Chặn ở một cửa mà hở cửa
  khác thì giới hạn chỉ là lời dặn.
- **R5.16** — Cổng kiểm gặp tổ hợp model + phương thức nằm ngoài giới hạn PHẢI từ chối NGAY với lời nói
  rõ vì sao, không gọi model — gọi rồi để nhà cung cấp trả lỗi là bắt người dùng giải mã một thông điệp
  không nói đúng nguyên nhân.
- **R5.17** — Cửa đọc cấu hình KHÔNG ĐƯỢC tự thay tổ hợp cấm bằng một tổ hợp khác: tổ hợp thay chưa
  từng qua cổng kiểm, nên «rơi mềm» là mở đường lách chính cái cổng bắt buộc của R5. Giao của hai yêu
  cầu (tổ hợp cấm không được sống tới lượt chấm · không được tự thay) chỉ còn một đáp án: đường CHẤM
  từ chối chạy với lỗi nói rõ, còn đường HIỂN THỊ vẫn trả cấu hình nguyên vẹn để người dùng còn vào
  được màn Cấu hình mà sửa. Hai đường, hai hàm, không dùng lẫn.
