## 0. Đo trước khi viết

- [x] 0.1 Khảo sát **cả sáu** repo đích đã khai: file dấu hiệu · hệ · phụ thuộc trên máy chủ. Bảng ở
      `design.md`. Không suy từ tên repo — đọc file.
- [x] 0.2 Đo máy chủ: ảnh container đang có (chỉ Node 22/24), kho Maven (`~/.m2` rỗng). Đây là căn cứ cho
      quyết định «chưa hỗ trợ», không phải phỏng đoán.
- [x] 0.3 Đọc sổ lượt chấm `admin-be` PR #13: dừng ở đâu, tiêu bao nhiêu lời gọi, thông điệp nguyên văn.

## 1. Luật

- [x] 1.1 `probe-environment › Điều kiện môi trường … TRƯỚC lời gọi model đầu tiên` — MODIFIED.
- [x] 1.2 `probe-environment › Thông điệp … gọi đúng tên bệnh và nêu việc phải làm` — MODIFIED.
- [x] 1.3 `probe-environment › Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe` — **KHÔNG sửa**.

## 2. Kiểu & hợp đồng

- [x] 2.1 `Ecosystem` + `ECOSYSTEM_MARKERS` — bảng đóng, trong mã, mỗi hàng có file dấu hiệu và cờ
      «engine cấp được phụ thuộc không».
- [x] 2.2 Khai export mới vào bảng module của `checkmate.yml` (⛔C5).

## 3. Engine

- [x] 3.1 `detectEcosystem(repo)` — tra bảng đóng, không khớp ⇒ `null`.
- [x] 3.2 `checkDependencies` đi theo hệ: Node giữ nguyên hành vi cũ từng ca; hệ chưa hỗ trợ ⇒ chặn kèm
      thông điệp nêu **tên hệ**.
- [x] 3.3 `describeEnvironmentFailure` nhận hệ; **MUST NOT** kê lệnh Node cho repo không phải Node.
- [x] 3.4 Cửa gọi ở `skill-code.ts` và cửa thêm repo ở `server.ts` truyền hệ xuống.

## 4. Test

- [x] 4.1 Ca khoá cho từng scenario mới.
- [x] 4.2 ⛔ **Ca chống tái phát tên riêng**: với repo Maven/Gradle/Python, thông điệp **không chứa**
      `npm ci` / `npm install`. Đây là ca của chính lỗi 08/09.
- [x] 4.3 Lưới **bảng đóng có cặp fixture**: bảng thiếu hàng ⇒ ĐỎ · bảng đủ ⇒ XANH · mỏ neo mất ⇒ ĐỎ.
- [x] 4.4 **Mutation hai chiều, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả.
- [x] 4.5 Ca hồi quy: repo Node đi **y hệt** đường cũ, không nhánh nào đổi.

## 5. Trước merge

- [x] 5.1 `npx tsc --noEmit && npm test`.
- [ ] 5.2 Deploy, rồi chấm lại `admin-be` PR #13: kỳ vọng dừng **trước stage 3**, thông điệp nêu **Maven**,
      **không** có chữ `npm`.

## 6. Nhắn đội repo đích — ĐÃ LÀM 08/09

- [x] 6.1 `oapi-admin-be` (phiên `admin-be-bf`) — Maven, Java 21, surefire 3.6.0, bản nháp `checkmate.yml`
      kèm cảnh báo thẳng: máy chủ chưa có ảnh Java và kho `.m2`, nên file ấy là **chuẩn bị**, không phải
      công tắc bật.
- [x] 6.2 `oapi-portal-be` (phiên `portal-be-90`) — như trên, surefire 3.2.5.
- [x] 6.3 `oapi-portal-fe` (phiên `portal-fe-a5`) — Node, `.nvmrc 24`, `engine-strict=true`; nêu rõ chặn
      số một là **bản clone trên máy chủ chưa cài phụ thuộc**, không phải thiếu cấu hình.
- [N/A] 6.4 `oapi-admin-fe` — **không có phiên nào đang chạy**, không nhắn được. Báo PO.

## 7. ⛔ Ràng buộc thứ tự archive

- [ ] 7.1 Change này **archive được SAU** `probe-environment-preflight` — capability đích chưa tồn tại
      trong `openspec/specs/`, `openspec validate` đã cảnh báo. Merge và deploy **không** bị chặn.

## 8. Sau-merge — nợ có tên

- [ ] 8.1 **Nuôi hệ Java trên máy chủ**: ảnh `eclipse-temurin:21` ghim digest + kho `~/.m2` mount chỉ-đọc.
      Change riêng, rộng hơn nhịp hai. Cần PO chốt trước.
- [ ] 8.2 `portal-fe` chưa cài phụ thuộc trên máy chủ — thuộc nhịp hai.
- [ ] 8.3 `vitest.config.ts` chưa đặt `maxWorkers`: `npm test` lúc đỏ lúc xanh trên máy đang tải (đo 08/09,
      **6 file khác nhau** đỏ ở lượt chạy toàn bộ rồi xanh khi chạy riêng; `--maxWorkers=4` xanh sạch).
      Cổng merge lúc đỏ lúc xanh dạy người ta chạy lại thay vì đọc.
