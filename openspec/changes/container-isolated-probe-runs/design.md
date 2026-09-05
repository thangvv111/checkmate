## Context

`Sandbox` = `git worktree add --detach` + `spawnSync(..., { shell: true })` dưới chính tài khoản dịch vụ.
Đo trên prod, chạy đúng quyền mà code PR có: kho khoá **đọc được**, sổ cái verdict **đọc và ghi được**,
thư viện probe **ghi được**, `authorized_keys` **đọc được**, Internet **ra được**.

### Tầng 2 — ĐO NỀN BẰNG MÁY (chạy trước khi chọn phương án)

```
Ubuntu 22.04.5 · kernel 6.8.0-1061-aws
docker · podman · nerdctl · bwrap    KHONG CO
systemd-run · unshare · setpriv      co san
unprivileged_userns_clone            1
/etc/subuid                          ubuntu:100000:65536
RAM 1910MB (con 1090MB) · 2 nhan · dia con 49G
```

Hai dòng giữa là thứ quyết định lựa chọn: **nền cho rootless đã đủ, chưa cần dựng gì thêm ngoài gói.**

## Goals / Non-Goals

**Goals**
- Code artifact chạy trong môi trường cô lập dùng-một-lần.
- Kho khoá · sổ cái · thư viện probe **không có mặt** trong cây nhìn thấy được.
- Mạng tắt, trần tài nguyên có.
- Mức cô lập **thực tế** khai ra trên verdict.

**Non-Goals**
- Không tách CheckMate sang máy riêng (nợ có tên, kèm điều kiện kích hoạt).
- Không đổi phân loại probe, không đổi cổng merge.
- Không cô lập tiến trình **web** — chỉ tiến trình chạy test.

## Decisions

### D1 — Podman rootless, KHÔNG Docker

| | Docker | Podman rootless |
|---|---|---|
| daemon | có, chạy **root** | không |
| nhóm hệ điều hành điều khiển được | `docker` ≈ **root trên host** | không |
| user namespace | tuỳ cấu hình | mặc định, dùng `subuid` |
| nền trên máy này | phải cài daemon | `userns=1` + `subuid` **đã có** |

Chọn Docker là **thêm một đường leo quyền vào đúng cái máy đang được gia cố** — trả bằng chính thứ mình
vừa mua. Đây là quyết định kỹ thuật bắt buộc, không phải sở thích, nên nó nằm trong luật
(`sandbox-isolation`: runtime MUST NOT đòi daemon chạy quyền quản trị) chứ không chỉ trong tài liệu này.

### D2 — Không bind ghi ra ngoài, và đó mới là chỗ container có tác dụng

Container KHÔNG tự chặn gì nếu vẫn bind-mount tài sản với quyền ghi. Hai thứ nặng nhất — thư viện probe và
sổ cái — chỉ được bảo vệ bởi **việc chúng không có mặt trong cây**, không phải bởi cái container.

```
/work            rw   thư mục lượt chạy (probe + mã nguồn artifact)
/work/node_modules  ro   phụ thuộc dựng sẵn từ clone
(không có gì khác)
```

`probes-lib/`, `web-runs/`, `.secrets.json`, `config.json`, bản clone: **không mount**.

### D3 — Phụ thuộc: bind read-only, KHÔNG cài trong container

Mạng tắt nên `npm ci` không chạy được — và đó là điều **may**: `package.json` của PR mang script cài đặt,
chạy nó là mở lại đúng cửa vừa đóng. Nên phụ thuộc vào bằng bind **chỉ đọc**, lấy từ trạng thái **nhánh
gốc** của clone.

**Hệ quả nhìn thấy được:** PR thêm dependency mới ⇒ probe không nạp được. Đó là một kết cục **có tên**, đi
đường lỗi-nạp đã có (`probe-quarantine`), không phải một lỗi bí ẩn. Vì nó là hành vi mới của sản phẩm nên
nó nằm trong spec, không phải một chi tiết hiện thực.

### D4 — Nguồn mã: `git archive`, không `git worktree`

`git worktree add` để lại `.git` trong thư mục chạy, trỏ ngược vào `<clone>/.git/worktrees/…` — tức một
đường ghi vào git dir của clone (hook chạy ở lượt sau). Thay bằng `git archive <sha> | tar -x` vào một
thư mục sạch: không `.git`, không đường về.

Mất gì: probe không chạy được lệnh `git` trong sandbox. Chưa probe nào cần, và nếu cần thì đó là một
quyết định phải xin riêng.

### D5 — Mức cô lập là DỮ LIỆU ĐO ĐƯỢC, không phải cấu hình

```ts
type IsolationLevel = 'container' | 'none';
interface IsolationInfo { muc: IsolationLevel; runtime?: string; ly_do_khong?: string; }
```

Giá trị ghi vào verdict là thứ **thực sự đã dùng**. Cấu hình bật mà runtime lỗi lúc dựng ⇒ khai `none`
kèm lý do. «Đã cấu hình để cô lập» và «đã cô lập» là hai câu khác nhau.

Cân nhắc: nền không cô lập được thì **từ chối chạy**? **Bác** — máy dev là Windows, và từ chối ở đó nghĩa
là không ai phát triển được sản phẩm này nữa. Fail-closed ở đây đúng nghĩa là **không giấu**, không phải
**không chạy**: một verdict khai rõ «chạy KHÔNG cô lập» vẫn dùng được, miễn người đọc thấy điều đó.

### D6 — Ảnh mặc định ghim phiên bản

Thẻ trôi (`node:latest`) làm hai lượt chấm cùng commit cho hai môi trường khác nhau — tức phá tính tái lập
mà cả sản phẩm này đứng trên. Ghim cụ thể, đổi ảnh là một change.

## Architecture

- `packages/harness/src/sandbox.ts` — dựng/huỷ môi trường; dò runtime; đường không-cô-lập-được.
- `packages/harness/src/runner.ts` — `image` trong `RunnerCfg`.
- `packages/harness/src/skill-code.ts` — mức cô lập vào `probe_stats`.
- `packages/shared/src/types.ts` — `probe_stats.cach_ly_moi_truong`.
- `apps/web/src/ui.ts` — một hàng trong bảng số liệu.

## Data Model

Verdict thêm **một trường tuỳ chọn**. Bản ghi cũ vắng trường ⇒ bề mặt đọc khai **không đo được**, KHÔNG
suy thành «không cô lập» (bản ghi cũ có thể đã chạy ở bất kỳ đâu — ta không biết, và không biết là một
trạng thái riêng).

Không di trú, không đổi hình dạng dữ liệu trên đĩa.

## Risks / Trade-offs

**[Thời gian mỗi lượt tăng]** → đo trước/sau, ghi số vào tài liệu. Nếu dựng container đắt hơn dự tính thì
đó là dữ liệu để bàn lại, không phải lý do bỏ cô lập.

**[Cài podman lên máy đang chạy sản phẩm khác]** → PO đã cân nhắc và chốt: TingPos trên prod gần như đứng
yên. Task đầu của change là đo trước/sau (dung lượng, RAM một lượt, thời gian dựng); số xấu bất ngờ thì
dừng lại bàn.

**[Repo đích cần bộ công cụ lạ]** → `runner.image` để repo tự khai. Repo không khai và ảnh mặc định không
đủ ⇒ probe không nạp được, và đó là kết cục **có tên** chứ không im lặng.

**[Máy dev Windows không cô lập được]** → D5. Rủi ro thật không phải «dev không an toàn» mà là **quen mắt**:
chạy lâu ngày ở mức `none` rồi thôi để ý. Nên nó phải hiện trên verdict, cạnh các số nói về chỗ yếu.

## Migration Plan

Không có bước di trú dữ liệu. Thứ tự triển khai: cài podman + ảnh mặc định trên prod → bật cô lập → đo →
deploy code.

Đường lùi: cấu hình tắt cô lập, verdict khai `none` — sản phẩm chạy như hôm nay, và **nói ra** rằng nó
đang chạy như hôm nay.

## Open Questions

Không còn. Ranh giới với việc tách máy riêng chốt ở Non-Goals kèm điều kiện kích hoạt trong nợ có tên.
