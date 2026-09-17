## Unit / hàm thuần

### `classifyCanaryOutcome(kq, canaryId?)` — bảng D5, THỨ TỰ là luật

- [x] T1.1 [Hợp đồng đúng — mồi đỏ đi tới được đầu ra]: GIVEN `kq.probes = [{ title: 'CANARY: CheckMate runner
      contract', status: 'failed' }]`, `tongTest 1`, không `reason`, không `loiNap` WHEN gọi với `'CANARY'` THEN
      `'proven'`.
- [x] T1.2 [Bộ chạy không nhặt file probe]: GIVEN `reason: 'not_collected'`, `tongTest 0`, `loiNap []` THEN
      `'probe_not_collected'`.
- [x] T1.3 [Template nuốt thất bại]: GIVEN `reason: 'output_missing'` THEN `'runner_output_missing'`.
- [x] T1.4 [Treo cũng là bộ chạy]: GIVEN `treo: true` THEN `'runner_output_missing'` — mồi một dòng không thể treo.
- [x] T1.5 [Đầu ra không phải của lượt này]: GIVEN `tongTest 3`, ba probe không probe nào `matchProbeId(…, 'CANARY')`
      THEN `'canary_not_in_output'`.
- [x] T1.6 [Bộ chạy báo xanh cho phép thử đỏ — xanh giả bị chặn]: GIVEN probe mồi có mặt với `status: 'passed'`
      THEN `'canary_not_failed'`.
- [x] T1.7 [Mồi không nạp được — bỏ qua, không kết luận]: GIVEN `loiNap = [{ file: 'checker_probe.test.tsx', … }]`
      **và** `tongTest 0` THEN `'skipped_load_error'`, KHÔNG phải `'probe_not_collected'` — hàng 3 đứng trước hàng 4.
- [x] T1.8 [Đường thật — chỉ hàng 4 có nghĩa]: GIVEN `canaryId` vắng WHEN `reason: 'not_collected'` THEN
      `'probe_not_collected'`; WHEN `reason: 'output_missing'` · `treo` · probe pass THEN `null` (đường cũ chạy như cũ).
- [x] T1.9 [Biên — 0 test vì lỗi nạp KHÔNG phải «không thu thập được»]: GIVEN `tongTest 0`, `loiNap` có một mục,
      `reason` VẮNG (sandbox không gắn vì có lỗi nạp) THEN đường thật trả `null`, mồi trả `'skipped_load_error'`.
- [x] T1.10 [Mutation — đảo hàng 3↔4]: đổi thứ tự hai `if` ⇒ T1.7 và T1.9 ĐỎ. Chạy hai lần.
- [x] T1.11 [Mutation — gỡ kiểm `status !== 'failed'`]: ⇒ T1.6 ĐỎ. Chạy hai lần.
- [x] T1.12 [Mutation — thay `matchProbeId` bằng `includes('CANARY')`]: probe tên `MYCANARY2` ⇒ T1.5 phải vẫn
      `canary_not_in_output` (ký tự sau id là chữ số) — mutation làm nó thành `proven` ⇒ ĐỎ.

### `canaryLanguage(probeExt)` — bảng đóng

- [x] T1.13 [Đuôi kép]: `.probe.test.ts` → `'ts'` · `.test.tsx` → `'tsx'` · `.py` → `'py'` · `.java` → `'java'`.
- [x] T1.14 [Ngoài bảng]: `.kt` · `.go` · `.cs` · `''` · `undefined` → `null`.
- [x] T1.15 [Cặp fixture tầng 3]: `'.test.ts'` XANH và `'.test.kt'` ĐỎ trong cùng một ca — lưới quét có cả hai chiều.

### `writeCanary(lang, opts)` — thân mồi là hằng

- [x] T1.16 [Tên test bắt đầu `CANARY` ở mọi ngôn ngữ]: với từng `lang` trong bảng, `matchProbeId(<tên test trong
      thân>, 'CANARY')` là `true` — kiểm bằng chính hàm nối, không bằng regex riêng.
- [x] T1.17 [Khuôn theo framework]: `framework: 'vitest'` và đường mặc định ⇒ thân có `from 'vitest'`;
      `framework: 'jest'` ⇒ không có import; `framework: 'Jest 29'` ⇒ khớp `/jest/i` ⇒ không import.
- [x] T1.18 [Java cần tên lớp]: `lang 'java'` không `className` ⇒ `null`; `className 'CheckerProbeTest'` ⇒ thân có
      `class CheckerProbeTest`.
- [x] T1.19 [⛔C4 — tên lớp rác bị từ chối]: `className 'Foo; rm -rf'` · `'../X'` · `'1Abc'` ⇒ `null`, KHÔNG nội suy.
- [x] T1.20 [Thân mồi không chứa gì từ repo đích]: với mọi đầu vào hợp lệ, thân ⊆ hằng + `className` đã kiểm — so
      bằng snapshot đóng, không có template string nào nhận chuỗi ngoài.

### `describeCanaryOutcome(kind, ctx)` — thông điệp bằng tên núm

- [x] T1.21 [`probe_not_collected`]: thông điệp chứa đường file đã ghi (`src/checker_probe.test.tsx`), chứa
      `runner.probe_dir` và `runner.probe_ext`, KHÔNG chứa «probe viết sai» / «pull request».
- [x] T1.22 [`runner_output_missing`]: chứa `runner.test_cmd`; với đường mặc định (không `test_cmd`) thì nói «đường
      vitest mặc định», KHÔNG nhắc `test_cmd`.
- [x] T1.23 [`canary_not_failed`]: chứa «báo đạt cho một phép thử cố tình đỏ» và `runner.test_cmd`; KHÔNG chứa
      «probe» như chủ ngữ của lỗi.
- [x] T1.24 [`canary_not_in_output`]: nói đầu ra không chứa phép thử vừa ghi.
- [x] T1.25 [Nhánh]: `ctx.nhanh = 'pr'` ⇒ thông điệp nêu «ở nhánh pull request»; `'goc'` ⇒ «ở nhánh gốc»; vắng ⇒
      không nhắc nhánh (mồi).

## Tích hợp (đĩa, SQLite, khoá)

### `sandbox.ts` — bốn điểm trả về gắn `reason` (đếm ở `design.md › Context`)

- [x] T2.1 [417 — JSON rỗng]: fixture `vitest-out.json` với `numTotalTests: 0`, `testResults: []`, `chayTrongSandbox`
      giả trả stdout `No test files found, exiting with code 1` ⇒ `reason: 'not_collected'`, `runnerOutput.stdout` chứa
      chuỗi ấy, `loiThu` vẫn là chuỗi cũ (13 người đọc không đổi).
- [x] T2.2 [417 — JSON có lỗi nạp]: `testResults: [{ message: 'Cannot find module', assertionResults: [] }]` ⇒
      `loiNap` có 1 mục, `reason` VẮNG.
- [x] T2.3 [388 — vitest không ra file]: `outFile` không tồn tại ⇒ `reason: 'output_missing'`, `runnerOutput` có
      stderr.
- [x] T2.4 [468 — XML rỗng]: `parseJUnit` trả `[]` cho file tồn tại, `fileLoadError` null ⇒ `reason: 'not_collected'`,
      `runnerOutput` có stdout.
- [x] T2.5 [450 — runner không ra XML]: ⇒ `reason: 'output_missing'`.
- [x] T2.6 [Cắt độ dài]: stdout 50 000 ký tự ⇒ `runnerOutput.stdout.length ≤ 1800`.
- [x] T2.7 [Đời cũ]: người đọc `VitestResult` không biết `reason` (cửa đột biến hôm nay) vẫn chạy y nguyên — chạy
      `test/*handover*` `*mutation*` hiện có, không sửa.
- [x] T2.8 [Mutation — gỡ gắn `reason` ở 417]: T2.1 ĐỎ; ở 468: T2.4 ĐỎ. Mỗi cái hai lần, kiểm diff đã áp.

### `runProbeFile` — một hàm, ba người gọi

- [x] T2.9 [Happy]: ghi code vào `probeDir/fileName` trong sandbox, chạy, trả `VitestResult`, sandbox đã `huy()` —
      thư mục tạm không còn sau khi hàm trả về, KỂ CẢ khi `chayTrongSandbox` ném.
- [x] T2.10 [Đúng đường]: `runner` có `test_cmd` ⇒ spy `chayTheoRunner` được gọi, `chayVitest` không; ngược lại.
- [x] T2.11 [Hồi quy hoist]: đường thật và cửa đột biến sau hoist cho CÙNG kết quả với trước hoist trên cùng fixture
      (ghi kết quả trước hoist vào fixture ở commit hoist, so ở commit sau).
- [x] T2.12 [Song song]: hai `runProbeFile` cùng repo cùng lúc ⇒ hai thư mục sandbox khác nhau, không đụng file.

### Bước mồi trong `runCodeSkill` — vị trí và hậu quả

- [x] T2.13 [Trước model]: model giả đếm lời gọi; mồi `probe_not_collected` ⇒ throw, **0** lời gọi model, log có
      «⛔ DỪNG TRƯỚC KHI GỌI MODEL».
- [x] T2.14 [Sau cửa môi trường]: `preflightProbeEnvironment` giả trả `chan` ⇒ `runProbeFile` KHÔNG được gọi (spy = 0).
- [x] T2.15 [Bỏ qua luôn có log]: đuôi lạ · Java thiếu `probe_file` · `skipped_load_error` ⇒ không throw, đúng
      **một** dòng log bắt đầu «Mồi hợp đồng runner: bỏ qua —», model vẫn được gọi.
- [x] T2.16 [Đã chứng minh có số]: ⇒ log khớp `/Mồi hợp đồng runner: đã chứng minh — \d+(\.\d)?s/`.
- [x] T2.17 [Chạy trên nhánh gốc]: spy `runProbeFile` nhận `sha === t.baseSha`, không phải `branchSha`.

### Gác đường thật — `probe_not_collected` không sinh lại

- [x] T2.18 [Nhánh PR đổi phạm vi thu thập]: mồi proven (nhánh gốc), `runProbeFile` giả trả `reason: 'not_collected'`
      cho `branchSha` ⇒ throw có «probe_not_collected» và «nhánh pull request», **1** lời gọi sinh code.
- [x] T2.19 [Nhánh gốc 0 test]: `reason: 'not_collected'` cho `baseSha` sau khi PR chạy được ⇒ thông điệp nêu «nhánh
      gốc», không sinh lại, không PASS.
- [x] T2.20 [Đường cũ giữ]: `loiThu` có, `reason` vắng, `loiNap` có ⇒ sinh lại như cũ, **2** lời gọi sinh code.
- [x] T2.21 [Thứ tự gác]: `reason: 'not_collected'` **và** `loiThu` chứa `EAI_AGAIN` (giả) ⇒ kết cục là
      `probe_not_collected` (kiểm `reason` trước `looksLikeEnvironmentFailure`) — không phải đường nào cũng được,
      vì thông điệp phải trỏ đúng núm.
- [x] T2.22 [Mutation — gỡ nhánh `reason` ở ~707]: T2.18 ĐỎ (thành 2 lời gọi). Hai lần.

### Cửa thêm repo — `POST /api/repo/them` (Requirement mồi, vế cửa thêm repo · Requirement thông điệp, scenario
«cảnh báo mồi đi cùng kênh»)

- [x] T2.23 [Happy — lệch báo ngay]: `runCanary` giả trả `outcome: 'probe_not_collected'` ⇒ 200, `ok: true`, repo có
      trong `config.json`, `canh_bao_moi_truong` có một chuỗi chứa tên bệnh, đường file probe và hai núm
      `runner.probe_dir` · `runner.probe_ext`. Không có trường trả lời mới nào ngoài `canh_bao_moi_truong`.
- [x] T2.24 [Cửa môi trường chặn thì mồi không chạy]: `preflightProbeEnvironment` giả trả `chan` ⇒ `runCanary` spy = 0,
      `canh_bao_moi_truong` chỉ có điều kiện môi trường.
- [x] T2.25 [Hết giờ là chưa kết luận]: `runCanary` giả trả `timedOut: true` ⇒ cảnh báo chứa «chưa kết luận» và «lượt
      chấm đầu tiên», KHÔNG chứa tên bệnh nào trong bốn tên.
- [x] T2.26 [Proven im lặng]: `outcome: 'proven'` ⇒ trả lời KHÔNG có `canh_bao_moi_truong` (giống hôm nay khi môi
      trường sạch).
- [x] T2.27 [Skipped có log, không cảnh báo]: `outcome: 'skipped_no_canary'` ⇒ không thêm cảnh báo, có một dòng
      `console.log` nêu lý do — người vận hành không bị làm phiền vì CheckMate chưa viết mồi cho khuôn ấy.
- [x] T2.28 [Single-flight]: hai yêu cầu thêm hai repo khác nhau gửi cùng lúc, `runCanary` giả treo 200ms ⇒ gọi đúng
      **1** lần; yêu cầu còn lại có cảnh báo «đang chạy cho repo khác» và vẫn 200, repo vẫn vào danh sách.
- [x] T2.29 [Cờ bận hạ khi ném]: `runCanary` giả ném ⇒ yêu cầu 200 (đăng ký đã xong trước mồi), có cảnh báo chung;
      yêu cầu thêm repo thứ ba sau đó ⇒ `runCanary` lại được gọi.
- [x] T2.30 [Thời hạn cửa thêm repo]: `runCanary` spy nhận `timeoutS === min(runner.timeout_s, 180)`; repo không
      khai runner ⇒ 180.
- [x] T2.31 [Đúng ảnh, đúng đường]: clone fixture có `checkmate.yml` khai `runner.image` + `test_cmd` ⇒ `runCanary` spy
      nhận `runner` đọc từ clone và `image` = ảnh repo khai; cửa môi trường cùng yêu cầu ấy KHÔNG cảnh báo lệch
      runtime với Node 24 (cửa song sinh đã đóng — ĐỎ trước change).
- [x] T2.32 [Chế độ demo]: `MODE === 'demo'` ⇒ 403 như cũ, `runCanary` spy = 0 — cửa demo đứng trước mọi thứ.
- [x] T2.33 [Mutation — gỡ `finally` hạ cờ]: T2.29 ĐỎ. [Mutation — gỡ kiểm `kiem.chan`]: T2.24 ĐỎ. [Mutation — đẩy
      cảnh báo cho `proven`]: T2.26 ĐỎ. Mỗi cái hai lần.

## Ca đối kháng & hồi quy

- [x] T3.1 [Khuyết ở mọi tầng]: `classifyCanaryOutcome` với `probes: undefined` · `kq: {}` · `loiNap: null` ·
      `tongTest: 'abc'` ⇒ không ném; kết cục là `null` (đường thật) hoặc `'runner_output_missing'` (mồi) — fail-closed
      về phía dừng, không về phía proven.
- [x] T3.2 [Biên id]: probe tên `CANARY` (không hậu tố) ⇒ khớp; `CANARY2` ⇒ không; `test_CANARY_x` ⇒ khớp;
      `Suite > CANARY: x` ⇒ khớp (JUnit gộp `describe > it`).
- [x] T3.3 [Ca đã gãy — admin-fe PR #83, 17/09, run `wmu4u2abqap9w`]: fixture tái tạo đúng `vitest-out.json` của lượt
      ấy (`numTotalTests 0`, `testResults []`) qua đường mặc định ⇒ mồi chặn `probe_not_collected` trước stage 3;
      thông điệp chứa `test/checker.probe.test.ts` và hai tên núm. Trước change: cùng fixture ⇒ 2 lời gọi sinh code
      rồi «Probe không thu thập được sau 2 lần sinh» — ghi làm ca ĐỎ-trước/XANH-sau.
- [x] T3.4 [Ca đã gãy — nợ 32 hàng 2, hai repo Java 08/09]: `test_cmd` với `&&` nuốt thất bại ⇒ không XML ⇒ mồi
      `runner_output_missing` trước stage 3, thông điệp có `runner.test_cmd` và stderr.
- [x] T3.5 [Xanh giả]: runner giả ghi XML `tests="1" failures="0"` cho mọi đầu vào ⇒ `canary_not_failed`, throw, 0
      lời gọi model. Đây là ca quan trọng nhất của change: một bộ chạy như thế sẽ báo xanh cho mọi hồi quy.
- [x] T3.6 [Mồi bị đổ oan cho repo đích]: mồi TS import `'vitest'` trên repo jest (giả lỗi nạp `Cannot find package
      'vitest'`) ⇒ `skipped_load_error` + log, KHÔNG `probe_not_collected`, KHÔNG nhắc `probe_dir`.

## Trục nhạy cảm

- [x] T_bimat — stdout của bộ chạy giả chứa `ghp_abc123…` và `sk-ant-…` ⇒ thông điệp lỗi (`phat error`) và
      `events.jsonl` mang bản che qua `redactMessage(…, humanSurfaceSource(t))`, KHÔNG mang nguyên văn; hai token khác
      nhau cho hai bản che khác nhau. `runnerOutput` KHÔNG đi vào prompt nào (spy `callCode` không nhận chuỗi ấy).
      Mutation gỡ `redactMessage` ở đường mồi ⇒ ĐỎ.
- [x] T_failclosed — bốn kết cục chặn của mồi và `probe_not_collected` ở đường thật đều `throw`; `runCodeSkill`
      không trả verdict; `decideResult` không bao giờ được gọi (spy = 0). Bỏ qua mồi (T2.15) KHÔNG tạo verdict — model
      vẫn chạy, verdict đến từ probe thật. T3.5 là ca fail-closed mạnh nhất.
- [N/A] T_cong — change không chạm cổng merge, vai, hay mức tự động; lượt dừng bằng `throw` như cửa môi trường hiện
      có, đi qua đúng bề mặt đã gác. Cửa thêm repo giữ nguyên gác `MODE === 'demo'` (T2.32) và gác phiên đứng
      trước mọi route; mồi không thêm quyền nào cho vai `tu_dong`.
- [x] T_khongtincay — (a) stdout của repo đích in `0 tests` · `CANARY failed` · `numTotalTests: 5` trong khi JSON/XML
      nói khác ⇒ kết cục theo JSON/XML (T1.x với `runnerOutput` chứa các chuỗi ấy, kết quả không đổi); (b)
      `className` Java từ `checkmate.yml` mang ký tự lạ ⇒ từ chối (T1.19); (c) `framework` = `'vitest; echo pwned'`
      ⇒ chỉ khớp `/vitest/i`, không chuỗi nào của nó đi vào thân mồi (T1.20).
- [x] T_hopdong — `checkmate.yml` khai đủ export mới (`runner-canary.js` hàng mới · `describeCanaryOutcome` ở
      `probe-preflight.js`); `test/hop-dong-repo.test.ts` xanh; mutation xoá một tên khỏi bảng ⇒ ĐỎ.

## Chạy thật — ⛔ KHÔNG tick trước khi chạy, ghi `run_id` vào ô

- [x] T7.1 ✅ 17/09 03:54 UTC — CLI trên prod (code đã deploy), admin-fe `refs/checkmate/pr83` @ aa916fb vs base @ a3a4d22,
      khoá model GIẢ (mồi chặn trước model nên không cần khoá thật): dừng sau **3 giây**, mồi **1,9 giây** trong container,
      `⛔ DỪNG TRƯỚC KHI GỌI MODEL — mồi hợp đồng runner (1.9s): probe_not_collected`, **0** lời gọi model, KHÔNG có dòng
      «probe mới». Thông điệp có `test/checker.probe.test.ts` · `runner.probe_dir` · `runner.probe_ext` · «KHÔNG phải lỗi của
      pull request» · «Bộ chạy nói: <không nhận dạng được, 44 ký tự>»; không «probe viết sai». Sổ sự kiện: `/tmp/cm-t71/events.jsonl`
      trên máy chủ. Đối chứng: ba lượt trước cùng PR mất 312 · 894 · 886 giây, 2–3 lời gọi model.
      ~~admin-fe **chưa** có `checkmate.yml`: lượt dừng `probe_not_collected` TRƯỚC stage 3; `events.jsonl` không
      có dòng «probe mới»; thông điệp nêu `test/checker.probe.test.ts` + hai núm. run_id: ____
- [ ] T7.2 **chờ merge admin-fe#86** (hotfix PO chốt 17/09, làn admin-fe-b, nhánh `checkmate-yml-probe-scope`; cổng
      `link-gate.sh` B8 rc 1 vì `checkmate.yml` chưa được miễn — PO quyết). Sau merge: bấm chấm một PR admin-fe ⇒ mồi
      đã chứng minh, lượt đi hết; ghi giây của mồi. admin-fe KHÔNG có webhook về CheckMate — phải bấm tay hoặc chọn repo
      cho chế độ trực. ~~admin-fe **sau khi** đội đích merge `checkmate.yml` (bản soạn 17/09, kiểm ở tasks 0.2): mồi đã chứng minh,
      lượt đi hết; ghi giây của mồi. run_id: ____
- [x] T7.3 ✅ 17/09 03:56–04:12 UTC, verdict **PASS** (0 finding) đã đăng lên PR #94; 20 probe ghi nhận: 3 pass cả hai · 17 nghi_van
      (probe import module MỚI không có ở main ⇒ nhánh gốc không chạy được ⇒ không đối chứng, đúng luật C1 — engine tự ghi
      «nhánh gốc đỏ vì tính năng chưa có»); 4 lời gọi model, cô lập `container`/podman 3.4.4. Mồi không đổi gì ở stage 4–5.
      Chi tiết mồi: run `wmu4zz1gheits` (webhook, PR #94 @ e1e5574, code mới đã deploy, model Gemini): `Runner cấu hình từ
      checkmate.yml` t=527ms → `Mồi hợp đồng runner: đã chứng minh — 2.5s` t=3050ms → stage 3. Mồi trong container prod **2,5 giây**
      (≤ 10 giây ✓). Verdict: ____ (lượt là commit mới nên không có lượt trước cùng commit để so; ghi verdict và số probe).
      ~~`checkmate` tự chấm một PR code: mồi đã chứng minh, thêm ≤ 10 giây, verdict không đổi so với lượt trước
      change trên cùng commit. run_id: ____
- [ ] T7.4 Một repo Java (`admin-be` sau khi đội đích sửa `test_cmd`): mồi chạy qua đường runner + JUnit, ghi giây vào
      nợ 8.1 và so với `CANARY_TIMEOUT_AT_ADD_S = 180` (Open Question thứ ba của `design.md`). run_id: ____
- [ ] T7.5 **nửa máy ✅ 17/09 04:4x UTC** — chạy đúng dây `server.ts` nối (`newAddTimeCanary` + `runCanary` + `describeCanaryOutcome`
      + `redactMessage`, `localHeadSha`, `readRunnerCfg` từ clone) trên prod cho admin-fe, bỏ tầng HTTP: cửa môi trường 0 chặn / 1 cảnh
      báo (Node 24≠22); mồi `probe_not_collected` sau **1,9s** (thời gian cả cửa 1 882 ms); đúng MỘT cảnh báo, câu mới «theo đường
      vitest mặc định — repo chưa khai khối runner… đủ ba khoá test_cmd (bắt buộc…)»; log máy chủ một dòng. Script: `/tmp/t75-add-time.mts`.
      **Nửa giao diện còn chờ PO** (cần đăng nhập): gỡ admin-fe khỏi danh sách rồi thêm lại ⇒ hộp thêm repo hiện cảnh báo ấy, không
      chuyển trang, repo trong danh sách; ghi thời gian phản hồi HTTP.
      ~~**Cửa thêm repo trên prod**: gỡ admin-fe khỏi danh sách rồi thêm lại (clone và phụ thuộc còn nguyên) ⇒ hộp
      thêm repo hiện cảnh báo `probe_not_collected` + hai núm ngay, không chuyển trang; repo có trong danh sách;
      ghi giây mồi và thời gian phản hồi HTTP. Sau đó thêm lại lần nữa khi đã merge `checkmate.yml` ⇒ không cảnh
      báo. Thời gian phản hồi: ____ s

## Kiểm tay

- [ ] T5.1 Đọc thông điệp `probe_not_collected` trên màn run bằng mắt người vận hành: có biết ngay phải mở
      `checkmate.yml` của repo đích và sửa ô nào không? Có hiểu «phạm vi thu thập» là gì mà không cần biết vitest?
- [ ] T5.2 Đọc dòng «Mồi hợp đồng runner: bỏ qua — …»: người đọc có hiểu đây là CheckMate chưa hỗ trợ khuôn, chứ
      không phải repo họ hỏng?
- [ ] T5.3 Hộp thêm repo: cảnh báo mồi và cảnh báo môi trường đứng cùng một danh sách có đọc lẫn không? Người vận
      hành có phân biệt được «chưa kết luận» (chờ lượt chấm) với «lệch» (đi sửa `checkmate.yml`) không? Nút thêm
      có hiện trạng thái chờ trong lúc mồi chạy tới 180s không — nếu không, ghi task sửa ở 4.4.
