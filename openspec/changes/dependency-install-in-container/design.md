## Bối cảnh

Nhịp một làm CheckMate nói đúng bệnh. Nhịp hai làm nó **tự chữa được** — nhưng chỉ ở đúng một bệnh, và
bằng đường hẹp nhất tìm được.

Đây là change mở **bề mặt nặng nhất** sản phẩm từng mở: một container **có mạng**, chạy trên máy chủ của
bên chấm, để lấy về mã do repo bị chấm chỉ định. Mọi quyết định dưới đây là quyết định thu hẹp bề mặt ấy.

## Đo trước khi thiết kế — tất cả trên prod 07/09

Repo đích thật: `thangvv111/admin-fe`.

| đo | lệnh | kết quả |
|---|---|---|
| runtime repo đòi | `package.json` → `engines.node` | `^24` |
| runtime repo đòi (nguồn thứ hai) | `.nvmrc` | `24` — **chính xác hơn**, không phải dải |
| vì sao `npm ci` HỎNG trên máy chủ | `.npmrc` | `engine-strict=true` |
| số gói khai | `package.json` | 22 trực tiếp → **246** cả cây |
| gói có script cài | `package-lock.json` → `hasInstallScript` | **1** (`fsevents`, chỉ macOS) |
| script của chính repo | `package.json` → `scripts` | không có `postinstall`/`prepare` |
| ảnh Node 24 | `podman pull node:24-bookworm-slim` | `sha256:ba849c60…` · **v24.20.0** · npm 11.19.0 · 235 MB |
| ảnh Node 22 đang dùng | `podman images` | `sha256:2fa754a9…` = `node:22.17-bookworm-slim` · 230 MB |
| **cài thật** | (nguyên mẫu dưới) | **246 gói · 9 giây · 220 MB · 174 mục cấp một** |

### Bề mặt đã ĐẾM BẰNG MÁY

```bash
grep -rn "DEFAULT_IMAGE\|safeImageName" packages/harness/src/*.ts apps/web/src/*.ts | wc -l   # 6
grep -c "'-v'" packages/harness/src/sandbox.ts                                                # 2  <- mount
grep -rn "'podman'" packages/harness/src/*.ts | wc -l                                         # 5
```

Sáu chỗ chạm việc chọn ảnh, **hai** mount, **năm** chỗ gọi runtime container. Bản đồ ảnh phải phủ cả sáu
chỗ chọn ảnh — vá một chỗ là dựng lại cửa song sinh.

## Nguyên mẫu ĐÃ CHẠY THẬT — và cái đã hỏng trước nó

### Đường hiển nhiên, và vì sao nó sai

```bash
podman run --rm ... -v "$CLONE:/work:Z,U" -w /work "$IMG" npm ci
# Error: failed to chown recursively host path:
#   lchown .../.git/logs/refs/remotes/origin/accessibility-floor: operation not permitted
```

Cờ `U` chown **đệ quy toàn bộ cây được mount**. Nó chạm `.git`, hỏng giữa chừng, và để lại **78 mục của
bản clone thuộc subuid `100999`** — tài khoản dịch vụ không đọc được. Bản clone hỏng theo kiểu chỉ lộ ở
lượt chấm sau.

Khôi phục: `podman unshare chown -R 0:0` (đưa về tài khoản chủ, 78 → 37) rồi `sudo chown -R ubuntu:ubuntu`
(37 mục còn lại thuộc `root`, do một lệnh `sudo git fetch` trước đó). Kết thúc: **0 mục lệch**, `git fsck`
sạch, cả hai nhánh đúng sha. Bản clone `checkmate` không bị chạm.

Bỏ `U` và dùng `--userns=keep-id` là hướng khác — nhưng nó đặt uid trong container thành **chính tài khoản
dịch vụ**, tức thoát container là thoát ra thành tài khoản ấy. Ở container **có mạng** thì đó là hướng sai.

### Đường đã chọn — chạy được, đo được

```bash
W=$(mktemp -d)                                    # thu muc TAM, rong
cp -p $CLONE/{package.json,package-lock.json,.npmrc,.nvmrc} $W/     # danh sach DONG
podman run --rm --memory=2g --cpus=2 --pids-limit=512 \
  --user 1000:1000 --security-opt no-new-privileges --tmpfs /tmp \
  -e npm_config_cache=/tmp/npm \                  # cache trong tmpfs, khong ghi ra host
  -v "$W:/work:Z,U" -w /work \                    # CHI thu muc tam
  "$IMG_NODE24" npm ci --ignore-scripts --no-audit --no-fund
#   -> added 246 packages in 9s
podman unshare chown -R 0:0 "$W"                  # tra quyen TRUOC khi chuyen
mv "$W/node_modules" "$CLONE/node_modules"        # chuyen vao clone
rm -rf "$W"
```

Kết quả kiểm sau đó: `node_modules` 174 mục thuộc `ubuntu:ubuntu`, bản clone `git fsck` sạch, **0 mục
lệch chủ sở hữu**. `.git` **chưa bao giờ** nằm trong một mount nào.

## Quyết định

### D1. Thư mục tạm, không phải bản clone

Không phải để tránh lỗi chown — đó chỉ là cái làm nó lộ ra. Lý do thật: **bản clone chứa đối chứng của
lượt chấm**. Cho bước cài ghi được vào đó là cho một đường sửa `main` trong bản clone, tức đổi nhánh gốc
mà verdict so sánh vào. Cùng loại tấn công với «probe sửa thư viện probe», chỉ khác cửa.

Cái giá: repo có hình dạng ngoài danh sách chép (workspace, `patches/`, `.yarnrc`) sẽ cài hỏng. Đó là
hướng an toàn — cài hỏng thì cửa kiểm của nhịp một vẫn chặn và vẫn nói đúng bệnh.

### D2. `--ignore-scripts`, và KHÔNG có công tắc

| | chạy script cài | không chạy |
|---|---|---|
| repo dùng được | **tất cả** | tất cả trừ repo cần script |
| code repo đích chạy trên máy chủ | **có**, trong container có mạng | **không** |
| bằng chứng thực tế | — | `admin-fe`: 1/246 gói có script, và nó chỉ chạy trên macOS |

Số đo nghiêng hẳn: cái giá gần bằng không, cái được là đóng hẳn bề mặt nặng nhất. Và **repo đích MUST NOT
tự bật** — một khoá `checkmate.yml` xin chạy script cài chính là maker chỉnh checker ở chỗ nguy hiểm nhất.

### D3. Bản đồ ảnh theo phiên bản — và ảnh CÀI phải bằng ảnh CHẠY

Đây là quyết định mà **số đo bắt phải làm**, không phải quyết định thẩm mỹ.

Sau nguyên mẫu, cửa kiểm của nhịp một trả:

```
chan   : []                      <- het chan, phu thuoc da co
canhBao: ["runtime_lech"]        <- VAN canh bao, va no dang noi that
```

Phụ thuộc cài bằng **Node 24**, probe chạy trong ảnh **Node 22**. Cài mà không sửa ảnh chạy là đổi một cái
bẫy lấy một cái bẫy khác — và cái bẫy mới còn khó thấy hơn, vì nó chỉ nổ ở gói có phần native.

Bản đồ:

| phiên bản chính | digest | ảnh gốc | đã kiểm |
|---|---|---|---|
| 22 | `sha256:2fa754a9…` | `node:22.17-bookworm-slim` | đang dùng, 230 MB |
| 24 | `sha256:ba849c60…` | `node:24-bookworm-slim` | **v24.20.0**, npm 11.19.0, 235 MB |

Nguồn phiên bản, theo thứ tự: `runner.image` (repo khai thẳng — thắng tất) → `.nvmrc` (chính xác, một số) →
`engines.node` (dải, lấy số đầu). Phiên bản không có hàng ⇒ **từ chối**, không rơi về mặc định.

⛔ Số đọc từ repo đích chỉ dùng làm **khoá tra bản đồ**. Không bao giờ ghép vào tên ảnh (⛔C4) — đó là cách
một repo đích chọn được ảnh nó muốn chạy trên máy chủ người khác.

### D4. Ngoại lệ mạng phải có TÊN

`sandbox-isolation` khai «mạng ra ngoài SHALL tắt mặc định». Chữ «mặc định» cho phép ngoại lệ; điều nó
không cho phép là một ngoại lệ **không ai rà lại được**. Nên ngoại lệ này là một requirement, và có một
scenario bắt đọc mã nguồn đếm số chỗ bật mạng — phải đúng **một**.

Thứ nguy hiểm không phải mạng, cũng không phải code repo đích — mà là **giao** của hai cái. D2 cắt giao ấy.

### D5. Người bấm, máy không tự cài

Không phải vì ⛔C1 (⛔C1 nói về cổng merge). Vì: cài là kéo mã từ registry công cộng về máy chủ và ghi vào
đĩa — một quyết định về **cái gì được phép nằm trên máy này**. Làm nó im lặng bên trong một lượt chấm thì
người vận hành mất cả chỗ thấy chi phí lẫn chỗ từ chối. Và cái giá về tốc độ bằng không: 9 giây.

### D6. Tin phép kiểm, không tin mã thoát

`npm ci` từng thoát 0 sau khi cài dở dang và để lại thư mục rỗng — đúng trạng thái đo được 07/09, và là lý
do phép kiểm của nhịp một đếm số mục thay vì hỏi thư mục có tồn tại không. Nên cài xong phải chạy **lại
đúng cửa cũ**, không viết cửa thứ hai (cửa song sinh, đã bị bắt chín lần ở repo này).

## Rủi ro đã biết — khai ra chứ không giấu

- **Registry công cộng là nguồn không tin cậy.** `--ignore-scripts` chặn thực thi lúc cài, nhưng mã của gói
  **vẫn nằm trên đĩa** và **vẫn chạy** lúc chạy probe — trong container không mạng, chỉ đọc. Đó là mức bảo
  vệ hiện có, không hơn. Lock file khoá phiên bản; không có lock file thì cây phụ thuộc không tái lập được
  giữa hai lần cài, và điều đó nên nói ra chứ không nên giấu.
- **Bản đồ ảnh sẽ cũ.** `node:24-bookworm-slim` hôm nay là v24.20.0; sáu tháng nữa digest ấy vẫn chạy
  nhưng thiếu bản vá. Ghim là chọn tái lập thay vì mới — đúng chủ ý, và đổi ảnh là một change.
- **Chưa có đường xoá `node_modules`.** Cài lại đè lên bản cũ; lock file đổi mà không cài lại thì cây phụ
  thuộc lệch với khai báo, và không gì phát hiện được. Nợ có tên.
- **Dung lượng đĩa.** 220 MB cho một repo. Máy chủ còn khoảng 48 GB trống, nên chưa phải vấn đề — nhưng nó
  tăng tuyến tính theo số repo đích, và chưa ai đếm.

## Open Questions

- Có nên **so lock file** để biết `node_modules` đã cũ chưa (ghi hash lúc cài, đối chiếu lúc kiểm)? Nó
  biến «đã cài» thành «đã cài ĐÚNG BẢN NÀY». Chưa làm trong change này vì chưa gặp ca lệch thật.
- Repo **không phải Node** (Python, Java) thì bước cài này không nói gì. Cửa kiểm của nhịp một cũng vậy.
  Chưa có repo đích nào như thế; mở rộng khi có, không mở theo tưởng tượng.
