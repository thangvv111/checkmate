## ADDED Requirements

### Requirement: Dòng sự kiện của lượt chấm phải bền, không phụ thuộc tiến trình web còn sống

Tiến trình chạy lượt chấm SHALL ghi mỗi sự kiện xuống đĩa **ngay khi nó sinh ra**, vào một sổ
chỉ-ghi-thêm của riêng lượt đó. Sổ trên đĩa là **nguồn sự thật**; tiến trình web đọc theo, và
MUST NOT là nơi duy nhất giữ dữ liệu.

Hôm nay sự kiện đi qua một đường ống tới tiến trình web và nằm trong bộ nhớ tới lúc lượt chấm kết
thúc. Tiến trình web dừng — khởi động lại, deploy, hoặc hỏng — thì mọi thứ tích luỹ được đều mất,
kể cả những bước đã chạy xong và đã trả tiền cho lời gọi model. Đầu kia của đường ống tắt thì công
việc vẫn chạy nhưng nói vào chỗ không ai nghe.

#### Scenario: tiến trình web dừng giữa lượt chấm
- **WHEN** tiến trình web dừng trong lúc một lượt chấm đang chạy, rồi khởi động lại
- **THEN** mọi sự kiện đã sinh ra trước lúc dừng vẫn đọc được, và trang của lượt đó dựng lại đúng
  tới thời điểm đó

#### Scenario: tiến trình chạy lượt chấm vẫn sống sau khi web dừng
- **WHEN** tiến trình web dừng nhưng tiến trình chạy lượt chấm vẫn tiếp tục
- **THEN** những sự kiện sinh ra trong lúc web vắng mặt vẫn được ghi, và web đọc tiếp khi sống lại

#### Scenario: lượt chấm chết thật
- **WHEN** tiến trình chạy lượt chấm chết giữa chừng
- **THEN** sổ giữ đúng tới sự kiện cuối cùng nó kịp ghi, và hệ nói được lượt chấm dừng ở bước nào —
  KHÔNG hiện thành «không có gì»

### Requirement: Xem lại một lượt bị đứt không được nhân đôi nội dung

Khi kết nối theo dõi bị đứt và nối lại, hệ thống SHALL tiếp tục từ đúng chỗ đứt. Nội dung đã hiện
MUST NOT xuất hiện lần thứ hai.

Đây là lỗi có thật của bản hiện tại: kết nối tự nối lại, máy chủ phát lại toàn bộ từ đầu, và giao
diện nối thêm — nên một lần rớt mạng cho ra hai bản finding giống hệt nhau trên màn hình. Người đọc
không có cách nào biết đó là trùng lặp hay là hai phát hiện thật.

#### Scenario: mất kết nối rồi có lại giữa lượt chấm
- **WHEN** kết nối theo dõi đứt rồi nối lại trong lúc lượt chấm đang chạy
- **THEN** chỉ những sự kiện sinh ra sau chỗ đứt được thêm vào; không finding hay dòng log nào bị lặp

### Requirement: Lượt chấm mồ côi phải khai đúng nó là gì

Lượt chấm còn ở trạng thái đang-chạy sau khi tiến trình web khởi động lại SHALL được đánh dấu là
hỏng, kèm lý do đọc được. Nó MUST NOT bị đếm là đang chạy (khoá trần chạy song song), và MUST NOT
lặng lẽ trở thành một lượt không có kết quả.

#### Scenario: khởi động lại gặp lượt đang chạy dở
- **WHEN** tiến trình web khởi động và thấy lượt chấm còn ở trạng thái đang-chạy
- **THEN** lượt đó chuyển sang hỏng, có ghi lý do trong dòng sự kiện, và không còn chiếm chỗ trong
  trần chạy song song
