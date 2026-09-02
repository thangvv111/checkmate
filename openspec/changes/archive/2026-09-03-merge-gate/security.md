# Security — merge-gate

Change này chạm ĐÚNG cổng merge — chỗ nguy hiểm nhất của sản phẩm. Nó KHÔNG đổi hành vi: tách quyết định
thành hàm thuần để khoá bằng test. Rủi ro thật là refactor làm đổi thứ tự kiểm hay một chữ thông điệp.

## S1. Bí mật & rò rỉ

- N/A S1.1 Không giá trị bí mật nào đi qua hàm thuần; thông điệp cổng chỉ chứa số PR, SHA rút gọn, id finding.
- ✅ S1.2 Bề mặt công khai không đổi: biên nhận/phán quyết đăng lên PR vẫn do `renderReceipt`/`renderRuling`
  (`apps/web/src/gate.ts:342, :373`) dựng; change không thêm trường nào vào đó.
- N/A S1.3 Không bản che mới.

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 Route vẫn đọc danh tính qua đúng một hàm `getIdentity` + `requireGateRole`
  (`apps/web/src/identity.ts:208-213`, gọi ở `server.ts:904-909`, `:946-951`); hàm thuần nhận KẾT QUẢ, không
  đọc `req`, không có đường fallback nào (D1).
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG. `decideAutomation` trả `{comment, commitStatus, closePr}` — kiểu không có trường merge; khoá
  lạ `tu_dong_merge` bị lọc ở cửa đọc (`apps/web/src/config.ts:143, :169, :198`; test `ba-muc-tu-dong`
  P10 ba vòng). `mergePr` chỉ được gọi từ route merge sau khi `evaluateMergeLocal` + `evaluateMergeAgainstPr`
  đều `ok` và người bấm qua `requireGateRole`.
- ✅ S3.2 Vai `tu_dong` không nằm trong tập cổng (`identity.ts:229`); ba công tắc giữ nguyên tên, mặc định
  (`config.ts:98`) và cách lọc cấu hình đời cũ (`ba-muc-tu-dong` ca «cấu hình đời cũ thiếu hai cờ»).

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 `tick_ids` từ client là DỮ LIỆU: máy chủ so TẬP id với tập medium thật của verdict, id thừa vô
  tác dụng, id thiếu chặn (`server.ts:910-913`, sau apply là `evaluateMergeLocal`; T1.6/T1.7/T3.2).
- N/A S4.2 Không gọi model.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích.
- N/A S5.2 Không worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Không file mới. Sổ cổng vẫn chỉ-ghi-thêm qua `appendGateLedgerEntry` (`gate.ts:292`) →
  `appendGateLedger` (`store/ledger-store.ts:128`); đọc «đã qua cổng» tươi từ sổ (`runs.ts:362`).
- N/A S6.2 Không ghi atomic mới.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Mọi nhánh khuyết trong hàm thuần → từ chối (404/403/409/422), không nhánh nào trả `ok:true` khi
  thiếu verdict hoặc pr (T1.3, T2.2, T2.3, T3.1). Thứ tự: chế độ chỉ-đọc → run → đã qua cổng → FAIL/high →
  danh tính → medium → [GitHub] mở? → head? — chép nguyên từ `server.ts:890-919`.
- N/A S7.2 Không chạm phân loại probe.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **merge một PR mà không có PASS còn hiệu lực**, hoặc **kích một hành động cổng mà không phải người
có quyền**. Mọi đường, và gác của từng đường:

- ✅ S8.1 (a) verdict FAIL/high → 403 (`server.ts:898` → T1.1); (b) head đổi sau khi lấy PASS → 409 tại route
  (`:917-919`) VÀ `mergePr(…, sha)` để GitHub tự 409 nếu head đổi sau lần kiểm (`github.ts:151-161`) — hai
  lớp, không phải một; (c) PR đã đóng/merge → 409 (`:915-916`); (d) bỏ qua medium bằng danh sách client →
  so tập (S4.1); (e) merge lần hai trên run đã qua cổng → 409 đọc tươi từ sổ (`:894`); (f) chế độ chỉ-đọc →
  403 trước mọi kiểm (`:890`); (g) không phiên / sai vai → 401/403 trước lời gọi GitHub (`:904-909`); (h)
  máy tự merge qua cấu hình → khoá lạ bị lọc (S3.1). Refactor giữ NGUYÊN tám gác — test T1.x mỗi gác một ca.
- ✅ S8.2 Load-bearing hai chiều: mỗi gác có ca «bị chặn» với đầu vào đúng nhánh; T1.9 chứng minh THỨ TỰ
  (đổi thứ tự trong hàm thuần → ca đỏ). Mutation lúc apply: tạm bỏ một `if` trong hàm thuần → ca tương ứng
  đỏ; ghi kết quả vào PR.
- ✅ S8.3 Đối xứng merge/reject: cùng ba gác đầu (chế độ, run, đã qua cổng) và gác danh tính; reject thêm
  gác ghi chú (T1.13/T1.14). Hai hàm, một khuôn thứ tự — lệch là T1.14 bắt.

## Notes

- Refactor «thay khối if bằng một lời gọi»: review bằng `git diff apps/web/src/server.ts` — số lần xuất hiện
  từng chuỗi thông điệp trước/sau phải bằng nhau (T2.1).
- `getIdentity` được gọi sớm hơn một bước so với hôm nay (trước khi vào hàm thuần) — không tác dụng phụ; thứ
  tự THÔNG ĐIỆP không đổi vì hàm thuần xếp FAIL trước thiếu quyền (T1.9).
