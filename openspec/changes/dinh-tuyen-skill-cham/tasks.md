## 1. Luật (specs/R*.md)

- [x] 1.1 Tạo `specs/R13-dinh-tuyen-skill.md` với R13.1–R13.5: định tuyến theo file thực thi được ·
      allowlist hẹp fail-closed · `openspec/**` là tài liệu quy trình còn `checkmate.yml` thì không ·
      đường doc đòi ≥1 file `.md` · quyết định phải được ghi ra log kèm lý do

## 2. Kiểu & hợp đồng

- [x] 2.1 Thêm `lyDoDinhTuyen: string` vào `PrDaFetch` (apps/web/src/github.ts)
- [x] 2.2 Khai hàm `phanLoaiPr` vào bảng module của `checkmate.yml`

## 3. Web (apps/web)

- [x] 3.1 Viết hàm thuần `phanLoaiPr(filesDoi)` → `{ loai, lyDo, fileDoc? }`, không I/O
- [x] 3.2 `fetchVaRouter` gọi `phanLoaiPr`, giữ nguyên phép chọn file `.md` nhiều dòng đổi nhất
- [x] 3.3 Ghi log quyết định định tuyến kèm lý do và file gây ra nó

## 4. Test

- [x] 4.1 Ca cho từng scenario trong spec (doc thuần · trộn code · `checkmate.yml` · CI · không có .md)
- [x] 4.2 Ca fail-closed: đuôi file lạ chưa từng thấy → code
- [x] 4.3 `npx tsc --noEmit` sạch + `npm test` xanh toàn bộ
