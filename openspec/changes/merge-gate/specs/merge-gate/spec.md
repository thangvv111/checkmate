## ADDED Requirements

### Requirement: Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở

Cổng merge SHALL từ chối khi verdict là `FAIL` hoặc còn finding mức `high` (gốc: R6.6); khi run không tồn
tại hoặc không gắn pull request; khi run **đã qua cổng** (sổ đã có hàng merge/reject cho run này — đọc
tươi từ sổ, không tin bản trong bộ nhớ); khi pull request **không còn mở** trên GitHub (gốc: R6.8); và khi
head hiện tại của pull request **khác** commit mà verdict ghim (gốc: R6.9). Lệnh merge gửi GitHub MUST
mang đúng SHA đã ghim để GitHub tự từ chối nếu head đổi sau lần kiểm.

Quyết định cổng MUST là một hàm thuần trên dữ liệu (verdict, run, hàng sổ, trạng thái pull request), tách
khỏi I/O — để mọi scenario dưới đây là một ca test chạy được và thông điệp được khoá từng chữ. Thứ tự kiểm
là một phần của hợp đồng: mọi kiểm cục bộ đứng TRƯỚC lời gọi GitHub; verdict `FAIL` đứng trước thiếu quyền;
thiếu quyền đứng trước cảnh báo medium chưa tick.

Một verdict thuộc về đúng một commit: bắt đầu chấm lại một commit đã có verdict SHALL cảnh báo trước và
đòi người dùng xác nhận «vẫn chạy lại» (gốc: R6.10) — kết quả gần như chắc chắn lặp lại mà vẫn tốn phút và
token.

#### Scenario: verdict FAIL hoặc còn finding high
- **WHEN** run có verdict `FAIL`, hoặc `PASS` nhưng còn ít nhất một finding `high`
- **THEN** cổng từ chối 403 với đúng lời «Verdict FAIL (có finding HIGH) — nút merge khoá theo luật cổng.»

#### Scenario: pull request có commit mới hơn commit verdict ghim
- **WHEN** head hiện tại của pull request khác `pr.headSha` của run
- **THEN** cổng từ chối 409, lời nêu cả hai SHA rút gọn và bảo chạy kiểm lại; không lời gọi merge nào được gửi

#### Scenario: pull request không còn mở
- **WHEN** GitHub trả pull request ở trạng thái đã merge hoặc đã đóng
- **THEN** cổng từ chối 409, lời nêu số pull request và trạng thái

#### Scenario: run đã qua cổng
- **WHEN** sổ cổng đã có hàng merge hoặc reject cho run này
- **THEN** cổng từ chối 409, lời nêu hành động và thời điểm đã ghi

#### Scenario: thứ tự kiểm khi nhiều điều kiện cùng sai
- **WHEN** run có verdict `FAIL` và người bấm không có phiên
- **THEN** lời từ chối là lời của verdict `FAIL` (403), không phải lời thiếu phiên — và không lời gọi GitHub
  nào được thực hiện

#### Scenario: chấm lại đúng commit đã có verdict
- **WHEN** người dùng khởi động lượt chấm cho pull request ở đúng commit đã có verdict, chưa xác nhận «vẫn chạy lại»
- **THEN** hệ thống trả 409 kèm liên kết tới verdict đã có và nút xác nhận; chỉ khi xác nhận mới chạy

### Requirement: Cảnh báo medium phải được xác nhận từng cái, máy chủ đối chiếu tập id

Finding mức `medium` SHALL chỉ được bỏ qua khi người bấm **xác nhận từng cái** (gốc: R6.7). Máy chủ MUST
so tập id đã tick với tập finding medium **thật** của verdict và từ chối khi thiếu bất kỳ id nào — danh
sách client gửi lên là DỮ LIỆU, không phải bằng chứng. Danh sách cảnh báo đã chấp nhận SHALL đi vào biên
nhận đăng lên pull request và vào hàng sổ.

#### Scenario: thiếu xác nhận một medium
- **WHEN** verdict có ba finding medium và client gửi hai id
- **THEN** cổng từ chối 422, lời nêu số medium phải xác nhận và id còn thiếu

#### Scenario: client gửi id không tồn tại hoặc trùng
- **WHEN** danh sách tick chứa id lạ hoặc lặp, nhưng vẫn chứa đủ mọi id medium thật
- **THEN** cổng cho qua — id thừa không có tác dụng, id thiếu mới chặn

#### Scenario: không có medium
- **WHEN** verdict `PASS` không có finding medium
- **THEN** cổng không đòi xác nhận

### Requirement: Hành động cổng vào sổ chỉ-ghi-thêm với danh tính phiên và danh sách cảnh báo đã chấp nhận

Mọi hành động qua cổng — merge, trả về dev — SHALL ghi vào sổ cổng chỉ-ghi-thêm một hàng mang: hành động,
pull request, SHA đã ghim, run, verdict, **người thực hiện lấy từ phiên đăng nhập** (không phải giá trị
client gửi, không phải tài khoản hệ điều hành — luật danh tính ở `identity-session`), tác giả pull request
đóng băng tại thời điểm bấm, và danh sách cảnh báo medium đã chấp nhận (gốc: R6.11). Trả về dev MUST có ghi
chú; ghi chú trống bị từ chối ở máy chủ, không chỉ ở nút.

Bề mặt lượt chấm không có cột riêng cho hành động cổng — nó là bản phái sinh đọc từ sổ (`doi-soat-cong`).

#### Scenario: merge thành công
- **WHEN** merge được GitHub chấp nhận
- **THEN** sổ có đúng một hàng `merge` cho run, mang tên người từ phiên, SHA đã ghim và các medium đã chấp nhận

#### Scenario: trả về dev với ghi chú trống
- **WHEN** POST trả về dev không có ghi chú (kể cả toàn khoảng trắng)
- **THEN** cổng từ chối 422 với lời «Trả về dev phải có ghi chú — dev cần biết vá gì.»; pull request không bị đóng

#### Scenario: người bấm thiếu quyền cổng
- **WHEN** phiên hợp lệ nhưng vai không được thao tác cổng
- **THEN** cổng từ chối 403 với lời thiếu quyền; không phiên → 401; không lời gọi GitHub nào được thực hiện

### Requirement: Tự động ở cổng: ba công tắc riêng, máy chỉ được nói KHÔNG

Ba việc tự động sau lượt chấm SHALL là ba công tắc RIÊNG (gốc: R6.15): đăng verdict + finding lên pull
request (mặc định bật), gắn trạng thái commit (mặc định bật), tự trả về dev — đóng pull request (mặc định
tắt). Cấu hình đời cũ thiếu cờ MUST nhận mặc định, không thành `undefined`.

Đăng verdict tự động SHALL chạy cho **mọi** lượt chấm có pull request, không riêng chế độ trực (gốc:
R6.16). Tự trả về dev SHALL chỉ chạy khi verdict là `FAIL` **và** có ít nhất một finding `high` (gốc:
R6.17). Hành động do máy thực hiện SHALL ghi sổ bằng danh tính **tác nhân máy** `ci-bot`, không mượn tên
người (gốc: R6.18). Tác nhân máy MUST NOT merge trong mọi cấu hình — không công tắc nào bật được điều đó,
khoá lạ trong file cấu hình bị lọc ở cửa đọc (gốc: R6.19; bất biến ⛔C1 của CLAUDE.md).

Quyết định ba việc MUST là hàm thuần trên (cấu hình trực, verdict) → {đăng, gắn trạng thái, đóng}.

#### Scenario: verdict FAIL có high, công tắc đóng PR bật
- **WHEN** `tu_dong_tra_ve` bật và verdict `FAIL` có finding `high`
- **THEN** quyết định là đóng pull request; hàng sổ mang `nguoi = ci-bot`

#### Scenario: verdict FAIL nhưng không có high
- **WHEN** `tu_dong_tra_ve` bật và verdict `FAIL` chỉ có medium/low
- **THEN** KHÔNG đóng pull request — đóng dựa trên suy đoán là thứ làm người ta tắt cổng

#### Scenario: lượt chấm bấm tay
- **WHEN** lượt chấm do người bấm (không phải chế độ trực) kết thúc với pull request
- **THEN** verdict vẫn được đăng lên pull request nếu công tắc đăng bật

#### Scenario: cấu hình đòi máy merge
- **WHEN** file cấu hình có khoá `truc.tu_dong_merge: true` hoặc khoá lạ cùng nghĩa
- **THEN** khoá bị bỏ ở cửa đọc và không quyết định nào của máy là merge

### Requirement: Chế độ chỉ-đọc không cho thao tác cổng và không cho sửa cấu hình

Hệ thống SHALL có **chế độ chỉ-đọc** (giá trị cấu hình hiện tại: `CHECKMATE_MODE` khác `org`, mặc định
khi không đặt) dành cho bản deploy trình bày: mọi thao tác cổng (merge, trả về dev) và mọi cửa sửa cấu hình
MUST bị từ chối 403 với lời nói rõ đây là chế độ chỉ xem (gốc: R6.12). Đây là tính năng sản phẩm, không
phải vết của kịch bản trình diễn (PO chốt 03/09).

Phạm vi cấm là **thao tác** — ghi một hành động MỚI. Nó KHÔNG cấm di trú dữ liệu lúc khởi động, thứ chỉ
chuyển chỗ một bản ghi đã tồn tại và ghi rõ nguồn: gác cửa di trú theo chế độ thì cột cũ vẫn bị bỏ mà dữ
liệu không được cứu — biến một bước bảo toàn thành một bước mất dữ liệu (án lệ M16, PO 01/09).

#### Scenario: bấm merge ở chế độ chỉ-đọc
- **WHEN** hệ thống chạy chế độ chỉ-đọc và có POST merge hợp lệ về mọi mặt khác
- **THEN** cổng từ chối 403 với lời «Chế độ demo không cho thao tác cổng merge (chỉ xem).», trước mọi kiểm khác

#### Scenario: di trú lúc khởi động ở chế độ chỉ-đọc
- **WHEN** hệ thống khởi động ở chế độ chỉ-đọc với dữ liệu đời cũ cần di trú
- **THEN** di trú vẫn chạy và ghi nguồn; chế độ chỉ-đọc không chặn
