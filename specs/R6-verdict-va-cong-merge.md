# R6 — Verdict và cổng merge

Verdict (kết luận chấm) là thứ duy nhất mở được nút merge. Nó nhị phân, ghim vào một commit cụ thể, và
hết hiệu lực khi commit đổi.

## Tính chất của verdict

- **R6.1** — Kết quả chỉ có hai giá trị: `PASS` hoặc `FAIL`. Không có trạng thái thứ ba kiểu "PASS có
  điều kiện" — mập mờ ở đây là chỗ để lách.
- **R6.2** — Verdict PHẢI ghim `artifact_ref.sha_or_hash` — commit SHA với code, hash nội dung với tài liệu.
- **R6.3** — Có finding mức `high` thì kết quả PHẢI là `FAIL`.
- **R6.4** — Verdict PHẢI kèm `probe_stats` (thống kê probe) để người đọc biết `PASS` nói trên cơ sở nào:
  bao nhiêu probe được lên kế hoạch, bao nhiêu thực chạy, phân bố các trạng thái ở [R1](R1-phan-loai-probe.md).
- **R6.5** — Số probe **lên kế hoạch** và số **thực chạy** phải được nêu tách bạch. `PASS` với 0 probe chạy
  được không phải là `PASS` có giá trị, và người đọc phải thấy điều đó ngay trong verdict.
- **R6.13** — Lượt chấm PHẢI có ít nhất một probe ở trạng thái `pass`, `hoi_quy` hoặc `cai_thien` thì mới
  đủ cơ sở ra verdict. Đây là ba trạng thái duy nhất nói lên điều gì đó về PR. Không có cái nào thì lượt
  chấm PHẢI kết thúc bằng lỗi, KHÔNG được ra `PASS`.

  Lý do phải có luật riêng: lưới chống `PASS` rỗng chỉ hỏi "có probe nào được **ghi nhận** không", mà
  probe có thể được ghi nhận đầy đủ vẫn không chứng minh được gì. `ngoai_pham_vi` là **trạng thái hút**:
  cả bộ probe import sai module sẽ đỏ trên cả hai nhánh với cùng nguyên nhân, bị dán nhãn `ngoai_pham_vi`,
  bị loại khỏi finding — và verdict ra `PASS` trên một lượt chấm không có lấy một phép thử chạy được.
  Đúng loại xanh giả mà cả công cụ này sinh ra để chống.
- **R6.14** — Trước khi bỏ cuộc, lượt chấm PHẢI sinh lại file probe một lần, và lượt sinh lại PHẢI được
  cho biết nguyên nhân thật kèm nhắc rằng import sai module là ca thường gặp nhất.

## Cổng merge

- **R6.6** — Verdict `FAIL`, hoặc còn finding `high`, thì nút merge PHẢI khoá. Không có đường vòng trên
  giao diện.
- **R6.7** — Finding mức `medium` chỉ được bỏ qua khi người dùng **tick xác nhận từng cái**. Máy chủ PHẢI
  đối chiếu tập id đã tick với tập finding medium thật của verdict, không tin danh sách client gửi lên.
- **R6.8** — Trước khi merge PHẢI hỏi lại GitHub trạng thái PR hiện tại. PR không còn mở thì từ chối.
- **R6.9** — PR đã có commit mới (`headSha` khác `headSha` lúc chấm) thì verdict cũ **hết hiệu lực**
  (stale): PHẢI từ chối merge và yêu cầu chấm lại. Đây là luật chống đẩy code mới lên sau khi đã lấy được
  PASS.
- **R6.10** — Chấm lại đúng một commit đã có verdict thì PHẢI cảnh báo trước rằng kết quả gần như chắc
  chắn lặp lại, để người dùng không đốt thời gian và token vô ích.
- **R6.11** — Mọi hành động qua cổng (merge / trả về dev) PHẢI ghi vào sổ cái kèm người thực hiện, thời
  điểm, và các finding medium đã được chấp nhận. **«Người thực hiện» lấy từ đâu do R11.1 quy định** —
  luật này một mình không đủ: nó từng được thoả bằng tài khoản hệ điều hành chạy tiến trình, tức sổ có
  hàng nhưng mọi hàng mang cùng một cái tên.
- **R6.12** — Chế độ demo KHÔNG ĐƯỢC cho thao tác cổng merge và KHÔNG ĐƯỢC cho sửa cấu hình.

## Tự động hoá ở cổng

*Nguyên tắc chi phối cả mục này: **tự động hoá được phép nói KHÔNG, không được phép nói CÓ.** Merge là
cho code vào trunk — rủi ro một chiều, phải người quyết. Trả về dev là KHÔNG cho vào trunk — sai thì chỉ
tốn công mở lại, không hỏng gì. Bất đối xứng đó cho phép tác nhân máy tự trả về mà vẫn giữ nguyên câu
«máy không bao giờ tự merge».*

- **R6.15** — Ba việc tự động ở cổng PHẢI là ba công tắc RIÊNG, không được gộp thành một, vì mức độ gây
  hại của chúng khác hẳn nhau:
  | việc | gây hại nếu sai | mặc định |
  |---|---|---|
  | đăng verdict và finding lên pull request | gần như không — chỉ là một comment | **bật** |
  | gắn trạng thái commit `failure` | chặn nút merge trên GitHub, gỡ được | **bật** |
  | đóng pull request, trả về dev | người viết phải mở lại, mất công thật | **tắt** |
  Gộp làm một nghĩa là ai muốn có comment tự động cũng phải chấp nhận máy đóng pull request của mình.
- **R6.16** — Đăng verdict tự động KHÔNG ĐƯỢC giới hạn ở chế độ trực. Lượt chấm bấm tay cũng sinh ra
  verdict, và người viết code cũng cần đọc finding ở đúng chỗ họ làm việc — trên pull request.
- **R6.17** — Tự động trả về dev CHỈ được chạy khi verdict là `FAIL` **và** có ít nhất một finding mức
  `high`. Nói cách khác: chỉ đóng khi có probe chạy thật và đỏ. Đóng dựa trên suy đoán là thứ làm người
  ta tắt cổng.
- **R6.18** — Hành động cổng do máy thực hiện PHẢI ghi vào sổ với danh tính của **tác nhân máy**, không
  mượn tên người. Sổ kiểm toán phải phân biệt được «người trả về» với «máy trả về» — hai chuyện có mức
  trách nhiệm khác nhau.
- **R6.19** — Tác nhân máy KHÔNG ĐƯỢC merge trong mọi cấu hình. Không có công tắc nào bật được điều đó,
  và đây là điều khoản chứ không phải tuỳ chọn.

## Đối soát: hành động cổng xảy ra NGOÀI cổng

Một cổng không ngăn được người ta merge bằng đường khác — GitHub luôn có nút merge, và người vận hành
đôi khi dùng nó. Đo trên prod 01/09: 66 lượt chấm có pull request mà sổ cổng không có một hàng nào,
trong khi cùng ngày có 8 pull request được merge. Sổ kiểm toán im lặng ở đúng những lần merge THẬT thì
nó không còn trả lời được câu hỏi nó sinh ra để trả lời.

- **R6.20** — Hệ thống PHẢI đối soát trạng thái thật của pull request với sổ cổng. Pull request đã
  merge hoặc đã đóng mà sổ chưa có hành động tương ứng thì PHẢI được ghi vào sổ, đánh dấu là hành động
  **NGOÀI CỔNG**. Không ngăn được thì ít nhất phải BIẾT và GHI LẠI.
- **R6.21** — Hàng ngoài-cổng PHẢI phân biệt được với hàng do người bấm trong CheckMate ở mức **dữ
  liệu** (một trường riêng), không chỉ bằng chữ trong ghi chú: người kiểm toán lọc sổ theo hành động
  phải tách được hai loại mà không phải đọc văn. Mọi phép đếm/lọc hành động cổng PHẢI xét trường này.
- **R6.22** — Hàng ngoài-cổng PHẢI nói rõ **không có xác nhận finding nào**, kèm số finding
  medium/low của verdict lúc đó. Để trống chỗ xác nhận là mời người đọc suy diễn thành «không có
  finding nào để xác nhận» — hai điều đó khác hẳn nhau, và đường qua cổng vốn BẮT tick từng cái
  ([R6.9](#)).
- **R6.23** — Đối soát PHẢI idempotent: chạy lại nhiều lần không đẻ hàng trùng. Sổ chỉ ghi thêm và
  không sửa được ([R9.4](R9-tang-du-lieu.md)), nên một hàng thừa là một hàng sai VĨNH VIỄN. Ba hệ quả
  về ĐƠN VỊ, cả ba do vòng chấm của chính luật này bắt ra:
  - Đơn vị đối soát là **cặp (repo, pull request)**, không phải số PR trơ: hai repo khác nhau trùng số
    hiệu PR là chuyện thường, và hỏi trạng thái một lần rồi áp cho cả hai là kết luận về repo này bằng
    dữ liệu của repo kia. Run không gắn repo thì KHÔNG đối soát được — bỏ ra ngoài diện, không suy từ
    PR cùng số của một repo bất kỳ.
  - «Đã qua cổng» xét theo **HÀNH ĐỘNG**, không phải theo «đã có hàng sổ nào chưa»: một PR từng bị
    trả về dev qua cổng rồi sau đó bị merge thẳng bằng đường khác thì lần MERGE đó vẫn chưa ai ghi.
  - **MỘT hành động = MỘT hàng.** Một PR vá nhiều vòng có nhiều lượt chấm nhưng chỉ có đúng một lần
    merge/đóng; ghi mỗi lượt một hàng là khai «có nhiều hành động», sai sự thật. Hàng gắn vào lượt
    chấm MỚI NHẤT — lượt có verdict còn hiệu lực lúc pull request bị đóng; các lượt cũ hơn đã bị push
    mới làm hết hiệu lực và thật sự KHÔNG có hành động cổng nào trên chúng.
- **R6.24** — Không đọc được trạng thái pull request (thiếu quyền, mạng hỏng, PR bị xoá) thì PHẢI bỏ
  qua và nói ra, TUYỆT ĐỐI không ghi hàng suy đoán. Thà sổ thiếu một hàng còn hơn sổ mang một hàng sai
  không gỡ được. Hệ quả: người của hàng ngoài-cổng lấy từ chính GitHub, hoặc để «không rõ» — KHÔNG
  mượn tên tài khoản nào trong hệ này, vì hàng đó ghi lại việc người khác làm ở nơi khác ([R11.1](R11-danh-tinh-va-phien.md)).
- **R6.25** — Đối soát PHẢI chạy tách khỏi đường chấm: lỗi của nó không được làm dừng chế độ trực hay
  hỏng một lượt chấm đang chạy (cùng nguyên tắc khối `try` riêng của R6.15). Lưới bọc phải theo TỪNG
  pull request và TỪNG lượt ghi, không chỉ bọc lời gọi ra ngoài: một pull request hỏng làm chết lượt
  đối soát của các pull request còn lại thì cuốn sổ vẫn im lặng ở đúng chỗ nó cần nói.
