## Unit / hàm thuần

### configForRepo — `test/repo-history.test.ts`
- [x] T1.1 [Scenario: đăng verdict khi repo đang chọn khác repo của lượt]: danh sách `[a/one, b/two]`,
      đang chọn `b/two`, hỏi `a/one` ⇒ `repo.github = 'a/one'` và `repo_dang_chon = 'a/one'`; danh sách giữ
      nguyên hai phần tử — đây là khung nhìn mới, không phải cấu hình mới
- [x] T1.2 [Không phân biệt hoa thường]: `A/One` ⇒ `a/one`. GitHub coi hai dạng là một, phép tra cũng vậy
- [x] T1.3 [⛔ Scenario: lượt không có repo · Scenario: repo đã bị gỡ]: `undefined` · `null` · `''` ·
      `'   '` · `'da/bi-go'` đều ra **`null`** — MUST NOT rơi về repo đang chọn. Mutation M3 (rơi-về thay
      vì `null`) ⇒ 1 đỏ

### Lưới tầng 3 `scanSelectedRepoActions` — cặp fixture
- [x] T1.4 **ĐỎ**: fixture `rm.onXong` dựng `const cfg = readConfig();` ⇒ báo vi phạm ở đường «chế độ trực»
      (và báo thiếu ba mỏ neo còn lại — đúng, vì fixture chỉ có một đường)
- [x] T1.5 **XANH**: fixture đủ bốn đường, mỗi đường dựng qua `configForRepo` ⇒ rỗng
- [x] T1.6 [Scenario: một cửa duy nhất cưỡng chế]: mã nguồn hiện tại — cả **bốn** đường sạch
- [x] T1.7 [Chống xanh oan]: lưới ĐỎ khi **không tìm thấy mỏ neo** — đổi tên đường thì lưới kêu, không im
- [x] T1.8 [Scenario: lượt không có repo thì không hành động]: khối `rm.onXong` phải có lời gọi ghi log và
      chứa chữ «không còn trong danh sách» — im lặng ở đây làm người vận hành tưởng verdict đã lên PR

## Tích hợp

- [N/A] Không có đường đĩa, SQLite hay khoá nào mới. Vế hệ thống (verdict lên đúng pull request) kiểm ở mục
  «chạy thật» — nó đòi hai repo thật và một lượt chấm thật, thứ không dựng được trong vitest.

## Ca đối kháng & hồi quy

- [x] T3.1 **Mutation hai chiều**, chạy HAI lần, kiểm chứng đã vào đĩa trước khi đọc kết quả; số ca đỏ
      giống hệt hai vòng, đối chứng sau khôi phục 18/18 xanh:
      M1 `onXong` quay về repo đang chọn ⇒ **1 đỏ** · M2 cổng **merge** quay về repo đang chọn ⇒ **1 đỏ** ·
      M3 `configForRepo` rơi-về thay vì `null` ⇒ **1 đỏ** · M4 bỏ log khi thiếu repo ⇒ **1 đỏ**
- [x] T3.2 **Ca đã gãy trên prod 07/09**: lượt của `thangvv111/checkmate` bị đăng lên `thangvv111/admin-fe`
      ⇒ 404 (PR số ấy không có ở repo kia) và 422 «No commit found for SHA» (sha thuộc repo kia). Lưới T1.6
      là chỗ chặn tái phát ở bốn đường đã biết
- [x] T3.3 **Ca chẩn đoán sai đã mắc**: kết luận «token thiếu quyền ghi» suy từ mã 404, không kiểm bằng một
      lần ghi thật. Bác bằng: comment **201** · status **201** · xoá **204** với chính token ấy. Ghi vào
      `tasks.md` 0.2 để không ai đi lại đường ấy

## Trục nhạy cảm

- [N/A] T_bimat — change không chạm bí mật; `configForRepo` chỉ chọn phần tử trong danh sách đã có.
- [x] T_failclosed ⛔C2 — thiếu repo hoặc repo đã gỡ ⇒ **không hành động**, không đoán (T1.3); hai cổng trả
      409 có chữ nêu tên repo; đường tự động ghi log (T1.8)
- [x] T_cong ⛔C1 — **trục nặng nhất**: trước bản vá, cổng merge dùng repo đang chọn nên `mergePr` có thể
      merge pull request cùng số ở repo khác. Sau bản vá nó theo `st?.meta.repo`; mutation M2 khoá vế này.
      Change **siết**, không nới: không thêm đường nào cho máy tự merge
- [x] T_khongtincay — không thêm bề mặt nhận dữ liệu ngoài; tên repo tra trong **danh sách đã khai**, chuỗi
      lạ ra `null` chứ không dựng repo không có thật
- [x] T_hopdong — `configForRepo` khai trong bảng module của `checkmate.yml`; lưới hợp đồng xanh

## Chạy thật — KHÔNG tick trước khi chạy

- [ ] T7.1 Sau deploy, để một lượt kết thúc trong lúc `repo_dang_chon` **khác** repo của lượt: verdict lên
      đúng pull request của repo lượt ấy; log không còn 404. run_id: ____
- [ ] T7.2 Cùng lượt: trạng thái commit gắn được, không còn 422 «No commit found for SHA». run_id: ____
- [ ] T7.3 Sau khi T7.1 xong: **hai ô kiểm tay** của change `finding-cap-and-density-standard` mới nhìn
      được, vì tới lúc đó mới có comment thật trên pull request để đọc

## Kiểm tay

- [ ] T8.1 Đọc thông điệp 409 của hai cổng: người vận hành có hiểu ngay «lượt này thuộc repo nào, và vì sao
      không bấm được» không?
