## S1. Bí mật & rò rỉ

- ✅ S1.1 — change không đọc/ghi bí mật. Nhưng nó **sửa một đường rò dữ liệu**: trước bản vá, nội dung
  verdict của repo A (tên file, trích dẫn mã nguồn, thông điệp lỗi test) đi tới pull request của repo B.
  Đó không phải rò khoá, mà rò **nội dung mã nguồn giữa hai đội** — và bề mặt ấy công khai, không thu hồi
  được. Chặn ở `apps/web/src/config.ts` — `configForRepo`.
- ✅ S1.2 — bề mặt CÔNG KHAI (comment pull request) nay chỉ nhận nội dung của **đúng repo mình**.
- N/A S1.3 — không có giá trị nào cần che.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 — không đọc danh tính. Hai cổng vẫn qua `docDanhTinhCong` như cũ.
- N/A S2.2 — không route nào trả tài khoản.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 — **trục nặng nhất của change, và nó SIẾT chứ không nới.** Trước bản vá, `POST /api/runs/:id/merge`
  dựng cấu hình từ repo **đang chọn**, nên `mergePr` gọi `/repos/<repo đang chọn>/pulls/<số>/merge` — nếu
  repo ấy có pull request cùng số thì **máy merge một PR không ai yêu cầu**, ở một repo khác. Đó là ⛔C1 bị
  phá theo đường tệ nhất. Sau bản vá, cấu hình dựng từ `st?.meta.repo`; thiếu repo ⇒ 409, không merge.
  Mutation M2 khoá vế này.
- ✅ S3.2 — vai `tu_dong` không có quyền mới. Đường tự động nay **hẹp hơn**: thiếu repo thì nó im và ghi
  log, thay vì hành động trên repo đang chọn.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 — không thêm bề mặt nhận dữ liệu ngoài. Tên repo được **tra trong danh sách đã khai**
  (`findRepo`), chuỗi lạ ra `null` chứ không dựng ra một repo không có thật — cùng nguyên tắc với
  `timRepoDaKhai` ở cửa webhook.
- N/A S4.2 — không chạm đường tin trả lời model.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 — không chạy code nào ở chỗ mới.
- N/A S5.2 — không thêm thư mục tạm hay worktree.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 — không tạo file trên đĩa.
- ✅ S6.2 — không thêm đường ghi. `RunMeta.repo` đã có sẵn và không đổi hình dạng; bản vá chỉ **đọc** nó.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 — nhánh mới và đích:

  | nhánh | đi về đâu |
  |---|---|
  | lượt không mang `repo` (đời cũ, dán tay) | **không hành động**; đường tự động ghi log, hai cổng trả 409 |
  | `repo` không còn trong danh sách (đã gỡ) | **không hành động**, log/409 nêu **tên** repo thiếu |
  | danh sách repo rỗng | `findRepo` không thấy ⇒ `null` ⇒ như trên |

  Không nhánh nào rơi về repo đang chọn, không nhánh nào đoán. Verdict vẫn được chấm và ghi sổ đầy đủ —
  thứ mất là việc **đăng**, và đó là hướng an toàn.
- ✅ S7.2 — không chạm phân loại probe hay `decideResult`.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 **Mục tiêu «hành động của repo A chạm repo B»** — mọi đường:

  | # | đường | trạng thái |
  |---|---|---|
  | 1 | đăng verdict tự động (`rm.onXong`) | **đóng** — `meta.repo` (M1) |
  | 2 | gắn trạng thái commit | **đóng** — cùng cấu hình với #1 |
  | 3 | đóng pull request / trả về dev tự động | **đóng** — cùng cấu hình với #1 |
  | 4 | **merge ở cổng** | **đóng** — `st?.meta.repo` (M2). Nặng nhất: ⛔C1 |
  | 5 | trả về dev ở cổng | **đóng** — cùng khuôn với #4 |
  | 6 | theo dõi head đổi (`getCurrentPr`) | **đóng** — `rm.lay(id)?.meta.repo` |
  | 7 | đường **khởi** lượt chấm (webhook, bấm tay) | vốn đã đúng — dựng `{ ...cfg, repo: repoCfg }` (`server.ts:889`) |
  | 8 | đường thứ tám ai đó thêm sau này | **chưa đóng bằng máy** — xem S8.2 |

- ⚠️ S8.2 — **không dismiss đường 8.** Lưới `scanSelectedRepoActions` quét theo **mỏ neo từng đường đã
  biết**; nó không thấy đường mới ai đó thêm. Đây là giới hạn thật, khai ra thay vì giả vờ đã kín: một lưới
  đoán ngữ nghĩa («lời gọi này có thuộc về một lượt không») sẽ sai theo cả hai chiều. Ba thứ giữ phần còn
  lại: requirement khai «một cửa duy nhất cưỡng chế» để lần sau có chỗ chỉ vào · lưới ĐỎ khi mỏ neo biến
  mất (chống xanh oan) · nợ 8.1 rà các đường còn lại trong `server.ts`.
- ✅ S8.3 **Đối xứng** — bản vá áp cho **cả bốn** đường hậu-lượt cùng lúc, không vá mỗi đường đăng verdict.
  Vá một đường mà để cổng merge nguyên là đóng cửa nhẹ và để mở cửa nặng.

## Notes

- **Chẩn đoán sai đã mắc, ghi lại để không ai đi lại:** từ mã 404 em kết luận «token thiếu quyền ghi» mà
  không kiểm bằng một lần ghi thật. Bác bằng ba số: comment **201**, status **201**, xoá **204** với chính
  token ấy. Mã 404 của GitHub có **hai** nghĩa — thiếu quyền, **và** tài nguyên không tồn tại ở repo đang
  gọi. Ở đây là nghĩa thứ hai, và mã 422 «No commit found for SHA» đứng ngay cạnh đã nói điều đó từ đầu.
- **Vì sao bug ẩn được lâu:** khi hệ chỉ có MỘT repo thì «repo đang chọn» luôn trùng «repo của lượt», nên
  mọi ca test một-repo đều xanh. Nó chỉ lộ ở repo thứ hai — đúng lúc sản phẩm bắt đầu phục vụ nhiều đội.
  Ca test mới dùng **hai** repo trong mọi fixture, chính vì lý do đó.
