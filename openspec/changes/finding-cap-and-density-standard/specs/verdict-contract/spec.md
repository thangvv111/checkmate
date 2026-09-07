## MODIFIED Requirements

### Requirement: Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ

Kết quả của một lượt chấm SHALL chỉ có hai giá trị: `PASS` hoặc `FAIL` (gốc: R6.1). MUST NOT có trạng thái
thứ ba kiểu «PASS có điều kiện» — mập mờ ở đây là chỗ để lách. Lượt chấm không kết luận được thì **thất
bại**, không phải một giá trị verdict thứ ba (xem requirement «PASS phải có bằng chứng»).

Verdict SHALL là `FAIL` khi có ít nhất một finding mức `high` (gốc: R6.3). Giá trị severity lạ hoặc đời cũ
MUST được chuẩn hoá fail-closed về `high` trước khi tính — «không đọc được mức» không được thành «mức thấp».
Phép chuẩn hoá SHALL nhận **mọi kiểu giá trị** — số, boolean, object, thiếu trường — và MUST NOT ném; một
severity không phải chuỗi là một giá trị lạ, không phải một lỗi hạ tầng.

Verdict SHALL ghim `artifact_ref.sha_or_hash` (gốc: R6.2): commit SHA với code, hash nội dung với tài liệu.
Không ghim thì cổng không so được head, và verdict không thuộc về phiên bản nào.

Verdict SHALL kèm `probe_stats` (gốc: R6.4) để người đọc biết `PASS` nói trên cơ sở nào, trong đó số probe
**lên kế hoạch** và số **thực chạy** nêu tách bạch (gốc: R6.5), cùng phân bố các trạng thái phân loại —
gồm cả vùng chưa kết luận được: nghi vấn, bỏ qua, thất lạc, nghi lỗi có sẵn (gốc: R1.13), và **số probe bị
cách ly** trong lượt. Số thất lạc SHALL tính trên **mọi** probe đã đưa vào chạy, kể cả probe thư viện —
một nhóm probe chạy mà không được đếm ở đâu là một lỗ đúng bằng kích thước nhóm ấy. `PASS` với 0
probe chạy được không phải `PASS` có giá trị, và người đọc phải thấy điều đó ngay trong dữ liệu verdict,
không phải suy từ lời văn. Verdict SHALL kèm **mức cô lập** của lượt chạy: môi trường mà code artifact thực sự đã chạy trong đó.
Giá trị ấy SHALL phản ánh thứ **thực tế đã dùng**, không phải cấu hình mong muốn — «đã cấu hình để cô lập»
và «đã cô lập» là hai câu khác nhau, và chỉ câu thứ hai đáng ghi vào verdict. VẮNG trường ấy nghĩa là bản
ghi có trước phép đo này, KHÔNG có nghĩa là không cô lập.

Verdict SHALL kèm `volume_standard` — **chuẩn khối lượng mà lượt chấm đã bị chấm theo**, dưới dạng trường
có kiểu:

- trần đã áp cho skill của lượt, kèm **nguồn** (`default` · `repo` · `default_unreadable` · `no_repo`) và
  `clamped_from` khi bị kẹp; với `skill-code` thêm trần của người vận hành và nguồn nào đang cắn;
- **số đếm theo tầng** — thô sau vòng 1, sau lưới máy, trước cắt, sau cắt, cuối — và số bị bỏ vì chạm trần;
- với `skill-doc`: phép đo mật độ (số từ, phương pháp đếm, mật độ đo được, dải cỡ, ngưỡng của dải, có vượt
  không, có áp không và vì sao không); với `skill-code` khối này **vắng**, không ghi 0.

Không bề mặt đọc nào được suy các giá trị này bằng cách đếm lại danh sách finding đã cắt hay so khớp nội
dung thông điệp — danh sách đã cắt theo định nghĩa không còn mang con số trước khi cắt. VẮNG `volume_standard`
nghĩa là bản ghi có trước phép đo này — KHÔNG BIẾT, phân biệt được bằng máy với «đã đo và bằng mặc định».

Việc BÀY RA những số này thuộc `man-run`; ở đây là yêu cầu chúng **có mặt**.

*Vì sao `volume_standard` là nghĩa vụ của hợp đồng verdict chứ không phải một tiện ích: chuẩn nay do repo
đích khai được, tức mỗi đội chấm theo một ngưỡng khác nhau. Verdict không mang ngưỡng thì `PASS` của đội
chấm theo 20 và `PASS` của đội chấm theo 200 trông giống hệt nhau — cổng mất đúng thứ làm nó có giá trị. Và
số đếm trước khi cắt là mẫu số của mọi phép đánh giá xem chuẩn đang đặt đúng hay sai; để nó ở log là quyết
định rằng câu hỏi ấy sẽ không bao giờ trả lời được từ dữ liệu đã có.*

#### Scenario: có finding mức high
- **WHEN** danh sách finding có ít nhất một mức `high`
- **THEN** kết quả là `FAIL`

#### Scenario: severity lạ hoặc đời cũ
- **WHEN** một finding mang severity không đọc được, hoặc giá trị đời cũ như `blocking`
- **THEN** nó được chuẩn hoá về `high` và kết quả là `FAIL` — fail-closed, không rơi về mức thấp

#### Scenario: severity không phải chuỗi
- **WHEN** một finding mang severity là số `3`, `true`, `{}`, hoặc thiếu trường
- **THEN** nó được chuẩn hoá về `high`, kết quả là `FAIL`, và engine KHÔNG ném — lượt chấm không thành «lỗi»

#### Scenario: không có finding chặn
- **WHEN** mọi finding đều ở mức `medium` hoặc `low`, hoặc không có finding nào
- **THEN** kết quả là `PASS`, và `probe_stats` vẫn có mặt với số kế hoạch, số ghi nhận và vùng xám

#### Scenario: lượt chạy trong môi trường cô lập
- **WHEN** probe chạy trong môi trường cô lập
- **THEN** verdict khai mức cô lập ấy kèm runtime đã dùng

#### Scenario: lượt chạy trên nền không cô lập được
- **WHEN** nền đang chạy không có runtime cô lập
- **THEN** verdict khai rõ là chạy KHÔNG cô lập — không vắng mặt, không để người đọc suy

#### Scenario: lượt chấm phải cách ly probe để chạy được
- **WHEN** engine loại một số probe vì lỗi nạp rồi chạy tiếp
- **THEN** `probe_stats` khai số probe bị cách ly, và số ấy KHÔNG bị gộp vào các nhóm khác

#### Scenario: probe thư viện chạy mà không có kết quả
- **WHEN** một probe thư viện nằm trong danh sách chạy nhưng không có kết quả
- **THEN** nó được đếm là thất lạc — không nhóm probe nào chạy mà không được đếm

#### Scenario: verdict mang chuẩn và số đếm theo tầng
- **WHEN** một lượt doc kết thúc với 25 ứng viên thô, 8 qua lưới máy, trần 4, tài liệu 1000 từ
- **THEN** verdict mang trần 4 kèm nguồn, `raw_round1: 25`, `before_cut: 8`, `after_cut: 4`,
  `dropped_by_cap: 4`, và phép đo mật độ `8/1000`

#### Scenario: lượt code khai cả hai trần và không mang mật độ
- **WHEN** lượt chấm là `skill-code` với repo khai `probe_cap: 40` và operator đặt 6
- **THEN** verdict khai trần hiệu dụng 6, giá trị repo 40, giá trị operator 6, nguồn cắn `operator`; khối
  mật độ VẮNG

#### Scenario: verdict đời cũ đọc ra KHÔNG BIẾT
- **WHEN** đọc một verdict ghi trước khi có `volume_standard`
- **THEN** chuẩn và số đếm của nó đọc ra là KHÔNG BIẾT, không hiện 0, không hiện mặc định

#### Scenario: bề mặt đọc MUST NOT suy lại con số
- **WHEN** verdict có `findings.length = 3` và `volume_standard.counts.before_cut = 140`
- **THEN** mọi bề mặt bày «trước khi cắt» hiện 140 lấy từ trường có kiểu — không bề mặt nào hiện 3 ở nhãn ấy

#### Scenario: repo hạ chuẩn thì verdict phải lộ ra
- **WHEN** repo đích khai `density_per_1000_words: 500`
- **THEN** verdict khai ngưỡng dải đã nhân theo 500 và nguồn `repo`, nên người đọc phân biệt được với lượt
  chấm theo mặc định
