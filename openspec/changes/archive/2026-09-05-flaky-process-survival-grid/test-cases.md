# Test cases — flaky-process-survival-grid

Change này sửa **chính một ca test**, nên «ca test» ở đây là hai thứ: ca được sửa phải còn nghĩa, và
phép sửa phải chứng minh được là đã hết flaky.

## 1. Ca được sửa vẫn còn nghĩa

- [x] T1.1 Ca D6 XANH khi chạy riêng.
- [x] T1.2 **Mutation — cháu không ghi gì:** đổi kịch bản cháu thành không ghi dòng nào → ca phải ĐỎ.
      Không có chiều này thì «nới cách chờ» không phân biệt được với «bỏ luôn phép kiểm».
- [N/A] T1.3 **KHÔNG DỰNG ĐƯỢC trên nền này, và đó là một số đo chứ không phải một chỗ bỏ qua.** Hai
      đột biến đã thử đều SỐNG SÓT: bỏ `shell:true` (gỡ nhầm chỗ — đổi cách sinh, không đổi việc cháu
      sống sót) và `taskkill /T` giết cả cây (không phá được, vì cháu sinh qua `cmd.exe` nên cha ghi
      trong bảng tiến trình không còn trỏ tới nó). Tính chất ca D6 đo thực tế **mạnh hơn** lời nó phát
      biểu. Chiều còn lại — sửa kịch bản cháu cho nó tự chết theo cha — là đo một thế giới khác.
- [x] T1.4 File RỖNG không được đọc thành «đã có 1 dòng» — vế mà bản cũ đọc sai.

## 2. Hết flaky

- [x] T2.1 `npm test` toàn bộ, **năm lượt liên tiếp**, xanh cả năm.
- [x] T2.2 Trước khi sửa: đo lại mức đỏ để có con số đối chiếu (đã đo — 2/3 lượt ĐỎ).

## Trục nhạy cảm

- [N/A] T_bimat — change chỉ đụng một file test; không giá trị nào là bí mật, không bề mặt nào mới.
- [N/A] T_failclosed — không chạm đường verdict.
- [N/A] T_cong — không chạm cổng.
- [N/A] T_khongtincay — không đưa dữ liệu ngoài vào prompt.
- [N/A] T_hopdong — không thêm/đổi export.

## Kiểm tay

- [x] T3.1 Đã chạy `npm test` toàn bộ **năm lượt liên tiếp** — đúng điều kiện tải đã làm ca đỏ trước
      đây (nhiều worker vitest song song). 5/5 xanh, 997 ca mỗi lượt.
