<!-- ĐÃ GỠ KHỎI VAI TRÒ LUẬT ngày 2026-09-02 (change retire-r-rules). File này CHỈ ĐỌC và KHÔNG còn được cập nhật.
     Nhà mới của từng điều: docs/r-rules-map.md. Luật đang hiệu lực: openspec/specs/<capability>/. -->

# R8 — Nhiều lượt chấm chạy song song

CheckMate chấm được nhiều PR cùng lúc. Mỗi lượt là một **tiến trình riêng** với **sandbox riêng**
(thư mục tạm + git worktree riêng), nên chúng không giẫm chân nhau về chỗ làm việc. Nhưng chúng vẫn
dùng chung một clone repo, một thư viện probe và một sổ cái — đó là nơi phải cẩn thận.

## Trần đồng thời

- **R8.1** — Số lượt chạy đồng thời PHẢI có trần. Vượt trần thì chế độ trực ngừng nạp thêm, còn đường
  bấm tay trả về lỗi "đang bận" chứ KHÔNG xếp hàng ngầm rồi để người dùng ngồi đợi không biết vì sao.
- **R8.2** — Trần tồn tại vì mỗi lượt tốn một worktree trên đĩa, một lượt chạy bộ test thật, và các
  lời gọi model. Nâng trần là quyết định về tài nguyên máy chủ, không phải tinh chỉnh giao diện.

## Không dùng chung ref của git

- **R8.3** — Ref tạm mà lượt chấm fetch về PHẢI mang tên riêng theo PR, kể cả ref của nhánh gốc. Dùng
  chung một tên ref cho nhánh gốc thì lượt sau force-update ref đó, và lượt trước có thể đối chứng
  nhầm sang commit mới hơn commit nó định so — verdict vẫn ra, nhưng ra trên đối chứng sai.

## Thư viện probe

- **R8.4** — Nạp probe vào thư viện là chuỗi đọc → sửa → ghi trên một file sổ dùng chung. Toàn bộ chuỗi
  đó PHẢI nằm trong một khoá giữa các tiến trình, và sổ PHẢI được đọc lại **bên trong** khoá. Đọc ngoài
  khoá là đọc bản có thể đã cũ, rồi ghi đè lên phần lượt song song vừa thêm.
- **R8.5** — Tên file probe trong thư viện PHẢI suy từ **nội dung** (hash), không từ số thứ tự. Hai lượt
  song song cùng chấm một commit sẽ tính ra cùng một số thứ tự và đạp lên file của nhau.
- **R8.6** — Khoá PHẢI được nhả cả khi việc bên trong ném lỗi.
- **R8.7** — Khoá của một tiến trình đã chết PHẢI bị phá sau một ngưỡng quá hạn. Không có luật này thì
  một lượt chấm bị kill là cả thư viện đứng hình vĩnh viễn.
- **R8.8** — Chờ khoá quá lâu thì vẫn phải làm việc chứ không được bỏ probe. Mất một lần ghi đè còn hơn
  mất hẳn probe vừa chứng minh được.
- **R8.9** — Đẩy file ra khỏi thư viện theo trần FIFO PHẢI xoá luôn file trên đĩa, không để lại file mồ
  côi không ai đọc và không ai dọn.

## Nơi chạy

- **R8.10** — Sandbox chạy trên **chính máy chủ CheckMate**, không phải trên hạ tầng của nhà cung cấp
  model. Model không có tool: nó chỉ đề xuất probe và viết code probe; máy chủ là nơi chạy thật.
- **R8.12** — Môi trường truyền cho MỌI tiến trình con — kể cả tiến trình chạy model của chính checker —
  PHẢI dựng bằng **danh sách cho phép**, không bao giờ bằng danh sách cấm. Danh sách cấm đòi người viết
  biết trước mọi bí mật sẽ tồn tại trong tương lai: thêm một khoá vào file môi trường là rò thêm một bí
  mật, và không ai phải sửa code nên không ai nhận ra. Đo được: bản trước truyền cả môi trường rồi cắt
  đúng một tên, nên `GITHUB_TOKEN` của máy chủ chảy sang tiến trình CLI ở mọi lượt chấm dù nó không cần
  chìa đó để làm gì.
- **R8.11** — Tiến trình chạy test PHẢI nhận môi trường đã lọc — token, khoá API và biến bí mật khác
  KHÔNG được lọt vào. Code của PR được chạy thật, nên coi nó là code không tin được.
