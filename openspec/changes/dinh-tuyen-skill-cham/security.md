<!-- Ô ✅ trỏ file:line của cơ chế thật. Đánh dấu: ✅ OK / ⚠️ Cần xử / N/A. -->

## S1. Bí mật & rò rỉ

- N/A S1.1 Change chỉ đọc TÊN file trong diff, không chạm token/khoá/mật khẩu/giá trị cấu hình
- ✅ S1.2 Bề mặt công khai: `lyDo` định tuyến nêu tên file — tên file đi vào log lượt chấm. Tên file
  không phải bí mật, nhưng `lyDo` KHÔNG được nhét thêm nội dung file vào; chỉ tên đường dẫn
- N/A S1.3 Không có giá trị nào cần che

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính; định tuyến chạy trong lượt chấm, không phải hành động cổng
- N/A S2.2 Không route nào trả tài khoản/hash/muối

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường nào cho máy tự merge — change chỉ chọn skill, không chạm `mergePr`/`epBamCong`
- N/A S3.2 Không đụng vai `tu_dong` hay ba mức tự động

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 **Tên file trong diff là dữ liệu do maker viết** — đây là bề mặt tấn công thật của change
  này: kẻ muốn né probe sẽ đặt tên/đường dẫn sao cho PR có code bị xếp là doc. Vì vậy allowlist phải
  khớp CẤU TRÚC đường dẫn (`openspec/` là THƯ MỤC, không phải tiền tố chuỗi) và mặc định là code
  (T3.2 khoá ca này)
- N/A S4.2 Change không gọi model

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không làm code nào chạy ở chỗ mới
- N/A S5.2 Không tạo worktree/thư mục tạm

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không tạo file mới trên đĩa
- N/A S6.2 Không ghi file dùng chung

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Hướng lệch bắt buộc là **code khi không chắc** (R13, T1.6/T3.1/T3.2). Định tuyến nhầm sang
  doc = PR có code qua cổng mà không probe nào chạy = xanh giả — đúng thứ công cụ này sinh ra để chống
- N/A S7.2 Không đụng phép đếm probe hay phân loại hồi quy

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 Mục tiêu duy nhất kẻ xấu nhắm tới ở đây là **né probe**. Vector đã enumerate và khoá ca test:
  (a) đuôi file lạ · (b) giả dạng `openspec` bằng tiền tố chuỗi · (c) diff rỗng · (d) hoa/thường ở ĐUÔI
  · (e) **hoa/thường ở TÊN THƯ MỤC** (`OpenSpec/`) · (f) **dấu `\` trong tên file** · (g) **file trơ
  tên `openspec` ở gốc**.
  ⚠ GHI NHẬN TRUNG THỰC: bản đầu của mục này khai «cả bốn vector đều có ca test và đều mặc định về
  code» — **tuyên bố đó SAI**. Vòng chấm đầu tiên của cổng bắt đúng ba vector (e), (f), (g) mà bản
  hiện thực để lọt, và hai ca test khi đó còn MÃ HOÁ chính cái bug (khẳng định `\` được chuẩn hoá
  thành `/`). Bài học ghi vào luật R13.5, và ✅ ở đây chỉ được đánh sau khi ba ca mới đã đỏ-rồi-xanh.
- ✅ S8.2 Test load-bearing hai chiều — ĐÃ THỬ THẬT (github.ts:~250 `laVanBan`): tạm đổi allowlist
  thành `startsWith('openspec')` → `test/dinh-tuyen-skill.test.ts` ca «openspec là TIỀN TỐ» ĐỎ;
  phục hồi → xanh. Bản test ĐẦU TIÊN của ca này là test MỒ CÔI (xanh cả hai chiều) vì thiếu một
  file `.md` trong danh sách: không có `.md` thì R13.4 cũng trả 'code' nên nới allowlist vẫn xanh.
  Đã sửa thành `['docs.md', 'openspec-notes.js']` rồi thử lại mới đỏ đúng lúc cần.
- N/A S8.3 Không có role nào để soi đối xứng

## Notes

Rủi ro còn lại có ý thức: PR đổi nhiều `.md` thì skill doc chỉ chấm MỘT file (file nhiều dòng đổi
nhất). Không sinh ra từ change này nhưng sẽ gặp nhiều hơn vì nhiều PR đi đường doc hơn — ghi thành
quan sát, không xử ở đây.
