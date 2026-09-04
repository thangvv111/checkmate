## Context

Màn `/docs` hiện là bài giải thích mười mục về cách checker làm việc, có nav trái sticky + scroll-spy. Gói
design CCS §8 khai một màn khác: poster accent + chín nguyên tắc 01–09, mỗi điều có dòng mono «thấy ở:».

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -c "0[1-9] "                        apps/web/src/ui-docs.ts   # 2   (khong phai nguyen tac danh so)
grep -c "background:var(--color-accent)" apps/web/src/ui-docs.ts   # 0   poster
grep -c "thay o"                         apps/web/src/ui-docs.ts   # 0   dong «thay o:»
grep -o "app.get('/[a-z-]*'" apps/web/src/server.ts
#   /health /login / /docs /probes /lich-su /ledger /tin-cay /settings
```

Chín đường «thấy ở:» phải nằm trong tập route thật ấy — đó là toàn bộ phép kiểm.

## Goals / Non-Goals

**Goals**
- Chín nguyên tắc thành dữ liệu, đánh số 01–09, mỗi điều có đường dẫn thật.
- Lưới ĐỎ khi một đường chết.
- Poster accent nền đặc, nguyên văn câu đã chốt; khối nguyên tắc tối đa 900px.

**Non-Goals**
- Không xoá bài giải thích mười mục.
- Không bỏ nav trái (xem D3).
- Không đổi màn nào khác; change chỉ ĐỌC tên route của chúng.

## Decisions

### D1 — Nguyên tắc là DỮ LIỆU trong một module riêng

`apps/web/src/principles.ts` xuất một mảng chín phần tử. Viết thẳng vào HTML thì không đếm được, không
kiểm được đường dẫn, và sửa một điều phải mò trong chuỗi.

Đây cũng là điều kiện để lưới tồn tại: một lưới quét HTML tìm chín tiêu đề là lưới ĐOÁN, và lưới đoán sai
theo cả hai chiều — đúng thứ mà `test-grid-integrity` sinh ra để chống.

### D2 — Lưới đối chiếu với ROUTE THẬT, đọc thẳng từ `server.ts`

Cân nhắc: khai tay một danh sách route hợp lệ trong test.

**Bác.** Danh sách khai tay là bản sao thứ hai của sự thật, và nó lệch ngay lần đầu ai đó đổi route — rồi
lưới xanh trong khi liên kết đã chết. Lưới đọc `app.get(...)` thẳng từ `server.ts`: một nguồn, và route
chết thì lộ ra.

Đường có query string (`/lich-su?verdict=khong_du_co_so`) thì so phần trước dấu `?`. Query không phải một
route, nhưng nó CÓ ý nghĩa ở đây — nguyên tắc 03 trỏ tới đúng bộ lọc mà change
`insufficient-basis-verdict-state` vừa dựng, nên liên kết ấy là bằng chứng thật chứ không phải một cú trỏ
chung chung.

### D3 — Giữ nav trái, và ghi rõ đây là chỗ ĐI CHỆCH gói

Gói khai màn này «không tương tác, rộng tối đa 900px». Đúng cho một màn chỉ có chín mục.

Nhưng trang thật còn mang bài giải thích mười mục ở dưới — nội dung viết tay có giá trị mà gói không đòi
xoá. Bỏ nav là làm mười mục ấy khó tìm, để đổi lấy sự thuần khiết của một màn không tồn tại ở đây.

Chọn: **khối nguyên tắc** rộng 900px và không tương tác đúng gói; nav giữ lại cho phần đọc thêm ở dưới,
thêm một mục trỏ về chín nguyên tắc.

### D4 — Chín đường chọn theo tiêu chí «chỗ nguyên tắc HIỆN HÌNH», không phải «chỗ nói về nó»

Ví dụ rõ nhất là nguyên tắc 03 («không đủ cơ sở thì không ra verdict»): nó trỏ tới
`/lich-su?verdict=khong_du_co_so` — một bộ lọc THẬT, đếm được số lượt chấm thất bại vì không có cơ sở. Trỏ
tới một đoạn văn giải thích thì vẫn là khẩu hiệu trỏ sang khẩu hiệu.

## Architecture

`apps/web/src/principles.ts` (dữ liệu thuần) → `ui-docs.ts` (dựng). `test/principles-screen.test.ts` đọc
cả hai cộng `server.ts`. Không chạm `packages/`.

## Data Model

N/A — không dữ liệu trên đĩa, không SQLite, không cấu hình. Chín nguyên tắc là hằng trong mã nguồn.

## Risks / Trade-offs

**[Đường dẫn đúng lúc viết, chết về sau]** → Đó chính là thứ lưới canh; đây là rủi ro change này sinh ra
để ĐÓNG, không phải rủi ro nó tạo thêm.

**[Lưới đọc `app.get(` bằng regex, bỏ sót route khai kiểu khác]** → Bỏ sót làm lưới ĐỎ OAN (route thật bị
coi là không tồn tại), không làm nó XANH OAN. Sai về phía an toàn, và có ca đối chứng khoá đúng chín đường
hiện tại phải xanh.

**[Trang dài thêm]** → Poster + chín mục ngắn; bài giải thích xuống dưới nav như cũ.

## Migration Plan

Không có dữ liệu để di trú.

## Open Questions

Không còn. Chỗ đi chệch gói (giữ nav) chốt ở D3 và ghi vào proposal.
