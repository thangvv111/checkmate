## 0. Đo trước khi viết

- [x] 0.1 **Kết luận đã có, ghi vào `design.md` § Context**: ba cửa đọc `checkmate.yml` đọc working tree =
      snapshot nhánh default lúc clone; git chỉ `clone --no-single-branch` (`github.ts:512`) + `fetch` vào
      `refs/checkmate/*` (`:428`), không checkout. Cửa thứ tư dùng `git show` (`volume-standard.ts`).
- [x] 0.2 Xác nhận bằng máy trên clone prod (chỉ đọc, 06/09): `repos/thangvv111-checkmate` HEAD `727d0a8`
      (05/09) ≠ `refs/checkmate/base-pr74` `09ca3ea` (06/09); reflog HEAD = 1 dòng; blob `checkmate.yml` đĩa
      `fb930f8…` ≠ blob ở base `2b3043c…`. Ghi vào `design.md` § Context và nợ 7.1.
- [x] 0.3 Đếm lại bằng máy sau apply — số mới ở `design.md` § Bề mặt: 5 hàm dựng prompt · 11 chỗ gọi model ·
      **0** `.slice(0, MAX_FINDING)` ở skill-doc (trước: 3) · 1 chỗ cắt kế hoạch ở skill-code · 3 cửa đọc kiểu
      đĩa (cửa thứ tư không dùng khuôn ấy) · 11 dòng `findings.length` = 9 bề mặt · 4 lệnh doc. Bài học: lệnh
      đếm bắt cả chú thích — đã đổi lời chú thích và thêm `grep -v` dòng chú thích.
- [x] 0.4 **Đo trước khi chốt câu prompt** — 7 lượt CLI thật / 6 tài liệu (06/09, provider Claude CLI), bảng ở
      `design.md` § Context: PRD 917 từ (v1) cho raw **6 và 6** (lịch sử với «Tối đa 8»: 4–6), mật độ
      **6.54/1000** < ngưỡng 20; 5 tài liệu nhỏ raw 0–1; không lượt nào chạm trần. Câu thay **không làm nổ
      số**. Corpus thật có **6 tài liệu** — «14» ở bản đầu là số LƯỢT trong `runs/`. Đây là kiểm chứng,
      không phải suy ngưỡng. Run id: `run-2026-09-07T04-12-29…` → `…T04-20-53…` (file ở scratchpad phiên).

## 1. Luật (capability)

- [x] 1.1 `finding-volume-standard` — 5 requirement ADDED; ca ở `test/volume-standard*.test.ts` (T1–T3).
      Khoá phụ sắp xếp (hai vế trước rubric mềm) thêm vào spec khi ca T1.11 lộ ra spec hứa quá.
- [x] 1.2 `verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ` — MODIFIED (chép nguyên
      7 scenario cũ + 5 mới); ca T2.10–T2.14 ở `test/volume-standard-surfaces.test.ts`.
- [x] 1.3 `target-contract › checkmate.yml là tuỳ chọn…` — MODIFIED (thêm khối `standards`, bỏ «bản trên đĩa»);
      ca T1.9.
- [x] 1.4 Chỗ sống của luật: mặc định + dải kẹp là hằng `*_RANGE` trong `volume-standard.ts` **có test khoá**
      (T1.1–T1.4); khoá cấu hình ở `checkmate.yml` repo đích; hồ sơ ở ba capability. Không viết vào
      `docs/archive/`.

## 2. Kiểu & hợp đồng

- [x] 2.1 `packages/shared/src/types.ts`: `KnobSource`, `Knob`, `DensityBand`, `DensityReason`, `VolumeStandard`,
      trường `volume_standard?` trên `Verdict` — tuỳ chọn, chú thích «VẮNG = KHÔNG BIẾT».
- [x] 2.2 `chuanMuc(s: unknown): Severity` — không phải chuỗi ⇒ `'high'`, không ném. Cặp fixture T1.13.
- [x] 2.3 Khai vào **bảng module của `checkmate.yml`** (⛔C5): `readStandardsCfg` (runner.js) · toàn bộ export
      của `volume-standard.js` (16 tên) · `volume-summary.js` (4 tên) · `effectiveDocSeverity` +
      `docCandidateRank` (skill-doc.js) · `dedupeFindingsByCandidate` (skill-code.js). Lưới
      `test/hop-dong-repo.test.ts` xanh.
- [x] 2.4 Header `checkmate.yml:1` liệt kê khối `standards` cạnh `sources · runner · review`.

## 3. Engine (packages/harness)

- [x] 3.1 **`volume-standard.ts` (mới):** `clampKnob` (predicate `typeof === 'number' && isFinite`, trunc, kẹp,
      `clamped_from`, `invalid_type`) · `DENSITY_BANDS` 20/12/8 · `countDocWords` v1 (gột cả tiền tố `N| `,
      đo 06/09: không gột thì 917 → 1012) · `measureDensity` · `cutBySeverity` (nhóm, ổn định, trần không hữu
      hạn ⇒ không cắt) · `severityRank` · `isKnownSeverity` · `resolveVolumeStandard` · `effectiveProbeCap`.
- [x] 3.2 `runner.ts`: `readStandardsCfg(readAtBase)` — cửa đọc thứ tư nhận HÀM đọc; yml hỏng / khối sai kiểu ⇒
      `unreadable` + `console.error`, không ném; không cache.
- [x] 3.3 `volume-standard.ts`: `resolveVolumeStandard(repo, baseRef, operator)` gọi
      `git show ${baseRef}:checkmate.yml`; không repo ⇒ `no_repo`; file vắng/ref sai ⇒ `default` (có log);
      hỏng ⇒ `default_unreadable`.
- [x] 3.4 `cli.ts`: giải chuẩn ở tầng có repo + `base`, truyền xuống `runDocSkill(…, standards)` và
      `runCodeSkill(…, standards)`; operator từ `CHECKER_MAX_PROBE`; verdict mang `volume_standard`.
- [x] 3.5 `skill-doc.ts:160`: **thay** câu bằng câu phanh precision trong spec.
- [x] 3.6 `skill-code.ts:347`: **thay** «Đề xuất TỐI ĐA ${MAX_PROBE} probe» bằng câu trong spec.
- [x] 3.7 `skill-code.ts:54`: gỡ hằng `MAX_PROBE` và `Math.min(20, …)`; trần hiệu dụng từ `effectiveProbeCap`.
- [x] 3.8 `skill-doc.ts`: **một chỗ cắt** — bỏ `.slice` ở vòng 1 và vòng 2 (chỉ đếm), `cutBySeverity([neoOk,
      boSung], cap, docCandidateRank)` sau neo + vòng 2, trước skeptic. Đếm mọi tầng vào `counts`.
- [x] 3.9 `skill-doc.ts`: `countDocWords(docGoc)` + `measureDensity` sau lưới máy, `applied: false`; lỗi đếm ⇒
      `reason: 'error'`, mọi thứ khác nguyên; không nhánh nào đổi verdict / bỏ vòng / sinh finding.
- [x] 3.10 `skill-doc.ts:330`: dùng `effectiveDocSeverity` — cùng hàm với sort (một cửa).
- [x] 3.11 `skill-code.ts:875`: khử trùng `ma` qua `dedupeFindingsByCandidate` — giữ cái đầu, log bản trùng.
- [x] 3.12 Gắn `volume_standard` vào kết quả cả hai skill; `density` VẮNG ở code (cả đường treo sớm).

## 4. Bề mặt người (web + CLI)

- [x] 4.1 `server.ts` hai lệnh doc trong PR thêm `'--base', pr.baseRef`; lưới `scanDocCommandsWithoutBase`.
- [x] 4.2 `config.ts`: `PROBE_DEPTH.max` 12 → 100, mặc định 6 giữ, chú thích cảnh báo bốn nợ; slider `ui.ts`
      đọc từ hằng nên theo luôn; `test/operator-settings.test.ts:33` sửa `99` → `PROBE_DEPTH.max + 1`.
- [x] 4.3 Năm bề mặt bày `volume_standard` qua `describeVolumeStandard` (shared): `gate.ts` receipt + auto
      verdict · `ui.ts` verdictHtml · `ui-history.ts` (`trước cắt N` / `?` đời cũ) · `cli.ts`. Bốn nguồn phân
      biệt; đời cũ hiện «không biết».
- [x] 4.4 Bốn bề mặt KHÔNG bày (dòng tóm tắt cùng comment · commit status 140 ký tự · API danh sách) — ghi ở
      `design.md` § Bề mặt.

## 5. Test

- [x] 5.1 Ca khoá theo `test-cases.md`: `test/volume-standard.test.ts` (T1.1–T1.19, T1.9/T2.5–T2.9 git thật,
      T3.9) · `test/volume-standard-engine.test.ts` (T2.1–T2.3, T3.1, T3.6, T3.7) ·
      `test/volume-standard-surfaces.test.ts` (T2.10–T2.14).
- [x] 5.2 **Lưới prompt hai chiều** — `test/volume-standard-grids.test.ts`: tầng 3 `scanPromptQuota` có cặp
      fixture ĐỎ/XANH (XANH chứa `100| dòng`, `@@ -100,7`, «≥ 8 từ», «≤80 ký tự», «7 loại»); tầng hành vi
      `modelGia` trên tài liệu 40 dòng với trần mốc **7919**; ca «phanh precision còn».
- [x] 5.3 Ca git thật «đọc nhánh gốc»: repo tạm ba giá trị (đĩa 20 · base 40 · PR 500 / PR 2) ⇒ áp 40; base
      không có file + PR thêm ⇒ `default`; yml hỏng ⇒ `default_unreadable`.
- [x] 5.4 Mutation hai chiều — 11 đột biến × **2 vòng** (06/09), mỗi cái kiểm chứng `grep -c ≥ 1` trên đĩa
      trước khi đọc kết quả, số ca đỏ **giống hệt giữa hai vòng**: M1 kẹp bỏ `isFinite` 3 đỏ · M2 `git show`
      → đọc đĩa 4 đỏ · M3 bỏ sort 2 đỏ · M4 không gột `N|` 1 đỏ · M5 `chuanMuc` cũ 3 đỏ · M6 chèn lại «Tối đa
      8 finding» 3 đỏ · M7 tắt khử trùng 1 đỏ · M8 bỏ `--base` 1 đỏ · M9 bỏ kẹp rubric mềm 3 đỏ · M10 bỏ
      tie-break 1 đỏ · M11 cắt thô vòng 1 lại 2 đỏ. Đối chứng sau khôi phục 62/62 xanh; khôi phục kiểm bằng
      chuỗi GỐC (script báo «khôi phục hỏng» ở M3 là báo động giả — chuỗi đột biến `[...g]` là tiền tố chuỗi
      gốc). Không sót `.mutbak`.
- [x] 5.5 `npx tsc --noEmit` sạch + `npm test` xanh **toàn bộ**: 75 file / 1286 ca (06/09 11:33), sau đột biến
      và sau 0.4.

## 6. Hồ sơ

- [x] 6.1 `README.md` § Hợp đồng repo đích: mục «Khối `standards`» — bốn khoá, mặc định, dải kẹp, đọc từ nhánh
      gốc qua git, bậc thang số tạm, trần token provider, đơn vị từ v1, PR hỗn hợp không đo.
- [x] 6.2 Chú thích cạnh `DENSITY_BANDS` trong `volume-standard.ts`: số tạm, căn cứ, điều kiện chốt lại bằng dữ
      liệu sổ cái — không ghi ngày.

## § Sau-merge — nợ có tên

- [ ] 7.1 **Change `checkmate-fix-bug`: ba cửa đọc cũ đọc đĩa, không đọc nhánh gốc.** `runner.ts:61`, `:143`,
      `spec-source.ts:213` đọc snapshot lúc clone — lệch luật `sandbox-isolation › Ảnh chạy… đọc từ NHÁNH GỐC`
      và `target-contract`. **Bằng chứng prod 06/09:** clone `repos/thangvv111-checkmate` HEAD `727d0a8` ≠
      base `09ca3ea`, reflog HEAD 1 dòng, blob `checkmate.yml` đĩa ≠ base. Kéo hiện thực khớp luật bằng
      `git show` (khuôn `resolveVolumeStandard`); sửa chữ «bản trên đĩa» ở `sandbox-isolation/spec.md:97`;
      thay `test/sandbox-isolation.test.ts:190` (`toContain('readRunnerCfg(repo)')` — lưới loại 1) bằng ca git
      thật. **KHÔNG thuộc change này** — PO chốt 1a ngày 06/09.
- [ ] 7.2 **Change ép chuẩn mật độ** (mở khi điều kiện D1 đủ: ≥ 30 verdict doc có `volume_standard.counts`).

      ⛔ **(a) KHÔNG CÒN LÀ SUY LUẬN — đo trên prod 07/09, ngay lượt đầu sau deploy.** Chấm `README.md`
      (1192 từ v1) qua đường **API** chết ở bước 3 với «Không tìm thấy JSON trong trả lời model:» và chuỗi
      rỗng. Gọi thẳng `api.anthropic.com` với cùng model, cùng `max_tokens: 8000`, prompt cùng cỡ:

      | | |
      |---|---|
      | `stop_reason` | **`max_tokens`** |
      | khối trả về | `['thinking', 'text']` — model đời mới trả khối suy nghĩ, ăn phần lớn trần |
      | `output_tokens` | **8000** — dùng hết sạch |
      | text sau khi `AnthropicApiProvider` lọc `type === 'text'` | 2052 ký tự, JSON **không đóng** |

      Tức trần THẬT của đường API là `max_tokens: 8000` (`model.ts:235`), và với model có `thinking` thì
      phần dành cho câu trả lời còn lại rất ít. Engine không đọc `stop_reason` nên báo sai bản chất —
      người vận hành đọc «không tìm thấy JSON» sẽ đi sửa parser thay vì nới trần. Đường **thuê bao**
      (CLI) không dính: lượt PR #75 cùng ngày sinh được 12 probe và 2 lượt sinh code.

      Việc phải làm: đọc `stop_reason`/`finish_reason`, trả lời cụt ⇒ **lỗi có tên**, không retry mù
      (`jsonx.ts:19`, `model.ts:235/:333` — gom một hằng, thêm `CLAUDE_CODE_MAX_OUTPUT_TOKENS` vào
      `ENV_CHO_CLI`); cân nhắc gửi `max_tokens` lớn hơn hoặc tắt `thinking` cho lượt đòi JSON.

      Các điều kiện tiên quyết còn lại **trước khi nâng mặc định `probe_cap`** hoặc bật FAIL: (b)
      `unwrapCode` coi fence mở không đóng là cụt; `that_lac > 0` từ file của lượt ⇒ không PASS
      (`skill-code.ts:687`, `verdict.ts:84`); (c) timeout sandbox theo cap hoặc chia file (`sandbox.ts:305`);
      (d) ngân sách comment PR 60 000 ký tự có khai số bị bỏ (`gate.ts:370`, `server.ts:263` không nuốt lỗi
      422); (e) gom probe hạng 2 vào một sandbox (`skill-code.ts:951`); (f) vòng 2 chỉ gửi id hỏng
      (`skill-doc.ts:258`); (g) skeptic chia lô ≤ 10 (`skill-doc.ts:274`).
- [ ] 7.3 Router: PR kèm một file không phải `.md/.txt` đi đường code ⇒ tài liệu trong PR hỗn hợp không được
      đo mật độ (`github.ts:387`). Đã ghi ở README; đo tài liệu trong PR code là việc sau.
- [ ] 7.4 Change `target-shape-knobs` (đã mở) — không đổi.
