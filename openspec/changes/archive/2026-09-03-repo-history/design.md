# Design — repo-history

## Context

Đo trên `main` 03/09 (`23cbc6b`), bằng cách **đọc** chứ không đếm mã trích — phép đo đếm mã đã được chứng
minh sai ở `model-reply-parsing` (đo 93% chưa khoá, thực tế 21%):

```
30 dieu R4
  DA co ca   17   token-repo (24 ca) · web-loc (16) · nhan-probe-log (16) · boc-model
  CHUA co ca 13   R4 R4.1 R4.2 R4.4 R4.7 R4.8 R4.16 R4.17 R4.22 R4.25 R4.26 (+2)

Cho thi hanh cua nhung dieu chua khoa
  config.ts:120  repos?.length ? repos : [nang tu repo doi cu]      R4.1 R4.3
  config.ts:135  repo_dang_chon hop le ? no : repos[0].github       R4.4
  config.ts:139  repo = repos.find(...) ?? repos[0]                 R4.2
  server.ts:372  loc so cai theo repo TRUOC khi computeProfile      R4.17 ve 1
  ui-trust.ts:37 «Dang gop moi repo — loc lai neu muon xem rieng»   R4.17 ve 2
  server.ts:527  bon buoc them repo                                 R4.22
  server.ts:677  repo thieu chia -> chan NGAY                       R4.25
```

## Goals / Non-Goals

**Goals**
- 30 điều R4 có nhà.
- Bốn luật đang nằm chung một biểu thức (`R4.1`/`R4.2`/`R4.3`/`R4.4`) tách ra thành hàm thuần, mỗi luật một ca.
- `R4.17` khoá **cả hai vế** — lọc trước khi tính, và nói ra khi gộp.

**Non-Goals**
- KHÔNG đổi hành vi. Backfill.
- KHÔNG viết lại `R4.26` — con trỏ sang `response-secret-guard` (D2).
- KHÔNG đụng `secret-vault.ts`, `github.ts`, `trust.ts` — đã thuần hoặc đã khoá.

## Decisions

### D1 — Tách hàm thuần cho hình dạng cấu hình

Bốn luật (`R4.1` nguồn sự thật · `R4.2` view · `R4.3` nâng đời cũ · `R4.4` rơi về phần tử đầu) nằm trong ba
dòng của đường đọc cấu hình. Muốn khoá từng luật thì phải gọi được phần **quyết định** mà không đọc file.

Tách theo khuôn đã dùng bốn lần: hàm thuần nhận cấu hình thô, trả `{ repos, repo_dang_chon, repo }`. Đường
đọc file gọi nó. Không đổi một chữ nào trong logic.

### D2 — `R4.26` mang con trỏ, không viết lại

`response-secret-guard` đã cưỡng chế «không route nào trả bí mật ra» **lúc chạy**, phủ cả JSON, HTML và
luồng sự kiện. Viết lại thành requirement riêng ở đây tạo hai chỗ nói cùng một điều, và hai chỗ sẽ lệch —
đúng lý do `R1.16` được chuyển nhà ở `probe-classification` và `R11.15`/`R11.16` ở `identity-session`.

Bảng tra: `R4.26` → `housed` trỏ `response-secret-guard`, không trỏ capability này.

### D3 — `R4.17` phải khoá vế «nói ra», không chỉ vế «lọc»

Vế lọc dễ khoá và dễ nhớ: `computeProfile` nhận sổ cái đã lọc. Vế thứ hai — trang nói «Đang gộp mọi repo» —
chỉ là một câu trên màn hình, **không có gì gãy khi nó biến mất**. Một lần dọn giao diện là đủ để mất nó, và
sau đó trang gộp mọi repo mà không ai biết.

Nên hai ca riêng, và mutation phải giết được ca thứ hai độc lập với ca thứ nhất — cùng khuôn D1 của
`error-message-egress-gate`, nơi ca «có thông điệp lỗi» vẫn xanh sau khi bỏ rào.

### D4 — Ca cho vòng đời repo dựng bằng hàm thuần chỗ nào có, bằng đọc source chỗ nào không

`R4.7` (gỡ repo giữ clone và lịch sử) và `R4.22` (bốn bước) thi hành trong route Express. Tách cả hai ra
hàm thuần là refactor lớn và không cần cho backfill.

Chọn: `R4.7` khoá bằng ca gọi thẳng hàm xoá token (`deleteRepoToken`) và khẳng định clone/lịch sử không bị
đụng — đó là phần có thật và kiểm được. `R4.22`/`R4.25` khoá bằng ca đọc source ở mức «bốn bước có mặt, và
bước chặn khi thiếu chìa đứng TRƯỚC khi khởi chạy».

**Cái mất, nói thẳng:** ca đọc source chứng minh *thứ tự trong code*, không chứng minh *hành vi khi chạy*.
Yếu hơn ca gọi hàm, nhưng vẫn bắt được đường hỏng hay gặp nhất — ai đó dời phép chặn xuống sau khi khởi chạy.

### D5 — Dự đoán TRƯỚC khi đo

Thư viện probe tự chấm hôm nay neo **12/15**, còn trôi `R4.18` · `R4.27` · `R9.6`. Hai mã đầu thuộc nhóm này
và **đã có ca** trong `token-repo.test.ts`, nên archive xong **dự đoán neo lên 14/15** — chỉ còn `R9.6`
thuộc `data-layer`.

### D6 — Ca cho `R4.17` vế lọc phải kiểm CHỖ GỌI, không chỉ kiểm hàm (phát hiện lúc apply)

Ca đầu tiên em viết cho vế lọc tự lọc sổ cái trong test rồi gọi `computeProfile` — nó khoá rằng hàm tôn
trọng dữ liệu vào, **không** khoá rằng route lọc trước khi gọi. Ai bỏ `.filter()` ở route thì ca vẫn xanh,
mà luật `R4.17` nói «lọc TRƯỚC KHI tính» — tức nó là luật về **chỗ gọi**, không phải về hàm.

Thêm ca 1b đọc source route và khẳng định phép lọc đứng trước `computeProfile`. Mutation M3 (bỏ lọc ở
route) giết đúng ca ấy và **chỉ** ca ấy — nếu không có 1b thì đột biến đó không ai bắt.

Cùng họ với bài học `error-message-egress-gate` D1 và `response-secret-guard` T7.1: một ca dựng đúng hình
dạng mình nghĩ ra vẫn có thể xanh trên một hệ thống đã hỏng ở chỗ khác.

## Architecture

- `apps/web/src/config.ts`: tách hàm thuần cho hình dạng cấu hình (D1). Không đổi hành vi.
- Lưới mới: hình dạng cấu hình · thang tin cậy hai vế · vòng đời repo.
- `checkmate.yml` bảng module (⛔C5) · tên tiếng Anh (lưới `identifier-language`).

## Data Model

N/A — không đổi schema. Hàm tách ra trả đúng hình dạng cấu hình hiện có.

## Risks / Trade-offs

- [Tách hàm ở `config.ts` chạm đường đọc cấu hình của cả sản phẩm] → `tsc` bắt chỗ gọi; `npm test` là lưới
  thứ hai; và task đòi `git diff` phần logic chỉ là dời chỗ, không đổi chữ.
- [Ca đọc source cho `R4.22`/`R4.25` yếu hơn ca gọi hàm] → D4 khai thẳng cái mất.
- [30 điều là nhiều] → phần lớn đã có ca; change này thêm ca cho 13 và khai cả 30.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
