## Why

**Verdict đang được đăng lên NHẦM REPO.** Phát hiện 07/09 trên prod, ngay sau khi PO thêm repo thứ ba.

Ba đường hành động GitHub **sau** khi một lượt chấm kết thúc đọc lại cấu hình rồi dùng `cfg.repo` — tức
**repo đang chọn trên giao diện** — thay vì repo của chính lượt ấy:

| đường | hành động | file |
|---|---|---|
| chế độ trực (`rm.onXong`) | đăng verdict · gắn trạng thái commit · đóng PR · trả về dev | `server.ts:243–288` |
| theo dõi head đổi | đọc PR hiện tại | `server.ts:218–232` |
| **cổng merge** | đọc PR · đăng receipt · **MERGE** · đóng PR · trả về dev | `server.ts:1188–1226` |

Đo được trên prod: lượt chấm `PR #79` thuộc `thangvv111/checkmate` (sổ ghi đúng ở cột `repo`), nhưng
`repo_dang_chon` là `thangvv111/admin-fe`, nên engine gọi `/repos/thangvv111/admin-fe/issues/79/comments`
⇒ **404**, và `/repos/thangvv111/admin-fe/statuses/<sha của checkmate>` ⇒ **422 «No commit found for
SHA»**. Hai mã lỗi khác nhau, một nguyên nhân, khớp hoàn hảo.

Token **không** phải nguyên nhân — kiểm bằng một lần ghi thật với chính token ấy: đăng comment **201**,
gắn trạng thái **201**, xoá comment thử **204**.

**Vì sao nguy hiểm hơn một lỗi 404:** hôm nay may vì `admin-fe` không có PR số 79. Nếu có, verdict của
repo này sẽ đăng lên PR của repo kia — comment mang finding của một cây mã nguồn khác, dưới danh nghĩa
CheckMate. Và ở **cổng merge** thì hậu quả không dừng ở một comment sai: `mergePr` sẽ merge PR **cùng số ở
repo đang chọn**. Đó là ⛔C1 bị phá theo đường tệ nhất — máy đưa code vào trunk của một repo mà không ai
yêu cầu.

**Vì sao mới lộ hôm nay:** trước đây chỉ có một repo nên «repo đang chọn» luôn trùng «repo của lượt».
Thêm repo thứ hai là hai thứ tách nhau — và đó chính là bối cảnh nhiều đội mà sản phẩm đang hướng tới.

## What Changes

- Mọi hành động GitHub **thuộc về một lượt chấm** SHALL lấy repo từ **lượt** (`meta.repo`, gán lúc chạy),
  KHÔNG từ repo đang chọn. Dùng lại khuôn đã đúng ở đường webhook (`server.ts:889`).
- Hàm dựng cấu hình theo repo: `configForRepo(c, github)` — một cửa, trả `null` khi repo không còn trong
  danh sách.
- **Fail-closed:** lượt không có `repo`, hoặc `repo` không còn trong danh sách ⇒ **KHÔNG hành động**, ghi
  log nêu đúng lý do. MUST NOT rơi về repo đang chọn. Thà không đăng còn hơn đăng nhầm repo; thà không
  merge còn hơn merge nhầm trunk.
- Lưới quét source: mọi lời gọi hành động GitHub trong đường hậu-lượt phải nhận cấu hình dựng từ repo của
  lượt — cặp fixture ĐỎ/XANH.

**Không đổi:** đường khởi lượt chấm (webhook và bấm tay) vốn đã đúng · `cfg.repo` vẫn là khung nhìn cho
các màn hình · không đụng luật nhị phân, không đụng ⛔C1 theo hướng nới.

## Capabilities

### New Capabilities

*(không có)*

### Modified Capabilities

- `repo-history`: thêm requirement — hành động GitHub thuộc một lượt phải theo repo của lượt, và thiếu
  repo thì không hành động. Luật hiện hành đã khai «repo đang chọn chỉ là **khung nhìn**» và «lượt của
  repo A MUST NOT lọt vào repo B», nhưng chỉ cho **lịch sử và lọc**; bề mặt hành động GitHub chưa ai khai,
  và đó đúng là chỗ lọt.

## Luật chạm tới

- **Luật chạm tới:**
  - `repo-history › Hành động GitHub của một lượt chấm phải theo repo của LƯỢT, không theo repo đang chọn`
    — ADDED.
  - `repo-history › Danh sách repo là nguồn sự thật, repo đang chọn chỉ là khung nhìn dựng ra từ nó` —
    **không sửa**; requirement mới là hệ quả của nó, mở rộng sang bề mặt hành động.
  - `repo-history › Lịch sử chấm gắn repo tại thời điểm chạy, và lọc phải tách bạch` — **không sửa**;
    `meta.repo` mà bản vá dựa vào chính là trường requirement ấy đã bắt buộc phải có.
  - **⛔C1** — cổng merge là đường nặng nhất của bug: máy có thể merge nhầm repo. Bản vá siết, không nới.
  - **⛔C2** — thiếu repo ⇒ không hành động, không đoán.
  - **⛔C5** — export mới (`configForRepo`) khai vào bảng module.
  - `merge-gate › Merge chỉ khi verdict PASS còn hiệu lực trên pull request đang mở` — **không sửa**; bản
    vá làm câu «pull request đang mở» trỏ đúng repo, tức khôi phục ý nghĩa vốn có của nó.

## Impact

| file | đổi gì |
|---|---|
| `apps/web/src/config.ts` | `configForRepo(c, github)` — dựng `CauHinhCoRepo` từ repo trong danh sách, `null` nếu không có |
| `apps/web/src/server.ts` | ba đường hậu-lượt (`rm.onXong` · `theoDoiHead` · route cổng merge/trả về dev) lấy repo từ `meta.repo` |
| `checkmate.yml` | khai `configForRepo` vào bảng module (⛔C5) |
| `test/repo-history.test.ts` (hoặc file lưới tương ứng) | ca hàm thuần + lưới quét source có cặp fixture |
