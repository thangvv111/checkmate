# Proposal — requirements-for-covered-rules

## Why

Hai change vừa merge đều để lại cùng một loại nợ, và cả hai đều khai ra thay vì lặng lẽ bỏ qua:

| capability | điều còn `pending` | tình trạng |
|---|---|---|
| `diff-visibility` | 8 | **đã có ca** ở `dung-diff.test.ts` (9 ca), chưa có requirement |
| `target-contract` | 15 | **đã có ca** ở `runner-cfg` (13) · `loi-nap-file` (7) · `phan-loai` · `nhan-probe-log` |

Đây là trạng thái ngược với mọi change backfill trước đó. Ở kia, hành vi đã có mà **không ai gác**; ở đây,
hành vi đã có **và đã được gác**, chỉ thiếu phần khai thành luật. Nợ nhẹ hơn, nhưng không phải nợ vô hại:
bảng tra còn 23 hàng `pending` nghĩa là 23 điều mà người đọc spec **không tìm thấy**, dù chúng đang được
cưỡng chế thật. Một luật không viết ra thì lần refactor sau không ai biết mình đang phá cái gì.

PO chốt 04/09: gộp hai nợ làm một change.

## Rủi ro riêng của change này, và cách chống

Change này viết luật **dựa trên niềm tin rằng ca đã có khoá đúng điều ấy**. Nếu niềm tin sai thì ta khai
một hành vi được bảo vệ trong khi nó không được — đúng loại «ca xanh trên hệ thống đã hỏng», lần này ở quy
mô 23 điều cùng lúc.

Nên change này **không** chỉ là viết văn bản. Mỗi requirement phải có một đột biến gỡ gác trung tâm của nó
và làm ca hiện có ĐỎ. Không đỏ thì hoặc ca không load-bearing (phải viết ca), hoặc điều ấy chưa được cưỡng
chế thật (phải khai đúng như vậy).

## What Changes

23 điều → **8 requirement** trên hai capability:

**`diff-visibility` (3)**
1. Loại file sinh tự động, và repo khai thêm được mẫu riêng — mẫu hỏng bị bỏ tại cửa (R7.1 · R7.2 · R7.3)
2. Vượt trần thì cắt tiếp, ưu tiên phủ nhiều bề mặt, và không bao giờ cắt xuống rỗng (R7.4 · R7.5 · R7.6)
3. Mọi file bị bỏ đều trả về kèm tên, kích thước, lý do (R7 · R7.7)

**`target-contract` (5)**
4. `checkmate.yml` là tuỳ chọn; khai thiếu hoặc khai hỏng thì rơi về mặc định, không làm đổ lượt chấm
   (R2 · R2.1 · R2.2 · R2.4 · R2.5 · R2.12)
5. JUnit XML là hợp đồng kết quả, và đường đọc phải chịu được mọi biến thể bộ chạy sinh ra
   (R2.6 · R2.7 · R2.8 · R2.9)
6. Nối id probe với testcase nhận đủ ba dạng tên, và kiểm ranh giới id (R2.13 · R2.14)
7. File probe không nạp được là trạng thái RIÊNG, không phải probe đỏ (R2.15)
8. Khối `review` cho repo khai góc tấn công và thang severity của riêng nó (R2.10 · R2.11)

## Non-Goals

- KHÔNG viết ca mới trừ khi mutation cho thấy một điều chưa được khoá thật.
- KHÔNG đổi code sản phẩm.
- KHÔNG đụng 6 requirement đã archive của hai capability.

## Luật chạm tới

- `diff-visibility` (ADDED 3 requirement) · `target-contract` (ADDED 5 requirement)
- Bảng tra: 23 hàng → `housed`; sau change này **hai capability đóng hẳn**

## Impact

- Chỉ artifact + bảng tra; ca mới chỉ khi mutation đòi.
