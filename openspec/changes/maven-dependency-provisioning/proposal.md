## Why

Hai trong sáu repo đích là **Java/Maven** (`admin-be`, `portal-be`). Từ change `preflight-multi-ecosystem`,
CheckMate **nói đúng** với chúng — «dự án Java/Maven, CheckMate chưa cấp được phụ thuộc cho hệ này» — nhưng
vẫn **không chấm được**. PO chốt 08/09: **nuôi hệ Java trên máy chủ**.

Đây là change đầu tiên mở rộng `dependency-provisioning` ra khỏi Node, và mọi quyết định trong nó đứng trên
số đo chạy thật trên prod, không trên suy luận. Bốn phép đo, mỗi phép đổi một quyết định:

| đo | kết quả | đổi gì |
|---|---|---|
| `./mvnw` trong container | ❌ «Failed to validate Maven distribution SHA-256» | **bỏ wrapper** |
| tải **chính file ấy** trong **chính ảnh ấy** | sha256 **khớp đúng** giá trị repo ghim, ZIP hợp lệ | chứng minh mạng và artifact **không sao** — wrapper mới hỏng |
| `.m2` mount `:ro`, mode `0700` | Maven báo «artifact absent» | kho phải **mở quyền đọc** (`a+rX`) |
| probe **cố tình đỏ**, offline, `.m2` chỉ đọc | `Tests run: 1, Failures: 1` · rc≠0 · **XML CÓ** | hợp đồng runner đúng như hai đội đích đã đo |

Và một phát hiện **không nằm trong dự tính**, nặng nhất:

> **Spotless chặn mọi probe do máy sinh.** `admin-be` bind bộ kiểm định dạng vào pha `test`, nên một probe
> JUnit **hợp lệ** vẫn làm `BUILD FAILURE` **trước khi một test nào chạy** — và CheckMate đọc «không có
> XML» thành **sự cố hạ tầng**. Đúng con bệnh mà `probe-environment` tồn tại để diệt, lần này đến từ một
> cổng của repo đích.

## What Changes

- **`dependency-provisioning` mở rộng sang Maven**: nạp kho `.m2` **riêng từng repo** trong container có
  mạng, rồi mount **chỉ đọc** vào container chạy probe.
- **Ảnh theo hệ, ghim digest**: `maven:3.9-eclipse-temurin-21` (`sha256:8f6ac126…`) — có sẵn Maven 3.9.16
  và Java 21.0.12. **Không dùng `mvnw`**.
- **Kho `.m2` mở quyền đọc** sau khi nạp; không có bước này thì container không vào được và Maven nói sai bệnh.
- **CheckMate truyền cờ offline + đường kho qua `MAVEN_ARGS`**, không bắt `test_cmd` của repo đích biết
  đường mount của CheckMate. Repo khai **chạy cái gì**, CheckMate khai **kho ở đâu**.
- **Ngoại lệ mạng vẫn CHỈ ở bước nạp**, và bốn điều kiện của nó giữ nguyên.

**Cố ý KHÔNG làm — cho probe chạm Docker.** `admin-be` **14/26** và `portal-be` **19/31** lớp test cần
PostgreSQL thật qua Testcontainers. Sandbox vẫn `--network=none`, không container lồng nhau — luật
`sandbox-isolation`, dựng vì probe **là code của pull request đang được review**. Change này **không** mở
rộng bề mặt probe cho hai repo ấy; nó chỉ làm 12 lớp miền thuần chạy được.

**Cố ý KHÔNG làm — tự thêm cờ bỏ qua Spotless.** Cờ ấy thuộc `test_cmd` của repo đích. CheckMate nhét vào
là quyết định thay họ **cái gì được bỏ qua khi chấm chính họ** — và đó là maker-checker đảo chiều. Đã báo
cả hai đội kèm số đo; họ tự sửa.

## Capabilities

### Modified Capabilities

- `dependency-provisioning`: cấp phụ thuộc cho hệ Maven — kho riêng repo, mount chỉ đọc, ảnh ghim digest.
- `probe-environment`: hệ Maven **có** đường cấp phụ thuộc ⇒ không còn chặn bằng «chưa hỗ trợ hệ này».

## Luật chạm tới

- `dependency-provisioning › *` — MODIFIED, mở rộng khỏi giả định «repo đích là Node».
- `probe-environment › Điều kiện môi trường … TRƯỚC lời gọi model đầu tiên` — MODIFIED: bảng hệ sinh thái
  đổi cờ «engine cấp được phụ thuộc» cho Maven.
- `sandbox-isolation › Ngoại lệ mạng CHỈ cho bước cài` — **KHÔNG sửa**; bốn điều kiện áp nguyên cho Maven.
- ⛔C4 — phiên bản runtime và tên ảnh vẫn chỉ là **khoá tra bảng đóng**, không ghép chuỗi.
- ⛔C2 — nạp xong vẫn **kiểm lại bằng chính cửa đã báo thiếu**; không tin mã thoát của trình nạp.
