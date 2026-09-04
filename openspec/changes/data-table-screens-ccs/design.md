## Context

Ba màn bảng đọc từ sổ và bày lại. Chúng đã có vỏ CCS nhưng nội dung dựng trước khi có gói design.

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -o "MOI_TRANG = [0-9]*" apps/web/src/ui-history.ts   # 25   -> goi chot 8
grep -o "<th>[^<]*</th>" apps/web/src/ui-history.ts | wc -l  # 9  cot
grep -o "<th>[^<]*</th>" apps/web/src/ui-ledger.ts  | wc -l  # 8  cot
grep -o "<th>[^<]*</th>" apps/web/src/ui-trust.ts   | wc -l  # 12 (8 bang chinh + 4 bang ho so)
grep -o "chon('[a-z]*'" apps/web/src/ui-history.ts  | wc -l  # 3  bo loc dang chon (+ q) -> goi khai 6
grep -n "return kq.sort" apps/web/src/trust.ts               # sap theo soVerdict
```

Ba bảng, **ba khuôn định danh artifact khác nhau**: Lịch sử tách `Repo` thành cột; Sổ cái tách cả `Repo`
lẫn `Commit`; bảng hồ sơ tác giả lại có `Artifact` + `Commit`.

## Goals / Non-Goals

**Goals**
- Tin cậy sắp đúng trục, và trục ấy hiện thành cột.
- Sổ cái có dòng tổng đủ mục, tính trên phần đã lọc, đứng trước bảng.
- Lịch sử phân trang 8, có bộ lọc ngày.
- Một khuôn định danh artifact cho cả ba bảng.

**Non-Goals**
- Không đổi dữ liệu trên đĩa. `tiLePass` là phép chia lúc đọc.
- Không đụng màn Cấu hình, màn Nguyên tắc, màn Run, Dashboard.
- Không thêm bộ lọc ngoài hai cái gói khai.

## Decisions

### D1 — `tiLePass` tính lúc đọc, KHÔNG thành cột trong sổ

`AuthorProfile` vốn đã là bản tính lại từ sổ cái mỗi lần đọc (`computeProfile`). Thêm một trường phái sinh
vào đó không đụng đĩa, không cần di trú, và không tạo cơ hội cho sổ và bản tính lệch nhau.

Cân nhắc ghi sẵn tỉ lệ vào sổ cái để đỡ tính lại: **bác**. Sổ cái là sổ chỉ-ghi-thêm; ghi vào đó một con
số phái sinh là tạo nguồn sự thật thứ hai cho cùng một sự thật, đúng khuôn đã làm hỏng cụm cột cổng
(R6.26) và phải gỡ bằng một change riêng.

### D2 — Mẫu số của tỉ lệ là SỐ VERDICT, không phải số PR

Gói khai `Tỉ lệ PASS = pass/tổng verdict`. Một pull request bị chấm lại nhiều lần đóng góp nhiều verdict,
nên hai mẫu số cho hai con số khác nhau. Chọn đúng cái gói khai, và ghi ra đây để người sau không «sửa
cho hợp lý» theo hướng khác.

Chia cho 0: tác giả 0 verdict thì tỉ lệ là **0**, không phải `NaN` và không phải 100%. Sắp xếp vì thế
đẩy họ xuống cuối — đúng, vì không có bằng chứng nào về họ cả.

### D3 — Thứ tự sắp xếp cần một khoá PHỤ ổn định

Sắp theo tỉ lệ PASS thôi thì hai tác giả cùng tỉ lệ có thứ tự tuỳ ý, đổi giữa hai lần tải trang mà không
ai đụng dữ liệu. Khoá phụ: **số verdict giảm dần** (nhiều bằng chứng hơn thì đứng trước), rồi **tên tác
giả** cho hoàn toàn xác định.

### D4 — Khuôn định danh artifact là HÀM THUẦN, đặt ở `ui.ts`

`artifactCell(...)` nhận `{ ten, repo, pr, sha }` và trả HTML. Ba bảng cùng gọi. Tách hàm thuần vì đó là
chỗ duy nhất viết được ca cho «thiếu repo», «thiếu SHA», «tài liệu rời» mà không phải dựng cả trang.

Đặt ở `ui.ts` chứ không ở một file mới: `ui.ts` đã là chỗ ở của `escHtml`, `splitSource`, `tokenField` —
những hàm dựng ô dùng chung. Thêm file mới cho một hàm là thêm một chỗ phải nhớ.

### D5 — Bộ lọc ngày: KHOẢNG, không phải một ngày

Gói khai `ngày ▾` không nói rõ hình dạng. Chọn **hai ô từ/đến** thay vì một danh sách («7 ngày qua», «30
ngày qua»): danh sách bó người dùng vào các mốc người viết nghĩ ra sẵn, còn khoảng thì trả lời được cả câu
hỏi «tuần trước có gì» lẫn «hôm PR #7 chạy thì máy đang thế nào». Lọc chạy trong bộ nhớ như bốn bộ lọc
hiện có, không thêm truy vấn SQL nào.

So sánh trên **chuỗi ISO cắt 10 ký tự đầu**, không dựng `Date`: `batDau` đã là ISO UTC, so chuỗi cho kết
quả đúng thứ tự và không kéo múi giờ vào một phép lọc.

## Architecture

Chỉ `apps/web/src`: `trust.ts` (tính) · `ui-trust.ts` · `ui-history.ts` · `ui-ledger.ts` (bày) · `ui.ts`
(khuôn dùng chung) · `server.ts` (nhận tham số lọc). Không chạm `packages/`.

## Data Model

**Không đổi gì trên đĩa.** `AuthorProfile.tiLePass` là trường phái sinh trong bộ nhớ; `computeProfile` đã
chạy lại mỗi lần đọc. Không cột SQLite mới, không di trú, không đường lùi cần thiết ngoài revert.

Bộ lọc ngày là tham số query string, không lưu ở đâu.

## Risks / Trade-offs

**[Phân trang 25 → 8 làm người quen dùng phải bấm nhiều hơn]** → Đúng, và đó là con số gói chốt cho cả
code. Ghi ra để nếu PO thấy chật thì đổi ở MỘT hằng.

**[Đổi trục sắp xếp làm bảng trông khác hẳn]** → Đó là mục đích. Rủi ro thật là người quen thứ tự cũ đọc
nhầm bảng mới; giảm thiểu bằng cột tỉ lệ PASS hiện ra, để thứ tự tự giải thích chính nó.

**[Gộp repo/SHA vào dòng phụ làm mất khả năng lọc theo cột]** → Không mất: lọc theo repo là một bộ lọc
riêng ở đầu trang, không phải lọc theo cột. Cột `Repo` chưa bao giờ lọc được gì.

**[`tiLePass` chia cho 0]** → D2 chốt: 0 verdict ⇒ tỉ lệ 0, có ca khoá.

## Migration Plan

Không có dữ liệu để di trú.

## Open Questions

Không còn. Hình dạng bộ lọc ngày chốt ở D5; mẫu số của tỉ lệ chốt ở D2; khoá phụ chốt ở D3.
