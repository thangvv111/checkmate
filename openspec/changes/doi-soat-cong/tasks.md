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
