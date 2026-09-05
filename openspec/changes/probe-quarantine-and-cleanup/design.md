## Context

Thư viện probe chạy trong **một** lệnh test cùng probe mới. Một file không nạp được có thể giết cả lượt
chấm — đo được trên prod 31/08, năm lượt webhook chết liên tiếp vì một probe import ba module đã đổi tên.

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -c "library.map((f) => sb.ghiProbe" packages/harness/src/skill-code.ts   # 1  duong chay probe thu vien
grep -o "ok: data.numTotalTests > 0"     packages/harness/src/sandbox.ts      # dieu kien «chay duoc»
grep -o "that_lac = keHoach[^;]*"        packages/harness/src/skill-code.ts   # tinh TREN keHoach
grep -c "app.post('/api/probes"          apps/web/src/server.ts               # 0  hanh dong ghi tu UI
grep -n "chayTheoRunner"                 packages/harness/src/sandbox.ts      # chay TUNG file mot lenh
```

**Hai kiểu hỏng, và kiểu thứ hai im lặng:**

| kiểu | hôm nay |
|---|---|
| không file nào thu được test | `ok=false` → lượt chấm chết, có `loiThu` |
| **một phần** file không nạp được, phần khác vẫn thu test | `ok=true` → chạy tiếp, probe mất **không được đếm ở đâu** |

**Đường runner cấu hình đã cô lập sẵn** (`chayTheoRunner` chạy từng file một lệnh riêng). Chỉ đường mặc
định `chayVitest` gộp. Nói cách khác, tính chất change này cần đã tồn tại ở một trong hai đường — việc còn
lại là làm đường kia đạt cùng tính chất, chứ không phải phát minh ra nó.

## Goals / Non-Goals

**Goals**
- Probe thư viện không nạp được không giết lượt chấm, và không biến mất trong im lặng.
- Cách ly chỉ áp cho probe hỏng **độc lập với PR**.
- Người vận hành gỡ được probe / gỡ dấu / xoá thư viện từ màn, và mỗi lần đều để lại dấu vết.

**Non-Goals**
- Không đổi cách chọn nạn nhân đào thải, không đổi trần.
- Không sửa `chayTheoRunner` — đường ấy đã cô lập theo file.
- Không tự sửa probe hỏng, không tự xoá probe.

## Decisions

### D1 — «Lỗi nạp» nhận diện bằng HÌNH DẠNG kết quả, không bằng bắt chuỗi lỗi

Trong JSON của vitest, một file không nạp được xuất hiện thành một `testResults` có `message` và
`assertionResults` **rỗng**. Đó là dấu hiệu cấu trúc, không phụ thuộc lời văn của lỗi.

```ts
const loiNap = data.testResults.filter((tr) => !tr.assertionResults?.length && tr.message).map((tr) => tenFile(tr.name));
```

Cân nhắc dò chuỗi (`Cannot find module`, `SyntaxError`): **bác**. Lời văn lỗi đến từ Node, vitest, và cả
code repo đích — nó đổi theo phiên bản và theo ngôn ngữ. Một phép nhận diện dựa vào lời văn sẽ hỏng im
lặng đúng vào ngày ai đó nâng vitest.

**Khi không quy được về file:** `outFile` không tồn tại (vitest chết trước khi ghi) thì không có thông tin
per-file. Ca ấy giữ nguyên hành vi cũ — lượt chấm thất bại. Đoán bừa một file để cách ly còn tệ hơn.

### D2 — Cách ly chỉ theo NHÁNH GỐC, và đó là quyết định quan trọng nhất của change

| nạp trên gốc | nạp trên PR | nghĩa là | làm gì |
|---|---|---|---|
| ✗ | ✗ | probe mục, không liên quan PR | **cách ly** |
| ✓ | ✗ | **PR làm hỏng nó** | KHÔNG cách ly — để đường phân loại xử |
| ✗ | ✓ | PR sửa được thứ đang hỏng | không cách ly |

Cách ly theo triệu chứng «không nạp được» mà không hỏi «trên nhánh nào» sẽ âm thầm gỡ đúng những probe mà
PR vừa làm hỏng — lấy một finding thật rồi biến nó thành một dòng bảo trì. Đó là XANH GIẢ, hướng hỏng nguy
hiểm nhất của một cổng chấm.

**Hệ quả về thứ tự chạy.** Hôm nay nhánh PR chạy trước và `!br.ok` thì trả về ngay, nhánh gốc không chạy.
Sau change, khi nhánh PR báo lỗi nạp thì **vẫn chạy nhánh gốc** để biết file nào hỏng độc lập với PR. Ca
ấy trước đây cho ra **không thông tin gì**; nay nó tốn thêm một lượt sandbox và đổi lại biết được nguyên
nhân.

### D3 — Vòng chạy lại có trần 2

Mỗi vòng = 2 lượt sandbox (PR + gốc). Trần 2 vòng ⇒ tối đa 6 lượt sandbox ở ca xấu nhất.

Vì sao có trần: mỗi vòng tốn thời gian thật, và nếu loại hai đợt mà vẫn không chạy được thì nguyên nhân
gần như chắc chắn nằm ở hạ tầng test của repo đích chứ không ở probe nào. Hết trần thì lượt chấm thất bại
như cũ — fail-closed, ⛔C2.

### D4 — Dấu cách ly nằm trên mục sổ, và ĐƯỜNG ĐỌC tách làm hai

```ts
interface ProbeLibEntry {
  // …
  cach_ly?: { luc: string; ly_do: string; sha_goc: string };
}
```

- `readProbeLibrary(slug)` — đường **chạy chấm**: bỏ mục có `cach_ly`.
- `readLibraryIndex(slug)` — đường **màn hình**: giữ nguyên, có cờ để bày.

Hai đường đọc cho hai câu hỏi khác nhau: «chạy cái gì» và «đang có cái gì». Gộp chúng thì hoặc probe hỏng
lọt vào lượt chấm, hoặc probe biến mất khỏi màn không lời giải thích — mà cái thứ hai chính là thứ change
trước vừa mất công đóng lại.

### D5 — Ba hành động của người, và không đường nào cho máy

| đường | vai | xác nhận |
|---|---|---|
| `POST /api/probes/remove` (một probe) | `canOperate` | hộp xác nhận, nêu tên probe |
| `POST /api/probes/unquarantine` (gỡ dấu) | `canOperate` | không (đảo ngược được) |
| `POST /api/probes/purge` (cả thư viện) | `canOperate` | **gõ lại đúng tên repo** |

Vai `tu_dong` bị chặn ở `canOperate` — cùng cơ chế đã chặn nó ở cổng merge, không phải một phép kiểm mới
phải nhớ. Gỡ dấu không cần xác nhận vì nó **đảo ngược được**; hai đường kia thì không.

Cân nhắc đòi `canOperateGate` (vai duyệt cổng) cho `purge`: **bác**. Xoá thư viện không phải là cho code
vào trunk — nó không phải quyết định merge, và trộn hai thứ vào một vai làm cái vai ấy nhoè nghĩa. Nó là
việc vận hành, và cái chặn thật nằm ở bước gõ tên repo.

### D6 — Ghi sổ mang TÊN NGƯỜI, và chỉ ở loại gỡ-do-người

Sổ gỡ (dựng ở change trước) nhận thêm `loai: 'nguoi_go' | 'nguoi_xoa_thu_vien'` và trường `boi`. Hai loại
cũ (`dao_thai`, `trung_lap`) là máy quyết nên không có người chịu trách nhiệm; loại mới thì có, và đó là
thông tin không được mất.

## Architecture

- `packages/harness/src/sandbox.ts` — `chayVitest` trả thêm danh sách file lỗi nạp.
- `packages/harness/src/skill-code.ts` — vòng cách ly có trần; đếm probe thư viện thất lạc; số cách ly vào
  `probe_stats`.
- `packages/harness/src/probe-library.ts` — `cach_ly` trên mục sổ; `readProbeLibrary` lọc; ba hàm hành
  động ghi sổ.
- `packages/shared/src/types.ts` — `probe_stats.cach_ly`.
- `apps/web/src/server.ts` (delivery) — ba route `POST` + kiểm vai.
- `apps/web/src/ui-probes.ts` (delivery) — nhãn cách ly, nút, hộp xác nhận.

## Data Model

**`meta.json` đổi hình dạng — thêm trường TUỲ CHỌN `cach_ly` trên từng mục.** Bản cũ không có trường ấy
đọc ra `undefined`, tức «không cách ly» — đúng nghĩa. Không cần di trú, và bản cũ của engine đọc file mới
vẫn chạy (trường lạ bị bỏ qua).

**Sổ gỡ** nhận thêm hai giá trị `loai` và trường `boi`. Đường đọc đã bỏ qua dòng không hợp lệ và ĐẾM, nên
một bản cũ đọc file mới sẽ đếm chúng là dòng hỏng — chấp nhận được, và nó nói ra.

- Ghi `cach_ly`: trong khoá thư viện, sau khi lượt chấm kết thúc. **Không** ghi giữa chừng: một lượt chấm
  bị huỷ nửa đường không được để lại dấu cách ly trên một probe chưa kết luận.
- Ba hành động của người: trong khoá, ghi sổ trước rồi mới xoá file (⛔ ghi sổ mới trước, xoá bản cũ sau).
- Cache: không thêm cache nào — sửa tay `meta.json` vẫn có hiệu lực ở lượt đọc kế tiếp (⛔C6).

## Risks / Trade-offs

**[Cách ly nhầm probe mà PR vừa làm hỏng]** → D2. Đây là rủi ro nặng nhất: nó biến một finding thành im
lặng. Có ca đối kháng riêng cho đúng bảng ba hàng ở D2.

**[Thêm tới 4 lượt sandbox ở ca xấu]** → Trần 2 vòng. Đổi lại: ca ấy trước đây cho ra 0 thông tin.

**[Nút xoá trên màn]** → Màn này trước nay chỉ-đọc. Xác nhận hai bước, gõ tên repo cho `purge`, vai
`tu_dong` bị chặn, và mọi lần đều ghi sổ kèm tên người.

**[`probe_stats` thêm trường]** → Verdict đời cũ không có trường ấy; bề mặt đọc phải chịu được `undefined`
và khai «không đo được», KHÔNG phải `0`.

## Migration Plan

Không có bước di trú: `cach_ly` là trường tuỳ chọn, vắng mặt nghĩa là không cách ly.

Đường lùi: revert. Probe đã mang dấu `cach_ly` sẽ được bản cũ chạy lại như thường — tức quay về hành vi
«một probe hỏng giết cả lượt». Ghi rõ ở đây để người bấm revert biết mình đang mua lại cái gì.

## Open Questions

Không còn. Ranh giới với việc sửa `chayTheoRunner` chốt ở Non-Goals: đường ấy đã cô lập theo file sẵn.
