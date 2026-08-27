# Handoff: CheckMate SPA — single page application

## Overview
Design lại CheckMate (checker độc lập đứng trước nút merge — maker–checker cho code và tài liệu) thành SPA một trang: Login → App shell (header + sidebar) → Dashboard / Run / Lịch sử chạy / Sổ cái / Tin cậy / Cấu hình / Logout. Prototype playable đủ 10 tác vụ của design request (login sai/đúng, chọn repo, thêm repo, chạy kiểm PR, xem FAIL + bằng chứng, tick medium → merge, trả về dev, lịch sử filter + mở run, kiểm & chọn nhà cung cấp, logout).

## Về file design trong gói này
File trong gói là **design reference viết bằng HTML** (Design Component, chạy trực tiếp trong trình duyệt) — prototype thể hiện look & behavior dự kiến, KHÔNG phải production code để copy thẳng. Nhiệm vụ của dev: **dựng lại các màn này trong môi trường thật của repo `thangvv111/checkmate`** (`apps/web` — Express + server-rendered TS hiện tại, hoặc framework FE mà đội chọn), tái dùng đúng schema/khái niệm đã có trong `packages/shared/src/types.ts`, `apps/web/src/ncc.ts`, `config.ts`, `ledger.ts`, `tincay.ts`.

## Fidelity
**High-fidelity.** Màu, chữ, khoảng cách, trạng thái là quyết định cuối — dựng pixel-perfect bằng thư viện/pattern sẵn có của codebase. Toàn bộ token nằm trong `styles.css` kèm gói (design system Modernist) + bộ semantic riêng của CheckMate liệt kê dưới.

## Design tokens
Nền tảng: design system **Modernist** (file `styles.css` kèm gói — dùng biến `var(--*)`, không hard-code):
- Ground `--color-bg #f3f2f2` · surface `--color-surface #eae9e9` · ink `--color-text #201e1d`
- Accent (brand, nút primary, nav active) `--color-accent #ec3013`; ramp `--color-accent-100…900` (login dùng `--color-accent-800 #7c1405`)
- Neutral ramp `--color-neutral-100…900`; divider `--color-divider` (ink 40%)
- Radius **0 mọi nơi** · rule 2px giữa các section lớn, 1px giữa các dòng · shadow `--shadow-sm/md/lg`
- Font heading + body: **Archivo** (`--font-heading` 800 / `--font-body` 400)

Semantic CheckMate (KHÔNG nằm trong Modernist, hard-code đúng các hex này):
- PASS / jade: `#0E9F7E`, đậm `#08655A`, tint nền `#E2F3EE`
- FAIL / high / crimson: `#D0342C`, chữ trên tint `#A3271F`, tint nền `#F9E4E2`
- medium / amber: `#C77A16`, chữ `#8F5810`, tint nền `#F7ECDA`
- Mono (SHA, token, log, số liệu, nhãn pill): **IBM Plex Mono** 400/500/600 (Google Fonts)
- Log console: nền `--color-neutral-900`, chữ `#d7d3d3`; ✓ `#6fd3b4`, ✗/⚑ `#f5a09a`, ℹ/⚠ `#9b9797`

Motif: bàn cờ mờ (conic-gradient trắng 4%, ô 168px) trên nền login; wordmark `Check[Mate]♞` — `[Mate]♞` màu accent.

## App shell
- Header 2px rule dưới: wordmark (click → Dashboard) · repo switcher mono `owner/repo ▾` (dropdown: các repo + số PR chờ + «＋ Thêm repo…») · badge trực `● Trực · 300s` (jade khi bật, click → Cấu hình) · nút Handoff (panel gập phải 300px) · user menu (avatar 22px vuông chữ cái + tên ▾ → Đăng xuất / Mô phỏng phiên hết hạn).
- Sidebar 210px, 2px rule phải: Dashboard · Lịch sử chạy · Sổ cái · Tin cậy · Cấu hình · Nguyên tắc ↗ (link ngoài). Item active: nền accent, chữ trắng, flush-left.
- Main max-width 1240px, padding 26/32. Desktop-first 1366+, không mobile.

## Các màn

### 1. Đăng nhập
Nền `--color-accent-800` + motif bàn cờ; card trắng 430px (shadow-lg, radius 0): wordmark 30px, kicker mono uppercase «Checker độc lập trước nút merge», hr 2px, field username/password (label 12px trên field), nút primary full-width flush-left. Trạng thái: **sai mật khẩu** (banner tint crimson tại chỗ), **đang xác thực** (nút disabled «Đang xác thực…», 900ms), **phiên hết hạn** (banner tint amber khi bị đá về). Câu khẩu quyết ở chân card. Tên đăng nhập in vào receipt cổng merge.

### 2. Dashboard (theo repo đang chọn)
- Hàng đợi PR: grid `52px 1.5fr 1.1fr 90px 170px 290px` — # mono · tiêu đề (sub «skill code/doc») · nhánh @ SHA₇ mono · tác giả · pill trạng thái per-commit (chưa chấm = neutral / PASS·n = tint jade / FAIL·n = tint crimson / ● đang chạy = blink / đã merge = neutral-800 đảo màu; + tag «stale» amber) · hành động: Chạy kiểm (primary) / Xem verdict (secondary) / Vẫn chạy lại (ghost, qua dialog guard idempotent) / «đang chấm — nút khoá».
- Khối «Đã trả về dev — chờ vá & reopen»: dòng rule 1px, ghi chú + nút Xem phán quyết.
- Card «Kiểm nhanh tài liệu rời»: input file (.md/.docx/.pdf) + textarea dán text + nút chạy (disabled khi rỗng).
- Card «Lượt chấm gần đây»: 5 dòng pill + artifact + giờ, click mở replay; link «Toàn bộ lịch sử →».
- Trạng thái: **repo trống** (dòng mono «hàng đợi sạch»), **lỗi GitHub token** (banner 2px crimson, câu lỗi chỉ thẳng cách sửa + nút Vào Cấu hình).

### 3. Run — lượt chấm (màn quan trọng nhất)
- Header: kicker «Lượt chấm · skill x», tiêu đề PR, metaline mono (repo · nhánh @ SHA ← base · tác giả); controls: trạng thái mono («đang chạy · ×8» / «hoàn tất») + Replay + seg ×1/×8.
- 5 bước realtime: Nhận artifact → Nạp spec/rubric → Sinh probe đối kháng → Chạy & đối chiếu bằng chứng → Kết luận. Mỗi bước: mark 40px (`0n` muted / `●` accent blink / `✓` jade / `✗` crimson) + label + duration mono; log mono chảy trong khối nền neutral-900, timestamp mm:ss trái. Nhịp thật ~140–170s, ×8 mặc định.
- Finding card: vạch severity 6px trái (high crimson/medium amber/low neutral) + tag severity + tiêu đề đậm · điều-gì-sai · «hậu quả —» · dòng lệnh probe `$ …` (code) · khối bằng chứng 2 cột: **KỲ VỌNG** (header tint jade) vs **THỰC TẾ** (header tint crimson), pre mono 12px; doc dùng trích dẫn nguyên văn đặt cạnh nhau (quote_pair).
- Khối «Quan sát ngoài phạm vi PR — không đổi verdict»: viền dash, nền surface.
- Verdict: grid 2fr/3fr viền 2px — khối solid jade (PASS) / crimson (FAIL), chữ Archivo 800 54px + artifact @ SHA mono; bảng meta 2 cột mono: finding, probe stats (kế hoạch/ghi nhận/hồi quy/ngoài phạm vi), provider · model, token vào/ra, thời gian chạy, người chạy, bắt đầu, chế độ live/replay.
- Cổng merge (nối liền dưới verdict): **FAIL** → banner «⛔ Merge khoá cứng» + lý do, Merge disabled, Trả về dev vẫn hoạt động; **PASS + medium** → checklist tick từng cảnh báo (checkbox amber, tick ghi «user · giờ»), Merge chỉ sáng khi tick đủ, hint mono «còn n cảnh báo chưa tick»; **Trả về dev** cần ô ghi chú (bắt buộc) → receipt + hướng dẫn reopen (vá trên nhánh cũ → push → Reopen PR); receipt merge tint jade ghi danh người xác nhận. Doc rời: «không có cổng merge»; replay lịch sử: «cổng chỉ đọc».
- Trạng thái khác: **lỗi cấu hình** (dừng ở bước 2, card 2px crimson «nhà cung cấp chưa có khoá đã kiểm» + nút Vào Cấu hình — fail-closed); **stale** (banner amber «verdict ghim SHA cũ, có commit mới» + nút Chấm lại; cổng khoá).

### 4. Lịch sử chạy
6 filter: repo ▾ · verdict ▾ (PASS/FAIL/Lỗi) · skill ▾ · phương thức ▾ (Gói thuê bao/API) · ngày ▾ · tìm tiêu đề/SHA. Bảng: artifact (+ repo @ SHA sub) · skill · kết quả (pill + duration) · provider · model · token v/r · bắt đầu · kết thúc. Phân trang 8 dòng (‹ trang x/y ›). Click dòng → mở màn Run chế độ replay.

### 5. Sổ cái verdict
Kicker «append-only — chỉ ghi thêm, không sửa, không xoá». Bảng: lúc · artifact @ commit (tên đậm + sub mono `repo#PR @ SHA`, tài liệu rời dùng `@ sha256:…`) · tác giả · verdict pill · H·M·L · token · hành động cổng (Merge/Trả về dev — người thao tác). Dòng tổng nền surface: n verdict · n PASS (jade) · n FAIL (crimson) · tổng H·M·L · token.

### 6. Tin cậy
Note «Trust không nới cổng — chỉ để nhìn». Bảng sắp theo **tỉ lệ PASS giảm dần**: tác giả · verdict · PR · tỉ lệ PASS · PASS/FAIL · PASS vòng đầu (theo PR) · streak PASS · high bị bắt (đỏ). Nguồn: tính từ sổ cái (`tincay.ts`).

### 7. Cấu hình (3 khối)
a) **Repos** — card grid (330px min): owner/repo mono + tag «trực bật» · nhánh đích · token che `ghp_xxxx****xxxx` (thiếu → banner tint crimson) · PR chờ · lần chấm cuối · Sửa/Gỡ (Gỡ qua dialog confirm). Nút dash «＋ Thêm repo».
   **Flow thêm repo:** dialog — (1) dán GitHub token → nút **Kiểm tra token** → «đang gọi GitHub…» → ✓ token có hiệu lực / ✗ 401; (2) sau khi ✓ mới hiện chọn repo (chip, danh sách token đọc được) + nhánh đích (chip); (3) nút Thêm repo chỉ sáng khi đã ✓ + đã chọn repo. Repo mới vào switcher ngay.
b) **Nhà cung cấp model** — thẻ gập: Anthropic (Claude) [2 phương thức Gói thuê bao/API; sonnet-5, opus-5, haiku-4-5] · Google Gemini [3.6-flash, 3.5-flash, 3.1-pro-preview] · OpenAI [gpt-4o, gpt-4o-mini, o4-mini] · GitHub Models (**retired** — «khai tử 30/07/2026, HTTP 410», controls ẩn). Trong thẻ: seg phương thức · chip model · ô dán khoá (che, hint theo provider) + nút Kiểm tra (1.1s) · huy hiệu: chưa kiểm / đang kiểm… / ✓ đã kiểm / ⚠ cấu hình đổi — kiểm lại / ✗ thất bại · tag «đang dùng» accent. **Nút «Dùng nhà cung cấp này» CHỈ sáng khi ✓ đúng model + phương thức hiện tại** — hint text nói rõ lý do khoá. Đổi model/phương thức sau khi kiểm → ⚠.
c) **Review & Trực** — slider độ sâu 2–12 probe (mặc định 6) · toggle skeptic · toggle trực + chu kỳ giây (mặc định 300) + toggle tự post verdict lên GitHub. Badge trực trên header đọc từ đây.

### Logout / phiên
User menu → Đăng xuất → về Login. «Mô phỏng phiên hết hạn» → về Login kèm banner amber.

## Interactions & state chính
- SPA thuần: điều hướng đổi panel, không reload. State: screen (login/app), route, repoId, prs per repo (per-commit status), run hiện tại (elapsed/speed/ticks/note/receipt), runsById (verdict đã chấm, mở lại giữ nguyên), returned, history, ledger (append-only, gate action ghi vào mục verdict), providers (status + vFor «phương thức/model» đã kiểm), cfg.
- Run engine: clock 120ms × speed; log line hiện theo offset; finding hiện giữa bước 4; verdict + cổng hiện khi xong. Replay reset clock, không ghi sổ lần hai.
- Guard: chạy lại khi verdict còn hiệu lực → dialog confirm; cấu hình provider chưa kiểm → run dừng fail-closed; token repo thiếu → dashboard báo lỗi kèm cách sửa.
- Hover/focus: theo Modernist (`:hover` tint, `:focus-visible` ring 2px accent); disabled 45% opacity.

## Copy đáng giữ nguyên
«Checker không tin ai. Chỉ tin bằng chứng.» · «Merge khoá cứng.» · «Trust không nới cổng» · «append-only — chỉ ghi thêm, không sửa, không xoá» · «Quan sát ngoài phạm vi PR — không đổi verdict».

## Files trong gói
- `CheckMate SPA.dc.html` — prototype đầy đủ (template + logic + dữ liệu demo; mở trực tiếp trong Claude Design).
- `styles.css` — token sheet + component classes của design system Modernist (btn/tag/card/field/seg/table/dialog/nav).

## Map màn → file repo nguồn
| Màn | File repo `thangvv111/checkmate` |
| --- | --- |
| Run / finding / verdict | `packages/shared/src/types.ts`, `bench/BAO-CAO.md` |
| Cổng merge | `apps/web/src/cong.ts` |
| Nhà cung cấp model | `apps/web/src/ncc.ts`, `apps/web/src/nguon-model.ts` |
| Repos / Trực / Review | `apps/web/src/config.ts` |
| Sổ cái | `apps/web/src/ledger.ts` |
| Tin cậy | `apps/web/src/tincay.ts` |
| Lịch sử chạy | `apps/web/src/runs.ts` |
