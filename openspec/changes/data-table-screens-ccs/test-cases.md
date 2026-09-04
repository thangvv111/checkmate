# Test cases — data-table-screens-ccs

## Unit / hàm thuần

### artifactCell

- [x] T1.1 [Scenario «lượt chấm gắn pull request»]: có repo + PR + SHA → dòng phụ có cả ba, SHA cắt 7 ký tự.
- [x] T1.2 [Scenario «tài liệu rời»]: không PR → dòng phụ đọc được, KHÔNG bịa số pull request.
- [x] T1.3 [Scenario «thiếu trường»]: thiếu repo · thiếu SHA · thiếu cả hai → không ném, không hiện ô rỗng
      gây hiểu nhầm.
- [x] T1.4 [Đối kháng] Tên artifact chứa `<script>` → được thoát HTML.

### computeProfile — tỉ lệ PASS và thứ tự

- [x] T2.1 [Scenario «thứ tự theo tỉ lệ PASS»]: 20 verdict 50% đứng SAU 4 verdict 100%.
- [x] T2.2 [Scenario «chưa có verdict nào»]: 0 verdict → `tiLePass` là 0, không `NaN`, không 100%.
- [x] T2.3 [D2] Mẫu số là **số verdict**, không phải số PR: một PR chấm 3 lần (2 PASS 1 FAIL) cho 2/3,
      không phải 1/1.
- [x] T2.4 [D3] Hai tác giả cùng tỉ lệ → khoá phụ `soVerdict` quyết; cùng nốt → tên tác giả. Gọi hai lần
      cho cùng thứ tự.
- [x] T2.5 Tỉ lệ PASS hiện thành **cột** trong HTML — sắp theo một con số không có trong bảng thì người
      đọc không kiểm được thứ tự.

### Bộ lọc ngày (Lịch sử)

- [x] T3.1 Trong khoảng · ngoài khoảng · đúng biên hai đầu (bao gồm cả hai mốc).
- [x] T3.2 Chỉ có «từ» → lọc một phía. Chỉ có «đến» → lọc phía kia.
- [x] T3.3 Khoảng đảo ngược (từ > đến) → ra tập rỗng, không ném.
- [x] T3.4 Chuỗi ngày rác (`'hom qua'`) → không ném, không lọc mất hàng hợp lệ nào ngoài dự tính.

### Dòng tổng (Sổ cái)

- [x] T4.1 [Scenario «lọc theo một repo»]: mọi con số đổi theo phần đã lọc.
- [x] T4.2 [Scenario «lọc ra tập rỗng»]: hiện các số 0, KHÔNG ẩn đi, KHÔNG hiện số của tập chưa lọc.
- [x] T4.3 [Scenario «không lọc»]: tính trên toàn bộ.
- [x] T4.4 Dòng tổng có đủ 5 mục: verdict · PASS · FAIL · tổng H·M·L · token.
- [x] T4.5 Dòng tổng đứng TRƯỚC bảng — so vị trí trong chuỗi HTML.

## Tích hợp (mã nguồn thật)

- [x] T5.1 `MOI_TRANG` = 8, và trang 2 bắt đầu đúng ở hàng thứ 9.
- [x] T5.2 Ba bảng đều gọi `artifactCell` — không bảng nào tự dựng khuôn riêng.
- [x] T5.3 Bộ lọc Lịch sử đủ 6 (repo · verdict · skill · nhà cung cấp · ngày · tìm chữ).
- [x] T5.4 Sổ cái có lựa chọn lọc «tài liệu rời».

## Ca đối kháng & hồi quy

- [x] T6.1 [Đầu vào KHUYẾT mọi tầng] sổ cái rỗng · hàng thiếu `tac_gia` · thiếu `high/medium/low` ·
      `token_vao` undefined → không hàm nào ném.
- [x] T6.2 [Biên] Đúng 8 hàng → 1 trang. Đúng 9 hàng → 2 trang.
- [x] T6.3 [Ca đã gãy trong lịch sử repo] Chính bệnh sinh ra change: bảng Tin cậy sắp theo số verdict.
      Ca mới khoá trục đúng.

## Trục nhạy cảm

- [N/A] T_bimat — ba màn đọc từ sổ cái, không đọc bí mật. Token trong bảng là **số đếm token model**,
  không phải chìa khoá.
- [N/A] T_failclosed — không chạm đường verdict; ba màn chỉ ĐỌC.
- [N/A] T_cong — không chạm cổng; cột «hành động cổng» của sổ cái là bản ĐỌC ra từ sổ (R6.26), change
  không thêm đường ghi nào.
- [N/A] T_khongtincay — không đưa dữ liệu ngoài vào prompt. Tên artifact do người dùng đặt được thoát
  HTML (T1.4).
- [x] T_hopdong — `artifactCell` và trường mới khai đủ ở `checkmate.yml`; lưới hợp đồng xanh.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [x] T7.1 Trục sắp xếp về `soVerdict` → T2.1 ĐỎ.
- [x] T7.2 Bỏ khoá phụ → T2.4 ĐỎ.
- [x] T7.3 Mẫu số thành `soPr` → T2.3 ĐỎ.
- [x] T7.4 Dòng tổng tính trên tập chưa lọc → T4.1 ĐỎ.
- [x] T7.5 Dòng tổng xuống sau bảng → T4.5 ĐỎ.
- [x] T7.6 `MOI_TRANG` về 25 → T5.1 ĐỎ.
- [x] T7.7 Bỏ vế «đến» của lọc ngày → T3.1 ĐỎ.
- [x] T7.8 `artifactCell` bỏ dòng phụ → T1.1 ĐỎ.
- [x] T7.9 T7.4 sống sót lượt đầu vì **fixture cho hai tập cùng một con số** — đột biến không quan sát
      được, không phải gác còn nguyên. Sửa fixture rồi chạy lại: 8/8 GIẾT cả hai lượt.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T8.1 Đã dựng thật (22 hàng sổ cái · 14 lượt · 4 tác giả) và nhìn ở 1400px.
- [x] T8.2 Có — thứ tự đọc thành 67% · 67% · 60% · 60% ngay trên cột tỉ lệ PASS.
