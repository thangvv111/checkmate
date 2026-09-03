# Test cases — probe-classification

Requirement: R-1 «Máy phân loại probe theo bảng chân trị hai nhánh» · R-2 «Cùng nguyên nhân quyết bằng vân
tay hai tầng» · R-3 «Luật chỉ có ở nhánh PR» · R-4 «Nhánh gốc không chạy được probe nào».

**Phần lớn ca đã có sẵn** trong `test/phan-loai.test.ts` (31 ca). Bảng dưới ghi ca nào khoá scenario nào —
không lặp lại chúng, chỉ đối chiếu; ca MỚI chỉ có ở mục R-4.

## Đối chiếu: scenario ↔ ca đã có

### R-1 bảng chân trị (`classifyByMachine`)
- [ ] T1.1 [khong_chay]: «không có kết quả nhánh PR thì là khong_chay, không được suy đoán» ✓ có.
- [ ] T1.2 [bo_qua]: «probe bị skip KHÔNG được tính pass (lách lưới bằng it.skip)» ✓ có.
- [ ] T1.3 [pass]: «xanh cả hai nhánh là pass» ✓ có.
- [ ] T1.4 [cai_thien]: «nhánh gốc đỏ mà PR xanh là cai_thien» ✓ có.
- [ ] T1.5 [hoi_quy]: «PR đỏ mà gốc xanh là hoi_quy — bằng chứng đủ để chặn merge» ✓ có.
- [ ] T1.6 [nghi_van thiếu đối chứng]: «PR đỏ nhưng KHÔNG có dữ liệu đối chứng thì chỉ là nghi_van» ✓ có.
- [ ] T1.7 [ngoai_pham_vi]: «đỏ cả hai nhánh cùng nguyên nhân là ngoai_pham_vi» ✓ có.
- [ ] T1.8 [nghi_van khác nguyên nhân]: «đỏ hai nhánh khác hẳn thông điệp thì đẩy cho model phân xử» ✓ có.

### R-2 vân tay hai tầng
- [ ] T2.1 [thô]: «vân tay thô gột id/hex/số nên hai lần chạy khác dữ liệu vẫn cùng vân tay» ✓ có.
- [ ] T2.2 [dòng đầu]: «vân tay thô chỉ lấy dòng đầu — stack trace phía dưới không làm lệch» ✓ có.
- [ ] T2.3 [chặt giữ số ngắn]: «vân tay chặt GIỮ số ngắn nên phân biệt được 500 với 404» ✓ có.
- [ ] T2.4 [chặt vẫn gột thứ đổi]: «vân tay chặt vẫn gột thời lượng ms và id dài» ✓ có.
- [ ] T2.5 [phải trùng CẢ HAI]: «đỏ hai nhánh nhưng khác status code thì là nghi_van — vân tay thô trùng
      KHÔNG đủ để loại» ✓ có.

### R-3 luật chỉ có ở nhánh PR
- [ ] T3.1 [chặn]: «probe neo luật MỚI mà đỏ ở nhánh PR thì CHẶN, dù cũng đỏ ở nhánh gốc» ✓ có.
- [ ] T3.2 [gốc pass thắng]: «gốc pass + PR đỏ + luật mới → hoi_quy, KHÔNG phải vi_pham_luat_moi» ✓ có.
- [ ] T3.3 [probe hỏng]: «đỏ cả hai + luật mới NHƯNG probe hỏng → không kết luận» ✓ có.
- [ ] T3.4 [không dương tính giả]: «KHÔNG bắt nhầm lỗi nghiệp vụ tiếng Anh tự nhiên» ✓ có.
- [ ] T3.5 [luật mới mà xanh]: «luật mới mà probe XANH ở nhánh PR thì vẫn là pass» ✓ có.
- [ ] T3.6 [skip vẫn thắng]: «probe bị skip vẫn là bo_qua, luật mới không được lấn lưới chống lách» ✓ có.

## Ca MỚI — R-4 (chỗ hở duy nhất)

- [ ] T4.1 [R1.15 có cảnh báo]: GIVEN nhánh gốc không cho kết quả nào (`baseKq` rỗng) WHEN dựng prompt sinh
      lại THEN prompt chứa đủ ba ý: nhánh gốc KHÔNG chạy được probe nào · mọi probe đỏ thành nghi vấn chứ
      không thành hồi quy · probe đỏ nhiều khả năng là PROBE SAI GIẢ ĐỊNH.
      *(Trước khi export `promptSinhCode`: không viết được ca — hàm không gọi tới được.)*
- [ ] T4.2 [R1.15 vế đối chứng]: GIVEN nhánh gốc CÓ kết quả WHEN dựng prompt sinh lại THEN prompt KHÔNG
      chứa lời cảnh báo đó. Thiếu vế này thì một bản «nhét cảnh báo vào mọi lượt» vẫn xanh — nói thừa cũng
      là nói sai.
- [ ] T4.3 [Mutation]: bỏ điều kiện `baseKq === undefined || baseKq.length === 0` → T4.1 hoặc T4.2 phải ĐỎ.

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật; prompt dựng từ kế hoạch probe và thông điệp lỗi đã có.
- [ ] T_failclosed — T1.1 · T1.2 · T1.6: thiếu kết quả, bị skip, thiếu đối chứng đều KHÔNG thành `pass` và
      KHÔNG thành `hoi_quy`; máy không suy đoán chỗ nó không biết.
- [ ] T_cong — T1.5 · T3.1 · T3.2: `hoi_quy` và `vi_pham_luat_moi` là hai nhãn duy nhất chặn merge, và
      chúng không được lẫn vào nhau (ca T3.2 khoá đúng ranh giới).
- [ ] T_khongtincay — T3.3 · T3.4: thông điệp lỗi là dữ liệu do bộ chạy test và code repo đích sinh ra;
      phép nhận diện probe hỏng phải hẹp, kẻo vá false-FAIL bằng cách mở đường false-PASS.
- [ ] T_hopdong — `promptSinhCode` export mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T5.1 Không có — mọi thứ ở change này kiểm được bằng máy.
