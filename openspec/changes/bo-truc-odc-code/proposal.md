# Bộ trục phân loại cho cổng code — dựa trên ODC

## Why

Cổng doc có tầng phân loại ĐÓNG (7 trục rubric, máy ép trần/sàn theo trục). Cổng code thì không:
17 khuôn lỗi `KL1–KL17` **toàn bộ là án lệ**, không có tầng trục nào ở trên, nên mỗi bài học mới chỉ
có một chỗ để đi — thêm một khuôn nữa. Số đo tại 01/09:

- Trần kho `TRAN_KHUON = 20`; khuôn code đã **17/20**. 10/17 đúc từ **một PR duy nhất** (#12).
  Một chuỗi PR như thế nữa là kho đầy, và **chưa có luật đào thải**.
- PO chỉ đúng bệnh: án lệ tích mãi thì một năm nữa là đống khổng lồ không quét được — «càng ngày
  càng rác». Cùng bệnh đang diễn ra ở `specs/R*.md`: 20 điều dài >100 từ, điều nặng nhất 376 từ,
  toàn phần kể chuyện vòng chấm.
- Finding trong verdict **không có trường nào nói lỗi thuộc LOẠI gì** — không đo được phân bố lỗi
  theo thời gian, không trả lời được «PR của repo này hay hỏng kiểu gì».

Nguồn dựng (đã tra, không tự nhóm từ án lệ của chính mình — tự nhóm là bê nguyên thiên lệch vào trục):
**Orthogonal Defect Classification** (Chillarege, IBM Research, IEEE TSE 1992; bản 5.2/2013) — chuẩn
phân loại lỗi phần mềm đứng yên 34 năm nhờ tách ba thứ mà CheckMate đang trộn: **cái gì làm lộ lỗi**
(trigger — bộ đóng), **lỗi là gì** (defect type × qualifier — bộ đóng), và **lần nào đã hỏng**
(dữ liệu, mở, để đo phân bố — không phải để đọc từng dòng). Đối chiếu: cả 17 khuôn KL hiện ánh xạ
được vào trigger ODC, không cái nào rơi ra ngoài — tức kho khuôn là một tập con lộn xộn của một bộ
đóng đã tồn tại sẵn.

## What Changes

1. **Trục TRIGGER cho sinh probe** — bộ ĐÓNG 10 trigger (thuộc tính của PROBE), lấy từ ODC có thích
   nghi cho mô hình probe-2-nhánh (bảng chọn/loại kèm lý do trong `design.md`). Prompt sinh probe tổ
   chức khuôn theo trigger; model khai `trigger` trên từng probe plan — enum đóng, máy validate, giá
   trị lạ thì BỎ TRƯỜNG chứ không vứt probe.
2. **Khuôn án lệ tụt xuống làm VÍ DỤ per-trigger** — mỗi trigger giữ tối đa **2 ví dụ** (10×2 = 20
   dòng, đúng ngân sách prompt hiện hành của R12.3). Ví dụ mới VÀO thì ví dụ cũ RA (đào thải trong
   trigger, ưu tiên giữ ví dụ đã dẫn tới finding thật gần nhất) — **kho không phình theo thời gian
   nữa**, trả lời thẳng câu «một năm sau thì sao».
3. **Trục PHÂN LOẠI cho finding** — Finding thêm 3 trường tuỳ chọn: `va_toi_thieu` (phác một dòng
   «bản vá tối thiểu sửa cái gì» — viết TRƯỚC), `odc_type` (7 giá trị ODC, suy từ phác đó),
   `qualifier` (missing · incorrect · extraneous). Chỉ là telemetry: **không tham gia** quyết
   PASS/FAIL, không đụng sàn severity.
4. **Lưới chống Goodhart mới** (bài học Đ7 còn nóng): KHÔNG có chỉ tiêu «phủ trigger», không
   hiển thị phép đếm trigger ở bất kỳ chỗ nào model nhìn thấy; thước duy nhất của probe vẫn là
   phân-biệt-được-hai-nhánh hoặc neo-được-luật.

**KHÔNG đổi:** bảng chân trị R1 (nhãn máy phân loại probe theo kết quả 2 nhánh — trục khác, đứng
nguyên) · trần probe MAX_PROBE (chuyện của Đ7) · rubric 7 trục doc.

## Capabilities

### New Capabilities
- `truc-phan-loai-code`: bộ trục đóng hai tầng (trigger cho sinh probe · defect type/qualifier cho
  finding) thay cho kho án lệ phẳng tự phình.

### Modified Capabilities
<!-- không có capability nào trong openspec/specs/ mô tả kho khuôn trước change này -->

## Luật R chạm tới

- **CÓ — file MỚI `specs/R14-truc-phan-loai.md`** (R14.1–R14.x): bộ trigger đóng · vai ví-dụ-per-
  trigger và luật đào thải · hai trường phân loại finding · lưới chống Goodhart. Đặt file mới thay vì
  sửa R12 vì R12 là vòng đời KHO (chỗ sống, án lệ bắt buộc, trần, format phát) còn đây là TAXONOMY
  xuyên tầng — nhét chung làm mã R12.x mang hai nghĩa và phá tham chiếu chéo đã đúc theo mã cũ.
- **R12 sửa MÔ TẢ vai** (không đổi cơ chế): «khuôn» → «ví dụ per-trigger»; các gác cơ học R12.2 (án
  lệ có mốc), R12.4 (dieu_kien), R12.5 (một dòng) GIỮ NGUYÊN, áp per-ví-dụ.
- **R6 thêm một điều** khai hai trường phân loại trên finding là telemetry, không tham gia verdict.

## Kế hoạch nối tiếp (KHÔNG thuộc change này — PO đã duyệt hướng, mở change riêng sau)

1. **Tối ưu cổng doc**: bộ trigger riêng cho doc (KD1–KD3 ánh xạ Internal Document / Design
   Conformance), rubric 7 trục giữ nguyên vai «defect type của doc». Làm SAU khi trục code chạy.
2. **Dọn `specs/`**: tách phần kể-chuyện-án-lệ khỏi điều luật (~7 điều nặng đã đếm ở R6/R11); mỗi án
   lệ về sau ghi kèm mã trigger/type thay vì văn tự do — bộ trục này chính là chỗ TRỎ VỀ để án lệ
   thôi phình. Làm sau, một change riêng, vì đụng văn bản luật máy đọc.
