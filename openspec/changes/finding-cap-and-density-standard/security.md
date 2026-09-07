## S1. Bí mật & rò rỉ

- N/A S1.1 — change không đọc/ghi bí mật. Bốn khoá `standards` là **số** trong repo đích, công khai với ai đọc
  được repo; không phải «giá trị người dùng gõ vào ô cấu hình» của CheckMate (⛔C3). Khối chỉ nhận số: `clampKnob`
  (`volume-standard.ts`) từ chối mọi kiểu khác — T1.2, T1.9.
- ✅ S1.2 — bề mặt CÔNG KHAI: `volume_standard` lên comment PR qua `gate.ts:352`/`:369`. Cái chảy ra là số + một
  nhãn nguồn trong tập đóng `{default, repo, default_unreadable, no_repo}` — không chuỗi tự do nào từ
  `checkmate.yml` đi qua đường này.
- N/A S1.3 — không có giá trị cần che.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 — `resolveVolumeStandard`, `readStandardsCfg`, trường verdict không đọc danh tính.
- N/A S2.2 — không thêm route.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 — máy KHÔNG merge được thêm đường nào; **change không thêm đường ghi `result`**. Luật nhị phân giữ
  nguyên ở `packages/harness/src/verdict.ts:41`; `exceeded: true` MUST NOT đổi verdict (spec «Mật độ được đo…»,
  T2.3, T_cong).
- ✅ S3.2 — vai `tu_dong` không có quyền mới. `standards` đọc từ **repo đích qua git**
  (`volume-standard.ts` → `git show`), không từ `config.json`/`gate.ts`; núm operator `agent.max_probe`
  (`apps/web/src/config.ts:495`) chỉ nới **dải** slider, mặc định 6 giữ.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 — trục chính. `standards` là dữ liệu ngoài **do bên bị chấm viết**; ba lớp: kẹp dải (`clampKnob`,
  predicate `typeof === 'number' && isFinite`) · đọc **nhánh gốc qua git** (`git show <baseRef>:checkmate.yml`,
  khuôn `packages/harness/src/target.ts:136`; **không** khuôn `join(repoPath,…)` — đo được khuôn ấy đọc bản chết)
  · khai lên verdict bốn nguồn. Giá trị của `standards` **không đi vào prompt nào** — chúng chỉ điều khiển phép
  cắt/đếm của máy (T3.6 mốc 7919 ở cả bốn khoá).
- ✅ S4.2 — trả lời model: `callJson` (`jsonx.ts`) + `Array.isArray` (`skill-doc.ts:204`) như cũ; **thêm** lưới
  hình dạng: `chuanMuc(unknown)` (`packages/shared/src/types.ts:8`) không ném — hôm nay `severity: 3` từ model
  làm cả lượt thành «lỗi» (`gate.ts:111` đã bọc `safeString` ở web, engine thì chưa).

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 — không đổi nơi chạy, không đổi mức cô lập. **Số** probe: trần hiệu dụng = `min(repo, operator)` với
  operator mặc định 6 và `probe_cap` mặc định 20 = trần hôm nay ⇒ change không làm lượt nào chạy nhiều probe hơn
  trừ khi operator chủ động nâng. Nâng > 20 mở bốn lỗ ghi ở tasks 7.2 — tài liệu operator nói thẳng (tasks 4.2).
- ✅ S5.2 — không thêm worktree/thư mục tạm; `git show` không đụng working tree (đường dọn `sandbox.ts:418`,
  `:436` không đổi).

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 — không tạo file trên đĩa prod. Fixture `test/fixtures/volume/*.md` là tài liệu test trong repo này.
- ✅ S6.2 — không thêm đường ghi; `volume_standard` đi theo verdict qua đường ghi sổ cái đang có
  (`apps/web/src/ledger.ts`); trường tuỳ chọn ⇒ không ghi đè bản ghi cũ. ⛔C6: không cache, `git show` mỗi lượt.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 — nhánh lỗi mới và đích, **tất cả phải cho số finding ≥ hôm nay**:

  | nhánh | đi về đâu | ca |
  |---|---|---|
  | yml hỏng cú pháp ở base | mặc định, nguồn `default_unreadable` — lộ trên comment | T1.9, T4.4 |
  | giá trị sai kiểu ⇒ `NaN` | ⛔ `[].slice(0, NaN)` = rỗng = 0 finding = **PASS**. Chặn ở `clampKnob`, không ở chỗ dùng | T1.2, T1.3 |
  | `git show` lỗi (file vắng ở ref) | `default` | T2.8 |
  | không repo | `no_repo`, mặc định | T2.9 |
  | `countDocWords` ném / 0 | `reason 'error'/'unmeasurable'`, `counts` đủ, verdict nguyên | T2.4 |
  | severity không phải chuỗi | hôm nay **ném** ⇒ lượt «lỗi»; sau change `high` ⇒ FAIL đúng | T1.13 |

  **Không có nhánh «rơi về mặc định ⇒ không đo»** — mâu thuẫn đã gỡ khỏi spec: lỗi ĐỌC cấu hình ⇒ mặc định và
  vẫn đo; lỗi TÍNH ⇒ không đo, ghi lý do. Ở bước này không có gì để «không áp» vì không có gì áp.
- ✅ S7.2 — không chạm `classifyByMachine`; khử trùng `ma` (`skill-code.ts:875`) chỉ **bớt** finding trùng, không
  đổi trạng thái probe.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 **Mục tiêu «làm phép đo sai hoặc cổng nhẹ đi»** — mọi đường, cả hai chiều:

  | # | đường | trạng thái |
  |---|---|---|
  | 1 | **hạ** `finding_cap` xuống 4 để mật độ không bao giờ vượt | **đóng**: mật độ đo **trước cắt** (T2.2) — hạ trần không hạ được số đo |
  | 2 | nâng `density_per_1000_words` lên 500 | hợp lệ, **phải lộ**: nguồn `repo` + ngưỡng đã nhân trên 5 bề mặt (T2.14) |
  | 3 | nâng `density_floor_words` lên `.inf`/10⁹ | **đóng**: kẹp `[50, 2000]` + `clamped_from` (T1.4) |
  | 4 | sửa `checkmate.yml` trên nhánh PR (nới **hoặc** siết) | **đóng** bằng `git show baseRef` — ca git thật ba giá trị (T2.6/T2.7); mutation `readFileSync` ⇒ đỏ (T2.5) |
  | 5 | làm hỏng yml để rơi về mặc định khi đội đã **siết** | fail-open theo nghĩa change — **lộ** bằng `default_unreadable` (T1.9, T4.4) |
  | 6 | kèm một file `.ts` vào PR tài liệu ⇒ đi đường code ⇒ không đo | ngoài phạm vi (router `github.ts:387`), ghi tài liệu — nợ 7.3 |
  | 7 | model trả severity lạ để lên đầu hàng cắt | **đóng**: lạ xếp **sau** `high` hợp lệ khi sort (T1.12) |
  | 8 | repo khai `probe_cap 100` để đốt sandbox của bên chấm | **đóng**: hiệu dụng = min với operator (T1.10) |
  | 9 | `standards` không phải object / chuỗi cài chỉ thị | **đóng**: chỉ nhận số; không vào prompt (T1.9, T3.6) |

  Đường 1 và 7 là hai đường ngược trực giác (tấn công bằng **hạ** và bằng **lạ**), đúng thứ bản trước bỏ sót.
- ✅ S8.2 — không dismiss đường 4 bằng «luật đã có»: **đo được** ba cửa cũ đọc bản chết (`github.ts:512`, `:428`;
  `runner.ts:61`, `:100`; `spec-source.ts:213`); cửa thứ tư có ca load-bearing hai chiều (T2.5: code hiện tại
  áp 40 sau khi base đổi; mutation đọc đĩa ⇒ lọt). Ba cửa cũ là nợ 7.1, không nới vào đây.
- ✅ S8.3 — đối xứng: PR nới **và** PR siết đều không ăn (T2.6/T2.7); kẹp **hai đầu** mọi khoá (T1.1/T1.4).

## Notes

- **Rủi ro lớn nhất của bước này không phải bảo mật mà là ĐO SAI**: nếu `countDocWords` hay điểm đếm sai thì
  change ép chuẩn sau sẽ chốt ngưỡng trên số rác. Vì thế `count_method: 'v1'` lên verdict — đổi cách đếm là
  đổi phiên bản, và số cũ không lẫn với số mới.
- **Bốn lỗ đường code có sẵn, change không mở rộng nhưng cũng không vá**: trả lời cụt không nhận diện
  (`model.ts:235/:333`, `jsonx.ts:19`) · file probe cụt vẫn nạp, `that_lac` không chặn PASS (`jsonx.ts:57`,
  `verdict.ts:84`) · treo 300 s ⇒ FAIL giả (`sandbox.ts:305`) · comment PR không cắt (`gate.ts:370`). Mặc định
  20/6 giữ chúng ngoài tầm; ai nâng là mở. Ghi ở tasks 7.2 làm **điều kiện tiên quyết**, và tài liệu operator.
- **`sandbox-isolation/spec.md:97` đang khai một cơ chế không có** («bản trên đĩa của clone»). Change này bỏ chữ
  ấy khỏi `target-contract` và để `sandbox-isolation` cho change fix-bug 7.1 — hai luật lệch nhau **trong lúc
  chờ** là có chủ ý, đã khai, và fix-bug là thứ đóng nó.
