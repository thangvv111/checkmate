# Security — insufficient-basis-verdict-state

Change này không mở cửa vào, không đọc bí mật, không chạm cổng. Nó đổi **hình dạng của một kết cục thất
bại**. Nên rủi ro thật của nó nằm gần như trọn ở một chỗ: **một lượt chấm thất bại bị đọc thành lượt có
kết quả**. Mọi mục dưới đây soi theo trục đó, không soi theo danh sách chung.

## S0. Trục thật của change này

Lượt không đủ cơ sở là lượt chấm **đã thất bại**. Nếu trường mới, hoặc đường di trú, hoặc bộ lọc mới làm
một lượt như thế trông giống lượt bình thường ở bất kỳ bề mặt nào, thì change này vừa tạo ra đúng thứ mà
nguyên tắc 03 của sản phẩm dựng lên để chống. Đó là hại một chiều: một verdict xanh giả đi qua cổng thì
không lấy lại được.

## S1. Bí mật & rò rỉ

- N/A S1.1 — Change không đọc, không ghi, không che bí mật nào. Trường mới chứa **mã enum** (loại), **số
  probe** (số nguyên), và **lý do** do `hasBasis` sinh từ `probe.id` + dòng đầu thông điệp probe
  (`packages/harness/src/verdict.ts:85-88`). Ba thứ đó vốn đã chảy ra thông điệp lỗi hôm nay; change không
  thêm bề mặt, chỉ đổi chỗ chứa — và còn gột chúng, xem S1.2.
- ✅ S1.2 — **Đã xử.** `ly_do` đi qua `redactMessage(viSao, humanSurfaceSource(t))`
  (`packages/harness/src/skill-code.ts`, ngay trên lời gọi `phat({ type: 'khong_du_co_so' … })`), và
  **bản đã gột được dùng LẠI cho cả cú ném** — một bản duy nhất cho một sự thật, không dựng cửa song
  sinh nơi một bên gột một bên không. Đây còn là một cải thiện so với trước: câu ném cũ chưa qua gột.
  Ghi chú cũ («đường gột đang áp cho thông điệp lỗi») là tiền đề SAI — đo lại thì đường ném không hề
  có gột. 
- N/A S1.3 — Không có giá trị nào bị che trong change này, nên không có bản che để hỏi «phân biệt được
  hai giá trị khác nhau không».

## S2. Danh tính, phiên, vai

- N/A S2.1 — Không đường nào của change đọc danh tính. Trường mới do engine sinh, không do người nhập.
- N/A S2.2 — Không route mới; hai route mang trường mới ra ngoài (`/api/lich-su`,
  `/api/runs/:id/info`) là route đã có, đã nằm sau cửa phiên.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Change không chạm đường merge. Đường ghi cổng đi qua `apps/web/src/cong.ts` và
  không đọc trường mới. Ngược lại, change **siết thêm** một bậc: ca T_cong khoá rằng lượt không đủ cơ sở
  không ghi sổ cái và không đổi trạng thái cổng — hành vi ấy hôm nay đúng nhờ điều kiện `if (meta.verdict)`
  ở `apps/web/src/runs.ts:180`, tức đúng **tình cờ** chứ chưa được canh. Change biến nó thành có canh.
- ✅ S3.2 — Vai `tu_dong` không có quyền mới; ba mức tự động (`truc_comment` · `truc_trang_thai` ·
  `truc_tra_ve`, khai ở `apps/web/src/ui.ts` khối «Tự động ở cổng») không đọc trường mới. Đáng chú ý:
  `truc_tra_ve` chỉ kích hoạt khi **verdict FAIL** — lượt không đủ cơ sở KHÔNG có verdict, nên nó không
  kích hoạt. Đây là kết quả đúng và phải có ca giữ: tự đóng pull request vì engine không kết luận được là
  đổ lỗi của máy lên đầu người viết.

## S4. Dữ liệu không tin cậy & prompt injection

- N/A S4.1 — Change không đưa nội dung mới từ diff hay repo đích vào prompt. Nó phân loại **kết quả chạy
  probe của chính engine** — dữ liệu do engine sinh, không do bên ngoài đưa vào.
- ✅ S4.2 — Không tin thêm gì từ model. `classifyInsufficientBasis` chỉ đọc `baseKq` (kết quả chạy thật
  trong sandbox) và `trangThai` của ứng viên (nhãn do MÁY dán theo bảng chân trị, không do model dán —
  `packages/harness/src/verdict.ts`).

## S5. Sandbox & thực thi

- N/A S5.1 / S5.2 — Change không chạy code nào, không dựng worktree nào, không đụng đường dọn.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — Không file mới. Cột mới nằm trong `web-runs/checkmate.db` đang có, quyền 600 do
  `sietQuyenDb()` (`apps/web/src/store/db.ts:159`) siết ở mọi lần mở — đã đo trên prod hôm nay: `.db`,
  `-wal`, `-shm` đều `-rw-------`.
- ✅ S6.2 — **Đã xử.** Câu quét của di trú là
  `SELECT id FROM run WHERE trang_thai = 'loi' AND khong_du_co_so IS NULL` — chỉ đụng hàng ĐÃ CHẾT,
  không đụng `dang_chay`. Ca T2.7 khoá điều đó, và đột biến 6.5 (bỏ vế `IS NULL`) bị giết cả hai lượt.
  
- ✅ S6.2b — JSON rách trong cột đọc ra rỗng chứ không ném (T2.3): một hàng hỏng không được làm hỏng cả
  trang lịch sử. Cùng khuôn với `readVault` giữ bản hỏng thay vì đè
  (`apps/web/src/secret-vault.ts:36-51`).

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — Đường ném **giữ nguyên** (`skill-code.ts:786`); sự kiện mới phát TRƯỚC cú ném, không thay nó.
  Quyết định D2 của `design.md` nói rõ vì sao: sự kiện là dấu vết, không phải đường thoát. Nhánh lỗi mới
  duy nhất — JSON rách trong cột — dẫn về «không có trường», tức lượt vẫn hiện là lỗi.
- ✅ S7.2 — Change không đụng đường đếm hồi quy. `classifyInsufficientBasis` chỉ ĐỌC `trangThai` của ứng
  viên, không gán và không sửa; probe hỏng vẫn mang nhãn máy dán như trước.
- ✅ S7.3 — **Đã xử.** `classifyInsufficientBasis` gọi `hasBasis` trước, nên đầu vào khuyết đi qua đúng
  đường của nó và ra `{ok:false}` ⇒ **vẫn là lượt thất bại**. Ca T3.1 quét sáu dạng khuyết
  (`null` · `undefined` · rỗng · phần tử null · object trống · không phải mảng) và đòi mọi dạng vẫn ra
  một loại. Đột biến 6.2 (bỏ vế `hasBasis`) bị giết cả hai lượt. 

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 — **Liệt kê mọi đường tới cùng một mục tiêu «lượt thất bại bị đọc thành lượt có kết quả»**, đếm
  bằng máy ở `tasks.md` §0: (1) màn chấm `ui.ts` · (2) nhãn ở lịch sử · (3) **bộ lọc** ở lịch sử · (4) API
  JSON `/api/lich-su` · (5) API JSON `/api/runs/:id/info` · (6) sổ cái · (7) trạng thái cổng. Vá đường (1)
  mà bỏ (3) thì bộ lọc «lỗi» vẫn nuốt lượt không đủ cơ sở — người đếm vẫn đếm sai. Mỗi đường một ca:
  T3.5 · T3.4 · T3.4 · T3.6 · T3.6 · T_cong · T_cong.
- ✅ S8.2 — **Load-bearing hai chiều, không dismiss bằng «đã có lớp khác chặn».** Tám chiều mutation ở
  `tasks.md` §6 đều là dạng «tạm no-op một gác → ca phải ĐỎ». Đặc biệt 6.7 (bộ lọc rơi về
  `trangThai === 'loi'`) và 6.8 (đưa phép so chuỗi trở lại đường render) là hai chiều tái tạo đúng bệnh cũ.
- ✅ S8.3 — **Đối xứng.** Change thêm một cách nhận diện kết cục; đường đối xứng là cách nhận diện **lỗi
  hạ tầng**. Mọi ca của change đều có vế đối chứng ở phía ấy: T1.8 (di trú không khớp lỗi hạ tầng), T2.4
  (lỗi hạ tầng không mang trường), T3.4 (hai bộ lọc không nuốt nhau). Không có vế này thì một phép quét
  quá rộng vẫn xanh trên mọi ca đối kháng rồi gán nhãn sai cho mọi lượt lỗi.

## Notes

**Rủi ro không nằm ở mục nào ở trên: di trú suy đoán loại cho hàng cũ.** Hàng đời cũ không có dữ liệu để
biết chắc loại nào; hàm di trú suy từ dấu vết trong sổ sự kiện. Chấp nhận được vì cái sai tối đa là **hiện
nhầm một trong hai lời văn cho một lượt đã chết** — không verdict nào đổi, không hàng sổ cái nào đổi, cổng
không đổi, và không lượt nào được nâng từ «thất bại» lên «có kết quả» (hai loại đều là thất bại). Điều kiện
để giữ mức rủi ro đó: hàm di trú **chỉ được gán một trong hai loại**, không bao giờ được gán «không phải
không-đủ-cơ-sở» cho hàng nó đã nhận là không-đủ-cơ-sở, và ngược lại không được nhận nhầm lỗi hạ tầng
(T1.8). Hàm ghi rõ trong chú thích rằng đây là suy đoán, để người sau không đọc nó như dữ liệu đo được.

**Phát hiện thêm khi apply — lưới ghi vào SỔ THẬT.** Bản đầu của `test/insufficient-basis.test.ts` đặt
`CHECKMATE_DB` bên trong `describe`, nhưng `DB_PATH` là hằng cấp module của `store/db.js` và import TĨNH
của ESM đã nạp nó từ trước. Cả khối di trú chạy thẳng trên `web-runs/checkmate.db` của máy dev: năm hàng
giả lọt vào sổ, và một đột biến SỐNG SÓT oan vì cột cần kiểm đã có sẵn ở đó. Đã dọn sổ (38 lượt, không
hàng sổ cái hay sổ cổng nào bị chạm) và thêm **ca gác** khẳng định `DB_PATH` nằm trong thư mục tạm — vì
một lưới ghi vào dữ liệu prod là loại hỏng không tự lộ ra, nó chỉ lộ khi có người đi tìm.
