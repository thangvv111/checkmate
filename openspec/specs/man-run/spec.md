# man-run Specification

## Purpose
TBD - created by archiving change man-run-va-cong-merge. Update Purpose after archive.

## Requirements

### Requirement: Lượt chấm đã kết thúc phải đọc được mà không cần chạy lại nó

Trang của một lượt chấm đã kết thúc SHALL được dựng từ dữ liệu đã lưu, ngay ở lần trả về đầu tiên.
Nội dung MUST NOT phụ thuộc vào việc trình duyệt chạy được kịch bản hay giữ được một kết nối luồng.

Một lượt đã xong là **dữ liệu tĩnh**: verdict, finding, số liệu probe đều đã nằm trên máy chủ. Giao
nó như luồng trực tiếp bắt người đọc trả giá cho một tính chất không còn đúng nữa — mỗi lần mở lại
phát lại toàn bộ dòng sự kiện, mất kết nối là hỏng, và không có kịch bản là không có gì.

Luồng sự kiện SHALL chỉ dùng cho lượt **đang chạy**.

#### Scenario: mở một lượt đã kết thúc
- **WHEN** người dùng mở trang của một lượt chấm đã kết thúc
- **THEN** phản hồi đầu tiên đã chứa đủ verdict, danh sách finding và bảng số liệu — không cần lượt
  gọi thứ hai nào để có nội dung

#### Scenario: không chạy được kịch bản
- **WHEN** trình duyệt không chạy kịch bản
- **THEN** trang của lượt đã kết thúc vẫn hiện đủ nội dung và mọi liên kết vẫn đúng

#### Scenario: lượt đang chạy vừa kết thúc
- **WHEN** một lượt đang được theo dõi trực tiếp chuyển sang trạng thái kết thúc
- **THEN** cổng merge hiện ra ngay tại chỗ; hệ thống MUST NOT yêu cầu người dùng tự tải lại trang

### Requirement: Trình diễn là một chế độ xem, và cổng phải chỉ-đọc trong đó

Hệ thống SHALL cho phép phát lại một lượt đã kết thúc theo nhịp thời gian gốc, như một **chế độ xem**
chọn từ trong trang. Chế độ này MUST NOT là một địa chỉ riêng, và nhịp phát MUST được điều khiển ở
phía người xem: đổi tốc độ và tạm dừng giữa chừng, không phải tải lại trang.

Trong chế độ trình diễn, cổng merge SHALL chỉ-đọc: mọi hành động đổi trạng thái đều không thực hiện
được và nói rõ vì sao.

Đây là vá một lỗi, không phải thêm một tinh tế: chế độ phát lại được dựng cho lúc trình bày trước
người khác, mà đó đúng là lúc một cú bấm nhầm gây hậu quả một chiều.

#### Scenario: đang trình diễn thì cổng bị khoá
- **WHEN** người dùng đang xem một lượt ở chế độ trình diễn
- **THEN** cổng merge hiển thị ở dạng chỉ-đọc, nói rõ đây là bản phát lại; không có hành động cổng
  nào thực hiện được từ đó

#### Scenario: đổi tốc độ giữa chừng
- **WHEN** người dùng đổi tốc độ trong lúc đang trình diễn
- **THEN** nhịp đổi ngay tại chỗ, không tải lại trang và không mất vị trí đang xem

#### Scenario: thoát trình diễn
- **WHEN** người dùng thoát chế độ trình diễn
- **THEN** trang trở lại trạng thái kết thúc đầy đủ, và cổng merge hoạt động lại bình thường

### Requirement: Verdict phải khai cả phần yếu của chính lượt chấm

Bảng số liệu của verdict SHALL hiện **vùng xám probe** — số probe nghi vấn, bỏ qua, thất lạc, nghi
lỗi có sẵn, và **bị cách ly** — bên cạnh các số thuận lợi (kế hoạch, ghi nhận, pass, hồi quy).

Bốn số đó nói lượt chấm này **không nhìn thấy gì**. Giấu chúng đi thì một verdict PASS mỏng trông
giống hệt một verdict PASS dày, và người đọc mất đúng thông tin cần để biết nên tin đến đâu.

Bảng số liệu SHALL khai thêm **nguồn luật của lượt chấm**: engine lấy luật từ đâu, và đọc được bao
nhiêu đơn vị. Khi không đọc được đơn vị nào, độ phủ SHALL khai là **không đo được** và MUST NOT khai
là `0` — `0` nghĩa là đã đếm và không probe nào neo được, còn không-đo-được nghĩa là **không có mẫu
số**. Cùng một chữ số cho hai tình trạng đó là để người đọc tin nhầm.

*(Bản trước chỉ canh vùng xám của probe. Nhưng độ phủ luật cũng có một vùng xám của riêng nó, và nó
sâu hơn: probe có thể ghi nhận đủ, pass đủ, mà toàn bộ phép đo «phủ được bao nhiêu luật» vẫn vô nghĩa
vì repo không có luật nào đọc được. Cái đó không hiện ra ở bốn số cũ.)*

#### Scenario: verdict có vùng xám khác không
- **WHEN** một lượt chấm có probe rơi vào nghi vấn, bỏ qua, thất lạc hoặc nghi lỗi có sẵn
- **THEN** bảng số liệu hiện đủ bốn số đó, không gộp và không lược bỏ

#### Scenario: vùng xám bằng không
- **WHEN** không probe nào rơi vào bốn nhóm trên
- **THEN** bảng vẫn khai các mục đó ở giá trị không — im lặng và số không là hai điều khác nhau

#### Scenario: lượt chấm có probe bị cách ly
- **WHEN** một lượt chấm loại probe vì lỗi nạp rồi chạy tiếp
- **THEN** bảng số liệu hiện số probe bị cách ly, cạnh các số vùng xám khác — một lượt chấm mất phép thử
  không được trông giống một lượt chấm đủ phép thử

#### Scenario: lượt chấm không có luật đối chiếu
- **WHEN** engine không đọc được đơn vị luật nào từ repo đích
- **THEN** bảng số liệu khai nguồn luật là không có, và độ phủ khai là **không đo được** — không phải `0`

#### Scenario: lượt chấm có luật đối chiếu
- **WHEN** engine đọc được các đơn vị luật
- **THEN** bảng khai nguồn đã lấy và số đơn vị đọc được, cùng độ phủ tính trên số đó

### Requirement: Kết quả hai nhánh phải bày dạng ĐỐI CHIẾU, không phải hai bãi dữ liệu

Khi một lượt chấm chạy probe trên cả hai nhánh, hệ thống SHALL bày kết quả dưới dạng **đối chiếu đã
phân loại**: mỗi probe đổi trạng thái nói rõ nó đổi theo chiều nào và điều đó nghĩa là gì. Probe pass
ở CẢ HAI nhánh SHALL chỉ hiện dưới dạng một con số đếm, không liệt kê từng cái.

Mỗi dòng đối chiếu SHALL nói probe đó neo vào **luật nào** — một probe là phép thử của một luật, nên
luật là câu trả lời cho «probe này tồn tại để làm gì». Mô tả dài hơn SHALL để ở lớp xem-thêm, không
chiếm chỗ trên dòng.

Nhãn trạng thái trên mỗi dòng MUST là nhãn máy đã phong khi phân loại, KHÔNG được tính lại ở chỗ hiển
thị: hai nơi cùng tính một thứ là hai nơi sẽ lệch nhau, và bên hiển thị lệch thì người đọc tin nhầm.

Vì sao thành yêu cầu: bản trước đổ ra hai dòng, mỗi dòng liệt kê mọi probe của một nhánh dạng
`P1·8213=p P2·bc87=p …`. Người đọc phải tự so từng cặp trong hàng chục mã để tìm ra thứ đã đổi —
trong khi máy đã so xong và đã phong nhãn cho từng probe. Đó là nguyên tắc của chính sản phẩm này bị
vi phạm ngay trong log của nó: **máy phân loại, người đọc kết luận**.

#### Scenario: probe đổi trạng thái giữa hai nhánh
- **WHEN** một probe cho kết quả khác nhau trên nhánh PR và nhánh gốc
- **THEN** đối chiếu bày nó thành một dòng riêng, nói chiều đổi, luật nó neo vào, và kết luận máy đã
  phong cho nó

#### Scenario: probe pass ở cả hai nhánh
- **WHEN** một probe pass trên cả nhánh PR lẫn nhánh gốc
- **THEN** nó KHÔNG được liệt kê thành dòng riêng; nó chỉ vào con số đếm — nó không nói gì về PR này

#### Scenario: hỏi chi tiết một probe
- **WHEN** người dùng hỏi tới một dòng đối chiếu (trỏ vào mã probe hoặc luật)
- **THEN** mô tả đầy đủ hơn của probe hiện ra, mà không làm dòng đó dài thêm khi không hỏi

### Requirement: Chỗ checker không nhìn tới phải nói ra, không cắt âm thầm

Khi có file mã nguồn bị loại khỏi diff vì vượt trần kích thước, trang SHALL hiện cảnh báo **vùng mù
của diff** ở vị trí đọc được trước khi đọc verdict, nêu rõ verdict không nói gì về những file đó.

Khi nhánh gốc không chạy được probe nào, trang SHALL hiện cảnh báo **không có đối chứng** ngay đầu
phần chạy probe, nói rõ probe đỏ khi đó chỉ là nghi vấn chứ không thành hồi quy.

Hai cảnh báo này đổi **cách đọc** verdict, nên chúng MUST đứng trước verdict chứ không thành chú
thích ở cuối.

#### Scenario: file mã nguồn bị loại vì diff quá lớn
- **WHEN** một lượt chấm loại file mã nguồn khỏi diff vì vượt trần kích thước
- **THEN** trang hiện cảnh báo vùng mù nêu số file và nói rõ verdict không phủ chúng

#### Scenario: nhánh gốc không có đối chứng
- **WHEN** nhánh gốc không chạy được probe nào
- **THEN** trang hiện cảnh báo không-có-đối-chứng trước phần chạy probe

#### Scenario: file sinh tự động bị loại
- **WHEN** file bị loại chỉ thuộc nhóm sinh tự động (lockfile, kết quả build)
- **THEN** việc loại vẫn được ghi ra, nhưng KHÔNG dựng thành cảnh báo — nó không đổi cách đọc verdict

### Requirement: Quyết định thay đổi thư viện probe phải bày ra, phân biệt hai loại

Khi một lượt chấm làm thay đổi thư viện probe, trang SHALL bày các quyết định đó, và MUST phân biệt
**không nạp vào** (probe mới bị bỏ) với **gỡ khỏi thư viện** (probe đã có, nay xoá).

Hai việc có hậu quả khác hẳn nhau: một cái là không thêm tài sản, cái kia là **mất** tài sản đã có.
Dùng chung một ký hiệu là để người đọc lướt qua cái đắt hơn.

#### Scenario: lượt chấm gỡ probe khỏi thư viện
- **WHEN** một lượt chấm gỡ một probe đã có khỏi thư viện
- **THEN** trang bày dòng đó ở dạng phân biệt được với dòng «không nạp vào», kèm lý do

#### Scenario: thư viện không đổi
- **WHEN** lượt chấm không làm thay đổi thư viện
- **THEN** khối này không hiện — không có gì để nói thì không chiếm chỗ

### Requirement: Cổng merge phải khai rõ khi nó không tồn tại, và đòi lý do khi trả về dev

Trên lượt chấm **không gắn pull request**, trang SHALL nói thẳng là lượt này không có cổng merge.
Khối cổng MUST NOT biến mất im lặng.

Hành động **trả về dev** SHALL đòi ghi chú, và MUST NOT thực hiện được khi ghi chú trống. Trả về dev
mà không nói vì sao thì dev không biết vá gì, và bản thân hành động đó đi vào sổ chỉ-ghi-thêm.

#### Scenario: lượt chấm tài liệu rời
- **WHEN** người dùng mở một lượt chấm không gắn pull request
- **THEN** trang nói rõ lượt này không có cổng merge, thay vì bỏ trống chỗ đó

#### Scenario: trả về dev với ghi chú trống
- **WHEN** người dùng cố trả về dev mà chưa viết ghi chú
- **THEN** hành động không thực hiện được, và giao diện nói rõ ghi chú là bắt buộc

### Requirement: Verdict đã hết hiệu lực phải nói ra TRƯỚC khi người dùng bấm

Khi pull request đã có commit mới hơn commit mà verdict ghim, trang SHALL nói ra điều đó **trước** mọi
hành động cổng, và cổng merge SHALL khoá kèm lối đi thẳng tới việc chấm lại commit mới.

Hệ đã chặn đúng ở đường ghi: máy chủ so lại head trước khi merge, và gửi SHA kỳ vọng lên GitHub để
GitHub tự từ chối nếu head đã đổi. Yêu cầu này không thêm một lớp chặn nào — nó vá chỗ **nói**: hôm
nay người dùng mở một lượt cũ vẫn thấy PASS to và nút Merge sáng, chỉ biết verdict đã chết **sau khi
đã bấm** một nút một chiều. Một checker tồn tại để nói thật trước nút merge thì không được để người
dùng phát hiện sự thật bằng cách bấm thử.

#### Scenario: pull request có commit mới hơn verdict
- **WHEN** head hiện tại của pull request khác commit mà verdict ghim
- **THEN** trang hiện cảnh báo verdict đã hết hiệu lực kèm cả hai mã commit, cổng merge khoá, và có
  lối đi thẳng tới việc chấm lại

#### Scenario: verdict còn ghim đúng commit
- **WHEN** head của pull request vẫn đúng commit mà verdict ghim
- **THEN** không có cảnh báo nào, cổng hoạt động bình thường

### Requirement: Commit mới đến GIỮA lượt chấm phải được đánh dấu ngay, không đợi ai mở trang

Trong lúc một lượt chấm đang chạy trên pull request, hệ thống SHALL theo dõi head của pull request
đó theo nhịp, và khi head đổi khác commit lượt chấm đang ghim thì SHALL đánh dấu **ngay** — cả trên
dòng sự kiện lẫn trên bản ghi lượt chấm.

Lượt chấm SHALL chạy tiếp tới hết. Đây là quyết định có chủ đích: dừng giữa chừng thì vứt bỏ phần
việc gần xong, mà verdict trên commit cũ **vẫn còn giá trị đọc** — nó không dùng được ở cổng nhưng
phần lớn finding vẫn đúng với mã nguồn, và dev vẫn biết được chỗ nào sai.

Điều KHÔNG được phép là **im lặng cho tới lúc ai đó bấm**: hôm nay người dùng chỉ biết verdict đã
chết sau khi đã bấm một nút một chiều và nhận từ chối.

#### Scenario: dev đẩy commit mới trong lúc đang chấm
- **WHEN** pull request nhận commit mới trong lúc lượt chấm đang chạy
- **THEN** lượt chấm được đánh dấu hết-hiệu-lực ngay tại thời điểm phát hiện, người đang xem thấy
  cảnh báo mà không cần tải lại, và lượt chấm vẫn chạy tới hết

#### Scenario: verdict ra đời đã hết hiệu lực
- **WHEN** một lượt chấm kết thúc mà head đã đổi từ giữa chừng
- **THEN** verdict khai rõ nó ghim commit nào và commit đó không còn là head; cổng merge khoá ngay từ
  lần mở đầu tiên

#### Scenario: không có commit mới nào
- **WHEN** head không đổi suốt lượt chấm
- **THEN** không đánh dấu gì, và không thêm lời gọi nào tới GitHub sau khi lượt chấm kết thúc

### Requirement: Lượt chấm phải ghi ai bấm chạy

Bản ghi của một lượt chấm SHALL mang danh tính người khởi động nó, và trang SHALL hiện danh tính đó
trong bảng số liệu.

Lượt do máy khởi động (chế độ trực) SHALL phân biệt được với lượt do người bấm — hai thứ đó chịu
trách nhiệm khác nhau.

#### Scenario: người bấm chạy
- **WHEN** một người đang đăng nhập bấm chạy kiểm
- **THEN** lượt chấm ghi tên người đó, và bảng số liệu hiện tên đó

#### Scenario: chế độ trực tự chạy
- **WHEN** chế độ trực tự khởi động một lượt chấm
- **THEN** bản ghi khai đó là lượt do máy chạy, không gán cho một người nào
