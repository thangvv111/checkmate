# Tasks — bỏ ép hình dạng repo đích

Bốn commit: đơn vị luật → nguồn spec cấu hình được → khai ra khi không có luật → dọn nốt hard-code.

## 1. Commit 1 — ĐƠN VỊ LUẬT TỔNG QUÁT

- [ ] 1.1 `target.ts` — hàm chia spec thành **đơn vị có địa chỉ**: đơn vị = khối dưới một tiêu đề,
      địa chỉ = đường tiêu đề. Có **trần độ sâu** để tài liệu chia nhỏ không vỡ thành hàng trăm đơn vị.
- [ ] 1.2 Mã ngắn (`R4.21`, `US-12`, `AC3`) nhận làm địa chỉ **trường hợp riêng**: tiêu đề mở đầu bằng
      mã thì mã đó cũng trỏ được vào đơn vị ấy. KHÔNG dựng một đường mã chạy song song.
- [ ] 1.3 `isNewRule` / `luat_da_phu` / `luat_tong` đọc theo đơn vị thay vì theo tập mã.
- [ ] 1.4 `findNewRules` so **đơn vị** giữa hai nhánh thay vì so mã. GIỮ NGUYÊN fail-closed: không đọc
      được spec nhánh gốc thì KHÔNG phong luật-mới cho ai — change này không được nới chỗ đó.
- [ ] 1.5 `probe-library.chuanRule` so địa chỉ đơn vị. Probe cũ trong thư viện (neo theo mã) phải đọc
      lại được — thư viện regression là tài sản đắt nhất của sản phẩm.
- [ ] 1.6 Lưới: spec KHÔNG mã nào → vẫn ra đơn vị, probe vẫn neo được. Vế đối chứng: spec CÓ mã → mã
      vẫn neo đúng đơn vị mang nó.

## 2. Commit 2 — NGUỒN SPEC CẤU HÌNH ĐƯỢC

- [ ] 2.1 `runner.ts` — `checkmate.yml` thêm mục khai nguồn: đường spec (nhiều đường, glob, đệ quy),
      tài liệu API, file test mẫu.
- [ ] 2.2 `readTarget` đọc theo cấu hình đó. Bỏ `join(repo,'specs')` · `.endsWith('.md')` · đọc phẳng ·
      `README.md` · `join(repo,'test')` khỏi vị trí quyết định.
- [ ] 2.3 Không khai → **tự dò** theo thứ tự thông dụng. Dò HẸP còn hơn nạp nhầm: thà báo «không thấy»
      còn hơn chấm theo một văn bản không phải spec.
- [ ] 2.4 **Dò tìm phải BÁO CÁO** — đã tìm ở đâu, mỗi chỗ thấy gì. Dò âm thầm là cách êm nhất để đọc
      nhầm chỗ mà không ai biết; cùng nguyên tắc với `ngoaiTamNhin` của diff.
- [ ] 2.5 Đường khai trỏ vào chỗ không khớp file nào → nói rõ đường đó, đừng im lặng bỏ qua.
- [ ] 2.6 `checkmate.yml` của CHÍNH repo này khai nguồn spec — ca dùng thật đầu tiên, và là cách bắt
      lỗi thiết kế sớm nhất.

## 3. Commit 3 — KHÔNG CÓ LUẬT THÌ KHAI RA (PO chốt vế hai)

- [ ] 3.1 `types.ts` — thêm trường **tuỳ chọn** vào `Verdict` khai nguồn luật và số đơn vị đọc được.
      ⛔ CHỈ THÊM: `Verdict` bị `JSON.stringify` nguyên khối xuống DB.
- [ ] 3.2 Độ phủ khi không có đơn vị nào: khai **không đo được**, KHÔNG khai `0`. `0` là phép đo đã
      thực hiện; không-đo-được là không có mẫu số. Một chữ số cho hai tình trạng là để người đọc tin nhầm.
- [ ] 3.3 Prompt sinh probe khi khối luật rỗng: **bỏ câu «mọi probe phải neo vào một luật ở đây»** và
      nói thẳng lượt này không có luật đối chiếu. Bảo model neo vào chỗ trống là đẩy nó đi bịa chỗ neo.
- [ ] 3.4 Màn Run: cảnh báo «chấm không có luật đối chiếu» cùng hạng với vùng-mù-diff và
      không-có-đối-chứng — đứng TRƯỚC verdict, vì nó đổi cách đọc verdict.
- [ ] 3.5 Bảng số liệu verdict khai nguồn luật đã lấy + số đơn vị.
- [ ] 3.6 Lưới: không spec → vẫn chấm, verdict khai rõ, độ phủ là không-đo-được. Vế đối chứng: CÓ spec
      → không cảnh báo nào, độ phủ đo bình thường.

## 4. Commit 4 — DỌN NỐT HARD-CODE

- [ ] 4.1 `skill-doc.ts:114` — gỡ tham chiếu `specs/R12`. Giữ tri thức, bỏ con trỏ: repo đích không có
      file đó, và sản phẩm nói về tài liệu nội bộ của mình giữa lượt phục vụ khách là rò ranh giới.
- [ ] 4.2 Sửa nhãn bước 2 skill doc: «4 loại lỗi khách quan» → đúng **bảy** loại rubric đang dùng.
- [ ] 4.3 Rà lại toàn engine một lượt cuối, tìm chỗ hard-code cùng loại còn sót — và **ghi ra** cái
      tìm được kể cả khi không sửa trong đợt này.
- [ ] 4.4 Lưới chống tái phát: không file nào trong `packages/harness/src/` được nhắc tới đường dẫn
      nội bộ của CheckMate (`specs/R…`) trong chuỗi đi vào prompt.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 5.2 `demo-credit-approval` (spec có mã) vẫn đọc được, đơn vị và độ phủ ra đúng như trước —
      **hệ quả**, không phải mục tiêu thiết kế.
- [ ] 5.3 Dựng một repo thử có spec **không mã nào**, thư mục **không tên `specs/`**, có **thư mục con**
      → engine vẫn đọc ra đơn vị và probe vẫn neo được.
- [ ] 5.4 Repo **không có spec** → vẫn chấm, và cả ba chỗ (prompt · verdict · màn Run) đều khai rõ.
- [ ] 5.5 Đọc lại thư viện probe hiện có → không probe nào mất neo.

## 6. Sau-merge — nợ có tên, KHÔNG thuộc change này

- [ ] 6.1 Đọc spec **không phải văn bản có tiêu đề**: OpenAPI, JSON Schema, Gherkin `.feature`. Đường
      đơn vị-có-địa-chỉ đã mở cửa cho chúng, nhưng mỗi loại cần bộ chia riêng.
- [ ] 6.2 Mức 3 — chạy tiếp lượt dở (từ change trước).
- [ ] 6.3 Webhook GitHub (từ change trước).
- [ ] 6.4 Bỏ Basic Auth ở nginx — gói ba việc, rào `/login` đi trước (từ change trước).
- [ ] 6.5 Dựng lại nội dung 5 màn còn lại theo gói design.
