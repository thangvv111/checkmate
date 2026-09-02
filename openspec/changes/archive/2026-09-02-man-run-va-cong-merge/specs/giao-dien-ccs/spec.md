## MODIFIED Requirements

### Requirement: Chuyển cảnh mượt phải thoái hoá sạch, không thành phụ thuộc

Điều hướng giữa các màn SHALL dùng cơ chế chuyển cảnh **sẵn có của trình duyệt**, khai bằng CSS và
khai báo tĩnh — KHÔNG thêm thư viện, build step, hay router phía máy khách.

Trình duyệt không hỗ trợ MUST hiển thị và hoạt động **y hệt như khi không có cơ chế đó**: mất hiệu
ứng là chấp nhận được, mất nội dung hoặc mất chức năng thì không. Cảm giác mượt là thứ trang trí; nội
dung mới là thứ sản phẩm nợ người dùng.

**Trạng thái phía trình duyệt** SHALL chỉ dùng cho thứ vốn dĩ thoáng qua — vị trí đang phát và tốc độ
của một bản trình diễn là ví dụ được phép. Nó MUST NOT giữ thứ mà máy chủ chịu trách nhiệm: nội dung
trang, kết quả phán quyết, hay điều kiện của một hành động cổng. Ranh giới là: tắt kịch bản đi thì
người dùng mất một tiện nghi, không mất một sự thật.

*(Bản trước cấm mọi trạng thái phía trình duyệt. Cấm sạch như vậy hoá ra chặn nhầm chỗ đúng: nhịp
phát của một bản trình diễn không có chỗ nào khác để sống ngoài trình duyệt, và đẩy nó lên URL —
cách bản cũ làm — biến một chế độ xem thành một địa chỉ, rồi từ đó biến một trang xem-lại thành trang
có nút merge bấm được. Ranh giới đúng không phải «có state hay không» mà «state đó giữ tiện nghi hay
giữ sự thật».)*

#### Scenario: trình duyệt hỗ trợ chuyển cảnh
- **WHEN** người dùng chuyển giữa hai màn trên trình duyệt có hỗ trợ
- **THEN** chuyển cảnh chạy, và trang đích vẫn là trang server dựng như thường

#### Scenario: trình duyệt KHÔNG hỗ trợ
- **WHEN** người dùng chuyển màn trên trình duyệt chưa hỗ trợ
- **THEN** điều hướng vẫn đúng, nội dung đầy đủ, không lỗi — chỉ không có hiệu ứng

#### Scenario: không sinh phụ thuộc mới
- **WHEN** kiểm tra khai báo phụ thuộc của ứng dụng web
- **THEN** không có gói nào được thêm cho việc chuyển cảnh

#### Scenario: tắt kịch bản khi đang có trạng thái phía trình duyệt
- **WHEN** một màn dùng trạng thái phía trình duyệt và người dùng tắt kịch bản
- **THEN** màn đó vẫn hiện đủ nội dung và đủ chức năng của trạng thái mặc định; chỉ tiện nghi biến mất

## ADDED Requirements

### Requirement: Một hành động một chiều không được sống trong chế độ xem-lại

Màn nào có hành động **một chiều** — merge, đóng pull request, xoá — SHALL không cho thực hiện hành
động đó khi màn đang ở một chế độ xem-lại hay trình diễn. Chế độ đó MUST tự nói ra là mình đang xem
lại, chứ không chỉ vô hiệu hoá nút trong im lặng.

Điều kiện chỉ-đọc SHALL đọc được thẳng từ trạng thái của màn. Nó MUST NOT là một tham số phải nhớ
truyền qua nhiều lớp hàm — cái gì phải nhớ thì sẽ có ngày quên, và ngày đó không có lỗi nào nổ ra.

#### Scenario: đang xem lại thì hành động một chiều bị khoá
- **WHEN** người dùng đang ở chế độ xem-lại của một màn có hành động một chiều
- **THEN** hành động đó không thực hiện được, và màn nói rõ vì sao

#### Scenario: thoát chế độ xem-lại
- **WHEN** người dùng thoát chế độ xem-lại
- **THEN** hành động hoạt động trở lại bình thường
