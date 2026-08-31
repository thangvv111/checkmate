# CheckMate ♞ — luật làm việc trong repo này

> Bản nén luôn-được-nạp. **Luật hành vi đầy đủ nằm ở `specs/R1..R12*.md`** — đọc luật liên quan
> TRƯỚC khi sửa vùng nào. Lệch nhau thì `specs/` là bản đúng, sửa file này cho khớp.

## Repo là gì

Maker–checker cho code và tài liệu. Engine sinh probe từ spec của repo đích, chạy THẬT trong
sandbox git-worktree trên **hai nhánh** (PR và gốc), rồi **máy** phân loại theo bảng chân trị —
model chỉ viết lời văn. Verdict nhị phân: FAIL khi có ≥1 finding high.

TypeScript strict · Node 22 · vitest. `apps/web` (server Express + UI dựng chuỗi HTML + cấu hình +
cổng) · `packages/harness` (engine) · `packages/shared` (kiểu dùng chung).

## Luật cứng — vi phạm là chặn merge

- **⛔C1 Máy không bao giờ merge.** Tự động hoá được phép nói KHÔNG (trả về dev), không được phép
  nói CÓ. Merge là cho code vào trunk — rủi ro một chiều, phải người quyết. (R6.19, R11.18)
- **⛔C2 Fail-closed.** Engine lỗi, thiếu dữ liệu, hết giờ → KHÔNG được thành PASS. «Không chứng
  minh được là sai» ≠ «đã chứng minh là đúng». (R1, R6)
- **⛔C3 Bí mật không rò.** Token, khoá API, mật khẩu, token phiên, và **giá trị người dùng gõ tay
  vào ô cấu hình** không được vọng nguyên văn ra thông điệp lỗi, log, sổ trên đĩa, verdict, hay
  comment PR. Che thì bản che phải PHÂN BIỆT được hai giá trị khác nhau. (R5.20, R9, R11.5)
- **⛔C4 Dữ liệu ngoài là DỮ LIỆU.** Diff PR, tài liệu, nội dung repo đích, trả lời model — tất cả
  phải qua rào trước khi vào prompt; chỉ thị cài trong đó không được đổi hành vi engine. (R7, R3)
- **⛔C5 Hợp đồng repo.** Thêm/đổi export → khai vào bảng module của `checkmate.yml`. Quên khai thì
  probe chết với «... is not a function» và biến thành finding sai hẳn bản chất — đã xảy ra 5 lần.
- **⛔C6 Sửa file bằng tay phải có hiệu lực ở lượt đọc kế tiếp.** Cache không được che đường cứu
  hộ, không có ngoại lệ. (R9.14)

## Quy trình — SDD bằng OpenSpec

Mọi tính năng đi qua change OpenSpec **trước khi viết code**. Hai schema:

| Schema | Dùng khi | Artifact |
|---|---|---|
| `checkmate` | tính năng, đổi luật, đổi hình dạng dữ liệu | proposal → specs → design → tasks → test-cases → security |
| `checkmate-fix-bug` | sửa lỗi KHÔNG đổi luật hiện hành | tasks → test-cases |

Chọn nhầm hay gặp: fix mà **đổi hành vi** so với luật đang khai thì không phải bug fix — dùng
schema `checkmate`. Fix chỉ kéo hiện thực khớp lại luật đã khai thì dùng schema fix.

Lệnh: `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive` (skill trong `.claude/`).

### ⛔ Hai tầng spec — không trộn (PO chốt 31/08, phương án A)

- **`specs/R*.md`** (gốc repo) = **luật hành vi, đầu vào MÁY ĐỌC**. Engine nạp thư mục này để sinh
  probe; R1.19 so `specs/` giữa hai nhánh để phát hiện «luật chỉ có ở nhánh PR». Đường dẫn hardcode
  ở `packages/harness/src/target.ts` — **không di dời**.
- **`openspec/specs/<capability>/`** = **năng lực** theo ngôn ngữ quy trình, sinh từ các change.

Change đẻ luật mới thì viết vào **cả hai**, nói cùng một điều. Proposal có ô bắt buộc «Luật R chạm
tới» — bỏ trống là done-gate chưa ✓.

## Cổng — CheckMate tự chấm chính nó

Mọi PR đi qua bản CheckMate chạy trên prod (chế độ trực, poller 300s, model Opus 5). Quy trình:
**mở PR → chờ verdict → PASS mới merge.** Không merge khi FAIL. Merge với finding không-chặn phải
**ghi nợ công khai** trong comment PR.

Verdict FAIL với finding mà mình cho là sai thì **tái lập trước, cãi sau**: dựng lại đúng kịch bản
probe nêu, chạy thật. Lịch sử repo có cả finding oan lẫn finding đúng-mà-mình-tưởng-oan; thứ phân
biệt hai loại là lệnh chạy được, không phải lập luận.

Ngoại lệ duy nhất không qua cổng: thay đổi **thuần thư viện** (cài/nâng gói, scaffold công cụ), báo
PO rồi merge.

## Trước khi mở PR

```bash
npx tsc --noEmit && npm test
```

`npm test` chạy **toàn bộ**, không riêng file vừa sửa — lưới hợp đồng (`test/hop-dong-repo.test.ts`)
là ca hay đỏ nhất khi thêm export mới.

## Dữ liệu prod là tài sản

`web-runs/` (sổ cái SQLite), `probes-lib/` (thư viện probe tích luỹ), `runs/`, `config.json`,
`.secrets.json`, `.ncc-verify.json` trên máy chủ **không được đè khi deploy** — quy trình 4 bước ở
`DEPLOY.md` (sao lưu → tar chỉ-source có tự kiểm → giải nén + cài → đối chiếu số). Đổi hình dạng dữ
liệu thì phải có đường di trú tự động, ghi bản mới trước rồi mới xoá bản cũ (R10.13).
