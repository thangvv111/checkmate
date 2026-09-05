# probe-library-screen Specification

## Purpose
TBD - created by archiving change probe-library-screen. Update Purpose after archive.

## Requirements

### Requirement: Hàng đợi giao bày cả phần yếu của bằng chứng

Màn SHALL bày cả phần yếu của thứ nó liệt kê, không chỉ phần đẹp. Sau change, «phần yếu» nghĩa là:

- đề xuất **hạng 2** (chưa từng quan sát thấy nổ, chỉ qua được cửa đột biến) phải phân biệt được với **hạng
  1** (đã nổ thật) — hai mức bằng chứng khác nhau thì người đọc phải thấy khác nhau;
- probe **không tách được** thành file độc lập ⇒ không giao được — phải hiện ra kèm lý do;
- đề xuất đã ra từ lâu mà repo đích **chưa nhận** — hàng đợi không được giả vờ là đã xong việc.

*Vì sao giữ luật này khi đối tượng đổi:* một màn chỉ bày phần đẹp làm người vận hành tin cơ chế đang chạy
tốt hơn thực tế. Sai lầm ấy không phụ thuộc vào việc màn đang bày cái gì.

#### Scenario: đề xuất hạng 1
- **WHEN** một đề xuất đến từ probe đã nổ (`hoi_quy` hoặc `vi_pham_luat_moi`)
- **THEN** dòng của nó nói rõ nó **đã bắt được lỗi thật**, và nêu lỗi ấy

#### Scenario: đề xuất hạng 2
- **WHEN** một đề xuất đến từ probe xanh cả hai nhánh, chỉ qua cửa đột biến
- **THEN** màn nói thẳng **«chưa từng bắt được lỗi nào»**, không để trống chỗ ấy và không bày ngang hạng 1

#### Scenario: probe không giao được
- **WHEN** một probe đủ bằng chứng nhưng không tách được thành file độc lập
- **THEN** nó hiện ra kèm lý do, không biến mất im lặng

#### Scenario: đọc được khi không phân biệt được màu
- **WHEN** người đọc không dựa vào màu
- **THEN** hạng của từng đề xuất vẫn đọc được bằng chữ, và dòng tóm tắt vẫn nói đủ kết luận

### Requirement: Ba trạng thái rỗng nói BA câu khác nhau

Màn SHALL phân biệt **ba** trạng thái rỗng, không gộp:

1. **chưa kết nối repo nào** — vấn đề ở cấu hình;
2. **chưa chấm lượt nào** — chưa có gì để sinh đề xuất;
3. **đã chấm N lượt mà chưa probe nào đủ bằng chứng** — cơ chế đang chạy đúng.

Trạng thái 3 là trạng thái mới, và nó là **trạng thái thường gặp nhất**: hạng 1 hiếm theo cấu tạo (đo trên
prod trước change: **0/7** probe từng nổ), nên nhiều tuần không có gì để giao là **bình thường**.

⛔ Màn MUST NOT để người vận hành đọc sự im lặng ấy thành «cơ chế không chạy». Trạng thái 3 SHALL nói rõ
**đã chấm bao nhiêu lượt** — im lặng có số đo đi kèm thì đọc được, im lặng trơ thì không.

#### Scenario: chưa kết nối repo nào
- **WHEN** cấu hình không có repo nào
- **THEN** màn nói chưa kết nối repo nào và chỉ đường tới chỗ thêm repo, KHÔNG nói hàng đợi trống

#### Scenario: repo đã kết nối nhưng chưa chấm lượt nào
- **WHEN** repo đang chọn chưa có lượt chấm nào
- **THEN** màn nói hàng đợi dựng dần từ các lượt chấm trên repo này

#### Scenario: đã chấm nhưng chưa đủ bằng chứng
- **WHEN** đã chấm nhiều lượt mà chưa probe nào vào hạng 1 hoặc 2
- **THEN** màn nói rõ **đã chấm bao nhiêu lượt**, và rằng đây là trạng thái bình thường

#### Scenario: rỗng không phải hỏng
- **WHEN** màn ở bất kỳ trạng thái rỗng nào trong ba
- **THEN** nó không dùng màu hay lời văn của trạng thái hỏng

### Requirement: Nội dung do model và repo đích sinh ra là DỮ LIỆU trên màn hàng đợi

Mã probe và mọi nội dung đến từ model hay repo đích SHALL được đối xử như **dữ liệu**, không như markup
(⛔C4): chèn bằng `textContent`, không bằng `innerHTML`.

Luật này **không đổi một chữ** so với bản cũ, nhưng **quan trọng hơn**: trước, mã hiện trên màn là thứ đã
nằm trong kho và chỉ để đọc; nay nó là thứ người vận hành sắp **copy sang một repo khác**. Một đoạn mã bị
dựng sai trên màn nay có đường đi thẳng sang một hệ khác.

#### Scenario: probe chứa ký tự đóng thẻ
- **WHEN** code hoặc mục đích của một probe chứa chuỗi đóng thẻ HTML
- **THEN** nó hiện ra nguyên văn dưới dạng chữ, không tạo phần tử nào trong tài liệu

#### Scenario: người chưa đăng nhập gọi đường đọc hàng đợi
- **WHEN** một yêu cầu không có phiên hợp lệ gọi đường đọc hàng đợi giao
- **THEN** bị từ chối như mọi đường sau cửa phiên, không trả về đề xuất nào

#### Scenario: nội dung trả về không mang bí mật
- **WHEN** rà nội dung màn và API hàng đợi
- **THEN** không có chìa riêng, token, hay giá trị người vận hành gõ vào ô cấu hình

### Requirement: Số trên màn hàng đợi phải là số ĐO ĐƯỢC

Mọi con số trên màn SHALL là số **đo được từ dữ liệu thật**: đếm bằng tay từ danh sách bày ra thì phải ra
đúng con số ở đầu màn. Các số áp luật này: số đề xuất đang chờ · số theo từng hạng · số lượt chấm đã chạy
mà chưa sinh đề xuất nào.

⛔ Hàng đợi giao MUST NOT có trần. Đề xuất phải rỗng dần vì repo đích **nhận**, không vì đụng trần rồi bị
loại — một trần ở đây sẽ âm thầm vứt bằng chứng vừa kiếm được, đúng thứ change này gỡ đi.

#### Scenario: số đề xuất
- **WHEN** màn hiện số đề xuất đang chờ
- **THEN** con số ấy đếm từ dữ liệu thật, khớp với số dòng bày ra

#### Scenario: nhiều repo đã khai
- **WHEN** hệ thống có nhiều repo và người dùng đang chọn một repo
- **THEN** màn chỉ bày đề xuất của repo ấy

#### Scenario: không đọc được dữ liệu hàng đợi
- **WHEN** dữ liệu hàng đợi của repo đang chọn không đọc được
- **THEN** màn nói không đo được kèm nguyên nhân, KHÔNG hiện `0 đề xuất`

#### Scenario: đường sai — đặt trần cho hàng đợi
- **WHEN** hiện thực thêm một trần cho hàng đợi rồi loại bớt khi đầy
- **THEN** đó là vi phạm: đề xuất bị vứt vì đụng trần là mất bằng chứng đã kiếm được, không phải dọn rác
