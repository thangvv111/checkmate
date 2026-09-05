## Why

Ngày 31/08 trên prod: **năm lượt webhook chết liên tiếp**. Nguyên nhân là một probe thư viện cũ import ba
module đã đổi tên. Nó không nạp được, và vì cả thư viện chạy trong **một** lệnh test, một file hỏng kéo
theo cả lượt chấm. Triệu chứng nhìn từ giao diện chỉ là «lượt chấm hỏng» — không ai nối được nó với thư
viện cho tới khi đọc `probes-lib/` bằng `ssh`.

Đo được hôm nay, và vế thứ hai nặng hơn vế đầu:

| chỗ | hiện trạng |
|---|---|
| `chayVitest` | ghi **cả thư viện** vào một lệnh; `ok = numTotalTests > 0` |
| `chayTheoRunner` | chạy **từng file một lệnh riêng** — đã cô lập sẵn |
| `thongKe.that_lac` | tính trên `keHoach` (probe MỚI) — **probe thư viện biến mất không được đếm ở đâu cả** |

Nghĩa là có hai kiểu hỏng, và kiểu thứ hai **im lặng**: nếu một phần thư viện không nạp được mà những
probe khác vẫn thu được test, lượt chấm chạy tiếp và verdict trông bình thường — trong khi 20 phép thử đã
không chạy và không con số nào trên verdict nói điều đó. Một cổng chấm mất 20 phép thử mà vẫn ra PASS là
đúng thứ ⛔C2 cấm.

Song song, thư viện nay **nhìn được** (change trước) nhưng vẫn **không tác động được**: probe hỏng chỉ gỡ
được bằng cách vào máy chủ xoá file.

## What Changes

- **Cách ly probe không nạp được, thay vì để nó giết cả lượt chấm.** Khi lệnh test đổ vì lỗi nạp, engine
  xác định file gây lỗi, **loại chúng khỏi lượt này**, chạy lại phần còn lại, và **đánh dấu cách ly** trong
  sổ thư viện. Số lần chạy lại có trần; hết trần mà vẫn đổ thì lượt chấm hỏng như cũ — fail-closed.
- **Probe cách ly KHÔNG bị xoá.** Nó ở lại thư viện với một dấu, không được chọn vào lượt chấm nào nữa cho
  tới khi người vận hành gỡ dấu hoặc xoá nó. Xoá tự động là để máy quyết định một việc một chiều.
- **Probe thư viện thất lạc phải được ĐẾM.** `probe_stats` nay tính cả probe thư viện, không chỉ probe mới
  — và verdict khai số probe bị cách ly trong lượt.
- **Hành động của người vận hành, từ màn Thư viện probe**: gỡ **một** probe · **gỡ dấu cách ly** cho một
  probe · **xoá toàn bộ thư viện của một repo**. Cả ba ghi vào sổ gỡ đã có, mang loại riêng để phân biệt
  với đào thải và gỡ-trùng.
- **Máy không bao giờ xoá theo yêu cầu.** Ba đường trên là `POST` sau cửa phiên, đòi vai thao tác được, và
  MUST NOT gọi được từ vai tự động. Xoá cả thư viện đòi xác nhận bằng cách gõ đúng tên repo.
- **KHÔNG** trong change này: đổi cách chọn nạn nhân đào thải · đổi trần · sửa `chayTheoRunner` (đường ấy
  đã cô lập sẵn) · tự động sửa probe hỏng.

## Capabilities

### New Capabilities

- `probe-quarantine`: probe không nạp được bị cô lập chứ không giết lượt chấm, và việc cô lập ấy phải
  hiện ra trên verdict — không được đổi một lượt chấm mất phép thử thành một lượt chấm trông bình thường.

### Modified Capabilities

- `probe-library`: thêm yêu cầu **probe mang dấu cách ly không được chọn vào lượt chấm**, và **gỡ do người
  vận hành phải ghi vào sổ gỡ** như hai loại gỡ đã có.
- `probe-library-screen`: thêm yêu cầu **bày probe đang bị cách ly cùng lý do**, và **hành động phải nói
  trước cái mất** — màn này trước nay chỉ-đọc, nay có nút phá huỷ.
- `verdict-contract`: vùng chưa-kết-luận-được của `probe_stats` thêm **probe bị cách ly**, và probe thư
  viện thất lạc được đếm như probe mới thất lạc. *(Tra rồi: capability này giữ vế «những số ấy phải CÓ
  MẶT»; vế «bày ra» thuộc `man-run`, nên cả hai đều phải sửa.)*
- `man-run`: bảng số liệu verdict bày thêm số probe bị cách ly — cùng chỗ với bốn số vùng xám đã có.

## Luật chạm tới

- **Luật chạm tới:** `probe-quarantine › requirement ADDED` · `probe-library › Trần đếm theo probe…` và
  `› Gỡ trùng bốn tầng…` (MODIFIED — thêm loại gỡ do người, và dấu cách ly loại probe khỏi lượt) ·
  `probe-library-screen › Màn thư viện bày cả phần YẾU…` (MODIFIED — thêm probe cách ly) ·
  `verdict-contract › Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ` (MODIFIED) ·
  `man-run › Verdict phải khai cả phần yếu của chính lượt chấm` (MODIFIED) ·
  **⛔C1** (nút phá huỷ mới: máy MUST NOT tự gọi; vai tự động bị chặn) · **⛔C2** (cách ly làm lượt chấm
  chạy với ÍT phép thử hơn — phải hiện ra, không được biến thành PASS im lặng) · **⛔C3** (thông điệp lỗi
  nạp probe có thể mang đường dẫn sandbox và nội dung repo đích) · **⛔C5** (export mới khai `checkmate.yml`).

## Impact

- `packages/harness/src/sandbox.ts` — phân biệt **lỗi NẠP** với **test fail**, và trả về file gây lỗi.
- `packages/harness/src/skill-code.ts` — vòng chạy lại có trần; đếm probe thư viện thất lạc; đưa số cách
  ly vào `probe_stats`.
- `packages/harness/src/probe-library.ts` — dấu cách ly trên `ProbeLibEntry`; loại probe cách ly khỏi
  `readProbeLibrary`; ba hàm hành động (gỡ một probe, gỡ dấu, xoá thư viện) ghi sổ.
- `packages/shared/src/types.ts` — trường mới trên `probe_stats`.
- `apps/web/src/server.ts` — ba route `POST` sau cửa phiên + kiểm vai.
- `apps/web/src/ui-probes.ts` — nhãn cách ly, nút hành động, hộp xác nhận.
- `checkmate.yml` — khai export mới.
