## Context

Đường chạy probe hôm nay tin hợp đồng của repo đích mà chưa từng bắt nó tự chứng minh. Hai bộ đọc kết quả
(`chayVitest` đọc JSON, `chayTheoRunner` đọc JUnit XML — `packages/harness/src/sandbox.ts`) khi thấy **0
test** đều trả `ok: false` với một **chuỗi** `loiThu` rơi về câu dự phòng; bên gọi (`skill-code.ts` ~707–733)
phân loại chuỗi ấy bằng `looksLikeEnvironmentFailure` — bảng đóng theo mã lỗi, và câu dự phòng không mang mã
nào — nên rơi vào nhánh «lỗi probe» và sinh lại. Đo 17/09 trên admin-fe PR #83 (`runs/wmu4u2abqap9w`):
894 giây, 3 lời gọi model, kết cục «Probe không thu thập được sau 2 lần sinh». Nguyên nhân (`include` của
vitest ở repo đích không phủ `test/`) tìm ra bằng tay.

Ràng buộc đứng sẵn:
- `probe-environment` là capability **chưa archive** (`probe-environment-preflight`), và `preflight-multi-ecosystem`
  cũng đang sửa nó. Change này viết MODIFIED dựa trên bản **mới nhất** của hai change ấy và archive **sau cả hai**.
- ⛔C4: phân loại kết cục MUST NOT so khớp lời văn stdout của repo đích. Bộ đọc hiện đã làm đúng cho lỗi nạp
  file (`detectLoadFailures` nhận diện bằng **hình dạng** kết quả); change này giữ đúng nếp ấy.
- Kho khuôn: ba chỗ cùng «ghi file probe rồi chạy» — đường thật (`chay` closure trong `chayCaHaiNhanh`, ~614),
  cửa đột biến (~1050), và nay thêm mồi. Hai chỗ đã từng lệch nhau về tên file probe (chú thích ~1040) — bài
  học «cửa song sinh» của repo.

**Đếm bề mặt bằng máy** (Tầng 2 của luật lưới — ghi trước khi viết ca):

```bash
grep -n "return {" packages/harness/src/sandbox.ts | sed -n '/chayVitest/,/chayTheoRunner/p'   # 5 điểm trả về trong hai đường chạy: 385 · 388 · 417 · 447 · 450 · 468
grep -rn "chayVitest(\|chayTheoRunner(" packages/harness/src apps/web/src | grep -v sandbox.ts | wc -l   # 2 người gọi hôm nay (đường thật · cửa đột biến) → 3 sau change
grep -rn "loiThu" packages/harness/src apps/web/src | grep -v sandbox.ts | wc -l   # 13 chỗ đọc chuỗi loiThu — mọi chỗ vẫn chạy, chỉ thêm nhánh đọc `reason` TRƯỚC
```

Điểm trả về có **0 test mà không phải treo**: `388` (vitest không ra file), `417` khi `numTotalTests = 0`,
`450` (runner không ra XML), `468` khi `tong = 0`. Bốn điểm, hai bệnh: **không có đầu ra** (388 · 450) và
**đầu ra rỗng** (417 · 468). Mỗi điểm phải gắn `reason` đúng bệnh và giữ stdout/stderr — ca test đếm đủ bốn.

## Goals / Non-Goals

**Goals**
- Hợp đồng chạy probe tự chứng minh bằng **mồi** trước lời gọi model đầu tiên, đi **đúng đường** probe thật sẽ đi.
- Mồi chạy ở **cả cửa thêm repo** (PO chốt 17/09) — cùng hàm, cùng bảng kết cục, kết cục chặn thành cảnh báo.
- Kết cục «0 test» thành **kiểu có tên** ở tầng sandbox, không phải chuỗi; bên gọi rẽ nhánh bằng kiểu.
- `probe_not_collected` ở đường thật **không sinh lại**, ở cả hai nhánh.
- stdout/stderr của bộ chạy **đi ra** khi đầu ra rỗng — sau bộ che.
- Ba người gọi «ghi + chạy + đọc» dùng **một** hàm.
- Chi phí mồi **đo và ghi** vào log lượt chạy.

**Non-Goals**
- KHÔNG đọc cấu hình thu thập của repo đích để đoán `probe_dir` (lý do ở proposal).
- KHÔNG ghi nhớ kết quả mồi qua các lượt — chưa có số đo chi phí; thành nợ có tên kèm cột số.
- KHÔNG chạy mồi sau khi nút «Cài phụ thuộc» xong — đó là cửa thứ ba mà cửa kiểm môi trường hôm nay chưa đứng;
  mồi đi theo cửa kiểm môi trường, không đi trước nó. Nợ có tên 8.2.
- KHÔNG đổi hình dạng `RunnerCfg`, KHÔNG đổi mặc định `probe_dir`/`probe_ext` — đổi mặc định là đổi hành vi cho
  mọi repo đang chạy đúng.
- KHÔNG thêm mẫu chuỗi vào `looksLikeEnvironmentFailure` (⛔C4).

## Decisions

**D1 — Kết cục là KIỂU đặt ở tầng sandbox, không phải chuỗi phân loại ở tầng gọi.**
`VitestResult` thêm `reason?: 'output_missing' | 'not_collected'` và `runnerOutput?: { stdout; stderr }` (mỗi
chuỗi cắt 1800 ký tự, chỉ điền khi `reason` có). Sandbox là nơi **biết** vì sao 0 test (nó cầm `kq.stdout`, nó
thấy file có hay không); bắt tầng gọi suy lại từ chuỗi là đúng cái lỗ hôm nay. *Phương án bác:* thêm mẫu
`/Không thu thập được/` vào `looksLikeEnvironmentFailure` — so khớp lời văn của **chính engine**, không vi phạm
⛔C4, nhưng gắn phân loại vào một chuỗi tiếng Việt ai sửa câu là gãy gác im lặng; và nó không mang stdout ra.
`treo` giữ nguyên, không gộp vào `reason` — đổi thứ không hỏng là mở rộng diff vô cớ.

**D2 — Một hàm `runProbeFile` cho ba người gọi.** Hoist closure `chay` (skill-code ~614–626) thành hàm cấp
module `runProbeFile({ repo, sha, code, fileName, probeDir, runner, image, parseJUnit })` → `VitestResult`,
tự dựng và huỷ `Sandbox`. Đường thật, cửa đột biến và mồi gọi cùng hàm. *Vì sao không để mồi tự dựng sandbox
riêng:* đó là chỗ thứ ba quyết «file probe tên gì, nằm đâu, chạy lệnh gì» — hai chỗ đã từng lệch (chú thích
~1040), chỗ thứ ba sẽ lệch. Mồi **chỉ có giá trị khi nó đi đúng đường** probe thật; đường riêng thì nó chứng
minh một hợp đồng khác.

**D3 — Mồi chạy trên nhánh GỐC, một lần, sau cửa kiểm môi trường và trước stage 3.** Hợp đồng đọc từ nhánh
gốc (`target-contract`), nên chứng minh ở nhánh gốc. Pull request đổi phạm vi thu thập chỉ ở nhánh nó thì
gác ở đường thật (D5) bắt — mồi không cần chạy hai nhánh. Chèn tại `skill-code.ts` giữa khối chặn môi trường
(~569–573) và `phat({ stage: 3 })` (~575): cửa môi trường chặn thì mồi không chạy.

**D4 — Bảng mồi ĐÓNG theo đuôi ngôn ngữ, module mới `packages/harness/src/runner-canary.ts`.**
- `canaryLanguage(probeExt)`: lấy đuôi cuối (`.probe.test.ts` → `ts`) tra bảng đóng `ts · tsx · js · mjs · py ·
  java`; ngoài bảng → `null` (bỏ qua kèm log).
- `CANARY_ID = 'CANARY'` và tên test bắt đầu bằng id ấy ở **mọi** ngôn ngữ (`CANARY: CheckMate runner contract`
  · `test_CANARY_runner_contract` · phương thức `CANARY_runner_contract`) — nối bằng chính `matchProbeId`
  (cắt `test_`, so tiền tố, ký tự sau không phải chữ số). Id không đụng dải `P<n>` của probe thật.
- Thân mồi TS/JS: `import { test, expect } from 'vitest'` khi `framework` khớp `/vitest/i` hoặc đường mặc
  định; `framework` khớp `/jest/i` thì dùng global. Khớp là so **giá trị repo tự khai** với bảng đóng của
  engine — không phải so lời văn lỗi. Đoán sai ⇒ mồi không nạp ⇒ bỏ qua kèm log (fail-safe, xem D6).
- Java: cần `runner.probe_file` (tên lớp = tên file); vắng ⇒ bỏ qua kèm log «mồi Java cần probe_file».
- Thân mồi là **hằng của CheckMate**, không nội suy gì từ repo đích ngoài tên lớp Java đã qua kiểm hình dạng
  (`/^[A-Za-z_][A-Za-z0-9_]*$/`) — (⛔C4).

**D5 — Bốn kết cục chặn, một bỏ qua, một đi tiếp; phân loại bằng `classifyCanaryOutcome(kq, CANARY_ID)`
trong `runner-canary.ts`**, đọc `reason` · `tongTest` · `probes` · `loiNap`:

| thứ tự kiểm | điều kiện | kết cục |
|---|---|---|
| 1 | `kq.treo` | chặn `runner_output_missing` (mồi không thể treo; treo là bộ chạy) |
| 2 | `kq.reason === 'output_missing'` | chặn `runner_output_missing` |
| 3 | `kq.loiNap` có file mồi | **bỏ qua** — mồi không hợp repo (log lý do nạp) |
| 4 | `kq.reason === 'not_collected'` (tổng 0, không lỗi nạp) | chặn `probe_not_collected` |
| 5 | không probe nào `matchProbeId(title, CANARY_ID)` | chặn `canary_not_in_output` |
| 6 | probe mồi có nhưng `status !== 'failed'` | chặn `canary_not_failed` |
| 7 | còn lại | **đã chứng minh** |

Thứ tự là luật: lỗi nạp (3) đứng **trước** «0 test» (4) vì lỗi nạp cũng cho 0 test — đảo lại thì mồi viết
sai khuôn bị kê thành «không thu thập được» và đổ lỗi cho `probe_dir` của repo đích.

Cùng hàm ấy, gọi với `canaryId = undefined`, là gác ở đường thật: chỉ hàng 4 có nghĩa (`probe_not_collected`,
không sinh lại); các hàng còn lại trả `null` để đường cũ chạy như cũ. `chayCaHaiNhanh` trả thêm `reason` và
`runnerOutput` của nhánh hỏng; nhánh `loiThu !== undefined` (~707) kiểm `reason === 'not_collected'` **trước**
`looksLikeEnvironmentFailure`, ném lỗi có tên bệnh, không sinh lại. *Vì sao một hàm hai vai thay vì hai
hàm:* «0 test không lỗi nạp = không thu thập được» là một luật; hai biểu thức cho một luật là khuôn lệch đã bị
bắt chín lần.

**D6 — Bỏ qua mồi là fail-safe, chặn mồi là fail-closed; ranh giới nằm ở «lỗi của ai».** Mồi không nạp / đuôi
lạ / Java thiếu `probe_file` là **CheckMate chưa viết mồi cho khuôn này** → bỏ qua, log, probe thật vẫn chạy
và gác đường thật vẫn gác; không có gì thành PASS nhờ bỏ qua. Bốn kết cục còn lại là **hợp đồng repo đích
hỏng** → chặn trước khi tốn token (⛔C2). *Phương án bác:* chặn khi không có mồi — biến một phép kiểm đứng
trước thành cửa từ chối mọi hệ mới, đúng thứ `preflight-multi-ecosystem` vừa gỡ.

**D7 — Thông điệp bằng tên núm, đầu ra bộ chạy đi kèm sau bộ che.** `describeCanaryOutcome(kind, ctx)` trong
`probe-preflight.ts` cạnh `describeEnvironmentFailure`, bảng đóng kết cục → câu; `ctx` = đường file probe đã
ghi, `probe_dir`, `probe_ext`, có `test_cmd` hay không. stdout/stderr nối sau, qua `redactMessage(…,
humanSurfaceSource(t))` ở bề mặt người và **không** đi vào prompt (mồi không có lượt sinh lại). Không có đường
ghi mới lên GitHub: lượt dừng bằng `throw` như cửa môi trường, đi qua đúng bề mặt đã gác.

**D9 — Cửa thêm repo: cùng hàm, kết cục thành cảnh báo, thời hạn riêng, một mồi một lúc.** Trong
`/api/repo/them` (`server.ts` ~751–753), sau `preflightProbeEnvironment` và **chỉ khi `kiem.chan` rỗng**, gọi
`runCanary({ repo: dich, sha: HEAD của clone, runner: readRunnerCfg(dich), image, timeoutS:
CANARY_TIMEOUT_AT_ADD_S })` — đúng hàm của đường chấm, chỉ khác ba điều:

| khác | đường chấm | cửa thêm repo | vì sao |
|---|---|---|---|
| hậu quả kết cục chặn | `throw`, lượt hỏng | thêm chuỗi vào `canh_bao_moi_truong` | đăng ký ≠ verdict; cùng luật với điều kiện môi trường (`probe-environment`) |
| thời hạn | `runner.timeout_s` (≤ 3600) | `min(runner.timeout_s, CANARY_TIMEOUT_AT_ADD_S = 180)` | đây là một yêu cầu HTTP; nginx 600s, giao diện đang chờ |
| hết giờ | `runner_output_missing` | **chưa kết luận** — câu riêng, không tên bệnh | thời hạn của HTTP không phải thời hạn của bộ test; Java hợp lệ có thể cần hơn 180s |

Kết cục `proven` ở cửa này không thêm gì vào trả lời — im lặng là tín hiệu tốt, cùng nếp với cửa môi trường.

**Single-flight trong tiến trình**: một biến module `addTimeCanaryBusy`; đang bận thì yêu cầu thêm repo thứ hai
**bỏ qua mồi** kèm cảnh báo «mồi đang chạy cho repo khác — lượt chấm đầu tiên sẽ kiểm». *Vì sao:* mồi ở cửa
này **không nằm dưới `TRAN_SONG_SONG`** của lượt chấm (`runs.ts`), nên không có gì chặn N yêu cầu thêm repo dựng
N container cùng lúc — với tài khoản đã đăng nhập đó là một đường làm máy chủ nghẹt bằng một vòng `for`. Trần
riêng = 1 là đủ vì thêm repo là việc hiếm và tuần tự của người vận hành. *Phương án bác:* xếp hàng chờ — thêm
trạng thái cho một việc hiếm; và bỏ qua vẫn an toàn vì lượt chấm đầu tiên kiểm lại.

**Cửa song sinh đóng luôn:** dòng 751 hôm nay gọi cửa kiểm môi trường với `DEFAULT_IMAGE` và không có `testCmd`,
trong khi đường chấm (`skill-code.ts:566–567`) dùng `runner?.image` và `runner?.test_cmd`. Repo khai `runner.image`
Node 24 sẽ bị cửa thêm repo cảnh báo lệch runtime **oan** so với ảnh mặc định. Mồi cần `readRunnerCfg(dich)` ở
đúng dòng ấy, nên sửa luôn cửa môi trường dùng cùng `runner` — hai cửa cùng vai đọc cùng một nguồn.

Không đổi giao diện: `ui-repo.ts:155–160` đã hiện `canh_bao_moi_truong` thành danh sách và không chuyển trang.

**D8 — Đo chi phí, không tối ưu trước.** `phat({ type:'log', msg: 'Mồi hợp đồng runner: đã chứng minh — 4.2s' })`.
Số ấy là đầu vào cho nợ «ghi nhớ theo (commit nhánh gốc, ảnh chạy)». Bản này chạy mỗi lượt vì: một lượt sandbox
Node ≈ 5 giây (đo 17/09) so với 894 giây mất khi không có mồi; repo Java chưa đo — và đó là lý do ghi nợ chứ
không phải lý do làm ngay.

## Architecture

`packages/harness/src` giữ toàn bộ cơ chế; `apps/web/src` chỉ gọi thêm ở một chỗ đã có (`/api/repo/them`),
không thêm route, không đổi giao diện.

```
server.ts  POST /api/repo/them
  ├─ cloneRepo · writeConfig                 (có sẵn)
  ├─ preflightProbeEnvironment(runner từ clone)   (có sẵn — sửa nguồn ảnh/test_cmd, D9)
  ├─ [MỚI] kiem.chan rỗng && !addTimeCanaryBusy
  │     runCanary({..., timeoutS: 180}) ──► cùng đường dưới đây
  │     kết cục chặn → chuỗi vào canh_bao_moi_truong · hết giờ → «chưa kết luận» · proven → im lặng
  └─ res.json({ ok, repo, canh_bao_moi_truong })   (ui-repo.ts đã hiện, không chuyển trang)

skill-code.ts  runCodeSkill
  ├─ preflightProbeEnvironment            (có sẵn — chặn thì dừng, mồi không chạy)
  ├─ [MỚI] runner-canary.ts
  │     writeCanary(lang, id, framework) → code mồi (hằng)
  │     runProbeFile({...baseSha, code mồi})  ──► sandbox.ts chayVitest | chayTheoRunner
  │     classifyCanaryOutcome(kq, 'CANARY')   ──► chặn (throw, tên bệnh) | bỏ qua (log) | đi tiếp
  │     describeCanaryOutcome(kind, ctx)      (probe-preflight.ts)
  ├─ stage 3 sinh probe (model)
  ├─ chayCaHaiNhanh ── runProbeFile ×2 ──► classifyCanaryOutcome(kq) → 'probe_not_collected' ⇒ throw, không sinh lại
  └─ cửa đột biến ──── runProbeFile
sandbox.ts  VitestResult += reason · runnerOutput   (4 điểm trả về gắn reason)
```

Luồng dữ liệu stdout/stderr: `chayTrongSandbox` → (chỉ khi 0 test / không đầu ra) `runnerOutput` → thông điệp
sau `redactMessage` → `phat({type:'error'})` → `events.jsonl` + màn run. Không vào prompt, không lên GitHub.

## Data Model

Không đổi hình dạng dữ liệu trên đĩa hay SQLite.
- `runs/<id>/events.jsonl`: thêm dòng `log` (chi phí mồi) và dòng `error` mang tên bệnh — sự kiện tự do, không
  có schema đọc lại; verdict không sinh khi lượt dừng, nên `verdict` không đổi hình dạng.
- File mồi và đầu ra của nó sống trong thư mục sandbox dùng-một-lần (`Sandbox.huy()` dọn), không chạm bản clone,
  không chạm `runs/` ngoài events. Hai lượt chấm song song: mỗi lượt một sandbox riêng — không có file dùng
  chung mới, không cần khoá.
- R9.14 / ⛔C6: không thêm cache đọc nào.

## Risks / Trade-offs

- [Mồi thêm ~5 giây mỗi lượt chấm code Node; Java chưa đo] → ghi số vào log mỗi lượt; nợ có tên «ghi nhớ theo
  commit nhánh gốc + ảnh» với cột số để điền; ngưỡng mở nợ: mồi > 10% thời gian lượt.
- [Đoán sai khuôn mồi (vitest/jest/globals) ⇒ mồi không nạp ⇒ bỏ qua ⇒ mất độ phủ im lặng] → dòng log nói rõ
  «mồi bỏ qua vì …»; ca test khoá rằng bỏ qua **luôn** có log; verdict không đổi nên không xanh giả.
- [Thứ tự phân loại sai ⇒ mồi viết sai khuôn bị đổ cho `probe_dir` repo đích] → thứ tự trong D5 là luật, có ca
  mutation đảo hàng 3 và 4 làm đỏ.
- [Gác đường thật chặn oan một PR mà bộ test của nó hợp lệ cho ra 0 test] → chỉ chặn khi **không có lỗi nạp**
  và **file probe đã ghi**; PR làm bộ chạy không nhặt file probe là đúng thứ phải chặn (không có bằng chứng
  thì không PASS — ⛔C2), và thông điệp nói rõ xảy ra ở nhánh nào.
- [Ba người gọi một hàm ⇒ đổi chữ ký hàm chạm cả cửa đột biến] → ca test hiện có của cửa đột biến
  (`test/*mutation*`) là lưới hồi quy; hoist trước, đổi hành vi sau, hai commit.
- [Archive trước hai change anh em ⇒ MODIFIED không có đích] → task ⛔ ràng buộc thứ tự, giống
  `preflight-multi-ecosystem` 7.1.
- [stdout của repo đích mang bí mật (token in ra khi test hỏng)] → đi qua `redactMessage` như mọi bề mặt người;
  không vào prompt; mutation gỡ `redactMessage` ở đường này phải làm đỏ một ca.
- [Cửa thêm repo nay CHẠY `test_cmd` của repo đích ngay lúc đăng ký — trước đây cửa này chỉ clone] → vẫn trong
  cùng sandbox (không mạng, mount chỉ đọc, ba trần tài nguyên), cùng lệnh mà lượt chấm đầu tiên sẽ chạy dù sao;
  chỉ đổi **thời điểm**, không đổi **quyền**. Ghi rõ ở `security.md › S8`.
- [N yêu cầu thêm repo song song = N container ngoài trần lượt chạy] → single-flight D9; ca test hai yêu cầu
  cùng lúc ⇒ đúng một sandbox được dựng.
- [Yêu cầu HTTP thêm repo treo tới 180s] → dưới nginx 600s; giao diện đã có trạng thái chờ của nút thêm; hết giờ
  là «chưa kết luận», không phải lỗi 500 — đăng ký đã xong trước khi mồi chạy (`writeConfig` đứng trước).

## Migration Plan

N/A — không đổi dữ liệu. Đường lùi: gỡ lời gọi mồi ở một chỗ (`skill-code.ts`, giữa cửa môi trường và stage 3)
thì hành vi về như cũ; `reason`/`runnerOutput` là trường tuỳ chọn, người đọc cũ không chạm.

## Open Questions

- ~~Chạy mồi lúc thêm repo?~~ **PO chốt 17/09: CÓ** — thành D9. Hệ quả còn lại: khi thêm repo mà chưa cài phụ
  thuộc thì cửa môi trường chặn ⇒ mồi không chạy ⇒ người vận hành chỉ biết `probe_dir` lệch ở lượt chấm đầu
  tiên. Cửa thứ ba «sau khi Cài phụ thuộc xong» là nợ có tên 8.2, không nằm trong change này.
- **Ngưỡng mở nợ ghi nhớ**: 10% thời gian lượt là đề xuất của em; PO có số khác thì sửa ở nợ, không ở code.
- **`CANARY_TIMEOUT_AT_ADD_S = 180`** là số em đặt từ hai mốc: Node ≈ 5s đo được, nginx 600s. Java chưa đo;
  nếu mồi Java hợp lệ thường vượt 180s thì cửa thêm repo sẽ luôn «chưa kết luận» cho repo Java — không sai,
  nhưng vô dụng; số đo ở T7.4 quyết có nâng không.
