# Security — model-reply-parsing

Đây là capability của **rào giữa dữ liệu ngoài và prompt** — nơi ⛔C4 sống. Change là backfill, nên rủi ro
không phải «code mới sai» mà là **khai một hàng rào là đã có trong khi nó chưa được ai giữ**.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Không chạm bí mật. Change không đọc token, khoá API, hay tài khoản.
- ⚠️ S1.2 Thông điệp lỗi parse mang **trích đoạn trả lời của model**, và nó đi vào prompt lượt hai — tức ra
  một dịch vụ bên ngoài. Nếu trả lời của model chứa lại nội dung nhạy cảm từ diff, nó đi thêm một vòng.
  Nhưng model **đã** nhận diff ở lượt một, nên vòng hai không đến nơi mới — cùng lập luận «nguồn đối chiếu
  là thứ bề mặt đó đã có» của `error-message-egress-gate` D2b. Không phải chỗ hở mới, ghi để không ai tưởng
  chưa soi.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính, không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge. Change chỉ chạm phép bóc trả lời và ba ca test.

## S4. Dữ liệu không tin cậy & prompt injection (R7 / ⛔C4)

- ✅ S4.1 **Trục chính.** Rào nonce per-run (R3.8, R3.9, R3.10) đã có ca. Change thêm ca cho chỗ rào ấy dễ bị
  mở lại nhất.
- ⚠️ S4.2 **R3.16 là đường tiêm chỉ thị gián tiếp, và trước change không lưới nào giữ.** Chuỗi sự kiện:
  maker viết diff → diff vào prompt (đã rào) → model trả JSON → JSON hỏng → thông điệp lỗi mang **trích
  đoạn trả lời** → thông điệp ấy vào prompt lượt hai. Nếu vào **trần**, câu chữ của maker xuất hiện ở vị
  trí trông như lời hệ thống, ngoài mọi rào. Code đã rào đúng; change này khoá điều đó bằng ca kiểm **vị
  trí** của thông điệp, không chỉ sự có mặt.
- ✅ S4.3 Điểm tinh tế của ca T5.2: nó phải khoá **vị trí**, vì một ca kiểm sự có mặt vẫn xanh sau khi bỏ
  rào. Mutation T7.1 chứng minh: bỏ `rao(...)` thì T5.2 đỏ còn T5.1 vẫn xanh.
- ⚠️ S4.4 Rào là **quy ước với model**, không phải cơ chế cưỡng chế. Một model đủ dễ bảo vẫn có thể làm theo
  chỉ thị nằm trong mốc. Rào thu hẹp bề mặt và làm chỉ thị lộ ra khi đọc prompt; nó không đóng kín. Đó là lý
  do verdict vẫn được **máy** quyết theo bảng chân trị chứ không để model tự giác (`probe-classification`).

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 **R3.11 thuộc trục này.** Model chấm chạy không tool — có tool nghĩa là model đọc/ghi file thật
  trên máy chủ và chạy lệnh, tức nó bước ra ngoài sandbox của lượt chấm. Đã đo được ca thật: cờ tắt-hết
  không có tác dụng và model đi chạy `ls`.
- ⚠️ S5.2 Ca test khoá **hằng và lời gọi**, không khoá hành vi thật của CLI (D3). Cái mất: một bản CLI mới
  đổi tên cờ sẽ làm danh sách vô hiệu mà lưới vẫn xanh. Giảm nhẹ: khi một tên tool không còn tồn tại, CLI
  **bỏ chạy** chứ không âm thầm bật tool — nên hỏng kiểu ồn ào, phát hiện ngay ở lượt chấm đầu tiên.
- ✅ S5.3 `cwd` của tiến trình model là thư mục tạm — kể cả có tool cũng không có gì để đọc. Lớp phòng thủ
  thứ hai, change không đụng.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không đổi schema, không ghi file.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 R3.3 là fail-closed: nhắc lại **đúng một lần** rồi ném. Không lặp vô hạn để «cố cho ra kết quả» —
  một vòng lặp ở đây biến lỗi cấu hình thành hoá đơn model và một lượt chấm không bao giờ kết thúc.
- ✅ S7.2 Bóc thất bại thì NÉM, không trả về đối tượng rỗng. «Không parse được» không được biến thành
  «không có finding nào».

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **đưa được một chỉ thị của maker vào prompt ở vị trí ngoài rào**.

- ✅ S8.1 (a) giấu chỉ thị trong diff → đã rào (R3.8), có ca sẵn.
- ✅ S8.2 (b) **làm vỡ JSON để câu chữ của mình được chép vào lượt hai** → T5.2 + mutation T7.1. Đây là
  đường mà change này bịt.
- ✅ S8.3 (c) đoán mốc rào để tự đóng rào giữa chừng → nonce per-run (R3.9), có ca sẵn.
- ⚠️ S8.4 (d) khiến model dùng tool để đọc thứ ngoài prompt → danh sách tool cấm (R3.11), ca T6.x khoá phần
  tĩnh; phần hành vi thật của CLI thuộc S5.2.
- ⚠️ S8.5 (e) viết chỉ thị đủ thuyết phục để model làm theo dù nằm trong mốc → **đường này MỞ theo bản
  chất** (S4.4). Không đóng được bằng rào; thứ đóng nó là việc **máy** quyết verdict, không phải model.

## Notes

- Hai chỗ mở đã khai: S4.4/S8.5 (rào là quy ước, không phải cưỡng chế) và S5.2 (ca không chứng minh CLI thật
  chặn tool). Cả hai đều có lớp phòng thủ thứ hai, và cả hai đều được ghi trong requirement chứ không giấu.
- Tiêu chí «đủ ca» của change này: ca R3.16 phải khoá **vị trí** chứ không chỉ sự có mặt. Đó là khác biệt
  giữa một lưới giữ được hàng rào và một lưới chỉ trông như đang giữ.
