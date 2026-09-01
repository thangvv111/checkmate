# Test cases — bộ trục phân loại code

## Trục trigger (sinh probe)

- [x] T1.1 Danh mục `TRIGGER_CATALOG` có đúng 10 mã, mỗi mã có mô tả một dòng không rỗng — khoá bộ ĐÓNG:
      thêm/bớt mã là đỏ, buộc đi qua sửa spec R14.1 có chủ đích.
- [x] T1.2 Mọi khuôn `loai='code'` trong tập PHÁT đều mang `trigger` thuộc danh mục; mỗi trigger
      ≤ 2 ví dụ trong tập phát (R14.3).
- [x] T1.3 `phatKhuon('code', spec)` phát nhóm theo trigger, tổng dòng ≤ trần R12.3; khuôn `len_dau`
      (KL5) vẫn đứng đầu; khuôn có `dieu_kien` không khớp spec vẫn bị ẩn như cũ (gác R12.4 sống sót
      qua tái cấu trúc).
- [x] T1.4 GIVEN kế hoạch probe model trả có `trigger: "gia_tri_la"` WHEN máy bóc THEN probe GIỮ
      NGUYÊN trong kế hoạch, trường trigger bị xoá, log có một dòng nêu giá trị lạ (R14.2 — bỏ
      trường, không vứt dữ liệu — cùng họ chống «nuốt» với R6.27).
- [x] T1.5 **Chống Goodhart, khoá bằng chuỗi**: văn bản prompt sinh probe KHÔNG chứa các mẫu
      /phủ (đủ|đều|hết)|mỗi trigger (một|ít nhất)|đủ 10/ và KHÔNG chứa phép đếm trigger lượt trước
      (R14.4). Test đọc prompt dựng thật, không đọc tài liệu.

## Trục phân loại finding

- [x] T2.1 GIVEN model trả finding có `minimal_fix` + `odc_type: "checking"` + `qualifier:
      "missing"` THEN verdict ghi đủ ba trường.
- [x] T2.2 GIVEN `odc_type: "sieu_loi"` (lạ) trên finding high THEN trường về `unknown`, log một
      dòng, severity VẪN high, kết quả PASS/FAIL KHÔNG đổi (R14.5/R14.7 — ranh giới với đường
      fail-closed của severity: hai trục xử lạ theo hai kiểu, đúng chủ đích).
- [x] T2.3 GIVEN verdict cũ (fixture không có ba trường) WHEN đọc lại THEN nguyên vẹn, không lỗi —
      replay không gãy.
- [x] T2.4 Finding máy tự viết (hồi quy model bỏ sót — lưới máy 2) KHÔNG mang ba trường mới: máy
      không phỏng đoán bản vá — vắng mặt là câu trả lời trung thực.
- [x] T2.5 `minimal_fix` nhắc «thêm điều kiện kiểm» mà `odc_type: "algorithm_method"` → log lệch
      xuất hiện; finding không bị sửa, không bị vứt.

## Cửa song sinh + biên (khuôn lặp nhiều nhất repo — soi trước khi cổng soi)

- [x] T3.1 Hai đường validate enum (trigger của probe · type/qualifier của finding) dùng CHUNG một
      hàm — không hai cửa hai luật.
- [x] T3.2 `trigger_distribution` trong `probe_stats` đếm đúng khi: mọi probe có trigger · một phần có ·
      không probe nào có (ba ca, ca cuối trả map rỗng chứ không undefined).
- [x] T3.3 Skill DOC không nhận trigger code: finding doc mang `odc_type` bị bỏ + log (bộ trục doc
      là change sau — nhận sớm nửa vời là hai schema song song).

## Trục nhạy cảm (đường quyết định verdict)

- [x] T4.1 Tiêu cực: một verdict FAIL-có-high giữ nguyên FAIL khi cả ba trường mới mang giá trị
      hợp lệ, lạ, hay vắng — chạy cả ba biến thể, cùng một kết quả. Ba trường mới KHÔNG có đường
      nào chạm `demMuc`/`chuanMuc`/quyết định merge.

## Chạy

`npx tsc --noEmit` + `npm test` toàn bộ. Sau đó CheckMate tự chấm PR này trên prod (pha 4 của
schema).
