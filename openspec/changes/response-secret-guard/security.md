# Security — response-secret-guard

Change này **là** một cơ chế bảo mật, và nó khác sáu change trước ở một điểm quyết định cách soi: nó không
khai lại thứ code đã làm, mà **thêm một lớp gác chưa từng có**. Nên rủi ro không nằm ở «luật khai sai» mà
nằm ở chính lớp gác — nó chạy trên **mọi** response, và một gác bảo mật hỏng nguy hiểm hơn không có gác vì
nó tạo niềm tin rằng bề mặt đã được canh.

## S1. Bí mật & rò rỉ

- ✅ S1.1 Trục chính. Bí mật của **chính checker** (token gói thuê bao · khoá nhà cung cấp · token theo
  repo · biến môi trường checker đọc) không rời máy chủ qua thân response.
- ✅ S1.2 **So khớp chính xác, không có âm tính giả về nguyên tắc.** Đây là chỗ khác căn bản với
  `error-message-egress-gate`: ở đó bí mật là của repo đích nên checker không biết giá trị và phải chấp
  nhận âm tính giả (S8.1 của change ấy khai một đường mở); ở đây checker **biết** giá trị. Một đường rò lọt
  qua gác này là **lỗi cài đặt**, không phải giới hạn phương pháp — nên không đường nào ở S8 dưới đây được
  phép khai là «mở theo bản chất».
- ⚠️ S1.3 **Gác có thể tự trở thành đường rò qua thông điệp chặn.** Báo «response chứa `ghp_abc…`» đưa bí
  mật vào log và lên màn hình — và log là bề mặt **dai hơn** response, vì nó lưu lại. Requirement 3 cấm
  tuyệt đối; T3.2/T3.3 khoá; mutation T6.2 phải giết được.
- ⚠️ S1.4 Danh sách nguồn là **danh sách CHO PHÉP về phía nguồn**: thêm một chỗ lưu bí mật mà quên khai thì
  gác không biết nó tồn tại. Đây là chỗ hở còn lại và nó **có thật** — giảm nhẹ bằng việc kho bí mật đã là
  một cửa duy nhất (`secret-vault.ts`), nên «thêm chỗ lưu bí mật» là một thay đổi nhìn thấy rõ trong diff.

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 Gác đứng **sau** lớp gác phiên: response chỉ tồn tại khi request đã qua xác thực. Không đổi thứ
  tự middleware hiện có (task 3.1) — đổi thứ tự là đổi cả mô hình gác.
- N/A S2.2 Không đọc danh tính, không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 KHÔNG thêm đường cho máy tự merge. Gác chỉ **chặn**, tức chỉ biết nói KHÔNG — đúng ⛔C1.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Không đọc dữ liệu ngoài. Gác chỉ so hai chuỗi đã có trong tiến trình.
- ⚠️ S4.2 Thân response có thể chứa nội dung do repo đích sinh ra (log lượt chấm). Gác không phân tích nội
  dung ấy, chỉ tìm chuỗi trùng — nên nội dung ngoài không lái được gác. Nhưng đáng ghi: một PR **không** thể
  làm gác chặn oan bằng cách nhét chuỗi vào diff, vì chuỗi phải trùng **đúng giá trị bí mật đang lưu** mà
  PR không biết.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code, không sinh tiến trình.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Không ghi file, không đổi schema. Gác chỉ đọc kho bí mật đã có.
- ⚠️ S6.2 Gác đọc kho bí mật trên **mỗi** response. Nếu đọc từ đĩa mỗi lần thì vừa chậm vừa tăng bề mặt lỗi
  I/O; nếu đọc một lần rồi nhớ thì bí mật **mới thêm** sẽ không được gác cho tới khi khởi động lại. Phải
  quyết lúc apply và ghi lý do — đây là chỗ ⛔C6 (sửa file tay phải có hiệu lực ở lượt đọc kế tiếp) chạm vào
  hiệu năng, và ⛔C6 thắng nếu hai bên xung đột.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 Thấy bí mật thì **chặn**, không ghi sổ rồi cho qua (PO chốt). Rò một lần là không thu hồi được.
- ⚠️ S7.2 Nhưng gác **hỏng** thì fail theo hướng **mở**: đầu vào méo không được làm gác ném, vì gác chạy
  trên mọi response và một lỗi làm hỏng toàn bộ giao diện. Đây là fail-open **có chủ đích**, ngược hướng
  ⛔C2 thông thường, và nó được bù bằng requirement 4: trạng thái «gác không có nguồn đối chiếu» phải được
  **nói ra qua log**, vì nó trông y hệt «không có bí mật nào để rò».
- ✅ S7.3 Không đụng verdict, không đụng nhãn probe.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **đưa một bí mật của checker ra khỏi máy chủ**. Không đường nào được khai là mở (S1.2).

- ✅ S8.1 (a) route trả thẳng token → T1.1.
- ✅ S8.2 (b) bí mật lồng sâu trong đối tượng → T5.1.
- ✅ S8.3 (c) bí mật trong trường tên vô hại → T5.2.
- ✅ S8.4 (d) đi qua **luồng sự kiện** thay vì route JSON → T2.1, T5.3. Bề mặt dễ quên nhất.
- ✅ S8.5 (e) bí mật ở mẩu sự kiện **thứ n** → T2.3.
- ✅ S8.6 (f) làm kho bí mật hỏng để gác không có gì đối chiếu → T4.1: gác vẫn không ném, **và nói ra**.
- ✅ S8.7 (g) lưu một bí mật rỗng/ngắn để gác chặn mù rồi buộc người ta gỡ gác → T1.3 (ngưỡng).
- ✅ S8.8 (h) đọc bí mật từ **thông điệp chặn** → T3.2, T3.3.

## Notes

- Hai chỗ đáng theo dõi, đều đã khai: S1.4 (nguồn mới quên khai) và S6.2 (đọc kho mỗi lần hay nhớ — quyết
  lúc apply, ⛔C6 thắng nếu xung đột với hiệu năng).
- S7.2 là chỗ change này **cố ý đi ngược** ⛔C2: gác hỏng thì mở chứ không đóng. Lý do là phạm vi tác động —
  một gác đóng khi hỏng sẽ làm chết toàn bộ giao diện vì một lỗi ở nhánh phụ. Bù lại bằng bắt buộc nói ra.
  Đây là đánh đổi có ý thức, không phải sơ suất, và nó phải được PO thấy chứ không giấu trong code.
