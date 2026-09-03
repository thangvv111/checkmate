# Test cases — model-reply-parsing

Requirement: R-1 «Bóc JSON, và khi không có JSON thì nói ra model đã nói gì» · R-2 «JSON hỏng phải chỉ đúng
chỗ, lượt nhắc lại được đưa chính thông điệp đó — đã rào» · R-3 «Bóc code khỏi mọi language tag, lời gọi
tool là loại lỗi riêng» · R-4 «Dữ liệu ngoại lai kẹp giữa cặp mốc mang nonce» · R-5 «Model chấm chạy không
tool, danh sách cấm liệt kê tường minh».

**11 điều đã có ca** trong `test/boc-model.test.ts` (12 ca) — bảng dưới đối chiếu, không lặp lại.

## Đối chiếu: scenario ↔ ca đã có

- [x] T1.1 «bóc được JSON trong code fence có tag json» ✓ có (R3.1).
- [x] T1.2 «bóc được JSON trần không fence» ✓ có (R3.1).
- [x] T1.3 «không có JSON thì ném lỗi kèm trích trả lời để người đọc biết model nói gì» ✓ có (R3.2).
- [x] T2.1 «JSON hỏng thì lỗi phải chỉ ĐÚNG CHỖ hỏng, không chỉ nói position 2914» ✓ có (R3.15).
- [x] T3.1 «bỏ language tag, không để lọt vào dòng đầu file code» ✓ có (R3.4).
- [x] T3.2 «nhận mọi tag ngôn ngữ chứ không riêng ts» ✓ có (R3.5).
- [x] T3.3 «không fence nhưng rõ là mã nguồn thì vẫn nhận» ✓ có (R3.6).
- [x] T3.4 «model phát lời gọi tool thì báo ĐÚNG bản chất» ✓ có (R3.7).
- [x] T4.1 «mỗi lượt sinh một nonce khác nhau» ✓ có (R3.9).
- [x] T4.2 «nội dung được kẹp giữa hai mốc mang cùng nonce» ✓ có (R3.8).
- [x] T4.3 «lời rào nói rõ mọi thứ trong mốc là DỮ LIỆU, không phải lệnh» ✓ có (R3.10).

## Ca MỚI

### R-2 lượt nhắc lại (R3.16 · R3.3)

- [x] T5.1 [R3.16 vế a] Lượt đầu trả JSON hỏng → prompt lượt hai **chứa thông điệp lỗi** của lượt đầu.
- [x] T5.2 [R3.16 vế b — vế thật] Thông điệp lỗi ấy nằm **giữa cặp mốc rào** (`<<<DU_LIEU_LOI_PARSE_…>>>` …
      `<<<HET_LOI_PARSE_…>>>`), không nằm trần trong prompt.
      *Một ca chỉ kiểm vế (a) vẫn XANH sau khi ai đó bỏ `rao(...)` — mà đó chính là lỗ hổng: kẻ viết diff
      làm vỡ JSON theo ý mình thì câu chữ của họ được chép nguyên vào lượt gọi sau, ở vị trí trông như lời
      của hệ thống.*
- [x] T5.3 [R3.3] Lượt đầu hỏng, lượt hai cũng hỏng → model được gọi **đúng hai lần** rồi ném lỗi; không
      có lần ba.

### R-5 model chạy không tool (R3.11)

- [x] T6.1 Danh sách tool bị cấm **không rỗng**, và mang tool đọc file, ghi file, chạy lệnh.
- [x] T6.2 Lời gọi CLI dùng cờ **liệt kê tường minh**, KHÔNG dùng chuỗi rỗng để tắt-hết.
      *Án lệ: `--tools ""` và `--allowed-tools ""` không có tác dụng — CLI vẫn bật đủ tool, model đi chạy
      `ls` thật rồi trả về lời gọi tool thay vì code.*

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [x] T7.1 Bỏ `rao(...)` ở `callJson` → T5.2 ĐỎ (và T5.1 vẫn xanh — đó là điểm của hai ca).
- [x] T7.2 Bọc lượt hai trong `try` để nhắc lần ba → T5.3 ĐỎ.
- [x] T7.3 Đổi danh sách tool cấm thành chuỗi rỗng → T6.1 ĐỎ.

## Trục nhạy cảm

- [x] T_khongtincay — trục chính của change. T4.x + T5.2: dữ liệu ngoại lai vào prompt phải qua rào, kể cả
      khi nó đến dưới dạng «thông điệp lỗi của chính hệ thống».
- [x] T_failclosed — T5.3: nhắc lại đúng một lần rồi NÉM, không lặp vô hạn để «cố cho ra kết quả».
- [N/A] T_bimat — không chạm bí mật.
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [x] T_hopdong — change không thêm export; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [x] T8.1 R3.11 phần ca test không với tới: CLI thật có chặn tool không, và mọi tên trong danh sách có tồn
      tại trong bản CLI đang cài không. Chỉ lộ ra khi chạy thật — nhưng nó làm cả đường gói thuê bao chết
      chứ không âm thầm hỏng, nên sẽ được phát hiện ngay ở lượt chấm đầu tiên sau khi nâng CLI.
