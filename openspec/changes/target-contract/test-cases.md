# Test cases — target-contract

Requirement: R-1 «`test_cmd` là template hai chỗ thay, đường dẫn chịu được khoảng trắng» · R-2 «không ghi
nhận được probe nào thì lỗi mang nguyên nhân bộ chạy báo» · R-3 «đích symlink `node_modules` phải tuyệt đối».

Cả ba khoá bằng **chạy thật** — repo git tạm, worktree thật, shell thật (D1).

## R-1 hai chỗ thay + quote

- [x] T1.1 Lệnh dựng ra mang **đúng đường dẫn file probe** ở chỗ thay thứ nhất — đọc lại được từ XML mà
      script ghi (D2). *Nếu chỗ thay không được thay, tên testcase là chuỗi placeholder nguyên văn.*
- [x] T1.2 Chỗ thay thứ hai nhận đường dẫn XML đầu ra — không thay thì không có file XML nào, ca ĐỎ.
- [x] T1.3 **Thư mục probe có KHOẢNG TRẮNG** → lệnh vẫn chạy đúng, XML vẫn đọc được (D3).
      *Ca load-bearing của nhóm: không quote thì shell tách một đường dẫn thành hai tham số, bộ chạy nhận
      sai đối số, và lượt chấm báo «không ghi nhận được probe nào» — người đọc đi tìm lỗi trong probe trong
      khi nguyên nhân là tên thư mục của máy chủ.*

## R-2 thông điệp lỗi mang nguyên nhân bộ chạy

- [x] T2.1 `test_cmd` không xuất XML và in một chuỗi đặc trưng ra stderr → kết quả thất bại, `loiThu` mang
      **chuỗi ấy**.
- [x] T2.2 `loiThu` nêu **tên file probe** liên quan.
      *Dừng lại là đúng (⛔C2); dừng mà không nói vì sao là fail-closed MÙ.*

## R-3 đích symlink tuyệt đối

- [x] T3.1 Dựng `Sandbox` bằng đường dẫn repo **TƯƠNG ĐỐI** → symlink `node_modules` trỏ tới thư mục repo
      đích bằng đường dẫn tuyệt đối.
- [x] T3.2 Symlink KHÔNG trỏ vào chính thư mục sandbox.
      *Ca load-bearing: hỏng ở đây KHÔNG ném lỗi — `npx` vẫn chạy được bộ chạy test vì tự tải về cache, nên
      lượt chấm nhìn như bình thường trong khi mọi `import` gói đều hỏng. Finding sai hẳn bản chất.*
- [x] T3.3 `finally` khôi phục cwd kể cả khi ca đỏ (D4 — ca duy nhất đụng trạng thái toàn cục).

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [x] T4.1 Bỏ `quote` → T1.3 ĐỎ.
- [x] T4.2 Bỏ `resolve()` ở đích symlink → T3.1 ĐỎ.
- [x] T4.3 `loiThu` chỉ mang câu chung, không mang `stderr` → T2.1 ĐỎ.
- [x] T4.4 Bỏ một trong hai phép thay → T1.1 hoặc T1.2 ĐỎ.
- [x] T4.5 Gác ở đây nằm trong **luồng điều khiển**, có chỗ để gỡ nhầm: đột biến nào không giết được ca thì
      phân biệt **ba** khả năng trước khi kết luận, không hai.

## Trục nhạy cảm

- [x] T_bimat — `loiThu` mang `stderr` của bộ chạy test **của repo đích**: đó là dữ liệu ngoài và có thể
  chứa bí mật. Đường ra ngoài do `error-message-egress-gate` gác; change này không đổi nó, nhưng ca T2.1
  chạm đúng bề mặt ấy nên ghi ra (⛔C3).
- [x] T_failclosed — T2.1: không ghi nhận được probe thì THẤT BẠI kèm nguyên nhân, không im lặng bỏ qua (⛔C2).
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [x] T_khongtincay — `test_cmd` đến từ `checkmate.yml` của repo đích và chạy qua shell. Đó là **thiết kế
  cố ý** (repo đích chọn lệnh chạy test của mình, trong sandbox); R-1 khai ranh giới ấy để không ai nhầm
  `quote` là gác an ninh (⛔C4).
- [x] T_hopdong — kiểm bảng module `checkmate.yml` có `Sandbox`; thêm nếu thiếu (⛔C5).
- [x] T_prod — ca dựng repo git tạm và worktree riêng; dọn bằng `sb.huy()` + `rmSync`.

## Kiểm tay

- [N/A] T5.1 Không có — change này không dựng gác chạy xuyên suốt (D5 tầng 2).
