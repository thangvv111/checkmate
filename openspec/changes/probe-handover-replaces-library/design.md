## Context

Thư viện probe giữ mọi probe **xanh trên nhánh gốc** rồi chạy tất cả ở mọi lượt, trên cả hai nhánh. Đo
06/09: **0/7 probe trên prod từng bắt hồi quy**; nợ #18 đo 36 probe chạy cho một PR đổi 3 file; trần mặc
định 100 cho phép 200 lượt thực thi test mỗi lượt chấm.

PO chốt hướng: **probe là đầu dò dùng một lần; hành vi đáng ghim thì giao cho repo đích.** PO cũng chốt gỡ
thư viện **trong cùng change này** — em có đề nghị tách làm hai (dựng cơ chế giao trước, gỡ sau vài tuần),
PO nghe rồi quyết gộp. Ghi lại để người sau biết đây là quyết định có cân nhắc, không phải sót.

## Goals / Non-Goals

**Goals**
- Gỡ hẳn tích luỹ probe: không đọc, không nạp, không đào thải, không cách ly.
- Xếp probe theo **chất lượng bằng chứng** (ba hạng đóng) thay cho tiêu chí «xanh thì giữ».
- Đưa probe đáng giữ **ra ngoài** dưới dạng đề xuất giao cho repo đích.
- Khai rõ **cái mất** ở chỗ người đọc verdict nhìn thấy.

**Non-Goals**
- **Không** tự đưa test vào repo đích (⛔C1 — máy không merge). Đề xuất là đề xuất.
- **Không** xoá `probes-lib/` trên máy chủ. Nó là tài sản prod; change này thôi đọc, không xoá.
- **Không** đổi bảng chân trị phân loại, thuật toán sinh probe, hay `max_probe`.
- **Không** làm trần finding của nợ #17 — việc khác, change khác.

## Decisions

### D1 — Hạng 1 giao KÈM FINDING, không xếp hàng chờ

Câu hỏi khó nhất lúc thiết kế: probe hạng 1 nổ ⇒ verdict FAIL ⇒ PR bị trả về dev. Giao lúc ấy thì repo
nhận một test **đang đỏ**. Chờ tới lúc dev sửa xong rồi giao thì phải **giữ probe qua nhiều lượt** — tức
dựng lại đúng cái kho vừa gỡ.

**Chọn: giao ngay, kèm finding, và nói thẳng nó đang đỏ.** Một test đỏ đi kèm một báo lỗi không phải khiếm
khuyết — nó là **cách tái hiện lỗi**, thứ có giá trị nhất trong một báo cáo lỗi. Dev sửa cho tới khi nó
xanh, rồi giữ lại. Nghịch lý «phải giữ probe để giao sau» biến mất vì ta không chờ nữa.

Hệ quả về hình dạng: hạng 1 **không đi qua hàng đợi** — nó là một phần bằng chứng của finding. Hàng đợi
giao chủ yếu chứa **hạng 2** (probe xanh, canh một luật mới chưa ai phủ).

### D2 — Cửa đột biến cho hạng 2: **phủ định khẳng định**, và nó chỉ là điều kiện CẦN

Hạng 2 chưa nổ bao giờ, nên phải tạo bằng chứng. Ba cách, và vì sao chọn cách thứ ba:

| cách | làm gì | vì sao không / có |
|---|---|---|
| đột biến **hiện thực** | phá code repo đích rồi xem probe có đỏ | mạnh nhất, nhưng đòi hiểu repo đích đủ để phá **đúng chỗ** — engine không có tri thức đó |
| nhờ **model** viết bản hỏng | tốn model, không tất định | trái nguyên tắc «máy phân loại, model chỉ viết lời văn» |
| **phủ định khẳng định** ✅ | đảo từng `expect` trong probe, chạy lại; probe **phải đỏ** | tất định · không cần biết gì về repo đích · bắt đúng ca đã đo |

Phủ định bắt được đúng hai kiểu dằn tàu đã thấy: khẳng định **không bao giờ ràng buộc** (`expect(res.status)
.toBe(200)` ở một endpoint luôn trả 200), và khẳng định **không hề chạy** (thoát sớm, promise không await).

⛔ **Nói thẳng giới hạn, đừng để lưới tự nhận là kín:** phủ định là điều kiện **CẦN, không ĐỦ**. Một
`expect(1).toBe(1)` bị phủ định cũng đỏ, mà nó chẳng canh gì. Cửa này lọc rác, không chứng minh giá trị.
Cửa mạnh hơn (đột biến hiện thực) ghi thành nợ có tên, không làm trong change này.

### D3 — `probes-lib/` trên đĩa: KHÔNG xoá, thôi đọc

`CLAUDE.md` xếp `probes-lib/` vào tài sản prod không được đè khi deploy. Change này gỡ **code đọc nó**, giữ
nguyên **dữ liệu**. Ba lý do:

1. Xoá dữ liệu prod là việc một chiều; gỡ code thì lùi được bằng một lần revert.
2. Nếu sau này đo lại thấy quyết định sai, 7 probe ấy là dữ liệu duy nhất còn.
3. Chính luật của `probe-quarantine` bị gỡ trong change này nói: *«máy được phép đánh dấu vì việc đó đảo
   ngược được; xoá thì chỉ người mới làm»*. Gỡ một luật không có nghĩa là được phép làm ngược nó.

### D4 — `nghi_loi_co_san` thành trạng thái không tới được

Trạng thái này do **đúng một dòng** sinh ra (`skill-code.ts:737`), gác bằng `nguon === 'thu_vien'`, và
**chưa bao giờ được khai trong spec** `probe-classification`. Gỡ thư viện làm nó không tới được.

**Chọn: gỡ khỏi đường SINH, giữ trong kiểu ĐỌC.** Verdict cũ trên đĩa có `probe_stats.nghi_loi_co_san`;
gỡ khỏi kiểu là làm bản ghi đời cũ không đọc được. Lưới `test/doc-du-lieu-cu.test.ts` giữ ranh giới này.

### D5 — Màn «Thư viện probe» đổi vai, không xoá rồi dựng lại

Cùng một bề mặt, cùng đường dẫn, đổi nội dung: thôi bày kho tích luỹ, chuyển sang bày hàng đợi giao. Xoá
rồi dựng lại một màn mới là mất cả ba luật giao diện đã có ở đó (bày cả phần yếu · hai trạng thái rỗng nói
hai câu · nội dung repo đích là dữ liệu) rồi phải phát minh lại chúng.

⚠ Luật «nội dung là DỮ LIỆU, dùng `textContent`» **quan trọng hơn** sau change: trước, mã hiện trên màn là
thứ đã nằm trong kho; nay nó là thứ người vận hành sắp **copy sang một repo khác**.

### D6 — Hàng đợi giao KHÔNG có trần

Đề xuất phải rỗng dần vì repo đích **nhận**, không vì đụng trần rồi bị loại. Một trần ở đây sẽ âm thầm vứt
bằng chứng vừa kiếm được — đúng thứ change này gỡ đi.

## Architecture

```
LUOT CHAM (nhu cu, tru phan thu vien)
  sinh probe tu spec + api doc + test mau + diff
        |
        v
  chay tren HAI nhanh -> phan loai may (bang chan tri, khong doi)
        |
        +--> finding  (nhu cu)
        |
        v
  XEP HANG THEO BANG CHUNG            <- MOI, thay cho admitToLibrary
        |
        +-- hang 1 (da no)      --> gan vao FINDING lam cach tai hien   [D1]
        +-- hang 2 (luat moi    --> cua dot bien: phu dinh khang dinh   [D2]
        |          chua phu)          |
        |                             +-- do  -> vao HANG DOI GIAO
        |                             +-- xanh-> vut (khong phai phep thu)
        +-- hang 3               --> vut
        |
        v
  verdict mang muc «de xuat giao»  ->  man hang doi giao  [D5]

DA GO HAN:  probes-lib doc/ghi · admitToLibrary · dedup 4 tang · dao thai · tran · cach ly · so go bo
```

Tầng: trọn trong `packages/harness/src` (xếp hạng, cửa đột biến) + `apps/web/src` (bề mặt). Không đụng
`packages/shared` ngoài kiểu verdict.

## Data Model

**Đọc:** thôi đọc `probes-lib/<slug>/meta.json` và các file probe. Dữ liệu **ở lại trên đĩa** (D3).

**Ghi:** không ghi vào `probes-lib/` nữa. Đề xuất giao đi theo **verdict của lượt** — nơi đã có sẵn đường
ghi atomic và sổ chỉ-ghi-thêm, không thêm file dùng chung mới ⇒ **không phát sinh khoá liên tiến trình**
(R8/R10.12 không áp thêm gì).

**Kiểu verdict** (`packages/shared/src/types.ts`):

| trường | việc |
|---|---|
| `library_changes` | **gỡ khỏi đường ghi**, giữ optional để đọc bản ghi cũ |
| `probe_stats.cach_ly` | như trên |
| `probe_stats.nghi_loi_co_san` | như trên (D4) |
| `handover?` | **MỚI** — mảng đề xuất: `{ probe_id, spec_rule, hang, ly_do, code }` |

⛔ Mọi trường gỡ đều **giữ optional**, không xoá khỏi kiểu: `web-runs/` và `runs/` trên prod có bản ghi
mang chúng. Vắng trường nghĩa là **KHÔNG BIẾT** (bản ghi đời mới không sinh nữa), không phải «bằng 0» —
cùng ranh giới `diff_blind_spots` đã đặt.

**Không có di trú.** Không đổi hình dạng bản ghi cũ, không xoá gì trên đĩa (R10.13 không áp).

## Risks / Trade-offs

- **[Mất lớp phủ hồi quy tác động-từ-xa]** → Đây là cái mất **thật**, không phải rủi ro giả định: probe
  sinh mới chỉ dò quanh diff. Giảm thiểu: khai ra ở verdict (requirement riêng), và cơ chế giao đẩy phủ về
  đúng chỗ nó chạy mọi commit. Nhưng **có một quãng trống**: từ lúc gỡ tới lúc repo đích thật sự nhận test.
  PO đã được trình việc tách hai bước để tránh quãng ấy và chọn gộp.
- **[Dòng giao rất thưa, đọc nhầm thành «cơ chế không chạy»]** → Hạng 1 hiếm theo cấu tạo (prod: 0/7).
  Giảm thiểu: trạng thái rỗng phải nói **đã chấm bao nhiêu lượt mà chưa đủ bằng chứng**, không im lặng trơ.
- **[Cửa đột biến tự nhận là đủ]** → Phủ định khẳng định là điều kiện cần, không đủ (D2). Giảm thiểu: khai
  thẳng trong spec và trong nợ có tên; không để tài liệu nào nói cửa này chứng minh probe có giá trị.
- **[Gỡ 155 ca test]** → Rủi ro là gỡ nhầm ca đang khoá một luật **vẫn còn hiệu lực**. Giảm thiểu: mỗi file
  lưới bị gỡ phải soi từng ca — ca nào khoá luật còn sống thì **chuyển nhà**, không xoá. Ghi ở `tasks.md`.
- **[Quyết định sai thì lùi thế nào]** → `probes-lib/` còn nguyên trên đĩa (D3), và toàn bộ việc gỡ nằm
  trong một change ⇒ revert được bằng một lần `git revert` cộng một lần deploy.

## Migration Plan

**Dữ liệu: N/A** — không đổi hình dạng gì, không xoá gì (D3).

**Đường lùi:** revert change + deploy. `probes-lib/` trên máy chủ chưa bị đụng nên thư viện sống lại nguyên
trạng, kể cả lịch sử và các dấu.

## Open Questions

- **Repo đích nhận đề xuất bằng cách nào?** Change này dừng ở «verdict mang đề xuất + màn hàng đợi». Đẩy
  thành PR sang repo đích, hay comment vào PR đang chấm — là bề mặt khác, cần PO chốt, và trộn vào đây là
  trộn hai hồ sơ rủi ro.
- **Cửa đột biến mạnh hơn** (đột biến hiện thực thay vì phủ định khẳng định) — nợ có tên, cần biết cách
  chọn chỗ phá mà không hiểu repo đích.
