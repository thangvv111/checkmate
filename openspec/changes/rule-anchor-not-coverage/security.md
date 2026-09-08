## S1. Bí mật & rò rỉ

- ⚠️ S1.1 — change làm **địa chỉ đơn vị luật** của repo đích xuất hiện ở nhiều bề mặt hơn (log, dòng tóm
  tắt CLI, bảng số liệu). Địa chỉ ấy là **tiêu đề trong file spec** của repo đích — nội dung repo, không
  phải bí mật, và nó **đã** nằm trong `luat_da_phu` trên verdict từ trước. Change chỉ bày thứ đã lưu.
- ⛔ S1.2 — **bề mặt CÔNG KHAI không đổi.** Comment pull request đi qua `dongFinding`; change này không
  chạm đường ấy. Tên đơn vị luật vẫn chỉ hiện ở màn run (sau đăng nhập), log máy chủ và CLI.
- ✅ S1.3 — không giá trị người dùng gõ tay nào đi qua đây.

## S2. Danh tính, phiên, vai

- N/A — không chạm danh tính, không thêm route.

## S3. Cổng & quyền của máy (⛔C1)

- ✅ S3.1 — không chạm cổng merge, không chạm `decideResult`, không đổi verdict PASS/FAIL. Change chỉ đổi
  **cách bày một con số**, không đổi con số nào tham gia quyết định.

## S4. Dữ liệu không tin cậy (⛔C4)

- ✅ S4.1 — `luat_da_phu` chứa **địa chỉ tiêu đề** lấy từ file spec của repo đích, tức **dữ liệu ngoài**.
  Trên giao diện nó đi qua `escHtml` trước khi vào HTML — đã kiểm tại chỗ sửa. Trên log và CLI nó là văn
  bản thuần, không nội suy vào lệnh nào.
- ✅ S4.2 — không thêm bề mặt nhận dữ liệu ngoài; nguồn vẫn là `spec-units.ts` như trước.

## S5. Sandbox & thực thi

- N/A — không chạm container, mount, mạng, hay lệnh chạy.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — **hình dạng dữ liệu KHÔNG đổi.** `luat_da_phu: string[]` và `luat_tong: number` giữ nguyên
  trên verdict. Không đường ghi mới, không đường di trú, verdict đời cũ đọc y như trước.
- ✅ S6.2 — vì thế lưới `doc-du-lieu-cu` không phải sửa, và nó vẫn xanh.

## S7. Fail-closed & bất biến verdict (⛔C2)

- ✅ S7.1 — **trục chính, và nó cùng họ với ⛔C2 nhưng ngược dấu.** ⛔C2 cấm «không chứng minh được là
  sai» bị đọc thành «đã chứng minh là đúng». Ở đây là mặt kia của cùng đồng xu: **«không đo được điều gì»
  bị bày thành «đo được, và kết quả tệ»**. Cả hai đều là người đọc tin vào thứ dữ liệu không nói.

  Con số `1/195` không sai về số học — nó sai về **điều nó gợi ra**. Và một công cụ tồn tại để bắt tài
  liệu không gợi sai thì không được tự làm đúng việc ấy.
- ✅ S7.2 — vế **«không đo được» ≠ `0`** giữ nguyên, cả ba bề mặt. Đó vẫn là phân biệt đúng và change
  không đụng vào.
- ✅ S7.3 — không nhánh quyết định nào đổi. Số luật đã neo chưa bao giờ tham gia `decideResult`, và sau
  change vẫn không.

## S8. Leo quyền & cô lập

- N/A — không chạm bề mặt thực thi.

## Notes

- **Khuyến khích ngược là phần đáng lo hơn con số sai.** Một tỉ lệ mà repo viết ÍT luật hơn thì điểm cao
  hơn, đặt trong một công cụ tồn tại để bắt người ta viết luật rõ hơn, là một tín hiệu **chống lại chính
  mục đích của sản phẩm**. Nó chưa kịp làm hại vì chưa ai tối ưu theo nó — nhưng số liệu thì luôn bị tối
  ưu theo, sớm hay muộn.
- **Change này BỎ một câu trả lời sai, không dựng câu trả lời đúng.** Câu hỏi «lượt chấm có kiểm những
  luật đáng kiểm không» vẫn chưa ai trả lời được, và nợ 5.1 ghi đúng điều đó thay vì để người đọc tưởng
  đã xong.
