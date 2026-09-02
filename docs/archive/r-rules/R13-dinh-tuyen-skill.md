<!-- ĐÃ GỠ KHỎI VAI TRÒ LUẬT ngày 2026-09-02 (change retire-r-rules). File này CHỈ ĐỌC và KHÔNG còn được cập nhật.
     Nhà mới của từng điều: docs/r-rules-map.md. Luật đang hiệu lực: openspec/specs/<capability>/. -->

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
- **R13.3** — Tiêu chí phân định là **engine có ĐỌC file đó để chấm hay không**, áp ĐỀU TAY:
  - `checkmate.yml` ở gốc KHÔNG phải văn bản thuần dù là YAML — engine đọc nó để biết import gì từ
    đâu ([R2](R2-hop-dong-repo-dich.md)).
  - **`specs/**` KHÔNG phải văn bản thuần dù là `.md`** — engine đọc thư mục này để so luật giữa hai
    nhánh ([R1.19](R1-phan-loai-probe.md)) và đếm độ phủ mã luật (R1.22). Cùng một tiêu chí mà cho
    hai kết luận trái ngược là tự mâu thuẫn; và hậu quả nặng hơn checkmate.yml: PR sửa hoặc gỡ luật
    của CHÍNH CỔNG sẽ được xét bằng rubric tài liệu, không probe nào chạy — tự nới cổng rồi tự qua
    cổng (vòng hai của cổng bắt trên chính change này).
  - `openspec/**` LÀ văn bản thuần **nhưng chỉ với các đuôi cấu hình quy trình** (`.md`, `.txt`,
    `.yaml`, `.yml`, `.json`). Cho cả THƯ MỤC là văn bản thì `openspec/hack.ts` cũng thành tài liệu —
    cửa né probe rộng nhất, và nó do chính luật này mở ra ở bản đầu.
- **R13.4** — Skill doc CHỈ được chọn khi có ít nhất một file `.md` trong diff. Rubric của skill doc
  xây quanh trích dẫn nguyên văn từ MỘT tài liệu; không có `.md` nào thì nó không có gì để đọc, và
  lượt chấm phải rơi về đường code.
- **R13.5** — Phép so đường dẫn PHẢI khớp **cấu trúc**, không khớp tiền tố chuỗi: `openspec/` là một
  thư mục, nên `openspec-notes.js` KHÔNG được nhận nhầm là văn bản thuần. Tên file trong diff là dữ
  liệu do maker viết ([R7](R7-tam-nhin-diff.md)) — ai muốn né probe sẽ đặt tên nhắm đúng chỗ hở này.
  Ba hệ quả bắt buộc, cả ba đều do vòng chấm đầu tiên của chính luật này bắt ra:
  - **Đuôi file** so KHÔNG phân biệt hoa thường (`README.MD` vẫn là tài liệu), nhưng **tên thư mục**
    so ĐÚNG HOA THƯỜNG: engine chạy trên Linux, nơi `OpenSpec/` là thư mục KHÁC `openspec/`. Gột hoa
    thường cả đường dẫn là tự mở cửa: đặt mã nguồn vào `OpenSpec/` là PR đi đường tài liệu.
  - KHÔNG được chuẩn hoá dấu `\` thành `/`. `git diff --name-only` luôn trả dấu `/`, nên đường dẫn
    chứa `\` là **tên file thật** do maker đặt — `openspec\hack.ts` là MỘT file ở gốc repo.
    Chuẩn hoá nó là cho maker tự chọn đường chấm nhẹ tay cho PR của chính mình.
  - KHÔNG được nhận chuỗi `openspec` trơ là văn bản thuần: git liệt kê FILE chứ không liệt kê thư
    mục, nên khớp đúng chuỗi đó chỉ có thể là một file thực thi được ở gốc repo.

## Khai vùng mù và chịu đầu vào méo

- **R13.7** — Skill doc chỉ đọc ĐÚNG MỘT tài liệu, nên với PR nhiều file thì phần lớn nội dung thay
  đổi KHÔNG ai xem. Quyết định định tuyến PHẢI khai ra **những file sẽ không được đọc** — nêu cái
  được xem không thay được nghĩa vụ nêu cái không được xem. Cùng nguyên tắc với
  [R7](R7-tam-nhin-diff.md): được phép thu hẹp, không được thu hẹp trong im lặng. Danh sách dài thì
  cắt được, nhưng phải nói rõ còn bao nhiêu file nữa.
- **R13.8** — Hàm phân loại đứng ĐẦU pipeline nên PHẢI chịu được danh sách méo (phần tử `null`,
  `undefined`, không phải chuỗi, chuỗi rỗng): rơi về `code` kèm lý do, KHÔNG ĐƯỢC ném. Ném ở đây làm
  cả lượt chấm chết giữa chừng — hỏng an toàn ngược hướng, vì fail-closed nghĩa là về đường chặt
  hơn, không phải là dừng hẳn.

## Nói ra quyết định

- **R13.6** — Quyết định định tuyến PHẢI được ghi vào log lượt chấm kèm **lý do**: skill nào được
  chọn, và file nào khiến nó được chọn. Router quyết trong im lặng thì người đọc verdict không biết vì
  sao PR của mình đi đường nào, và một quyết định không ai thấy là một quyết định không ai kiểm được —
  cùng nguyên tắc với [R7](R7-tam-nhin-diff.md) về phần diff bị cắt.
