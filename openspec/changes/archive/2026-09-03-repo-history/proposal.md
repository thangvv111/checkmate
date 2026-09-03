# Proposal — repo-history

## Why

Backfill capability thứ bảy, và là **nhóm lớn nhất còn lại**: 30 điều về nhiều repo và lịch sử chấm theo repo.

Đo trên `main` 03/09 (`23cbc6b`) bằng cách **đọc** — không đếm mã trích, vì phép đo ấy đã được chứng minh là
sai ở `model-reply-parsing`:

```
30 dieu R4
  DA co ca khoa   17   token-repo (24 ca) · web-loc (16) · nhan-probe-log (16) · boc-model
  CHUA co ca      13
```

Ba chỗ đáng nói trong 13 điều chưa khoá:

**R4.17 thi hành đủ hai vế và không ai giữ.** Route `/tin-cay` lọc sổ cái theo repo **trước khi** gọi
`computeProfile`, và khi không lọc thì trang nói thẳng «Đang gộp mọi repo — lọc lại nếu muốn xem riêng một
repo». Vế thứ hai là loại dễ biến mất trong một lần dọn giao diện mà không ai nhận ra — track record của
một người ở repo này không nói thay cho repo khác, và một trang gộp mà không nói là trang nói dối bằng cách
im lặng.

**Bốn luật nằm trong một biểu thức.** `config.ts` dòng 120/135/139 giữ cả `R4.1` (`repos[]` là nguồn sự
thật), `R4.2` (`repo` chỉ là view), `R4.3` (đời cũ nâng thành danh sách một phần tử), `R4.4`
(`repo_dang_chon` trỏ sai thì rơi về phần tử đầu). Tách ra thì mỗi luật là một ca.

**`R4.26` không viết lại.** «Không route nào được trả token về» đã được `response-secret-guard` cưỡng chế
lúc chạy; ở đây chỉ mang con trỏ (PO chốt phương án (a) ngày 03/09).

## What Changes

- **Capability `repo-history`** — 6 requirement viết từ code và test đang chạy.
- **Tách hàm thuần cho hình dạng cấu hình** (`R4.1`/`R4.2`/`R4.3`/`R4.4`): quyết định «danh sách nào,
  repo nào đang chọn» rời khỏi đường đọc file, để mỗi luật là một ca.
- **Ca cho `R4.17` cả hai vế**: lọc trước khi tính, **và** nói ra khi đang gộp.
- **Ca cho các điều còn lại chưa khoá**: vòng đời repo (`R4.7` · `R4.22` · `R4.25`), lịch sử (`R4.8` ·
  `R4.16`).
- **`R4.26` mang con trỏ** sang `response-secret-guard`, không viết lại cơ chế.
- KHÔNG đổi hành vi. Backfill.

## Luật chạm tới

- ⛔C3 (bí mật không rò — `R4.19` token không nằm trong `config.json`, `R4.26` con trỏ, `R4.29` gột token
  khỏi mọi văn bản lỗi đi ra ngoài)
- ⛔C5 (export mới → bảng module `checkmate.yml`)
- `response-secret-guard` (nhận `R4.26` bằng con trỏ, không sửa nội dung)
- Capability MỚI `repo-history` (ADDED 6 requirement)
- Hàng bảng tra: 30 điều `pending` → `housed`

## Impact

- MỚI: lưới cho hình dạng cấu hình, thang tin cậy, vòng đời repo
- Chạm: `apps/web/src/config.ts` (tách hàm thuần, không đổi hành vi)
- `checkmate.yml` bảng module (⛔C5) · `docs/r-rules-map.md` (30 hàng)
- KHÔNG đụng `secret-vault.ts`, `github.ts`, `trust.ts` — đã thuần hoặc đã khoá

## Đo sẽ làm sau archive

Thư viện probe tự chấm hôm nay neo **12/15**, còn trôi `R4.18` · `R4.27` · `R9.6`. Hai mã đầu thuộc nhóm
này và **đã có ca** trong `token-repo.test.ts`, nên archive xong neo phải lên **14/15** — chỉ còn `R9.6`,
thuộc `data-layer`.
