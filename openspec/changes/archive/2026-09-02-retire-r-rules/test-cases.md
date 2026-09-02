# Test cases — retire-r-rules (umbrella)

Mỗi ca ghi Requirement/scenario sinh ra nó. Requirement duy nhất đổi ở change này: **«Định tuyến theo
file thực thi được, fail-closed»** (`dinh-tuyen-skill-cham`). Phần còn lại là lưới bảo toàn (bảng tra,
dời file) — không có luật mới, nhưng có cơ chế mới phải khoá.

## Unit / hàm thuần

### classifyPr(files, specPatterns?)
- [x] T1.1 [Scenario: PR chỉ sửa luật ở nguồn spec repo đã khai]: GIVEN mẫu `['openspec/specs/**/*.md']`
      WHEN files = `['openspec/specs/merge-gate/spec.md']` THEN `loai = 'code'`, `lyDo` nêu file đó và
      mẫu khớp.
- [x] T1.2 [Scenario: nguồn spec ở thư mục không tên `specs/`]: GIVEN mẫu `['docs/spec/**/*.md']` WHEN
      files = `['docs/spec/rules.md']` THEN `code`.
- [x] T1.3 [Scenario: tài liệu quy trình không thuộc nguồn spec vẫn đi đường doc]: GIVEN mẫu
      `['openspec/specs/**/*.md']` WHEN files = `['openspec/changes/x/proposal.md']` THEN `doc`,
      `fileDocUngVien` chứa file đó.
- [x] T1.4 [Scenario: không đọc được cấu hình nguồn thì lệch về phía code]: GIVEN specPatterns vắng
      WHEN files = `['specs/rules.md']` THEN `code` (khớp ứng viên mặc định `specs/**/*.md`), `lyDo` nói
      dùng danh sách mặc định.
- [x] T1.5 [Biên — bốn scenario cũ giữ nguyên]: `CLAUDE.md + openspec/config.yaml + schema.yaml` → doc ·
      `AGENTS.md + GEMINI.md + test/x.test.ts` → code · `checkmate.yml` → code · `.github/workflows/ci.yml`
      → code — với mẫu mặc định lẫn mẫu khai `['openspec/specs/**/*.md']`.
- [x] T1.6 [Biên]: mẫu khai là mảng RỖNG (repo khai toàn đường bị loại) → coi như không khai → mặc định.
- [x] T1.7 [Biên]: file khớp nguồn spec nhưng đuôi `.txt`/`.yaml` (repo khai `sources.specs: docs/spec/**`)
      → vẫn code — nguồn quyết, đuôi không quyết.

### Bảng tra `docs/r-rules-map.md` (parser trong lưới)
- [x] T1.8 [D4]: mọi hàng đủ 5 cột; `bucket` ∈ {invariant, housed, pending, precedent, minutes, obsolete,
      dropped}; hàng `pending` có `home` là tên change trong bảng chia; hàng `housed` có `home` dạng
      `<cap> › <tiêu đề>` và tiêu đề tồn tại trong `openspec/specs/<cap>/spec.md`.
- [x] T1.9 [Biên]: hai hàng cùng `code` khác `bucket` (luật + án lệ) là hợp lệ; hai hàng cùng `code` cùng
      `bucket` là lỗi.

## Tích hợp (đĩa, SQLite, khoá)

### fetchAndRoute đọc `sources` của repo đích
- [x] T2.1 [Happy]: thư mục repo tạm có `checkmate.yml` khai `sources.specs: docs/spec/**/*.md` → PR chỉ đổi
      `docs/spec/a.md` → code; log ghi mẫu.
- [x] T2.2 [Đời cũ]: repo không có `checkmate.yml` → mặc định; hành vi bốn scenario cũ không đổi.
- [x] T2.3 [Hỏng]: `checkmate.yml` sai cú pháp → `readSourcesCfg` trả null (không ném) → mặc định + log
      «không đọc được cấu hình nguồn»; không có dòng nào của file hỏng lọt vào log (đi qua
      `loiCuPhapAnToan`).

### Dời file (kiểm một lần lúc apply, task 1.3)
- [x] T2.4 `specs/` không còn `R*.md`; `docs/archive/r-rules/` có đúng 13 file; mỗi file: dòng đầu là
      banner, phần sau banner khớp byte với `git show HEAD~1:specs/<tên>`.
- [x] T2.5 Tự chấm với `checkmate.yml` mới đọc nguồn ra chỉ `openspec/specs/**` (số đơn vị ≈ 42), báo
      cáo nguồn không có dòng ⚠ nào.

## Ca đối kháng & hồi quy

- [x] T3.1 [KHUYẾT ở mọi tầng]: `classifyPr(files, null)` · `(files, 'specs/**')` (chuỗi, không phải mảng)
      · `(files, [null, 5, ''])` → không ném, phần tử lạ bị bỏ, rơi về mặc định khi không còn mẫu nào —
      cùng khuôn fail-closed đã có cho `files` (R13.8 → hàng bảng tra).
- [x] T3.2 [Mẫu độc — repo khai `**`]: mọi file khớp → mọi PR về code, `lyDo` nêu mẫu. Chỉ có thể làm
      router CHẶT hơn, không lỏng hơn — đó là chiều an toàn.
- [x] T3.3 [Tái lập ca đã gãy — PR #32]: PR chỉ đổi `openspec/specs/spec-source/spec.md` với router hôm
      nay đi **doc** (ca đỏ trước fix, xanh sau fix). Test load-bearing hai chiều: tạm no-op phép khớp
      nguồn → ca này đỏ lại.
- [x] T3.4 [Con trỏ mồ côi]: chèn một mã giả KHÔNG có hàng (chữ R + hai số + số con, không viết ra đây kẻo
      chính lưới bắt file này) vào `DEPLOY.md` → lưới đỏ, nêu đúng `DEPLOY.md:210` và mã đó (đã kiểm 02/09,
      file trả nguyên). Mã ví dụ đã có hàng `obsolete` (như mã thử trong test) thì không dùng được cho ca này.
- [x] T3.5 [Hồi quy sources.test]: `readSources` với `checkmate.yml` của chính repo sau 1.4 → không còn
      probe nào ở `specs/*.md`; không ⚠ «không khớp file nào» (vì mẫu đã bỏ, không để mẫu chết).

## Trục nhạy cảm

- [N/A] T_bimat — change không chạm bí mật; router chỉ đọc TÊN file và mẫu glob; lỗi cú pháp `checkmate.yml`
      đi qua `loiCuPhapAnToan` sẵn có (T2.3 khoá việc không in nội dung file).
- [x] T_failclosed — T1.4 · T1.6 · T3.1 · T3.2: mọi nhánh không chắc của router → code; không có nhánh
      nào biến «không đọc được cấu hình» thành «mọi thứ là tài liệu».
- [N/A] T_cong — change không chạm cổng merge, vai, hay ba mức tự động; bảng tra ghi R6.19 → ⛔C1 và lưới
      T1.8 xác nhận hàng đó tồn tại — luật «máy không bao giờ merge» không mất nhà khi dời R.
- [x] T_khongtincay — mẫu nguồn đọc từ `checkmate.yml` của repo đích là DỮ LIỆU: chỉ được đem so tên file
      (`matchPattern`), không được chạy, không được đưa vào prompt; T3.2 chứng minh dữ liệu đó chỉ siết
      được router, không nới được.
- [x] T_hopdong — nếu 3.1 tách hàm export mới ở `github.ts` thì khai bảng `checkmate.yml`; lưới
      `test/hop-dong-repo.test.ts` xanh (task 4.1).

## Kiểm tay

- [x] T5.1 Đọc lại `AGENTS.md` sau 2.1: sáu ⛔C đọc trôi không cần ngoặc mã R; mục «Chỗ sống của luật»
      không còn câu nào về `specs/R*.md`.
- [x] T5.2 Mở `docs/archive/r-rules/R6-verdict-va-cong-merge.md`: banner ở dòng đầu nói rõ «đã gỡ, xem
      bảng tra», không thể nhầm là luật đang hiệu lực.
- [x] T5.3 Đọc `docs/r-rules-map.md` như người tra cứu: từ `(R6.26)` trong một chú thích code, tìm ra
      nhà mới trong dưới một phút.
