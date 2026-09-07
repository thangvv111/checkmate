# PRD — Phân hệ Phê duyệt hạn mức tín dụng

**Phiên bản:** 1.0 · **Ngày:** 09/2026 · **Người viết:** BA nghiệp vụ tín dụng · **Trạng thái:** Chờ duyệt

---

## 1. Mục tiêu & bối cảnh

Quy trình phê duyệt hạn mức tín dụng cho khách hàng cá nhân hiện xử lý thủ công qua email và bản cứng,
trung bình 2–3 ngày làm việc cho một hồ sơ, không có vết tra cứu tập trung. Phân hệ này số hoá toàn bộ
vòng đời một đề xuất hạn mức: **tạo đề xuất → phê duyệt theo thẩm quyền → giải ngân theo kỳ**, đảm bảo
nguyên tắc maker–checker (người tạo không tự phê duyệt) và để lại vết đầy đủ phục vụ kiểm soát nội bộ.

Phạm vi bản này: khách hàng cá nhân, hạn mức tối đa 5.000.000.000 đ. Ngoài phạm vi: khách hàng doanh
nghiệp, tái cấp hạn mức, tích hợp hệ thống thẻ.

## 2. Vai trò

| Vai | Mô tả |
|---|---|
| Chuyên viên tín dụng | Tạo đề xuất hạn mức; phê duyệt trong thẩm quyền |
| Trưởng phòng tín dụng | Phê duyệt trong thẩm quyền; xem toàn bộ hồ sơ của phòng |
| Giám đốc chi nhánh | Phê duyệt không giới hạn thẩm quyền; xem toàn bộ hồ sơ |

## 3. Yêu cầu chức năng

### 3.1. Tạo đề xuất hạn mức

Chuyên viên nhập: mã hồ sơ (định dạng `HM-<năm>-<số thứ tự 4 chữ số>`), tên khách hàng, số tiền đề nghị
(đồng, số nguyên dương), ghi chú (tuỳ chọn, tối đa 500 ký tự). Đề xuất mới vào trạng thái **Chờ duyệt**.

**Tiêu chí nghiệm thu:**
- Mã hồ sơ là duy nhất toàn hệ thống; nhập trùng, hệ thống từ chối và báo «Mã hồ sơ đã tồn tại» ngay trên form, dữ liệu không được ghi.
- Số tiền ≤ 0 hoặc sai định dạng mã hồ sơ: từ chối kèm thông báo lỗi cụ thể tại từng trường.
- Mọi lỗi nghiệp vụ hiển thị bằng thông báo tiếng Việt cho người dùng; hệ thống không được hiển thị lỗi kỹ thuật (mã lỗi cơ sở dữ liệu, stack trace) trong bất kỳ tình huống nhập liệu sai nào.
- Tạo thành công: hồ sơ xuất hiện trong danh sách với trạng thái Chờ duyệt, ghi nhận người tạo và thời điểm.

### 3.2. Phê duyệt đề xuất

Người có thẩm quyền mở hồ sơ ở trạng thái Chờ duyệt và thực hiện phê duyệt. Thẩm quyền theo vai:

| Vai | Hạn mức được phê duyệt |
|---|---|
| Chuyên viên tín dụng | ≤ 500.000.000 đ |
| Trưởng phòng tín dụng | ≤ 2.000.000.000 đ |
| Giám đốc chi nhánh | Không giới hạn (trong trần phạm vi 5 tỷ của phân hệ) |

**Tiêu chí nghiệm thu:**
- Người duyệt phải khác người tạo đề xuất; vi phạm → từ chối thao tác kèm thông báo «Người tạo đề xuất không được tự phê duyệt».
- Số tiền vượt thẩm quyền của người duyệt → từ chối thao tác kèm thông báo nêu rõ hạn mức thẩm quyền.
- Số tiền bằng ĐÚNG mức trần thẩm quyền được phê duyệt hợp lệ (biên đóng).
- Phê duyệt thành công: trạng thái chuyển **Chờ duyệt → Đã duyệt**, ghi nhận người duyệt và thời điểm.

### 3.3. Từ chối đề xuất

Người có thẩm quyền có thể từ chối một đề xuất đang Chờ duyệt. Khi từ chối, người duyệt nhập lý do
từ chối để chuyên viên nắm được nguyên nhân và trao đổi lại với khách hàng nếu cần. Đề xuất bị từ chối
chuyển sang trạng thái Từ chối. Thông tin lý do từ chối hiển thị trong chi tiết hồ sơ.

### 3.4. Giải ngân theo kỳ

Đề xuất Đã duyệt được lập lịch giải ngân chia từ 1 đến 12 kỳ.

**Tiêu chí nghiệm thu:**
- Tổng số tiền các kỳ phải bằng ĐÚNG số tiền đã phê duyệt (đơn vị đồng, không sai lệch); khi chia không hết, phần dư dồn về kỳ cuối.
- Chỉ giải ngân được đề xuất ở trạng thái Đã duyệt; thao tác trên hồ sơ không tồn tại → thông báo «Không tìm thấy đề xuất».
- Giải ngân xong toàn bộ kỳ: trạng thái chuyển **Đang giải ngân → Hoàn tất**.

## 4. Yêu cầu phi chức năng

| # | Yêu cầu |
|---|---|
| NFR-1 | Hệ thống phản hồi nhanh, giao diện thân thiện và dễ sử dụng với cán bộ tín dụng. |
| NFR-2 | Sẵn sàng 99,5% trong giờ làm việc (08h00–17h30 các ngày làm việc). |
| NFR-3 | Toàn bộ thao tác tạo/duyệt/từ chối/giải ngân được ghi log kèm người thực hiện và thời điểm; log lưu tối thiểu 12 tháng. |
| NFR-4 | Dữ liệu số tiền lưu và tính toán bằng số nguyên đơn vị đồng; không dùng số thực dấu phẩy động cho tiền. |

## 5. Ví dụ minh hoạ luồng chuẩn

Chị Lan (chuyên viên tín dụng) tiếp nhận nhu cầu của khách hàng Nguyễn Văn A và tạo hồ sơ
`HM-2026-0042` với số tiền đề nghị 1.000.000.000 đ. Sau khi kiểm tra chứng từ thu nhập, chị Lan
phê duyệt hồ sơ trong ngày và lập lịch giải ngân 3 kỳ. Khách hàng nhận kỳ giải ngân đầu tiên vào
ngày làm việc kế tiếp.

## Phụ lục A — Bảng trạng thái hồ sơ

| Trạng thái | Chuyển đến được | Ghi chú |
|---|---|---|
| Chờ duyệt (`cho_duyet`) | Đã duyệt · Từ chối | Trạng thái khởi tạo |
| Đã duyệt (`da_duyet`) | Đang giải ngân | |
| Đang giải ngân (`dang_giai_ngan`) | Hoàn tất | |
| Hoàn tất (`hoan_tat`) | — | Trạng thái đóng |
| Từ chối (`tu_choi`) | Mở lại (`mo_lai`) | |
| Mở lại (`mo_lai`) | Chờ duyệt | Sau khi chuyên viên bổ sung hồ sơ |

<!-- lượt chấm lại sau khi main có khối standards — kiểm nguồn repo (ô T4.5) -->
