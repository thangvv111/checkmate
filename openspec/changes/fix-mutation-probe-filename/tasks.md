## Bệnh

Cửa **đột biến** (`mutationGate`) là thứ phân biệt *probe đo được* với *probe trang trí*: nó đảo hiện thực
rồi hỏi «probe này có đỏ không». Probe không đỏ khi hiện thực bị đảo thì nó không chứng minh gì.

Cửa ấy ghi bản đột biến ra file tên `dot_bien_<probe.id><probe_ext>` — **bỏ qua `runner.probe_file`**,
trong khi probe chính ở cùng file dùng `runner.probe_file ?? checker_probe + probe_ext`.

⛔ Đây là **cửa song sinh thứ mười** của repo: hai chỗ cùng quyết «file probe tên gì», một chỗ tôn trọng
cấu hình repo đích, chỗ kia tự đặt.

**Hậu quả, đo bởi làn `oapi-admin-be` trên repo Java thật** — nơi tên file PHẢI trùng tên class:

| class trong bản đột biến | chuyện gì xảy ra |
|---|---|
| `public class CheckerProbeTest` | javac từ chối «should be declared in a file named …» ⇒ biên dịch gãy ⇒ không XML |
| `class CheckerProbeTest` (package-private) | biên dịch OK, nhưng `-Dtest=dot_bien_p1` không khớp class nào ⇒ surefire chạy **0 test** ⇒ `failIfNoTests=false` cho rc 0 ⇒ vẫn không XML |

Cả hai nhánh về **cùng một chỗ**: `kq.probes.length === 0` ⇒ `chayVaHoiCoDo` trả `false` ⇒ cửa kết luận
**«probe không cắn»** — cho **MỌI** probe của repo Java.

⇒ Cửa quan trọng nhất của repo **im lặng không chạy**, và **verdict không nói ra điều đó**.

**KHÔNG đổi luật đang khai.** `probe-handover › danh sách lý do vứt probe là danh sách ĐÓNG` và ranh giới
«không chạy được KHÔNG tính là đỏ» giữ nguyên — change chỉ làm bản đột biến **chạy được**, để câu trả lời
«không đỏ» có nghĩa. Dùng schema `checkmate-fix-bug`.

## Bản vá

Dùng lại **chính `fileProbeMoi`** — tên đã tôn trọng `runner.probe_file`. An toàn vì bản đột biến ghi vào
`sbM`, một **Sandbox RIÊNG**, nên không đụng file probe chính.

Hai hướng khác đã cân và bỏ:
- *đổi tên class bên trong bản đột biến cho khớp tên file* — đòi CheckMate hiểu cú pháp từng ngôn ngữ;
- *lấy gốc tên `probe_file` rồi ghép tiền tố* — vẫn sinh một tên thứ hai, tức giữ nguyên cửa song sinh.

Hướng đã chọn **xoá hẳn** cửa song sinh: chỉ còn **một** biểu thức quyết tên file probe.

## Việc

- [x] 1.1 `skill-code.ts` — bản đột biến dùng `fileProbeMoi`; chú thích ghi cả số đo và lý do.
- [x] 1.2 Lưới `scanMutationProbeName` + **cặp fixture**: tự đặt tên ⇒ ĐỎ · dùng `fileProbeMoi` ⇒ XANH ·
      mỏ neo biến mất ⇒ ĐỎ.
- [x] 1.3 Ca **đếm bằng máy**: đúng **2** chỗ ghi probe trong `skill-code.ts`, và **cả hai** dùng
      `fileProbeMoi`. Số chỗ ghi đổi thì lưới đỏ và người sửa phải đọc lại.
- [x] 1.4 **Mutation, chạy HAI lần**: khôi phục tên `dot_bien_…` ⇒ **1 ca đỏ**, khớp cả hai vòng.
- [x] 1.5 `npx tsc --noEmit && npm test`.
- [ ] 1.6 Sau khi máy chủ chạy được hệ Java: chấm thật một repo Java và xác nhận cửa đột biến **có** chạy.

## § Sau-merge — nợ có tên

- [ ] 2.1 ⛔ **Verdict không khai cửa đột biến có chạy được hay không.** Hôm nay «không đỏ» và «không chạy
      được» ra cùng một kết luận trong dữ liệu, và người đọc verdict không phân biệt được. Chính là khuôn
      của nợ 30: bằng chứng vắng mặt bị đọc thành bằng chứng phủ định. Đáng khai thành một trường riêng.
- [ ] 2.2 **`test_sample` chọn IM LẶNG theo thứ tự cây git.** Làn `oapi-admin-be` chỉ ra: repo không khai
      `test_sample` thì `resolve(TEST_SAMPLE_CANDIDATES, …, 'single')` lấy file khớp **đầu tiên theo bảng
      chữ cái**. Hôm nay nó trúng đúng file họ muốn — **vì bảng chữ cái, không vì thiết kế**. Một
      `nen/AaaTest.java` dùng Testcontainers sẽ thành khuôn cho model bắt chước, và nó **đổi im lặng**.
      Ít nhất phải ghi ra đã chọn file nào và vì sao (engine đã làm thế cho nguồn spec — cùng khuôn).
