<!-- ✅ trỏ file:line của cơ chế ĐANG CÓ. Cơ chế change này mới dựng thì ⚠️ kèm task số — không ✅ trước khi có dòng code. -->

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 **Bề mặt mới duy nhất: stdout/stderr của bộ chạy repo đích** đi ra thông điệp lỗi khi đầu ra rỗng
  (`runnerOutput`, tasks 2.1 · 3.1). Bộ test của repo đích in gì ra đó là **dữ liệu ngoài** và có thể mang token
  (một test hỏng in `process.env`). Đường đi: `runnerOutput` → `describeCanaryOutcome` → `redactMessage(…,
  humanSurfaceSource(t))` (`packages/shared/src/message-egress.ts:181` · `packages/harness/src/target.ts:232`) →
  `phat({type:'error'})` → `events.jsonl` + màn run. **Cần xử ở tasks 3.6 · 3.7**: mọi chỗ nối `runnerOutput` vào
  chuỗi PHẢI qua `redactMessage`; ca `T_bimat` + mutation gỡ `redactMessage` là gác. `runnerOutput` KHÔNG đi vào
  prompt (mồi không có lượt sinh lại; đường thật `probe_not_collected` ném trước khi tới `promptSinhCode`).
  Thân mồi là hằng — không mang giá trị người dùng gõ.
- ⚠️ S1.1b **Cửa thêm repo**: cùng `runnerOutput` đi vào `canh_bao_moi_truong` của trả lời JSON
  (`server.ts:753`). Đường ra: `describeCanaryOutcome` → `redactMessage` → `res.json` → `attachSecretGuard`
  (`apps/web/src/response-secret-guard.ts:151`, gắn ở `server.ts:96`) — hai lớp, lớp thứ hai là gác bề mặt
  response đã có. Cần xử ở tasks 4.2: chuỗi đẩy vào `canhBao` PHẢI là bản đã che; ca `T2.23` kiểm cảnh báo không
  mang nguyên văn khi `runnerOutput` giả chứa token.
- ✅ S1.2 Bề mặt CÔNG KHAI: lượt dừng bằng `throw` như cửa môi trường hiện có (`skill-code.ts:572`), không có đường
  ghi mới lên GitHub; trả lời của cửa thêm repo là bề mặt **nội bộ sau đăng nhập**, không lên PR; các đường lên PR (`renderReceipt` · `renderAutoVerdict` · `renderRuling` · `mergePr` ·
  `setCommitStatus`, đếm 04/09 ở nợ 12) không đổi và không nhận `runnerOutput`. Lượt hỏng không sinh verdict nên
  không có comment.
- ✅ S1.3 Bản che phân biệt hai giá trị: `redactSlot` giữ vân tay sha256 (`message-egress.ts`, khoá bởi
  `test/error-message-egress-gate*.test.ts`) — change dùng lại, không viết bộ che thứ hai.

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 Không đường mới đọc danh tính. Đường chấm: mồi chạy trong `runCodeSkill`, sau khi lượt đã được mở bởi
  đúng đường hiện có. Cửa thêm repo: route `/api/repo/them` đã đứng sau gác phiên duy nhất `evaluateSessionGate`
  (`server.ts:79–89`) và gác `MODE === 'demo'` (`server.ts:723`); mồi không đọc `identityIfAny`, không thêm fallback.
- N/A S2.2 Không route mới; trả lời của `/api/repo/them` không đổi hình dạng (thêm chuỗi vào mảng có sẵn).

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 **KHÔNG.** Change chỉ thêm đường DỪNG (throw trước model, throw thay vì sinh lại). Không nhánh nào tạo
  verdict; `decideResult` (`packages/harness/src/verdict.ts:39`) không được gọi ở bất kỳ kết cục chặn nào —
  `T_failclosed` spy = 0.
- N/A S3.2 Vai `tu_dong` không có quyền mới; ba mức tự động không chạm.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ⚠️ S4.1 Ba đầu vào từ repo đích chạm change: (a) **stdout/stderr** — chỉ đi vào thông điệp người, không vào
  prompt, không vào phân loại (`classifyCanaryOutcome` đọc `reason` · `tongTest` · `probes[].status` · `loiNap`
  — số đếm và trạng thái của đầu ra có cấu trúc, ca `T_khongtincay (a)`); (b) **`runner.framework`** từ
  `checkmate.yml` — chỉ so với bảng đóng `/vitest/i` · `/jest/i` để chọn khuôn, chuỗi ấy KHÔNG đi vào thân mồi
  (`T1.20`); (c) **`runner.probe_file`** làm tên lớp Java — kiểm hình dạng `/^[A-Za-z_][A-Za-z0-9_]*$/` trước khi
  nội suy, rác ⇒ `null` ⇒ bỏ qua mồi (`T1.19`). Cần xử ở tasks 3.3 · 3.4; gác có sẵn để noi theo:
  `detectLoadFailures` nhận diện bằng hình dạng (`sandbox.ts:104`, chú thích `398–405`).
- N/A S4.2 Change không thêm lời gọi model; trả lời model không đi qua code mới.

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 Mồi chạy qua đúng `Sandbox` hiện có: `runProbeFile` (tasks 3.2) là hoist của closure `chay`
  (`skill-code.ts:614–626`), gọi `chayVitest`/`chayTheoRunner` (`sandbox.ts:374` · `:422`) → `chayTrongSandbox`
  (`sandbox.ts:336`) → `buildContainerArgs` với `--network=none` (`sandbox.ts:211`), `node_modules:ro`
  (`sandbox.ts:231`), kho Maven `:ro` (`sandbox.ts:238`), env allowlist `envSandbox` (`sandbox.ts:60`), ảnh qua
  `safeImageName` (`sandbox.ts:159`). Thân mồi là hằng của CheckMate, KHÔNG phải code do model sinh — nhưng nó chạy
  qua **bộ chạy test của repo đích** (code không tin được), nên vẫn ở trong sandbox, không có đường tắt.
- ✅ S5.2 Dọn: `Sandbox.huy()` (`sandbox.ts:503`) trong `finally` của closure hiện có (`skill-code.ts:623–625`);
  hoist giữ nguyên `try/finally` — `T2.9` kiểm thư mục tạm không còn kể cả khi `chayTrongSandbox` ném. Song song:
  mỗi lượt một `Sandbox` riêng (`mkdtempSync`), mồi không tạo file dùng chung — `T2.12`.
- ⚠️ S5.3 **Cửa thêm repo nay CHẠY `test_cmd` của repo đích ngay trong một yêu cầu HTTP** — trước change, cửa này
  chỉ clone. Cùng sandbox (S5.1), cùng lệnh mà lượt chấm đầu tiên sẽ chạy dù sao — đổi **thời điểm**, không đổi
  **quyền**. Hai thứ mới phải gác: (a) **thời hạn** `min(runner.timeout_s, 180)` (tasks 4.2, `T2.30`) — không có
  thì một `test_cmd` ngủ 3600s giữ handler 1 giờ; (b) **trần đồng thời riêng** = 1 (single-flight, tasks 4.2–4.3,
  `T2.28`) — mồi ở cửa này KHÔNG nằm dưới `TRAN_SONG_SONG` của `runs.ts`, nên không có gì khác chặn N yêu cầu thêm
  repo dựng N container. Cờ bận hạ trong `finally` (`T2.29`, mutation `T2.33`).

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không file mới ngoài thư mục sandbox dùng-một-lần; `events.jsonl` là file có sẵn, thêm dòng theo đúng
  đường `phat` hiện có.
- N/A S6.2 Không ghi dữ liệu dùng chung; không đổi hình dạng sổ.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ⚠️ S7.1 Bảng nhánh lỗi mới, mỗi nhánh một đích (tasks 3.4 · 3.6 · 3.7):

  | nhánh | đích | verdict |
  |---|---|---|
  | mồi `runner_output_missing` · `probe_not_collected` · `canary_not_in_output` · `canary_not_failed` | `throw` trước stage 3 | không có |
  | mồi `skipped_*` (đuôi lạ · Java thiếu `probe_file` · mồi không nạp) | log, đi tiếp | từ probe thật, như hôm nay |
  | đường thật `reason === 'not_collected'` (nhánh nào cũng vậy) | `throw`, không sinh lại | không có |
  | đường thật `loiNap` có (lỗi nạp) | sinh lại như cũ | như hôm nay |

  | cửa thêm repo — bốn kết cục chặn | **cảnh báo**, đăng ký xong | không có — đăng ký không phải verdict |
  | cửa thêm repo — hết giờ | cảnh báo «chưa kết luận» | không có |
  | cửa thêm repo — bận / skipped | log hoặc cảnh báo, đăng ký xong | không có |

  Nhánh **bỏ qua** là chỗ phải soi kỹ nhất: nó không tạo PASS — chỉ để probe thật chạy, và gác đường thật vẫn
  gác `probe_not_collected`. Không có kết cục nào của mồi được ghi thành «không có finding». Gác: `T_failclosed`,
  `T2.15`, `T3.5`.

  **Cửa thêm repo trả cảnh báo thay vì chặn KHÔNG phải fail-open**: thứ nó quyết là «repo có vào danh sách không»,
  không phải «PR có PASS không». Cùng luật đã có của cửa môi trường (`probe-environment › Thông điệp môi trường`:
  «Điều kiện thiếu MUST NOT chặn việc đăng ký repo»). Verdict vẫn chỉ sinh ở đường chấm, nơi mồi **chặn**. Một
  repo được thêm với cảnh báo `probe_not_collected` rồi được chấm sẽ **bị chặn lại ở đường chấm** (`T2.13`) —
  cửa thêm repo chỉ nói sớm hơn, không nói thay.
- ✅ S7.2 Probe hỏng không thành bằng chứng: `fileLoadError`/`detectLoadFailures` (`sandbox.ts:84` · `:104`) giữ
  nguyên; change đặt `reason: 'not_collected'` CHỈ khi `loiNap` rỗng (tasks 3.1) — thứ tự D5 hàng 3 trước hàng 4,
  mutation `T1.10`. Mồi «đã chứng minh» không được đếm vào `probe_stats` — nó không nằm trong `keHoach`.

## S8. Leo quyền & cô lập (per-vector — theo CHANGE này)

- ⚠️ S8.1 Mục tiêu kẻ tấn công có thể nhắm qua change này, từng đường:
  1. **Làm lượt chấm của chính mình bị DỪNG** (né bị chấm) — repo đích đổi `vitest.config.ts`/`probe_dir` để probe
     không được nhặt ⇒ `probe_not_collected` ⇒ lượt hỏng, **không PASS** (⛔C2). Kẻ tấn công không được gì: lượt
     hỏng không mở cổng. Đường này tồn tại **từ trước** change (hôm nay cũng dừng, chỉ sai tên bệnh) — change không
     mở nó, chỉ gọi đúng tên.
  2. **Làm lượt chấm PASS oan** — cần bộ chạy báo xanh cho probe đỏ; đó chính là `canary_not_failed` ⇒ chặn.
     Đường đối xứng: bộ chạy **bỏ qua** probe thật nhưng nhặt mồi (ví dụ `include` chỉ phủ tên `checker_probe*`
     và PR đổi tên probe) — không thể: tên file probe do engine đặt (`fileProbeMoi`), mồi và probe thật **cùng
     tên file**, cùng `probe_dir`. Ghi rõ ở tasks 3.6: mồi dùng đúng `fileProbeMoi`, không tên riêng.
  3. **Lái thân mồi** qua `framework`/`probe_file` — S4.1 (b)(c).
  4. **Rò bí mật qua stdout** — S1.1 (đường chấm) · S1.1b (cửa thêm repo, hai lớp che).
  5. **Chạy code ngoài sandbox** — mồi đi cùng đường sandbox, không có đường tắt (S5.1).
  6. **Nghẹt máy chủ qua cửa thêm repo** (mới do D9) — tài khoản đã đăng nhập gửi N yêu cầu thêm repo với
     `test_cmd` ngủ lâu: (a) thời hạn 180s cắt từng mồi; (b) single-flight giữ tối đa **một** container từ cửa
     này bất kể N; (c) ba trần tài nguyên của container (`sandbox.ts` `MEMORY_CAP` · `CPU_CAP` · `PIDS_CAP`) giữ
     cái duy nhất ấy trong khuôn. Đường đối xứng: cùng tài khoản đó đã có thể bấm «Chấm» N lần — và ở đó
     `TRAN_SONG_SONG = 2` (`runs.ts`) gác; cửa thêm repo nay có trần riêng = 1, KHÔNG dùng chung trần với lượt
     chấm (cố ý: hai loại việc, hai hàng đợi — dùng chung là để một cửa hiếm chiếm chỗ của cửa chính).
  7. **Chạy `test_cmd` của repo đích ở thời điểm sớm hơn** (S5.3) — mục tiêu kẻ tấn công không đổi (vẫn trong
     sandbox), chỉ đổi lúc nào; và người thêm repo là người đã đăng nhập, tức đã được tin để bấm «Chấm».
- ⚠️ S8.2 Load-bearing hai chiều, ghi ở `test-cases.md`: `T1.10` · `T1.11` · `T1.12` · `T2.8` · `T2.22` · `T2.33`
  (ba mutation của cửa thêm repo) · `T_bimat` · `T_hopdong` — mỗi mutation chạy **hai lần**, kiểm `git diff --stat`
  khác 0 trước khi đọc kết quả (bài `error-message-egress-gate`: một lần «1 failed» hoá ra flaky, và `sed` hỏng
  trông y hệt «không load-bearing»).
- ⚠️ S8.3 Đối xứng: `not_collected` được gắn ở **hai** bộ đọc (JSON 417 · XML 468) và `output_missing` ở **hai**
  (388 · 450) — sửa một mà quên một là lệch giữa đường mặc định và đường runner. Đếm bằng máy ở `design.md ›
  Context`; `T2.1`–`T2.5` phủ đủ bốn điểm; mutation `T2.8` gỡ từng điểm.

## Notes

- **Mồi là code CheckMate chạy qua bộ chạy của repo đích** — mới về vai, không mới về cơ chế: probe do model sinh
  đã đi đúng đường ấy từ đầu. Khác biệt duy nhất là thân mồi tất định, nên nó dễ kiểm hơn probe thật, không khó hơn.
- **Bỏ qua mồi là quyết định an toàn có chủ đích** (design D6), và nó phải **luôn có log** — một mồi bị bỏ qua im
  lặng là mất độ phủ mà không ai biết. `T2.15` khoá «đúng một dòng log».
- **Không thêm mẫu chuỗi vào `looksLikeEnvironmentFailure`** (tasks 3.8) — hàm ấy là bảng đóng theo mã lỗi có lý
  do ⛔C4 ghi ngay trên nó; change này đi bằng `reason` có kiểu, và `git diff` trước PR là gác.
- **Thứ tự archive** (tasks 8.0): MODIFIED của `probe-environment` không có đích cho tới khi hai change anh em
  archive; archive sớm là khai luật vào chỗ không tồn tại — `openspec validate` đã cảnh báo đúng.
