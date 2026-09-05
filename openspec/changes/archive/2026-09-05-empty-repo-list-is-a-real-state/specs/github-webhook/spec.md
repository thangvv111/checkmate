## MODIFIED Requirements

### Requirement: Payload phải trỏ repo ĐÃ KHAI, và chỉ sự kiện pull request mới chạy chấm

Engine SHALL chỉ xử lý sự kiện `pull_request`, và chỉ với những hành động mở ra một commit mới cần chấm.

Repo trong payload SHALL được đối chiếu với danh sách repo đã khai trong cấu hình; repo không có trong danh
sách SHALL bị từ chối.

Phép đối chiếu ấy SHALL là **hàm dùng chung** với mọi đường vào khác có thể khởi một lượt chấm. Đường
webhook MUST NOT giữ một bản hiện thực riêng của cùng phép kiểm.

Lượt chấm khởi từ webhook SHALL đi qua **đúng** phép kiểm điều kiện chạy như đường polling và đường bấm tay.

*Vì sao phải kiểm repo: chữ ký chỉ chứng minh «người gửi biết bí mật», không chứng minh «việc này nên
làm». Một webhook hợp lệ trỏ tới repo lạ sẽ khiến CheckMate clone và chạy test của một repo chưa ai khai —
tức chạy code lạ trên máy chủ. Bí mật có thể rò theo nhiều đường (lộ ở GitHub, lộ ở một repo khác cùng
dùng chung bí mật), nên chữ ký KHÔNG được là gác duy nhất.*

*Vì sao phép đối chiếu phải dùng chung — đo được: bản trước dựng gác này riêng cho đường webhook, và đường
polling KHÔNG có gác tương ứng. Khi danh sách repo rỗng, webhook trả «repo không có trong cấu hình» đúng
như luật, còn chế độ trực vẫn tự khởi hai lượt chấm trên một repo suy đoán. Cùng một câu hỏi, hai đường
trả lời khác nhau — và đường không có gác là đường thật sự chạy code.*

*Vì sao đi qua cùng phép kiểm điều kiện chạy: webhook có thể tới dồn dập — một lần push nhiều commit, hoặc
một tác nhân gửi lặp. Trần chạy đồng thời và luật «một verdict một commit» là thứ giữ máy chủ khỏi bị dồn
việc, và chúng phải áp cho MỌI đường vào, không riêng đường người bấm.*

#### Scenario: sự kiện pull request trên repo đã khai
- **WHEN** nhận `pull_request` với hành động cần chấm, repo có trong cấu hình
- **THEN** một lượt chấm được khởi, qua đúng phép kiểm điều kiện chạy

#### Scenario: repo không có trong cấu hình
- **WHEN** payload trỏ một repo chưa khai
- **THEN** yêu cầu bị từ chối và không lượt chấm nào được khởi

#### Scenario: chưa khai repo nào
- **WHEN** danh sách repo rỗng và webhook mang một payload hợp lệ
- **THEN** yêu cầu bị từ chối — không repo nào được suy ra để chấm

#### Scenario: sự kiện khác pull request
- **WHEN** nhận một loại sự kiện khác
- **THEN** engine nhận và bỏ qua, không coi là lỗi

#### Scenario: cùng một commit đến hai lần
- **WHEN** webhook cho cùng pull request và cùng commit tới lần thứ hai
- **THEN** không lượt chấm thứ hai nào được khởi
