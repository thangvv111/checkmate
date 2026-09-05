## Why

CheckMate tích luỹ một **tài sản regression** — thư viện probe trong `probes-lib/`, tách theo repo — và
hôm nay **không ai nhìn được vào nó**. Mục sidebar «Thư viện probe» có sẵn, route `/probes` có sẵn, nhưng
trang trả về là một tấm biển «chưa dựng» (`apps/web/src/ui-probes.ts`): gói design CCS vẽ đủ màn từ 30/08,
phần backend cố ý để lại sau.

Vì sao bây giờ: riêng hôm nay đã hai lần phải **đọc thư viện bằng `ssh` + `cat` trên máy chủ** để trả lời
những câu người vận hành đáng ra bấm một cái là thấy — «repo này có bao nhiêu probe», «probe nào từng bắt hồi quy»,
«probe nào chết kéo dài». Lần gần nhất còn nghiêm trọng hơn một sự bất tiện: năm lượt webhook chết liên
tiếp trên prod vì một probe cũ import ba module đã đổi tên, và **triệu chứng nhìn từ giao diện là lượt chấm
hỏng không rõ lý do**. Thư viện là thứ duy nhất giải thích được, và nó vô hình.

Đây là change **chỉ-đọc**: mở cửa sổ nhìn vào tài sản. Phần hành động lên nó — cách ly probe không nạp
được, xoá một probe, xoá cả thư viện của một repo — là change riêng ngay sau, vì nó đụng đường nóng của
engine và xoá là một chiều trên dữ liệu prod.

## What Changes

- Thay trang «chưa dựng» bằng **màn Thư viện probe thật** theo gói design CCS §5b, đọc theo **repo đang
  chọn**: đầu màn `n/<trần> probe` (trần đọc từ cấu hình, không hard-code) · ghi chú di trú gập được ·
  từng dòng probe với tên file mono, tag luật spec, mục đích, commit sinh + ngày nạp.
- **Dải hành vi 20 ô** — đầu tư thị giác chính của màn: mới nhất bên phải, năm trạng thái phân biệt được
  bằng màu, `title` hover mang `commit · ngày · trạng thái`, và **một dòng tóm tắt bằng chữ** nói thẳng
  «n lần bắt được hồi quy» / «chưa bắt được hồi quy nào» / «fail cả hai nhánh — lỗi có sẵn».
- **Xem code probe inline** — panel mở tại chỗ, không rời màn.
- **Khối «Probe đã gỡ»** — bảng chỉ đọc: probe bị gỡ · probe được giữ · lý do · bằng chứng. Kèm một
  **sổ gỡ append-only trong thư viện** để bảng ấy có nguồn.

  Sổ này phủ **cả hai** đường gỡ một probe đã có, vì đo được hôm nay chúng im lặng ở hai mức khác nhau:
  gỡ-vì-trùng còn để lại `probe_id · action · reason` trong verdict (mất vế «giữ cái nào» và mất bằng
  chứng), còn **đào thải vì trần thì không để lại gì ngoài một dòng `console.log`** — verdict không mang
  nó. Người vận hành thấy thư viện tụt từ 89 xuống 40 không có cách nào biết cái gì đã đi. Gói design chỉ
  vẽ khối «đã gỡ vì trùng lặp»; đặt tên khối theo đúng một lý do trong khi có hai lý do làm probe biến mất
  là một lời giải thích nửa vời, và nửa vời ở đây tệ hơn không giải thích.
- **Hai trạng thái rỗng KHÁC NHAU**, không gộp: «repo này chưa có probe nào — thư viện dựng dần từ các lượt
  chấm» (đã tra, chưa có gì) và «chưa kết nối repo nào» (không có gì để tra).
- API JSON `GET /api/probes` cho màn, cùng nguồn với HTML.
- **KHÔNG** trong change này: xoá probe, xoá thư viện, cách ly probe không nạp được. Đường đào thải bị
  chạm ĐÚNG một chỗ — ghi thêm một bản ghi vào sổ; **cách chọn nạn nhân giữ nguyên từng nấc một**, và có ca
  khoá điều đó.

## Capabilities

### New Capabilities

- `probe-library-screen`: màn đọc thư viện probe — bày được cả phần YẾU của tài sản (probe chết, flaky,
  chưa từng bắt gì), phân biệt hai trạng thái rỗng, và không bịa số khi không đo được.

### Modified Capabilities

- `probe-library`: thêm yêu cầu **ghi lại mọi lần gỡ một probe đã có vào sổ thư viện** (append-only) — hai
  requirement chạm tới: «Gỡ trùng bốn tầng» và «Trần đếm theo probe, và đào thải chọn nạn nhân theo ĐIỂM
  bốn nấc». Đây là đổi YÊU CẦU chứ không phải đổi hiện thực: hôm nay luật chỉ đòi «gỡ ĐÚNG», change này
  đòi thêm «gỡ xong phải còn dấu vết đọc được». Không có vế đó thì bảng ở §5b không có nguồn nào để dựng,
  và một quyết định làm thay đổi tài sản vĩnh viễn hôm nay không để lại gì.

## Luật chạm tới

- **Luật chạm tới:** `probe-library-screen › 4 requirement ADDED` · `probe-library › Gỡ trùng bốn tầng —
  cơ học trước, model sau, và nghiêng về GIỮ` (MODIFIED — thêm vế ghi sổ) · `probe-library › Trần đếm theo
  probe, và đào thải chọn nạn nhân theo ĐIỂM bốn nấc` (MODIFIED — thêm vế ghi sổ) · **⛔C3** (code
  probe hiện nguyên văn lên màn: probe do model sinh từ repo đích, phải qua thoát HTML và không được kéo
  theo giá trị cấu hình nào) · **⛔C4** (mọi trường của probe — `muc_dich`, `spec_rule`, tên file — là dữ
  liệu ngoài, hiện lên màn thì phải thoát) · **⛔C5** (export mới khai `checkmate.yml`) · `giao-dien-ccs`
  (không đổi yêu cầu — màn mới phải TUÂN luật rỗng-≠-hỏng và luật hai họ token đã có).

## Impact

- `apps/web/src/ui-probes.ts` — thay toàn bộ: từ tấm biển «chưa dựng» thành màn thật.
- `apps/web/src/server.ts` — route `/probes` đọc dữ liệu thật; thêm `GET /api/probes` và đường đọc code
  của một probe.
- `packages/harness/src/probe-library.ts` — thêm sổ gỡ append-only trong `meta`, ghi ở **hai** chỗ đo được
  là toàn bộ đường gỡ probe đã có (`admitToLibrary` khi vượt trần · `findAndDropBehaviorDuplicates`), và một
  hàm đọc thư viện kèm sổ ấy cho tầng giao diện.
- `apps/web/src/ui.ts` — lớp CSS của dải hành vi và panel code.
- `checkmate.yml` — khai export mới.
- Không đụng: đường chấm, đào thải, cổng merge, sổ cái.
