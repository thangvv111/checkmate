## Why

Ngày 08/09, PO chấm **`thangvv111/admin-be`** — repo **Java/Maven** đầu tiên vào CheckMate. Lượt chấm:

| đo | số |
|---|---|
| thời gian trước khi chết | **17 phút** |
| lời gọi model đã tiêu | **2** (lập kế hoạch + sinh code) |
| chỗ chết | bước chạy probe, Maven đi tải từ Maven Central, container `--network=none` |
| thông điệp | «… **Cài trong bản clone rồi chấm lại: cd … && `npm ci` …**» |

**`npm ci` trong một repo Maven không làm gì cả.** Repo ấy không có `package.json` nào — đã kiểm cả cây.

Đây đúng là con bệnh mà capability `probe-environment` **tồn tại để diệt**: *thông điệp gọi tên một bệnh
rồi kê nhầm thuốc.* Requirement đã khai «Thông điệp môi trường SHALL gọi đúng tên bệnh và nêu việc phải
làm» — kê `npm ci` cho Maven **vi phạm chính requirement ấy**. Đây là **lỗi**, không phải tính năng thiếu.

Và cửa kiểm không chặn được, vì `checkDependencies` chỉ hiểu Node: không thấy `package.json` thì nó kết
luận «không phải dự án Node» rồi im — **đúng theo scenario đã khai**, nhưng hệ quả là repo không-Node
không được bảo vệ gì và 2 lời gọi model bị đốt.

**Khảo sát cả đội (08/09)** cho thấy đây không phải ca lẻ — bốn repo đích đã khai trong cấu hình:

| repo | hệ | chấm code được hôm nay? |
|---|---|---|
| `admin-fe` | Node · `.nvmrc` 24 | ✅ (phụ thuộc đã cài trên máy chủ) |
| `portal-fe` | Node · `.nvmrc` 24 | ❌ chưa cài phụ thuộc — cửa kiểm chặn đúng, thông điệp đúng |
| `admin-be` | **Maven** · Java 21 | ❌ và thông điệp **nói sai** |
| `portal-be` | **Maven** · Java 21 | ❌ như trên |

Tức **một nửa số repo đích** nhận lời khuyên sai.

## What Changes

- **Nhận diện HỆ SINH THÁI của repo đích** bằng file dấu hiệu ở gốc: `package.json` → Node ·
  `pom.xml` → Maven · `build.gradle[.kts]` → Gradle · `requirements.txt`/`pyproject.toml` → Python.
- **Thông điệp và lệnh sửa đi theo hệ ấy.** Hệ không nhận ra ⇒ nói **«chưa hỗ trợ hệ này»**, và
  **MUST NOT** kê lệnh của một hệ khác. Thà im còn hơn chỉ sai đường.
- **Chặn SỚM cho hệ mà CheckMate chưa cấp được phụ thuộc.** Hôm nay môi trường chạy probe chỉ mount
  `node_modules`; không có kho Maven/Gradle/pip nào. Nên với các hệ ấy, cửa kiểm **chặn trước lời gọi
  model đầu tiên** thay vì để lượt chấm chạy 17 phút rồi chết.
- **BREAKING (không):** repo Node đi đúng đường cũ, không đổi một nhánh nào.

**Cố ý KHÔNG làm — dựng kho phụ thuộc cho Maven/Gradle/Python.** Nó đòi ảnh container theo từng hệ, kho
cache mount chỉ-đọc, và một quyết định về cái gì được phép nằm trên máy chủ. Đó là change riêng, cùng họ
với nhịp hai (`dependency-install-in-container`) nhưng rộng hơn nó. Change này chỉ làm **thông điệp nói
thật** và **dừng sớm** — hai thứ rẻ và đúng ngay.

## Capabilities

### Modified Capabilities

- `probe-environment`: cửa kiểm và thông điệp đi theo **hệ sinh thái** của repo đích, không mặc định Node.

## Luật chạm tới

- `probe-environment › Điều kiện môi trường chạy probe SHALL được kiểm TRƯỚC lời gọi model đầu tiên` —
  MODIFIED: mở rộng từ «dự án Node» sang «hệ sinh thái nhận ra được», và thêm mức chặn cho hệ chưa cấp
  được phụ thuộc.
- `probe-environment › Thông điệp môi trường SHALL gọi đúng tên bệnh và nêu việc phải làm` — MODIFIED:
  lệnh sửa phải thuộc đúng hệ; hệ không rõ thì MUST NOT kê lệnh nào.
- `probe-environment › Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe` — **KHÔNG sửa.** Gác ấy đã chạy
  đúng trong ca 08/09: log ghi «⛔ Lỗi MÔI TRƯỜNG, KHÔNG sinh lại probe», tiết kiệm được lời gọi thứ ba.
- ⛔C4 — file dấu hiệu và nội dung của chúng là dữ liệu của repo đích; chỉ dùng để **tra một bảng đóng**,
  không ghép vào lệnh.
- ⛔C2 — không hệ nào nhận ra được ⇒ vẫn đi tiếp như hôm nay (không chặn oan), nhưng lỗi lúc chạy vẫn dừng.
