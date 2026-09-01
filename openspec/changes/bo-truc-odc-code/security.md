# Security — bộ trục phân loại code

## Bề mặt thay đổi

Change này KHÔNG chạm: bí mật/token, danh tính/phiên, cổng merge, sổ chỉ-ghi-thêm, đường quyết định
PASS/FAIL. Nó chạm: nội dung prompt (thêm danh mục trigger + ví dụ), hình dạng JSON model trả (3
trường mới), và telemetry trong verdict.

## Rà theo trục

**Tiêm chỉ thị qua dữ liệu ngoài (⛔C4).** Danh mục trigger và ví dụ là hằng trong repo CheckMate —
không phải dữ liệu repo đích, không mở đường tiêm mới. Chỗ duy nhất dữ liệu đích chạm trục:
`dieu_kien` RegExp đánh trên spec repo đích để bật ví dụ — cơ chế CŨ của R12.4, không đổi trong
change này; spec độc hại chỉ bật/tắt được ví dụ vô hại, không đổi được văn bản phát.

**Model là đầu vào không tin được.** Ba trường mới đều qua validate enum đóng, lạ → `khong_ro` +
log. Giá trị model trả KHÔNG bao giờ được nội suy vào SQL/lệnh/log định dạng tự do — đường ghi
verdict là JSON.stringify sẵn có. `va_toi_thieu` là chuỗi tự do của model: chỉ hiển thị UI (đã
escape như title_vi/what_vi hiện hành), không đi vào lệnh nào.

**Fail-closed đúng chiều cho từng trục.** Severity giữ nguyên đường cũ (lạ → high). Trục telemetry
cố ý KHÔNG fail-closed về mức nặng — `khong_ro` — vì nó không gác gì cả; cho nó quyền đổi verdict
mới là mở một đường lách («type bịa khéo thì merge được»). Ranh giới này có ca T4.1 khoá.

**Goodhart là rủi ro an toàn, không chỉ chi phí.** Probe chiếu lệ rải đều trigger làm false-PASS
trông đáng-tin-hơn — tức làm yếu chính cái cổng. R14.4 + T1.5 khoá bằng chuỗi trên prompt dựng thật.

**Dữ liệu cũ.** Ba trường optional — replay verdict cũ không gãy (T2.3); không di trú dữ liệu,
không đụng schema SQLite.

## Kết luận

Không có đường nào từ change này tới bí mật, danh tính, hay quyết định cổng. Rủi ro thật duy nhất là
Goodhart-trên-trigger, đã thành luật R14.4 kèm test khoá chuỗi.
