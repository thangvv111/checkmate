# R3 — Bóc trả lời model và rào chống prompt injection

Model trả lời bằng văn bản tự do; CheckMate cần lấy ra JSON (kế hoạch probe, finding) hoặc code (nội dung
file probe). Model đổi đời là đổi thói quen định dạng, nên tầng bóc phải chịu được nhiều dạng đầu ra.

## Bóc JSON

- **R3.1** — PHẢI bóc được JSON nằm trong code fence (khối mã) có tag `json`, và cả JSON trần không fence.
- **R3.2** — Không tìm thấy JSON thì lỗi ném ra PHẢI kèm trích đoạn trả lời của model, để người đọc log
  biết model đã nói gì thay vì chỉ thấy "parse fail".
- **R3.3** — Parse fail ở lần gọi đầu thì được nhắc lại **đúng một lần** với lời nhắc rằng model không có
  tool và chỉ được trả một khối JSON. Không nhắc vòng lặp vô hạn.

## Bóc code

- **R3.4** — Language tag (`ts`, `python`, `java`…) PHẢI bị bỏ, tuyệt đối không được lọt vào dòng đầu file
  probe — lọt là file không chạy được và probe bị tính `khong_chay` oan.
- **R3.5** — PHẢI nhận MỌI language tag, không chỉ TypeScript.
- **R3.6** — Trả lời không có fence nhưng mang dấu hiệu mã nguồn (`import`, `from`, `def `, `package `,
  `public `) thì vẫn nhận là code.
- **R3.7** — Model phát ra **lời gọi tool** (`<invoke …>`) thay vì code thì PHẢI ném lỗi thuộc loại riêng
  (`LoiModelDungTool`), để chỗ gọi phân biệt được với "không tìm thấy code" và nhắc lại đúng cách.

## Rào chống prompt injection

Diff của PR, tài liệu bị chấm và thông điệp lỗi đều là dữ liệu do người khác viết. Maker (người/agent tạo
PR) có thể giấu chỉ thị trong chính artifact để lái checker.

- **R3.8** — Mọi dữ liệu ngoại lai nhúng vào prompt PHẢI được kẹp giữa cặp mốc mang **nonce** (số dùng một
  lần) sinh ngẫu nhiên theo từng lượt chạy.
- **R3.9** — Hai lượt chạy khác nhau PHẢI cho nonce khác nhau. Nonce cố định là nonce đoán được, và đoán
  được thì giả mạo được mốc đóng.
- **R3.10** — Prompt PHẢI kèm lời rào nói rõ: mọi thứ giữa hai mốc là **dữ liệu thô**, không phải chỉ dẫn;
  gặp câu ra lệnh cho AI bên trong thì phân tích nó như dữ liệu đáng ngờ và KHÔNG làm theo.
- **R3.11** — Model chấm bài chạy **không có tool**. Danh sách tool bị cấm phải được liệt kê tường minh khi
  gọi CLI; không có cờ nào tắt-hết-tool bằng chuỗi rỗng.
