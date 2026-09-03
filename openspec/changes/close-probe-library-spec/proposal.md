# Proposal — close-probe-library-spec

## Why

Bảng tra còn **20 hàng `pending`**, và sau lượt archive gần nhất **tất cả đều thuộc `probe-library`**.
Chúng cùng loại nợ với `diff-visibility` và `target-contract` vừa đóng: **đã có ca, chưa có requirement**.

Đóng nốt 20 hàng này đưa bảng tra về **0 hàng `pending`** — chuỗi backfill khép lại.

## `concurrent-runs` không còn việc

Bảng chia change backfill (PO chốt 02/09) còn tên `concurrent-runs`, nhưng **không hàng nào trong bảng tra
trỏ nó nữa**: `R8` và `R8.1` đã `housed` ở requirement *«Trần lượt chạy đồng thời, vượt trần thì từ chối
ngay chứ không xếp hàng ngầm»*, lưới ở `thu-vien.test.ts` và `kho-run.test.ts`.

Bảng chia ấy lập **trước khi đo**; phần việc của `concurrent-runs` đã được các change khác nhận trong lúc
làm. Ghi ra đây thay vì mở một change rỗng để tick cho đủ danh sách.

## What Changes

20 điều → **6 requirement**, gộp theo cơ chế chứ không theo số:

1. **Sổ dùng chung được bảo vệ HAI lớp** — khoá cho cuộc đua, ghi atomic cho cái chết giữa chừng
   (R8.4 · R8.6 · R8.7 · R10.12)
2. **Hạt nạp là TỪNG PROBE, và thư viện đời bộ được di trú tự động** (R10 · R10.1 · R10.2 · R10.5)
3. **Trần đếm theo probe, và đào thải chọn nạn nhân theo ĐIỂM bốn nấc** (R10.4 · R10.22 · R10.23 · R10.24)
4. **Gỡ trùng bốn tầng: cơ học trước, model sau, và nghiêng về GIỮ** (R10.6 · R10.7 · R10.8)
5. **Lịch sử hành vi là BẰNG CHỨNG, và không phải nhãn nào cũng tính** (R10.9 · R10.10 · R10.20 · R10.21)
6. **Máy tách phải hiểu regex literal khi đếm ngoặc** (R10.16)

## Rủi ro riêng, và cách chống — giống change trước, vì bài học vẫn đúng

Viết luật dựa trên niềm tin rằng ca đã có khoá đúng điều ấy. Lượt trước niềm tin ấy **sai hai chỗ trong 21**
— và cả hai chỉ lộ ra nhờ mutation, không lộ ra khi đọc tiêu đề ca.

Nên ở đây cũng vậy: **mutation là phép kiểm chính**, chạy cho từng vế chứ không chỉ cho gác trung tâm của
mỗi requirement. Đột biến sống sót thì đi theo bảng ba đường (D1 của change trước), không im lặng khai bừa.

## Luật chạm tới

- `probe-library` (ADDED 6 requirement) — capability đã archive, thêm requirement vào
- Bảng tra: 20 hàng → `housed`; sau change này **bảng tra về 0 `pending`**

## Impact

- Chỉ artifact + bảng tra; ca mới chỉ khi mutation đòi.
- KHÔNG đổi code sản phẩm.
