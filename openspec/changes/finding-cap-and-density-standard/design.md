## Context

Trần finding doc là hằng `MAX_FINDING = 8` (`skill-doc.ts:69`) **cộng** một literal `8` trong prompt
(`skill-doc.ts:160`); trần probe là `Math.min(20, Math.max(2, env ?? 10))` (`skill-code.ts:54`) và cũng
được nói cho model (`skill-code.ts:347`). Cả hai cắt bằng `.slice()` trước mọi phép đếm.

**Số đo làm nền cho thiết kế** (lượt review đối kháng 06/09 — 42 phát hiện, 23 qua ba người bác bỏ):

| số đo | giá trị | nguồn |
|---|---|---|
| trần probe thành định mức | `ke_hoach = trần` 14/14 lượt — **của skill-code** | `types.ts:186`, `skill-code.ts:740` |
| model doc trả bao nhiêu khi được cho 8 | **0–6**, 18 lượt; trần 8 chưa từng cắn | `runs/*.json` log «N ứng viên» |
| mật độ thô tối đa đã thấy ở doc | 6/1048 từ ≈ **5.7/1000**, tài liệu gieo lỗi cố ý | `web-runs/tmp/up-*.md` |
| trần thật đường code | `max_tokens` **8000** API / **16000** chat; CLI không nới được | `model.ts:235`, `:333`, `:55` |
| núm operator đang sống | `agent.max_probe` slider 2–12, mặc định **6**, env luôn đặt | `config.ts:495`, `server.ts:312/316/989/1000/1016/1030` |
| cửa đọc `checkmate.yml` đọc gì | **đĩa** = snapshot nhánh default lúc clone; git chỉ `clone`+`fetch`, không checkout | `github.ts:512`, `:428`; `runner.ts:61`, `:100`; `spec-source.ts:213` |
| **trần thành ĐỊNH MỨC, quan sát thứ 15 (prod 07/09)** | lượt chấm PR #75 đề xuất **đúng 12 probe**, và `agent.max_probe` trên prod = **12**. Mười bốn lần trước đo ở trần 10. Cùng hiện tượng, hai con số trần khác nhau ⇒ model bám theo **trần**, không theo một con số quen — đúng nghĩa «đặt hàng», và là lý lẽ trực tiếp cho việc gỡ số khỏi prompt | `runs/wmtqsntc0b2g2/events.jsonl`, `config.json` |
| **đo trên prod 06/09 (task 0.2, chỉ đọc)** | clone `repos/thangvv111-checkmate`: HEAD `727d0a8` (05/09 21:38) ≠ `refs/checkmate/base-pr74` `09ca3ea` (06/09 01:35); **reflog HEAD = 1 dòng** (chưa từng dịch từ lúc clone); blob `checkmate.yml` đĩa = HEAD = `fb930f8…` ≠ blob ở base `2b3043c…`. Clone `demo-credit-approval`: HEAD == base refs (không có commit mới từ 24/08), không có `checkmate.yml` | `ssh ubuntu@47.131.132.95`, `git rev-parse` / `for-each-ref` / `hash-object` |
| đường doc có base không | **không** — `runDocSkill(model, file, phat)`; server không truyền `--base` | `skill-doc.ts:184`, `server.ts:312`, `:989`; so `:316` |
| «từ» của cùng một PRD | 1014 (`docGoc`) · 1201 (`docCoSoDong`) · 718 (bỏ bảng) | đo bằng `\S+` |
| `chuanMuc(3)` | **ném** `TypeError` | `types.ts:8`; `gate.ts:111` đã biết, engine chưa |

Ràng buộc chi phối: `checkmate.yml` **nằm trong repo đang bị chấm** — mọi khoá là núm maker chỉnh được trên
checker.

**Đo SAU khi thay câu prompt (task 0.4, 06/09 — CLI thật, provider Claude CLI, 7 lượt / 6 tài liệu):**

| lượt | tài liệu | từ (v1) | raw vòng 1 | sau lưới máy | trước cắt | cuối | mật độ /1000 | dải · ngưỡng | vượt | verdict | lời gọi |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | doc-1787645254851 | 96 | 0 | 0 | 0 | 0 | — (dưới sàn) | — | — | PASS | 1 |
| 2 | doc-1787645321872 | 100 | 0 | 0 | 0 | 0 | — (dưới sàn) | — | — | PASS | 1 |
| 3 | doc-1787799454071 | 108 | 1 | 1 | 1 | 1 | — (dưới sàn) | — | — | PASS | 2 |
| 4 | doc-1787799589679 | 115 | 1 | 1 | 1 | 1 | — (dưới sàn) | — | — | PASS | 2 |
| 5 | doc-1788328921914 | 419 | 0 | 0 | 0 | 0 | 0 | ≤1000 · 20 | không | PASS | 1 |
| 6 | prd-1048w (gieo lỗi) | 917 | **6** | 6 | 6 | 6 | **6.54** | ≤1000 · 20 | không | FAIL | 2 |
| 7 | prd-1048w (lần 2) | 917 | **6** | 6 | 6 | 6 | **6.54** | ≤1000 · 20 | không | FAIL | 2 |

Đọc số: câu thay **không làm nổ số** — PRD cho raw 6/6, đúng vùng 4–6 của lịch sử với «Tối đa 8» (18 lượt
`runs/`); không lượt nào chạm trần 100; nguồn `no_repo` đúng vì CLI chạy không `--repo`. Mật độ thật của tài
liệu gieo lỗi cố ý là **6.54/1000**, bằng một phần ba ngưỡng 20 — xác nhận D1: bật FAIL hôm nay là bật một
nhánh chưa tài liệu thật nào chạm. Lời gọi 2 = vòng 1 + phản biện (không quote hỏng nên không có vòng 2).
Bảng này là **kiểm chứng**, không phải căn cứ chọn ngưỡng.

## Goals / Non-Goals

**Goals (bước 1 — đo)**
- Gỡ số khỏi hai prompt, **giữ phanh precision** bằng câu thay; lưới hai chiều có cặp fixture.
- `finding_cap` (doc, 100 `[4,1000]`) · `probe_cap` (code, 20 `[2,100]`) · hiệu dụng probe = min(repo, operator).
- Đếm theo tầng trước cắt; cắt **một chỗ** sau lưới máy; sắp theo severity hiệu lực; vòng 1 đã neo không bị vòng 2 đẩy.
- Mật độ đo theo `countDocWords v1` + bậc thang số tạm, ghi lên verdict, `applied: false`.
- Đọc `standards` bằng `git show <baseRef>:checkmate.yml`; lượt doc nhận `--base`; không repo → `no_repo`.
- `chuanMuc(unknown)` không ném.

**Non-Goals**
- **Không FAIL vì mật độ, không lối thoát sớm** — change ép chuẩn mở sau, khi sổ cái có ≥ 30 verdict doc mang `volume_standard.counts`.
- **Không nâng mặc định `probe_cap`** — bốn điều kiện tiên quyết ở tasks § Sau-merge.
- **Không sửa ba cửa đọc cũ** (`runner`/`review`/`sources`) — lỗi so với luật đang có hiệu lực → `checkmate-fix-bug` riêng.
- Không đụng `verdict.ts:41`. Không thêm kết cục mới. Không đổi router. Không đọc `stop_reason` (nợ có tên).

## Decisions

**D1 — Đo trước, ép sau; điều kiện chuyển bước là DỮ LIỆU, không phải ngày.** Chuẩn công bố (không suy từ
phân vị của một đội) chỉ lành mạnh khi có phép đo kiểm chứng. Hôm nay không có: raw doc ≤ 6/1000 trên tài
liệu cố ý hỏng, nên ngưỡng 20 hoặc là nhánh chết, hoặc nổ theo độ nói nhiều của model — không biết cái nào.
Điều kiện mở change ép: `sqlite3 web-runs/checkmate.db "select count(*) from so_cai where skill='doc' and
json_extract(verdict,'$.volume_standard.counts') is not null"` ≥ 30. *Phương án đã loại:* bật FAIL ngay với
ngưỡng tạm — là ship một cửa chặn merge chưa ai kiểm được.

**D2 — Hình dạng bậc thang, số tạm, repo chỉnh mức không chỉnh hình.** Căn cứ của số là sức xử lý của người
nhận trong một lượt — hằng số theo lượt, không tỉ lệ theo số từ. Tuyến tính siết mạnh nhất ở tài liệu nhỏ
(400 từ: 9 finding là vỡ) và không bao giờ chạm ở tài liệu lớn (10 000 từ được 190; với `max_tokens` 8000 thì
> 5000 từ không thể vỡ). Bảng 20/12/8 là **số tạm** để ghi `band`/`exceeded`; chốt lại ở change ép.
`density_per_1000_words` nhân tỉ lệ cả bảng.

**D3 — Điểm đo mật độ = sau lưới máy, trước cắt.** Ba lựa chọn, ba hành vi cổng khác nhau: đếm thô = model
(⛔C4) quyết; đếm sau `.slice` = hạ `finding_cap` xuống 4 vô hiệu chuẩn; đếm sau lưới = số máy đã kiểm. Chọn
cái thứ ba và **dời chỗ cắt xuống sau lưới** — tiện thể khép ba `.slice` (:204/:260/:264) về một.

**D4 — Khoá sắp xếp là severity HIỆU LỰC, khoá phụ là SỨC BẰNG CHỨNG.** Kẹp theo rubric hôm nay ở stage 5
(`skill-doc.ts:330–332`), sau mọi chỗ cắt. Rút thành `effectiveDocSeverity(rubric, sev)` dùng ở cả sort lẫn
verdict; hạng đầy đủ là `docCandidateRank(rubric, sev)`. Giá trị lạ: lên verdict `high` (fail-closed), khi
sort xếp sau `high` hợp lệ — để `blocker`/số/trống không đẩy `high` thật ra. **Khoá phụ** (thêm 06/09 khi
viết ca T1.11): cùng mức hiệu lực thì rubric đối chiếu hai vế đứng trước rubric mềm — không có nó, 11
`thieu_ac/high` + 1 `mau_thuan/low` (đều hiệu lực `medium`) sắp ổn định theo thứ tự gốc để mâu thuẫn số liệu
đứng cuối và bị cắt, đúng kết cục sắp-theo-hiệu-lực sinh ra để tránh. Không có phép đo nào của repo đứng
sau việc chọn «hai vế trước một vế» ngoài lý lẽ: hai trích dẫn máy đã neo là bằng chứng nặng hơn một.

**D5 — Trần tách theo skill; trần probe hiệu dụng = min(repo, operator).** Chi phí biên khác hẳn (finding
doc ≈ vài trăm token; probe = sinh code + 2 sandbox). Núm operator đang sống (`config.ts:495`, mặc định 6)
là **trần phục vụ** của bên chấm; repo chỉ đề nghị. Nới `PROBE_DEPTH.max` 12 → 100 để operator có thể nâng;
mặc định 6 giữ. *Đã loại:* bỏ env (slider chết im lặng — cửa song sinh) · yml đè operator (repo quyết chi
phí sandbox của người khác).

**D6 — Đọc `standards` bằng `git show`, ở tầng có repo + base.** Working tree là bản chết (đo ở Context).
Khuôn đúng đã có: `target.ts:136`. `readStandardsCfg(readAtBase)` nhận hàm đọc — `cli.ts` truyền
`(p) => git show baseRef:p`; hàm skill nhận `VolumeStandard` đã giải, không tự mò yml. Ba cửa cũ để nguyên,
tách fix-bug. *Đã loại:* checkout nhánh gốc (đụng working tree, đua với lượt song song).

**D7 — Nguồn có bốn giá trị, không hai.** `default` · `repo` · `default_unreadable` (có file ở base nhưng
không đọc được — đội đã siết chuẩn mà file hỏng thì đây là fail-open theo nghĩa của change, phải lộ) ·
`no_repo` (tài liệu dán tay / tải lên).

**D8 — Không cơ chế mới cho verdict.** Change này không thêm đường nào ghi `result`. Hướng cho bước 2 ghi ở
mục riêng dưới để không mất, nhưng **không cam kết** ở đây.

## Architecture

```
apps/web/src/server.ts    :312 :989  lenh doc them --base  (nhu :316 code)
        |
packages/harness/src/cli.ts        co repo + base (:76)
        |   resolveVolumeStandard(repo, baseRef|null, operatorMaxProbe)
        |     -> readStandardsCfg((p) => git show baseRef:p)   runner.ts, cua doc thu TU
        |     -> clampKnob x4                                    volume-standard.ts
        v
   runDocSkill(model, file, phat, standard)      skill-doc.ts
        thay cau :160 (phanh, khong so)
        vong 1 -> dem raw -> rubric -> dead-ref -> neo -> dem after_machine_grids
        -> countDocWords(docGoc) -> measureDensity (GHI, khong ep)
        -> vong 2 (neu co) -> cutBySeverity(effectiveDocSeverity)  <- MOT cho cat
        -> skeptic -> verdict.volume_standard
   runCodeSkill(..., standard)                   skill-code.ts
        thay cau :347 · :54 MAX_PROBE = standard.probe_cap.value · :875 khu trung `ma`
        v
packages/harness/src/verdict.ts     KHONG DOI
        v
gate.ts · ui.ts · ui-history.ts · cli.ts   bay volume_standard (5 be mat PHAI, 4 KHONG — xem dem)
```

## Data Model

Verdict thêm `volume_standard?` — **tuỳ chọn, vắng = KHÔNG BIẾT**, cùng khuôn `nghi_loi_co_san?`/`cach_ly?`:

```
type KnobSource = 'default' | 'repo' | 'default_unreadable' | 'no_repo'
type Knob = { value: number; source: KnobSource; clamped_from?: number; reason?: 'invalid_type' }

volume_standard?: {
  finding_cap?: Knob                                                   // skill-doc
  probe_cap?:   { value: number; repo: Knob; operator: number; bound_by: 'repo' | 'operator' }  // skill-code
  counts: {                                                            // doc: moi tang · code: raw_plan/after_cap/candidates/final
    raw_round1?: number; after_machine_grids?: number; raw_round2?: number;
    before_cut: number; after_cut: number; after_skeptic?: number; final: number; dropped_by_cap: number
  }
  density?: {                                                          // skill-doc ONLY; code: VANG
    standard: { per_1000_words: Knob; floor_words: Knob }
    words: number; count_method: 'v1'
    band?: '<=1000' | '<=5000' | '>5000'; threshold_per_1000?: number   // ranh TREN theo so tu — san co the doi (50–2000) nen khong ghi ranh duoi vao ten dai
    measured_per_1000?: number; exceeded?: boolean
    applied: false; reason: 'observe_only' | 'under_floor' | 'unmeasurable' | 'error'   // no_repo la NGUON cua khoa, khong phai ly do do
  }
}
```

Kiểu thật ở `packages/shared/src/types.ts` (`KnobSource` · `Knob` · `DensityBand` · `DensityReason` ·
`VolumeStandard`); `operator` của `probe_cap` **tuỳ chọn** — CLI tay không có núm operator.

- **Ai ghi:** engine, một lần, lúc dựng verdict. **Ai đọc:** `gate.ts` (comment PR), `ui.ts`, `ui-history.ts`,
  `cli.ts`. **Ai dọn:** không ai.
- **Sổ cái `web-runs/` là TÀI SẢN** — trường tuỳ chọn, không ghi đè bản ghi cũ ⇒ không cần di trú.
- **Ghi file dùng chung:** N/A — không thêm đường ghi. `readStandardsCfg` chỉ đọc qua git.
- **⛔C6:** không cache; `git show` mỗi lượt.
- **Không gọi model trong khoá:** N/A.

## Bề mặt đã ĐẾM BẰNG MÁY (luật tầng 2 — lệnh chạy lại được)

```bash
grep -nE "^(export )?function prompt" packages/harness/src/skill-doc.ts packages/harness/src/skill-code.ts
#  5: doc :123 promptTim · :164 promptSkeptic · code :328 promptPhanTich · :392 promptSinhCode · :430 promptVietFinding
grep -nE "await call(Json|Code)" packages/harness/src/skill-doc.ts packages/harness/src/skill-code.ts
# 11: doc :203 :258 :274 · code :536 :546 :557 :659 :774 :798 :832 :854   (KHONG dem dong import)
grep -n "slice(0, MAX_FINDING)" packages/harness/src/skill-doc.ts        # 3: :204 :260 :264  -> sau change: 1
grep -n "slice(0, MAX_PROBE)"   packages/harness/src/skill-code.ts       # 1: :536
grep -rn "join(repoPath, 'checkmate.yml')" packages/ --include=*.ts      # 3: runner:61 runner:100 spec-source:213 (cua thu TU khong dung khuon nay)
grep -rn "findings.length" apps/web/src packages/harness/src/cli.ts       # 9 be mat bay verdict:
#   PHAI bay volume_standard: gate.ts:352 (receipt) · gate.ts:369 (auto verdict) · ui.ts:1499 (man cham) · ui-history.ts:89 · cli.ts:44
#   KHONG: gate.ts:359 :374 :385 (dong tom tat trong cung comment, da co o :352/:369) · server.ts:271 (commit status 140 ky tu) · server.ts:406 :1125 (API danh sach, chi so finding)
grep -nE "'--skill', *'doc'" apps/web/src/server.ts                       # 4: :312 :989 (PR, can --base) · :1016 :1030 (khong repo -> no_repo)
```

⚠ 11 chỗ gọi model nhưng 5 hàm dựng — 6 chỗ nối thêm chuỗi tại chỗ. Lưới prompt phải kiểm **chuỗi đi ra**
(qua `modelGia` ghi prompts, `test/boc-model.test.ts:93`), không kiểm 5 hàm.

**Đếm lại SAU khi apply (06/09, task 0.3)** — cùng lệnh, số mới:

```bash
grep -cE "^(export )?function prompt" skill-doc.ts skill-code.ts      # 2 + 3 = 5   (khong doi)
grep -cE "await call(Json|Code)"     skill-doc.ts skill-code.ts        # 3 + 8 = 11  (khong doi)
grep -c  "slice(0, MAX_FINDING)"     skill-doc.ts                      # 0   (truoc: 3 — cho cat duy nhat nay o cutBySeverity, volume-standard.ts; luoi scanRawCapCuts giu)
grep -n  "slice(0, probeCap.value)"  skill-code.ts                     # 1   (cat KE HOACH probe, sau khi da gan keHoachTho)
grep -rn "join(repoPath, 'checkmate.yml')" packages/ --include=*.ts    # 3   (runner:61 :143 · spec-source:213) — cua thu TU (readStandardsCfg) KHONG dung khuon nay
grep -rn "findings.length" apps/web/src packages/harness/src/cli.ts | grep -v ":\s*//"   # 11 dong = 9 be mat (gate 5 dong/3 ham · server 3 · ui 1 · ui-history 1 · cli 1)
grep -rln "describeVolumeStandard" apps/web/src packages/harness/src/cli.ts              # gate.ts · ui.ts · cli.ts  (ui-history.ts doc thang counts.before_cut)
```

⚠ Bài học của lần đếm lại: lệnh đếm bắt cả **chú thích** nhắc tới chuỗi đếm — hai chú thích viết lúc apply
làm 3 thành 4 và 9 thành 11 (lần đầu). Đã đổi lời chú thích; lệnh đếm bề mặt thêm `grep -v` dòng chú thích.
Số «9 bề mặt» ở khối trên là số HÀM; đếm theo DÒNG là 11 — hai con số khác nhau cho hai câu hỏi khác nhau.

## Risks / Trade-offs

- **Gỡ số ⇒ model doc có thể trả nhiều hơn ⇒ JSON vượt `max_tokens` ⇒ `callJson` retry rồi lỗi.** Fail-closed
  (lượt lỗi, không PASS) nhưng là hồi quy availability. → Câu thay giữ phanh; dữ liệu (≤ 6) nói rủi ro thấp;
  task 0.4 đo trước trên 6 tài liệu sẵn có (7 lượt — «14» ở bản đầu là số LƯỢT trong `runs/`, không phải số
  tài liệu); nhận diện cắt cụt là nợ có tên đầu bảng.
- **Cắt sau lưới ⇒ lưới neo và vòng 2 chạy trên toàn bộ ứng viên.** Neo là máy (rẻ); vòng 2 gửi lại nguyên
  `promptTim` + mọi quote hỏng — với ≤ 6 ứng viên không sao, với 60 thì đắt. → Nợ có tên: thu hẹp prompt vòng 2.
- **`density_floor_words` là núm vô hiệu chuẩn** → kẹp `[50, 2000]`; và ở bước này không có gì để vô hiệu.
- **`source` bốn giá trị nhưng bề mặt chỉ bày «mặc định»** → 5 bề mặt PHẢI phân biệt `default_unreadable`.
- **Đội đã siết chuẩn mà yml hỏng ⇒ chấm theo mặc định lỏng hơn** → `default_unreadable` lộ trên comment PR.
- **Mặc định probe không đổi (20/6) nên change này không làm bốn lỗ đường code chạm tới** — nhưng ai nâng
  `PROBE_DEPTH` lên 100 trên prod mà chưa xử bốn nợ là tự mở chúng. Ghi thẳng vào tài liệu operator.

## Migration Plan

Không di trú. Trường tuỳ chọn; verdict cũ vắng ⇒ KHÔNG BIẾT. **Đường lùi:** bỏ khối `standards` = mặc định
ngay lượt kế; `probe_cap`/`finding_cap` lùi về 20/8 bằng cấu hình, không cần deploy.

## Hướng cho bước 2 — KHÔNG cam kết ở change này (giữ để không mất)

- Lối thoát sớm khi `exceeded`: **máy viết một finding `high`** (khuôn `findingTreo`, `skill-code.ts:604`),
  **cộng** các ứng viên đã neo (không phải chỉ `[f]`), evidence kiểu mới `measurement {metric, value,
  threshold, size}` + nhánh render; bỏ vòng 2 + skeptic; FAIL qua `verdict.ts:41` nguyên vẹn; **MUST NOT**
  mượn `InsufficientBasis` (thiếu cơ sở ≠ thừa cơ sở).
- Lưới tầng 3 `scanResultAssignments`: mọi `result:` ngoài `decideResult` là ĐỎ.
- Điều kiện tiên quyết trước khi nâng `probe_cap` mặc định: đọc `stop_reason`/`finish_reason` ⇒ lỗi có tên,
  không retry mù · timeout sandbox theo cap · ngân sách comment PR 60 000 ký tự có khai số bị bỏ ·
  `that_lac > 0` từ file của lượt ⇒ không PASS · gom probe hạng 2 vào một sandbox · vòng 2 chỉ gửi id hỏng ·
  skeptic chia lô ≤ 10.

## Open Questions

- Không còn câu hỏi chặn apply. Số bậc thang là **tạm** theo thiết kế (D2); ngày rà lại thay bằng điều kiện
  dữ liệu (D1).
