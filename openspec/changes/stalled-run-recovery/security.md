# Security — stalled-run-recovery

Change này thêm một thứ chưa từng có trong sản phẩm: **một nút trên giao diện web kết thúc được một tiến
trình hệ điều hành**. Đó là bề mặt nguy hiểm nhất mà repo này từng mở, và phần lớn mục security dưới đây
xoay quanh nó.

## S0. Bề mặt mới: web → kill tiến trình

Trước change này, không đường nào từ HTTP tới `kill`. Sau change, có. Ba rào phải cùng đứng:

1. **Xác minh trước khi kill** (D1) — chỉ kết thúc tiến trình khi kiểm được **dòng lệnh của nó mang chính
   run id**. Không đọc được dòng lệnh thì coi như không xác minh được, và KHÔNG kill.
2. **Chỉ lượt của chính CheckMate** — pid lấy từ hàng `run` do chính engine ghi lúc `batDau`, không nhận pid
   từ người dùng qua tham số.
3. **Chế độ demo không được thao tác** — cùng hạng với các route sửa cấu hình.

Bỏ rào nào cũng đủ để biến một nút giao diện thành công cụ giết tiến trình tuỳ ý trên máy chủ.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 Thông điệp cổng nhà cung cấp (mục 2) nói về **phương thức** và **trạng thái kiểm**, MUST NOT vọng
  giá trị khoá hay bản che của nó (⛔C3). Sổ `.ncc-verify.json` đã lưu bản che cho giá trị ngoài danh mục —
  đường dựng thông điệp mới không được đi vòng qua đó để lấy giá trị thô.
- ✅ S1.2 Dòng ứng viên (mục 3) mang vị trí và trích dẫn **của tài liệu đang chấm** — dữ liệu đã đi vào
  prompt rồi, không mở bề mặt mới.

## S2. Danh tính, phiên, vai (R11)

- ⚠️ S2.1 Route **huỷ** là route **hành động**, phải nằm sau cùng cửa phiên như mọi route hành động khác,
  và **chế độ demo phải từ chối** — cùng hạng với route sửa cấu hình. Route đọc chỉ hiện nút; quyền thực thi
  nằm ở route.
- ⚠️ S2.2 «Huỷ» là hành động phá huỷ (kết thúc một lượt đang có). Nó phải ghi **ai bấm** vào sổ sự kiện —
  cùng lý do R11.16 đóng băng tên tác giả vào hàng sổ cổng: một hành động không biết ai làm là một hành
  động không đối chất được.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường cho máy tự merge.
- ⚠️ S3.2 Lượt chết thành lỗi **không** làm gì đó có hiệu lực ở cổng — nó là lượt **chưa có verdict** và sẽ
  không bao giờ có. Đánh dấu lỗi nghĩa là cho phép chấm lại bằng một lượt MỚI, không phải công nhận nửa kết
  quả của lượt cũ.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Không đổi đường dữ liệu ngoài vào prompt.
- ⚠️ S4.2 Phép **xác minh dòng lệnh** (D1) đọc dòng lệnh của một tiến trình hệ điều hành — đó là dữ liệu
  ngoài. Nó chỉ được dùng để **so khớp** (dòng lệnh có chứa run id không), MUST NOT được đưa vào bất kỳ
  lệnh nào chạy tiếp (⛔C4).

## S5. Sandbox & thực thi (R8)

- ⚠️ S5.1 Kill một lượt để lại **worktree sandbox** và có thể để lại **khoá thư viện probe**. Khoá đã có
  đường tự phục hồi (ngưỡng quá hạn — `probe-library` R8.7); worktree thì không, nên nó là rác tích luỹ.
  Change này không dọn worktree — ghi ra để không ai tưởng là đã dọn.
- ✅ S5.2 Không chạy code mới của repo đích.

## S6. Tầng dữ liệu & quyền file (R9)

- ⚠️ S6.1 **Đổi hình dạng dữ liệu**: thêm cột vào bảng `run` của `web-runs/checkmate.db` — dữ liệu prod.
  Dùng đúng khuôn `napCotThieu` (`ALTER TABLE … ADD COLUMN`), KHÔNG dựng lại bảng. Đường lùi an toàn: bản
  cũ không đọc cột mới nên revert không hỏng dữ liệu.
- ✅ S6.2 Không sửa `.ncc-verify.json` (D5) — nó là dữ liệu lịch sử.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Lượt đời cũ không có pid → coi là **đã chết** (D2). Hướng sai không đối xứng: đoán nhầm «chết» mất
  một lượt phải chấm lại; đoán nhầm «còn sống» khoá một pull request mà không ai gỡ được.
- ✅ S7.2 Chạy lại là một lượt MỚI trọn vẹn (D3) — không có verdict «nửa vời trông như đủ».
- ⚠️ S7.3 **Chỗ nguy hiểm nhất về mặt logic**: nếu phép nhận diện sai theo chiều **coi lượt đang chạy là đã
  chết**, engine đánh dấu lỗi một lượt đang chạy đúng — mất token và mất việc, và tiến trình vẫn chạy tiếp,
  ghi vào một lượt đã mang trạng thái lỗi. Đó là lý do phép nhận diện phải là **hàm thuần có ca cho từng
  nhánh**, không phải một biểu thức inline (D6 khoá luôn giả định nền của nó).

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **dùng nút mới để làm hại máy chủ**.

- ✅ S8.1 (a) gọi route huỷ với id lượt không tồn tại → không có pid, không kill gì.
- ✅ S8.2 (b) gọi route huỷ với id của lượt ĐÃ xong → lượt không còn đang chạy, từ chối.
- ✅ S8.3 (c) sửa tay cột pid trong cơ sở dữ liệu thành pid tiến trình hệ thống → **xác minh dòng lệnh chặn**
  (dòng lệnh không mang run id). Đây chính là ca mà rào 1 tồn tại để chống.
- ⚠️ S8.4 (d) người có quyền ghi đĩa máy chủ sửa cả pid lẫn dòng lệnh → không lưới nào chặn. Cùng hạng với
  `R11.19`: ai ghi được đĩa máy chủ đã ở trong vòng tin cậy. Ghi ra để không ai nhầm là đã bịt.
- ⚠️ S8.5 (e) gọi route liên tục để kill lặp → không có tác hại tích luỹ (lượt đã lỗi thì từ chối), nhưng
  đây là chỗ đáng nhìn lại nếu sau này thêm hành động phá huỷ khác.

## Notes

- S0 là điều đáng nhớ nhất: change này mở **đường từ HTTP tới `kill`**, và ba rào ở đó không phải phòng xa —
  bỏ một cái là đủ để một nút giao diện giết được tiến trình tuỳ ý.
- S5.1 là chỗ hở CÓ Ý THỨC: kill để lại worktree, và change này không dọn.
