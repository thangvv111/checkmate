## Why

**Mọi lượt chấm CODE trên prod đang hỏng ở bước sandbox.** Phát hiện 07/09 khi chạy lượt thật sau khi
deploy change `finding-cap-and-density-standard`; lượt code cuối cùng thành công là PR #7 ngày **26/08**,
trước khi `container-isolated-probe-runs` archive (05/09). Nhiều khả năng là hồi quy của change ấy, lộ ra
muộn vì giữa hai mốc không lượt code nào chạy tới bước sandbox.

Hai trạng thái, cả hai đều hỏng:

| trạng thái bản clone repo đích | lỗi |
|---|---|
| **không có** `node_modules` | `npx vitest` đi tải từ registry, container không có mạng ⇒ `EAI_AGAIN registry.npmjs.org` |
| **có** `node_modules` (sau `npm install`, PO duyệt 07/09) | `ENOENT: mkdir '/work/node_modules/.vite-temp'` |

Nguyên nhân gốc: `sandbox.ts:188` bật `--read-only` và `:201` mount `node_modules` **`:ro`**, trong khi
vite phải **ghi** một file bundle tạm vào `node_modules/.vite-temp` để nạp `vitest.config.ts`. Chú thích ở
đầu `vitest.config.ts` từng vá một nửa vấn đề (bỏ mọi `import` để khỏi giải `vitest/config` qua junction)
nhưng không chạm tới nhu cầu GHI.

Đã **kiểm chứng trên prod trước khi viết hồ sơ này** (podman dựng tay, cùng ảnh, cùng trần tài nguyên,
cùng bộ mount như engine):

| | |
|---|---|
| A — như hiện nay | hỏng ở `/work/node_modules/.vite-temp` |
| B — thêm `--tmpfs /work/node_modules/.vite-temp` | `JUNIT report written to /work/out-b.xml` — **chạy được** |

## What Changes

- `buildContainerArgs` thêm **một** mount `tmpfs` lên `/work/node_modules/.vite-temp`, chỉ khi có thư mục
  phụ thuộc được đưa vào (không có `node_modules` thì không có gì để phủ).
- **BREAKING (luật, không phải API):** `sandbox-isolation › Không đường ghi nào ra ngoài thư mục của lượt
  chạy` nay cho phép một **danh sách ĐÓNG** đường con ghi được bên trong thư mục phụ thuộc, và chỉ qua lớp
  phủ **tạm, trong bộ nhớ, không bền**. Trước change, luật khai `node_modules` chỉ-đọc **không ngoại lệ**.
- Ca chạy thật hai chiều trong lưới: bỏ mount ⇒ lượt code hỏng; có mount ⇒ JUnit XML ra.

**KHÔNG đổi:** `--read-only` của rootfs · `:ro` của chính `node_modules` · mạng vẫn tắt · ba trần tài
nguyên · `:Z,U` của thư mục lượt chạy. Không mount nào khác được thêm.

**Đường đã cân nhắc và loại:**

| đường | vì sao loại |
|---|---|
| đổi `vitest.config.ts` → `.js` thuần để vite khỏi bundle | sửa **repo đích** thay vì sửa công cụ chấm; mất `as const`; và mỗi repo đích khác lại phải tự sửa — CheckMate phục vụ nhiều đội |
| nới mount thành `:rw` | ⛔ đối tượng bị chấm **sửa được thư viện** của chính nó giữa hai nhánh, làm hỏng phép đối chứng; đúng thứ luật cô lập sinh ra để chặn |
| `--userns=keep-id` | không liên quan nguyên nhân; và đã bị loại từ trước vì thoát container là thoát ra thành tài khoản dịch vụ |

## Capabilities

### New Capabilities

*(không có)*

### Modified Capabilities

- `sandbox-isolation`: requirement «Không đường ghi nào ra ngoài thư mục của lượt chạy» — MODIFIED. Thêm
  vế danh sách đóng đường con ghi được qua lớp phủ tạm; giữ nguyên mọi vế còn lại và cả bốn scenario cũ.

## Luật chạm tới

- **Luật chạm tới:**
  - `sandbox-isolation › Không đường ghi nào ra ngoài thư mục của lượt chạy` — **MODIFIED**. Đây là vế
    duy nhất của change; nó nới một bất biến cô lập nên phải đi qua schema `checkmate`, không phải
    `checkmate-fix-bug`.
  - **⛔C4** — trục chính: thứ chạy trong sandbox là **code của repo đích**, tức dữ liệu ngoài. Nới chỗ
    ghi là nới đúng bề mặt ⛔C4 gác, nên phải là danh sách đóng và phải không bền.
  - **⛔C2** — không đổi: mount thiếu hay tmpfs hỏng thì lượt chấm **lỗi**, MUST NOT thành PASS.
  - `sandbox-isolation › Code của artifact đang chấm chạy trong môi trường CÔ LẬP dùng-một-lần` — **không
    sửa**; lớp phủ tạm biến mất cùng container nên tính dùng-một-lần còn nguyên.
  - `target-contract › JUnit XML là hợp đồng kết quả` — **không sửa**; change này khôi phục năng lực đạt
    hợp đồng ấy, không đổi hợp đồng.

## Impact

| file | đổi gì |
|---|---|
| `packages/harness/src/sandbox.ts` | `buildContainerArgs` (:180–203) thêm `--tmpfs` khi `spec.thuMucPhuThuoc` có mặt; hằng nêu tên đường con, không rải chuỗi |
| `test/sandbox-isolation.test.ts` | ca hai chiều cho `buildContainerArgs`; cặp fixture cho lưới quét nếu thêm hàm quét |
| `openspec/specs/sandbox-isolation/spec.md` | qua delta của change (archive mới ghi vào đây) |
| `DEPLOY.md` | ghi lại rằng clone repo đích **phải có `node_modules`** — thiếu nó thì sandbox đi tải và chết vì không có mạng |
