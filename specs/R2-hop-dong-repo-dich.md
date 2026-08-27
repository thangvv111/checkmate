# R2 — Hợp đồng với repo đích: `checkmate.yml`

CheckMate không biết gì về stack (ngăn xếp công nghệ) hay nghiệp vụ của repo mà nó chấm. Repo đích tự
khai bằng file `checkmate.yml` ở gốc repo. Không khai thì rơi về đường mặc định (vitest + JUnit XML).

## Runner (bộ chạy test)

- **R2.1** — Không có `checkmate.yml` thì `docRunnerCfg` PHẢI trả `null` để luồng rơi về đường vitest
  mặc định, KHÔNG được ném lỗi.
- **R2.2** — Khai `runner` mà thiếu `test_cmd` thì coi như không khai runner (trả `null`). Lệnh chạy là
  trường duy nhất không thể đoán hộ.
- **R2.3** — `test_cmd` là template chứa hai placeholder (chỗ thay): `{files}` (danh sách file probe) và
  `{out}` (đường dẫn file kết quả). Repo tự quyết cách chạy; CheckMate chỉ thay hai chỗ này.
- **R2.4** — Các trường còn lại (`framework`, `probe_dir`, `probe_ext`, `timeout_s`) có mặc định; repo
  không khai thì dùng mặc định.
- **R2.5** — `timeout_s` PHẢI bị kẹp vào dải `[30, 1800]` giây. Repo khai 99999 không được phép giữ máy
  chủ chạy mãi; khai 1 không được phép làm mọi probe chết yểu.

## Kết quả trả về

- **R2.6** — Hợp đồng kết quả là **JUnit XML**, bất kể repo chạy bằng vitest, pytest hay surefire.
- **R2.7** — Thẻ `<failure/>` **rỗng** vẫn PHẢI được đọc là `failed`. Kiểm sự CÓ MẶT của thẻ, không kiểm
  nội dung — nhiều framework xuất failure không kèm message.
- **R2.8** — `testcase` nằm trong `testsuite` lồng nhau PHẢI được gom hết; pytest và surefire hay xuất
  dạng lồng.
- **R2.9** — XML không phải JUnit PHẢI trả danh sách rỗng, KHÔNG được ném lỗi làm sập lượt chấm.
- **R2.13** — Nối id probe với testcase PHẢI nhận đủ ba dạng tên mà các bộ chạy sinh ra: `P1: …`
  (vitest reporter json), `test_P1_…` (pytest/junit), và `nhóm > P1: …` — JUnit XML của vitest và
  surefire ghép tên `describe`/class vào trước tên test. Không nhận dạng thứ ba thì mọi probe viết
  trong `describe` bị tính `khong_chay` dù đã chạy thật.
- **R2.14** — Việc nối id PHẢI kiểm ranh giới: ký tự ngay sau id không được là chữ số. Thiếu luật này
  thì `P1` nuốt kết quả của `P10` khi lượt chấm chạy từ 10 probe trở lên.
- **R2.15** — File probe **không nạp được** (lỗi import, lỗi cú pháp) vẫn cho ra JUnit XML hợp lệ, nhưng
  bên trong chỉ có đúng một testcase mang tên chính file đó và mang trạng thái failed. Trường hợp này
  PHẢI bị nhận ra và trả về nguyên nhân, KHÔNG được đếm như một test đã chạy — đếm nó là tự báo xanh
  trên một lượt chưa chạy gì.
- **R2.16** — Khi không ghi nhận được probe nào, thông điệp lỗi PHẢI kèm nguyên nhân mà bộ chạy test đã
  nói, và lượt sinh lại PHẢI được đưa nguyên nhân đó. Chỉ báo "tên test không khớp id" trong khi lỗi
  thật là import hỏng thì người vận hành lẫn model đều sửa nhầm chỗ.

## Đường dẫn repo

- **R2.17** — Đường dẫn tới repo đích PHẢI được đưa về tuyệt đối trước khi dùng làm đích của symlink hay
  junction. Đích tương đối tạo ra một liên kết trỏ ngược vào chính sandbox: hỏng mà không báo lỗi, và
  triệu chứng rất khó lần vì `npx` vẫn chạy được bộ test (nó tự tải về cache) nên nhìn như bình thường,
  trong khi mọi `import` gói từ trong worktree đều "Cannot find package".

## Tri thức nghiệp vụ per-repo

- **R2.10** — Khối `review.khuon_loi` là danh sách góc tấn công ưu tiên của domain (miền nghiệp vụ) này.
  Khai thì được đưa lên ĐẦU bộ khuôn lỗi mà model nhận.
- **R2.11** — Khối `review.severity_map` định nghĩa cái gì là `high`/`medium`/`low` **với riêng repo này**.
  Engine không có quan điểm về mức nghiêm trọng của một domain nó chưa từng thấy.
- **R2.12** — `checkmate.yml` cú pháp hỏng thì `docReviewCfg` PHẢI fail-safe (hỏng an toàn) về `null`,
  KHÔNG được ném lỗi. Một file cấu hình sai chính tả không được quyền chặn cả lượt chấm.
