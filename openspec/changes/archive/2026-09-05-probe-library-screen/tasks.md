# Tasks — probe-library-screen

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -rn "readProbeLibrary(" --include=*.ts apps packages | grep -v test   # 2 (dinh nghia + 1 nguoi goi)
grep -c "rmSync(join(GOC_LIB" packages/harness/src/probe-library.ts        # 1  duong xoa file probe
grep -n "meta.probes.splice"  packages/harness/src/probe-library.ts        # 1  dao thai vi tran
grep -n "TRAN_LICH_SU = "     packages/harness/src/probe-library.ts        # 20 o dai hanh vi
```

- [x] 0.1 Sau change: **2/2** đường gỡ probe đã có ghi sổ. Mutation M1/M2 gỡ từng lời gọi một và ca đỏ ở cả hai — đó là phép đếm, không phải lời hứa.
- [x] 0.2 Đếm lại sau khi viết màn: **11 trường chuỗi** thật sự nội suy vào HTML (`TRUONG_NGOAI` trong lưới) — `plan.id`, `plan.ten`, `plan.ky_vong`, `plan.trigger` không lên màn nên không có gì để thoát. Code probe **không** đi qua `escHtml`: nó đặt bằng `textContent`, một rào MẠNH HƠN — trình duyệt không bao giờ phân tích nó thành phần tử. `scanNoInnerHtml` khoá điều đó.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/probe-library-screen/spec.md` — 4 requirement (đã viết).
- [x] 1.2 Delta MODIFIED `specs/probe-library/spec.md` — hai requirement thêm vế ghi sổ (đã viết).
- [x] 1.3 Chỗ sống của luật: hành vi ghi sổ nằm ở `probe-library.ts` + ca khoá; **không** viết luật vào
      `docs/archive/r-rules/`. Change này không backfill điều `pending` nào.

## 2. Kiểu & hợp đồng

- [x] 2.1 Kiểu bản ghi gỡ + kiểu chỉ mục thư viện (`packages/harness/src/probe-library.ts`; dùng chung
      với web qua `import type`, không đưa xuống `shared` vì chỉ hai tầng này đọc).
- [x] 2.2 ⛔C5 — khai export mới vào bảng module của `checkmate.yml`: `readLibraryIndex` ·
      `readProbeCode` · `readRemovalLog` · `recordRemoval`.

## 3. Engine (packages/harness)

- [x] 3.1 `recordRemoval` — ghi MỘT dòng vào `probes-lib/<slug>/removals.jsonl`, gọi **trong khoá**.
- [x] 3.2 Gọi ở đường **đào thải vì trần** (`admitToLibrary`, ngay cạnh `splice`/`rmSync`) — mang `loai:
      'dao_thai'` và nấc đã chọn nạn nhân.
- [x] 3.3 Gọi ở đường **gỡ vì trùng lặp** (`findAndDropBehaviorDuplicates`) — mang `loai: 'trung_lap'`,
      probe được giữ, và bằng chứng.
- [x] 3.4 `readRemovalLog` — đọc sổ, **bỏ dòng cụt và ĐẾM số dòng đã bỏ**; sổ vắng mặt ≠ sổ có dòng hỏng.
- [x] 3.5 `readLibraryIndex` — danh sách KHÔNG kèm code (đường chấm vẫn dùng `readProbeLibrary` cũ).
- [x] 3.6 `readProbeCode` — tra tên trong `meta.probes` TRƯỚC; không có thì trả `null`. Không ghép tên do
      người gọi đưa vào đường dẫn.

## 4. Web (apps/web)

- [x] 4.1 `GET /api/probes` — JSON cho repo đang chọn, đi qua `coRepo`; chưa có repo → nói câu riêng.
- [x] 4.2 `GET /api/probes/code` — code MỘT probe; tên không có trong sổ → 404 kèm lý do đọc được.
- [x] 4.3 `ui-probes.ts` — thay toàn bộ tấm biển «chưa dựng» bằng màn thật.
- [x] 4.4 Đầu màn: `n/<trần đọc từ cấu hình> probe` + ghi chú di trú gập được (mặc định đóng).
- [x] 4.5 Dòng probe: tên file mono · tag luật spec (một probe neo nhiều luật thì nhiều tag) · mục đích ·
      commit sinh + ngày nạp · nút xem code.
- [x] 4.6 **Dải hành vi** — vẽ ĐÚNG `lich_su.length` ô, không đệm cho đủ 20; mới nhất bên phải; `title`
      mang `commit · ngày · trạng thái`.
- [x] 4.7 **Dòng tóm tắt bằng chữ** dưới dải: «n lần bắt được hồi quy» / «chưa bắt được hồi quy nào» /
      «fail cả hai nhánh — lỗi có sẵn». Màu không được là kênh duy nhất.
- [x] 4.8 Khối «Probe đã gỡ» — hai loại phân biệt được (đào thải vì trần · gỡ vì trùng lặp), kèm bằng
      chứng; sổ có dòng hỏng thì nói ra số dòng đã bỏ.
- [x] 4.9 Hai trạng thái rỗng KHÁC NHAU, không dùng màu FAIL: «repo chưa có probe nào» · «chưa kết nối
      repo nào» (+ lối đi tới Cấu hình).
- [x] 4.10 Panel xem code inline, nền tối theo gói; nội dung qua `escHtml`.
- [x] 4.11 CSS dải hành vi + panel ở `ui.ts`, dùng token semantic đã có (PASS/FAIL/medium), KHÔNG trộn hai
      họ token.

## 5. Test

- [x] 5.1 Lưới mới `test/probe-library-screen.test.ts` theo `test-cases.md`.
- [x] 5.2 Ca khoá **đường đào thải không đổi cách chọn nạn nhân** — bốn nấc vẫn y nguyên sau khi thêm ghi sổ.
- [x] 5.3 Ca ⛔C4: chuỗi đóng thẻ nằm trong THÂN probe, không chỉ trong tiêu đề.
- [x] 5.4 Ca đi ngược thư mục ở `readProbeCode`.

## 6. Mutation — mỗi chiều HAI lượt, CHẠY NỀN, so với bản chụp

- [x] 6.1 Bỏ lời gọi ghi sổ ở đường đào thải → ca ĐỎ.
- [x] 6.2 Bỏ lời gọi ghi sổ ở đường gỡ trùng → ca ĐỎ.
- [x] 6.3 Bỏ `escHtml` ở một trường ngoài (tên probe) → ca ĐỎ. *(Chiều này đổi so với bản đầu: code probe
      không đi qua `escHtml` mà qua `textContent`, nên chiều tương ứng cho code là M8 dưới đây.)*
- [x] 6.3b Đổi panel code sang `innerHTML` → ca ĐỎ.
- [x] 6.4 `readProbeCode` ghép thẳng tên vào đường dẫn → ca ĐỎ.
- [x] 6.5 Đệm dải hành vi cho đủ 20 ô → ca ĐỎ.
- [x] 6.6 Trần trên màn hard-code `40` → ca ĐỎ.
- [x] 6.7 Đường đọc sổ nuốt dòng cụt trong im lặng → ca ĐỎ.
- [x] 6.8 Không chiều nào sống sót. 8/8 bị bắt, mỗi chiều hai lượt nhất quán.

## 7. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 7.1 Máy chủ thật, repo có thư viện thật: mở `/probes`, đọc dải hành vi và dòng tóm tắt có hiểu không.
- [x] 7.2 Mở panel code một probe; probe dài không phá bố cục, trang không cuộn ngang.
- [x] 7.3 Chạy một lượt chấm cho tới khi có probe bị gỡ, rồi mở lại màn: bản ghi có mặt và đọc hiểu.
- [x] 7.4 `repos: []` → màn nói «chưa kết nối repo nào», không nói thư viện trống.

## 8. Kiểm cơ học

- [x] 8.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 8.2 `npx openspec validate --changes` xanh.
- [x] 8.3 Tầng 3: mọi hàm quét `scan*` mới có CẶP fixture.
