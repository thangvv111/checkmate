## Context

Engine ném `Error('Không đủ cơ sở kết luận: …')` ở `packages/harness/src/skill-code.ts:786`. Lượt chấm
đóng với `trangThai: 'loi'`, và bề mặt đọc duy nhất nhận ra nó là dòng này ở đường render:

```ts
// apps/web/src/ui.ts:1548
const khongCoSo = !v && loiCuoi.some((m) => /không đủ cơ sở/i.test(m));
```

Kết cục quan trọng nhất mà engine có thể trả về — nguyên tắc 03 của sản phẩm — đang được nhận diện bằng
cách so khớp một câu tiếng Việt.

Ràng buộc: `web-runs/checkmate.db` là **dữ liệu prod**, deploy không đè. Bảng `run` hiện có 12 cột và đã
sống qua hai lần thêm cột (`so_cong.ngoai_cong`, `run.pid`) — khuôn thêm cột đã có sẵn ở `napCotThieu`.

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -c "không đủ cơ sở/i" apps/web/src/ui.ts                      # 1  duong render dang so chuoi
grep -rn "trangThai === 'loi'" apps/web/src/*.ts | wc -l            # 3  (ui-history 2 · ui 1)
grep -c "res.json" apps/web/src/server.ts                           # 23 be mat JSON
```

Ba bề mặt phải đọc kết cục mới: **màn chấm** (`ui.ts`) · **lịch sử** (`ui-history.ts`, cả lọc lẫn nhãn) ·
**API JSON** `/api/lich-su` và `/api/runs/:id/info` (chúng trả `RunMeta` nên trường mới đi theo, không phải
thêm code — nhưng phải có ca khoá là nó ĐI THEO, kẻo một lần lọc trường lại bịt mất).

## Goals / Non-Goals

**Goals**
- Kết cục không-đủ-cơ-sở là trường có kiểu trên `RunMeta`, ghi xuống SQLite, sống qua khởi động lại.
- Hai loại phân biệt được bằng máy, và mỗi loại có thông điệp riêng đúng gói design.
- Lịch sử lọc riêng được, nhãn khác nhãn lỗi hạ tầng.
- Lượt cũ trong sổ prod lên đời bằng đường di trú tự động, chạy một lần, chạy lại không đổi gì.
- Phép so chuỗi cũ còn sống ĐÚNG một chỗ — hàm di trú — và có test khoá.

**Non-Goals**
- Không thêm giá trị thứ tư cho `trangThai`. Xem quyết định D1.
- Không dựng lại hình thức ba màn bảng theo gói CCS — change `data-table-screens-ccs` làm.
- Không đổi bảng chân trị phân loại probe, không đổi ngưỡng `hasBasis`. Change này đổi **cách ghi lại**
  kết cục, không đổi **khi nào** nó xảy ra.

## Decisions

### D1 — Trường riêng, KHÔNG phải giá trị thứ tư của `trangThai`

Cân nhắc: `trangThai: 'dang_chay' | 'xong' | 'loi' | 'khong_du_co_so'`.

Chọn `trangThai` giữ `'loi'`, thêm `khongDuCoSo?: { loai, soProbe, lyDo }`.

Lý do thứ nhất là **ngữ nghĩa**: gói design nói thẳng đây là *lượt chấm THẤT BẠI, không phải trạng thái
thứ ba*. Nâng nó thành giá trị ngang hàng là mời người sau đọc nó như một kết cục bình thường.

Lý do thứ hai là **bán kính vỡ**: `trangThai` là trường phân nhánh của cả hệ — 3 chỗ so trực tiếp trong
`apps/web/src`, cộng mọi chỗ đọc `!== 'dang_chay'`. Thêm một giá trị làm mọi `else` hiện có im lặng đổi
nghĩa, và không có lỗi nào nổ ra ở chỗ nào. Thêm một trường mới thì code cũ không biết tới nó và cư xử
đúng như hôm nay.

### D2 — Engine phát sự kiện có kiểu, rồi VẪN ném

Thêm `{ type: 'khong_du_co_so'; loai; so_probe; ly_do }` vào `RunEvent`, phát ngay trước `throw`.

Cân nhắc: bỏ ném, trả về một verdict đặc biệt. **Bác**: ném là đường fail-closed (⛔C2) — nó bảo đảm không
nhánh nào phía sau tiếp tục chạy như thể có kết quả. Sự kiện là **dấu vết**, không phải đường thoát.

Sổ sự kiện là nguồn sự thật của lượt chấm (`runs/<id>/events.jsonl`), nên phát sự kiện cũng là cách rẻ
nhất để dấu vết sống sót qua việc server bị restart giữa chừng.

### D3 — Một phép kiểm, hai chỗ dùng: `classifyInsufficientBasis`

Phân biệt hai loại đã tồn tại sẵn trong `retryNoticeNoEvidence`:

```ts
baseKq === undefined || baseKq.length === 0   // -> goc_khong_doi_chung
```

Viết lại biểu thức ấy ở chỗ thứ hai là dựng **cửa song sinh** — khuôn đã bị bắt chín lần trong repo này:
hai cửa cùng vai viết bằng hai biểu thức riêng sẽ lệch nhau, và lệch trong im lặng. Nên tách thành hàm
thuần `classifyInsufficientBasis(baseKq, ungVien)` và cho `retryNoticeNoEvidence` gọi chính nó.

### D4 — Di trú: BACKFILL lúc khởi động, không suy ở lượt đọc

Cân nhắc: suy tại chỗ đọc (`meta.khongDuCoSo ?? suyTuLoi(meta)`).

**Bác.** Suy ở đường đọc nghĩa là phép so chuỗi vẫn sống ở bề mặt render — đúng cái bệnh change này chữa,
chỉ đổi chỗ đứng. Nó cũng làm số đếm và bộ lọc phải chạy phép suy trên mọi hàng ở mọi lượt xem.

Chọn: hàm di trú chạy lúc khởi động, cùng chỗ với `migrateRepoToken` và `chayDoiSoat`. Nó đọc hàng
`trang_thai='loi'` chưa có trường mới, tìm câu lỗi trong sổ sự kiện, và **ghi trường mới trước**; không
xoá gì cả — câu lỗi cũ vẫn nằm nguyên trong sổ sự kiện, nó là bản ghi lịch sử chứ không phải bản sao thừa.

Phép so chuỗi sống đúng trong hàm ấy, có ca test khoá cả hai chiều (câu cũ khớp · câu lỗi hạ tầng không
khớp).

Loại của hàng cũ: sổ sự kiện có dòng log `Cảnh báo: nhánh gốc KHÔNG chạy được probe` khi rơi vào loại
`goc_khong_doi_chung`; không có thì là `khong_probe_nao_toi_noi`. Suy sai một hàng cũ **không gây hại
một chiều** — nó chỉ đổi lời văn của một lượt đã chết từ lâu — nên đây là chỗ được phép suy đoán, và ghi
rõ trong hàm là suy đoán.

### D5 — Sổ cái: khoá lại bằng ca test, không thêm code

Lượt không đủ cơ sở vốn không ghi sổ cái, vì đường ghi sổ đi qua `if (meta.verdict)`. Đó là hành vi đúng
đang có nhờ một điều kiện chứ không nhờ một luật. Change này **không thêm code**, chỉ thêm ca khoá — biến
một tính chất tình cờ thành một tính chất được canh.

## Architecture

```
packages/harness/src/verdict.ts       hasBasis -> tra them `loai`
        |                             classifyInsufficientBasis (ham thuan, D3)
        v
packages/harness/src/skill-code.ts    phat({type:'khong_du_co_so', ...}) roi throw
        |                             (events.jsonl = nguon su that)
        v
apps/web/src/runs.ts                  nhat su kien khi tien trinh dong -> RunMeta.khongDuCoSo
        |
        v
apps/web/src/store/db.ts              cot `khong_du_co_so` (TEXT, JSON) + ham di tru
        |
        +---> apps/web/src/ui.ts          man cham: card theo LOAI
        +---> apps/web/src/ui-history.ts  pill + option loc
        +---> /api/lich-su, /api/runs/:id/info   (di theo RunMeta, co ca khoa)
```

`packages/shared/src/types.ts` giữ kiểu dùng chung: `InsufficientBasisKind` + nhánh mới của `RunEvent`.

## Data Model

**Cột mới:** `run.khong_du_co_so TEXT` — JSON `{"loai":"…","soProbe":n,"lyDo":"…"}`, rỗng khi không áp
dụng. Khai một dòng ở `napCotThieu` như hai cột trước; `CREATE TABLE IF NOT EXISTS` không thêm cột vào
bảng đã có, nên thiếu dòng ấy là máy dev chạy ngon còn máy chủ chết lúc ghi.

Chọn TEXT-JSON thay vì ba cột rời: ba trường này luôn đi cùng nhau, luôn được đọc cùng nhau, và không
trường nào cần lọc bằng SQL (lọc chạy trong bộ nhớ như mọi bộ lọc lịch sử hiện có). Ba cột rời chỉ thêm
ba chỗ có thể lệch nhau.

**Ai ghi:** `runs.ts` khi tiến trình chấm đóng, và hàm di trú lúc khởi động. **Ai đọc:** ba bề mặt đếm ở
Tầng 2. **Ai dọn:** không ai — sổ chỉ ghi thêm.

**Di trú (R10.13):** ghi trường mới TRƯỚC, không xoá gì. Câu lỗi cũ ở lại `events.jsonl` vĩnh viễn — nó
là bản ghi lịch sử của lượt chấm, không phải bản sao của trường mới.

**Đường lùi:** bỏ change đi thì cột thừa nằm im, code cũ không đọc tới nó, sổ vẫn đọc được. Không có bước
nào phá dữ liệu cũ.

**Khoá liên tiến trình:** không cần. Ghi trường này đi qua đúng đường `saveMeta` đang có, cùng một lượt
ghi với `trangThai` và `ketThuc`; nó không mở thêm đường ghi nào vào file dùng chung.

## Risks / Trade-offs

**[Di trú đoán sai loại của lượt cũ]** → Loại được suy từ dấu vết trong sổ sự kiện, và cái sai duy nhất
có thể xảy ra là hiện nhầm một trong hai lời văn cho một lượt đã chết. Không lượt nào đổi verdict, không
hàng sổ cái nào đổi, cổng không đổi. Hàm ghi rõ đây là suy đoán, và ca test khoá cả chiều không-khớp.

**[Trường mới bị đọc như một kết cục bình thường]** → D1 giữ `trangThai='loi'`; ca test khoá rằng lượt
mang trường mới vẫn là lỗi, và vẫn không có hàng sổ cái.

**[Bộ lọc mới nuốt mất lượt lỗi hạ tầng]** → Ca test đối chứng: một lượt lỗi hạ tầng và một lượt không đủ
cơ sở cùng trong danh sách, lọc theo từng loại phải ra đúng một cái.

**[Đổi lời văn thông điệp lỗi ở tương lai]** → Sau change này lời văn không còn là hợp đồng ở đường render;
nó chỉ còn là hợp đồng của hàm di trú, tức chỉ với hàng đã ghi trước hôm nay. Hàng cũ thì không sinh thêm.

## Migration Plan

1. Thêm cột (`napCotThieu`) — chạy trước mọi thứ khác lúc mở cơ sở dữ liệu.
2. Hàm di trú quét hàng `trang_thai='loi'` chưa có trường mới, đọc `events.jsonl` của nó, ghi trường mới.
3. Chạy lại: hàng đã có trường thì bỏ qua — idempotent, có ca test khoá.
4. Không xoá gì.

## Open Questions

Không còn. Hai loại và hai thông điệp đã chốt trong gói design; hình dạng cột và đường di trú chốt ở D1/D4.
