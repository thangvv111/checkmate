# Test cases — diff-visibility

Requirement: R-1 «log nêu file không vào diff và PHÂN BIỆT hai lý do» · R-2 «prompt mang khối file không
được xem, kèm chỉ dẫn» · R-3 «diff chỉ còn file sinh tự động thì lỗi nói đúng nguyên nhân».

## R-2 prompt (chạy thật)

- [x] T2.1 `promptPhanTich` với target có file ngoài tầm nhìn → prompt mang **tên file**, **số ký tự**,
      **lý do**.
- [x] T2.2 Prompt mang **chỉ dẫn** không đề xuất probe nhắm vào chúng và không kết luận gì về chúng.
      *Bỏ danh sách thì model không biết mình khuyết; bỏ chỉ dẫn thì nó biết mà vẫn suy đoán.*
- [x] T2.3 Không có file nào bị loại → khối ấy KHÔNG xuất hiện.
      *Ca load-bearing: một khối rỗng đứng đó dạy model rằng luôn có phần khuất, tức mời nó dè dặt ngay cả
      khi đã nhìn đủ.*

## R-3 thông điệp lỗi (chạy thật, repo git tạm)

- [x] T3.1 PR chỉ đổi file sinh tự động → `readTarget` ném thông điệp nói «chỉ gồm file sinh tự động»,
      **kèm tên file**.
- [x] T3.2 PR không đổi gì → thông điệp KHÁC, nói «diff rỗng».
      *Ca đối chứng mới khoá được luật: một hiện thực ném cùng một câu cho cả hai trạng thái vẫn qua T3.1.*

## R-1 log (đọc source — cái mất đã khai ở D1)

- [x] T1.1 Nhánh log nêu **số lượng**, **tên từng file** và **lý do**.
- [x] T1.2 Có cảnh báo RIÊNG lọc theo `lyDo === 'vượt trần kích thước diff'`, nói verdict lượt này KHÔNG
      kết luận gì về chúng.
      *Đây là vế quan trọng hơn: file sinh tự động bị loại là đúng, file mã nguồn bị loại vì trần là mất
      phủ THẬT. Gộp một dòng thì người vận hành đọc xong yên tâm, trong khi nửa nguy hiểm nằm im trong đó.*

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [x] T4.1 Bỏ chỉ dẫn «đừng kết luận gì» → T2.2 ĐỎ.
- [x] T4.2 Bỏ nhánh trả rỗng khi không có file ngoài tầm nhìn → T2.3 ĐỎ.
- [x] T4.3 `readTarget` ném cùng một câu ở cả hai trạng thái → T3.1 ĐỎ.
- [x] T4.4 Bỏ cảnh báo riêng cho file vượt trần → T1.2 ĐỎ.
- [x] T4.5 Mỗi đột biến **kiểm chứng đã áp dụng** trước khi đọc kết quả; đột biến không giết được ca nào thì
      phân biệt **ba** khả năng (D4), không hai.

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật. *(Diff của repo đích đi vào prompt, nhưng đường ấy do
  `error-message-egress-gate` gác và change này không đổi nó.)*
- [x] T_failclosed — T3.1: không chấm được thì DỪNG kèm lý do đúng, không chấm trên diff rỗng (⛔C2).
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [x] T_khongtincay — tên file trong repo đích là **dữ liệu ngoài**; chúng vào prompt qua khối
  `khoiNgoaiTamNhin`. Change này không đổi đường ấy, nhưng ca T2.1 chạm nó nên ghi ra (⛔C4).
- [x] T_hopdong — KHÔNG thêm export (⛔C5 N/A); `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [N/A] T5.1 Không có — change này không dựng gác chạy xuyên suốt (D4 tầng 2).
