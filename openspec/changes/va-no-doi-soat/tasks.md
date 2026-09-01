# Vá bốn nợ của Đ6 (M14–M17)

Bốn finding vòng mười ba của change `doi-soat-cong` được PO chốt tách thành nợ để đóng PR #21, và
nay xử trọn ở đây. Không cái nào đổi hành vi so với luật đang khai — hai cái kéo hiện thực khớp lại
luật, hai cái sửa **mô tả luật** cho khớp thứ đã chốt.

## 1. Fix

- [x] 1.1 **M14 — root cause:** `daTraVe()` lọc `sc.hanh_dong = 'reject'` mà không xét cột
      `ngoai_cong`, trong khi [R6.21](../../../specs/R6-verdict-va-cong-merge.md) khai **«mọi phép
      đếm/lọc hành động cổng PHẢI xét trường này»**. Hiện thực lệch với luật đã khai — đúng loại bug
      fix. Hậu quả: một pull request bị đóng **trên GitHub** (đối soát tự ghi hàng, không ai bấm cổng)
      vẫn hiện trong khối «đã trả về dev» ở trang chủ — đúng cái khối sinh ra để hàng đợi không đánh
      mất việc, nên nó nói sai thì người đọc bỏ sót việc thật.
- [x] 1.2 **M14 — fix:** `apps/web/src/kho/kho-run.ts` · `daTraVe()` — thêm `AND sc.ngoai_cong = 0`.
      Soi CỬA SONG SINH cùng vai trước khi coi là xong: mọi câu truy vấn khác đọc `so_cong` để **đếm
      hoặc lọc** hành động cổng cũng phải xét cờ này, hoặc phải nói rõ vì sao không cần.

- [x] 1.3 **M15 — root cause:** không phải lỗi code. Ba vòng chấm liên tiếp đề nghị đổi cột «người»
      của hàng đối soát sang danh tính hệ thống, viện dẫn R11.2/R11.4 — đúng điều
      [R6.24b](../../../specs/R6-verdict-va-cong-merge.md) đã bác sau hai vòng. Vấp lại lần thứ ba là
      dấu hiệu **văn bản luật chưa chặn được hiểu nhầm**, không phải người đọc cẩu thả.
- [x] 1.4 **M15 — fix (sửa MÔ TẢ, không đổi hành vi):** bổ sung vào R6.24b một câu ranh giới nói
      thẳng: **đối soát KHÔNG phải một hành động cổng** — nó ghi nhận một hành động đã xảy ra ở nơi
      khác, chạy trong chu kỳ chế độ trực và không có phiên người dùng nào; nên R11.2 (không phiên thì
      từ chối hành động cổng) và R11.4 (mọi chỗ đọc danh tính đi qua một hàm) **không áp cho cột
      «người» của hàng ngoài-cổng**, vì cột đó chép danh tính của một hệ khác chứ không đọc danh tính
      của hệ này. Thêm dẫn chiếu ngược từ R11.2 sang R6.24b để người đọc R11 thấy ngoại lệ ngay tại chỗ.

- [x] 1.5 **M16 — root cause:** gác [R6.12](../../../specs/R6-verdict-va-cong-merge.md) (chế độ demo
      không thao tác cổng) đặt ở đầu `doiSoatCong`; cửa di trú bỏ cột trong `db.ts` không có gác nào,
      nên ở chế độ demo hàng cũ vẫn được nạp vào `so_cong` một lần lúc khởi động.
- [x] 1.6 **M16 — fix (sửa MÔ TẢ, không đổi hành vi — PO ủy quyền chọn, em chọn A):** giữ nguyên hành
      vi và khai rõ **phạm vi** của R6.12 là *thao tác cổng* (merge / trả về dev / ghi một hành động
      MỚI), **không phải** *di trú dữ liệu lúc khởi động*. Lý do chọn A chứ không phải B («demo không
      di trú, không bỏ cột»): gác cửa di trú lại thì cột vẫn bị bỏ mà dữ liệu **không được cứu** —
      biến một bước bảo toàn thành một bước mất dữ liệu; còn để hai schema song song thì mọi đường đọc
      phải chịu được cả hai, đúng loại phức tạp đẻ ra lỗi im lặng. Di trú **không tạo ra** hành động
      cổng nào: nó chuyển chỗ một bản ghi đã tồn tại, và ghi chú của hàng nói rõ nguồn.

- [x] 1.7 **M17 — root cause:** `chiTietNgoaiCong` đứng ngay trước `ghiSoCong` trên đường ghi hàng
      ngoài-cổng, nhưng nội suy `${v?.result}` và `String(severity)` trên giá trị do bên ngoài đưa vào
      nên vẫn còn đường ném (Symbol, `toString` tự ném). [R6.25](../../../specs/R6-verdict-va-cong-merge.md)
      đòi lưới bọc theo TỪNG lượt ghi. Đầu vào kích hoạt không phát sinh từ dữ liệu JSON/SQLite thật,
      nên đây là vá **đường**, không phải vá triệu chứng đang xảy ra.
- [x] 1.8 **M17 — fix:** an toàn hoá hai chỗ nội suy bằng một hàm đổi-sang-chuỗi không ném, thay vì
      bọc `try` quanh cả hàm. Bọc `try` rồi nuốt lỗi sẽ trả về một chuỗi mô tả nghèo hơn mà **không ai
      biết là đã nghèo đi** — đúng khuôn «khai dữ liệu không đọc được thành bằng không» mà R6.27 vừa
      cấm; đổi-sang-chuỗi an toàn thì hàng sổ vẫn nói đúng thứ đọc được và nói ra thứ không đọc được.

- [x] 1.9 **Khai hợp đồng repo** (⛔C5): thêm/đổi export nào thì cập nhật bảng module trong
      `checkmate.yml` — lưới hợp đồng đã bắt hụt 5 lần trong lịch sử repo.
