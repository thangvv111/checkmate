## 1. Luật (specs/R*.md)

- [x] 1.1 Thêm R6.20–R6.24 vào `specs/R6-verdict-va-cong-merge.md`: sổ phản ánh hành động ngoài cổng ·
      phân biệt bằng DỮ LIỆU · cấm suy diễn «không tick = không finding» · idempotent · lỗi thì im
      lặng bỏ qua chứ không ghi hàng suy đoán

## 2. Kiểu & hợp đồng

- [x] 2.1 `MucSoCong.ngoai_cong?: boolean` (kho-socai.ts)
- [x] 2.2 Khai hàm mới vào bảng module `checkmate.yml`: `trangThaiPr`, `runChuaCoHanhDongCong`, `doiSoatCong`

## 3. Tầng dữ liệu

- [x] 3.1 Di trú `so_cong_them_ngoai_cong`: ALTER TABLE ADD COLUMN, ghi `da_di_tru`, idempotent
- [x] 3.2 `ghiSoCong` ghi cột mới; `runChuaCoHanhDongCong()` trả run có pr_so mà chưa có hàng sổ

## 4. Web

- [x] 4.1 `trangThaiPr(cfg, so)` — đọc trạng thái PR từ GitHub, không ném ra ngoài
- [x] 4.2 `ghiSo` dựng chi_tiet nói đủ ba điều cho hàng ngoài cổng
- [x] 4.3 `doiSoatCong(cfg)` — gom theo PR, bỏ qua run đã có hàng, cập nhật `run.cong_*`
- [x] 4.4 Gọi trong chu kỳ chế độ trực, bọc try riêng

## 5. Test

- [x] 5.1 Ca cho từng scenario trong spec
- [x] 5.2 Ca idempotent: chạy hai lần không đẻ hàng trùng
- [x] 5.3 Ca lỗi GitHub: không ghi hàng nào
- [x] 5.4 `npx tsc --noEmit` sạch + `npm test` xanh toàn bộ

## 6. Vá vòng chấm (cổng bắt trên chính change này)

Vòng một — 6 finding (5 HIGH):
- [x] 6.1 Lọc theo `run_id` thay vì theo pull request → run anh em bị vu «ngoài cổng» cho một merge
      ĐÃ qua cổng. Nay xét ở mức PR.
- [x] 6.2 Trạng thái ngoài miền rơi mềm thành `reject` → nay bỏ qua + nói ra (R6.24).
- [x] 6.3 Điều kiện `verdict IS NOT NULL` là tự thêm, không có trong R6.20 → đã bỏ.
- [x] 6.4 Cờ ngoài-cổng không sang bảng `run` → thêm cột `run.cong_ngoai_cong` (R6.21).
- [x] 6.5 Một run hỏng giết trọn lượt → lưới bọc từng run (R6.25).
- [x] 6.6 `chiTietNgoaiCong` ném với `findings` méo → lọc phần tử méo.

Vòng hai — 6 finding (4 HIGH):
- [x] 6.7 **Nối dây sai repo**: `server.ts` gọi `(so) => trangThaiPr(cfg, so)` — vứt đối số repo, nên
      hỏi PR của repo khác bằng chìa của repo ĐANG CHỌN. `trangThaiPr` nay nhận repo tường minh.
- [x] 6.8 Lọc «đã có hàng sổ» thay vì «đã có HÀNH ĐỘNG merge» → lượt mang hàng `reject` của người bị
      loại khỏi diện, lần merge sau đó không được ghi. Nay `prCanDoiSoat` không lọc theo hàng sổ;
      quyết định thuộc về phép so hành động.
- [x] 6.9 Hàng merge ngoài cổng rơi xuống lượt CŨ (hệ quả của 6.8) → `prCanDoiSoat` trả lượt MỚI NHẤT
      của mỗi cặp (repo, PR).
- [x] 6.10 **Đối soát bị hàn vào chu kỳ trực**: `truc.bat=false` (mặc định máy chỉ chấm tay) thì sổ
      KHÔNG BAO GIỜ được đối chiếu. Nay tách thành `chayDoiSoat()` chạy lúc khởi động + nhịp riêng
      15 phút, không phụ thuộc công tắc trực.
- [x] 6.11 Lỗi không phải `Error` (chuỗi trần, `{code:404}`) làm chính khối bắt lỗi ném → `moTaLoi()`
      không bao giờ tự ném; lỗi đếm đúng một lần, nguyên nhân giữ được.
- [x] 6.12 Hàng đối soát đóng dấu tên người vào ô người-thực-hiện → `chi_tiet` nay nói rõ máy chỉ
      GHI LẠI chứ không thực hiện, kèm danh tính tác nhân máy (R6.18).

