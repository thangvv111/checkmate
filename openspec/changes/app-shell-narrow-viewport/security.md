# Security — app-shell-narrow-viewport

Change thuần **trình bày**: chỉ CSS của vỏ, không route mới, không đường ghi mới, không chạm cổng,
verdict, bí mật hay dữ liệu ngoài. Nên tài liệu này ngắn — nhưng ngắn vì **đã rà**, không phải vì bỏ qua.

## S0. Trục thật: một change CSS vẫn có một cách làm hại, và nó là cách người ta hay chọn

Cách nhanh nhất làm `scrollWidth` về đúng bằng khung là **giấu bớt thứ đang tràn**: `display:none` cho nút
trực, cho nút tài khoản, cho vài mục điều hướng. Con số đẹp ngay, và cái mất không hiện ra ở bất kỳ phép
đo nào.

Ở một sản phẩm mà **cổng merge và màn Cấu hình nằm sau điều hướng**, giấu một mục ở màn hẹp nghĩa là người
vận hành đang cầm điện thoại mất đường tới đúng thứ họ cần lúc gấp. Đó là lý do requirement khai thẳng
«MUST NOT giấu bớt mục», và lý do có một ca test riêng cho nó (T2.2) chứ không chỉ một câu trong tài liệu.

## S1. Bí mật & rò rỉ

- ✅ S1.1 — Không giá trị bí mật nào đi qua change. CSS không đọc dữ liệu.
- ⚠️ S1.2 — **Có một vế đáng soi:** `.repo-btn` cắt tên repo bằng ellipsis. Cắt **hiển thị** không phải
  cắt **dữ liệu** — chuỗi đầy đủ vẫn nằm trong HTML (`title`, danh sách xổ xuống). Tên repo không phải bí
  mật (nó hiện khắp sản phẩm), nên đây không phải rò rỉ; ghi ra để không ai nhầm ellipsis là một phép che.
  ⛔C3 nói bản che phải PHÂN BIỆT được hai giá trị khác nhau — ellipsis KHÔNG đạt điều đó, nên nó MUST NOT
  bị dùng lại cho token hay giá trị người dùng gõ vào ô cấu hình.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — Không route, không đọc danh tính, không đổi cửa phiên.
- ✅ S2.2 — Nút tài khoản vẫn hiện ở màn hẹp (không bị ẩn) — xem S0.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Không thêm đường nào cho máy merge; không chạm `gate.ts`/`cong.ts`.
- ⚠️ S3.2 — Vế duy nhất chạm cổng theo nghĩa gián tiếp: **đường ĐI TỚI** cổng merge nằm sau điều hướng.
  Change giữ đủ mọi mục ở màn hẹp, nên đường ấy không hẹp lại. Nếu về sau ai đó ẩn bớt mục để gọn màn,
  T2.2 phải đỏ.

## S4. Dữ liệu không tin cậy & prompt injection

- ⚠️ S4.1 — **Tên repo là dữ liệu người dùng, và nó QUYẾT ĐỊNH bề rộng một phần tử vỏ.** Đó chính là lỗi
  đang sửa: không có trần, một tên dài đẩy header rộng 288px và làm vỡ bố cục MỌI màn. Trần `max-width`
  là chỗ cắt ảnh hưởng ấy. Phép thoát HTML cho tên repo không đổi — nó đã có và vẫn nguyên.
- ✅ S4.2 — Không thêm gì vào prompt, không gọi model.

## S5. Sandbox & thực thi

- N/A — change không chạm đường chạy probe.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — Không file mới, không cột mới, không ghi gì xuống đĩa.

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — Không nhánh quyết định nào được thêm; không verdict nào đổi.
- ⚠️ S7.2 — Một vế trình bày vẫn thuộc ⛔C2 về tinh thần: bảng số liệu verdict và khối bằng chứng phải vẫn
  **đọc được** ở màn hẹp, không bị cắt mất cột. Luật đã có («nội dung rộng cuộn TRONG khối của nó») giữ
  điều đó; change này không được phá nó — có scenario riêng trong delta.

## S8. Leo quyền & cô lập

- ✅ S8.1 — Không có bề mặt nào để leo quyền: change không thêm đường vào, không đổi phép kiểm nào.
- ⚠️ S8.2 — **Load-bearing:** bốn chiều mutation ở `tasks.md` §5, trong đó chiều 5.4 (ẩn bớt mục điều
  hướng) canh đúng cách-làm-hại ở S0.

## Notes

Rủi ro thật của change này không nằm ở bảo mật mà ở **cách người ta sẽ đọc lưới của nó**: lưới quét CSS,
mà CSS xanh KHÔNG chứng minh màn hết tràn. `design.md` D4 và đầu file test đều nói thẳng điều đó, và số đo
trình duyệt được ghi vào tài liệu để lần sau so được. Một lưới tự nhận là đủ ở đây sẽ làm người sau thôi
mở trình duyệt ra nhìn — và đó đúng là cách lỗi này lọt vào lần đầu.
