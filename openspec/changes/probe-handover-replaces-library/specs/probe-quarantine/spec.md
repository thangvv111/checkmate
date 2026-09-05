# probe-quarantine

## REMOVED Requirements

Cách ly sinh ra để giải một bài toán **chỉ tồn tại khi có kho**: probe cũ nằm lại nhiều tháng, repo đích đổi
tên module, probe không nạp được nữa, và nó kéo cả lượt chấm chết theo. Đúng năm lượt chết trên prod
31/08 là ca đó.

**Reason chung:** không còn probe nào sống qua lượt chấm thì không còn probe nào **mục**. Probe sinh trong
lượt nào chỉ chạy ở lượt ấy, trên đúng cây mã nguồn mà nó vừa được viết cho — nó không có thời gian để lệch
khỏi repo. Bài toán biến mất cùng cái kho, không phải được giải.

**Migration:** không có dữ liệu phải chuyển. Dấu `cach_ly` trong `probes-lib/*/meta.json` trên máy chủ nằm
yên trên đĩa và không được đọc nữa. Ba route thao tác cách ly (`cách ly` · `bỏ cách ly` · `dọn`) gỡ khỏi
`server.ts`.

⚠ **Cái mất phải nói ra:** một probe **sinh mới** vẫn có thể không nạp được (model viết code sai import, tên
module gõ nhầm). Ca ấy KHÔNG biến mất theo cách ly — nó vẫn phải được xử. `probe-classification` đã có nhãn
`khong_chay` cho nó, và luật «nhánh gốc không chạy được probe nào là ca bình thường, và phải nói ra» vẫn
đứng nguyên. Thứ bị gỡ là **cách ly probe CŨ**, không phải cách xử probe hỏng.

### Requirement: Probe không NẠP ĐƯỢC bị cô lập, không được kéo cả lượt chấm chết theo
**Reason**: cô lập theo VÒNG rồi loại khỏi các lượt SAU — cả cơ chế đứng trên giả định probe sống qua nhiều
lượt.
**Migration**: probe sinh mới không nạp được vẫn bị loại **trong lượt** và nói ra qua nhãn `khong_chay`
(`probe-classification`); không có «lượt sau» để loại khỏi.

### Requirement: Cô lập làm lượt chấm YẾU ĐI, và điều đó phải hiện ra
**Reason**: đếm số probe bị cách ly ở verdict — không còn cách ly thì không còn số ấy.
**Migration**: nguyên tắc «lượt chấm yếu đi thì phải hiện ra» **chuyển nhà** sang `probe-handover` ở dạng
rộng hơn: bỏ hẳn lớp phủ hồi quy là một mất mát, và nó phải hiện ra ở chỗ người đọc verdict nhìn thấy.

### Requirement: Cách ly là ĐÁNH DẤU, không phải xoá
**Reason**: đảo-ngược-được là tính chất của một dấu trên bản ghi trong kho.
**Migration**: không có bản ghi nào để đánh dấu. Tính chất «máy chỉ được làm việc đảo ngược được, xoá thì
người mới làm» vẫn đứng — nay nó thể hiện ở chỗ change này **không xoá** `probes-lib/` trên đĩa.
