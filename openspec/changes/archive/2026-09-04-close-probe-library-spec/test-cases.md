# Test cases — close-probe-library-spec

Change này **không viết ca mới** — 20 điều đều đã có ca. Việc của tài liệu này là chỉ đúng ca nào cưỡng chế
điều nào, và ghi kết quả mutation chứng minh ca ấy load-bearing (design D1).

## Đối chiếu điều → ca đang cưỡng chế

- [x] T1 R-1 «sổ dùng chung: khoá + atomic» (`R8.4` · `R8.6` · `R8.7` · `R10.12`)
      → `thu-vien.test.ts` § `withLibraryLock`: «nhả khoá sau khi xong» · «việc bên trong ném lỗi thì khoá
      vẫn phải được nhả» · «khoá của tiến trình đã chết bị phá»; § an toàn dữ liệu: «meta.json rách: giữ
      bằng chứng .hong-*, thư viện coi như rỗng, KHÔNG ghi đè mất».
- [x] T2 R-2 «hạt nạp là probe + di trú» (`R10` · `R10.1` · `R10.2` · `R10.5`)
      → `thu-vien.test.ts` § nhận theo từng probe · § di trú đời bộ: «tách từng probe, loại bản chạy-lại,
      xoá file bộ cũ» · «di trú chạy đúng một lần — đọc lại không nhân đôi» · «di trú GIỮ file bộ khi có
      probe không tách được»; `dedup-probe.test.ts` § tách file per-probe.
- [x] T3 R-3 «trần + đào thải theo điểm» (`R10.4` · `R10.22` · `R10.23` · `R10.24`)
      → `thu-vien.test.ts` § đào thải theo điểm: bốn nấc, «nấc 3 KHÔNG đá probe VỪA NẠP», «vừa nạp nhận
      diện bằng TÊN», «nhãn hoi_quy đóng cờ VĨNH VIỄN», «cùng sha đổi trạng thái → flaky_diem tăng».
- [x] T4 R-4 «gỡ trùng bốn tầng» (`R10.6` · `R10.7` · `R10.8`)
      → `dedup-probe.test.ts` § tầng 1 · tầng 2 · tầng 3: «chỉ bỏ khi trung VÀ chắc chắn VÀ trỏ đúng tên
      trong diện nghi» · «model trỏ tên KHÔNG nằm trong diện nghi thì không tin — giữ» · «model trả thiếu
      ứng viên thì ứng viên đó được giữ» · § phán xử mơ hồ.
- [x] T5 R-5 «lịch sử hành vi là bằng chứng» (`R10.9` · `R10.10` · `R10.20` · `R10.21`)
      → `thu-vien.test.ts` § tầng 4: «lịch sử ghi theo lượt, cùng lượt chạy lại thì thay chứ không nhân
      đôi» · «cùng hỏng vì MỘT NGUYÊN NHÂN CHUNG thì KHÔNG gỡ» · «nhãn hoàn cảnh chung KHÔNG được tính vào
      số lượt chung tối thiểu» · «cùng XANH suốt thì KHÔNG gỡ».
- [x] T6 R-6 «máy tách hiểu regex literal» (`R10.16`)
      → `dedup-probe.test.ts` § máy quét hiểu regex literal: «cắt probe chứa regex literal /x\)/ không bị
      cắt cụt giữa khối» · «checkBalanced: file cân bằng qua, mảnh vỡ dính lại thì trượt».

## Mutation — phép kiểm CHÍNH, cho TỪNG VẾ (D1), mỗi chiều chạy HAI lần

- [x] T7.1–T7.22 — 22 đột biến theo tasks §2, mỗi cái gỡ một vế cụ thể.
- [x] T7.23 **MỘT đột biến sống sót**: `R10.12` (ghi sổ atomic). Đọc code → không có đường lui ⇒ vế ấy
      CHƯA được gác. Ca hiện có «meta.json rách» nói về đường ĐỌC file hỏng, không về đường GHI — hai chuyện
      khác nhau mà đọc tiêu đề không phân biệt được. **Viết ca mới**; đo lại ĐỎ. Tổng **20/20**.

## Ca sinh ra từ mutation (không có trong kế hoạch ban đầu)

- [x] T9.1 `probe-library.test.ts` «ghi ra file tạm rồi ĐỔI TÊN, không ghi đè trực tiếp vào sổ» — **ca mới**.
      Ca đọc source; cái mất khai ở D5: chứng minh atomic thật đòi giết tiến trình giữa hai lời gọi hệ thống.
      *Lượt trước: 10/10 đột biến gỡ gác trung tâm đều đỏ, nhưng lượt hai cho các vế phụ tìm ra HAI chỗ
      chưa được gác. Dừng ở lượt một thì cả hai đã được đóng dấu thành luật đang thi hành.*

## Trục nhạy cảm

- [N/A] T_bimat — không chạm code, không chạm bí mật.
- [N/A] T_failclosed — không đổi hành vi nào.
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [N/A] T_khongtincay — không đổi đường dữ liệu ngoài.
- [x] T_hopdong — không thêm export; `test/hop-dong-repo.test.ts` xanh.
- [x] T_prod — đột biến chạy trên máy phát triển, khôi phục ngay; `probes-lib/` không bị chạm.

## Kiểm tay

- [N/A] T8.1 Không có — không dựng gác chạy xuyên suốt (D4 tầng 2).
