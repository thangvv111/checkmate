# Security — data-table-screens-ccs

Ba màn này **chỉ đọc**. Chúng không ghi gì, không chạy gì, không gọi model, không chạm cổng. Nên hầu hết
danh sách chuẩn là N/A — nhưng có **hai trục thật**, và cả hai đều là loại rủi ro mà một màn chỉ-đọc vẫn
gây được.

## S0. Hai trục thật của một màn chỉ-đọc

**(a) Nói sai bằng thứ tự.** Một bảng đã sắp xếp là một câu khẳng định: «đầu bảng là đáng chú ý nhất».
Sắp sai trục thì bảng nói sai — và ở màn Tin cậy, thứ nó nói sai là **về một con người**. Đây là lý do
change tồn tại, không phải rủi ro nó tạo ra; nhưng nó cũng cho biết mọi thay đổi thứ tự ở đây phải có ca
khoá, kẻo lần sau ai đó «tối ưu» phép sắp và bảng lại nói sai trong im lặng.

**(b) Nội dung do người khác đặt, hiện trên màn của mình.** Tên artifact, tên tác giả, tên repo, tên nhánh
đều đến từ GitHub hoặc từ tên file người dùng tải lên — tức **dữ liệu ngoài** (⛔C4). Khuôn `artifactCell`
là chỗ MỚI dựng HTML từ chúng, nên nó là bề mặt XSS mới duy nhất của change.

## S1. Bí mật & rò rỉ

- ✅ S1.1 — Không giá trị nào của change là bí mật. Cột `Token (vào/ra)` là **số đếm token model**, không
  phải chìa khoá; nó đã có từ trước và change không đổi nguồn của nó. Ba màn đọc từ `run` và `so_cai` —
  hai bảng không chứa token GitHub, không chứa khoá API, không chứa hash mật khẩu.
- N/A S1.2 — Không có gì chảy ra bề mặt công khai; change không đụng comment PR hay thân commit merge.
- N/A S1.3 — Không giá trị nào bị che.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — Ba route đã có (`/lich-su`, `/ledger`, `/tin-cay`) đều nằm sau cửa phiên; change không thêm
  route và không thêm đường đọc danh tính. Tên người trong bảng đến từ **sổ cái**, không từ phiên.
- ✅ S2.2 — Không route nào trả tài khoản, hash hay muối. Bảng Tin cậy bày **tên tác giả pull request** —
  đó là dữ liệu công khai của repo, không phải tài khoản CheckMate.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Change không chạm `gate.ts`, không chạm `cong.ts`, không thêm nút nào.
- ✅ S3.2 — Cột «hành động cổng» của sổ cái là **bản ĐỌC ra từ sổ** (R6.26 — phép nối `NOI_SO_CONG` ở
  `apps/web/src/store/run-store.ts`), không phải cột ghi được. Change giữ nguyên đường đọc ấy và không mở
  cửa ghi nào. Đây là chỗ đáng soi vì lịch sử repo đã có một lần cụm cột cổng trở thành nguồn sự thật thứ
  hai và phải gỡ bằng change riêng.

## S4. Dữ liệu không tin cậy & prompt injection

- ⚠️ S4.1 — **Bề mặt mới duy nhất của change.** `artifactCell` dựng HTML từ bốn trường **do bên ngoài
  đặt**: tên artifact (tên file người dùng tải lên, hoặc tiêu đề pull request từ GitHub), `repo`, số pull
  request, `sha`. Việc phải làm: **mọi trường đi qua `escHtml`**, không trường nào nội suy thẳng vào chuỗi
  HTML. Có ca đối kháng T1.4 (`<script>` trong tên artifact).
  Đáng chú ý: tiêu đề pull request là chuỗi **người ngoài repo đặt được** — ai mở một pull request cũng
  đặt được tiêu đề. Đây đúng nghĩa dữ liệu ngoài hạng không tin cậy, dù nó không đi vào prompt nào.
- N/A S4.2 — Không tin thêm gì từ model; ba màn không gọi model.

## S5. Sandbox & thực thi

- N/A S5.1 / S5.2 — Không chạy code, không dựng worktree.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — Không file mới, không cột SQLite mới. `tiLePass` là phép chia lúc đọc (D1), nên không có gì
  chạm đĩa và không có gì để di trú.
- ✅ S6.2 — Không đường ghi nào. Ba màn chỉ `SELECT`.

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — Không nhánh lỗi mới nào dẫn tới PASS: change không sinh verdict. Nhánh khuyết duy nhất là chia
  cho 0 ở `tiLePass`, và nó nghiêng về **0** (D2) — tức tác giả chưa có bằng chứng nào bị đẩy xuống cuối,
  không phải lên đầu. Nghiêng nhầm chiều ở đây sẽ đưa người **không có dữ liệu** lên đầu bảng «đáng tin
  nhất», tức bịa ra một kết luận từ chỗ trống.
- ✅ S7.2 — Không đụng đường đếm hồi quy, không đụng nhãn máy dán.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 — **Liệt kê mọi đường tới mục tiêu «bảng nói một điều sai»:** (1) sai trục sắp xếp · (2) tổng
  tính trên tập khác tập đang hiện · (3) phân trang cắt mất hàng mà không nói · (4) định danh artifact
  hiện nhầm hàng nào là hàng nào. Change đóng (1) bằng T2.1/T2.4, (2) bằng T4.1/T4.2, (3) bằng T5.1/T6.2,
  (4) bằng T1.1–T1.3. Vá (1) mà bỏ (2) thì bảng đúng thứ tự nhưng dòng tổng vẫn nói sai — hai đường độc
  lập, phải đóng cả hai.
- ✅ S8.2 — **Load-bearing hai chiều.** Tám chiều mutation ở `tasks.md` §7 đều là dạng «trả gác về trạng
  thái cũ → ca phải ĐỎ». Đặc biệt 7.1 và 7.4 tái tạo đúng hai lỗi đang có hôm nay.
- ✅ S8.3 — **Đối xứng.** Bộ lọc ngày có hai vế (từ/đến) và mutation 7.7 gỡ vế «đến» — vì một phép lọc
  khoảng gỡ mất một vế vẫn trông như đang lọc, chỉ là lọc rộng hơn người dùng tưởng. Cùng khuôn ấy áp cho
  dòng tổng: có ca cho cả «lọc rồi» lẫn «chưa lọc».

## Notes

**Rủi ro không nằm ở mục nào ở trên: `artifactCell` là hàm dùng chung cho BA màn, nên một lỗi thoát HTML ở
đó rò ra cả ba cùng lúc.** Đó là cái giá của khuôn dùng chung, và nó được trả bằng đúng thứ khuôn dùng
chung mang lại: **một chỗ để viết ca**. Ca T1.4 canh chỗ ấy; không có nó thì change này biến ba bề mặt
XSS nhỏ thành một bề mặt lớn mà không thêm phép canh nào.
