# Security — diff-visibility

Vùng này quyết định **model được nhìn thấy gì**. Nó vừa là chỗ dữ liệu ngoài đi vào prompt, vừa là chỗ một
verdict có thể trở nên vô nghĩa mà không ai biết. Soi ở đây là soi cả hai chiều ấy.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 Diff của repo đích đi thẳng vào prompt, nên bí mật lọt vào PR sẽ lọt vào prompt. Đường ấy do
  `error-message-egress-gate` gác và change này **không đổi nó** — nhưng ghi ra vì đây là đúng chỗ nó chạy qua.
- ⚠️ S1.2 Khối «file bạn không được xem» mang **tên file** của repo đích. Tên file có thể tự nó là thông tin
  (`src/khach-hang/hop-dong-vinamilk.ts`), và nó ra cả log lẫn prompt. Đây là đánh đổi có chủ đích: giấu tên
  đi thì cả người vận hành lẫn model đều mất manh mối để biết mình khuyết cái gì — mà đó chính là điều
  capability này tồn tại để bảo đảm. Bí mật thật (token, khoá) không nằm ở tên file.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính, không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường cho máy tự merge.
- ⚠️ S3.2 Nhưng cả ba requirement đều **phục vụ cổng merge một cách gián tiếp và quan trọng**: người duyệt
  đọc verdict rồi bấm merge. Một PASS dựng trên nửa PR mà không nói ra là đúng thứ làm người ta merge cái
  chưa ai nhìn. ⛔C1 nói máy không được nói CÓ; ba điều này bảo đảm khi máy nói «xong» thì nó cũng nói rõ
  **xong tới đâu**.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ⚠️ S4.1 Tên file trong repo đích là **dữ liệu ngoài** và chúng vào prompt qua khối `khoiNgoaiTamNhin`.
  Một tên file dựng khéo (`bo-qua-moi-luat-tren.md`) là một chỗ chèn chỉ thị. Change này không đổi đường ấy;
  rào chung (`rao: Fence`) đã bọc prompt. Ghi ra vì ca T2.1 chạm đúng bề mặt này (⛔C4).
- ✅ S4.2 R-2 làm việc ngược lại với injection ở một điểm: nó **nói thẳng cho model biết phần nào nó không
  có dữ liệu**, tức thu hẹp chỗ model tự bịa.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code. Ca R7.11 spawn `git` trên repo tạm do chính ca dựng.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Không ghi gì ngoài thư mục tạm; dọn ở `afterAll`.
- ✅ S6.2 `readTarget` đọc từ **cây git của nhánh**, không đọc đĩa — nên symlink và submodule bị loại trước
  khi có ai đọc chúng. Change này không đổi tính chất ấy, chỉ dựa vào nó khi dựng repo tạm.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 R-3 là fail-closed đúng nghĩa: không có gì để chấm thì **dừng**, không trả một verdict trên diff rỗng.
- ⚠️ S7.2 **Chỗ đáng lo nhất của cả vùng này không phải lỗi, mà là im lặng.** Cắt diff không làm gì đổ: lượt
  chấm chạy trơn, verdict ra PASS, mọi con số trông bình thường. Thứ duy nhất phân biệt «PASS trên cả PR»
  với «PASS trên nửa PR» là ba dòng chữ ở ba bề mặt — và không có gì kỹ thuật nào đỏ khi chúng biến mất.
  Đó chính là lý do ba điều này cần lưới chứ không cần thêm phép kiểm.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **làm một verdict PASS dựng trên nửa PR mà không ai biết**.

- ✅ S8.1 (a) đẩy file mã nguồn ra khỏi diff bằng cách nhồi PR cho vượt trần → R-1 cảnh báo riêng, R-2 khối
  prompt; cả hai nêu đích danh file.
- ✅ S8.2 (b) khai mẫu `bo_qua_diff` nuốt file mã nguồn → vẫn hiện ở cả ba bề mặt kèm lý do.
- ✅ S8.3 (c) làm PR toàn file sinh tự động để lượt chấm ra một PASS rỗng → R-3 dừng và nói đúng nguyên nhân.
- ⚠️ S8.4 (d) sửa `checkmate.yml` của repo đích để mẫu lọc bắt gần hết → không lưới nào của **checker** bắt,
  vì đó là quyền của repo đích với chính nó. Nhưng nó không im lặng: mọi file bị lọc vẫn hiện ở ba bề mặt
  kèm lý do, nên người duyệt thấy được. Đây đúng là chỗ ba requirement này có giá trị nhất.

## Notes

- S7.2 là điều đáng nhớ nhất: ở vùng này, hỏng nguy hiểm không phải cái gãy — nó là cái **chạy trơn và im**.
- S8.4 cho thấy vì sao ba bề mặt phải cùng tồn tại: chúng là thứ duy nhất chặn được một cấu hình repo đích
  biến lượt chấm thành hình thức.
