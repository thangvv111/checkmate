# error-message-egress-gate Specification

## Purpose
TBD - created by archiving change error-message-egress-gate. Update Purpose after archive.

## Requirements

### Requirement: Thông điệp lỗi rời máy chủ phải qua cổng phát, và cổng là danh sách CHO PHÉP

Thông điệp lỗi do bộ chạy test của repo đích sinh ra SHALL đi qua một cổng phát trước khi ra bất kỳ bề mặt
nào rời khỏi máy chủ: **log sự kiện · comment pull request · prompt gửi model**.

Cổng SHALL hoạt động theo nguyên tắc **tách cấu trúc khỏi giá trị**: nhận diện khuôn của dòng (ví dụ
`expected <A> to <verb> <B>`), phát **cấu trúc** nguyên vẹn, và bắt **từng ô giá trị** tự đi qua một cửa
CHO PHÉP. Ô nào không qua cửa thì bị thay bằng mô tả không mang nội dung (loại và độ dài), cấu trúc quanh nó
giữ nguyên.

Khớp **tiền tố** dòng MUST NOT được coi là đủ. Một cổng chỉ kiểm đầu dòng là danh sách cho phép về hình
thức và **danh sách cấm về thực chất**: `AssertionError: expected undefined to be '<bất kỳ chuỗi nào>'` khớp
tiền tố `AssertionError` và cho toàn bộ phần còn lại đi qua nguyên vẹn — đo trên dữ liệu thật, khuôn tiền tố
ấy phủ 76% thông điệp và không chặn được gì.

Cổng MUST NOT dò bí mật theo **hình dạng** (tiền tố `ghp_`/`sk-`/`AKIA`, chuỗi entropy cao). Đó là danh
sách cấm, và ở đây một âm tính giả **là một bí mật rò ra công khai, không thu hồi được** — khác hẳn ca từ
điển của `identifier-language-gate`, nơi âm tính giả chỉ làm luật phủ chưa hết.

#### Scenario: mọi ô đều là giá trị an toàn
- **WHEN** thông điệp là `expected 500 to be 200 // Object.is equality`
- **THEN** phát nguyên vẹn — số ngắn không mang được bí mật, và người đọc cần chính xác hai con số đó

#### Scenario: một ô là chuỗi tự do lạ
- **WHEN** thông điệp là `expected undefined to be '<chuỗi không có trong PR>'`
- **THEN** phát `expected undefined to be <chuỗi N ký tự>` — cấu trúc và ô an toàn giữ nguyên, chỉ ô lạ bị gột

#### Scenario: khớp tiền tố không đủ
- **WHEN** thông điệp bắt đầu bằng một lớp lỗi đã biết nhưng phần còn lại không khớp cấu trúc nào
- **THEN** phần còn lại KHÔNG được phát nguyên văn chỉ vì tiền tố hợp lệ

### Requirement: Cửa ô giá trị có ba tầng, tầng cuối đối chiếu với thứ bề mặt đó đã có

Một ô giá trị SHALL qua cửa khi thoả **một** trong ba tầng:

1. **Hình dạng an toàn** — số (giới hạn số chữ số), từ khoá ngôn ngữ (`undefined`, `null`, `true`, `false`,
   `NaN`), tên kiểu (`string`, `number`, `object`…), tập rỗng.
2. **Đệ quy** — mảng hoặc object qua được khi **mọi phần tử** của nó tự qua cửa. Phần tử nào không qua thì
   chỉ phần tử đó bị gột, khung `[…]` / `{…}` và các phần tử an toàn khác giữ nguyên.
3. **Đối chiếu nguồn** — chuỗi tự do qua được khi nó **đã có mặt ở chính bề mặt sắp phát ra**.

Tầng 3 là danh sách cho phép **theo nguồn**, không theo hình dạng. Lập luận: nhắc lại một chuỗi ở nơi nó
đã có mặt thì không rò thêm gì. Cùng khuôn với `isNewRule` — quyết bằng «có ở đó hay không», không bằng
hình dạng.

Hệ quả bắt buộc: **nguồn đối chiếu SHALL khác nhau theo từng bề mặt**, vì mỗi bề mặt đã biết một lượng
khác nhau. Một nguồn dùng chung cho cả ba là sai, và sai theo hướng mở:

| bề mặt phát ra | nguồn đối chiếu hợp lệ | vì sao |
|---|---|---|
| comment pull request | diff **và** source của PR | người đọc được comment thì đọc được repo và diff |
| log sự kiện | như trên | cùng vòng người đọc |
| **prompt gửi model** | **chỉ những khối đã thật sự gửi tới model trong lượt này** — diff **đã cắt theo trần**, spec, test mẫu, tài liệu API | model chưa hề thấy phần còn lại |

Chỗ khác biệt không được bỏ qua: diff bị **cắt theo trần** trước khi vào prompt, và file «ngoài tầm nhìn»
không vào prompt. Một chuỗi nằm trong phần bị cắt **có** trong PR nhưng **chưa** tới model — đối chiếu nó
với diff đầy đủ rồi phát sang model là gửi bí mật tới một nơi nó chưa từng có mặt.

Giới hạn còn lại MUST được khai rõ: nếu pull request **commit cả file secret** thì chuỗi đó nằm trong diff,
và với bề mặt pull request nó sẽ qua cửa. Ở ca đó bí mật đã lộ ngay trong pull request trước khi CheckMate
chạm vào — cổng này không phải chỗ sửa nó, và việc phát hiện secret đi VÀO cùng pull request là hướng
ngược, nằm ở nợ có tên #15.

#### Scenario: mảng toàn số
- **WHEN** ô là `[ 166666667, 166666667, 166666667 ]`
- **THEN** qua cửa nguyên vẹn — mọi phần tử là số ngắn

#### Scenario: object có một field lạ
- **WHEN** ô là một object mà mọi field an toàn trừ một field mang chuỗi tự do không có trong PR
- **THEN** chỉ field đó bị gột; khung object và các field còn lại giữ nguyên

#### Scenario: lỗi nghiệp vụ do code của PR ném ra
- **WHEN** thông điệp mang một chuỗi tiếng Việt xuất hiện trong source của pull request, và bề mặt phát ra
  là comment pull request
- **THEN** chuỗi qua cửa — nó là thứ người sửa cần đọc nhất, và nó đã công khai trong pull request

#### Scenario: cùng chuỗi ấy, nhưng bề mặt là prompt gửi model
- **WHEN** chuỗi chỉ có trong source (hoặc trong phần diff đã bị cắt theo trần), không nằm trong khối nào
  đã gửi tới model ở lượt này
- **THEN** chuỗi BỊ GỘT — model chưa từng thấy nó, phát sang đó là rò tới một bề mặt mới

#### Scenario: chuỗi đã nằm trong diff đã gửi tới model
- **WHEN** chuỗi xuất hiện trong phần diff thật sự đã đưa vào prompt phân tích của lượt này
- **THEN** chuỗi qua cửa cho bề mặt prompt — nhắc lại thứ model đã có không rò thêm gì

#### Scenario: chuỗi không có trong pull request
- **WHEN** thông điệp mang một chuỗi không tìm thấy trong diff lẫn source của pull request
- **THEN** chuỗi bị gột, dù trông vô hại

### Requirement: Cổng chỉ lọc bản PHÁT RA, không đụng bản dùng để suy luận

Cổng SHALL áp lên bản **phát ra ngoài**. Bản nguyên văn trong bộ nhớ và trong sổ trên đĩa MUST giữ nguyên,
vì hai đường phụ thuộc vào nó:

- **Phép so vân tay** (`errorFingerprint`, `tightFingerprint`) quyết định nhãn `ngoai_pham_vi` hay
  `nghi_van`. Lọc trước khi so là đổi kết quả phân loại — hai lỗi khác nhau bị gột thành cùng một chuỗi sẽ
  trùng vân tay và một vi phạm thật bị dán ngoài-phạm-vi.
- **Sổ SQLite và màn hình run** là bề mặt nội bộ, sau đăng nhập (PO chốt 03/09 giữ nguyên văn ở đó).

Khi một ô bị gột, phần thay thế MUST nói được **loại và độ dài**, không được là chuỗi trống hay một nhãn
trơ. Có án lệ: `loiThu` từng bị vứt trọn trước khi vào log, và hậu quả là hạ tầng test hỏng bị báo thành
«probe hỏng» — người đọc log đi sửa probe trong khi nguyên nhân nằm ở môi trường
(`packages/harness/src/skill-code.ts`, đoạn `loiHaTang`). Che nội dung mà xoá luôn bản chất là tái tạo đúng
họ lỗi báo-sai-bản-chất mà sản phẩm này sinh ra để chống.

#### Scenario: vân tay không đổi
- **WHEN** hai kết quả đỏ có cùng nguyên nhân, một trong hai mang chuỗi bị gột khi phát ra
- **THEN** phép so vân tay vẫn chạy trên bản nguyên văn và vẫn cho cùng vân tay — nhãn không đổi

#### Scenario: phần thay thế vẫn nói được bản chất
- **WHEN** một thông điệp không khớp cấu trúc nào
- **THEN** thứ phát ra vẫn nêu lớp lỗi và độ dài, đủ để phân biệt «hạ tầng test hỏng» với «probe sai»
