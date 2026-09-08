## Bốn phép đo, mỗi phép đổi một quyết định

Tất cả chạy trên prod 08/09, trong **chính môi trường CheckMate sẽ chạy** — không phải trên máy dev.

### D1. Bỏ trình bao bọc `mvnw`

```
./mvnw -B -q dependency:go-offline
  → Error: Failed to validate Maven distribution SHA-256
```

Phép đo bác bỏ hai giả thuyết dễ tin nhất, và đó là lý do nó đáng tin:

```
# tai CHINH tep ay, trong CHINH anh ay
sha256 = 5af3b743dd8b876b5c45da33b676251e5f1687712644abb4ee519ca56e1d89ce
       = dung gia tri distributionSha256Sum ma repo ghim
vai byte dau = PK\003\004      (ZIP hop le)
```

⇒ **Mạng không sao, artifact không sao.** Trình bao bọc mới là chỗ hỏng.

⇒ Dùng ảnh **`maven:3.9-eclipse-temurin-21`** (`sha256:8f6ac126…`, 538 MB) mang sẵn **Maven 3.9.16** —
đúng bản mà trình bao bọc muốn tải — và **Java 21.0.12**. Bỏ một lớp thay vì sửa một lớp.

### D2. Kho `.m2` riêng từng repo, mount chỉ đọc

| | |
|---|---|
| nạp | container **có mạng**, bằng **đúng lệnh sẽ chạy offline** |
| kết quả (`admin-be`) | **501 jar · 248 MB · 4560 tệp** |
| chạy offline | **9 giây**, `--network=none`, `.m2` mount `:ro` |
| Maven có đòi ghi vào `.m2` không? | **KHÔNG** ⇒ không cần lớp phủ ghi tạm như `.vite-temp` |

Nạp bằng **đúng lệnh sẽ chạy** chứ không bằng `dependency:go-offline`: `go-offline` không kéo đủ mọi
plugin, và thiếu một plugin thì lượt offline chết ở chỗ khó truy. Chạy thật một lần thì kéo đúng thứ cần.

### D3. Kho phải MỞ QUYỀN ĐỌC

```
.m2 mode 0700  →  mvn -o: "Cannot access central … artifact has not been downloaded before"
chmod -R a+rX  →  BUILD SUCCESS, 9s
```

Thông điệp «artifact absent» nói về **thiếu gói**, trong khi bệnh là **không đọc được** — lại một thông
điệp nói sai bệnh, lần này của Maven. Ghi vào luật để người sau không mất một vòng như mình.

### D4. Cờ đi qua `MAVEN_ARGS`, không qua `test_cmd` của repo đích

```
-e "MAVEN_ARGS=-o -Dmaven.repo.local=/m2"   →  rc=1, XML CO, khong co "Cannot access central"
```

Ranh giới: repo khai **chạy cái gì**, CheckMate khai **kho ở đâu**. Bắt `test_cmd` mang đường mount nội bộ
của CheckMate là buộc hai bên vào nhau, và nó cũng chính là thứ làn `oapi-portal-be` phản đối khi từ chối
sửa `pom.xml` cho một người tiêu dùng.

## Phát hiện ngoài dự tính — và nó thành một luật

Ghi một probe JUnit **hợp lệ** vào sandbox rồi chạy:

```
[ERROR] src/test/java/…/CheckerProbeTest.java
[ERROR]     -import·org.junit.jupiter.api.Test;
BUILD FAILURE        ← truoc khi mot test nao chay
XML: KHONG CO        ← CheckMate doc thanh "su co ha tang"
```

**Spotless** bind vào pha `test`. Probe do model sinh không thể đúng định dạng của repo, nên nó gãy vì
**hình thức**, không vì **nội dung**.

Thêm `-Dspotless.check.skip=true`:

```
Tests run: 1, Failures: 1, Errors: 0     ← probe do THAT
rc khac 0 · XML CO
```

⛔ **Nhưng engine KHÔNG tự thêm cờ ấy**, và đó là requirement thứ hai của change này. Cờ ấy quyết định
*cái gì được bỏ qua khi chấm chính repo ấy*. Bên chấm tự nới cổng của bên bị chấm — không ai khai, không ai
duyệt — là maker-checker đảo chiều. Đã báo cả hai đội kèm số đo; họ tự sửa `test_cmd`.

## Vế phụ: xác nhận độc lập hợp đồng runner

Cùng phép đo trên cho **lần thứ ba, trên máy thứ ba**, cùng một kết luận đã có từ `oapi-admin-be` và
`oapi-portal-be`: **bộ chạy test ghi báo cáo XONG rồi mới thoát khác 0.** Nên `;` đúng và `&&` sai — nay
đo được trong chính môi trường CheckMate, không chỉ trên máy dev của họ.

## D5. Hai lượt cùng lúc trên một kho: nạp vào kho TẠM rồi đổi tên đè

Kho `.m2` khác thư mục nạp của nhịp hai ở một điểm quyết định: nó **bền**, sống qua nhiều lượt chấm. Nên
có một cửa sổ mà nhịp hai không có — **nạp lại trong khi một lượt chấm đang mount kho ấy**. Probe chỉ đọc
(`:ro`), nên nó không hỏng kho; nhưng nó có thể đọc trúng một jar đang tải dở và chết với lỗi nói về
artifact, tức lại **sai tên bệnh**.

Cách chọn: nạp vào `<kho>.new`, xong xuôi và đã `chmod a+rX` mới **đổi tên đè** vào chỗ thật. Đổi tên là
một thao tác nguyên tử ở tầng thư mục; container đang chạy giữ kho cũ qua inode nên nó **chạy hết lượt với
bản cũ nguyên vẹn**, còn lượt sau lấy bản mới. Đây đúng nếp «ghi bản mới trước rồi mới xoá bản cũ» mà
`CLAUDE.md` đã đặt cho dữ liệu prod, chỉ áp cho một loại dữ liệu mới.

Hai lượt **nạp** cùng lúc cho cùng một repo thì lượt sau đè lượt trước — chấp nhận được, vì cả hai nạp ra
cùng một nội dung từ cùng một `pom.xml`. Cái không chấp nhận được là **đọc kho nửa vời**, và đổi-tên-đè
đóng đúng cửa đó.

## Cái change này KHÔNG làm

**Không mở bề mặt probe cho phần cần Docker.** `admin-be` **14/26** và `portal-be` **19/31** lớp test cần
PostgreSQL thật. Sandbox vẫn `--network=none`, không container lồng nhau. Change này làm **12 lớp miền
thuần** chạy được — và verdict vẫn **chưa khai** rằng nó không với tới phần còn lại (nợ 31).

Nói thẳng cái đó ở đây, vì một change mang tên «nuôi Java» rất dễ bị đọc thành «giờ chấm được repo Java».
Đúng hơn là: **giờ chấm được phần chạy được của repo Java.**

## Open Questions

- Kho `.m2` **cũ dần** khi `pom.xml` đổi, và không gì phát hiện được — cùng khuôn với nợ 8.1 của nhịp hai
  (lock file Node đổi mà không cài lại). Chưa gặp thật.
- Đĩa: 248 MB mỗi repo Maven. Hai repo là ~0,5 GB trên 48 GB còn trống. Chưa phải vấn đề, nhưng nó tăng
  tuyến tính theo số repo và chưa ai đếm.
