# Security — probe-classification

Change này khai bảng chân trị thành luật và thêm một `export` + hai ca test. Nó KHÔNG đổi hành vi phân
loại. Nhưng bảng chân trị là chỗ ⛔C2 sống ở tầng probe, nên vẫn phải soi đủ.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Không giá trị bí mật nào đi qua. Hai hàm vân tay chỉ lấy **dòng đầu** thông điệp lỗi và gột hex
  dài (`packages/harness/src/skill-code.ts` — `errorFingerprint`, `tightFingerprint`), nên một token lỡ
  lọt vào thông điệp lỗi cũng bị gột thành `#` trước khi vào phép so.
- ⚠️ S1.2 Thông điệp lỗi **nguyên văn** vẫn đi vào `evidence.actual` của finding và có thể lên comment PR
  (bề mặt công khai, không thu hồi được). Đó là hành vi có sẵn, KHÔNG do change này tạo ra và không nằm
  trong phạm vi — ghi ra để không ai tưởng đã soi xong: nếu bộ chạy test của repo đích in bí mật vào lỗi,
  bí mật đó ra comment. Ứng viên nợ có tên, chờ PO quyết.
- N/A S1.3 Không bản che mới.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính.
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge. Change làm rõ **hai nhãn duy nhất chặn merge** (`hoi_quy`,
  `vi_pham_luat_moi`) và ranh giới giữa chúng — hướng chặt hơn, không lỏng hơn.
- N/A S3.2 Không đụng ba công tắc tự động.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Thông điệp lỗi dùng để phân loại do **bộ chạy test của repo đích** sinh ra — dữ liệu không tin
  cậy. Nó chỉ được đem gột thành vân tay rồi **so với nhau**, không được đem quyết định gì ngoài nhãn.
  Một PR cố tình làm hai nhánh in cùng một dòng lỗi thì được nhãn `ngoai_pham_vi` — nhãn ấy KHÔNG mở cổng
  (verdict vẫn cần bằng chứng theo `verdict-contract › PASS phải có bằng chứng`), nên đường này không dẫn
  tới xanh giả.
- ✅ S4.2 `looksLikeBrokenProbe` là chỗ nhạy nhất của change: mẫu quá rộng thì một vi phạm THẬT bị loại
  khỏi `hoi_quy`/`vi_pham_luat_moi` và lọt cổng — vá false-FAIL bằng cách mở false-PASS. Mẫu hiện tại hẹp
  (tên lớp lỗi runtime, lỗi nạp module) và có ca đối chứng «không bắt nhầm lỗi nghiệp vụ tiếng Anh tự
  nhiên». Change KHÔNG nới mẫu.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích ở chỗ mới.
- N/A S5.2 Không worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không file mới.
- N/A S6.2 Không ghi.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Đây là trục chính. Ba nhánh fail-closed của bảng chân trị: `br` vắng → `khong_chay` (không suy
  đoán từ nhánh gốc); `skipped` → `bo_qua` (không thành `pass`); đỏ mà thiếu đối chứng → `nghi_van` (không
  thành `hoi_quy`). Không nhánh nào biến «không biết» thành «pass» hay thành «có tội».
- ✅ S7.2 Probe hỏng KHÔNG bị đếm thành bằng chứng: `looksLikeBrokenProbe` loại nó trước khi phong
  `vi_pham_luat_moi`, và nhãn `ngoai_pham_vi` được khai rõ là «không kết luận được», không phải «probe hỏng».

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **làm một vi phạm thật không bị chặn merge**. Mọi đường:

- ✅ S8.1 (a) vô hiệu hoá probe bằng `it.skip` → `bo_qua`, không `pass` (T1.2); (b) làm probe không chạy →
  `khong_chay`, không suy đoán (T1.1); (c) làm nhánh gốc cũng đỏ để được `ngoai_pham_vi` → nếu probe neo
  luật mới thì vẫn `vi_pham_luat_moi` (T3.1), còn nếu không thì `ngoai_pham_vi` không mở cổng vì verdict
  vẫn đòi bằng chứng; (d) làm thông điệp lỗi trùng cụm kỹ thuật để bị coi là probe hỏng → mẫu hẹp, có ca
  đối chứng (T3.4); (e) gộp hai lỗi khác status code thành «cùng nguyên nhân» → vân tay chặt giữ số ngắn
  (T2.3, T2.5).
- ✅ S8.2 Load-bearing: 31 ca sẵn có đều là ca một-nhánh-một-ca của bảng chân trị; ca mới T4.1/T4.2 có
  mutation riêng (task 3.2). Change không nới bất kỳ gác nào nên không có gác mới cần chứng minh.
- ✅ S8.3 Đối xứng: `hoi_quy` và `vi_pham_luat_moi` cùng chặn merge và cùng bị `looksLikeBrokenProbe` gác;
  ca T3.2 khoá ranh giới giữa hai nhãn (gốc pass thật thắng nhãn luật-mới).

## Notes

- S1.2 là thứ duy nhất soi ra mà nằm ngoài phạm vi: thông điệp lỗi nguyên văn từ repo đích đi lên comment
  PR. Ghi để PO quyết có mở thành nợ có tên hay không.
