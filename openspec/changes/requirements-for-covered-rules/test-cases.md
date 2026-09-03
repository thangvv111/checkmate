# Test cases — requirements-for-covered-rules

Change này **không viết ca mới** — 23 điều đều đã có ca. Việc của tài liệu này là chỉ đúng ca nào đang
cưỡng chế điều nào, và ghi kết quả mutation chứng minh ca ấy load-bearing (design D1).

## Đối chiếu điều → ca đang cưỡng chế

### `diff-visibility`

- [x] T1.1 R-1 «loại file sinh tự động, repo khai thêm mẫu riêng, mẫu hỏng bị bỏ tại cửa»
      → `dung-diff.test.ts`: «bỏ lockfile và nêu tên kèm lý do» · «bỏ file nhị phân, file minify và thư mục
      build» · «nhận thêm mẫu repo tự khai trong checkmate.yml» · «mẫu regex repo khai sai cú pháp thì bỏ
      qua chứ không làm sập lượt chấm»; `runner-cfg.test.ts`: «mẫu SAI CÚ PHÁP regex bị bỏ ngay tại cửa đọc».
- [x] T1.2 R-2 «cắt tiếp theo hướng phủ nhiều nhất, không cắt xuống rỗng»
      → `dung-diff.test.ts`: «dưới trần thì giữ nguyên mọi file» · «vượt trần thì giữ file nhỏ để phủ được
      nhiều bề mặt hành vi nhất» · «một file duy nhất mà vượt trần thì vẫn giữ» · «giữ nguyên thứ tự file
      như git trả về».
- [x] T1.3 R-3 «file bị bỏ kèm tên, kích thước, lý do»
      → `dung-diff.test.ts`: «bỏ lockfile và nêu tên kèm lý do» · «file bị loại vì trần PHẢI được nêu tên và
      đúng lý do» — cả hai assert nguyên bản ghi `{file, kyTu, lyDo}`.

### `target-contract`

- [x] T2.1 R-4 «`checkmate.yml` tuỳ chọn, khai thiếu/hỏng thì rơi về mặc định»
      → `runner-cfg.test.ts`: «không có checkmate.yml thì trả null» · «thiếu test_cmd thì coi như không khai
      runner» · «đọc đủ trường và điền mặc định» · «kẹp timeout vào dải an toàn» · «yml hỏng thì fail-safe».
- [x] T2.2 R-5 «JUnit XML là hợp đồng, đường đọc chịu được mọi biến thể»
      → `runner-cfg.test.ts`: «đọc được pass / fail / skip trong một suite» · «`<failure/>` RỖNG vẫn là
      failed» · «gom được testcase trong suite lồng nhau» · «XML không phải JUnit thì trả danh sách rỗng».
- [x] T2.3 R-6 «nối id đủ ba dạng tên + kiểm ranh giới»
      → `phan-loai.test.ts`: `test_P2_khong_vuot_quyen` · `CheckerProbeTest > test_P4_bien_dong`;
      `nhan-probe-log.test.ts`: «nối đúng id» với `P1 hay P2 > P10`.
- [x] T2.4 R-7 «lỗi nạp file là trạng thái riêng»
      → `loi-nap-file.test.ts` (7 ca), gồm cả vế ngược «một probe thật bị đỏ KHÔNG phải lỗi nạp file».
- [x] T2.5 R-8 «khối `review`: góc tấn công + thang severity»
      → `runner-cfg.test.ts`: «đọc được khuôn lỗi và thang severity riêng của repo» · «trả về ReviewCfg
      TRỰC TIẾP, không bọc trong {review}» · «chỉ khai bo_qua_diff vẫn đọc được, không trả null».

## Mutation — phép kiểm CHÍNH (D1), mỗi chiều chạy HAI lần

- [x] T3.1 Bỏ phép loại file sinh tự động → T1.1 ĐỎ.
- [x] T3.2 Cho mẫu regex sai cú pháp đi qua cửa đọc → T1.1 ĐỎ.
- [x] T3.3 Đảo hướng chọn file khi vượt trần → T1.2 ĐỎ.
- [x] T3.4 Bỏ điều kiện giữ file duy nhất → T1.2 ĐỎ.
- [x] T3.5 Bỏ trường kích thước khỏi bản ghi file bị bỏ → T1.3 ĐỎ.
- [x] T3.6 Bỏ phép kẹp `timeout_s` → T2.1 ĐỎ.
- [x] T3.7 Đọc thẻ báo lỗi theo nội dung thay vì sự có mặt → T2.2 ĐỎ.
- [x] T3.8 Bỏ phép kiểm ranh giới id → T2.3 ĐỎ.
- [x] T3.9 Cho `fileLoadError` nhận vơ mọi testcase đỏ → T2.4 ĐỎ.
- [x] T3.10 Bỏ đường đọc khối `review` → T2.5 ĐỎ.
- [x] T3.11 **HAI đột biến sống sót ở lượt hai** — đi theo bảng ba đường ở D1:
      · `R7.6` bỏ phép sắp lại theo thứ tự git → **ca không load-bearing**: ca dùng hai file cùng độ dài,
        `Array.sort` ổn định nên thứ tự giữ nguyên ở cả hai hiện thực. **Sửa ca** cho thứ tự git ngược với
        thứ tự chọn.
      · `R2.15` bỏ điều kiện «đúng MỘT testcase» → **đột biến gỡ nhầm chỗ**: phép kiểm title chặn trước ở
        mọi ca hiện có, nên vế đếm chưa ai chạm. **Thêm ca** hai testcase cùng mang tên file.
      Đo lại: cả hai ĐỎ, nhất quán hai lần. Tổng **21/21**.

## Ca sinh ra từ mutation (không có trong kế hoạch ban đầu)

- [x] T5.1 `dung-diff.test.ts` «giữ nguyên thứ tự file như git trả về» — **sửa cho load-bearing**.
- [x] T5.2 `loi-nap-file.test.ts` «HAI testcase cùng mang tên file vẫn là file đã nạp được» — **ca mới**.

## Trục nhạy cảm

- [N/A] T_bimat — change này không chạm code, không chạm bí mật.
- [N/A] T_failclosed — không đổi hành vi nào.
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [N/A] T_khongtincay — không đổi đường dữ liệu ngoài.
- [x] T_hopdong — không thêm export; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [N/A] T4.1 Không có — không dựng gác chạy xuyên suốt (D4 tầng 2).
