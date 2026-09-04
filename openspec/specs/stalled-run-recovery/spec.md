# stalled-run-recovery Specification

## Purpose
TBD - created by archiving change stalled-run-recovery. Update Purpose after archive.

## Requirements

### Requirement: Lượt còn sống được phân biệt bằng TIẾN TRÌNH, không bằng sự tồn tại của sổ

Khi khởi động lại, engine SHALL phân biệt lượt `dang_chay` còn sống với lượt đã chết bằng **tiến trình chấm
của nó**, không bằng việc sổ sự kiện có tồn tại hay không.

Định danh tiến trình SHALL được lưu cùng lượt ngay khi lượt bắt đầu.

*Vì sao phép kiểm cũ sai: sổ sự kiện là file trên đĩa, nó **tồn tại mãi** sau khi tiến trình chết. Hỏi «sổ
có không» thì mọi lượt từng chạy đều trả lời có.*

*Vì sao phải phân biệt chứ không đánh dấu lỗi hàng loạt — đo được: tiến trình chấm được spawn qua shell và
ghi sự kiện thẳng vào **file** chứ không qua pipe, nên nó **độc lập với server**. Thí nghiệm 04/09: giết
tiến trình cha, tiến trình cháu vẫn ghi tiếp và chạy **trọn vẹn tới hết**. Đánh dấu lỗi mọi hàng `dang_chay`
lúc khởi động là vứt một lượt đang chạy đúng và đốt lại toàn bộ token đã tiêu cho nó.*

#### Scenario: khởi động lại khi tiến trình chấm còn sống
- **WHEN** tiến trình chấm của một lượt vẫn đang chạy
- **THEN** lượt ấy được nối lại và vẫn tính là đang chạy

#### Scenario: khởi động lại khi tiến trình chấm đã chết
- **WHEN** tiến trình chấm không còn
- **THEN** lượt được xử theo requirement dưới

#### Scenario: lượt đời cũ không có định danh tiến trình
- **WHEN** một lượt `dang_chay` được ghi từ trước khi tính năng này có
- **THEN** nó được coi là đã chết — không suy đoán là còn sống

### Requirement: Lượt có tiến trình đã chết thành LỖI ngay lúc khởi động

Lượt `dang_chay` mà tiến trình chấm không còn SHALL được đánh dấu **lỗi** ngay ở lượt khởi động phát hiện
ra, kèm một dòng trong sổ sự kiện nói rõ vì sao.

Engine MUST NOT giữ một trạng thái trung gian nào cho lượt ấy, và MUST NOT chờ người vận hành thao tác mới
giải phóng nó.

*Vì sao lỗi chứ không phải một trạng thái riêng: lượt chết là lượt **không có verdict** và sẽ không bao giờ
có. Giữ nó ở một trạng thái thứ ba chỉ tạo thêm một ô trên bề mặt mà người đọc phải học nghĩa, trong khi
điều họ cần biết đã đủ trong một chữ: **lỗi**. Muốn chấm lại thì bấm chấm — đó là một lượt MỚI, có id mới,
và lịch sử giữ đúng hai bản ghi cho hai lần chạy.*

*Vì sao phải NGAY, không chờ ai bấm: trạng thái `dang_chay` là thứ `runningCount()` đếm và `isPrRunning()`
đọc. Một lượt chết còn mang trạng thái ấy sẽ **khoá trần chạy đồng thời** và **khoá luôn việc chấm lại đúng
pull request đó** — đo được: một lượt chết nằm 17 giờ, khoá PR #7 của repo đích, và không có thao tác nào
trên giao diện gỡ được. Đánh dấu lỗi ngay là giải phóng cả hai mà không cần sửa chỗ nào khác.*

#### Scenario: khởi động sau khi một lượt chết giữa chừng
- **WHEN** engine khởi động và thấy lượt `dang_chay` không còn tiến trình
- **THEN** lượt thành lỗi, sổ sự kiện có dòng nói rõ nguyên nhân

#### Scenario: trần và pull request được giải phóng
- **WHEN** một lượt chết đã thành lỗi
- **THEN** nó không còn được đếm vào trần chạy đồng thời và không còn chặn việc chấm lại pull request ấy

### Requirement: Huỷ được một lượt ĐANG CHẠY, và không bao giờ kill mù

Bề mặt đọc SHALL có hành động **huỷ** cho lượt đang chạy.

Huỷ SHALL kết thúc lượt ở trạng thái lỗi và ghi vào sổ sự kiện **ai** đã huỷ.

Engine SHALL kết thúc tiến trình chấm **chỉ khi xác minh được tiến trình ấy đúng là của lượt này**; không
xác minh được thì MUST NOT kết thúc tiến trình nào, và bề mặt phải nói rõ là chỉ đánh dấu lượt chứ chưa dừng
tiến trình.

*Vì sao huỷ phải ghi ai làm: một lượt chuyển sang lỗi mà không nói vì sao là báo thiếu bản chất — người đọc
lịch sử sau này không phân biệt được «lượt hỏng vì code» với «người vận hành huỷ». Cùng lý do R11.16 đóng
băng tên tác giả vào hàng sổ cổng: một hành động không biết ai làm là hành động không đối chất được.*

*Vì sao không được kill mù: định danh tiến trình bị hệ điều hành **tái dùng**. Sau khi máy khởi động lại,
đúng con số ấy có thể thuộc về một tiến trình hoàn toàn khác — kill mù là giết một tiến trình vô can của
người dùng, một thiệt hại không đảo ngược nằm **ngoài phạm vi sản phẩm này**.*

#### Scenario: huỷ một lượt đang chạy
- **WHEN** người vận hành bấm huỷ trên lượt đang chạy
- **THEN** lượt kết thúc ở trạng thái lỗi, và sổ ghi ai đã huỷ

#### Scenario: huỷ khi không xác minh được tiến trình
- **WHEN** không xác minh được tiến trình còn lại đúng là của lượt này
- **THEN** không tiến trình nào bị kết thúc, và bề mặt nói rõ điều đó

#### Scenario: huỷ một lượt đã kết thúc
- **WHEN** lượt không còn ở trạng thái đang chạy
- **THEN** yêu cầu bị từ chối

### Requirement: Thông điệp cổng nhà cung cấp phải nói đúng phương thức đang chọn

Khi cổng từ chối vì chưa kiểm được nhà cung cấp, thông điệp SHALL nói theo **phương thức đang được cấu
hình**, không theo phương thức của lần kiểm cũ.

Khi sổ kiểm mang phương thức **khác** với cấu hình hiện tại, bề mặt SHALL nói rõ rằng cần **kiểm lại**, và
MUST NOT trình bày kết quả cũ như thể nó nói về cấu hình hiện tại.

*Vì sao: hai phương thức cần hai thứ khác hẳn nhau — đường API cần khoá, đường thuê bao cần phiên đăng nhập
trên máy chủ. Một thông điệp «chưa có API key» hiện ra khi đang ở chế độ thuê bao đẩy người đọc đi tìm thứ
không liên quan. Đo được: PO mất một lượt dùng thử và kết luận nhầm rằng tính năng kho khoá đã phá đường
phiên Claude Code — trong khi đường ấy còn nguyên và phiên vẫn hợp lệ.*

*Chặn vẫn là chặn — ⛔C2 không đổi. Điều phải sửa là bề mặt nói cho đúng chuyện gì đang xảy ra.*

#### Scenario: cấu hình thuê bao, sổ kiểm còn kết quả đường API
- **WHEN** cấu hình đang là phương thức thuê bao nhưng lần kiểm gần nhất chạy ở phương thức API
- **THEN** thông điệp nói cần kiểm lại theo phương thức đang chọn, không đòi API key

#### Scenario: cấu hình API và thật sự thiếu khoá
- **WHEN** cấu hình đang là phương thức API và chưa có khoá
- **THEN** thông điệp nói thiếu khoá — đúng bản chất

### Requirement: Cổng đã khoá thì bề mặt MUST NOT nói PASS, và MUST NOT mời tick

Khi cổng merge bị khoá — vì có finding chặn, hoặc vì verdict đã hết hiệu lực do commit mới — bề mặt cổng
MUST NOT hiện câu nói lượt chấm đạt, và MUST NOT dựng ô tick cảnh báo.

*Vì sao: khối tick tồn tại để MỞ nút Merge. Cổng đã khoá thì không có nút nào để mở, nên khối ấy mời người
đọc làm một thao tác vô nghĩa — và tệ hơn, câu mở đầu của nó nói lượt chấm ĐẠT. Đo được 04/09: một pull
request FAIL hiện đồng thời «⛔ Merge khoá cứng» và «PASS kèm 4 cảnh báo medium», kèm bốn ô tick dẫn tới
một nút không tồn tại.*

*Không có hậu quả dữ liệu — không có form thì tick chẳng ghi đi đâu. Nhưng chữ «PASS» đứng trên màn hình
của một pull request đang FAIL là loại hiểu nhầm đắt nhất bề mặt này gây ra được: người đọc có thể tin
verdict đạt rồi đi merge tay trên GitHub, ngoài tầm cổng.*

*Findings đã được liệt kê đầy đủ ở verdict phía trên, nên bỏ khối tick khi khoá không giấu thông tin nào.*

#### Scenario: verdict có finding chặn, đồng thời có cảnh báo
- **WHEN** cổng bị khoá vì finding chặn nhưng verdict cũng có cảnh báo không chặn
- **THEN** bề mặt nói cổng khoá và lý do, KHÔNG nói lượt chấm đạt, KHÔNG hiện ô tick

#### Scenario: verdict đạt và có cảnh báo
- **WHEN** cổng không bị khoá và verdict có cảnh báo không chặn
- **THEN** khối tick vẫn hiện như cũ — đây là đường dùng bình thường của nó

### Requirement: Danh sách ứng viên phải phân biệt được từng ứng viên

Dòng liệt kê ứng viên đối kháng SHALL mang **chỗ mà từng ứng viên nhắm tới**, không chỉ nhãn phân loại.

*Vì sao: nhãn phân loại đến từ một danh mục hữu hạn, nên nhiều ứng viên nhắm những chỗ hoàn toàn khác nhau
vẫn hiện ra giống hệt. Người đọc thấy hai dòng như nhau sẽ kết luận engine sinh trùng và tự gỡ bớt — mà dữ
liệu đo được cho thấy hai ứng viên cùng nhãn có thể là hai finding **high** khác nhau. Ứng viên đã mang sẵn
trích dẫn kèm vị trí; đây là chuyện dùng dữ liệu đã có, không phải chuyện tìm thêm dữ liệu.*

#### Scenario: hai ứng viên cùng nhãn phân loại
- **WHEN** hai ứng viên mang cùng một nhãn nhưng nhắm hai chỗ khác nhau
- **THEN** dòng liệt kê cho thấy hai chỗ khác nhau ấy
