## Chạy thật — ĐÃ CHẠY, đây là gốc của change

- [x] T1.1 ✅ `npm test` **trần, không cờ nào**, **ba lượt liên tiếp** sau khi ghim: **77 file · 1389 ca ·
      xanh** cả ba. Trước khi ghim, cùng lệnh ấy cho ra sáu file khác nhau đỏ trong một buổi.
- [x] T1.2 ✅ `npx tsc --noEmit` sạch.
- [x] T1.3 ✅ **Ba mốc đo, cùng cây mã** (bảng ở `tasks.md`): mặc định ⇒ 6 file đỏ · 8 worker ⇒ 1 file đỏ ·
      4 worker ⇒ xanh, lặp lại 5+ lần.
- [x] T1.4 ✅ **Ngưỡng nằm giữa 4 và 8** — không phải suy, là đo: 8 đã đỏ, 4 thì không.

## Ca đối kháng

- [N/A] Mutation **không áp dụng**: change này không thêm gác nào, nó gỡ một nguồn nhiễu. «Đột biến» duy
  nhất có nghĩa là **bỏ dòng `maxWorkers`**, và hậu quả của nó là *lúc đỏ lúc xanh* — tức nó **không cho ra
  một số ca đỏ ổn định để so hai vòng**. Ghi rõ N/A kèm lý do thay vì tick khống: đây đúng là loại thay đổi
  mà mutation không nói được gì, và giả vờ nó nói được là tệ hơn im lặng.
- [x] T2.1 **Vế đối chứng thay cho mutation**: chạy `--maxWorkers=8` ⇒ **1 file đỏ**; `--maxWorkers=4` ⇒
      xanh. Cùng cây mã, cách nhau vài phút. Đó là bằng chứng con số này **load-bearing**.

## Trục nhạy cảm

- [N/A] T_bimat · T_cong · T_khongtincay · T_colap · T_hopdong — change chỉ chạm cấu hình bộ chạy test của
  **repo này**, không chạm sản phẩm. `vitest.config.ts` **không nằm trong gói deploy**
  (`scripts/pack-deploy.sh`), nên prod không đổi một dòng nào.
- [x] T_failclosed ⛔C2 — change làm cổng **chặt hơn**: trước đây một lượt đỏ ngẫu nhiên có thể bị bỏ qua
  bằng cách chạy lại; nay đỏ nghĩa là đỏ.
