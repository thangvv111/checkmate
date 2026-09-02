# Design — merge-gate

## Context

Đo 03/09 trên `main`:

```
luat cong trong code        server.ts /api/runs/:id/merge (:889-931) · /reject (:933-976) · rm.onXong (:176-222)
                            thu tu kiem merge: che do -> run/pr -> da qua cong -> FAIL/high -> danh tinh/vai
                                               -> medium -> [GitHub] PR mo? -> head doi? -> merge(sha) -> so
test khoa                   R6.6-R6.11: KHONG (handler Express, khong goi duoc tu test)
                            R6.15/R6.18/R6.19: co (ba-muc-tu-dong 28 ca, so-cong 10 ca)
                            R6.16/R6.17: khong truc tiep (logic trong closure rm.onXong)
thu vien probe tu cham      2/25 ve neo ma R6.15, R6.19 — mat neo sau retire-r-rules
che do demo                 MODE = argv --org | CHECKMATE_MODE=org ? 'org' : 'demo' (config.ts:10); 10 cho gac
```

PO chốt 03/09: chế độ demo giữ làm tính năng sản phẩm (chế độ chỉ-đọc); tách hàm quyết định là «gọn»;
R6.10 thành scenario của requirement 1; nới trần hai ca `thu-vien` gộp vào đây.

## Goals / Non-Goals

**Goals**
- Mỗi điều R6.6–R6.19 có requirement + scenario + test chạy được; thông điệp và thứ tự kiểm khoá từng chữ.
- Không đổi hành vi nào của cổng. Không đổi giao diện.
- Thư viện probe tự chấm neo lại được `R6.15`, `R6.19`.

**Non-Goals**
- KHÔNG đổi tên giá trị `demo`/`org` trong code hay systemd (đổi tên là nợ có tên — đụng unit prod).
- KHÔNG chạm danh tính/phiên (`identity-session` là change riêng); KHÔNG chạm đối soát ngoài đoạn «Vì sao».
- KHÔNG nạp khuôn mới vào kho.

## Decisions

### D1 — Tách quyết định cổng thành hàm thuần, giữ NGUYÊN thứ tự kiểm

Hai handler trộn quyết định với I/O nên không test được — đó là lý do sáu điều lõi không có test. Tách:

```
evaluateMergeLocal({ mode, run, gateDone, identity, tickIds })
   -> { ok: true, nguoi, mediumIds } | { ok: false, status, message }
   thu tu: che do chi-doc -> run/verdict/pr thieu -> da qua cong -> FAIL/high -> identity (401/403) -> medium thieu
evaluateMergeAgainstPr({ run, currentPr })
   -> { ok: true } | { ok: false, status: 409, message }
   thu tu: PR khong con mo -> head doi
evaluateRejectLocal({ mode, run, gateDone, identity, ghiChu })
   -> { ok: true, nguoi, ghiChu } | { ok: false, status, message }
   thu tu: che do chi-doc -> run/verdict/pr thieu -> da qua cong -> identity -> ghi chu trong
decideAutomation(truc, verdict)
   -> { comment: boolean, commitStatus: boolean, closePr: boolean }
```

`identity` là KẾT QUẢ đã tính ở route (`{ ok: true, name } | { ok: false, status, message }`), không phải
`req`: hàm thuần không đọc HTTP. Route gọi `getIdentity` trước khi gọi hàm — điều đó không đổi thứ tự
thông điệp vì hàm thuần vẫn xếp FAIL trước thiếu quyền; và `getIdentity` không có tác dụng phụ.

Hai hàm merge (cục bộ / đối chiếu PR) tách vì giữa chúng có lời gọi mạng: mọi kiểm cục bộ phải xong
TRƯỚC khi hỏi GitHub — không để người thiếu quyền kích được một lời gọi ra ngoài, và không tốn một lời
gọi cho verdict đã FAIL. Phương án một hàm nhận `currentPr` bắt route fetch trước → phá thứ tự đó.

### D2 — Thông điệp là hợp đồng, khoá từng chữ

Trang lỗi cổng (`loiCong`) và UI (`man-run` › «Verdict đã hết hiệu lực») cùng nói một chuyện; đổi một chữ
ở route mà không đổi test là lệch. Test so `message` bằng `toBe`, không `toContain`.

### D3 — Spec viết từ code, R chỉ là gợi ý; mã gốc ghi trong thân requirement

Mỗi requirement ghi «(gốc: R6.x)» — vừa là con trỏ cho người tra bảng, vừa để `resolveRule` (mã trong
`codes` của đơn vị) neo lại probe thư viện tự chấm (`spec_rule: "R6.15"`, `"R6.19"`). Cách này cũng là
khuôn cho 11 change backfill còn lại.

### D4 — R6.10 là scenario, không phải requirement

Nó nói về lúc BẮT ĐẦU lượt chấm («một verdict một commit»), không phải quyết định cổng; đứng riêng thì
capability có một requirement không có scenario tiêu cực nào đáng kể. Code giữ nguyên (`server.ts:708–717`,
nút «Vẫn chạy lại» = `ep=1`); test khoá qua hàm thuần `shouldWarnRerun(existingRun, ep)`? — KHÔNG: thêm hàm
cho một `if` là quá tay; test ở mức «route trả 409 kèm `da_cham_run_id` khi gọi JSON» đã có
(`test/run-screen`? — soi lúc apply; thiếu thì thêm một ca gọi hàm `findByPr` + điều kiện `ep`).

### D5 — Chế độ chỉ-đọc: tên đúng trong spec, giá trị cũ trong code

Requirement nói «chế độ chỉ-đọc»; code vẫn `MODE === 'demo'`, thông điệp vẫn «Chế độ demo không cho thao
tác cổng merge (chỉ xem).» — đổi chữ trong thông điệp là đổi hợp đồng D2, đổi giá trị là đụng unit systemd
prod. Ghi nợ có tên: đổi `demo` → `read_only` (giá trị env + thông điệp) khi có dịp deploy có kiểm.

### D6 — R6.24b vào `doi-soat-cong` bằng MODIFIED chỉ thêm «Vì sao» và một scenario

Không đổi hành vi (code đã đúng: `gate.ts:73,84,127` ghi «máy chỉ GHI LẠI»); scenario thêm khoá đúng cột
«người» của hàng ngoài-cổng — có test `doi-soat-cong` sẵn, soi lúc apply, thiếu thì thêm.

### D7 — Trần thời gian cho hai ca I/O của `thu-vien`

Hai ca (dòng 61 đào thải + xoá file; dòng 271 lịch sử 20 lượt) làm I/O thật, 5.7–6.9 s khi 44 file chạy
song song; nới **đúng hai `it`** lên 20 s (tham số thứ ba), không nới toàn cục — trần toàn cục 5 s vẫn là
lưới cho test thuần.

## Architecture

- `apps/web/src/gate.ts`: bốn hàm thuần mới (export) — tầng app, không I/O.
- `apps/web/src/server.ts`: hai route + `rm.onXong` gọi hàm; I/O giữ nguyên chỗ.
- `checkmate.yml`: bảng module `gate.js` thêm bốn tên (⛔C5).
- `test/merge-gate.test.ts` (mới); `test/thu-vien.test.ts` (hai trần).
- `packages/*`: không đổi.

## Data Model

N/A — không đổi hình dạng `so_cong`, `run`, verdict. Hàm thuần chỉ đọc `RunMeta` (verdict, pr, ketQuaCong)
và `GateLedgerEntry` đã có.

## Risks / Trade-offs

- [Refactor đổi thứ tự kiểm hay một chữ thông điệp] → test khoá thứ tự bằng ca «nhiều điều kiện cùng sai»
  và so thông điệp `toBe`; review diff route phải là «thay khối if bằng một lời gọi», không hơn.
- [`getIdentity` gọi sớm hơn một bước] → không tác dụng phụ; thứ tự thông điệp do hàm thuần quyết.
- [Trần 20 s che một hồi quy hiệu năng thật của thư viện] → chỉ hai ca, có chú thích số đo; ca khác vẫn 5 s.

## Migration Plan

N/A — không dữ liệu. Đường lùi: revert PR.

## Open Questions

- Không. (Đổi tên `demo` → chỉ-đọc trong code: nợ có tên, ghi ở tasks.)
