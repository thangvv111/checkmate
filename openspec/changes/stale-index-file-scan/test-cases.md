# Test cases — stale-index-file-scan

Bề mặt đếm bằng máy ở `tasks.md` §1: **245** file lưới thật sự đọc (566 là số đếm SAI lần đầu — chưa trừ `KHONG_QUET`) · **3** lưới dùng `git ls-files`, chỉ **1**
đọc nội dung.

## Hàm thuần

- [x] T1.1 [Happy] Mọi file đều tồn tại → đọc hết, `boQua` rỗng.
- [x] T1.2 [Ca đã gãy BA lần] Một file có trong danh sách mà **không còn trên đĩa** → bỏ qua, **không
      ném**, và tên nó nằm trong `boQua`.
- [x] T1.3 Bỏ qua nhiều file → đếm đúng số, giữ đúng tên.
- [x] T1.4 [Đầu vào khuyết] danh sách rỗng · phần tử rỗng · `null` → không ném.
- [x] T1.5 Lỗi đọc KHÁC (quyền, thư mục) cũng vào `boQua` chứ không làm đổ cả lượt — cùng lý do: một file
      không đọc được không được giết phép quét của 244 file còn lại.

## Gác chống-mù

- [x] T2.1 **Danh sách toàn file vắng mặt → phép quét biết nó đang MÙ.** *(Bỏ qua file vắng mặt là làm
      phép quét bớt phủ. Nếu cả danh sách vắng mặt — sai thư mục làm việc, `git` trả rỗng — thì lưới sẽ
      XANH mà không quét gì: đúng lỗi lưới loại 1.)*
- [x] T2.2 Thông điệp phân biệt được **«chỉ mục lệch đĩa»** với **«phép quét mù»** — nêu số đọc được và
      số bỏ qua, không chỉ nói «có lỗi».
- [x] T2.3 [fixture đối chứng] Số đọc được trên sàn → không đỏ dù có vài file bị bỏ qua.

## Hồi quy — không được bớt phủ

- [x] T3.1 Lưới `r-rules-map` vẫn bắt được mã R mồ côi như trước.
- [x] T3.2 Số file lưới thật sự đọc ở trạng thái bình thường **không nhỏ đi** so với trước change.

## Mutation

- [x] T4.1 Bỏ gác chống-mù → T2.1 ĐỎ.
- [x] T4.2 Bỏ qua file vắng mặt mà không đếm → T1.2 ĐỎ.
- [x] T4.3 Đột biến sống sót → bảng ba đường. **Không đột biến nào sống sót** (3 đột biến × 2 lượt, giết
      2 / 5 / 6 ca, hai lượt trùng khớp; mỗi lượt `grep -c` xác nhận đột biến đã tới đĩa).

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T5.1 **Tái hiện đúng cảnh gãy:** dời một thư mục git đang theo dõi, chạy `npm test` NGAY khi chưa
      commit → lưới XANH, không `ENOENT`. *(Ca đã gãy ba lần, chưa lần nào có test.)*
- [x] T5.1b **Đối chứng cho T5.1** — cùng cảnh ấy, lưới CŨ (đọc thẳng) ĐỎ với đúng `ENOENT: … named-debts/.openspec.yaml`.
      Không có vế này thì T5.1 xanh không chứng minh được gì: xanh trên một cảnh chưa chắc tái hiện được lỗi là xanh vô nghĩa.
- [x] T5.2 Trạng thái bình thường: `npm test` xanh TOÀN BỘ (71 file · 1252 ca), đọc được **245**, bỏ qua **0**.
