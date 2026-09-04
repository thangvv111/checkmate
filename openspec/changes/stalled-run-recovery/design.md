# Design — stalled-run-recovery

## Context

```
Ba loi, mot ho: BE MAT NOI KHONG DU DE NGUOI DOC HANH DONG DUNG

(1) luot chet  noiLaiLuotDangChay: existsSync(so)  ->  xac song mai
                 |  runningCount()=1 (tran 2)
                 |  isPrRunning(7)=true  -> 409 pr_dang_cham  -> KHOA PR #7 VINH VIEN
                 |  va khong co duong nao HUY: child chi la bien cuc bo

(2) so kiem    .ncc-verify.json giu {ok:false, phuong_thuc:'api'}
                 cau hinh dang: phuong_thuc='thue_bao' (KHONG can API key)
                 -> thong diep "Chua co API key" o che do khong dung API key

(3) ung vien   skill-doc.ts:188 in id + NHAN RUBRIC
                 D1(mau thuan noi tai) · D2(mau thuan noi tai) -> trong nhu trung
                 thuc te: D1 dong 49 (tu duyet), D2 dong 44 (vuot tham quyen) — ca hai HIGH
```

## Goals / Non-Goals

**Goals**
- Lượt chết thành **lỗi ngay**, tự giải phóng trần và pull request.
- Huỷ được một lượt đang chạy, không bao giờ kill mù.
- Hai thông điệp nói đúng bản chất.

**Non-Goals**
- KHÔNG đổi luật cổng — chặn vẫn chặn (⛔C2).
- KHÔNG có trạng thái trung gian nào giữa «đang chạy» và «lỗi» (D3).
- KHÔNG có nút «tiếp tục» — chạy lại là một lượt MỚI (D3).
- KHÔNG dọn worktree sandbox của lượt bị huỷ (security S5.1 — chỗ hở có ý thức).
- KHÔNG đụng trần probe theo artifact (backlog #17) hay lọc thư viện theo diff (backlog #18).

## Decisions

### D0 — Đo trước, thiết kế sau: tiến trình chấm CÓ sống sót qua cái chết của server

Cả thiết kế đứng trên một sự thật mà repo này **chưa ai đo**, và có hai comment khẳng định ngược nhau về nó
(xem D7). Nên đo trước.

**Thí nghiệm (04/09):** dựng lại đúng khuôn `batDau` — `spawn(…, { shell: true, stdio: ['ignore','pipe','pipe'] })`,
tiến trình cháu ghi «sổ» ra **file** chứ không qua pipe. Giết tiến trình cha bằng `Stop-Process -Force`
(không `-T`, không giết cây), rồi đếm dòng trong file.

| mốc | số dòng |
|---|---|
| trước khi giết cha | 5 |
| sau 4 giây | **13** |
| sau 7 giây | **40 — chạy trọn vẹn tới hết rồi tự kết thúc** |

**Kết luận: cháu sống sót và làm xong việc.** Vì nó ghi file chứ không ghi qua pipe, cái chết của cha không
chạm tới nó.

Hệ quả trực tiếp cho thiết kế: **KHÔNG được đánh dấu lỗi hàng loạt mọi hàng `dang_chay` lúc khởi động** —
làm thế là vứt một lượt đang chạy đúng và đốt lại toàn bộ token đã tiêu.

### D1 — Lưu `pid`, và KHÔNG BAO GIỜ kill theo pid trần

PO chốt hướng (b): thêm cột định danh tiến trình. Một cột hai vai — nhận diện sống/chết lúc khởi động, và
kill được khi bấm Huỷ sau khi server đã khởi động lại (`child` trong bộ nhớ đã mất).

Nhưng pid **bị hệ điều hành tái dùng**. `process.kill(pid, 0)` chỉ trả lời «có tiến trình mang số ấy», không
trả lời «đúng tiến trình của lượt này».

| dùng pid để | nhầm thì sao |
|---|---|
| **nhận diện** còn sống | lượt chết bị coi là còn sống → vẫn khoá PR; **tệ bằng hôm nay, không tệ hơn** |
| **kill** | **giết một tiến trình vô can của người dùng** — thiệt hại ngoài phạm vi sản phẩm, không đảo ngược |

Quy tắc: **xác minh trước khi kill**. Chỉ kết thúc tiến trình khi kiểm được dòng lệnh của nó mang chính run
id — engine đã truyền `--events-out runs/<id>/events.jsonl`, nên run id **có mặt trong dòng lệnh**. Không
xác minh được → không kill, chỉ đánh dấu lượt, và **nói ra**.

Đọc dòng lệnh: Windows `Get-CimInstance Win32_Process` (đã thử trong lượt đo — trả về `CommandLine`);
Linux `/proc/<pid>/cmdline`. Không đọc được trên nền đang chạy ⇒ coi như **không xác minh được**, tức không
kill — hướng sai lệch về phía an toàn.

Thà để một tiến trình mồ côi chạy nốt còn hơn giết nhầm thứ không phải của mình.

### D2 — Lượt đời cũ không có pid ⇒ coi là ĐÃ CHẾT, không suy đoán

Cột mới thì mọi hàng cũ có pid rỗng. Hai cách đọc:

- coi là **còn sống** → giữ nguyên bệnh hôm nay: xác khoá PR vĩnh viễn;
- coi là **đã chết** → thành lỗi ngay, giải phóng trần và PR. Nếu tiến trình thật sự còn sống thì nó vẫn ghi
  tiếp vào sổ (D0) — không mất dữ liệu, chỉ mất một lượt phải chấm lại.

Chọn **đã chết**. Hướng sai không đối xứng: đoán nhầm «chết» thì mất một lượt chấm; đoán nhầm «còn sống» thì
khoá một pull request mà **không ai gỡ được**.

Nhờ đó xác `wmtlc846uh8nk` của PO được giải phóng ngay ở lần khởi động đầu sau bản vá — không cần sửa dữ
liệu tay.

### D3 — KHÔNG có trạng thái «kẹt», KHÔNG có nút «tiếp tục» (PO chốt 04/09)

Bản đầu của change này dựng một trạng thái thứ ba («kẹt») kèm hai nút *tiếp tục* / *huỷ*. PO bác:

> *«nếu tiếp tục là chạy lại thì giữ phiên review bị lỗi không còn ý nghĩa. Lỗi là báo lỗi luôn và lưu vào
> lịch sử. Chạy là tạo phiên mới.»*

Đúng, và nó gỡ được cả một chuỗi:

| bỏ được | vì sao |
|---|---|
| trạng thái «kẹt» | lượt chết là **lỗi**; một trạng thái thứ ba chỉ là thêm một ô người đọc phải học nghĩa |
| route «tiếp tục» | chạy lại = bấm chấm mới, nút ấy **đã có sẵn** trên màn pull request |
| sửa `runningCount` / `isPrRunning` | chúng đã lọc theo `dang_chay` — đánh dấu `loi` là **tự** giải phóng |
| cả câu hỏi «nối tiếp hay chạy lại» | tự biến mất |

Vế duy nhất của PO phải điều chỉnh là **«lỗi là báo lỗi luôn»** áp cho *mọi* hàng `dang_chay`: D0 đo được
tiến trình con sống sót, nên phải phân biệt trước rồi mới đánh dấu. Ba vế còn lại giữ nguyên.

Nút **Huỷ** vẫn ở lại nhưng **đổi vai**: nó là «dừng một lượt đang chạy thật» (chạy quá lâu, biết chắc sai),
không phải «dọn xác».

### D4 — Thông điệp cổng: sửa ở CHỖ DỰNG THÔNG ĐIỆP, không sửa ở chỗ ghi sổ

Sổ `.ncc-verify.json` giữ **kết quả một lần kiểm đã xảy ra** — nó đúng với phương thức lúc ấy. Đó là dữ liệu
lịch sử, không phải lỗi; sửa sổ là viết lại quá khứ.

Chỗ sai là **bề mặt đọc**: nó trình bày kết quả của phương thức `api` như thể nói về cấu hình `thue_bao`
hiện tại. `checkStillValid` đã có sẵn phép so ấy (trả `null` khi lệch) nhưng **không nói vì sao null** — đó
là chỗ thêm.

### D5 — Ba tầng của `test-grid-integrity`

- **tầng 1 mutation** — bắt buộc, hai lần, kiểm chứng đã áp dụng; đột biến sống sót đi theo bảng ba đường.
  **Chạy nền + `git diff` sạch trước commit** (`close-probe-library-spec` D6).
- **tầng 2 đếm bề mặt** — **ÁP DỤNG**: mục (1) đổi cách một lượt được tính là «đang chạy». Lệnh đếm và con
  số ghi ở `tasks.md` §0, chạy **trước** khi viết ca. Có mục **kiểm tay chạy thật một lượt**.
- **tầng 3 cặp fixture** — nếu lưới dựng hàm quét `scan*` thì phải có cả fixture đối kháng lẫn đối chứng.

### D6 — Giả định nền phải thành CA TEST, không để lại dạng comment

D0 đo được một hành vi mà **cả hai hàm liên quan đều dựa vào**, và suốt thời gian qua nó chỉ tồn tại dưới
dạng hai comment — trong đó một cái sai (D7).

Nên hành vi ấy phải có ca: tiến trình con ghi ra file sống sót qua cái chết của cha. Ca này không cần lượt
chấm thật; nó dựng lại đúng khuôn `spawn` bằng hai script nhỏ, như thí nghiệm ở D0.

*Không có ca ấy thì lần sau ai đó đổi `spawn` (thêm `detached`, đổi `stdio`, chuyển sang ghi qua pipe) sẽ
phá giả định nền mà không gì đỏ — và bệnh quay lại dưới dạng khác.*

### D7 — Bug này sinh ra từ HAI comment mâu thuẫn, và đó mới là thứ phải sửa

Đếm bề mặt (tầng 2) làm lộ gốc rễ. Hai chỗ trong repo khẳng định hai điều trái nhau:

| chỗ | khẳng định | phán quyết của D0 |
|---|---|---|
| `run-store.ts:183` | «tiến trình web là **chủ duy nhất**… mọi hàng `dang_chay` còn sót đều là **XÁC**» | **SAI** |
| `runs.ts:255` | «lượt còn sổ đang lớn dần là lượt còn **SỐNG**» | **ĐÚNG** |

`cleanupOrphanRuns` viết theo giả định thứ nhất và dọn sạch. `noiLaiLuotDangChay` thêm sau theo giả định thứ
hai, và **vô hiệu hoá** cái trước bằng tham số `boQua`. Phép kiểm mà nó dùng (`existsSync`) lại không đo
được điều nó khẳng định — nên nối lại cả xác.

Sửa đúng chỗ: **giữ giả định thứ hai** (D0 chứng minh nó đúng), **thay phép kiểm bằng thứ đo được** (pid),
**gỡ khẳng định thứ nhất** khỏi `run-store.ts`, và **khoá giả định bằng ca test** (D6).

*Đây là loại lỗi thứ tư mà `test-grid-integrity` khai: lưới đúng, luật sai. Không lưới nào đỏ suốt thời gian
hai khẳng định sống cạnh nhau, vì mỗi bên tự nhất quán — chỉ khi đọc cả hai mới thấy.*

### D8 — Mutation bắt được gác NẶNG NHẤT chưa có ca (ghi lúc apply)

Mười đột biến, mỗi cái hai lần. Chín đỏ ngay. **Một sống sót: bỏ hẳn `if (!mayKillRun(...))` trong
`killRunProcess`** — tức phép xác minh trước khi kill, gác nặng nhất của cả change.

Đọc theo bảng ba đường: không có đường lui nào, và ca huỷ hiện có dùng lượt **không có pid** nên dừng ở
dòng đầu, chưa chạm tới gác. `mayKillRun` có ca cho *logic* của phép xác minh, nhưng **không ca nào khoá
việc `killRunProcess` thực sự gọi nó**.

Đúng khuôn **«cửa song sinh»** đã bị bắt chín lần trong repo này, chỉ đổi hình dạng: lần này không phải hai
cửa viết hai biểu thức, mà là **một hàm thuần có ca và một chỗ gọi không ai kiểm**.

Ca mới: spawn một tiến trình vô can, gọi `killRunProcess(pid, 'wKHONGPHAICUANO')` → phải trả `false` **và
tiến trình ấy phải còn sống**. Đo lại: ĐỎ. Tổng **10/10**.

*Điều đáng ghi:* nếu dừng ở «9/10 và `mayKillRun` đã có ca», change này sẽ merge với một nút giao diện
giết được tiến trình tuỳ ý trên máy chủ — đúng thứ security S0 dựng ba rào để chống, mà rào thứ nhất thì
không ai kiểm.

## Architecture

- `store/db.ts` — thêm cột vào `run` qua khuôn `napCotThieu` (tự hết việc, không cần bước thủ công).
- `runs.ts` — lưu pid lúc `batDau`; **hàm thuần** quyết định «lượt này còn sống không»; đường huỷ có xác minh.
  `noiLaiLuotDangChay` phân đôi: sống → nối lại, chết → đánh dấu lỗi + ghi sổ.
- `server.ts` — một route: **huỷ**.
- `ui.ts` — nút Huỷ trên lượt đang chạy.
- `provider.ts` — thông điệp nói đúng phương thức.
- `skill-doc.ts` — dòng ứng viên mang chỗ nhắm.

## Data Model

**Đổi hình dạng dữ liệu** — bảng `run` thêm cột định danh tiến trình. Đường di trú: khuôn `napCotThieu` đã
có (`ALTER TABLE … ADD COLUMN` khi chưa có cột), chạy lúc mở cơ sở dữ liệu. Hàng cũ nhận giá trị rỗng và
được đọc theo D2.

## Risks / Trade-offs

- [Giết nhầm tiến trình vô can] → D1: xác minh dòng lệnh trước khi kill; không đọc được thì không kill.
- [Lượt còn sống bị coi là chết] → D2: mất một lượt phải chấm lại, không mất dữ liệu — sổ vẫn được ghi tiếp.
- [Kill để lại worktree sandbox] → chỗ hở CÓ Ý THỨC, khai ở security S5.1; change này không dọn.
- [Thêm cột vào bảng đang giữ dữ liệu prod] → dùng đúng khuôn di trú đã có, không dựng lại bảng.

## Migration Plan

Tự động lúc mở cơ sở dữ liệu. Đường lùi: revert PR — cột thừa không làm hỏng bản cũ (bản cũ không đọc nó).

## Open Questions

- Không.
