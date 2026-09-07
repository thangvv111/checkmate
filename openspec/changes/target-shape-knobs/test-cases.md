## Unit / hàm thuần

### hàm kẹp dải dùng chung (runner.ts)
- [ ] T1.1 [Scenario: giá trị ngoài dải bị kẹp]: GIVEN giá trị vượt đầu trên WHEN kẹp THEN về đầu dải,
      kèm `clamped_from` là giá trị gốc
- [ ] T1.2 [Scenario: giá trị sai kiểu rơi về mặc định]: GIVEN chuỗi · `null` · `[]` · `{}` · `true` ·
      `undefined` THEN mặc định — MUST NOT ra `NaN`
- [ ] T1.3 [Biên]: hai đầu dải giữ nguyên, không bị kẹp
- [ ] T1.4 [Đối kháng]: `Infinity` · `-0` · `1e999` · `"12"` (chuỗi số) — hành vi phải khai rõ trong spec
      chứ không tuỳ hiện thực

### splitSpecUnits với maxDepth cấu hình
- [ ] T1.5 [Scenario: repo khai độ sâu khác]: GIVEN spec chia tới `#####`, maxDepth 3 vs 5 THEN số đơn
      vị khác nhau đúng như mong đợi
- [ ] T1.6 [Scenario: độ sâu không đổi cách đánh địa chỉ]: GIVEN spec KHÔNG có mã luật nào, maxDepth bất
      kỳ THEN mọi đơn vị vẫn có `address` lấy từ tiêu đề, probe neo vào được
- [ ] T1.7 [Hồi quy]: `RE_CODE` không bị đụng — spec có mã `R4.21` vẫn cho ra `code`, spec không mã vẫn
      cho ra `code: undefined` (khoá hồi quy cho Non-Goal của change)

### trần diff cấu hình (target.ts)
- [ ] T1.8 [Scenario: repo nới trần]: GIVEN trần rộng hơn THEN diff giữ được nhiều hơn
- [ ] T1.9 [Scenario: nới trần vẫn phải khai file bị bỏ]: GIVEN trần đã nới mà diff vẫn vượt THEN file
      bị bỏ trả về đủ tên + kích thước + lý do

## Tích hợp (đĩa, SQLite, khoá)

### đọc khoá từ nhánh gốc
- [ ] T2.1 [Scenario: pull request nới một khoá cho chính nó]: nhánh gốc mặc định, PR nới → áp giá trị
      nhánh gốc
- [ ] T2.2 [Scenario: pull request siết một khoá cũng không ăn]: PR siết chặt hơn → **vẫn** áp nhánh gốc
- [ ] T2.3 [Scenario: nhánh gốc không có `checkmate.yml`, PR thêm mới]: chạy bằng mặc định engine — file
      mới của PR không có tác dụng
- [ ] T2.4 [Đối kháng]: PR **xoá** `checkmate.yml` mà nhánh gốc có → vẫn áp giá trị nhánh gốc

### timeout đường mặc định (cửa song sinh)
- [ ] T2.5 [Scenario: repo khai timeout, chạy đường mặc định]: khai timeout nhưng không khai `test_cmd`
      → đường vitest áp đúng thời hạn ấy
- [ ] T2.6 [Scenario: thông điệp TIMEOUT nói đúng con số đã áp]: đổi khoá → **cả** chỗ cắt lẫn chuỗi
      thông điệp đổi theo. Đây là ca khoá cửa song sinh: đổi một chỗ mà chỗ kia không đổi phải ĐỎ
- [ ] T2.7 [Scenario: ranh giới treo không đổi]: đường mặc định cắt vì quá hạn → kết quả KHÔNG kèm
      `loiNap`

### tên file probe
- [ ] T2.8 [Happy]: khai `runner.probe_file`, chạy đường mặc định → ghi và tìm cùng một tên
- [ ] T2.9 [Hồi quy]: không khai → mặc định engine, chỗ ghi và chỗ tìm vẫn cùng giá trị (triệu chứng khi
      lệch là probe «thất lạc» — một triệu chứng chỉ về sai chỗ)

### verdict mang khoá hình dạng
- [ ] T2.10 [Happy]: ghi rồi đọc lại — giá trị, nguồn, `clamped_from` đều đúng
- [ ] T2.11 [Đời cũ]: verdict trước change đọc ra KHÔNG BIẾT, phân biệt bằng máy với «bằng mặc định»
- [ ] T2.12 [Hỏng]: trường có nhưng thiếu khoá con / sai kiểu → bề mặt đọc hiện «không biết», không ném

## Ca đối kháng & hồi quy

- [ ] T3.1 Đầu vào KHUYẾT: `checkmate.yml` rỗng · chỉ có `---` · khối đúng tên nhưng giá trị `null` ·
      khối là chuỗi thay vì object
- [ ] T3.2 Biên trùng ngưỡng của mọi dải kẹp mới (hai đầu, và một bước ngoài mỗi đầu)
- [ ] T3.3 **Ca đã gãy trong lịch sử repo — cửa song sinh, bắt 9 lần.** `sandbox.ts:305` (`300_000`) và
      `:311` (chuỗi `"300s"`) là một cặp đang mở. Ca khoá: sau change chỉ còn MỘT chỗ giữ con số
- [ ] T3.4 **Ca D2 — làm hỏng file không được nới cổng.** Với TỪNG khoá: so hành vi «bỏ trống» với hành
      vi «khai giá trị lỏng nhất trong dải»; mặc định phải nghiêm hơn hoặc bằng
- [ ] T3.5 Hồi quy Non-Goal: `RE_CODE` và cách đánh địa chỉ đơn vị luật không đổi (T1.7)

## Trục nhạy cảm

- [N/A] T_bimat — change không đọc/ghi bí mật. Giá trị mới là **số cấu hình nằm trong repo đích**, đã
  công khai với ai đọc được repo ấy. *(Ngày nào khối này nhận khoá CHUỖI TỰ DO thì ô này phải đọc lại từ
  đầu — xem `security.md` § Notes.)*
- [ ] T_failclosed — mọi nhánh lỗi mới rơi về mặc định và mặc định NGHIÊM HƠN (T3.4). Ca chết người:
  giá trị sai kiểu ra `NaN` rồi được dùng làm trần cắt ⇒ cắt sạch ⇒ ít finding hơn ⇒ **PASS** (T1.2)
- [ ] T_cong — change KHÔNG thêm đường nào cho máy tự merge; luật nhị phân `verdict.ts:41` không đổi một
  ký tự — lưới so khớp nguyên văn. Khoá mới đọc từ repo đích, không từ cấu hình vận hành, nên vai
  `tu_dong` không chạm được
- [ ] T_khongtincay — trục CHÍNH của change. Khoá là dữ liệu ngoài do **bên bị chấm** viết: giá trị hoang
  bị kẹp (T1.1), sai kiểu bị bỏ (T1.2), giá trị nhánh PR không ăn theo **cả hai chiều** (T2.1, T2.2).
  Thêm ca: chuỗi cài chỉ thị trong khoá hình dạng không đi vào prompt nào
- [ ] T_hopdong — export mới khai đủ trong bảng module; `test/hop-dong-repo.test.ts` xanh

## Lưới sổ khoá — cặp fixture bắt buộc

- [ ] T4.1 [Scenario: thêm khoá mới mà quên khai]: fixture cửa đọc parse một khoá không có hàng trong sổ
      → lưới **ĐỎ**, nêu đúng tên khoá
- [ ] T4.2 [Scenario: sổ có hàng thừa]: fixture sổ có hàng cho khoá không ai parse → lưới **ĐỎ**
- [ ] T4.3 [Cặp fixture — vế XANH]: fixture khoá đủ hàng, sổ không thừa → lưới **XANH**. Không có vế này
      thì lưới có thể đang đỏ vì lý do khác

## Chạy thật một lượt

- [ ] T5.1 **KHÔNG tick trước khi chạy.** Chạy một lượt chấm code thật trên repo có khai khoá hình dạng
      và một lượt trên repo không khai; xác nhận trên bề mặt thật: verdict và comment PR mang đúng khoá
      đã áp + nguồn · mẫu số độ phủ hiện trên comment · thông điệp `TIMEOUT` (dựng ca treo) nêu đúng con
      số đã cấu hình
- [ ] T5.2 Chạy lượt chấm trên repo có `checkmate.yml` **hỏng cú pháp** — xác nhận lượt chấm vẫn chạy,
      log báo đúng nguyên nhân, và không khoá nào lỏng hơn khi khai hợp lệ

## Kiểm tay

- [ ] T5.3 Comment PR mang thêm khoá hình dạng có làm **dìm phần finding** không — finding mới là thứ
      chặn merge
- [ ] T5.4 Sổ khoá đọc có ra được «khoá này ai chỉnh được và chỉnh thì ảnh hưởng gì» không, hay chỉ là
      một bảng để qua lưới
