# Security — close-probe-library-spec

Change này không chạm code. Nhưng nó khai luật cho vùng **tích luỹ tài sản lâu dài của sản phẩm** — thư viện
probe là thứ duy nhất trong hệ lớn dần theo thời gian và không dựng lại được. Soi ở đây là soi xem một câu
văn sai có thể làm mất cái gì.

## S1. Bí mật & rò rỉ

- N/A S1.1 Không chạm code, không chạm bí mật.
- ⚠️ S1.2 Requirement R-2 khai rằng code probe được tách và lưu thành file. Nội dung probe sinh từ diff của
  repo đích, nên bất cứ thứ gì lọt vào probe là lọt vào một file **ở lại lâu dài**. Đường ấy do
  `error-message-egress-gate` và `response-secret-guard` gác; change này không đổi, nhưng luật viết ra sẽ
  được đọc như mô tả đầy đủ về vòng đời probe — nên chỗ ấy phải nói đúng.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không chạm.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường cho máy tự merge.
- ⚠️ S3.2 Nhưng thư viện probe **là** thứ làm cổng chặt dần theo thời gian: mỗi probe giữ lại là một phép
  kiểm chạy ở mọi lượt sau. Một luật sai ở đây không mở cổng ngay — nó làm cổng **mỏng dần** theo tháng.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 R-4 khai rõ model chỉ được dùng để **bỏ**, và chỉ khi vừa chắc chắn vừa trỏ đúng ứng viên trong
  diện nghi. Đó là một ranh giới ⛔C4 quan trọng: câu trả lời của model không tự nó thành hành động.

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 R-1 khai hai lớp bảo vệ sổ dùng chung. Đột biến chạy trên máy phát triển, khôi phục ngay.

## S6. Tầng dữ liệu & quyền file (R9)

- ⚠️ S6.1 `probes-lib/` là **dữ liệu prod** (`DEPLOY.md`). Đột biến của change này chạy trên thư viện tạm
  của lưới; không ca nào ghi vào kho thật.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ⚠️ S7.1 **Bất đối xứng giá là nền của cả capability, và khai sai nó là rủi ro lớn nhất của change:**

  | sai lầm | giá |
  |---|---|
  | bỏ nhầm một probe | **mất vĩnh viễn** một phép kiểm đã chạy thật |
  | giữ nhầm một probe trùng | tốn vài giây mỗi lượt |

  Mọi ngưỡng lệch trong capability này — nghiêng về GIỮ, miễn trừ probe từng bắt hồi quy, cùng-xanh-không-
  phải-bằng-chứng — đều suy ra từ đó. Một requirement chép cơ chế mà bỏ phần này sẽ được đọc thành con số
  tuỳ ý, và người sau sẽ «tối ưu» đúng chiều làm mất probe.

- ⚠️ S7.2 R-3 nấc 4 (van chống kẹt) trông như ngoại lệ tuỳ tiện nếu không nói vì sao. Bỏ nó thì kho toàn
  hàng miễn trừ **hoá thạch**: trần không giải phóng được, probe mới không vào được, và thư viện ngừng lớn
  mà không có tín hiệu nào.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **làm thư viện mất probe, hoặc ngừng lớn, mà không ai biết**.

- ✅ S8.1 (a) khai luật rộng hơn thực tế → D1 mutation bắt.
- ⚠️ S8.2 (b) khai HẸP hơn thực tế — bỏ sót một vế code có làm → **không cơ chế nào bắt**; loại lỗi thứ tư.
  Giảm bằng task 1.2: đối chiếu **từng điều** trong 20 điều, không đọc lướt.
- ⚠️ S8.3 (c) khai đúng nhưng bỏ phần *vì sao* → luật sống sót nhưng **mất sức chống lại lần refactor sau**.
  D3 đặt phép thử: requirement phải nói được cái GIÁ, không chỉ nói cơ chế.

## Notes

- S7.1 là điều đáng nhớ nhất: ở capability này, hai chiều sai lầm **không cùng giá**, và mọi luật lệch
  ngưỡng đều là hệ quả của bất đối xứng ấy. Viết luật mà bỏ nó là viết một cơ chế không có lý do.
