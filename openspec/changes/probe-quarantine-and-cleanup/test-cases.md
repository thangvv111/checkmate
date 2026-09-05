# Test cases — probe-quarantine-and-cleanup

Bề mặt đếm bằng máy ở `tasks.md` §0: **1** đường chạy probe thư viện · **0** route ghi lên thư viện trước
change (sau: **3**) · `that_lac` hôm nay tính TRÊN `keHoach`.

## Unit / hàm thuần

### Nhận diện lỗi nạp (từ JSON của vitest)

- [ ] T1.1 [Scenario «một file thư viện không nạp được»]: `testResults` có mục `assertionResults` rỗng +
      `message` → file ấy vào `loiNap`.
- [ ] T1.2 [Scenario «probe chạy được nhưng không đạt»]: mục có `assertionResults` với `status: failed` →
      **KHÔNG** vào `loiNap`. *(Lẫn hai thứ này là biến một bằng chứng về code đích thành một dòng bảo trì.)*
- [ ] T1.3 [Biên] Mục có `assertionResults` rỗng nhưng KHÔNG có `message` (file test rỗng) → không vào
      `loiNap`.
- [ ] T1.4 [Đối kháng] Nhận diện KHÔNG được dựa vào lời văn lỗi: đổi `message` sang tiếng khác / phiên bản
      vitest khác vẫn nhận ra.
- [ ] T1.5 [Hỏng] `outFile` không tồn tại → `loiNap` rỗng và lượt chấm thất bại như cũ; MUST NOT đoán bừa
      một file để cách ly.

### Quyết định cách ly (bảng ba hàng — hàm thuần)

- [ ] T2.1 ✗gốc ✗PR → **cách ly**.
- [ ] T2.2 **✓gốc ✗PR → KHÔNG cách ly.** *(Ca quan trọng nhất của change: cách ly ở đây là lấy một finding
      thật rồi biến nó thành im lặng — XANH GIẢ.)*
- [ ] T2.3 ✗gốc ✓PR → không cách ly.
- [ ] T2.4 [Biên] Danh sách lỗi nạp rỗng ở cả hai nhánh → không cách ly gì.
- [ ] T2.5 [Đầu vào khuyết] danh sách null · phần tử rỗng · tên trùng → không ném, không cách ly nhầm.

### Trần vòng chạy lại

- [ ] T3.1 [Scenario «hết trần chạy lại mà vẫn đổ»]: quá trần → lượt chấm THẤT BẠI, KHÔNG ra verdict.
- [ ] T3.2 Một vòng đủ để chạy được → không chạy vòng thứ hai.
- [ ] T3.3 [Biên] Trần là hằng đọc được, và có ca khoá giá trị của nó.

### Đường đọc thư viện tách hai

- [ ] T4.1 [Scenario «lượt chấm kế tiếp»]: `readProbeLibrary` KHÔNG trả probe mang `cach_ly`.
- [ ] T4.2 `readLibraryIndex` VẪN trả probe ấy, kèm cờ — màn phải thấy nó.
- [ ] T4.3 [Đời cũ] Mục sổ không có trường `cach_ly` → đọc như không cách ly, không di trú.

### Đếm

- [ ] T5.1 [Scenario «probe thư viện không có kết quả»]: probe thư viện chạy mà không có kết quả → đếm là
      thất lạc, giống hệt probe mới.
- [ ] T5.2 [Scenario «lượt chấm có probe bị cách ly»]: `probe_stats.cach_ly` bằng đúng số bị cách ly.
- [ ] T5.3 [Scenario «lượt chấm không cách ly gì»]: khai `0`, không vắng mặt.
- [ ] T5.4 Verdict ĐỜI CŨ thiếu trường → bề mặt đọc khai **không đo được**, KHÔNG phải `0`.

## Tích hợp (đĩa, khoá, sandbox)

- [ ] T6.1 [Happy, ĐƯỜNG THẬT] Thư viện có một probe import module không tồn tại; chạy chấm thật →
      lượt chấm RA verdict, probe kia mang dấu `cach_ly`, các probe còn lại vẫn chạy.
- [ ] T6.2 Ghi dấu chạy TRONG khoá, và chỉ SAU khi lượt chấm kết thúc.
- [ ] T6.3 Ba hành động của người ghi sổ TRƯỚC khi xoá file.
- [ ] T6.4 [Đời cũ] `meta.json` chưa có trường `cach_ly` vẫn đọc/ghi bình thường.

## Ca đối kháng & hồi quy

- [ ] T7.1 [Ca đã gãy trên PROD 31/08] Probe import ba module đã đổi tên: bản CŨ giết cả lượt; bản mới ra
      verdict và cách ly đúng probe ấy.
- [ ] T7.2 [Đầu vào KHUYẾT mọi tầng] `testResults` null · `name` vắng · `message` không phải chuỗi →
      không hàm nào ném.
- [ ] T7.3 [Biên trùng ngưỡng] Đúng bằng trần vòng chạy lại.
- [ ] T7.4 Toàn bộ thư viện hỏng trên nhánh gốc → cách ly hết, lượt vẫn chạy với probe mới, và số cách ly
      hiện đúng.

## Trục nhạy cảm

- [ ] T_bimat ⛔C3 — thông điệp lỗi nạp mang đường dẫn sandbox và nội dung repo đích. Nó đi vào `ly_do`
      của dấu cách ly, vào log, và lên màn: phải qua đúng đường che đã có (`redactMessage`), và không
      mang token nào.
- [ ] T_failclosed ⛔C2 — hết trần → THẤT BẠI, không verdict. Và cách ly KHÔNG được làm một lượt chấm mất
      phép thử trông giống lượt chấm đủ phép thử: `probe_stats.cach_ly` phải có mặt.
- [ ] T_cong ⛔C1 — vai `tu_dong` gọi cả ba route → bị chặn. Không route mới nào chạm cổng merge. Không
      đường tự động nào xoá probe.
- [ ] T_khongtincay ⛔C4 — lời văn lỗi nạp do repo đích/Node sinh ra: nhận diện KHÔNG dựa vào nó (T1.4),
      và nó được thoát trước khi lên màn.
- [ ] T_hopdong ⛔C5 — export mới khai đủ `checkmate.yml`.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [ ] T8.1 Cách ly cả file chỉ hỏng trên nhánh PR → T2.2 ĐỎ *(chiều nguy hiểm nhất)*.
- [ ] T8.2 Bỏ trần vòng chạy lại → T3.1 ĐỎ.
- [ ] T8.3 `readProbeLibrary` thôi lọc probe cách ly → T4.1 ĐỎ.
- [ ] T8.4 `that_lac` quay về chỉ tính `keHoach` → T5.1 ĐỎ.
- [ ] T8.5 Bỏ kiểm vai ở một route → T_cong ĐỎ.
- [ ] T8.6 `purge` thôi đòi gõ tên repo → ca xác nhận ĐỎ.
- [ ] T8.7 Nhận diện lỗi nạp đổi sang bắt chuỗi lời văn → T1.4 ĐỎ.
- [ ] T8.8 Đột biến sống sót → bảng ba đường, ghi rõ rơi vào hàng nào.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [ ] T9.1 Repo thật + probe hỏng thật: lượt chấm ra verdict, màn hiện probe cách ly kèm lý do đọc hiểu.
- [ ] T9.2 Bấm gỡ dấu → lượt chấm kế tiếp chạy lại probe ấy.
- [ ] T9.3 Bấm xoá cả thư viện: hộp xác nhận đòi gõ tên repo, và gõ sai thì không xoá.
- [ ] T9.4 Bảng số liệu verdict hiện số probe cách ly, đọc hiểu.
