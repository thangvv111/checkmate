# Design — concurrent-runs

## Context

Đo 03/09 trên `main` (`30c1329`):

```
tran dong thoi   server.ts:671  if (rm.runningCount() >= 2) -> 429 «dang ban» (duong bam tay)
                 server.ts:284  if (rm.runningCount() >= 2) break;   (che do truc)
mot PR mot luot  server.ts:706  if (rm.isPrRunning(pr.so)) -> 409, HAI loi khac nhau (JSON / HTML)
                 server.ts:285  if (rm.findByPr(...) || rm.isPrRunning(p.so)) continue;  (che do truc)
ref rieng        github.ts:415  refs/checkmate/pr<so> · :418  refs/checkmate/base-pr<so>
moi truong       sandbox.ts:23-36  ENV_CHO_PHEP + envSandbox()   ·   model.ts:76  envForCli()
test hom nay     kho-run.test.ts  runningCount/isPrRunning (nua DU LIEU)
                 env-cli.test.ts  envForCli (mot phan R8.11)
```

Ba chỗ viết `>= 2` bằng tay; hai chỗ quyết «PR này có đang chạy không» bằng hai biểu thức riêng. Đó là
khuôn cửa-song-sinh, và là lý do hai gác không khoá được bằng test.

## Goals / Non-Goals

**Goals**
- Bốn luật có requirement + scenario + test chạy được; lời văn giữ nguyên từng chữ.
- Một nguồn cho trần và cho quyết định khởi động, dùng chung giữa đường bấm tay và chế độ trực.
- Không đổi hành vi nào.

**Non-Goals**
- KHÔNG làm trần cấu hình được (đổi hành vi + đụng vận hành) — ghi nợ.
- KHÔNG đụng R8.4–R8.9 (khoá thư viện probe) — thuộc change `probe-library`.
- KHÔNG đổi danh sách `ENV_CHO_PHEP`.

## Decisions

### D1 — `evaluateStartRun` là hàm thuần, trả QUYẾT ĐỊNH chứ không trả lời văn

```
evaluateStartRun({ soDangChay, tran, prDangChay })
  -> { chay: true }
   | { chay: false; ma: 429; lyDo: 'qua_tai' }
   | { chay: false; ma: 409; lyDo: 'pr_dang_cham' }
```

Chỗ gọi dựng lời: đường bấm tay có HAI bề mặt (HTML và JSON) với hai câu khác nhau, nên hàm trả `lyDo` +
`ma` và để chỗ gọi chọn câu — giống khuôn `decideRerun` của nợ #9, khác `evaluateMergeLocal` (ở đó chỉ một
bề mặt nên hàm trả luôn `message`).

**Thứ tự gác là hợp đồng**: trần đồng thời (429) đứng TRƯỚC một-PR-một-lượt (409). Gác rẻ hơn và chung hơn
đứng trước — người dùng cần biết «hệ đang bận» chứ không phải «PR này đang chạy» khi cả hai đều đúng.

### D2 — Chế độ trực dùng CHUNG hàm đó

Hôm nay chế độ trực viết lại điều kiện bằng tay (`server.ts:284-285`). Sau change, nó gọi
`evaluateStartRun` với cùng đầu vào; riêng phần `findByPr` (đã chấm commit này rồi) giữ nguyên ở chế độ
trực vì đó là luật khác (`merge-gate` › «một verdict một commit»), không thuộc capability này.

### D3 — `TRAN_SONG_SONG` là hằng có tên, KHÔNG cấu hình được

Ba chỗ `>= 2` thành một hằng export. Làm nó cấu hình được là **đổi hành vi** (R8.2 nói rõ nâng trần là
quyết định tài nguyên máy chủ) — ngoài phạm vi backfill; ghi nợ có tên.

### D4 — R8.3 và R8.10–R8.12: khai luật, không sửa code

Ba điều này code đã đúng và có chỗ cưỡng chế rõ. Việc của change là **khai thành luật** + thêm test còn
thiếu (ref riêng theo PR chưa có ca nào; R8.12 «danh sách cho phép chứ không phải danh sách cấm» chỉ được
kiểm gián tiếp). Không refactor gì ở `sandbox.ts` và `github.ts`.

### D5 — Test cho R8.3 không cần git thật

Ca cần khoá là «tên ref mang số PR, cả head lẫn base». Đó là tính chất của chuỗi dựng ref, kiểm bằng cách
đọc mã nguồn thì yếu (grep). Cách chắc: tách hai chuỗi thành hàm thuần nhỏ `refNames(so)` →
`{ headRef, baseRef }`, test gọi thẳng. Đây là refactor tối thiểu, cùng khuôn với các change trước.

## Architecture

- `apps/web/src/runs.ts`: `TRAN_SONG_SONG`, `evaluateStartRun` (thuần).
- `apps/web/src/github.ts`: `refNames(so)` (thuần) — `fetchAndRoute` gọi.
- `apps/web/src/server.ts`: hai gác `/api/runs` + chế độ trực gọi hàm.
- `checkmate.yml` bảng module (⛔C5). Engine (`packages/harness`) không đổi.

## Data Model

N/A — không đổi bảng, không đổi file trên đĩa.

## Risks / Trade-offs

- [Refactor đổi thứ tự hai gác] → ca test «thứ tự hai gác» khoá; mutation đảo thứ tự phải làm lưới đỏ.
- [Chế độ trực đổi hành vi khi dùng chung hàm] → ca test cho cả hai đường với cùng đầu vào; `findByPr` giữ
  nguyên chỗ cũ.
- [`refNames` tách ra rồi chỗ gọi vẫn tự nối chuỗi] → grep sau refactor: không còn `refs/checkmate` viết tay.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
