# Design — stalled-run-recovery

## Context

```
Ba loi, mot ho: BE MAT NOI KHONG DU DE NGUOI DOC HANH DONG DUNG

(1) luot ket   noiLaiLuotDangChay: existsSync(so)  ->  xac song mai
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
- Lượt kẹt không còn khoá trần và không còn khoá pull request; có đường thoát (tiếp tục / huỷ).
- Hai thông điệp nói đúng bản chất, đủ để người đọc làm việc tiếp.

**Non-Goals**
- KHÔNG đổi luật cổng — chặn vẫn chặn (⛔C2).
- KHÔNG đụng trần probe theo artifact (backlog #17) hay lọc thư viện theo diff (backlog #18).
- KHÔNG dựng hàng đợi lượt chấm — «tiếp tục» là chạy lại, không phải nối tiếp phần dở.

## Decisions

### D1 — Lưu `pid`, và KHÔNG BAO GIỜ kill theo pid trần

PO chốt hướng (b): thêm cột định danh tiến trình. Một cột giải hai việc — nhận diện sống/chết, và huỷ được
sau khi server khởi động lại (`child` trong bộ nhớ đã mất).

Nhưng pid **bị hệ điều hành tái dùng**. `process.kill(pid, 0)` chỉ trả lời «có tiến trình mang số ấy», không
trả lời «đúng tiến trình của lượt này». Sau một lần khởi động máy, con số ấy gần như chắc chắn thuộc về
tiến trình khác.

Hai hệ quả, khác nhau về mức nguy hiểm:

| dùng pid để | nhầm thì sao |
|---|---|
| **nhận diện** còn sống | lượt kẹt bị coi là còn sống → vẫn khoá PR; **tệ bằng hôm nay, không tệ hơn** |
| **kill** | **giết một tiến trình vô can của người dùng** — thiệt hại ngoài phạm vi sản phẩm, không đảo ngược |

Nên quy tắc: **xác minh trước khi kill**. Chỉ kết thúc tiến trình khi kiểm được nó đúng là tiến trình chấm
của lượt này (dòng lệnh mang chính run id — engine đã truyền `--events-out runs/<id>/events.jsonl`, nên run
id có mặt trong dòng lệnh). Không xác minh được → **không kill**, chỉ đánh dấu lượt, và **nói ra**.

Thà để một tiến trình mồ côi chạy nốt còn hơn giết nhầm thứ không phải của mình.

### D2 — Lượt đời cũ không có pid ⇒ coi là KẸT, không suy đoán

Cột mới thì mọi hàng cũ có `pid` rỗng. Hai cách đọc, và chọn cách nào là một quyết định fail-closed:

- coi là **còn sống** → giữ nguyên bệnh hôm nay: xác khoá PR vĩnh viễn;
- coi là **kẹt** → giải phóng trần và PR ngay, và nếu tiến trình thật sự còn sống thì nó vẫn ghi tiếp vào sổ,
  không mất gì — người vận hành thấy lượt kẹt, bấm tiếp tục.

Chọn **kẹt**. Hướng sai ở đây không đối xứng: đoán nhầm «kẹt» thì mất một lần bấm nút; đoán nhầm «còn sống»
thì khoá một pull request mà không ai gỡ được.

Đó cũng là lý do xác `wmtlc846uh8nk` của PO được giải phóng ngay ở lần khởi động đầu sau bản vá — không cần
thao tác dữ liệu tay.

### D3 — «Tiếp tục» là CHẠY LẠI, không phải nối tiếp phần dở

Cám dỗ là nối tiếp từ chỗ dừng — thư viện probe đã có, sổ sự kiện còn đó. Không làm, vì trạng thái giữa
chừng của một lượt chấm nằm rải ở bốn chỗ: sổ sự kiện, sandbox worktree, thư viện probe, và bộ nhớ tiến
trình đã chết. Ba chỗ đầu còn, chỗ thứ tư mất — và chính nó giữ biết «đang ở bước nào, đã nạp gì».

Dựng lại trạng thái ấy từ sổ là suy đoán, và suy đoán sai cho ra một verdict trông đầy đủ mà thiếu nửa phép
thử. Chạy lại thì tốn thêm token nhưng verdict **đúng là verdict của một lượt trọn vẹn**.

*Cái mất, nói thẳng:* mất phần việc đã chạy — với lượt chết ở phút cuối thì mất gần hết. Đổi lại: không có
loại verdict «nửa vời trông như đủ», đúng thứ ⛔C2 cấm.

### D4 — «Tiếp tục» đi qua ĐÚNG cửa của một lượt mới

Không viết lại điều kiện chạy ở route mới. `evaluateStartRun` đã là hàm thuần và đã gác cả hai vế (trần,
pull request đang chấm) — route tiếp tục gọi chính nó.

Đây là bài học «cửa song sinh» bị bắt chín lần trong repo này: hai cửa cùng vai viết bằng hai biểu thức
riêng thì sẽ lệch nhau, và không ca test nào gọi được tới quyết định.

### D5 — Thông điệp cổng: sửa ở CHỖ DỰNG THÔNG ĐIỆP, không sửa ở chỗ ghi sổ

Sổ `.ncc-verify.json` giữ **kết quả một lần kiểm đã xảy ra** — nó đúng với phương thức lúc ấy, và đó là dữ
liệu lịch sử, không phải lỗi. Sửa sổ là viết lại quá khứ.

Chỗ sai là **bề mặt đọc**: nó trình bày một kết quả của phương thức `api` như thể nói về cấu hình `thue_bao`
hiện tại. Nên phép so «phương thức trong sổ ≠ phương thức đang cấu hình» phải nằm ở đường dựng thông điệp,
và khi lệch thì nói «cần kiểm lại theo phương thức đang chọn».

`checkStillValid` đã có sẵn phép so ấy (nó trả `null` khi lệch) — nhưng nó chỉ trả `null`, không nói **vì
sao null**. Đó là chỗ thêm.

### D6 — Ba tầng của `test-grid-integrity`

- **tầng 1 mutation** — bắt buộc, hai lần, kiểm chứng đã áp dụng; đột biến sống sót đi theo bảng ba đường.
- **tầng 2 đếm bề mặt** — **ÁP DỤNG**: mục (1) đổi cách một lượt được tính là «đang chạy», và con số ấy đọc
  ở nhiều chỗ. Phải **đếm bằng máy** mọi chỗ đọc `dang_chay` / `runningCount` / `isPrRunning` trước khi viết
  ca, ghi lệnh đếm và con số vào tasks. Và có mục **kiểm tay chạy thật một lượt**.
- **tầng 3 cặp fixture** — nếu lưới dựng hàm quét `scan*` thì phải có cả fixture đối kháng lẫn đối chứng.

### D7 — Bug này sinh ra từ HAI comment mâu thuẫn, và đó mới là thứ phải sửa

Đếm bề mặt (tầng 2) làm lộ ra gốc rễ. Hai chỗ trong repo khẳng định hai điều trái nhau:

| chỗ | khẳng định |
|---|---|
| `run-store.ts:183` | «tiến trình web là **chủ duy nhất** của các lượt nó khởi chạy — nó vừa lên thì không lượt nào của nó đang chạy, nên **mọi hàng `dang_chay` còn sót đều là XÁC**» |
| `runs.ts:255` | «lượt còn sổ đang lớn dần là lượt còn **SỐNG**, đánh dấu nó hỏng là vứt việc đang chạy đúng» |

`cleanupOrphanRuns` viết theo giả định thứ nhất và dọn sạch. `noiLaiLuotDangChay` thêm sau theo giả định
thứ hai, và **vô hiệu hoá** cái trước bằng tham số `boQua`.

Ai đúng? Đọc `spawn`: không `detached`, `shell: true`, sự kiện ghi thẳng vào **file** chứ không qua pipe.
Trên Windows tiến trình con không chết theo cha, và vì nó ghi file nên **vẫn ghi tiếp được**. Giả định thứ
hai đúng — nhưng phép kiểm nó dùng (`existsSync`) không đo được điều nó khẳng định.

Nên sửa đúng chỗ là: **giữ giả định thứ hai, thay phép kiểm bằng thứ đo được** (pid), và **gỡ khẳng định
thứ nhất** khỏi `run-store.ts` vì nó đã sai từ lúc `noiLaiLuotDangChay` ra đời — nó chỉ chưa gây hại vì bị
`boQua` vô hiệu hoá.

*Đây là loại lỗi thứ tư mà `test-grid-integrity` khai: lưới đúng, luật sai. Không lưới nào đỏ suốt thời
gian hai khẳng định ấy sống cạnh nhau, vì mỗi bên đều tự nhất quán — chỉ khi đọc cả hai mới thấy.*

## Architecture

- `store/db.ts` — thêm cột vào `run` qua khuôn `napCotThieu` (tự hết việc, không cần bước thủ công).
- `runs.ts` — lưu pid lúc `batDau`; hàm thuần quyết định «lượt này còn sống không»; đường huỷ có xác minh.
- `server.ts` — hai route: tiếp tục (gọi `evaluateStartRun`), huỷ.
- `ui.ts` — hai nút trên lượt kẹt.
- `provider.ts` — thông điệp nói đúng phương thức.
- `skill-doc.ts` — dòng ứng viên mang chỗ nhắm.

## Data Model

**Đổi hình dạng dữ liệu** — bảng `run` thêm cột định danh tiến trình. Đường di trú: khuôn `napCotThieu` đã
có (`ALTER TABLE … ADD COLUMN` khi chưa có cột), chạy lúc mở cơ sở dữ liệu. Hàng cũ nhận giá trị rỗng và
được đọc theo D2.

## Risks / Trade-offs

- [Giết nhầm tiến trình vô can] → D1: xác minh dòng lệnh trước khi kill; không xác minh được thì không kill.
- [Lượt còn sống bị coi là kẹt] → D2: mất một lần bấm nút, không mất dữ liệu; sổ vẫn được ghi tiếp.
- [«Tiếp tục» tốn lại token] → D3: đổi lấy verdict trọn vẹn thay vì verdict nửa vời.
- [Thêm cột vào bảng đang giữ dữ liệu prod] → dùng đúng khuôn di trú đã có, không dựng lại bảng.

## Migration Plan

Tự động lúc mở cơ sở dữ liệu. Đường lùi: revert PR — cột thừa không làm hỏng bản cũ (bản cũ không đọc nó).

## Open Questions

- Không.
