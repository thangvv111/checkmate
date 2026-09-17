## Why

Ngày 17/09, hai lượt chấm code liên tiếp trên `thangvv111/admin-fe` PR #83 chết với câu **«Probe không thu
thập được sau 2 lần sinh: Không thu thập được test nào»**. Câu ấy kê tên bệnh là **probe**. Bệnh thật: engine
ghi probe vào `test/checker.probe.test.ts`, còn `vitest.config.ts` của admin-fe chỉ thu thập
`src/**/*.test.{ts,tsx}` và `kiem/**/*.test.ts`. Vitest glob theo `include` **trước**, rồi mới lọc theo đường
dẫn trên dòng lệnh — file nằm ngoài `include` thì không bao giờ được nhặt, kể cả khi truyền đúng tên nó.

Không một dòng nào trong verdict, log lượt chạy hay thông điệp lỗi trỏ về `include`. Nguyên nhân tìm ra bằng
cách đọc cấu hình vitest của repo đích **bằng tay**.

Ba số đo làm việc này thành một change chứ không phải một dòng vá (run `wmu4u2abqap9w`):

| đo | số |
|---|---|
| thời gian lượt chấm trước khi chết | **894 giây** |
| lời gọi model tiêu | **3** (lập kế hoạch → sinh code → **sinh lại**) |
| thông tin thu được về nguyên nhân | **0** |
| chi phí một lần chạy thử bộ chạy test trong sandbox | **≈ 5 giây**, không tốn token |

Và hai lỗ chẩn đoán chồng lên nhau, cả hai đo được trên cùng lượt:

1. **Chuỗi lỗi không mang thông tin.** `numTotalTests = 0` với `testResults` rỗng làm `loiThu` rơi về chuỗi
   dự phòng «Không thu thập được test nào» (`sandbox.ts:416`). Vitest **có** in lý do ra stdout, nhưng vì file
   JSON vẫn được ghi nên `sandbox.ts:387–390` đi nhánh JSON và không bao giờ đọc tới stdout. Đúng ca «fail-closed
   **mù**» mà requirement *«Không ghi nhận được probe nào thì thông điệp lỗi phải mang nguyên nhân bộ chạy đã
   báo»* của `target-contract` tồn tại để cấm — chỉ là scenario của nó mới phủ ca «không xuất XML», chưa phủ
   ca «xuất ra nhưng rỗng».
2. **Sinh lại một thứ sinh lại không sửa được.** `looksLikeEnvironmentFailure` trả `null` cho chuỗi trên
   (`probe-preflight.ts:338`), nên engine coi đây là lỗi probe và tiêu thêm một lời gọi model
   (`skill-code.ts:728`). Model không có cách nào đổi `include` của repo đích. Đúng con bệnh mà requirement
   *«Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe»* đã diệt cho ba ca — ca này là ca thứ tư, chưa có hàng.

**Vì sao bây giờ.** admin-fe là repo đích **thứ hai** có bố cục test khác mặc định, và ba repo nữa đang xếp
hàng (`admin-be`, `portal-be` chạy surefire với quy ước `src/test/java` + tên lớp `*Test`; `portal-fe` chưa
đo). Mỗi repo mới với một quy ước thu thập khác là một lần đốt ~900 giây và 3 lời gọi model để nhận về một
câu sai bệnh. Nợ có tên **số 32** (`named-debts`) đã mô tả đúng phép kiểm cần có từ 08/09 — đề xuất đến từ
chính đội repo đích sau khi cả hai bên cùng chốt một `test_cmd` sai: *«chạy thử một probe cố tình đỏ, và đòi
thấy FAIL chứ không phải "không xuất XML" — đó mới là cổng thật, và nó đứng đúng chỗ, ở phía đọc»*. Bảng kết
cục của nợ ấy có ba hàng; ca admin-fe là **hàng thứ tư**, và nó xảy ra ở **đường mặc định** (repo không có
`checkmate.yml`), chỗ nợ 32 chưa nhắc tới.

Đây là sản phẩm áp **chính triết lý của nó** lên **đầu vào của chính nó**: CheckMate tồn tại vì «không chứng
minh được là sai ≠ đã chứng minh là đúng», mà hôm nay nó tin hợp đồng chạy probe của repo đích chưa từng bắt
hợp đồng ấy tự chứng minh một lần nào.

## What Changes

- **Probe mồi (canary) TRƯỚC lời gọi model đầu tiên.** Sau cửa kiểm môi trường hiện có và trước stage 3, engine
  ghi một probe **cố tình đỏ** theo đúng khuôn của repo đích, chạy nó qua **chính đường chạy test mà probe thật
  sẽ đi** (đường `runner.test_cmd` repo khai, hoặc đường vitest mặc định), rồi đòi thấy đầu ra tồn tại **và**
  báo ≥ 1 thất bại. Không cần model. Bốn kết cục, ba kết cục dừng đều dừng **trước khi tốn token**:

  | đầu ra | test | thất bại | tên bệnh | nghĩa |
  |---|---|---|---|---|
  | vắng | – | – | `runner_output_missing` | template nuốt thất bại (`&&`, glob sai) hoặc bộ chạy không ra gì |
  | có | **0** | – | `probe_not_collected` | **bộ chạy không nhặt file probe** — `probe_dir`/`probe_ext` ngoài phạm vi thu thập (ca admin-fe) |
  | có | ≥ 1 | 0 | `runner_output_stale` | đọc nhầm file — đầu ra không phải của lượt này |
  | có | ≥ 1 | ≥ 1 | — | hợp đồng **đã tự chứng minh**, đi tiếp |

- **Mồi chạy ở HAI cửa, đúng hai chỗ cửa kiểm môi trường đang đứng** (PO chốt 17/09): đầu lượt chấm code
  **và lúc thêm repo**. Ở cửa thêm repo, kết cục chặn thành **cảnh báo** trong cùng danh sách
  `canh_bao_moi_truong` đã có — đăng ký MUST NOT bị chặn, cùng luật với điều kiện môi trường. Người vận hành
  biết `probe_dir` lệch **ngay lúc dán tên repo**, không phải sau lượt chấm đầu tiên. Cửa thêm repo có thời hạn
  mồi riêng, hết giờ là **chưa kết luận** chứ không phải bệnh; lượt chấm đầu tiên kiểm lại với thời hạn đầy đủ.
- **`probe_not_collected` là trạng thái có tên ở đường chạy thật**, không chỉ ở mồi: bước chạy probe cho ra đầu
  ra với 0 test và không có lỗi nạp file nào thì lượt dừng với tên bệnh này, **MUST NOT sinh lại**. Đây là lưới
  an toàn cho ca mồi không bắt được — pull request đổi cấu hình thu thập chỉ ở nhánh của nó.
- **Đầu ra của bộ chạy đi theo thông điệp** khi nó xuất kết quả rỗng: stdout/stderr được giữ và phát ra (qua
  bộ che ⛔C3) thay vì bị nhánh JSON/XML nuốt.
- **Thông điệp nêu việc phải làm bằng tên núm**: đường probe engine đã ghi, và hai núm `runner.probe_dir` ·
  `runner.probe_ext` của `checkmate.yml` — vì đó là chỗ duy nhất sửa được, và nó nằm phía repo đích.
- **Chi phí mồi được đo và ghi** vào log lượt chạy (giây), để quyết định «ghi nhớ theo commit nhánh gốc» bằng
  số chứ không bằng cảm giác. Bản này chạy mồi **mỗi lượt**.
- **BREAKING (không):** repo đích có hợp đồng đúng thì thấy thêm một dòng log và vài giây; verdict không đổi.

**Cố ý KHÔNG làm — đọc cấu hình thu thập của repo đích để đoán trước.** Mỗi bộ chạy một cú pháp
(`include` của vitest, `testMatch` của jest, `testpaths` của pytest, `<includes>` của surefire) và chúng đổi
theo phiên bản. Đoán bằng cách đọc cấu hình là nuôi một bảng không bao giờ đủ; **chạy thật** hỏi thẳng bộ chạy
và đúng với mọi bộ chạy, kể cả bộ chưa gặp.

**Cố ý KHÔNG làm — chặn khi không có mồi cho đuôi file lạ.** Bảng mồi là bảng **đóng** theo `probe_ext`. Đuôi
không có hàng thì mồi **bỏ qua kèm một dòng log**, không chặn: mồi là phép kiểm đứng trước, bỏ qua nó không làm
thứ gì thành PASS — probe thật vẫn chạy và `probe_not_collected` ở đường thật vẫn gác. Chặn ở đây là biến một
tiện ích thành cửa từ chối cho mọi hệ mới.

**Cố ý KHÔNG làm — ghi nhớ kết quả mồi qua các lượt.** Chưa có số đo chi phí mồi trên repo Java (JVM khởi
động). Ghi nhớ đúng là theo commit nhánh gốc + ảnh chạy; làm ngay là thêm một chỗ lưu trạng thái vào engine
cho một chi phí chưa đo. Ghi thành nợ có tên kèm cột số đo để điền.

## Capabilities

### New Capabilities

*(không)*

### Modified Capabilities

- `probe-environment`: thêm requirement **hợp đồng chạy probe SHALL tự chứng minh bằng mồi trước lời gọi model
  đầu tiên**; requirement «Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe» nhận thêm ca **file probe không
  được thu thập** — capability này do change `probe-environment-preflight` khai và **chưa archive**, nên change
  này **archive SAU** nó (cùng ràng buộc với `preflight-multi-ecosystem`).
- `target-contract`: requirement «Không ghi nhận được probe nào thì thông điệp lỗi phải mang nguyên nhân bộ
  chạy đã báo» mở rộng sang ca **bộ chạy xuất kết quả nhưng không thu thập được file probe**; requirement
  «`checkmate.yml` là tuỳ chọn…» nhận thêm vế **`probe_dir` và `probe_ext` là hai núm cho repo đích khớp phạm
  vi thu thập của bộ chạy chính nó**, kèm hệ quả khi lệch.

## Luật chạm tới

- `probe-environment › Hợp đồng chạy probe SHALL tự chứng minh bằng mồi trước lời gọi model đầu tiên` — ADDED.
- `probe-environment › Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe` — MODIFIED: thêm scenario «file probe
  không được thu thập» vào phía **không sinh lại**; scenario «probe viết sai vẫn được sinh lại» giữ nguyên.
- `probe-environment › Thông điệp môi trường SHALL gọi đúng tên bệnh và nêu việc phải làm` — MODIFIED: thêm
  scenario cho ba tên bệnh của mồi, mỗi cái nêu việc phải làm bằng tên núm; và scenario **mồi ở cửa thêm repo
  báo trong cùng danh sách cảnh báo, không chặn đăng ký** — mở rộng vế «kiểm và báo lúc thêm repo» sẵn có.
- `target-contract › Không ghi nhận được probe nào thì thông điệp lỗi phải mang nguyên nhân bộ chạy đã báo` —
  MODIFIED: thêm scenario «bộ chạy xuất kết quả rỗng» — đầu ra của bộ chạy đi theo thông điệp.
- `target-contract › checkmate.yml là tuỳ chọn; khai thiếu hoặc khai hỏng thì rơi về mặc định` — MODIFIED: thêm
  vế `probe_dir`/`probe_ext` và scenario «khai lệch phạm vi thu thập».
- ⛔C2 fail-closed — ba kết cục dừng của mồi và `probe_not_collected` ở đường thật đều ném lỗi, lượt vào trạng
  thái hỏng, MUST NOT thành PASS.
- ⛔C3 bí mật không rò — stdout/stderr của bộ chạy đi ra thông điệp phải qua `redactMessage` như mọi bề mặt
  khác; mồi không mang dữ liệu người dùng.
- ⛔C4 dữ liệu ngoài là dữ liệu — phân loại kết cục mồi bằng **số đếm trong đầu ra có cấu trúc** (tests,
  failures, file tồn tại), MUST NOT so khớp lời văn stdout của repo đích; lời văn chỉ đi kèm thông điệp.
- ⛔C5 hợp đồng repo — hàm mới export (mồi, phân loại kết cục) khai vào bảng module của `checkmate.yml`.
- **Sổ nợ:** đóng nợ có tên **32** (`named-debts` › 32) bằng change này; nợ **30** (tính tươi của bằng chứng)
  là họ hàng nhưng **không** đóng — mồi chứng minh hợp đồng ra được thất bại, không chứng minh đầu ra là của
  lượt này ngoài phép «tests = 0 ⇒ stale».

## Impact

- `packages/harness/src/skill-code.ts` — chèn bước mồi giữa cửa kiểm môi trường và stage 3; hoist closure
  `chay` trong `chayCaHaiNhanh` thành hàm dùng chung cho mồi và đường thật (một đường chạy, không phải hai);
  nhánh `loiThu` (~707–733) nhận thêm kết cục `probe_not_collected` phía **không sinh lại**.
- `packages/harness/src/sandbox.ts` — `chayVitest` (~416) và `chayTheoRunner` (~472): khi tổng test = 0 và không
  có lỗi nạp file, trả về kết cục có tên kèm stdout/stderr thay vì chuỗi dự phòng; kiểu `VitestResult` thêm
  trường phân biệt «0 test» với «có lỗi thu thập».
- `packages/harness/src/probe-preflight.ts` — bảng mồi đóng theo `probe_ext` (vitest/jest `.ts`/`.tsx`/`.js` ·
  pytest `.py` · junit5 `.java`) và hàm phân loại bốn kết cục; `looksLikeEnvironmentFailure` **không** thêm mẫu
  chuỗi (⛔C4) — kết cục đi bằng kiểu, không bằng lời văn.
- `packages/harness/src/runner.ts` — không đổi hình dạng `RunnerCfg`; chỉ chú thích `probe_dir`/`probe_ext` là
  núm khớp phạm vi thu thập.
- `checkmate.yml` (repo này) — khai export mới vào bảng module (⛔C5).
- `apps/web/src/server.ts` — route `/api/repo/them` (~751–753): sau `preflightProbeEnvironment`, nếu không có
  điều kiện chặn thì chạy mồi trên HEAD của bản clone với thời hạn riêng và nối kết cục vào `canh_bao_moi_truong`;
  cùng chỗ, cửa kiểm môi trường lúc thêm repo nhận `runner.image`/`test_cmd` đọc từ clone thay vì luôn
  `DEFAULT_IMAGE` (cửa song sinh với đường chấm, đóng luôn vì cùng dòng code). Một mồi cửa-thêm-repo một lúc
  (single-flight trong tiến trình) — mồi ở cửa này không nằm dưới trần lượt chạy đồng thời.
- `apps/web/src/ui-repo.ts` — không đổi: danh sách `canh_bao_moi_truong` đã hiện và đã không chuyển trang (~155–160).
- `apps/web/src/ui.ts` — màn run hiện tên bệnh và việc phải làm của mồi (đọc từ sự kiện log/error, không có
  bề mặt mới).
- `openspec/changes/named-debts/tasks.md` — tick nợ 32 khi archive, ghi nợ mới «ghi nhớ mồi theo commit nhánh
  gốc» kèm cột số đo.
- Test: `test/probe-environment.test.ts` (kết cục mồi, cặp fixture ĐỎ/XANH cho từng hàng), `test/sandbox*.test.ts`
  (0 test ≠ lỗi thu thập), `test/hop-dong-repo.test.ts` (export mới), `test/runner-cfg.test.ts` (không đổi hình
  dạng).
