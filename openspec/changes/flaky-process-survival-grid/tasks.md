# Tasks — flaky-process-survival-grid

## 1. Fix

- [x] 1.1 **Root cause.** Ca D6 của `stalled-run-recovery` («giết tiến trình cha thì tiến trình cháu VẪN
      ghi tiếp vào sổ») chờ bằng **vòng lặp quay CPU đồng bộ** 1500 ms rồi mới đo. Vòng ấy chiếm trọn một
      lõi trong suốt thời gian chờ — tức nó **cướp CPU của chính hai tiến trình nó đang đợi**. Chạy riêng
      thì máy rảnh nên kịp; chạy `npm test` toàn bộ (nhiều worker vitest cùng lúc) thì `node` cha +
      `cmd.exe` (do `shell:true`) + `node` cháu khởi động không kịp trong 1500 ms, file sổ chưa tồn tại,
      và ca đỏ ở `expect(truoc).toBeGreaterThan(0)`.
      **Đo được (05/09):** chạy riêng 2/2 lượt XANH · chạy toàn bộ 2/3 lượt ĐỎ.
- [x] 1.2 **Fix.** `test/stalled-run-recovery.test.ts`: thay hai lần chờ theo ĐỒNG HỒ bằng chờ theo ĐIỀU
      KIỆN có hạn (`choDen`), và ngủ bằng `Atomics.wait` thay vì quay CPU. Ý nghĩa của ca giữ nguyên — nó
      vẫn đỏ nếu tiến trình cháu thật sự không ghi tiếp — nhưng không còn phụ thuộc vào tải máy.
- [x] 1.3 **Lỗi thứ hai lộ ra khi đọc.** `readFileSync(...).trim().split('\n').length` trả **1** cho file
      RỖNG (`''.split('\n')` là `['']`). Nghĩa là `expect(truoc).toBeGreaterThan(0)` sẽ **xanh trên một
      file rỗng** — ca xanh trên hệ thống đã hỏng, đúng lỗi lưới loại 1. Thêm `.filter(Boolean)`.
- [x] 1.4 Nâng hạn của ca lên cho vừa hai lần chờ có hạn.

## 2. Lân cận

- [x] 2.1 **Cửa song sinh — đã đếm bằng máy:** `grep -rn "while (Date.now()" test/ | wc -l` → **2**, và
      cả hai đều nằm trong `stalled-run-recovery.test.ts` (chính hai lần chờ của ca D6). Không file lưới
      nào khác dùng khuôn «chờ đủ lâu rồi tin là xong». Sau fix còn **1** — chỗ duy nhất là vòng của
      `choDen`, và nó chờ theo ĐIỀU KIỆN chứ không theo đồng hồ.
- [x] 2.2 N/A — không thêm/đổi export nào, `checkmate.yml` không đụng.

## 3. Kiểm

- [x] 3.1 `npm test` toàn bộ **5/5 lượt XANH** (997 ca mỗi lượt). Trước fix đo được **2/3 lượt ĐỎ**.
      Ca D6 chạy riêng cũng nhanh hơn: 7.3s → 4.8s, vì không còn quay CPU.
- [x] 3.2 Mutation, mỗi chiều 2 lượt:
      · **cháu KHÔNG ghi gì → GIẾT cả hai lượt.** Đây là chiều load-bearing: ca vẫn phát hiện được khi
        tiến trình cháu ngừng ghi, tức nới cách chờ KHÔNG làm mất phép kiểm.
      · **giết CẢ CÂY (`taskkill /T`) thay vì giết đúng tiến trình cha → SỐNG SÓT.** Đọc theo bảng ba
        đường: đột biến có vào đĩa và gỡ đúng chỗ định gỡ, nhưng **thứ nó định phá không phá được** —
        trên Windows tiến trình cháu sống sót kể cả tree-kill, vì nó được sinh qua `cmd.exe` nên cha
        đã ghi trong bảng tiến trình không còn trỏ tới nó. Nói cách khác, tính chất mà ca D6 đo còn
        MẠNH HƠN lời ca ấy phát biểu. Không dựng thêm chiều thứ ba: chiều duy nhất còn lại là sửa
        chính kịch bản cháu cho nó tự chết theo cha, mà như thế là đo một thế giới khác chứ không
        phải đo cái gác này.
      · Ghi rõ chiều đã BỎ: đột biến đầu tiên em thử là bỏ `shell:true` — nó cũng sống sót, và lý do
        là **gỡ nhầm chỗ** (đổi cách sinh tiến trình, không đổi chuyện cháu có sống sót hay không).
