## Why

**«Chưa kết nối repo nào» không phải một trạng thái CheckMate biểu diễn được.** `apps/web/src/config.ts:160`:

```ts
function dsRepoTuLuu(luu: Partial<CheckmateConfig>): RepoConfig[] {
  return luu.repos?.length ? luu.repos : [{ ...MAC_DINH.repos[0], ...(luu.repo ?? {}) }];
}
```

Danh sách rỗng bị **âm thầm thay bằng một repo hard-code** (`thangvv111/demo-credit-approval`). Không có
lỗi nào, không có cảnh báo nào — chỉ là từ chỗ ấy trở đi cả hệ thống tin rằng có một repo.

**Đo được trên prod hôm nay:** sau khi PO xoá sạch repo khỏi `config.json` (`repos: []`), chế độ trực
**tự khởi hai lượt chấm** trên đúng cái repo ma ấy trong vòng một phút, tái tạo clone và thư viện probe
vừa được dọn. Bằng chứng ở log: `Chế độ trực: tự chấm PR #6 @ c5c2215`.

Và đây là chỗ đau nhất: **cùng một câu hỏi, hai đường trả lời khác nhau.**

| đường vào | hỏi «repo này có được khai không» | trả lời |
|---|---|---|
| webhook | `decideWebhookAction(..., cfg.repos.map(r => r.github))` | `422 — repo không có trong cấu hình` ✅ |
| chế độ trực | *(không hỏi)* | tự chấm repo ma ❌ |

Gác của webhook được dựng cẩn thận ở change `github-webhook` với lý do «chữ ký chỉ chứng minh người gửi
biết bí mật, không chứng minh việc này NÊN LÀM». Đường trực bỏ qua đúng vế thứ hai ấy — nó chạy code của
một repo **không ai khai** trên máy chủ.

## What Changes

1. **Rỗng là rỗng.** `dsRepoTuLuu` phân biệt hai ca mà bản cũ gộp làm một:
   - `repos` **không có mặt** + có `repo` đời cũ ⇒ nâng thành danh sách một phần tử *(giữ R4.3)*;
   - `repos` **có mặt và rỗng**, hoặc không có gì cả ⇒ **danh sách rỗng**.
   Bỏ hẳn `REPO_DEMO` khỏi `MAC_DINH` — một bản vừa cài không có repo nào, và nói thẳng điều đó.
2. **Kiểu nói thật: `repo` thành có-thể-rỗng**, `repo_dang_chon` có thể là chuỗi rỗng.
3. **Trình biên dịch nhớ hộ, không phải người.** Thêm kiểu `CauHinhCoRepo = CheckmateConfig & { repo: RepoConfig }`
   và hàm gác `coRepo(cfg)`. Mọi hàm cần một repo (12 chỗ ở `github.ts`) đổi chữ ký sang `CauHinhCoRepo`;
   ai muốn gọi phải đi qua gác. **47 chỗ** dùng `cfg.repo` được `tsc` soi hộ thay vì trông vào trí nhớ.
4. **Một gác repo-đã-khai dùng chung cho webhook và trực.** Hàm thuần `laRepoDaKhai(repos, github)`;
   webhook gọi nó, đường trực gọi nó. Hai chỗ cùng vai viết bằng hai biểu thức riêng là khuôn đã bị bắt
   chín lần trong repo này.
5. **Bề mặt nói đúng khi rỗng** — Dashboard nói «chưa kết nối repo nào» kèm lối đi tới Cấu hình, không
   bày một repo không tồn tại.

**KHÔNG làm trong change này:**
- **Không sửa việc trực chỉ quét repo ĐANG CHỌN** thay vì mọi repo đã khai. Đó là một luật khác («trực
  phủ tới đâu»), và trộn vào đây thì hỏng cái nào cũng không biết tại đâu. Ghi nợ có tên.
- Không đụng luồng thêm repo bốn bước, không đụng cổng merge, không đụng thư viện probe (change sau).

## Capabilities

### New Capabilities
- `repo-registry`: danh sách repo đã khai là nguồn sự thật DUY NHẤT cho câu hỏi «CheckMate được phép
  đụng repo nào», và mọi đường vào phải hỏi cùng một chỗ.

### Modified Capabilities
- `github-webhook`: gác «repo phải đã khai» nay là hàm dùng chung, không còn là biểu thức riêng của
  đường webhook — cùng một luật, một chỗ hiện thực.

## Luật chạm tới

- **Luật chạm tới:** `repo-registry › 3 requirement ADDED` · `github-webhook › Payload phải trỏ repo ĐÃ
  KHAI…` (MODIFIED — gác thành dùng chung) · **⛔C2** (rỗng ⇒ từ chối chấm, không đoán ra một repo) ·
  **⛔C5** (export mới khai `checkmate.yml`).

## Impact

- `apps/web/src/config.ts` — `dsRepoTuLuu`, `MAC_DINH`, kiểu `repo?`, `CauHinhCoRepo`, `coRepo`, `laRepoDaKhai`.
- `apps/web/src/github.ts` — 9 chữ ký đổi sang `CauHinhCoRepo`.
- `apps/web/src/server.ts` — 3 đường khởi lượt chấm + vòng trực đi qua gác; webhook dùng gác chung.
- `apps/web/src/ui.ts` — Dashboard trạng thái «chưa kết nối repo nào».
- `checkmate.yml` · `openspec/changes/named-debts` (nợ mới).
- **Không đụng**: sổ cái, cổng merge, đường verdict, thư viện probe, dữ liệu trên đĩa.
