# Test cases — provider-gate

Requirement: R-1 «Danh mục tự khai đủ» · R-2 «Cổng kiểm bắt buộc» · R-3 «Kiểm còn hiệu lực nghĩa là đúng
cấu hình hiện tại» · R-4 «Khoá: thứ tự, tới tiến trình con, kho quyền hạn chế» · R-5 «Gói thuê bao chạy
thật bằng gói» · R-6 «Verdict ghim nguồn model, token nói rõ khi ước tính» · R-7 «Danh mục là gợi ý, giới
hạn phương thức thì cứng» · R-8 «Mất xác thực là lỗi công cụ, không thử lại».

**~15 điều đã có ca** — bảng dưới đối chiếu, không lặp lại.

## Đối chiếu: scenario ↔ ca đã có

- [x] T1.1 «nhà cung cấp đã ngừng dịch vụ phải mang cờ ngung» ✓ có `web-loc` (R5.1).
- [x] T1.2 «mọi nhà cung cấp còn sống đều khai ít nhất một model» ✓ có `web-loc` (R5.2).
- [x] T1.3 «hỗ trợ api thì bắt buộc khai biến môi trường» ✓ có `web-loc` (R5.3).
- [x] T2.1 «dán nhầm API key vào ô model thì key KHÔNG đi ra thông điệp lẫn sổ kiểm» ✓ có (R5.8, ⛔C3).
- [x] T2.2 «hai model lạ CÙNG độ dài không được trùng một hàng sổ kiểm» ✓ có (R5.8).
- [x] T3.1 «tổ hợp vừa kiểm xong phải còn hiệu lực» / ca ngược ✓ có `ba-muc-tu-dong` (R5.5).
- [x] T4.1 «khoá và token KHÔNG lọt vào tiến trình chạy code của PR» ✓ có `env-cli` (R5.10).
- [x] T5.1 «giữ nguyên CLAUDECODE rỗng để CLI không tưởng đang chạy lồng» ✓ có `env-cli` (R5.12).
- [x] T5.2 «không có token thuê bao thì không dựng ra khoá rỗng» ✓ có `env-cli` (R5.12).
- [x] T6.1 «tách được nhà cung cấp và tên model từ chuỗi ghim» ✓ có `web-loc` (R5.13).
- [x] T6.2 «model không mang tiền tố thì để trống nguồn chứ không đoán» ✓ có `web-loc` (R5.13).
- [x] T7.1 «Fable 5 dùng được với gói thuê bao / bị CHẶN với api» ✓ có (R5.15, R5.16).
- [x] T7.2 «cửa đọc cấu hình không tự thay tổ hợp cấm» ✓ có (R5.17).
- [x] T7.3 «model NGOÀI danh mục đi qua — danh mục là gợi ý» ✓ có (R5.18).
- [x] T7.4 «config KHUYẾT trường model: đường chấm HỎI chứ không đoán» ✓ có (R5.19).
- [x] T8.1 «CLI báo lỗi trên stdout, ngắn và trơ → đúng là mất xác thực» ✓ có (R3.12).
- [x] T8.2 «KHÔNG bắt nhầm probe nói về 401 Unauthorized / session expired» ✓ có (R3.13).
- [x] T8.3 «stderr khớp mẫu là chắc chắn» / «khối fence là câu trả lời» ✓ có (R3.13).

## Ca MỚI

- [x] T9.1 [R5.6] Nhà cung cấp trả nội dung **rỗng** → kiểm THẤT BẠI, thông điệp nói «chưa sinh được nội
      dung» chứ không nói khoá sai. *Một cổng báo xanh ở đây là cổng vô nghĩa: khoá hợp lệ mà model không
      sinh được gì thì vẫn không chấm được.*
- [x] T9.2 [R5.14 — vế hành vi] Có `usage` thật → cờ ước-tính là **false**; không có `usage` → ước theo ký
      tự và cờ là **true**. *Ca sẵn có chỉ khoá TRƯỜNG TỒN TẠI. Một con số ước trình bày như số thật là báo
      sai bản chất, và người đọc sẽ dựng ngân sách trên nó.*
- [x] T9.3 [R3.14] Phát hiện mất xác thực → **dừng**, không gọi lần hai. *Phiên hết hạn không tự sống lại ở
      lượt thứ hai; thử lại chỉ tốn thêm một lượt gọi rồi hỏng y hệt.*
- [x] T9.4 [R5.4] Phép kiểm «còn hiệu lực» đứng **trước** cửa chọn nhà cung cấp để chấm (ca đọc source).
- [x] T9.5 [R5.9] Thứ tự lấy khoá: biến môi trường của dịch vụ **trước**, kho khoá sau.
      *Vá lúc mutation (D5): bản đầu không dựng kho có khoá nên đảo thứ tự vẫn xanh — ca không phân
      biệt được hai hiện thực. Nay dùng kho giả có khoá riêng.*
- [x] T9.6 [R5.11] Kho khoá được siết quyền — kiểm **lời gọi**, không kiểm quyền thật (D2, cùng lý do
      `identity-session` D4).

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [x] T10.1 Đổi nhánh «phản hồi rỗng» thành thành công → T9.1 ĐỎ.
- [x] T10.2 Ép cờ ước-tính luôn `false` → T9.2 ĐỎ.
- [x] T10.3 Cho mất-xác-thực đi vào đường thử lại → T9.3 ĐỎ.
- [x] T10.4 Đảo thứ tự lấy khoá → T9.5 ĐỎ.

## Trục nhạy cảm

- [x] T_bimat — T2.1 · T4.1 · T9.6: khoá không vọng ra thông điệp, không lọt vào tiến trình chạy code PR,
      kho khoá siết quyền.
- [x] T_failclosed — T9.1 (rỗng là thất bại) · T9.3 (không thử lại) · T3.1 (cấu hình khuyết → từ chối êm,
      không ném).
- [x] T_cong — T9.4: chưa kiểm thành công thì không chọn được nhà cung cấp; đây là cổng chặn TRƯỚC khi tốn
      thời gian và tiền.
- [x] T_khongtincay — T8.2: câu trả lời của model có thể chứa chữ giống lời báo lỗi của công cụ; phép nhận
      diện phải xét chỗ xuất hiện và hình dạng, không chỉ mẫu chữ.
- [x] T_hopdong — change không thêm export; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [x] T11.1 Không có — mọi thứ ở change này kiểm được bằng máy.
