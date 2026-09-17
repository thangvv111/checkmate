## 0. Đo trước khi viết

- [x] 0.1 Tái lập nguyên nhân trên bản clone prod của admin-fe, KHÔNG ghi vào clone: `npx vitest run
      test/checker.probe.test.ts --reporter=json --outputFile=/tmp/…` ⇒ `numTotalTests: 0`, `testResults: []`.
      Đúng nhánh `sandbox.ts:416` rơi về chuỗi dự phòng. (17/09, run tham chiếu `wmu4u2abqap9w` · `wmu4ti0exyoxd`)
- [x] 0.2 Kiểm cấu hình sửa được **chạy thật** trong thư mục tạm dựng từ chính `package.json` · `vitest.config.ts` ·
      `vite.config.ts` · `tsconfig*.json` của admin-fe + symlink `node_modules`: probe tại `src/checker_probe.test.tsx`
      được thu thập, JSX biên dịch, JUnit XML `tests="1" failures="0"`, cả `happy-dom` lẫn `jsdom`.
- [x] 0.3 Đếm bề mặt bằng máy (ghi ở `design.md › Context`): 4 điểm trả về «0 test không treo» trong hai đường chạy
      (`sandbox.ts` 388 · 417 · 450 · 468) · 2 người gọi «ghi + chạy» hôm nay (đường thật ~621 · cửa đột biến
      ~1051) · 13 chỗ đọc chuỗi `loiThu`.
- [ ] 0.4 Đo thời gian một lượt sandbox mồi trên repo Node (checkmate tự chấm) và ghi số vào 8.1 — số Java để trống
      có tên, không điền ước lượng.

## 1. Luật (capability)

- [ ] 1.1 `probe-environment` › ADDED «Hợp đồng chạy probe SHALL tự chứng minh bằng mồi trước lời gọi model đầu
      tiên» — khoá bởi `test/runner-canary.test.ts` (bảy hàng của bảng D5, mỗi hàng một ca + một mutation).
- [ ] 1.2 `probe-environment` › MODIFIED «Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe» — thêm scenario «file
      probe không được thu thập» và «pull request đổi phạm vi thu thập chỉ ở nhánh của nó»; khoá bởi
      `test/probe-environment.test.ts` (đường thật: `reason === 'not_collected'` ⇒ throw, KHÔNG gọi model lần hai).
- [ ] 1.3 `probe-environment` › MODIFIED «Thông điệp môi trường SHALL gọi đúng tên bệnh…» — ba scenario mới cho
      `probe_not_collected` · `runner_output_missing` · `canary_not_failed`; khoá bởi ca `describeCanaryOutcome`
      (mỗi thông điệp chứa đúng tên núm, KHÔNG chứa chữ «probe viết sai»).
- [ ] 1.4 `target-contract` › MODIFIED «Không ghi nhận được probe nào thì thông điệp lỗi phải mang nguyên nhân bộ chạy
      đã báo» — scenario «bộ chạy xuất kết quả rỗng»; khoá bởi ca sandbox: `reason: 'not_collected'` đi kèm
      `runnerOutput` có nội dung stdout.
- [ ] 1.5 `target-contract` › MODIFIED «`checkmate.yml` là tuỳ chọn…» — vế `probe_dir`/`probe_ext`; khoá bởi ca
      mồi trên fixture repo có `include` không phủ `probe_dir` ⇒ `probe_not_collected` nêu đúng hai tên núm.
- [ ] 1.6 Chú thích ở `runner.ts` cạnh `probe_dir` · `probe_ext`: hai núm khớp phạm vi thu thập, mặc định là gì, và
      engine kiểm bằng mồi chứ không đoán — chỗ sống của luật phía code.

## 2. Kiểu & hợp đồng

- [ ] 2.1 `sandbox.ts › VitestResult` thêm `reason?: 'output_missing' | 'not_collected'` và
      `runnerOutput?: { stdout: string; stderr: string }` (mỗi chuỗi ≤ 1800 ký tự). KHÔNG đụng `treo`, `loiNap`.
- [ ] 2.2 `runner-canary.ts` export kiểu `CanaryOutcome` (union bảy nhãn của D5) — tên tiếng Anh, khai ở bảng module.
- [ ] 2.3 ⛔C5 — khai vào bảng module của `checkmate.yml`: hàng mới `runner-canary.js → runProbeFile · runCanary ·
      writeCanary · canaryLanguage · classifyCanaryOutcome · CANARY_ID · CANARY_BY_LANGUAGE · CANARY_TIMEOUT_AT_ADD_S`;
      hàng `probe-preflight.js` thêm `describeCanaryOutcome`; hàng `sandbox.js` không đổi export. Chạy
      `test/hop-dong-repo.test.ts` ngay sau.
- [ ] 2.4 `runner-canary.ts` export `runCanary(input) → CanaryReport` — gói «ghi mồi + runProbeFile + phân loại +
      giây» thành MỘT hàm cho hai cửa gọi (đường chấm · cửa thêm repo); `CanaryReport = { outcome, seconds, message?,
      timedOut: boolean }`. Hai cửa chỉ khác ở việc làm gì với `outcome` — KHÔNG có hai đường ghi/chạy mồi.

## 3. Engine (packages/harness)

- [ ] 3.1 `sandbox.ts` — bốn điểm trả về «0 test không treo» gắn `reason` và `runnerOutput`:
      388 · 450 → `output_missing`; 417 (khi `numTotalTests === 0` và `loiNap` rỗng) · 468 (khi `tong === 0` và
      `loiNap` rỗng) → `not_collected`. Khi có `loiNap` thì KHÔNG gắn `not_collected` (thứ tự D5 hàng 3 trước 4).
      Chuỗi `loiThu` giữ nguyên cho 13 người đọc cũ.
- [ ] 3.2 `skill-code.ts` — hoist closure `chay` (~614–626) thành `runProbeFile({ repo, sha, code, fileName, probeDir,
      runner, image, parseJUnit })` đặt ở `runner-canary.ts`; đường thật và cửa đột biến (~1050) gọi nó.
      **Commit riêng, hành vi y nguyên** — lưới cửa đột biến hiện có là hồi quy.
- [ ] 3.3 `runner-canary.ts` — `canaryLanguage(probeExt)` bảng đóng `ts · tsx · js · mjs · py · java`;
      `writeCanary(lang, { framework?, className? })` trả hằng theo ngôn ngữ, tên test bắt đầu `CANARY`; Java kiểm
      `className` bằng `/^[A-Za-z_][A-Za-z0-9_]*$/` (⛔C4), vắng thì trả `null`.
- [ ] 3.4 `runner-canary.ts` — `classifyCanaryOutcome(kq, canaryId?)` theo đúng THỨ TỰ bảng D5; `canaryId`
      vắng ⇒ chỉ hàng 4 có nghĩa, còn lại `null`.
- [ ] 3.5 `probe-preflight.ts` — `describeCanaryOutcome(kind, ctx)` bảng đóng kết cục → câu; câu nêu đường file
      probe đã ghi + tên núm (`runner.probe_dir` · `runner.probe_ext` · `runner.test_cmd`); MUST NOT chứa «probe
      viết sai» / «pull request có lỗi».
- [ ] 3.6 `skill-code.ts` — chèn bước mồi giữa khối chặn môi trường (~569–573) và `phat({ stage: 3 })` (~575):
      ghi mồi ở `t.baseSha`, `runProbeFile`, `classifyCanaryOutcome`; chặn ⇒ `phat({type:'log', msg:'⛔ DỪNG TRƯỚC KHI
      GỌI MODEL — …'})` + `throw`; bỏ qua ⇒ log nêu lý do; đi tiếp ⇒ log «Mồi hợp đồng runner: đã chứng minh — N.Ns».
      stdout/stderr nối vào thông điệp sau `redactMessage(…, humanSurfaceSource(t))`.
- [ ] 3.7 `skill-code.ts` — `chayCaHaiNhanh` trả thêm `reason` · `runnerOutput` · `nhanh: 'pr' | 'goc'` của nhánh
      hỏng; nhánh `loiThu !== undefined` (~707) kiểm `reason === 'not_collected'` TRƯỚC `looksLikeEnvironmentFailure`
      ⇒ throw có tên bệnh và nhánh, KHÔNG sinh lại. Đường `looksLikeEnvironmentFailure` và sinh lại cho lỗi nạp giữ
      nguyên.
- [ ] 3.8 Không thêm mẫu chuỗi nào vào `looksLikeEnvironmentFailure` — kiểm bằng `git diff` trước khi mở PR.

## 4. Web (apps/web)

- [ ] 4.1 `server.ts › /api/repo/them` (~751): đọc `runner = readRunnerCfg(dich)` MỘT lần; cửa kiểm môi trường nhận
      `nodeMoiTruong: () => nodeVersionOfImage(runner?.image ?? DEFAULT_IMAGE)` và `testCmd: runner?.test_cmd` —
      cùng nguồn với `skill-code.ts:566–567` (đóng cửa song sinh, D9). Hành vi cũ với repo không có `checkmate.yml`
      y nguyên.
- [ ] 4.2 Cùng route: nếu `kiem.chan` rỗng và `addTimeCanaryBusy === false` ⇒ đặt cờ, `runCanary({ repo: dich,
      sha: HEAD của clone (`git rev-parse HEAD` qua hàm có sẵn trong `github.ts`/`target.ts`, không spawn mới),
      runner, image, timeoutS: Math.min(runner?.timeout_s ?? 3600, CANARY_TIMEOUT_AT_ADD_S) })` trong `try/finally`
      hạ cờ; kết cục chặn ⇒ đẩy `describeCanaryOutcome(...)` (đã qua `redactMessage`) vào `canhBao`; `timedOut`
      ⇒ đẩy câu «chưa kết luận» cố định; `proven`/`skipped_*` ⇒ không thêm gì (skipped vẫn `console.log` lý do).
- [ ] 4.3 Cùng route: `addTimeCanaryBusy === true` ⇒ không dựng sandbox, đẩy cảnh báo «mồi hợp đồng runner đang chạy
      cho repo khác — lượt chấm đầu tiên sẽ kiểm». Đăng ký vẫn xong (`writeConfig` đã đứng trước).
- [ ] 4.4 `ui-repo.ts` — KHÔNG sửa; xác nhận bằng mắt (T5.3) rằng cảnh báo mồi hiện trong cùng hộp với cảnh báo
      môi trường và không chuyển trang.
- [ ] 4.5 Màn run (`ui.ts`) — không có bề mặt mới; xác nhận dòng `error` mang tên bệnh hiện như các lỗi môi trường
      hiện có. Nếu phải sửa để hiện đủ, ghi ở đây và ở `test-cases.md`.

## 5. Test

- [ ] 5.1 `test/runner-canary.test.ts` — bảy hàng D5, mỗi hàng: một ca XANH đúng hàng + một **mutation** (đảo thứ
      tự hàng 3↔4 · gỡ kiểm `status !== 'failed'` · gỡ `matchProbeId`) chạy **hai lần**, kết quả nhất quán, và
      **kiểm mutation đã áp** (`git diff --stat` khác 0) trước khi đọc kết quả.
- [ ] 5.2 `test/sandbox-run-result.test.ts` — bốn điểm trả về: fixture JSON `numTotalTests: 0` + stdout giả ⇒
      `reason: 'not_collected'` và `runnerOutput.stdout` có nội dung; JSON có `testResults[].message` ⇒ `loiNap` có,
      `reason` VẮNG; XML rỗng ⇒ `not_collected`; không file ⇒ `output_missing`. Cặp fixture ĐỎ/XANH cho tầng 3.
- [ ] 5.3 `test/probe-environment.test.ts` — đường thật: model giả đếm lời gọi; `reason: 'not_collected'` ở nhánh PR
      ⇒ throw, **1** lời gọi sinh code (không sinh lại); lỗi nạp ⇒ **2** lời gọi (đường cũ giữ). Mutation: gỡ nhánh
      `reason` ⇒ ca «1 lời gọi» đỏ.
- [ ] 5.4 `test/runner-canary.test.ts` — bỏ qua LUÔN có log: đuôi lạ · Java thiếu `probe_file` · mồi không nạp ⇒
      không throw, có đúng một dòng log «mồi bỏ qua vì …», model vẫn được gọi.
- [ ] 5.5 Mồi đi đúng đường: runner có `test_cmd` ⇒ `chayTheoRunner` được gọi (spy); không có ⇒ `chayVitest`.
      Mutation: mồi tự dựng sandbox riêng ⇒ ca đỏ.
- [ ] 5.6 ⛔C3 — stdout chứa chuỗi giả token ⇒ thông điệp lỗi mang bản che, KHÔNG mang nguyên văn; mutation gỡ
      `redactMessage` ở đường này ⇒ đỏ.
- [ ] 5.7 `test/hop-dong-repo.test.ts` xanh sau 2.3; `test/identifier-language.test.ts` xanh (mọi định danh mới
      tiếng Anh).
- [ ] 5.9 `test/repo-add-canary.test.ts` — cửa thêm repo với `runCanary` giả: (a) kết cục chặn ⇒ 200, `ok: true`,
      `canh_bao_moi_truong` chứa tên bệnh + hai núm, repo CÓ trong config; (b) `kiem.chan` có ⇒ `runCanary` không
      được gọi (spy = 0); (c) `timedOut` ⇒ cảnh báo «chưa kết luận», không tên bệnh; (d) `proven` ⇒ trả lời KHÔNG có
      `canh_bao_moi_truong`; (e) hai yêu cầu song song ⇒ `runCanary` gọi đúng 1 lần, yêu cầu kia có cảnh báo «đang
      chạy cho repo khác»; (f) `runCanary` ném ⇒ cờ bận được hạ (yêu cầu thứ ba lại chạy mồi), đăng ký vẫn 200.
      Mutation: gỡ `finally` hạ cờ ⇒ (f) ĐỎ; gỡ kiểm `kiem.chan` ⇒ (b) ĐỎ.
- [ ] 5.10 Cửa song sinh 4.1: repo fixture khai `runner.image` Node 24 ⇒ cửa thêm repo KHÔNG cảnh báo lệch runtime
      (trước change: cảnh báo oan vì so với `DEFAULT_IMAGE`). Ghi làm ca ĐỎ-trước/XANH-sau.
- [ ] 5.8 `npx tsc --noEmit` sạch + `npm test` xanh TOÀN BỘ, không riêng file vừa sửa.

## 6. Hồ sơ change khác

- [ ] 6.1 `named-debts/tasks.md` › nợ **32**: tick `[x]` kèm «✅ thành change `runner-contract-selftest`», và ghi rõ
      hàng thứ tư (`probe_not_collected`) là thứ nợ gốc chưa có. Nợ **30** KHÔNG tick — ghi một dòng vì sao mồi không
      đóng nó.
- [ ] 6.2 `dependency-install-in-container/tasks.md` › nợ 8.4 (nối bản đồ ảnh vào đường chạy probe): thêm một dòng
      tham chiếu — admin-fe cảnh báo Node 24 ≠ 22 trên cùng lượt 17/09, change này KHÔNG đóng nó.

## 7. Trước merge

- [ ] 7.1 `npx tsc --noEmit && npm test` — toàn bộ.
- [ ] 7.2 Deploy theo `DEPLOY.md`, đối chiếu số liệu.
- [ ] 7.3 Chạy thật (⛔ KHÔNG tick trước khi chạy — ô ở `test-cases.md § 7`): (a) admin-fe **chưa** có `checkmate.yml`
      ⇒ mồi chặn `probe_not_collected` **trước** stage 3, log ghi 0 lời gọi model; (b) admin-fe **sau khi** đội đích
      merge `checkmate.yml` (bản đã soạn và kiểm 17/09) ⇒ mồi đã chứng minh, lượt đi hết; (c) `checkmate` tự chấm ⇒
      mồi đã chứng minh, thêm ≤ 10 giây, verdict không đổi; (d) **cửa thêm repo**: gỡ admin-fe khỏi danh sách rồi
      thêm lại (clone giữ theo luật gỡ-giữ-clone, phụ thuộc đã cài) ⇒ hộp thêm repo hiện ngay cảnh báo
      `probe_not_collected` với hai tên núm, không chuyển trang, repo có trong danh sách; ghi giây mồi. Ghi
      `run_id` vào từng ô.
- [ ] 7.4 PO duyệt.

## 8. ⛔ Ràng buộc thứ tự archive

- [ ] 8.0 Change này **archive được SAU** `probe-environment-preflight` **và** `preflight-multi-ecosystem` —
      capability `probe-environment` chưa tồn tại ở `openspec/specs/`, MODIFIED không có đích (`openspec validate`
      đã báo INFO đúng điều này). Cùng khuôn với `preflight-multi-ecosystem › 7.1`.

## § Sau-merge — nợ có tên

- [ ] 8.1 **Ghi nhớ kết quả mồi theo (commit nhánh gốc, ảnh chạy).** Bản này chạy mồi MỖI lượt. Số đo để quyết:
      Node ___ giây (điền từ 0.4) · Java ___ giây (chưa đo — đo ở lượt chấm thật đầu tiên trên `admin-be` sau khi
      đội đích sửa `test_cmd`). Ngưỡng mở: mồi > 10% thời gian lượt. Khi làm: ghi nhớ sống ở engine là thêm một chỗ
      lưu trạng thái — cân với việc để `apps/web` giữ, và phải tôn trọng ⛔C6 (sửa `checkmate.yml` bằng tay ở nhánh
      gốc phải làm mồi chạy lại ở lượt kế tiếp ⇒ khoá theo commit, không theo thời gian).
- [ ] 8.2 **Chạy mồi SAU khi nút «Cài phụ thuộc» xong** — cửa thứ ba. PO chốt 17/09 mồi chạy ở cửa thêm repo, nhưng
      repo thêm vào khi **chưa** cài phụ thuộc thì cửa môi trường chặn ⇒ mồi không chạy ⇒ `probe_dir` lệch chỉ lộ ở
      lượt chấm đầu tiên. Nút cài phụ thuộc là chỗ môi trường vừa thành đủ điều kiện; nối mồi vào đó là cùng
      `runCanary`, cùng kênh cảnh báo. Không làm trong change này vì cửa kiểm môi trường hôm nay chưa đứng ở đó —
      mồi đi theo cửa ấy, không đi trước. Cái mất khi chưa làm: một lượt chấm ~900 giây cho repo thêm-rồi-mới-cài.
      Số để quyết: bao nhiêu repo trong 6 repo hiện có đi theo thứ tự thêm-rồi-cài (đo 17/09: admin-fe · portal-fe ·
      admin-be · portal-be — 4/6).
- [ ] 8.3 **Bảng mồi chỉ có 6 ngôn ngữ.** Kotlin/Gradle · Go · .NET chưa có hàng ⇒ bỏ qua kèm log. Thêm một hàng là
      một change, kèm fixture chạy thật trên một repo của hệ ấy.
