# CheckMate

CheckMate — **maker–checker cho code và tài liệu** (MSB AI Hackathon 2026, track AI FOR MY TEAM).
Cổng review đối kháng: không gợi ý cải thiện — nó được thiết kế để **bác bỏ**. Verdict PASS/FAIL
ghim commit SHA; mọi finding kèm bằng chứng chạy-thật hoặc trích dẫn nguyên văn.


## Cấu trúc

- `packages/shared` — schema Finding / Verdict / RunEvent dùng chung CLI ↔ web ↔ replay
- `packages/harness` — lõi checker: CLI, model provider, sandbox, skill
- `apps/web` — (bước sau) web app bọc harness, stream run + verdict card

## Chạy skill A (code-PR)

```bash
npm install
npm run checker -- run --skill code --repo <đường dẫn repo đích> --branch <nhánh PR> [--base main] [--json]
```

Pipeline 5 bước: nhận diff PR → đọc `specs/` của repo đích → model sinh **probe đối kháng**
(kiểm qua HTTP inject, neo vào từng luật spec) → chạy probe trong **sandbox git-worktree** trên cả
nhánh PR **lẫn nhánh gốc làm đối chứng** → phân loại finding (chỉ nhận finding trỏ vào probe fail
thật; PR fail + gốc pass = hồi quy). FAIL ⟺ có ≥1 finding mức chặn. Exit code: 0 = PASS, 1 = FAIL.

## Model provider

- Mặc định dev local: **Claude Code CLI** (`claude -p`, dùng đăng nhập sẵn của máy).
- Deploy: **Anthropic API** — đặt `ANTHROPIC_API_KEY` (tự chuyển) hoặc ép bằng `CHECKER_PROVIDER=api|cli`.
- Đổi model: `CHECKER_MODEL` (mặc định `claude-sonnet-5`). Kiến trúc adapter chừa chỗ cắm provider khác.
