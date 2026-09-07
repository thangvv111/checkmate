## 0. Đo trước khi viết

- [x] 0.1 Đo trên repo đích thật (`admin-fe`): runtime khai ở đâu · vì sao `npm ci` hỏng · số gói · số gói
      có script cài. Kết quả ở `design.md` § Đo trước khi thiết kế.
- [x] 0.2 **Chạy nguyên mẫu THẬT** trên prod trước khi viết một dòng code nào — cả đường sai (mount clone)
      lẫn đường đúng (thư mục tạm). Ghi cả hai vào `design.md`.
- [x] 0.3 Lấy digest ảnh Node 24 và **kiểm phiên bản thật trong ảnh** (v24.20.0), không tin tên thẻ.
- [x] 0.4 Đếm bằng máy: 6 chỗ chọn ảnh · 2 mount · 5 chỗ gọi runtime container.
- [ ] 0.5 ⛔ **Chốt hai Open Question của `proposal.md` với PO** trước khi viết code: `--ignore-scripts` có
      công tắc không · máy có được tự cài không. Cả hai đổi hình dạng API, không phải chi tiết hiện thực.

## 1. Luật (capability)

- [ ] 1.1 `dependency-provisioning` — 4 requirement ADDED, mỗi cái có ca khoá ở §5.
- [ ] 1.2 `sandbox-isolation › Ngoại lệ mạng CHỈ cho bước cài phụ thuộc` — ADDED. **Không sửa** «Không
      đường ghi nào ra ngoài thư mục của lượt chạy».
- [ ] 1.3 `sandbox-isolation › Ảnh chạy chọn theo phiên bản runtime repo đích, từ một BẢN ĐỒ ghim digest`
      — ADDED. Không sửa «Ảnh chạy do repo đích khai, và đọc từ NHÁNH GỐC».
- [ ] 1.4 Chỗ sống của luật: bản đồ ảnh + danh sách file chép + cờ container **trong engine, có test khoá**
      · hồ sơ ở hai capability trên. KHÔNG viết vào `docs/archive/`.

## 2. Kiểu & hợp đồng

- [ ] 2.1 `IMAGE_BY_NODE_MAJOR` — bản đồ đóng, ghim digest, có chú thích nguồn và ngày đo cho từng hàng.
- [ ] 2.2 `INSTALL_COPY_FILES` — danh sách đóng các file chép sang thư mục tạm.
- [ ] 2.3 Kiểu kết quả một lần cài: ảnh đã dùng · lệnh đã chạy · thời gian · mã thoát · **kết quả kiểm lại**.
- [ ] 2.4 Khai mọi export mới vào **bảng module của `checkmate.yml`** repo này (⛔C5).

## 3. Engine (packages/harness)

- [ ] 3.1 `resolveRuntimeImage(repo, runner)` — thứ tự `runner.image` → `.nvmrc` → `engines.node`; không có
      hàng ⇒ trả lý do từ chối, **không** rơi về mặc định. Số từ repo đích chỉ làm khoá tra (⛔C4).
- [ ] 3.2 `buildInstallContainerArgs(...)` — hàm THUẦN, tách khỏi `buildContainerArgs`. Đây là **chỗ duy
      nhất** bật mạng trong toàn sản phẩm.
- [ ] 3.3 `installDependencies(repo)` — dựng thư mục tạm · chép danh sách đóng · chạy · trả quyền · chuyển
      `node_modules` vào clone · dọn. Hỏng ở bất kỳ bước nào ⇒ clone **nguyên trạng**.
- [ ] 3.4 Cài xong gọi **lại `checkDependencies`** của nhịp một; còn báo thiếu ⇒ ghi **thất bại** dù mã
      thoát là 0.
- [ ] 3.5 Nối bản đồ ảnh vào **cả sáu** chỗ chọn ảnh đã đếm ở 0.4 — vá một chỗ là dựng lại cửa song sinh.
- [ ] 3.6 Ảnh của `nodeVersionOfImage` trong cửa kiểm cũng lấy từ bản đồ, để cảnh báo runtime nói về **ảnh
      sẽ chạy thật**, không về ảnh mặc định.

## 4. Web (apps/web)

- [ ] 4.1 Route cài phụ thuộc cho một repo đích — vai người vận hành, không phải `tu_dong`.
- [ ] 4.2 Màn cấu hình repo: trạng thái môi trường + nút cài + log kết quả.
- [ ] 4.3 Thông điệp chặn của lượt chấm chỉ tới chỗ bấm; **MUST NOT** tự cài.

## 5. Test

- [ ] 5.1 Ca khoá cho từng requirement (4 + 2 = 6 requirement).
- [ ] 5.2 **Cặp fixture** cho lưới quét mã nguồn: (a) fixture bật mạng ở đối số container chạy probe ⇒ ĐỎ ·
      (b) đúng một chỗ bật mạng và chỗ ấy là đường cài ⇒ XANH · (c) mỏ neo biến mất ⇒ ĐỎ.
- [ ] 5.3 Lưới **bản đồ ảnh**: mọi hàng phải là digest (`@sha256:`), không hàng nào là thẻ. Cặp fixture.
- [ ] 5.4 Lưới **danh sách file chép**: đóng, và không mục nào là `.git` hay glob. Cặp fixture.
- [ ] 5.5 Ca ⛔C4: `.nvmrc` chứa `24; rm -rf /` · `engines.node` chứa tên ảnh khác ⇒ không chuỗi nào lọt
      vào tên ảnh; phiên bản không đọc được ⇒ coi như không khai.
- [ ] 5.6 Ca «trình cài nói xong mà phép kiểm vẫn báo thiếu» ⇒ **thất bại**.
- [ ] 5.7 **Mutation hai chiều, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả.
      Tối thiểu: gỡ `--ignore-scripts` · bật mạng ở container probe · cho phép rơi về ảnh mặc định · mount
      clone thay vì thư mục tạm · bỏ bước kiểm lại · bỏ bước trả quyền sở hữu.

## 6. Chạy thật — KHÔNG tick trước khi chạy

- [ ] 6.1 Cài `admin-fe` **qua sản phẩm** (không qua shell tay): thành công, log nêu ảnh Node 24.
- [ ] 6.2 Sau đó chạy lượt chấm **code** trên `admin-fe` PR #8: đi qua cửa kiểm **không cảnh báo runtime**
      (vì probe cũng chạy ảnh Node 24), tới được bước sinh probe. run_id: ____
- [ ] 6.3 Lượt chấm `checkmate` không đổi hành vi — vẫn ảnh Node 22, không cảnh báo. run_id: ____
- [ ] 6.4 Sau khi cài: `git fsck` của bản clone sạch, **0 mục lệch chủ sở hữu**, `.git` không bị chạm.
- [ ] 6.5 Ca hỏng: repo khai phiên bản không có hàng ⇒ từ chối kèm thông điệp, clone nguyên trạng.

## 7. Trước merge

- [ ] 7.1 `npx tsc --noEmit && npm test` — toàn bộ.
- [ ] 7.2 Deploy theo `DEPLOY.md`, đối chiếu số liệu.

## 8. Sau-merge — nợ có tên

- [ ] 8.1 **Cài lại khi lock file đổi** — ghi hash lock lúc cài, đối chiếu lúc kiểm. Hôm nay `node_modules`
      cũ không ai phát hiện được.
- [ ] 8.2 **Đường xoá `node_modules`** của một repo đích (đĩa: 220 MB mỗi repo, tăng tuyến tính).
- [ ] 8.3 Repo **không phải Node** (Python, Java) — cả cửa kiểm lẫn bước cài đều không nói gì. Mở rộng khi
      có repo thật, không mở theo tưởng tượng.
- [ ] 8.4 Điều kiện (a) của `finding-cap-and-density-standard` tasks 7.2 (đọc `stop_reason`) — vẫn mở, kế
      thừa từ nhịp một tasks 8.2.
