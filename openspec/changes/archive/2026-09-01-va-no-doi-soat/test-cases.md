# Test khoá bốn nợ M14–M17

## Ca khoá lỗi

- [x] T1.1 [reproduce] **M14**: GIVEN một lượt chấm có hàng sổ `reject` mang cờ `ngoai_cong = 1` (PR bị
      đóng trên GitHub, đối soát tự ghi) WHEN gọi `daTraVe()` THEN lượt đó **KHÔNG** nằm trong kết quả.
      *(trước fix: đỏ — câu truy vấn chỉ lọc `hanh_dong = 'reject'` nên hàng máy-ghi lọt vào khối «đã
      trả về dev»)*

- [x] T1.2 **M14 — vế đối chứng**: GIVEN một lượt có hàng `reject` do NGƯỜI bấm (`ngoai_cong = 0`)
      THEN lượt đó **CÓ** trong `daTraVe()`. Thiếu vế này thì một bản vá «trả về rỗng luôn» cũng xanh.

- [x] T1.3 [reproduce] **M17**: GIVEN verdict có `result` là một object có `toString` tự ném WHEN gọi
      `chiTietNgoaiCong` THEN hàm **trả chuỗi**, không ném, và chuỗi đó nói ra chỗ không đọc được.
      *(trước fix: đỏ — nội suy `${v?.result}` gọi `toString` và ném, làm mất TRỌN hàng sổ)*

## Ca lân cận (chống vá-một-vá-hụt)

- [x] T2.1 **Cửa song sinh của M14**: mọi truy vấn khác đọc `so_cong` để đếm/lọc hành động cổng —
      `hanhDongCongCuaPr` và phép nối suy `ketQuaCong` — được soi và khoá bằng ca tương ứng, HOẶC ghi
      rõ trong test vì sao cửa đó không cần xét `ngoai_cong`. Khuôn «vá một cửa, hụt cửa kia» là khuôn
      lặp nhiều nhất trong repo này (chín lần ở riêng chuỗi Đ6).

- [x] T2.2 **Biên của M17**: `severity` là Symbol · `severity` là object có `toString` ném ·
      `result` là `undefined`. Cả ba phải cho ra chuỗi mô tả đọc được, và mục không đọc được vẫn được
      **đếm và nói ra** theo R6.27 — không được lặng lẽ biến thành «0 cảnh báo».

- [x] T2.3 **M16 ở chế độ demo**: GIVEN cơ sở dữ liệu đời cũ còn cụm cột `cong_*` và chế độ `demo`
      WHEN mở kho THEN di trú **vẫn chạy** — cột được bỏ và hàng cũ được cứu vào sổ. Ca này khoá đúng
      quyết định của PO (phương án A): nếu ai đó về sau thêm gác demo vào cửa di trú thì nó đỏ, kèm lời
      giải thích vì sao gác ở đó là biến bảo toàn thành mất dữ liệu.

- [x] T2.4 **M16 — vế còn lại vẫn phải chặn**: ở chế độ demo, `doiSoatCong` **vẫn không** ghi hàng nào.
      Hai ca đứng cạnh nhau nói rõ ranh giới: cấm *thao tác cổng*, không cấm *di trú dữ liệu*.

## Trục nhạy cảm (fix chạm cổng merge và sổ kiểm toán)

- [x] T3.1 **Tiêu cực — sổ vẫn là nguồn duy nhất**: sau khi vá, bề mặt lượt chấm vẫn không có đường
      nào khai một hành động cổng mà sổ không có (R6.26 giữ nguyên hiệu lực). Chạy lại bộ ca cấu trúc
      của Đ6, không được xanh nhờ đổi kỳ vọng.

## Chạy

`npx tsc --noEmit` + `npm test` (toàn bộ, không riêng file vừa sửa).
