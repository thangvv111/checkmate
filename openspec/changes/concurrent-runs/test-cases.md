# Test cases — concurrent-runs

Requirement: R-1 «Trần lượt chạy đồng thời…» · R-2 «Một pull request chỉ có một lượt chấm đang chạy» ·
R-3 «Lượt chấm không dùng chung ref git» · R-4 «Sandbox chạy trên máy chủ CheckMate với môi trường dựng
bằng danh sách cho phép».

## Unit / hàm thuần

### evaluateStartRun
- [ ] T1.1 [R-1 đủ trần]: `soDangChay = 2`, `tran = 2` → `{ chay: false, ma: 429, lyDo: 'qua_tai' }`.
- [ ] T1.2 [R-1 dưới trần]: `soDangChay = 1`, `tran = 2`, `prDangChay = false` → `{ chay: true }`.
- [ ] T1.3 [R-1 vượt trần]: `soDangChay = 3` (dọn mồ côi hụt) → vẫn từ chối 429, không âm thầm cho qua.
- [ ] T1.4 [R-2 PR đang chạy]: dưới trần nhưng `prDangChay = true` → `{ chay: false, ma: 409, lyDo: 'pr_dang_cham' }`.
- [ ] T1.5 [R-2 PR khác]: `prDangChay = false` → chạy (miễn dưới trần).
- [ ] T1.6 [R-1/R-2 thứ tự]: đủ trần VÀ `prDangChay = true` → lời của TRẦN (429), không phải 409 — gác rẻ
      hơn và chung hơn đứng trước.
- [ ] T1.7 [Biên]: `tran` khuyết/0/âm · `soDangChay` không phải số → không ném, và KHÔNG trả `chay: true`
      (fail-closed: thà chặn oan một lượt còn hơn nhận vô hạn).

### refNames
- [ ] T1.8 [R-3]: `refNames(7)` → `headRef` và `baseRef` đều chứa `7`, và hai chuỗi KHÁC nhau.
- [ ] T1.9 [R-3]: `refNames(7)` và `refNames(8)` cho bốn chuỗi đôi một khác nhau — không ref nào dùng chung
      giữa hai pull request, kể cả ref nhánh gốc.

## Tích hợp (đĩa, SQLite, khoá)

### hai đường dùng chung một quyết định
- [ ] T2.1 [R-1/R-2]: đường bấm tay và chế độ trực gọi CÙNG hàm — grep `server.ts`: không còn
      `runningCount() >= 2` viết tay, không còn `isPrRunning` trong điều kiện tự viết.
- [ ] T2.2 [Đời cũ]: lượt mồ côi đã được dọn thì không chiếm chỗ trần (ca có sẵn `kho-run.test.ts` — trích
      dẫn, không lặp).
- [ ] T2.3 [R-3]: `fetchAndRoute` dùng `refNames`, không nối chuỗi tay — grep `refs/checkmate` chỉ còn một chỗ.

## Ca đối kháng & hồi quy

- [ ] T3.1 [R-4 danh sách CHO PHÉP]: thêm một biến môi trường tên lạ mang bí mật (`NEW_SECRET_TOKEN`) vào
      nguồn → nó KHÔNG có trong môi trường tiến trình con. Đây là ca phân biệt danh-sách-cho-phép với
      danh-sách-cấm: với danh sách cấm, biến mới sẽ lọt.
- [ ] T3.2 [R-4 đối chứng]: biến nền cần cho toolchain (`PATH`, `HOME`…) vẫn có mặt — gác không được chặt
      tới mức làm hỏng lượt chạy test.
- [ ] T3.3 [R-4 án lệ]: `GITHUB_TOKEN` và `ANTHROPIC_API_KEY` không lọt vào môi trường tiến trình chạy
      test (án lệ đo được: bản trước truyền cả môi trường rồi cắt đúng một tên).
- [ ] T3.4 [Mutation]: đảo thứ tự hai gác · bỏ gác một-PR-một-lượt · đổi `ENV_CHO_PHEP` thành danh sách cấm
      → lưới đỏ đúng ca.

## Trục nhạy cảm

- [ ] T_bimat — T3.1 · T3.3: token và khoá API không lọt vào tiến trình chạy code của pull request; đây là
      một đường bảo vệ ⛔C3.
- [ ] T_failclosed — T1.3 · T1.7: đầu vào méo hoặc số đang chạy vượt trần → chặn, không bao giờ cho qua.
- [N/A] T_cong — không chạm cổng merge, vai, ba mức tự động.
- [ ] T_khongtincay — T3.1: code của pull request được chạy THẬT nên phải coi là code không tin được; môi
      trường của nó dựng bằng danh sách cho phép.
- [ ] T_hopdong — export mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T5.1 Không có — mọi thứ ở change này kiểm được bằng máy. (Ghi rõ để không ai tưởng bỏ sót.)
