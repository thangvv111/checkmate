# Security — verdict-contract

Change này chạm đường quyết định verdict — tầng dưới của cổng merge. Nó KHÔNG đổi hành vi: tách logic đang
chạy thành hàm thuần để khoá bằng test. Rủi ro thật là refactor làm mất một trong hai lưới máy.

## S1. Bí mật & rò rỉ

- N/A S1.1 Hàm thuần chỉ nhận nhãn trạng thái, mức severity và mô tả probe do model viết; không giá trị
  bí mật nào đi qua.
- ✅ S1.2 Bề mặt công khai (comment PR) không đổi: `renderAutoVerdict`/`renderReceipt` (`apps/web/src/gate.ts`)
  không nằm trong phạm vi change.
- N/A S1.3 Không bản che mới.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính.
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge. Change làm CHẶT hơn phía verdict: sàn cứng bảo đảm hồi quy
  luôn ra `FAIL`, tức cổng khoá (`evaluateMergeLocal` từ chối `FAIL`, `apps/web/src/gate.ts`).
- N/A S3.2 Không đụng ba công tắc tự động.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 **Severity và danh sách finding do MODEL trả về là dữ liệu, không phải quyết định.** Máy ép sàn
  `high` cho hồi quy máy-xác-nhận (`skill-code.ts:818`) và tự bổ sung finding khi model im lặng (`:836`) —
  hai lưới này chính là chỗ change khoá bằng test. Model không hạ được mức, không xoá được finding bằng
  cách không viết.
- ✅ S4.2 Finding trỏ vào ứng viên không tồn tại bị vứt (`skill-code.ts:813`) — giữ nguyên, không nằm trong
  phạm vi nhưng là gác cùng đường; ghi ở đây để lần sau không ai tưởng nó thuộc `regressionFloor`.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích ở chỗ mới.
- N/A S5.2 Không worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không file mới trên đĩa lúc chạy.
- N/A S6.2 Không ghi.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Đây là trục chính của change. `decideResult` dựa `chuanMuc` — severity lạ hay đời cũ về `high`,
  không rơi về mức thấp (`packages/shared/src/types.ts:8-13`). `hasBasis` trả `{ok:false}` cho danh sách
  rỗng và cho lượt toàn `ngoai_pham_vi` — không có nhánh nào biến «không chứng minh được gì» thành `PASS`.
  Đầu vào méo (findings không phải mảng, `maDaCo` không phải tập) KHÔNG ném và KHÔNG cho qua (T1.4, T1.12).
- ✅ S7.2 Probe hỏng không thành bằng chứng hồi quy: `hasBasis` chỉ tính bốn nhãn nói được điều gì đó về PR;
  `ngoai_pham_vi`, `nghi_loi_co_san`, `nghi_van`, `bo_qua`, `khong_chay` không lọt vào.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **một PR có hồi quy vẫn ra verdict PASS**. Mọi đường tới đó:

- ✅ S8.1 (a) model gán `medium` cho hồi quy → sàn cứng ép `high` (T1.5); (b) model không viết finding cho
  hồi quy → máy tự bù mức `high` (T1.9); (c) model viết finding trỏ ứng viên khác → bị vứt ở lưới có sẵn,
  rồi (b) bù lại; (d) toàn bộ probe bị dán `ngoai_pham_vi` nên không có hồi quy nào để bắt → `hasBasis`
  chặn, lượt chấm thất bại thay vì PASS (T3.3); (e) severity đời cũ/lạ đọc thành mức thấp → `chuanMuc`
  fail-closed (T1.3).
- ✅ S8.2 Load-bearing hai chiều: mutation bỏ sàn cứng · bỏ bù-thiếu · bỏ điều kiện `hasBasis` · đổi
  `some`→`every` trong `decideResult`, mỗi cái phải làm lưới đỏ (task 3.2); ghi kết quả vào PR.
- ✅ S8.3 Đối xứng: sàn cứng áp cho CẢ `hoi_quy` và `vi_pham_luat_moi` (hai nhãn cùng chặn merge); ca đối
  chứng `nghi_van` chứng minh nó KHÔNG lan sang nhãn không được chặn (T1.7).

## Notes

- Change làm rõ một điều dễ hiểu nhầm: câu «có hồi quy thì FAIL» KHÔNG được cưỡng chế ở `cli.ts` (chỗ tính
  `result`) mà ở hai lưới máy trong `skill-code.ts`. Ai đó dọn `skill-code.ts` sau này mà bỏ một trong hai
  sẽ mở lại đúng lỗ đó — nay có test đỏ ngay.
