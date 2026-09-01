# dinh-tuyen-skill-cham Specification

## Purpose
TBD - created by archiving change dinh-tuyen-skill-cham. Update Purpose after archive.

## Requirements

### Requirement: Định tuyến theo file thực thi được, fail-closed

Hệ thống SHALL chọn skill chấm cho một pull request dựa trên việc PR đó có đổi file **thực thi được**
hay không, chứ không dựa trên việc mọi file đổi có cùng một phần mở rộng.

Danh sách «văn bản thuần» MUST là danh sách CHO PHÉP (allowlist) hẹp, không phải danh sách loại trừ:
chỉ `*.md`, `*.txt`, và file nằm dưới `openspec/`. Mọi thứ khác MUST kéo PR về pipeline code.

Hướng lệch bắt buộc là **fail-closed**: khi không chắc, chọn code. Chọn nhầm sang doc nghĩa là một PR
có code đi qua cổng mà không probe nào chạy — đúng loại xanh giả mà công cụ này sinh ra để chống;
chọn nhầm sang code chỉ tốn tiền và ồn.

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
