## ADDED Requirements

### Requirement: Lưới quét source phải có CẶP fixture — cái sai đỏ, cái đúng xanh

Mọi hàm quét source dùng để cưỡng chế một luật kiến trúc SHALL có **hai** ca fixture:

- **fixture đối kháng** — một đầu vào vi phạm → hàm trả về **không rỗng**;
- **fixture đối chứng** — một đầu vào hợp lệ → hàm trả về **rỗng**.

Chỉ có fixture đối kháng là chưa đủ. Một phép quét quá rộng vẫn bắt được cái sai, nên nó qua fixture đối
kháng — rồi báo động giả trên code đang đúng, và người ta sẽ nới danh sách cho phép cho tới khi lưới thành
hình thức.

*Vì sao thành luật: đo được. Lưới `data-layer` bản đầu báo **sáu vi phạm** và không cái nào là thật — nó
quét cả route `POST` trong khi luật nói «chỉ ĐỌC», và cắt khối cứng 1500 ký tự nên dính sang route kế tiếp.
Nó qua fixture đối kháng dễ dàng, vì một phép quét quá rộng thì bắt được mọi thứ nó nhắm tới. Thứ bắt được
lỗi ấy là đọc code bằng mắt — không có cơ chế nào.*

#### Scenario: hàm quét chỉ có fixture đối kháng
- **WHEN** một hàm quét source có ca kỳ vọng «không rỗng» nhưng không có ca nào kỳ vọng «rỗng»
- **THEN** lưới ĐỎ, nêu tên hàm và file

#### Scenario: hàm quét có đủ cặp
- **WHEN** hàm có cả ca kỳ vọng rỗng lẫn ca kỳ vọng không rỗng
- **THEN** lưới xanh

### Requirement: Mutation là bắt buộc cho ca khoá một gác, và chạy ít nhất hai lần

Mỗi ca test khoá một **gác** — một điều kiện từ chối, một phép kiểm, một lớp bọc — SHALL có một đột biến
gỡ đúng gác ấy, và đột biến đó SHALL làm ca ĐỎ.

Đột biến SHALL được chạy **ít nhất hai lần**, và kết quả hai lần phải nhất quán. Một lần chạy không đủ để
kết luận: đo được ở `error-message-egress-gate`, một lần chạy báo «1 failed» hoá ra là flaky, và suýt dẫn
tới kết luận rằng đột biến bị bắt trong khi không.

Đột biến SHALL được **kiểm chứng là đã áp dụng** trước khi đọc kết quả. Một lần sửa file thất bại cho ra
«không ca nào đỏ», trông y hệt «ca không load-bearing» — đo được ở `identifier-language-gate`, nơi `sed`
không sửa được file và suýt dẫn tới kết luận rằng ca ấy vô dụng.

*Giới hạn phải khai: mutation chỉ giết ca ĐÃ CÓ. Nó không phát hiện được bề mặt chưa ai viết ca — xem
requirement dưới.*

#### Scenario: ca khoá một gác
- **WHEN** một ca mới khẳng định một gác từ chối đúng
- **THEN** phải có đột biến gỡ gác ấy làm ca đỏ, chạy hai lần nhất quán

#### Scenario: đột biến không giết được ca nào
- **WHEN** một đột biến chạy mà không ca nào đỏ
- **THEN** phải phân biệt hai khả năng trước khi kết luận: đột biến không được áp dụng, hay ca không
  phân biệt được hai hiện thực

### Requirement: Gác chạy xuyên suốt phải ĐẾM bề mặt bằng máy trước khi viết ca

Change nào dựng một gác chạy **xuyên suốt** — bọc đường trả dữ liệu, bọc lời gọi, thêm middleware — SHALL
ghi vào tài liệu thiết kế **lệnh đếm và con số** của mọi bề mặt mà gác phải phủ, chạy trước khi viết ca.

Liệt kê bề mặt bằng trí nhớ là chỗ hỏng đã xảy ra: gác bí mật response bọc `res.json` và `res.write`, bỏ sót
`res.send` — **10 chỗ, tức mọi màn hình**. Mười sáu ca test xanh, năm đột biến giết đúng ca, và máy chủ thật
**không chặn gì**. Mutation không cứu được vì nó chỉ giết ca đã có; bề mặt chưa ai viết ca thì nó không biết.

Với gác chạy xuyên suốt, tài liệu kiểm tay SHALL có một mục **chạy thật một lượt** và mục ấy MUST NOT được
tick nếu chưa chạy. Ca test chỉ kiểm được bề mặt mà người viết **nghĩ ra**; máy chủ thật kiểm mọi bề mặt nó
có.

#### Scenario: change dựng gác xuyên suốt
- **WHEN** thiết kế một gác bọc đường trả dữ liệu
- **THEN** tài liệu thiết kế mang lệnh đếm và con số của từng bề mặt

#### Scenario: mục kiểm tay
- **WHEN** gác chạy trên mọi response hoặc mọi lời gọi
- **THEN** tài liệu ca test có mục «chạy thật một lượt», và mục ấy chỉ được tick sau khi đã chạy

### Requirement: Ba tầng này KHÔNG đóng kín, và điều đó phải được khai

Ba yêu cầu trên bắt được ba loại lỗi lưới đã xảy ra thật. Chúng MUST NOT được đọc thành «lưới từ nay là
đúng».

Loại thứ tư không cơ chế nào bắt được: **lưới đúng nhưng luật sai** — spec khai một điều mà điều ấy không
nên là luật, hoặc khai đúng một điều đã lỗi thời. Chỉ người đọc bắt được.

Khai điều này ra là một phần của luật, không phải lời rào đón: một hệ thống kiểm tra tự tuyên bố đã kín sẽ
làm người ta thôi đọc — và thôi đọc là đúng chỗ loại thứ tư sống.

#### Scenario: đọc lại capability này
- **WHEN** ai đó dựa vào ba tầng để kết luận lưới của mình đã đủ
- **THEN** requirement này nói rõ ba tầng chỉ phủ ba loại đã biết, và loại thứ tư vẫn cần người đọc
