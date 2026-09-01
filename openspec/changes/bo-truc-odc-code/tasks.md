# Tasks — bộ trục phân loại code (R14)

## 1. Luật (viết TRƯỚC code — hai tầng spec, cả hai cùng nói một điều)

- [ ] 1.1 `specs/R14-truc-phan-loai.md` MỚI: R14.1 bộ trigger đóng 10 giá trị (bảng mã máy + gốc
      ODC) · R14.2 trigger lạ thì bỏ trường không vứt probe · R14.3 ví dụ per-trigger trần 2, luật
      đào thải giữ-ví-dụ-từng-bắt-finding, ví dụ rời tập phát được lưu người-đọc-được · R14.4 cấm
      chỉ tiêu/phép đếm độ phủ trigger ở mọi bề mặt model thấy · R14.5 ba trường phân loại finding
      là telemetry, không tham gia verdict/severity · R14.6 `va_toi_thieu` viết trước, type suy từ
      đó · R14.7 enum lạ → `khong_ro` + log (không ném, không đổi verdict).
- [ ] 1.2 `specs/R12` sửa MÔ TẢ vai: «khuôn» → «ví dụ per-trigger (R14)»; gác R12.2/R12.4/R12.5
      giữ nguyên, chú rõ áp per-ví-dụ. KHÔNG đổi mã điều nào.
- [ ] 1.3 `specs/R6` thêm một điều: finding code mang được `va_toi_thieu`/`odc_type`/`qualifier`;
      chúng là telemetry (trỏ R14.5).

## 2. Kho ví dụ theo trigger

- [ ] 2.1 `khuon-loi.ts`: interface `KhuonLoi` thêm `trigger` (bắt buộc cho `loai='code'`); khai
      danh mục `TRIGGER_CODE` 10 mã + mô tả một dòng mỗi mã (phát vào prompt).
- [ ] 2.2 Gắn trigger cho KL1–KL17 đúng bảng ánh xạ trong `design.md`; trigger nào >2 khuôn thì chọn
      2 giữ lại theo luật đào thải, phần dôi chuyển xuống khối lưu trữ (comment/const riêng không
      phát) — ghi rõ từng cái đi đâu trong commit message.
- [ ] 2.3 `phatKhuon('code')` phát theo NHÓM trigger: dòng tiêu đề trigger + tối đa 2 ví dụ; giữ
      `len_dau` (KL5 vượt quyền vẫn đứng đầu); trần tổng R12.3 không đổi.

## 3. Kế hoạch probe khai trigger

- [ ] 3.1 `skill-code.ts`: `KeHoachProbe` thêm `trigger?` ; prompt phân tích yêu cầu khai trigger
      từ danh mục cho từng probe — KHÔNG kèm bất kỳ câu đòi phủ đủ/đều (R14.4).
- [ ] 3.2 Máy validate enum sau khi bóc JSON: lạ → xoá trường + log một dòng (R14.2).
- [ ] 3.3 `probe_stats` thêm `trigger_phan_bo` (đếm theo trigger, chỉ bề mặt người xem).

## 4. Finding khai loại lỗi

- [ ] 4.1 `types.ts`: `Finding` thêm `va_toi_thieu?`, `odc_type?`, `qualifier?` (3 trường optional —
      replay verdict cũ không gãy).
- [ ] 4.2 Prompt viết finding: bắt viết `va_toi_thieu` TRƯỚC rồi gán `odc_type`/`qualifier` suy từ
      đó; nêu đúng 7+3 giá trị.
- [ ] 4.3 Máy validate enum cùng cửa với `chuanMuc`: lạ → `khong_ro` + log; TUYỆT ĐỐI không đụng
      severity/verdict (R14.5). Kiểm lệch rẻ: `va_toi_thieu` khớp /điều kiện|kiểm|check/ mà type ≠
      checking → log lệch (không sửa, không vứt).
- [ ] 4.4 UI run + trang finding: hiện `odc_type · qualifier` cạnh severity khi có.

## 5. Hợp đồng + lưới

- [ ] 5.1 `checkmate.yml`: khai export mới (⛔C5 — lưới hợp đồng đã bắt hụt 5 lần).
- [ ] 5.2 `test/khuon-loi.test.ts` cập nhật theo cấu trúc mới; thêm ca cho từng gác mới.
- [ ] 5.3 Chạy trọn: `npx tsc --noEmit` + `npm test`.

## 6. Sau-merge (ghi để không thành lời hứa miệng — KHÔNG làm trong change này)

- [ ] 6.1 Sau ~20 lượt chấm có trường mới: đo độ tin phân loại (chấm lặp 5 finding, tỉ lệ trùng
      type; <70% thì type chỉ giữ vai gợi ý) và đo phân bố (>70% dồn một type → cân nhắc tách).
- [ ] 6.2 Change tối ưu cổng DOC: bộ trigger doc riêng (KD1–KD3 → Internal Document / Design
      Conformance), rubric 7 trục giữ vai type-của-doc.
- [ ] 6.3 Change dọn `specs/`: tách phần kể-chuyện khỏi ~7 điều nặng ở R6/R11; án lệ mới ghi kèm mã
      trigger/type thay vì văn tự do.
- [ ] 6.4 Change chính sách **rerun-N cho probe nghi-flaky**: probe fail không ổn định giữa các lần
      chạy cùng nhánh nhận nhãn riêng (`khong_on_dinh`), KHÔNG rơi vào `hoi_quy` — điều kiện tiên
      quyết để mở lại trigger race xác suất (`dong_thoi`) mà không phá bảng chân trị R1. PO chất vấn
      01/09: concurrency là khái niệm quan trọng, phần tất định đã phủ (C7 treo · `thu_tu`
      interleaving · `khop_spec` cơ chế khoá), phần xác suất chờ đúng cửa này.
