## Why

CheckMate là **sản phẩm độc lập**, sẽ phục vụ luồng làm việc của mọi dự án sắp tới (PO chốt 02/09).
Nhưng engine đang **ép repo đích phải có hình dạng của chính nó**: spec phải nằm ở `specs/`, phải là
`.md`, phải phẳng, và luật phải mang mã ngắn kiểu `R4.21`.

Bằng chứng đo được, không phải lo xa:

- `demo-credit-approval/specs/spec-phe-duyet.md` mở đầu bằng `## R1 —`, `## R2 —`. Nó có đúng 8 mã
  vì engine đi tìm `[A-Z]{1,3}\d{1,3}`. **Repo demo được viết để vừa CheckMate, không phải ngược lại.**
- `repos/thangvv111-checkmate/` — repo đích thứ hai đang cấu hình — đứng ở commit mà `specs/` **chưa
  tồn tại**. Nên prompt sinh probe nhận dòng «mọi probe phải neo vào một luật ở đây» rồi **một khối
  rỗng**. Không cảnh báo nào: `specs.length` chỉ được log, không có guard.

Và hỏng đó **im lặng**. Repo không dùng mã `R**` thì cổng vẫn chạy, vẫn ra verdict, vẫn cho merge —
chỉ có độ phủ luật hoá vô nghĩa và nhãn `vi_pham_luat_moi` **không bao giờ bật**, tức cả một lớp bảo
vệ tắt mà không ai biết. Đó là verdict trông giống hệt nhau ở hai mức tin cậy khác hẳn nhau.

## What Changes

1. **Nguồn spec cấu hình được.** `checkmate.yml` của repo đích khai spec nằm ở đâu, dạng gì (nhiều
   đường, có glob, đệ quy). Không khai → engine **tự dò** theo thứ tự thông dụng và **nói ra nó đã
   tìm ở đâu, thấy gì**.
2. **Đơn vị luật tổng quát.** Bỏ giả định «luật = mã ngắn». Đơn vị = **khối dưới một tiêu đề**, địa
   chỉ = **đường tiêu đề**. Mã `R4.21` trở thành trường hợp riêng — tiêu đề tình cờ mở đầu bằng mã.
3. **Luật-mới so theo KHỐI, không so theo mã.** `findNewRules` hiện diff mã giữa hai nhánh; đổi thành
   diff đơn vị. Tổng quát hơn mà không mất khả năng nào.
4. **Chấm không có spec là một TRẠNG THÁI KHAI RA, không phải một sự im lặng** (PO chốt vế hai).
   Vẫn chấm — nhiều repo thật không có spec viết ra, từ chối thẳng thì sản phẩm không vào được cửa —
   nhưng verdict và màn Run phải nói rõ lượt này chấm **không có luật đối chiếu**, và độ phủ khai là
   **không đo được** chứ KHÔNG phải `0`.
5. **Tài liệu API và file test mẫu cũng cấu hình được** — hết ép `README.md` và `test/`.
6. **Gỡ án lệ nội bộ khỏi prompt sản phẩm.** Prompt chấm tài liệu đang nhắc `specs/R12` của chính
   CheckMate trong lượt chấm PRD của người khác.
7. **Sửa nhãn bước sai số.** Bước 2 của skill doc ghi «4 loại lỗi khách quan» trong khi rubric có
   **bảy**. Người dùng đọc nhãn rồi tin mình đang được chấm 4 thứ.

`demo-credit-approval` vẫn phải đọc được — nhưng đó là **hệ quả**, không phải ràng buộc định hình
(PO chốt): nó là một ca ví dụ về cách sản phẩm hoạt động, không phải thứ quyết định sản phẩm là gì.

## Capabilities

### New Capabilities
- `spec-source`: engine lấy luật từ repo đích ra sao — nguồn ở đâu, đơn vị là gì, và nói gì khi không
  tìm được.

### Modified Capabilities
- `man-run`: verdict và màn Run phải khai được tình trạng nguồn spec, và phân biệt «độ phủ = 0» với
  «độ phủ không đo được».

## Luật R chạm tới

- **Luật R chạm tới:** **KHÔNG.** Change này không sửa, không thêm, không xoá điều nào trong
  `specs/R*.md`.

Ô này hay bị đọc nhầm ở đúng change này, nên nói tách bạch — có **hai** thứ mang chữ `R`, và chúng
không liên quan nhau:

| | Là gì | Change này làm gì với nó |
|---|---|---|
| `specs/R*.md` | Tài liệu luật cũ **của chính CheckMate**. PO đã hạ xuống tài liệu tham khảo (01/09). | **Không đụng.** |
| Lối đánh mã `R4.21` | Khuôn mà engine đang **ép repo đích** phải viết spec theo. | **Gỡ bỏ** — đây là nội dung chính của change. |

Chúng chỉ tình cờ chung một chữ cái. Cái thứ nhất là tài liệu nội bộ; cái thứ hai là một giả định
nằm trong code (`extractRuleIds`) áp lên repo của người khác.

Luật của change này sống ở ba chỗ, không chỗ nào là `specs/R*.md`:

- **hành vi** → `openspec/specs/spec-source/`
- **hằng + validate** → `packages/harness/src/target.ts`, có test khoá
- **khoá cấu hình** → `checkmate.yml`

## Impact

- `packages/harness/src/target.ts` — `readTarget` · `extractRuleIds` · `findNewRules`: nguồn spec,
  đơn vị luật, so hai nhánh. Đây là ổ của cả bảy chỗ hard-code.
- `packages/harness/src/runner.ts` — `checkmate.yml` thêm mục khai nguồn spec / api doc / test mẫu.
- `packages/harness/src/skill-code.ts` — `isNewRule`, `luat_da_phu`/`luat_tong`, và prompt sinh probe
  khi không có spec.
- `packages/harness/src/skill-doc.ts` — gỡ tham chiếu `specs/R12`; sửa nhãn bước 2.
- `packages/harness/src/probe-library.ts` — `chuanRule` so địa chỉ đơn vị, không chỉ so mã.
- `packages/shared/src/types.ts` — thêm trường **tuỳ chọn** khai tình trạng nguồn spec vào `Verdict`.
- `apps/web/src/ui.ts` — bảng số liệu verdict và màn Run bày tình trạng đó.
- `checkmate.yml` (của chính repo này) — khai nguồn spec, làm ca dùng thật đầu tiên.
