# giao-dien-ccs Specification

## Purpose
TBD - created by archiving change dong-bo-giao-dien-ccs. Update Purpose after archive.

## Requirements

### Requirement: Token có đúng một nguồn, và hai họ token không được trộn

Giao diện SHALL lấy mọi màu, phông, khoảng cách, bo góc từ **biến token**, không hard-code giá trị.
Hệ thống có **hai họ token, vai khác nhau**, và MUST NOT trộn:

- **Token hệ thống (Modernist)** — nền, chữ, accent, ramp trung tính, divider, shadow. Đây là look của
  design system; đổi look là đổi ở đây.
- **Semantic của CheckMate** — PASS/jade · FAIL/crimson · medium/amber. Ba màu này mang **nghĩa
  nghiệp vụ**, không phải trang trí: chúng nói verdict và mức severity.

Accent của hệ thống và màu FAIL đều là sắc đỏ nhưng MUST giữ biến riêng. Gộp chúng làm một là để một
lần đổi look kéo theo đổi nghĩa của verdict — nút «bấm đi» và nhãn «hỏng rồi» sẽ cùng đổi màu.

Bộ semantic SHALL chỉ dùng cho **kết quả của một phép kiểm** — đạt, hỏng, hoặc cảnh báo. Trạng thái của
giao diện — đang chọn · đang dùng · đang xem · vừa lưu · một con số đếm — SHALL dùng accent và ramp trung
tính, MUST NOT dùng bộ semantic.

Giao diện MUST NOT khai **bí danh** nối một tên thuộc họ này sang một token thuộc họ kia. Cấm hard-code
mã màu là chưa đủ: một bí danh đi qua tên biến chứ không qua mã màu, nên nó lọt qua mọi phép cấm hex mà
vẫn trộn đúng hai họ.

*Vì sao phải cấm riêng bí danh — đo được: bản trước của luật này chỉ cấm hard-code, và một khối bí danh
(`--teal: var(--pass)`, `--amber: var(--medium)`, …) đã đưa **38 chỗ** trong giao diện đi vòng qua nó.
Trong đó có tag «đang chọn», tag «đang dùng», mục nav đang mở, card «đã lưu» và một con số đếm — tất cả
đang tô bằng đúng màu PASS. Lưới xanh suốt thời gian đó vì nó soi mã màu, mà chỗ hỏng không có mã màu nào.*

*Hướng rò cũng đáng ghi: scenario «đổi accent không đổi nghĩa verdict» canh một chiều, còn bí danh làm
hỏng chiều KIA — đổi màu PASS sẽ đổi màu của «đang chọn».*

#### Scenario: hard-code màu ngoài bộ semantic
- **WHEN** một file giao diện viết thẳng mã màu không thuộc bộ semantic đã khai
- **THEN** lưới token ĐỎ, nêu file và mã màu đó

#### Scenario: semantic được phép hard-code
- **WHEN** một file dùng đúng hex của PASS/FAIL/medium đã khai trong bộ semantic
- **THEN** lưới token XANH — gói design khai đây là hard-code có chủ đích

#### Scenario: đổi accent không đổi nghĩa verdict
- **WHEN** giá trị accent của hệ thống đổi
- **THEN** màu PASS/FAIL/medium giữ nguyên

#### Scenario: đổi màu PASS không đổi vẻ của trạng thái giao diện
- **WHEN** giá trị của màu PASS đổi
- **THEN** tag «đang chọn», tag «đang dùng», mục điều hướng đang mở và card «đã lưu» giữ nguyên vẻ —
  không chỗ nào trong số đó lấy màu từ bộ semantic

#### Scenario: khai bí danh trộn hai họ
- **WHEN** một biến mang tên thuộc họ look được khai bằng một token thuộc bộ semantic (hoặc ngược lại)
- **THEN** lưới token ĐỎ, nêu tên biến và token nó trỏ tới

#### Scenario: bí danh trong CÙNG một họ
- **WHEN** một biến look được khai bằng một token look khác (ví dụ tên cũ nối vào tên mới cùng họ)
- **THEN** lưới token XANH — đổi tên biến trong cùng một họ không trộn nghĩa gì

### Requirement: Vỏ ứng dụng dùng chung, sidebar khai đủ mục

Mọi trang SHALL dựng qua **một hàm vỏ dùng chung**: header có rule 2px dưới, sidebar 210px có rule 2px
phải, vùng nội dung giới hạn bề rộng. Sidebar SHALL khai **đủ mục điều hướng của sản phẩm**, kể cả mục
mà màn phía sau chưa dựng xong.

Vỏ dùng chung là điều kiện để «làm đến đâu cập nhật đến đó»: đổi vỏ một lần thì mọi trang nhận vỏ mới
ngay, kể cả trang chưa dựng lại nội dung. Trang nào tự dựng vỏ riêng thì nó rơi lại phía sau trong im
lặng.

#### Scenario: mọi trang đi qua vỏ chung
- **WHEN** một trang mới được thêm
- **THEN** nó dựng qua hàm vỏ chung; lưới vỏ ĐỎ nếu có trang tự dựng thẻ `html`/`body` riêng

#### Scenario: mục sidebar trỏ tới màn chưa dựng
- **WHEN** người dùng bấm một mục điều hướng mà màn phía sau chưa có
- **THEN** màn đó hiện **nói thẳng là chưa dựng** kèm lý do — KHÔNG lỗi 404, KHÔNG trang trắng, và
  KHÔNG giả vờ có dữ liệu

#### Scenario: mục đang xem được đánh dấu
- **WHEN** đang ở một màn
- **THEN** mục tương ứng trong sidebar hiển thị trạng thái đang-chọn khác với các mục còn lại

### Requirement: Trạng thái rỗng và trạng thái lỗi phải nói được cách sửa

Màn Dashboard SHALL phân biệt **rỗng** với **hỏng**, và mỗi loại nói một câu khác nhau:

- **Rỗng** (không có pull request nào chờ) — nói rõ đây là trạng thái bình thường.
- **Hỏng** (không đọc được pull request vì thiếu quyền) — nêu nguyên nhân VÀ **đường sửa cụ thể**, kèm
  lối đi thẳng tới nơi sửa.

Một màn rỗng trông giống một màn hỏng là chỗ người dùng ngồi đợi thứ không bao giờ tới.

#### Scenario: hàng đợi rỗng
- **WHEN** repo đang chọn không có pull request nào chờ chấm
- **THEN** màn nói hàng đợi sạch — không hiện như lỗi

#### Scenario: thiếu quyền đọc repo
- **WHEN** không đọc được danh sách pull request vì repo chưa có chìa riêng
- **THEN** màn hiện cảnh báo nêu **cả nguyên nhân lẫn cách sửa**, kèm lối đi tới màn cấu hình

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

### Requirement: Vỏ ứng dụng phải dùng được ở màn hẹp, và không đánh đổi lấy JavaScript

Trang SHALL KHÔNG cuộn ngang ở mức **trang** tại bất kỳ bề rộng nào từ **320px** trở lên. Nội dung rộng
(bảng, khối code, dải hành vi) vẫn cuộn **trong chính khối của nó** — thứ bị cấm là cuộn ngang của cả tài
liệu.

Header SHALL xuống dòng được khi không đủ chỗ. Nhãn dài do dữ liệu người dùng quyết định — tên
`owner/repo`, tên đăng nhập — SHALL bị **cắt bằng ellipsis** thay vì đẩy rộng cả hàng; giá trị đầy đủ vẫn
phải đọc được ở nơi khác (thuộc tính `title`, hoặc danh sách xổ xuống).

Điều hướng SHALL đổi hình ở màn hẹp thay vì giữ một cột cố định: cột 210px cộng một viewport 375px để lại
cột nội dung 165px, và một cột 165px thì không đọc được. Sau khi đổi hình, **đủ mọi mục** vẫn phải tới
được, và **mục đang mở phải nhìn thấy được** mà không phải cuộn đi tìm.

Việc đổi hình ấy MUST NOT đòi JavaScript. Vỏ hôm nay chạy được khi JS tắt, và một menu bật/tắt bằng JS
đổi tính chất đó lấy một bố cục gọn hơn.

MUST NOT giấu bớt mục điều hướng để hết tràn. Giấu bớt là cách nhanh nhất làm con số tràn về 0, và nó lấy
mất đường tới đúng những màn người vận hành cần khi đang cầm điện thoại.

*Vì sao viết thành luật thay vì sửa lặng lẽ: đo được ở 375px trên bốn màn — Dashboard, Lịch sử, Sổ cái,
Thư viện probe — tất cả đều `scrollWidth` 683–685px với 22–45 phần tử tràn. Đây không phải lỗi của màn
nào; nó là một tính chất của vỏ, và một tính chất không được khai thì lần sửa vỏ sau sẽ đạp lên nó mà
không ai biết.*

#### Scenario: mở một màn bất kỳ ở bề rộng hẹp
- **WHEN** mở bất kỳ màn nào ở bề rộng 375px
- **THEN** tài liệu không cuộn ngang: `scrollWidth` không vượt bề rộng khung nhìn

#### Scenario: tên repo dài trên header
- **WHEN** repo đang chọn có tên dài
- **THEN** nút chuyển repo cắt bằng ellipsis, không đẩy header rộng ra; tên đầy đủ vẫn đọc được ở chỗ khác

#### Scenario: điều hướng ở màn hẹp
- **WHEN** vỏ đổi hình ở màn hẹp
- **THEN** đủ mọi mục điều hướng vẫn tới được, và mục đang mở nhìn thấy được ngay

#### Scenario: JavaScript bị tắt
- **WHEN** trình duyệt tắt JavaScript và mở một màn ở bề rộng hẹp
- **THEN** bố cục vẫn đúng và điều hướng vẫn dùng được — không mục nào cần một cú bấm JS mới hiện ra

#### Scenario: nội dung rộng hơn khung
- **WHEN** một bảng hoặc khối code rộng hơn cột nội dung
- **THEN** nó cuộn ngang TRONG khối của nó, và trang vẫn không cuộn ngang
