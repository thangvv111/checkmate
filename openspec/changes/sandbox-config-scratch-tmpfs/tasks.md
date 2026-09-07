## 0. Đo trước khi viết

- [x] 0.1 Tái hiện sự cố trên prod bằng podman dựng tay, cùng ảnh + cùng ba trần + cùng bộ mount như engine:
      A (như hiện nay) ⇒ `ENOENT: mkdir '/work/node_modules/.vite-temp'`; B (thêm `--tmpfs` lên đúng đường ấy)
      ⇒ `JUNIT report written to /work/out-b.xml`. Ghi vào `design.md` § Context.
- [x] 0.2 Xác định bối cảnh hồi quy: lượt code cuối thành công là PR #7 (26/08), trước khi
      `container-isolated-probe-runs` archive (05/09). Ghi vào `proposal.md` § Why.
- [x] 0.3 Dọn thư mục thử bằng `podman unshare rm -rf` — `U` đổi chủ sở hữu sang subuid nên `rm` thường không
      xoá được (cùng khuôn `sandbox.ts` đã dùng ở đường dọn).

## 1. Luật (capability)

- [x] 1.1 `sandbox-isolation › Không đường ghi nào ra ngoài thư mục của lượt chạy` — **MODIFIED**: chép nguyên
      khối cũ + 4 scenario cũ, thêm vế danh sách đóng và 4 scenario mới. Test khoá ở §5.
- [x] 1.2 Chỗ sống của luật: hằng `DEPENDENCY_SCRATCH_PATHS` trong engine **có test khoá**; hồ sơ ở capability
      trên. Không có khoá `checkmate.yml` nào cho vế này — cố ý (D2).

## 2. Kiểu & hợp đồng

- [x] 2.1 Không thêm kiểu dùng chung — change không đổi hình dạng dữ liệu nào.
- [x] 2.2 Khai `DEPENDENCY_SCRATCH_PATHS` vào **bảng module của `checkmate.yml`** (⛔C5).

## 3. Engine (packages/harness)

- [x] 3.1 `sandbox.ts`: hằng `DEPENDENCY_SCRATCH_PATHS` — danh sách đóng, mỗi mục `{ path, ly_do }`, kèm chú
      thích nêu số đo 07/09 và vì sao không cho repo đích khai.
- [x] 3.2 `buildContainerArgs`: khi **và chỉ khi** `spec.thuMucPhuThuoc` có mặt, đẩy `--tmpfs <path>` cho từng
      mục. Không đổi bind nào, không đổi cờ nào khác.

## 4. Bề mặt người (web + CLI)

- [x] 4.1 `DEPLOY.md` — mục mới «⛔ «Runner không xuất JUnit XML» — MỘT thông điệp, HAI bệnh»: bảng phân
      biệt hai nguyên nhân theo dòng lỗi con, lệnh kiểm nhanh, và cảnh báo **thêm repo đích mới thì phải
      `npm install` trong bản clone** — cùng loại việc với `enable-linger`, chỉ lộ ra ở lượt chấm CODE đầu
      tiên vì lượt tài liệu không đụng sandbox.
- [x] 4.2 Không bề mặt web nào đổi — change không chạm verdict, không chạm giao diện.

## 5. Test

- [x] 5.1 `test/sandbox-isolation.test.ts` — bốn ca mới: T1.10 phủ đúng danh sách đóng, không hơn · T1.11 không
      có phụ thuộc thì không phủ gì · T1.12 mọi đường nằm trong `/work/node_modules/` và chính nó vẫn `:ro` ·
      T1.13 là tmpfs chứ không phải bind (số bind vẫn 2).
- [x] 5.2 Mutation hai chiều, chạy **HAI lần**, kiểm chứng đột biến đã vào đĩa (`grep -c`) trước khi đọc
      kết quả. Kết quả — số ca đỏ **giống hệt hai vòng**, đối chứng sau khôi phục 33/33 xanh:
      M1 bỏ vòng `--tmpfs` ⇒ **1 đỏ** (T1.10) · M2 `--tmpfs` → bind `:rw` ⇒ **6 đỏ** (T1.13 + ca cũ) ·
      M3 mục trỏ ra ngoài `node_modules` ⇒ **1 đỏ** (T1.12) · M4 bỏ `if (spec.thuMucPhuThuoc)` ⇒ **2 đỏ**
      (T1.11) · M5 xoá `ly_do` một mục ⇒ **1 đỏ** (T1.10).
      ⚠ M4 lần đầu báo SKIP vì heredoc bash làm hỏng chuỗi neo — script **bắt đúng** thay vì cho ra «không
      ca nào đỏ» rồi trông như ca không load-bearing; đã áp lại bằng chuỗi neo ngắn không có ký tự khó.
- [x] 5.3 `npx tsc --noEmit` sạch + `npm test` xanh **toàn bộ**: 75 file / 1290 ca (07/09 17:22).

## 6. Hồ sơ

- [x] 6.1 Ghi vào `DEPLOY.md` triệu chứng ↔ nguyên nhân của hai lỗi sandbox đã gặp
      (`EAI_AGAIN` = thiếu `node_modules`; `ENOENT mkdir .vite-temp` = thiếu lớp phủ tạm), để lần sau không
      phải chẩn đoán lại từ đầu.

## § Chạy thật — KHÔNG tick trước khi chạy

- [x] 7.1 PR #79 trên prod (07/09, sau deploy): lượt chấm **đi qua sandbox và ra verdict** —
      `result=PASS`, `co_lap={muc:'container', runtime:'podman version 3.4.4'}`, `ke_hoach=9 ghi_nhan=9`,
      `pass=2 · ngoai_pham_vi=3`, 2 lời gọi model. Ba probe của lượt neo thẳng vào `inBand` (`✗→✓` — cải
      thiện: đỏ ở nhánh gốc vì hàm chưa tồn tại, xanh ở nhánh PR). Trước change: chết ở «Runner không xuất
      JUnit XML». run_id: `wmtr4j87au091`
      ⚠ Lượt ĐẦU của PR #79 lỗi `spawnSync git ETIMEDOUT` — không do change này: server đang clone repo
      `admin-fe` mới thêm, cú clone chèn ngang `git fetch` của webhook. Chấm lại sau khi clone xong thì qua.
- [x] 7.2 `node_modules` của bản clone **còn nguyên từng byte** sau lượt chạy: 6471 file / 252 349 456 byte
      trước, **y hệt** sau. Đây là vế mà lưới đối số không chứng minh được — nó khoá «dựng đối số đúng», còn
      con số này khoá «podman thật sự không cho lớp phủ rò xuống bind `:ro`».

## § Sau-merge — nợ có tên

- [ ] 8.1 Nợ #29: `detectIsolation` chạy `podman --version`, tức trả lời «podman có cài không» chứ không phải
      «podman chạy nổi một container ở đây không». Hai câu ấy khác nhau đúng ở ca sự cố linger 06/09. Không
      thuộc change này.
