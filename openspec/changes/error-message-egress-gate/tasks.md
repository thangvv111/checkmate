# Tasks — error-message-egress-gate

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/error-message-egress-gate/spec.md` (3 requirement) — đã viết.
- [ ] 1.2 Đối chiếu từng requirement với ca test sẽ viết; chỗ nào spec nói mà không ca nào khoá thì sửa spec
      hoặc thêm ca (bài học `probe-classification` task 1.2 — bắt được một chỗ spec nói quá code).

## 2. Cổng lọc (packages/shared)

- [ ] 2.1 Hàm thuần cửa ô: tầng 1 hình dạng (số ngắn · từ khoá · tên kiểu · tập rỗng). Chốt ngưỡng số chữ
      số và **ghi lý do** — dùng lại ranh giới của `tightFingerprint` hay đặt riêng (Open Question của D).
- [ ] 2.2 Tầng 2 đệ quy: mảng/object qua khi mọi phần tử qua; phần tử hỏng thì gột đúng phần tử đó, giữ
      khung `[…]` / `{…}` và các phần tử an toàn.
- [ ] 2.3 Tầng 3 đối chiếu nguồn: chuỗi qua khi đã có mặt ở **chính bề mặt sắp phát ra**. Cổng nhận nguồn
      đối chiếu làm **tham số**, không tự đi lấy — mỗi chỗ gọi truyền đúng nguồn của bề mặt mình (D2b).
- [ ] 2.3b Hai nguồn dựng sẵn: `nguồn cho bề mặt người` (diff + source PR) và `nguồn cho bề mặt model`
      (**chỉ** các khối đã rào vào prompt: `t.diff` bản đã cắt · `t.specs` · `t.testMau` · `t.apiDoc`).
      KHÔNG được dùng source đầy đủ hay diff chưa cắt cho nguồn model.
- [ ] 2.4 Bộ khuôn cấu trúc: `expected <A> to be|equal|deeply equal|have a length of <B>` (± tiền tố lớp
      lỗi, ± đuôi `// Object.is equality`), `Cannot find module <path>`, `<X> is not a function`,
      `<ErrorClass>: <message>`, `TIMEOUT…`. Khuôn nào cũng phải khai **ô nào là giá trị**.
- [ ] 2.5 Dòng ngoài mọi khuôn → giữ **lớp lỗi + độ dài**, không phát nội dung (D5).
- [ ] 2.6 `checkmate.yml` bảng module (⛔C5) + tên tiếng Anh (lưới `identifier-language`).

## 3. Nối vào ba chỗ phát

- [ ] 3.1 `packages/shared/src/types.ts`: `EvidenceTestRun` thêm trường optional mang bản đã lọc.
- [ ] 3.2 `skill-code.ts` lúc dựng evidence (`:817`): lọc với `t` làm nguồn đối chiếu, ghi cả hai bản.
- [ ] 3.3 `skill-code.ts:569` (log nhánh gốc) và `:901,907` (`loiHaTang`): lọc trước khi `phat({type:'log'})`.
- [ ] 3.4 `skill-code.ts:627`: lọc `loiThu` trước khi vào `promptSinhCode`, dùng **nguồn cho bề mặt model**
      (D2b) — không phải nguồn của bề mặt người. **Giữ `suggestModulePath` chạy trên bản NGUYÊN VĂN**: nó cần
      đường dẫn thật để gợi ý đúng module, và kết quả của nó là đường dẫn do CheckMate sinh, không phải
      chuỗi từ repo đích — nhưng chuỗi nó CHÈN vào prompt vẫn phải qua cổng.
- [ ] 3.4b Rà mọi chỗ khác đưa dữ liệu repo đích vào prompt code: `promptVietFinding` (`:425`) rào
      `UNG_VIEN` gồm `br.message`. Đó là bề mặt model thứ hai và cùng loại rủi ro — lọc bằng nguồn model.
- [ ] 3.5 `apps/web/src/gate.ts` `dongFinding`: đọc trường đã lọc; vắng → fail-closed theo D4, KHÔNG rơi về
      `actual`.

## 4. Test

- [ ] 4.1 Lưới mới cho cổng: mỗi tầng cửa, mỗi khuôn, mỗi nhánh gột là một ca.
- [ ] 4.2 Ca khoá D4: verdict cũ (không có trường mới) → comment KHÔNG chứa nội dung `actual`.
- [ ] 4.3 Ca khoá requirement 3: bản nguyên văn vào sổ và vào phép so vân tay KHÔNG đổi.
- [ ] 4.4 Mutation: bỏ tầng 3 → ca lỗi nghiệp vụ đỏ · bỏ tầng 2 → ca mảng số đỏ · đổi cổng thành khớp tiền
      tố → ca «chuỗi tự do lạ» đỏ · bỏ fail-closed của D4 → ca 4.2 đỏ · **dùng nguồn bề mặt người cho chỗ
      gọi của model → ca T2.9 đỏ** (đây là đột biến bắt đúng lỗ S1.3, phải giết được ca).
- [ ] 4.5 Ca đối kháng: một thông điệp dựng để lách — chuỗi bí mật đặt trong object lồng, trong mảng, sau
      một tiền tố lớp lỗi hợp lệ. Cả ba phải bị gột.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 5.2 `npx openspec validate --changes` xanh.
- [ ] 5.3 Đo lại trên 180 thông điệp thật — **dự đoán TRƯỚC: giữ nguyên vẹn ≥ 90%** (D7). Ghi số đo được;
      sai thì ghi rõ sai ở đâu. Nhớ hạn chế: `runs/` không lưu diff nên tầng 3 đo bằng xấp xỉ source, con
      số là **cận trên**.
- [ ] 5.4 Nếu đo < 90%: KHÔNG ship rồi vá sau — trình PO số thật kèm ba lựa chọn (nới cửa · đổi bề mặt ·
      chấp nhận). Cổng che quá tay sẽ bị người dùng vòng qua bằng cách đọc sổ, và khi ấy nó chỉ là hình thức.

## 6. Sau-merge — nợ có tên (KHÔNG thuộc change này)

- [ ] 6.1 Nợ **#15**: phát hiện dữ liệu nhạy cảm ĐI VÀO cùng pull request và cảnh báo (PO 03/09 — đã vào
      backlog `named-debts`). Hướng ngược với change này, và là danh sách cấm ở vai cảnh báo.
