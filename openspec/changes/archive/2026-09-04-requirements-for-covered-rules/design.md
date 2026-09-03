# Design — requirements-for-covered-rules

## Context

```
23 hang pending  ->  8 requirement tren HAI capability

diff-visibility   8 dieu -> 3 req   ca o: dung-diff.test.ts (9 ca)
target-contract  15 dieu -> 5 req   ca o: runner-cfg (13) · loi-nap-file (7) · phan-loai · nhan-probe-log

Nguoc voi moi change backfill truoc:
   backfill thuong :  hanh vi CO, gac KHONG  -> viet ca + viet luat
   change nay      :  hanh vi CO, gac CO     -> chi thieu phan khai luat
```

## Goals / Non-Goals

**Goals**
- 23 điều có requirement; hai capability **đóng hẳn**.
- Mỗi requirement được **chứng minh** là đang có gác thật, không phải được tin là thế.

**Non-Goals**
- KHÔNG viết ca mới, trừ khi mutation cho thấy một điều chưa được khoá.
- KHÔNG đổi code sản phẩm.
- KHÔNG đụng 6 requirement đã archive của hai capability.

## Decisions

### D1 — Mutation ở change này KHÔNG phải thủ tục, nó là phép kiểm chính

Mọi change trước dùng mutation để chứng minh **ca mới viết** là load-bearing. Ở đây không có ca mới — nên
mutation dùng để trả lời câu hỏi mà cả change này đứng trên: *«điều tôi sắp khai thành luật có thật sự đang
được gác không?»*

Nếu bỏ bước ấy, change này chỉ là hành động chép 23 dòng bảng tra thành 8 khối văn bản, dựa trên việc **đọc
tiêu đề ca** — mà tiêu đề ca là thứ người viết ca tự đặt, không phải thứ máy kiểm. Đúng loại niềm tin đã sai
năm lần trong repo này.

**Một đột biến cho mỗi requirement, gỡ gác trung tâm của nó, chạy hai lần.** Không đỏ thì có ba đường xử,
và phải chọn đúng đường chứ không im lặng khai bừa:

| kết quả | nghĩa | xử |
|---|---|---|
| ca đỏ | điều ấy đang được gác thật | khai requirement |
| ca xanh, đọc code thấy còn đường lui | đột biến gỡ nhầm chỗ (`target-contract` D6) | sửa đột biến, đo lại |
| ca xanh, không có đường lui | **điều ấy CHƯA được gác** | viết ca, hoặc khai đúng phạm vi đang có |

### D2 — Gộp điều thành requirement theo NGUYÊN TẮC, không theo thứ tự số

23 điều được gộp thành 8 chứ không giữ 1-1, vì phần lớn chúng là **các vế của cùng một quyết định**. Ví dụ
R7.4 (cắt tiếp, ưu tiên file nhỏ) · R7.5 (một file duy nhất thì vẫn giữ) · R7.6 (giữ thứ tự git) không phải
ba luật — chúng là một luật «cắt thế nào» nhìn từ ba phía, và tách rời thì mất đúng phần *vì sao ba vế này
đi cùng nhau*.

Cái mất: người tra `R7.5` sẽ tới một requirement nói cả ba vế. Bảng tra đã dựng cho đúng việc ấy — cột
`home` trỏ tới requirement, không trỏ tới một dòng.

### D3 — Viết «vì sao» cho điều mình KHÔNG viết code

Rủi ro thật của change này: khai luật cho code người khác viết, ở vùng mình không dựng. Cám dỗ là chép lại
hành vi thành câu SHALL rồi bỏ trống phần *vì sao* — và một requirement không có *vì sao* là một requirement
mà lần sửa sau ai cũng thấy có thể bỏ.

Nên mỗi requirement ở đây phải trả lời được: **bỏ vế này thì hỏng ở đâu, và hỏng ấy trông như thế nào?**
Chỗ nào không trả lời được thì phải đọc lại code cho tới khi trả lời được — hoặc đó là dấu hiệu điều ấy
không đáng là luật.

### D4 — Ba tầng của `test-grid-integrity`

- **tầng 1 mutation** — xem D1; ở change này nó là phép kiểm chính, không phải thủ tục.
- **tầng 2 đếm bề mặt** — **N/A có lý do**: không dựng gác chạy xuyên suốt.
- **tầng 3 cặp fixture** — không dựng hàm quét `scan*` mới. `dung-diff.test.ts` có `buildDiff` nhưng đó là
  hàm sản phẩm, không phải hàm quét source.

### D5 — Phép kiểm chính đã làm đúng việc của nó: 21 đột biến, HAI điều hoá ra chưa được gác

D1 đặt mutation làm phép kiểm chính chứ không phải thủ tục. Nó bắt được hai chỗ — và hai chỗ ấy thuộc hai
loại khác nhau, đúng như bảng ba đường đã dự liệu.

**Lượt một — 10 đột biến gỡ gác TRUNG TÂM của 8 requirement: 10/10 đỏ.** Nhưng con số ấy chưa đủ để khai
23 điều, vì mỗi requirement gộp nhiều điều và một đột biến chỉ chạm một vế. Nên có lượt hai.

**Lượt hai — 11 đột biến cho các VẾ PHỤ: 9/11 đỏ, hai cái sống sót.**

| | chẩn đoán | bằng chứng |
|---|---|---|
| **N2** `R7.6` bỏ phép sắp lại theo thứ tự git | **ca KHÔNG load-bearing** (loại 1) | ca dùng hai file `--- b.ts` và `--- a.ts` **cùng độ dài**; `Array.sort` của V8 ổn định nên thứ tự giữ nguyên ở CẢ HAI hiện thực |
| **N9** `R2.15` bỏ điều kiện «đúng MỘT testcase» | **đột biến gỡ nhầm chỗ** (loại 3) | phép kiểm title chặn trước ở mọi ca hiện có, nên vế đếm chưa từng được chạm |

Hai chẩn đoán khác nhau nhưng cùng một kết luận: **vế ấy chưa được gác thật.** Xử theo D1 — viết ca, không
thu hẹp requirement, vì cả hai vế đều đáng là luật:

- ca `R7.6` sửa lại cho thứ tự git **ngược** với thứ tự chọn (file to đứng trước trong danh sách git, engine
  sắp theo kích thước để chọn file nhỏ trước) — giờ hai hiện thực cho hai kết quả khác nhau;
- ca `R2.15` mới: hai testcase **cùng mang tên file** — phép kiểm title cho qua, chỉ phép đếm phân biệt được
  «file không nạp được» với «file nạp được và có hai test».

Đo lại: cả hai ĐỎ, nhất quán hai lần. **21/21.**

*Điều đáng ghi nhất:* nếu change này chỉ chép bảng tra thành văn bản như hình dạng bề ngoài của nó gợi ý,
hai chỗ hở này đã được **đóng dấu thành luật đang thi hành** — bảng tra sạch, capability đóng, và hai hành
vi không ai gác. Đúng thứ security S7.2 nêu là rủi ro lớn nhất của change.

*Và N2 là lần thứ SÁU trong repo này gặp «ca xanh trên hệ thống đã hỏng».* Lần này nó không lộ ra khi viết
ca mới — nó lộ ra khi đi khai luật cho một ca viết từ trước.

## Architecture

- Chỉ artifact + bảng tra. Không file mới trong `test/` trừ khi D1 đòi.
- KHÔNG đụng `packages/harness/src/`.

## Data Model

Không đổi.

## Risks / Trade-offs

- [Khai luật cho điều chưa được gác thật] → D1: mutation là phép kiểm chính, có đường xử cho cả ba kết quả.
- [Gộp 23 → 8 làm mất tra cứu 1-1] → D2: bảng tra giữ ánh xạ; requirement giữ *vì sao*.
- [Requirement rỗng nghĩa] → D3: mỗi cái phải trả lời được «bỏ vế này thì hỏng ở đâu».

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
