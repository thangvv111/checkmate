# Test cases — identity-session

Requirement: R-1 «Danh tính đến từ phiên, qua đúng một cửa, không có mặc định» · R-2 «Không phiên hợp lệ thì
chặn tất cả» · R-3 «Tài khoản sống trong CSDL, tên ép khuôn tại nguồn, quản trị bằng lệnh» · R-4 «Mật khẩu
băm chậm có muối, thông điệp sai không phân biệt» · R-5 «Phiên: token hash, có hạn, chết thật» · R-6 «Cookie
HttpOnly/SameSite/Secure» · R-7 «Không bề mặt nào phát danh sách tài khoản» · R-8 «Vai tách theo việc, người
bấm trùng tác giả bị nêu tên».

**14 điều đã có ca** trong `test/danh-tinh.test.ts` (22 ca), `so-cong.test.ts`, `doi-soat-cong.test.ts` —
bảng dưới đối chiếu, không lặp lại. Ca MỚI nằm ở R-2, R-6, R-7 và mục R11.4 · R11.8.

## Đối chiếu: scenario ↔ ca đã có

### R-1 danh tính, không mặc định
- [ ] T1.1 «không cookie thì NÉM LỖI, không trả về một cái tên nào» ✓ có (R11.3).
- [ ] T1.2 «cookie rác thì ném lỗi, không dựng ra danh tính» ✓ có.
- [ ] T1.3 «đọc đúng cookie phiên giữa nhiều cookie khác» ✓ có.
- [ ] T1.4 «phiên hợp lệ đọc ra đúng người và đúng vai» ✓ có.

### R-3 tài khoản
- [ ] T3.1 «nhận tên sạch» / «từ chối thứ có thể phá HTML hoặc markdown của comment PR» ✓ có (R11.9).
- [ ] T3.2 «tạo tài khoản với tên xấu thì ném lỗi, không lặng lẽ chuẩn hoá» ✓ có.

### R-4 mật khẩu
- [ ] T4.1 «đúng mật khẩu thì ra danh tính, sai thì null» ✓ có.
- [ ] T4.2 «không có tài khoản cũng trả null y như sai mật khẩu» ✓ có (R11.10).
- [ ] T4.3 «mật khẩu KHÔNG nằm ở dạng đọc được trong cơ sở dữ liệu» ✓ có (⛔C3).
- [ ] T4.4 «mật khẩu ngắn bị từ chối — đây là tài khoản mở được cổng merge» ✓ có.

### R-5 phiên
- [ ] T5.1 «cơ sở dữ liệu chỉ giữ HASH của token» ✓ có (R11.11).
- [ ] T5.2 «đăng xuất xoá phiên ở PHÍA MÁY CHỦ» ✓ có (R11.13).
- [ ] T5.3 «phiên hết hạn bị từ chối và bị dọn luôn» ✓ có (R11.12).
- [ ] T5.4 «gỡ tài khoản huỷ mọi phiên đang sống của nó» ✓ có (R11.21).
- [ ] T5.5 «đổi mật khẩu cũng giết phiên cũ» ✓ có.

### R-8 vai
- [ ] T8.1 «chỉ vai duyet_cong mới bấm được cổng» ✓ có (R11.18).
- [ ] T8.2 «tài khoản tự động bị chặn ở TẦNG VAI, không phải bằng kỷ luật» ✓ có.
- [ ] T8.3 «vai tu_dong chạy chấm được nhưng KHÔNG sửa cấu hình, KHÔNG merge» ✓ có (R11.18b).
- [ ] T8.4 «KHÔNG vai nào ngoài duyet_cong mở được cổng merge» ✓ có.
- [ ] T8.5 `samePerson` chịu được dấu chấm / gạch / hoa thường ✓ có ở `so-cong.test.ts` (R11.17).

## Ca MỚI

### R-6 cookie phiên (R11.14)
- [ ] T6.1 HTTP: cookie có `HttpOnly`.
- [ ] T6.2 HTTP: cookie có `SameSite`.
- [ ] T6.3 HTTP: cookie KHÔNG có `Secure`.
- [ ] T6.4 HTTPS (proxy báo `x-forwarded-proto: https`): có đủ ba cờ.
- [ ] T6.5 Header proxy nhiều giá trị (`https, http`) → lấy giá trị đầu, vẫn ra `Secure`.
      *Ba cờ chặn ba đường khác nhau nên tách ba ca: gộp một ca thì mất cờ nào không biết.*

### R-2 gác phiên (R11.2)
- [ ] T2.1 Đường thường + không phiên → CHẶN.
- [ ] T2.2 Đường trong danh sách cho phép + không phiên → cho qua.
- [ ] T2.3 Đường `/api/...` bị chặn → trả JSON, KHÔNG trả HTML chuyển hướng.
- [ ] T2.4 Đường trang bị chặn → chuyển hướng về màn đăng nhập.
- [ ] T2.5 Danh sách đường mở đúng nội dung đã chốt — thêm một đường vào đó làm ca này ĐỎ.

### R-7 không bề mặt nào phát danh sách tài khoản (R11.20)
- [ ] T7.1 Quét repo hiện tại → KHÔNG file tầng route nào gọi hàm liệt kê tài khoản.
- [ ] T7.2 Quét repo hiện tại → KHÔNG file ngoài `identity.ts` nào chạm bảng tài khoản bằng SQL.
- [ ] T7.3 Công cụ dòng lệnh gọi hàm ấy → lưới XANH (chỗ hợp lệ duy nhất).
- [ ] T7.4 **Fixture đối kháng**: một route giả gọi hàm liệt kê tài khoản → lưới ĐỎ, nêu đúng file.

### R-1 một cửa danh tính (R11.4)
- [ ] T1.5 Quét repo hiện tại → đúng một hàm đọc cookie phiên để dựng danh tính.
- [ ] T1.6 **Fixture đối kháng**: một cửa thứ hai đọc thẳng cookie → lưới ĐỎ.

### R-3 quyền file (R11.8, D4)
- [ ] T3.3 chmod được gọi cho đủ ba đuôi (`''`, `-wal`, `-shm`) với mode `0o600`.
      *Kiểm LỜI GỌI, không kiểm quyền thật — ca đọc quyền sẽ đỏ trên Windows, xanh trên Linux, và một lưới
      nói khác nhau tuỳ máy là lưới người ta sẽ bỏ qua. Cái mất ghi ở design D4.*
- [ ] T3.4 R11.7: schema có bảng tài khoản với cột vai.

## Đường leo quyền (D5) — mỗi đường một ca

- [ ] T9.1 Thêm route đọc bảng tài khoản → T7.4.
- [ ] T9.2 Nới danh sách đường mở để lách gác phiên → T2.5.
- [ ] T9.3 Đọc cookie phiên ở cửa thứ hai, bỏ qua kiểm hạn → T1.6.

## Mutation (load-bearing)

- [ ] T10.1 Bỏ `HttpOnly` khỏi hàm dựng cookie → T6.1 ĐỎ (và chỉ T6.1).
- [ ] T10.2 Bỏ điều kiện HTTPS → T6.3 hoặc T6.4 ĐỎ.
- [ ] T10.3 Cho gác phiên trả «cho qua» khi không phiên → T2.1 ĐỎ.
- [ ] T10.4 Đổi nhánh API sang trả HTML → T2.3 ĐỎ.
- [ ] T10.5 Bỏ phép quét SQL của lưới R11.20 → T7.2 hoặc fixture đối kháng ĐỎ.
- [ ] T10.6 Bỏ một đuôi khỏi vòng chmod → T3.3 ĐỎ.

**Mỗi đột biến chạy ít nhất HAI lần.** Bài học `error-message-egress-gate`: một lần chạy báo «1 failed» hoá
ra là flaky, suýt kết luận đột biến bị bắt trong khi không.

## Trục nhạy cảm

- [ ] T_bimat — T4.3 · T5.1 · T7.x: mật khẩu và token không ở dạng đọc được; danh sách tài khoản không ra
      khỏi máy chủ.
- [ ] T_failclosed — T1.1 · T1.2 · T2.1: không cookie, cookie rác, không phiên đều là TỪ CHỐI, không phải
      «đoán ra một danh tính».
- [ ] T_cong — T8.1 · T8.4: ⛔C1 sống ở tầng vai; không vai nào ngoài vai duyệt cổng mở được merge.
- [ ] T_khongtincay — cookie là dữ liệu client gửi; T1.2 khoá rằng nó không lái được danh tính.
- [ ] T_hopdong — hàm mới khai bảng module `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T11.1 R11.8 phần lưới không với tới: quyền THẬT của `checkmate.db`, `-wal`, `-shm` trên máy chủ sau
      một lần deploy. Thuộc `DEPLOY.md`, không phải `npm test`.
