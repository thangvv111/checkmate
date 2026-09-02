# Tasks — rerun-guard-testable (nợ có tên #9)

Luật đã khai: `merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở` › scenario
«chấm lại đúng commit đã có verdict». Hiện thực ĐÚNG, nhưng **không khoá được** — điều kiện nằm trong
handler `/api/runs`, không có bề mặt nào gọi tới. Change này kéo hiện thực về chỗ test gọi được; KHÔNG đổi
hành vi, KHÔNG đổi luật.

## 1. Fix

- [x] 1.1 Root cause: điều kiện «đã chấm cùng commit» (`server.ts:710–724`) trộn quyết định với dựng HTML
      và với `req.body`, nên scenario của luật chỉ khoá được nửa dữ liệu (`findByPr`, `test/kho-run.test.ts`)
      — nửa quyết định (`ep !== '1'` → 409, `ep === '1'` → chạy) không có ca nào.
- [x] 1.2 Fix: `apps/web/src/gate.ts` thêm hàm thuần `decideRerun({ daCham, ep })` →
      `{ chay: true } | { chay: false; runDaCo: string; verdict?: string }`; hai nhánh trong `server.ts`
      (JSON và HTML) gọi nó; lời văn và HTML giữ NGUYÊN từng chữ.

## 2. Lân cận

- [x] 2.1 Cửa song sinh — SOI 03/09: `isPrRunning` (`server.ts:706`) đứng ngay trước cùng khối và mang
      CÙNG LỖI: nửa dữ liệu có test (`test/kho-run.test.ts:123,140,145`), nửa route (409 «đang được chấm»)
      không gọi được. KHÁC ở chỗ nó không có nhánh xác nhận nào — chỉ một điều kiện boolean, tách ra được
      ít giá trị hơn hẳn. KHÔNG mở rộng phạm vi (đúng lời task); ghi vào `named-debts` nếu PO muốn.
- [x] 2.2 `checkmate.yml` bảng module: thêm `decideRerun` vào dòng `gate.js` (⛔C5).
