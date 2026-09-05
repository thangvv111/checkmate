## Context

`dsRepoTuLuu` (`apps/web/src/config.ts:160`) thay danh sách repo rỗng bằng một repo hard-code. Từ chỗ ấy
trở đi, cả hệ thống — 47 chỗ đọc `cfg.repo` — tin rằng có một repo.

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -rno "\b\(cfg\|c\|v\|conf\)\.repo\b" apps/web/src/*.ts packages/harness/src/*.ts | wc -l  # 47
#   server.ts 26 · github.ts 13 · config.ts 1 · (con lai rai rac)
grep -c "cfg\.repo\." apps/web/src/github.ts                       # 12 ham can MOT repo cu the
grep -c "chamPr(" apps/web/src/server.ts                           # 3  duong khoi luot cham
grep -c "cfg.repos.map((r) => r.github)" apps/web/src/server.ts    # 1  gac repo-da-khai (CHI webhook)
grep -n "repos: \[REPO_DEMO\]" apps/web/src/config.ts              # 127
```

**Một gác, ba đường vào.** Ba đường khởi lượt chấm; đúng một đường có gác.

## Goals / Non-Goals

**Goals**
- Danh sách rỗng đọc ra rỗng; bỏ repo mặc định hard-code.
- Ràng buộc «phải có repo» do `tsc` cưỡng chế, không do trí nhớ.
- Một hàm gác repo-đã-khai dùng chung cho webhook và trực.
- Bề mặt đọc nói thẳng khi chưa có repo.

**Non-Goals**
- Không sửa việc trực chỉ quét repo ĐANG CHỌN thay vì mọi repo đã khai (nợ riêng — xem D4).
- Không đụng luồng thêm repo bốn bước, cổng merge, thư viện probe.

## Decisions

### D1 — Phân biệt «không khai» với «khai là rỗng»

```ts
// truoc
return luu.repos?.length ? luu.repos : [{ ...MAC_DINH.repos[0], ...(luu.repo ?? {}) }];

// sau
if (Array.isArray(luu.repos)) return usableRepos(luu.repos);  // co truong -> ton trong, ke ca rong
return usableRepos(luu.repo ? [luu.repo] : []);               // doi cu mot repo don le -> nang
```

Chỗ tinh: `luu.repos?.length` gộp **`undefined`** với **`[]`** làm một. Hai ca ấy nói hai điều khác hẳn —
cái đầu là «cấu hình đời cũ chưa biết tới trường này», cái sau là «người vận hành đã xoá hết repo». Bản cũ
trả lời cả hai bằng cùng một repo mặc định.

`MAC_DINH.repos` thành `[]`. Một bản vừa cài không có repo nào, và nói thẳng.

**`usableRepos` — thêm khi apply, do ca T7.2 bắt được.** Ca «đầu vào khuyết mọi tầng» cho thấy
`repos: [null]` trong `config.json` sửa tay làm `readConfig` **ném**. Ném ở đây thì mọi màn chết, kể cả màn
Cấu hình — đúng lối thoát duy nhất để sửa lại dòng vừa gõ sai, và `config.json` chính là đường cứu hộ sửa
tay của ⛔C6. Nên mục sai hình dạng bị **bỏ và nói ra** (`console.error`), cùng khuôn với `locKhoaBiet`: bỏ
trong im lặng thì người vừa gõ không biết dòng của mình không có tác dụng.

### D2 — Kiểu nói thật, và TRÌNH BIÊN DỊCH nhớ hộ

`CheckmateConfig.repo` thành `repo?: RepoConfig`. Nhưng để nguyên thế thì 47 chỗ phải tự nhớ kiểm — đúng
khuôn mà `man-run` đã cấm: *«cái gì phải nhớ thì sẽ có ngày quên, và ngày đó không có lỗi nào nổ ra»*.

Nên thêm:

```ts
export type CauHinhCoRepo = CheckmateConfig & { repo: RepoConfig };
export function coRepo(c: CheckmateConfig): c is CauHinhCoRepo { return !!c.repo && !!c.repos.length; }
```

Hai vế chứ không một: `repo` là **khung nhìn** dựng từ `repos`, nên một cấu hình có `repo` mà danh sách
rỗng là cấu hình đã tự mâu thuẫn — chấp nhận nó ở đây là để lọt đúng thứ change này đang đóng.

9 hàm ở `github.ts` đổi chữ ký `CheckmateConfig` → `CauHinhCoRepo` (12 là số DÒNG đọc `cfg.repo.`, không phải số chữ ký — đếm lại lúc apply). Gọi mà chưa qua `coRepo` là **lỗi
biên dịch**, không phải một ca test ai đó phải nhớ viết.

Cân nhắc thêm một cờ `daKhaiRepo: boolean` và tự kiểm ở từng chỗ: **bác**. Đó chính là «điều kiện phải nhớ
truyền qua nhiều lớp» — và 47 chỗ là 47 cơ hội quên.

Cân nhắc để `repo` non-optional rồi ném khi rỗng: **bác**. Ném biến một trạng thái BÌNH THƯỜNG (chưa thêm
repo) thành lỗi, và trang cấu hình — nơi người ta vào để thêm repo — sẽ chết trước khi mở được.

### D3 — Một gác, ba đường vào

```ts
export function timRepoDaKhai(daKhai: readonly string[], github: unknown): string | undefined;
export function laRepoDaKhai(repos: readonly RepoConfig[], github: unknown): boolean;
```

- **webhook**: `decideWebhookAction` nhận danh sách đã khai (đã đúng) → nay đối chiếu bằng hàm này.
- **trực**: trước khi quét, hỏi danh sách đã khai; rỗng thì không quét.
- **bấm tay**: đường khởi lượt chấm đi qua `coRepo` (D2) — rỗng thì từ chối kèm lý do đọc được.

Ba đường, một hàm. Ca T khoá rằng ba đường cho **cùng một câu trả lời** trên cùng đầu vào — không có ca ấy
thì «dùng chung» là một lời hứa, không phải một tính chất.

Hai hàm chứ không một, vì webhook cần thêm một thứ mà hai đường kia không cần: `timRepoDaKhai` trả về
**chính tả ĐÃ KHAI**, còn `laRepoDaKhai` chỉ trả có/không. Tên repo trong payload là dữ liệu ngoài (⛔C4) —
nó được quyền hỏi, nhưng không được quyền quyết định hệ thống tự xưng bằng chính tả nào.

### D4 — Trực chỉ quét repo ĐANG CHỌN: ghi nợ, không sửa ở đây

`listPrs(cfg)` đọc `cfg.repo` — tức trực chỉ quét **một** repo, dù đã khai nhiều. Đó là một luật khác
(«trực phủ tới đâu»), có thể là cố ý, và nó không phải nguyên nhân của lỗi đang sửa.

Trộn vào đây thì diff phình và hỏng cái nào cũng không biết tại đâu — đúng lý do mà change
`dong-bo-giao-dien-ccs` từng viện để hoãn việc đổi tên biến. Ghi nợ có tên.

### D5 — Bề mặt rỗng nói CÁCH SỬA, không chỉ nói trống

Capability `giao-dien-ccs` đã có luật «trạng thái rỗng và trạng thái lỗi phải nói được cách sửa». Màn chính
khi chưa có repo là một trạng thái rỗng **bình thường** (vừa cài xong), không phải hỏng — nên nó nói
«chưa kết nối repo nào» kèm lối đi tới Cấu hình, không dùng màu FAIL.

## Architecture

Chỉ `apps/web/src`: `config.ts` (hàm thuần + kiểu) · `github.ts` (chữ ký) · `server.ts` (ba đường vào +
vòng trực) · `ui.ts` (trạng thái rỗng). Không chạm `packages/`.

## Data Model

**Không đổi hình dạng dữ liệu trên đĩa.** `config.json` đã cho phép `repos: []` — change này chỉ thôi
diễn giải nó thành một repo. Không di trú, không cột mới.

Đường lùi: revert; cấu hình đang có `repos: []` sẽ lại được đọc thành repo mặc định như trước.

## Risks / Trade-offs

**[Bản cài đời cũ chỉ có `repo` đơn lẻ bị đọc thành rỗng]** → D1 giữ nguyên đường nâng R4.3, và có ca khoá
riêng. Đây là rủi ro nặng nhất của change: đọc nhầm thành rỗng nghĩa là người dùng cũ mất repo trên giao
diện.

**[9 chữ ký đổi → nhiều chỗ phải sửa]** → Đó là mục đích: mỗi chỗ `tsc` bắt là một chỗ trước đây dùng
repo mà không ai kiểm. Số chỗ phải sửa chính là **số đo** của lỗ hổng.

**[Chưa có repo thì UI trông trống trải]** → D5: nói thẳng và chỉ đường, không để trống.

## Migration Plan

Không có bước di trú. `config.json` không bị ghi lại lúc khởi động.

## Open Questions

Không còn. Ranh giới với «trực quét repo nào» chốt ở D4 và thành nợ có tên.
