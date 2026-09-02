# Test cases — merge-gate

Requirement sinh ra (capability `merge-gate`): R-1 «Merge chỉ khi verdict PASS còn hiệu lực…», R-2 «Cảnh
báo medium…», R-3 «Hành động cổng vào sổ…», R-4 «Tự động ở cổng…», R-5 «Chế độ chỉ-đọc…»; và
`doi-soat-cong › Đối soát idempotent và không bịa` (scenario mới).

## Unit / hàm thuần

### evaluateMergeLocal
- [ ] T1.1 [R-1 FAIL/high]: verdict `FAIL` → `{ok:false, 403, 'Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.'}`; `PASS` + 1 high → cùng lời.
- [ ] T1.2 [R-1 đã qua cổng]: `gateDone = {hanhDong:'merge', luc}` → 409, lời «Run này đã merge lúc …».
- [ ] T1.3 [R-1 run thiếu]: run không verdict / không pr → 404.
- [ ] T1.4 [R-5]: `mode = 'demo'` → 403 «Chế độ demo không cho thao tác cổng merge (chỉ xem).» — TRƯỚC mọi kiểm khác (kể cả run thiếu).
- [ ] T1.5 [R-3 thiếu quyền]: identity `{ok:false, 403}` với verdict PASS sạch → 403 lời thiếu quyền; `{ok:false, 401}` → 401.
- [ ] T1.6 [R-2 thiếu medium]: 3 medium, tick 2 → 422, lời nêu «đủ 3 cảnh báo MEDIUM — còn thiếu: <id>».
- [ ] T1.7 [R-2 id thừa/trùng]: tick chứa đủ id thật + id lạ + lặp → ok, `mediumIds` đúng tập thật.
- [ ] T1.8 [R-2 không medium]: PASS không medium, tick rỗng → ok.
- [ ] T1.9 [R-1 thứ tự]: FAIL + identity 401 → lời FAIL (403); PASS + identity 403 + thiếu medium → lời thiếu quyền.

### evaluateMergeAgainstPr
- [ ] T1.10 [R-1 PR không mở]: `currentPr.state = 'closed'` → 409 lời «PR #n không còn mở (closed)»; `merged = true` → «(đã merge)».
- [ ] T1.11 [R-1 head đổi]: `headSha` khác → 409, lời chứa hai SHA rút gọn và «verdict cũ hết hiệu lực».
- [ ] T1.12 [R-1 khớp]: PR mở, head trùng → ok.

### evaluateRejectLocal
- [ ] T1.13 [R-3 ghi chú trống]: `ghiChu = '   '` → 422 «Trả về dev phải có ghi chú — dev cần biết vá gì.».
- [ ] T1.14 [R-5, đã qua cổng, thiếu quyền]: cùng ba lời như merge; thứ tự: chế độ → run → đã qua cổng → identity → ghi chú.

### decideAutomation
- [ ] T1.15 [R-4]: mặc định (comment bật, trạng thái bật, trả về tắt) + FAIL có high → `{comment:true, commitStatus:true, closePr:false}`.
- [ ] T1.16 [R-4]: trả về bật + FAIL có high → `closePr:true`; trả về bật + FAIL chỉ medium → `closePr:false`; trả về bật + PASS → `false`.
- [ ] T1.17 [R-4 lượt bấm tay]: `decideAutomation` không nhận «chế độ trực» làm đầu vào — cùng cấu hình cho ra cùng quyết định bất kể lượt do ai khởi động.
- [ ] T1.18 [R-4 máy không merge]: kiểu trả về không có trường `merge`; config có `tu_dong_merge:true` → `readConfig` lọc (ca có sẵn `ba-muc-tu-dong` — trích dẫn, không lặp).

### R6.10 (scenario của R-1)
- [ ] T1.19 [chấm lại cùng commit]: `findByPr(so, sha)` có run và `ep !== '1'` → 409 (JSON: `da_cham_run_id`); `ep === '1'` → chạy. Soi `test/run-screen`/route trước; thiếu thì thêm ca gọi điều kiện.

## Tích hợp (đĩa, SQLite, khoá)

### route gọi hàm thuần
- [ ] T2.1 [Đối chứng refactor]: diff `server.ts` chỉ thay khối kiểm bằng lời gọi hàm; `git diff` không có thay đổi chuỗi thông điệp (`grep -c` các thông điệp trước/sau bằng nhau) — kiểm lúc apply, ghi vào PR.
- [ ] T2.2 [Đời cũ]: `RunMeta` không có `ketQuaCong` → coi như chưa qua cổng (không ném).
- [ ] T2.3 [Hỏng]: `tick_ids` không phải chuỗi / verdict `findings` không phải mảng → hàm thuần không ném, rơi về từ chối nói rõ (fail-closed).

### doi-soat-cong
- [ ] T2.4 [scenario mới]: hàng ngoài-cổng có `nguoi` = danh tính GitHub hoặc «không rõ», không bao giờ `ci-bot` — soi `test/doi-soat-cong.test.ts`; thiếu thì thêm.

## Ca đối kháng & hồi quy

- [ ] T3.1 [KHUYẾT ở mọi tầng]: `evaluateMergeLocal` với `run = null`, `run.verdict = undefined`, `identity = undefined`, `tickIds = null` → không ném; từ chối với mã đúng nhánh.
- [ ] T3.2 [Client cài bẫy]: `tick_ids` = `"a,b,c"` + `"__proto__"` → chỉ so tập; không có id nào của verdict → 422.
- [ ] T3.3 [Lịch sử]: thứ tự kiểm cục-bộ-trước-GitHub — test ghi rõ vì sao (không để người thiếu quyền kích lời gọi ra ngoài).
- [ ] T3.4 [thu-vien]: hai ca I/O có trần 20 s; các ca khác vẫn 5 s (grep số tham số trần trong file = 2).

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật; thông điệp cổng chỉ chứa số PR, SHA rút gọn, id finding.
- [ ] T_failclosed — T1.3 · T2.2 · T2.3 · T3.1: mọi đầu vào khuyết → từ chối, không bao giờ `ok:true` khi thiếu verdict/pr.
- [ ] T_cong — T1.1 · T1.4 · T1.5 · T1.15–T1.18: máy KHÔNG BAO GIỜ merge (`decideAutomation` không có nhánh merge; khoá lạ bị lọc); vai `tu_dong` không qua `requireGateRole`; ba mức tự động độc lập, mặc định an toàn với cấu hình đời cũ.
- [ ] T_khongtincay — T1.7 · T3.2: `tick_ids` từ client là dữ liệu, máy chủ so với tập medium thật.
- [ ] T_hopdong — bốn export mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T5.1 Mở một lượt đã xong có PR trên local, bấm merge với verdict FAIL → trang lỗi cổng vẫn cùng lời như trước refactor (đối chiếu ảnh chụp/chuỗi).
