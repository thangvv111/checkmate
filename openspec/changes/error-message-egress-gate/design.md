# Design — error-message-egress-gate

## Context

Đo 03/09 trên `main` (`70f8022`), 180 thông điệp lỗi thật trích từ 57 lượt chấm trong `runs/`:

```
Khuon TIEN TO (^AssertionError | ^expected ... | ...)   phu 92%
   -> nhung `^(AssertionError|assert )` mot minh chiem 76%, va no cho qua
      TOAN BO phan con lai nguyen van:
        AssertionError: expected undefined to be 'Nguoi tao de xuat khong duoc tu phe d...'
        AssertionError: expected [ { id: 25, ...(9) }, ...(24) ] to have a length of 20

Khuon CAU TRUC + O GIA TRI (cua o = hinh dang an toan)
   giu NGUYEN VEN   124  69%
   got MOT PHAN      28  16%   <- hau het la mang so
   NGOAI cau truc    28  16%   <- hau het la loi nghiep vu do code repo dich nem
```

Ba chỗ phát ra ngoài, và một chỗ **không** có ngữ cảnh để đối chiếu:

| chỗ phát | file | có `TargetInfo` (diff/source)? |
|---|---|---|
| log sự kiện | `skill-code.ts:569, 901` | **có** (`t`) |
| prompt gửi model | `skill-code.ts:627` | **có** (`t`) |
| comment pull request | `gate.ts:333` `dongFinding(f: Finding)` | **KHÔNG** — chỉ nhận `Verdict` |

## Goals / Non-Goals

**Goals**
- Bí mật của repo đích không rời máy chủ qua thông điệp lỗi.
- Người đọc vẫn biết **bản chất** lỗi — không tái tạo án lệ «vứt `loiThu`».
- Phép so vân tay và nhãn phân loại KHÔNG đổi.

**Non-Goals**
- KHÔNG chặn ở sổ SQLite và màn hình run (PO chốt 03/09 — nội bộ, sau đăng nhập).
- KHÔNG dò secret theo hình dạng → nợ #15, vai cảnh báo.
- KHÔNG đụng `errorFingerprint` / `tightFingerprint` / `classifyByMachine`.

## Decisions

### D1 — Cấu trúc + ô giá trị, KHÔNG khớp tiền tố

Số đo bác bỏ hướng tiền tố: `^(AssertionError|assert )` phủ 76% và chặn được **0**. Một cổng như thế là
danh sách cho phép về hình thức, danh sách cấm về thực chất — nó cho qua mọi thứ đứng sau một từ khoá đã
biết, mà «mọi thứ đứng sau» chính là chỗ giá trị nằm.

Cổng phải tách dòng thành cấu trúc + ô, phát cấu trúc, và bắt **từng ô** tự qua cửa.

### D2 — Cửa ô ba tầng (PO chốt 03/09)

| tầng | cho qua | vì sao an toàn |
|---|---|---|
| 1. hình dạng | số ≤ N chữ số · `undefined`/`null`/`true`/`false`/`NaN` · tên kiểu · tập rỗng | không mang được bí mật |
| 2. đệ quy | mảng/object mà **mọi** phần tử qua cửa | an toàn theo quy nạp |
| 3. đối chiếu nguồn | chuỗi tự do **đã có mặt ở chính bề mặt sắp phát ra** | nhắc lại thì không rò thêm |

Tầng 2 lấy lại phần lớn 16% «gột một phần» (mảng số). Tầng 3 lấy lại phần lớn 16% «ngoài cấu trúc» (lỗi
nghiệp vụ do code PR ném — chuỗi ấy nằm trong source).

Tầng 3 là chỗ đắt và cũng là chỗ đúng: nó là danh sách cho phép **theo nguồn**, cùng khuôn `isNewRule` —
quyết bằng «có ở đó hay không», không bằng hình dạng.

### D2b — Nguồn đối chiếu KHÁC NHAU theo bề mặt (PO chốt 03/09, gộp S1.3 vào change)

Bản đầu của tầng 3 dùng **một** nguồn cho cả ba bề mặt: «diff hoặc source của PR». Soi security bắt được lỗ:
lập luận «đã công khai trong PR» đúng cho comment, **sai cho prompt gửi model** — model không đọc repo, nó
chỉ biết đúng những gì ta gửi.

Đo trên code (`skill-code.ts`) thì bức tranh cụ thể hơn và chỗ hở hẹp hơn tưởng:

```
promptPhanTich  (dong 325-386)  rao('DIFF_PR', t.diff)   <- diff DA toi model
promptSinhCode  (dong 387-415)  KHONG mang diff
callCode                        stateless, nhung cung mot luot cham
                                thi model DA nhan diff qua buoc phan tich
```

Nên chuỗi có trong `t.diff` mà đi sang model qua `loiThu` **không đến nơi mới**. Chỗ thật sự hở là phần
**model chưa thấy**: diff bị cắt theo `TRAN_DIFF = 120_000`, file `ngoaiTamNhin`, và source không nằm trong
diff.

Nguyên tắc chốt: **nguồn đối chiếu là thứ BỀ MẶT ĐÓ ĐÃ CÓ**, không phải «PR nói chung».

| bề mặt | nguồn đối chiếu | lấy từ đâu |
|---|---|---|
| comment PR · log | diff + source của PR | `t.diff`, `t.specs`, nội dung file repo đích |
| prompt gửi model | các khối **đã rào vào prompt** của lượt này | `t.diff` (bản đã cắt — chính là thứ vào `promptPhanTich`), `t.specs`, `t.testMau`, `t.apiDoc` |

Chi phí gần bằng không: những khối ấy đã nằm sẵn trong `TargetInfo` và chính là thứ `promptPhanTich` rào.
Cái phải cẩn thận là **không** đem source đầy đủ làm nguồn cho bề mặt model, và **không** đem diff chưa cắt.

Cách này biến S1.3 từ «chỗ hở phải chấp nhận» thành **một tham số của cổng**: cổng nhận
`(message, nguồn-đã-đến-bề-mặt-này)`.

### D3 — Lọc SỚM, lưu HAI bản (chỗ khó nhất của change)

`dongFinding` ở `gate.ts` chỉ nhận `Finding`, không có `TargetInfo` — nên tại chỗ dựng comment **không thể**
chạy tầng 3. Hai đường:

| | (a) lọc sớm, lưu hai bản | (b) truyền diff xuống `gate.ts` |
|---|---|---|
| chạy ở đâu | `skill-code.ts` lúc dựng evidence, có `t` | `server.ts` phải nạp lại diff lúc render |
| chi phí | một lần mỗi finding | mỗi lần render comment, kể cả render lại verdict cũ |
| verdict cũ trong sổ | không có bản an toàn → xử theo D4 | phải fetch lại diff của PR đã đóng |
| tầng kiến trúc | đúng: engine biết repo đích, `apps/web` thì không | sai: kéo dữ liệu repo đích vào tầng web |

Chọn **(a)**. `EvidenceTestRun` thêm một trường mang bản đã lọc; `actual` giữ nguyên văn cho sổ, UI và vân
tay. Đây là thêm trường **optional**, verdict cũ đọc lại vẫn hợp lệ.

### D4 — Verdict cũ không có bản an toàn → fail-closed, KHÔNG fallback về nguyên văn

Verdict ghi trước change này không mang trường mới. Khi render comment cho một verdict như thế, cám dỗ là
rơi về `actual` — và đó chính là lỗ hổng đang vá, chỉ khác là nó mở lại bằng một dòng fallback.

Fail-closed (⛔C2): không có bản đã lọc → comment chỉ nêu **loại và độ dài**, không nêu nội dung. Verdict cũ
vẫn đọc được đầy đủ ở màn hình run (nội bộ), nên không mất dữ liệu — chỉ mất phần chi tiết trên bề mặt công
khai của những lượt chấm cũ.

### D5 — Phần thay thế phải nói được BẢN CHẤT

Án lệ trong chính file này (`skill-code.ts`, đoạn `loiHaTang`): `loiThu` từng bị vứt trọn, và hạ tầng test
hỏng bị báo thành «probe hỏng» — người đọc log đi sửa probe trong khi nguyên nhân ở môi trường. Comment tại
chỗ gọi đó là *«đúng họ lỗi báo-sai-bản-chất mà repo này sinh ra để chống»*.

Nên ô bị gột KHÔNG được thay bằng chuỗi trống hay một nhãn trơ. Thay bằng **loại + độ dài**
(`<chuỗi 38 ký tự>`), và với dòng ngoài cấu trúc thì vẫn giữ **lớp lỗi** (`ValueError: <…>`) — đủ để phân
biệt «hạ tầng hỏng» với «probe sai», là ranh giới mà án lệ nói tới.

### D6 — Hàm thuần, đặt ở tầng nền dùng chung

Cổng là hàm thuần: `(message, nguồn đối chiếu) → chuỗi phát ra`. Không I/O, không trạng thái, nên mỗi tầng
cửa và mỗi khuôn là một ca test.

Đặt ở `packages/shared/src/` — `apps/web` và `packages/harness` đều dùng, và lưới `kien-truc-tang` cấm app
import engine (án lệ `declarable-process-docs`: hợp đồng nguồn spec phải dời xuống tầng nền vì lý do y hệt).

### D7 — Dự đoán TRƯỚC khi đo lại

Sau khi có đủ ba tầng, đo lại trên cùng 180 thông điệp. **Dự đoán: giữ nguyên vẹn ≥ 90%** (69% hiện tại +
phần lớn 16% mảng số qua tầng 2 + phần lớn 16% lỗi nghiệp vụ qua tầng 3). Sai thì ghi rõ sai ở đâu — bài học
`verdict-contract` §4.4 và `probe-classification` §4.4 (lần trước sai vì đếm nhầm, không phải vì nội dung).

Phép đo tầng 3 trên dữ liệu cũ có một hạn chế phải nói trước: `runs/` không lưu diff của lượt chấm, nên
phải xấp xỉ bằng source repo đích hiện có. Con số đo được là **cận trên** của tầng 3.

## Architecture

- `packages/shared/src/<cổng>.ts` — hàm thuần + cửa ô ba tầng.
- `packages/harness/src/skill-code.ts` — lọc lúc dựng evidence (có `t`), và tại 3 chỗ phát log/prompt.
- `apps/web/src/gate.ts` — `dongFinding` đọc trường đã lọc, fail-closed khi vắng (D4).
- `packages/shared/src/types.ts` — `EvidenceTestRun` thêm một trường optional.

## Data Model

`EvidenceTestRun` thêm **một trường optional** mang bản đã lọc. `actual` giữ nguyên nghĩa và nguyên nội
dung — sổ SQLite, `test/doc-du-lieu-cu.test.ts` và mọi verdict đã ghi không bị ảnh hưởng. Không có di trú;
verdict cũ thiếu trường mới thì rơi vào nhánh fail-closed của D4.

## Risks / Trade-offs

- [Tầng 3 làm cổng phụ thuộc dữ liệu lượt chấm] → D3 chọn lọc sớm, nên phụ thuộc ấy nằm trong engine, đúng
  chỗ đã có `TargetInfo`; `apps/web` chỉ đọc kết quả.
- [Fallback verdict cũ] → D4: fail-closed, và cái mất chỉ ở bề mặt công khai của lượt chấm cũ.
- [Gột làm mất thông tin người sửa cần] → D5 + số đo D7; nếu đo ra < 90% thì phải cân lại chứ không nhắm mắt
  ship — một cổng che quá tay sẽ bị người dùng vòng qua bằng cách đọc sổ, và khi ấy nó chỉ còn là hình thức.
- [Đụng nhầm vân tay] → requirement 3 + ca test khoá: lọc chỉ áp cho bản phát ra.

## Open Questions

- Ngưỡng số chữ số cho tầng 1: `tightFingerprint` đã có ranh giới «số ngắn / số dài» — dùng lại ngưỡng ấy
  hay đặt riêng? Quyết lúc apply, ghi lại lý do.
