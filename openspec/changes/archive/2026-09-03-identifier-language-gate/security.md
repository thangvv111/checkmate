# Security — identifier-language-gate

Change này thêm một lưới quy ước viết code và đổi tên 10 định danh. Nó KHÔNG đổi hành vi sản phẩm, KHÔNG
chạm dữ liệu, KHÔNG chạm cổng. Soi vẫn đủ trục, vì hai chỗ có thể sai một cách kín đáo: đổi tên chạm dữ
liệu đã ghi, và một lưới hình thức tạo cảm giác an toàn giả.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Lưới đọc **tên định danh** trong source của chính repo này. Không đọc `.secrets.json`, không đọc
  `config.json`, không chạm repo đích. Thông điệp lỗi in tên định danh và đường dẫn file nguồn — cả hai
  đều là thứ đã nằm công khai trong repo.
- ✅ S1.2 Đổi tên KHÔNG chạm giá trị: `maskToken` · `maskToken2` · `maskKey` · `readVault` giữ nguyên tên và
  nguyên thân. Không tên nào trong bảng D4 nằm trên đường che bí mật.
- N/A S1.3 Không bản che mới.

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 `VAI_HOP_LE` (`cli-tai-khoan.ts`) bị từ điển bắt nhưng **thuộc diện miễn** — code cũ, KHÔNG đổi
  trong change này. Đổi tên một hằng trên đường kiểm vai là chỗ dễ sai lặng lẽ nhất, và nó không cần thiết
  cho change này.
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge. Lưới chỉ làm `npm test` đỏ — tức nói KHÔNG, đúng ⛔C1: tự động
  hoá được phép nói KHÔNG, không được phép nói CÓ.
- N/A S3.2 Không đụng ba công tắc tự động.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Lưới đọc file nguồn của repo này — không phải dữ liệu ngoài. Không nội dung nào từ repo đích, diff
  PR, hay trả lời model đi vào phép quét.
- ✅ S4.2 `docs/identifier-allowlist.md` là file trong repo, đổi được qua PR có review. Nó KHÔNG đọc từ
  biến môi trường, không đọc từ `checkmate.yml` của repo đích — nếu đọc thì một repo đích sẽ tự khai miễn
  trừ cho chính nó.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Lưới không chạy code, chỉ đọc text bằng regex.
- N/A S5.2 Không worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- ⚠️ S6.1 `TrangThaiProbe` → `ProbeState` là đổi **tên kiểu**, và kiểu này mô tả dữ liệu đã ghi trong
  `web-runs/` (sổ SQLite) và verdict cũ. Giá trị chuỗi (`'hoi_quy'`, `'vi_pham_luat_moi'`, `'ngoai_pham_vi'`
  …) **KHÔNG đổi** — task 3.7 kiểm bằng đếm `grep` trước/sau. Nếu đổi giá trị thì mọi verdict cũ đọc lại
  thành sai nhãn, và `test/doc-du-lieu-cu.test.ts` là lưới thứ hai bắt điều đó.
- ✅ S6.2 Không ghi file mới lúc chạy. `docs/identifier-allowlist.md` là artifact tĩnh trong repo.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Lưới hỏng (đọc file lỗi, allowlist mất) → vitest ném → `npm test` ĐỎ, không phải xanh. Đúng ⛔C2.
- ⚠️ S7.2 Chỗ fail-open thật của change này: **một phép quét trả rỗng trông giống hệt repo sạch và lưới
  hỏng**. Ca T1.1 là thứ phân biệt hai trạng thái đó — nó khoá rằng phép quét bắt được 10 tên đã biết. Không
  có T1.1 thì một regex gõ sai làm lưới xanh vĩnh viễn, và cả change thành nghi lễ.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **đưa được một định danh tiếng Việt mới vào repo mà lưới không đỏ**. Mọi đường:

- ⚠️ S8.1 (a) đặt tên dùng âm ngoài từ điển → **đường này MỞ**, là âm tính giả đã khai ở D3 và ở
  requirement. Chấp nhận vì lưới gác quy ước, không gác cổng: hậu quả là luật phủ chưa hết, không phải PR
  sai lọt merge. Cách vá: mở rộng từ điển khi phát hiện.
- ✅ S8.2 (b) thêm tên mới vào allowlist để được miễn → T3.3 khoá số mục ở 89, và mọi dòng thêm đi qua
  review PR của người. Máy không tự thêm dòng nào.
- ✅ S8.3 (c) khai báo ở dòng thụt để né regex cột 0 → đó chính là biến cục bộ, nằm ngoài phạm vi có chủ đích
  (D2). Không phải lỗ hổng: một hàm top-level không thể khai báo thụt đầu dòng mà vẫn là top-level.
- ✅ S8.4 (d) xoá file lưới hoặc allowlist → `npm test` đỏ (thiếu file) chứ không xanh; và xoá file là thay
  đổi hiện trong diff PR.

## Notes

- S8.1 là chỗ yếu đã biết và đã khai ở cả `design.md` D3 lẫn requirement 2 — ghi ở đây để không ai đọc
  security xong tưởng lưới kín.
- S6.1 và S7.2 là hai chỗ duy nhất change này có thể sai mà không ai thấy ngay; cả hai đều có ca khoá.
