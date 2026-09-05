## Why

CheckMate **chủ động chạy code của pull request đang được review**. Hôm nay nó chạy code ấy trong một
`git worktree` dưới **chính tài khoản dịch vụ**, không giới hạn gì. Đo trên prod, chạy đúng quyền mà code
PR có:

| thứ code PR với tới | kết quả đo |
|---|---|
| `.secrets.json` — token GitHub từng repo + bí mật webhook | **đọc được** (457 byte) |
| `config.json` | **đọc được** (911 byte) |
| `web-runs/checkmate.db` — sổ cái verdict | **đọc và GHI được** (3.7 MB) |
| `probes-lib/` — thư viện probe | **ghi được** |
| `~/.ssh/authorized_keys` | **đọc được** |
| mạng ra Internet | **ra được** (`api.github.com` → 200) |

`systemd` unit chạy `User=ubuntu`, **không một directive hardening nào**.

**Ba hệ quả, và cái nặng nhất không phải rò bí mật:**

1. **Đối tượng bị chấm sửa được công cụ chấm nó.** `probes-lib/` ghi được ⇒ một PR sửa được thư viện
   regression đang chấm chính nó, và thay đổi ấy **bền vững sang mọi lượt sau**.
2. **Sổ cái ghi được.** Trigger append-only chặn `UPDATE`/`DELETE` ở tầng SQL, nhưng trigger nằm TRONG
   chính file ấy — ghi đè cả file thì trigger đi theo. Bằng chứng mà đối tượng bị chấm sửa được thì không
   còn là bằng chứng (⛔C1 · ⛔C2 ở mức nền).
3. **Allowlist môi trường tạo cảm giác an toàn sai.** Nó chặn *truyền* bí mật vào tiến trình test; code
   chỉ cần `readFileSync` là đi vòng qua.

Hai repo đã khai đều **private**, nên tập tấn công hôm nay là cộng tác viên — nhưng đó là **tình cờ, không
phải thiết kế**: một repo public, hoặc một repo khách hàng, là thực thi mã tuỳ ý cho người lạ mà không cần
đổi dòng code nào.

## What Changes

- **Mỗi lượt chạy probe diễn ra trong một container dùng-một-lần**, huỷ sau khi xong.
- **Podman rootless, KHÔNG Docker.** Docker daemon chạy root và nhóm `docker` ≈ root trên host — chọn nó
  là thêm một đường leo quyền vào đúng cái máy đang được gia cố. Máy đã có sẵn `unprivileged_userns_clone=1`
  và dải `subuid` cho `ubuntu`, tức nền cho rootless đã đủ.
- **Tiến trình trong container chạy user không đặc quyền**, có user-namespace.
- **Không bind-mount nào có quyền ghi ra ngoài thư mục lượt chạy.** `node_modules` của clone bind
  **read-only**; `probes-lib/`, sổ cái, kho khoá **không có mặt** trong cây nhìn thấy được.
- **Mạng tắt mặc định** (`--network=none`).
- **Trần tài nguyên**: bộ nhớ · CPU · số tiến trình. Namespace không tự giới hạn gì, và một lượt chấm hỏng
  không được kéo theo sản phẩm khác trên cùng máy.
- **Ảnh khai trong `checkmate.yml`** của repo đích, cạnh `runner.test_cmd`. Đọc từ **đĩa clone (nhánh
  gốc)**, không từ nhánh PR — cùng luật đã áp cho `test_cmd` và `sources.specs`. Không khai thì dùng ảnh
  mặc định **ghim tag cụ thể**.
- **⛔ Fail-closed và NÓI RA:** nền không cô lập được (máy dev Windows, hoặc thiếu runtime) thì lượt chấm
  vẫn chạy nhưng **verdict khai rõ mức cô lập**. Một verdict từ nền không cô lập không cùng giá trị với
  verdict từ nền có, và người đọc phải thấy điều đó trong dữ liệu chứ không phải suy từ lời văn.
- **KHÔNG** trong change này: tách CheckMate sang máy riêng (nợ có tên, kèm điều kiện kích hoạt) · đổi
  cách phân loại probe · đổi cổng merge.

## Capabilities

### New Capabilities

- `sandbox-isolation`: code của artifact đang được chấm chạy trong môi trường **cô lập dùng-một-lần**;
  mức cô lập đạt được phải **khai ra** chứ không giả định.

### Modified Capabilities

- `target-contract`: `checkmate.yml` nhận thêm khai báo **ảnh chạy** trong khối `runner`, và giá trị ấy
  đọc từ đĩa clone chứ không từ nhánh PR.
- `verdict-contract`: verdict khai **mức cô lập** của lượt chạy.
- `man-run`: bảng số liệu bày mức cô lập ấy.

## Luật chạm tới

- **Luật chạm tới:** `sandbox-isolation › requirement ADDED` · `target-contract › checkmate.yml là tuỳ
  chọn…` (MODIFIED — thêm `runner.image`) · `verdict-contract › Verdict nhị phân, ghim commit, kèm thống
  kê probe đầy đủ` (MODIFIED) · `man-run › Verdict phải khai cả phần yếu của chính lượt chấm` (MODIFIED).
- **⛔C2** — trục chính: không cô lập được thì **nói ra**, không im lặng chạy như đủ điều kiện.
- **⛔C3** — kho khoá phải nằm NGOÀI cây nhìn thấy được của tiến trình test; đây là chỗ hôm nay thủng.
- **⛔C4** — tên ảnh và `test_cmd` là dữ liệu do repo đích khai; đọc từ nhánh gốc, không từ nhánh PR.
- **⛔C6** — sửa tay `checkmate.yml` vẫn phải có hiệu lực ở lượt đọc kế tiếp; không thêm cache ảnh nào che
  đường ấy.

## Impact

- `packages/harness/src/sandbox.ts` — dựng và huỷ môi trường chạy; đường không-cô-lập-được.
- `packages/harness/src/runner.ts` — `runner.image` trong `RunnerCfg`.
- `packages/harness/src/skill-code.ts` — mức cô lập vào `probe_stats`.
- `packages/shared/src/types.ts` — trường mức cô lập trên verdict.
- `apps/web/src/ui.ts` — bảng số liệu bày mức cô lập.
- **Máy chủ**: cài podman, tạo ảnh mặc định. Task đầu của change, kèm đo trước/sau (dung lượng, RAM một
  lượt, thời gian dựng so với hôm nay).
