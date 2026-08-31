## Ca khoá lỗi

<!-- ⛔ Mỗi lỗi ÍT NHẤT một ca, và ca đó phải ĐỎ trên code TRƯỚC khi vá. Test không đỏ trước fix
     là test mồ côi — nó không chứng minh được đang canh cái gì, và refactor sau sẽ gỡ đi với 0
     test đỏ. Ghi rõ triệu chứng thật lúc đỏ. -->

- [ ] T1.1 [reproduce]: GIVEN <!-- trạng thái sinh lỗi --> WHEN <!-- thao tác --> THEN <!-- hành vi ĐÚNG --> (trước fix: đỏ vì <!-- triệu chứng thật -->)

## Ca lân cận (chống vá-một-vá-hụt)

- [ ] T2.1 <!-- Cửa song sinh cùng vai với chỗ vừa vá (ghi/đọc/kiểm/hiển thị) -->
- [ ] T2.2 <!-- Biên gần chỗ vừa vá: khuyết trường · null · sai kiểu · giá trị lạ -->

## Trục nhạy cảm (chỉ khi fix chạm tới)

<!-- Schema fix KHÔNG bắt điền đủ 5 trục. NHƯNG fix chạm bí mật / danh tính / vai / cổng merge /
     đường quyết định verdict thì BẮT BUỘC có ca tiêu cực tương ứng — và cân nhắc chuyển sang
     schema `checkmate`, vì những chỗ đó hiếm khi là «chỉ fix». Không chạm → xoá section này. -->

- [ ] T3.1 <!-- trục nào + ca tiêu cực cụ thể -->
