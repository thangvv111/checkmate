# CheckMate

CheckMate — **maker–checker cho code và tài liệu** (MSB AI Hackathon 2026, track AI FOR MY TEAM).
Cổng review đối kháng: không gợi ý cải thiện — nó được thiết kế để **bác bỏ**. Verdict PASS/FAIL
ghim commit SHA; mọi finding kèm bằng chứng chạy-thật hoặc trích dẫn nguyên văn.

## Hai điều đáng nói

**Ý kiến của model không chặn được merge.** Model đề xuất probe (phép thử đối kháng) và viết diễn
giải, nhưng nó không có tool nào — máy chủ mới là bên chạy probe thật, trong git-worktree sandbox,
trên **cả nhánh PR lẫn nhánh gốc** để đối chứng. Việc phân loại kết quả do máy quyết theo bảng chân
trị: `pass · hồi quy · ngoài phạm vi · nghi vấn · cải thiện · bỏ qua · không chạy`. Model không được
tự giác luật đó. Và chỉ **hồi quy** — đỏ ở nhánh PR, xanh ở nhánh gốc — mới đủ tư cách chặn merge.
Kèm theo là các lưới chống xanh giả: probe bị skip không tính là pass; thiếu đối chứng thì không
được phong hồi quy; không probe nào chứng minh được gì thì lượt chấm kết thúc bằng **lỗi**, không ra
PASS.

**Mỗi lượt chấm để lại một lớp regression.** Probe nào đã chứng minh khớp contract — chạy đạt trên
nhánh gốc — được giữ lại trong thư viện theo repo, và chạy lại ở mọi lượt sau mà không tốn thêm một
lời gọi model nào. Trùng lặp lọc qua bốn tầng: hai tầng cơ học, một tầng model phán xử đúng một câu
hẹp, một tầng dựa trên hành vi đo được qua nhiều lượt. Số đo hiện có: thư viện của một repo demo có
41 probe, trong đó 11 là bản chạy-lại trùng lặp bị cơ chế lọc loại ra. Cơ chế thì có; **đường cong
tích luỹ thì chưa đo được**, vì CheckMate mới chạy trên repo demo và chưa phục vụ dự án nào.


## Cấu trúc

- `packages/shared` — schema Finding / Verdict / RunEvent dùng chung CLI ↔ web ↔ replay
- `packages/harness` — lõi checker: CLI, model provider, sandbox, skill
- `apps/web` — web app bọc harness: hàng đợi PR đa repo, stream run, verdict card, cổng merge, sổ cái
- `specs/` — luật hành vi của chính CheckMate, có mã R để probe neo vào
- `test/` — lưới test cho các hàm lõi, cũng là file mẫu cho probe sinh ra

## Chạy skill A (code-PR)

```bash
npm install
npm run checker -- run --skill code --repo <đường dẫn repo đích> --branch <nhánh PR> [--base main] [--json]
```

Pipeline 5 bước: nhận diff PR → đọc `specs/` của repo đích → model sinh **probe đối kháng**
(kiểm qua HTTP inject, neo vào từng luật spec) → chạy probe trong **sandbox git-worktree** trên cả
nhánh PR **lẫn nhánh gốc làm đối chứng** → phân loại finding (chỉ nhận finding trỏ vào probe fail
thật; PR fail + gốc pass = hồi quy). FAIL ⟺ có ≥1 finding mức chặn. Exit code: 0 = PASS, 1 = FAIL.

## Hợp đồng repo đích — `checkmate.yml`

Repo đích khai cách nó được chấm trong `checkmate.yml` ở gốc: `sources` (spec, tài liệu API, file test mẫu
nằm đâu — không khai thì engine tự dò và ghi ra đã dò ở đâu), `runner` (lệnh chạy test, thư mục/đuôi probe,
hướng dẫn viết probe), `review` (file bỏ khỏi diff, khuôn lỗi ưu tiên, thang severity riêng). Engine đọc
file này từ bản clone của repo đích. Gói deploy của CheckMate không mang hồ sơ xây dựng (`openspec/`,
`docs/`, `test/`…) — xem `scripts/pack-deploy.sh` và `DEPLOY.md`.

## Model provider

- Mặc định dev local: **Claude Code CLI** (`claude -p`, dùng đăng nhập sẵn của máy).
- Deploy: **Anthropic API** — đặt `ANTHROPIC_API_KEY` (tự chuyển) hoặc ép bằng `CHECKER_PROVIDER=api|cli`.
- Đổi model: `CHECKER_MODEL` (mặc định `claude-sonnet-5`). Kiến trúc adapter chừa chỗ cắm provider khác.

## Chạy ở hai môi trường

**Local (máy dev):** như trên — model đi qua Claude Code CLI đăng nhập sẵn, GitHub đi qua `gh` của máy
nếu chưa đặt token. Chế độ `org` bật bằng `--org`.

**Cloud (deploy online):** code thuần Node + git, không phụ thuộc Windows. Yêu cầu môi trường:
- `ANTHROPIC_API_KEY` — bắt buộc (cloud không có Claude Code CLI; provider tự chuyển sang API).
- Token GitHub **theo từng repo** — bắt buộc (cloud không có `gh`). Dán ở ⚙ Cài đặt qua bốn bước
  (đường dẫn → token → kiểm kết nối → chọn nhánh); PAT quyền đọc repo + pull request, thêm quyền ghi
  nếu dùng cổng Merge/Reject. `GITHUB_TOKEN` trong môi trường vẫn dùng được làm chìa chung cho repo
  chưa có chìa riêng.
- `git` có trong image; repo đích clone sẵn vào `local_path` (hoặc mount volume).
- Volume bền cho `web-runs/` (lịch sử run + sổ review-log) và `probes-lib/` (thư viện probe tích luỹ)
  — mất volume là mất tài sản regression. `CHECKER_LIB_DIR` đổi được chỗ chứa thư viện.
- `CHECKMATE_MODE=demo` cho bản public (khoá cấu hình), `org` cho bản nội bộ sau xác thực của tổ chức.
