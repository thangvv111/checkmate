## 0. Đo trước khi sửa

- [x] 0.1 Tái hiện trên prod: lượt `PR #79` thuộc `thangvv111/checkmate`, `repo_dang_chon` là
      `thangvv111/admin-fe`; engine gọi `/repos/thangvv111/admin-fe/issues/79/comments` ⇒ 404 và
      `/statuses/<sha>` ⇒ 422 «No commit found for SHA». Hai mã lỗi, một nguyên nhân.
- [x] 0.2 **Loại giả thuyết token** bằng một lần ghi thật với chính token ấy: comment **201**, status
      **201**, xoá comment thử **204**. Chẩn đoán ban đầu («thiếu quyền ghi», suy từ mã 404) là **SAI** —
      ghi lại để không ai đi lại đường ấy.
- [x] 0.3 Đếm bốn đường hậu-lượt cùng hình dạng lỗi: `rm.onXong` · `theoDoiHead` · cổng merge · cổng trả
      về dev. Đường **khởi** lượt (webhook, `server.ts:889`) vốn đã đúng.

## 1. Luật (capability)

- [x] 1.1 `repo-history › Hành động GitHub của một lượt chấm phải theo repo của LƯỢT, không theo repo đang
      chọn` — ADDED, 6 scenario. Test khoá ở §5.
- [x] 1.2 Chỗ sống của luật: `configForRepo` trong `config.ts` **có test khoá** + lưới quét source; hồ sơ ở
      capability trên.

## 2. Kiểu & hợp đồng

- [x] 2.1 Không thêm kiểu mới — `CauHinhCoRepo` và `RunMeta.repo` đã có.
- [x] 2.2 Khai `configForRepo` vào bảng module của `checkmate.yml` (⛔C5).

## 3. Engine / Web

- [x] 3.1 `config.ts`: `configForRepo(c, github)` — tra qua `findRepo` (không phân biệt hoa thường), trả
      `null` khi thiếu tên hoặc repo không còn trong danh sách. Chú thích nêu số đo 07/09.
- [x] 3.2 `server.ts` — `rm.onXong`: dựng cấu hình từ `meta.repo`; `null` ⇒ **không hành động** + log nêu
      lý do (thiếu repo, hay repo đã bị gỡ).
- [x] 3.3 `server.ts` — `theoDoiHead`: dựng từ `rm.lay(id)?.meta.repo`; `null` ⇒ dừng theo dõi.
- [x] 3.4 `server.ts` — cổng **merge**: dựng từ `st?.meta.repo`; `null` ⇒ 409 với thông điệp nêu đúng repo
      thiếu. Đây là đường nặng nhất: trước bản vá, `mergePr` có thể merge pull request cùng số ở repo đang
      chọn (⛔C1).
- [x] 3.5 `server.ts` — cổng **trả về dev**: cùng khuôn.

## 4. Bề mặt người

- [x] 4.1 Thông điệp 409 của hai cổng nêu **tên repo** thiếu, không nói chung chung «chưa kết nối repo».
- [x] 4.2 Đường tự động **nói ra** khi bỏ qua — im lặng ở đây nguy hiểm: người vận hành tưởng verdict đã
      lên pull request, còn đội repo đích không thấy gì.

## 5. Test

- [x] 5.1 `test/repo-history.test.ts` — ca hàm thuần: dựng đúng repo được nêu tên · không phân biệt hoa
      thường · năm đầu vào thiếu/hỏng đều ra `null` · đường tự động có log khi bỏ qua.
- [x] 5.2 Lưới tầng 3 `scanSelectedRepoActions` với **cặp fixture** ĐỎ/XANH, quét theo mỏ neo từng đường;
      ĐỎ cả khi **không tìm thấy mỏ neo** (chống xanh oan). Mã nguồn hiện tại: cả bốn đường sạch.
- [x] 5.3 Mutation hai chiều, chạy **HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả — số
      ca đỏ giống hệt hai vòng, đối chứng sau khôi phục 18/18 xanh:
      M1 `onXong` quay về repo đang chọn ⇒ **1 đỏ** · M2 cổng merge quay về repo đang chọn ⇒ **1 đỏ** ·
      M3 `configForRepo` rơi-về thay vì `null` ⇒ **1 đỏ** · M4 bỏ log khi thiếu repo ⇒ **1 đỏ**.
      ⚠ M2 lần đầu SKIP vì chuỗi neo nhiều dòng không khớp — script bắt đúng thay vì cho ra «không ca nào
      đỏ»; đã áp lại bằng chuỗi neo ngắn.
- [x] 5.4 `npx tsc --noEmit` sạch + `npm test` xanh **toàn bộ**: 75 file / **1297** ca (07/09 19:00).

## 6. Hồ sơ

- [x] 6.1 Chú thích tại `configForRepo` nêu số đo prod và vì sao trả `null` chứ không rơi-về — người sau
      đọc code là thấy, không phải tra hồ sơ.

## § Chạy thật — KHÔNG tick trước khi chạy

- [ ] 7.1 Deploy rồi để một lượt chấm kết thúc trong lúc `repo_dang_chon` **khác** repo của lượt: verdict
      phải lên đúng pull request của repo lượt ấy, và log không còn 404/422. run_id: ____
- [ ] 7.2 Cùng lượt: trạng thái commit gắn được (không còn «No commit found for SHA»). run_id: ____

## § Sau-merge — nợ có tên

- [ ] 8.1 Rà các đường **khác** cũng nhận `cfg` rồi gọi GitHub cho một đối tượng cụ thể (ví dụ đường quét
      hàng đợi pull request, đường đối soát cổng) — bản vá này đóng bốn đường hậu-lượt đã đo được; chưa rà
      hết mọi đường trong `server.ts`.
