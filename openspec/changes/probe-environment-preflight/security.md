## S1. Bí mật & rò rỉ

- ✅ S1.1 — thông điệp môi trường mang **đường dẫn bản clone trên máy chủ**, **số gói khai trong
  `package.json`**, và **dải `engines.node`**. Không cái nào là bí mật: đường dẫn clone do CheckMate tự
  đặt (`REPO_ROOT` + slug repo), số gói và dải runtime đọc từ file công khai của repo đích. Đường dẫn phải
  có mặt thì lệnh sửa mới chạy được — bỏ nó đi là làm thông điệp vô dụng.
- ✅ S1.2 — không giá trị nào **người dùng gõ tay vào ô cấu hình** đi qua đây. Cửa thêm repo nhận token,
  nhưng token chỉ tới `writeRepoToken`/`cloneRepo`; phép kiểm môi trường nhận **đường dẫn đích** đã dựng.
- ✅ S1.3 — `cach_sua` là chuỗi do CheckMate sinh, không nội suy đầu vào người dùng ngoài đường dẫn clone.
- ⚠️ S1.4 — **bề mặt mới cần để mắt:** cảnh báo lúc thêm repo đi ra **giao diện web**, không ra comment
  pull request. Nếu sau này ai đó đưa thông điệp môi trường vào comment PR thì đường dẫn máy chủ thành
  công khai. Chưa xảy ra; khai ra để lần sau không phải phát hiện lại.

## S2. Danh tính, phiên, vai

- N/A S2.1 — không đọc danh tính. Cửa thêm repo giữ nguyên `docDanhTinhCong` như cũ.
- N/A S2.2 — không route nào trả tài khoản.

## S3. Cổng & quyền của máy (⛔C1)

- ✅ S3.1 — change **siết**, không nới. Nó thêm **một chỗ dừng** trước lời gọi model và **một chỗ dừng**
  trước vòng sinh lại. Không thêm đường nào cho máy đi tiếp, không chạm cổng merge, không chạm
  `decideResult`.
- ✅ S3.2 — vai `tu_dong` không có quyền mới. Cửa thêm repo vẫn là hành động của người vận hành.

## S4. Dữ liệu không tin cậy & prompt injection (⛔C4)

- ✅ S4.1 — **trục nặng nhất của change.** `looksLikeEnvironmentFailure` đọc thông điệp lỗi, và thông điệp
  ấy đến từ npm, từ Node, và **từ chính repo đích** — tức dữ liệu ngoài. Phân loại bằng **mã lỗi**
  (`EAI_AGAIN`, `EROFS`, `ENOENT`, `notsup`) và **hình dạng đường dẫn**, MUST NOT so khớp lời văn tự do.

  Nếu lưới nhận lời văn thì một repo đích chỉ cần in ra «missing dependencies» ở đúng lúc là **tự chọn
  được lượt chấm nào của chính nó bị dừng** — maker tắt checker bằng một dòng `console.log`. Ca T1.22 khoá
  vế này bằng hai chuỗi lời-văn-người-viết; mutation M9 (đổi mã thành lời văn) ⇒ 2 đỏ.

  Cùng nguyên tắc engine đã dùng để **không** dò `Cannot find module` khi nhận lỗi nạp file probe. Đây là
  lần thứ hai cùng một lý lẽ được áp — đó là dấu hiệu nó đúng chỗ, không phải dấu hiệu thừa.
- ✅ S4.2 — thông điệp môi trường **không** đi vào prompt. Nhánh dừng ném lỗi; nó không đi tiếp tới chỗ
  `redactMessage(loiThu, modelSurfaceSource(t))` như nhánh sinh lại. Tức change này **giảm** lượng dữ liệu
  ngoài chảy vào model, không tăng.
- ✅ S4.3 — `readEnginesNode` và `checkDependencies` đọc `package.json` của repo đích. Cả hai bọc `try`,
  giá trị không phải chuỗi ra `null`, JSON hỏng ra `null`. Không `eval`, không nội suy vào lệnh shell.
- ✅ S4.4 — `nodeVersionOfImage` chạy `podman run --rm --network=none <ảnh> node -v`. Tên ảnh đi qua
  `runner.image` đã có `safeImageName` gác từ trước; lệnh dùng `execFileSync` với mảng đối số, **không**
  qua shell. Container không có mạng.

## S5. Sandbox & thực thi

- ✅ S5.1 — **KHÔNG tự chạy `npm ci`**, và đó là quyết định an toàn chứ không phải thiếu sót. Cài phụ
  thuộc là chạy `postinstall` của repo đích — code tuỳ ý, **ngoài** sandbox, với quyền của người chạy
  CheckMate. Change này chỉ **nói** lệnh cần chạy; người vận hành quyết định chạy. Nhịp hai làm việc ấy
  trong container, với change riêng.
- ⚠️ S5.2 — `nodeVersionOfImage` dựng thêm **một container mỗi lượt**, nhưng chỉ khi repo đích khai
  `engines.node`. Ảnh và cờ giống hệt đường chạy probe (`--network=none`), lệnh là `node -v`, timeout 60
  giây. Không mount thư mục nào của host.
- ✅ S5.3 — không thêm thư mục tạm, không thêm worktree, không đổi cờ cô lập.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — chỉ **đọc**: `package.json`, thư mục `node_modules` (đếm mục), `package-lock.json` (có/không).
  Không ghi file nào trong repo đích.
- ✅ S6.2 — không thêm đường ghi vào sổ cái; không đổi hình dạng dữ liệu đã lưu.
- ✅ S6.3 — `readdirSync` bọc `try`; thư mục không đọc được ⇒ coi như 0 mục ⇒ chặn. Hướng an toàn: không
  đọc được thì không khẳng định là đủ điều kiện.

## S7. Fail-closed & bất biến verdict (⛔C2)

- ✅ S7.1 — nhánh mới và đích:

  | nhánh | đi về đâu |
  |---|---|
  | thiếu phụ thuộc (kiểm trước) | **ném** trước lời gọi model — lượt hỏng, không verdict |
  | runtime lệch | log cảnh báo, **đi tiếp** — lượt chấm bình thường |
  | lỗi môi trường lộ ra lúc chạy | **ném** — lượt hỏng, không sinh lại |
  | lỗi của probe | vòng sinh lại **giữ nguyên** như trước change |
  | không phân loại được | rơi về hành vi hôm nay (sinh lại một lần rồi dừng) |

  Không nhánh nào ra PASS. Không nhánh nào «bỏ qua rồi chấm tiếp trên dữ liệu thiếu».
- ✅ S7.2 — không chạm `classifyByMachine`, `regressionFloor`, hay `decideResult`. Bảng chân trị nguyên vẹn.
- ⚠️ S7.3 — **hướng bỏ sót là hướng an toàn, khai ra chứ không giấu.** Danh sách mã lỗi là danh sách ĐÓNG
  nên nó **sẽ** bỏ sót bệnh chưa gặp. Bỏ sót ⇒ engine chạy như hôm nay (tốn thêm một lời gọi). Nhận nhầm
  ⇒ chặn một lượt lẽ ra chạy được. Chọn nghiêng về bỏ sót là chủ ý.

## S8. Leo quyền & cô lập

- ✅ S8.1 — không bề mặt nào cho repo đích tác động ra ngoài phạm vi của chính nó. `package.json` của repo
  A chỉ ảnh hưởng tới lượt chấm repo A.
- ✅ S8.2 — nới `timeout_s` lên 3600 giây **có** cho một repo đích giữ một container lâu hơn (tối đa một
  giờ mỗi lệnh test thay vì nửa giờ). Ba cái giữ phần còn lại: ba mức trần tài nguyên của container
  (`MEMORY_CAP` · `CPU_CAP` · `PIDS_CAP`) không đổi · `donCayTienTrinh` vẫn dọn cây tiến trình khi hết giờ ·
  núm của người vận hành vẫn siết được. Đây là điều PO chốt 07/09, và cái giá của hướng ngược lại đã đo
  được: engine kết luận sai «PR làm treo test» về một pull request không có lỗi gì.
- ⚠️ S8.3 — **Open Question, chưa đóng:** trần 3600 giây là trần **mỗi lệnh test**, không phải trần cả
  lượt chấm. Nhiều file probe × 3600 giây có thể thành nhiều giờ. Chưa gặp thật; ghi thành nợ 8.3 ở
  `tasks.md`.

## Notes

- **Vì sao change này tồn tại là một bài học về cưỡng chế, không về môi trường.** Việc «thêm repo đích mới
  thì phải cài phụ thuộc» đã được ghi vào `DEPLOY.md` **cùng ngày** lỗi xảy ra, và lỗi vẫn tái diễn ngay
  sau đó — bởi chính người đã viết dòng ấy. Đó là số đo thứ hai cho mệnh đề ở `CLAUDE.md`: *một luật không
  có lưới thì không phải luật đang thi hành*. Số đo thứ nhất là mười định danh vi phạm luật đặt tên trong
  48 giờ sau khi luật được chốt.
- **Vì sao bug ẩn được lâu:** khi hệ chỉ có MỘT repo đích, và repo ấy là chính CheckMate, thì phụ thuộc
  luôn có sẵn và runtime luôn khớp. Ba giả định ngầm đều đúng một cách tình cờ. Chúng vỡ đồng loạt ở repo
  thứ hai — đúng lúc sản phẩm bắt đầu phục vụ nhiều đội. Cùng khuôn với bug «verdict đăng nhầm repo» vá
  hôm trước, và đó là hai lần trong hai ngày.
