## ADDED Requirements

### Requirement: Trần lượt chạy đồng thời, vượt trần thì từ chối ngay chứ không xếp hàng ngầm

Số lượt chấm chạy đồng thời SHALL có trần (gốc: R8.1). Vượt trần thì đường **bấm tay** MUST trả lỗi «đang
bận» ngay, và **chế độ trực** MUST ngừng nạp thêm lượt trong vòng quét đó. Hệ thống MUST NOT xếp hàng ngầm
rồi để người dùng ngồi đợi mà không biết vì sao.

Trần MUST là một hằng có tên, dùng chung cho cả hai đường. Hai chỗ quyết cùng một luật bằng hai biểu thức
viết tay là hai chỗ sẽ lệch nhau — khuôn «cửa song sinh» đã bị bắt chín lần trong lịch sử repo này.

Vì sao có trần (gốc: R8.2): mỗi lượt tốn một worktree trên đĩa, một lượt chạy bộ test thật, và các lời gọi
model. Nâng trần là **quyết định về tài nguyên máy chủ**, không phải tinh chỉnh giao diện.

Lượt chấm còn ở trạng thái đang-chạy sau khi tiến trình web khởi động lại MUST NOT chiếm chỗ trong trần —
luật đó đã khai ở `ben-dong-su-kien`, nhắc ở đây vì nó là điều kiện để trần không bị khoá vĩnh viễn.

#### Scenario: đường bấm tay khi đã đủ trần
- **WHEN** đã có đủ số lượt chấm đang chạy bằng trần và người dùng bấm chạy thêm
- **THEN** yêu cầu bị từ chối ngay với mã 429 và lời nói rõ checker đang bận, không xếp hàng

#### Scenario: chế độ trực khi đã đủ trần
- **WHEN** chế độ trực quét thấy pull request mới nhưng đã đủ trần
- **THEN** vòng quét đó ngừng nạp thêm; không lượt nào bị bỏ mất — vòng sau nạp tiếp

#### Scenario: dưới trần
- **WHEN** số lượt đang chạy nhỏ hơn trần
- **THEN** lượt mới được khởi động

### Requirement: Một pull request chỉ có một lượt chấm đang chạy

Khi một pull request đã có lượt chấm đang chạy, hệ thống MUST từ chối khởi động lượt thứ hai trên chính
pull request đó, kèm lời nói rõ đang có lượt chạy. Chế độ trực MUST bỏ qua pull request đó trong vòng quét.

Vì sao thành luật: hai lượt song song trên cùng một pull request cho ra **hai verdict trùng** — tốn gấp đôi
lời gọi model và thời gian chạy test, rồi để lại hai bản ghi cho cùng một commit khiến sổ và cổng khó đọc.
Khác với trần đồng thời (bảo vệ tài nguyên máy chủ), luật này bảo vệ **tính có nghĩa của dữ liệu**.

Quyết định này MUST tách khỏi chỗ dựng phản hồi, để mỗi nhánh từ chối khoá được bằng test: hôm nay chỉ nửa
dữ liệu có test, còn nửa quyết định nằm trong handler nên không ca nào gọi tới được.

#### Scenario: PR đã có lượt đang chạy
- **WHEN** người dùng khởi động lượt chấm cho một pull request đang được chấm
- **THEN** yêu cầu bị từ chối với mã 409 và lời nêu số pull request; không lượt mới nào được tạo

#### Scenario: PR khác vẫn chạy được
- **WHEN** pull request A đang được chấm và người dùng khởi động lượt cho pull request B
- **THEN** lượt của B được khởi động (miễn là chưa đụng trần đồng thời)

#### Scenario: thứ tự hai gác
- **WHEN** hệ thống đã đủ trần đồng thời VÀ pull request được yêu cầu cũng đang có lượt chạy
- **THEN** lời từ chối là lời của trần đồng thời (429) — gác rẻ hơn và chung hơn đứng trước

### Requirement: Lượt chấm không dùng chung ref git

Ref tạm mà một lượt chấm fetch về SHALL mang tên riêng theo pull request — **kể cả ref của nhánh gốc**
(gốc: R8.3).

Dùng chung một tên ref cho nhánh gốc thì lượt sau force-update ref đó, và lượt trước có thể đối chứng nhầm
sang commit mới hơn commit nó định so. Verdict vẫn ra, nhưng ra **trên đối chứng sai** — không có dấu hiệu
nào để người đọc nhận biết. Đây là loại hỏng im lặng nguy hiểm nhất của việc chạy song song.

#### Scenario: hai lượt trên hai pull request khác nhau
- **WHEN** hai lượt chấm chạy song song trên hai pull request
- **THEN** mỗi lượt fetch vào ref riêng của pull request mình, cả ref nhánh PR lẫn ref nhánh gốc

### Requirement: Sandbox chạy trên máy chủ CheckMate với môi trường dựng bằng danh sách cho phép

Probe do model sinh SHALL chạy trên **chính máy chủ CheckMate**, không phải trên hạ tầng của nhà cung cấp
model (gốc: R8.10): model không có tool, nó chỉ đề xuất và viết code probe.

Môi trường truyền cho **mọi** tiến trình con — cả tiến trình chạy test lẫn tiến trình gọi model của chính
checker — MUST được dựng bằng **danh sách CHO PHÉP**, không bao giờ bằng danh sách cấm (gốc: R8.12).
Token, khoá API và biến bí mật khác MUST NOT lọt vào tiến trình chạy test: code của pull request được chạy
thật, nên phải coi nó là code không tin được (gốc: R8.11). Đây là một đường bảo vệ ⛔C3.

Vì sao phải là danh sách cho phép: danh sách cấm đòi người viết biết trước **mọi bí mật sẽ tồn tại trong
tương lai**. Thêm một khoá vào file môi trường là rò thêm một bí mật, và vì không ai phải sửa code nên
không ai nhận ra. Đo được: bản trước truyền cả môi trường rồi cắt đúng một tên, nên `GITHUB_TOKEN` của máy
chủ chảy sang tiến trình CLI ở mọi lượt chấm dù nó không cần chìa đó để làm gì.

#### Scenario: biến bí mật mới xuất hiện trong môi trường máy chủ
- **WHEN** máy chủ có thêm một biến môi trường mang bí mật mà danh sách cho phép không nêu
- **THEN** biến đó KHÔNG lọt vào tiến trình chạy test hay tiến trình gọi model — không cần sửa code nào

#### Scenario: biến cần cho bộ chạy test
- **WHEN** tiến trình chạy test cần các biến nền của hệ điều hành và toolchain
- **THEN** chúng có mặt vì nằm trong danh sách cho phép, và lượt chạy không hỏng vì thiếu môi trường
