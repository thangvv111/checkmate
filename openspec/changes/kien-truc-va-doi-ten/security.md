# Security — kiến trúc tầng + đổi tên lớp A

## Bề mặt thay đổi

Change này **không thêm hành vi nào**: nó dời một file, đổi nhãn định danh, và thêm hai lưới test.
Nhưng nó chạm **mọi module**, trong đó có những module giữ tài sản nhạy cảm — nên rủi ro không nằm ở
tính năng mới mà ở **chỗ đổi tên làm hỏng một gác đang đứng**.

## Rà theo trục

**Bí mật không rò (⛔C3).** Các module chạm token/khoá/mật khẩu (`kho-bi-mat`, `ncc`, `danh-tinh`,
`github`) đều có tên hàm lớp A và sẽ bị đổi. Rủi ro thật: một hàm **che giá trị** bị đổi tên trong
khi chỗ gọi sót lại gọi hàm cũ — nhưng `tsc` bắt ngay vì tên cũ không còn tồn tại. Không có đường
nào đổi tên mà làm giá trị chưa che lọt ra: đây đúng là lớp lỗi mà trình biên dịch bắt trọn.
Điều **phải giữ**: các ca test che-bí-mật hiện có chạy lại và xanh **mà không sửa kỳ vọng** — sửa kỳ
vọng để test xanh là cách quen thuộc nhất để một gác chết trong im lặng.

**Danh tính và cổng (R11, ⛔C1).** `layDanhTinh`, `epBamCong` và các gác vai bị đổi tên. Cùng lập
luận: sót là `tsc` đỏ. T4.2 giữ đường quyết định verdict; các ca cổng hiện có giữ đường quyết định
merge. Không ô nào của ma trận tầng nới lỏng quyền của tầng nào.

**Fail-closed (⛔C2).** Không đổi. Đổi tên không chạm logic phân loại; T4.1 khoá bảng chân trị cho ra
cùng nhãn trên cùng đầu vào.

**Dữ liệu prod là tài sản.** Đây là rủi ro **lớn nhất và duy nhất không được trình biên dịch che**:
đổi nhầm một field lớp B thì dữ liệu đã lưu đọc ra khuyết, âm thầm, và JSON tự do không có ai bắt.
Lưới T2.1–T2.4 tồn tại đúng cho chuyện này, và fixture bắt buộc là **dữ liệu đời thật** — object
dựng trong test mang tên MỚI nên nó xanh cả khi đã đổi hỏng.
Change này **không** đổi hình dạng dữ liệu, nên không cần đường di trú; đó cũng chính là lý do lớp
B/C bị hoãn sang change riêng thay vì làm gộp.

**Hợp đồng repo đích (⛔C5, lớp C).** Khoá `checkmate.yml` mà repo khách khai không đổi — đổi là bắt
mọi repo khách sửa file của họ, tức phá tương thích ra ngoài. Bảng module của **chính** repo này thì
phải khai lại theo tên mới; T3.1 canh.

**Tiêm chỉ thị (⛔C4).** Không chạm: change không thêm dữ liệu ngoài nào vào prompt.

**Lưới import-graph có tự tạo rủi ro không?** Nó chỉ đọc mã nguồn và so chuỗi, không chạy code, không
chạm mạng hay đĩa ngoài repo. Rủi ro duy nhất là **nó tự xanh khi chưa nhìn gì** — T1.1 (tầng thiếu
ô trong ma trận thì đỏ) và T1.6 + task 4.3 (chứng minh load-bearing bằng cách hoàn tác rồi thấy đỏ)
đóng đúng chỗ đó.

## Kết luận

Không có đường mới nào tới bí mật, danh tính, hay quyết định cổng. Rủi ro thật là **đổi nhầm lớp B
làm dữ liệu prod đọc ra khuyết trong im lặng** — đã có lưới dùng dữ liệu đời thật, và phạm vi change
cố ý dừng ở lớp A để không cần đường di trú nào.
