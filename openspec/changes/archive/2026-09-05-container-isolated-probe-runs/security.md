# Security — container-isolated-probe-runs

Change này **là** một change bảo mật, nên tài liệu này không hỏi «có mở bề mặt nào không» mà hỏi câu khó
hơn: **cô lập này có thật không, hay chỉ trông như thật.**

## S0. Trục thật: một container cấu hình sai KHÔNG chặn gì, và nó trông y hệt một container chặn

Đo được trước change, chạy đúng quyền code PR có: kho khoá **đọc được**, sổ cái verdict **đọc và ghi
được**, thư viện probe **ghi được**, `authorized_keys` **đọc được**, Internet **ra được**.

Hai thứ nặng nhất trong đó không phải rò bí mật:

- **Thư viện probe ghi được** ⇒ đối tượng bị chấm sửa được công cụ chấm nó, và sửa một lần thì **bền vững
  sang mọi lượt sau**.
- **Sổ cái ghi được** ⇒ bằng chứng bị chính đối tượng bị chấm sửa. Trigger append-only nằm TRONG file ấy;
  ghi đè cả file thì trigger đi theo.

⛔ **Container không chặn hai thứ đó — việc chúng KHÔNG CÓ MẶT trong cây mới chặn.** Một container bind
`probes-lib` với quyền ghi thì nó nguyên vẹn cái lỗ cũ, và mọi phép đo về «có cô lập không» đều xanh. Đó
là lý do `T1.6` là ca nặng nhất của change, không phải ca nào về network hay uid.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 — **Chỗ hôm nay thủng.** `envSandbox` chặn *truyền* bí mật vào tiến trình test và làm rất đúng
  (danh sách CHO PHÉP, có lý do viết rõ) — nhưng code chỉ cần `readFileSync` là đi vòng. Sau change, kho
  khoá **không tồn tại** trong cây nhìn thấy được; allowlist môi trường vẫn giữ, nay nó là lớp thứ hai
  chứ không phải lớp duy nhất.
- ⚠️ S1.2 — Thông điệp lỗi từ runtime (podman) mang đường dẫn host và tên ảnh. Nó vào log, vào `ly_do`
  của mức cô lập, và lên màn: phải qua **đúng đường che đã có** (`redactMessage`), không dựng đường mới.
- ✅ S1.3 — Không giá trị bí mật mới nào được sinh hay lưu.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — Không route mới, không đường đọc danh tính mới.
- ⚠️ S2.2 — **Danh tính ở tầng hệ điều hành mới là chỗ đáng soi.** Tiến trình test chạy dưới user không
  đặc quyền TRONG container, và runtime **không được** đòi daemon quyền quản trị. Chọn Docker ở đây là
  thêm một đường leo quyền (`docker` group ≈ root trên host) vào đúng cái máy đang được gia cố — nên nó
  là điều cấm trong luật, không phải một khuyến nghị trong tài liệu.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Không thêm đường nào cho máy merge; không route mới; không đụng `gate.ts`/`cong.ts`.
- ✅ S3.2 — Không nới quyền vai nào. Change siết, không mở.

## S4. Dữ liệu không tin cậy & prompt injection

- ⚠️ S4.1 — **`runner.image` là bề mặt mới nhận dữ liệu do repo đích khai.** Đọc từ **đĩa clone (nhánh
  gốc)**, MUST NOT từ nhánh PR — cùng luật đã áp cho `test_cmd` và `sources.specs`. Không có vế ấy thì PR
  tự chọn được môi trường mà code của chính nó sẽ chạy.
- ⚠️ S4.2 — Tên ảnh đi vào **dòng lệnh runtime**. Nó phải được kiểm hình dạng (ký tự cho phép của tên
  ảnh OCI) trước khi dùng, và MUST NOT ghép vào một chuỗi shell. Đây là chỗ `shell: true` hôm nay đáng bỏ.
- ⚠️ S4.3 — Ảnh mặc định **ghim phiên bản**. Thẻ trôi nghĩa là nội dung môi trường chạy đổi mà không ai
  duyệt — một đường thay đổi hành vi chấm không đi qua change nào.

## S5. Sandbox & thực thi

- ⚠️ S5.1 — **Toàn bộ mục này là nội dung của change.** Ba vế phải cùng có, thiếu một là hở:
  (1) không bind ghi được ra ngoài · (2) mạng tắt · (3) trần bộ nhớ/CPU/tiến trình.
- ⚠️ S5.2 — **Huỷ môi trường phải nằm ở nhánh dọn dẹp**, chạy cả khi phần việc bên trong ném. Hình dạng
  `finally` hôm nay đã đúng; thêm container không được làm mất nó — một container không huỷ là một tiến
  trình còn sống mang theo code của PR.
- ⚠️ S5.3 — `git archive` thay worktree: cắt đường ghi vào `.git` của clone (git hook chạy ở lượt sau là
  một đường **bền vững**, không cần PR nào nữa).
- ⚠️ S5.4 — Trần tài nguyên không phải chuyện hiệu năng mà là chuyện **cô lập hỏng hóc**: máy này chạy
  cùng một sản phẩm khác, và một lượt chấm ngốn hết RAM là một sự cố của sản phẩm ấy.

## S6. Tầng dữ liệu & quyền file

- ⚠️ S6.1 — Bind `node_modules` **chỉ đọc**. Đây là bind duy nhất ra ngoài, nên nó là chỗ duy nhất có thể
  sai; ca T1.5 và T1.6 canh hai chiều (đúng chế độ, và không có bind nào khác).
- ✅ S6.2 — Không cột mới, không di trú. Verdict thêm một trường tuỳ chọn.
- ⚠️ S6.3 — ⛔C6: không thêm cache ảnh hay cache cấu hình nào che đường sửa tay `checkmate.yml`.

## S7. Fail-closed & bất biến verdict

- ⚠️ S7.1 — **Chiều nghiêng phải đúng, và nó KHÔNG phải «từ chối chạy».** Máy dev là Windows; từ chối ở
  đó nghĩa là không ai phát triển được sản phẩm này nữa. Fail-closed ở đây nghĩa là **không giấu**: lượt
  chấm vẫn chạy, nhưng verdict khai rõ `none` kèm lý do.
- ⚠️ S7.2 — **Mức khai ra phải là mức THỰC TẾ.** Cấu hình bật mà dựng lỗi ⇒ khai `none`. Khai theo cấu
  hình là đúng loại nói dối mà cả sản phẩm này tồn tại để chống, và nó tệ hơn không khai gì: nó dán nhãn
  «đã cô lập» lên một lượt chạy không cô lập.
- ⚠️ S7.3 — Verdict đời cũ vắng trường ⇒ **không đo được**, MUST NOT suy thành «không cô lập». Bản ghi cũ
  có thể đã chạy ở bất kỳ đâu; không biết là một trạng thái riêng.

## S8. Leo quyền & cô lập (per-vector)

- ⚠️ S8.1 — **Mọi đường tới mục tiêu «code PR chạm được tài sản CheckMate»:**
  (1) bind ghi được ra ngoài · (2) mạng bật ⇒ đẩy dữ liệu ra ngoài · (3) chạy uid đặc quyền trong
  container ⇒ thoát container là root · (4) daemon runtime chạy root ⇒ điều khiển được daemon là root ·
  (5) `.git` còn trong cây chạy ⇒ ghi hook vào clone, bền vững · (6) nền không có runtime ⇒ **rơi về đúng
  hành vi hôm nay**, và đường ấy phải NÓI RA.
  Sáu đường; vá năm đường mà bỏ (6) thì cô lập chỉ là một tuỳ chọn im lặng.
- ⚠️ S8.2 — **Load-bearing:** sáu chiều mutation ở `tasks.md` §7, trong đó 7.1 (thêm bind ghi được) và
  7.5 (dựng lỗi vẫn khai `container`) canh đúng hai cách-làm-hại ở S0 và S7.2.
- ⚠️ S8.3 — **Đối xứng hai đường chạy.** `chayVitest` và `chayTheoRunner` phải nhận CÙNG mức cô lập. Nếu
  chỉ một đường được đóng gói thì repo khai `runner.test_cmd` sẽ chạy ở mức khác repo không khai — hai
  cửa cùng vai, khuôn đã bị bắt chín lần ở repo này.

## Notes

**Rủi ro không nằm ở mục nào ở trên: change này biến một lỗ hổng ỒN ÀO thành một tính chất IM LẶNG.**
Hôm nay ai đọc `sandbox.ts` cũng thấy ngay nó chỉ là worktree. Sau change, chỗ ấy sẽ **trông như** đã cô
lập, và người đọc sau sẽ tin vào cái tên chứ không đọc danh sách bind.

Thứ chống lại điều đó không phải tài liệu này mà là **sáu phép đo chạy lại từ trong container** (T7.1) —
cùng sáu phép đo đã dùng để phát hiện lỗ, chạy lại ở phía bên kia. Chúng phải được chạy lại mỗi khi đụng
vào lớp này, và số đo phải nằm trong tài liệu để lần sau so được. Một lưới CSS-style quét đối số dựng là
**chốt hồi quy**, không phải phép chứng minh — nói rõ ở đầu file test.
