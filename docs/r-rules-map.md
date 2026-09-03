# R-rules map — bảng tra mã luật cũ `R<n>.<m>` → nhà mới

Sinh bởi change `retire-r-rules` (02/09/2026) từ 13 file `specs/R*.md` nay nằm ở `docs/archive/r-rules/` (chỉ đọc).
Mọi con trỏ `(R6.19)` trong code, test, `DEPLOY.md` tra ở đây. Lưới `test/r-rules-map.test.ts` đòi mọi mã trích trong
repo có hàng, hàng `pending` trỏ change có thật trong bảng chia, hàng `housed` trỏ requirement có thật.

| bucket | nghĩa | home |
|---|---|---|
| `invariant` | vi phạm là chặn merge vô điều kiện | `CLAUDE.md` ⛔C |
| `housed` | đã có requirement nói cùng điều | `<capability> › <tiêu đề requirement>` |
| `pending` | còn được code/test cưỡng chế, chưa có requirement — chờ change backfill | tên change |
| `precedent` | «vì sao» đúc từ vòng chấm thật, phải mang theo | đoạn «Vì sao» của requirement (hoặc `pending:`) |
| `obsolete` | cơ chế không còn tồn tại, hoặc mã chỉ là ví dụ | «thay bằng …» |
| `dropped` | PO bỏ hẳn, kèm cái mất — chỉ change capability được ghi | — |

Bảng chia change backfill (PO chốt 02/09): `merge-gate` · `verdict-contract` · `identity-session` · `probe-classification` · `data-layer` · `probe-library` · `target-contract` · `repo-history` · `provider-gate` · `model-reply-parsing` · `diff-visibility` · `concurrent-runs`.

Đếm: pending 75 · precedent 16 · housed 161 · invariant 6 · obsolete 4 — tổng 262 hàng.

## Ba đích của backfill (PO chốt 02/09 — change `product-independent-of-openspec`)

Luật vận hành của sản phẩm là **code + test + kho khuôn**; `openspec/` là hồ sơ xây dựng. Mỗi change backfill
phân từng điều `pending` về đúng một đích (điều mang cả luật lẫn án lệ thì hai hàng, hai đích):

| đích | đi đâu | nhận ra bằng |
|---|---|---|
| **a. hành vi sản phẩm** | code + test khoá; requirement trong `openspec/specs/` là hồ sơ đi kèm | điều nói «hệ thống PHẢI…» |
| **b. tri thức vận hành common** | **nạp vào sản phẩm**: kho khuôn `packages/harness/src/trigger-examples.ts` (qua cửa đào thải, trần N mỗi trigger) · prompt · `trigger-catalog.ts` · rubric | án lệ khái quát hoá được thành khuôn thử cho repo khác |
| **c. nguyên tắc xây dựng** | CLAUDE.md · config OpenSpec | cách làm việc trong repo, không phải hành vi sản phẩm |

Hàng `precedent` ghi «ứng viên kho khuôn (đích b)» là án lệ chưa có trong kho (kho 20 khuôn đã hút R6.26→KL9,
R5.20→KL10/13/14, R5.17→KL12, R5.19→KL11, R5.18→KL17, R13.8→KL8/16). Nạp hay không là quyết định của change
backfill tương ứng — không nhét thêm ngoài cửa đào thải.

## Bảng tra

| code | title | bucket | home | evidence |
|---|---|---|---|---|
| R1 | Phân loại probe bằng MÁY, đối chứng hai nhánh | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | test/dedup-probe.test.ts |
| R1.1 | `br` không có kết quả thì trạng thái PHẢI là `khong_chay` | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | test/phan-loai.test.ts |
| R1.2 | Probe `skipped` (bị bỏ qua, ví dụ `it.skip`) KHÔNG ĐƯỢC tính là `pass` | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | test/fixtures/verdict-doi-cu.json |
| R1.2 | probe `skipped` không được tính là pass — đường lách lưới rẻ nhất | precedent | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh (scenario «probe bị vô hiệu hoá») · ứng viên kho khuôn (đích b) | docs/archive/r-rules/R1-phan-loai-probe.md |
| R1.3 | Xanh cả hai nhánh → `pass`. | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | — |
| R1.4 | Đỏ ở nhánh gốc mà xanh ở nhánh PR → `cai_thien` | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | — |
| R1.5 | Đỏ ở nhánh PR mà xanh ở nhánh gốc → `hoi_quy` (regression | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | test/phan-loai.test.ts |
| R1.6 | Đỏ ở nhánh PR nhưng không có dữ liệu đối chứng (`bs` không tồn tại vì nhánh gốc không | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | — |
| R1.7 | Đỏ cả hai nhánh cùng nguyên nhân → `ngoai_pham_vi` | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | — |
| R1.8 | Đỏ cả hai nhánh nhưng khác nguyên nhân → `nghi_van`, đẩy cho model phân xử | housed | probe-classification › Máy phân loại probe theo bảng chân trị hai nhánh | — |
| R1.9 | Vân tay THÔ gột mọi chữ số, chuỗi hex dài và khoảng trắng thừa | housed | probe-classification › «Cùng nguyên nhân» quyết bằng vân tay hai tầng | — |
| R1.10 | Vân tay CHẶT giữ lại chữ số ngắn (status code, số đếm) nhưng vẫn gột thời lượng `ms`, | housed | probe-classification › «Cùng nguyên nhân» quyết bằng vân tay hai tầng | — |
| R1.11 | Chỉ khi vân tay thô trùng và vân tay chặt cũng trùng mới được kết luận `ngoai_pham_vi`. | housed | probe-classification › «Cùng nguyên nhân» quyết bằng vân tay hai tầng | — |
| R1.12 | Có ít nhất một probe `hoi_quy` thì verdict PHẢI là `FAIL`. | housed | verdict-contract › Hồi quy máy-xác-nhận có sàn cứng high, model không hạ được | test/verdict-contract.test.ts |
| R1.13 | Probe `nghi_van` không tự nó làm nên `FAIL`, nhưng PHẢI được nêu trong verdict để người | housed | verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ | test/verdict-contract.test.ts |
| R1.14 | Pull request thêm module mới thì nhánh gốc chưa có file đó, nên nhánh gốc không chạy | housed | probe-classification › Nhánh gốc không chạy được probe nào là ca bình thường, và phải nói ra | test/quan-sat-ngoai-pham-vi.test.ts |
| R1.15 | Trong ca đó, lượt sinh lại probe PHẢI được cho biết rằng nhánh gốc không có đối chứng, và | housed | probe-classification › Nhánh gốc không chạy được probe nào là ca bình thường, và phải nói ra | — |
| R1.16 | Hệ quả cần hiểu đúng: với pull request thêm tính năng mới, con đường DUY NHẤT để lượt chấm | housed | verdict-contract › PASS phải có bằng chứng — không probe nào chứng minh được gì thì KHÔNG ra verdict | test/phan-loai.test.ts |
| R1.17 | Khi một luật spec chỉ tồn tại ở nhánh PR mà không có ở nhánh gốc, nhánh gốc KHÔNG PHẢI | housed | probe-classification › Luật chỉ có ở nhánh PR: nhánh gốc không phải đối chứng hợp lệ | test/fixtures/verdict-doi-cu.json |
| R1.17 | đo hai lượt chấm khác đúng một biến: luật sẵn ở gốc → FAIL; PR mang cả luật lẫn code → ba probe bị dán `ngoai_pham_vi`, PASS | precedent | probe-classification › Luật chỉ có ở nhánh PR: nhánh gốc không phải đối chứng hợp lệ (đoạn «Vì sao») | docs/archive/r-rules/R1-phan-loai-probe.md |
| R1.18 | Trong ca đó, probe đỏ ở nhánh PR PHẢI mang nhãn `vi_pham_luat_moi`, và nhãn này chặn | housed | probe-classification › Luật chỉ có ở nhánh PR: nhánh gốc không phải đối chứng hợp lệ | test/fixtures/verdict-doi-cu.json |
| R1.19 | Luật «chỉ có ở nhánh PR» được xác định bằng cách so nội dung `specs/` giữa hai nhánh, không | housed | spec-source › Luật là ĐƠN VỊ CÓ ĐỊA CHỈ, không phải một mã có khuôn | openspec/specs/spec-source/spec.md |
| R1.20 | `vi_pham_luat_moi` PHẢI được phân biệt rõ với `hoi_quy` ở mọi bề mặt người đọc | housed | probe-classification › Luật chỉ có ở nhánh PR: nhánh gốc không phải đối chứng hợp lệ | test/phan-loai.test.ts |
| R1.21 | Mã luật mà mỗi probe neo vào PHẢI được ghi ra verdict, không chỉ sống trong lượt sinh | housed | man-run › Verdict phải khai cả phần yếu của chính lượt chấm | openspec/specs/man-run/spec.md |
| R1.22 | Verdict PHẢI nêu số luật đã có probe neo vào trên tổng số mã luật đọc được từ `specs/`. | housed | spec-source › Chấm KHÔNG có spec là trạng thái phải KHAI RA, không phải im lặng | openspec/specs/spec-source/spec.md |
| R2 | Hợp đồng với repo đích: `checkmate.yml` | pending | target-contract | test/dedup-probe.test.ts |
| R2.1 | Không có `checkmate.yml` thì `docRunnerCfg` PHẢI trả `null` để luồng rơi về đường vitest | pending | target-contract | test/spec-units.test.ts |
| R2.2 | Khai `runner` mà thiếu `test_cmd` thì coi như không khai runner (trả `null`) | pending | target-contract | test/spec-units.test.ts |
| R2.3 | `test_cmd` là template chứa hai placeholder (chỗ thay) | pending | target-contract | — |
| R2.4 | Các trường còn lại (`framework`, `probe_dir`, `probe_ext`, `timeout_s`) có mặc định | pending | target-contract | — |
| R2.5 | `timeout_s` PHẢI bị kẹp vào dải `[30, 1800]` giây | pending | target-contract | — |
| R2.6 | Hợp đồng kết quả là JUnit XML, bất kể repo chạy bằng vitest, pytest hay surefire. | pending | target-contract | — |
| R2.7 | Thẻ `<failure/>` rỗng vẫn PHẢI được đọc là `failed` | pending | target-contract | — |
| R2.8 | `testcase` nằm trong `testsuite` lồng nhau PHẢI được gom hết | pending | target-contract | — |
| R2.9 | XML không phải JUnit PHẢI trả danh sách rỗng, KHÔNG được ném lỗi làm sập lượt chấm. | pending | target-contract | — |
| R2.10 | Khối `review.khuon_loi` là danh sách góc tấn công ưu tiên của domain (miền nghiệp vụ) này. | pending | target-contract | — |
| R2.11 | Khối `review.severity_map` định nghĩa cái gì là `high`/`medium`/`low` với riêng repo này. | pending | target-contract | — |
| R2.12 | `checkmate.yml` cú pháp hỏng thì `docReviewCfg` PHẢI fail-safe (hỏng an toàn) về `null`, | pending | target-contract | test/quan-sat-ngoai-pham-vi.test.ts |
| R2.13 | Nối id probe với testcase PHẢI nhận đủ ba dạng tên mà các bộ chạy sinh ra | pending | target-contract | — |
| R2.14 | Việc nối id PHẢI kiểm ranh giới | pending | target-contract | test/dedup-probe.test.ts |
| R2.14 | nối id probe phải kiểm ranh giới: `P1` nuốt kết quả của `P10` khi lượt chấm có từ 10 probe | precedent | pending: target-contract (đoạn «Vì sao») · ứng viên kho khuôn (đích b) | docs/archive/r-rules/R2-hop-dong-repo-dich.md |
| R2.15 | File probe không nạp được (lỗi import, lỗi cú pháp) vẫn cho ra JUnit XML hợp lệ, nhưng | pending | target-contract | test/loi-nap-file.test.ts |
| R2.16 | Khi không ghi nhận được probe nào, thông điệp lỗi PHẢI kèm nguyên nhân mà bộ chạy test đã | pending | target-contract | — |
| R2.17 | Đường dẫn tới repo đích PHẢI được đưa về tuyệt đối trước khi dùng làm đích của symlink hay | pending | target-contract | — |
| R3 | Bóc trả lời model và rào chống prompt injection | housed | model-reply-parsing › Bóc JSON khỏi trả lời model, và khi không có JSON thì nói ra model đã nói gì | test/boc-model.test.ts |
| R3.1 | PHẢI bóc được JSON nằm trong code fence (khối mã) có tag `json`, và cả JSON trần không fence. | housed | model-reply-parsing › Bóc JSON khỏi trả lời model, và khi không có JSON thì nói ra model đã nói gì | — |
| R3.2 | Không tìm thấy JSON thì lỗi ném ra PHẢI kèm trích đoạn trả lời của model, để người đọc log | housed | model-reply-parsing › Bóc JSON khỏi trả lời model, và khi không có JSON thì nói ra model đã nói gì | — |
| R3.3 | Parse fail ở lần gọi đầu thì được nhắc lại đúng một lần với lời nhắc rằng model không có | housed | model-reply-parsing › JSON hỏng phải chỉ đúng chỗ hỏng, và lượt nhắc lại được đưa chính thông điệp đó — đã rào | — |
| R3.4 | Language tag (`ts`, `python`, `java`…) PHẢI bị bỏ, tuyệt đối không được lọt vào dòng đầu file | housed | model-reply-parsing › Bóc code khỏi mọi language tag, và lời gọi tool là một loại lỗi riêng | — |
| R3.5 | PHẢI nhận MỌI language tag, không chỉ TypeScript. | housed | model-reply-parsing › Bóc code khỏi mọi language tag, và lời gọi tool là một loại lỗi riêng | — |
| R3.6 | Trả lời không có fence nhưng mang dấu hiệu mã nguồn (`import`, `from`, `def `, `package `, | housed | model-reply-parsing › Bóc code khỏi mọi language tag, và lời gọi tool là một loại lỗi riêng | — |
| R3.7 | Model phát ra lời gọi tool (`<invoke …>`) thay vì code thì PHẢI ném lỗi thuộc loại riêng | housed | model-reply-parsing › Bóc code khỏi mọi language tag, và lời gọi tool là một loại lỗi riêng | — |
| R3.8 | Mọi dữ liệu ngoại lai nhúng vào prompt PHẢI được kẹp giữa cặp mốc mang nonce (số dùng một | housed | model-reply-parsing › Dữ liệu ngoại lai vào prompt phải kẹp giữa cặp mốc mang nonce, kèm lời rào | — |
| R3.9 | Hai lượt chạy khác nhau PHẢI cho nonce khác nhau | housed | model-reply-parsing › Dữ liệu ngoại lai vào prompt phải kẹp giữa cặp mốc mang nonce, kèm lời rào | — |
| R3.10 | Prompt PHẢI kèm lời rào nói rõ: mọi thứ giữa hai mốc là dữ liệu thô, không phải chỉ dẫn; | housed | model-reply-parsing › Dữ liệu ngoại lai vào prompt phải kẹp giữa cặp mốc mang nonce, kèm lời rào | — |
| R3.11 | Model chấm bài chạy không có tool | housed | model-reply-parsing › Model chấm bài chạy không có tool, và danh sách cấm phải liệt kê tường minh | — |
| R3.12 | Claude Code CLI báo mất xác thực bằng cách in ra stdout rồi thoát 0 | housed | provider-gate › Mất xác thực là lỗi CÔNG CỤ, không phải câu trả lời của model, và KHÔNG thử lại | test/mat-xac-thuc.test.ts |
| R3.13 | Mẫu nhận diện phải phủ cả phiên hết hạn, không chỉ ca chưa đăng nhập bao giờ | housed | provider-gate › Mất xác thực là lỗi CÔNG CỤ, không phải câu trả lời của model, và KHÔNG thử lại | packages/harness/src/model.ts |
| R3.13 | mẫu chữ mất-xác-thực bắt nhầm 3/4 câu trả lời hợp lệ → phải xét chỗ xuất hiện (stderr) và hình dạng | precedent | provider-gate › Mất xác thực là lỗi CÔNG CỤ, không phải câu trả lời của model, và KHÔNG thử lại (đoạn «Vì sao») | docs/archive/r-rules/R3-boc-tra-loi-model.md |
| R3.14 | Mất xác thực là lỗi CẤU HÌNH: KHÔNG thử lại. Phiên hết hạn không tự sống lại ở lượt thứ hai. | housed | provider-gate › Mất xác thực là lỗi CÔNG CỤ, không phải câu trả lời của model, và KHÔNG thử lại | test/mat-xac-thuc.test.ts |
| R3.15 | JSON của model không parse được thì lỗi ném ra PHẢI kèm đoạn văn quanh vị trí hỏng, | housed | model-reply-parsing › JSON hỏng phải chỉ đúng chỗ hỏng, và lượt nhắc lại được đưa chính thông điệp đó — đã rào | test/fixtures/thu-vien-doi-cu.json |
| R3.16 | Lượt nhắc lại PHẢI được đưa chính thông điệp lỗi đó | housed | model-reply-parsing › JSON hỏng phải chỉ đúng chỗ hỏng, và lượt nhắc lại được đưa chính thông điệp đó — đã rào | — |
| R4 | Nhiều repo và lịch sử chấm theo repo | housed | repo-history › Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó | test/dedup-probe.test.ts |
| R4.1 | `config.repos[]` là nguồn sự thật | housed | repo-history › Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó | — |
| R4.2 | `config.repo` chỉ là view (khung nhìn) của repo đang chọn | housed | repo-history › Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó | — |
| R4.3 | Cấu hình đời cũ chỉ có một `repo` PHẢI được nâng thành danh sách một phần tử mà không mất | housed | repo-history › Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó | test/token-repo.test.ts |
| R4.4 | `repo_dang_chon` trỏ vào repo không còn trong danh sách thì rơi về phần tử đầu, không được | housed | repo-history › Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó | — |
| R4.5 | Người dùng KHÔNG phải gõ tay `owner/repo` | housed | repo-history › Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó | test/token-repo.test.ts |
| R4.6 | Clone repo bằng token thì sau khi clone xong PHẢI gỡ token khỏi remote URL | housed | repo-history › Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình | test/token-repo.test.ts |
| R4.7 | Gỡ repo khỏi danh sách KHÔNG ĐƯỢC xoá clone trên đĩa và KHÔNG ĐƯỢC xoá lịch sử chấm của nó. | housed | repo-history › Vòng đời repo — thêm theo bốn bước, gỡ thì giữ clone và lịch sử | apps/web/src/secret-vault.ts |
| R4.8 | Mỗi lượt chấm PHẢI mang trường `repo` (dạng `owner/repo`) được gán tại thời điểm khởi chạy. | housed | repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch | — |
| R4.9 | Lọc theo repo PHẢI tách bạch: lượt chấm của repo A không được lọt vào lịch sử repo B, và | housed | repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch | apps/web/src/ui-ledger.ts |
| R4.10 | Lọc `verdict=loi` bắt theo trạng thái tiến trình (`trangThai === 'loi'`), không theo kết | housed | repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch | — |
| R4.11 | Lọc theo nhà cung cấp dựa vào tiền tố của chuỗi model đã ghim (`claude-cli/…`), không | housed | repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch | — |
| R4.12 | Nhiều bộ lọc cùng lúc kết hợp theo kiểu VÀ. | housed | repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch | — |
| R4.13 | Model không mang tiền tố nhà cung cấp thì để trống cột nguồn, KHÔNG được đoán bừa. | housed | repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch | — |
| R4.14 | Mọi chuỗi do người ngoài viết (tiêu đề PR, tên tác giả, tên repo) PHẢI được escape trước | housed | repo-history › Chuỗi do người ngoài viết phải được thoát, khoá hiển thị lại phải bị che | — |
| R4.15 | Khoá/token hiển thị lại trên giao diện PHẢI bị che | housed | repo-history › Chuỗi do người ngoài viết phải được thoát, khoá hiển thị lại phải bị che | — |
| R4.16 | Sổ cái verdict cũng là một dạng lịch sử | housed | repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch | — |
| R4.17 | Thang tin cậy tác giả PHẢI lọc theo repo trước khi tính hồ sơ | housed | repo-history › Thang tin cậy lọc theo repo trước khi tính, và khi không lọc thì phải nói ra | — |
| R4.18 | Token GitHub gắn với TỪNG repo. Mọi lời gọi API và mọi lệnh git nhắm vào một repo PHẢI đi | housed | repo-history › Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình | test/fixtures/verdict-doi-cu.json |
| R4.19 | Token KHÔNG ĐƯỢC nằm trong `config.json` | housed | repo-history › Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình | test/token-repo.test.ts |
| R4.20 | Thứ tự lấy token cho một repo: token riêng của repo → biến môi trường `GITHUB_TOKEN` (đường | housed | repo-history › Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình | test/token-repo.test.ts |
| R4.21 | Cấu hình đời cũ có `github_token` dùng chung PHẢI được di trú tự động | housed | repo-history › Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình | test/fixtures/verdict-doi-cu.json |
| R4.22 | Thêm repo đi theo bốn bước, bước sau chỉ mở khi bước trước đã qua | housed | repo-history › Vòng đời repo — thêm theo bốn bước, gỡ thì giữ clone và lịch sử | apps/web/src/github.ts |
| R4.23 | Cổng kiểm kết nối PHẢI là một lời gọi THẬT `GET /repos/{owner}/{repo}` bằng chính token vừa | housed | repo-history › Vòng đời repo — thêm theo bốn bước, gỡ thì giữ clone và lịch sử | test/token-repo.test.ts |
| R4.24 | Nhánh gốc PHẢI được gợi ý từ `default_branch` mà bước kiểm trả về | housed | repo-history › Vòng đời repo — thêm theo bốn bước, gỡ thì giữ clone và lịch sử | test/token-repo.test.ts |
| R4.25 | Repo có trong danh sách nhưng không lấy được token theo R4.20 PHẢI mang trạng thái thiếu | housed | repo-history › Vòng đời repo — thêm theo bốn bước, gỡ thì giữ clone và lịch sử | apps/web/src/github.ts |
| R4.26 | Không route nào được trả token về, kể cả đã che (R9.17) | housed | response-secret-guard › Bí mật của chính checker không được rời máy chủ qua thân response | apps/web/src/config.ts |
| R4.27 | Gỡ repo khỏi danh sách PHẢI xoá token riêng của nó khỏi kho bí mật | housed | repo-history › Vòng đời repo — thêm theo bốn bước, gỡ thì giữ clone và lịch sử | test/fixtures/verdict-doi-cu.json |
| R4.28 | Lệnh `git fetch` kéo PR về PHẢI mang chìa của repo trong URL của CHÍNH lệnh đó (dùng một | housed | repo-history › Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình | — |
| R4.29 | Mọi văn bản lỗi đi ra ngoài (log, sự kiện run, màn hình) PHẢI được gột token trước | housed | repo-history › Token gắn với TỪNG repo, không bao giờ nằm trong cấu hình | test/boc-model.test.ts |
| R5 | Nhà cung cấp model và cổng kiểm bắt buộc | housed | provider-gate › Danh mục nhà cung cấp phải tự khai đủ để giao diện và cổng kiểm dùng được | test/dedup-probe.test.ts |
| R5.1 | Nhà cung cấp đã ngừng dịch vụ PHẢI mang cờ `ngung` và KHÔNG ĐƯỢC cho chọn | housed | provider-gate › Danh mục nhà cung cấp phải tự khai đủ để giao diện và cổng kiểm dùng được | — |
| R5.2 | Mọi nhà cung cấp còn hoạt động PHẢI khai ít nhất một model. | housed | provider-gate › Danh mục nhà cung cấp phải tự khai đủ để giao diện và cổng kiểm dùng được | — |
| R5.3 | Nhà cung cấp hỗ trợ phương thức `api` PHẢI khai tên biến môi trường chứa khoá | housed | provider-gate › Danh mục nhà cung cấp phải tự khai đủ để giao diện và cổng kiểm dùng được | — |
| R5.4 | Chọn một nhà cung cấp làm nơi chấm chỉ hợp lệ khi nhà cung cấp đó đã kiểm THÀNH CÔNG | housed | provider-gate › Cổng kiểm bắt buộc — chưa kiểm thành công thì không được chọn để chấm | — |
| R5.5 | Kiểm còn hiệu lực nghĩa là đã kiểm OK với đúng cấu hình hiện tại | housed | provider-gate › «Kiểm còn hiệu lực» nghĩa là đã kiểm OK với ĐÚNG cấu hình hiện tại | apps/web/src/provider.ts |
| R5.6 | Phản hồi rỗng từ nhà cung cấp PHẢI bị coi là kiểm THẤT BẠI, kể cả khi HTTP trả 200. | housed | provider-gate › Cổng kiểm bắt buộc — chưa kiểm thành công thì không được chọn để chấm | — |
| R5.7 | Kiểm thất bại PHẢI nói rõ nguyên nhân (sai khoá, hết hạn mức, model không tồn tại, dịch vụ | housed | provider-gate › Cổng kiểm bắt buộc — chưa kiểm thành công thì không được chọn để chấm | test/ba-muc-tu-dong.test.ts |
| R5.8 | Dán nhầm khoá của nhà cung cấp này vào ô của nhà cung cấp khác thì thông báo PHẢI đoán và | housed | provider-gate › Cổng kiểm bắt buộc — chưa kiểm thành công thì không được chọn để chấm | — |
| R5.9 | Thứ tự ưu tiên khi lấy khoá: biến môi trường của dịch vụ trước, khoá dán qua giao diện sau. | housed | provider-gate › Khoá lấy theo thứ tự đã khai, tới được tiến trình con, và kho ở quyền hạn chế | — |
| R5.10 | Khoá dán qua giao diện PHẢI tới được tiến trình con khi chấm | housed | provider-gate › Khoá lấy theo thứ tự đã khai, tới được tiến trình con, và kho ở quyền hạn chế | — |
| R5.11 | Kho khoá trên đĩa PHẢI đặt quyền hạn chế (chmod 600 trên hệ hỗ trợ). | housed | provider-gate › Khoá lấy theo thứ tự đã khai, tới được tiến trình con, và kho ở quyền hạn chế | — |
| R5.12 | Phương thức gói thuê bao PHẢI chạy thật bằng gói | housed | provider-gate › Phương thức gói thuê bao phải chạy THẬT bằng gói | — |
| R5.13 | Verdict PHẢI ghim chuỗi model dạng `<nhà cung cấp>/<tên model>` để tra ngược được lượt chấm | housed | provider-gate › Verdict ghim nguồn model, và số token phải nói rõ khi là ước tính | — |
| R5.14 | Số token vào/ra PHẢI được ghi lại, và phải nêu rõ khi con số là ước tính chứ không phải | housed | provider-gate › Verdict ghim nguồn model, và số token phải nói rõ khi là ước tính | — |
| R5.15 | Danh mục nhà cung cấp được phép khai một model CHỈ dùng với một số phương thức (ví dụ: | housed | provider-gate › Danh mục là gợi ý, nhà cung cấp là trọng tài — nhưng giới hạn phương thức thì cứng | test/ba-muc-tu-dong.test.ts |
| R5.16 | Cổng kiểm gặp tổ hợp model + phương thức nằm ngoài giới hạn PHẢI từ chối NGAY với lời nói | housed | provider-gate › Danh mục là gợi ý, nhà cung cấp là trọng tài — nhưng giới hạn phương thức thì cứng | test/model-hop-le.test.ts |
| R5.17 | Cửa đọc cấu hình KHÔNG ĐƯỢC tự thay tổ hợp cấm bằng một tổ hợp khác | housed | provider-gate › Danh mục là gợi ý, nhà cung cấp là trọng tài — nhưng giới hạn phương thức thì cứng | test/ba-muc-tu-dong.test.ts |
| R5.18 | Danh mục `models` là GỢI Ý cho giao diện và nguồn giá trị mặc định, KHÔNG phải trần cứng. | housed | provider-gate › Danh mục là gợi ý, nhà cung cấp là trọng tài — nhưng giới hạn phương thức thì cứng | test/model-hop-le.test.ts |
| R5.19 | Đường chấm gặp cấu hình KHUYẾT trường (model rỗng/thiếu) thì HỎI, không ĐOÁN | housed | provider-gate › Danh mục là gợi ý, nhà cung cấp là trọng tài — nhưng giới hạn phương thức thì cứng | test/ba-muc-tu-dong.test.ts |
| R5.20 | Giá trị NGOÀI danh mục — model, và MỌI trường gõ tay được, gồm cả `phuong_thuc` — không | invariant | CLAUDE.md ⛔C3 | test/ba-muc-tu-dong.test.ts |
| R5.20 | vòng 8: che-của-che không bao giờ khớp sổ kiểm; vòng 11: băm `phuong_thuc` giấu nguyên nhân trong lỗi | precedent | pending: provider-gate (đoạn «Vì sao») | docs/archive/r-rules/R5-cong-nha-cung-cap.md |
| R6 | Verdict và cổng merge | housed | merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở | test/dinh-tuyen-skill.test.ts |
| R6.1 | Kết quả chỉ có hai giá trị: `PASS` hoặc `FAIL`. Không có trạng thái thứ ba kiểu "PASS có | housed | verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ | test/verdict-contract.test.ts |
| R6.2 | Verdict PHẢI ghim `artifact_ref.sha_or_hash` | housed | verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ | test/verdict-contract.test.ts |
| R6.3 | Có finding mức `high` thì kết quả PHẢI là `FAIL`. | housed | verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ | test/verdict-contract.test.ts |
| R6.4 | Verdict PHẢI kèm `probe_stats` (thống kê probe) để người đọc biết `PASS` nói trên cơ sở nào: | housed | verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ | test/verdict-contract.test.ts |
| R6.5 | Số probe lên kế hoạch và số thực chạy phải được nêu tách bạch | housed | verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ | test/verdict-contract.test.ts |
| R6.6 | Verdict `FAIL`, hoặc còn finding `high`, thì nút merge PHẢI khoá | housed | merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở | test/merge-gate.test.ts |
| R6.7 | Finding mức `medium` chỉ được bỏ qua khi người dùng tick xác nhận từng cái | housed | merge-gate › Cảnh báo medium phải được xác nhận từng cái, máy chủ đối chiếu tập id | test/merge-gate.test.ts |
| R6.8 | Trước khi merge PHẢI hỏi lại GitHub trạng thái PR hiện tại | housed | merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở | test/merge-gate.test.ts |
| R6.9 | PR đã có commit mới (`headSha` khác `headSha` lúc chấm) thì verdict cũ hết hiệu lực | housed | merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở | test/merge-gate.test.ts |
| R6.10 | Chấm lại đúng một commit đã có verdict thì PHẢI cảnh báo trước rằng kết quả gần như chắc | housed | merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở | test/merge-gate.test.ts |
| R6.11 | Mọi hành động qua cổng (merge / trả về dev) PHẢI ghi vào sổ cái kèm người thực hiện, thời | housed | merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm với danh tính phiên và danh sách cảnh báo đã chấp nhận | test/merge-gate.test.ts |
| R6.12 | Chế độ demo KHÔNG ĐƯỢC cho thao tác cổng merge và KHÔNG ĐƯỢC cho sửa cấu hình. | housed | merge-gate › Chế độ chỉ-đọc không cho thao tác cổng và không cho sửa cấu hình | test/di-tru-bo-cot-cong.test.ts |
| R6.12 | phạm vi: cấm THAO TÁC cổng, không cấm di trú dữ liệu lúc khởi động (PO 01/09, M16) | precedent | merge-gate › Chế độ chỉ-đọc không cho thao tác cổng và không cho sửa cấu hình (đoạn «Vì sao») | test/merge-gate.test.ts |
| R6.13 | Lượt chấm PHẢI có ít nhất một probe ở trạng thái `pass`, `hoi_quy` hoặc `cai_thien` thì mới | housed | verdict-contract › PASS phải có bằng chứng — không probe nào chứng minh được gì thì KHÔNG ra verdict | packages/harness/src/skill-code.ts |
| R6.13 | `ngoai_pham_vi` là trạng thái hút: cả bộ probe import sai module → PASS trên lượt không có phép thử nào chạy | precedent | verdict-contract › PASS phải có bằng chứng — không probe nào chứng minh được gì thì KHÔNG ra verdict (đoạn «Vì sao») | test/verdict-contract.test.ts |
| R6.14 | Trước khi bỏ cuộc, lượt chấm PHẢI sinh lại file probe một lần, và lượt sinh lại PHẢI được | housed | verdict-contract › Trước khi bỏ cuộc phải sinh lại probe một lần, kèm nguyên nhân thật | test/verdict-contract.test.ts |
| R6.15 | Ba việc tự động ở cổng PHẢI là ba công tắc RIÊNG, không được gộp thành một, vì mức độ gây | housed | merge-gate › Tự động ở cổng: ba công tắc riêng, máy chỉ được nói KHÔNG | test/ba-muc-tu-dong.test.ts |
| R6.16 | Đăng verdict tự động KHÔNG ĐƯỢC giới hạn ở chế độ trực | housed | merge-gate › Tự động ở cổng: ba công tắc riêng, máy chỉ được nói KHÔNG | apps/web/src/config.ts |
| R6.17 | Tự động trả về dev CHỈ được chạy khi verdict là `FAIL` và có ít nhất một finding mức | housed | merge-gate › Tự động ở cổng: ba công tắc riêng, máy chỉ được nói KHÔNG | apps/web/src/config.ts |
| R6.18 | Hành động cổng do máy thực hiện PHẢI ghi vào sổ với danh tính của tác nhân máy, không | housed | merge-gate › Tự động ở cổng: ba công tắc riêng, máy chỉ được nói KHÔNG | test/doi-soat-cong.test.ts |
| R6.19 | Tác nhân máy KHÔNG ĐƯỢC merge trong mọi cấu hình | invariant | CLAUDE.md ⛔C1 | test/merge-gate.test.ts |
| R6.20 | Hệ thống PHẢI đối soát trạng thái thật của pull request với sổ cổng | housed | doi-soat-cong › Sổ cổng phải phản ánh cả hành động xảy ra ngoài cổng | openspec/specs/doi-soat-cong/spec.md |
| R6.21 | Hàng ngoài-cổng PHẢI phân biệt được với hàng do người bấm trong CheckMate ở mức dữ | housed | doi-soat-cong › Hàng ngoài-cổng không được trông giống hàng qua-cổng | openspec/specs/doi-soat-cong/spec.md |
| R6.22 | Hàng ngoài-cổng PHẢI nói rõ không có xác nhận finding nào, kèm số finding | housed | doi-soat-cong › Hàng ngoài-cổng không được trông giống hàng qua-cổng | openspec/specs/doi-soat-cong/spec.md |
| R6.23 | Đối soát PHẢI idempotent: chạy lại nhiều lần không đẻ hàng trùng. Sổ chỉ ghi thêm và | housed | doi-soat-cong › Đối soát idempotent và không bịa | openspec/specs/doi-soat-cong/spec.md |
| R6.24 | Không đọc được trạng thái pull request (thiếu quyền, mạng hỏng, PR bị xoá) thì PHẢI bỏ | housed | doi-soat-cong › Đối soát idempotent và không bịa | openspec/specs/doi-soat-cong/spec.md |
| R6.24b | Cột «người» trả lời câu AI ĐÃ THỰC HIỆN, không phải ai đã ghi lại | housed | doi-soat-cong › Đối soát idempotent và không bịa | test/doi-soat-cong.test.ts |
| R6.24b | cột «người» = AI ĐÃ THỰC HIỆN; đối soát chỉ chép lại → danh tính từ GitHub hoặc «không rõ»; ranh giới với R11.2/R11.4; ba vòng chấm đề nghị sai (M15). KHÔNG có trong doi-soat-cong | precedent | doi-soat-cong › Đối soát idempotent và không bịa (đoạn «Vì sao») | test/merge-gate.test.ts |
| R6.25 | Đối soát PHẢI chạy tách khỏi đường chấm | housed | doi-soat-cong › Đối soát không được làm hỏng lượt chấm | openspec/specs/doi-soat-cong/spec.md |
| R6.26 | Hành động cổng CHỈ tồn tại trong sổ chỉ-ghi-thêm | housed | doi-soat-cong › Hành động cổng chỉ sống trong sổ — bề mặt là bản phái sinh | openspec/specs/doi-soat-cong/spec.md |
| R6.27 | Mọi mục bị bộ lọc loại khỏi phép đếm PHẢI được đếm và nói ra trong phần mô tả. | housed | doi-soat-cong › Mọi mục không đọc được phải được đếm và nói ra | openspec/specs/doi-soat-cong/spec.md |
| R6.31 | ví dụ trong chú thích `spec-units.ts` (mục con giả định) — lưới miễn đích danh | obsolete | không có trong R — chú thích/test dùng làm ví dụ | packages/harness/src/spec-units.ts |
| R7 | Tầm nhìn diff: cắt được, nhưng không cắt âm thầm | pending | diff-visibility | test/dedup-probe.test.ts |
| R7.1 | File sinh tự động PHẢI bị loại khỏi diff đưa vào prompt | pending | diff-visibility | — |
| R7.2 | Repo khai thêm mẫu riêng qua `review.bo_qua_diff` trong `checkmate.yml`. | pending | diff-visibility | — |
| R7.3 | Mẫu regex repo khai sai cú pháp PHẢI bị bỏ qua, KHÔNG được làm sập lượt chấm. | pending | diff-visibility | — |
| R7.4 | Sau khi loại file sinh tự động mà diff vẫn vượt trần thì PHẢI cắt tiếp, ưu tiên giữ file | pending | diff-visibility | — |
| R7.5 | Chỉ có đúng một file mà nó đã vượt trần thì vẫn PHẢI giữ | pending | diff-visibility | — |
| R7.6 | Thứ tự file trong diff dựng ra PHẢI giữ đúng thứ tự git trả về, không theo thứ tự sắp xếp | pending | diff-visibility | — |
| R7.7 | Mọi file bị bỏ PHẢI được trả về kèm tên file, số ký tự và lý do. | pending | diff-visibility | — |
| R7.8 | Log của lượt chấm PHẢI liệt kê các file này. | pending | diff-visibility | — |
| R7.9 | File mã nguồn bị loại vì vượt trần PHẢI được cảnh báo riêng, tách khỏi nhóm file sinh | housed | man-run › Chỗ checker không nhìn tới phải nói ra, không cắt âm thầm | openspec/specs/man-run/spec.md |
| R7.10 | Prompt gửi cho model PHẢI có khối liệt kê các file nó không được xem, kèm chỉ dẫn không | pending | diff-visibility | — |
| R7.11 | Diff chỉ còn toàn file sinh tự động thì PHẢI báo lỗi nói rõ điều đó, không được báo | pending | diff-visibility | — |
| R8 | Nhiều lượt chấm chạy song song | housed | concurrent-runs › Trần lượt chạy đồng thời, vượt trần thì từ chối ngay chứ không xếp hàng ngầm | test/thu-vien.test.ts |
| R8.1 | Số lượt chạy đồng thời PHẢI có trần | housed | concurrent-runs › Trần lượt chạy đồng thời, vượt trần thì từ chối ngay chứ không xếp hàng ngầm | test/kho-run.test.ts |
| R8.2 | Trần tồn tại vì mỗi lượt tốn một worktree trên đĩa, một lượt chạy bộ test thật, và các | housed | concurrent-runs › Trần lượt chạy đồng thời, vượt trần thì từ chối ngay chứ không xếp hàng ngầm | test/concurrent-runs.test.ts |
| R8.3 | Ref tạm mà lượt chấm fetch về PHẢI mang tên riêng theo PR, kể cả ref của nhánh gốc | housed | concurrent-runs › Lượt chấm không dùng chung ref git | test/concurrent-runs.test.ts |
| R8.4 | Nạp probe vào thư viện là chuỗi đọc → sửa → ghi trên một file sổ dùng chung | pending | probe-library | packages/harness/src/probe-library.ts |
| R8.5 | Tên file probe trong thư viện PHẢI suy từ nội dung (hash), không từ số thứ tự | pending | probe-library | packages/harness/src/probe-library.ts |
| R8.6 | Khoá PHẢI được nhả cả khi việc bên trong ném lỗi. | pending | probe-library | — |
| R8.7 | Khoá của một tiến trình đã chết PHẢI bị phá sau một ngưỡng quá hạn | pending | probe-library | test/kho-run.test.ts |
| R8.8 | Chờ khoá quá lâu thì vẫn phải làm việc chứ không được bỏ probe | pending | probe-library | packages/harness/src/probe-library.ts |
| R8.9 | Đẩy file ra khỏi thư viện theo trần FIFO PHẢI xoá luôn file trên đĩa, không để lại file mồ | pending | probe-library | — |
| R8.10 | Sandbox chạy trên chính máy chủ CheckMate, không phải trên hạ tầng của nhà cung cấp | housed | concurrent-runs › Sandbox chạy trên máy chủ CheckMate với môi trường dựng bằng danh sách cho phép | test/env-cli.test.ts |
| R8.11 | Tiến trình chạy test PHẢI nhận môi trường đã lọc | housed | concurrent-runs › Sandbox chạy trên máy chủ CheckMate với môi trường dựng bằng danh sách cho phép | test/env-cli.test.ts |
| R8.12 | Môi trường truyền cho MỌI tiến trình con | housed | concurrent-runs › Sandbox chạy trên máy chủ CheckMate với môi trường dựng bằng danh sách cho phép | test/env-cli.test.ts |
| R8.12 | bản trước truyền cả môi trường rồi cắt một tên → `GITHUB_TOKEN` chảy sang tiến trình CLI ở mọi lượt | precedent | concurrent-runs › Sandbox chạy trên máy chủ CheckMate với môi trường dựng bằng danh sách cho phép (đoạn «Vì sao») · ứng viên kho khuôn (đích b) | test/env-cli.test.ts |
| R9 | Tầng dữ liệu: lớp kho và sổ cái chỉ-ghi-thêm | pending | data-layer | test/dedup-probe.test.ts |
| R9.1 | Route, tầng dựng giao diện và harness KHÔNG được đọc/ghi đĩa hay gọi SQL trực tiếp | pending | data-layer | — |
| R9.2 | Lớp kho là nơi DUY NHẤT biết mình đang chạy trên SQLite | pending | data-layer | — |
| R9.3 | Mở cơ sở dữ liệu phải bật `foreign_keys` và dùng chế độ nhật ký `WAL`, vì nhiều lượt chấm | pending | data-layer | — |
| R9.4 | Bảng sổ cái chỉ nhận `INSERT`. `UPDATE` và `DELETE` lên bảng đó PHẢI bị cơ sở dữ liệu từ | pending | data-layer | test/kho-socai.test.ts |
| R9.4b | `PRAGMA recursive_triggers` là thiết lập theo từng kết nối, không lưu trong file cơ sở | pending | data-layer | — |
| R9.4b | cùng câu REPLACE: qua `moDb()` bị chặn, kết nối riêng lọt → chỉ-ghi-thêm là bất biến ỨNG DỤNG, không của file | precedent | pending: data-layer (đoạn «Vì sao») · ứng viên kho khuôn (đích b) | docs/archive/r-rules/R9-tang-du-lieu.md |
| R9.5 | Một verdict chỉ vào sổ đúng một lần | pending | data-layer | test/kho-socai.test.ts |
| R9.6 | Sổ hành động cổng (ai merge, ai trả về dev, chấp nhận cảnh báo nào) là một bảng riêng, cũng | pending | data-layer | test/fixtures/thu-vien-doi-cu.json |
| R9.7 | Dữ liệu đang nằm trên đĩa (file run JSON, `verdict-ledger.jsonl`, `review-log.jsonl`, | pending | data-layer | test/di-tru.test.ts |
| R9.8 | Di trú KHÔNG được xoá file gốc. Chúng ở lại làm bản đối chứng cho tới khi có quyết định dọn. | pending | data-layer | — |
| R9.9 | Dòng hỏng trong file nguồn không được làm sập cả lượt di trú | pending | data-layer | test/di-tru.test.ts |
| R9.10 | Lọc theo repo, verdict, skill, nhà cung cấp và tìm chữ (xem [R4](R4-lich-su-theo-repo.md)) | pending | data-layer | apps/web/src/server.ts |
| R9.11 | Các cột dùng để lọc và sắp xếp thường xuyên phải có index | pending | data-layer | — |
| R9.12 | Mọi giá trị do người dùng nhập vào câu truy vấn PHẢI đi qua tham số ràng buộc | pending | data-layer | — |
| R9.13 | Cấu hình (`config.json`) và kho khoá (`.secrets.json`) cố ý ở lại dạng file, không vào | pending | data-layer | test/ba-muc-tu-dong.test.ts |
| R9.14 | Cấu hình được cache theo thời điểm sửa file, và cache bị bỏ ngay khi ghi | invariant | CLAUDE.md ⛔C6 | test/ba-muc-tu-dong.test.ts |
| R9.15 | File probe trong thư viện ở lại trên đĩa vì chúng là mã nguồn phải chạy được | pending | probe-library | — |
| R9.16 | Các route `/api/*` chỉ đọc qua lớp kho và trả dữ liệu thuần | pending | data-layer | — |
| R9.17 | KHÔNG route nào được trả về khoá, token hay bí mật | pending | data-layer | test/token-repo.test.ts |
| R9.18 | Lọc và phân trang chạy dưới cơ sở dữ liệu, không nạp cả bảng lên rồi cắt | pending | data-layer | — |
| R10 | Thư viện probe: hạt nạp là TỪNG PROBE, trùng lặp xử theo bốn tầng | pending | probe-library | test/phan-loai.test.ts |
| R10.1 | Đơn vị nạp, lưu, và đào thải của thư viện là một probe | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.1 | đo 8 file thư viện có 4 cặp trùng cùng commit → đổi hạt nạp từ bộ sang probe | precedent | pending: probe-library (đoạn «Vì sao») | docs/archive/r-rules/R10-thu-vien-tung-probe.md |
| R10.2 | File per-probe được tách từ file của lượt chấm | pending | probe-library | test/dedup-probe.test.ts |
| R10.3 | File tách là artifact MỚI chưa từng chạy | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.4 | Trần thư viện đếm theo probe (mặc định 100, chỉnh qua `CHECKER_LIB_TRAN`, kẹp | pending | probe-library | test/thu-vien.test.ts |
| R10.5 | Thư viện đời bộ được di trú tự động sang đời probe ở lần đọc đầu | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.6 | Probe mới trùng cả ba: commit sinh (`sha_sinh`), id, và | pending | probe-library | test/dedup-probe.test.ts |
| R10.7 | Probe mới có luật spec giao với probe đã có (chuỗi | pending | probe-library | packages/harness/src/dedup-probe.ts |
| R10.8 | Model phân xử bằng đúng một câu hẹp | pending | probe-library | test/dedup-probe.test.ts |
| R10.9 | Mỗi probe thư viện tích luỹ lịch sử kết quả theo từng lượt | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.10 | Lịch sử hành vi có trần (20 lượt gần nhất) | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.11 | Lời gọi model phân xử KHÔNG được nằm trong khoá thư viện ([R8.4](R8-chay-song-song.md)): | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.11 | đọc thư viện NGOÀI khoá, quyết định, rồi nạp trong khoá với kiểm lại — lời gọi model không được nằm trong khoá liên tiến trình | precedent | pending: probe-library (đoạn «Vì sao») · ứng viên kho khuôn (đích b) | docs/archive/r-rules/R10-thu-vien-tung-probe.md |
| R10.12 | Ghi sổ thư viện (`meta.json`) PHẢI atomic | pending | probe-library | test/thu-vien.test.ts |
| R10.12 | fallback-rỗng rồi ghi đè biến một sổ rách thành xoá sổ cả thư viện trong im lặng | precedent | pending: probe-library (đoạn «Vì sao») · ứng viên kho khuôn (đích b) | docs/archive/r-rules/R10-thu-vien-tung-probe.md |
| R10.13 | Di trú PHẢI ghi sổ mới TRƯỚC rồi mới xoá file bộ cũ, và CHỈ xoá file bộ đã di trú trọn | invariant | CLAUDE.md § Dữ liệu prod là tài sản | test/thu-vien.test.ts |
| R10.14 | Trần thư viện đọc từ biến môi trường chỉ nhận số nguyên sạch | pending | probe-library | — |
| R10.15 | Đọc thư viện diễn ra ngoài khoá (R10.11) nên PHẢI chịu được file bị lượt song song dọn | pending | probe-library | — |
| R10.16 | Máy tách phải nhận diện regex literal khi đếm ngoặc (ngoặc trong `/x\)/` không phải | pending | probe-library | — |
| R10.20 | Tầng 4 chỉ được so trên những lượt mà trạng thái nói về hành vi riêng của probe | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.21 | Hai probe cùng `pass` mãi KHÔNG chứng minh chúng trùng nhau, chỉ chứng minh chưa có gì | pending | probe-library | — |
| R10.22 | Khi thư viện vượt trần, nạn nhân chọn theo thứ tự | pending | probe-library | test/thu-vien.test.ts |
| R10.23 | Probe từng bắt hồi quy mang cờ `da_bat_hoi_quy` vĩnh viễn (không trôi theo trần | pending | probe-library | packages/harness/src/probe-library.ts |
| R10.24 | `flaky_diem` đếm số lần cùng một sha lượt chấm cho ra hai trạng thái KHÁC nhau ở | pending | probe-library | test/thu-vien.test.ts |
| R11 | Danh tính người thao tác và phiên đăng nhập | housed | identity-session › Danh tính người thao tác đến từ phiên đăng nhập, qua đúng một cửa, không có mặc định | test/danh-tinh.test.ts |
| R11.1 | Người thao tác cổng PHẢI là danh tính của phiên đăng nhập | housed | identity-session › Danh tính người thao tác đến từ phiên đăng nhập, qua đúng một cửa, không có mặc định | test/doi-soat-cong.test.ts |
| R11.2 | Không có phiên hợp lệ thì mọi hành động cổng PHẢI bị từ chối, kể cả khi lớp xác thực | housed | identity-session › Không phiên hợp lệ thì chặn tất cả, kể cả khi lớp xác thực bên ngoài đã cho qua | apps/web/src/server.ts |
| R11.2 | không áp cho đối soát — đối soát chép lại hành động ở hệ khác (ranh giới với R6.24b) | precedent | identity-session › Không phiên hợp lệ thì chặn tất cả, kể cả khi lớp xác thực bên ngoài đã cho qua (đoạn «Vì sao») | docs/archive/r-rules/R11-danh-tinh-va-phien.md |
| R11.3 | Hàm đọc danh tính KHÔNG ĐƯỢC có bất kỳ giá trị mặc định nào | housed | identity-session › Danh tính người thao tác đến từ phiên đăng nhập, qua đúng một cửa, không có mặc định | test/danh-tinh.test.ts |
| R11.4 | Mọi chỗ đọc danh tính PHẢI đi qua đúng một hàm | housed | identity-session › Danh tính người thao tác đến từ phiên đăng nhập, qua đúng một cửa, không có mặc định | apps/web/src/gate.ts |
| R11.5 | Mật khẩu KHÔNG BAO GIỜ được lưu ở dạng đọc được, và KHÔNG BAO GIỜ rời khỏi máy chủ dưới | invariant | CLAUDE.md ⛔C3 | test/danh-tinh.test.ts |
| R11.6 | Băm mật khẩu PHẢI dùng hàm chậm có muối riêng cho từng tài khoản | housed | identity-session › Mật khẩu băm chậm có muối riêng, và thông điệp đăng nhập sai không phân biệt được | test/danh-tinh.test.ts |
| R11.7 | Tài khoản lưu trong cơ sở dữ liệu | housed | identity-session › Tài khoản sống trong cơ sở dữ liệu, tên ép khuôn tại nguồn, quản trị bằng lệnh trên máy chủ | apps/web/src/store/db.ts |
| R11.8 | Vì R11.7, file cơ sở dữ liệu và các file đi kèm (`-wal`, `-shm`) PHẢI ở quyền 600, và tài | housed | identity-session › Tài khoản sống trong cơ sở dữ liệu, tên ép khuôn tại nguồn, quản trị bằng lệnh trên máy chủ | apps/web/src/store/db.ts |
| R11.9 | Tên đăng nhập PHẢI được ép khuôn lúc tạo tài khoản, không phải lúc hiển thị | housed | identity-session › Tài khoản sống trong cơ sở dữ liệu, tên ép khuôn tại nguồn, quản trị bằng lệnh trên máy chủ | test/danh-tinh.test.ts |
| R11.10 | Sai mật khẩu PHẢI trả về cùng một thông điệp với sai tên đăng nhập | housed | identity-session › Mật khẩu băm chậm có muối riêng, và thông điệp đăng nhập sai không phân biệt được | test/danh-tinh.test.ts |
| R11.11 | Token phiên PHẢI là giá trị ngẫu nhiên đủ dài, và trong cơ sở dữ liệu chỉ lưu hash | housed | identity-session › Phiên có token ngẫu nhiên chỉ lưu hash, có hạn, và chết thật khi đăng xuất hoặc gỡ tài khoản | test/danh-tinh.test.ts |
| R11.12 | Phiên PHẢI có hạn. Hết hạn thì bị từ chối như không có phiên, và người dùng được đưa về | housed | identity-session › Phiên có token ngẫu nhiên chỉ lưu hash, có hạn, và chết thật khi đăng xuất hoặc gỡ tài khoản | — |
| R11.13 | Đăng xuất PHẢI xoá phiên ở phía máy chủ, không chỉ xoá cookie ở trình duyệt | housed | identity-session › Phiên có token ngẫu nhiên chỉ lưu hash, có hạn, và chết thật khi đăng xuất hoặc gỡ tài khoản | test/danh-tinh.test.ts |
| R11.14 | Cookie phiên PHẢI đặt `HttpOnly` và `SameSite`, và đặt `Secure` khi phục vụ qua HTTPS. | housed | identity-session › Cookie phiên đặt HttpOnly và SameSite, và Secure khi phục vụ qua HTTPS | apps/web/src/server.ts |
| R11.15 | Sổ hành động cổng ghi tên người bấm lấy từ phiên (R11.1) | housed | merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm với danh tính phiên và danh sách cảnh báo đã chấp nhận | test/doi-soat-cong.test.ts |
| R11.16 | Tên tác giả PR PHẢI được đóng băng vào chính hàng của sổ cổng tại thời điểm bấm, chứ | housed | merge-gate › Hành động cổng vào sổ chỉ-ghi-thêm với danh tính phiên và danh sách cảnh báo đã chấp nhận | test/so-cong.test.ts |
| R11.17 | Khi người bấm cổng trùng với tác giả PR, hệ thống PHẢI cảnh báo tại chỗ trước khi bấm và | housed | identity-session › Vai tách theo việc, và người bấm trùng tác giả pull request phải bị nêu tên | test/so-cong.test.ts |
| R11.18 | Tác nhân máy (agent, lượt chạy tự động) PHẢI mang danh tính riêng và KHÔNG được merge. | invariant | CLAUDE.md ⛔C1 | test/danh-tinh.test.ts |
| R11.18b | Vai dành cho tác nhân máy là `tu_dong` | housed | identity-session › Vai tách theo việc, và người bấm trùng tác giả pull request phải bị nêu tên | test/danh-tinh.test.ts |
| R11.19 | Thêm tài khoản, đổi mật khẩu, đổi vai, gỡ tài khoản đi bằng lệnh trên máy chủ, không | housed | identity-session › Tài khoản sống trong cơ sở dữ liệu, tên ép khuôn tại nguồn, quản trị bằng lệnh trên máy chủ | apps/web/src/cli-tai-khoan.ts |
| R11.20 | KHÔNG route nào được trả danh sách tài khoản, hash, hay muối | housed | identity-session › Không bề mặt nào phát danh sách tài khoản, hash hay muối ra ngoài | apps/web/src/identity.ts |
| R11.21 | Gỡ một tài khoản PHẢI huỷ mọi phiên đang sống của tài khoản đó | housed | identity-session › Phiên có token ngẫu nhiên chỉ lưu hash, có hạn, và chết thật khi đăng xuất hoặc gỡ tài khoản | test/danh-tinh.test.ts |
| R12 | Kho khuôn lỗi common: tri thức tái dùng giữa các repo | housed | truc-phan-loai-code | openspec/specs/truc-phan-loai-code/spec.md |
| R12 | PR #12, 13 vòng, 26 finding — quá nửa rơi vào chưa tới chục khuôn lặp lại → kho khuôn common | precedent | housed: truc-phan-loai-code (đã có «Lý do phải thành luật») | docs/archive/r-rules/R12-kho-khuon-loi-common.md |
| R12.1 | Khuôn common sống trong repo CheckMate (`packages/harness/src/khuon-loi.ts`), không | housed | truc-phan-loai-code › Danh mục trigger và tập kích hoạt per-repo | openspec/specs/truc-phan-loai-code/spec.md |
| R12.2 | Mỗi khuôn PHẢI kèm án lệ (`an_le`) mang MỐC ĐỊNH VỊ truy được (số PR, vòng chấm, | housed | truc-phan-loai-code › Ví dụ per-trigger có trần và luật đào thải | openspec/specs/truc-phan-loai-code/spec.md |
| R12.3 | Trần 20 khuôn mỗi loại (`code` · `doc`) | obsolete | thay bằng truc-phan-loai-code › Ví dụ per-trigger có trần và luật đào thải — trần N ví dụ MỖI TRIGGER, không còn 20 mỗi loại | test/khuon-loi.test.ts |
| R12.4 | Khuôn có thể mang điều kiện bật | housed | truc-phan-loai-code › Ví dụ per-trigger có trần và luật đào thải | openspec/specs/truc-phan-loai-code/spec.md |
| R12.5 | Khuôn phát vào prompt là MỘT dòng mệnh lệnh kiểm được | housed | truc-phan-loai-code › Ví dụ per-trigger có trần và luật đào thải | openspec/specs/truc-phan-loai-code/spec.md |
| R13 | Định tuyến skill: chọn đường chấm theo loại file đã đổi | housed | dinh-tuyen-skill-cham | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13 | PR #17 chỉ đổi tài liệu: 10 probe code, 6 fail cùng nguyên nhân, 4 lượt model, ~52k token → định tuyến | precedent | housed: dinh-tuyen-skill-cham (đoạn mở đầu requirement) | docs/archive/r-rules/R13-dinh-tuyen-skill.md |
| R13.1 | Định tuyến PHẢI dựa trên việc PR có đổi file thực thi được hay không, KHÔNG dựa | housed | dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13.2 | «Văn bản thuần» PHẢI là danh sách CHO PHÉP hẹp | housed | dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13.3 | Tiêu chí phân định là engine có ĐỌC file đó để chấm hay không, áp ĐỀU TAY: | housed | dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13.4 | Skill doc CHỈ được chọn khi có ít nhất một file `.md` trong diff | housed | dinh-tuyen-skill-cham › Đường doc đòi có tài liệu để đọc | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13.5 | Phép so đường dẫn PHẢI khớp cấu trúc, không khớp tiền tố chuỗi | housed | dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13.6 | Quyết định định tuyến PHẢI được ghi vào log lượt chấm kèm lý do | housed | dinh-tuyen-skill-cham › Quyết định định tuyến phải được nói ra | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13.7 | Skill doc chỉ đọc ĐÚNG MỘT tài liệu, nên với PR nhiều file thì phần lớn nội dung thay | housed | dinh-tuyen-skill-cham › Quyết định định tuyến phải được nói ra | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R13.8 | Hàm phân loại đứng ĐẦU pipeline nên PHẢI chịu được danh sách méo (phần tử `null`, | housed | dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed | openspec/specs/dinh-tuyen-skill-cham/spec.md |
| R99 | ví dụ «luật không tồn tại» trong test — lưới miễn đích danh | obsolete | không có trong R — chú thích/test dùng làm ví dụ | test/quan-sat-ngoai-pham-vi.test.ts |
| R99.9 | ví dụ mã mồ côi giả trong test lưới — lưới miễn đích danh | obsolete | không có trong R — chú thích/test dùng làm ví dụ | openspec/changes/retire-r-rules/test-cases.md |

## Đoạn không mang mã — biên bản và án lệ trong phần mở đầu

Không có hàng vì không có mã để trích; ghi ở đây để không ai tưởng chúng bị bỏ quên.

| file › mục | loại | xử lý |
|---|---|---|
| R6 › Đối soát (mở đầu: «Đo trên prod 01/09: 66 lượt chấm… 8 PR merge») | minutes | archive; con số đã vào «Vì sao» của `doi-soat-cong` |
| R6 › Tự động hoá ở cổng (mở đầu: «được phép nói KHÔNG, không được phép nói CÓ») | invariant | `CLAUDE.md` ⛔C1 đã mang câu này |
| R10 › mở đầu («đời đầu nạp theo bộ… 8 file thì 4 cặp trùng») | precedent | hàng R10.1 (precedent) |
| R10 › Đào thải theo điểm (mở đầu: «probe im lặng lâu năm giá trị nhất», «PO chốt 31/08») | precedent + minutes | đoạn «Vì sao» của `probe-library`; mốc PO → archive |
| R11 › mở đầu («Basic Auth ở nginx… `userInfo().username` = ubuntu») | precedent | đoạn «Vì sao» của `identity-session` |
| R12 › mở đầu («chuỗi 13 vòng của PR #12…») | precedent | hàng R12 (precedent) |
| R13 › mở đầu (đo PR #17) | precedent | hàng R13 (precedent) |
| R1 › Khi luật spec chỉ có ở nhánh PR (đoạn nghiêng) | precedent | hàng R1.17 (precedent) |

## Điều agent không chắc rổ — PO đã xếp (task 1.2, chốt 02/09/2026: giữ nguyên như dưới)

- R12.1 → housed · truc-phan-loai-code › Danh mục trigger và tập kích hoạt per-repo
- R13.5 → housed · dinh-tuyen-skill-cham › Định tuyến theo file thực thi được, fail-closed
- R13.7 → housed · dinh-tuyen-skill-cham › Quyết định định tuyến phải được nói ra
- R1.21 → housed · man-run › Verdict phải khai cả phần yếu của chính lượt chấm
- R1.22 → housed · spec-source › Chấm KHÔNG có spec là trạng thái phải KHAI RA, không phải im lặng
- R8.4 → pending · probe-library
- R3.12 → pending · provider-gate
- R1.12 → pending · verdict-contract
- R9.15 → pending · probe-library
