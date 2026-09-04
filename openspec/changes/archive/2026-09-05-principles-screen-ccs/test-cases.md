# Test cases — principles-screen-ccs

## Unit / hàm thuần

### Dữ liệu chín nguyên tắc

- [x] T1.1 [Scenario «đủ chín nguyên tắc, đánh số liên tục»]: đúng 9 phần tử, số 01–09, không trùng, không
      đứt quãng.
- [x] T1.2 [Scenario «nguyên tắc là dữ liệu»]: đếm được từ mảng, không phải dò chuỗi trong HTML.
- [x] T1.3 Mỗi điều có đủ tiêu đề, thân, và `thayO` với nhãn + đường.
- [x] T1.4 Nội dung không rỗng và không trùng nhau (chín tiêu đề khác nhau).

### scanDeadLinks — lưới liên kết

- [x] T2.1 [Scenario «mọi đường dẫn đều sống»]: chín đường hiện tại → **rỗng** *(fixture đối chứng)*.
- [x] T2.2 [Scenario «một màn bị gỡ»]: một đường trỏ route không tồn tại → ĐỎ, nêu nguyên tắc nào và đường
      nào *(fixture đối kháng)*.
- [x] T2.3 Đường có query string được so ở phần trước dấu `?`.
- [x] T2.4 [Đầu vào khuyết] danh sách rỗng · route rỗng · `thayO` thiếu → không ném.
- [x] T2.5 Tập route lấy TỪ `server.ts`, không khai tay — quét được ít nhất chín route thật.

## Tích hợp (giao diện thật)

- [x] T3.1 [Scenario «câu tuyên bố»]: poster mang đúng nguyên văn «Checker không tin ai. Chỉ tin bằng chứng.»
- [x] T3.2 [Scenario «nền của poster»]: dùng accent NỀN ĐẶC (`var(--color-accent)`), không tint, không
      semantic.
- [x] T3.3 Chín mục hiện đủ trong HTML, mỗi mục có số, tiêu đề, thân và dòng «thấy ở:» bấm được.
- [x] T3.4 Khối nguyên tắc giới hạn 900px.
- [x] T3.5 Bài giải thích mười mục CÒN NGUYÊN — change không xoá nội dung viết tay.

## Ca đối kháng & hồi quy

- [x] T4.1 Nội dung nguyên tắc được thoát HTML *(dữ liệu nội bộ, nhưng khuôn dựng phải sạch như mọi khuôn)*.
- [x] T4.2 [Ca đã gãy trong lịch sử repo] Chính bệnh sinh ra change: 0 nguyên tắc đánh số, 0 dòng «thấy ở:».
      Ca mới khoá cả hai con số.

## Trục nhạy cảm

- [N/A] T_bimat — trang chỉ bày chữ tĩnh viết sẵn trong mã nguồn; không giá trị nào là bí mật.
- [N/A] T_failclosed — không chạm đường verdict, không có nhánh lỗi mới.
- [N/A] T_cong — trang đọc, không nút cổng nào.
- [N/A] T_khongtincay — không dữ liệu ngoài nào vào trang này.
- [x] T_hopdong — export mới khai đủ `checkmate.yml`.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [x] T5.1 Một đường «thấy ở:» thành route không tồn tại → T2.1 ĐỎ.
- [x] T5.2 Bỏ một nguyên tắc → T1.1 ĐỎ.
- [x] T5.3 Số đứt quãng → T1.1 ĐỎ.
- [x] T5.4 Sửa một chữ trong câu poster → T3.1 ĐỎ.
- [x] T5.5 Poster đổi sang accent tint → T3.2 ĐỎ.
- [x] T5.6 Lưới đọc danh sách route khai tay → ca ĐỎ.
- [x] T5.7 Không đột biến nào sống sót — 6/6 GIẾT cả hai lượt.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T6.1 Đã dựng thật ở 1400px; poster + chín mục + chín dòng «thấy ở:».
- [x] T6.2 Đọc chín `href` trên trang đang chạy — cả chín trỏ route thật.
