## ADDED Requirements

### Requirement: Lượt còn sống được phân biệt bằng TIẾN TRÌNH, không bằng sự tồn tại của sổ

Khi khởi động lại, engine SHALL phân biệt lượt `dang_chay` còn sống với lượt đã kẹt bằng **tiến trình chấm
của nó**, không bằng việc sổ sự kiện có tồn tại hay không.

Định danh tiến trình SHALL được lưu cùng lượt ngay khi lượt bắt đầu.

Lượt không xác minh được là còn sống SHALL bị đánh dấu **kẹt**, và MUST NOT tiếp tục được tính là đang chạy
đối với trần chạy đồng thời và phép kiểm «pull request này đang được chấm».

*Vì sao phép kiểm cũ sai: sổ sự kiện là file trên đĩa, nó **tồn tại mãi** sau khi tiến trình chết. Hỏi «sổ
có không» thì mọi lượt từng chạy đều trả lời có. Comment trong code nói ý đúng là «sổ đang **lớn dần**»,
nhưng chưa vế nào của phép kiểm đo được điều đó.*

*Vì sao hệ quả nặng: một lượt kẹt vẫn tính vào `runningCount()` và vẫn làm `isPrRunning()` trả true — nên nó
**khoá vĩnh viễn việc chấm lại đúng pull request ấy**, và hai lượt kẹt là trần đầy, chặn mọi lượt mới. Đo
được: một xác nằm 17 giờ, khoá PR #7 của repo đích.*

#### Scenario: khởi động lại khi tiến trình chấm còn sống
- **WHEN** tiến trình chấm của một lượt vẫn đang chạy
- **THEN** lượt ấy được nối lại và vẫn tính là đang chạy

#### Scenario: khởi động lại khi tiến trình chấm đã chết
- **WHEN** tiến trình chấm không còn
- **THEN** lượt bị đánh dấu kẹt, không còn tính vào trần chạy đồng thời và không còn khoá pull request

#### Scenario: lượt đời cũ không có định danh tiến trình
- **WHEN** một lượt `dang_chay` được ghi từ trước khi tính năng này có
- **THEN** nó được coi là **kẹt** — không suy đoán là còn sống

### Requirement: Lượt kẹt phải có đường thoát — TIẾP TỤC hoặc HUỶ

Mỗi lượt kẹt SHALL có hai hành động trên bề mặt đọc: **tiếp tục** và **huỷ**.

**Tiếp tục** SHALL đi qua đúng phép kiểm điều kiện chạy như một lượt mới — trần chạy đồng thời và pull
request đang được chấm — và SHALL bị từ chối kèm lý do khi không đủ điều kiện.

**Huỷ** SHALL kết thúc lượt với trạng thái lỗi và ghi lý do vào sổ sự kiện của lượt.

Khi huỷ, engine SHALL kết thúc tiến trình chấm **chỉ khi xác minh được tiến trình ấy đúng là của lượt này**;
không xác minh được thì MUST NOT kết thúc tiến trình nào, và bề mặt phải nói rõ điều đó.

*Vì sao huỷ phải ghi lý do: một lượt chuyển sang lỗi mà không nói vì sao là báo thiếu bản chất — người đọc
lịch sử sau này không phân biệt được «lượt hỏng vì code» với «người vận hành huỷ».*

*Vì sao không được kill mù: định danh tiến trình bị hệ điều hành **tái dùng**. Sau khi máy khởi động lại,
đúng con số ấy có thể là một tiến trình hoàn toàn khác — kill mù là giết một tiến trình vô can của người
dùng, và đó là thiệt hại không đảo ngược được nằm ngoài phạm vi sản phẩm này.*

#### Scenario: tiếp tục một lượt kẹt khi còn chỗ
- **WHEN** người vận hành bấm tiếp tục và điều kiện chạy còn cho phép
- **THEN** lượt được chạy lại

#### Scenario: tiếp tục khi đã chạm trần hoặc pull request đang được chấm
- **WHEN** điều kiện chạy không cho phép
- **THEN** yêu cầu bị từ chối kèm lý do đọc được

#### Scenario: huỷ một lượt kẹt
- **WHEN** người vận hành bấm huỷ
- **THEN** lượt kết thúc ở trạng thái lỗi, sổ sự kiện có một dòng nói rõ là người vận hành huỷ

#### Scenario: huỷ khi không xác minh được tiến trình
- **WHEN** không xác minh được tiến trình còn lại đúng là của lượt này
- **THEN** không tiến trình nào bị kết thúc, và bề mặt nói rõ chỉ đánh dấu lượt chứ chưa dừng tiến trình

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

### Requirement: Danh sách ứng viên phải phân biệt được từng ứng viên

Dòng liệt kê ứng viên đối kháng SHALL mang **chỗ mà từng ứng viên nhắm tới**, không chỉ nhãn phân loại.

*Vì sao: nhãn phân loại đến từ một danh mục hữu hạn, nên nhiều ứng viên nhắm những chỗ hoàn toàn khác nhau
vẫn hiện ra giống hệt. Người đọc thấy hai dòng như nhau sẽ kết luận engine sinh trùng và tự gỡ bớt — mà dữ
liệu đo được cho thấy hai ứng viên cùng nhãn có thể là hai finding **high** khác nhau. Ứng viên đã mang sẵn
trích dẫn kèm vị trí; đây là chuyện dùng dữ liệu đã có, không phải chuyện tìm thêm dữ liệu.*

#### Scenario: hai ứng viên cùng nhãn phân loại
- **WHEN** hai ứng viên mang cùng một nhãn nhưng nhắm hai chỗ khác nhau
- **THEN** dòng liệt kê cho thấy hai chỗ khác nhau ấy
