## Why

Thư viện probe tích luỹ theo repo (`probes-lib/<slug>/`) giữ lại mọi probe **xanh trên nhánh gốc**, rồi
chạy TẤT CẢ chúng ở MỌI lượt chấm, trên CẢ HAI nhánh. PO chất vấn tiền đề của cả cơ chế ngày 06/09; em đo,
và số đo đứng về phía chất vấn.

**Đo được:**

| | |
|---|---|
| Prod `demo-credit-approval` | 7 probe · 5 lượt chạy · lịch sử tích luỹ `{pass: 5}` |
| **Đã từng bắt hồi quy** (`da_bat_hoi_quy`) | **0 / 7** |
| Bench (2 repo, 15 probe) | 0 lượt chạy được ghi |
| Nợ #18 đo trước đây | **36 probe** thư viện chạy cho một PR đổi **3 file** |
| Trần thư viện mặc định | **100** ⇒ thiết kế cho phép **200 lượt thực thi test** mỗi lượt chấm |

**Ba lỗi cấu trúc, không phải ba lỗi hiện thực:**

1. **Tiêu chí nạp chứng minh sai thứ.** Probe được giữ vì nó **xanh** trên nhánh gốc. Nhưng chính repo này
   có luật (`CLAUDE.md` §Lưới): một ca xanh chưa chứng minh được gì; ca khoá một gác phải có đột biến làm
   nó **ĐỎ**, không thì nó là *«ca xanh trên hệ đã hỏng»*. Thư viện đang tích luỹ theo đúng tiêu chí mà
   luật của chính sản phẩm gọi là **không đủ để coi là một phép thử**.

2. **Thông tin đúng nằm ở sai đầu đường ống.** Trường `da_bat_hoi_quy` — «probe này đã từng nổ chưa» — chỉ
   được dùng lúc **đào thải** (R10.22.3), không dùng lúc **nạp**. Điều kiện nạp chỉ đọc `bs.status ===
   'passed'`; **trạng thái trên nhánh PR không được hỏi tới**. Nên probe *đã chứng minh mình đỏ được* và
   probe *chưa bao giờ được quan sát ở trạng thái nào ngoài xanh* vào thư viện y như nhau.

3. **Nó nằm nhầm chỗ.** Một probe là test hồi quy cho **đúng repo đích** — nó import `../src/db.js`, gọi
   `/api/de-xuat`, dùng tên trường của repo ấy. Không có logic chung nào, và **không bao giờ dùng chung
   giữa hai repo** (thư viện khoá theo `repoSlug`). Tài liệu thì **không sinh probe nào cả**. Nếu một hành
   vi đáng ghim vĩnh viễn, chỗ đúng của nó là **bộ test của chính repo đích**:

   | | trong repo đích | trong `probes-lib/` |
   |---|---|---|
   | chạy khi nào | **mọi commit**, ở CI của repo | chỉ khi CheckMate chấm — tức muộn hơn |
   | chạy mấy lần | 1 | **2** (cả hai nhánh) |
   | ai biết nó tồn tại | cả đội | **không ai** |
   | khi nó mục (đổi tên module) | đội thấy đỏ và sửa | **mục âm thầm** — đúng 5 lượt chết trên prod 31/08 |

**Hình dạng phí là chỗ quyết định.** Sinh mới tốn **token một lần mỗi lượt**, số probe có **trần cứng**
(≤12). Thư viện tốn **0 token** nhưng số probe **tăng mãi**, không liên quan gì tới PR đang chấm. Đó là
đổi một khoản tiết kiệm **một lần** lấy một khoản chi **định kỳ, không trần theo việc**.

## What Changes

**BREAKING — gỡ hẳn thư viện probe tích luỹ.**

- **Không đọc, không chạy** probe thư viện trong lượt chấm (`readProbeLibrary` ở `skill-code.ts:533` và
  việc trộn `nguon: 'thu_vien'` vào bộ chạy ở dòng 725).
- **Không nạp** probe vào thư viện nữa. `admitToLibrary` và cả bộ bốn tầng chống trùng đi cùng.
- Gỡ **cách ly** — nó tồn tại vì probe thư viện *mục* theo thời gian; không còn thư viện thì không còn mục.
- Gỡ **đào thải theo điểm**, **trần thư viện**, **sổ gỡ bỏ**.

**Thay bằng: probe là DÙNG MỘT LẦN, hành vi đáng ghim thì GIAO cho repo đích.**

Cuối mỗi lượt chấm, engine xếp probe theo **chất lượng bằng chứng** — không theo «xanh hay đỏ»:

| hạng | điều kiện | bằng chứng | xử lý |
|---|---|---|---|
| **1** | trạng thái `hoi_quy` hoặc `vi_pham_luat_moi` — probe **đã nổ** | **quan sát trực tiếp**: nó đỏ được, và hành vi ấy đã gãy thật một lần | **đề xuất giao**, không cần kiểm gì thêm |
| **2** | xanh cả hai nhánh, nhưng neo vào **luật MỚI** mà test của repo **chưa phủ** | lỗ hổng máy đo được (`findNewRules` + `refHitsNew` + `ruleCoverage`) — chưa quan sát thấy đỏ | phải qua **cửa đột biến** mới được đề xuất |
| **3** | còn lại | không có gì để chứng minh | **vứt** — đầu dò đã đo xong, hết việc |

⛔ **Phép đột biến chỉ đặt ở đúng chỗ thiếu quan sát.** Hạng 1 đã có bằng chứng bằng quan sát nên không
cần; hạng 2 chưa có nên phải **tạo ra**. Đó là lý do chi phí đột biến không rơi lên mọi probe.

**Đầu ra mới thay cho việc âm thầm tích luỹ:** verdict mang mục **«đề xuất giao cho repo»** — mã probe, luật
nó neo, lý do đề xuất, và mã nguồn để đội dán vào bộ test của họ.

**Màn «Thư viện probe» đổi vai** thành **hàng đợi giao** — cùng một bề mặt, thôi liệt kê tài sản tích luỹ,
chuyển sang liệt kê thứ đang chờ giao đi.

**Dữ liệu prod KHÔNG bị xoá.** `probes-lib/` là tài sản theo `CLAUDE.md`; change này thôi ĐỌC nó, không xoá
nó. Deploy không đụng tới.

## Capabilities

### New Capabilities
- `probe-handover`: xếp hạng probe theo chất lượng bằng chứng, cửa đột biến cho hạng 2, và bề mặt đề xuất
  giao cho repo đích.

### Modified Capabilities
- `probe-library`: **REMOVED gần hết** — 13 requirement về nạp/đào thải/trần/lịch sử không còn hiệu lực.
- `probe-library-screen`: **REMOVED/MODIFIED** — màn đổi từ «duyệt thư viện» sang «hàng đợi giao».
- `probe-quarantine`: **REMOVED toàn bộ** — cách ly chỉ tồn tại vì thư viện mục.
- `probe-classification`: **KHÔNG delta** — xem ghi chú dưới.

## Luật chạm tới

- **Luật chạm tới:**
  - `probe-handover › <mọi requirement>` — capability MỚI, toàn bộ ADDED.
  - `probe-library › <13 requirement>` · `probe-quarantine › <3 requirement>` — REMOVED.
  - `probe-library-screen › <4 requirement>` — REMOVED/MODIFIED sang hàng đợi giao.
  - `probe-classification` — **KHÔNG chạm luật**. Trạng thái `nghi_loi_co_san` do đúng một dòng sinh ra
    (`skill-code.ts:737`, gác bằng `nguon === 'thu_vien'`) và **chưa bao giờ được khai trong spec**. Gỡ thư
    viện làm nó không tới được nữa — tức code thôi làm một việc spec chưa từng cho phép. Bảng chân trị của
    `probe-classification` **đúng hơn** sau change, không cần sửa.
  - **⛔C2** — bỏ một lớp phủ hồi quy là **giảm** khả năng bắt lỗi. Change phải khai cái mất, và KHÔNG
    được để chỗ nào biến «thôi kiểm» thành «đã kiểm và sạch».
  - **⛔C5** — gỡ export thì gỡ khỏi bảng module `checkmate.yml`.
  - Hàng `docs/r-rules-map.md`: mã R10.* trỏ `probe-library` thành `obsolete`/đổi nhà.

## Impact

- `packages/harness/src/probe-library.ts` (973 dòng) · `dedup-probe.ts` (122) — **gỡ**.
- `packages/harness/src/skill-code.ts` — gỡ đường đọc/nạp/cách ly; thêm bước xếp hạng + cửa đột biến.
- `apps/web/src/ui-probes.ts` (350 dòng) — đổi vai sang hàng đợi giao.
- `apps/web/src/config.ts` — gỡ `LIBRARY_CAP`, `LIBRARY_CAP_SUGGESTED`.
- `apps/web/src/server.ts` — gỡ route thư viện/cách ly/dọn; thêm route hàng đợi giao.
- `packages/shared/src/types.ts` — gỡ `library_changes`, `probe_stats.cach_ly`; thêm mục đề xuất giao.
- `checkmate.yml` — cập nhật bảng module (⛔C5).
- Lưới: `probe-library` (15 ca) · `probe-library-screen` (47) · `probe-quarantine` (37) · `thu-vien` (30) ·
  `dedup-probe` (26) — **155 ca** gỡ hoặc viết lại.
