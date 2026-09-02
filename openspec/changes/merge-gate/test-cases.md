# Test cases — merge-gate

Requirement sinh ra (capability `merge-gate`): R-1 «Merge chỉ khi verdict PASS còn hiệu lực…», R-2 «Cảnh
báo medium…», R-3 «Hành động cổng vào sổ…», R-4 «Tự động ở cổng…», R-5 «Chế độ chỉ-đọc…»; và
`doi-soat-cong › Đối soát idempotent và không bịa` (scenario mới).

## Unit / hàm thuần

### evaluateMergeLocal
- [x] T1.1 [R-1 FAIL/high]: verdict `FAIL` → `{ok:false, 403, 'Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.'}`; `PASS` + 1 high → cùng lời.
- [x] T1.2 [R-1 đã qua cổng]: `gateDone = {hanhDong:'merge', luc}` → 409, lời «Run này đã merge lúc …».
- [x] T1.3 [R-1 run thiếu]: run không verdict / không pr → 404.
- [x] T1.4 [R-5]: `mode = 'demo'` → 403 «Chế độ demo không cho thao tác cổng merge (chỉ xem).» — TRƯỚC mọi kiểm khác (kể cả run thiếu).
- [x] T1.5 [R-3 thiếu quyền]: identity `{ok:false, 403}` với verdict PASS sạch → 403 lời thiếu quyền; `{ok:false, 401}` → 401.
- [x] T1.6 [R-2 thiếu medium]: 3 medium, tick 2 → 422, lời nêu «đủ 3 cảnh báo MEDIUM — còn thiếu: <id>».
- [x] T1.7 [R-2 id thừa/trùng]: tick chứa đủ id thật + id lạ + lặp → ok, `mediumIds` đúng tập thật.
- [x] T1.8 [R-2 không medium]: PASS không medium, tick rỗng → ok.
- [x] T1.9 [R-1 thứ tự]: FAIL + identity 401 → lời FAIL (403); PASS + identity 403 + thiếu medium → lời thiếu quyền.

### evaluateMergeAgainstPr
- [x] T1.10 [R-1 PR không mở]: `currentPr.state = 'closed'` → 409 lời «PR #n không còn mở (closed)»; `merged = true` → «(đã merge)».
- [x] T1.11 [R-1 head đổi]: `headSha` khác → 409, lời chứa hai SHA rút gọn và «verdict cũ hết hiệu lực».
- [x] T1.12 [R-1 khớp]: PR mở, head trùng → ok.

### evaluateRejectLocal
- [x] T1.13 [R-3 ghi chú trống]: `ghiChu = '   '` → 422 «Trả về dev phải có ghi chú — dev cần biết vá gì.».
- [x] T1.14 [R-5, đã qua cổng, thiếu quyền]: cùng ba lời như merge; thứ tự: chế độ → run → đã qua cổng → identity → ghi chú.

### decideAutomation
- [x] T1.15 [R-4]: mặc định (comment bật, trạng thái bật, trả về tắt) + FAIL có high → `{comment:true, commitStatus:true, closePr:false}`.
- [x] T1.16 [R-4]: trả về bật + FAIL có high → `closePr:true`; trả về bật + FAIL chỉ medium → `closePr:false`; trả về bật + PASS → `false`.
- [x] T1.17 [R-4 lượt bấm tay]: `decideAutomation` không nhận «chế độ trực» làm đầu vào — cùng cấu hình cho ra cùng quyết định bất kể lượt do ai khởi động.
- [x] T1.18 [R-4 máy không merge]: kiểu trả về không có trường `merge`; config có `tu_dong_merge:true` → `readConfig` lọc (ca có sẵn `ba-muc-tu-dong` — trích dẫn, không lặp).

### R6.10 (scenario của R-1)
- [x] T1.19 [chấm lại cùng commit] — SOI 03/09: nửa DỮ LIỆU đã khoá ở `test/kho-run.test.ts:114–122`
      (`findByPr` tìm đúng run cùng sha · không tìm khi sha mới · lượt đang chạy không tính là đã có verdict).
      Nửa ROUTE (409 kèm `da_cham_run_id`, `ep=1` mới chạy) nằm trong handler `/api/runs` chưa tách — cùng
      lý do với merge/reject trước change này. KHÔNG thêm hàm thuần cho một `if` (D4); ghi nợ có tên ở
      tasks §6.2. Hành vi vẫn đúng và có thật (`server.ts:708–717`), chỉ là chưa khoá tự động.

## Tích hợp (đĩa, SQLite, khoá)

### route gọi hàm thuần
- [x] T2.1 [Đối chứng refactor]: diff `server.ts` chỉ thay khối kiểm bằng lời gọi hàm; `git diff` không có thay đổi chuỗi thông điệp (`grep -c` các thông điệp trước/sau bằng nhau) — kiểm lúc apply, ghi vào PR.
- [x] T2.2 [Đời cũ]: `RunMeta` không có `ketQuaCong` → coi như chưa qua cổng (không ném).
- [x] T2.3 [Hỏng]: `tick_ids` không phải chuỗi / verdict `findings` không phải mảng → hàm thuần không ném, rơi về từ chối nói rõ (fail-closed).

### doi-soat-cong
- [x] T2.4 [scenario mới] — SOI 03/09: ĐÃ CÓ ở `test/doi-soat-cong.test.ts:94` (chú thích nêu thẳng «máy
      không merge gì cả, R6.19») và `:107–108` (cột «người» là «không rõ», «không mượn tên nào»). Không
      thêm ca; scenario trong delta spec chỉ ghi thành luật thứ code và test đã giữ.

## Ca đối kháng & hồi quy

- [x] T3.1 [KHUYẾT ở mọi tầng]: `evaluateMergeLocal` với `run = null`, `run.verdict = undefined`, `identity = undefined`, `tickIds = null` → không ném; từ chối với mã đúng nhánh.
- [x] T3.2 [Client cài bẫy]: `tick_ids` = `"a,b,c"` + `"__proto__"` → chỉ so tập; không có id nào của verdict → 422.
- [x] T3.3 [Lịch sử]: thứ tự kiểm cục-bộ-trước-GitHub — test ghi rõ vì sao (không để người thiếu quyền kích lời gọi ra ngoài).
- [x] T3.4 [thu-vien]: hai ca I/O có trần 20 s; các ca khác vẫn 5 s (grep số tham số trần trong file = 2).

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật; thông điệp cổng chỉ chứa số PR, SHA rút gọn, id finding.
- [x] T_failclosed — T1.3 · T2.2 · T2.3 · T3.1: mọi đầu vào khuyết → từ chối, không bao giờ `ok:true` khi thiếu verdict/pr.
- [x] T_cong — T1.1 · T1.4 · T1.5 · T1.15–T1.18: máy KHÔNG BAO GIỜ merge (`decideAutomation` không có nhánh merge; khoá lạ bị lọc); vai `tu_dong` không qua `requireGateRole`; ba mức tự động độc lập, mặc định an toàn với cấu hình đời cũ.
- [x] T_khongtincay — T1.7 · T3.2: `tick_ids` từ client là dữ liệu, máy chủ so với tập medium thật.
- [x] T_hopdong — bốn export mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T5.1 Mở một lượt đã xong có PR trên local, bấm merge với verdict FAIL → trang lỗi cổng vẫn cùng lời
      như trước refactor. **Làm được một nửa 03/09**: dựng server thật (cổng 4099) → app nạp và chạy sau
      refactor; POST /api/runs/<id>/merge và /reject trả **401** vì middleware đăng nhập chặn TRƯỚC handler
      (lớp R11, không phải quyết định cổng). Nửa còn lại cần một PHIÊN ĐĂNG NHẬP — agent không có mật khẩu,
      để PO bấm. Bằng chứng thay thế đã có: T2.1 (mọi chuỗi thông điệp chuyển trọn sang gate.ts, không dòng
      thêm nào ở server.ts mang chuỗi) + 27 ca gọi thẳng hàm thuần + 9 mutation chứng minh từng gác load-bearing.
