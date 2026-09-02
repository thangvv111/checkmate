# Test cases — product-independent-of-openspec

Requirement sinh ra: `kien-truc-tang › Gói deploy chỉ mang sản phẩm, không mang hồ sơ xây dựng` (R-A) và
`kien-truc-tang › Sản phẩm không đọc hồ sơ xây dựng của chính nó lúc chạy` (R-B).

## Unit / hàm thuần

### parse exclude của `scripts/pack-deploy.sh` (trong lưới)
- [x] T1.1 [R-A, scenario đóng gói đúng]: GIVEN script hiện tại WHEN parse mọi token `--exclude=…` THEN tập
      exclude chứa `checkmate/openspec` · `checkmate/docs` · `checkmate/test` · `checkmate/bench` ·
      `checkmate/_ref` · `checkmate/.claude`.
- [x] T1.2 [R-A, scenario thêm thư mục quên loại]: GIVEN danh sách cấp một git theo dõi (+ `_ref`) WHEN có
      mục ngoài `PRODUCT_ALLOW` mà exclude không có `checkmate/<tên>` lẫn `<tên>` THEN đỏ, thông điệp nêu tên.
- [x] T1.3 [R-A, scenario repo demo không bị cắt nhầm]: exclude KHÔNG chứa `test` trơ, `docs` trơ,
      `openspec` trơ — chỉ dạng neo `checkmate/…` (các tên dữ liệu `runs`, `web-runs`, `probes-lib` trơ
      được phép).
- [x] T1.4 [Biên]: script không có `--exclude=` nào → đỏ («không parse được exclude») — lưới không xanh trên
      script rỗng.
- [x] T1.5 [Biên]: `PRODUCT_ALLOW` chỉ gồm bảy mục (D2); mục nào trong allow mà không tồn tại trong repo →
      đỏ (danh sách chết).

## Tích hợp (đĩa, SQLite, khoá)

### chạy script thật (6.2 — kiểm tay lúc apply, không phải lưới)
- [x] T2.1 [Happy]: `bash scripts/pack-deploy.sh` trên máy dev → gói tạo được; `tar -tzf` không có
      `checkmate/openspec/`, có `demo-credit-approval/test/`; tự kiểm im lặng.
- [x] T2.3 [Hỏng]: cố tình để một file bí mật trong cây → tự kiểm in dòng, thoát mã khác 0 — khuôn tự kiểm
      cũ (DEPLOY.md:185) giữ nguyên tác dụng.

## Ca đối kháng & hồi quy

- [x] T3.1 [R-B, cắt-folder]: dời `openspec` `docs` `test` `bench` `.claude` → `tsc` sạch, `npm run web`
      lên cổng; trả lại (5.2).
- [x] T3.2 [Mutation lưới]: thêm `zz-tmp/x.txt` cấp một → lưới đỏ nêu `zz-tmp`; xoá (5.3).
- [x] T3.3 [Lịch sử]: ca đã đo 02/09 — gói cũ mang `openspec/` lên máy chủ mà không ai thấy; lưới mới đỏ
      nếu ai đó bỏ dòng `--exclude=checkmate/openspec`.

## Trục nhạy cảm

- [x] T_bimat — tự kiểm gói vẫn grep `secrets|/config\.json|ncc-verify|web-runs/|probes-lib/|checkmate/runs/`
      (T2.3); script không in nội dung file nào, chỉ in tên mục vi phạm.
- [N/A] T_failclosed — không chạm engine, verdict.
- [N/A] T_cong — không chạm cổng merge, vai, ba mức tự động.
- [N/A] T_khongtincay — không chạm prompt, diff, trả lời model.
- [x] T_hopdong — không thêm export; `test/hop-dong-repo.test.ts` xanh (không có module mới trong
      `packages/`, `apps/`).

## Kiểm tay

- [x] T5.1 Đọc lại CLAUDE.md dòng 3 + «Chỗ sống của luật» sau 4.1: câu về luật đúng theo D5, không còn
      «luật hiệu lực ở openspec/specs».
- [x] T5.2 Mở đầu `docs/r-rules-map.md`: mục «Ba đích của backfill» đọc hiểu được; bảy hàng precedent thấy
      rõ «ứng viên kho khuôn».

## Sau-merge — kiểm ở lần deploy đầu trên máy chủ (KHÔNG thuộc change này)

Hai ca chỉ kiểm được trên máy chủ thật; ghi ở đây để không ai tưởng đã xong, và không chặn archive.

- [ ] T2.2 [Đời cũ]: máy chủ còn `~/checkmate-app/checkmate/openspec` từ deploy trước → bước dọn một lần
      xoá đúng thư mục hồ sơ, `web-runs`/`probes-lib`/`runs`/`repos`/bí mật còn nguyên (đối chiếu số bước 4).
- [ ] T5.3 Sau deploy đầu tiên bằng script: chạy một lượt chấm demo trên máy chủ để xác nhận gói không
      thiếu thứ sản phẩm cần (ghi vào DEPLOY.md như bước xác nhận).
