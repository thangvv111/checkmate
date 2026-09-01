## ADDED Requirements

### Requirement: Bộ trigger đóng cho sinh probe

Hệ thống SHALL tổ chức tri thức sinh probe của skill code theo một bộ **trigger đóng** (danh mục cố
định, mỗi trigger là một *cách làm lộ lỗi*). Khuôn án lệ SHALL là **ví dụ trực thuộc một trigger**,
không còn là danh sách phẳng tự do. Model khi lập kế hoạch probe SHALL khai `trigger` cho từng probe
từ đúng danh mục này; giá trị ngoài danh mục thì máy MUST bỏ trường đó và ghi log — KHÔNG vứt probe,
KHÔNG ném lỗi.

Một bộ đóng là điều kiện để phân loại nhất quán và để kho tri thức KHÔNG phình theo thời gian —
tấm gương là bộ trigger ODC đứng yên từ 1992.

#### Scenario: probe khai trigger hợp lệ
- **WHEN** model trả kế hoạch probe với `trigger: "bien_the_dau_vao"` thuộc danh mục
- **THEN** trường được giữ nguyên và đi vào thống kê của lượt chấm

#### Scenario: deadlock tất định không cần trigger riêng
- **WHEN** một PR gây deadlock làm probe treo quá hạn
- **THEN** lưới treo hiện hành tự sinh finding mức chặn bằng máy, không phụ thuộc model chọn trigger nào

#### Scenario: probe khai trigger lạ
- **WHEN** model trả `trigger: "sang_tao_moi"` không thuộc danh mục
- **THEN** probe vẫn được chạy bình thường, trường trigger bị bỏ, log ghi một dòng nói giá trị lạ là gì

### Requirement: Ví dụ per-trigger có trần và luật đào thải

Mỗi trigger SHALL giữ tối đa **2 ví dụ án lệ**. Khi một bài học mới cần vào một trigger đã đủ 2 ví
dụ, một ví dụ cũ MUST đi ra — ưu tiên GIỮ ví dụ đã dẫn tới finding thật gần đây nhất, và ví dụ đi ra
được ghi vào phần lưu trữ của file luật (người đọc được, máy không phát vào prompt). Tổng số dòng
khuôn phát vào prompt MUST NOT vượt trần R12.3 hiện hành.

Mỗi ví dụ giữ nguyên các gác cơ học của R12: án lệ phải có mốc định vị truy được nguồn, phát đúng
một dòng, `dieu_kien` bật theo spec repo đích nếu có.

#### Scenario: thêm ví dụ vào trigger đã đầy
- **WHEN** trigger `duong_loi` đang có 2 ví dụ và một bài học mới được đúc vào đó
- **THEN** ví dụ ít giá trị nhất (chưa từng dẫn tới finding thật, hoặc cũ nhất trong các ví dụ ngang
  giá trị) rời khỏi tập phát-vào-prompt, và tổng số dòng phát không đổi

#### Scenario: ví dụ thiếu mốc án lệ
- **WHEN** một ví dụ được thêm mà không có mốc định vị nguồn
- **THEN** cửa phát từ chối ví dụ đó như R12.2 hiện hành

### Requirement: Không có chỉ tiêu độ phủ trigger

Hệ thống MUST NOT đặt chỉ tiêu, phần thưởng, hay phép đếm «độ phủ trigger» ở bất kỳ nơi nào model
nhìn thấy (prompt sinh probe, prompt viết finding, thông điệp sinh lại). Thước đo của một probe vẫn
là: phân biệt được hai nhánh, hoặc neo được vào luật spec. Phân bố trigger CHỈ được ghi vào
`probe_stats` của verdict cho người vận hành đọc.

Lý do phải thành luật: trần probe từng biến thành chỉ tiêu — `ke_hoach` bằng đúng trần ở 14/14 lượt
đo được. Một danh mục đóng phát vào prompt kèm bất kỳ tín hiệu thưởng độ phủ nào sẽ sinh probe chiếu
lệ rải đều danh mục, đẩy số đẹp lên trong khi kill-rate bằng không — làm false-PASS trông đáng tin
hơn thực tế.

#### Scenario: prompt sinh probe
- **WHEN** dựng prompt sinh probe
- **THEN** prompt chứa danh mục trigger và ví dụ, nhưng KHÔNG chứa bất kỳ câu nào yêu cầu phủ đủ/
  phủ đều trigger, và KHÔNG chứa phép đếm probe-theo-trigger của các lượt trước

### Requirement: Hai trường phân loại lỗi trên finding

Finding của skill code SHALL mang ba trường tuỳ chọn: `va_toi_thieu` (một dòng phác «bản vá tối
thiểu sửa cái gì»), `odc_type` (một trong bảy giá trị ODC: assignment_init · checking ·
algorithm_method · function_class · timing_serialization · interface_messages · relationship), và
`qualifier` (missing · incorrect · extraneous). Model MUST viết `va_toi_thieu` trước rồi suy
`odc_type` từ đó. Máy validate enum: giá trị ngoài danh mục thì trường về `khong_ro` kèm log.

Ba trường này là **telemetry**: chúng MUST NOT tham gia quyết định PASS/FAIL, MUST NOT đổi severity,
và vắng mặt không làm finding kém giá trị pháp lý. Verdict cũ không có trường này MUST đọc lại được
nguyên vẹn.

#### Scenario: phân loại suy từ phác bản vá
- **WHEN** model viết `va_toi_thieu: "thêm điều kiện kiểm null trước khi đọc .length"` và
  `odc_type: "checking"`, `qualifier: "missing"`
- **THEN** finding mang đủ ba trường trong verdict

#### Scenario: type lạ không đổi verdict
- **WHEN** model trả `odc_type: "sieu_loi"` cho một finding high
- **THEN** trường về `khong_ro`, log một dòng, severity và kết quả PASS/FAIL không đổi

#### Scenario: replay verdict cũ
- **WHEN** đọc lại một verdict ghi trước change này (finding không có ba trường mới)
- **THEN** đọc thành công, ba trường vắng mặt, không lỗi không cảnh báo
