## Unit / hàm thuần

### clampKnob (volume-standard.ts) — `test/volume-standard.test.ts`
- [x] T1.1 [Requirement: Trần khối lượng tách theo skill…]: bảng biên cho `finding_cap` `[4,1000]` mặc định 100 —
      `4 → 4` · `1000 → 1000` · `3 → 4, clamped_from 3` · `1001 → 1000, clamped_from 1001` · `0 → 4, clamped_from 0`
      · `-5 → 4` · `4.9 → 4` (trunc)
- [x] T1.2 [Scenario: giá trị không phải số hữu hạn]: `"100"` · `"nhiều"` · `null` · `undefined` · `true` · `[5]` ·
      `{}` · `Infinity` · `NaN` · `1e309` ⇒ mặc định 100, `reason: 'invalid_type'`, **không** `clamped_from`
- [x] T1.3 [Ca chết người]: kết quả `clampKnob` **không bao giờ** `NaN`; và `[].slice(0, kq.value)` trên mảng 12
      phần tử luôn trả đúng `min(12, value)` — mutation M1 bỏ `Number.isFinite` ⇒ 3 đỏ (hai vòng)
- [x] T1.4 [Biên `probe_cap` `[2,100]` mặc định 20 · `density_per_1000_words` `[1,1000]` · `density_floor_words`
      `[50,2000]` mặc định 300]: mỗi khoá hai đầu + một bước ngoài; sàn 10⁹ ⇒ 2000 `clamped_from`; `.inf` sàn =
      Infinity ⇒ không hữu hạn ⇒ bỏ, dùng mặc định (ghi rõ hành vi thay vì kẹp)

### countDocWords v1
- [x] T1.5 [Scenario: đơn vị từ ổn định qua bố cục]: cùng ô chữ, dạng bảng markdown vs dạng dòng trơn ⇒ bằng nhau
      (20 = 20). *Bản đầu của ca dùng «văn xuôi có từ nối» — không cùng nội dung, đã sửa khi đo ra 20 vs 30.*
- [x] T1.6 [Scenario: không đếm tiền tố số dòng]: thêm `N| ` vào mỗi dòng ⇒ số đếm không đổi (917 = 917; trước khi
      v1 gột tiền tố: 917 → 1012). Mutation M4 ⇒ 1 đỏ
- [x] T1.7 [Biên]: tài liệu rỗng ⇒ 0 · chỉ front-matter ⇒ 0 · chỉ code fence ⇒ 0 · `| --- | :-- |` ⇒ 0 · token
      `x1` giữ, `---` bỏ · «phê duyệt hạn mức» = 4 · markdown inline gột · `undefined` ⇒ 0
- [x] T1.8 [Fixture đã đo]: `test/fixtures/volume/prd-1048w.md` (bản sao PRD demo) ⇒ **917** từ v1 (wc-style
      1014) — ghim SAU khi chạy

### readStandardsCfg / resolveVolumeStandard
- [x] T1.9 [target-contract › khối `standards` sai kiểu]: `"x"` · `[]` · yml hỏng ⇒ `unreadable`; `null` / rỗng /
      `---` ⇒ `present`, standards vắng; reader ném ⇒ `unreadable`; qua git thật: yml hỏng ở base ⇒ nguồn
      `default_unreadable`, `"nhiều"` ⇒ `invalid_type`, 5000/10 ⇒ kẹp
- [x] T1.10 [Scenario: trần probe hiệu dụng]: repo 40 + operator 6 ⇒ `6, 'operator'`; repo 4 + operator 12 ⇒
      `4, 'repo'`; không khai + operator 6 ⇒ `6, 'operator'`, `repo.source 'default'`; không operator ⇒ `repo`;
      `parseOperatorMaxProbe` với env rác

### effectiveDocSeverity · docCandidateRank · cutBySeverity
- [x] T1.11 [Scenario: cắt giữ finding nặng theo severity hiệu lực]: 11 `thieu_ac`/`high` + 1 `mau_thuan`/`low`
      đứng CUỐI, trần 10 ⇒ `mau_thuan` giữ và đứng đầu; T10–T11 bị cắt. **Ca này lộ ra spec hứa quá** (cùng
      mức hiệu lực, sắp ổn định thì M1 bị cắt) ⇒ thêm khoá phụ «hai vế trước rubric mềm» vào spec + code; ca có
      đối chứng «chỉ sắp theo mức ⇒ M1 mất». Mutation M10 ⇒ 1 đỏ
- [x] T1.12 [Scenario: severity lạ không chiếm suất]: 3 `high` hợp lệ + 2 `blocker` + 1 số `3`, trần 4 ⇒ 3 `high`
      giữ, đúng 1 cái lạ vào; không ném
- [x] T1.13 [chuanMuc(unknown)]: `3` · `true` · `{}` · `[]` · `undefined` · `null` ⇒ `'high'`, không ném; chuỗi
      hợp lệ giữ — cặp fixture; mutation M5 khôi phục `(s ?? '')` ⇒ 3 đỏ
- [x] T1.14 [Scenario: vòng 2 không đẩy vòng 1]: 9 vòng-1 đã neo (thấp) + 3 vòng-2 `high`, trần 10 ⇒ 9 + 1;
      sắp ổn định; trần `NaN`/âm/∞ ⇒ không cắt. Mutation M3 bỏ sort ⇒ 2 đỏ
- [x] T1.15 [Scenario: chỉ một chỗ cắt]: lưới `scanRawCapCuts` — skill-doc.ts 0 chỗ; volume-standard.ts đúng một
      `.slice(0, <biến>)` trong `cutBySeverity`; skill-code.ts 1 chỗ cắt kế hoạch sau khi đã gán `keHoachTho`.
      Cặp fixture ĐỎ/XANH. Mutation M11 cắt thô vòng 1 lại ⇒ 2 đỏ

### measureDensity
- [x] T1.16 [Scenario: đo và ghi]: 12 sau lưới / 400 từ ⇒ `30`, band `<=1000`, threshold 20, `exceeded true`,
      `applied false`, reason `observe_only`
- [x] T1.17 [Scenario: dưới sàn]: 180 từ ⇒ `under_floor`, `words 180`, không `exceeded`
- [x] T1.18 [Scenario: repo chỉnh mức]: `per_1000_words 40`, 3000 từ ⇒ threshold 24
- [x] T1.19 [Biên trùng ngưỡng]: 299/300/301 từ · band 1000/1001 · 5000/5001 · mật độ đúng 20.0 ⇒ không vượt ·
      `words 0`/`NaN` ⇒ `unmeasurable` · `count_failed` ⇒ `error`

## Tích hợp (đĩa, git, sổ cái)

### đếm độc lập với trần (engine thật, modelGia) — `test/volume-standard-engine.test.ts`
- [x] T2.1 [Scenario: đếm độc lập với trần]: modelGia trả 25 ứng viên (8 neo được), `finding_cap 4` ⇒ verdict
      `raw_round1 25 · after_machine_grids 8 · raw_round2 0 · before_cut 8 · after_cut 4 · dropped_by_cap 4`; đổi
      trần thành 100 ⇒ ba số đầu **không đổi**; log «Trần finding 4 cắn … bỏ 4»
- [x] T2.2 [Scenario: mật độ đo trước cắt]: cùng dữ liệu, 400 từ ⇒ `measured_per_1000 20` ở cả hai trần
- [x] T2.3 [Không đổi verdict]: 9/400 từ = 22.5 > 20 ⇒ `exceeded true`, mọi finding `medium` ⇒ `decideResult` =
      `PASS`; đúng 2 lời gọi (vòng 1 + phản biện), skeptic được gọi
- [x] T2.4 [Scenario: đếm từ lỗi]: `test/volume-standard-count-error.test.ts` — `vi.mock` `countDocWords` ném ⇒
      `reason 'error'`, `words 0`, `counts` đủ, finding vẫn ra, không ném, log «không đếm được từ»

### đọc chuẩn từ nhánh gốc — repo git THẬT trong thư mục tạm
- [x] T2.5 [Scenario: đội sửa chuẩn sau khi kết nối]: clone (đĩa = 20) → base đẩy 40 → fetch vào
      `refs/checkmate/base-pr1` **không checkout** ⇒ áp **40**; đĩa vẫn 20. Mutation M2 `git show` →
      `readFileSync` ⇒ 4 đỏ (hai vòng)
- [x] T2.6 [Scenario: PR nới không ăn]: base 40 · PR 500 ⇒ áp 40 (đối chứng: đọc ref PR ra 500 — phép đọc phân
      biệt được ref)
- [x] T2.7 [Scenario: PR siết cũng không ăn]: base 40 · PR 2 ⇒ 40
- [x] T2.8 [Scenario: base không có file, PR thêm]: `absent`, mọi khoá `default`
- [x] T2.9 [Scenario: lượt doc trong PR nhận base · tài liệu không repo]: lưới `scanDocCommandsWithoutBase` trên
      `server.ts` (cặp fixture; mutation M8 ⇒ 1 đỏ); không repo ⇒ `no_repo` + operator đi kèm; ref sai ⇒ `default`
      có log

### verdict mang volume_standard — `test/volume-standard-surfaces.test.ts`
- [x] T2.10 [Scenario: verdict mang chuẩn và số đếm]: `describeVolumeStandard` trên khối đầy đủ — trần + nguồn, số
      trước/sau cắt, bỏ vì trần, mật độ kèm nguồn ngưỡng *(ghi/đọc sổ cái đi qua đường JSON verdict đang có —
      không đổi schema, ca sổ cái sẵn có phủ)*
- [x] T2.11 [Scenario: lượt code khai cả hai trần, không mật độ]: `probe_cap {6, repo 40, operator 6, 'operator'}`,
      `Object.hasOwn(vs, 'density') === false`; ba bề mặt không có chữ «mật độ»
- [x] T2.12 [Scenario: verdict đời cũ KHÔNG BIẾT]: vắng trường ⇒ receipt/auto/màn chấm/lịch sử hiện «không biết»;
      trường có nhưng thiếu `counts`/sai kiểu ⇒ «không biết», không ném
- [x] T2.13 [Scenario: bề mặt MUST NOT suy lại]: `findings.length 3`, `before_cut 140` ⇒ receipt, auto verdict, màn
      chấm, lịch sử chứa `trước cắt 140` và **không** chứa `trước cắt 3`; CLI kiểm bằng nguồn (gọi
      `describeVolumeStandard(v.volume_standard)`) vì `cli.ts` chạy `main()` lúc import
- [x] T2.14 [Scenario: repo hạ chuẩn lộ ra]: `density_per_1000_words 500` ⇒ auto verdict hiện `ngưỡng 500,
      checkmate.yml`; bốn nguồn bốn nhãn, `default_unreadable` nói «KHÔNG ĐỌC ĐƯỢC»

## Ca đối kháng & hồi quy

- [x] T3.1 Đầu vào KHUYẾT: `findings: null` · phần tử `null` · thiếu `severity` (engine) · `standards: null` · yml
      rỗng · chỉ `---` · reader ném (unit)
- [x] T3.2 Biên mọi dải kẹp (gộp ở T1.1/T1.4) + `density_floor_words: 49/50/2000/2001`
- [ ] T3.3 **Ca đã gãy — trần thành định mức ở skill-code**: modelGia trả kế hoạch 7 probe, `probe_cap` 20 ⇒
      `before_cut 7`, không gì ép lên 20. *Phần «prompt không chứa số» đã phủ bằng lưới T3.5 trên
      `skill-code.ts`; phần đếm kế hoạch cần lượt `runCodeSkill` (repo + sandbox) — gộp vào lượt thật T4.3.*
- [x] T3.4 **Ca đã gãy — cửa song sinh**: `skill-doc.ts` không còn `MAX_FINDING` lẫn literal «Tối đa 8» (lưới T3.5 +
      `grep -c "slice(0, MAX_FINDING)"` = 0)
- [x] T3.5 **Lưới tầng 3 `scanPromptQuota`** — `test/volume-standard-grids.test.ts`: ĐỎ «Tối đa 8 finding» · ĐỎ
      «TỐI ĐA ${MAX_PROBE} probe» · XANH source có `100| nội dung`, `@@ -100,7 +100,9`, «(≥ 8 từ», «≤80 ký
      tự», «7 loại rubric»; mã hiện tại sạch cả 5 hàm; phép quét tìm thấy đúng 5 hàm (chống xanh oan)
- [x] T3.6 **Chuỗi ĐI RA** — mốc **7919** ở CẢ BỐN khoá, tài liệu 40 dòng: không prompt nào chứa `7919`, không
      khớp mẫu định mức
- [x] T3.7 **Phanh precision còn** — prompt vòng 1 chứa câu thay nguyên văn; mutation M6 gỡ câu + chèn «Tối đa 8
      finding» ⇒ 3 đỏ
- [x] T3.8 Mutation chèn lại «Tối đa 8 finding» ⇒ T3.5/T3.6/T3.7 đỏ; chạy hai lần (M6, 3/3 cả hai vòng);
      `grep -c` trước khi đọc kết quả
- [x] T3.9 [`skill-code.ts` khử trùng `ma`]: `dedupeFindingsByCandidate` — 3 finding cùng `ma` ⇒ 1, bản trùng trả
      riêng, phần tử rỗng bỏ; mutation M7 ⇒ 1 đỏ

## Trục nhạy cảm

- [N/A] T_bimat — không đọc/ghi bí mật; giá trị `standards` là số trong repo đích, đã công khai. Khối chỉ nhận số
  (T1.2/T1.9).
- [x] T_failclosed — bốn nhánh lỗi mới KHÔNG cho ít finding hơn hôm nay: yml hỏng (T1.9) · sai kiểu ⇒ `NaN`
  (T1.3) · đếm từ lỗi (T2.4) · severity không chuỗi (T1.13 — hôm nay **ném** ⇒ «lỗi», sau change ⇒ `high`)
- [x] T_cong — change KHÔNG thêm đường ghi `result`: `exceeded true` + 0 `high` ⇒ `PASS` (T2.3); lưới nguồn:
  `skill-doc.ts`/`volume-standard.ts` không gán `result:`, không gọi `decideResult`, luật nhị phân còn nguyên
  ở `verdict.ts`. `standards` đọc từ repo đích, không từ `config.json`
- [x] T_khongtincay — hoang bị kẹp (T1.1) · sai kiểu bị bỏ (T1.2) · nhánh PR không ăn hai chiều (T2.6/T2.7) ·
  giá trị `standards` không vào prompt nào (T3.6, bốn khoá)
- [x] T_hopdong — 24 export mới khai đủ; `test/hop-dong-repo.test.ts` xanh trong bộ 1286 ca

## Chạy thật một lượt — KHÔNG tick trước khi chạy, ghi `run_id` vào ô

- [x] T4.1 Doc trong PR trên prod (PR #76, 07/09) — fixture `test/fixtures/volume/prd-1048w.md` qua đường sản
      phẩm (webhook → đường thuê bao). Verdict thật đọc từ sổ cái:
      `finding_cap {100, 'default'}` · `counts {raw_round1 6, after_machine_grids 6, before_cut 6, after_cut 6,
      after_skeptic 6, final 6, dropped_by_cap 0}` · `density {words 917, count_method 'v1', band '<=1000',
      threshold 20, measured 6.54, exceeded false, applied false, reason 'observe_only'}`; `FAIL` với 6 finding,
      2 lời gọi model. **Khớp CHÍNH XÁC 7 lượt CLI local** (raw 6 · 917 từ · 6.54) — hai đường chạy khác nhau,
      cùng con số. run_id: `wmtqui9blbmu4`
      ⚠ Vế `source: 'repo'` chưa lấy được ở lượt này và ĐÓ LÀ ĐÚNG: chuẩn đọc từ nhánh gốc, mà nhánh gốc chưa
      có khối `standards` (PR #77 mới thêm). Đây là scenario «nhánh gốc không có file, PR thêm mới ⇒ mặc định»
      quan sát trên prod. Lượt sau khi merge #77 sẽ cho `source: 'repo'` — ô T4.5.
- [x] T4.2 Doc không repo (cùng đường CLI với «dán tay»: `--skill doc --file`, không `--repo`): 7 lượt 06/09 —
      `finding_cap.source 'no_repo'` ở cả 7; PRD raw 6/6, mật độ 6.54, `applied false`; verdict FAIL/PASS như
      lịch sử. run_id: `run-2026-09-07T04-12-29-492Z…` · `…T04-12-40-962Z…` · `…T04-12-55-871Z…` ·
      `…T04-14-01-139Z…` · `…T04-15-14-897Z…` · `…T04-15-56-770Z…` · `…T04-20-53-312Z…`
- [~] T4.3 Code trên PR thật (PR #77, 07/09), operator slider **12**, repo đề nghị **20**. Lấy được hai vế
      quan trọng nhất từ log lượt thật, vế thứ ba bị chặn:
      · **trần hiệu dụng = min(repo, operator), khai đủ nguồn** — log nguyên văn: «Trần probe hiệu dụng 12
        (người vận hành 12; repo đề nghị 20) — model không được cho biết con số này» ✓
      · **T3.3 — hiệu ứng ĐỊNH MỨC biến mất** ✓✓ Trần 12, model đề xuất **7 probe**. Lượt PR #75 cùng ngày,
        cùng trần 12, **trước** khi gỡ số: đề xuất **đúng 12**. Đây là phép đo trực tiếp nhất của cả change —
        không phải suy từ 14/14 lượt lịch sử, mà là hai lượt cùng repo cùng trần, khác nhau đúng một câu prompt.
      · ✗ `volume_standard` trên verdict của lượt code: **chưa lấy được** — lượt kết thúc bằng lỗi ở bước
        sandbox, không sinh verdict. Nguyên nhân là sự cố hạ tầng ngoài change (nợ 7.5), không phải code này.
      run_id: `wmtquo1hz9hrs`
- [ ] T4.4 Repo đích với `checkmate.yml` **hỏng cú pháp** ở nhánh gốc: lượt chạy, log nêu nguyên nhân, verdict
      khai `default_unreadable`. Kiểm bằng `--base` trỏ một ref cục bộ có yml hỏng, KHÔNG làm hỏng `main` của
      prod; vế «comment PR hiện `default_unreadable`» dựa vào ca đơn vị T2.12/T2.14 chứ không tick trơn.
      run_id: ____
- [ ] T4.5 Sau khi merge PR #77: một lượt doc bất kỳ phải khai `finding_cap.source = 'repo'` và
      `density.standard.*.source = 'repo'` — vế còn thiếu của T4.1. run_id: ____

## Kiểm tay

- [ ] T5.1 Câu chữ khối chuẩn trên comment PR có dìm phần finding không — finding mới là thứ chặn merge
- [ ] T5.2 Nhãn «mặc định — checkmate.yml KHÔNG ĐỌC ĐƯỢC» người đọc có hiểu là «file của các anh hỏng, đang chấm
      theo mặc định» không
