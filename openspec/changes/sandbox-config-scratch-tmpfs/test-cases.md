## Unit / hàm thuần

### buildContainerArgs — `test/sandbox-isolation.test.ts`
- [x] T1.10 [Scenario: bộ chạy test ghi được đường tạm đã khai]: có thư mục phụ thuộc ⇒ danh sách `--tmpfs`
      bằng ĐÚNG `['/tmp', ...DEPENDENCY_SCRATCH_PATHS]`, không hơn; và mọi mục có `ly_do` không rỗng
- [x] T1.11 [Scenario: không có thư mục phụ thuộc thì không phủ gì]: `thuMucPhuThuoc: undefined` ⇒ chỉ còn
      `['/tmp']` — không có gì để phủ, mount thừa là bề mặt thừa
- [x] T1.12 [Scenario: ghi vào phụ thuộc thật vẫn thất bại — mức đối số]: mọi `path` trong danh sách bắt đầu
      bằng `/work/node_modules/`, và bind của chính `node_modules` vẫn mang `ro`
- [x] T1.13 [Lớp phủ là TMPFS chứ không phải bind]: số bind vẫn **2** (thư mục lượt chạy + phụ thuộc), và
      không bind nào trỏ tới đường trong danh sách — bắt đúng cú đổi `--tmpfs` thành `-v …:rw`

### Ca cũ phải KHÔNG đỏ (không nới quá tay)
- [x] T1.14 `scanWritableBinds` vẫn trả rỗng — thêm tmpfs không tạo bind ghi được ra ngoài thư mục lượt chạy
- [x] T1.15 `--network=none`, ba trần tài nguyên, `--read-only`, `--user 1000:1000`, `no-new-privileges` còn
      nguyên (ca T1.1–T1.8 sẵn có vẫn xanh)

## Tích hợp

- [N/A] Không có đường đĩa, SQLite hay khoá nào mới — change chỉ đổi đối số dựng container. Vế hệ thống được
  kiểm ở mục «chạy thật» dưới, vì nó đòi runtime container mà máy dev Windows không có.

## Ca đối kháng & hồi quy

- [x] T3.1 **Mutation hai chiều** (task 5.2), mỗi cái kiểm chứng đã vào đĩa trước khi đọc kết quả, chạy HAI
      lần: M1 bỏ vòng `--tmpfs` ⇒ **1 đỏ** · M2 `--tmpfs` → bind `:rw` ⇒ **6 đỏ** · M3 mục trỏ ra ngoài
      `node_modules` ⇒ **1 đỏ** · M4 bỏ `if (spec.thuMucPhuThuoc)` ⇒ **2 đỏ** · M5 xoá `ly_do` ⇒ **1 đỏ**.
      Số ca đỏ giống hệt hai vòng; đối chứng sau khôi phục 33/33 xanh.
- [x] T3.2 Ca đã gãy trong lịch sử: PR #75 và #77 (07/09) cùng chết ở «Runner không xuất JUnit XML» với hai
      nguyên nhân khác nhau (`EAI_AGAIN` rồi `ENOENT mkdir .vite-temp`) — cả hai đều là **một thông điệp cho hai
      bệnh**. Ca chạy thật 7.1 là chỗ chứng minh bệnh thứ hai đã khỏi; bệnh thứ nhất là việc vận hành, ghi ở
      `DEPLOY.md`.

## Trục nhạy cảm

- [N/A] T_bimat — change không chạm bí mật; không mount nào mới trỏ vào kho khoá, cấu hình hay sổ cái. Ca
  `scanWritableBinds` (T1.14) là chỗ giữ vế ấy.
- [x] T_failclosed ⛔C2 — hai chiều đều đo được trên prod cùng ngày: **không** có mount ⇒ PR #75/#77 kết thúc
  bằng **lỗi**, không PASS; **có** mount ⇒ PR #79 đi tới verdict. Đường lỗi sẵn có («Runner không xuất JUnit
  XML» ⇒ ném sau 2 lần sinh) là thứ giữ chiều thứ nhất.
- [x] T_cong — change KHÔNG chạm verdict, không thêm đường ghi `result`, không đổi luật nhị phân
- [x] T_khongtincay ⛔C4 — trục CHÍNH: thứ chạy trong sandbox là code repo đích. Danh sách đường ghi được là
  **đóng, trong mã** (D2); không khoá `checkmate.yml` nào mở nó — grep `DEPENDENCY_SCRATCH_PATHS` trong
  `runner.ts`/`volume-standard.ts` phải rỗng
- [x] T_hopdong — `DEPENDENCY_SCRATCH_PATHS` khai trong bảng module của `checkmate.yml`; lưới hợp đồng xanh

## Chạy thật — KHÔNG tick trước khi chạy

- [x] T7.1 PR #79 (07/09): `result=PASS`, `co_lap={container, podman 3.4.4}`, `ke_hoach=9 ghi_nhan=9`,
      `pass=2 · ngoai_pham_vi=3`. Ba probe neo vào `inBand` cho nhãn `✗→✓`. run_id: `wmtr4j87au091`
- [x] T7.2 `node_modules` bản clone: **6471 file / 252 349 456 byte** trước và sau lượt chạy — không lệch một
      byte. Vế «ghi vào phụ thuộc thật vẫn thất bại» ở mức hệ thống.

## Kiểm tay

- [ ] T8.1 Đọc lại `DEPENDENCY_SCRATCH_PATHS`: người sau có hiểu vì sao đúng mục ấy được phép ghi, và vì sao
      không được thêm mục mới cho tiện không?
