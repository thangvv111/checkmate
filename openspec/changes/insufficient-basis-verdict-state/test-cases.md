# Test cases — insufficient-basis-verdict-state

Bề mặt đếm bằng máy ở `tasks.md` §0: **3 bề mặt đọc** (màn chấm · lịch sử · API JSON), **1 chỗ so chuỗi
được phép còn lại** (hàm di trú).

## Unit / hàm thuần

### classifyInsufficientBasis

- [x] T1.1 [Scenario «không probe nào nói được điều gì»]: GIVEN `baseKq` có phần tử, không ứng viên nào ở
      trạng thái kết luận được WHEN phân loại THEN `khong_probe_nao_toi_noi`.
- [x] T1.2 [Scenario «nhánh gốc không chạy được probe nào»]: GIVEN `baseKq` là mảng RỖNG THEN
      `goc_khong_doi_chung`.
- [x] T1.3 [Biên]: `baseKq === undefined` cho cùng kết quả với mảng rỗng — hai cách nói của một sự thật.
- [x] T1.4 [Biên ngược]: có ít nhất một ứng viên ở trạng thái kết luận được THEN hàm KHÔNG trả loại nào —
      lượt chấm này đủ cơ sở, không phải việc của hàm.

### retryNoticeNoEvidence — chống cửa song sinh (D3)

- [x] T1.5 Với cùng một `baseKq`, quyết định «có đối chứng hay không» của `retryNoticeNoEvidence` và của
      `classifyInsufficientBasis` LUÔN khớp nhau — quét trên bộ đầu vào phủ cả ba dạng `baseKq`.
      *(Khuôn đã bị bắt chín lần trong repo: hai cửa cùng vai viết bằng hai biểu thức riêng sẽ lệch.)*

### Suy loại cho hàng đời cũ (hàm di trú)

- [x] T1.6 [Đời cũ, loại 1]: sổ sự kiện có câu «Không đủ cơ sở kết luận: …», KHÔNG có dòng cảnh báo nhánh
      gốc THEN suy ra `khong_probe_nao_toi_noi`.
- [x] T1.7 [Đời cũ, loại 2]: sổ có thêm dòng «nhánh gốc KHÔNG chạy được probe» THEN `goc_khong_doi_chung`.
- [x] T1.8 [Ca ĐỐI CHỨNG — không được khớp]: lỗi hạ tầng («hết credit», «clone thất bại», «ETIMEDOUT»)
      THEN KHÔNG suy ra loại nào. Đây là vế giữ cho T1.6/T1.7 có nghĩa.

## Tích hợp (đĩa, SQLite, khoá)

### Vòng ghi–đọc `run.khong_du_co_so`

- [x] T2.1 [Happy]: ghi lượt mang trường mới rồi đọc lại từ SQLite — đủ ba trường, đúng loại.
- [x] T2.2 [Đời cũ]: cơ sở dữ liệu KHÔNG có cột mới → mở lên, `napCotThieu` thêm cột, hàng cũ đọc được,
      không hàng nào mất.
- [x] T2.3 [Hỏng]: cột chứa JSON rách → đọc ra rỗng, không ném, lượt vẫn hiện là lỗi.
- [x] T2.4 [Trường rỗng]: lượt lỗi hạ tầng ghi–đọc lại vẫn KHÔNG có trường mới.

### Di trú lúc khởi động

- [x] T2.5 [Happy]: hàng `loi` đời cũ được ghi trường mới đúng loại.
- [x] T2.6 [Idempotent]: chạy lần hai KHÔNG đổi hàng nào — so toàn bộ bảng trước/sau.
- [x] T2.7 [Không đụng hàng khác]: hàng `xong` và hàng `dang_chay` không bị chạm.
- [x] T2.8 [Không xoá gì]: câu lỗi cũ vẫn còn nguyên trong sổ sự kiện sau khi di trú.

### Sự kiện engine → sổ → RunMeta

- [x] T2.9 Engine phát `{ type: 'khong_du_co_so' }` NGAY TRƯỚC khi ném; đường ném giữ nguyên.
- [x] T2.10 Sự kiện đi qua sổ `events.jsonl` và lên tới `RunMeta` khi tiến trình đóng.

## Ca đối kháng & hồi quy

- [x] T3.1 [Đầu vào KHUYẾT mọi tầng]: `ungVien` null · phần tử null · `trangThai` sai kiểu · `baseKq` null →
      không hàm nào ném; kết quả nghiêng về phía **có loại** (fail-closed: không rõ thì vẫn là lượt thất bại).
- [x] T3.2 [Biên ngưỡng]: đúng MỘT ứng viên ở trạng thái kết luận được → không phải không-đủ-cơ-sở; đúng
      không ứng viên nào → là.
- [x] T3.3 [Ca đã gãy trong lịch sử repo]: chính bệnh sinh ra change này — đổi lời văn thông điệp lỗi thì
      card «KHÔNG RA VERDICT» biến mất mà lưới vẫn xanh. Ca mới: đổi lời văn, card vẫn hiện đúng loại.
- [x] T3.4 [Lọc không nuốt nhau]: một lượt không-đủ-cơ-sở + một lượt lỗi hạ tầng trong cùng danh sách; lọc
      «không đủ cơ sở» ra đúng cái đầu, lọc «lỗi» KHÔNG ra cái đầu.
- [x] T3.5 [Bề mặt đọc không so chuỗi]: quét `apps/web/src/ui*.ts` — không file nào so khớp nội dung thông
      điệp lỗi để nhận kết cục này. *(Hàm quét → cần cặp fixture, tầng 3.)*
- [x] T3.6 [API JSON mang trường mới]: `/api/runs/:id/info` và `/api/lich-su` trả trường mới ra ngoài.

## Trục nhạy cảm

- [x] T_bimat — trường mới chứa loại (mã enum), số probe, và lý do do engine sinh từ id probe + thông
  điệp probe. `ly_do` đi qua `redactMessage(…, humanSurfaceSource(t))`, và **bản đã gột được dùng lại
  cho cả cú ném** — một bản duy nhất cho một sự thật.
  ⚠ Sửa tiền đề: bản đầu của ô này viết «cùng đường gột đã áp cho thông điệp lỗi hiện tại». Đo lại thì
  **câu ném cũ chưa hề qua gột** — nên change này là một cải thiện, không phải giữ nguyên hiện trạng.
- [x] T_failclosed — lượt mang trường mới **vẫn là lỗi**, MUST NOT thành PASS; và ca đầu-vào-khuyết (T3.1)
  nghiêng về phía «vẫn là lượt thất bại» chứ không phải phía «đủ cơ sở».
- [x] T_cong — lượt không đủ cơ sở KHÔNG ghi sổ cái và KHÔNG đổi trạng thái cổng; trường mới không mở
  đường nào cho máy bấm cổng.
- [N/A] T_khongtincay — change không đưa nội dung mới từ diff hay từ trả lời model vào prompt; nó chỉ phân
  loại kết quả chạy probe của chính engine.
- [x] T_hopdong — export mới (`classifyInsufficientBasis`, kiểu dùng chung) khai đủ ở `checkmate.yml`;
  `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay — CHẠY THẬT (tầng 2; KHÔNG tick trước khi chạy)

- [N/A] T5.1 **KHÔNG CÓ MẪU ĐỂ MỞ.** Di trú đã chạy thật trên sổ dev (38 lượt, 9 hàng lỗi): kết quả
      `so_dong: 0, bo_qua: 0` — không hàng nào là không-đủ-cơ-sở. Cả 9 hàng lỗi đều là lỗi hạ tầng
      («Model call quá 240s», «Anthropic API 401»), và **không hàng nào bị gán nhãn oan** — đó chính là
      vế đối chứng T1.8 chạy trên dữ liệu thật. Ca này để N/A chứ không tick, vì thứ nó đòi (mở một hàng
      đã di trú) chưa tồn tại trên máy này.
- [x] T5.2 Đã dựng màn Lịch sử với bốn lượt cạnh nhau (PASS · FAIL · không đủ cơ sở · lỗi hạ tầng) và
      nhìn thật ở 1400px: «Không đủ cơ sở» là **pill nền đặc neutral-800 chữ sáng**, còn lỗi hạ tầng là
      **chữ đỏ trơn**. Hai thứ khác nhau về cả hình lẫn màu, không chỉ khác chữ.
