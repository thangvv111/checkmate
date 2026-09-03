# Security — error-message-egress-gate

Change này **là** một change bảo mật: nó vá một đường rò ⛔C3. Nên security review ở đây không phải thủ tục
soi tác dụng phụ, mà là soi chính cái vá — một bộ lọc bảo mật hỏng nguy hiểm hơn không có bộ lọc, vì nó tạo
niềm tin rằng bề mặt đã được gác.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Trục chính. Đường rò: thông điệp lỗi từ bộ chạy test của repo đích → log · comment pull request ·
  prompt gửi model. Cổng chặn cả ba, cơ chế danh sách CHO PHÉP.
- ⚠️ S1.2 **Chỗ yếu số một — verdict cũ.** Verdict ghi trước change không mang bản đã lọc. Fallback về
  `actual` sẽ mở lại đúng lỗ vừa vá bằng một dòng code trông vô hại. D4 chốt fail-closed; ca T4.1 và mutation
  T6.4 khoá nó. Nếu ai đó sau này thêm fallback «cho tiện», hai ca đó phải đỏ.
- ⚠️ S1.3 **Chỗ yếu số hai — âm tính giả của tầng 3.** Chuỗi bí mật **có** trong diff (PR commit cả `.env`)
  sẽ qua cửa. Đã khai trong requirement 2 và trong nợ #15. Lập luận chấp nhận: ở ca đó bí mật lộ ngay trong
  pull request trước khi CheckMate chạm vào — nhưng lập luận ấy chỉ đúng cho **bề mặt pull request**. Nó
  KHÔNG đúng cho prompt gửi model: một secret trong diff sẽ đi sang dịch vụ thứ ba, nơi nó chưa từng có mặt.
  **Chưa giải quyết trong change này** — ghi ra để không ai tưởng đã kín; ứng viên nợ.
- ✅ S1.4 Bản che PHÂN BIỆT ĐƯỢC (⛔C3 đòi): phần thay thế mang **độ dài**, nên hai giá trị khác độ dài cho
  hai bản che khác nhau. Hai giá trị **cùng độ dài** thì không phân biệt được — chấp nhận, vì phân biệt sâu
  hơn đòi phát thêm thông tin phái sinh từ chính bí mật.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính, không đổi vai.
- N/A S2.2 Không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge. Cổng chỉ đổi **chữ** trên comment, không đổi verdict, không đổi
  nhãn probe, không đổi PASS/FAIL.
- ✅ S3.2 Không đụng ba công tắc tự động.

## S4. Dữ liệu không tin cậy & prompt injection (R7 / ⛔C4)

- ✅ S4.1 Thông điệp lỗi là dữ liệu do **code repo đích** sinh ra — không tin được. Cổng chỉ **đọc và cắt**
  nó; không eval, không dùng nó làm điều kiện rẽ nhánh nào ngoài việc chọn khuôn.
- ⚠️ S4.2 Cổng làm ⛔C4 **chặt hơn** ở một chỗ chưa ai để ý: `loiThu` hiện đi **nguyên văn** vào
  `promptSinhCode` (`skill-code.ts:627`). Đó là dữ liệu ngoài vào prompt, và tuy đã có rào `Fence` bọc, nội
  dung bên trong chưa từng bị lọc. Sau change, thứ vào prompt là bản đã qua cửa — bề mặt injection hẹp lại.
- ⚠️ S4.3 **Đường ngược, phải khoá bằng ca test:** thông điệp lỗi do repo đích sinh ra không được **lái**
  cổng. Ví dụ dựng một chuỗi trông như khuôn đã biết để đẩy nội dung khác qua cửa ô — T5.4. Cổng phải quyết
  theo cấu trúc + cửa ô, không theo thứ mà thông điệp tự khai về mình.

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 Không chạy code mới. Cổng là hàm thuần xử lý chuỗi.
- ✅ S5.2 KHÔNG đụng `envSandbox`. Ghi lại vì nó là lớp phòng thủ đã có và vẫn là lớp mạnh nhất trên trục
  này: secret của CheckMate không vào được sandbox, nên không vào được thông điệp lỗi. Change này lo lớp
  thứ hai (secret của repo đích), không thay lớp thứ nhất.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 `EvidenceTestRun` thêm **trường optional**; `actual` giữ nguyên nghĩa và nguyên nội dung. Verdict
  đã ghi đọc lại vẫn hợp lệ, không di trú. `test/doc-du-lieu-cu.test.ts` là lưới thứ hai.
- ✅ S6.2 Sổ SQLite giữ **nguyên văn** — PO chốt 03/09. Đây là lựa chọn có ý thức: sổ là bề mặt nội bộ sau
  đăng nhập, và nguyên văn ở đó là thứ cứu người điều tra sự cố. Hệ quả phải nói thẳng: **ai đọc được sổ thì
  đọc được bí mật**, nên vai đọc sổ là vai tin cậy.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Cổng hỏng (khuôn không khớp, nguồn đối chiếu vắng) → gột, không phát. Không nhận dạng được thì
  không phát nội dung, đúng ⛔C2.
- ✅ S7.2 Nguồn đối chiếu rỗng (không có diff) → tầng 3 từ chối mọi chuỗi, không phải cho qua mọi chuỗi.
  Đây là chỗ một lỗi dấu `!` biến cổng thành mở toang mà mọi ca test khác vẫn xanh — cần ca riêng.
- ✅ S7.3 Nhãn probe và verdict KHÔNG đổi: requirement 3 + ca T3.1 khoá rằng vân tay so trên bản nguyên văn.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **đưa một chuỗi bí mật ra bề mặt công khai**. Mọi đường nghĩ ra được:

- ✅ S8.1 (a) đặt sau một tiền tố lớp lỗi hợp lệ → T5.1 · T1.3.
- ✅ S8.2 (b) giấu trong object/mảng lồng nhiều tầng → T5.2 · T2.5 (đệ quy phải xuống tận đáy).
- ✅ S8.3 (c) làm bí mật trông như số → T5.3 (ngưỡng số chữ số của tầng 1).
- ✅ S8.4 (d) đặt đúng vị trí ô của một khuôn đã biết → T5.4.
- ⚠️ S8.5 (e) **commit bí mật vào chính PR để nó có trong diff** → **ĐƯỜNG NÀY MỞ** (S1.3). Với bề mặt
  comment thì vô hại theo lập luận «đã công khai sẵn»; với **prompt gửi model** thì không — chưa giải quyết.
- ⚠️ S8.6 (f) đọc sổ nội bộ → mở theo thiết kế (S6.2), vai đọc sổ là vai tin cậy.
- ✅ S8.7 (g) làm cổng ném để cả lượt chấm chết, rồi đọc thông điệp lỗi của chính cổng → cổng là hàm thuần
  xử lý chuỗi; ca test phải gồm đầu vào méo (rỗng, rất dài, ký tự điều khiển, unicode) và khoá rằng nó
  không ném.

## Notes

- Hai chỗ **chưa kín** và đã khai: S1.3/S8.5 (bí mật trong diff đi sang model) và S6.2/S8.6 (sổ nội bộ giữ
  nguyên văn). Cái thứ hai là lựa chọn của PO; cái thứ nhất là **ứng viên nợ mới**, cần trình PO.
- Tiêu chí «đủ ca test» cho change này không phải số lượng mà là: **mỗi đường ở S8 có một ca**. Một bộ lọc
  bảo mật thiếu ca cho một đường thì đường đó coi như chưa được gác.
