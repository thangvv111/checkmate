# Design — close-probe-library-spec

## Context

```
20 hang pending (TAT CA thuoc probe-library)  ->  6 requirement

  R8.4 R8.6 R8.7 R10.12          -> so dung chung: KHOA (dua) + ATOMIC (chet giua chung)
  R10 R10.1 R10.2 R10.5          -> hat nap la TUNG PROBE + di tru doi bo
  R10.4 R10.22 R10.23 R10.24     -> tran theo probe + dao thai theo DIEM bon nac
  R10.6 R10.7 R10.8              -> go trung bon tang, nghieng ve GIU
  R10.9 R10.10 R10.20 R10.21     -> lich su hanh vi la BANG CHUNG
  R10.16                         -> may tach hieu regex literal

Sau change nay: bang tra ve 0 hang pending.
```

`concurrent-runs` còn tên trong bảng chia change nhưng **không hàng nào trỏ nó** — `R8` và `R8.1` đã housed
từ trước. Bảng chia lập trước khi đo; không mở change rỗng để tick cho đủ danh sách.

## Goals / Non-Goals

**Goals**
- 20 điều có requirement; `probe-library` **đóng hẳn**; bảng tra về **0 pending**.
- Mỗi vế được **chứng minh** đang có gác, không phải được tin là thế.

**Non-Goals**
- KHÔNG viết ca mới, trừ khi mutation cho thấy một vế chưa được khoá.
- KHÔNG đổi code sản phẩm.
- KHÔNG đụng 7 requirement đã archive của capability.

## Decisions

### D1 — Mutation cho TỪNG VẾ, không chỉ cho gác trung tâm

Lượt trước (`requirements-for-covered-rules`) dạy đúng một điều đắt: **10/10 đột biến gỡ gác trung tâm đều
đỏ, nhưng lượt hai cho các vế phụ lại tìm ra HAI chỗ chưa được gác.** Nếu dừng ở lượt một, cả hai đã được
đóng dấu thành luật đang thi hành.

Nên ở đây bỏ hẳn bước «một đột biến cho mỗi requirement» — đi thẳng vào **một đột biến cho mỗi vế**. 20 điều
thì có khoảng 20 đột biến, trừ những điều không gỡ được độc lập (điều bao trùm như `R10`, `R10.1`).

Đột biến sống sót đi theo bảng ba đường, giữ nguyên từ change trước:

| kết quả | nghĩa | xử |
|---|---|---|
| ca đỏ | vế ấy đang được gác thật | khai |
| xanh, đọc code thấy còn đường lui | đột biến gỡ nhầm chỗ | sửa đột biến, đo lại |
| xanh, không có đường lui | **vế ấy CHƯA được gác** | viết ca, hoặc khai đúng phạm vi đang có |

### D2 — Gộp R10.12 (ghi atomic) chung với nhóm khoá, dù nó là cơ chế khác

Cám dỗ là để «ghi atomic» đứng riêng vì nó không phải khoá. Nhưng hai cơ chế ấy chống hai nửa của **cùng
một rủi ro**: sổ dùng chung bị hỏng bởi nhiều tiến trình.

- khoá chống **cuộc đua** — hai lượt cùng ghi, lượt sau xoá mục của lượt trước;
- atomic chống **cái chết giữa chừng** — một tiến trình bị kill khi đang ghi.

Và chúng gặp nhau ở đúng một ca: tiến trình chết **khi đang giữ khoá** vừa để lại sổ cụt vừa để lại khoá
kẹt. Tách đôi thì mất đúng chỗ ấy — chỗ giải thích vì sao phải có cả ngưỡng phá khoá quá hạn.

### D3 — Viết «vì sao» phải nói được cái GIÁ, không chỉ nói cơ chế

Ở capability này nhiều luật trông tuỳ tiện nếu chỉ chép cơ chế: *«đào thải theo bốn nấc»*, *«lịch sử có trần
20»*, *«nghiêng về GIỮ»*. Chúng chỉ có nghĩa khi nói được **hai sai lầm không cùng giá**:

- bỏ nhầm một probe = mất vĩnh viễn một phép kiểm đã chạy thật;
- giữ nhầm một probe trùng = tốn vài giây mỗi lượt.

Mọi ngưỡng lệch trong capability này đều suy ra từ bất đối xứng ấy. Requirement nào không nói được nó thì
người sau sẽ đọc thành con số tuỳ ý và chỉnh cho tiện.

### D4 — Ba tầng của `test-grid-integrity`

- **tầng 1 mutation** — xem D1, ở đây là phép kiểm chính.
- **tầng 2 đếm bề mặt** — **N/A có lý do**: không dựng gác chạy xuyên suốt.
- **tầng 3 cặp fixture** — không dựng hàm quét `scan*` mới.

## Architecture

- Chỉ artifact + bảng tra. Không file mới trong `test/` trừ khi D1 đòi.
- KHÔNG đụng `packages/harness/src/`.

## Data Model

Không đổi.

## Risks / Trade-offs

- [Khai một vế chưa được gác] → D1: mutation cho từng vế, ba đường xử.
- [«Vì sao» chép cơ chế thay vì nói giá] → D3.
- [Gộp 20 → 6 làm mất tra cứu 1-1] → bảng tra giữ ánh xạ.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
