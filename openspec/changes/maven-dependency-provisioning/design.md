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

## Vế phụ: xác nhận độc lập hợp đồng runner — và một đính chính

Cùng phép đo trên cho **lần thứ ba, trên máy thứ ba**, cùng một kết luận đã có từ `oapi-admin-be` và
`oapi-portal-be`: **bộ chạy test ghi báo cáo XONG rồi mới thoát khác 0.** Nên `;` đúng và `&&` sai — nay
đo được trong chính môi trường CheckMate, không chỉ trên máy dev của họ.

⚠ **Đính chính, đo lại trên đĩa 08/09.** Bản trước của mục này kê `portal-be` còn **ba** chỗ phải sửa,
trong đó có `&&` → `;`. Sai: chỗ ấy đã lên trunk từ trước.

```
git -C portal-be rev-parse --short origin/main        -> e8be8b6
git show origin/main:checkmate.yml | grep test_cmd    -> '... .xml; ./mvnw -o -q test ...; cp ...'
                                                                                     ^ dấu ; ĐÃ có
git merge-base --is-ancestor 80d8a6c origin/main      -> đúng, 80d8a6c là tổ tiên
```

⇒ Còn **hai** chỗ: `./mvnw -o` → `mvn` (bỏ luôn `-o`, vì CheckMate cấp cờ ấy qua `MAVEN_ARGS`), và thêm cờ
bỏ qua kiểm định dạng. Em đọc một SHA cũ và kê thừa một việc cho đội khác — ghi lại vì bảng «còn phải sửa
gì» gửi sang đội bạn là thứ họ hành động theo, không phải thứ họ đọc cho biết.

Kèm một đính chính quy chiếu của làn `oapi-portal-be`: `OAPI-58-rm-f-bao-cao-cu` (`portal-be#16`, đã đóng)
là issue của `rm -f`, **không phải** của `&&`; vế `&&` đi qua change `sua-chuoi-lenh-cham`. Hai việc khác
nhau, đừng gộp khi tra lại sau.

## Rủi ro nhận về khi bỏ trình bao bọc: phiên bản Maven do ẢNH quyết

Làn `oapi-portal-be` khai đúng cái giá của D1, và nó phải nằm ở đây chứ không chỉ trong hộp thư: `AD-24`
mục 6 của repo họ ghim trình bao bọc với lý do *«không cần `mvn` trên PATH»*. Bỏ nó trong chuỗi chấm là **cố
ý đi lệch** khỏi luật ấy. Cái giá: từ lúc đó, **phiên bản Maven mà CheckMate chạy do ảnh của CheckMate
quyết, không do repo đích ghim**. Nay là `3.9.16`, khớp bản wrapper — nhưng ảnh trôi thì **không cổng nào ở
repo đích đỏ**, vì repo đích không còn tiếng nói ở khâu ấy.

Đó là lý do bản đồ ảnh **ghim digest** chứ không ghim thẻ (T5.1, mutation M4): thẻ `3.9-eclipse-temurin-21`
trôi lặng lẽ, digest thì không. Ghim digest không xoá được rủi ro — nó chỉ biến một thay đổi vô hình thành
một dòng diff phải có người duyệt.

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

## D6. Cổng repo đích chặn probe: xếp là lỗi hợp đồng, KHÔNG sinh lại probe

`oapi-portal-be` bổ phép đo còn thiếu, và nó lộ ra một lỗ trong chính nhịp một. Phép đo của họ trước đó
dùng một test **cố tình đỏ nhưng đúng định dạng** ⇒ Maven chạy tới pha test, ghi XML, rồi thoát khác 0.
Phép đo mới dùng probe **sai định dạng** ⇒ Spotless gãy ở pha trước test ⇒ **không có XML nào cả**. Cùng
một triệu chứng, hai bệnh khác nhau, và `;` chỉ chữa được bệnh thứ nhất.

Truy đường trong mã:

```
sandbox.ts:411   !existsSync(out)  ->  loiThu = "Runner không xuất JUnit XML cho ..."
skill-code.ts:710  looksLikeEnvironmentFailure(loiThu)  ->  null   <- KHÔNG khớp mẫu nào
skill-code.ts:721  sinh lại probe (tối đa 2 lần), mỗi lần một lời gọi model
skill-code.ts:720  lần 2 hỏng  ->  "Probe không thu thập được sau 2 lần sinh: ..."
```

⛔ Nói chính xác mức độ, không thổi lên: **fail-closed vẫn giữ** — đường này `throw`, không có nhánh nào
biến nó thành PASS, nên ⛔C2 không bị vi phạm. Cái hỏng là **chẩn đoán** và **chi phí**: engine kê tên bệnh
là «probe không thu thập được» trong khi bệnh là «cổng chất lượng của repo đích chặn», và nó trả hai lời gọi
model cho một nguyên nhân mà sinh lại probe không thể sửa. Đây đúng con bệnh nhịp một sinh ra để diệt, sống
sót trên một bề mặt chưa ai viết ca — cùng khuôn với `response-secret-guard` (16 ca xanh, máy chủ thật không
chặn gì).

**Ranh giới phân biệt — chỗ dễ làm ẩu nhất của cả change.** Hai ca cùng cho «bản dựng thất bại, không có
XML», và phải đi hai đường ngược nhau:

| bản dựng gãy ở | ai sai | engine phải làm |
|---|---|---|
| biên dịch **chính tệp probe** | probe do model sinh | **sinh lại** — hiện đang đúng, không được đụng |
| một cổng chạy **trước** pha test (định dạng, kiểm tĩnh) | hợp đồng repo đích | **dừng, nêu tên cổng**, không sinh lại |

Rộng tay ở mẫu nhận dạng sẽ nuốt mất ca sinh-lại-đúng, tức đổi một lỗi chẩn đoán lấy một lỗi tệ hơn: probe
hỏng thật mà engine bảo «lỗi môi trường» thì người vận hành đi sửa cấu hình cho một thứ không hỏng. Nên mẫu
phải neo vào **tên plugin gãy** chứ không vào chuỗi `BUILD FAILURE` — và danh sách plugin của cổng chất
lượng là **bảng đóng, ghi rõ**, không phải regex đoán.

Sửa ở `looksLikeEnvironmentFailure`, không ở `sandbox.ts`: chỗ ấy đã là **một cửa duy nhất** cho mọi phân
loại lỗi môi trường, và thêm cửa thứ hai là đúng cách sinh ra cửa song sinh — thứ repo này đã bắt được 10 lần.

## D7. Bệnh «không có mạng» hiện chỉ nói TIẾNG npm — và bảng hệ sinh thái mở rộng làm lộ ra điều đó

Làn `oapi-portal-be` ghi một finding (`F2`) khi bỏ `-o` khỏi `test_cmd` của họ: nếu `MAVEN_ARGS` **không**
mang `-o`, container `--network=none` làm Maven gãy ở khâu giải phụ thuộc ⇒ không có XML ⇒ lại rơi vào đúng
con bệnh `D6`. Họ khai đúng ranh giới: **repo họ không có cổng nào canh được việc đó**, nó phụ thuộc phía
CheckMate.

Em đã trả lời họ rằng `T3.2` khoá tình huống ấy. ⚠ **Câu trả lời đó THIẾU.** `T3.2` khoá ca *hai nguồn cùng
đặt một cờ*; nó không nói gì về ca *chưa có kho nên không đặt cờ nào*. Đo lại trong mã thì ra hai lỗ, không
phải một:

**Lỗ 1 — cửa sớm (`checkDependencies`).** Nhánh `he !== 'node'` hiện trả `he_chua_ho_tro` cho mọi hệ ngoài
Node. Change này biến Maven thành hệ **được hỗ trợ**, nên nhánh ấy phải tách: Maven ⇒ kiểm **kho của repo
ấy có tồn tại và có jar không**, thiếu thì `thieu_phu_thuoc` kèm cách sửa là **bấm nút cài phụ thuộc**;
`gradle`/`python` ⇒ giữ nguyên `he_chua_ho_tro`. Đây mới là chỗ chữa `F2` cho đúng: chặn ở **chặng 2/5,
trước mọi lời gọi model**, chứ không phải đoán bệnh sau khi đã tiêu token.

**Lỗ 2 — bộ phân loại nói sai thứ tiếng.** Mẫu của bệnh 1 hiện là:

```js
/\bEAI_AGAIN\b|\bENOTFOUND\b|getaddrinfo/i     // <- toàn mã lỗi của npm/Node
```

Maven gãy offline thì nói `UnknownHostException`, `Could not resolve dependencies`, `Could not transfer
artifact`. **Không mẫu nào khớp** ⇒ lại rơi vào đường sinh lại probe. Tức nhịp một khai bệnh 1 như một
**khái niệm** («không có mạng để tải gói») nhưng hiện thực nó bằng **từ vựng lỗi của đúng một hệ**.

⛔ Đây là **cửa song sinh** đúng nghĩa, lần thứ 11 trong repo này, và nó có hình dạng nguy hiểm hơn mười lần
trước: hai bản thể không nằm ở hai file để ai đó đọc thấy lệch. Chúng nằm ở **bảng `ECOSYSTEMS`** (khai hệ
nào được hỗ trợ) và **chùm regex trong `looksLikeEnvironmentFailure`** (biết đọc lỗi của hệ nào). Thêm một
hàng vào bảng mà không thêm từ vựng thì **không có gì đỏ** — hệ mới lặng lẽ mất khả năng chẩn đoán mà bảng
vừa hứa cho nó.

⇒ Ràng hai thứ bằng máy: mỗi hàng `ECOSYSTEMS` có `engineCapPhuThuoc: true` **phải** có mẫu nhận dạng lỗi
mạng tương ứng, và một lưới đối chiếu hai danh sách. Không phải một chú thích «nhớ thêm regex».

*Ghi nhận: `F2` là finding của làn `oapi-portal-be`, không phải của em. Em đo phía họ đủ kỹ để bảo họ bỏ
`-o`, nhưng không đo phía mình đủ kỹ để thấy việc bỏ ấy dời rủi ro sang đâu — và còn trả lời họ bằng một ca
test không phủ đúng thứ họ hỏi. Kiểu sai này (yên tâm hoá một câu hỏi đúng bằng một quy chiếu gần đúng) tệ
hơn im lặng, vì nó làm bên kia thôi tìm.*

## Trạng thái `test_cmd` hai repo Java — đo trên đĩa 08/09

| repo | SHA `main` | chuỗi chấm | còn thiếu |
|---|---|---|---|
| `portal-be` | `a472db8` | `mvn -B -q -Dspotless.check.skip=true test …` | — xong |
| `admin-be` | `2d0909b` | còn `./mvnw -o -q test …` | `mvn` · cờ bỏ qua kiểm định dạng |

`portal-be` bỏ đúng ba chỗ đã thống nhất, **không** `-o`, **không** `-Dmaven.repo.local` — ranh giới «repo
khai chạy cái gì, CheckMate khai kho ở đâu» giữ nguyên vẹn. `admin-be` chưa sửa, và đó là trạng thái bình
thường: chưa sửa thì lượt chấm phải **báo đúng tên cổng đã chặn** (D6), không phải chạy được nhờ engine tự gỡ.

### Một xác nhận cho lựa chọn neo-theo-tên-plugin của D6

Làn `oapi-portal-be` báo spine của đội họ **tự mâu thuẫn về pha Spotless**: bảng số ghim nói `validate`,
bảng tóm tắt nói `verify`, và cổng kiểm của họ chỉ đọc bảng số nên **xanh trong khi văn bản sai**.

CheckMate không đọc spine của đội đích, nên việc này không chạm em trực tiếp. Nhưng nó xác nhận một lựa chọn
của `D6` mà lúc viết em mới chỉ lập luận: mẫu nhận dạng neo vào **tên plugin gãy**, ⛔ không neo vào **pha**.
Nếu neo theo pha thì hôm nay đã có một repo mà pha thật khác pha khai — và bộ phân loại sẽ sai theo một nguồn
mà **CheckMate không kiểm soát và không có quyền sửa**. Tên plugin là thứ hiện ra trong log của chính lượt
chạy; pha là thứ phải đi hỏi tài liệu bên khác.

## D8. Cờ trong `test_cmd` THẮNG cờ CheckMate cấp — nên xung đột phải bị CHẶN, không được đoán

Câu hỏi `T3.2` («repo đích khai sẵn `-Dmaven.repo.local` thì sao») lúc viết ca test em ghi là «khoá thứ tự
ưu tiên đã khai ở design» — nhưng design chưa khai gì cả. Đo trên máy chấm 08/09:

```
MAVEN_ARGS="-o -Dmaven.repo.local=/m2"  mvn -X validate                          -> Using local repository at /m2
MAVEN_ARGS="-o -Dmaven.repo.local=/m2"  mvn -X validate -Dmaven.repo.local=/khac -> Using local repository at /khac
```

**Cờ dòng lệnh thắng biến môi trường.** Nên một repo đích khai `-Dmaven.repo.local` trong `test_cmd` sẽ trỏ
Maven vào đường không tồn tại trong container; cộng `--network=none`, Maven báo «artifact absent» — lại đúng
con bệnh **sai tên bệnh**.

⇒ Cửa sớm CHẶN CỨNG, không cảnh báo rồi chạy tiếp. Đây là lý do em bảo hai đội **bỏ cả `-o`** chứ không chỉ
bỏ `-Dmaven.repo.local`: `-o` một mình vô hại hôm nay, nhưng nó khai rằng repo đang tự lo phần kho — và repo
tự lo thì khi CheckMate đổi đường mount, **không cổng nào ở repo đỏ**. `portal-be` đã bỏ cả hai (`a472db8`).

## Cái change này KHÔNG làm

⚠ **Hai con số dưới đây là ẢNH CHỤP ngày 08/09, không phải hằng số — và chúng TĂNG.** Làn `oapi-portal-be`
báo `OAPI-51` đang bổ thêm ba lớp cổng khởi động đọc `pg_catalog`, nên `19/31` sẽ lớn hơn khi change ấy
đóng. Ai đọc mục này sau đó mà lấy nguyên con số là đang trích một phép đo đã hết hạn. Chỗ đúng để biết tỉ
lệ hiện hành là **chính verdict** — và verdict chưa khai nó, đó là nợ 31.

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
