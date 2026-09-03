# Proposal — error-message-egress-gate

## Why

Thông điệp lỗi do **bộ chạy test của repo đích** sinh ra đi **nguyên văn** ra ba bề mặt rời khỏi máy chủ,
không qua lớp che nào:

```
repo dich chay test THAT trong sandbox
        |
        v
  ProbeResult.message              loiThu (stderr/stdout)
  runner.ts:149   1500 ky tu       sandbox.ts:112,131   2000 ky tu
        |                                  |
        v                                  +--> LOG su kien      skill-code.ts:569, 901  (160-300)
  evidence.actual                          +--> PROMPT gui MODEL skill-code.ts:627  (nguyen van)
  skill-code.ts:817  1200 ky tu
        |
        +--> so SQLite   run-store.ts:86   (noi bo, sau dang nhap)
        +--> man UI      ui.ts:1219        (noi bo, sau dang nhap)
        +--> COMMENT PR  gate.ts:333       (CONG KHAI)
```

⛔C3 cấm bí mật vọng nguyên văn ra «thông điệp lỗi, log, sổ trên đĩa, verdict, hay comment PR». Ba bề mặt
in đậm ở trên đều nằm trong danh sách đó, và **prompt gửi model** còn xa hơn: nó rời khỏi hạ tầng của người
dùng sang một dịch vụ thứ ba.

**Điều đã được lo rồi, ghi ra để không ai làm lại:** secret của *CheckMate* KHÔNG vào được đường này.
`envSandbox` (`packages/harness/src/sandbox.ts`) là danh sách CHO PHÉP — code repo đích chạy với env chỉ
gồm `CI=true` và vài biến toolchain. Nên đây **không** phải lỗ «token GitHub của checker lên comment».

**Điều chưa được lo:** secret của **repo đích** — `.env` clone về, khoá hardcode, fixture test. Và đó là bài
toán khác hẳn mọi ca ⛔C3 đã giải trong repo:

| ca | checker có biết giá trị bí mật? | che kiểu gì |
|---|---|---|
| `maskToken` · `maskKey` · `maskTokenInText` | **có** — checker tự lưu nó | che chính xác, phân biệt được |
| secret của repo đích | **không** | không thể che theo giá trị |

`maskTokenInText` hiện chỉ khớp **một** mẫu (URL git mang token) và không được gọi ở bất kỳ chỗ nào trên ba
đường trên.

## What Changes

- **Cổng phát ra cho thông điệp lỗi** — hàm thuần, lọc trước khi message ra log · comment PR · prompt model.
  Cơ chế: **tách dòng thành CẤU TRÚC + các Ô GIÁ TRỊ**, phát cấu trúc, mỗi ô phải tự qua một cửa CHO PHÉP.
- **Cửa ô, ba tầng** (PO chốt 03/09):
  1. **hình dạng an toàn** — số ngắn, từ khoá (`undefined`/`null`/`true`/`false`), tên kiểu;
  2. **đệ quy** — mảng/object qua được khi mọi phần tử tự nó qua; phần tử nào không qua thì gột đúng phần
     tử đó, giữ khung;
  3. **đối chiếu nguồn** — chuỗi tự do qua được khi nó **đã có mặt ở chính bề mặt sắp phát ra**; nguồn
     đối chiếu KHÁC NHAU theo bề mặt (D2b): comment/log đối chiếu diff + source của PR, còn prompt model
     chỉ đối chiếu **những khối đã thật sự gửi tới model** — diff đã cắt theo trần, spec, test mẫu.
- **KHÔNG chặn ở sổ SQLite và màn UI** (PO chốt 03/09) — hai bề mặt nội bộ, sau đăng nhập.
- **KHÔNG** dò secret theo hình dạng (`ghp_`, `sk-`, entropy cao). Đó là danh sách cấm; nó thành nợ **#15**
  ở vai *cảnh báo*, không ở vai bộ lọc.

## Luật chạm tới

- ⛔C3 (bí mật không rò — đây là chỗ nó sống ở tầng bằng chứng probe)
- ⛔C4 (dữ liệu ngoài là dữ liệu — `loiThu` vào prompt là đường C4 chưa có gác nội dung)
- ⛔C5 (export mới → bảng module `checkmate.yml`)
- `probe-classification › «Cùng nguyên nhân» quyết bằng vân tay hai tầng` — cổng này KHÔNG được đụng vào
  phép so vân tay: vân tay so trên bản **nguyên văn** trong bộ nhớ, chỉ bản **phát ra** mới bị lọc
- Capability MỚI `error-message-egress-gate` (ADDED)

## Số đo (03/09, 180 thông điệp thật từ 57 lượt chấm trong `runs/`)

| | |
|---|---|
| giữ NGUYÊN VẸN (mọi ô qua cửa hình dạng) | 124 — **69%** |
| gột MỘT PHẦN (cấu trúc còn) | 28 — 16% |
| NGOÀI cấu trúc (chỉ còn loại lỗi) | 28 — 16% |

Cả hai vế mất mát đều có nguyên nhân đã biết và đều được hai tầng cửa mới nhắm vào: 16% «gột một phần» hầu
hết là mảng số (`expected [ 166666667, … ] to deeply equal …`) → tầng đệ quy lấy lại; 16% «ngoài cấu trúc»
hầu hết là lỗi nghiệp vụ do chính code repo đích ném (`ValueError: Vượt hạn mức phê duyệt của vai …`) →
tầng đối chiếu nguồn lấy lại, vì chuỗi ấy nằm trong source của PR.

## Impact

- MỚI: cổng lọc (hàm thuần) + lưới test
- Chạm: `packages/harness/src/skill-code.ts` (3 chỗ phát) · `apps/web/src/gate.ts` (`dongFinding`)
- `checkmate.yml` bảng module (⛔C5)
- KHÔNG đổi: `evidence.actual` ghi vào sổ, `ui.ts` hiển thị, phép so vân tay, bảng chân trị phân loại
