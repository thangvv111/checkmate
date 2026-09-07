## Why

Nhịp một (`probe-environment-preflight`) làm CheckMate **nói đúng bệnh**: bản clone thiếu phụ thuộc thì
dừng trước lời gọi model và in ra lệnh cài. Chạy thật trên prod 07/09 xác nhận cả ba tầng hoạt động.

Nhưng lệnh nó in ra — `npm ci` — **hỏng với chính repo đã sinh ra nó**:

```
$ npm ci        # trong clone admin-fe, trên máy chủ Node 22
npm error code EBADENGINE   # .npmrc cua repo dat engine-strict=true, package.json doi node ^24
```

Tức CheckMate đang ở trạng thái «biết mình hỏng ở đâu, và không tự sửa được». Đó là nhịp hai.

**Bốn số đo trên prod 07/09 định hình change này** (chi tiết ở `design.md`):

| đo | kết quả |
|---|---|
| cài `admin-fe` trong container Node 24, `--ignore-scripts` | **246 gói · 9 giây · 220 MB** |
| gói có script cài trong toàn bộ cây phụ thuộc | **1** (`fsevents`, chỉ chạy trên macOS) |
| mount **cả bản clone** vào container với cờ `U` | **HỎNG** — và làm hỏng bản clone (xem dưới) |
| cài xong rồi kiểm lại bằng chính cửa của nhịp một | `chan: []` · `canhBao: ["runtime_lech"]` |

**Số đo thứ ba là bài học đắt nhất, và nó đến từ một sự cố em tự gây ra.** Cách hiển nhiên — mount bản
clone rồi chạy `npm ci` trong đó — được thử trước tiên. Cờ `U` của podman chown **đệ quy toàn bộ cây được
mount**, chạm `.git` thì hỏng giữa chừng, và để lại **78 mục của bản clone thuộc một subuid** mà tài khoản
dịch vụ không đọc được. Khôi phục xong (`podman unshare chown` + `sudo chown`, `git fsck` sạch, 0 mục lệch),
nhưng bài học ở lại: **thư mục làm việc của lần cài không được là bản clone.**

**Số đo thứ tư là kết quả quan trọng nhất.** Sau khi cài, cửa kiểm của nhịp một hết chặn — nhưng **cảnh
báo runtime vẫn còn**, và nó đang nói thật: phụ thuộc được cài bằng **Node 24**, còn probe vẫn chạy trong
ảnh **Node 22**. Cài trong container mà không đồng thời sửa ảnh chạy probe là dựng một cái bẫy mới: cây
`node_modules` xây cho một runtime, đem chạy trên runtime khác, và lỗi khi ấy lại **không nói gì về pull
request đang chấm** — đúng loại lỗi cả hai nhịp này sinh ra để diệt.

## What Changes

- **Capability mới `dependency-provisioning`** — cài phụ thuộc cho bản clone repo đích, trong container,
  không chạy script của repo đích, không cho container thấy `.git`.
- **Thư mục làm việc là một thư mục TẠM**, không phải bản clone. Chép vào đó một **danh sách ĐÓNG**
  (`package.json` · lock file · `.npmrc` · `.nvmrc`), cài, trả quyền, rồi **chuyển** `node_modules` vào
  clone. Bản clone không bao giờ được mount ghi được.
- **`--ignore-scripts` mặc định.** Không script nào của repo đích chạy — kể cả `postinstall`.
- **Bản đồ ảnh theo phiên bản Node, ghim theo digest** — một hàng một phiên bản. Thêm phiên bản là một
  change, không phải một lần `pull`. Change này thêm **Node 24** (`sha256:ba849c60…`, v24.20.0).
- **Ảnh CÀI và ảnh CHẠY PROBE lấy từ CÙNG bản đồ, theo cùng một phiên bản.** Đây là vế bắt buộc, không
  phải vế tuỳ chọn — xem số đo thứ tư ở trên.
- **Mạng: bật ĐÚNG ở container cài**, và chỉ ở đó. Container chạy probe giữ nguyên `--network=none`.
- **Người vận hành bấm, máy không tự cài.** Cửa kiểm của nhịp một nói cần cài; việc cài là một hành động
  có nút, có log, có kết quả kiểm lại sau khi xong.

**Cố ý KHÔNG làm — bật script cài qua khoá `checkmate.yml`.** Đó là để repo bị chấm tự bật đường chạy code
tuỳ ý trên máy chủ của bên chấm, tức maker chỉnh checker ở đúng chỗ nguy hiểm nhất. Repo cần script cài
thì đó là quyết định của **người vận hành CheckMate**, không phải của repo đích — và chưa có repo nào cần,
nên chưa mở đường nào cả.

**Cố ý KHÔNG làm — hỗ trợ workspace / pnpm / yarn / patch-package.** Danh sách file chép sang là danh sách
đóng, và nó đủ cho hình dạng repo đang có. Mở rộng phải có repo thật làm bằng chứng, không mở rộng theo
tưởng tượng.

## Capabilities

### New Capabilities

- `dependency-provisioning`: cài phụ thuộc cho bản clone repo đích — nơi cài, cài bằng gì, cái gì KHÔNG
  được chạy, và làm sao biết đã cài xong thật.

### Modified Capabilities

- `sandbox-isolation`: khai **ngoại lệ mạng có tên** cho container cài, và luật «ảnh chọn theo phiên bản
  runtime của repo đích, từ một bản đồ ghim digest» — thêm requirement; không sửa «Không đường ghi nào ra
  ngoài thư mục của lượt chạy».

## Luật chạm tới

- `dependency-provisioning › *` — capability mới, mọi requirement ADDED.
- `sandbox-isolation › Ngoại lệ mạng chỉ cho bước cài phụ thuộc, và chỉ ở container không chạy code repo
  đích` — ADDED.
- `sandbox-isolation › Ảnh chạy chọn theo phiên bản runtime repo đích, từ bản đồ ghim digest` — ADDED.
- `sandbox-isolation › Không đường ghi nào ra ngoài thư mục của lượt chạy` — **KHÔNG sửa.** Requirement ấy
  nói về **lượt chạy probe**. Bước cài là một lượt chạy khác, có luật riêng, và luật riêng ấy phải nói rõ
  vì sao nó được phép làm thứ lượt chạy probe không được phép.
- ⛔C4 — `engines.node` · `.nvmrc` · `.npmrc` đều là dữ liệu của repo đích; phiên bản đọc ra chỉ dùng để
  **tra bản đồ đóng**, không bao giờ ghép thẳng vào tên ảnh.
- ⛔C2 — cài xong phải **kiểm lại bằng chính cửa của nhịp một**; không kiểm được thì coi như chưa cài.
- ⛔C6 — cài xong phải có hiệu lực ở lượt đọc kế tiếp, không cache.

## Open Questions — cần PO chốt

1. **`--ignore-scripts` có phải mặc định KHÔNG THỂ TẮT, hay là mặc định TẮT ĐƯỢC bởi người vận hành?**
   Đề xuất của em: **không thể tắt trong change này**. Số đo ủng hộ — toàn cây phụ thuộc của `admin-fe`
   chỉ có **một** gói khai script cài, và nó là `fsevents` (chỉ chạy trên macOS). Mở một công tắc trước
   khi có repo thật cần nó là mở một bề mặt để đấy.
2. **Máy có được tự cài khi cửa kiểm chặn không?** Đề xuất của em: **không**. Cài là kéo mã từ registry về
   máy chủ và ghi vào đĩa; làm việc ấy như một tác dụng phụ im lặng của một lượt chấm thì người vận hành
   mất chỗ nhìn thấy chi phí và mất chỗ từ chối. Nút bấm + log là đủ nhanh (9 giây với `admin-fe`).
