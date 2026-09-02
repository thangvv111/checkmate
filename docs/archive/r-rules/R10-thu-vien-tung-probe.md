<!-- ĐÃ GỠ KHỎI VAI TRÒ LUẬT ngày 2026-09-02 (change retire-r-rules). File này CHỈ ĐỌC và KHÔNG còn được cập nhật.
     Nhà mới của từng điều: docs/r-rules-map.md. Luật đang hiệu lực: openspec/specs/<capability>/. -->

# R10 — Thư viện probe: hạt nạp là TỪNG PROBE, trùng lặp xử theo bốn tầng

Thư viện probe là tài sản regression tích luỹ theo repo. Đời đầu nạp theo **bộ** (mỗi lượt chấm một
file), dedup bằng sha256 cả file — vô hiệu trên thực tế: hai lượt chấm không bao giờ sinh code y hệt
từng byte, nên thư viện phình bằng bản sao (đo được: 8 file thì 4 cặp trùng cùng commit sinh). Đời này
đổi hạt.

## Hạt nạp

- **R10.1** — Đơn vị nạp, lưu, và đào thải của thư viện là **một probe** — một file độc lập chạy được
  một mình, mang đúng một phép thử. Không còn khái niệm "bộ".
- **R10.2** — File per-probe được **tách** từ file của lượt chấm: giữ nguyên phần đầu (import, helper),
  cắt các phép thử khác. Tách không được thì **bỏ qua và nói ra**, không nạp mù.
- **R10.3** — File tách là artifact MỚI chưa từng chạy. Trước khi nạp PHẢI verify nó chạy sạch một mình
  trên nhánh gốc — đây là lưới đỡ cho mọi ca tách hỏng (decorator mồ côi, helper bị cắt nhầm...).
- **R10.4** — Trần thư viện đếm theo **probe** (mặc định 100, chỉnh qua `CHECKER_LIB_TRAN`, kẹp
  [6, 200]), đào thải theo điểm GIỮ/LOẠI (R10.22) và phải xoá cả file trên đĩa (giữ
  [R8.9](R8-chay-song-song.md)). MỌI probe trong thư viện đều CHẠY ở mọi lượt — không có trần chạy
  riêng: chạy probe kho tốn 0 token và vài giây vitest, trong khi một «top N hiệu quả» tạo ra nửa kho
  không bao giờ chạy, lịch sử đóng băng, không bao giờ được chọn lại. Điểm quyết ai được Ở, không
  quyết ai được CHẠY (PO chốt 31/08).
- **R10.5** — Thư viện đời bộ được di trú tự động sang đời probe ở lần đọc đầu: tách từng probe, loại
  bản trùng chạy-lại, ghi chú kết quả di trú vào sổ thư viện. File bộ cũ chỉ bị xoá khi ĐÃ di trú trọn
  vẹn — chi tiết ở [R10.13](#an-toàn-dữ-liệu-của-thư-viện-bài-học-từ-dàn-review-đối-kháng).

## Bốn tầng xử trùng lặp

Nguyên tắc xuyên suốt — **rủi ro không đối xứng**: loại nhầm một probe thật là mất tài sản regression
*trong im lặng*; giữ nhầm một bản sao chỉ tốn chỗ. Mọi tầng đều nghiêng về GIỮ, và mọi lần loại đều
phải ghi log: probe nào, trùng với probe nào, vì sao.

- **R10.6 · Tầng 1 (cơ học, miễn phí)** — Probe mới trùng **cả ba**: commit sinh (`sha_sinh`), id, và
  luật spec với một probe đã có → là bản chạy-lại của cùng lượt chấm, loại không cần model.
- **R10.7 · Tầng 2 (cơ học, miễn phí)** — Probe mới có luật spec **giao** với probe đã có (chuỗi
  `spec_rule` như `R1,R2` / `R3+R4` phải được tách chuẩn hoá trước khi so), hoặc cùng commit sinh, thì
  vào **diện nghi** — chưa loại.
- **R10.8 · Tầng 3 (model, chỉ trên diện nghi)** — Model phân xử bằng đúng một câu hẹp: *"hai phép thử
  này có cho ra CÙNG MỘT finding không?"* — không hỏi "có giống nhau không". Chỉ loại khi model trả
  lời TRÙNG kèm cờ chắc chắn. Model lỗi, không trả lời được, hay trả lời thiếu → GIỮ toàn bộ, ghi log
  rằng phân xử đã bị bỏ qua.
- **R10.9 · Tầng 4 (hành vi đo được)** — Mỗi probe thư viện tích luỹ lịch sử kết quả theo từng lượt
  chấm (`sha` lượt → trạng thái máy phân loại). Hai probe bị coi là trùng đo được khi: cùng luật spec,
  có **≥ 3 lượt chung**, kết quả **giống hệt nhau ở mọi lượt chung**, và trong đó **ít nhất một lượt
  không phải pass**. Khi đó gỡ probe MỚI hơn, giữ probe cũ hơn (đã được chứng minh lâu hơn), log kèm
  bằng chứng. Hai probe cùng xanh suốt KHÔNG bị coi là trùng — đồng thuận khi không có gì xảy ra không
  phải bằng chứng.
- **R10.10** — Lịch sử hành vi có trần (20 lượt gần nhất); cùng một lượt chạy lại thì thay bản ghi cũ
  của lượt đó, không nhân đôi — với một ngoại lệ khai ở R10.24: nhãn hoàn cảnh không đè nhãn hành-vi-
  riêng đã ghi cho cùng lượt.

## Ranh giới với khoá liên tiến trình

- **R10.11** — Lời gọi model phân xử KHÔNG được nằm trong khoá thư viện ([R8.4](R8-chay-song-song.md)):
  model trả lời tính bằng phút còn khoá quá hạn tính bằng giây — giữ khoá qua lời gọi model là mời tiến
  trình khác phá khoá giữa chừng. Đọc thư viện ngoài khoá, quyết định, rồi nạp trong khoá với kiểm lại.

## An toàn dữ liệu của thư viện (bài học từ dàn review đối kháng)

- **R10.12** — Ghi sổ thư viện (`meta.json`) PHẢI atomic: viết file tạm rồi rename đè. Gặp sổ rách khi
  đọc thì PHẢI giữ bằng chứng (đổi tên file hỏng) trước khi coi thư viện như rỗng — fallback-rỗng rồi
  ghi đè là biến một file rách thành xoá sổ cả thư viện trong im lặng.
- **R10.13** — Di trú PHẢI ghi sổ mới TRƯỚC rồi mới xoá file bộ cũ, và CHỈ xoá file bộ đã di trú trọn
  vẹn: còn một probe không tách được là cả file bộ được giữ lại trên đĩa. Ghi chú di trú phải nêu
  TỪNG probe bị loại (trùng với ai) và từng probe kẹt lại — số gộp không đủ để truy "probe X đâu rồi".
  File bộ mất sẵn trên đĩa đếm riêng, không được đổ oan cho máy tách.
- **R10.14** — Trần thư viện đọc từ biến môi trường chỉ nhận số nguyên sạch. Giá trị hỏng dùng mặc
  định: chuỗi rỗng cho ra 0-rồi-kẹp-về-sàn là đào thải hàng loạt, chữ cho ra NaN là trần vô hiệu —
  cả hai đều âm thầm.
- **R10.15** — Đọc thư viện diễn ra ngoài khoá (R10.11) nên PHẢI chịu được file bị lượt song song dọn
  mất giữa chừng: mất file nào bỏ qua file đó, không được đổ cả lượt chấm.
- **R10.16** — Máy tách phải nhận diện regex literal khi đếm ngoặc (ngoặc trong `/x\)/` không phải
  cấu trúc), và bản cắt làm lệch cân bằng ngoặc của file PHẢI bị coi là tách hỏng.

- **R10.20** — Tầng 4 chỉ được so trên những lượt mà trạng thái nói về **hành vi riêng** của probe
  (`pass` · `hoi_quy` · `cai_thien`). Các nhãn `ngoai_pham_vi` · `nghi_loi_co_san` · `nghi_van` ·
  `khong_chay` · `bo_qua` phản ánh hoàn cảnh CHUNG của lượt chấm — spec-code đã đổi, API đổi mã lỗi,
  fixture đổi — nên mọi probe neo cùng một luật sẽ đồng loạt mang nhãn đó dù chúng kiểm những biên
  khác hẳn nhau. So trên chúng là kết luận "trùng" từ một sự kiện không liên quan tới probe nào.
- **R10.21** — Hai probe cùng `pass` mãi KHÔNG chứng minh chúng trùng nhau, chỉ chứng minh chưa có gì
  để bắt. Tầng 4 PHẢI thấy ít nhất một lượt cả hai cùng `hoi_quy` hoặc cùng `cai_thien` mới được gỡ.
  Rủi ro ở đây không đối xứng: giữ nhầm một probe thừa tốn vài giây mỗi lượt, gỡ nhầm một probe thật
  là mất vĩnh viễn một phép thử đã từng bắt được hồi quy.

## Đào thải theo điểm GIỮ/LOẠI (thay FIFO — PO chốt 31/08)

Nguyên tắc: **probe regression giá trị nhất thường là probe im lặng lâu năm** — nó pass đều vì đang
canh một biên chưa ai phá lại, không phải vì vô dụng. Đào thải theo tuổi (FIFO) hay theo «tần suất
nổ» đều loại đúng lưới an toàn đang im lặng. Điểm chỉ nhìn tín hiệu XẤU đo được và thành tích THẬT.

- **R10.22** — Khi thư viện vượt trần, nạn nhân chọn theo thứ tự: (1) probe **chết kéo dài** — cả
  `CHET_KEO_DAI_NGUONG` lượt gần nhất trong lịch sử đều mang nhãn hoàn cảnh chết (`nghi_loi_co_san` ·
  `khong_chay`), tức API đích đã đổi và probe không còn chạy được — giữ là giữ xác, kể cả xác từng
  bắt hồi quy; (2) probe **flaky** — `flaky_diem` cao nhất trong nhóm ≥ 2; (3) probe **cũ nhất chưa
  từng bắt hồi quy** — KHÔNG tính probe vừa nạp, và «vừa nạp» phải nhận diện bằng DẤU HIỆU DỮ LIỆU
  (định danh truyền từ chỗ nạp), không đoán theo vị trí trong mảng: kho toàn hàng miễn trừ mà đá luôn
  probe mới là van nấc (4) không bao giờ mở, kho hoá thạch, không nhận được phép thử cho biên mới; (4) probe cũ nhất
  tuyệt đối (khi mọi probe cũ đều miễn trừ — van chống kẹt trần). Mọi lần loại PHẢI log: probe nào,
  nấc nào, bằng chứng gì.
- **R10.23** — Probe từng bắt hồi quy mang cờ `da_bat_hoi_quy` **vĩnh viễn** (không trôi theo trần
  lịch sử 20 lượt) và được **miễn trừ** nấc (3) — thành tích thật không hết hạn. Cờ không cứu được
  probe chết kéo dài (R10.22 nấc 1) và không cứu khỏi tầng 4 (trùng hành vi có bằng chứng).
- **R10.24** — `flaky_diem` đếm số lần **cùng một sha lượt chấm** cho ra hai trạng thái KHÁC nhau ở
  hai lần chạy — và CHỈ khi cả hai trạng thái đều là nhãn hành vi riêng (`pass` · `hoi_quy` ·
  `cai_thien`): cùng commit khác kết quả là phép thử không tất định. Nhãn hoàn cảnh đổi qua lại
  (spec đổi, fixture đổi) KHÔNG tính — đó là chuyện của lượt, không phải của probe. Điểm cộng dồn
  vĩnh viễn, không reset. Hệ quả buộc phải có: nhãn hoàn cảnh KHÔNG ĐÈ nhãn hành-vi-riêng đã ghi cho
  cùng sha (mở rộng R10.10) — đè là xoá dấu, chuỗi pass → nghi_loi_co_san → hoi_quy trên cùng sha sẽ
  sót mất cặp pass↔hoi_quy, và tầng 4 mất một lượt so được.
