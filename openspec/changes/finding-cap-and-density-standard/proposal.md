## Why

Trần finding của `skill-doc` là hằng cứng `MAX_FINDING = 8` (`skill-doc.ts:69`) **và** một literal `8` gõ tay
trong prompt (`skill-doc.ts:160` — «Tối đa 8 finding»); trần probe của `skill-code` là
`Math.min(20, …)` (`skill-code.ts:54`) và cũng được nói cho model (`skill-code.ts:347`). Cả hai đều cắt bằng
`.slice()` **trước khi có phép đếm nào**, nên hôm nay không lượt chấm nào biết model thật sự trả bao nhiêu.

Điều đã đo được (06/09, lượt review đối kháng trước khi apply):

- **Ở `skill-code`**, trần đã biến thành **định mức**: `ke_hoach = trần` ở 14/14 lượt (`types.ts:186`,
  `skill-code.ts:740`). Đây là phép đo của **trần probe**, không phải của `MAX_FINDING`.
- **Ở `skill-doc`**, 18 lượt trong `runs/`: model trả **0–6** ứng viên khi được cho 8 — trần 8 **chưa từng
  cắn**. PRD demo **gieo lỗi cố ý** (1048 từ) cũng chỉ 3–6 ứng viên. Tức ta **không biết** tài liệu thật
  cho ra bao nhiêu finding khi không bị bảo trước con số, và bất kỳ ngưỡng «tài liệu quá kém» nào chốt hôm
  nay đều chốt trên **không điểm dữ liệu**.

CheckMate phục vụ nhiều đội, nên chuẩn khối lượng phải là **chuẩn công bố tra theo cỡ**, không phải con số
tự chỉnh theo một đội. Nhưng chuẩn công bố chỉ lành mạnh khi có **phép đo để kiểm chứng** — và phép đo đó
chưa tồn tại. Change này dựng phép đo trước; việc **ép** chuẩn là change kế tiếp, mở khi dữ liệu đủ.

## What Changes

**Bước 1 — ĐO, không ép** (phạm vi change này):

- **Gỡ con số khỏi cả hai prompt**, thay bằng **phanh precision không số**: `skill-doc.ts:160` («Tối đa 8
  finding, chỉ lấy những cái chắc chắn nhất») và `skill-code.ts:347` («Đề xuất TỐI ĐA ${MAX_PROBE} probe»).
  Câu thay ghi nguyên văn ở spec; lưới tầng 3 có cặp fixture chặn con số bò lại **và** chặn việc gỡ mất phanh.
- **Trần tách theo skill, cấu hình ở `checkmate.yml`**: `standards.finding_cap` (doc, mặc định 100, kẹp
  `[4, 1000]`) và `standards.probe_cap` (code, mặc định **20** — giữ nguyên trần hôm nay, kẹp `[2, 100]`).
  Trần probe **hiệu dụng** = `min(probe_cap của repo, agent.max_probe của người vận hành)` — núm operator
  đang sống (`config.ts:495`, slider mặc định 6) không bị thay, chỉ nới dải slider để operator **có thể**
  nâng. Verdict khai **cả hai** nguồn và nguồn nào đang cắn.
- **Đếm trước cắt, cắt sau lưới máy, cắt đúng MỘT chỗ.** Ba `.slice` của `skill-doc` (:204, :260, :264)
  gộp về một chỗ cắt **sau** lưới rubric + tham chiếu chết + neo trích dẫn, **trước** vòng phản biện. Sắp
  theo **severity hiệu lực** (sau kẹp theo rubric, không phải mức model gán thô), ổn định, và ứng viên đã
  neo ở vòng 1 không bị vòng 2 đẩy ra.
- **Mật độ được ĐO và GHI ở mọi lượt doc, chưa ép.** Điểm đo = số ứng viên **đã qua lưới máy**, trước cắt.
  Đơn vị «từ» có định nghĩa máy (`countDocWords`, phương pháp `v1`), sàn 300 từ kẹp `[50, 2000]`, bậc thang
  theo cỡ với **số tạm** (300–1000 từ: 20 · 1000–5000: 12 · >5000: 8 finding/1000 từ). Verdict ghi
  `words`, `measured_per_1000`, `band`, `exceeded`, và `applied: false` kèm lý do.
- **Chuẩn đọc từ nhánh gốc bằng `git show <baseRef>:checkmate.yml`**, không đọc đĩa. Lệnh doc của server
  truyền `--base` (hôm nay thiếu — `server.ts:312`, `:989`); tài liệu dán tay/tải lên không có repo → mặc
  định, verdict khai `source: 'no_repo'`.
- **Verdict khai chuẩn đã áp + nguồn + số đếm theo tầng** — `verdict-contract` sửa requirement gốc theo
  tiền lệ (MODIFIED, như `cach_ly`).
- `chuanMuc` nhận `unknown` — giá trị không phải chuỗi fail-closed về `high` thay vì **ném** (`types.ts:8`;
  `gate.ts:111` đã biết lỗ này, engine thì chưa).

**KHÔNG có ở bước này** (ghi để không ai tưởng đã có):

- **Không có lối thoát sớm, không FAIL vì mật độ.** Tài liệu 50 finding `low` / 0 `high` vẫn `PASS` y hệt
  hôm nay. Thay đổi hành vi cổng («vượt chuẩn ⇒ FAIL») là **change kế tiếp**, mở khi sổ cái có ≥ 30 verdict
  doc mang `volume_standard.counts` — điều kiện kiểm bằng máy, không phải một ngày hẹn.
- **Không nâng mặc định `probe_cap` lên 100.** Trần thật của đường code là **token đầu ra của provider**
  (`model.ts:235` `max_tokens: 8000`, `:333` `16000`; CLI không nới được) ≈ 25–40 probe; và cap lớn hơn kéo
  theo bốn lỗ đã đo (file probe cụt vẫn nạp ⇒ `that_lac` ⇒ có thể PASS · treo 300 s ⇒ FAIL giả · comment
  PR vượt 65 536 ký tự ⇒ không đăng · mỗi probe hạng 2 một sandbox). Bốn lỗ ấy là **điều kiện tiên quyết**
  có tên ở tasks § Sau-merge trước khi ai nâng mặc định.
- Không đổi router: mật độ chỉ đo ở lượt định tuyến sang doc.

## Capabilities

### New Capabilities

- `finding-volume-standard`: trần khối lượng tách theo skill và cấu hình được; prompt không mang số nhưng
  còn phanh; đếm trước cắt, cắt sau lưới, cắt một chỗ; mật độ đo theo định nghĩa máy và bậc thang theo cỡ,
  **chỉ ghi**; chuẩn đọc từ nhánh gốc qua git.

### Modified Capabilities

- `verdict-contract`: requirement «Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ» — MODIFIED,
  thêm nghĩa vụ mang `volume_standard` (chuẩn đã áp + nguồn + số đếm theo tầng + phép đo mật độ), chép
  nguyên khối cũ.
- `target-contract`: requirement «`checkmate.yml` là tuỳ chọn; khai thiếu hoặc khai hỏng thì rơi về mặc
  định» — MODIFIED, thêm khối `standards` và **bỏ chữ «bản trên đĩa»** khỏi luật đọc nhánh gốc (cơ chế đọc
  không phải luật; cơ chế đúng là `git show`).

## Luật chạm tới

- **Luật chạm tới:**
  - `finding-volume-standard › Trần khối lượng tách theo skill, là khoá cấu hình có kẹp dải, và trần hiệu dụng khai đủ nguồn` — ADDED
  - `finding-volume-standard › Model MUST NOT được cho biết trần, nhưng prompt MUST còn phanh precision` — ADDED
  - `finding-volume-standard › Đếm trước cắt, cắt sau lưới máy, cắt đúng một chỗ, sắp theo severity hiệu lực` — ADDED
  - `finding-volume-standard › Mật độ được đo theo định nghĩa máy và ghi ở mọi lượt doc — bước này chỉ quan sát` — ADDED
  - `finding-volume-standard › Chuẩn đọc từ nhánh gốc qua git, không từ đĩa; không repo thì khai no_repo` — ADDED
  - `verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ` — MODIFIED
  - `target-contract › checkmate.yml là tuỳ chọn; khai thiếu hoặc khai hỏng thì rơi về mặc định` — MODIFIED
  - **⛔C1** — không đổi: change này **không thêm đường nào** ghi `result`; `verdict.ts:41` giữ nguyên.
  - **⛔C2** — bốn nhánh lỗi mới (yml hỏng · giá trị sai kiểu · đếm từ lỗi · severity không phải chuỗi)
    đều MUST NOT làm ít finding hơn hôm nay hay ra PASS; ca `NaN` cắt sạch finding là ca chết người.
  - **⛔C4** — `standards` là dữ liệu ngoài **do bên bị chấm viết**: kẹp dải · đọc nhánh gốc qua git · khai
    lên verdict. Giá trị của nó MUST NOT đi vào prompt.
  - **⛔C5** — export mới (`readStandardsCfg`, `countDocWords`, `measureDensity`, `cutBySeverity`,
    `effectiveDocSeverity`, `clampKnob`) khai vào bảng module của `checkmate.yml` repo này.
  - **⛔C6** — cửa đọc chuẩn không cache; đọc qua git mỗi lượt.
  - `sandbox-isolation › Ảnh chạy do repo đích khai, và đọc từ NHÁNH GỐC` — **không sửa ở đây**; nhưng đo
    được rằng hiện thực của ba cửa đọc cũ **không khớp** luật này (đọc đĩa = snapshot lúc clone). Đó là lỗi so
    với luật đang có hiệu lực → change `checkmate-fix-bug` riêng, tasks § Sau-merge.

## Impact

| file | đổi gì |
|---|---|
| `packages/harness/src/volume-standard.ts` | **mới** — `clampKnob` · `countDocWords` · `measureDensity` · `cutBySeverity` · `effectiveDocSeverity` (dời từ `skill-doc.ts:330–332`) · `DENSITY_BANDS` |
| `packages/harness/src/runner.ts` | `readStandardsCfg(readAtBase)` — cửa đọc thứ tư, nhận hàm đọc `git show` từ nơi gọi |
| `packages/harness/src/skill-doc.ts` | :160 thay câu · :69 → trần cấu hình · gộp ba `.slice` (:204 :260 :264) về một chỗ sau neo · đo mật độ · `runDocSkill` nhận `VolumeStandard` đã giải |
| `packages/harness/src/skill-code.ts` | :347 thay câu · :54 `MAX_PROBE` → `min(repo, operator)` · khử trùng `ma` ở :875 |
| `packages/harness/src/cli.ts` | giải chuẩn ở tầng có repo + base (:76) rồi truyền xuống hai skill; `--base` cho doc |
| `apps/web/src/server.ts` | :312, :989 lệnh doc truyền `--base` |
| `apps/web/src/config.ts` | `PROBE_DEPTH.max` 12 → 100 (mặc định 6 giữ nguyên) |
| `packages/shared/src/types.ts` | `VolumeStandard` · `chuanMuc(s: unknown)` |
| `apps/web/src/gate.ts` · `ui.ts` · `ui-history.ts` · `packages/harness/src/cli.ts` | 5 bề mặt PHẢI bày chuẩn (đếm bằng máy ở design) |
| `checkmate.yml` (repo này) | khai export mới (⛔C5); header liệt kê khối `standards` |
| `test/` | lưới tầng 3 `scanPromptQuota` có cặp fixture · ca đếm/cắt/mật độ · ca git thật cho nhánh gốc |
