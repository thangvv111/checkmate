# Security — đồng bộ giao diện theo gói CCS

## Bề mặt thay đổi

Đợt này đổi **cách hiển thị**, không đổi dữ liệu, không đổi đường quyết định. Nhưng nó chạm **mọi
trang**, trong đó có những trang bày ra token, danh tính và cổng merge — nên rủi ro không nằm ở tính
năng mới mà ở chỗ **đổi bề mặt làm lộ thứ trước đây được che**.

## Rà theo trục

**Bí mật không rò (⛔C3).** Header mới có **repo switcher**, và các màn cấu hình bày token dạng che.
Rủi ro thật: dựng lại vỏ mà chép nhầm giá trị thô thay vì giá trị đã che. `tsc` không bắt được —
chuỗi nào cũng là chuỗi. Ca T5.2 canh: token hiện dạng che trên **mọi** màn có nó, kể cả header. Và
bản che phải vẫn **phân biệt được hai giá trị khác nhau** như luật hiện hành đòi.

**Danh tính và cổng (⛔C1).** Header có user menu, sidebar có lối vào Cấu hình. Đợt này **không đổi**
quyền hay đường quyết định — chỉ đổi chỗ đặt nút. Ca T5.1 giữ: bộ ca phân loại và bộ ca cổng chạy lại
và xanh **mà không sửa kỳ vọng**; sửa kỳ vọng để test xanh là cách quen thuộc nhất để một gác chết
trong im lặng.

**Nội dung ngoài đưa vào HTML.** Vỏ mới hiển thị thêm dữ liệu ngoài: tên repo, tên nhánh, tiêu đề PR,
tên tác giả — tất cả đến từ GitHub, tức **dữ liệu không tin được**. Mọi chỗ chèn phải đi qua hàm
escape sẵn có. Đây là chỗ dễ sót nhất khi dựng lại markup, vì bản prototype của gói viết `{{ }}` và
runtime của nó tự escape — chép sang chuỗi HTML thì không ai escape hộ.

**Prerender là một lời gọi HTTP thật.** Speculation Rules khiến trình duyệt **tải trước** trang khi
chuột đi vào link. Hai hệ quả phải cân:
- Nó gửi request thật kèm cookie phiên → chỉ prerender **đường nội bộ cùng origin**, không bao giờ
  prerender liên kết ra ngoài.
- Nó chạy trước khi người dùng bấm → **không được prerender đường có tác dụng phụ**. Mọi hành động
  đổi trạng thái (merge, trả về dev, xoá) đều là `POST`, và speculation rules chỉ áp cho điều hướng
  `GET`, nên ranh giới sẵn có che được chuyện này — nhưng phải khai tường minh trong luật prerender
  chứ không dựa vào may.

**Font tải từ Google Fonts.** Thêm một origin ngoài vào đường tải trang. Không mang dữ liệu người dùng
đi (chỉ là request font), nhưng nó là một phụ thuộc mạng mới: trang phải đọc được khi nó hỏng (T4.1).
Nếu về sau muốn bỏ hẳn phụ thuộc ngoài thì tự host font — ghi nợ, không làm ở đợt này.

**View Transitions không tạo bề mặt tấn công mới** — nó là CSS thuần, không chạy script, không đọc
dữ liệu. Rủi ro duy nhất là nó **che mất một thay đổi trạng thái** bằng hiệu ứng chuyển cảnh, khiến
người dùng không thấy điều gì vừa xảy ra. Giữ hiệu ứng ngắn và không dùng nó cho phản hồi sau hành
động ở cổng.

## Kết luận

Không có đường mới nào tới bí mật hay quyết định cổng. Hai rủi ro thật, đều là *rủi ro của việc dựng
lại markup*, không phải của tính năng: **quên escape dữ liệu GitHub** và **chép giá trị thô thay vì
giá trị đã che**. Cả hai `tsc` không bắt được — nên chúng có ca test riêng, và đợt này bắt buộc mở
thật từng màn để nhìn.
