## MODIFIED Requirements

### Requirement: Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ

Kết quả của một lượt chấm SHALL chỉ có hai giá trị: `PASS` hoặc `FAIL` (gốc: R6.1). MUST NOT có trạng thái
thứ ba kiểu «PASS có điều kiện» — mập mờ ở đây là chỗ để lách. Lượt chấm không kết luận được thì **thất
bại**, không phải một giá trị verdict thứ ba (xem requirement «PASS phải có bằng chứng»).

Verdict SHALL là `FAIL` khi có ít nhất một finding mức `high` (gốc: R6.3). Giá trị severity lạ hoặc đời cũ
MUST được chuẩn hoá fail-closed về `high` trước khi tính — «không đọc được mức» không được thành «mức thấp».

Verdict SHALL ghim `artifact_ref.sha_or_hash` (gốc: R6.2): commit SHA với code, hash nội dung với tài liệu.
Không ghim thì cổng không so được head, và verdict không thuộc về phiên bản nào.

Verdict SHALL kèm `probe_stats` (gốc: R6.4) để người đọc biết `PASS` nói trên cơ sở nào, trong đó số probe
**lên kế hoạch** và số **thực chạy** nêu tách bạch (gốc: R6.5), cùng phân bố các trạng thái phân loại —
gồm cả vùng chưa kết luận được: nghi vấn, bỏ qua, thất lạc, nghi lỗi có sẵn (gốc: R1.13), và **số probe bị
cách ly** trong lượt. Số thất lạc SHALL tính trên **mọi** probe đã đưa vào chạy, kể cả probe thư viện —
một nhóm probe chạy mà không được đếm ở đâu là một lỗ đúng bằng kích thước nhóm ấy. `PASS` với 0
probe chạy được không phải `PASS` có giá trị, và người đọc phải thấy điều đó ngay trong dữ liệu verdict,
không phải suy từ lời văn. Việc BÀY RA những số này thuộc `man-run`; ở đây là yêu cầu chúng **có mặt**.

#### Scenario: có finding mức high
- **WHEN** danh sách finding có ít nhất một mức `high`
- **THEN** kết quả là `FAIL`

#### Scenario: severity lạ hoặc đời cũ
- **WHEN** một finding mang severity không đọc được, hoặc giá trị đời cũ như `blocking`
- **THEN** nó được chuẩn hoá về `high` và kết quả là `FAIL` — fail-closed, không rơi về mức thấp

#### Scenario: không có finding chặn
- **WHEN** mọi finding đều ở mức `medium` hoặc `low`, hoặc không có finding nào
- **THEN** kết quả là `PASS`, và `probe_stats` vẫn có mặt với số kế hoạch, số ghi nhận và vùng xám

#### Scenario: lượt chấm phải cách ly probe để chạy được
- **WHEN** engine loại một số probe vì lỗi nạp rồi chạy tiếp
- **THEN** `probe_stats` khai số probe bị cách ly, và số ấy KHÔNG bị gộp vào các nhóm khác

#### Scenario: probe thư viện chạy mà không có kết quả
- **WHEN** một probe thư viện nằm trong danh sách chạy nhưng không có kết quả
- **THEN** nó được đếm là thất lạc — không nhóm probe nào chạy mà không được đếm
