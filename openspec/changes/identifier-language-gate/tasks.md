# Tasks — identifier-language-gate

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/identifier-language-gate/spec.md` (2 requirement) — đã viết.
- [x] 1.2 `CLAUDE.md` § Ngôn ngữ định danh: thêm ranh giới PO chốt 03/09 (trường object/kiểu KHÔNG tính ·
      biến cục bộ KHÔNG tính · giá trị chuỗi KHÔNG tính), con trỏ sang lưới, và án lệ 01/09 17:00→17:16.
- [x] 1.3 `cp CLAUDE.md AGENTS.md`? **KHÔNG** — nguồn chuẩn là `AGENTS.md`. Sửa `AGENTS.md` trước rồi
      `cp AGENTS.md CLAUDE.md`; lưới `test/huong-dan-harness.test.ts` bắt lệch từng ký tự.

## 2. Danh sách miễn trừ

- [x] 2.1 Sinh `docs/identifier-allowlist.md` từ số đo: 99 định danh cấp module bị bắt, TRỪ 10 cái sẽ đổi
      tên ở §3 → 89 mục. Mỗi dòng `| <tên> | <file> | <lý do> |`.
- [x] 2.2 Đầu file ghi ngày đóng băng + hai loại lý do hợp lệ + câu cấm nới danh sách cho định danh mới.

## 3. Đổi tên 10 định danh vi phạm (D4)

- [x] 3.1 `packages/harness/src/verdict.ts`: `HOI_QUY` → `REGRESSION_STATES` · `NOI_DUOC_DIEU_GI` →
      `CONCLUSIVE_STATES` · `TrangThaiProbe` → **`ProbeStateLabel`** (sửa D4 lúc apply — `ProbeState` là
      union hẹp, kiểu này là `string` lỏng có chủ đích; cùng tên là sai nghĩa) · `UngVienToiThieu` →
      `MinimalCandidate`.
- [x] 3.2 `packages/harness/src/skill-code.ts`: `loiSinhLaiKhongBangChung` → `retryNoticeNoEvidence`.
- [x] 3.3 `packages/shared/src/spec-source.ts`: `laThuMucQuyTrinh` → `isProcessDocDir` · `lyDoNgoaiRepo` →
      `outsideRepoReason` · `lyDoKhongPhaiThuMuc` → `notADirectoryReason`.
- [x] 3.4 `apps/web/src/runs.ts`: `TRAN_SONG_SONG` → `CONCURRENCY_LIMIT`.
- [x] 3.5 `packages/harness/src/trigger-catalog.ts`: `laTriggerHopLe` → `isValidTrigger`.
- [x] 3.6 Cập nhật MỌI chỗ gọi + test + `checkmate.yml` bảng module (⛔C5): 67 lần thay ở 14 file, `tsc` sạch.
- [x] 3.7 Kiểm giá trị chuỗi KHÔNG đổi: `git diff` có 4 dòng chứa `'hoi_quy'`, cả 4 chỉ đổi TÊN HẰNG bọc
      ngoài (`HOI_QUY` → `REGRESSION_STATES`), chuỗi bên trong y nguyên.

## 4. Lưới

- [x] 4.1 `test/identifier-language.test.ts`: quét cột 0 của `packages/*/src/**.ts` + `apps/web/src/**.ts`,
      đối chiếu `docs/identifier-allowlist.md`, đỏ khi có tên ngoài danh sách.
- [x] 4.2 Ca kiểm định dạng danh sách miễn trừ: dòng thiếu lý do → đỏ. Thêm hai ca nữa lúc viết: khoá số
      mục (89 dòng / 87 tên riêng biệt — `Hang` và `UngVien` mỗi cái ở hai file), và ca «mọi mục miễn trừ
      đều thực sự bị từ điển bắt» để không ai nhét tên tiếng Anh vào cho tiện.
- [x] 4.3 Ca dương tính giả: `API_DOC_CANDIDATES` · `getDocExamples` · `ChatCompletionsProvider` phải XANH
      (không nằm trong allowlist mà vẫn xanh — tức từ điển không bắt chúng).
- [x] 4.4 Ca biến cục bộ: một khai báo tiếng Việt có thụt đầu dòng KHÔNG làm lưới đỏ.
- [x] 4.5 Mutation, ba chiều, **cả ba load-bearing**:
      M1 bỏ đối chiếu allowlist → ca quét repo ĐỎ · M2 bỏ lọc âm trùng tiếng Anh → ĐỎ 2 ca (gồm ca dương
      tính giả) · M3 bỏ neo cột 0 khỏi regex → ĐỎ đúng ca biến cục bộ.
      *Ghi lại một cái bẫy:* lần chạy M3 đầu bằng `sed` cho 8/8 XANH, trông y như ca không load-bearing.
      Thật ra `sed` không sửa được file. Chạy lại bằng python có kiểm chứng «khớp mẫu gốc: 1» thì đột biến
      giết đúng ca. Đây chính là mệnh đề ca T1.1 nói: một phép chạy trả «không thấy gì» giống hệt hai
      chuyện — không có gì để thấy, và công cụ hỏng.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **48 file / 772 ca xanh**. Dự đoán TRƯỚC «764 + số ca mới,
      không ca cũ nào đỏ» — ĐÚNG: 764 + 8 ca mới = 772, không ca cũ nào đỏ.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 Chạy lưới mới TRƯỚC khi đổi tên → bắt **đúng 10 cái, đúng tên, đúng file**. Sau khi đổi tên và
      ghi allowlist → rỗng.

## 6. Sau-merge — nợ có tên (KHÔNG thuộc change này)

- [ ] 6.1 S1.2 (`probe-classification`): thông điệp lỗi nguyên văn từ repo đích vào `evidence.actual` → có
      thể lên comment PR, bề mặt công khai. Ứng viên nợ ⛔C3.
- [ ] 6.2 R1.20 hai vế chưa đạt: dòng log tóm tắt gộp `hoi_quy` với `vi_pham_luat_moi`; chữ phân biệt ở màn
      run không ca test nào khoá.
- [ ] 6.3 Biến cục bộ tiếng Việt (~135) — chỉ mở nếu PO muốn siết (D2).
