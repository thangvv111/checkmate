# R12 — Kho khuôn lỗi common: tri thức tái dùng giữa các repo

Probe là code import hàm thật của repo đích — không chạy được cross-repo. Thứ tái dùng được giữa các
dự án là **KHUÔN LỖI** (bug pattern): mẫu lỗi trừu tượng đúc từ finding thật, phát cho model dưới dạng
văn bản trong prompt sinh probe (skill code) và prompt tìm lỗi (skill doc). Chuỗi 13 vòng của PR #12
sinh 26 finding thì quá nửa rơi vào chưa tới chục khuôn lặp lại — «khuyết thì nổ», «vá cửa này quên
cửa song sinh», «thay lặng giá trị», «vọng nguyên văn»… Kho này giữ chúng lại cho MỌI repo về sau.

- **R12.1** — Khuôn common sống **trong repo CheckMate** (`packages/harness/src/khuon-loi.ts`), không
  phải thư mục dữ liệu máy: sửa kho khuôn là sửa lưới chấm của mọi dự án, nên nó phải đi qua đúng cổng
  chấm như mọi thay đổi code khác. Khuôn per-repo vẫn khai ở `review.khuon_loi` trong `checkmate.yml`
  của repo đích — hai tầng, không trộn.
- **R12.2** — Mỗi khuôn PHẢI kèm **án lệ** (`an_le`) mang MỐC ĐỊNH VỊ truy được (số PR, vòng chấm,
  tên file, tên repo): finding thật nào, ở đâu, đã đúc ra nó. Khuôn không án lệ là phỏng đoán — và
  «không nhận» là GÁC CHẠY ĐƯỢC ở cửa phát (từ chối + log), không phải lời dặn trong test. Án lệ để
  người duyệt kho đọc, KHÔNG phát vào prompt.
- **R12.3** — Trần **20 khuôn mỗi loại** (`code` · `doc`). Prompt phình là loãng chú ý model — kho đầy
  thì khuôn mới phải thay một khuôn cũ, và lần thay phải nói rõ vì sao khuôn cũ ít giá trị hơn.
- **R12.4** — Khuôn có thể mang **điều kiện bật** — regex đánh trên spec của repo đích (khuôn code)
  hoặc trên chính văn bản tài liệu (khuôn doc): khuôn chỉ có nghĩa với loại luật repo đó có (phân
  quyền, HTTP, validation…) thì không phát cho nơi không có luật đó. Khuôn vô điều kiện phát cho mọi
  repo. Phép đánh điều kiện PHẢI là hàm thuần của văn bản — RegExp mang cờ g/y giữ `lastIndex` làm
  cùng một văn bản cho hai kết quả ở hai lượt gọi, khuôn biến mất từ repo thứ hai trong tiến trình
  (vòng hai của cổng bắt); cờ trạng thái phải bị gột trước khi test. Hai cửa phát code/doc dùng CHUNG
  một đường — cửa lệch nhau là đúng khuôn lỗi KL9 mà kho này đang dạy model đi bắt.
- **R12.5** — Khuôn phát vào prompt là MỘT dòng mệnh lệnh kiểm được — không văn giảng giải. Cái «vì
  sao» nằm ở án lệ; prompt chỉ cần cái «thử gì». Cửa phát ÉP về một dòng (xuống-dòng thay bằng
  khoảng trắng) — chuỗi nhiều dòng vỡ danh sách bullet, phần đuôi khuôn bị model đọc như văn nền.
