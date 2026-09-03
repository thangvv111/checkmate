# Tasks — close-probe-library-spec

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/probe-library/spec.md` (6 requirement) — đã viết.
- [x] 1.2 Đối chiếu **từng điều trong 20 điều** với ca cụ thể (file + tiêu đề ca). Điều nào không chỉ được
      ra ca thì KHÔNG khai — ghi vào D-x thay vì viết bừa.

## 2. Mutation — phép kiểm CHÍNH, cho TỪNG VẾ (D1)

Không dừng ở «một đột biến cho mỗi requirement» — lượt trước cho thấy cách ấy bỏ sót hai chỗ hở.

**R-1 sổ dùng chung**
- [x] 2.1 `R8.4` bỏ khoá quanh chuỗi đọc–sửa–ghi → ca ĐỎ.
- [x] 2.2 `R8.6` bỏ `finally` khi nhả khoá → ca «việc bên trong ném lỗi thì khoá vẫn phải được nhả» ĐỎ.
- [x] 2.3 `R8.7` bỏ ngưỡng phá khoá quá hạn → ca «khoá của tiến trình đã chết bị phá» ĐỎ.
- [x] 2.4 `R10.12` ghi thẳng → **KHÔNG ca nào đỏ**. Đọc code: không có đường lui ⇒ vế atomic CHƯA được
      gác. **Viết ca mới** (đọc source — vế duy nhất không khoá được bằng hành vi, D5). Đo lại: ĐỎ.

**R-2 hạt nạp là probe**
- [x] 2.5 `R10.2` — phép tách được khoá gián tiếp qua đột biến 2.6 (bỏ đường nhận thư viện đời bộ làm
      ĐỎ đúng ca «tách từng probe, loại bản chạy-lại, xoá file bộ cũ») và trực tiếp bởi `dedup-probe.test.ts`
      § tách file per-probe. Không viết đột biến riêng.
- [x] 2.6 `R10.5` bỏ đường di trú đời bộ → ca ĐỎ.
- [x] 2.7 `R10.5` vế «chạy đúng một lần» — đột biến 2.6 làm ĐỎ đúng ca «di trú chạy đúng một lần — đọc
      lại không nhân đôi». Không cần đột biến riêng.

**R-3 trần + đào thải theo điểm**
- [x] 2.8 `R10.4` bỏ trần → ca ĐỎ.
- [x] 2.9 `R10.22` nấc 1: bỏ phép nhận probe chết kéo dài → ca ĐỎ.
- [x] 2.10 `R10.22` nấc 2: bỏ phép chọn flaky cao nhất → ca ĐỎ.
- [x] 2.11 `R10.22` nấc 3: bỏ miễn trừ probe từng bắt hồi quy → ca ĐỎ.
- [x] 2.12 `R10.22` nấc 4: bỏ van chống kẹt → ca ĐỎ.
- [x] 2.13 `R10.23` cho cờ `da_bat_hoi_quy` trôi theo trần lịch sử → ca ĐỎ.
- [x] 2.14 `R10.24` đếm flaky theo mọi trạng thái thay vì theo cùng sha → ca ĐỎ.

**R-4 gỡ trùng bốn tầng**
- [x] 2.15 `R10.6` bỏ một trong ba điều kiện của tầng 1 → ca ĐỎ.
- [x] 2.16 `R10.7` bỏ phép giao luật spec ở tầng 2 → ca ĐỎ.
- [x] 2.17 `R10.8` bỏ vế «nghiêng về GIỮ» (nhận cả phán xử mơ hồ) → ca ĐỎ.

**R-5 lịch sử hành vi**
- [x] 2.18 `R10.9` cho cùng một lượt ghi hai bản ghi → ca ĐỎ.
- [x] 2.19 `R10.10` bỏ trần lịch sử → ca ĐỎ.
- [x] 2.20 `R10.20` tính cả nhãn hoàn cảnh vào phép so hành vi → ca ĐỎ.
- [x] 2.21 `R10.21` cho «cùng pass suốt» đủ để gỡ → ca ĐỎ.

**R-6 máy tách**
- [x] 2.22 `R10.16` bỏ phép nhận diện regex literal khi đếm ngoặc → ca ĐỎ.

**Chung**
- [x] 2.23 **20 đột biến, mỗi cái hai lần, TẤT CẢ nhất quán.** 19 đỏ ngay; `R10.12` sống sót → xem 2.4.
- [x] 2.24 Đột biến sống sót → bảng ba đường ở D1. **Không im lặng khai bừa.**
- [x] 2.25 `git diff --stat packages/` sạch. **Và lượt chạy ĐẦU bị timeout giết khi đang giữ đột biến —
      file ở lại trạng thái đã sửa.** Bắt được đúng bằng phép kiểm này; xem D6.

## 3. Kiểm cơ học

- [x] 3.1 `npx tsc --noEmit` sạch · `npm test` **58 file / 915 ca xanh** (914 + 1 ca mới cho `R10.12`).
- [x] 3.2 `npx openspec validate --changes` xanh.
- [x] 3.3 Tầng 2 và tầng 3 của `test-grid-integrity` — **N/A có lý do** (D4).

## 4. Bảng tra

- [ ] 4.1 **20 hàng** → `housed` trỏ `probe-library › <tiêu đề>`. Cập nhật dòng Đếm.
      **Làm ở commit ARCHIVE.**
- [ ] 4.2 Kiểm bằng máy: sau change này **bảng tra còn 0 hàng `pending`**.
- [ ] 4.3 Đo neo thư viện probe — **dự đoán TRƯỚC: vẫn 15/15**.
