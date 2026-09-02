# Tasks — merge-gate

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/merge-gate/spec.md` (5 requirement) và MODIFIED `specs/doi-soat-cong/spec.md`
      (đã viết). Mỗi requirement có test khoá ở `test/merge-gate.test.ts`; scenario R6.24b khoá ở
      `test/doi-soat-cong.test.ts` (soi; thiếu thì thêm).

## 2. Web (apps/web)

- [x] 2.1 `gate.ts`: `evaluateMergeLocal` · `evaluateMergeAgainstPr` · `evaluateRejectLocal` ·
      `decideAutomation` — hàm thuần, thứ tự kiểm và thông điệp chép NGUYÊN từ route hiện tại (D1, D2).
- [x] 2.2 `server.ts`: `/api/runs/:id/merge`, `/api/runs/:id/reject`, `rm.onXong` gọi bốn hàm; diff route
      phải là «thay khối if bằng một lời gọi» — không đổi thông điệp, không đổi mã HTTP, không đổi I/O.
- [x] 2.3 `checkmate.yml` bảng module: `../apps/web/src/gate.js` thêm bốn export (⛔C5).

## 3. Test

- [x] 3.1 `test/merge-gate.test.ts`: mỗi scenario của 5 requirement một ca; thông điệp `toBe`; ca «nhiều
      điều kiện cùng sai» khoá thứ tự (FAIL trước thiếu phiên; thiếu quyền trước medium; cục bộ trước GitHub);
      `decideAutomation`: bốn scenario của requirement 4; R6.10: ca gọi điều kiện `findByPr` + `ep` (soi
      `test/run-screen` / route JSON trước, thiếu thì thêm).
- [x] 3.2 `test/doi-soat-cong.test.ts`: scenario «hàng ngoài-cổng ghi đúng người thực hiện» — soi đã có chưa;
      thiếu thì thêm một ca.
- [x] 3.3 `test/thu-vien.test.ts`: hai `it` (dòng 61, 271) thêm tham số trần 20 s kèm chú thích số đo (D7).

## 4. Bảng tra

- [ ] 4.1 `docs/r-rules-map.md`: R6 · R6.6–R6.12 · R6.15–R6.18 `pending` → `housed` với địa chỉ
      `merge-gate › <tiêu đề>`; R6.12 và R6.24b `precedent` → `housed` (`merge-gate › Chế độ chỉ-đọc…`,
      `doi-soat-cong › Đối soát idempotent và không bịa`); R6.19 giữ `invariant`, cột `evidence` thêm
      `test/merge-gate.test.ts`. Lưới `r-rules-map` đòi `housed` trỏ requirement CÓ THẬT trong
      `openspec/specs/`, nên cập nhật bảng tra ở **commit archive**, cùng lúc sync spec chính — trước đó
      các hàng vẫn `pending`.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 5.2 Đo lại neo thư viện tự chấm (cách đo của `retire-r-rules` 5.4): `R6.15`, `R6.19` neo được → 2/25.
- [x] 5.3 `npx openspec validate --changes` xanh.

## 6. Nợ có tên (KHÔNG thuộc change này)

- [ ] 6.1 Đổi tên chế độ `demo` → chỉ-đọc trong code + thông điệp + unit systemd prod (deploy có kiểm) —
      ghi vào `named-debts` khi archive.
- [ ] 6.2 Tách điều kiện «chấm lại cùng commit» của handler `/api/runs` (`server.ts:708–717`) thành hàm
      thuần như đã làm cho merge/reject, để scenario R6.10 khoá được cả nửa route — hiện chỉ khoá nửa dữ
      liệu (`findByPr`, `test/kho-run.test.ts`). Ghi vào `named-debts` khi archive.
