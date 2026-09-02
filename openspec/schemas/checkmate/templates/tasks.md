<!-- ⛔ HAI TASK GẦN NHƯ LUÔN BẮT BUỘC — xoá chỉ khi thật sự không áp dụng, kèm lý do:
     · Luật của change sống ở delta spec (specs/<capability>/spec.md của change) + hằng/validate trong
       engine có test khoá + checkmate.yml. KHÔNG viết luật vào docs/archive/r-rules/ (đã gỡ 02/09).
     · Khai module/hàm mới vào bảng của checkmate.yml khi thêm/đổi export — lưới hợp đồng đã bắt
       hụt 5 lần vì quên; khai thiếu thì probe chết với «... is not a function» và biến thành
       finding sai hẳn bản chất. -->

## 1. Luật (capability)

- [ ] 1.1 <!-- Requirement nào ADDED/MODIFIED ở specs/<capability>/spec.md của change, và test nào khoá nó -->

## 2. Kiểu & hợp đồng

- [ ] 2.1 <!-- Kiểu dùng chung: packages/shared/src/types.ts -->
- [ ] 2.2 <!-- Khai module/hàm mới vào bảng của checkmate.yml -->

## 3. Engine (packages/harness)

- [ ] 3.1 <!-- ... -->

## 4. Web (apps/web)

- [ ] 4.1 <!-- ... -->

## 5. Test

- [ ] 5.1 <!-- Ca khoá hành vi cho TỪNG luật R mới -->
- [ ] 5.2 <!-- npx tsc --noEmit sạch + npm test xanh toàn bộ -->
