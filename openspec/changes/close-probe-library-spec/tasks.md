# Tasks — close-probe-library-spec

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/probe-library/spec.md` (6 requirement) — đã viết.
- [ ] 1.2 Đối chiếu **từng điều trong 20 điều** với ca cụ thể (file + tiêu đề ca). Điều nào không chỉ được
      ra ca thì KHÔNG khai — ghi vào D-x thay vì viết bừa.

## 2. Mutation — phép kiểm CHÍNH, cho TỪNG VẾ (D1)

Không dừng ở «một đột biến cho mỗi requirement» — lượt trước cho thấy cách ấy bỏ sót hai chỗ hở.

**R-1 sổ dùng chung**
- [ ] 2.1 `R8.4` bỏ khoá quanh chuỗi đọc–sửa–ghi → ca ĐỎ.
- [ ] 2.2 `R8.6` bỏ `finally` khi nhả khoá → ca «việc bên trong ném lỗi thì khoá vẫn phải được nhả» ĐỎ.
- [ ] 2.3 `R8.7` bỏ ngưỡng phá khoá quá hạn → ca «khoá của tiến trình đã chết bị phá» ĐỎ.
- [ ] 2.4 `R10.12` ghi thẳng thay vì ghi tạm rồi đổi tên → ca ĐỎ.

**R-2 hạt nạp là probe**
- [ ] 2.5 `R10.2` bỏ phép tách per-probe → ca ĐỎ.
- [ ] 2.6 `R10.5` bỏ đường di trú đời bộ → ca ĐỎ.
- [ ] 2.7 `R10.5` vế «chạy đúng một lần»: cho di trú chạy lại mỗi lần đọc → ca «đọc lại không nhân đôi» ĐỎ.

**R-3 trần + đào thải theo điểm**
- [ ] 2.8 `R10.4` bỏ trần → ca ĐỎ.
- [ ] 2.9 `R10.22` nấc 1: bỏ phép nhận probe chết kéo dài → ca ĐỎ.
- [ ] 2.10 `R10.22` nấc 2: bỏ phép chọn flaky cao nhất → ca ĐỎ.
- [ ] 2.11 `R10.22` nấc 3: bỏ miễn trừ probe từng bắt hồi quy → ca ĐỎ.
- [ ] 2.12 `R10.22` nấc 4: bỏ van chống kẹt → ca ĐỎ.
- [ ] 2.13 `R10.23` cho cờ `da_bat_hoi_quy` trôi theo trần lịch sử → ca ĐỎ.
- [ ] 2.14 `R10.24` đếm flaky theo mọi trạng thái thay vì theo cùng sha → ca ĐỎ.

**R-4 gỡ trùng bốn tầng**
- [ ] 2.15 `R10.6` bỏ một trong ba điều kiện của tầng 1 → ca ĐỎ.
- [ ] 2.16 `R10.7` bỏ phép giao luật spec ở tầng 2 → ca ĐỎ.
- [ ] 2.17 `R10.8` bỏ vế «nghiêng về GIỮ» (nhận cả phán xử mơ hồ) → ca ĐỎ.

**R-5 lịch sử hành vi**
- [ ] 2.18 `R10.9` cho cùng một lượt ghi hai bản ghi → ca ĐỎ.
- [ ] 2.19 `R10.10` bỏ trần lịch sử → ca ĐỎ.
- [ ] 2.20 `R10.20` tính cả nhãn hoàn cảnh vào phép so hành vi → ca ĐỎ.
- [ ] 2.21 `R10.21` cho «cùng pass suốt» đủ để gỡ → ca ĐỎ.

**R-6 máy tách**
- [ ] 2.22 `R10.16` bỏ phép nhận diện regex literal khi đếm ngoặc → ca ĐỎ.

**Chung**
- [ ] 2.23 Mỗi đột biến chạy **hai lần**, kiểm chứng đã áp dụng trước khi đọc kết quả.
- [ ] 2.24 Đột biến sống sót → bảng ba đường ở D1. **Không im lặng khai bừa.**
- [ ] 2.25 `git diff --stat packages/` sạch sau lượt mutation.

## 3. Kiểm cơ học

- [ ] 3.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 3.2 `npx openspec validate --changes` xanh.
- [ ] 3.3 Tầng 2 và tầng 3 của `test-grid-integrity` — **N/A có lý do** (D4).

## 4. Bảng tra

- [ ] 4.1 **20 hàng** → `housed` trỏ `probe-library › <tiêu đề>`. Cập nhật dòng Đếm.
      **Làm ở commit ARCHIVE.**
- [ ] 4.2 Kiểm bằng máy: sau change này **bảng tra còn 0 hàng `pending`**.
- [ ] 4.3 Đo neo thư viện probe — **dự đoán TRƯỚC: vẫn 15/15**.
