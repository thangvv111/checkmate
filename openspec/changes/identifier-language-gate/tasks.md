# Tasks — identifier-language-gate

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/identifier-language-gate/spec.md` (2 requirement) — đã viết.
- [ ] 1.2 `CLAUDE.md` § Ngôn ngữ định danh: thêm ranh giới PO chốt 03/09 (trường object/kiểu KHÔNG tính ·
      biến cục bộ KHÔNG tính · giá trị chuỗi KHÔNG tính), con trỏ sang lưới, và án lệ 01/09 17:00→17:16.
- [ ] 1.3 `cp CLAUDE.md AGENTS.md`? **KHÔNG** — nguồn chuẩn là `AGENTS.md`. Sửa `AGENTS.md` trước rồi
      `cp AGENTS.md CLAUDE.md`; lưới `test/huong-dan-harness.test.ts` bắt lệch từng ký tự.

## 2. Danh sách miễn trừ

- [ ] 2.1 Sinh `docs/identifier-allowlist.md` từ số đo: 99 định danh cấp module bị bắt, TRỪ 10 cái sẽ đổi
      tên ở §3 → 89 mục. Mỗi dòng `| <tên> | <file> | <lý do> |`.
- [ ] 2.2 Đầu file ghi ngày đóng băng + hai loại lý do hợp lệ + câu cấm nới danh sách cho định danh mới.

## 3. Đổi tên 10 định danh vi phạm (D4)

- [ ] 3.1 `packages/harness/src/verdict.ts`: `HOI_QUY` → `REGRESSION_STATES` · `NOI_DUOC_DIEU_GI` →
      `CONCLUSIVE_STATES` · `TrangThaiProbe` → `ProbeState` · `UngVienToiThieu` → `MinimalCandidate`.
- [ ] 3.2 `packages/harness/src/skill-code.ts`: `loiSinhLaiKhongBangChung` → `retryNoticeNoEvidence`.
- [ ] 3.3 `packages/shared/src/spec-source.ts`: `laThuMucQuyTrinh` → `isProcessDocDir` · `lyDoNgoaiRepo` →
      `outsideRepoReason` · `lyDoKhongPhaiThuMuc` → `notADirectoryReason`.
- [ ] 3.4 `apps/web/src/runs.ts`: `TRAN_SONG_SONG` → `CONCURRENCY_LIMIT`.
- [ ] 3.5 `packages/harness/src/trigger-catalog.ts`: `laTriggerHopLe` → `isValidTrigger`.
- [ ] 3.6 Cập nhật MỌI chỗ gọi + test + `checkmate.yml` bảng module (⛔C5). `tsc` là lưới thứ nhất.
- [ ] 3.7 Kiểm giá trị chuỗi KHÔNG đổi: `grep -c "'hoi_quy'"` trước/sau bằng nhau (§ Data Model).

## 4. Lưới

- [ ] 4.1 `test/identifier-language.test.ts`: quét cột 0 của `packages/*/src/**.ts` + `apps/web/src/**.ts`,
      đối chiếu `docs/identifier-allowlist.md`, đỏ khi có tên ngoài danh sách.
- [ ] 4.2 Ca kiểm định dạng danh sách miễn trừ: dòng thiếu lý do → đỏ.
- [ ] 4.3 Ca dương tính giả: `API_DOC_CANDIDATES` · `getDocExamples` · `ChatCompletionsProvider` phải XANH
      (không nằm trong allowlist mà vẫn xanh — tức từ điển không bắt chúng).
- [ ] 4.4 Ca biến cục bộ: một khai báo tiếng Việt có thụt đầu dòng KHÔNG làm lưới đỏ.
- [ ] 4.5 Mutation: bỏ phép đối chiếu allowlist → lưới phải đỏ; bỏ lọc âm trùng tiếng Anh → ca 4.3 phải đỏ.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — **dự đoán TRƯỚC: 764 + số ca mới, không ca
      cũ nào đỏ** (đổi tên là refactor thuần). Sai thì ghi rõ sai ở đâu.
- [ ] 5.2 `npx openspec validate --changes` xanh.
- [ ] 5.3 Chạy lưới mới trên `main` TRƯỚC khi đổi tên → phải bắt đúng 10 cái. Đây là phép thử load-bearing
      của cả change: lưới không bắt được 10 cái đã biết thì nó không gác gì cả.

## 6. Sau-merge — nợ có tên (KHÔNG thuộc change này)

- [ ] 6.1 S1.2 (`probe-classification`): thông điệp lỗi nguyên văn từ repo đích vào `evidence.actual` → có
      thể lên comment PR, bề mặt công khai. Ứng viên nợ ⛔C3.
- [ ] 6.2 R1.20 hai vế chưa đạt: dòng log tóm tắt gộp `hoi_quy` với `vi_pham_luat_moi`; chữ phân biệt ở màn
      run không ca test nào khoá.
- [ ] 6.3 Biến cục bộ tiếng Việt (~135) — chỉ mở nếu PO muốn siết (D2).
