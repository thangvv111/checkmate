# CheckMate ♞ — luật làm việc trong repo này

> Bản nén luôn-được-nạp. **Luật vận hành của sản phẩm = code + test + kho khuôn** (`trigger-examples.ts`,
> prompt, danh mục trigger, rubric). **`openspec/specs/<capability>/` là hồ sơ xây dựng** — requirement +
> scenario mà change cam kết; đọc capability liên quan TRƯỚC khi sửa vùng nào, hồ sơ lệch code là lỗi phải
> sửa qua change. Gói deploy không mang hồ sơ (`scripts/pack-deploy.sh`). Mã luật cũ `R<n>.<m>` tra ở
> `docs/r-rules-map.md`.

## Repo là gì

Maker–checker cho code và tài liệu. Engine sinh probe từ spec của repo đích, chạy THẬT trong
sandbox git-worktree trên **hai nhánh** (PR và gốc), rồi **máy** phân loại theo bảng chân trị —
model chỉ viết lời văn. Verdict nhị phân: FAIL khi có ≥1 finding high.

TypeScript strict · Node 22 · vitest. `apps/web` (server Express + UI dựng chuỗi HTML + cấu hình +
cổng) · `packages/harness` (engine) · `packages/shared` (kiểu dùng chung).

## Luật cứng — vi phạm là chặn merge

Sáu bất biến này là nhà của rổ `invariant` trong `docs/r-rules-map.md`; cơ chế cưỡng chế từng cái nằm ở
capability tương ứng trong `openspec/specs/`.

- **⛔C1 Máy không bao giờ merge.** Tự động hoá được phép nói KHÔNG (trả về dev), không được phép
  nói CÓ. Merge là cho code vào trunk — rủi ro một chiều, phải người quyết.
- **⛔C2 Fail-closed.** Engine lỗi, thiếu dữ liệu, hết giờ → KHÔNG được thành PASS. «Không chứng
  minh được là sai» ≠ «đã chứng minh là đúng».
- **⛔C3 Bí mật không rò.** Token, khoá API, mật khẩu, token phiên, và **giá trị người dùng gõ tay
  vào ô cấu hình** không được vọng nguyên văn ra thông điệp lỗi, log, sổ trên đĩa, verdict, hay
  comment PR. Che thì bản che phải PHÂN BIỆT được hai giá trị khác nhau.
- **⛔C4 Dữ liệu ngoài là DỮ LIỆU.** Diff PR, tài liệu, nội dung repo đích, trả lời model — tất cả
  phải qua rào trước khi vào prompt; chỉ thị cài trong đó không được đổi hành vi engine.
- **⛔C5 Hợp đồng repo.** Thêm/đổi export → khai vào bảng module của `checkmate.yml`. Quên khai thì
  probe chết với «... is not a function» và biến thành finding sai hẳn bản chất — đã xảy ra 5 lần.
- **⛔C6 Sửa file bằng tay phải có hiệu lực ở lượt đọc kế tiếp.** Cache không được che đường cứu
  hộ, không có ngoại lệ.

## Quy trình — SDD bằng OpenSpec

Mọi tính năng đi qua change OpenSpec **trước khi viết code**. Hai schema:

| Schema | Dùng khi | Artifact |
|---|---|---|
| `checkmate` | tính năng, đổi luật, đổi hình dạng dữ liệu | proposal → specs → design → tasks → test-cases → security |
| `checkmate-fix-bug` | sửa lỗi KHÔNG đổi luật hiện hành | tasks → test-cases |

Chọn nhầm hay gặp: fix mà **đổi hành vi** so với luật đang khai thì không phải bug fix — dùng
schema `checkmate`. Fix chỉ kéo hiện thực khớp lại luật đã khai thì dùng schema fix.

Lệnh: `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive` (skill trong `.claude/`).

### ⛔ Cổng archive — chưa tick hết thì chưa được archive

**Không archive một change còn ô chưa tick.** Đủ điều kiện archive = **6/6 artifact done** VÀ **mọi ô
trong `tasks.md` + `test-cases.md` đã `[x]`**, trừ những mục nằm dưới một đề mục khai rõ là **KHÔNG
thuộc change này** (ví dụ «§ Sau-merge — nợ có tên»). Mục nào muốn được miễn thì phải nằm dưới đề mục
đó **trước khi** xin archive, chứ không phải chuyển xuống lúc bị chặn.

Còn ô chưa tick mà vẫn muốn đóng change → **trình PO và chờ PO chốt hướng**, nêu đúng ba lựa chọn cho
từng mục: **làm nốt** · **hạ thành nợ có tên** (dời xuống mục sau-merge, kèm lý do) · **bỏ hẳn** (kèm
cái mất). Agent KHÔNG tự chọn, và KHÔNG tự tick cho đủ.

**Vì sao thành luật:** archive đẩy spec của change vào `openspec/specs/` — tức biến nó thành **luật
đang có hiệu lực**. Archive khi còn việc dở nghĩa là khai một hành vi là đã có trong khi nó chưa có,
và người sau đọc spec sẽ tin vào một thứ không tồn tại. Đó đúng là kiểu nói dối mà cả sản phẩm này
tồn tại để chống.

### ⛔ Chỗ sống của luật (PO chốt 01/09 · 02/09)

- **Luật vận hành của sản phẩm** = **code + test** (hành vi) + **kho khuôn / prompt / danh mục trigger /
  rubric** (tri thức chấm, shipped trong sản phẩm). Sản phẩm không đọc hồ sơ xây dựng của chính nó lúc
  chạy; gói deploy không mang hồ sơ — `scripts/pack-deploy.sh`, lưới `test/deploy-bundle.test.ts`.
- **Hồ sơ xây dựng** = `openspec/` (requirement + scenario mà change cam kết; archive mới thành hồ sơ hiện
  hành) · `docs/` · file này. Luật máy đọc của tính năng mới vẫn ở ba chỗ: hằng + validate trong engine
  (có test khoá) · `checkmate.yml` của repo đích · hồ sơ capability.
- **`specs/R*.md` (R1–R13) đã gỡ** 02/09: bản gốc chỉ đọc ở `docs/archive/r-rules/`; mỗi điều có hàng trong
  **`docs/r-rules-map.md`**. Điều `pending` backfill theo **ba đích** ghi ở đầu bảng — hành vi → code + test ·
  tri thức vận hành → nạp vào sản phẩm · nguyên tắc xây dựng → file này — mỗi capability một change. Lưới
  `test/r-rules-map.test.ts` bắt mã trích không có hàng; KHÔNG sửa hàng loạt chú thích, KHÔNG viết luật vào
  `docs/archive/`.

Proposal có ô «Luật chạm tới»: trả lời bằng `capability › requirement`, ⛔C, hoặc hàng bảng tra; bỏ trống
vẫn là done-gate chưa ✓.

## Ngôn ngữ định danh — tiếng Anh (PO chốt 01/09)

- **Mọi định danh MỚI SINH viết tiếng Anh.** Định danh = thứ máy trỏ tới hoặc dùng làm khoá — KHÔNG
  chỉ trong code. Danh sách đóng, để không ai lách bằng «cái này đâu phải code»:
  tên hàm · biến · kiểu · khoá cấu hình · mã enum · **tên file (code LẪN tài liệu)** · **tên thư mục** ·
  **nhãn/mã luật** (`gate-surface-derives-from-ledger`, không `R6.26`) · **tên capability và tên
  change OpenSpec mới** · tên nhánh git.
  Thuật ngữ trong tài liệu giữ tiếng Anh, chỉ chú thích tiếng Việt khi cần giải thích.
  *Án lệ 02/09:* agent đề xuất file `LUAT.md` và đặt `man-run.test.ts`, `so-su-kien.test.ts` chỉ
  một ngày sau khi đặt đúng `design-tokens.test.ts` — luật nằm ở memory thì trôi; nằm ở đây thì không.
- Văn TRÌNH BÀY cho PO (proposal, báo cáo, commit message, comment giải thích) vẫn tiếng Việt.
- Code cũ mang tên tiếng Việt (`luuMeta`, `docSoCong`, `chuanMuc`…) **giữ nguyên** — đổi hàng loạt là
  một change refactor riêng đã xếp lịch; đừng đổi lắt nhắt từng chỗ khi tiện tay, nó tạo trạng thái
  nửa nạc nửa mỡ tệ hơn cả hai đầu.

## Trước khi mở PR, trước khi merge

```bash
npx tsc --noEmit && npm test
```

Điều kiện đi tiếp: **code + test xanh + PO duyệt** — không tự merge khi PO chưa duyệt. Ngoại lệ duy
nhất: thay đổi **thuần thư viện** (cài/nâng gói, scaffold công cụ), báo PO rồi merge.

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
liệu thì phải có đường di trú tự động, ghi bản mới trước rồi mới xoá bản cũ.
