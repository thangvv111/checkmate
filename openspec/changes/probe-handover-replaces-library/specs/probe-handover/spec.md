# probe-handover

## ADDED Requirements

### Requirement: Probe là đầu dò DÙNG MỘT LẦN, giữ lại là một quyết định RIÊNG

Probe SHALL được coi là **dùng một lần**: nó là một giả thuyết viết thành code, chạy trên hai nhánh để
lấy câu trả lời, và **xong việc** khi câu trả lời đã có.

Việc giữ một probe lại MUST là một quyết định **tách rời** khỏi việc sinh ra nó, và MUST dựa trên **bằng
chứng của riêng probe ấy** — không dựa trên việc nó xanh.

*Vì sao thành luật:* cơ chế trước giữ probe theo tiêu chí **«xanh trên nhánh gốc»**, tức giữ vì nó **không
nổ**. Nhưng luật lưới của chính sản phẩm này nói một ca xanh chưa chứng minh được gì — ca khoá một gác phải
có đột biến làm nó ĐỎ, không thì nó là «ca xanh trên hệ đã hỏng». Thư viện vì thế tích luỹ theo đúng tiêu
chí mà luật của sản phẩm gọi là không đủ để coi là một phép thử. Đo được trên prod: **0/7 probe từng nổ**,
mà cả 7 vẫn chạy ở mọi lượt chấm, trên cả hai nhánh.

#### Scenario: probe không có bằng chứng gì

- **WHEN** một probe xanh trên cả hai nhánh và không neo vào luật nào chưa được phủ
- **THEN** nó bị **vứt** sau lượt chấm — không vào kho nào, không chạy ở lượt sau

#### Scenario: đường sai — giữ vì xanh

- **WHEN** hiện thực giữ probe chỉ vì nó pass trên nhánh gốc
- **THEN** đó là vi phạm: «không nổ» không phải bằng chứng, nó là **vắng bằng chứng**

### Requirement: Xếp hạng theo CHẤT LƯỢNG BẰNG CHỨNG, ba hạng đóng

Cuối mỗi lượt chấm, mỗi probe SHALL được xếp vào **đúng một** trong ba hạng:

| hạng | điều kiện | bằng chứng | xử lý |
|---|---|---|---|
| 1 | trạng thái `hoi_quy` hoặc `vi_pham_luat_moi` — probe **đã nổ** | quan sát trực tiếp | đề xuất giao |
| 2 | xanh cả hai nhánh, neo vào **luật MỚI** mà test repo **chưa phủ** | lỗ hổng đo được, chưa quan sát thấy đỏ | phải qua cửa đột biến |
| 3 | còn lại | không có | vứt |

Danh sách này SHALL đóng: probe không rơi vào hạng 1 hay 2 thì thuộc hạng 3. Không có nhánh «giữ tạm»,
«chờ xét» hay «giữ vì tiếc» — mỗi nhánh như thế là một đường quay lại chỗ tích luỹ không tiêu chí.

Hạng 1 MUST NOT đòi thêm phép kiểm nào. Probe đã nổ tự nó chứng minh **hai** điều cùng lúc: nó đỏ được, và
hành vi ấy đã gãy trong thực tế một lần — đúng lý do kinh điển để viết một test hồi quy.

#### Scenario: probe bắt được hồi quy

- **WHEN** một probe xanh trên nhánh gốc và đỏ trên nhánh PR
- **THEN** nó vào hạng 1 và được đề xuất giao, không cần kiểm gì thêm

#### Scenario: probe neo luật mới chưa ai phủ

- **WHEN** probe xanh cả hai nhánh nhưng neo vào một luật PR này mới thêm, và test của repo chưa phủ luật ấy
- **THEN** nó vào hạng 2 — được đề xuất **chỉ khi** qua cửa đột biến

#### Scenario: đường sai — hạng thứ tư

- **WHEN** hiện thực thêm một nhánh xử lý ngoài ba hạng
- **THEN** đó là vi phạm: danh sách đóng là thứ giữ cho việc giữ probe không trôi về «tích luỹ mặc định»

### Requirement: Cửa đột biến đặt ĐÚNG chỗ thiếu quan sát

Probe hạng 2 SHALL phải chứng minh nó **đỏ được** trước khi được đề xuất giao: phá đúng hành vi nó khai là
nó canh, chạy lại, và probe phải ĐỎ. Không đỏ được thì nó không phải phép thử — vứt.

Cửa này MUST NOT áp cho hạng 1. Hạng 1 đã có bằng chứng bằng **quan sát**; bắt nó chứng minh lại là tốn
công cho một điều đã biết.

*Đây là chỗ đặt chi phí có chủ đích:* phép đột biến đắt, nên nó chỉ rơi lên nhóm **không có cách nào khác**
để biết. Áp cho mọi probe là quay lại đúng bài toán chi phí mà change này gỡ.

#### Scenario: probe hạng 2 không đỏ được

- **WHEN** hành vi mà probe khai là nó canh bị phá, mà probe vẫn xanh
- **THEN** probe bị vứt, và lý do được nói ra — nó chưa từng canh gì

#### Scenario: hạng 1 không bị bắt chứng minh lại

- **WHEN** một probe hạng 1 đi qua bước xếp hạng
- **THEN** không có phép đột biến nào chạy cho nó

### Requirement: Đề xuất giao là ĐẦU RA của lượt chấm, không phải kho nội bộ

Probe được giữ SHALL đi ra ngoài dưới dạng **đề xuất giao cho repo đích** trong verdict, MUST NOT được cất
vào một kho mà engine tự đọc lại ở lượt sau.

Mỗi đề xuất SHALL mang đủ để đội repo đích hành động mà không cần hỏi lại: **mã probe** · **luật nó neo** ·
**lý do được đề xuất** (hạng nào, và vì sao) · **mã nguồn chạy được**.

*Vì sao ra ngoài chứ không ở lại:* một test hồi quy nằm trong repo đích thì chạy ở **mọi commit** của CI
repo, chạy **một lần** (không phải hai nhánh), cả đội nhìn thấy và sửa được khi nó mục. Cũng test ấy nằm
trong CheckMate thì chỉ chạy khi CheckMate chấm — tức muộn hơn — chạy hai lần, không ai biết nó tồn tại, và
khi module bị đổi tên thì nó **mục âm thầm** (đúng năm lượt chết trên prod 31/08).

⛔ Máy MUST NOT tự đưa test vào repo đích (⛔C1). Đề xuất là **đề xuất**; người quyết.

#### Scenario: đề xuất đủ để hành động

- **WHEN** một probe được đề xuất giao
- **THEN** verdict mang mã probe, luật nó neo, lý do, và mã nguồn chạy được

#### Scenario: đường sai — engine đọc lại đề xuất ở lượt sau

- **WHEN** một lượt chấm mới bắt đầu
- **THEN** nó KHÔNG nạp bất kỳ probe nào từ lượt trước; bộ probe của lượt này sinh hoàn toàn mới

### Requirement: Bỏ lớp phủ hồi quy là một mất mát, và nó phải hiện ra

Change này **giảm** khả năng bắt hồi quy tác động-từ-xa: probe sinh mới chỉ dò quanh cái mà PR chạm tới
(model chỉ được đưa spec · tài liệu API · test mẫu · diff), nên một hành vi cũ mà PR này không đụng sẽ
không được dò.

Cái mất ấy MUST được nói ra ở chỗ người đọc verdict nhìn thấy, MUST NOT chỉ nằm trong tài liệu thiết kế.

⛔ **Và không chỗ nào được biến «thôi kiểm» thành «đã kiểm và sạch»** (⛔C2). Verdict PASS sau change này
nghĩa là *«bộ probe sinh cho PR này không tìm thấy gì»*, không phải *«không có hồi quy nào»* — hai câu ấy
khác nhau, và trước đây lớp thư viện làm chúng trông giống nhau hơn thực tế.

#### Scenario: verdict PASS

- **WHEN** một lượt chấm không tìm thấy finding nào
- **THEN** verdict nói rõ phạm vi đã dò là quanh diff, không khẳng định toàn bộ hành vi repo còn nguyên

#### Scenario: đường sai — im lặng về phạm vi

- **WHEN** verdict không nói gì về phạm vi đã dò
- **THEN** đó là vi phạm: người đọc sẽ hiểu PASS rộng hơn thứ nó thật sự chứng minh

### Requirement: Tách một probe ra khỏi file nhiều probe phải hiểu regex literal

Để giao được một probe, máy SHALL tách được **đúng khối code của riêng nó** ra khỏi file chứa nhiều probe,
và phép đếm ngoặc SHALL hiểu **regex literal** — `/\}/` chứa một ngoặc đóng không phải ngoặc cấu trúc.

Tách sai thì thứ giao đi là code không chạy được, và đội repo đích nhận một file hỏng kèm lời khuyên thêm
nó vào bộ test — mất uy tín của cả cơ chế giao ở đúng lần đầu.

*(Yêu cầu này CHUYỂN NHÀ từ `probe-library` — máy tách vẫn cần, chỉ đổi việc: trước để nạp vào kho, nay để
giao đi.)*

#### Scenario: probe chứa regex có ngoặc nhọn

- **WHEN** tách một probe mà thân nó chứa regex literal có `{` hoặc `}`
- **THEN** khối tách ra vẫn cân ngoặc và chạy được một mình

#### Scenario: không tách được

- **WHEN** cú pháp nằm ngoài khuôn máy tách hiểu
- **THEN** probe KHÔNG được đề xuất, và lý do được nói ra — không giao code có thể hỏng
