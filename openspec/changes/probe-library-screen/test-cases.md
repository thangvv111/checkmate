# Test cases — probe-library-screen

Bề mặt đếm bằng máy ở `tasks.md` §0: **2** đường gỡ probe đã có · **11** trường chuỗi ngoài nội suy vào
HTML (đếm lại sau khi viết màn — bản đầu ước 13; `plan.id`, `plan.ten`, `plan.ky_vong`, `plan.trigger`
không lên màn) · **code probe** đi đường riêng bằng `textContent` · `TRAN_LICH_SU` = **20**.

## Unit / hàm thuần

### recordRemoval + readRemovalLog

- [x] T1.1 [Scenario «một probe đã có bị gỡ vì trùng lặp»]: ghi rồi đọc lại → đủ `go` · `giu` · `ly_do` ·
      `bang_chung` · `luc`, và `loai` là gỡ-vì-trùng.
- [x] T1.2 [Scenario «một probe bị đào thải vì trần»]: ghi rồi đọc lại → `loai` là đào-thải, mang nấc đã
      chọn nạn nhân; **không** có trường `giu` (đào thải không giữ cái nào thay thế).
- [x] T1.3 [Scenario «người đọc phân biệt hai lý do gỡ»]: sổ có cả hai loại → đọc ra hai nhóm khác nhau.
- [x] T1.4 [Scenario «thư viện đổi sau khi đã ghi sổ gỡ»]: ghi 3 bản, nạp thêm probe, đào thải thêm →
      3 bản cũ còn NGUYÊN VĂN, không bản nào bị sửa.
- [x] T1.5 [Biên] Sổ vắng mặt → rỗng, **không ném**, và phân biệt được với sổ có dòng hỏng.
- [x] T1.6 [Hỏng] Dòng cuối cụt (JSON dở) → các dòng trước vẫn đọc đủ, và số dòng đã bỏ được TRẢ VỀ.
      *(Nuốt im lặng thì sổ hỏng dần trông y hệt sổ trống.)*
- [x] T1.7 [Hỏng] Dòng giữa hỏng (không phải dòng cuối) → vẫn đọc được các dòng sau nó.

### readLibraryIndex

- [x] T2.1 [Scenario «nhiều repo đã khai»]: hai slug có thư viện khác nhau → đọc slug này không thấy probe
      của slug kia.
- [x] T2.2 Chỉ mục **không** mang code — kiểm bằng kích thước và bằng vắng trường.
- [x] T2.3 [Đời cũ] Thư viện định dạng bộ → vẫn đọc được qua đường di trú đã có, không nhân đôi.
- [x] T2.4 [Hỏng] `meta.json` rách → khai **không đo được**, KHÔNG trả `0 probe`.

### readProbeCode

- [x] T3.1 [Happy] Tên có trong sổ → trả đúng nội dung file.
- [x] T3.2 [Đối kháng] Tên chứa `..`, dấu gạch chéo, đường tuyệt đối → `null`, và **không** file nào ngoài
      thư mục thư viện bị đọc.
- [x] T3.3 Tên không có trong sổ nhưng file tồn tại trên đĩa → vẫn `null` (sổ là nguồn sự thật).
- [x] T3.4 Tên có trong sổ mà file đã bị dọn → `null`, không ném.

### Dòng tóm tắt hành vi (hàm thuần)

- [x] T4.1 [Scenario «probe từng bắt hồi quy»]: có lượt mang nhãn hồi quy → nói đúng số lần.
- [x] T4.2 [Scenario «probe im lặng suốt»]: toàn `pass` → «chưa bắt được hồi quy nào», không để trống.
- [x] T4.3 [Scenario «probe chết kéo dài»]: fail cả hai nhánh → khai là lỗi có sẵn, KHÔNG đếm thành hồi quy.
- [x] T4.4 [Biên] `lich_su` rỗng → nói chưa có lượt nào, khác hẳn «không chạy».
- [x] T4.5 [Biên] `lich_su` đúng 20 và 21 phần tử → dải không vượt 20 ô.

## Tích hợp (đĩa, khoá)

### Đường đào thải vì trần

- [x] T5.1 [Happy] Nạp vượt trần → probe bị loại, và sổ có đúng MỘT bản ghi tương ứng.
- [x] T5.2 **[Ca khoá không-đổi-hành-vi]** Bốn nấc chọn nạn nhân cho ra ĐÚNG nạn nhân như trước change —
      chết kéo dài → flaky → cũ nhất chưa bắt hồi quy → cũ nhất tuyệt đối. *(Thêm ghi sổ mà đổi cách chọn
      là đổi một luật change này không xin phép đổi.)*
- [x] T5.3 Vượt trần nhiều probe một lúc → mỗi probe một dòng, không gộp.

### Đường gỡ vì trùng lặp

- [x] T6.1 [Happy] Hai probe trùng hành vi → probe mới hơn bị gỡ, sổ ghi đủ cặp gỡ/giữ + bằng chứng.
- [x] T6.2 [Scenario «probe MỚI không được nạp»] Probe mới bị từ chối nạp → **KHÔNG** có dòng nào trong sổ
      gỡ. *(Không nạp ≠ đã gỡ; gộp hai chuyện là báo sai bản chất.)*

### Chạy song song

- [x] T7.1 Ghi sổ nằm TRONG khoá thư viện (quét bằng khớp ngoặc thật, có cặp fixture), và 50 lần ghi
      liên tiếp không mất dòng nào, không dòng nào lẫn. *(Vế liên-TIẾN-TRÌNH do `withLibraryLock` gánh và
      đã có lưới riêng ở `thu-vien`; ca này khoá đúng vế change NÀY thêm vào — nói rõ để không ai đọc nó
      thành một lời bảo đảm rộng hơn thứ nó chứng minh.)*

## Ca đối kháng & hồi quy

- [x] T8.1 [Đầu vào KHUYẾT mọi tầng] `plan` thiếu trường · `lich_su` null · phần tử null · `luc` sai định
      dạng → màn dựng được, không ném.
- [x] T8.2 [Biên trùng ngưỡng] `lich_su` đúng `TRAN_LICH_SU` phần tử.
- [x] T8.3 [Ca đã gãy trong lịch sử repo] Probe thư viện import module đã đổi tên (prod 31/08, năm lượt
      webhook chết): màn phải bày được probe ấy và lịch sử `khong_chay` của nó — đây chính là thứ đáng ra
      giải thích được sự cố mà không cần `ssh`.

## Trục nhạy cảm

- [x] T_bimat ⛔C3 — nội dung màn và cả hai API không chứa chìa riêng của repo, token, hay giá trị người
      vận hành gõ vào ô cấu hình. Quét chuỗi trên HTML dựng ra với cấu hình có token giả.
- [N/A] T_failclosed — change chỉ-đọc, không sinh verdict và không chạm đường phân loại. Vế fail-closed
      tương ứng ở đây là **không đo được thì nói không đo được**, đã khoá ở T2.4.
- [x] T_cong ⛔C1 — change KHÔNG thêm đường nào cho máy merge và không thêm hành động ghi nào: quét route
      mới, cả hai đều là `GET`; không route nào gọi `mergePr`.
- [x] T_khongtincay ⛔C4 — 11 trường chuỗi ngoài đi qua `escHtml`; **code probe đặt bằng `textContent`**,
      một rào MẠNH HƠN (trình duyệt không bao giờ phân tích nó thành phần tử) và có phép quét riêng cấm
      `innerHTML`. Ca đối kháng đặt chuỗi đóng thẻ và chuỗi mở `<script>` vào **THÂN probe** (chỗ dài nhất,
      dễ được miễn nhất), không chỉ vào tiêu đề; thêm một ca cho trường đi vào **thuộc tính** `title`, vì
      thoát cho thân và thoát cho thuộc tính không phải một chuyện.
- [x] T_hopdong ⛔C5 — bốn export mới khai đủ `checkmate.yml`.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [x] T9.1 Bỏ ghi sổ ở đường đào thải → T5.1 ĐỎ.
- [x] T9.2 Bỏ ghi sổ ở đường gỡ trùng → T6.1 ĐỎ.
- [x] T9.3 Bỏ `escHtml` quanh một trường ngoài (tên probe) → T_khongtincay ĐỎ.
- [x] T9.3b Đổi panel code sang `innerHTML` → phép quét `scanNoInnerHtml` ĐỎ. *(Chiều tương ứng cho code;
      bản đầu của tài liệu này viết nhầm là «bỏ escHtml quanh code probe» — code không đi đường escHtml.)*
- [x] T9.4 `readProbeCode` ghép thẳng tên vào đường dẫn → T3.2 ĐỎ.
- [x] T9.5 Đệm dải hành vi cho đủ 20 ô → T4.4 hoặc T4.5 ĐỎ.
- [x] T9.6 Trần trên màn hard-code `40` → ca «trần đổi trong cấu hình» ĐỎ.
- [x] T9.7 Đường đọc sổ nuốt dòng cụt im lặng → T1.6 ĐỎ.
- [x] T9.8 **Đã xảy ra và đã phân loại.** Chiều «bỏ ghi sổ ở đường gỡ trùng» SỐNG SÓT ở lượt đầu (0/0 ca
      đỏ, hai lượt nhất quán) — **hàng thứ NHẤT** của bảng ba đường: không ca nào lái
      `findAndDropBehaviorDuplicates` thật, mọi ca sổ gỡ khi ấy gọi thẳng `recordRemoval`. Viết T6.1 đi
      qua đường thật, chạy lại: bị bắt 1/1 cả hai lượt.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T10.1 Mở `/probes` trên thư viện thật: dải hành vi và dòng tóm tắt đọc có hiểu không — thứ chỉ mắt
      người xác nhận được.
- [x] T10.2 Mở panel code một probe dài: bố cục không vỡ, trang không cuộn ngang.
- [x] T10.3 `repos: []` → màn nói «chưa kết nối repo nào», không nói thư viện trống.
