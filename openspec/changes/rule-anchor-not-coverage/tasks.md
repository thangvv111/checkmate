## 0. Đo trước khi viết

- [x] 0.1 Đếm bằng máy các bề mặt chạm `luat_tong`: **10 lần xuất hiện, 4 tệp** (bảng ở `design.md`).
- [x] 0.2 Đối chiếu hai repo thật để chứng minh khuyến khích ngược: `checkmate` 195 đơn vị · lượt neo 1 ⇒
      0,5%; `demo-credit-approval` 9 đơn vị · lượt neo 3 ⇒ 33%. Số lấy từ verdict thật, không suy.
- [x] 0.3 Đọc luật đang khai (`man-run`) để biết đây là **đổi luật**, không phải sửa lỗi — scenario cũ nói
      thẳng «độ phủ tính trên số đó».

## 1. Luật

- [x] 1.1 `man-run › Verdict phải khai cả phần yếu của chính lượt chấm` — MODIFIED. Giữ nguyên vế vùng xám
      probe, vế mức cô lập, vế «không đo được ≠ 0»; đổi vế độ phủ, thêm hai scenario.

## 2. Engine & bề mặt

- [x] 2.1 `skill-code.ts` — log khai **số đếm + tên đơn vị**, kèm tổng số có chú «không phải mẫu số».
- [x] 2.2 `cli.ts` — dòng tóm tắt bỏ dạng `x/y`.
- [x] 2.3 `ui.ts` — hàng bảng số liệu đổi nhãn thành «Luật có probe neo», bày **tên** đơn vị.
- [x] 2.4 `spec-units.ts` — **không đổi**: `ruleCoverage` vẫn trả `luat_da_phu` + `luat_tong`. Hình dạng
      dữ liệu giữ nguyên nên verdict đời cũ đọc y như trước, không cần đường di trú.

## 3. Test

- [x] 3.1 Sửa ca cũ trong `no-spec.test.ts` đang khẳng định `2/3 đơn vị có probe`, kèm lý do tại chỗ.
- [x] 3.2 Lưới `scanRatioSurfaces` + **cặp fixture**: ghép tỉ lệ ⇒ ĐỎ · hai số tách bạch ⇒ XANH · mất mỏ
      neo ⇒ ĐỎ · danh sách bề mặt rỗng ⇒ ĐỎ.
- [x] 3.3 Ca **đếm bằng máy**: cả bốn tệp còn chạm `luat_tong`; tệp nào mất mỏ neo thì lưới đỏ.
- [x] 3.4 **Mutation, chạy HAI lần**: khôi phục dạng tỉ lệ ở **từng** bề mặt ⇒ `skill-code` 1 đỏ ·
      `cli` 1 đỏ · `ui` 2 đỏ. Khớp cả hai vòng.
- [x] 3.5 `npx tsc --noEmit && npm test` — 77 file, 1398 ca, xanh.

## 4. Trước merge

- [ ] 4.1 Deploy, rồi đọc verdict của một lượt chấm thật: thông điệp mới nêu **tên** đơn vị luật đã neo.

## § Sau-merge — nợ có tên

- [ ] 5.1 **Câu hỏi gốc vẫn chưa có ai trả lời**: *«lượt chấm này có kiểm những luật đáng kiểm không?»*.
      Change này bỏ một câu trả lời SAI; nó không dựng câu trả lời đúng. Muốn có, engine cần một ánh xạ
      **diff → đơn vị luật** mà hôm nay không tồn tại — và ánh xạ ấy phải do máy dựng, không do model
      khai, kẻo lại lấy tử số làm mẫu số.
