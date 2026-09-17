## ADDED Requirements

### Requirement: Hợp đồng chạy probe SHALL tự chứng minh bằng mồi trước lời gọi model đầu tiên

Trước lời gọi model đầu tiên của một lượt chấm code, và sau cửa kiểm điều kiện môi trường, engine SHALL ghi
một **probe mồi** (canary — một phép thử cố tình đỏ, nội dung là hằng của CheckMate theo đuôi file probe) vào
đúng chỗ probe thật sẽ được ghi, chạy nó qua **chính đường chạy test mà probe thật sẽ đi**, rồi đọc đầu ra
bằng chính bộ đọc của đường ấy.

Kết cục SHALL được phân loại bằng **số đếm và trạng thái trong đầu ra có cấu trúc** — file đầu ra có tồn tại
không · tổng số test · testcase của mồi có mặt không · trạng thái của nó — và MUST NOT so khớp lời văn
stdout/stderr của repo đích (⛔C4). Lời văn ấy MAY đi kèm thông điệp, sau bộ che (⛔C3), để người vận hành đọc.

Bốn kết cục SHALL làm lượt dừng **trước khi phát bất kỳ lời gọi model nào**, mỗi kết cục một tên bệnh riêng:

| kết cục | điều kiện máy đọc | tên bệnh |
|---|---|---|
| bộ chạy không ra đầu ra | file đầu ra vắng | `runner_output_missing` |
| bộ chạy không nhặt file probe | đầu ra có, tổng test = 0, không có lỗi nạp file | `probe_not_collected` |
| đầu ra không phải của lượt này | đầu ra có test, nhưng không có testcase của mồi | `canary_not_in_output` |
| bộ chạy báo xanh cho một phép thử đỏ | testcase của mồi có mặt và **không** ở trạng thái thất bại | `canary_not_failed` |

Hợp đồng SHALL được coi là **đã tự chứng minh** khi và chỉ khi testcase của mồi có mặt trong đầu ra ở trạng
thái **thất bại vì khẳng định** — không phải lỗi nạp file. Nối tên testcase với mồi SHALL dùng cùng phép nối
id probe với testcase của `target-contract`, MUST NOT thêm phép nối riêng.

Mồi nạp không được (bộ chạy báo lỗi nạp file cho chính mồi) SHALL được coi là **mồi không hợp với repo này**,
không phải hợp đồng hỏng: engine bỏ qua mồi kèm một dòng log nêu lý do nạp, MUST NOT chặn lượt, và MUST NOT
kết luận gì về hợp đồng.

Đuôi file probe không có hàng trong bảng mồi SHALL làm engine bỏ qua mồi kèm một dòng log, MUST NOT chặn.

Thời gian chạy mồi SHALL được ghi vào log lượt chạy bằng giây.

Cửa kiểm môi trường đã chặn lượt thì mồi MUST NOT chạy — mồi đứng sau cửa ấy, không thay nó.

**Mồi SHALL chạy ở cả cửa thêm repo đích vào danh sách**, ngay sau cửa kiểm điều kiện môi trường của cửa ấy,
trên HEAD của bản clone, đọc `runner` từ bản trên đĩa của clone. Ở cửa này, kết cục chặn SHALL được trả về như
**cảnh báo** trong cùng danh sách với điều kiện môi trường, và MUST NOT chặn việc đăng ký repo. Mồi ở cửa
thêm repo SHALL có thời hạn riêng ngắn hơn thời hạn lượt chấm; hết thời hạn ấy SHALL cho ra **chưa kết luận**
kèm câu nói lượt chấm đầu tiên sẽ kiểm lại, MUST NOT gán tên bệnh. Cùng lúc chỉ MỘT mồi cửa-thêm-repo được
chạy trong một tiến trình; yêu cầu thêm repo đến khi mồi khác đang chạy SHALL bỏ qua mồi kèm cảnh báo nói rõ
điều đó — mồi ở cửa này không nằm dưới trần lượt chạy đồng thời, nên phải có trần riêng.

*Vì sao chạy ở cửa thêm repo (PO chốt 17/09): đó là chỗ người vận hành đang nhìn và đang cầm `checkmate.yml`
của repo đích trong đầu. Cửa kiểm môi trường đã đứng ở đó với đúng lý do ấy; mồi đi cùng nó. Hết giờ là «chưa
kết luận» chứ không phải bệnh vì thời hạn ở cửa này là thời hạn của một yêu cầu HTTP, không phải của bộ test —
một bộ test Java hợp lệ có thể cần hơn thế, và gán tên bệnh cho nó là kê nhầm thuốc.*

*Vì sao phải chạy thật thay vì đọc cấu hình thu thập của repo đích: mỗi bộ chạy một cú pháp (`include` của
vitest, `testMatch` của jest, `testpaths` của pytest, `<includes>` của surefire) và chúng đổi theo phiên bản.
Đoán bằng cách đọc là nuôi một bảng không bao giờ đủ; hỏi thẳng bộ chạy thì đúng với cả bộ chưa gặp.*

*Vì sao phải đòi thấy ĐỎ chứ không chỉ thấy «có chạy»: đề xuất đến từ đội repo đích (08/09) sau khi cả hai
bên chốt một `test_cmd` sai — «chạy thử một probe cố tình đỏ, và đòi thấy FAIL». Một hợp đồng chỉ chứng minh
được nó ra XML là chưa chứng minh thất bại đi tới được verdict; `&&` trong template nuốt thất bại mà XML vẫn
có. Đo 17/09 trên admin-fe: 894 giây, 3 lời gọi model, 0 thông tin — vì hợp đồng chưa từng phải tự chứng minh.*

*Vì sao mồi không nạp được thì bỏ qua chứ không chặn: bỏ qua mồi không làm thứ gì thành PASS — probe thật vẫn
chạy và kết cục «không thu thập được» ở đường thật vẫn gác. Chặn ở đây là biến một phép kiểm đứng trước thành
cửa từ chối cho mọi khuôn test mà CheckMate chưa viết mồi.*

#### Scenario: hợp đồng đúng — mồi đỏ đi tới được đầu ra
- **WHEN** engine chạy mồi và đầu ra có testcase của mồi ở trạng thái thất bại vì khẳng định
- **THEN** hợp đồng được coi là đã tự chứng minh, lượt đi tiếp sang bước sinh probe, log ghi thời gian mồi

#### Scenario: bộ chạy không nhặt file probe
- **WHEN** đầu ra của mồi tồn tại với tổng test bằng 0 và không có lỗi nạp file
- **THEN** lượt dừng với tên bệnh `probe_not_collected` trước lời gọi model đầu tiên, thông điệp nêu đường
  file mồi đã ghi và hai núm `runner.probe_dir` · `runner.probe_ext`

#### Scenario: template nuốt thất bại
- **WHEN** mồi chạy xong mà file đầu ra không tồn tại
- **THEN** lượt dừng với tên bệnh `runner_output_missing`, thông điệp mang stdout/stderr của bộ chạy sau bộ che

#### Scenario: đầu ra không phải của lượt này
- **WHEN** đầu ra của mồi có test nhưng không testcase nào nối được với mồi
- **THEN** lượt dừng với tên bệnh `canary_not_in_output`, thông điệp nói đầu ra không chứa phép thử vừa ghi

#### Scenario: bộ chạy báo xanh cho phép thử đỏ — xanh giả bị chặn
- **WHEN** testcase của mồi có mặt trong đầu ra ở trạng thái đạt
- **THEN** lượt dừng với tên bệnh `canary_not_failed`, và MUST NOT đi tiếp sang bước sinh probe — một bộ chạy
  báo xanh cho phép thử đỏ sẽ báo xanh cho mọi hồi quy

#### Scenario: mồi đi đúng đường của probe thật
- **WHEN** repo đích khai `runner.test_cmd`
- **THEN** mồi chạy qua đường runner ấy và đọc JUnit XML; repo không khai thì mồi chạy qua đường vitest mặc
  định và đọc đầu ra JSON — cùng hàm với đường thật, không phải một đường thứ hai

#### Scenario: mồi không nạp được — bỏ qua, không kết luận
- **WHEN** bộ chạy báo lỗi nạp file cho chính file mồi
- **THEN** engine ghi log nêu lý do nạp và đi tiếp, MUST NOT dừng lượt, MUST NOT ghi nhận hợp đồng đã chứng minh

#### Scenario: đuôi file không có mồi
- **WHEN** `probe_ext` của repo đích không có hàng trong bảng mồi
- **THEN** engine ghi log «không có mồi cho đuôi này» và đi tiếp, MUST NOT dừng lượt

#### Scenario: cửa kiểm môi trường đã chặn thì mồi không chạy
- **WHEN** cửa kiểm điều kiện môi trường dừng lượt
- **THEN** mồi không được ghi và không được chạy

#### Scenario: repo đích in chuỗi giả kết cục — phân loại không đổi
- **WHEN** bộ chạy của repo đích in ra stdout một chuỗi trông như «0 test» hay «canary failed» trong khi đầu ra
  có cấu trúc nói khác
- **THEN** kết cục đi theo đầu ra có cấu trúc; chuỗi in ra chỉ xuất hiện trong thông điệp sau bộ che

#### Scenario: dừng vì mồi không thành PASS
- **WHEN** lượt dừng ở bất kỳ kết cục nào của mồi
- **THEN** lượt ở trạng thái hỏng và MUST NOT có verdict PASS (⛔C2)

#### Scenario: thêm repo — mồi báo lệch ngay trong hộp thêm repo
- **WHEN** người vận hành thêm một repo đích mà cửa kiểm môi trường không chặn, và mồi cho `probe_not_collected`
- **THEN** repo **vào danh sách**, trả lời mang cảnh báo nêu tên bệnh, đường file probe và hai núm
  `runner.probe_dir` · `runner.probe_ext` — trong cùng danh sách cảnh báo môi trường

#### Scenario: thêm repo — cửa môi trường chặn thì mồi không chạy
- **WHEN** cửa kiểm môi trường lúc thêm repo trả về điều kiện mức chặn (ví dụ chưa cài phụ thuộc)
- **THEN** mồi không được ghi và không được chạy; cảnh báo chỉ có điều kiện môi trường

#### Scenario: thêm repo — hết thời hạn là chưa kết luận
- **WHEN** mồi ở cửa thêm repo không kết thúc trong thời hạn riêng của cửa ấy
- **THEN** cảnh báo nói mồi chưa kết luận và lượt chấm đầu tiên sẽ kiểm lại; MUST NOT gán tên bệnh; đăng ký
  vẫn xong

#### Scenario: thêm repo — mồi khác đang chạy
- **WHEN** một yêu cầu thêm repo đến trong lúc mồi của một yêu cầu thêm repo khác đang chạy
- **THEN** yêu cầu mới bỏ qua mồi kèm cảnh báo nói rõ lý do; đăng ký vẫn xong; MUST NOT dựng sandbox thứ hai

#### Scenario: thêm repo — mồi dùng đúng ảnh và đúng đường repo khai
- **WHEN** bản clone có `checkmate.yml` khai `runner.image` và `runner.test_cmd`
- **THEN** mồi ở cửa thêm repo chạy trên ảnh ấy qua đường runner, không phải ảnh mặc định qua đường vitest

## MODIFIED Requirements

### Requirement: Lỗi MÔI TRƯỜNG MUST NOT làm engine sinh lại probe

Khi bước chạy probe hỏng, engine SHALL phân biệt **lỗi của probe** với **lỗi của môi trường**. Lỗi môi
trường SHALL làm lượt dừng kèm thông điệp nêu đúng bệnh, và MUST NOT kích hoạt vòng sinh lại probe.

Phân loại SHALL dựa trên **mã lỗi và hình dạng đường dẫn**, MUST NOT so khớp lời văn tự do của thông điệp.

**Bước chạy probe cho ra đầu ra với tổng test bằng 0 và không có lỗi nạp file** SHALL là kết cục có tên
`probe_not_collected` — bộ chạy không nhặt file probe — và thuộc phía **không sinh lại**: probe không gây ra
và không sửa được phạm vi thu thập của repo đích. Kết cục này SHALL được nhận ra bằng số đếm trong đầu ra có
cấu trúc, không bằng chuỗi lỗi. Nó SHALL áp cho **cả hai nhánh**: mồi đã chứng minh hợp đồng ở nhánh gốc
không loại trừ việc pull request đổi phạm vi thu thập chỉ ở nhánh của nó.

Lượt dừng vì môi trường MUST NOT ra verdict PASS.

*Vì sao: sinh lại chỉ đúng khi probe viết sai — probe không gây ra và không sửa được việc thiếu phụ thuộc.
Với lỗi môi trường, vòng sinh lại tốn thêm một lời gọi sinh code rồi hỏng y hệt. Đo 07/09: ba lượt liên
tiếp, cùng một bệnh, mỗi lượt một lần sinh lại vô ích.*

*Vì sao «không thu thập được» là ca thứ tư của cùng luật: đo 17/09 trên admin-fe, hai lượt, mỗi lượt hai lần
sinh — chuỗi lỗi rơi về «Không thu thập được test nào», không mang mã lỗi nào nên không hàng nào bắt, và
engine sinh lại một thứ mà model không có cách nào đổi (`include` của vitest ở repo đích).*

*Vì sao phân loại bằng mã chứ không bằng lời văn (⛔C4): lời văn đến từ npm, từ Node, và từ chính repo
đích. Nó đổi theo phiên bản. Tệ hơn: một repo đích in ra chuỗi giống lỗi môi trường sẽ tự chọn được lượt
chấm nào của chính nó bị dừng — cùng khuôn với lý do engine không dò `Cannot find module` để nhận lỗi nạp.*

#### Scenario: bộ chạy test không tải được gói vì không có mạng
- **WHEN** bước chạy probe hỏng với mã lỗi phân giải tên miền
- **THEN** lượt dừng, thông điệp nói **thiếu phụ thuộc**, và MUST NOT sinh lại probe

#### Scenario: không ghi được vào thư mục phụ thuộc
- **WHEN** bước chạy probe hỏng với mã lỗi hệ thống tệp chỉ-đọc, hoặc không tạo được thư mục dưới thư mục
  phụ thuộc
- **THEN** lượt dừng, thông điệp nói đây là **môi trường**, không phải pull request

#### Scenario: file probe không được thu thập
- **WHEN** bước chạy probe ở nhánh nào đó cho ra đầu ra với tổng test bằng 0 và không có lỗi nạp file
- **THEN** lượt dừng với tên bệnh `probe_not_collected`, MUST NOT sinh lại probe, thông điệp nêu đường file
  probe và hai núm `runner.probe_dir` · `runner.probe_ext`

#### Scenario: pull request đổi phạm vi thu thập chỉ ở nhánh của nó
- **WHEN** mồi đã chứng minh hợp đồng ở nhánh gốc, nhưng ở nhánh pull request bước chạy probe cho ra 0 test
- **THEN** lượt dừng với `probe_not_collected` và thông điệp nói kết cục xảy ra ở nhánh pull request; MUST NOT
  sinh lại probe, MUST NOT ra PASS

#### Scenario: probe viết sai vẫn được sinh lại
- **WHEN** bước chạy probe hỏng vì file probe không nạp được, không mang mã lỗi môi trường nào
- **THEN** vòng sinh lại chạy như cũ — change này MUST NOT làm hẹp đường sửa probe

#### Scenario: 0 test vì lỗi nạp file KHÔNG phải «không thu thập được»
- **WHEN** đầu ra có tổng test bằng 0 nhưng bộ chạy có báo lỗi nạp cho file probe
- **THEN** đó là lỗi nạp file theo `target-contract`, đi đường sinh lại như cũ, MUST NOT bị gán
  `probe_not_collected`

#### Scenario: dừng vì môi trường không thành PASS
- **WHEN** một lượt dừng vì điều kiện môi trường
- **THEN** lượt ở trạng thái hỏng; MUST NOT có verdict PASS (⛔C2)

### Requirement: Thông điệp môi trường SHALL gọi đúng tên bệnh và nêu việc phải làm

Thông điệp cho người vận hành khi dừng vì môi trường SHALL nêu **bệnh** và **việc phải làm**, MUST NOT chỉ
nêu triệu chứng ở lớp dưới.

Thông điệp MUST NOT nói lượt hỏng vì hợp đồng kết quả khi bệnh là môi trường.

**Lệnh sửa nêu trong thông điệp SHALL thuộc đúng hệ sinh thái của repo đích.** Khi engine không nhận ra
hệ, hoặc nhận ra một hệ nó chưa hỗ trợ, thông điệp SHALL nói đúng điều đó và **MUST NOT kê lệnh của một
hệ khác**.

**Thông điệp của kết cục mồi và của `probe_not_collected` SHALL nêu việc phải làm bằng tên núm** của
`checkmate.yml` (`runner.probe_dir`, `runner.probe_ext`, `runner.test_cmd`) và **đường file probe engine đã
ghi**, vì chỗ sửa nằm phía repo đích và đó là những cái tên duy nhất họ gõ được. Đầu ra stdout/stderr của bộ
chạy, khi có, SHALL đi kèm sau bộ che, MUST NOT bị nhánh đọc đầu ra có cấu trúc nuốt mất.

Điều kiện môi trường SHALL được kiểm và báo **lúc thêm repo đích vào danh sách**, không chỉ lúc chấm. Điều
kiện thiếu MUST NOT chặn việc đăng ký repo.

*Vì sao vế lệnh-đúng-hệ thành luật: đo trên prod 08/09, một repo Maven nhận được thông điệp «chạy
`npm ci`». Lệnh ấy trong repo Maven không làm gì cả — người vận hành chạy xong sẽ gặp lại đúng lỗi cũ và
kết luận công cụ hỏng ngẫu nhiên. Một thông điệp kê nhầm thuốc **tệ hơn** một thông điệp chỉ nói triệu
chứng: cái thứ hai làm người ta đi tìm, cái thứ nhất làm người ta đi sai hướng một cách tự tin.*

*Vì sao «chưa hỗ trợ» là câu trả lời hợp lệ: nó đúng, nó kiểm chứng được, và nó dẫn người đọc tới đúng
chỗ cần sửa — phía CheckMate, không phải phía repo của họ.*

*Vì sao đầu ra bộ chạy phải đi theo thông điệp: đo 17/09, vitest in lý do «không có file test nào khớp» ra
stdout, nhưng file JSON vẫn được ghi nên nhánh đọc JSON đi tiếp và stdout bị bỏ. Nguyên nhân có sẵn, chỉ không
được phép đi ra — đúng «fail-closed mù» mà `target-contract` đã cấm cho ca không xuất XML.*

#### Scenario: dừng vì thiếu phụ thuộc ở repo Node
- **WHEN** lượt dừng vì bản clone Node chưa cài phụ thuộc
- **THEN** thông điệp nêu bản clone thiếu phụ thuộc và **lệnh cài của Node**, MUST NOT nói về JUnit XML

#### Scenario: dừng vì hệ chưa được hỗ trợ
- **WHEN** lượt dừng vì repo đích dùng một hệ engine chưa cấp được phụ thuộc
- **THEN** thông điệp **nêu tên hệ ấy**, nói rõ engine chưa hỗ trợ, và MUST NOT kê lệnh của hệ khác

#### Scenario: thông điệp không bao giờ kê nhầm hệ
- **WHEN** engine sinh thông điệp cho một repo không phải Node
- **THEN** thông điệp không chứa lệnh cài của Node

#### Scenario: dừng vì bộ chạy không nhặt file probe
- **WHEN** lượt dừng với `probe_not_collected` (từ mồi hay từ đường thật)
- **THEN** thông điệp nêu đường file probe đã ghi, tên hai núm `runner.probe_dir` · `runner.probe_ext`, nói
  rằng phạm vi thu thập của bộ chạy repo đích không phủ đường ấy, và MUST NOT nói probe viết sai

#### Scenario: dừng vì template nuốt thất bại
- **WHEN** lượt dừng với `runner_output_missing`
- **THEN** thông điệp nêu `runner.test_cmd` không cho ra file đầu ra và mang stdout/stderr của bộ chạy sau bộ che

#### Scenario: dừng vì bộ chạy báo xanh cho phép thử đỏ
- **WHEN** lượt dừng với `canary_not_failed`
- **THEN** thông điệp nói bộ chạy đã báo đạt cho một phép thử cố tình đỏ, nêu `runner.test_cmd` là chỗ xem,
  và MUST NOT nói probe hay pull request có lỗi

#### Scenario: thêm repo đích chưa đủ điều kiện
- **WHEN** người vận hành thêm một repo đích chưa đủ điều kiện chạy probe
- **THEN** repo **vào danh sách**, và trả lời mang cảnh báo nêu bệnh kèm việc phải làm cho **đúng hệ**

#### Scenario: thêm repo — cảnh báo mồi đi cùng kênh với cảnh báo môi trường
- **WHEN** mồi ở cửa thêm repo cho một kết cục chặn
- **THEN** cảnh báo nêu tên bệnh và việc phải làm bằng tên núm, nằm trong **cùng danh sách** với cảnh báo môi
  trường, MUST NOT là một trường trả lời riêng mà giao diện chưa đọc

#### Scenario: cảnh báo lúc thêm repo phải đến được mắt người vận hành
- **WHEN** cửa thêm repo trả về cảnh báo môi trường
- **THEN** giao diện hiện cảnh báo và MUST NOT chuyển trang ngay
