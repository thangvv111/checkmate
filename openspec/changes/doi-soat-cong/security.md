<!-- Ô ✅ trỏ file:line của CƠ CHẾ THẬT. ✅ OK / ⚠️ Cần xử / N/A. -->

## S1. Bí mật & rò rỉ

- N/A S1.1 Không chạm token/khoá/mật khẩu. Tên người merge lấy từ GitHub là dữ liệu công khai của PR
- N/A S1.2 Không đăng gì ra bề mặt công khai — đối soát chỉ ghi vào sổ nội bộ
- N/A S1.3 Không có giá trị cần che

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 Hàng đối soát KHÔNG có người thao tác trong hệ này. TUYỆT ĐỐI không mượn tên tài khoản
  CheckMate nào — gán bừa một cái tên là làm hỏng đúng câu hỏi «ai đã bấm» (R11.1). Dùng
  `merged_by.login` của GitHub, hoặc `(ngoài cổng — không rõ)`
- N/A S2.2 Không route nào trả tài khoản/hash/muối

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Đối soát KHÔNG merge, KHÔNG đóng PR, KHÔNG tick finding — nó chỉ GHI LẠI việc đã xảy ra ở
  nơi khác. Máy vẫn không bao giờ merge. Vòng hai của cổng bắt thêm một sắc thái: hàng ghi ra phải
  nói rõ **máy chỉ GHI LẠI chứ không THỰC HIỆN** (R6.18) — đã bổ sung vào `chi_tiet` kèm danh tính
  tác nhân máy
- ✅ S3.2 Rủi ro NGƯỢC cần canh: hàng ngoài-cổng không được đọc nhầm thành «đã qua cổng» — phân biệt
  bằng cột dữ liệu, và mọi chỗ đếm/lọc phải xét cột đó (T3.3)

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Dữ liệu từ GitHub (login người merge) chỉ vào SỔ, không vào prompt model
- N/A S4.2 Đối soát không gọi model

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code nào
- N/A S5.2 Không tạo worktree/thư mục tạm

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Đụng SỔ KIỂM TOÁN của prod — thứ chỉ ghi thêm, KHÔNG sửa và KHÔNG xoá được. Một hàng sai
  là sai vĩnh viễn. Vì vậy: (a) chọn ALTER ADD COLUMN thay vì dựng lại bảng; (b) test idempotent phải
  xanh TRƯỚC khi deploy; (c) lỗi đọc trạng thái ⇒ không ghi gì
- ✅ S6.2 Di trú ghi `da_di_tru` nên chạy lại không thêm cột hai lần; `CHECK` và trigger giữ nguyên

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Hướng lệch: thà THIẾU một hàng (đối soát bỏ qua) còn hơn ghi một hàng SAI vào sổ không sửa
  được. Không đọc được trạng thái ⇒ bỏ qua + nói ra
- ✅ S7.2 Không đụng verdict, không đụng phân loại probe

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 Vector duy nhất: làm sổ kiểm toán nói sai. Ba đường — (a) ghi hàng suy đoán khi không đọc
  được trạng thái, (b) ghi trùng làm phồng sổ, (c) hàng ngoài-cổng trông như hàng qua-cổng. Cả ba đều
  có ca test và đều lệch về phía KHÔNG ghi
- ✅ S8.2 Test load-bearing hai chiều — ĐÃ THỬ THẬT, và lần thử ĐẦU THẤT BẠI, ghi lại nguyên văn:
  no-op phép kiểm «đã có hàng sổ» ngay trước khi ghi (`cong.ts`) mà **mọi test vẫn xanh** — vì bộ lọc
  ngoài (`runChuaCoHanhDongCong` dùng `NOT EXISTS`) đã chặn rồi, nên lớp trong là **guard mồ côi**
  chưa ca nào chạm tới. Đã thêm ca mô phỏng đúng cuộc đua (người bấm cổng thật XEN GIỮA lúc liệt kê
  và lúc ghi, bằng side effect trong `docTrangThai`); no-op lại → ca đó ĐỎ, phục hồi → xanh.
- N/A S8.3 Không có role đối xứng để soi

## Notes

Không sửa các hàng sổ cũ mang tên `vinac`/`ubuntu` (tài khoản hệ điều hành, di tích lỗi R11 đã gỡ).
Sổ chỉ ghi thêm — di tích đó là bằng chứng lịch sử; xoá đi mới là làm hỏng sổ.
