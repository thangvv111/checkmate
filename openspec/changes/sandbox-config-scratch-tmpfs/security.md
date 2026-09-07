## S1. Bí mật & rò rỉ

- N/A S1.1 — change không chạm giá trị bí mật nào. Nó chỉ thêm đối số `--tmpfs` vào lệnh dựng container.
- N/A S1.2 — không bề mặt công khai nào đổi; không có gì mới chảy ra comment PR hay log.
- N/A S1.3 — không có giá trị nào cần che.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 — không đọc danh tính. `--user 1000:1000` và `no-new-privileges` giữ nguyên
  (`packages/harness/src/sandbox.ts:186–187`).
- N/A S2.2 — không route nào đổi.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 — máy KHÔNG merge được thêm đường nào; change không chạm `verdict.ts`, không chạm `gate.ts`.
- ✅ S3.2 — vai `tu_dong` không có quyền mới. Danh sách đường ghi là **hằng trong mã**
  (`sandbox.ts` — `DEPENDENCY_SCRATCH_PATHS`), không đọc từ cấu hình vận hành lẫn `checkmate.yml`.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 — **trục chính của change**. Thứ chạy trong container là code của repo đích, tức dữ liệu ngoài
  (⛔C4), và change này nới đúng bề mặt ấy. Ba vế giữ nó lại: danh sách **ĐÓNG trong mã** (không mẫu chung,
  không biến môi trường, không khoá `checkmate.yml` — D2); mọi mục **nằm trong** `/work/node_modules/`
  (ca T1.12); lớp phủ là **tmpfs**, biến mất cùng container (ca T1.13).
- N/A S4.2 — change không chạm đường tin trả lời model.

## S5. Sandbox & thực thi (R8)

- ⚠️ S5.1 — **change đổi đúng bề mặt này**, nên soi kỹ. Cái được thêm: một `--tmpfs` cho mỗi mục của danh
  sách đóng, và **chỉ khi** có thư mục phụ thuộc. Cái KHÔNG đổi, xác nhận bằng ca T1.14/T1.15:
  `--read-only` rootfs · `:ro` của `node_modules` · `--network=none` · ba trần tài nguyên · `:Z,U` của thư
  mục lượt chạy · `--user` · `no-new-privileges`. Số bind vẫn **2**.
  Hậu quả xấu nhất nếu hỏng: code repo đích ghi được vào một thư mục RAM 
  rồi mất khi container tắt. Nó **không** ghi tới `node_modules` thật của bản clone — đó là khác biệt giữa
  `tmpfs` và bind `:rw`, và là lý do D1 chọn `tmpfs`.
- ✅ S5.2 — đường dọn không đổi (`sandbox.ts` — `traLaiQuyenSoHuu` rồi `podman unshare rm -rf`). Lớp phủ
  tmpfs không để lại gì trên đĩa nên không có gì phải dọn thêm. Hai lượt song song vẫn mỗi lượt một
  container, mỗi container một lớp phủ riêng.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 — không tạo file trên đĩa host. Lớp phủ nằm trong bộ nhớ.
- ✅ S6.2 — không thêm đường ghi nào ra đĩa. ⛔ Vế cần giữ: `node_modules` của bản clone phải còn nguyên sau
  lượt chạy — ca T7.2 đếm file và dung lượng trước/sau ở mức hệ thống, vì ca đối số không chứng minh được vế
  này.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 — nhánh lỗi mới và đích:

  | nhánh | đi về đâu |
  |---|---|
  | runtime không dựng được tmpfs (podman cũ, kernel không hỗ trợ) | lệnh `podman run` lỗi ⇒ đường lỗi sẵn có ⇒ lượt chấm **lỗi**, KHÔNG PASS |
  | vite đổi chỗ đặt file tạm ⇒ mount thành vô dụng | `ENOENT` như trước change ⇒ «Runner không xuất JUnit XML» ⇒ lượt **lỗi** |
  | không có thư mục phụ thuộc | không phủ gì; lượt vẫn chạy bằng đường cũ |

  Không nhánh nào biến lỗi thành PASS. Cả hai nhánh hỏng đều dừng ở chỗ **đã có** đường lỗi, không phải chỗ
  im lặng.
- ✅ S7.2 — change không chạm `classifyByMachine`; probe hỏng vẫn được đếm như cũ.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 **Mục tiêu «code repo đích sửa được thứ bền vững»** — mọi đường:

  | # | đường | trạng thái |
  |---|---|---|
  | 1 | ghi vào `node_modules` thật của bản clone | **đóng** — bind vẫn `:ro` (T1.12); tmpfs chỉ phủ một đường con và không xuyên xuống |
  | 2 | ghi vào thư viện probe / sổ cái / kho khoá | **đóng** — chúng không có mặt trong cây (`scanWritableBinds` T1.14) |
  | 3 | thêm một mục vào danh sách trỏ **ra ngoài** `node_modules` | **đóng** bằng ca T1.12 (tiền tố đường) — đây là đường dễ lọt nhất vì trông y như một mục hợp lệ |
  | 4 | đổi `--tmpfs` thành bind `:rw` cho «tiện» | **đóng** bằng ca T1.13 (số bind + không bind nào trỏ vào đường trong danh sách) |
  | 5 | repo đích tự khai đường ghi qua `checkmate.yml` | **đóng bằng thiết kế** — không có khoá nào; ca T_khongtincay grep xác nhận |
  | 6 | dữ liệu sống sót sang lượt sau qua lớp phủ | **đóng** — tmpfs biến mất cùng container; scenario «không bền qua hai lượt» trong spec |
  | 7 | nới `--read-only` của rootfs cho tiện | không thuộc change; ca T1.15 giữ cờ ấy |

  Đường 3 và 4 là hai đường ngược trực giác: chúng **không** trông như nới cô lập, chúng trông như sửa một
  chi tiết mount. Đó là lý do hai ca ấy tồn tại riêng thay vì gộp vào một ca «mount đúng».
- ⚠️ S8.2 — **không dismiss đường 1 bằng «bind vẫn `:ro` nên chắc chắn an toàn»**. Việc tmpfs phủ lên một
  đường con của bind `:ro` mà **không** làm phần còn lại ghi được là hành vi của **podman**, không phải của
  mã này — grep không chứng minh được. Ca T7.2 (đếm file + dung lượng `node_modules` trước/sau một lượt chạy
  thật) là phép kiểm hai chiều duy nhất cho vế ấy, và nó **không được tick trước khi chạy**.
- ✅ S8.3 **Đối xứng** — nới cho một bộ chạy test (vitest) thì phải hỏi bộ chạy khác. Repo đích khai runner
  riêng (pytest, junit) có thể cần đường ghi khác; luật đã khai danh sách **đóng** nên thêm mục là **đổi
  luật, qua change**, không phải sửa một dòng. Ghi rõ ở `DEPENDENCY_SCRATCH_PATHS` để người sau không tự thêm.

## Notes

- **Rủi ro lớn nhất không nằm ở change này mà ở lần sau.** Danh sách đóng chỉ có giá trị khi người tiếp theo
  gặp lỗi tương tự **không** tự thêm một dòng cho xong. Ba thứ giữ điều đó: chú thích tại chỗ nêu rõ vì sao
  danh sách phải đóng, luật khai nó là danh sách đóng, và ca T1.12 bắt mục trỏ ra ngoài.
- **Sự cố còn lại chưa thuộc change này:** clone repo đích thiếu `node_modules` ⇒ `npx` đi tải ⇒ `EAI_AGAIN`.
  Đó là việc vận hành, ghi vào `DEPLOY.md` (task 4.1). Hai bệnh cùng một triệu chứng «Runner không xuất JUnit
  XML» — tài liệu phải phân biệt được chúng, kẻo lần sau lại chẩn đoán từ đầu.
