# Design — bộ trục phân loại code trên nền ODC

## Ba tầng, và cái gì nằm ở tầng nào

```
+----------------------------------------------------------------------+
| TRIGGER (dong, 10)      | cai gi LAM LO loi  | thuoc tinh cua PROBE  |
| DEFECT TYPE x QUALIFIER | loi LA GI          | thuoc tinh cua FINDING|
| VI DU AN LE (du lieu)   | lan nao DA HONG    | tran 2/trigger, dao   |
|                         |                    | thai — khong doc het, |
|                         |                    | chi do phan bo        |
+----------------------------------------------------------------------+
```

Nguyên tắc mượn từ ODC (IEEE TSE 1992, bản 5.2/2013): scheme sống 34 năm không phình vì án lệ
**không nằm trong bảng phân loại** — bảng đóng, dữ liệu mở, và dữ liệu dùng để đo phân bố chứ không
để đọc tuần tự. Đây chính là câu trả lời cho «CheckMate chạy 1 năm thì kho án lệ thành gì».

**R1 đứng nguyên.** Bảy nhãn máy của R1 (`hoi_quy`, `pass`, `nghi_van`…) là *kết quả phép thử trên
hai nhánh* — trục thứ tư, độc lập, đã đóng sẵn. Trigger không thay nó và không được nhầm với nó.

## Bộ trigger: 10 chọn, 7 loại — từng cái có lý do

Đối chiếu 21 trigger ODC với mô hình CheckMate (probe tất định chạy trong sandbox worktree 2 nhánh):

| # | Trigger (mã máy) | Gốc ODC | Vì sao chọn |
|---|---|---|---|
| 1 | `khop_spec` | Design Conformance | probe neo thẳng một luật `specs/` — đường sống của cổng tuân thủ, `luat_da_phu` đã đo |
| 2 | `luong_logic` | Logic/Flow | biên ngưỡng, điều kiện kép, số học từ diff — KL1·KL2·KL3 |
| 3 | `tuong_thich_nguoc` | Backward Compatibility | kiến trúc 2-nhánh CHÍNH LÀ differential testing — KL4, cột `hoi_quy` |
| 4 | `tac_dung_phu` | Side Effects | state ngoài phạm vi diff — KL9 (cửa song sinh, bị bắt 9 lần) sống ở đây |
| 5 | `bay_ngon_ngu` | Language Dependency | coercion, `undefined.length` (KL16 là TypeError JS) — mang `dieu_kien` theo ngôn ngữ repo đích |
| 6 | `goi_thang` | Coverage | gọi hàm/endpoint mới với input thường — probe rẻ nhất, nền của PASS-phải-chứng-minh |
| 7 | `bien_the_dau_vao` | Variation **gộp** Rare Situation | khuyết/sai kiểu/ngoài miền/tổ hợp lạ — KL7·KL8·KL11; gộp vì ranh giới Variation↔Rare mờ, hai ô mờ là hai ô bịa |
| 8 | `thu_tu` | Sequencing | chuỗi thao tác tạo→sửa→xoá→đọc lại, VÀ **interleaving dựng tay tất định**: nửa đầu thao tác A → trọn B → nửa sau A (deadlock dựng lại được, transaction lồng, lock ordering, `SQLITE_BUSY`, lock rò sau crash) — vùng 17 khuôn hiện **TRỐNG HOÀN TOÀN** |
| 9 | `tuong_tac` | Interaction | hai chức năng hợp lệ riêng lẻ, hỏng khi ghép — KL12·KL13 |
| 10 | `duong_loi` | Recovery/Exception | error path: 4xx-không-vỡ-500, hàm cuối đường ném — KL6·KL16 |

| Loại | Vì sao loại |
|---|---|
| Concurrency / Timing | CHỈ loại phần **race xác suất** (hai tiến trình ghi đồng thời thật, kết quả tuỳ lịch OS): probe fail 1/10 lần rơi vào bảng chân trị R1 là sinh `hoi_quy` OAN — cổng kêu oan vài lần là người ta tắt cổng, và repo này vừa trả giá cho một test flaky (M11). Phần concurrency **tất định** KHÔNG bị bỏ, nó có ba đường bắt: deadlock-làm-treo → lưới C7 máy tự viết finding high (`findingTreo`) không cần trigger nào · interleaving dựng tay + lock ordering → `thu_tu` · cơ chế khoá không được tôn trọng (tạo lock bằng tay rồi kiểm hàm có bị chặn) → `khop_spec`/`duong_loi`. Race xác suất vào lại bộ khi có chính sách rerun-N (kế hoạch 6.4) |
| Workload/Stress | sandbox không kiểm soát tài nguyên đồng đều — probe perf là nguồn flaky vô hạn |
| Lateral Compatibility | cross-repo/cross-service probe không chạy được trong sandbox; phần trong-repo thì `tuong_tac` đã phủ |
| Internal Document | comment lệch code không làm probe fail được — trigger này thuộc cổng DOC (KD1–KD3 chính là nó), sẽ dùng ở change tối ưu doc |
| HW/SW Configuration | sandbox một máy đồng nhất; ma trận version nhân đôi chi phí mỗi ô |
| Simple/Complex Path | trùng vai `luong_logic` ở mô hình này (đều là white-box theo diff) — hai tên cho một việc là mời phân loại tuỳ tiện |
| Startup/Restart | có giá trị (migration lên/xuống) nhưng chưa đủ án lệ trong repo đích nào; để dành, vào bằng `dieu_kien` khi có bằng chứng cần |

**Phép thử đã chạy trước khi chốt** (đòi hỏi của vòng phản biện): ánh xạ toàn bộ KL1–KL17 vào 10
trigger — **17/17 có nhà, 0 mồ côi**, và hai trigger (`thu_tu`, một phần `tuong_tac`) lộ vùng kho
hiện tại mù. KL10 (rò giá trị gõ tay ra log) về `tac_dung_phu` với ghi chú impact bảo mật.

## Phân loại finding: gán-lúc-chưa-vá và cách giữ cho nó thật

ODC gán defect type lúc **đóng** defect («classify when you know how the defect was fixed» — Usage
Guidelines). CheckMate gán lúc **mở** finding — tức bắt model dự đoán bản vá. Ba rủi ro thật và cách
xử từng cái:

1. **Một finding nhiều cách vá hợp lệ** → bắt model viết `va_toi_thieu` (phác bản vá tối thiểu, một
   dòng) TRƯỚC, rồi `odc_type` phải suy ra được từ phác đó. Kiểm cơ học được một phần: phác nhắc
   «thêm điều kiện/kiểm» mà type không phải `checking` thì log lệch (không vứt — telemetry).
2. **Thiên lệch dồn về Checking** (probe đối kháng lộ input chưa chặn nhìn đâu cũng như thiếu check)
   → chấp nhận ở v1, ĐO trước khi chữa: nếu phân bố >70% một type sau ~20 lượt thì đó là dữ liệu
   thật để cân nhắc tách, không phải lỗi thiết kế phải chặn trước.
3. **Trường bắt buộc ép bịa** → cả ba trường tuỳ chọn; không suy được thì bỏ trống, máy ghi
   `khong_ro` khi giá trị lạ. Nhất quán với R6.27: không đọc được thì nói không đọc được.

**Ai tiêu thụ** (vòng phản biện hỏi đúng): phân bố type/trigger ghi vào `probe_stats` + màn Đ7 sắp
làm đọc nó — «repo này hỏng kiểu gì» là input cho việc chỉnh suất probe per-repo. Không có người
đọc số thì hai trường chỉ là chi phí token — nên Đ7 là nơi trả lãi của change này.

**Đo độ tin phân loại**: sau ~20 lượt có trường mới, chấm lặp 5 finding cũ (cùng verdict, hai lần
hỏi) đo tỉ lệ trùng type. Dưới 70% trùng thì type chỉ giữ vai gợi ý, không đưa vào báo cáo — ghi
thành mục kiểm trong tasks, không phải lời hứa miệng.

## Chống Goodhart — luật cứng ngay từ ngày một

Án lệ nội bộ: trần probe thành chỉ tiêu (`ke_hoach` = trần ở 14/14 lượt). Cơ chế lặp lại y hệt nếu
phát danh mục đóng kèm tín hiệu thưởng phủ: model rải probe chiếu lệ đều 10 trigger, `ghi_nhan` đẹp
lên, kill-rate bằng 0, false-PASS trông đáng tin hơn. Ba lưới:

1. Prompt KHÔNG có câu nào thưởng/đòi phủ trigger; KHÔNG phát phép đếm trigger của lượt trước.
2. Model chọn trigger cho probe phải đi kèm thứ nó vốn phải có: `spec_rule` hoặc mục đích neo vào
   diff — trigger là NHÃN cho việc đã có lý do, không phải lý do.
3. Phân bố trigger chỉ hiện ở bề mặt người xem (`probe_stats`, UI) — cùng chỗ với phân bố type.

## Migration

- `types.ts`: 3 trường optional trên `Finding` — verdict cũ đọc nguyên vẹn (scenario replay).
- `khuon-loi.ts`: `KhuonLoi` thêm trường `trigger` (bắt buộc với khuôn code); KL1–KL17 gắn trigger
  theo bảng trên; gác R12.2/R12.4/R12.5 giữ nguyên vị trí. `TRAN_KHUON` giữ 20 (10×2 khớp).
- `skill-code.ts`: `xayKhuonLoi` phát khuôn NHÓM THEO trigger; schema kế hoạch probe thêm `trigger`
  optional; schema finding thêm 3 trường; validate enum ở chỗ máy đã đứng (cùng cửa với chuanMuc).
- Bề mặt: `probe_stats` thêm phân bố; UI hiện type/qualifier cạnh severity khi có.
- `checkmate.yml`: khai export mới (⛔C5).
