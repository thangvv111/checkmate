## MODIFIED Requirements

### Requirement: Verdict phải khai cả phần yếu của chính lượt chấm

Bảng số liệu của verdict SHALL hiện **vùng xám probe** — số probe nghi vấn, bỏ qua, thất lạc, nghi
lỗi có sẵn, và **bị cách ly** — bên cạnh các số thuận lợi (kế hoạch, ghi nhận, pass, hồi quy).

Bốn số đó nói lượt chấm này **không nhìn thấy gì**. Giấu chúng đi thì một verdict PASS mỏng trông
giống hệt một verdict PASS dày, và người đọc mất đúng thông tin cần để biết nên tin đến đâu.

Bảng số liệu SHALL khai thêm **nguồn luật của lượt chấm**: engine lấy luật từ đâu, và đọc được bao
nhiêu đơn vị.

Số đơn vị luật mà probe **neo vào** SHALL được khai như một **số đếm**, MUST NOT khai như một **tỉ lệ**
trên tổng số đơn vị đọc được. Bề mặt nào bày hai con số ấy cạnh nhau SHALL nói rõ tổng số **không phải
mẫu số của độ phủ**.

Khi không đọc được đơn vị nào, phép đo SHALL khai là **không đo được** và MUST NOT khai là `0` — `0`
nghĩa là đã đếm và không probe nào neo được, còn không-đo-được nghĩa là **không có gì để neo**. Cùng một
chữ số cho hai tình trạng đó là để người đọc tin nhầm.

*Vì sao vế tỉ lệ bị cấm — đo được 08/09: một pull request sửa **một dòng** nhận thông điệp «Độ phủ luật:
**1/195** đơn vị luật đọc được từ spec có probe neo vào». Đọc tự nhiên nhất của câu ấy là «phủ 0,5%, tệ
quá», và đọc ấy SAI: mẫu số là toàn bộ kho luật của repo, còn tử số là phần mà một diff một dòng chạm
tới. Không có lý do gì để một bản vá một dòng neo vào 195 đơn vị luật.*

*Và tỉ lệ ấy tạo một khuyến khích ngược, đo được trên hai repo trong cùng một ngày: `checkmate` có **195**
đơn vị luật nên mọi lượt đều ra 1/195 hay 2/195; `demo-credit-approval` có **9** đơn vị nên một lượt neo
3 ra **3/9 = 33%**. **Repo viết ÍT luật hơn thì điểm cao hơn.** Một con số thưởng cho việc viết ít luật
lại nằm trong một công cụ tồn tại để bắt người ta viết luật rõ hơn.*

*Vì sao KHÔNG sửa bằng cách thu hẹp mẫu số: engine **không biết** diff chạm luật nào. Thứ duy nhất nó có
là mã luật do model khai trên từng probe — mà đó chính là tử số. Dựng một mẫu số từ tử số là vòng tròn.
Khi không có mẫu số thật thì câu trả lời đúng là **đừng bày tỉ lệ**, không phải bịa một mẫu số trông hợp
lý.*

*(Bản trước chỉ canh vùng xám của probe. Nhưng độ phủ luật cũng có một vùng xám của riêng nó, và nó
sâu hơn: probe có thể ghi nhận đủ, pass đủ, mà toàn bộ phép đo «phủ được bao nhiêu luật» vẫn vô nghĩa
vì repo không có luật nào đọc được. Cái đó không hiện ra ở bốn số cũ.)*

#### Scenario: verdict có vùng xám khác không
- **WHEN** một lượt chấm có probe rơi vào nghi vấn, bỏ qua, thất lạc hoặc nghi lỗi có sẵn
- **THEN** bảng số liệu hiện đủ bốn số đó, không gộp và không lược bỏ

#### Scenario: vùng xám bằng không
- **WHEN** không probe nào rơi vào bốn nhóm trên
- **THEN** bảng vẫn khai các mục đó ở giá trị không — im lặng và số không là hai điều khác nhau

#### Scenario: bảng số liệu bày mức cô lập
- **WHEN** đọc bảng số liệu của một verdict
- **THEN** nó bày mức cô lập của lượt chạy; lượt chạy KHÔNG cô lập phải đọc ra được ngay, không phải suy
  từ chỗ khác

#### Scenario: verdict đời cũ không có trường mức cô lập
- **WHEN** mở một verdict ghi trước khi có phép đo này
- **THEN** bảng khai **không đo được**, MUST NOT khai là đã cô lập và MUST NOT khai là không cô lập

#### Scenario: lượt chấm có probe bị cách ly
- **WHEN** một lượt chấm loại probe vì lỗi nạp rồi chạy tiếp
- **THEN** bảng số liệu hiện số probe bị cách ly, cạnh các số vùng xám khác — một lượt chấm mất phép thử
  không được trông giống một lượt chấm đủ phép thử

#### Scenario: lượt chấm không có luật đối chiếu
- **WHEN** engine không đọc được đơn vị luật nào từ repo đích
- **THEN** bảng số liệu khai nguồn luật là không có, và độ phủ khai là **không đo được** — không phải `0`

#### Scenario: lượt chấm có luật đối chiếu
- **WHEN** engine đọc được các đơn vị luật
- **THEN** bảng khai nguồn đã lấy, số đơn vị đọc được, và **số đơn vị có probe neo vào** — dạng số đếm

#### Scenario: bề mặt bày số neo cạnh tổng số đơn vị
- **WHEN** một bề mặt bày cả số neo lẫn tổng số đơn vị luật
- **THEN** nó nói rõ tổng số **không phải mẫu số của độ phủ**; MUST NOT ghép hai số thành dạng `x/y`

#### Scenario: probe neo được vào luật nào thì nói tên luật ấy
- **WHEN** probe của lượt chấm neo vào một hay nhiều đơn vị luật
- **THEN** verdict khai **địa chỉ** các đơn vị ấy, không chỉ khai số lượng — tên luật nói được điều một
  con số không nói
