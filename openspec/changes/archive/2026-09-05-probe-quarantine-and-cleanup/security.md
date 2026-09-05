# Security — probe-quarantine-and-cleanup

Change này làm hai việc thuộc hai hạng rủi ro khác nhau, và trộn chúng trong một tài liệu là để mất chỗ
nguy hiểm nhất:

1. **Engine bỏ bớt phép thử rồi chạy tiếp** — đường tới XANH GIẢ, tức hướng hỏng nguy hiểm nhất của một
   cổng chấm. Đây là phần nặng.
2. **Nút phá huỷ đầu tiên trên một màn trước nay chỉ-đọc** — đường tới mất tài sản, một chiều.

## S0. Trục thật: cách ly là một quyết định BỎ BỚT BẰNG CHỨNG

Trước change, một probe hỏng làm lượt chấm chết — ồn ào, không ai hiểu nhầm. Sau change, lượt chấm **vẫn
ra verdict** với ít phép thử hơn. Đó là cải thiện, nhưng nó đổi một lỗi ỒN ÀO lấy một lỗi có thể IM LẶNG.
Cả tài liệu này xoay quanh việc giữ cho nó không im.

**Chỗ hỏng nguy hiểm nhất, đo được từ thiết kế:** cách ly theo triệu chứng «không nạp được» mà không hỏi
«trên nhánh nào» sẽ gỡ đúng những probe mà **PR vừa làm hỏng**. Một PR đổi tên module có thể làm hàng chục
probe thư viện không nạp được; cách ly hết rồi chạy tiếp thì PR ấy nhận PASS, và bằng chứng chống nó vừa
bị chính hệ thống dọn đi. Bảng ba hàng ở `design.md` D2 tồn tại cho đúng chỗ này.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 — **Cần soi khi apply.** Thông điệp lỗi nạp do Node/vitest sinh trên **repo đích**: nó mang
  đường dẫn sandbox, tên file, và có thể mang nội dung dòng code. Nó đi vào `ly_do` của dấu cách ly (lưu
  trên đĩa, lâu dài), vào log, và lên màn. Phải qua đúng đường che đã có (`redactMessage`), không dựng
  đường mới.
- ⚠️ S1.2 — Dấu cách ly nằm trong `meta.json` — file **ở lại lâu**, khác log xoay vòng. Một chuỗi lỡ mang
  bí mật ở đây sống rất lâu. Cắt độ dài `ly_do` và che trước khi ghi.
- ✅ S1.3 — Ba route hành động không đọc kho khoá; chúng chỉ chạm `probes-lib/`.
- ⚠️ S1.4 — Tên người thao tác (`boi`) ghi vào sổ. Đó là danh tính nội bộ, đã có trong sổ hành động cổng
  (`so_cong`) — không phải bề mặt mới, nhưng phải là **tên đăng nhập**, không kèm gì khác.

## S2. Danh tính, phiên, vai

- ⚠️ S2.1 — Ba route mới đọc danh tính để ghi `boi` và để kiểm vai. Phải đi qua **đúng một** hàm lấy danh
  tính đã có, không fallback, không nhận tên từ thân yêu cầu. Nhận `boi` từ client là để bất kỳ ai cũng ký
  tên người khác vào một hành động phá huỷ.
- ✅ S2.2 — Không route nào trả tài khoản, hash hay muối.
- ⚠️ S2.3 — Cần **ca tiêu cực thật** cho cả ba route: không phiên → chặn; vai `tu_dong` → chặn; vai
  `nguoi_xem` → chặn.

## S3. Cổng & quyền của máy

- ✅ S3.1 — **KHÔNG.** Change không thêm đường nào cho máy merge; ba route mới không chạm `mergePr`.
- ⚠️ S3.2 — **Vai `tu_dong` là trục chính ở mục này.** Nó là vai của tác nhân máy, và change này lần đầu
  thêm hành động **phá huỷ** vào bề mặt web. Chặn bằng `canOperate` — cùng cơ chế đã chặn nó ở cổng merge,
  không phải một phép kiểm mới phải nhớ. Có ca reproduce, không dismiss bằng suy luận.
- ⚠️ S3.3 — Cách ly là **máy tự quyết**. Nó được phép vì nó chỉ ĐÁNH DẤU: đảo ngược được, và không xoá gì.
  Ranh giới ấy phải có ca khoá — máy MUST NOT có đường nào xoá probe.

## S4. Dữ liệu không tin cậy & prompt injection

- ⚠️ S4.1 — Lời văn lỗi nạp là **dữ liệu ngoài**: nó do repo đích và Node sinh ra. Nhận diện lỗi nạp
  **MUST NOT** dựa vào nó (dựa vào hình dạng kết quả — `design.md` D1). Nếu dựa vào lời văn thì một repo
  đích cố ý in ra chuỗi giống lỗi nạp có thể điều khiển việc engine cách ly probe nào — tức tự chọn phép
  thử nào bị gỡ.
- ⚠️ S4.2 — Tên file trong `testResults[].name` đến từ vitest chạy trên repo đích. Đối chiếu nó với danh
  sách file **đã ghi vào sandbox**, không tin thẳng: một tên lạ MUST NOT trở thành một mục cách ly.
- ✅ S4.3 — Không thêm gì vào prompt; không gọi model.

## S5. Sandbox & thực thi

- ⚠️ S5.1 — Vòng chạy lại dựng **thêm** sandbox (tối đa 6 lượt ở ca xấu). Mỗi lượt phải `huy()` kể cả khi
  ném — đường dọn hiện có nằm ở `finally`, phải giữ nguyên hình dạng ấy khi thêm vòng lặp.
- ⚠️ S5.2 — Chạy lại nhiều vòng làm tăng thời gian giữ tài nguyên. Trần 2 vòng là cái chặn; nó phải là
  hằng có test khoá, không phải một con số rải trong code.
- ✅ S5.3 — Không chạy thêm loại code nào mới; vẫn là probe trong sandbox worktree như cũ.

## S6. Tầng dữ liệu & quyền file

- ⚠️ S6.1 — `purge` **xoá cả một thư mục** dưới `probes-lib/`. Đường dẫn phải dựng từ slug của repo ĐANG
  CHỌN, không bao giờ từ tham số yêu cầu — cùng bài học với `readProbeCode` ở change trước, và ở đây hậu
  quả là xoá đệ quy chứ không phải đọc nhầm.
- ⚠️ S6.2 — Ghi sổ TRƯỚC, xoá file SAU. Ngược lại thì một lần xoá thành công + ghi sổ hỏng = mất tài sản
  không dấu vết.
- ✅ S6.3 — `meta.json` chỉ thêm trường tuỳ chọn; không di trú, bản sao lưu prod đọc được nguyên như cũ.
- ⚠️ S6.4 — ⛔C6: không thêm cache; sửa tay `meta.json` (gỡ dấu cách ly bằng tay) phải có hiệu lực ở lượt
  đọc kế tiếp. Đây là đường cứu hộ thật cho ca cách ly nhầm hàng loạt.

## S7. Fail-closed & bất biến verdict

- ⚠️ S7.1 — **Trục nặng nhất.** Change làm engine đi tiếp ở một ca trước đây nó dừng. Mọi nhánh mới phải
  nghiêng đúng chiều: hết trần → **thất bại**, không verdict. Không nhánh nào biến «không chạy được» thành
  «không có finding».
- ⚠️ S7.2 — Probe bị cách ly MUST NOT được đếm là `pass`, và MUST NOT làm mẫu số của bất kỳ tỉ lệ nào nhỏ
  đi trong im lặng. `probe_stats.cach_ly` là chỗ nó phải hiện.
- ⚠️ S7.3 — Probe hỏng MUST NOT bị đếm nhầm thành bằng chứng hồi quy: lỗi nạp không phải test fail (T1.2).

## S8. Leo quyền & cô lập (per-vector)

- ⚠️ S8.1 — **Mọi đường tới mục tiêu «xoá probe của người khác / xoá tài sản»:**
  (1) `POST /api/probes/purge` không có phiên · (2) có phiên nhưng vai `tu_dong` · (3) có phiên, vai đủ,
  nhưng gõ sai tên repo · (4) tham số trỏ slug của repo KHÁC repo đang chọn · (5) đường tự động của engine
  gọi thẳng hàm xoá. Năm đường, và vá một đường không đóng cả lớp — đặc biệt (4) và (5).
- ⚠️ S8.2 — **Load-bearing hai chiều, bắt buộc.** Mutation §9: bỏ kiểm vai → ca ĐỎ; `purge` thôi đòi gõ
  tên repo → ca ĐỎ; cách ly cả file chỉ hỏng trên nhánh PR → ca ĐỎ.
- ⚠️ S8.3 — **Đối xứng giữa hai đường chạy.** `chayTheoRunner` đã cô lập theo file; `chayVitest` sau change
  cũng cô lập. Nếu hai đường xử lý lỗi nạp khác nhau thì kết quả chấm phụ thuộc vào việc repo đích có khai
  runner hay không — đúng khuôn «hai cửa cùng vai» đã bị bắt chín lần ở repo này. Cần một ca đòi cùng
  quyết định trên cùng đầu vào.

## Notes

**Rủi ro không nằm ở mục nào ở trên: change này dạy hệ thống một phản xạ mới — «gặp trở ngại thì bỏ bớt
phép thử rồi đi tiếp».** Phản xạ ấy đúng cho ca đang sửa, và nguy hiểm nếu về sau ai đó nới nó ra: bỏ bớt
probe chạy quá lâu, bỏ bớt probe hay flaky, bỏ bớt probe làm verdict xấu. Mỗi bước đều hợp lý một mình, và
điểm đến là một cổng chấm chỉ chạy những phép thử dễ.

Cái giữ ranh giới không phải thiện chí mà là hai điều kiện hẹp, phải giữ nguyên: **chỉ lỗi NẠP** (không
phải fail, không phải chậm), và **chỉ khi hỏng trên NHÁNH GỐC** (độc lập với PR). Bất kỳ change sau nào
nới một trong hai vế ấy phải bị đọc như một đề nghị hạ tiêu chuẩn của cổng, không phải một tối ưu.
