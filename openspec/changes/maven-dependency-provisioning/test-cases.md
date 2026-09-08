> ⛔ Đọc `design.md` trước. Change này chạm **hai** thứ nguy hiểm: cấp phụ thuộc (ngoại lệ mạng duy
> nhất của sản phẩm) và **lệnh chạy test của repo đích**. Cái thứ hai mới là chỗ dễ hỏng âm thầm —
> engine thêm một cờ vào lệnh của repo đích là **đảo ngược maker–checker**, và không lưới nào hiện có
> bắt được.

## 0. Đếm bề mặt bằng máy — làm TRƯỚC khi viết ca (tầng 2)

- [ ] T0.1 Đếm mọi chỗ dựng argv cho podman, ghi lệnh + số vào `design.md`:
      `grep -c "podman" packages/harness/src/*.ts` · `grep -rn "'--network" packages/harness/src/`
- [ ] T0.2 Đếm mọi chỗ dựng lệnh test của repo đích (chỗ có thể lỡ tay chèn cờ):
      `grep -rn "test_cmd" packages/harness/src/ apps/web/src/`
- [ ] T0.3 Đếm mọi chỗ đặt biến môi trường cho container: `grep -rn "'-e'," packages/harness/src/`
      ⛔ Ba con số này là **mẫu số** của T5.3; đếm bằng trí nhớ là đúng cách bỏ sót đã xảy ra ở
      `response-secret-guard` (16 ca xanh, máy chủ thật không chặn gì).

## 1. Unit / hàm thuần

### `imageForEcosystem`
- [ ] T1.1 [Scenario]: GIVEN repo hệ `maven` WHEN hỏi ảnh THEN trả ảnh Maven đã ghim **digest**.
- [ ] T1.2 [Hồi quy Node]: GIVEN hệ `node` + `engines.node` 22 và 24 THEN trả **đúng hai ảnh cũ** —
      change này không được xê dịch đường Node một li.
- [ ] T1.3 [Biên]: hệ không có ảnh (`python`, `gradle`) THEN trả `null`, KHÔNG rơi về ảnh mặc định.
      ⛔ Rơi về ảnh Node cho repo Python là cách tạo ra một **chẩn đoán sai bệnh** — đúng cái nhịp
      một sinh ra để chống.

### `installCommand` (Maven)
- [ ] T1.4 [Scenario]: lệnh nạp là `mvn` của ảnh, **không** `./mvnw` (D1).
- [ ] T1.5 ⛔ [Không tự nới cổng]: lệnh KHÔNG chứa `-Dspotless.check.skip`, `-DskipTests`, hay bất kỳ
      cờ dạng `-D<gì đó>.skip`. **Đây là ca quan trọng nhất của cả change.**
- [ ] T1.6 [Biên]: chữ ký hàm nhận đúng số tham số đã khai — thêm được một cờ bật/tắt thì lưới đỏ
      (cùng khuôn đã dùng cho `installCommand(coLockFile)` của nhịp hai).

### `probeEnvForEcosystem`
- [ ] T1.7 [Scenario]: hệ Maven có kho ⇒ sinh `MAVEN_ARGS` chứa `-o` và `-Dmaven.repo.local=` trỏ
      **đường mount trong container**, không phải đường trên máy chủ.
- [ ] T1.8 [Hồi quy]: hệ Node ⇒ trả rỗng. Không thêm biến môi trường nào.
- [ ] T1.9 [Biên]: hệ Maven **chưa có kho** ⇒ trả rỗng — không đặt `-o` khi chưa nạp gì, vì offline
      cộng kho trống cho ra lỗi «artifact absent» tức **sai tên bệnh** (đã đo, mục 0.5 của tasks).

### `looksLikeEnvironmentFailure` (D6 — hai chiều, đây là cặp ca quan trọng nhất sau T1.5)
- [ ] T1.13 [Scenario]: log mang cổng chất lượng gãy **trước pha test** ⇒ trả lỗi môi trường/hợp đồng,
      thông điệp **nêu tên cổng**.
- [ ] T1.14 ⛔ [Chiều ngược — chống rộng tay]: log mang **biên dịch chính tệp probe** hỏng ⇒ trả `null`,
      tức engine VẪN sinh lại probe. Thiếu ca này thì bản vá D6 đổi một lỗi chẩn đoán lấy một lỗi tệ hơn:
      probe hỏng thật mà báo «lỗi môi trường» ⇒ người vận hành đi sửa cấu hình cho thứ không hỏng.
- [ ] T1.15 [Hồi quy]: bốn mẫu sẵn có của nhịp một (`EAI_AGAIN` · `EROFS` · `notsup` · không thấy bộ chạy)
      vẫn phân loại y như cũ — bảng mới **cộng thêm**, không sửa hàng cũ.
- [ ] T1.16 [Biên]: `BUILD FAILURE` trơ, không tên plugin nào ⇒ trả `null`. Không đoán.
- [ ] T1.17 ⛔ [D7 lỗ 2 — `F2` của làn `oapi-portal-be`]: log Maven gãy offline (`UnknownHostException` ·
      `Could not resolve dependencies` · `Could not transfer artifact`) ⇒ phân loại `thieu_phu_thuoc`.
      Hôm nay trả `null` ⇒ sinh lại probe. Ca này ĐỎ trên mã hiện tại.
- [ ] T1.18 [Hồi quy]: ba mã lỗi npm cũ vẫn ra `thieu_phu_thuoc` y như trước.

### `checkDependencies` (D7 lỗ 1)
- [ ] T1.19 [Scenario]: repo Maven **chưa có kho** ⇒ `thieu_phu_thuoc`, cách sửa nêu **bấm nút cài phụ
      thuộc**, ⛔ KHÔNG kê `npm ci` (án lệ 08/09: kê nhầm thuốc tệ hơn chỉ nêu triệu chứng).
- [ ] T1.20 [Scenario]: repo Maven **đã có kho có jar** ⇒ `null`, đi tiếp.
- [ ] T1.21 [Hồi quy]: `gradle`/`python` vẫn ra `he_chua_ho_tro` — change này chỉ nhận thêm Maven.
- [ ] T1.22 [Hồi quy Node]: bốn nhánh Node của `checkDependencies` không đổi hành vi.

### `repoStoreDir`
- [ ] T1.10 [Scenario]: hai repo khác nhau ⇒ **hai đường kho khác nhau**.
- [ ] T1.11 [Biên]: cùng một repo gọi hai lần ⇒ **cùng một đường** (kho sống qua nhiều lượt chấm).
- [ ] T1.12 [Đối kháng]: tên repo chứa dấu gạch chéo, hai chấm, khoảng trắng ⇒ đường vẫn nằm trong
      thư mục kho gốc. ⛔ Tên repo là **dữ liệu ngoài** (⛔C4); nó không được leo ra ngoài.

## 2. Tích hợp (đĩa, container)

### Nạp kho Maven
- [ ] T2.1 [Happy]: nạp xong ⇒ kho có jar, `checkDependencies` chuyển từ thiếu sang đủ.
- [ ] T2.2 [Quyền]: sau nạp, kho **đọc được bởi user thường** (D3). Kiểm bằng cách đọc thật một tệp
      dưới kho bằng quyền tiến trình test — ⛔ KHÔNG kiểm bằng `find | wc -l`: đo được số 0 sau khi
      container ghi vào là **phép đo không đọc được**, không phải số 0. Đã mù vì lỗi này **hai lần**.
- [ ] T2.3 [Hỏng]: trả quyền sở hữu thất bại ⇒ báo lỗi, KHÔNG báo nạp thành công.
- [ ] T2.4 [Hỏng]: nạp rc khác 0 ⇒ lỗi mang **log thật**, và kho không bị coi là hợp lệ.
- [ ] T2.5 [Dọn]: thư mục tạm được xoá kể cả khi lỗi; hai lượt song song không đụng nhau.
- [ ] T2.5b [D5]: nạp hỏng giữa chừng ⇒ kho THẬT **không bị chạm**; chỉ `<kho>.new` bị bỏ đi.
- [ ] T2.5c [D5]: nạp thành công ⇒ đổi tên đè xảy ra SAU khi đã `chmod a+rX`, không phải trước.

### Chạy probe với kho
- [ ] T2.6 [Happy]: container chạy probe mount kho `:ro` **và** `--network=none` cùng lúc.
- [ ] T2.7 ⛔ [Chỉ đọc]: mount kho mang cờ `ro`. Ca này ĐỎ nếu ai đó gỡ cờ để «cho tiện».
- [ ] T2.8 [Hồi quy Node]: argv container của repo Node **giống hệt** trước change — so nguyên mảng,
      không so từng cờ, vì so từng cờ thì cờ MỚI THÊM lọt qua.

## 3. Ca đối kháng & hồi quy

- [ ] T3.1 Đầu vào khuyết ở mọi tầng: `pom.xml` thiếu · hệ null · kho trỏ đường không tồn tại.
- [ ] T3.2 ⛔ **Repo đích khai `test_cmd` có sẵn `-Dmaven.repo.local`**: engine không được để hai
      nguồn cùng đặt một cờ rồi ra kết quả tuỳ thứ tự. Ca này khoá thứ tự ưu tiên đã khai ở `design.md`.
- [ ] T3.3 [Lịch sử] `&&` và `;` trong `test_cmd`: probe đỏ hợp lệ vẫn phải copy được XML. Ca này giữ
      lại vì lỗi ấy **đã ship ra hai đội và vào `main`** — nó không phải giả thuyết.
- [ ] T3.4 [Lịch sử] Mount `U` lên cây có `.git` ⇒ không được lặp lại; ca khoá rằng chỉ **kho** được
      mount `U`, không phải clone. (Sự cố prod 08/09: 78 mục đổi chủ sở hữu.)

## 4. Trục nhạy cảm

- [ ] T_bimat — kho `.m2` có thể chứa `settings.xml` mang **credential repo nội bộ**. Ca khoá: nội
      dung dưới kho KHÔNG chảy vào log nạp, thông điệp lỗi, sổ trên đĩa hay verdict; log chỉ nêu
      **số lượng + cỡ**, không nêu nội dung tệp.
- [ ] T_failclosed — nạp hỏng · kho không đọc được · quá giờ ⇒ KHÔNG cho ra PASS và không im lặng
      chạy tiếp với kho rỗng (rỗng cộng offline = lỗi sai tên bệnh, xem T1.9).
- [ ] T_cong — change KHÔNG thêm đường nào cho máy tự merge; nút cài phụ thuộc không đổi vai.
      ⛔ Và **nghĩa thứ hai của cổng ở change này**: engine không được tự tắt cổng chất lượng của
      **repo đích** (T1.5, T5.3) — hạ chuẩn của người khác cũng là một dạng máy tự nói CÓ.
- [ ] T_khongtincay — `pom.xml` của repo đích là dữ liệu: thẻ `name` cài chỉ thị, plugin khai đường
      lạ, tên artifact chứa ký tự shell ⇒ không đổi được hành vi engine, không thoát khỏi argv.
- [ ] T_hopdong — mọi export mới khai đủ trong `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## 5. Lưới quét source (tầng 3 — bắt buộc CẶP fixture)

- [ ] T5.1 `scanEcosystemImages`: hàng dùng thẻ ⇒ ĐỎ · toàn digest ⇒ XANH · bảng rỗng ⇒ ĐỎ.
      (Ca thứ ba là ca **chống xanh giả**: bảng rỗng làm mọi phép kiểm khác vô nghĩa.)
- [ ] T5.1b ⛔ `scanEcosystemDiagnosticParity` (D7): mọi hàng `ECOSYSTEMS` có `engineCapPhuThuoc: true`
      phải có mẫu lỗi mạng tương ứng. Cặp fixture: bảng có hệ thiếu từ vựng ⇒ ĐỎ · bảng khớp đủ ⇒ XANH.
      **Đây là lưới ràng cửa song sinh**, không phải lưới kiểm một hàm.
- [ ] T5.2 `scanNetworkExceptions`: mở rộng ca sẵn có — ngoại lệ mạng vẫn **chỉ** ở đường nạp, kể cả
      sau khi thêm nhánh Maven.
- [ ] T5.3 ⛔ `scanNoQualityGateBypass`: quét mọi chuỗi lệnh engine dựng, ĐỎ khi thấy `-D` kèm
      `.skip`, `-DskipTests`, hay `spotless`. Cặp fixture: file có cờ ⇒ ĐỎ · file sạch ⇒ XANH.
      **Mẫu số = T0.2 + T0.3**, không phải danh sách nhớ ra được.

## 6. Mutation (tầng 1 — chạy HAI lần, kiểm chứng đột biến đã vào đĩa)

- [ ] T6.1 M1 gỡ cờ `ro` khỏi mount kho ⇒ T2.7 đỏ.
- [ ] T6.2 M2 bỏ bước `chmod a+rX` ⇒ T2.2 đỏ.
- [ ] T6.3 M3 bỏ bước trả quyền sở hữu ⇒ T2.3 đỏ.
- [ ] T6.4 M4 thay digest bằng thẻ ⇒ T5.1 đỏ.
- [ ] T6.5 M5 **thêm** `-Dspotless.check.skip` vào lệnh engine ⇒ T1.5 **và** T5.3 đỏ.
      ⚠ Đây là đột biến **cộng thêm**: phép kiểm «chuỗi cũ còn trong file» sẽ báo động giả. So
      **toàn văn** trước/sau, trong `try`, và khôi phục trong `finally` — đúng lỗi đã làm hỏng cả
      vòng mutation của nhịp hai.
- [ ] T6.6 M6 cho `probeEnvForEcosystem` trả `MAVEN_ARGS` cả với hệ Node ⇒ T1.8/T2.8 đỏ.
- [ ] T6.7 M7 bỏ nhánh «kho rỗng thì không đặt `-o`» ⇒ T1.9 đỏ.
- [ ] T6.9 M9 thêm một hàng hệ mới vào `ECOSYSTEMS` mà KHÔNG thêm từ vựng lỗi ⇒ **T5.1b đỏ**. Đột biến
      này kiểm đúng cái đã trượt hôm nay: hiện tại làm vậy thì **không có gì đỏ**.
- [ ] T6.8b M8 nới mẫu D6 thành khớp mọi `BUILD FAILURE` ⇒ **T1.14 và T1.16 đỏ**. Đột biến này kiểm đúng
      thứ khó nhất: gác không chỉ phải BẮT, nó còn phải **không bắt quá tay**.
      (Ở nhịp hai, M7 tương đương cho **0 ca đỏ** vì gác ấy chưa ai viết lưới — nên ca này viết
      trước đột biến, không phải ngược lại.)
- [ ] T6.8 Hai vòng cho **kết quả trùng khớp**. Lệch ⇒ có ca flaky hoặc `sed` không vào được đĩa;
      dừng và tìm, ⛔ không lấy vòng đẹp hơn.

## 7. Chạy thật một lượt — ⛔ KHÔNG tick trước khi chạy

- [ ] T7.1 Deploy, rồi **bấm nút cài phụ thuộc cho `admin-be` qua sản phẩm**, không qua shell tay.
      Ca test chỉ kiểm bề mặt người viết nghĩ ra; máy chủ thật kiểm mọi bề mặt nó có.
- [ ] T7.2 Chấm một PR Java thật. **Trước khi đội đích sửa `test_cmd`**: Spotless chặn ⇒ engine phải
      báo đúng «lệnh test của repo đích thất bại», KHÔNG tự gỡ. Đó là hành vi ĐÚNG, không phải lỗi.
- [ ] T7.3 Sau khi đội đích sửa: chấm lại, xác nhận có XML, có finding thật.
- [ ] T7.4 Đo lại quyền trên kho prod sau lượt chấm thật: clone sạch, không mục nào đổi chủ sở hữu.

## 8. Kiểm tay

- [ ] T8.1 Log nút cài phụ thuộc đọc có hiểu không: nêu ảnh, cỡ kho, thời gian; người đọc phân biệt
      được «đang tải» với «đang treo».
