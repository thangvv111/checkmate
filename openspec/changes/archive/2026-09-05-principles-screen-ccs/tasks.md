# Tasks — principles-screen-ccs

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -c "0[1-9] "                        apps/web/src/ui-docs.ts   # 2  (khong phai nguyen tac danh so)
grep -c "background:var(--color-accent)" apps/web/src/ui-docs.ts   # 0  poster
grep -c "thay o"                         apps/web/src/ui-docs.ts   # 0  dong «thay o:»
grep -o "app.get('/[a-z-]*'" apps/web/src/server.ts                # 9 route GET that
```

- [x] 0.1 **9** nguyên tắc · **1** poster · **9** đường «thấy ở:», tất cả trỏ route thật. Đo trên trang
      đang chạy: `.nt-item` = 9 · poster `rgb(236,48,19)` = accent đặc, chữ 38px · khối rộng 900px.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/principles-screen/spec.md` — 2 requirement, 6 scenario (đã viết).

## 2. Dữ liệu

- [x] 2.1 `apps/web/src/principles.ts`: mảng chín nguyên tắc `{ so, tieuDe, than, thayO: { nhan, duong } }`.
- [x] 2.2 Nội dung chín điều đúng gói design §8.
- [x] 2.3 ⛔C5 — khai export mới vào `checkmate.yml`.

## 3. Giao diện

- [x] 3.1 Poster accent nền đặc, nguyên văn «Checker không tin ai. Chỉ tin bằng chứng.»
- [x] 3.2 Chín mục: số 30px neutral-400 · tiêu đề Archivo 800 19px · thân 14px · dòng mono «thấy ở:».
- [x] 3.3 Khối nguyên tắc tối đa 900px.
- [x] 3.4 Nav thêm mục trỏ về khối nguyên tắc; bài giải thích mười mục giữ nguyên, xuống dưới.

## 4. Lưới

- [x] 4.1 Đúng chín điều, số 01–09 liên tục, không trùng.
- [x] 4.2 Mọi đường «thấy ở:» trỏ route CÓ THẬT — đọc route từ `server.ts`, không khai tay danh sách.
- [x] 4.3 Cặp fixture (tầng 3): đường chết ĐỎ · chín đường hiện tại XANH.
- [x] 4.4 Poster: nguyên văn câu đã chốt, nền accent ĐẶC (không tint, không semantic).
- [x] 4.5 Nguyên tắc là dữ liệu — đếm từ mảng, không dò chuỗi trong HTML.

## 5. Mutation — mỗi chiều HAI lần, CHẠY NỀN, so với bản chụp

- [x] 5.1 Đổi một đường «thấy ở:» thành route không tồn tại → ca ĐỎ.
- [x] 5.2 Bỏ một nguyên tắc (còn 8) → ca ĐỎ.
- [x] 5.3 Đổi số cho đứt quãng (01,02,04…) → ca ĐỎ.
- [x] 5.4 Sửa một chữ trong câu poster → ca ĐỎ.
- [x] 5.5 Poster đổi sang accent TINT thay vì nền đặc → ca ĐỎ.
- [x] 5.6 Lưới đọc danh sách route khai tay thay vì đọc `server.ts` → ca ĐỎ *(chống bản sao thứ hai)*.
- [x] 5.7 **Không đột biến nào sống sót** — 6/6 GIẾT cả hai lượt, file khôi phục nguyên vẹn.
      Đáng ghi nhất là 5.6: lưới đọc danh sách route KHAI TAY thay vì đọc `server.ts` cũng ĐỎ. Nếu
      chiều ấy sống sót thì lưới đang canh một danh sách chứ không canh sản phẩm.

## 6. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 6.1 Dựng thật ở 1400px: poster accent đặc với đúng nguyên văn câu đã chốt, chín mục số
      neutral-400 30px + tiêu đề Archivo 800 + thân + dòng mono «thấy ở:» màu accent.
- [x] 6.2 Đọc thẳng chín `href` trên trang đang chạy — cả chín trỏ route thật:
      `/lich-su` ×3 · `/lich-su?verdict=khong_du_co_so` · `/ledger` ×3 · `/tin-cay` · `/settings`.
      Đường của nguyên tắc 03 trỏ đúng bộ lọc mà change `insufficient-basis-verdict-state` vừa dựng —
      liên kết ấy là bằng chứng thật, không phải một cú trỏ chung chung.

## 7. Kiểm cơ học

- [x] 7.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 7.2 `npx openspec validate --changes` xanh.
- [x] 7.3 Tầng 3: hàm quét `scan*` có cặp fixture; `test-grid-integrity` xanh.
