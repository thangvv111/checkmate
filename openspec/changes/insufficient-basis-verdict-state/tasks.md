# Tasks — insufficient-basis-verdict-state

## 0. Tầng 2 của `test-grid-integrity` — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -c "không đủ cơ sở/i" apps/web/src/ui.ts             # 1  duong render dang so chuoi
grep -rn "trangThai === 'loi'" apps/web/src/*.ts | wc -l   # 3  (ui-history 2 · ui 1)
grep -c "res.json" apps/web/src/server.ts                  # 23 be mat JSON
```

- [x] 0.1 Sau change: **0** chỗ so chuỗi ở đường render (`grep -c "không đủ cơ sở/i" apps/web/src/ui.ts` → 0);
      đúng **1** chỗ còn lại là `inferLegacyInsufficientBasis` trong `store/migrate.ts`, có cặp fixture khoá.
- [x] 0.2 Ba bề mặt đọc kết cục mới đều có ca: màn chấm · lịch sử (nhãn + lọc) · API JSON.
- [x] 0.3 Cột bảng `run`: 12 → 13 (`khong_du_co_so TEXT`).

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/verdict-contract/spec.md` — 2 requirement, 8 scenario (đã viết).
- [x] 1.2 Luật máy-cưỡng-chế sống ở: kiểu `InsufficientBasisKind` trong `packages/shared` · hàm thuần
      `classifyInsufficientBasis` có test khoá · dòng cột ở `napCotThieu`. KHÔNG viết vào `docs/archive/`.

## 2. Kiểu & hợp đồng

- [x] 2.1 `packages/shared/src/types.ts`: `InsufficientBasisKind = 'khong_probe_nao_toi_noi' | 'goc_khong_doi_chung'`
      và `InsufficientBasis = { loai; so_probe; ly_do }`.
- [x] 2.2 Nhánh mới của `RunEvent`: `{ type: 'khong_du_co_so'; ... }`.
- [x] 2.3 ⛔C5 — khai export mới vào bảng module của `checkmate.yml`.

## 3. Engine (packages/harness)

- [x] 3.1 `verdict.ts`: hàm thuần `classifyInsufficientBasis(baseKq, ungVien)` trả loại.
- [x] 3.2 `retryNoticeNoEvidence` gọi CHÍNH hàm ấy thay vì viết lại biểu thức — D3, chống cửa song sinh.
- [x] 3.3 `skill-code.ts`: phát sự kiện có kiểu NGAY TRƯỚC `throw`; đường ném giữ nguyên (⛔C2).

## 4. Web (apps/web)

- [x] 4.1 `runs.ts`: `RunMeta.khongDuCoSo`; nhặt sự kiện khi tiến trình đóng.
- [x] 4.2 `store/db.ts`: dòng `['run', 'khong_du_co_so', 'TEXT']` ở `napCotThieu`; đọc/ghi JSON.
- [x] 4.3 `store/db.ts` (hoặc module di trú cạnh nó): hàm di trú cho hàng cũ — ghi trường mới TRƯỚC,
      không xoá gì; idempotent.
- [x] 4.4 `server.ts`: gọi hàm di trú lúc khởi động, cạnh `migrateRepoToken`.
- [x] 4.5 `ui.ts`: `khongCoSo` đọc `meta.khongDuCoSo`; **xoá** phép so chuỗi ở đường render.
- [x] 4.6 `ui.ts`: hai thông điệp riêng theo loại, đúng lời văn gói design.
- [x] 4.7 `ui-history.ts`: nhãn «Không đủ cơ sở» khác nhãn lỗi + option lọc riêng.

## 5. Test

- [x] 5.1 `classifyInsufficientBasis`: hai loại + biên (`baseKq` undefined · mảng rỗng · có phần tử).
- [x] 5.2 Sự kiện có kiểu được phát trước khi ném.
- [x] 5.3 Ghi rồi đọc lại qua SQLite: trường sống sót vòng ghi–đọc.
- [x] 5.4 Di trú: hàng đời cũ lên đời đúng loại; chạy lại không đổi gì; lỗi hạ tầng KHÔNG bị gán nhầm.
- [x] 5.5 Lọc lịch sử: hai lượt cùng danh sách, mỗi bộ lọc ra đúng một cái.
- [x] 5.6 Sổ cái không có hàng cho lượt không đủ cơ sở, cổng giữ nguyên (D5 — khoá hành vi đang có).
- [x] 5.7 Trường mới ĐI THEO ra API JSON — kẻo một lần lọc trường bịt mất nó.
- [x] 5.8 Đổi lời văn thông điệp lỗi KHÔNG làm card biến mất (ca chứng minh bệnh cũ đã chữa).

## 6. Mutation — mỗi chiều chạy HAI lần, CHẠY NỀN, so với bản chụp trước khi commit

- [x] 6.1 Bỏ phát sự kiện có kiểu → ca ĐỎ.
- [x] 6.2 `classifyInsufficientBasis` luôn trả một loại → ca ĐỎ.
- [x] 6.3 `retryNoticeNoEvidence` viết lại biểu thức riêng thay vì gọi hàm chung → ca ĐỎ *(cửa song sinh)*.
- [x] 6.4 Bỏ dòng cột ở `napCotThieu` → ca ĐỎ.
- [x] 6.5 Di trú ghi đè cả hàng đã có trường → ca ĐỎ *(mất tính idempotent)*.
- [x] 6.6 Di trú khớp luôn cả lỗi hạ tầng → ca ĐỎ.
- [x] 6.7 Bộ lọc «không đủ cơ sở» rơi về lọc theo `trangThai === 'loi'` → ca ĐỎ.
- [x] 6.8 Đưa phép so chuỗi trở lại đường render → ca ĐỎ.
- [x] 6.9 **6.4 ĐÃ SỐNG SÓT ở lượt đầu** (bỏ dòng cột `napCotThieu` mà ca vẫn xanh). Đọc theo bảng ba
      đường: đột biến CÓ vào đĩa, và nó gỡ ĐÚNG gác — nên là đường thứ nhất, **ca không load-bearing**.
      Nguyên nhân đo được: lưới đặt `CHECKMATE_DB` bên trong `describe`, mà `DB_PATH` là hằng CẤP MODULE
      của `store/db.js` và import TĨNH của ESM đã nạp nó từ trước — nên khối di trú chạy thẳng trên **SỔ
      THẬT** của máy dev. Cột cần kiểm đã có sẵn ở đó, nên gỡ dòng khai cột chẳng làm gì đỏ. Hệ quả thứ
      hai: lưới ghi **năm hàng giả** vào `web-runs/checkmate.db` — đã dọn, sổ về đúng 38 lượt như trước.
      Sửa: nạp ĐỘNG mọi module chạm tầng kho sau khi đặt gốc riêng, **cộng một ca GÁC** khẳng định
      `DB_PATH` nằm trong thư mục tạm. Chạy lại 8 chiều → **8/8 GIẾT cả hai lượt**.

## 7. Kiểm cơ học

- [x] 7.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 7.2 `npx openspec validate --changes` xanh.
- [x] 7.3 Tầng 3: hàm quét `scan*` nào thêm vào lưới thì phải có cặp fixture.
