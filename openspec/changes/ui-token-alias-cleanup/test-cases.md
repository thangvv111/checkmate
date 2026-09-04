# Test cases — ui-token-alias-cleanup

Bề mặt đếm bằng máy ở `tasks.md` §0: **38 chỗ dùng** trên **5 file**, phải về **0** sau change.

## Unit / hàm thuần

### scanTokenAliases

- [x] T1.1 [Scenario «khai bí danh trộn hai họ»]: `--teal: var(--pass);` → ĐỎ, nêu cả tên biến lẫn token.
- [x] T1.2 Chiều NGƯỢC cũng ĐỎ: `--pass: var(--color-accent);` — trộn họ không có chiều nào được tha.
- [x] T1.3 [Scenario «bí danh trong CÙNG một họ»]: `--surface: var(--color-bg);` → XANH.
- [x] T1.4 Semantic nối semantic → XANH: `--fail-soft: var(--fail-tint);` **nếu** tên vế trái cũng thuộc
      họ semantic. *(Đây là chỗ tinh: `--fail-soft` thuộc họ semantic theo tên, nên nó KHÔNG phải bí danh
      trộn họ — nó bị xoá vì lý do khác, là gọn tên, chứ không phải vì lưới bắt.)*
- [x] T1.5 [Biên] Dòng không phải bí danh (`--color-bg: #f3f2f2;`) → không xét, không ĐỎ.
- [x] T1.6 [Biên] Khai ngoài khối `:root` → không xét.
- [x] T1.7 [Đầu vào khuyết] chuỗi rỗng · không có `:root` · dòng cụt → không ném, trả rỗng.

## Tích hợp (mã nguồn thật)

- [x] T2.1 [ĐỐI CHỨNG] `CSS` hiện tại của `ui.ts` → `scanTokenAliases` trả **rỗng**.
- [x] T2.2 Năm bí danh look→look còn nguyên trong `CSS` và không cái nào bị báo.
- [x] T2.3 Năm tên bí danh trộn họ **không còn tồn tại** trong bất kỳ file `ui*.ts` nào — cả khai lẫn dùng.

## Ca đối kháng & hồi quy

- [x] T3.1 **Hướng rò thứ hai** (scenario mới của spec): quét `ui*.ts`, không chỗ nào của «đang chọn» ·
      «đang dùng» · mục nav đang mở · «đã lưu» lấy màu từ `--pass`/`--pass-tint`.
- [x] T3.2 [Vế đối chứng của T3.1] Chỗ ĐÚNG LÀ kết quả phép kiểm thì VẪN dùng semantic — «✓ đã kiểm»,
      «chìa riêng», ô `kq-ok`. Không có vế này thì T3.1 xanh cả khi ai đó xoá sạch màu semantic.
- [x] T3.3 [Ca đã gãy trong lịch sử repo] Chính bệnh sinh ra change: lưới hex hiện tại XANH trên khối bí
      danh trộn họ. Ca mới: đưa khối ấy trở lại → lưới ĐỎ.
- [x] T3.4 «trực» dùng jade, không dùng amber (D2 — gói design khai `jade khi bật`).

## Trục nhạy cảm

- [N/A] T_bimat — change chỉ đổi tên biến màu; không giá trị nào là bí mật, không bề mặt mới.
- [N/A] T_failclosed — không chạm đường verdict, không chạm nhánh lỗi nào.
- [N/A] T_cong — không chạm cổng merge; màu không mở được nút nào.
- [N/A] T_khongtincay — không đưa dữ liệu ngoài vào prompt.
- [N/A] T_hopdong — không thêm/đổi export của sản phẩm; hàm quét mới nằm trong `test/`.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [x] T4.1 Dựng lại `--teal: var(--pass)` → T2.1 ĐỎ.
- [x] T4.2 Bí danh chiều ngược `--pass: var(--color-accent)` → T1.2 ĐỎ.
- [x] T4.3 Đổi một bí danh look→look → ca vẫn XANH *(chiều đối chứng, lưới không báo oan)*.
- [x] T4.4 Trả tag «đang chọn» về `--pass` → T3.1 ĐỎ.
- [x] T4.5 Hỏng phép nhận diện họ (coi mọi tên là look) → ca ĐỎ.
- [x] T4.6 Không đột biến nào sống sót; 4/4 chiều đối kháng GIẾT cả hai lượt, chiều đối chứng vẫn XANH.
      File khôi phục nguyên vẹn (so với bản chụp, không so với `git diff` — cả change đang chưa commit).

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T5.1 Đã nhìn thật ở 1400px; không trạng thái giao diện nào còn mang màu PASS.
- [x] T5.2 Đo bằng `getComputedStyle` trên trang đang chạy — bốn cặp nền/chữ khác nhau cả sắc lẫn độ
      sáng (bảng ở `tasks.md` §6.2). Và `--teal`/`--amber` trả rỗng: bí danh không còn tồn tại.
