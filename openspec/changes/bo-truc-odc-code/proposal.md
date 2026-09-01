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

1. **Trục TRIGGER cho sinh probe** — tách **DANH MỤC** (vốn từ vựng chuẩn có định nghĩa + ranh
   giới từng mã, khởi điểm 10 mã từ ODC, mở rộng qua change) khỏi **TẬP KÍCH HOẠT per-repo** (cấu
   hình `checkmate.yml`/màn Đ7 — có repo 2, có repo 30, số lượng linh hoạt; mặc định = toàn danh
   mục). Model khai `trigger` trên từng probe plan — validate theo danh mục, giá trị lạ thì BỎ
   TRƯỜNG chứ không vứt probe. Chính ODC nguyên bản vận hành kiểu này: activity-to-trigger mapping
   là bước customize local, bảng trong tài liệu chỉ là ví dụ generic.
2. **Khuôn án lệ tụt xuống làm VÍ DỤ per-trigger** — trần ví dụ mỗi trigger là THAM SỐ (mặc định 2),
   không neo vào hằng nào của hệ luật cũ. Ví dụ mới VÀO thì ví dụ cũ RA (ưu tiên giữ ví dụ đã dẫn
   tới finding thật gần nhất) — **kho không phình theo thời gian nữa**, trả lời thẳng câu «một năm
   sau thì sao».
3. **Trục PHÂN LOẠI cho finding** — Finding thêm 3 trường tuỳ chọn: `minimal_fix` (phác một dòng
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

- **KHÔNG — cố ý.** PO chốt 01/09: `specs/R*.md` đang trộn lẫn nhiều khái niệm, KHÔNG được dùng làm
  khuôn ép kiến trúc mới; nó chờ một change tái cấu trúc riêng (hạ thành tài liệu tham khảo — kế
  hoạch 6.3). Change này vì thế **không đẻ R14, không sửa R12/R6**. Luật của bộ trục sống ở ba chỗ
  máy đọc được: danh mục + validate trong engine (test khoá) · tập kích hoạt trong `checkmate.yml` ·
  hành vi trong openspec capability `truc-phan-loai-code` (spec delta của change này).
- **PO đã chốt tường minh (01/09, ba câu):** (a) `specs/R*.md` nội bộ = **tham khảo thuần**, luật
  máy đọc chuyển sang code + config + openspec capability — thay phương án A 31/08; (b) **cả cơ chế
  ăn specs của REPO ĐÍCH** (nạp toàn bộ, `trichMaLuat` regex) cũng thuộc diện cấu trúc lại — change
  riêng; (c) thứ tự: **bộ trục code trước**, dọn specs sau. CLAUDE.md mục «Hai tầng spec» được sửa
  trong change này cho khớp chốt mới.

## Kế hoạch nối tiếp (KHÔNG thuộc change này — PO đã duyệt hướng, mở change riêng sau)

1. **Tối ưu cổng doc**: bộ trigger riêng cho doc (KD1–KD3 ánh xạ Internal Document / Design
   Conformance), rubric 7 trục giữ nguyên vai «defect type của doc». Làm SAU khi trục code chạy.
2. **Tái cấu trúc `specs/` nội bộ thành tham khảo**: tách kể-chuyện khỏi luật (~7 điều nặng ở
   R6/R11), luật máy đọc dời về code + config + openspec capability; án lệ mới ghi kèm mã
   trigger/type. Change riêng.
3. **Cấu trúc lại cách ăn specs của REPO ĐÍCH** (PO chốt 01/09 — phạm vi mở hơn dự kiến): xét lại
   nạp-toàn-bộ, `trichMaLuat` regex (hiện lẫn rác KL9/L3/P1/P10 vào mẫu số độ phủ), và hình dạng
   spec mà CheckMate đòi ở repo khách. Change riêng; bộ trục không bị khoá vào cơ chế hiện tại —
   trigger `spec_conformance` ăn theo NGUỒN LUẬT hiện hành, nguồn đổi thì nó ăn nguồn mới.
