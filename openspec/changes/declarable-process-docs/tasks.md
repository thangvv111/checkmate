# Tasks — declarable-process-docs (nợ có tên #6)

## 1. Luật (capability)

- [x] 1.1 Delta MODIFIED `specs/dinh-tuyen-skill-cham/spec.md` (4 scenario mới) và
      `specs/spec-source/spec.md` (1 scenario mới) — đã viết. Test khoá: `test/dinh-tuyen-skill.test.ts`,
      `test/sources.test.ts`.

## 2. Kiểu & hợp đồng

- [x] 2.1 `packages/shared/src/spec-source.ts`: `SourceKey` thêm `process_docs`; `SourcesCfg.process_docs`;
      hằng `PROCESS_DOC_DIRS = ['openspec/']` và `PROCESS_DOC_EXTS`; `laThuMucQuyTrinh(file, mau)` so tiền
      tố thư mục ĐÚNG hoa thường (D3); `readSourcesCfg` đọc khoá mới qua cùng hàm `doc()` và loại mẫu
      không có tầng thư mục kèm lý do vào `rejected` (D1, D2, D4).
- [x] 2.2 `checkmate.yml` bảng module: dòng `spec-source.js` thêm export mới (⛔C5).

## 3. Web (apps/web)

- [x] 3.1 `github.ts` `classifyPr`: tham số thứ ba `mauThuMucQuyTrinh?` (vắng/méo → `PROCESS_DOC_DIRS`);
      thay `f.startsWith('openspec/')` bằng `laThuMucQuyTrinh`; `DUOI_QUY_TRINH` giữ nguyên là hằng của
      engine. Thứ tự kiểm KHÔNG đổi: nguồn spec vẫn thắng.
- [x] 3.2 `fetchAndRoute` truyền `nguonSpec?.process_docs`; in mọi mục `rejected` vào log định tuyến.

## 4. Test

- [x] 4.1 `test/dinh-tuyen-skill.test.ts`: bốn scenario mới (khai thư mục riêng · file mã nguồn trong thư
      mục đã khai · mẫu chạm gốc bị từ chối · nguồn spec thắng thư mục quy trình) + ca hoa thường
      (`OpenSpec/` ≠ `openspec/`) + ca mọi ca cũ giữ nguyên hành vi khi không khai.
- [x] 4.2 `test/sources.test.ts`: `readSourcesCfg` đọc `process_docs`; đường tuyệt đối / `..` / mẫu không
      có tầng thư mục → `rejected` kèm lý do; khai hợp lệ vẫn dùng được.
- [x] 4.3 Mutation: bỏ gác «phải có tầng thư mục» · bỏ thứ tự «nguồn spec thắng» · cho repo khai đè đuôi →
      mỗi cái phải làm lưới ĐỎ; ghi kết quả vào PR.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 `checkmate.yml` của chính repo: KHÔNG khai `process_docs` (mặc định `openspec/` đang đúng) — ghi
      rõ trong PR là đã cân nhắc và cố ý không khai.

## 6. Nợ có tên (ghi vào `named-debts` khi archive)

- [ ] 6.1 Mục 10 (mới, PO 03/09): `isPrRunning` ở `/api/runs` mang cùng lỗi với nợ #9 — nửa dữ liệu có
      test, nửa route không gọi được. Làm ngay sau khi đóng `verdict-contract` và change này.
- [ ] 6.2 Mục 6 đánh dấu ĐÃ RỜI: nửa «khai đè danh sách tự dò nguồn spec» xong từ `retire-r-rules`, nửa
      «thư mục tài liệu quy trình» xong ở change này.
