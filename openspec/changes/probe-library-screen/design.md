## Context

`/probes` đã có route và đã có mục sidebar; thứ nó trả về là một tấm biển «chưa dựng»
(`apps/web/src/ui-probes.ts`) vì gói design CCS ghi rõ backend của màn này làm sau. Dữ liệu thì có thật và
đầy đủ: `probes-lib/<slug>/meta.json` giữ `ProbeLibEntry` gồm `plan`, `lich_su`, `da_bat_hoi_quy`,
`flaky_diem`; code từng probe nằm cạnh dưới dạng file.

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -rn "readProbeLibrary(" --include=*.ts apps packages | grep -v test   # 2: dinh nghia + 1 nguoi goi
grep -c "rmSync(join(GOC_LIB" packages/harness/src/probe-library.ts        # 1  duong xoa file probe
grep -n "meta.probes.splice"  packages/harness/src/probe-library.ts        # 1  dao thai vi tran
grep -n "daGo.add\|ra.push({ go"  packages/harness/src/probe-library.ts    # 1  go vi trung lap
grep -n "TRAN_LICH_SU = "     packages/harness/src/probe-library.ts        # 20 o dai hanh vi
```

**Hai đường gỡ một probe ĐÃ CÓ, và cả hai đang im lặng ở mức khác nhau:**

| đường | trace hôm nay | đủ dựng bảng §5b? |
|---|---|---|
| `findAndDropBehaviorDuplicates` → `libraryChanges` | `probe_id · action · reason` trong verdict | thiếu vế «giữ cái nào», thiếu bằng chứng |
| `admitToLibrary` vượt trần → `splice` + `rmSync` | **một dòng `console.log`** | không có gì |

**Trường KHÔNG TIN CẬY sẽ lên màn — 12 chỗ**, đếm từ kiểu chứ không từ trí nhớ: `ten` · `sha_sinh` ·
`luc` · `hash` · `plan.id` · `plan.ten` · `plan.muc_dich` · `plan.spec_rule` · `plan.ky_vong` ·
`plan.trigger` · `lich_su[].sha` · `lich_su[].trang_thai` — cộng **code probe**, thứ dài nhất và giống mã
chạy được nhất. Mọi trường trong danh sách này do model sinh ra từ nội dung repo đích.

## Goals / Non-Goals

**Goals**
- Màn thư viện đọc dữ liệu thật của repo đang chọn, bày được cả phần yếu của tài sản.
- Mỗi lần gỡ một probe đã có để lại một bản ghi đọc được — cả hai đường gỡ.
- Code probe xem được tại chỗ, và **thoát** trước khi vào HTML.

**Non-Goals**
- Không hành động ghi từ màn: không xoá probe, không xoá thư viện (change kế tiếp).
- Không cách ly probe không nạp được (change kế tiếp — đó là hành vi engine trên đường nóng).
- **Không đổi cách chọn nạn nhân đào thải.** Đường ấy bị chạm đúng một chỗ: ghi thêm một bản ghi.
- Không gộp thư viện nhiều repo, không tìm kiếm/phân trang (thư viện tối đa vài trăm probe).

## Decisions

### D1 — Sổ gỡ là FILE RIÊNG dạng JSONL, không phải một mảng trong `meta.json`

```
probes-lib/<slug>/meta.json      # nguyên trạng: danh sách probe ĐANG CÓ
probes-lib/<slug>/removals.jsonl # MỚI: mỗi dòng một lần gỡ, chỉ ghi thêm
```

Cân nhắc `meta.da_go[]` trong chính `meta.json`: **bác**. `meta.json` được **đọc và ghi lại TOÀN BỘ** ở
mỗi lần nạp probe (`ghiMeta` ghi file tạm rồi rename). Nhét một sổ chỉ-lớn-lên vào đó nghĩa là mỗi lần nạp
phải đọc và ghi lại cả lịch sử gỡ — chi phí tăng tuyến tính theo thời gian sống của thư viện, ngay trên
đường nóng và ngay **trong khoá**.

Cân nhắc cắt sổ còn N bản ghi gần nhất: **bác**, vì nó mâu thuẫn với chính điều change này đòi. Một sổ tự
xoá bản ghi cũ trả lời được «tuần trước cái gì đi» nhưng không trả lời được «sáu tháng trước», mà câu thứ
hai mới là câu người ta hỏi khi nghi một lần gỡ sai.

JSONL vì nó **ghi thêm được mà không đọc lại**: `appendFileSync` một dòng, trong cùng khoá đã có.

**Dòng cụt.** `appendFileSync` bị cắt giữa chừng để lại một dòng không phân tích được. Đường đọc bỏ dòng
ấy và **đếm số dòng đã bỏ**, rồi màn nói ra con số đó. Bỏ trong im lặng thì một sổ hỏng dần trông y hệt một
sổ trống — cùng lỗi mà luật «rỗng ≠ hỏng» cấm, chỉ khác chỗ xảy ra.

### D2 — Ghi sổ ở **hai** chỗ, ngay tại nơi probe biến mất, TRONG khoá

Ghi ngay cạnh `splice`/`rmSync` chứ không ở tầng gọi. Đo được: đường đào thải nằm **bên trong**
`admitToLibrary`, tầng gọi (`skill-code.ts`) không hề biết probe nào vừa bị loại — nó chỉ nhận `{ ten }`.
Muốn ghi ở tầng trên thì phải thay đổi giá trị trả về và nhớ ghi ở mọi người gọi; đó đúng khuôn «điều kiện
phải nhớ» mà change trước vừa gỡ bỏ.

Ghi trong khoá vì hai lượt chấm song song là trạng thái bình thường trên prod, và hai lần gỡ đồng thời phải
ra hai dòng chứ không phải một.

### D3 — Đọc cho màn: **danh sách không kèm code**, code lấy riêng khi bấm

`readProbeLibrary(slug)` hiện có đọc **mọi** file code. Dùng nó cho màn nghĩa là một lần mở trang đọc tới
100 file và nhồi cả trăm KB mã nguồn vào một trang HTML, trong khi người dùng thường chỉ mở một probe.

Thêm hai hàm, không sửa hàm cũ (đường chấm vẫn cần code của tất cả):

```ts
export function readLibraryIndex(slug: string): LibraryIndex;          // khong kem code
export function readProbeCode(slug: string, ten: string): string | null; // MOT probe
```

`readProbeCode` **không** ghép tên do người gọi đưa vào đường dẫn. Nó tra tên ấy trong `meta.probes`
trước; không có trong sổ thì trả `null`. Ghép thẳng là mở đường đi ngược thư mục, và tên probe là chuỗi
sinh từ dữ liệu ngoài.

### D4 — Dải hành vi vẽ ĐÚNG số lượt đã có, không đệm cho đủ 20

`TRAN_LICH_SU = 20`, nên dải ánh xạ 1:1 với `lich_su`. Probe mới có 3 lượt thì vẽ **3** ô.

Đệm 17 ô xám cho đủ khung là vẽ ra 17 phép đo chưa từng xảy ra. Ô xám trong gói design mang nghĩa **`không
chạy`** — một trạng thái THẬT của probe ở một lượt thật. Dùng cùng ký hiệu ấy cho «chưa có lượt nào» là
trộn «đã đo, probe không chạy được» với «chưa đo lần nào», đúng cặp mà cả sản phẩm này tồn tại để tách.

### D5 — Màn đọc thư viện của repo ĐANG CHỌN, và chưa có repo thì nói câu khác

`repoSlug(cfg.repo.local_path)`. Cấu hình không có repo nào ⇒ đi qua `coRepo` (vừa dựng ở change trước) và
màn nói «chưa kết nối repo nào» + lối đi tới Cấu hình — **không** nói «thư viện trống».

### D6 — Trần hiện trên màn đọc từ cấu hình

Gói design viết `n/40`; mặc định thật là `LIBRARY_CAP.mac_dinh` = 100 và người vận hành đổi được. Màn đọc
số đang có hiệu lực. Một màn hard-code `40` sẽ nói dối đúng vào lúc người ta cần con số ấy nhất — trần là
thứ quyết định probe nào bị đào thải.

## Architecture

- `packages/harness/src/probe-library.ts` — sổ gỡ (ghi ở hai chỗ, trong khoá) + hai hàm đọc mới.
- `apps/web/src/ui-probes.ts` — thay toàn bộ: màn thật.
- `apps/web/src/server.ts` — `/probes` (HTML) · `GET /api/probes` (JSON) · `GET /api/probes/code` (một
  probe). Cả ba nằm sau cửa phiên như mọi đường không thuộc `OPEN_PATHS`.
- `apps/web/src/ui.ts` — CSS dải hành vi + panel code.

**Chỗ tinh về tầng, kiểm lại lúc apply.** Ma trận của `kien-truc-tang` **CẤM** tầng `app` import engine —
kể cả `import type`. Ba file trên đi lọt không phải vì ngoại lệ, mà vì chúng xếp vào tầng **`delivery`**:
phép xếp tầng theo ĐƯỜNG DẪN nhận `server.ts` và `ui*.ts` là delivery, và chỉ delivery mới được import
engine. Hệ quả cần nhớ cho người sau: đưa đoạn đọc thư viện này sang một file `apps/web/src/` **không**
tên `ui*` là lưới kiến trúc đỏ ngay — và đỏ đúng.

## Data Model

**File mới: `probes-lib/<slug>/removals.jsonl`** — mỗi dòng một JSON:

```json
{"luc":"2026-09-05T…","loai":"trung_lap","go":"lib_a1b2c3_d4e5f6.probe.test.ts",
 "giu":"lib_9a8b7c_112233.probe.test.ts","ly_do":"hành vi trùng đo được","bang_chung":"3 lượt chung…"}
{"luc":"2026-09-05T…","loai":"dao_thai","go":"lib_…","ly_do":"chết kéo dài 5 lượt"}
```

- **Ai ghi:** chỉ `probe-library.ts`, trong khoá thư viện, tại đúng hai chỗ probe biến mất.
- **Ai đọc:** tầng web (màn + API). Đường chấm không đọc — sổ này không tham gia quyết định nào.
- **Ai dọn:** không ai. Đó là điểm của nó.
- **Atomic:** một dòng, `appendFileSync`, trong khoá. Không dùng ghi-tạm-rồi-rename như `meta.json` vì
  ở đây không có thao tác đọc-sửa-ghi nào để mất; rủi ro duy nhất là **dòng cuối cụt**, và đường đọc chịu
  được nó (D1).
- **`meta.json` KHÔNG đổi hình dạng** — không thêm trường, không cần di trú.
- **Cache:** không thêm cache nào. Màn đọc thẳng từ đĩa mỗi lượt, nên sửa tay `meta.json` hay
  `removals.jsonl` có hiệu lực ngay ở lượt đọc kế tiếp (⛔C6).

## Risks / Trade-offs

**[Sổ gỡ lớn vô hạn]** → Mỗi bản ghi ~200 byte; 10 000 lần gỡ ≈ 2 MB. Nó chỉ được đọc bởi màn, không nằm
trên đường chấm. Nếu về sau thành vấn đề thì cắt theo **thời gian** và nói ra, không cắt theo số lượng
trong im lặng. Ghi nợ chứ không giải quyết trước khi có số đo.

**[Code probe lên màn là bề mặt tiêm mới]** → Đây là rủi ro nặng nhất của change. Toàn bộ 12 trường + code
đi qua `escHtml`; có ca đối kháng với chuỗi đóng thẻ nằm trong **thân probe**, không chỉ trong tiêu đề.

**[Đọc tên probe từ tham số yêu cầu]** → Không ghép vào đường dẫn; tra trong sổ trước (D3). Có ca với
`../` và với tên không tồn tại.

**[Thêm một lần ghi file vào trong khoá]** → Khoá giữ lâu hơn một chút ở đường nạp. Một dòng append là
chi phí không đáng kể so với `ghiMeta` vốn đã ghi lại toàn bộ `meta.json` trong cùng khoá ấy.

**[Bảng «đã gỡ» trống trơn sau reset]** → Thư viện vừa được dọn sạch hôm nay, nên sổ gỡ bắt đầu từ số
không. Đó là trạng thái rỗng THẬT và màn phải nói đúng thế, không được ngụ ý «chưa có ai gỡ bao giờ».

## Migration Plan

Không có bước di trú: `meta.json` không đổi hình dạng, và `removals.jsonl` vắng mặt được đọc như sổ rỗng
(khác «sổ có dòng hỏng» — hai câu khác nhau trên màn).

Đường lùi: revert. Sổ đã ghi nằm lại trên đĩa, vô hại vì không đường nào đọc nó.

## Open Questions

Không còn. Ranh giới với phần hành động (xoá probe, xoá thư viện, cách ly probe không nạp được) chốt ở
Non-Goals và là change kế tiếp.
