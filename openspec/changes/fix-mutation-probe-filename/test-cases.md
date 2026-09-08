## Unit — `test/probe-handover.test.ts`

- [x] T7.1 **ĐỎ**: fixture tự đặt tên `dot_bien_…`, bỏ qua `runner.probe_file`
- [x] T7.2 **XANH**: fixture dùng `fileProbeMoi`
- [x] T7.3 **ĐỎ khi mỏ neo biến mất** — không thấy cửa đột biến ⇒ đỏ; thấy cửa mà không thấy chỗ ghi
      probe ⇒ đỏ. Chống xanh oan
- [x] T7.4 **Đếm bằng máy**: mã nguồn hiện tại có đúng **2** chỗ `.ghiProbe(`, và **cả hai** dùng
      `fileProbeMoi`. Số chỗ ghi đổi ⇒ lưới đỏ ⇒ người sửa phải đọc lại, thay vì lưới im lặng bỏ sót chỗ mới

## Ca đối kháng

- [x] T8.1 **Mutation, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả và kiểm chứng
      khôi phục sau mỗi vòng: khôi phục tên `dot_bien_<id><ext>` ⇒ **1 ca đỏ**, **khớp** cả hai vòng.

## Trục nhạy cảm

- [x] T_failclosed ⛔C2 — **trục chính, và nó SIẾT.** Trước bản vá, một cửa kiểm im lặng không chạy vẫn cho
      ra kết luận «probe không cắn» — tức *không chứng minh được là sai* bị đọc thành *đã chứng minh là
      đúng*, đúng thứ ⛔C2 cấm. Sau bản vá cửa chạy được, nên câu trả lời «không đỏ» mới có nghĩa.
- [x] T_hopdong — không thêm export; `fileProbeMoi` là biến cục bộ đã có.
- [N/A] T_bimat · T_cong · T_khongtincay · T_colap — không chạm bí mật, cổng, bề mặt dữ liệu ngoài, hay
  mức cô lập. Bản đột biến vẫn ghi vào sandbox riêng, vẫn chạy trong cùng container như trước.

## Chạy thật — KHÔNG tick trước khi chạy

- [ ] T9.1 Sau khi máy chủ chạy được hệ Java: chấm một repo Java thật và xác nhận cửa đột biến **có** chạy
      (probe hạng 2 nhận được câu trả lời đỏ/không-đỏ có căn cứ, không phải `probes.length === 0`).
- [x] T9.2 ✅ **Hồi quy hệ Node**: toàn bộ bộ lưới xanh sau bản vá — 77 file, 1389 ca. Đường Node dùng
      `probe_ext` mặc định nên tên file không đổi hành vi gì, và đó là lý do lỗi này **ẩn được cho tới khi
      có repo đích thứ tư**.
