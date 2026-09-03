# Security — data-layer

Tầng dữ liệu là nơi ba thứ gặp nhau: **bằng chứng** (sổ cái, sổ cổng), **bí mật** (kho khoá), và **đường
cứu hộ** (sửa file bằng tay). Rủi ro ở đây không ồn ào — nó là mất dấu vết, hoặc bí mật nhân bản theo bản
sao lưu.

## S1. Bí mật & rò rỉ

- ✅ S1.1 **Kho khoá cố ý ở lại file, và lý do là lý do an toàn** (R9.13): bí mật nằm trong cơ sở dữ liệu
  thì **mọi bản sao lưu đều mang theo khoá** — một bản dump để gỡ lỗi, một bản chép sang máy khác, một file
  sao lưu đêm, mỗi thứ thành một bản sao của kho khoá. Đây là quyết định kiến trúc, không phải nợ kỹ thuật.
- ✅ S1.2 `R9.17` («không route nào trả khoá, token hay bí mật») **không viết lại ở đây** — đã được
  `response-secret-guard` cưỡng chế lúc chạy, và gác ấy **biết giá trị** khoá vì chúng nằm trong kho. Con
  trỏ chứ không bản sao.
- ⚠️ S1.3 Ngược lại của S1.1: bí mật **ở lại file** nghĩa là quyền file là lớp bảo vệ duy nhất. Đã có
  `R5.11`/`R11.8` siết quyền, và ca của chúng kiểm **lời gọi** chứ không kiểm quyền thật — cái mất đã khai
  ở `identity-session` D4.

## S2. Danh tính, phiên, vai (R11)

- ✅ S2.1 Bảng tài khoản nằm trong cùng cơ sở dữ liệu; luật «không route nào đọc bảng tài khoản» thuộc
  `identity-session` và đã có lưới. Change này không nới.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 **Sổ hành động cổng là bảng riêng, chỉ-ghi-thêm** (R9.6), và hành động ngoài merge/trả-về-dev bị
  chặn. Đây là bằng chứng ai đã bấm gì — cho sửa được nó là cho sửa bằng chứng.
- ✅ S3.2 `UPDATE`/`DELETE`/`INSERT OR REPLACE` lên sổ cái bị từ chối **ở tầng cơ sở dữ liệu**, không bằng
  kỷ luật người viết code (R9.4). Trigger là thứ thi hành luật ấy.
- ⚠️ S3.3 `PRAGMA recursive_triggers` là thiết lập **theo kết nối** (R9.4b) — đặt một lần lúc tạo bảng thì
  kết nối sau không có nó, và lưới chống ghi đè im lặng biến mất **mà không ai thấy**. Đây là chỗ một dòng
  thiếu làm cả cơ chế chống sửa bằng chứng thành trang trí.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 Giá trị người dùng nhập vào truy vấn đi qua **tham số**, không ghép chuỗi (R9.12). Có ca sẵn
  («dấu nháy trong chuỗi tìm không phá được câu truy vấn»).
- ✅ S4.2 Dòng hỏng trong file nguồn không làm sập lượt di trú và **được đếm** (R9.9) — một lượt di trú báo
  «xong» mà im lặng bỏ mất vài bản ghi là lượt di trú nói dối.

## S5. Sandbox & thực thi (R8)

- N/A S5.1 Không chạy code repo đích.

## S6. Tầng dữ liệu & quyền file (R9)

- ✅ S6.1 Đây là capability của trục này.
- ✅ S6.2 **Di trú KHÔNG xoá file gốc** (R9.8) — chúng ở lại làm bản đối chứng. Xoá nguồn sau khi chép là
  đánh cược rằng bản chép không có lỗi, và lỗi ấy chỉ lộ ra khi cần đối chất.
- ⚠️ S6.3 **«File là nguồn, bảng là bản đọc» là chỗ ⛔C2 sống ở tầng dữ liệu.** Bảng chỉ được ghi lúc lượt
  chấm đóng, nên một lượt bị giết giữa chừng có đủ dấu vết trên đĩa mà bảng thì trống. Đọc mỗi bảng ở đó là
  mở lại một lượt đã chết và thấy **trống rỗng** — «không đọc được» hiện thành «không có gì».
  Đường dựng lại phải **một chiều**: cho bảng ghi đè nguồn là mất dấu vết của đúng những lượt đã chết giữa
  chừng, tức mất bằng chứng ở đúng ca người ta cần nó nhất.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ✅ S7.1 S6.3 là fail-closed đúng nghĩa ở tầng này.
- ✅ S7.2 Dòng cụt ở cuối sổ (tiến trình chết giữa lúc ghi) là chuyện **bình thường**: bỏ đúng dòng ấy,
  không bỏ cả sổ. «Đọc được tới đây» là câu trả lời đúng, «không có gì» thì không.
- ✅ S7.3 Một verdict chỉ vào sổ đúng một lần (R9.5); lần hai bị **từ chối**, không ghi đè âm thầm.

## S8. Leo quyền & cô lập (per-vector — theo change này)

Mục tiêu: **sửa hoặc xoá bằng chứng**, hoặc **lấy bí mật từ tầng dữ liệu**.

- ✅ S8.1 (a) `UPDATE`/`DELETE` hàng sổ cái → trigger từ chối (R9.4), có ca.
- ✅ S8.2 (b) `INSERT OR REPLACE` để ghi đè đội lốt thêm mới → từ chối (R9.4b), có ca.
- ⚠️ S8.3 (c) mở **kết nối mới** không bật `recursive_triggers` rồi ghi đè → S3.3. Đây là đường thật và nó
  im lặng; giảm nhẹ bằng việc lớp kho là **một cửa duy nhất** mở cơ sở dữ liệu (R9.2), nên «kết nối mới» là
  thay đổi nhìn thấy rõ trong diff.
- ✅ S8.4 (d) ghi đè sổ trên đĩa bằng bản đọc từ bảng → đường dựng lại là một chiều (S6.3).
- ✅ S8.5 (e) đọc bí mật từ bản sao lưu cơ sở dữ liệu → bí mật không nằm trong đó (R9.13/S1.1).
- ✅ S8.6 (f) gọi route để lấy bí mật → `response-secret-guard` (S1.2).
- ⚠️ S8.7 (g) đọc thẳng file `.secrets.json` trên đĩa → quyền file là lớp duy nhất (S1.3). Ai vào được máy
  chủ với đúng user thì đọc được — đó là mô hình hiện tại, không phải sơ suất của change.

## Notes

- Hai chỗ đáng theo dõi, đều đã khai: S3.3/S8.3 (`recursive_triggers` theo kết nối — một dòng thiếu làm cả
  cơ chế thành trang trí) và S8.7 (quyền file là lớp duy nhất bảo vệ kho khoá).
- S6.3 là phần đáng đọc nhất của change: nó là nguyên tắc **chưa từng được khai**, chỉ sống trong một
  comment, và nó giải thích vì sao `R9.1` có ngoại lệ hợp lệ.
