# Tasks — probe-classification

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/probe-classification/spec.md` (4 requirement) — đã viết. Test khoá:
      `test/phan-loai.test.ts` (31 ca sẵn có + 2 ca mới cho R1.15).
- [ ] 1.2 Đối chiếu từng requirement với ca test đang xanh — nếu spec nói điều gì mà không ca nào khoá, sửa
      SPEC cho khớp code hoặc thêm ca; KHÔNG chép từ văn bản R (D1).

## 2. Engine (packages/harness)

- [ ] 2.1 `skill-code.ts`: thêm `export` cho `promptSinhCode`. KHÔNG đổi thân hàm, KHÔNG đổi một chữ nào
      trong prompt (D3).
- [ ] 2.2 `checkmate.yml` bảng module: thêm `promptSinhCode` vào dòng `skill-code.js` (⛔C5).

## 3. Test

- [ ] 3.1 `test/phan-loai.test.ts`: hai ca cho R1.15 — (a) nhánh gốc không chạy được probe nào → prompt sinh
      lại CÓ lời cảnh báo, nói cả ba ý (không đối chứng · probe đỏ thành nghi vấn · probe sai giả định);
      (b) nhánh gốc CÓ kết quả → prompt KHÔNG có lời đó (nói thừa cũng là nói sai).
- [ ] 3.2 Mutation: bỏ nhánh `baseKq === undefined || baseKq.length === 0` trong `promptSinhCode` → ca (a)
      phải ĐỎ; ép luôn thêm lời cảnh báo → ca (b) phải ĐỎ. Ghi kết quả vào PR.

## 4. Kiểm cơ học

- [ ] 4.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 4.2 `git diff packages/harness/src/skill-code.ts` chỉ có một dòng đổi (thêm `export`).
- [ ] 4.3 `npx openspec validate --changes` xanh.
- [ ] 4.4 Đo neo thư viện sau archive — **dự đoán TRƯỚC: tăng từ 3 lên 12** (9 vế R1.2 · R1.4–R1.7 · R1.17 ·
      R1.18 · R1.20 trỏ đúng nhóm này). Đo để xác nhận; sai thì ghi rõ sai ở đâu (bài học `verdict-contract` §4.4).

## 5. Bảng tra (ở commit archive)

- [ ] 5.1 `docs/r-rules-map.md`: R1 · R1.1–R1.11 · R1.14 · R1.15 · R1.17 · R1.18 · R1.20 → `housed` với địa
      chỉ `probe-classification › <tiêu đề>`; **R1.16 → `housed` `verdict-contract › PASS phải có bằng
      chứng…`** (D2); hàng `precedent` R1.2 và R1.17 trỏ đoạn «Vì sao» của requirement tương ứng.
