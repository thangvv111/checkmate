# Test cases — đồng bộ giao diện theo gói CCS

## Lưới token

- [x] T1.1 [reproduce] Hard-code một mã màu KHÔNG thuộc bộ semantic vào một file giao diện → lưới ĐỎ,
      nêu **file và mã màu** đó. *(trước fix: đỏ vì palette cũ còn hex teal rải rác)*
- [x] T1.2 **Vế đối chứng — semantic được phép**: ba hex PASS/FAIL/medium hard-code đúng như gói khai
      thì lưới XANH. Thiếu ca này thì một lưới «cấm mọi hex» cũng xanh, và nó sẽ báo oan đúng chỗ gói
      design bảo phải hard-code — lưới báo oan thì người ta tắt, chứ không sửa code.
- [x] T1.3 Đổi giá trị accent hệ thống KHÔNG làm đổi màu PASS/FAIL/medium — hai họ token tách thật,
      không phải tách trên giấy.
- [x] T1.4 Không còn `border-radius` khác 0 (trừ pill 99px) trong hằng CSS.

## Lưới vỏ

- [x] T2.1 [reproduce] Một trang tự dựng thẻ `html`/`body` thay vì gọi vỏ chung → lưới ĐỎ, nêu tên
      trang. Đây là ca canh chuyện «trang rơi lại phía sau trong im lặng» khi vỏ đổi.
- [x] T2.2 Sidebar khai **đủ 7 mục**; gỡ một mục → ĐỎ. Con số này là quyết định của PO (phương án B),
      không phải chi tiết cài đặt.
- [x] T2.3 Mục đang-chọn được đánh dấu khác các mục còn lại, và **đúng mục** ứng với trang đang mở.
- [x] T2.4 Cả 7 trang hiện có render qua vỏ mới **không ném lỗi** — chạy hàm dựng của từng trang với
      dữ liệu tối thiểu, không phải chỉ trang mẫu.

## Lưới chuyển cảnh

- [x] T3.1 `package.json` **không có gói phụ thuộc mới** nào cho chuyển cảnh. Đây là lưới chống «thêm
      framework cho tiện» — điều dễ xảy ra nhất ở đợt sau, khi ai đó muốn thêm một hiệu ứng nữa.
- [x] T3.2 Vỏ phát đủ hai khai báo: khối `@view-transition` trong CSS và `<script type="speculationrules">`.
- [x] T3.3 **Thoái hoá sạch**: bỏ hai khai báo đó ra thì trang vẫn render đủ nội dung và mọi liên kết
      vẫn đúng — chứng minh chúng là lớp trang trí, không phải đường sống của điều hướng.

## Lân cận — chỗ dễ vỡ

- [x] T4.1 Font: khai báo có **fallback stack thật**, không phải chỉ tên font Google. Prod chạy sau
      nginx; không giả định mạng ra ngoài luôn thông.
- [x] T4.2 Trạng thái **rỗng ≠ hỏng** trên Dashboard: hàng đợi sạch cho ra câu khác hẳn thiếu-token,
      và câu thiếu-token nêu **cả nguyên nhân lẫn cách sửa**.
- [x] T4.3 Màn Thư viện probe (đang xây) nói **vì sao** chưa có, không phải trang trắng cũng không
      phải 404.

## Trục nhạy cảm

- [x] T5.1 Tiêu cực: đổi giao diện KHÔNG đổi đường quyết định verdict — chạy lại bộ ca phân loại và
      bộ ca cổng merge, không được xanh nhờ sửa kỳ vọng.
- [x] T5.2 Tiêu cực: không rò bí mật qua bề mặt mới — token repo vẫn hiện dạng che trên mọi màn có
      nó, kể cả header repo switcher.

## Chạy

`npx tsc --noEmit` + `npm test` toàn bộ, rồi **mở thật 8 màn trong trình duyệt** — `tsc` không bắt
được layout vỡ, và đây là đợt thay đổi thuần thị giác nên mắt là công cụ kiểm cuối.
