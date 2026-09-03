# Design — diff-visibility

## Context

```
11 hang pending  ->  8 dieu DA co ca (dung-diff.test.ts, 9 ca)  +  3 dieu chua co ca

Mot nguyen tac, ba be mat:
                                    +---------------------------+
   buildDiff() loai file            |  R7.8   log   -> nguoi VAN HANH
   -> ngoaiTamNhin[{file,kyTu,lyDo}]|  R7.10  prompt-> MODEL
                                    |  R7.11  loi   -> nguoi DOC LOI
                                    +---------------------------+
```

Ba người khác nhau đọc ba bề mặt. Mất nó ở bề mặt nào thì đúng người đọc bề mặt ấy bị lừa — và cả ba đều
đang ra quyết định dựa trên «máy đã nhìn hết PR».

## Goals / Non-Goals

**Goals**
- Ba điều có ca khoá đúng gác của chúng.
- Hai trong ba khoá bằng **chạy thật**, không đọc source.

**Non-Goals**
- KHÔNG đổi code sản phẩm; không thêm export (⛔C5 N/A).
- KHÔNG viết ca trùng cho 8 điều đã có ở `dung-diff.test.ts`.

## Decisions

### D1 — Hai điều chạy THẬT, một điều đọc source; và ranh giới nằm ở chỗ nào hàm đã export

| điều | cách khoá | vì sao |
|---|---|---|
| R7.10 | **chạy thật** — gọi `promptPhanTich(t, …)` rồi đọc chuỗi prompt | hàm đã export, đã khai `checkmate.yml` |
| R7.11 | **chạy thật** — dựng repo git tạm, `readTarget` phải ném đúng thông điệp | `sources.test.ts` đã có khuôn repo git tạm |
| R7.8 | **đọc source** | log nằm giữa `runCodeSkill`; chạm nó cần cả model, sandbox và một lượt chấm thật |

Ca R7.8 khoá được cấu trúc thật chứ không chỉ khoá chữ: nó đòi nhánh lọc `lyDo === 'vượt trần kích thước
diff'` có mặt và đòi thông điệp riêng đi kèm. Bỏ nhánh ấy thì ca đỏ.

*Cái mất, nói thẳng:* ca không chứng minh log **thực sự phát ra** lúc chạy. Cùng cái mất đã khai ở
`repo-history` D4 và `probe-library` D6.

### D2 — KHÔNG tách hàm thuần cho R7.8, dù khuôn ấy repo đã dùng bốn lần

Cám dỗ: tách phần dựng hai dòng log thành hàm thuần, export ra, rồi ca gọi thẳng. Khuôn này repo đã dùng ở
`session-gate` · `message-egress` · `response-secret-guard` · `probe-classification`, và nó sẽ biến ca đọc
source thành ca chạy thật.

Không làm, vì lý do đã chốt ở `probe-library` D4: **không đổi thứ được đo cho vừa phép đo**. Ở đó là hằng
thời gian chờ; ở đây là hình dạng hàm. Ranh giới giữa hai ca:

- tách hàm vì **quyết định đang trộn với I/O** và tách ra làm code rõ hơn → làm, và làm trong change riêng;
- tách hàm vì **lưới khó viết** → không làm.

Ở đây hai dòng log là hai dòng log; chúng không mang quyết định nào ngoài một phép lọc. Tách chúng ra chỉ
phục vụ phép đo. Nếu sau này chỗ ấy lớn thêm thì tách là đúng — nhưng đó là một change refactor, không phải
một dòng nhét vào change backfill.

### D3 — R7.11 dùng repo git THẬT, tái dụng khuôn có sẵn

`readTarget` gọi `git` ba lần trước khi tới nhánh ném lỗi, nên không giả lập được bằng tham số. `sources.
test.ts` đã có khuôn dựng repo tạm — dùng lại nguyên khuôn ấy, gồm cả `GIT_TIMEOUT` (mỗi ca spawn git ~20
lần; trên Windows lúc lưới chạy song song đo được 6.4 s, quá trần mặc định 5 s).

Ca đối chứng nằm cùng chỗ và mới là phần khoá được luật: PR **không đổi gì** phải ra thông điệp KHÁC. Chỉ
kiểm ca «toàn file sinh tự động» thì một hiện thực ném cùng một câu cho cả hai trạng thái vẫn xanh.

### D4 — Ba tầng của `test-grid-integrity`

- **tầng 1 mutation** — bắt buộc, chạy hai lần, kiểm chứng đột biến đã áp dụng. Và theo D8 của
  `probe-library`: khi đột biến không giết được ca nào, phải phân biệt **ba** khả năng — ca không
  load-bearing, đột biến không áp dụng được, và **đột biến gỡ nhầm chỗ** (đọc code quanh chỗ đột biến xem
  còn đường lui nào không).
- **tầng 2 đếm bề mặt** — **N/A có lý do**: change này không dựng gác chạy xuyên suốt; nó viết ca cho hành
  vi đã có. Không có mục kiểm tay «chạy thật một lượt».
- **tầng 3 cặp fixture** — lưới không dựng hàm quét `scan*`; ca R7.8 rà source viết thẳng.

### D5 — Lượt mutation này SẠCH ngay lần đầu, và đó là dữ liệu chứ không phải sự yên tâm

Bốn đột biến, mỗi cái chạy hai lần, tất cả nhất quán và đỏ đúng ca dự đoán — không đột biến nào phải viết
lại, không lần chạy nào lệch. Khác hẳn `probe-library`, nơi ba trong bốn đột biến đầu đều sai (D8 của
change ấy).

Ghi lại vì hai lượt này khác nhau ở một chỗ đo được, không phải ở may rủi:

| | `probe-library` | change này |
|---|---|---|
| gác nằm ở đâu | trong **luồng điều khiển** — vòng lặp nới hậu tố, nhánh hết giờ, `try/catch` | trong **chuỗi văn bản** — câu chỉ dẫn, câu thông điệp lỗi, phép lọc theo lý do |
| đột biến gỡ gác thế nào | phải hiểu code còn đường lui nào không | xoá đúng chuỗi ấy đi |
| hỏng hay gặp | **đột biến gỡ nhầm chỗ** | không có chỗ để gỡ nhầm |

Nên kết luận đúng là: *lượt mutation dễ ở đây vì gác ở đây là văn bản*, không phải *lưới này chắc hơn lưới
kia*. Ngược lại — gác bằng văn bản mỏng hơn gác bằng luồng điều khiển: một lần sửa chính tả cũng gỡ được nó,
và đó chính là lý do ba điều này cần lưới.

## Architecture

- `test/diff-visibility.test.ts` (MỚI) — ba nhóm ca.
- Repo git tạm cho nhóm R7.11; thư mục tạm dọn ở `afterAll`.
- KHÔNG đụng `packages/harness/src/`.

## Data Model

Không đổi.

## Risks / Trade-offs

- [R7.8 đọc source] → D1 khai cái mất; D2 khai vì sao không đổi code để né cái mất ấy.
- [Ca git tạm chậm] → tái dụng `GIT_TIMEOUT` 30 s của `sources.test.ts`, không nới trần toàn cục.
- [8 điều đã có ca vẫn `pending`] → chúng thuộc capability này nên bảng tra trỏ về đây; không viết ca trùng.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
