# Tasks — error-message-egress-gate

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/error-message-egress-gate/spec.md` (3 requirement) — đã viết.
- [x] 1.2 Đối chiếu từng requirement với ca test sẽ viết; chỗ nào spec nói mà không ca nào khoá thì sửa spec
      hoặc thêm ca (bài học `probe-classification` task 1.2 — bắt được một chỗ spec nói quá code).

## 2. Cổng lọc (packages/shared)

- [x] 2.1 Hàm thuần cửa ô: tầng 1 hình dạng. Ngưỡng ĐẶT RIÊNG `MAX_SAFE_DIGITS = 12`, không dùng lại của
      `tightFingerprint` — lý do ghi ở Open Questions của design (hai hằng trả lời hai câu khác nhau).
- [x] 2.2 Tầng 2 đệ quy: mảng/object qua khi mọi phần tử qua; phần tử hỏng thì gột đúng phần tử đó, giữ
      khung `[…]` / `{…}` và các phần tử an toàn.
- [x] 2.3 Tầng 3 đối chiếu nguồn: chuỗi qua khi đã có mặt ở **chính bề mặt sắp phát ra**. Cổng nhận nguồn
      đối chiếu làm **tham số**, không tự đi lấy — mỗi chỗ gọi truyền đúng nguồn của bề mặt mình (D2b).
- [x] 2.3b Hai nguồn dựng sẵn: `nguồn cho bề mặt người` (diff + source PR) và `nguồn cho bề mặt model`
      (**chỉ** các khối đã rào vào prompt: `t.diff` bản đã cắt · `t.specs` · `t.testMau` · `t.apiDoc`).
      KHÔNG được dùng source đầy đủ hay diff chưa cắt cho nguồn model.
- [x] 2.4 Bộ khuôn cấu trúc: `expected <A> to be|equal|deeply equal|have a length of <B>` (± tiền tố lớp
      lỗi, ± đuôi `// Object.is equality`), `Cannot find module <path>`, `<X> is not a function`,
      `<ErrorClass>: <message>`, `TIMEOUT…`. Khuôn nào cũng phải khai **ô nào là giá trị**.
- [x] 2.5 Dòng ngoài mọi khuôn → giữ **lớp lỗi + độ dài**, không phát nội dung (D5).
- [x] 2.6 `checkmate.yml` bảng module (⛔C5) + tên tiếng Anh. **Lưới `hop-dong-repo` bắt em quên khai —
      lần thứ sáu đúng cảnh báo trong CLAUDE.md.** Khai `redactMessage · redactSlot` (module mới) và
      `humanSurfaceSource · modelSurfaceSource` (thêm vào `target.js`).

## 3. Nối vào ba chỗ phát

- [x] 3.1 `packages/shared/src/types.ts`: `EvidenceTestRun` thêm trường optional mang bản đã lọc.
- [x] 3.2 `skill-code.ts` lúc dựng evidence (`:817`): lọc với `t` làm nguồn đối chiếu, ghi cả hai bản.
- [x] 3.3 `skill-code.ts:569` (log nhánh gốc) và `:901,907` (`loiHaTang`): lọc trước khi `phat({type:'log'})`.
- [x] 3.4 `skill-code.ts:627`: lọc `loiThu` trước khi vào `promptSinhCode`, dùng **nguồn cho bề mặt model**
      (D2b) — không phải nguồn của bề mặt người. **Giữ `suggestModulePath` chạy trên bản NGUYÊN VĂN**: nó cần
      đường dẫn thật để gợi ý đúng module, và kết quả của nó là đường dẫn do CheckMate sinh, không phải
      chuỗi từ repo đích — nhưng chuỗi nó CHÈN vào prompt vẫn phải qua cổng.
- [x] 3.4b Rà mọi chỗ khác đưa dữ liệu repo đích vào prompt code: `promptVietFinding` (`:425`) rào
      `UNG_VIEN` gồm `br.message`. Đó là bề mặt model thứ hai và cùng loại rủi ro — lọc bằng nguồn model.
- [x] 3.5 `apps/web/src/gate.ts` `dongFinding`: đọc trường đã lọc; vắng → fail-closed theo D4, KHÔNG rơi về
      `actual`.

## 4. Test

- [x] 4.1 Lưới mới `test/message-egress.test.ts` — 30 ca.
- [x] 4.2 Ca khoá D4: verdict cũ (không có trường mới) → comment KHÔNG chứa nội dung `actual`.
- [x] 4.3 Ca khoá requirement 3: bản nguyên văn vào sổ và vào phép so vân tay KHÔNG đổi.
- [x] 4.4 Mutation, sáu chiều:
      M1 bỏ tầng 3 → ĐỎ 3 ca · M2 bỏ tầng 2 (đệ quy) → ĐỎ 2 ca · M3 cổng thành khớp tiền tố → ĐỎ 3 ca ·
      M4 bỏ fail-closed của D4 → ĐỎ 2 ca · M6 nới nguồn model (thêm `ngoaiTamNhin`) → ĐỎ đúng ca hợp đồng.
      **M5 (dùng nguồn người ở chỗ gọi của model) KHÔNG giết được ca nào** — dự đoán đúng, lý do ở D9:
      hai nguồn hôm nay bằng nhau vì `TargetInfo` không giữ source đầy đủ. Ghi thêm một cái bẫy: lần chạy
      M5 đầu báo «1 failed», suýt kết luận nhầm là đột biến bị bắt; chạy lại thì baseline sạch 800 ca và
      đột biến cũng sạch — lần đầu là **flaky**. Một lần chạy không đủ để kết luận về mutation.
- [x] 4.5 Ca đối kháng: một thông điệp dựng để lách — chuỗi bí mật đặt trong object lồng, trong mảng, sau
      một tiền tố lớp lỗi hợp lệ. Cả ba phải bị gột.

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **49 file / 800 ca xanh**.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 Đo lại. **Dự đoán TRƯỚC ≥ 90% — đo được 91%: giữ nguyên vẹn 49/54, gột một phần 5/54 (9%),
      không nhận dạng được 0.** Dự đoán ĐÚNG.
      Hai khác biệt phải nói rõ so với phép đo trong design: (a) **tập mẫu khác** — 54 chứ không phải 180,
      vì lần này chỉ đếm `evidence.actual` của finding, còn phép đo trước quét mọi trường `actual`/`message`
      kể cả trong sự kiện; (b) nguồn đối chiếu là **xấp xỉ THẤP** (`probe_code` + `expected` của cùng lượt),
      không phải source thật, nên 91% là **cận dưới** chứ không phải cận trên như design viết — 5 ca bị gột
      đều là `ValueError: Vượt hạn mức phê duyệt của vai (…)`, chúng nằm trong source repo đích và sẽ qua
      cửa khi chạy thật.
- [x] 5.4 Không kích hoạt — đo 91% ≥ 90%.

## 6. Sau-merge — nợ có tên (KHÔNG thuộc change này)

- [x] 6.1 → `named-debts` **#15** (đã vào backlog 03/09, trước khi xin archive). Nợ **#15**: phát hiện dữ liệu nhạy cảm ĐI VÀO cùng pull request và cảnh báo (PO 03/09 — đã vào
      backlog `named-debts`). Hướng ngược với change này, và là danh sách cấm ở vai cảnh báo.
