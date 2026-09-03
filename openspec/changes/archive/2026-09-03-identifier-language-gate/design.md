# Design — identifier-language-gate

## Context

Đo trên `main` 03/09 (`e0b2ef1`), ba thư mục nguồn `packages/harness/src` · `packages/shared/src` ·
`apps/web/src`:

```
dinh danh CAP MODULE (khai bao o cot 0)   559
  bat la tieng Viet                        99  (18%)
    trong do vi pham (sinh sau 01/09 17:00) 10
    code cu duoc mien                       89

dinh danh MOI tu 01/09 17:00 (git diff)   702
  bat la tieng Viet                       135  (19%)  <- gom ca bien cuc bo
```

Phép thử từ điển âm tiết chạy hai vòng:

| vòng | từ điển | bắt trên bảng module (240 tên) | dương tính giả |
|---|---|---|---|
| 1 | thô | 16 | 6 (`API_DOC_CANDIDATES`, `getDocExamples`, `ChatCompletionsProvider`… — «doc» = *document*, «chat» = *chat*) |
| 2 | bỏ 28 âm trùng tiếng Anh | 6 | **0** |

Vòng 2 chạy trên toàn bộ 559 định danh cấp module cũng cho 0 dương tính giả nhìn thấy được.

## Goals / Non-Goals

**Goals**
- Luật ngôn ngữ định danh có **cưỡng chế bằng máy**, không còn là câu chữ.
- 10 định danh vi phạm đổi sang tiếng Anh.
- Ranh giới luật rõ tới mức không cần diễn giải: cái gì tính, cái gì không.

**Non-Goals**
- KHÔNG đổi 89 định danh code cũ — CLAUDE.md đã xếp việc đó thành change refactor riêng.
- KHÔNG đổi biến cục bộ (D2).
- KHÔNG đổi hành vi sản phẩm. Đây là refactor thuần: 764 ca phải xanh y nguyên.

## Decisions

### D1 — Cưỡng chế bằng LƯỚI TEST, không bằng thêm chữ vào tài liệu

PO đề xuất «để ở chỗ chắc chắn được thực thi, ví dụ artifact OpenSpec hoặc CLAUDE.md». Luật này **đã ở
CLAUDE.md** từ 01/09 và vẫn trượt 10 lần trong 48 giờ, nên phép thử ấy đã chạy và cho kết quả âm tính.
Artifact OpenSpec còn yếu hơn: nó không được nạp mỗi phiên.

Bằng chứng đối chứng nằm ngay trong cùng file: ⛔C5 cũng ở CLAUDE.md, cũng dễ quên, nhưng có
`test/hop-dong-repo.test.ts` — nên khi agent quên khai export ở `merge-gate`, lưới đỏ **ngay trong phiên**.
Khác biệt duy nhất giữa hai luật là cái lưới.

`npm test` là cửa bắt buộc trước mọi PR (CLAUDE.md § Trước khi mở PR). Lưới đặt ở đó là đủ chặn; không cần
cơ chế nào can thiệp lúc gõ.

### D2 — Phạm vi: định danh CẤP MODULE, không phải biến cục bộ

PO chốt (a) ngày 03/09: trường của object/kiểu không tính; tên file · thư mục · capability · nhánh git vẫn
tính. (a) chưa nói gì về **biến cục bộ trong thân hàm**, và số đo cho thấy đó là ranh giới đắt nhất: cấp
module có 10 vi phạm, tính cả biến cục bộ thì lên ~135.

Chọn **cấp module** — định danh khai báo ở cột 0 của file:

- Đó là bề mặt người khác đọc. `const dem = 0` trong thân một hàm 20 dòng không ai ngoài hàm đó nhìn thấy;
  `export const TRAN_SONG_SONG` thì mọi người gọi tới đều thấy.
- Phép phân biệt rẻ và không mơ hồ: cột 0 = cấp module. Không cần parse AST, không cần suy đoán.
- Đổi 135 biến cục bộ là refactor lớn trong thân hàm — rủi ro cao, giá trị thấp, và chạm đúng thứ CLAUDE.md
  cảnh báo: «đừng đổi lắt nhắt từng chỗ khi tiện tay, nó tạo trạng thái nửa nạc nửa mỡ tệ hơn cả hai đầu».

**Cái mất, nói thẳng:** biến cục bộ tiếng Việt vẫn sinh tự do, và code trong thân hàm sẽ còn lai hai thứ
tiếng lâu dài. Nếu sau này PO muốn siết, mở rộng lưới xuống cấp thân hàm là một dòng đổi regex — nhưng phải
kèm một đợt đổi tên ~135 chỗ, nên để PO quyết khi có nhu cầu thật chứ không làm sẵn.

### D3 — Từ điển là TÍN HIỆU, danh sách miễn trừ là CHO PHÉP

Không có cách máy nào nhận diện «tiếng Việt» chắc chắn. Nên tách hai vai:

- **Từ điển âm tiết** = tín hiệu phát hiện. Nó có **âm tính giả** (tên tiếng Việt dùng âm ngoài từ điển vẫn
  lọt) và về nguyên tắc là một danh sách cấm — thứ mà repo này vốn không tin, vì danh sách cấm đòi biết
  trước mọi thứ tương lai.
- **`docs/identifier-allowlist.md`** = danh sách **CHO PHÉP**, đóng băng 03/09, mỗi mục một dòng kèm lý do.
  Đây mới là chỗ quyết định. Định danh cấp module bị từ điển bắt mà **không** có trong danh sách → lưới đỏ.

Vì sao chấp nhận một danh sách cấm ở vai tín hiệu: lưới này gác **quy ước viết code của repo**, không gác
verdict hay cổng merge. Âm tính giả ở đây làm luật phủ chưa hết — không làm một PR sai lọt cổng. Đánh đổi
khác hẳn ⛔C3 (bí mật), nơi một âm tính giả là một bí mật rò ra ngoài và không thu hồi được.

Từ điển mở rộng dần: mỗi lần phát hiện một âm lọt, thêm vào và lưới bắt được từ đó trở đi. Danh sách miễn
trừ thì **không** được phép nở ra bằng cách thêm tên mới — mỗi dòng thêm vào nó phải kèm lý do, và lý do
hợp lệ chỉ có hai: «code cũ trước 03/09» hoặc «tiếng Anh bị từ điển bắt nhầm».

### D4 — Bảng đổi tên 10 định danh vi phạm

| cũ | mới | vì sao |
|---|---|---|
| `laTriggerHopLe` | `isValidTrigger` | vị từ → `is*`, khuôn đã có (`hasTestBlock`, `hasToken`) |
| `lyDoNgoaiRepo` | `outsideRepoReason` | trả lý do hoặc `null` |
| `lyDoKhongPhaiThuMuc` | `notADirectoryReason` | cùng khuôn trên |
| `laThuMucQuyTrinh` | `isProcessDocDir` | khớp `PROCESS_DOC_DIRS` đã tiếng Anh |
| `TRAN_SONG_SONG` | `CONCURRENCY_LIMIT` | «trần» = limit |
| `HOI_QUY` | `REGRESSION_STATES` | tập nhãn, nên số nhiều |
| `NOI_DUOC_DIEU_GI` | `CONCLUSIVE_STATES` | «nói được điều gì» = kết luận được |
| `TrangThaiProbe` | `ProbeStateLabel` | **sửa lúc apply**, xem ghi chú dưới bảng |
| `UngVienToiThieu` | `MinimalCandidate` | |
| `loiSinhLaiKhongBangChung` | `retryNoticeNoEvidence` | «lời» ở đây là thông báo, không phải lỗi |

`promptSinhCode` và `promptPhanTich` sinh 24/08 → diện miễn, KHÔNG đổi trong change này.

**Sửa D4 lúc apply — `TrangThaiProbe` KHÔNG đổi thành `ProbeState`.** Bản đầu của bảng nói dùng lại tên
`ProbeState` đã có trong `skill-code.ts`. Đọc kỹ hai định nghĩa thì thấy chúng khác nghĩa: `ProbeState` là
**union hẹp** tám nhãn; `TrangThaiProbe = string` là **kiểu lỏng có chủ đích** — comment tại chỗ ghi «hình
dạng tối thiểu để test dựng được bằng tay», và nó lỏng vì `verdict.ts` nhận nhãn đọc từ sổ cũ, nơi có thể
còn nhãn không nằm trong union hiện tại (fail-closed). Đặt cùng một tên cho một union hẹp và một `string`
tự do là **sai nghĩa** — người đọc sẽ tưởng chỗ này đã được kiểu ràng buộc trong khi không. Đó là lỗi tệ
hơn cả tên tiếng Việt: tên tiếng Việt chỉ khó đọc, tên sai nghĩa thì gây tin nhầm. Dùng `ProbeStateLabel`.

### D5 — CLAUDE.md ghi ranh giới, và ghi cả án lệ

Luật hiện tại liệt kê danh sách đóng nhưng không nói trường object có tính không — đó là chỗ agent phải
đoán, và chỗ nào phải đoán thì chỗ đó sẽ lệch. Thêm hai câu: trường của object/kiểu KHÔNG tính; con trỏ
sang lưới.

Ghi kèm án lệ 01/09 17:16 — **luật chốt lúc 17:00, vi phạm đầu tiên lúc 17:16** — vì đó là bằng chứng
mạnh nhất cho mệnh đề «luật không có lưới thì không phải luật đang thi hành», và người đọc sau cần biết vì
sao repo chịu tốn một lưới cho việc đặt tên.

## Architecture

- `test/identifier-language.test.ts` — quét ba thư mục nguồn, regex cột 0, đối chiếu allowlist.
- `docs/identifier-allowlist.md` — 89 dòng code cũ + mọi tên tiếng Anh bị bắt nhầm (hiện: 0).
- Đổi tên chạm: `verdict.ts` · `skill-code.ts` · `spec-source.ts` · `runs.ts` · `trigger-catalog.ts`
  + chỗ gọi + test + `checkmate.yml` (⛔C5).

## Data Model

N/A — không đổi kiểu dữ liệu trên đĩa. `TrangThaiProbe` → `ProbeStateLabel` chỉ là tên kiểu TypeScript, giá trị
chuỗi (`'hoi_quy'`, `'vi_pham_luat_moi'`…) **KHÔNG đổi** — chúng nằm trong sổ đã ghi và trong verdict cũ.

## Risks / Trade-offs

- [Từ điển có âm tính giả] → D3: đây là lưới quy ước, không phải lưới bảo mật; âm tính giả làm phủ chưa hết
  chứ không mở đường cho PR sai lọt cổng.
- [Danh sách miễn trừ bị dùng để hợp thức hoá vi phạm mới] → D3: mỗi dòng phải kèm lý do, và lưới có ca
  kiểm định dạng dòng. Đây là rủi ro thật vì nó biến lưới thành hình thức.
- [Đổi 10 tên làm hỏng chỗ gọi] → `tsc` bắt hết ở compile-time; 764 ca test là lưới thứ hai.
- [Đổi tên kiểu `TrangThaiProbe` chạm dữ liệu cũ] → không: giá trị chuỗi giữ nguyên (§ Data Model).
  Đo sau khi đổi: `git diff` có 4 dòng chứa `'hoi_quy'`, cả 4 chỉ đổi TÊN HẰNG bọc ngoài, chuỗi bên trong
  y nguyên.

## Migration Plan

Không có di trú dữ liệu. Đường lùi: revert PR — đổi tên là thay đổi thuần compile-time.

## Open Questions

- Biến cục bộ: để ngoài phạm vi (D2). Nếu PO muốn siết thì mở change riêng kèm đợt đổi ~135 tên.
