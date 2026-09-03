# Tasks — data-layer

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/data-layer/spec.md` (6 requirement) — đã viết.
- [x] 1.2 Đối chiếu từng requirement với ca đang xanh ở `kho-run` · `kho-socai` · `di-tru` ·
      `di-tru-bo-cot-cong` · `doc-du-lieu-cu` · `goc-du-lieu-chung`. **ĐỌC, không đếm mã trích.**

## 2. Lưới quét source cho ba luật kiến trúc (D2)

- [x] 2.1 Lưới `R9.1`/`R9.2`: ngoài lớp kho, KHÔNG file nào gọi SQL trực tiếp. Danh sách CHO PHÉP vị trí
      **kèm LOẠI lý do** (file tạm · metadata build · file-là-nguồn · cấu hình/kho khoá theo `R9.13`).
- [x] 2.2 Lưới `R9.16`: route `/api/*` **ĐỌC** không dựng HTML — chỉ quét `GET`, và cắt khối tới route kế
      tiếp thay vì cắt cứng (D6: bản đầu báo 5 vi phạm mà thực tế không có cái nào).
- [x] 2.3 Thông điệp lưới nêu **file và lý do thiếu** — người đọc sửa được ngay.

## 3. Test — những điều chưa khoá

- [x] 3.1 `R9.3` — mở cơ sở dữ liệu bật khoá ngoại và chế độ nhật ký (ca đọc schema, D4).
- [x] 3.2 `R9.11` — cột dùng để lọc/sắp xếp có index (ca đọc schema).
- [x] 3.3 **«File là nguồn, bảng là bản đọc»** — bảng trống mà đĩa có → đọc đĩa và dựng lại bảng; đường
      dựng lại là MỘT CHIỀU.
- [x] 3.4 `R9.13` — đối chiếu task 1.2: đã có ca ở `goc-du-lieu-chung.test.ts`; không thêm ca trùng.
- [x] 3.5 `R9.4b` — có ca «INSERT OR REPLACE bị TỪ CHỐI» ở `kho-socai.test.ts`; thêm ca khoá `PRAGMA
      recursive_triggers` có mặt trong schema.

## 4. Mutation — mỗi chiều chạy HAI lần

- [x] 4.1 Fixture đối kháng nằm sẵn trong lưới (ca «file giả ngoài lớp kho chạy SQL» → ĐỎ).
- [x] 4.2 Bỏ nhánh «bảng trống thì đọc đĩa» → ĐỎ đúng ca 3.3.
- [x] 4.3 Bỏ index `ix_run_repo_bat_dau` → ĐỎ đúng ca 3.2.
- [x] 4.4 Bỏ `PRAGMA foreign_keys` → ĐỎ đúng ca 3.1. **Ba đột biến, mỗi cái chạy hai lần, nhất quán.**

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **54 file / 879 ca xanh** (869 + 10 ca mới). Vế «không ca
      cũ nào đỏ» — ĐÚNG.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 Lưới 2.1 bắt được fixture đối kháng. **Và lưới bản đầu bắt NHẦM sáu chỗ đúng** — xem D6: đó là
      mặt ngược của cùng vấn đề, lưới đo sai thứ nó tưởng đang đo.

## 6. Bảng tra (ở commit archive)

- [ ] 6.1 `docs/r-rules-map.md`: 18 điều → `housed`. **`R9.17` trỏ `response-secret-guard`** (D3), 17 điều
      còn lại trỏ `data-layer › <tiêu đề>`.
- [ ] 6.2 Đo neo thư viện probe — **dự đoán TRƯỚC: 14 → 15/15, không còn mã nào trôi** (D5). Sai thì ghi rõ.
