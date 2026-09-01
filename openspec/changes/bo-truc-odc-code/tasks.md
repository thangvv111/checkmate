# Tasks — bộ trục phân loại code (R14)

## 1. Chỗ sống của luật (PO 01/09: KHÔNG đẻ thêm điều R* — specs/R* chờ tái cấu trúc)

- [x] 1.1 Danh mục trigger trong engine: mỗi mã một định nghĩa + ranh giới với mã cạnh; test khoá
      danh mục (thêm/bớt mã là đỏ — buộc đi qua change có chủ đích, KHÔNG buộc con số cụ thể).
- [x] 1.2 Tập kích hoạt per-repo trong `checkmate.yml` (khoá cấu hình mới): danh sách mã bật cho
      repo đó; vắng khoá = toàn danh mục; mã lạ trong config → log + bỏ qua, không chết lượt chấm.
- [x] 1.3 Trần ví dụ per-trigger + ngân sách dòng prompt = THAM SỐ cấu hình (mặc định 2/trigger),
      không tham chiếu hằng nào của specs/R* cũ.
- [x] 1.4 Toàn bộ hành vi khai trong openspec capability `truc-phan-loai-code` (spec delta của
      change này) — bản máy-và-người cùng đọc; specs/R* KHÔNG thêm điều mới.
- [x] 1.5 Sửa CLAUDE.md mục «Hai tầng spec»: phương án A 31/08 đã bị PO thay 01/09 — `specs/R*` là
      THAM KHẢO; luật máy đọc sống ở code + `checkmate.yml` + openspec capability. Ghi rõ ngày và
      người chốt để không thành án lệ ngầm.

## 2. Kho ví dụ theo trigger

- [x] 2.1 `khuon-loi.ts`: interface `KhuonLoi` thêm `trigger` (bắt buộc cho `loai='code'`); khai
      danh mục `TRIGGER_CATALOG` 10 mã + mô tả một dòng mỗi mã (phát vào prompt).
- [x] 2.2 Gắn trigger cho KL1–KL17 đúng bảng ánh xạ trong `design.md`; trigger nào >2 khuôn thì chọn
      2 giữ lại theo luật đào thải, phần dôi chuyển xuống khối lưu trữ (comment/const riêng không
      phát) — ghi rõ từng cái đi đâu trong commit message.
- [x] 2.3 `phatKhuon('code')` phát theo NHÓM trigger: dòng tiêu đề trigger + tối đa 2 ví dụ; giữ
      `len_dau` (KL5 vượt quyền vẫn đứng đầu); trần tổng R12.3 không đổi.

## 3. Kế hoạch probe khai trigger

- [x] 3.1 `skill-code.ts`: `KeHoachProbe` thêm `trigger?` ; prompt phân tích yêu cầu khai trigger
      từ danh mục cho từng probe — KHÔNG kèm bất kỳ câu đòi phủ đủ/đều (R14.4).
- [x] 3.2 Máy validate enum sau khi bóc JSON: lạ → xoá trường + log một dòng (R14.2).
- [x] 3.3 `probe_stats` thêm `trigger_distribution` (đếm theo trigger, chỉ bề mặt người xem).

## 4. Finding khai loại lỗi

- [x] 4.1 `types.ts`: `Finding` thêm `minimal_fix?`, `odc_type?`, `qualifier?` (3 trường optional —
      replay verdict cũ không gãy).
- [x] 4.2 Prompt viết finding: bắt viết `minimal_fix` TRƯỚC rồi gán `odc_type`/`qualifier` suy từ
      đó; nêu đúng 7+3 giá trị.
- [x] 4.3 Máy validate enum cùng cửa với `chuanMuc`: lạ → `unknown` + log; TUYỆT ĐỐI không đụng
      severity/verdict (R14.5). Kiểm lệch rẻ: `minimal_fix` khớp /điều kiện|kiểm|check/ mà type ≠
      checking → log lệch (không sửa, không vứt).
- [x] 4.4 UI run + trang finding: hiện `odc_type · qualifier` cạnh severity khi có.

## 5. Hợp đồng + lưới

- [x] 5.1 `checkmate.yml`: khai export mới (⛔C5 — lưới hợp đồng đã bắt hụt 5 lần).
- [x] 5.2 `test/khuon-loi.test.ts` cập nhật theo cấu trúc mới; thêm ca cho từng gác mới.
- [x] 5.3 Chạy trọn: `npx tsc --noEmit` + `npm test`.

## 6. Sau-merge (ghi để không thành lời hứa miệng — KHÔNG làm trong change này)

- [ ] 6.1 Sau ~20 lượt chấm có trường mới: đo độ tin phân loại (chấm lặp 5 finding, tỉ lệ trùng
      type; <70% thì type chỉ giữ vai gợi ý) và đo phân bố (>70% dồn một type → cân nhắc tách).
- [ ] 6.2 Change tối ưu cổng DOC: bộ trigger doc riêng (KD1–KD3 → Internal Document / Design
      Conformance), rubric 7 trục giữ vai type-của-doc.
- [ ] 6.3 Change dọn `specs/`: tách phần kể-chuyện khỏi ~7 điều nặng ở R6/R11; án lệ mới ghi kèm mã
      trigger/type thay vì văn tự do.
- [ ] 6.3b Change **cấu trúc lại cách ăn specs repo ĐÍCH** (PO mở phạm vi 01/09): nạp-toàn-bộ →
      xét chọn lọc; thay `trichMaLuat` regex thô (đang nhặt cả KL9/L3/P1/P10 vào mẫu số); định hình
      dạng spec CheckMate đòi ở repo khách.
- [ ] 6.3c Change **refactor định danh cũ Việt → Anh** (PO chốt 01/09): tên hàm/biến/kiểu hiện hành
      (`luuMeta`, `docSoCong`, `chuanMuc`…) đổi một lượt có kế hoạch — module nào trước, alias tạm ra
      sao, checkmate.yml đổi theo — KHÔNG đổi lắt nhắt khi tiện tay. Định danh MỚI từ giờ đã là tiếng
      Anh theo luật trong AGENTS.md/CLAUDE.md.
- [ ] 6.4 Change chính sách **rerun-N cho probe nghi-flaky**: probe fail không ổn định giữa các lần
      chạy cùng nhánh nhận nhãn riêng (`khong_on_dinh`), KHÔNG rơi vào `hoi_quy` — điều kiện tiên
      quyết để mở lại trigger race xác suất (`concurrency`) mà không phá bảng chân trị R1. PO chất vấn
      01/09: concurrency là khái niệm quan trọng, phần tất định đã phủ (C7 treo · `sequencing`
      interleaving · `spec_conformance` cơ chế khoá), phần xác suất chờ đúng cửa này.
