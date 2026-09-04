## Why

Màn **Nguyên tắc** (`/docs`) là màn cuối trong năm màn còn nợ gói design CCS. Hiện nó là một bài giải
thích mười mục về cách checker làm việc — viết tốt, nhưng **không phải thứ gói khai**.

Gói (§8) khai một màn khác hẳn: poster accent nền đặc mở đầu, rồi **chín nguyên tắc đánh số 01–09**, mỗi
điều có một **dòng mono «thấy ở:» trỏ tới chính xác chỗ nguyên tắc đó hiện hình trong sản phẩm**. Và gói
nói thẳng vì sao dòng ấy tồn tại:

> *«Giữ liên kết này khi sửa màn khác — nó là bằng chứng rằng nguyên tắc không chỉ là khẩu hiệu.»*

Đo được: **0** nguyên tắc đánh số · **0** poster · **0** dòng «thấy ở:».

Đây là chỗ đáng làm nhất trong năm màn, và không phải vì thẩm mỹ. Một sản phẩm mà cả nghề là **đòi bằng
chứng** thì trang tuyên ngôn của nó không được là chỗ duy nhất nói mà không phải chứng minh. Dòng «thấy ở:»
biến chín câu khẩu hiệu thành chín lời khẳng định **kiểm được**: nếu một nguyên tắc trỏ tới một chỗ không
tồn tại, thì hoặc sản phẩm đã bỏ nguyên tắc ấy, hoặc trang này đang nói dối — và cả hai đều phải lộ ra.

## What Changes

1. **Chín nguyên tắc thành DỮ LIỆU, không phải chữ trong HTML** — một module riêng, mỗi điều mang số, tiêu
   đề, thân, và **đường dẫn thật** tới chỗ nó hiện hình.
2. **Poster accent nền đặc mở đầu** với đúng câu gói giữ nguyên văn: *«Checker không tin ai. Chỉ tin bằng
   chứng.»*
3. **Dòng «thấy ở:» trỏ đường THẬT** — và có lưới bắt được khi đường ấy chết. Đây là phần cưỡng chế của
   câu gói viết; không có lưới thì «giữ liên kết này» là một lời dặn, và lời dặn thì trôi.
4. **Khối nguyên tắc rộng tối đa 900px** đúng gói.

**KHÔNG làm trong change này** (ghi rõ để không ai tưởng đã có):
- **Không xoá bài giải thích mười mục đang có.** Nó là nội dung viết tay có giá trị, và gói không đòi xoá
  nó — gói chỉ khai màn Nguyên tắc phải có gì. Chín nguyên tắc đứng TRƯỚC, bài giải thích thành phần
  «đọc thêm» ở dưới.
- **Không bỏ thanh điều hướng bên trái.** Gói khai màn này «không tương tác», và với đúng chín mục thì
  không cần nav. Nhưng trang thật dài hơn chín mục vì có bài giải thích ở dưới; bỏ nav là làm mười mục ấy
  khó tìm. Ghi rõ đây là chỗ đi chệch gói và vì sao.

## Capabilities

### New Capabilities
- `principles-screen`: trang tuyên ngôn của sản phẩm — mỗi nguyên tắc phải trỏ được tới chỗ nó hiện hình,
  và liên kết ấy phải kiểm được bằng máy.

### Modified Capabilities
<!-- không capability nào hiện mô tả màn này -->

## Luật chạm tới

- **Luật chạm tới:** `principles-screen › 2 requirement ADDED`. Không chạm ⛔C nào: change không đọc bí
  mật, không chạm cổng, không chạm đường verdict, không đổi hình dạng dữ liệu. Nó THÊM một phép kiểm —
  lưới «thấy ở:» — chứ không nới cái nào.

## Impact

- `apps/web/src/principles.ts` — **mới**: chín nguyên tắc dạng dữ liệu.
- `apps/web/src/ui-docs.ts` — poster + khối chín nguyên tắc; bài giải thích giữ nguyên, xuống dưới.
- `test/principles-screen.test.ts` — **mới**: lưới liên kết.
- `checkmate.yml` — khai export mới.
- **Không đụng**: sổ cái, cổng merge, đường verdict, cấu hình, dữ liệu trên đĩa.
