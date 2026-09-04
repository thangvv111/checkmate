# Tasks — data-table-screens-ccs

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -o "MOI_TRANG = [0-9]*" apps/web/src/ui-history.ts      # 25 -> goi chot 8
grep -o "<th>[^<]*</th>" apps/web/src/ui-history.ts | wc -l  # 9
grep -o "<th>[^<]*</th>" apps/web/src/ui-ledger.ts  | wc -l  # 8
grep -o "<th>[^<]*</th>" apps/web/src/ui-trust.ts   | wc -l  # 12 (8 bang chinh + 4 bang ho so)
grep -o "chon('[a-z]*'" apps/web/src/ui-history.ts  | wc -l  # 3  (+ q) -> goi khai 6
grep -n "return kq.sort" apps/web/src/trust.ts               # sap theo soVerdict
```

- [x] 0.1 `MOI_TRANG` = **8** · bộ lọc Lịch sử đủ **6** (repo · verdict · skill · nhà cung cấp · ngày ·
      tìm chữ) · Tin cậy sắp theo tỉ lệ PASS, đo trên trang thật: 67% · 67% · 60% · 60%.
- [x] 0.2 Ba bảng cùng gọi `artifactCell`; `<th>Repo</th>` và `<th>Commit</th>` về **0** ở cả ba file.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/data-table-screens/spec.md` — 3 requirement, 9 scenario (đã viết).

## 2. Khuôn dùng chung

- [x] 2.1 `ui.ts`: hàm thuần `artifactCell({ ten, repo, pr, sha })` — tên đậm + dòng phụ mono.
- [x] 2.2 ⛔C5 — khai vào bảng module của `checkmate.yml`.

## 3. Tin cậy

- [x] 3.1 `trust.ts`: `AuthorProfile.tiLePass` (mẫu số = số verdict — D2; 0 verdict ⇒ 0).
- [x] 3.2 `trust.ts`: sắp theo `tiLePass` giảm dần, khoá phụ `soVerdict` rồi `tacGia` (D3).
- [x] 3.3 `ui-trust.ts`: cột theo gói — tác giả · verdict · PR · **tỉ lệ PASS** · PASS/FAIL ·
      PASS vòng đầu · streak PASS · **high bị bắt** (đỏ).

## 4. Lịch sử

- [x] 4.1 `MOI_TRANG` 25 → **8**.
- [x] 4.2 Bộ lọc **ngày** (từ/đến, so trên chuỗi ISO 10 ký tự — D5); `server.ts` nhận tham số.
- [x] 4.3 Cột artifact dùng `artifactCell`; bỏ cột `Repo` riêng.

## 5. Sổ cái

- [x] 5.1 Dòng tổng nền surface ở **ĐẦU** trang: n verdict · n PASS · n FAIL · tổng H·M·L · token.
- [x] 5.2 Dòng tổng tính trên phần **ĐÃ LỌC**.
- [x] 5.3 Bộ lọc repo thêm lựa chọn **«tài liệu rời»**.
- [x] 5.4 Cột artifact dùng `artifactCell`; bỏ cột `Repo` và `Commit` riêng.

## 6. Lưới

- [x] 6.1 `artifactCell`: có PR · tài liệu rời · thiếu repo · thiếu SHA.
- [x] 6.2 Sắp xếp Tin cậy: ca đúng scenario của spec (20 verdict 50% đứng SAU 4 verdict 100%).
- [x] 6.3 Tỉ lệ PASS là cột nhìn thấy được, và 0 verdict không ra `NaN`.
- [x] 6.4 Dòng tổng: lọc theo repo → mọi số đổi theo; lọc ra rỗng → các số 0.
- [x] 6.5 Dòng tổng đứng TRƯỚC bảng trong HTML.
- [x] 6.6 Lọc ngày: trong khoảng · ngoài khoảng · chỉ có «từ» · chỉ có «đến» · khoảng đảo ngược.
- [x] 6.7 Phân trang 8.

## 7. Mutation — mỗi chiều HAI lần, CHẠY NỀN, so với bản chụp

- [x] 7.1 Trả trục sắp xếp Tin cậy về `soVerdict` → ca ĐỎ.
- [x] 7.2 Bỏ khoá phụ của phép sắp → ca ĐỎ *(thứ tự không còn xác định)*.
- [x] 7.3 `tiLePass` chia cho `soPr` thay vì `soVerdict` → ca ĐỎ.
- [x] 7.4 Dòng tổng tính trên tập CHƯA lọc → ca ĐỎ.
- [x] 7.5 Chuyển dòng tổng xuống sau bảng → ca ĐỎ.
- [x] 7.6 `MOI_TRANG` về 25 → ca ĐỎ.
- [x] 7.7 Bỏ vế «đến» của bộ lọc ngày → ca ĐỎ.
- [x] 7.8 `artifactCell` bỏ dòng phụ → ca ĐỎ.
- [x] 7.9 **7.4 ĐÃ SỐNG SÓT ở lượt đầu** (dòng tổng tính trên tập chưa lọc mà ca vẫn xanh). Đọc theo
      bảng ba đường: đột biến có vào đĩa, và nó gỡ đúng gác — nhưng **thứ nó định phá không quan sát
      được với fixture đang có**: dữ liệu mẫu để `o/b` có `high: 0`, nên tổng H của tập đã lọc và của
      toàn bộ BẰNG NHAU. Ca xanh vì hai thế giới cho cùng một con số, không phải vì gác còn nguyên.
      Sửa fixture (`o/b` có 5H·3M·2L) rồi thêm vế «không được rơi về tổng toàn bộ». Chạy lại 8 chiều
      → **8/8 GIẾT cả hai lượt**.

## 8. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 8.1 Dựng thật ba màn (22 hàng sổ cái, 14 lượt chấm, 4 tác giả) và nhìn ở 1400px. Sổ cái: dòng
      tổng nền surface ở đầu — `22 verdict · 14 PASS · 8 FAIL · 20H · 11M · 21L · 471.9k / 112.2k token`;
      cột artifact có tên đậm + dòng phụ mono `repo#PR @ SHA`, không còn cột Repo/Commit riêng.
- [x] 8.2 **Có.** Thứ tự đọc được thành 67% · 67% · 60% · 60% ngay ở cột «TỈ LỆ PASS», nên người đọc
      kiểm được thứ tự thay vì phải tin nó. Hai cặp cùng tỉ lệ xếp theo khoá phụ, ổn định giữa các lần
      tải. Cột «HIGH BỊ BẮT» tô đỏ đúng gói.

## 9. Kiểm cơ học

- [x] 9.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 9.2 `npx openspec validate --changes` xanh.
- [x] 9.3 Tầng 3: hàm quét `scan*` mới (nếu có) phải có cặp fixture.
