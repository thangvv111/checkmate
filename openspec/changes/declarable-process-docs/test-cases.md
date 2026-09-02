# Test cases — declarable-process-docs

Requirement: `dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed` (R-1) và
`spec-source › Nguồn spec do repo đích khai, không do engine áp đặt` (R-2).

## Unit / hàm thuần

### laThuMucQuyTrinh
- [ ] T1.1 [R-1 khai riêng]: mẫu `['rfcs/']` · file `rfcs/0007-cache.md` → true; `docs/a.md` → false.
- [ ] T1.2 [R-1 hoa thường]: mẫu `['openspec/']` · file `OpenSpec/config.yaml` → **false** (Linux phân biệt
      hoa thường cho tên thư mục — giữ đúng tính chất đã chốt của luật định tuyến).
- [ ] T1.3 [Biên]: mẫu khai không có dấu `/` cuối (`'rfcs'`) vẫn khớp `rfcs/x.md` nhưng KHÔNG khớp
      `rfcs-notes.md` — so cấu trúc, không so tiền tố chuỗi.
- [ ] T1.4 [Biên]: file có `\` trong tên (`openspec\hack.ts`) KHÔNG được chuẩn hoá thành `/` — nó là tên
      file thật ở gốc repo, không nằm dưới thư mục nào.

### readSourcesCfg — khoá process_docs
- [ ] T2.1 [R-2 khai hợp lệ]: `sources.process_docs: rfcs/` → `['rfcs/']`; danh sách nhiều mục cũng nhận.
- [ ] T2.2 [R-2 đường ngoài repo]: `/etc/`, `../x/`, `C:\y\` → vào `rejected` kèm lý do, phần hợp lệ giữ lại.
- [ ] T2.3 [R-1 mẫu chạm gốc]: `**`, `*`, `''`, `.`, `/` → `rejected` kèm lý do «phải có ít nhất một tầng
      thư mục»; không mục hợp lệ nào còn lại → coi như không khai (mặc định `openspec/`).
- [ ] T2.4 [Đời cũ]: `checkmate.yml` không có `process_docs` → trường vắng, hành vi router y hệt hôm nay.

## Tích hợp (đĩa, SQLite, khoá)

### classifyPr với mẫu thư mục quy trình
- [ ] T3.1 [R-1 scenario «khai thư mục riêng»]: mẫu `['rfcs/']`, files `['rfcs/0007-cache.md']` → doc.
- [ ] T3.2 [R-1 scenario «file mã nguồn trong thư mục đã khai»]: mẫu `['rfcs/']`, files `['rfcs/tool.ts']`
      → code (đuôi là hằng của engine, repo không khai đè được).
- [ ] T3.3 [R-1 scenario «nguồn spec thắng»]: process_docs `['openspec/']` + specs
      `['openspec/specs/**/*.md']`, files `['openspec/specs/merge-gate/spec.md']` → code.
- [ ] T3.4 [R-1 scenario «mẫu chạm gốc»]: mẫu `['**']` → bị loại, rơi về mặc định `openspec/`; files
      `['.github/workflows/ci.yml']` vẫn → code.
- [ ] T3.5 [Không khai]: mọi ca cũ của `dinh-tuyen-skill.test.ts` giữ nguyên kết quả khi tham số thứ ba vắng.

## Ca đối kháng & hồi quy

- [ ] T4.1 [KHUYẾT ở mọi tầng]: tham số thứ ba là `null` · `'rfcs/'` (chuỗi, không phải mảng) · `[null, 5]`
      → không ném, rơi về mặc định.
- [ ] T4.2 [Mẫu độc]: repo khai `process_docs: .github/` → `ci.yml` thành tài liệu. Đây là quyết định CÓ Ý
      của repo đích và khai được; ca này khoá rằng nó CHỈ xảy ra khi khai tường minh, không bao giờ do mặc
      định (đối chứng: không khai → `ci.yml` là code).
- [ ] T4.3 [Mutation]: bỏ gác tầng-thư-mục · bỏ thứ tự nguồn-spec-thắng · cho khai đè đuôi → lưới đỏ.

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật; chỉ đọc tên file và mẫu thư mục.
- [ ] T_failclosed — T2.3 · T3.4 · T4.1: mẫu không hợp lệ hoặc đầu vào méo → rơi về mặc định `openspec/`,
      KHÔNG rơi về «mọi thứ là tài liệu».
- [N/A] T_cong — không chạm cổng merge, vai, ba mức tự động.
- [ ] T_khongtincay — T4.2: mẫu từ `checkmate.yml` của repo đích là dữ liệu; nó chỉ được đem so tên file,
      và PR đổi chính `checkmate.yml` luôn đi đường code nên không tự nới rồi tự qua cổng trong một PR.
- [ ] T_hopdong — export mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T5.1 Đọc lại log định tuyến của một lượt giả: mẫu bị từ chối có hiện ra, nói rõ mẫu nào và vì sao.
