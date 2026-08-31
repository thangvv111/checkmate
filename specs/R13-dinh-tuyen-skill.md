# R13 — Định tuyến skill: chọn đường chấm theo loại file đã đổi

Một pull request đi vào CheckMate phải được chấm bằng **skill code** (sinh probe, chạy thật trên hai
nhánh) hay **skill doc** (đối chiếu tài liệu theo rubric). Quyết định này chi phối cả lượt chấm, và
sai theo hai hướng gây hai loại thiệt hại rất khác nhau:

- Doc bị đẩy sang code → tốn tiền và ồn. Đo được trên PR #17 (chỉ đổi tài liệu + cấu hình quy trình):
  10 probe code cho một PR không có dòng code nào, 6 cái fail cùng nguyên nhân trên cả hai nhánh vì
  không có gì thật để thử, 4 lượt gọi model, ~52k token vào.
- Code bị đẩy sang doc → **không probe nào chạy**, verdict xanh trên vùng chưa ai thử. Đó là xanh giả,
  đúng thứ công cụ này sinh ra để chống.

Hai thiệt hại không đối xứng, nên luật dưới đây lệch hẳn về một phía.

## Phân loại

- **R13.1** — Định tuyến PHẢI dựa trên việc PR có đổi file **thực thi được** hay không, KHÔNG dựa
  trên việc mọi file đổi có cùng một phần mở rộng. Luật đời trước («toàn bộ file đổi là `.md` mới là
  doc») làm một file `.yaml` duy nhất kéo cả PR tài liệu sang đường code.
- **R13.2** — «Văn bản thuần» PHẢI là danh sách **CHO PHÉP** hẹp: `*.md`, `*.txt`, và file nằm dưới
  thư mục `openspec/`. Mọi thứ ngoài danh sách kéo PR về skill code. Không được dùng danh sách loại
  trừ («không phải `.ts/.js/.py` thì là doc»): mỗi lần repo đích mang một loại file thực thi được mà
  danh sách chưa biết, PR có code sẽ âm thầm đi đường doc — sai về phía nguy hiểm.
- **R13.3** — `checkmate.yml` ở gốc repo KHÔNG phải văn bản thuần dù là YAML: engine ĐỌC nó để biết
  import gì từ đâu ([R2](R2-hop-dong-repo-dich.md)), nên đổi nó là đổi hành vi chấm. Ngược lại
  `openspec/**` LÀ văn bản thuần: engine không đọc thư mục đó, nó chỉ định hình cách con người và
  agent soạn change về sau. Đây là quy ước của CheckMate áp cho mọi repo đích — repo nào để mã nguồn
  trong `openspec/` là vi phạm quy ước, và hệ quả (PR đó đi đường doc) thuộc về repo ấy.
- **R13.4** — Skill doc CHỈ được chọn khi có ít nhất một file `.md` trong diff. Rubric của skill doc
  xây quanh trích dẫn nguyên văn từ MỘT tài liệu; không có `.md` nào thì nó không có gì để đọc, và
  lượt chấm phải rơi về đường code.
- **R13.5** — Phép so đường dẫn PHẢI khớp **cấu trúc**, không khớp tiền tố chuỗi: `openspec/` là một
  thư mục, nên `openspec-notes.js` KHÔNG được nhận nhầm là văn bản thuần. Tên file trong diff là dữ
  liệu do maker viết ([R7](R7-tam-nhin-diff.md)) — ai muốn né probe sẽ đặt tên nhắm đúng chỗ hở này.

## Nói ra quyết định

- **R13.6** — Quyết định định tuyến PHẢI được ghi vào log lượt chấm kèm **lý do**: skill nào được
  chọn, và file nào khiến nó được chọn. Router quyết trong im lặng thì người đọc verdict không biết vì
  sao PR của mình đi đường nào, và một quyết định không ai thấy là một quyết định không ai kiểm được —
  cùng nguyên tắc với [R7](R7-tam-nhin-diff.md) về phần diff bị cắt.
