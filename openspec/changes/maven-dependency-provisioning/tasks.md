## 0. Đo trước khi viết — ĐÃ XONG, số ở `design.md`

- [x] 0.1 `./mvnw` trong container ⇒ hỏng SHA-256; tải chính tệp ấy trong chính ảnh ấy ⇒ sha **khớp đúng**.
      Bác bỏ hai giả thuyết dễ tin nhất (mạng hỏng · artifact hỏng) trước khi kết luận.
- [x] 0.2 Ảnh `maven:3.9-eclipse-temurin-21` — Maven **3.9.16**, Java **21.0.12**, digest `sha256:8f6ac126…`.
- [x] 0.3 Nạp kho bằng **đúng lệnh sẽ chạy**: 501 jar · 248 MB · 4560 tệp.
- [x] 0.4 Chạy offline, `.m2` **chỉ đọc**, `--network=none` ⇒ **BUILD SUCCESS, 9 giây**, XML sinh ra.
      Maven **không** đòi ghi vào `.m2` ⇒ không cần lớp phủ ghi tạm.
- [x] 0.5 Kho mode `0700` ⇒ Maven báo «artifact absent»; `chmod -R a+rX` ⇒ chạy đúng.
- [x] 0.6 `MAVEN_ARGS` truyền được cờ offline + đường kho ⇒ `test_cmd` repo đích không phải biết đường mount.
- [x] 0.7 Probe **cố tình đỏ**: `Tests run: 1, Failures: 1` · rc≠0 · **XML CÓ**. Xác nhận độc lập lần thứ
      ba cho hợp đồng runner (`;` đúng, `&&` sai).
- [x] 0.8 ⛔ Spotless chặn probe do máy sinh; `-Dspotless.check.skip=true` gỡ được — **nhưng đó là cờ của
      repo đích**, đã báo hai đội kèm số đo.

## 1. Luật

- [x] 1.1 `dependency-provisioning › Hệ Maven được cấp phụ thuộc bằng kho RIÊNG từng repo, mount chỉ đọc`
      — ADDED, 5 scenario.
- [x] 1.2 `dependency-provisioning › Cấp phụ thuộc cho một hệ MUST NOT tự nới cổng của repo đích` — ADDED,
      2 scenario. Đây là luật sinh ra từ phát hiện Spotless.
- [x] 1.3 `sandbox-isolation › Ngoại lệ mạng CHỈ cho bước cài` — **KHÔNG sửa**; bốn điều kiện áp nguyên.
- [x] 1.4 ⚠ **Câu trên SAI, sửa sau khi có `F2` của làn `oapi-portal-be`.** Đổi Maven thành hệ được hỗ trợ
      CÓ đổi hành vi đã khai: cửa sớm phải chuyển từ «hệ chưa hỗ trợ» sang kiểm kho. ⇒ requirement thứ ba
      `Hệ ĐƯỢC hỗ trợ thì cửa sớm kiểm KHO, và mỗi hệ phải có từ vựng lỗi của chính nó` — ADDED, 4 scenario.
- [x] 1.5 ⛔ Viết vào `dependency-provisioning` chứ không phải MODIFIED của `probe-environment`, vì
      capability ấy **chưa archive** nên chưa có trong `openspec/specs/`. Ba change đã merge còn treo hồ sơ
      (`probe-environment-preflight` 9 ô · `preflight-multi-ecosystem` 8 ô · `dependency-install-in-container`
      52 ô chưa tick) — cổng archive cấm tự tick, phải trình PO. Đã nêu.

## 2. Kiểu & hợp đồng

- [ ] 2.1 `IMAGE_BY_ECOSYSTEM` — bản đồ ảnh mở rộng: khoá theo **hệ + phiên bản chính**, không chỉ Node.
      Ghim digest, bảng đóng, mỗi hàng ghi ngày đo và phiên bản kiểm **bên trong** ảnh.
- [ ] 2.2 `INSTALL_COPY_FILES` theo hệ: Node giữ nguyên bốn tệp; Maven lấy `pom.xml` (+ `.mvn/` nếu có).
- [ ] 2.3 Kiểu kết quả nạp mang thêm **đường kho** đã tạo, để bước chạy probe mount đúng chỗ.
- [ ] 2.4 Khai mọi export mới vào bảng module `checkmate.yml` (⛔C5).

## 3. Engine

- [ ] 3.1 `dependency-install.ts` tách theo hệ: `installDependencies` chọn nhánh Node / Maven.
- [ ] 3.2 Nhánh Maven: chép danh sách đóng → nạp bằng **đúng lệnh sẽ chạy** → **trả quyền sở hữu** →
      **`chmod a+rX`** → kiểm lại bằng cửa của `probe-environment`.
- [ ] 3.3 Kho `.m2` đặt ở đường **ổn định theo repo** (không phải thư mục tạm) — nó sống qua nhiều lượt chấm.
- [ ] 3.3b Nạp vào `<kho>.new` rồi **đổi tên đè** (D5) — không ghi thẳng vào kho đang được mount.
- [ ] 3.4 `sandbox.ts`: container chạy probe mount kho `:ro` và đặt `MAVEN_ARGS`. ⛔ Chỉ khi repo thuộc hệ
      có kho — Node **không** đổi một cờ nào.
- [ ] 3.5 `ECOSYSTEMS`: Maven đổi `engineCapPhuThuoc` sang `true`.
- [ ] 3.5b ⛔ **D7 lỗ 1 — `checkDependencies` tách nhánh:** Maven ⇒ kiểm **kho của repo ấy có jar không**,
      thiếu thì `thieu_phu_thuoc` kèm cách sửa là **bấm nút cài phụ thuộc**; `gradle`/`python` ⇒ giữ
      `he_chua_ho_tro`. Đây là chỗ chữa `F2` của làn `oapi-portal-be` — chặn ở chặng 2/5, **trước** mọi lời
      gọi model, không đoán bệnh sau khi đã tiêu token.
- [ ] 3.5c ⛔ **D7 lỗ 2 — từ vựng lỗi mạng theo hệ:** mẫu bệnh 1 hiện toàn mã lỗi npm
      (`EAI_AGAIN`/`ENOTFOUND`/`getaddrinfo`); Maven nói `UnknownHostException`, `Could not resolve
      dependencies`, `Could not transfer artifact`. Thêm từ vựng **gắn vào hàng hệ sinh thái**, không rải
      regex rời.
- [ ] 3.6 ⛔ **KHÔNG** thêm cờ tắt cổng chất lượng của repo đích vào bất kỳ lệnh nào.
- [ ] 3.7 ⛔ **D6 — mở rộng `looksLikeEnvironmentFailure`**, KHÔNG mở cửa phân loại thứ hai ở `sandbox.ts`:
      bản dựng gãy ở một **cổng chất lượng chạy trước pha test** ⇒ xếp lỗi môi trường/hợp đồng, nêu tên cổng,
      **không sinh lại probe**. Neo vào **bảng đóng tên plugin**, ⛔ không vào chuỗi `BUILD FAILURE`.
- [ ] 3.8 Giữ nguyên đường sinh-lại cho ca bản dựng gãy ở **biên dịch chính tệp probe** — đó là lỗi của probe
      và sinh lại là hành vi ĐÚNG. Rộng tay ở 3.7 sẽ nuốt mất ca này.

## 4. Web

- [ ] 4.1 Nút «Cài phụ thuộc» dùng được cho repo Maven; log nêu ảnh, cỡ kho, thời gian.

## 5. Test

- [ ] 5.1 Ca khoá cho từng scenario (5 + 2).
- [ ] 5.2 **Cặp fixture** cho bản đồ ảnh mở rộng: hàng dùng thẻ ⇒ ĐỎ · toàn digest ⇒ XANH · rỗng ⇒ ĐỎ.
- [ ] 5.3 ⛔ Lưới **chống tự nới cổng**: quét lệnh engine dựng, ĐỎ nếu thấy cờ dạng `-D*.skip` hay
      `-Dspotless*`. Cặp fixture bắt buộc.
- [ ] 5.4 Ca **kho riêng từng repo**: hai repo ⇒ hai đường kho khác nhau.
- [ ] 5.5 Ca **hồi quy Node**: đường Node không đổi một nhánh nào, không thêm cờ nào.
- [ ] 5.5b ⛔ **Lưới ràng cửa song sinh D7:** mỗi hàng `ECOSYSTEMS` có `engineCapPhuThuoc: true` PHẢI có
      mẫu nhận dạng lỗi mạng tương ứng. Lưới đối chiếu **hai danh sách**, đỏ khi lệch — vì thêm một hàng mà
      quên từ vựng thì hiện tại **không có gì đỏ**.
- [ ] 5.6 **Mutation hai chiều, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả.

## 6. Trước merge

- [ ] 6.1 `npx tsc --noEmit && npm test`.
- [ ] 6.2 Deploy, rồi **bấm cài phụ thuộc cho `admin-be` qua sản phẩm** (không qua shell tay).
- [ ] 6.3 Chạy lượt chấm code thật trên một PR Java **sau khi đội đích đã sửa `test_cmd`** — chưa sửa thì
      Spotless vẫn chặn, và **sau 3.7 thì engine phải nêu đúng tên cổng đã chặn, không sinh lại probe**.

## § Sau-merge — nợ có tên

- [ ] 7.1 **Kho `.m2` cũ dần khi `pom.xml` đổi**, không gì phát hiện được — cùng khuôn nợ 8.1 của nhịp hai.
- [ ] 7.2 **Đĩa**: 248 MB mỗi repo Maven, tăng tuyến tính, chưa ai đếm và chưa có đường xoá.
- [ ] 7.3 **Nợ 31 vẫn mở và change này KHÔNG đóng nó**: verdict chưa khai rằng lượt chấm không với tới
      **14/26** (`admin-be`) và **19/31** (`portal-be`) lớp test cần Docker. Một change tên «nuôi Java» rất
      dễ bị đọc thành «giờ chấm được repo Java»; đúng hơn là **chấm được phần chạy được**.
