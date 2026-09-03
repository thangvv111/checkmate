# Tasks — data-layer

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/data-layer/spec.md` (6 requirement) — đã viết.
- [ ] 1.2 Đối chiếu từng requirement với ca đang xanh ở `kho-run` · `kho-socai` · `di-tru` ·
      `di-tru-bo-cot-cong` · `doc-du-lieu-cu` · `goc-du-lieu-chung`. **ĐỌC, không đếm mã trích.**

## 2. Lưới quét source cho ba luật kiến trúc (D2)

- [ ] 2.1 Lưới `R9.1`/`R9.2`: ngoài lớp kho, KHÔNG file nào gọi SQL trực tiếp. Danh sách CHO PHÉP vị trí
      **kèm LOẠI lý do** (file tạm · metadata build · file-là-nguồn · cấu hình/kho khoá theo `R9.13`).
- [ ] 2.2 Lưới `R9.16`: route `/api/*` không dựng HTML.
- [ ] 2.3 Thông điệp lưới nêu **file và lý do thiếu** — người đọc sửa được ngay.

## 3. Test — những điều chưa khoá

- [ ] 3.1 `R9.3` — mở cơ sở dữ liệu bật khoá ngoại và chế độ nhật ký (ca đọc schema, D4).
- [ ] 3.2 `R9.11` — cột dùng để lọc/sắp xếp có index (ca đọc schema).
- [ ] 3.3 **«File là nguồn, bảng là bản đọc»** — bảng trống mà đĩa có → đọc đĩa và dựng lại bảng; đường
      dựng lại là MỘT CHIỀU.
- [ ] 3.4 `R9.13` — sửa cấu hình bằng tay có hiệu lực ở lượt đọc kế tiếp (⛔C6).
- [ ] 3.5 Đối chiếu: `R9.4b` (`PRAGMA recursive_triggers` theo kết nối) đã có ca chưa — nếu chưa thì thêm.

## 4. Mutation — mỗi chiều chạy HAI lần

- [ ] 4.1 Thêm một file ngoài lớp kho gọi SQL → lưới 2.1 ĐỎ (fixture đối kháng).
- [ ] 4.2 Bỏ nhánh «bảng trống thì đọc đĩa» → ca 3.3 ĐỎ.
- [ ] 4.3 Bỏ index khỏi schema → ca 3.2 ĐỎ.
- [ ] 4.4 Bỏ `PRAGMA foreign_keys` → ca 3.1 ĐỎ.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — dự đoán chỉ nêu vế **«không ca cũ nào đỏ»**.
- [ ] 5.2 `npx openspec validate --changes` xanh.
- [ ] 5.3 Lưới 2.1 phải bắt được thứ đã biết TRƯỚC khi tin nó — fixture một file giả gọi SQL → ĐỎ.
      *Ca load-bearing: phép quét trả rỗng trông giống hệt «repo sạch» và «phép quét hỏng».*

## 6. Bảng tra (ở commit archive)

- [ ] 6.1 `docs/r-rules-map.md`: 18 điều → `housed`. **`R9.17` trỏ `response-secret-guard`** (D3), 17 điều
      còn lại trỏ `data-layer › <tiêu đề>`.
- [ ] 6.2 Đo neo thư viện probe — **dự đoán TRƯỚC: 14 → 15/15, không còn mã nào trôi** (D5). Sai thì ghi rõ.
