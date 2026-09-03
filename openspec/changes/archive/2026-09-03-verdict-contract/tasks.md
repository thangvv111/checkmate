# Tasks — verdict-contract

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/verdict-contract/spec.md` (4 requirement) — đã viết. Test khoá:
      `test/verdict-contract.test.ts`.

## 2. Engine (packages/harness)

- [x] 2.1 `verdict.ts` (mới): `decideResult` · `regressionFloor` · `missingRegressionFindings` · `hasBasis`
      — chép NGUYÊN logic và lời văn đang chạy (D1, D2).
- [x] 2.2 `cli.ts:180` gọi `decideResult`; `skill-code.ts:818, :836` gọi `regressionFloor` /
      `missingRegressionFindings`; `skill-code.ts:742` gọi `hasBasis`. Diff phải là «thay biểu thức bằng
      lời gọi» — không đổi thông điệp, không đổi log, không đổi số lần sinh lại.
- [x] 2.3 `checkmate.yml` bảng module: thêm dòng `../packages/harness/src/verdict.js` với bốn export (⛔C5).

## 3. Test

- [x] 3.1 `test/verdict-contract.test.ts`: mỗi scenario của 4 requirement một ca; hai lưới máy có ca riêng
      (dựng ứng viên giả — D4); ca đối chứng `nghi_van` giữ mức model; ca severity đời cũ `blocking` → high.
- [x] 3.2 Mutation: bỏ sàn cứng · bỏ bù-thiếu · bỏ điều kiện `hasBasis` · đổi `some`→`every` ở
      `decideResult` — mỗi cái phải làm lưới ĐỎ; ghi kết quả vào thân PR.

## 4. Kiểm cơ học

- [x] 4.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 4.2 `git diff` chỗ gọi — KIỂM 03/09: bốn chuỗi thông điệp («Không đủ cơ sở kết luận», «máy ép về
      high», «máy tự bổ sung finding mức high», «Lưới PASS-phải-có-bằng-chứng») vẫn ở ĐÚNG một chỗ trong
      `skill-code.ts`, 0 chỗ trong `cli.ts`/`verdict.ts`. Hai dòng thêm có chứa chuỗi là hai dòng bị SỬA
      BIẾN, lời không đổi một chữ: `${ungVienTatCa.length}`→`${coCoSo.soProbe}` (cùng giá trị) và
      `${sev}`→`${sevModel}` (cùng giá trị — mức model đã chuẩn hoá trước khi ép).
- [x] 4.3 `npx openspec validate --changes` xanh.
- [ ] 4.4 Đo lại neo thư viện tự chấm sau archive (kỳ vọng tăng: mã R6.x/R1.x của requirement mới).

## 5. Bảng tra (ở commit archive)

- [x] 5.1 `docs/r-rules-map.md`: R6.1–R6.5 · R6.13 · R6.14 · R1.12 · R1.13 `pending` → `housed` với địa chỉ
      `verdict-contract › <tiêu đề>`; hàng `precedent` R6.13 trỏ đoạn «Vì sao» của requirement tương ứng.
