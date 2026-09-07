## Why

Ngày 07/09, CheckMate nhận repo đích **thứ hai** (`thangvv111/admin-fe`). Lượt chấm code đầu tiên trên
repo ấy chết ở bước sandbox với thông điệp **«Runner không xuất JUnit XML»**. Câu đó nói về *hợp đồng kết
quả*. Bệnh thật là bản clone **không có `node_modules`**.

Ba số đo làm việc này thành một change chứ không phải một dòng vá:

| đo | số |
|---|---|
| lời gọi model tiêu trước khi lỗi lộ ra | **3** (lập kế hoạch → sinh code → **sinh lại**) |
| token vào của ba lời gọi ấy (lượt PR #81) | **≈ 100 000** |
| chi phí một phép kiểm thư mục đứng trước | vài **mili giây** |

Và **một thông điệp đang gánh BA bệnh khác hẳn nhau**, cả ba gặp trong cùng một ngày:

| # | bệnh | dấu hiệu thật |
|---|---|---|
| 1 | thiếu phụ thuộc | `npx` đi tải, container `--network=none` ⇒ `EAI_AGAIN registry.npmjs.org` |
| 2 | thư mục phụ thuộc chỉ đọc | `ENOENT: mkdir '/work/node_modules/.vite-temp'` |
| 3 | runtime repo ≠ runtime ảnh | repo đòi Node `^24`, ảnh sandbox là Node 22.17.1 |

Bệnh 3 **chưa từng lộ ra** vì bệnh 1 chặn trước — nó đang chờ sẵn cho lần sau.

Việc này đã được **ghi vào `DEPLOY.md` cùng ngày** và lỗi vẫn tái diễn ngay sau đó. Đó là bằng chứng cho
mệnh đề đã có trong `CLAUDE.md`: *một luật không có lưới thì không phải luật đang thi hành*. Change này
đổi tài liệu thành **cơ chế**.

Kèm hai núm PO chốt cùng lúc (07/09), cùng một triết lý — **repo đích để RỘNG, siết bằng núm người vận
hành CheckMate**:

- `timeout_s` **300 → 3600** (dải `[30, 1800]` → `[30, 3600]`). Trần 5 phút biến một bộ test bình thường
  thành finding «PR làm treo test» — engine kết luận sai về pull request vì một hằng của chính nó.
- `probe_cap` mặc định phía repo **20 → 100** (= cận trên dải). Trần hiệu dụng vẫn là
  `min(khoá repo, núm người vận hành)`; trên prod núm là 80, nên trần hiệu dụng đi từ 20 lên 80.

## What Changes

- **Capability mới `probe-environment`** — ba luật: kiểm TRƯỚC khi tốn lời gọi model · lỗi môi trường
  MUST NOT sinh lại probe · thông điệp phải gọi đúng tên bệnh.
- **Cửa kiểm ở hai chỗ**: đầu lượt chấm code, và **lúc thêm repo** — người vận hành biết ngay lúc đăng ký
  chứ không biết sau khi đốt 100 nghìn token.
- **Phân loại lỗi bằng MÃ, không bằng lời văn** (⛔C4): thông điệp đến từ npm, từ Node, từ chính repo đích.
- **Đóng cửa song sinh timeout**: `chayVitest` cứng `300_000` ở lệnh cắt **và** cứng chuỗi `"300s"` ở thông
  điệp — hai biểu thức cho một luật. Khuôn này đã bị bắt **chín lần** trong repo.
- **BREAKING (không):** repo đích không khai gì thì hành vi giống hôm nay, trừ hai mặc định đã nới.

**Cố ý KHÔNG làm — chặn cứng khi runtime lệch.** Repo khai `engines.node` chặt hơn mức thật sự cần là
chuyện thường; chặn cứng sẽ chặn oan, và một cảnh báo sai dạy người ta bỏ qua cảnh báo thật. Runtime lệch
**CẢNH BÁO**, thiếu phụ thuộc **CHẶN**.

**Cố ý KHÔNG làm — tự chạy `npm ci` trong bản clone.** Đó là chạy code cài đặt của repo đích ngoài sandbox
(script `postinstall` chạy tuỳ ý). Nó là **nhịp hai** và cần change riêng có trục an toàn riêng.

## Capabilities

### New Capabilities

- `probe-environment`: điều kiện môi trường phải đúng TRƯỚC khi tốn token, phân biệt ba bệnh, và ranh
  giới «sinh lại probe hay không».

### Modified Capabilities

- `target-contract`: đường chạy test **mặc định** chịu cùng khoá timeout với đường runner — thêm
  requirement, không sửa «`checkmate.yml` là tuỳ chọn».

## Luật chạm tới

- `probe-environment › *` — capability mới, mọi requirement ADDED.
- `target-contract › Đường chạy test MẶC ĐỊNH chịu cùng khoá timeout với đường runner` — ADDED. Requirement
  «Các trường còn lại của khối `runner` SHALL có mặc định, và `timeout_s` SHALL bị kẹp vào dải đã chốt»
  **không sửa**: nó nói «dải đã chốt» chứ không ghi con số, nên nới dải nằm trong code + test khoá.
- ⛔C2 fail-closed — dừng vì môi trường MUST NOT thành PASS; đường dừng ném lỗi, lượt vào trạng thái hỏng.
- ⛔C4 dữ liệu ngoài là dữ liệu — phân loại lỗi bằng mã, không so khớp lời văn của repo đích.
- **Sổ nợ ngoài capability:** `probe_cap` mặc định 20 → 100 nằm ở requirement `finding-volume-standard ›
  Trần khối lượng tách theo skill…`, do change **`finding-cap-and-density-standard`** sở hữu và **chưa
  archive**. Change này sửa thẳng ở đó (spec + tasks) thay vì mở một requirement thứ hai cho cùng một luật;
  hai change cùng khai một luật là đúng khuôn lệch mà repo này tồn tại để chống.
