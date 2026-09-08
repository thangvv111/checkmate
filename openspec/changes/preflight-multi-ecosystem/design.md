## Bối cảnh

CheckMate đi từ **một** repo đích (chính nó) sang **sáu** trong hai tuần. Mỗi lần thêm một repo, một giả
định chưa nói ra lại vỡ. Lần này giả định là: **repo đích là dự án Node.**

Nó chưa bao giờ được viết ra thành luật — nó nằm trong tên hàm (`checkDependencies` đọc `package.json`),
trong thông điệp (`npm ci`), và trong việc container chỉ mount `node_modules`.

## Đo trước khi thiết kế — khảo sát cả sáu repo đích, 08/09

| repo | file dấu hiệu | hệ | phụ thuộc trên máy chủ | chấm code được? |
|---|---|---|---|---|
| `checkmate` | `package.json` | Node | 176 mục | ✅ |
| `admin-fe` | `package.json` · `.nvmrc 24` | Node | 174 mục | ✅ |
| `portal-fe` | `package.json` · `.nvmrc 24` | Node | **không** | ❌ chặn đúng, nói đúng |
| `admin-be` | `pom.xml` · Java 21 | **Maven** | — | ❌ **nói SAI** |
| `portal-be` | `pom.xml` · Java 21 | **Maven** | — | ❌ **nói SAI** |
| `demo-credit-approval` | `package.json` | Node | có | ✅ |

Và trên máy chủ:

```
podman images        -> chi co node:22.17-bookworm-slim, node:24-bookworm-slim   (KHONG co anh Java)
ls ~/.m2/repository  -> 0                                                        (kho Maven RONG)
```

⇒ Với hệ Maven, engine **không có đường nào** cấp phụ thuộc cho container hôm nay. Đó là sự thật, và
thông điệp phải nói đúng sự thật ấy.

## Quyết định

### D1. Nhận diện bằng FILE DẤU HIỆU, bảng đóng, trong mã

| hệ | file dấu hiệu ở gốc | engine cấp được phụ thuộc? |
|---|---|---|
| `node` | `package.json` | **có** — mount `node_modules` |
| `maven` | `pom.xml` | chưa |
| `gradle` | `build.gradle` · `build.gradle.kts` | chưa |
| `python` | `requirements.txt` · `pyproject.toml` | chưa |

Bảng ĐÓNG và trong mã, cùng lý lẽ với `DEPENDENCY_SCRATCH_PATHS`: nội dung repo đích là dữ liệu ngoài
(⛔C4), nên nó chỉ được dùng làm **khoá tra**, không được ghép vào lệnh.

Không khớp hàng nào ⇒ **không kết luận**, đi tiếp. Bỏ sót là hướng an toàn: nó rơi về hành vi hôm nay.

### D2. «Chưa hỗ trợ» là một câu trả lời hợp lệ — và là câu đúng

Ba lựa chọn cho repo Maven, và cái giá của từng cái:

| | người vận hành làm gì | cái giá |
|---|---|---|
| im lặng, đi tiếp (hôm nay) | không biết gì | 17 phút + 2 lời gọi model, chết với thông điệp sai |
| kê `npm ci` (hôm nay) | chạy lệnh vô tác dụng | **đi sai hướng một cách tự tin** — tệ nhất |
| **chặn, nói «chưa hỗ trợ Maven»** | biết ngay, biết đúng chỗ | mất một lượt chấm lẽ ra cũng hỏng |

Cái thứ hai tệ hơn cái thứ nhất, và đó là điều đáng nói: một thông điệp **kê nhầm thuốc** dẫn người ta đi
sai hướng, trong khi một thông điệp chỉ nêu triệu chứng ít nhất còn làm người ta đi tìm.

### D3. Giữ nguyên gác «không sinh lại probe»

Gác ấy **đã chạy đúng** trong ca 08/09 — log ghi «⛔ Lỗi MÔI TRƯỜNG, KHÔNG sinh lại probe», và nó tiết
kiệm được lời gọi thứ ba. Change này không chạm nó. Nói ra để không ai nghĩ cả cơ chế đã hỏng: nó hỏng
đúng **một** tầng, và hai tầng còn lại làm đúng việc của mình.

## Ràng buộc thứ tự — khai ra chứ không giấu

Capability `probe-environment` **chưa archive** (nó thuộc change `probe-environment-preflight`, đã merge
nhưng còn ô chưa tick). `openspec validate` cho biết thẳng:

> Archive would refuse this delta: probe-environment: target spec does not exist; only ADDED requirements
> are allowed for new specs.

Nghĩa là change này **merge được, deploy được, nhưng chưa archive được** cho tới khi change kia archive.
Đó là ràng buộc thứ tự có thật, ghi ở `tasks.md` §7. Nó cũng là một triệu chứng đáng ghi: nhiều change đã
merge mà chưa archive, nên spec chưa thành luật hiện hành, và mọi change tiếp theo phải vá vào change gốc.

## Open Questions

- Ảnh container theo hệ (`eclipse-temurin:21` cho Maven) + kho phụ thuộc mount chỉ-đọc: change riêng, rộng
  hơn nhịp hai. Chưa mở — cần PO chốt có nuôi hệ Java trên máy chủ này không.
