## Unit / hàm thuần

### [phanLoaiPr]
- [x] T1.1 [Scenario «PR chỉ đổi tài liệu và cấu hình quy trình»]: GIVEN `['CLAUDE.md','openspec/config.yaml','openspec/schemas/checkmate/schema.yaml']` WHEN gọi `phanLoaiPr` THEN `loai === 'doc'` và `fileDoc` là file `.md`
- [x] T1.2 [Scenario «PR trộn tài liệu với mã nguồn»]: GIVEN `['AGENTS.md','GEMINI.md','test/huong-dan-harness.test.ts']` THEN `loai === 'code'` và `lyDo` nêu đúng tên file `.ts`
- [x] T1.3 [Scenario «file cấu hình mà ENGINE đọc»]: GIVEN `['checkmate.yml']` THEN `loai === 'code'` — engine đọc file này nên nó KHÔNG phải văn bản thuần
- [x] T1.4 [Scenario «file CI»]: GIVEN `['.github/workflows/ci.yml']` THEN `loai === 'code'`
- [x] T1.5 [Scenario «không có .md nào»]: GIVEN `['openspec/schemas/checkmate/schema.yaml']` THEN `loai === 'code'` — skill doc không có tài liệu để đọc
- [x] T1.6 [Biên — fail-closed]: GIVEN đuôi lạ chưa từng thấy `['deploy/script.sh']`, `['Makefile']`, `['apps/web/src/a.tsx']` THEN tất cả `loai === 'code'`
- [x] T1.7 [Biên — hoa/thường]: GIVEN `['README.MD','NOTES.Txt']` THEN `loai === 'doc'` (so đuôi không phân biệt hoa thường như bản cũ)
- [x] T1.8 [Scenario «quyết định phải được nói ra»]: mọi ca trên đều trả `lyDo` không rỗng, và ca code nêu ĐÚNG file gây ra quyết định

## Tích hợp (đĩa, SQLite, khoá)

- [N/A] Change không chạm đĩa, DB, hay khoá liên tiến trình — chỉ là một hàm thuần cộng một dòng log.

## Ca đối kháng & hồi quy

- [x] T3.1 Đầu vào KHUYẾT: `[]` (không file nào) → `phanLoaiPr` không được ném; `fetchVaRouter` vẫn giữ lỗi «PR không có file thay đổi» như trước
- [x] T3.2 Đường dẫn lắt léo: `openspec` là TIỀN TỐ tên file chứ không phải thư mục (`openspec-notes.js`) → phải là code, không được ăn nhầm allowlist
- [x] T3.3 File `.md` nằm sâu trong thư mục code (`apps/web/src/README.md`) → vẫn là văn bản thuần

## Trục nhạy cảm

- [N/A] T_bimat — change không chạm token/khoá/mật khẩu/giá trị người dùng gõ; chỉ đọc TÊN file trong diff
- [x] T_failclosed — nghi ngờ thì đi code: đuôi lạ, đường dẫn lạ, danh sách rỗng đều KHÔNG được rơi sang doc (T1.6, T3.1, T3.2)
- [N/A] T_cong — không chạm cổng merge, vai, hay ba mức tự động
- [x] T_khongtincay — tên file trong diff là dữ liệu do maker đặt: tên lạ/đường dẫn lắt léo không được lái định tuyến sang đường nhẹ tay hơn (T3.2)
- [x] T_hopdong — `phanLoaiPr` là export mới → phải khai vào bảng module `checkmate.yml`, lưới `hop-dong-repo` xanh

## Kiểm tay

- [x] T5.1 Mở một PR chỉ đổi tài liệu trên repo thật, xem log lượt chấm có nói rõ skill nào và vì sao
