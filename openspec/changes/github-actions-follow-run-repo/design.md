## Context

`config.repo` là **khung nhìn của repo đang chọn** — `repo-history` khai vậy. `RunMeta.repo` là repo của
lượt, gán **lúc chạy**, cũng do `repo-history` bắt buộc.

Đường **khởi** lượt chấm đã dùng đúng: webhook dựng `{ ...cfg, repo: repoCfg, repo_dang_chon: repoCfg.github }`
(`server.ts:889`). Ba đường **sau** khi lượt kết thúc thì không — chúng đọc lại `readConfig()` và dùng
`cfg.repo`.

Đo trên prod 07/09, ngay sau khi PO thêm repo thứ ba:

| | |
|---|---|
| lượt `PR #79` thuộc | `thangvv111/checkmate` (cột `repo` trong sổ) |
| `repo_dang_chon` | `thangvv111/admin-fe` |
| engine gọi | `/repos/thangvv111/admin-fe/issues/79/comments` ⇒ **404** |
| và | `/repos/thangvv111/admin-fe/statuses/<sha của checkmate>` ⇒ **422 «No commit found for SHA»** |

Token **không** phải nguyên nhân: ghi thật bằng chính token ấy cho comment **201**, status **201**, xoá
comment thử **204**.

## Goals / Non-Goals

**Goals**
- Mọi hành động GitHub thuộc một lượt theo repo **của lượt**.
- Một cửa duy nhất cưỡng chế (`configForRepo`), không để từng chỗ gọi tự nhớ.
- Thiếu repo ⇒ **không hành động**, nói ra lý do.
- Lưới quét source bắt được đường mới quên đi qua cửa ấy.

**Non-Goals**
- Không đụng đường **khởi** lượt chấm — nó vốn đã đúng.
- Không bỏ `cfg.repo`: nó vẫn là khung nhìn hợp lệ cho các màn hình và cho thao tác **không** thuộc lượt
  nào (thêm/gỡ repo, liệt kê pull request của repo đang xem).
- Không đổi luật nhị phân, không nới ⛔C1.

## Decisions

**D1 — Sửa ở CHỖ DỰNG cấu hình, không ở chỗ gọi.** Cách khác là truyền thêm tham số `repo` cho từng hàm
GitHub (`commentPr(cfg, repo, so, body)`). Loại: mười hàm × mỗi chỗ gọi là mười cơ hội quên, và kiểu không
bắt được cái quên nào. Dựng `CauHinhCoRepo` đúng ngay từ đầu thì mọi hàm phía sau **không cần biết** gì —
chúng vốn đã đọc `cfg.repo.github`.

**D2 — `configForRepo` trả `null`, không trả cấu hình rơi-về.** Trả về repo đang chọn khi không tìm thấy là
đúng cái bug này. `null` bắt chỗ gọi phải xử lý, và TypeScript cưỡng chế điều đó.
*Hậu quả hai lựa chọn không cân nhau:* không đăng verdict thì người ta vào màn chấm đọc; đăng nhầm repo thì
một đội nhận finding của cây mã nguồn khác, và ở cổng merge thì máy đưa code vào trunk không ai yêu cầu.

**D3 — Bốn đường, không phải một.** «Vá một đường không đóng cả lớp»: `rm.onXong` (trực) · `theoDoiHead` ·
cổng merge · cổng trả về dev. Cả bốn cùng hình dạng lỗi; lưới quét theo **mỏ neo từng đường** để đường thứ
năm thêm sau này cũng bị soi.

**D4 — Lưới quét source, không chỉ ca hàm thuần.** Ca cho `configForRepo` chứng minh hàm đúng; nó **không**
chứng minh bốn đường kia gọi nó. Lưới `scanSelectedRepoActions` lấy khối sau mỗi mỏ neo và đòi chỗ dựng cấu
hình phải đi qua `configForRepo`. Lưới còn ĐỎ khi **không tìm thấy mỏ neo** — nếu ai đổi tên đường thì lưới
kêu chứ không xanh oan.

## Architecture

```
apps/web/src/config.ts
  configForRepo(c, github) -> CauHinhCoRepo | null      <- CUA DUY NHAT
        |
apps/web/src/server.ts
  rm.onXong(meta)          cfg = configForRepo(cfg, meta.repo)        -> comment · status · closePr · returnToDev
  theoDoiHead(id, soPr)    cfg = configForRepo(cfg, rm.lay(id)?.meta.repo) -> getCurrentPr
  POST /runs/:id/merge     cfg = configForRepo(cfg, st?.meta.repo)    -> getCurrentPr · commentPr · mergePr
  POST /runs/:id/reject    cfg = configForRepo(cfg, st?.meta.repo)    -> closePr · returnToDev
        |
  null => DUNG, ghi log/tra 409. KHONG roi ve repo dang chon.
```

Không tầng nào khác đổi. `github.ts` giữ nguyên — nó vốn đọc `cfg.repo.github`, và nay `cfg` đã đúng.

## Data Model

N/A — không thêm/đổi dữ liệu trên đĩa. `RunMeta.repo` đã có sẵn (`repo-history` bắt buộc từ trước).

**Đời cũ:** lượt chấm ghi trước khi có trường `repo` sẽ ra `null` ⇒ **không hành động**, và đó là hành vi
đúng: không ai biết lượt ấy thuộc repo nào, nên đoán là sai.

## Bề mặt đã ĐẾM BẰNG MÁY (luật tầng 2)

```bash
grep -c "cfg.repo.github" apps/web/src/github.ts                    # 8 ham GitHub doc repo tu cfg — KHONG doi
grep -nE "^(app\.post\('/api/runs/:id/(merge|reject)'|function theoDoiHead|rm\.onXong)" apps/web/src/server.ts   # 4 duong hau-luot
grep -c "configForRepo(readConfig()" apps/web/src/server.ts         # 4 — dung bang so duong tren
grep -c "const cfg = readConfig();" apps/web/src/server.ts          # cac duong KHONG thuoc mot luot (them/go repo, man hinh)
```

⚠ Bề mặt **không** đếm được bằng grep: đường thứ năm ai đó thêm sau này. Lưới `scanSelectedRepoActions`
đóng phần đã biết; phần chưa biết phải do người đọc bắt — nên spec khai «một cửa duy nhất cưỡng chế» thành
requirement, để lần sau có chỗ mà chỉ vào.

## Risks / Trade-offs

- **Lượt đời cũ không có `repo` sẽ thôi được đăng verdict.** Đúng chủ đích (D2), nhưng nếu prod còn lượt
  như thế đang mở thì người vận hành thấy im lặng → log nêu rõ lý do, và cổng trả 409 có chữ.
- **Lưới bám mỏ neo chuỗi** (`rm.onXong = `, tên route). Đổi tên là lưới ĐỎ chứ không xanh oan — đã có ca
  cho vế «không tìm thấy mỏ neo».
- **`configForRepo` so tên không phân biệt hoa thường** (dùng `findRepo` sẵn có). GitHub coi `Owner/Repo`
  và `owner/repo` là một, nên đây là hành vi đúng; có ca khoá.

## Migration Plan

Không di trú. Đường lùi: `configForRepo` trả về cấu hình rơi-về repo đang chọn là quay lại hành vi cũ —
nhưng đó chính là bug, nên đường lùi thật là revert commit.

## Open Questions

- Không có câu hỏi chặn apply.
