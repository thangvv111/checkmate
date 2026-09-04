# Security — settings-screen-ccs

Màn Cấu hình là **chỗ duy nhất người vận hành gõ bí mật vào sản phẩm** (token GitHub của từng repo, khoá
API nhà cung cấp, token gói thuê bao). Nó cũng là chỗ duy nhất chỉnh được một con số **xoá được dữ liệu
prod**. Hai trục ấy là toàn bộ rủi ro thật của change.

## S0. Hai trục thật

**(a) Ô nhập bí mật.** ⛔C3 nói giá trị người dùng gõ tay vào ô cấu hình không được vọng nguyên văn ra
thông điệp lỗi, log, sổ trên đĩa, verdict, hay comment PR. Change dựng lại khối Repo, tức **dựng lại đúng
chỗ token đi qua**.

**(b) Ô nhập xoá được tài sản.** Trần thư viện probe điều tiết `probes-lib/`. Một con số nhỏ hơn = đào
thải probe, và đào thải là một chiều.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 — **Trục chính.** Bí mật đi qua màn này: token GitHub per-repo · khoá API nhà cung cấp · token
  gói thuê bao. Change dựng lại card repo, nơi token **đã che** được hiển thị. Việc phải làm: card mới
  dùng đúng đường che đang có (`maskToken` / `maskToken2` ở `apps/web/src/config.ts`), **không** tự cắt
  chuỗi tại chỗ. Một phép cắt tại chỗ là bản che thứ hai, và bản che thứ hai luôn là bản lệch.
- ✅ S1.2 — Không bề mặt công khai nào mới. Change không đụng comment PR, không đụng thân commit merge.
- ⚠️ S1.3 — **Bản che phải PHÂN BIỆT được hai giá trị khác nhau** (R5.20). `maskToken2` giữ đầu và đuôi
  nên hai token khác nhau cho hai bản che khác nhau. Card mới phải dùng chính nó; ca T_bimat khoá điều đó.
  Che trần theo độ dài (`ghp_****`) thì hai repo dùng nhầm chìa của nhau nhìn giống hệt — người vận hành
  không phát hiện được bằng mắt, mà mắt là công cụ duy nhất họ có ở màn này.
- ✅ S1.4 — Giá trị người dùng gõ vào ô **trần thư viện** và ô **độ sâu** là số, không phải bí mật. Nhưng
  chúng vẫn phải qua `escHtml` khi đổ lại vào HTML: một ô số cũng nhận được chuỗi khi người ta sửa URL.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — Route `/settings` đã nằm sau cửa phiên; change không thêm route.
- ✅ S2.2 — Không route nào trả tài khoản/hash/muối. Change không đụng khối tài khoản.
- ✅ S2.3 — Chế độ chỉ-đọc: mọi ô mới phải nhận `disabled` từ cùng biến `ro` như các ô hiện có. Ô mới quên
  `disabled` là một đường sửa cấu hình ở bản deploy đáng lẽ không sửa được gì.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Change không thêm đường nào cho máy tự merge. Màn Cấu hình không có nút cổng.
- ⚠️ S3.2 — **Ba công tắc tự động nằm trên màn này** (`truc_comment` · `truc_trang_thai` · `truc_tra_ve`),
  và `truc_tra_ve` là công tắc **đóng pull request tự động**. Change dựng lại màn, nên rủi ro là **đảo
  mặc định** hoặc **gộp ba công tắc**: cấu hình đời cũ thiếu cờ phải đọc ra **tắt**, không phải bật. Ca
  T_cong giữ điều đó. Change này không đụng ba ô ấy — ghi ra để lượt review biết chỗ cần nhìn.

## S4. Dữ liệu không tin cậy & prompt injection

- ✅ S4.1 — Tên repo do người vận hành gõ đi vào HTML của card; qua `escHtml` như bản hiện tại. Không
  trường nào của màn này đi vào prompt.
- N/A S4.2 — Không tin thêm gì từ model.

## S5. Sandbox & thực thi

- N/A S5.1 / S5.2 — Màn Cấu hình không chạy code nào. Luồng clone repo (bốn bước) **không đổi** trong
  change này.

## S6. Tầng dữ liệu & quyền file

- ✅ S6.1 — Không file mới. `config.json` đã có, quyền do đường ghi hiện tại giữ; bí mật KHÔNG nằm trong
  `config.json` mà ở `.secrets.json` (600) — change không đổi ranh giới đó.
- ⚠️ S6.2 — **`config.json` nằm trong nhóm không-đè khi deploy.** Change thêm một trường vào nó. Việc phải
  làm: **không ghi vào `config.json` lúc khởi động**. Trường chỉ xuất hiện khi người vận hành bấm lưu; đọc
  cấu hình thiếu trường thì dùng mặc định trong bộ nhớ. Một lần deploy không được sửa file cấu hình của
  người ta, kể cả để «chuẩn hoá».

## S7. Fail-closed & bất biến verdict

- ✅ S7.1 — Nhánh khuyết duy nhất là giá trị ngoài khoảng, và nó **kẹp về biên**, không bỏ qua phép kiểm.
  Đáng chú ý chiều kẹp: `max_probe` hỏng phải kẹp về một số TRONG khoảng, không về 0 — 0 probe nghĩa là
  lượt chấm không thử gì mà vẫn chạy tới verdict.
- ⚠️ S7.2 — **Trần thư viện là một phép kẹp có hệ quả một chiều.** `probe-library` đã xử đúng: env rác thì
  dùng mặc định chứ không đoán (`'' → 0` sẽ kẹp về 6 rồi đào thải hàng loạt; `'abc' → NaN` làm
  `while (len > NaN)` luôn false, tức trần vô hiệu). Change **không được nới** phép kiểm ấy khi nối env
  vào; ca T2.4 khoá cả hai chiều rác.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 — **Mọi đường tới mục tiêu «một lần cập nhật xoá mất probe»:** (1) mặc định trường mới đặt thấp
  hơn trần đang áp · (2) đường di trú tự ghi trường vào `config.json` · (3) phép kẹp env dùng biên sai ·
  (4) env rác bị đọc thành số nhỏ. Change đóng (1) bằng T2.1, (2) bằng T2.2 và quyết định «không ghi lúc
  khởi động», (3)+(4) bằng T2.4. Vá (1) mà bỏ (2) thì trường vẫn bị ghi 40 vào file người ta.
- ✅ S8.2 — **Load-bearing hai chiều.** Bảy chiều mutation ở `tasks.md` §6; 6.2 (mặc định thành 40) là
  chiều tái tạo đúng cái hại một chiều, và nó phải ĐỎ.
- ✅ S8.3 — **Đối xứng.** Đổi màu «đã ngừng» sang trung tính thì phải soi đường đối xứng: chỗ nào ĐANG
  đúng khi dùng semantic (repo thiếu chìa) phải giữ nguyên. T4.1/T4.2 là cặp ấy — thiếu vế hai thì «không
  dùng semantic» xanh cả khi xoá sạch màu semantic khỏi màn.

## Notes

**Rủi ro không nằm ở mục nào ở trên: change này BÀY một con số nguy hiểm ra cho người ta chỉnh.** Trước
change, trần thư viện là hằng trong code — không ai hạ nhầm được. Sau change, nó là một ô nhập.

Đó là đánh đổi có chủ đích: người vận hành **phải** chỉnh được cái trần điều tiết tài sản của chính mình,
và một con số giấu trong code không phải là an toàn — nó chỉ là không-chỉnh-được. Cái giá được trả bằng
hint nói thẳng cái mất ngay tại ô nhập, và bằng việc mặc định không bao giờ tự hạ.
