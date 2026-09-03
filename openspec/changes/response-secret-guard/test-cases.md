# Test cases — response-secret-guard

Requirement: R-1 «Bí mật của chính checker không rời máy chủ qua thân response» · R-2 «Hai bề mặt, hai cách
chặn» · R-3 «Thông điệp chặn nêu tên nguồn, không nêu giá trị» · R-4 «Gác hỏng không chặn oan, không im
lặng».

Đây là change **cơ chế mới**, không phải backfill — nên không có ca sẵn để đối chiếu, và tiêu chí «đủ ca»
cao hơn các change trước: bí mật ở đây là của **chính checker** nên so khớp chính xác được, và một đường rò
lọt qua là **lỗi cài đặt**, không phải giới hạn phương pháp. Không đường nào được khai là «mở theo bản chất».

## R-1 chặn theo giá trị

- [x] T1.1 Response JSON chứa giá trị token đang lưu → **chặn**; client nhận lỗi máy chủ và KHÔNG nhận token.
- [x] T1.2 Response không chứa bí mật nào → đi qua nguyên vẹn, thân không đổi một ký tự.
- [x] T1.3 [ngưỡng] Kho có mục rỗng và mục 3 ký tự → hai mục ấy bị bỏ qua; response bình thường KHÔNG bị
      chặn oan. *Không có ca này thì một khoá rỗng làm chết toàn bộ giao diện.*
- [x] T1.4 [ba nhánh nguồn] Token gói thuê bao · khoá nhà cung cấp · token theo repo — mỗi nhánh một ca.
- [x] T1.5 [biến môi trường] Giá trị lấy từ biến môi trường checker đọc cũng bị bắt.

## R-2 hai bề mặt

- [x] T2.1 Mẩu sự kiện mang bí mật → mẩu ấy KHÔNG được gửi, kết nối bị cắt.
- [x] T2.2 Luồng sự kiện sạch chạy bình thường, kể cả **nhịp giữ kết nối** — nhịp là chuỗi ngắn lặp lại,
      dễ thành nạn nhân của một gác viết ẩu.
- [x] T2.3 [bề mặt dễ quên] Bí mật xuất hiện ở mẩu **thứ n**, không phải mẩu đầu → vẫn bị bắt.

## R-3 thông điệp chặn

- [x] T3.1 Thông điệp chặn nêu **tên nguồn** (`repo_token` / `khoa.<nhà cung cấp>` / `oauth_token`).
- [x] T3.2 Thông điệp chặn **KHÔNG chứa giá trị** — không nguyên văn, không một phần, không bản che, không
      độ dài. *Bẫy tự nhiên nhất của gác bảo mật: lời báo «response chứa ghp_abc…» đưa bí mật vào log, một
      bề mặt DAI HƠN response vì log lưu lại.*
- [x] T3.3 Dòng log của lần chặn cũng không chứa giá trị.

## R-4 gác hỏng

- [x] T4.1 Kho bí mật đọc không được → gác KHÔNG ném, response đi qua, **và có dòng log** nói rõ gác đang
      chạy mà không có nguồn đối chiếu. *Một gác không biết bí mật nào tồn tại trông y hệt «không có bí mật
      nào để rò» — đúng mệnh đề T1.1 của `identifier-language-gate`.*
- [x] T4.2 Thân response là số · `null` · `undefined` · đối tượng có tham chiếu vòng → không ném.
- [x] T4.3 Thân rất lớn → không ném, không treo.

## Đối kháng — mục tiêu: đưa một bí mật của checker ra khỏi máy chủ

- [x] T5.1 Bí mật nằm **lồng sâu** trong đối tượng trả về (mảng trong object trong mảng).
- [x] T5.2 Bí mật nằm trong một trường tên vô hại (`ghi_chu`, `mo_ta`).
- [x] T5.3 Bí mật đi qua **luồng sự kiện** thay vì route JSON.
- [x] T5.4 Bí mật xuất hiện **hai lần** trong cùng response → vẫn chặn, và chỉ báo một tên nguồn.

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [x] T6.1 Bỏ lớp bọc luồng sự kiện → T2.1 ĐỎ.
- [x] T6.2 Cho thông điệp chặn kèm giá trị → T3.2 ĐỎ.
- [x] T6.3 Bỏ ngưỡng độ dài → T1.3 ĐỎ.
- [x] T6.4 Đổi chặn thành ghi-sổ-rồi-cho-qua → T1.1 ĐỎ.
- [x] T6.5 Bỏ nhánh `repo_token` khỏi nguồn → ca tương ứng của T1.4 ĐỎ.

*Chạy hai lần mỗi chiều — bài học `error-message-egress-gate`: một lần chạy báo «1 failed» hoá ra là flaky.*

## Trục nhạy cảm

- [x] T_bimat — toàn bộ file này là trục này.
- [x] T_failclosed — T1.1 (chặn chứ không ghi-sổ-rồi-cho-qua) và T4.1 (không đọc được kho thì NÓI RA).
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [x] T_khongtincay — không áp dụng theo chiều thường (dữ liệu vào), nhưng gác phải chịu được thân response
      méo do bất kỳ route nào dựng ra: T4.2.
- [x] T_hopdong — module mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T7.1 Mở giao diện thật một lượt sau khi gắn gác: các màn chính tải được, luồng sự kiện của một lượt
      chấm chạy tới hết. Máy đo được «không chặn oan trong test»; không đo được «giao diện thật vẫn dùng
      được». Gác chạy trên MỌI response nên một lỗi ở đây hỏng toàn bộ, không hỏng một chỗ.
