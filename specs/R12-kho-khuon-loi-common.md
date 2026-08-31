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
- **R12.2** — Mỗi khuôn PHẢI kèm **án lệ** (`an_le`): finding thật nào, ở đâu, đã đúc ra nó. Khuôn
  không án lệ là phỏng đoán — không nhận. Án lệ để người duyệt kho đọc, KHÔNG phát vào prompt.
- **R12.3** — Trần **20 khuôn mỗi loại** (`code` · `doc`). Prompt phình là loãng chú ý model — kho đầy
  thì khuôn mới phải thay một khuôn cũ, và lần thay phải nói rõ vì sao khuôn cũ ít giá trị hơn.
- **R12.4** — Khuôn có thể mang **điều kiện bật** (regex trên spec của repo đích): khuôn chỉ có nghĩa
  với loại luật repo đó có (phân quyền, HTTP, validation…) thì không phát cho repo không có luật đó.
  Khuôn vô điều kiện phát cho mọi repo.
- **R12.5** — Khuôn phát vào prompt là MỘT dòng mệnh lệnh kiểm được — không văn giảng giải. Cái «vì
  sao» nằm ở án lệ; prompt chỉ cần cái «thử gì».
