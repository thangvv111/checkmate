## S1. Bí mật & rò rỉ

- ✅ S1.1 — change chỉ đọc **sự tồn tại** của file dấu hiệu ở gốc repo đích (`package.json`, `pom.xml`,
  `build.gradle`, `requirements.txt`, `pyproject.toml`) và, với Node, số gói đã khai. Không đọc nội dung
  `pom.xml` hay `.npmrc`, không log nội dung file nào.
- ✅ S1.2 — thông điệp mang **tên hệ** và **đường dẫn clone**; không mang token, khoá, hay giá trị người
  dùng gõ tay.

## S2. Danh tính, phiên, vai

- N/A — không chạm danh tính, không thêm route.

## S3. Cổng & quyền của máy (⛔C1)

- ✅ S3.1 — change **siết**: nó thêm một lớp repo bị chặn sớm hơn. Không thêm đường nào cho máy đi tiếp,
  không chạm cổng merge, không chạm `decideResult`.

## S4. Dữ liệu không tin cậy (⛔C4)

- ✅ S4.1 — **trục chính**. Tên file dấu hiệu là **hằng trong mã**; thứ đến từ repo đích chỉ là *file ấy
  có tồn tại hay không*. Kết quả nhận diện dùng để **tra một bảng đóng**, không ghép vào lệnh, không nội
  suy vào tên ảnh.
- ✅ S4.2 — repo đích **không tự khai được** hệ của mình. Nếu khai được, một repo sẽ tự chọn nhánh xử lý
  cho chính nó — kể cả chọn nhánh «Node, phụ thuộc đã đủ» để lách cửa kiểm.
- ✅ S4.3 — `package.json` hỏng vẫn fail-safe về không-kết-luận như hôm nay; không ném.

## S5. Sandbox & thực thi

- ✅ S5.1 — **không nới bề mặt nào**: không mount thêm, không mở mạng, không chạy lệnh mới. Change này chỉ
  *đọc sự tồn tại của file* và *đổi lời văn*.
- ✅ S5.2 — không tự cài gì cho hệ nào. Với hệ chưa hỗ trợ, nó **dừng và nói**, không thử.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — chỉ đọc, không ghi file nào trong repo đích.

## S7. Fail-closed & bất biến verdict (⛔C2)

- ✅ S7.1 — nhánh mới:

  | nhánh | đi về đâu |
  |---|---|
  | Node, thiếu phụ thuộc | **chặn** (như hôm nay) |
  | Node, đủ | đi tiếp (như hôm nay) |
  | hệ nhận ra nhưng chưa hỗ trợ | **chặn** + nói đúng tên hệ (MỚI) |
  | không nhận ra hệ nào | đi tiếp — không chặn oan |

  Không nhánh nào ra PASS. Hướng bỏ sót (không nhận ra hệ) rơi về hành vi hôm nay.
- ⚠️ S7.2 — **change này làm HẸP lại tập repo chấm được**: `admin-be` và `portal-be` từ «chạy 17 phút rồi
  chết» thành «dừng ngay, nói chưa hỗ trợ». Đó không phải hồi quy — cả hai vốn **không** chấm được; thay
  đổi là ở chỗ **biết sớm và biết đúng**. Khai ra để không ai đọc bảng verdict rồi tưởng có repo vừa mất
  khả năng chấm.

## S8. Leo quyền & cô lập

- N/A — không chạm cô lập, không thêm bề mặt thực thi.

## Notes

- **Lỗi này cùng họ với hai lỗi trước trong ba ngày**: «Runner không xuất JUnit XML» (thông điệp nói về
  hợp đồng kết quả trong khi bệnh là môi trường), và giờ là «chạy `npm ci`» cho repo Maven. Cả hai đều là
  **thông điệp đúng ngữ pháp, sai nội dung**, và cả hai chỉ lộ ra khi có repo đích mới. Khuôn chung: một
  giả định chưa viết ra thành luật thì không ai rà được nó — nó chỉ vỡ.
