# R7 — Tầm nhìn diff: cắt được, nhưng không cắt âm thầm

Diff của một pull request thật thường lẫn thứ không nói lên điều gì về hành vi phần mềm — lockfile, file
build, ảnh — nhưng lại chiếm phần lớn ngân sách prompt. Feed nguyên diff vào model thì quá ngưỡng nào đó
model không trả lời nổi và lượt chấm chết vì hết giờ.

Nguyên tắc: được phép thu hẹp cái model nhìn thấy, nhưng **mọi thứ bị bỏ phải được nói ra** — cho người
đọc log, và cho chính model. Một checker im lặng về phần nó chưa xem sẽ ra `PASS` trên vùng mù, và đó
đúng là loại xanh giả mà công cụ này sinh ra để chống.

## Loại file sinh tự động

- **R7.1** — File sinh tự động PHẢI bị loại khỏi diff đưa vào prompt: lockfile (`package-lock.json`,
  `yarn.lock`, `go.sum`, `Cargo.lock`…), file đã minify, file nhị phân (ảnh, font, PDF, video), thư mục
  build (`dist/`, `build/`, `coverage/`, `node_modules/`).
- **R7.2** — Repo khai thêm mẫu riêng qua `review.bo_qua_diff` trong `checkmate.yml`.
- **R7.3** — Mẫu regex repo khai sai cú pháp PHẢI bị bỏ qua, KHÔNG được làm sập lượt chấm.

## Trần kích thước

- **R7.4** — Sau khi loại file sinh tự động mà diff vẫn vượt trần thì PHẢI cắt tiếp, ưu tiên giữ file
  **nhỏ** — cùng một ngân sách thì giữ được nhiều file hơn, tức phủ được nhiều bề mặt hành vi hơn.
- **R7.5** — Chỉ có đúng một file mà nó đã vượt trần thì vẫn PHẢI giữ. Chấm trên diff rỗng còn tệ hơn
  chấm trên một diff quá dài.
- **R7.6** — Thứ tự file trong diff dựng ra PHẢI giữ đúng thứ tự git trả về, không theo thứ tự sắp xếp
  nội bộ dùng để chọn file.

## Nói ra vùng mù

- **R7.7** — Mọi file bị bỏ PHẢI được trả về kèm **tên file, số ký tự và lý do**.
- **R7.8** — Log của lượt chấm PHẢI liệt kê các file này.
- **R7.9** — File mã nguồn bị loại vì **vượt trần** PHẢI được cảnh báo riêng, tách khỏi nhóm file sinh
  tự động: đây là vùng mà verdict lượt này không nói gì về nó, và người đọc cần biết ngay.
- **R7.10** — Prompt gửi cho model PHẢI có khối liệt kê các file nó không được xem, kèm chỉ dẫn không
  đề xuất probe nhắm vào chúng và không kết luận gì về chúng.
- **R7.11** — Diff chỉ còn toàn file sinh tự động thì PHẢI báo lỗi nói rõ điều đó, không được báo
  "diff rỗng" chung chung.
