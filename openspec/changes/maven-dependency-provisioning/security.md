> Ô ✅ chỉ được tick khi trỏ được `file:line` của **cơ chế thật**. Change này chưa viết code, nên
> phần lớn ô còn ⚠️ — đó là trạng thái đúng, không phải thiếu sót. Ô nào đã có cơ chế **sẵn** thì
> trỏ ngay vào cơ chế ấy.

## S1. Bí mật & rò rỉ

- ⚠️ **S1.1 — kho `.m2` là bề mặt bí mật MỚI, và đây là rủi ro lớn nhất của change.**
  Repo Java doanh nghiệp thường dùng Nexus/Artifactory nội bộ; credential nằm ở `~/.m2/settings.xml`
  hoặc `settings-security.xml`. Change này tạo một thư mục **do CheckMate sở hữu** rồi **mount vào
  container chạy probe do model sinh**. Ba hệ quả phải chặn bằng cơ chế, không bằng ý định:
  1. Danh sách tệp chép vào bước nạp phải **đóng** (`pom.xml`, `.mvn/`) — ⛔ **không** chép
     `settings.xml` của máy chủ vào kho. Sao chép credential vào chỗ probe đọc được là tự tạo lỗ.
  2. Log nạp chỉ nêu **số lượng jar + cỡ + thời gian**, không liệt kê đường dẫn tệp, không echo
     nội dung. (Số đo đã dùng ở `design.md` đúng hình dạng này: `501 jar · 248 MB`.)
  3. Lỗi Maven mang stack trace có thể chứa URL repo nội bộ kèm user. Đường lỗi phải đi qua đúng
     cửa che sẵn có, không thêm cửa mới.
- ⚠️ **S1.2 — bề mặt CÔNG KHAI:** nếu bước nạp hỏng và thông điệp lỗi chảy vào verdict rồi vào
  comment PR thì nó ra **GitHub, không thu hồi được**. Ca `T_bimat` khoá chiều này; hiện chưa có
  cơ chế nên chưa được tick.
- ✅ **S1.3 — bản che phân biệt được hai giá trị:** dùng nguyên cơ chế che sẵn có, change không
  thêm kiểu che mới. Cơ chế: `packages/harness/src/secret-mask.ts`.

## S2. Danh tính, phiên, vai

- **N/A S2.1** — change không đọc danh tính. Bước nạp chạy dưới đúng tiến trình máy chủ đã có,
  không thêm đường xác thực nào.
- **N/A S2.2** — không thêm route.

## S3. Cổng & quyền của máy

- ✅ **S3.1 — change KHÔNG thêm đường nào cho máy tự merge.** Nó chỉ nạp phụ thuộc và mount kho;
  không chạm `apps/web/src/gate.ts` hay đường verdict.
- ⚠️ **S3.2 — ⛔ nghĩa THỨ HAI của cổng, và đây là phát hiện riêng của change này.**
  Số đo 08/09: Spotless làm `BUILD FAILURE` **trước khi** test chạy, nên mọi probe do CheckMate
  sinh đều chết ở cổng định dạng. Cờ `-Dspotless.check.skip=true` gỡ được — và **đúng vì thế nó
  nguy hiểm**: engine tự thêm cờ ấy là **đảo ngược maker–checker**. CheckMate được sinh ra để
  nói KHÔNG với code chưa đạt; một checker tự tắt cổng chất lượng của repo đích để probe của
  chính nó chạy được là checker đang **hạ chuẩn của người khác cho tiện việc mình**.
  Cơ chế phải có: requirement `Cấp phụ thuộc cho một hệ MUST NOT tự nới cổng của repo đích` +
  lưới `scanNoQualityGateBypass` (T5.3) + mutation M5 (T6.5). Chưa viết ⇒ chưa tick.
  Hướng xử đã chốt: **repo đích tự khai** cờ ấy trong `test_cmd` của `checkmate.yml`; đã báo hai
  đội kèm số đo, và họ quyết định, không phải CheckMate.

## S4. Dữ liệu không tin cậy & prompt injection

- ⚠️ **S4.1 — `pom.xml` là dữ liệu ngoài (⛔C4)** và change này **thực thi** nó, không chỉ đọc.
  Maven cho phép plugin chạy trong vòng đời build; `mvn dependency:go-offline` trên một `pom.xml`
  thù địch là **thực thi mã của repo đích ở bước có mạng**. Ba lớp giảm thiểu, tất cả đã có sẵn
  từ nhịp hai và change này giữ nguyên, không nới:
  - chạy trong container `podman` rootless, không phải trên máy chủ;
  - **ba trần tài nguyên** (bộ nhớ, CPU, số tiến trình) + trần thời gian;
  - thư mục làm việc là **bản chép danh sách đóng**, không phải cả clone.
  Còn hở: bước nạp **có mạng** (theo định nghĩa), nên một `pom.xml` thù địch có thể gọi ra ngoài.
  Đây là rủi ro **đã chấp nhận từ nhịp hai** cho `npm install`, không phải rủi ro mới — nhưng phải
  ghi ra, vì `pom.xml` chưa từng được rà dưới góc này. Ranh giới giữ được: repo đích đã là repo
  **do người của tổ chức trỏ vào**, không phải URL tuỳ ý từ Internet.
- ✅ **S4.2 — trả lời model được kiểm hình dạng trước khi tin:** change không thêm lời gọi model.

## S5. Sandbox & thực thi

- ✅ **S5.1** — probe vẫn chỉ chạy trong container sandbox; change **không** mở thêm bề mặt chạy.
  Kho mount vào là `:ro`, tức probe đọc được nhưng không ghi được (D2, T2.7).
- ⚠️ **S5.2 — dọn kể cả khi lỗi, và hai lượt song song không đụng nhau.**
  ⛔ Điểm khác nhịp hai: thư mục nạp là **tạm** (xoá sau), nhưng kho `.m2` là **bền** (sống qua
  nhiều lượt) ⇒ có cửa sổ **nạp lại trong khi một lượt chấm đang mount kho ấy**, và probe có thể
  đọc trúng jar tải dở rồi chết với lỗi nói về artifact — lại **sai tên bệnh**.
  Đã chốt ở `design.md` **D5**: nạp vào `<kho>.new`, xong mới **đổi tên đè**; container đang chạy
  giữ kho cũ qua inode nên chạy hết lượt với bản nguyên vẹn. Cơ chế chưa viết ⇒ ô còn ⚠️.

## S6. Tầng dữ liệu & quyền file

- ⚠️ **S6.1 — quyền file là chỗ change này ĐÃ gây sự cố thật, cùng khuôn.**
  Án lệ 08/09 trên prod: mount cả clone với cờ `U` khiến podman `chown -R` đệ quy chạm `.git`, hỏng
  giữa chừng, để lại **78 mục** thuộc subuid 100999. Sửa mất hai bước (`podman unshare chown` rồi
  `sudo chown`). Hai luật rút ra, phải thành cơ chế chứ không phải ghi nhớ:
  1. Chỉ **kho** được mount `U`, ⛔ không bao giờ mount cả clone (T3.4).
  2. Sau nạp **bắt buộc** trả quyền sở hữu rồi `chmod -R a+rX` (D3) — kho mode `0700` làm Maven
     báo «artifact absent», tức **sai tên bệnh**, đúng loại lỗi nhịp một sinh ra để diệt.
  Và một luật về **cách đo**: `find | wc -l` cho 0 sau khi container ghi vào là **phép đo không đọc
  được**, không phải số 0. Đã mù vì lỗi này hai lần trong một ngày. T2.2 khoá bằng đọc thật một tệp.
- ⚠️ **S6.2 — ghi atomic, file rách thì giữ bằng chứng:** kho `.m2` nạp dở (đứt mạng, hết giờ) là
  trạng thái **rách nhưng trông như đủ** — có thư mục, có vài jar. Nếu engine chỉ kiểm «thư mục kho
  tồn tại» thì kho dở sẽ được coi là hợp lệ, rồi probe chết với lỗi sai tên bệnh. Phải kiểm bằng
  đúng cửa của `probe-environment` sau khi nạp (tasks 3.2), không kiểm bằng sự tồn tại của thư mục.

## S7. Fail-closed & bất biến verdict

- ⚠️ **S7.1 — mọi nhánh lỗi mới dẫn về đâu.** Bốn nhánh mới: nạp rc khác 0 · trả quyền thất bại ·
  kho không đọc được · quá giờ nạp. Cả bốn phải dẫn về **lỗi môi trường có tên**, ⛔ không nhánh nào
  được «chạy tiếp với kho rỗng» — vì kho rỗng cộng cờ `-o` cho ra thông điệp Maven nói về artifact,
  làm người đọc đi chữa sai bệnh. T1.9 và `T_failclosed` khoá chiều này.
- ✅ **S7.2 — probe hỏng không bị đếm nhầm thành bằng chứng hồi quy:** cửa
  `looksLikeEnvironmentFailure` của nhịp một nằm **trên** đường phân loại và change này không đi
  vòng qua nó — `packages/harness/src/probe-preflight.ts`.

## S8. Leo quyền & cô lập (per-vector)

- ⚠️ **S8.1 — enumerate vectors tới mục tiêu «engine tự nới cổng repo đích».** Vá một đường không
  đóng cả lớp, nên phải đếm **bằng máy** chứ không bằng trí nhớ (T0.2, T0.3). Ba đường đã biết:
  lệnh nạp · `MAVEN_ARGS` đặt vào container probe · `test_cmd` engine dựng lại. Một cờ `-D...skip`
  chèn ở **bất kỳ** đường nào trong ba đường đều đạt mục tiêu ⇒ lưới T5.3 phải quét cả ba, và mẫu
  số của nó là con số đếm được, không phải danh sách nhớ ra.
- ⚠️ **S8.2 — test load-bearing HAI CHIỀU, không dismiss bằng «đã có lớp khác chặn».**
  Mọi gác của change có mutation tương ứng (T6.1–T6.7), chạy **hai vòng** và **kiểm chứng đột biến
  đã vào đĩa**. ⛔ M5 là đột biến **cộng thêm**, nên phép kiểm «chuỗi cũ còn trong file» báo động
  giả — đúng lỗi đã làm hỏng cả vòng mutation của nhịp hai; phải so **toàn văn** trong `try`.
- ⚠️ **S8.3 — đối xứng.** Thêm biến môi trường cho hệ Maven thì phải soi hệ Node: T1.8 và T2.8 khoá
  rằng argv container của repo Node **giống hệt** trước change, so **nguyên mảng** chứ không so
  từng cờ — so từng cờ thì cờ mới thêm lọt qua.

## Notes

**Rủi ro chưa nằm ở khung trên: change này dễ bị ĐỌC SAI hơn là chạy sai.**
Tên nó là «nuôi Java», và người đọc verdict sẽ hiểu thành «CheckMate chấm được repo Java». Sự thật
hẹp hơn: **chấm được phần chạy được**. Số đo: **14/26** lớp test của `admin-be` và **19/31** của
`portal-be` cần Docker mà sandbox `--network=none` không có. Verdict hiện **không khai** phạm vi
thực sự chấm được (nợ 31, còn mở, change này **không** đóng nó). Một cổng nói PASS trên 12/26 lớp
mà không nói ra tỉ lệ ấy thì đang để người đọc tự suy ra một điều sai — cùng họ với lỗi mà cả sản
phẩm này tồn tại để chống. Đã ghi ở `§ Sau-merge` của `tasks.md`; ghi lại ở đây vì nó là rủi ro
**an toàn của kết luận**, không chỉ là việc còn nợ.

**Đĩa là bề mặt từ chối dịch vụ chậm:** 248 MB mỗi repo Maven, tăng tuyến tính theo số repo, chưa
ai đếm và chưa có đường xoá. Đầy đĩa trên máy chủ prod thì sổ cái SQLite (`web-runs/`) là thứ hỏng
đầu tiên. Nợ 7.2.
