## ADDED Requirements

### Requirement: Hành động GitHub của một lượt chấm phải theo repo của LƯỢT, không theo repo đang chọn

Mọi lời gọi GitHub **thuộc về một lượt chấm cụ thể** — đăng verdict, đăng receipt, gắn trạng thái commit,
đọc pull request hiện tại, đóng pull request, trả về dev, và **merge** — SHALL lấy repo từ **lượt ấy**
(trường `repo` gán lúc chạy), MUST NOT lấy từ repo đang chọn.

Khi lượt **không có** trường repo, hoặc repo ấy **không còn** trong danh sách đã khai, engine SHALL **không
thực hiện hành động nào** và SHALL ghi log nêu đúng lý do. MUST NOT rơi về repo đang chọn, MUST NOT đoán ra
một repo.

Ràng buộc này SHALL do **một cửa dựng cấu hình theo repo** cưỡng chế, không do từng chỗ gọi tự nhớ.

*Vì sao đây là luật riêng chứ không phải hệ quả hiển nhiên: requirement «repo đang chọn chỉ là khung nhìn»
và «lượt của repo A MUST NOT lọt vào repo B» đã có, nhưng cả hai viết cho **lịch sử và lọc**. Bề mặt hành
động GitHub không ai khai, và đó đúng là chỗ lọt — đo được 07/09 trên prod ngay sau khi thêm repo thứ ba.*

*Vì sao thà không hành động còn hơn đoán: hậu quả của hai lựa chọn không cân nhau. Không đăng verdict thì
người ta vào màn chấm đọc; đăng nhầm repo thì một đội nhận finding của cây mã nguồn khác dưới danh nghĩa
CheckMate, và ở cổng merge thì máy đưa code vào trunk của một repo không ai yêu cầu — ⛔C1 bị phá theo
đúng đường tệ nhất.*

*Vì sao lỗi này ẩn được lâu: khi hệ chỉ có MỘT repo thì «repo đang chọn» luôn trùng «repo của lượt», nên
mọi ca test một-repo đều xanh. Nó chỉ lộ ra ở repo thứ hai — tức đúng lúc sản phẩm bắt đầu phục vụ nhiều
đội.*

#### Scenario: đăng verdict khi repo đang chọn khác repo của lượt
- **WHEN** một lượt chấm của repo A kết thúc trong lúc giao diện đang chọn repo B
- **THEN** verdict được đăng lên pull request của **repo A**, và không lời gọi nào chạm repo B

#### Scenario: gắn trạng thái commit theo repo của lượt
- **WHEN** engine gắn trạng thái cho commit của một lượt thuộc repo A
- **THEN** lời gọi trỏ repo A — commit ấy chỉ tồn tại ở đó

#### Scenario: cổng merge theo repo của lượt
- **WHEN** người vận hành mở màn hình một lượt của repo A và bấm merge, trong lúc đang chọn repo B
- **THEN** hành động merge trỏ pull request của **repo A**; MUST NOT merge pull request cùng số ở repo B

#### Scenario: lượt không có repo thì không hành động
- **WHEN** một lượt chấm không mang trường repo (lượt dán tay, hoặc bản ghi đời cũ)
- **THEN** engine không đăng, không gắn trạng thái, không merge — và ghi log nêu rõ vì sao

#### Scenario: repo của lượt đã bị gỡ khỏi danh sách
- **WHEN** lượt mang repo A nhưng A không còn trong danh sách đã khai
- **THEN** engine không thực hiện hành động nào, ghi log nêu tên repo thiếu; MUST NOT rơi về repo đang chọn

#### Scenario: một cửa duy nhất cưỡng chế
- **WHEN** đọc mã nguồn các đường hành động sau khi lượt kết thúc
- **THEN** mỗi đường nhận cấu hình dựng từ repo của lượt qua cùng một hàm; không đường nào dùng thẳng repo
  đang chọn
