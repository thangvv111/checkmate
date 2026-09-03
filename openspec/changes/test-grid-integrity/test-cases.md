# Test cases — test-grid-integrity

Requirement: R-1 «Lưới quét source phải có CẶP fixture» · R-2 «Mutation bắt buộc, chạy hai lần» ·
R-3 «Gác chạy xuyên suốt phải đếm bề mặt bằng máy» · R-4 «Ba tầng KHÔNG đóng kín».

Chỉ **R-1** khoá được bằng máy. R-2 và R-3 là luật về **cách viết change** — chúng sống ở `AGENTS.md`,
và ép chúng vào lưới sẽ tạo một lưới đoán ngữ nghĩa, tức đúng thứ capability này chống (design D1).

## R-1 cặp fixture cho hàm quét

- [ ] T1.1 Repo hiện tại: bốn hàm quét (`scanSource` · `scanDirectSql` · `scanAccountReaders` ·
      `scanCookieReaders`) đều có **cả** ca kỳ vọng rỗng lẫn ca kỳ vọng không rỗng.
- [ ] T1.2 **Fixture đối kháng**: một file test giả có hàm quét chỉ với ca đối kháng → lưới ĐỎ, nêu tên hàm.
      *Ca load-bearing: phép quét trả rỗng trông giống hệt «mọi hàm đều đủ cặp» và «phép quét hỏng».*
- [ ] T1.3 **Fixture đối chứng**: một file test giả có hàm quét đủ cặp → lưới XANH.
      *Chính capability này đòi cặp fixture, nên lưới của nó phải có cặp — không được miễn chính luật nó
      cưỡng chế.*
- [ ] T1.4 File test không có hàm quét nào → lưới xanh, không báo gì.

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [ ] T2.1 Bỏ phép kiểm «có ca kỳ vọng rỗng» → T1.2 ĐỎ.
- [ ] T2.2 Bỏ phép kiểm «có ca kỳ vọng không rỗng» → ĐỎ trên fixture chỉ có ca đối chứng.

## R-2 · R-3 — không khoá được bằng máy, và đó là chủ đích

- [N/A] T3.1 «mutation bắt buộc» — máy không biết ca nào *khoá một gác*; phân biệt ấy là ngữ nghĩa.
      Chỗ ở: `AGENTS.md`, viết kèm **án lệ có số** vì không có lưới.
- [N/A] T3.2 «đếm bề mặt bằng máy» — máy không biết change nào *dựng gác xuyên suốt*.
      Chỗ ở: `AGENTS.md` + khuôn `design.md`.
- [ ] T3.3 `AGENTS.md` và `CLAUDE.md` khớp từng ký tự sau khi sửa — lưới `huong-dan-harness` xanh.

## R-4 — luật cho người đọc

- [N/A] T4.1 Không khoá được bằng máy **có chủ đích**. Loại lỗi thứ tư («lưới đúng nhưng luật sai») chỉ
      người đọc bắt được — hôm nay nó được bắt bằng một câu hỏi của PO, không bằng cơ chế nào.
      Viết nó vào spec là cách duy nhất để người sau biết họ vẫn phải đọc.

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật.
- [ ] T_failclosed — T1.2: lưới thiếu cặp fixture thì ĐỎ, không im lặng cho qua.
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [N/A] T_khongtincay — chỉ đọc `test/` của chính repo.
- [ ] T_hopdong — export mới (nếu có) khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T5.1 Không có — change này không dựng gác chạy xuyên suốt.
