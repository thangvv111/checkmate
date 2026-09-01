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

### ⛔ Chỗ sống của luật (PO chốt 01/09 — THAY phương án A 31/08)

- **`specs/R*.md`** (gốc repo) = **TÀI LIỆU THAM KHẢO** — nó đang trộn lẫn luật, án lệ và biên bản
  tranh luận nên KHÔNG được dùng làm khuôn ép kiến trúc mới, và change mới **KHÔNG đẻ thêm điều R***.
  Một change tái cấu trúc riêng sẽ dọn nó. (Lưu ý kỹ thuật còn hiệu lực tạm: engine HIỆN VẪN nạp
  `specs/` của repo đích để sinh probe và so hai nhánh — cơ chế ăn spec repo đích cũng đã được PO xếp
  lịch cấu trúc lại, change riêng; trước lúc đó đừng di dời đường dẫn trong
  `packages/harness/src/target.ts`.)
- **Luật máy đọc của tính năng MỚI** sống ở ba chỗ: hằng + validate trong engine (có test khoá) ·
  cấu hình trong `checkmate.yml` · hành vi trong **`openspec/specs/<capability>/`** (sinh từ change).

Proposal vẫn có ô «Luật R chạm tới» — từ nay câu trả lời đúng thường là «KHÔNG — cố ý» kèm nơi luật
sống; bỏ trống ô vẫn là done-gate chưa ✓.

## Ngôn ngữ định danh — tiếng Anh (PO chốt 01/09)

- **Mọi định danh MỚI SINH** — tên hàm, biến, kiểu, khoá cấu hình, mã enum, tên file code — viết
  **tiếng Anh**. Thuật ngữ trong tài liệu giữ tiếng Anh, chỉ chú thích tiếng Việt khi cần giải thích.
- Văn TRÌNH BÀY cho PO (proposal, báo cáo, commit message, comment giải thích) vẫn tiếng Việt.
- Code cũ mang tên tiếng Việt (`luuMeta`, `docSoCong`, `chuanMuc`…) **giữ nguyên** — đổi hàng loạt là
  một change refactor riêng đã xếp lịch; đừng đổi lắt nhắt từng chỗ khi tiện tay, nó tạo trạng thái
  nửa nạc nửa mỡ tệ hơn cả hai đầu.

## Cổng — CheckMate tự chấm chính nó

> ### ⛔ TẠM DỪNG từ 01/09/2026 — PO chốt
> **Không chờ verdict CheckMate để đi tiếp.** Điều kiện đủ để sang bước sau nay là: **code + test
> xanh + PO duyệt**. Đừng poll prod, đừng để PR treo chờ chấm.
>
> **Vì sao:** cổng đang nhiễu. Số đo tuần này: `hoi_quy` = 0 ở **14/14 lượt** (nhãn máy không phong
> được gì), `vi_pham_luat_moi` = 0 trong khi verdict vẫn FAIL vì finding **do model viết**, và một
> điểm bị đề nghị sai **ba vòng liên tiếp** dù luật đã chốt. Cổng đang tạo việc nhiều hơn tạo tín hiệu.
>
> **Bật lại:** chỉ khi PO nói. KHÔNG agent nào tự quyết bật lại, kể cả khi thấy cổng «có vẻ ổn rồi».
>
> **Vẫn giữ nguyên:** mọi thứ khác của mục này — danh tính người bấm, sổ chỉ-ghi-thêm, và **không tự
> merge khi PO chưa duyệt**. Thứ bị treo là *bước chờ verdict*, không phải kỷ luật maker–checker.
>
> **Nợ ghi công khai:** dừng cổng nghĩa là CheckMate tạm không dogfood chính nó — mất nguồn án lệ
> chính của kho ví dụ theo trigger. Đây là cái giá, ghi ra để không quên.

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

## File hướng dẫn cho các harness khác

Repo này chạy qua nhiều harness. Mỗi harness tự nạp một tên file khác nhau, nên luật repo được bày
ra ở bốn chỗ — **nhưng chỉ có MỘT nguồn chuẩn**:

| File | Harness tự nạp nó | Vai |
|---|---|---|
| `AGENTS.md` | Codex CLI · Grok Build (xAI) · GitHub Copilot · Cursor · Cline · opencode | **NGUỒN CHUẨN** — sửa luật thì sửa ở đây |
| `CLAUDE.md` | Claude Code · Grok Build · Copilot · opencode (fallback) | **Bản sao nguyên văn** của AGENTS.md |
| `GEMINI.md` | Gemini CLI (KHÔNG đọc AGENTS.md) | Con trỏ `@./AGENTS.md` — cú pháp import xác định của Gemini |
| `.github/copilot-instructions.md` | GitHub Copilot (mọi bề mặt) | Con trỏ sang AGENTS.md |

⛔ **Vì sao chép nguyên văn thay vì trỏ:** trừ Gemini (có cú pháp `@./file.md` nạp xác định), các
harness còn lại **KHÔNG bảo đảm đi theo con trỏ** — Codex ráp prompt bằng thuật toán duyệt thư mục,
không có directive import; opencode nói thẳng trong tài liệu là không tự parse tham chiếu file. File
chỉ ghi «đọc file X» thì thứ vào context là ĐÚNG CÂU ĐÓ, còn X có được mở hay không là tuỳ model.
Luật quan trọng thì không đặt cược vào chuyện tuỳ.

⛔ **Chống trôi:** `test/huong-dan-harness.test.ts` bắt buộc `CLAUDE.md` khớp từng ký tự với
`AGENTS.md`, và hai file con trỏ phải trỏ đúng chỗ. **Sửa một file, chạy `npm test`, lưới sẽ nói
file nào chưa đồng bộ** — đừng sửa tay bốn nơi. Cách nhanh: sửa `AGENTS.md` rồi
`cp AGENTS.md CLAUDE.md`.

## Dữ liệu prod là tài sản

`web-runs/` (sổ cái SQLite), `probes-lib/` (thư viện probe tích luỹ), `runs/`, `config.json`,
`.secrets.json`, `.ncc-verify.json` trên máy chủ **không được đè khi deploy** — quy trình 4 bước ở
`DEPLOY.md` (sao lưu → tar chỉ-source có tự kiểm → giải nén + cài → đối chiếu số). Đổi hình dạng dữ
liệu thì phải có đường di trú tự động, ghi bản mới trước rồi mới xoá bản cũ (R10.13).
