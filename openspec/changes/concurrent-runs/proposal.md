# Proposal — concurrent-runs: backfill luật chạy song song, gộp nợ #10

## Why

CheckMate chấm nhiều PR cùng lúc. Bốn thứ giữ cho việc đó không hỏng — **trần lượt đồng thời**, **một PR
một lượt**, **ref git riêng theo PR**, **môi trường tiến trình con dựng bằng danh sách cho phép** — đang
thi hành mà phần lớn không có test khoá đúng chỗ quyết định.

Đo 03/09:

| điều | cưỡng chế | test hôm nay |
|---|---|---|
| R8.1 trần 2 lượt (bấm tay → 429, chế độ trực → ngừng nạp) | `server.ts:671`, `:284` | chỉ nửa dữ liệu (`runningCount`, `kho-run.test.ts`) |
| **nợ #10** một PR một lượt (409) | `server.ts:706` | chỉ nửa dữ liệu (`isPrRunning`) |
| R8.3 ref riêng theo PR | `github.ts:415, :418` | **không** |
| R8.10 sandbox chạy trên máy chủ CheckMate | tính chất kiến trúc | **không** |
| R8.11–R8.12 env danh sách CHO PHÉP | `sandbox.ts:23-36`, `model.ts:76` | `env-cli.test.ts` (một phần) |

Nợ #10 gộp vào đây theo PO chốt 03/09: nó **không có luật nào khai** (grep cả `openspec/specs/` lẫn R8 —
không điều nào nói «hai lượt trên cùng một PR bị chặn»), nên làm change fix riêng sẽ khoá bằng test một
hành vi chưa được khai, rồi `concurrent-runs` lại chạm đúng chỗ đó lần nữa.

## What Changes

- **`apps/web/src/runs.ts`** (hoặc file thuần cạnh nó): `evaluateStartRun({ soDangChay, tran, prDangChay })`
  → `{ chay: true } | { chay: false; ma: 429 | 409; lyDo: 'qua_tai' | 'pr_dang_cham' }`. Hai gác ở
  `/api/runs` gọi nó; lời văn (HTML và JSON) giữ NGUYÊN từng chữ ở chỗ gọi.
- **Chế độ trực dùng cùng hàm** — hôm nay nó viết lại điều kiện bằng tay (`server.ts:284-285`), tức hai
  chỗ quyết cùng một luật; đó đúng khuôn «cửa song sinh» đã bị bắt chín lần.
- **Trần là hằng có tên** (`TRAN_SONG_SONG = 2`) thay ba chỗ viết `>= 2`; KHÔNG làm nó cấu hình được —
  đó là đổi hành vi, ghi thành nợ.
- **Capability `concurrent-runs`** 4 requirement; thân ghi mã gốc để probe thư viện neo lại.
- **Test**: `test/concurrent-runs.test.ts` (mới) cho hàm thuần + ref riêng theo PR + môi trường; mở rộng
  `env-cli.test.ts` cho R8.12 (danh sách cho phép, không phải danh sách cấm).
- **Bảng tra**: R8 · R8.1 · R8.2 · R8.3 · R8.10 · R8.11 · R8.12 `pending` → `housed` (ở commit archive).

## Bảng phân xử từng điều

| mã | phân xử | cưỡng chế | bỏ thì hỏng gì |
|---|---|---|---|
| R8.1 trần đồng thời | giữ | `server.ts:671`, `:284` | máy chủ nhận vô hạn lượt, mỗi lượt một worktree + một lượt chạy test thật |
| R8.2 vì sao có trần | **gộp** vào «Vì sao» của requirement 1 — là lý lẽ, không phải hành vi | — | mất lý do, người sau nâng trần như tinh chỉnh giao diện |
| **nợ #10** một PR một lượt | giữ, **khai thành luật lần đầu** | `server.ts:706` | hai verdict trùng trên cùng commit, tốn model gấp đôi |
| R8.3 ref riêng theo PR | giữ | `github.ts:415, :418` | lượt sau force-update ref gốc → lượt trước đối chứng nhầm commit, verdict ra trên đối chứng sai |
| R8.10 nơi chạy sandbox | **gộp** vào requirement 4 (nơi chạy + môi trường) | kiến trúc | — |
| R8.11 tiến trình test nhận env đã lọc | giữ | `sandbox.ts:23-36` | code PR chạy thật đọc được token của checker |
| R8.12 danh sách CHO PHÉP không phải danh sách cấm | giữ + mang án lệ | `sandbox.ts`, `model.ts:76` | thêm một khoá vào file môi trường là rò thêm một bí mật, không ai phải sửa code nên không ai thấy |

Chín điều: 7 giữ · 2 gộp · 0 bỏ.

## Capabilities

### New Capabilities

- `concurrent-runs`: trần lượt đồng thời, một PR một lượt, ref git riêng theo PR, nơi chạy và môi trường
  của tiến trình con.

### Modified Capabilities

Không có.

## Luật chạm tới

- **Luật chạm tới:** `concurrent-runs › Trần lượt chạy đồng thời, vượt trần thì từ chối ngay chứ không xếp
  hàng ngầm` · `concurrent-runs › Một pull request chỉ có một lượt chấm đang chạy` ·
  `concurrent-runs › Lượt chấm không dùng chung ref git` ·
  `concurrent-runs › Sandbox chạy trên máy chủ CheckMate với môi trường dựng bằng danh sách cho phép`
  (ADDED) · ⛔C3 (nêu, không đổi — R8.11/R8.12 là một đường bảo vệ nó) · hàng bảng tra R8 · R8.1–R8.3 ·
  R8.10–R8.12 → `housed`; nợ #10 rời `named-debts`.

## Impact

- `apps/web/src/runs.ts` (hàm thuần + hằng trần) · `apps/web/src/server.ts` (hai gác + chế độ trực gọi
  hàm) · `checkmate.yml` bảng module (⛔C5).
- `test/concurrent-runs.test.ts` (mới) · `test/env-cli.test.ts` (mở rộng) · `docs/r-rules-map.md` (7 hàng).
- Không chạm engine chấm, không chạm verdict, không chạm cổng merge.
