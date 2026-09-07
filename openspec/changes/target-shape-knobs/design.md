## Context

`checkmate.yml` nằm trong repo đích, nên mọi khoá của nó là một núm **maker** chỉnh được trên
**checker**. Repo đã có ba phản xạ đúng nhưng **rời rạc**: kẹp dải có ở đúng một khoá (`timeout_s`,
`runner.ts:117`), «đọc nhánh gốc» có spec cho đúng một khoá (`sandbox-isolation › Ảnh chạy…`), và «khai
lên verdict» chưa có ở đâu. Khoá thêm vào ngày mai thừa hưởng chúng bằng may mắn.

Đi kèm là bốn hằng đang ép hình dạng của CheckMate lên repo đích. Hai trong bốn cái **đã là tham số mặc
định** (`tran = TRAN_DIFF` ở `target.ts:148`; `maxDepth = MAX_UNIT_DEPTH` ở `spec-units.ts:56`, `:114`) —
chúng chỉ thiếu nguồn cấu hình, nên phần này rẻ hơn vẻ ngoài.

## Goals / Non-Goals

**Goals**
- Ba lớp phòng thành **luật chung có sổ khoá + lưới**, không còn là phản xạ rời rạc.
- `TRAN_DIFF`, `MAX_UNIT_DEPTH` nhận nguồn cấu hình qua tham số đã có.
- Đóng cửa song sinh timeout ở `chayVitest`; đưa `FILE_PROBE_MOI` về cùng cửa với `runner.probe_file`.
- Verdict khai khoá hình dạng đã áp + nguồn.

**Non-Goals**
- **Không** sửa `RE_CODE` (`spec-units.ts:37`). Bản rà đầu xếp nó là «ép định dạng `R**`» — **sai**: địa
  chỉ đơn vị luật lấy từ tiêu đề (`spec-units.ts:95`), mã chỉ là trường tuỳ chọn. Luật
  `spec-source › Luật là ĐƠN VỊ CÓ ĐỊA CHỈ` đã hiện thực đúng, không có gì để sửa.
- **Không** đưa thêm hằng nào ra `checkmate.yml` ngoài bốn cái đã liệt — đặc biệt KHÔNG đưa `TOOL_CAM`,
  `MODEL_MAC_DINH`, `REGRESSION_STATES`, `IMAGE_NAME_SHAPE`, `RE_OWN_PROBE`, `CAN_HAI_VE` (rổ B của bản
  rà: mỗi cái ra `checkmate.yml` là một núm hạ cổng).
- **Không** đụng luật nhị phân PASS/FAIL.
- **Không** nhận `TRAN_GOI_MS` (`model.ts:88`) vào `checkmate.yml`: đó là hạ tầng của **máy chủ
  CheckMate**; repo đích kéo dài timeout là kéo dài tiền và thời gian máy của bên chấm.

## Decisions

**D1 — Sổ khoá + lưới đếm, KHÔNG lưới phán ngữ nghĩa.** Máy không biết «khoá này có cần đọc nhánh gốc
không» — đó là ngữ nghĩa, và luật lưới của repo nói rõ một lưới đoán ngữ nghĩa sẽ sai theo cả hai chiều.
Thứ máy kiểm được là **đối chiếu tập khoá cửa đọc thật sự parse với tập khoá có hàng trong sổ**. Lưới
khẳng định «đã khai và đã có người xét», không khẳng định «ba lớp đã đúng» — và spec nói thẳng ranh giới
ấy. Tiền lệ cùng hình dạng: `docs/identifier-allowlist.md`.

**D2 — Mặc định phải NGHIÊM HƠN hoặc BẰNG mọi giá trị repo khai được.** Nếu có khoá nào mà «bỏ trống»
lỏng hơn «khai số» thì cách rẻ nhất để nới cổng là **làm hỏng `checkmate.yml`** — một dấu nháy sai, và
nó trông hệt một lỗi gõ vô tình. Kiểm bất biến này cho từng khoá khi apply, không suy.

**D3 — Đọc nhánh gốc: kiểm hiện thực trước, đừng dựng cơ chế mới.** Luật đã có
(`sandbox-isolation › Ảnh chạy…`), và lý lẽ của nó khai cùng luật áp cho `runner.test_cmd` và
`sources.specs`. Việc của change này là **nâng luật lên phạm vi chung** và **đo xem hiện thực có khớp
không**. Nếu không khớp → đó là lỗi so với luật đang có hiệu lực, tách change `checkmate-fix-bug` riêng,
không nới phạm vi ở đây.

**D4 — Cửa song sinh timeout: gộp về MỘT giá trị, không đồng bộ HAI hằng.** Cách sai là để
`300_000` và chuỗi `"300s"` rồi thêm test bắt chúng khớp nhau — đó là dựng thêm một cửa song sinh rồi
canh nó. Cách đúng là chỗ in thông điệp **đọc chính giá trị đã dùng để cắt**, như đường runner đã làm
(`sandbox.ts:373`).

**D5 — Trần độ sâu vẫn phải có.** Nới thoải mái không phải cải thiện: spec 30 trang chia tới `#####` vỡ
thành hàng trăm đơn vị, và độ phủ thành mẫu số vô nghĩa theo chiều ngược lại (chú thích
`spec-units.ts:30` đã khai đúng lý do này).

## Architecture

```
                       so khoa (docs/) <---- luoi doi chieu <---- cua doc parse nhung khoa nao
                              |
packages/harness/src/runner.ts   ham kep dai dung chung + doc khoa hinh dang
        |
        +-- target.ts       tran diff   -> qua tham so DA CO  (target.ts:148)
        +-- spec-units.ts   do sau      -> qua tham so DA CO  (spec-units.ts:56, :114)
        +-- sandbox.ts      timeout duong mac dinh: MOT gia tri, cat va in cung doc no
        +-- skill-code.ts   ten file probe -> cung cua voi runner.probe_file
        |
        v
packages/shared/src/types.ts   verdict khai khoa hinh dang da ap + nguon
        v
apps/web/src/ui.ts · cli.ts    bay ra
```

## Data Model

Verdict thêm trường **tuỳ chọn** khai khoá hình dạng đã áp, cùng khuôn với `volume_standard` của change
`finding-cap-and-density-standard`: mỗi khoá là `{ value, source: 'default' | 'repo', clamped_from? }`.

- **Ai ghi:** engine, một lần, lúc dựng verdict. **Ai đọc:** `ui.ts`, `cli.ts`, comment PR. **Ai dọn:**
  không ai.
- **Vắng = KHÔNG BIẾT**, không phải «đã đo và bằng mặc định» — verdict đời cũ đọc ra đúng như thế bằng
  chính việc trường vắng. **Không cần di trú**: trường tuỳ chọn, không ghi đè bản ghi cũ.
- **Sổ khoá** là file tài liệu trong repo này (không phải dữ liệu prod, không vào gói deploy).

**Ghi file dùng chung:** N/A — không thêm đường ghi nào; các cửa đọc **chỉ đọc**.
**Cache (⛔C6):** cửa đọc khoá hình dạng **không cache**, cùng nếp ba cửa đọc `checkmate.yml` hiện có.
**Không gọi model trong khoá:** N/A.

## Bề mặt đã ĐẾM BẰNG MÁY (luật tầng 2)

```bash
grep -rn "join(repoPath, 'checkmate.yml')" packages/ --include=*.ts   # 3 cua doc
grep -n  "TRAN_DIFF"       packages/harness/src/target.ts             # 3 (:73 dinh nghia, :148 tham so, :239 chu thich)
grep -rn "MAX_UNIT_DEPTH"  packages/ apps/ --include=*.ts | grep -v test  # 3 (:34 :56 :114)
grep -n  "300_000\|300s"   packages/harness/src/sandbox.ts            # 2 (:305 cat, :311 thong diep)  <- cua song sinh
grep -rn "FILE_PROBE_MOI"  packages/harness/src/skill-code.ts         # dem khi apply
```

⚠ Phép đếm cửa đọc bám chuỗi `join(repoPath, 'checkmate.yml')`. Ai đó đọc file bằng đường khác thì nó
mù — nên lưới sổ khoá phải đối chiếu theo **khoá được parse**, không theo số cửa đọc, và `test-cases.md`
có mục «chạy thật một lượt».

## Risks / Trade-offs

- **Mỗi khoá mới là một núm maker chỉnh được trên checker** → ba lớp phòng + sổ khoá + lưới đếm; và D2
  bảo đảm làm hỏng file không nới được gì.
- **Sổ khoá có thể thành nghi thức** — ai cũng thêm hàng cho qua lưới mà không thật sự xét → chấp nhận
  có ý thức: lưới chỉ khẳng định «đã khai», spec nói rõ thế, và loại lỗi «lưới đúng luật sai» chỉ người
  đọc mới bắt được. Khai ra chứ không giả vờ đã kín.
- **Nới trần diff làm phình ngân sách prompt** → kẹp dải, và bắt buộc khai lên verdict.
- **Đổi độ sâu làm đổi NGHĨA của con số độ phủ** mà chữ số trông y hệt → khai mẫu số lên verdict là bắt
  buộc tuyệt đối ở khoá này.
- **D3 có thể lòi ra một lỗ đang mở** (nếu hiện thực đọc từ nhánh PR) → tách change fix riêng, không nới
  phạm vi; nhưng nghĩa là change này **có thể bị chặn** cho tới khi lỗ ấy vá xong.

## Migration Plan

Không di trú dữ liệu. Mọi khoá tuỳ chọn; không khai thì hành vi y hệt hôm nay. Verdict đời cũ vắng
trường ⇒ KHÔNG BIẾT.

**Đường lùi:** bỏ khoá khỏi `checkmate.yml` là quay về mặc định ngay lượt chấm kế tiếp (không cache).

## Open Questions

- Sổ khoá đặt ở đâu — `docs/checkmate-yml-keys.md` riêng, hay một mục trong tài liệu hợp đồng repo đích
  đang có? Chọn chỗ nào thì lưới trỏ vào chỗ đó.
- Dải kẹp cụ thể cho trần diff và độ sâu: em đề xuất lấy mặc định hôm nay làm giữa dải rồi mở hai đầu
  vừa phải, nhưng con số cụ thể cần PO chốt như đã chốt `[4, 1000]` cho trần finding.
