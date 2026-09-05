# Test cases — container-isolated-probe-runs

Bề mặt đo bằng máy ở `tasks.md` §0: **6 đường** code PR với tới trước change; nền có `userns=1` + `subuid`,
**không** có runtime container nào.

⛔ **Giới hạn phải nói ra trước:** ca test ở đây **không dựng container thật** — vitest chạy trên máy dev
Windows, nơi không có runtime. Lưới khoá **quyết định** (dựng đối số gì, mount gì, khai mức nào); **phép
chứng minh** là sáu phép đo chạy lại TỪ TRONG container ở T7.1. Nhầm hai vai là lỗi lưới loại 1 — và ở
change này nó nguy hiểm nhất, vì một lưới xanh có thể đứng cạnh một container không hề cô lập.

## Dựng môi trường (hàm thuần)

- [ ] T1.1 Đối số dựng có tắt mạng.
- [ ] T1.2 Đối số dựng có trần **bộ nhớ**, **CPU**, **số tiến trình** — cả ba, không thiếu cái nào.
- [ ] T1.3 Chạy dưới user **không đặc quyền**, có user-namespace.
- [ ] T1.4 [Scenario «probe cố đọc kho khoá»] Danh sách bind KHÔNG chứa `.secrets.json`, `config.json`,
      `web-runs/`, `probes-lib/`, hay bản clone.
- [ ] T1.5 [Scenario «phụ thuộc dựng sẵn»] `node_modules` bind ở chế độ **chỉ đọc**.
- [ ] T1.6 **Không bind nào có quyền ghi ra ngoài thư mục lượt chạy.** *(Ca nặng nhất: container KHÔNG
      chặn gì nếu vẫn mount ghi được — hai thứ nặng nhất chỉ được bảo vệ bởi việc chúng vắng mặt.)*
- [ ] T1.7 [fixture đối kháng] Thêm một bind ghi được → lưới ĐỎ, nêu đúng đường dẫn.

## Nguồn mã

- [ ] T2.1 Dựng bằng `git archive`, KHÔNG worktree — thư mục chạy không có `.git`.
- [ ] T2.2 [Đối kháng] Không đường nào ghi ngược vào git dir của clone.

## Ảnh chạy

- [ ] T3.1 [Scenario «repo khai ảnh riêng»] `checkmate.yml` khai ảnh → dùng ảnh ấy.
- [ ] T3.2 [Scenario «pull request sửa khai báo ảnh»] Đọc từ **đĩa clone**, không từ nhánh PR.
- [ ] T3.3 [Scenario «repo không khai gì»] Ảnh mặc định **ghim phiên bản**, không thẻ trôi.
- [ ] T3.4 [Đầu vào khuyết] `image` sai kiểu · rỗng · chuỗi rác → rơi về mặc định, không ném.

## Mức cô lập là THỰC TẾ

- [ ] T4.1 [Scenario «lượt chạy có cô lập»] Dựng được → khai `container` kèm runtime.
- [ ] T4.2 [Scenario «nền không cô lập được»] Runtime vắng → khai `none` kèm lý do.
- [ ] T4.3 [Scenario «cấu hình bật nhưng thực tế không dùng được»] Bật mà dựng lỗi → khai **`none`**,
      KHÔNG khai `container`. *(«Đã cấu hình để cô lập» ≠ «đã cô lập».)*
- [ ] T4.4 Verdict đời cũ thiếu trường → bề mặt đọc khai **không đo được**; MUST NOT suy thành «không cô
      lập». *(Bản ghi cũ có thể đã chạy ở bất kỳ đâu — không biết là một trạng thái riêng.)*

## Huỷ môi trường

- [ ] T5.1 Huỷ sau lượt, kể cả khi phần việc bên trong NÉM.
- [ ] T5.2 [Scenario «lượt trước để lại trạng thái»] Lượt sau không thấy file/tiến trình lượt trước.

## Trục nhạy cảm

- [ ] T_bimat ⛔C3 — kho khoá KHÔNG nằm trong cây nhìn thấy được. Đây là chỗ hôm nay thủng; T1.4 khoá ở
      mức quyết định, T7.1 chứng minh ở mức thực tế.
- [ ] T_failclosed ⛔C2 — nền không cô lập được thì **nói ra**, không im lặng chạy như đủ điều kiện. Và
      mức khai ra là mức THỰC TẾ (T4.3).
- [ ] T_cong ⛔C1 — change không thêm đường nào cho máy merge; không route mới.
- [ ] T_khongtincay ⛔C4 — `image` và `test_cmd` do repo đích khai: đọc từ nhánh gốc (T3.2). Thông điệp
      lỗi từ runtime là dữ liệu ngoài — qua đường che đã có trước khi lên màn.
- [ ] T_hopdong ⛔C5 — export mới khai đủ `checkmate.yml`.

## Mutation

- [ ] T6.1 Thêm bind ghi được (`probes-lib`) → T1.6 ĐỎ.
- [ ] T6.2 Bỏ tắt-mạng → T1.1 ĐỎ.
- [ ] T6.3 Bỏ một trong ba trần tài nguyên → T1.2 ĐỎ.
- [ ] T6.4 Đọc `image` từ nhánh PR → T3.2 ĐỎ.
- [ ] T6.5 Dựng lỗi mà vẫn khai `container` → T4.3 ĐỎ.
- [ ] T6.6 Ảnh mặc định đổi sang thẻ trôi → T3.3 ĐỎ.
- [ ] T6.7 Đột biến sống sót → bảng ba đường, ghi rõ rơi vào hàng nào.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [ ] T7.1 **Sáu phép đo ở §0 chạy lại TỪ TRONG container** — kho khoá, cấu hình, sổ cái, thư viện probe,
      `authorized_keys`, mạng. Cả sáu phải đổi chiều. *(Đây là phép chứng minh của cả change.)*
- [ ] T7.2 Lượt chấm thật trên repo demo → ra verdict, mức khai `container`.
- [ ] T7.3 Gỡ runtime tạm → vẫn ra verdict, mức khai `none` kèm lý do, bảng số liệu bày ra.
- [ ] T7.4 Probe cố ghi `probes-lib/` → thất bại; thư viện sau lượt còn nguyên.
- [ ] T7.5 Đo chi phí: dung lượng cài · RAM một lượt · thời gian dựng+huỷ so với hôm nay.
