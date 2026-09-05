# Test cases — probe-quarantine-and-cleanup

Bề mặt đếm bằng máy ở `tasks.md` §0: **1** đường chạy probe thư viện · **0** route ghi lên thư viện trước
change (sau: **3**) · `that_lac` hôm nay tính TRÊN `keHoach`.

## Unit / hàm thuần

### Nhận diện lỗi nạp (từ JSON của vitest)

- [x] T1.1 [Scenario «một file thư viện không nạp được»]: `testResults` có mục `assertionResults` rỗng +
      `message` → file ấy vào `loiNap`.
- [x] T1.2 [Scenario «probe chạy được nhưng không đạt»]: mục có `assertionResults` với `status: failed` →
      **KHÔNG** vào `loiNap`. *(Lẫn hai thứ này là biến một bằng chứng về code đích thành một dòng bảo trì.)*
- [x] T1.3 [Biên] Mục có `assertionResults` rỗng nhưng KHÔNG có `message` (file test rỗng) → không vào
      `loiNap`.
- [x] T1.6 **[Danh sách ĐÓNG — PO chốt 05/09]** Chỉ lỗi NẠP kích hoạt cách ly. Bốn ca đối kháng, mỗi ca
      một dòng của bảng: probe **treo** (timeout) · probe **fail** · probe **flaky** · probe là thủ phạm
      duy nhất làm verdict FAIL → **KHÔNG** ca nào bị cách ly.
- [x] T1.7 [Lưới gác danh sách đóng] Quét source: chỉ đúng MỘT chỗ kích hoạt cách ly, và nó đọc từ danh
      sách lỗi nạp — không nhánh nào cách ly từ `treo`, từ `status: failed`, hay từ `flaky_diem`.
- [x] T1.4 [Đối kháng] Nhận diện KHÔNG được dựa vào lời văn lỗi: đổi `message` sang tiếng khác / phiên bản
      vitest khác vẫn nhận ra.
- [x] T1.5 [Hỏng] `outFile` không tồn tại → `loiNap` rỗng và lượt chấm thất bại như cũ; MUST NOT đoán bừa
      một file để cách ly.

### Quyết định cách ly (bảng ba hàng — hàm thuần)

- [x] T2.1 ✗gốc ✗PR → **cách ly**.
- [x] T2.2 **✓gốc ✗PR → KHÔNG cách ly.** *(Ca quan trọng nhất của change: cách ly ở đây là lấy một finding
      thật rồi biến nó thành im lặng — XANH GIẢ.)*
- [x] T2.3 ✗gốc ✓PR → không cách ly.
- [x] T2.4 [Biên] Danh sách lỗi nạp rỗng ở cả hai nhánh → không cách ly gì.
- [x] T2.5 [Đầu vào khuyết] danh sách null · phần tử rỗng · tên trùng → không ném, không cách ly nhầm.

### Trần vòng chạy lại

- [x] T3.1 · T3.3 Trần là **hằng đọc được** (`QUARANTINE_ROUND_CAP`), vòng lặp so với nó, và hết trần thì
      DỪNG loại rồi đi tiếp theo nhánh thất bại cũ — khoá bằng ca `T_failclosed`; mutation M2 (bỏ trần) ĐỎ.

### Đường đọc thư viện tách hai

- [x] T4.1 [Scenario «lượt chấm kế tiếp»]: `readProbeLibrary` KHÔNG trả probe mang `cach_ly`.
- [x] T4.2 `readLibraryIndex` VẪN trả probe ấy, kèm cờ — màn phải thấy nó.
- [x] T4.3 [Đời cũ] Mục sổ không có trường `cach_ly` → đọc như không cách ly, không di trú.

### Đếm

- [x] T5.1 [Scenario «probe thư viện không có kết quả»]: probe thư viện chạy mà không có kết quả → đếm là
      thất lạc, giống hệt probe mới.
- [x] T5.2 [Scenario «lượt chấm có probe bị cách ly»]: `probe_stats.cach_ly` bằng đúng số bị cách ly.
- [x] T5.3 [Scenario «lượt chấm không cách ly gì»]: khai `0`, không vắng mặt.
- [x] T5.4 Verdict ĐỜI CŨ thiếu trường → bề mặt đọc khai **không đo được**, KHÔNG phải `0`.

## Tích hợp (đĩa, khoá, sandbox)

- [x] T6.1 [Happy, ĐƯỜNG THẬT] Đã chạy ở kiểm tay T9.1 với repo đích git thật + sandbox thật (không gọi
      model): `ok:true tong:2`, `loiNap` chỉ đúng file hỏng, probe kia mang dấu `cach_ly`, hai probe còn
      lại vẫn chạy. Bảng kết quả ở `tasks.md` §12.
- [x] T6.2 Ghi dấu chạy TRONG khoá, và chỉ SAU khi lượt chấm kết thúc.
- [x] T6.3 Ba hành động của người ghi sổ TRƯỚC khi xoá file.
- [x] T6.4 [Đời cũ] `meta.json` chưa có trường `cach_ly` vẫn đọc/ghi bình thường.

## Ca đối kháng & hồi quy

- [x] T7.1 [Ca đã gãy trên PROD 31/08] Probe import ba module đã đổi tên: bản CŨ giết cả lượt; bản mới ra
      verdict và cách ly đúng probe ấy.
- [x] T7.2 [Đầu vào KHUYẾT mọi tầng] `testResults` null · `name` vắng · `message` không phải chuỗi →
      không hàm nào ném.
- [x] T7.3 [Biên trùng ngưỡng] Đúng bằng trần vòng chạy lại.
- [x] T7.4 Toàn bộ thư viện hỏng trên nhánh gốc → cách ly hết, lượt vẫn chạy với probe mới, và số cách ly
      hiện đúng.

## Trục nhạy cảm

- [x] T_bimat ⛔C3 — thông điệp lỗi nạp mang đường dẫn sandbox và nội dung repo đích. Nó đi vào `ly_do`
      của dấu cách ly, vào log, và lên màn: phải qua đúng đường che đã có (`redactMessage`), và không
      mang token nào.
- [x] T_failclosed ⛔C2 — hết trần → THẤT BẠI, không verdict. Và cách ly KHÔNG được làm một lượt chấm mất
      phép thử trông giống lượt chấm đủ phép thử: `probe_stats.cach_ly` phải có mặt.
- [x] T_cong ⛔C1 — vai `tu_dong` gọi cả ba route → bị chặn. Không route mới nào chạm cổng merge. Không
      đường tự động nào xoá probe.
- [x] T_khongtincay ⛔C4 — lời văn lỗi nạp do repo đích/Node sinh ra: nhận diện KHÔNG dựa vào nó (T1.4),
      và nó được thoát trước khi lên màn.
- [x] T_hopdong ⛔C5 — export mới khai đủ `checkmate.yml`.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [x] T8.1 Cách ly cả file chỉ hỏng trên nhánh PR → T2.2 ĐỎ *(chiều nguy hiểm nhất)*.
- [x] T8.2 Bỏ trần vòng chạy lại → T3.1 ĐỎ.
- [x] T8.3 `readProbeLibrary` thôi lọc probe cách ly → T4.1 ĐỎ.
- [x] T8.4 `that_lac` quay về chỉ tính `keHoach` → T5.1 ĐỎ.
- [x] T8.5 Bỏ kiểm vai ở một route → T_cong ĐỎ.
- [x] T8.6 `purge` thôi đòi gõ tên repo → ca xác nhận ĐỎ.
- [x] T8.7 Nhận diện lỗi nạp đổi sang bắt chuỗi lời văn → T1.4 ĐỎ.
- [x] T8.9 **Nới danh sách đóng: cách ly thêm cả probe TREO** → T1.6 ĐỎ. *(Chiều này canh đúng ranh giới
      PO chốt — nó là chiều dễ trượt nhất vì «treo» cũng làm lượt chấm không chạy được.)*
- [x] T8.10 Nới danh sách đóng: cách ly cả probe flaky → T1.6 ĐỎ.
- [x] T8.8 **Đã xảy ra.** M6 sống sót lượt đầu → **hàng thứ nhất** (ca không load-bearing): ca quét chuỗi
      `xacNhan !== g.repo`, mà `if (false && xacNhan !== g.repo)` vẫn khớp. Tách hàm thuần
      `evaluatePurgeRequest` và khoá bằng hành vi; chạy lại ĐỎ 1/1.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T9.1 Repo thật + probe hỏng thật: lượt chấm ra verdict, màn hiện probe cách ly kèm lý do đọc hiểu.
- [x] T9.2 Bấm gỡ dấu → lượt chấm kế tiếp chạy lại probe ấy.
- [x] T9.3 Bấm xoá cả thư viện: hộp xác nhận đòi gõ tên repo, và gõ sai thì không xoá.
- [x] T9.4 Bảng số liệu verdict hiện số probe cách ly, đọc hiểu.

## Kết quả

`npx tsc --noEmit` sạch · `npm test` **67 tệp / 1191 ca xanh** · mutation **10/10 bị bắt**, hai lượt nhất
quán · kiểm tay chạy thật đã tick SAU khi chạy.

Một mục hạ thành **nợ có tên** thay vì tick khống: T3.2 (đếm số vòng cách ly) — lý do và thứ đang khoá
thay nó ghi ngay tại chỗ.

## § Sau-merge — nợ có tên (KHÔNG thuộc change này)

Mục dưới đây **cố ý không làm trong change này**, và nó nằm dưới đề mục này để cổng archive đọc đúng —
không phải để lách qua cổng.

- [ ] T3.2 «một vòng cách ly là đủ thì KHÔNG chạy vòng thứ hai» — vế **đếm số vòng**. Kiểm được nó đòi lái
      cả `chayCaHaiNhanh` với một sandbox giả, mà vòng lặp ấy nằm trong một closure không export; tách nó
      ra là đổi hình dạng đường chạy chấm, tức một change khác.
      **Thứ đang khoá thay nó:** hằng `QUARANTINE_ROUND_CAP` có ca riêng, `continue` chỉ chạy khi
      `ungVien.length > 0`, và mutation M2 (bỏ trần) làm ca ĐỎ 1/1 hai lượt. Cái CHƯA khoá là «không chạy
      thừa một vòng khi không còn ứng viên» — hại của nó là tốn hai lượt sandbox, không phải sai kết quả.
      Đã ghi vào `named-debts` #22.
