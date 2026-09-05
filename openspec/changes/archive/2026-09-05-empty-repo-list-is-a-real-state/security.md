# Security — empty-repo-list-is-a-real-state

Change này **đóng một lỗ đang mở trên prod**, không mở thêm bề mặt nào. Nhưng nó đụng đúng cái gác quyết
định «CheckMate được phép chạy code của repo nào», nên soi kỹ đáng giá hơn ở đây so với một change giao
diện.

## S0. Trục thật: một đường vào KHÔNG có gác, và nó là đường thật sự chạy code

Gác «repo phải đã khai» sinh ra ở change `github-webhook` với lý do: *chữ ký chỉ chứng minh «người gửi
biết bí mật», không chứng minh «việc này NÊN LÀM»* — mà việc ở đây là **clone và chạy test của một repo
trên máy chủ**.

Đo được hôm nay: gác ấy chỉ tồn tại ở **một trong ba** đường vào.

| đường | gác repo-đã-khai | đo được trên prod |
|---|---|---|
| webhook | có | `422 — repo không có trong cấu hình` ✅ |
| chế độ trực | **không** | tự khởi 2 lượt chấm trên repo ma ❌ |
| bấm tay | không (đi qua `cfg.repo` đã bị suy đoán) | chưa đo |

Đường trực là đường **tự chạy, không ai bấm** — tức đường mà một lỗ hổng ở đó không cần ai làm gì để bị
khai thác, chỉ cần chờ. Nó cũng là đường duy nhất có thể chạy **khi không ai nhìn**.

## S1. Bí mật & rò rỉ

- ✅ S1.1 — Change không thêm giá trị bí mật nào. Nó ĐỌC danh sách repo (tên công khai), không đọc chìa.
  Chìa riêng vẫn ở kho khoá và vẫn lấy theo `repoKey(github)` như cũ.
- ⚠️ S1.2 — **Cần soi khi apply.** Thông điệp từ chối mới («chưa kết nối repo nào», «repo chưa khai») đi
  ra HTML và log. Chúng chỉ được chứa **tên repo**, không được kèm chìa hay đường dẫn clone. Ca T_bimat
  khoá điều đó.
- ✅ S1.3 — Không giá trị nào bị che trong change này.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — Không route mới, không đường đọc danh tính mới. Ba đường vào đã có đều nằm sau cửa phiên (trừ
  webhook, vốn có hai gác riêng của nó).
- ✅ S2.2 — Không bề mặt nào trả tài khoản.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Change chỉ THÊM một phép chặn, không mở đường nào. Không đụng `gate.ts`/`cong.ts`.
- ✅ S3.2 — **Siết quyền của vai `tu_dong`, không nới.** Chế độ trực là đường máy tự chạy; sau change nó
  không còn chấm được repo chưa khai. Ba công tắc tự động (`truc_comment` · `truc_trang_thai` ·
  `truc_tra_ve`) giữ nguyên nghĩa và mặc định.
  Đáng ghi: `truc_tra_ve` **tự ĐÓNG pull request**. Trước change, một repo ma lọt vào đường trực nghĩa là
  máy có thể tự đóng pull request của một repo không ai khai. Không xảy ra trên prod vì repo ma đó không
  có chìa ghi — nhưng chuỗi ấy tồn tại, và nó chỉ đứt ở một mắt xích không ai cố ý dựng.

## S4. Dữ liệu không tin cậy & prompt injection

- ✅ S4.1 — Tên repo trong payload webhook vẫn qua đúng đường kiểm hình dạng đã có
  (`decideWebhookAction`); change chỉ thay biểu thức đối chiếu bằng hàm dùng chung, không nới phép kiểm.
- N/A S4.2 — Không gọi model, không thêm gì vào prompt.

## S5. Sandbox & thực thi

- ✅ S5.1 — **Đây chính là chỗ change có tác dụng.** Code repo đích chạy trong sandbox worktree; change
  làm cho sandbox ấy **không được dựng** cho một repo chưa khai. Nó không đổi cách sandbox chạy, nó đổi
  việc nó có được dựng hay không.
- ✅ S5.2 — Không đụng đường dọn worktree.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — Không file mới, không cột mới, không đổi quyền.
- ✅ S6.2 — **Không ghi vào `config.json` lúc khởi động.** Change chỉ đổi cách ĐỌC. Một bản cài có
  `repos: []` không bị sửa file; nó chỉ thôi bị hiểu sai.

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — **Chiều nghiêng là điểm chính của change.** Trước: không biết repo nào ⇒ **đoán lấy một**.
  Sau: không biết repo nào ⇒ **từ chối**. Đó đúng ⛔C2 — «không chứng minh được là sai» ≠ «đã chứng minh
  là đúng», áp cho câu hỏi «repo này có được phép chấm không».
- ✅ S7.2 — Không đụng đường đếm hồi quy, không đụng nhãn máy dán, không sinh verdict nào.
- ⚠️ S7.3 — **Chiều nghiêng NGƯỢC cũng phải canh.** Nghiêng quá tay thì cấu hình đời cũ (chỉ có `repo`
  đơn lẻ, không có `repos`) bị đọc thành rỗng — người dùng cũ mất repo trên giao diện và mọi đường chấm
  từ chối. Đó là hại một chiều theo hướng khác. Ca T1.2 và mutation 7.6 canh đúng chiều ấy; đây là rủi ro
  nặng nhất của change.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 — **Liệt kê mọi đường tới mục tiêu «CheckMate chạy code của một repo không ai khai»:**
  (1) webhook với payload repo lạ · (2) chế độ trực đọc repo suy đoán · (3) bấm tay khi chưa có repo ·
  (4) `dsRepoTuLuu` bịa ra một repo từ danh sách rỗng. Đường (1) đã đóng từ trước; change đóng (2), (3),
  (4). Vá (4) mà bỏ (2) thì trực vẫn quét repo đang chọn nếu ai đó để lại một `repo` đời cũ trong file.
- ✅ S8.2 — **Load-bearing hai chiều.** Sáu chiều mutation ở `tasks.md` §7. Đặc biệt 7.5 (webhook dựng
  lại biểu thức riêng) và 7.6 (nghiêng quá tay làm mất repo đời cũ) — hai chiều đối xứng của cùng một luật.
- ✅ S8.3 — **Đối xứng.** Ca T5.1 đòi ba đường cho **cùng một quyết định** trên cùng đầu vào. Không có ca
  ấy thì «dùng chung một gác» là một lời hứa trong tài liệu, không phải một tính chất của mã nguồn — và
  chính lời hứa kiểu ấy đã sinh ra lỗ này.

## Notes

**Rủi ro không nằm ở mục nào ở trên: change này làm một trạng thái trước đây «không tồn tại» trở nên đạt
tới được, và mọi mã nguồn viết trước hôm nay đều chưa từng thấy nó.** 47 chỗ đọc repo đang chọn được viết
với giả định ngầm rằng luôn có một repo.

Đó là lý do change chọn để **`tsc` cưỡng chế** thay vì thêm phép kiểm ở từng chỗ: số chỗ trình biên dịch
bắt được chính là số đo của giả định ngầm ấy. Một danh sách kiểm tay sẽ bỏ sót, và chỗ bỏ sót sẽ không báo
lỗi — nó chỉ đọc `undefined.github` vào một ngày không ai ngồi cạnh.
