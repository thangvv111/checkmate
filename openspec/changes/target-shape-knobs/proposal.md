## Why

Rà toàn bộ hằng cứng trong engine (06/09) lộ ra hai thứ, và thứ thứ hai mới là lý do change này tồn tại.

**Một —** vài hằng đang ép hình dạng của CheckMate lên repo đích ở những chỗ repo đích có quyền khác:
trần diff, độ sâu tiêu đề chia đơn vị luật, timeout test ở đường mặc định, tên file probe.

**Hai — và đây mới là cái chính:** `checkmate.yml` **nằm trong repo đang bị chấm**, nên mỗi khoá trong
đó là một núm **maker** chỉnh được trên **checker**. Repo đã có phản xạ đúng, nhưng **rời rạc**: luật
«đọc từ nhánh gốc» được khai ở `sandbox-isolation › Ảnh chạy do repo đích khai, và đọc từ NHÁNH GỐC` cho
riêng `image`, và lý lẽ của nó nói cùng luật áp cho `runner.test_cmd` và `sources.specs` — nhưng **không
capability nào phát biểu nó thành luật CHUNG cho mọi khoá**. Khoá mới thêm vào ngày mai thừa hưởng luật
ấy bằng may mắn, không bằng cơ chế. Cùng lúc, lớp phòng thứ ba — **khai lên verdict** — chưa có ở đâu.

Change này vừa gỡ mấy hằng ở nhóm một, vừa nâng ba lớp phòng thành **luật chung có lưới**.

## What Changes

- **Luật chung cho mọi khoá `checkmate.yml`:** kẹp dải · đọc từ nhánh gốc · khai lên verdict khi khoá
  làm đổi phép chấm. Kèm lưới bắt khoá mới không có đủ ba lớp.
- **Trần diff `TRAN_DIFF = 120_000`** (`target.ts:73`) → cấu hình được, kẹp dải. Đã là tham số mặc định
  (`tran = TRAN_DIFF`, `target.ts:148`) — chỉ thiếu nguồn cấu hình.
- **`MAX_UNIT_DEPTH = 3`** (`spec-units.ts:34`) → cấu hình được, kẹp dải. Cũng đã là tham số mặc định
  (`spec-units.ts:56`, `:114`). Đây là **mẫu số của độ phủ luật**, nên nó đổi thì con số độ phủ đổi
  nghĩa — phải khai lên verdict.
- **Đóng bất đối xứng hai đường chạy test — ĐÃ THU HẸP 07/09.** Nửa nặng (cửa song sinh: `chayVitest`
  cứng `300_000` ở lệnh cắt **và** cứng chuỗi `"300s"` ở thông điệp) **đã xong** ở change
  `probe-environment-preflight`, cùng với dải nới `[30, 3600]` và nguồn dùng chung `TIMEOUT_RANGE`. Còn
  lại đúng một mảnh: repo khai thời hạn mà **không** khai lệnh chạy test thì đường mặc định vẫn phải áp.
- **`FILE_PROBE_MOI`** (`skill-code.ts:55`) → đường mặc định dùng chung cửa với `runner.probe_file`.
- **BREAKING (không):** mọi khoá mới đều tuỳ chọn; không khai thì hành vi y hệt hôm nay.

**Cố ý KHÔNG làm — `RE_CODE` (`spec-units.ts:37`).** Bản rà đầu xếp nó là «ép định dạng `R**`». **Sai.**
Địa chỉ đơn vị luật lấy từ **tiêu đề** (`spec-units.ts:95`); mã chỉ là trường tuỳ chọn
(`RE_CODE_AT_START.exec(title)?.[1]` → `undefined` khi không khớp). Luật `spec-source › Luật là ĐƠN VỊ
CÓ ĐỊA CHỈ, không phải một mã có khuôn` đã được hiện thực **đúng**. Không có gì để sửa; ghi ra đây để
người sau không đi lại đường rà sai ấy.

## Capabilities

### New Capabilities

- `target-knob-defense`: luật chung cho mọi khoá `checkmate.yml` — ba lớp phòng, khi nào bắt buộc lớp
  nào, và lưới bắt khoá mới thiếu lớp.

### Modified Capabilities

- `diff-visibility`: trần diff thành khoá của repo đích — thêm requirement, không sửa
  «Vượt trần thì cắt tiếp theo hướng phủ nhiều nhất, và không bao giờ cắt xuống rỗng».
- `spec-source`: độ sâu chia đơn vị thành khoá của repo đích, và ảnh hưởng của nó lên **mẫu số độ phủ**
  phải khai ra — thêm requirement, không sửa «Luật là ĐƠN VỊ CÓ ĐỊA CHỈ».
- `target-contract`: repo đích khai được thời hạn cho cả đường mặc định — phần còn lại sau khi cửa song
  sinh đã đóng ở `probe-environment-preflight` (07/09).

## Luật chạm tới

- **Luật chạm tới:**
  - `target-knob-defense › *` — capability mới, mọi requirement ADDED.
  - `diff-visibility › Trần diff là khoá của repo đích, kẹp dải và khai lên verdict` — ADDED.
  - `spec-source › Độ sâu chia đơn vị là khoá của repo đích, và mẫu số độ phủ phải khai theo nó` — ADDED.
  - `target-contract › Repo đích khai được thời hạn chạy test cho CẢ đường mặc định` — ADDED (đã thu hẹp).
  - **⛔C4** — trục chính của change: `checkmate.yml` là dữ liệu ngoài **do bên bị chấm viết**.
  - **⛔C2** — mọi khoá hỏng/ngoài dải phải rơi về mặc định **nghiêm hơn**, không được biến thành PASS.
  - **⛔C5** — export mới phải khai vào bảng module.
  - `sandbox-isolation › Ảnh chạy do repo đích khai, và đọc từ NHÁNH GỐC` — **không sửa**; capability mới
    nâng đúng luật ấy thành luật chung, và trỏ về nó làm tiền lệ.

## Impact

| file | đổi gì |
|---|---|
| `packages/harness/src/runner.ts` | cửa đọc khoá hình dạng + hàm kẹp dải dùng chung cho mọi khoá |
| `packages/harness/src/target.ts` | `TRAN_DIFF` (:73) nhận nguồn cấu hình qua tham số đã có (:148) |
| `packages/harness/src/spec-units.ts` | `MAX_UNIT_DEPTH` (:34) nhận nguồn cấu hình qua tham số đã có (:56, :114) |
| `packages/harness/src/sandbox.ts` | `chayVitest` (:305, :311) dùng khoá timeout — **một** chỗ giữ con số, không hai |
| `packages/harness/src/skill-code.ts` | `FILE_PROBE_MOI` (:55) qua cùng cửa với `runner.probe_file` |
| `packages/shared/src/types.ts` | verdict khai các khoá hình dạng đã áp + nguồn |
| `test/` | lưới bắt khoá `checkmate.yml` mới thiếu một trong ba lớp phòng |
