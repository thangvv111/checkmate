# Test cases — empty-repo-list-is-a-real-state

Bề mặt đếm bằng máy ở `tasks.md` §0: **47 chỗ** đọc repo đang chọn · **3 đường** khởi lượt chấm · **1 gác**
trước change.

## Unit / hàm thuần

### dsRepoTuLuu — bốn ca, và hai trong đó bản cũ gộp làm một

- [x] T1.1 [Scenario «danh sách rỗng khai tường minh»]: `{ repos: [] }` → **rỗng**. Không repo mặc định.
- [x] T1.2 [Scenario «cấu hình đời cũ một repo đơn lẻ»]: `{ repo: X }` (không có `repos`) → `[X]`.
      **Chiều hại ngược**: trả rỗng ở đây là làm người dùng đời cũ mất repo trên giao diện.
- [x] T1.3 [Scenario «cấu hình trắng»]: `{}` → **rỗng**.
- [x] T1.4 `{ repos: [A, B] }` → `[A, B]` nguyên vẹn.
- [x] T1.5 [Biên] `{ repos: [], repo: X }` → **rỗng** — trường danh sách CÓ MẶT thì nó là nguồn sự thật,
      `repo` đời cũ không được lấn.

### resolveRepoShape khi rỗng

- [x] T2.1 Rỗng → `repos: []`, `repo_dang_chon: ''`, `repo: undefined` — không ném.
- [x] T2.2 `repo_dang_chon` trỏ repo đã bị gỡ → rơi về phần tử đầu (R4.4 giữ nguyên).

### laRepoDaKhai

- [x] T3.1 Khớp → true. Không khớp → false.
- [x] T3.2 Khác hoa thường → vẫn khớp (GitHub coi `Owner/Repo` và `owner/repo` là một).
- [x] T3.3 Danh sách rỗng → false với mọi tên.
- [x] T3.4 [Đầu vào khuyết] danh sách null · tên rỗng · tên null → false, không ném.

### coRepo — kiểu cưỡng chế

- [x] T4.1 [Scenario «đã qua phép kiểm»]: sau `coRepo(c)` thì `c.repo` dùng được, không cần kiểm lại.
- [x] T4.2 [Scenario «gọi hàm cần repo mà chưa kiểm»]: quét `github.ts` — 9 hàm khai `CauHinhCoRepo`,
      không hàm nào còn nhận `CheckmateConfig` rồi tự đọc `cfg.repo`.

## Ba đường một gác

- [x] T5.1 **Cùng đầu vào, ba đường CÙNG quyết định**: với danh sách đã khai cho trước và một tên repo,
      quyết định của webhook, của trực và của đường bấm tay giống nhau — quét trên bộ đầu vào phủ cả
      khớp/không khớp/rỗng. *(Không có ca này thì «dùng chung» là lời hứa, không phải tính chất.)*
- [x] T5.2 [Scenario «chế độ trực khi chưa có repo»]: rỗng → không quét, không khởi lượt nào.
- [x] T5.3 [Scenario «bấm tay khi chưa có repo»]: từ chối kèm lý do đọc được.
- [x] T5.4 [Scenario «chưa khai repo nào» — webhook]: payload hợp lệ + danh sách rỗng → từ chối.

## Tích hợp (giao diện thật)

- [x] T6.1 [Scenario «bề mặt đọc khi chưa có repo»]: màn chính nói «chưa kết nối repo nào», có lối đi tới
      Cấu hình.
- [x] T6.2 Không bề mặt nào bày tên repo mặc định cũ — quét HTML tìm `demo-credit-approval`.
- [x] T6.3 Trạng thái rỗng KHÔNG dùng màu FAIL — vừa cài xong không phải là hỏng *(vế đối chứng: màn
      thiếu token VẪN dùng semantic)*.

## Ca đối kháng & hồi quy

- [x] T7.1 [Ca đã gãy trên PROD] Tái hiện đúng cảnh: `repos: []` + trực BẬT → bản cũ khởi lượt chấm trên
      repo ma; bản mới không khởi gì.
- [x] T7.2 [Đầu vào KHUYẾT mọi tầng] `luu` null · `repos` sai kiểu · phần tử null → không hàm nào ném.
      **Ca này ĐỎ ở lượt chạy đầu và nó đúng:** `repos: [null]` làm `readConfig` ném, tức mọi màn chết — kể cả
      màn Cấu hình, đúng lối thoát duy nhất để sửa lại dòng vừa gõ sai. Sinh ra `usableRepos` + ca T7.2b.
- [x] T7.2b [Đường cứu hộ ⛔C6] Mục repo sai hình dạng bị **bỏ và NÓI RA** (`console.error` nêu đúng chỉ số),
      không bỏ trong im lặng — cùng khuôn với `locKhoaBiet`.
- [x] T7.3 [Biên] Đúng một repo → mọi đường hoạt động bình thường như trước change.

## Trục nhạy cảm

- [x] T_bimat — gỡ repo khỏi cấu hình KHÔNG làm chìa riêng của repo khác rò ra; danh sách rỗng không in
  token nào ra HTML hay log.
- [x] T_failclosed — ⛔C2: rỗng ⇒ TỪ CHỐI chấm ở cả ba đường. «Không biết repo nào» không được thành
  «đoán lấy một repo».
- [x] T_cong — change không thêm đường nào cho máy merge; gác mới chỉ CHẶN, không mở.
- [N/A] T_khongtincay — không đưa dữ liệu ngoài mới vào prompt. Tên repo trong payload webhook vẫn qua
  đúng đường kiểm hình dạng đã có.
- [x] T_hopdong — export mới (`coRepo`, `laRepoDaKhai`, `CauHinhCoRepo`) khai đủ `checkmate.yml`.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [x] T8.1 Trả `dsRepoTuLuu` về bản cũ → T1.1 ĐỎ.
- [x] T8.2 `REPO_DEMO` trở lại `MAC_DINH.repos` → T6.2 ĐỎ.
- [x] T8.3 Bỏ gác ở đường trực → T5.2 ĐỎ.
- [x] T8.4 Bỏ gác ở đường bấm tay → T5.3 ĐỎ.
- [x] T8.5 Webhook dựng lại biểu thức riêng → T5.1 ĐỎ *(cửa song sinh)*.
- [x] T8.6 `dsRepoTuLuu` trả rỗng cả cho cấu hình đời cũ → T1.2 ĐỎ *(chiều hại ngược)*.
- [x] T8.7 Đột biến sống sót → bảng ba đường. **Đã dùng:** M3/M4 lượt đầu rơi vào hàng «đột biến không áp
      dụng được» (mốc LF vs file CRLF), không phải hàng «ca không load-bearing».

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T9.1 Server thật với `repos: []` và trực BẬT, chờ qua một chu kỳ 300s: 0 lượt chấm, `runs/` và
      `probes-lib/` vẫn rỗng.
- [x] T9.2 Mở màn chính: nói đúng, chỉ đúng đường, không repo ma.

## Kết quả

`npx tsc --noEmit` sạch · `npm test` **65 tệp / 1103 ca xanh** · mutation **6/6 bị bắt**, hai lượt nhất quán ·
kiểm tay chạy thật đã tick SAU khi chạy, không tick trước.
