# probe-library

## REMOVED Requirements

Mười một yêu cầu dưới đây là **cơ chế của một cái kho**: nạp vào, chống trùng, giữ khoá, đếm trần, đào thải,
tích lịch sử. Chúng được viết kỹ và chạy đúng — cái sai không nằm ở chúng, mà ở **tiền đề** rằng cái kho ấy
đáng tồn tại.

**Reason chung cho cả mười một:** tiêu chí nạp của kho là **«probe xanh trên nhánh gốc»**, tức giữ probe vì
nó **không nổ**. Luật lưới của chính sản phẩm này nói một ca xanh chưa chứng minh được gì. Đo trên prod:
**0/7 probe từng bắt hồi quy**, mà cả 7 vẫn chạy ở mọi lượt chấm trên **cả hai nhánh**; trần mặc định 100
cho phép tới **200 lượt thực thi test** mỗi lượt chấm, không liên quan gì tới PR đang xét. Và thứ được tích
luỹ vốn là **test hồi quy của repo đích** — chỗ đúng của nó là bộ test của repo ấy, nơi nó chạy mọi commit,
chạy một lần, và có người trông.

**Migration chung:** không có dữ liệu nào phải chuyển. `probes-lib/` trên máy chủ **được giữ nguyên trên
đĩa** — change này thôi ĐỌC nó, không xoá nó (nó là tài sản prod theo `CLAUDE.md`). Vai trò của kho được
thay bằng capability `probe-handover`: probe đáng giữ đi ra ngoài dưới dạng **đề xuất giao cho repo đích**
thay vì ở lại trong một kho engine tự đọc.

### Requirement: Tên file probe suy từ NỘI DUNG, và hậu tố nới dài ra khi còn đụng
**Reason**: đặt tên file trong kho — không còn kho thì không còn file để đặt tên.
**Migration**: không có; file cũ ở lại trên đĩa, không ai đọc.

### Requirement: Chờ khoá hết giờ thì VẪN làm việc, không bỏ probe
**Reason**: khoá liên tiến trình bảo vệ sổ dùng chung của kho.
**Migration**: không có sổ dùng chung nữa; đề xuất giao đi theo verdict của từng lượt, không ai ghi đè ai.

### Requirement: Code probe ở lại dạng FILE vì nó là mã nguồn phải chạy được
**Reason**: nói về cách kho lưu code.
**Migration**: tính chất «phải chạy được» **chuyển nhà** sang `probe-handover` — đề xuất giao mang mã nguồn
chạy được, vì đội repo đích phải dán được nó vào bộ test của họ.

### Requirement: Probe tách ra là artifact MỚI chưa từng chạy, và phải chạy sạch trước khi được nạp
**Reason**: đây chính là tiêu chí nạp bị bác bỏ — «chạy sạch trên nhánh gốc thì nhận».
**Migration**: thay bằng xếp hạng theo bằng chứng ở `probe-handover`; hạng 2 phải qua **cửa đột biến** —
chứng minh **đỏ được**, chứ không phải chứng minh xanh.

### Requirement: Lời gọi model phân xử trùng lặp nằm NGOÀI khoá thư viện
**Reason**: chống trùng khi nạp vào kho.
**Migration**: không còn nạp, không còn trùng để phân xử. `dedup-probe.ts` gỡ theo.

### Requirement: Trần thư viện đọc từ biến môi trường chỉ nhận số nguyên sạch, và bị kẹp hai đầu
**Reason**: trần của kho.
**Migration**: không có trần vì không có tích luỹ; số probe mỗi lượt vẫn bị `max_probe` kẹp như cũ.

### Requirement: Đọc thư viện ngoài khoá phải chịu được file bị lượt song song dọn
**Reason**: đọc kho khi có lượt chạy song song.
**Migration**: không đọc kho nữa.

### Requirement: Sổ dùng chung được bảo vệ HAI lớp — khoá cho cuộc đua, ghi atomic cho cái chết giữa chừng
**Reason**: bảo vệ `meta.json` của kho.
**Migration**: không còn sổ dùng chung.

### Requirement: Hạt nạp là TỪNG PROBE, và thư viện đời bộ được di trú tự động
**Reason**: hình dạng dữ liệu trong kho, và đường di trú từ đời cũ sang đời probe.
**Migration**: không di trú gì thêm; dữ liệu đời cũ nằm yên trên đĩa và không được đọc.

### Requirement: Trần đếm theo probe, và đào thải chọn nạn nhân theo ĐIỂM bốn nấc
**Reason**: đào thải khi kho chạm trần. ⚠ Nấc R10.22.3 dùng `da_bat_hoi_quy` — **thông tin đúng, đặt sai
đầu đường ống**: nó chỉ quyết ai bị đá ra khi đầy, không quyết ai được vào.
**Migration**: chính tín hiệu ấy **chuyển nhà** sang `probe-handover` và lên **đầu** đường ống — nó thành
tiêu chí hạng 1, tức thứ quyết định probe nào đáng giữ ngay từ lượt sinh ra nó.

### Requirement: Gỡ trùng bốn tầng — cơ học trước, model sau, và nghiêng về GIỮ
**Reason**: chống trùng khi nạp.
**Migration**: không còn nạp.

### Requirement: Lịch sử hành vi là BẰNG CHỨNG, và không phải nhãn nào cũng tính
**Reason**: lịch sử chỉ có nghĩa khi cùng một probe chạy lại nhiều lượt — điều không còn xảy ra.
**Migration**: bằng chứng nay lấy **trong một lượt** (probe nổ hay không nổ), không tích qua nhiều lượt.

### Requirement: Máy tách phải hiểu regex literal khi đếm ngoặc
**Reason**: **CHUYỂN NHÀ**, không mất. Máy tách vẫn cần — chỉ đổi việc: trước tách ra để **nạp vào kho**,
nay tách ra để **giao đi**. Nó không còn thuộc về một capability về kho.
**Migration**: khai lại nguyên vẹn ở `probe-handover › Tách một probe ra khỏi file nhiều probe phải hiểu
regex literal`, kèm scenario cũ và một scenario mới cho ca không tách được. Code `splitOneProbe` +
`checkBalanced` GIỮ NGUYÊN, chỉ đổi chỗ gọi.
