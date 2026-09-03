# Tasks — concurrent-runs (gộp nợ #10)

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/concurrent-runs/spec.md` (4 requirement) — đã viết. Test khoá:
      `test/concurrent-runs.test.ts`, `test/env-cli.test.ts`.

## 2. Web (apps/web)

- [ ] 2.1 `runs.ts`: hằng `TRAN_SONG_SONG = 2` (export) và hàm thuần
      `evaluateStartRun({ soDangChay, tran, prDangChay })` → `{ chay } | { chay: false, ma, lyDo }` (D1).
- [ ] 2.2 `server.ts`: hai gác của `/api/runs` (429 trần · 409 một-PR-một-lượt) gọi hàm; lời văn HTML và
      JSON giữ NGUYÊN từng chữ; chế độ trực (`:284-285`) cũng gọi hàm, `findByPr` giữ nguyên chỗ (D2).
- [ ] 2.3 `github.ts`: `refNames(so)` → `{ headRef, baseRef }` (thuần); `fetchAndRoute` gọi nó; không còn
      chuỗi `refs/checkmate` viết tay (D5).
- [ ] 2.4 `checkmate.yml` bảng module: thêm `TRAN_SONG_SONG` · `evaluateStartRun` (runs.js) và `refNames`
      (github.js) (⛔C5).

## 3. Test

- [ ] 3.1 `test/concurrent-runs.test.ts`: mọi scenario của requirement 1–3; ca «thứ tự hai gác» (429 trước
      409); ca chế độ trực và bấm tay cho cùng kết quả với cùng đầu vào; `refNames` mang số PR ở cả head
      lẫn base, hai PR khác nhau ra hai cặp ref khác nhau.
- [ ] 3.2 `test/env-cli.test.ts`: thêm ca cho R8.12 — biến bí mật MỚI (tên chưa từng có trong danh sách)
      không lọt vào môi trường tiến trình con, chứng minh đây là danh sách CHO PHÉP chứ không phải danh
      sách cấm; và ca đối chứng: biến nền cần cho toolchain vẫn có mặt.
- [ ] 3.3 Mutation: đảo thứ tự hai gác · bỏ gác một-PR-một-lượt · đổi `ENV_CHO_PHEP` thành danh sách cấm →
      mỗi cái phải làm lưới ĐỎ; ghi kết quả vào PR.

## 4. Kiểm cơ học

- [ ] 4.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 4.2 `git diff` chỗ gọi: không dòng thêm nào mang chuỗi thông điệp (khuôn T2.1 của `merge-gate`);
      `grep "refs/checkmate"` chỉ còn trong `refNames`.
- [ ] 4.3 `npx openspec validate --changes` xanh.
- [ ] 4.4 Đo lại neo thư viện sau archive — **không kỳ vọng tăng**: 22 vế mất neo trỏ R1/R3/R4/R9, không vế
      nào trỏ R8 (bài học ghi ở `verdict-contract` §4.4). Đo để xác nhận, không để mong.

## 5. Bảng tra (ở commit archive)

- [ ] 5.1 `docs/r-rules-map.md`: R8 · R8.1 · R8.2 · R8.3 · R8.10 · R8.11 · R8.12 `pending` → `housed` với
      địa chỉ `concurrent-runs › <tiêu đề>`; hàng `precedent` R8.12 trỏ đoạn «Vì sao» của requirement 4.

## 6. Nợ có tên (ghi vào `named-debts` khi archive)

- [ ] 6.1 Nợ #10 đánh dấu ĐÃ RỜI — gộp vào change này (PO chốt 03/09).
- [ ] 6.2 Mục mới: trần lượt đồng thời cấu hình được (hôm nay là hằng 2). R8.2 nói nâng trần là quyết định
      tài nguyên máy chủ, nên cửa khai phải kèm giới hạn và lời cảnh báo — không phải một ô nhập trơ.
