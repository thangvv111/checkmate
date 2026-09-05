## MODIFIED Requirements

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
- **THEN** bảng khai nguồn đã lấy và số đơn vị đọc được, cùng độ phủ tính trên số đó
