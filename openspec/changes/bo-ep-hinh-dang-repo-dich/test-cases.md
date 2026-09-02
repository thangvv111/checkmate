# Test cases — bỏ ép hình dạng repo đích

## Đơn vị luật tổng quát

- [ ] T1.1 [reproduce] Spec **không mã luật nào**, chia bằng tiêu đề thường → vẫn ra đơn vị có địa chỉ,
      probe vẫn neo được. *(Trước fix: `extractRuleIds` trả tập rỗng ⇒ độ phủ vô nghĩa và
      `vi_pham_luat_moi` không bao giờ bật.)*
- [ ] T1.2 **Vế đối chứng**: spec CÓ mã (`## R1 — …`) → mã vẫn neo đúng đơn vị mang nó. Thiếu ca này
      thì một bản «bỏ hẳn đường mã» cũng xanh ở T1.1, và mọi probe cũ mất neo.
- [ ] T1.3 Tài liệu chia tiêu đề rất sâu → số đơn vị bị chặn bởi trần độ sâu, không vỡ thành hàng trăm.
- [ ] T1.4 Nhánh PR thêm một đơn vị mà nhánh gốc không có → nhận là luật mới, **kể cả khi không có mã**.
- [ ] T1.5 [reproduce] Không đọc được spec nhánh gốc → KHÔNG phong luật-mới cho ai. *(Fail-closed sẵn
      có; ca này canh việc change không nới nó ra.)*

## Nguồn spec cấu hình được

- [ ] T2.1 Repo khai nhiều đường spec, có glob, có thư mục con → đọc đủ tất cả.
- [ ] T2.2 [reproduce] Spec nằm ở thư mục **không tên `specs/`**, đuôi **không phải `.md`**, trong
      **thư mục con** → vẫn đọc được. *(Trước fix: cả ba đều bị loại.)*
- [ ] T2.3 Không khai gì → tự dò, và **báo cáo đã tìm ở đâu, mỗi chỗ thấy gì**.
- [ ] T2.4 Đường khai không khớp file nào → nói rõ đường đó. Im lặng ở đây khiến người dùng tin spec
      đã được nạp.
- [ ] T2.5 Tài liệu API và file test mẫu cũng khai được, và cũng dò-có-báo-cáo khi không khai.

## Không có luật thì khai ra

- [ ] T3.1 [reproduce] Repo **không có spec nào** → lượt chấm VẪN CHẠY. *(PO chốt vế hai: từ chối
      thẳng thì sản phẩm không vào được cửa.)*
- [ ] T3.2 [reproduce] Prompt sinh probe khi khối luật rỗng **KHÔNG** chứa câu «mọi probe phải neo vào
      một luật ở đây». *(Trước fix: câu đó vẫn gửi kèm một khối rỗng — bảo model neo vào chỗ trống.)*
- [ ] T3.3 Verdict khai nguồn luật và số đơn vị đọc được.
- [ ] T3.4 **Độ phủ khai là không-đo-được, KHÔNG phải `0`.** `0` là phép đo đã thực hiện; không-đo-được
      là không có mẫu số. Đây là ca lõi của cả change.
- [ ] T3.5 Màn Run bày cảnh báo «chấm không có luật đối chiếu» **trước** verdict.
- [ ] T3.6 **Vế đối chứng**: repo CÓ spec → không cảnh báo nào, độ phủ đo bình thường.

## Dọn hard-code

- [ ] T4.1 [reproduce] Không chuỗi nào đi vào prompt chứa đường dẫn nội bộ của CheckMate
      (`specs/R…`). *(Trước fix: prompt chấm tài liệu nhắc `specs/R12` trong lượt chấm PRD người khác.)*
- [ ] T4.2 Nhãn bước nạp rubric khai đúng **bảy** loại — khớp số rubric thật sự dùng.
- [ ] T4.3 Lưới chống tái phát cho T4.1 chạy trên toàn `packages/harness/src/`.

## Tương thích — HỆ QUẢ, không phải mục tiêu

- [ ] T5.1 `demo-credit-approval` đọc ra đúng số đơn vị và độ phủ như trước.
- [ ] T5.2 Thư viện probe hiện có đọc lại được, **không probe nào mất neo** — đó là tài sản đắt nhất
      của sản phẩm.
- [ ] T5.3 Bản ghi `Verdict` đời cũ (không có trường nguồn-luật) vẫn parse và vẫn dựng được màn Run.

## Trục nhạy cảm

- [ ] T6.1 Tiêu cực: mở nguồn spec KHÔNG mở đường đọc file ngoài repo đích — đường khai bị chặn ở
      biên repo, không đi ngược lên cây thư mục.
- [ ] T6.2 Tiêu cực: nội dung spec là **dữ liệu**, không phải chỉ thị. Spec chứa câu lệnh nhắm vào
      model không được đổi hành vi engine (⛔C4) — nay bề mặt rộng hơn vì nguồn spec do repo khai.
- [ ] T6.3 Tiêu cực: đổi cách đọc spec KHÔNG nới đường quyết định cổng — chạy lại bộ ca phân loại và
      bộ ca cổng, không được xanh nhờ sửa kỳ vọng.

## Chạy

`npx tsc --noEmit` + `npm test` toàn bộ. Rồi ba phép thử trên repo THẬT: một repo spec có mã
(`demo-credit-approval`), một repo dựng riêng có spec **không mã** ở thư mục khác tên và có thư mục
con, và một repo **không có spec nào**.
