# dinh-tuyen-skill-cham Specification

## Purpose
TBD - created by archiving change dinh-tuyen-skill-cham. Update Purpose after archive.

## Requirements

### Requirement: Định tuyến theo file thực thi được, fail-closed

Hệ thống SHALL chọn skill chấm cho một pull request dựa trên việc PR đó có đổi file **thực thi được**
hay không, chứ không dựa trên việc mọi file đổi có cùng một phần mở rộng.

Danh sách «văn bản thuần» MUST là danh sách CHO PHÉP (allowlist) hẹp, không phải danh sách loại trừ:
chỉ `*.md`, `*.txt`, và file nằm dưới `openspec/` — **trừ** những file thuộc nguồn spec mà engine đọc.
Mọi thứ khác MUST kéo PR về pipeline code.

File thuộc **nguồn spec mà engine đọc** — theo mục `sources.specs` repo khai trong `checkmate.yml`, hoặc
theo danh sách tự dò khi repo không khai — là LUẬT engine đọc thật: đổi nó là đổi hành vi chấm, không
phải đổi tài liệu. File như vậy MUST kéo PR về pipeline code bất kể đuôi file hay thư mục. Router MUST
NOT lấy một thư mục cố định (`specs/`) làm tiêu chí — nguồn spec do repo khai, router phải hỏi nó.

Hướng lệch bắt buộc là **fail-closed**: khi không chắc, chọn code. Chọn nhầm sang doc nghĩa là một PR
có code đi qua cổng mà không probe nào chạy — đúng loại xanh giả mà công cụ này sinh ra để chống;
chọn nhầm sang code chỉ tốn tiền và ồn.

*(Bản trước gắn cứng `specs/` là «luật engine đọc thật» ngay trong code router, còn `openspec/**` là
văn bản thuần. Sau khi luật của chính repo này dời sang `openspec/specs/**`, một PR chỉ sửa luật sẽ bị
chấm bằng rubric tài liệu — đúng cái lỗ router sinh ra để bịt. Nguồn spec nay cấu hình được, nên tiêu
chí phải đi theo cấu hình.)*

#### Scenario: PR chỉ đổi tài liệu và cấu hình quy trình
- **WHEN** PR đổi `CLAUDE.md`, `openspec/config.yaml`, và `openspec/schemas/checkmate/schema.yaml`
- **THEN** PR được định tuyến sang skill **doc**, và tài liệu được chấm là file `.md` có nhiều dòng
  đổi nhất

#### Scenario: PR trộn tài liệu với mã nguồn
- **WHEN** PR đổi `AGENTS.md`, `GEMINI.md`, và `test/huong-dan-harness.test.ts`
- **THEN** PR được định tuyến sang skill **code**, vì có file thực thi được trong diff

#### Scenario: file cấu hình mà ENGINE đọc không phải văn bản thuần
- **WHEN** PR chỉ đổi `checkmate.yml` ở gốc repo
- **THEN** PR được định tuyến sang skill **code** — engine đọc file này để biết import gì từ đâu, nên
  đổi nó là đổi hành vi chấm, không phải đổi tài liệu

#### Scenario: file CI không phải văn bản thuần
- **WHEN** PR chỉ đổi `.github/workflows/ci.yml`
- **THEN** PR được định tuyến sang skill **code**

#### Scenario: PR chỉ sửa luật ở nguồn spec repo đã khai
- **WHEN** repo khai `sources.specs: openspec/specs/**/*.md` và PR chỉ đổi
  `openspec/specs/merge-gate/spec.md`
- **THEN** PR được định tuyến sang skill **code**, và log nêu file đó khớp mẫu nguồn spec nào

#### Scenario: nguồn spec ở thư mục không tên `specs/`
- **WHEN** repo khai `sources.specs: docs/spec/**/*.md` và PR chỉ đổi `docs/spec/rules.md`
- **THEN** PR được định tuyến sang skill **code** — thư mục không phải tiêu chí, nguồn đã khai mới là

#### Scenario: tài liệu quy trình không thuộc nguồn spec vẫn đi đường doc
- **WHEN** repo khai `sources.specs: openspec/specs/**/*.md` và PR chỉ đổi
  `openspec/changes/x/proposal.md`
- **THEN** PR được định tuyến sang skill **doc** như trước — không có file nào khớp nguồn spec

#### Scenario: không đọc được cấu hình nguồn thì lệch về phía code
- **WHEN** `checkmate.yml` của repo sai cú pháp, và PR chỉ đổi `specs/rules.md`
- **THEN** router KHÔNG rộng tay hơn hôm nay: file khớp danh sách tự dò được coi là luật, PR đi đường
  **code**, và log nói rõ không đọc được cấu hình nguồn nên đã lệch về phía an toàn

### Requirement: Đường doc đòi có tài liệu để đọc

Hệ thống MUST chỉ chọn skill doc khi có **ít nhất một file `.md`** trong diff. Skill doc chấm một tài
liệu cụ thể; không có `.md` nào thì nó không có gì để đọc.

#### Scenario: PR chỉ đổi YAML dưới openspec, không có .md
- **WHEN** PR chỉ đổi `openspec/schemas/checkmate/schema.yaml`
- **THEN** PR được định tuyến sang skill **code** (giữ hành vi cũ), vì không có tài liệu nào để skill
  doc đọc

### Requirement: Quyết định định tuyến phải được nói ra

Hệ thống MUST ghi quyết định định tuyến vào log của lượt chấm, kèm **lý do**: skill nào được chọn, và
file nào khiến nó được chọn. Router quyết trong im lặng thì người đọc verdict không biết vì sao PR của
mình đi đường nào — và một quyết định không ai thấy là một quyết định không ai kiểm được.

#### Scenario: PR bị kéo về code bởi đúng một file
- **WHEN** PR đổi 12 file `.md` và một file `apps/web/src/config.ts`
- **THEN** log nêu rõ skill code được chọn **vì** `apps/web/src/config.ts`, không chỉ ghi «loại: code»
