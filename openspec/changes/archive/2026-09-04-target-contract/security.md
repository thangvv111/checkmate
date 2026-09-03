# Security — target-contract

Đây là vùng **chạy code của người khác trên máy chủ của mình**. Hợp đồng `checkmate.yml` cho repo đích khai
lệnh test, và checker chạy lệnh ấy. Soi ở đây phải bắt đầu từ chỗ khai đúng ranh giới tin cậy, chứ không
phải từ chỗ đếm hàng rào.

## S0. Ranh giới tin cậy — khai trước, vì cả mục này dựa vào nó

Repo đích **cố ý** được phép chỉ định lệnh chạy test của mình. Đó không phải lỗ hổng; đó là toàn bộ lý do
hợp đồng này tồn tại — không có nó thì checker chỉ chấm được repo dùng vitest. Sự cô lập nằm ở **sandbox**
(worktree tách, env lọc qua `envSandbox`, timeout, dọn cây tiến trình), không nằm ở việc kiểm nội dung
`test_cmd`.

Hệ quả phải nói rõ: **thêm người vào danh sách repo được chấm = cho người đó chạy lệnh trên máy chủ.** Cổng
thật ở đây là cổng thêm repo (`repo-history` R4.22), không phải một phép lọc chuỗi.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 `loiThu` mang `stderr`/`stdout` **của bộ chạy test repo đích** — dữ liệu ngoài, có thể chứa bí mật
  (biến môi trường in ra khi lỗi, URL kèm token). Đường ra ngoài do `error-message-egress-gate` gác và
  change này không đổi nó, nhưng R-2 **cố ý** đẩy nội dung ấy đi xa hơn, nên ghi ra đây (⛔C3).
- ✅ S1.2 `envSandbox()` lọc env trước khi trao cho lệnh của repo đích — bí mật của checker không tự đi vào
  tiến trình con. Change này dựa vào tính chất ấy, không đổi nó.
- ⚠️ S1.3 Cắt ngưỡng (2000 / 1800 ký tự) là chặn tràn log, **không** phải chặn rò. Đừng đọc nó thành gác.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 Không đọc danh tính, không route mới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 Không thêm đường cho máy tự merge.
- ⚠️ S3.2 R-3 phục vụ cổng gián tiếp nhưng mạnh: sandbox dựng sai làm **mọi probe đỏ vì lý do không liên
  quan gì tới code đích**. Verdict FAIL sai cũng là verdict sai — nó dạy người dùng rằng công cụ hay báo
  bậy, và bước tiếp theo của thói quen ấy là bỏ qua cả FAIL thật.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ⚠️ S4.1 `test_cmd` là dữ liệu ngoài chạy qua shell — xem S0. Ranh giới đã khai thành luật ở R-1 để người
  sau không nhầm `quote` là hàng rào (⛔C4).
- ✅ S4.2 Hai giá trị `quote` bọc (`{files}`, `{out}`) do **checker tự sinh**, không phải dữ liệu ngoài.

## S5. Sandbox & thực thi (R8)

- ✅ S5.1 R-3 giữ đúng tính chất cô lập: `node_modules` dùng chung qua symlink có đích tuyệt đối, không để
  junction trỏ ngược vào sandbox.
- ✅ S5.2 Timeout theo `timeout_s` đã kẹp (`runner-cfg` đã có ca) và cây tiến trình bị dọn khi treo.
- ⚠️ S5.3 Ca test của change này **chạy lệnh thật** (`node -e` do chính ca viết). Nội dung lệnh do lưới
  kiểm soát hoàn toàn, không lấy từ đâu khác.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Ca dựng repo git tạm + worktree riêng, dọn bằng `sb.huy()` và `rmSync`. Không chạm `probes-lib/`,
  `web-runs/`, hay repo thật.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 R-2 là fail-closed đúng nghĩa và **có mắt**: không ghi nhận được probe thì thất bại, kèm nguyên
  nhân đủ để sửa.
- ⚠️ S7.2 **R-3 là chỗ nguy hiểm nhất của cả change, vì nó hỏng mà không ai biết.** Ba điều ở đây không
  giống nhau về mức: R-1 và R-2 hỏng thì có tín hiệu (lệnh gãy, thông điệp trống). R-3 hỏng thì **không có
  tín hiệu nào** — lượt chấm chạy trơn, probe đỏ đều, và lý do «Cannot find package» trông như lỗi của repo
  đích. Đó là loại hỏng đắt nhất: nó không dừng ai lại, nó chỉ làm mọi kết luận sai đi.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **làm một lượt chấm cho kết quả sai mà không ai nghi ngờ**.

- ✅ S8.1 (a) đặt repo trong thư mục có khoảng trắng để lệnh gãy im lặng → R-1 vế quote.
- ✅ S8.2 (b) khai `test_cmd` không xuất XML để lượt chấm ra «0 probe» không lý do → R-2.
- ✅ S8.3 (c) gọi checker với `--repo .` để sandbox mất `node_modules` → R-3.
- ⚠️ S8.4 (d) khai `test_cmd` chạy lệnh tuỳ ý trên máy chủ → **không lưới nào chặn, theo thiết kế** (S0).
  Cổng thật là cổng thêm repo. Ghi ra để người sau không đi tìm một hàng rào không tồn tại — và để nếu ai
  muốn dựng hàng rào ấy thì biết mình đang đổi ranh giới tin cậy, không phải vá một lỗ.

## Notes

- S0 và S8.4 là cặp: ranh giới tin cậy khai ở đầu, và vector tấn công «hợp lệ theo thiết kế» khai ở cuối.
  Một mục security liệt kê toàn dấu ✅ mà giấu S8.4 sẽ đọc như đã kín, trong khi chỗ hở lớn nhất là chỗ
  **cố ý mở**.
- S7.2 là điều đáng nhớ: ba điều này khác nhau về mức nguy hiểm, và cái nguy hiểm nhất lại là cái im lặng nhất.
