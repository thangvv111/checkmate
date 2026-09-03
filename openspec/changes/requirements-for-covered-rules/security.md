# Security — requirements-for-covered-rules

Change này không chạm code, không đổi hành vi, không thêm bề mặt. Soi an ninh ở đây không phải soi một
đường tấn công mới — mà soi một câu hỏi khác: **viết luật cho code người khác dựng thì sai được ở đâu?**

## S1. Bí mật & rò rỉ

- N/A S1.1 Không chạm code, không chạm bí mật.
- ⚠️ S1.2 Nhưng requirement viết ra sẽ được đọc như luật đang thi hành. Nếu một requirement mô tả **rộng
  hơn** thứ code thật làm, người sau sẽ tin vào một lớp bảo vệ không có. Đó là cách một tài liệu an ninh trở
  thành rủi ro an ninh — và nó không cần một dòng code nào để xảy ra.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không chạm.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường cho máy tự merge.
- ⚠️ S3.2 Hai capability này đứng ngay trước cổng: `diff-visibility` quyết định model nhìn thấy gì,
  `target-contract` quyết định kết quả chạy được đọc thế nào. Khai đúng chúng làm người duyệt hiểu đúng
  verdict đang dựa trên cái gì; khai rộng làm họ tin quá mức.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- N/A S4.1 Không đổi đường dữ liệu ngoài.
- ⚠️ S4.2 Requirement R-1 (`diff-visibility`) và R-4 (`target-contract`) đều mô tả cách checker xử lý cấu
  hình **do repo đích khai**. Chúng phải nói rõ giới hạn: mẫu hỏng bị bỏ, cấu hình dở dang bị bỏ nguyên
  khối. Viết mơ hồ ở đây dễ bị đọc thành «checker có kiểm cấu hình repo đích», mà nó không kiểm — nó chỉ
  chịu được cấu hình hỏng.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy gì mới. Đột biến chạy trên máy phát triển và được khôi phục ngay.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 Không ghi gì.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ⚠️ S7.1 R-4 khai một chỗ **fail-SAFE** (yml hỏng → mặc định), khác với fail-CLOSED của ⛔C2. Phân biệt ấy
  phải viết rõ trong chính requirement, vì đọc nhầm theo chiều nào cũng hại: tưởng nó là fail-closed thì có
  người sẽ «sửa» nó thành từ chối chấm khi yml hỏng — biến một tiện ích thành cửa chặn; tưởng ⛔C2 cũng
  fail-safe thì có người sẽ cho lượt chấm thiếu dữ liệu ra PASS.
- ⚠️ S7.2 **Rủi ro lớn nhất của change này là khai một điều CHƯA được gác thật.** Nó không gây sự cố hôm
  nay — nó làm bảng tra sạch, capability đóng, và một niềm tin sai được đóng dấu. Lần sau ai đó gỡ đúng đoạn
  code ấy, lưới không đỏ, và spec nói rằng hành vi đó được bảo đảm.

  Đó là lý do D1 đặt mutation làm phép kiểm chính chứ không phải thủ tục cuối, và tại sao tasks có đường xử
  cho cả ba kết quả thay vì chỉ mong đợi màu đỏ.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **làm spec nói một điều mà code không làm**.

- ✅ S8.1 (a) khai requirement cho điều không có ca → D1 mutation bắt: gỡ gác mà không ca nào đỏ.
- ✅ S8.2 (b) khai rộng hơn thực tế (thêm vế code không làm) → cùng đột biến ấy bắt, vì vế thừa không có ca.
- ⚠️ S8.3 (c) khai HẸP hơn thực tế — bỏ sót một vế code có làm → **không cơ chế nào bắt**. Lưới vẫn xanh,
  bảng tra vẫn sạch, và một hành vi thật sống ngoài mọi luật. Đây đúng là loại lỗi thứ tư mà
  `test-grid-integrity` khai là chỉ người đọc bắt được.
- ⚠️ S8.4 (d) khai đúng nhưng **không có «vì sao»** → không sai, nhưng lần refactor sau ai cũng thấy có thể
  bỏ. D3 đặt ra phép thử cho từng requirement: *bỏ vế này thì hỏng ở đâu, và hỏng ấy trông thế nào?*

## Notes

- S8.3 là chỗ hở đã biết và không bịt được bằng máy ở change này. Cách giảm duy nhất là đối chiếu **từng
  điều** trong 23 điều với ca cụ thể (task 1.3), thay vì đọc lướt danh sách rồi gộp.
- S7.2 và S1.2 là cùng một điều nhìn từ hai phía: ở change này, **văn bản chính là sản phẩm**, nên sai ở
  văn bản không phải sai tài liệu — nó là sai sản phẩm.
