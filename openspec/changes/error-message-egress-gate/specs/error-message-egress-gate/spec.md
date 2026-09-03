## ADDED Requirements

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

### Requirement: Cửa ô giá trị có ba tầng, tầng cuối đối chiếu với chính pull request

Một ô giá trị SHALL qua cửa khi thoả **một** trong ba tầng:

1. **Hình dạng an toàn** — số (giới hạn số chữ số), từ khoá ngôn ngữ (`undefined`, `null`, `true`, `false`,
   `NaN`), tên kiểu (`string`, `number`, `object`…), tập rỗng.
2. **Đệ quy** — mảng hoặc object qua được khi **mọi phần tử** của nó tự qua cửa. Phần tử nào không qua thì
   chỉ phần tử đó bị gột, khung `[…]` / `{…}` và các phần tử an toàn khác giữ nguyên.
3. **Đối chiếu nguồn** — chuỗi tự do qua được khi nó **xuất hiện trong diff hoặc source của pull request
   đang chấm**.

Tầng 3 là danh sách cho phép **theo nguồn**, không theo hình dạng, và lập luận của nó là: thứ đã nằm trong
chính pull request thì **đã công khai với mọi người đọc pull request đó**; nhắc lại nó trong comment không
rò thêm gì. Ngược lại, một khoá nằm trong `.env` **không** được commit thì không có trong diff, nên không
qua cửa. Cùng khuôn với `isNewRule`: quyết bằng «có trong nhánh PR hay không», không bằng hình dạng.

Giới hạn của tầng 3 MUST được khai rõ chứ không được để người đọc tự suy: nếu pull request **commit cả file
secret**, chuỗi đó nằm trong diff và sẽ qua cửa. Ở ca đó bí mật đã lộ ngay trong pull request trước khi
CheckMate chạm vào — cổng này không phải chỗ sửa nó. Việc phát hiện và cảnh báo secret đi VÀO cùng pull
request là một hướng khác, nằm ở nợ có tên #15.

#### Scenario: mảng toàn số
- **WHEN** ô là `[ 166666667, 166666667, 166666667 ]`
- **THEN** qua cửa nguyên vẹn — mọi phần tử là số ngắn

#### Scenario: object có một field lạ
- **WHEN** ô là một object mà mọi field an toàn trừ một field mang chuỗi tự do không có trong PR
- **THEN** chỉ field đó bị gột; khung object và các field còn lại giữ nguyên

#### Scenario: lỗi nghiệp vụ do code của PR ném ra
- **WHEN** thông điệp mang một chuỗi tiếng Việt xuất hiện trong source của pull request
- **THEN** chuỗi qua cửa — nó là thứ người sửa cần đọc nhất, và nó đã công khai trong pull request

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
