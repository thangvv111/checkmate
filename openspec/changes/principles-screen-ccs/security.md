# Security — principles-screen-ccs

Trang này **chỉ bày chữ tĩnh viết sẵn trong mã nguồn**. Không đọc dữ liệu, không nhận đầu vào, không gọi
mạng, không chạy gì. Phần lớn danh sách chuẩn là N/A, và nói thẳng N/A kèm lý do trung thực hơn là bịa ra
rủi ro để lấp đầy mục.

Nhưng có **một trục thật**, và nó không phải trục kỹ thuật.

## S0. Trục thật: đây là trang mà sản phẩm TỰ KHAI về mình

CheckMate tồn tại để đòi bằng chứng. Trang này là chỗ nó tuyên bố các nguyên tắc của mình — tức chỗ dễ
nhất để nói một điều không còn đúng.

Rủi ro không phải kẻ tấn công. Rủi ro là **thời gian**: một nguyên tắc trỏ tới màn X, rồi màn X bị đổi
hoặc bị gỡ, và trang vẫn tuyên bố như cũ. Không ai nói dối; chỉ là không ai cập nhật. Kết quả vẫn là một
trang tuyên ngôn nói sai về chính sản phẩm — và trong một sản phẩm maker–checker, đó là loại sai đắt nhất,
vì nó bào mòn đúng thứ duy nhất sản phẩm bán: **sự đáng tin**.

Change này đóng trục ấy bằng lưới liên kết. Không có lưới thì «giữ liên kết này khi sửa màn khác» chỉ là
một lời dặn — và repo này đã đo được lời dặn sống được bao lâu: một luật không lưới bị vi phạm **16 phút**
sau khi chốt, bởi chính agent vừa đọc nó.

## S1. Bí mật & rò rỉ

- N/A S1.1 — Không giá trị nào của trang là bí mật. Chín nguyên tắc là hằng trong mã nguồn, hiện nguyên
  văn cho mọi người xem trang.
- N/A S1.2 — Không bề mặt công khai nào mới.
- N/A S1.3 — Không giá trị nào bị che.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — Route `/docs` đã có và đã nằm sau cửa phiên; change không thêm route, không đọc danh tính.
- ✅ S2.2 — Trang không trả tài khoản, hash hay muối. Nội dung giống hệt nhau cho mọi người dùng — nó
  **không** phụ thuộc ai đang xem, nên không có đường rò danh tính qua nội dung.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Trang không có nút nào, không gọi API nào, không chạm `gate.ts` hay `cong.ts`.
- ✅ S3.2 — Vai `tu_dong` không có quyền mới. Trang là đích ĐỌC, không phải nguồn hành động.

## S4. Dữ liệu không tin cậy & prompt injection

- N/A S4.1 — Không dữ liệu ngoài nào vào trang này. Chín nguyên tắc do người viết, nằm trong mã nguồn, đi
  qua review như mọi thay đổi mã nguồn khác.
- N/A S4.2 — Không gọi model.

## S5. Sandbox & thực thi

- N/A S5.1 / S5.2 — Không chạy code, không dựng worktree.

## S6. Tầng dữ liệu & quyền file

- N/A S6.1 / S6.2 — Không file mới trên đĩa, không cột SQLite, không cấu hình. Module `principles.ts` là
  mã nguồn, không phải dữ liệu.

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — Không nhánh lỗi mới. Trang không sinh verdict và không đọc verdict nào.
- ✅ S7.2 — Không đụng đường đếm hồi quy.
- ✅ S7.3 — **Chiều nghiêng của lưới liên kết.** `scanDeadLinks` phải nghiêng về phía BÁO — không nhận diện
  được một route thì coi là chết và ĐỎ, chứ không im lặng cho qua. Đỏ oan thì có người nhìn và sửa lưới;
  xanh oan thì liên kết chết nằm đó mãi. Đây là chỗ duy nhất của change có chiều nghiêng, và nó nghiêng
  đúng phía.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 — **Liệt kê mọi đường tới mục tiêu «trang tuyên ngôn nói sai»:** (1) đường «thấy ở:» trỏ route
  chết · (2) thiếu hoặc thừa nguyên tắc so với chín điều đã chốt · (3) số đứt quãng làm mất một điều mà
  vẫn đủ số lượng · (4) câu tuyên bố bị sửa dần. Change đóng cả bốn: T2.1/T2.2 · T1.1 · T1.1 · T3.1.
  Vá (1) mà bỏ (4) thì mọi liên kết sống trong khi câu mở đầu đã thành câu khác.
- ✅ S8.2 — **Load-bearing hai chiều.** Sáu chiều mutation ở `tasks.md` §5. Đáng chú ý 5.6: **lưới đọc
  danh sách route khai tay thay vì đọc `server.ts`** — nó tái tạo đúng cái bẫy «bản sao thứ hai của sự
  thật», và nếu chiều ấy không ĐỎ thì lưới đang canh một danh sách chứ không canh sản phẩm.
- ✅ S8.3 — **Đối xứng.** Cặp fixture của `scanDeadLinks` có cả hai vế: đường chết ĐỎ (T2.2) và chín đường
  hiện tại XANH (T2.1). Thiếu vế thứ hai thì một phép quét quá rộng — ví dụ coi MỌI đường là chết — vẫn
  xanh ở ca đối kháng rồi đỏ oan trên toàn bộ trang.

## Notes

**Rủi ro không nằm ở mục nào ở trên: lưới này canh liên kết, KHÔNG canh nội dung.** Một nguyên tắc có thể
trỏ tới một route sống mà vẫn mô tả sai điều đang xảy ra ở đó — ví dụ nguyên tắc 06 nói «PASS có cảnh báo
phải có người đứng tên» trong khi cổng đã đổi cách ghi tên. Không cơ chế nào bắt được loại lệch ấy; nó
đúng là **loại lỗi thứ tư** mà `test-grid-integrity` khai là không bắt được bằng máy — lưới đúng nhưng
luật sai — và chỉ lộ ra khi có người ĐỌC.

Khai ra không phải rào đón. Một trang tuyên ngôn có lưới canh liên kết dễ làm người ta tin rằng nội dung
cũng đã được canh, và chính niềm tin ấy là chỗ loại lỗi thứ tư sống.
