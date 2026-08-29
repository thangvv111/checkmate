# R1 — Phân loại probe bằng MÁY, đối chứng hai nhánh

Probe (phép thử đối kháng) do model đề xuất được chạy thật trên **hai nhánh**: nhánh của pull request
và nhánh gốc. Kết luận một probe nói lên điều gì là việc của **máy**, không phải của model — model chỉ
nhận nhãn đã dán và viết finding (phát hiện) dựa trên nhãn đó.

Ký hiệu: `br` = kết quả trên nhánh PR, `bs` = kết quả trên nhánh gốc (base).

## Luật

- **R1.1** — `br` không có kết quả thì trạng thái PHẢI là `khong_chay`. Không được suy đoán từ `bs`.
- **R1.2** — Probe `skipped` (bị bỏ qua, ví dụ `it.skip`) KHÔNG ĐƯỢC tính là `pass`; trạng thái PHẢI là `bo_qua`.
  Đây là đường lách lưới rẻ nhất: một probe bị vô hiệu hoá mà vẫn tính xanh thì cổng chấm mất tác dụng.
- **R1.3** — Xanh cả hai nhánh → `pass`.
- **R1.4** — Đỏ ở nhánh gốc mà xanh ở nhánh PR → `cai_thien`. PR sửa được lỗi có sẵn, không phải lỗi mới.
- **R1.5** — Đỏ ở nhánh PR mà xanh ở nhánh gốc → `hoi_quy` (regression — lỗi PR làm sinh ra). Đây là
  trạng thái DUY NHẤT đủ tư cách làm bằng chứng chặn merge.
- **R1.6** — Đỏ ở nhánh PR nhưng **không có dữ liệu đối chứng** (`bs` không tồn tại vì nhánh gốc không
  chạy được) thì KHÔNG ĐƯỢC phong `hoi_quy`; trạng thái PHẢI là `nghi_van`. Thiếu đối chứng là thiếu
  bằng chứng, không phải bằng chứng có tội.
- **R1.7** — Đỏ cả hai nhánh **cùng nguyên nhân** → `ngoai_pham_vi`. Không quy tội PR, và cũng KHÔNG
  ĐƯỢC kết luận "probe hỏng": có thể là probe sai hợp đồng, cũng có thể là lỗi có sẵn của repo. Nhãn
  phải trung thực về chỗ mình không biết.
- **R1.8** — Đỏ cả hai nhánh nhưng **khác nguyên nhân** → `nghi_van`, đẩy cho model phân xử. Vứt bỏ ở
  đây là mất bằng chứng thật.

## Vân tay lỗi (error fingerprint) — hai tầng

"Cùng nguyên nhân" ở R1.7 được quyết bằng hai tầng vân tay, cả hai chỉ lấy **dòng đầu** của thông điệp lỗi:

- **R1.9** — Vân tay THÔ gột mọi chữ số, chuỗi hex dài và khoảng trắng thừa. Hai lần chạy khác dữ liệu
  (id khác, request id khác) PHẢI cho cùng vân tay thô.
- **R1.10** — Vân tay CHẶT giữ lại chữ số ngắn (status code, số đếm) nhưng vẫn gột thời lượng `ms`,
  số dài và hex dài. `expected 500 to be 200` và `expected 404 to be 200` PHẢI ra hai vân tay chặt KHÁC nhau.
- **R1.11** — Chỉ khi vân tay thô trùng **và** vân tay chặt cũng trùng mới được kết luận `ngoai_pham_vi`.
  Thô trùng mà chặt khác thì rơi về `nghi_van` (R1.8).

## Hệ quả với verdict

- **R1.12** — Có ít nhất một probe `hoi_quy` thì verdict PHẢI là `FAIL`.
- **R1.13** — Probe `nghi_van` không tự nó làm nên `FAIL`, nhưng PHẢI được nêu trong verdict để người
  đọc biết vùng chưa kết luận được.

## Khi nhánh gốc không chạy được probe nào

- **R1.14** — Pull request **thêm module mới** thì nhánh gốc chưa có file đó, nên nhánh gốc không chạy
  được probe nào. Đây là ca bình thường, không phải hỏng: máy vẫn dán nhãn đúng theo [R1.6](#luật)
  (thiếu đối chứng → `nghi_van`, không phong hồi quy).
- **R1.15** — Trong ca đó, lượt sinh lại probe PHẢI được cho biết rằng nhánh gốc không có đối chứng, và
  rằng probe đỏ ở đây nhiều khả năng là **probe sai giả định** chứ không phải code sai. Không nói ra thì
  model tưởng mình import sai đường và đi sửa nhầm chỗ — mất trọn lượt sinh lại.
- **R1.16** — Hệ quả cần hiểu đúng: với pull request thêm tính năng mới, con đường DUY NHẤT để lượt chấm
  có cơ sở kết luận là probe **chạy được và pass trên nhánh PR** — tức nó chứng minh tính năng mới hoạt
  động đúng spec. Không có đường nào khác, và đó là điều đúng đắn.
