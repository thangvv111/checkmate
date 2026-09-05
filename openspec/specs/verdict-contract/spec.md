# verdict-contract Specification

## Purpose
Hợp đồng của verdict: nhị phân, ghim commit, kèm thống kê probe; sàn cứng cho hồi quy máy-xác-nhận (model
không hạ được mức); và «PASS phải có bằng chứng» — không probe nào chứng minh được gì thì lượt chấm thất
bại chứ không ra verdict. Quyết định là hàm thuần (`packages/harness/src/verdict.ts`) tách khỏi vòng chấm
nên mỗi nhánh khoá được bằng test. Sinh từ change `verdict-contract` (03/09/2026), backfill từ luật cũ
R6.1–R6.5, R6.13, R6.14, R1.12, R1.13 — bảng tra `docs/r-rules-map.md`.

## Requirements

### Requirement: Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ

Kết quả của một lượt chấm SHALL chỉ có hai giá trị: `PASS` hoặc `FAIL` (gốc: R6.1). MUST NOT có trạng thái
thứ ba kiểu «PASS có điều kiện» — mập mờ ở đây là chỗ để lách. Lượt chấm không kết luận được thì **thất
bại**, không phải một giá trị verdict thứ ba (xem requirement «PASS phải có bằng chứng»).

Verdict SHALL là `FAIL` khi có ít nhất một finding mức `high` (gốc: R6.3). Giá trị severity lạ hoặc đời cũ
MUST được chuẩn hoá fail-closed về `high` trước khi tính — «không đọc được mức» không được thành «mức thấp».

Verdict SHALL ghim `artifact_ref.sha_or_hash` (gốc: R6.2): commit SHA với code, hash nội dung với tài liệu.
Không ghim thì cổng không so được head, và verdict không thuộc về phiên bản nào.

Verdict SHALL kèm `probe_stats` (gốc: R6.4) để người đọc biết `PASS` nói trên cơ sở nào, trong đó số probe
**lên kế hoạch** và số **thực chạy** nêu tách bạch (gốc: R6.5), cùng phân bố các trạng thái phân loại —
gồm cả vùng chưa kết luận được: nghi vấn, bỏ qua, thất lạc, nghi lỗi có sẵn (gốc: R1.13), và **số probe bị
cách ly** trong lượt. Số thất lạc SHALL tính trên **mọi** probe đã đưa vào chạy, kể cả probe thư viện —
một nhóm probe chạy mà không được đếm ở đâu là một lỗ đúng bằng kích thước nhóm ấy. `PASS` với 0
probe chạy được không phải `PASS` có giá trị, và người đọc phải thấy điều đó ngay trong dữ liệu verdict,
không phải suy từ lời văn. Verdict SHALL kèm **mức cô lập** của lượt chạy: môi trường mà code artifact thực sự đã chạy trong đó.
Giá trị ấy SHALL phản ánh thứ **thực tế đã dùng**, không phải cấu hình mong muốn — «đã cấu hình để cô lập»
và «đã cô lập» là hai câu khác nhau, và chỉ câu thứ hai đáng ghi vào verdict. VẮNG trường ấy nghĩa là bản
ghi có trước phép đo này, KHÔNG có nghĩa là không cô lập.

Việc BÀY RA những số này thuộc `man-run`; ở đây là yêu cầu chúng **có mặt**.

#### Scenario: có finding mức high
- **WHEN** danh sách finding có ít nhất một mức `high`
- **THEN** kết quả là `FAIL`

#### Scenario: severity lạ hoặc đời cũ
- **WHEN** một finding mang severity không đọc được, hoặc giá trị đời cũ như `blocking`
- **THEN** nó được chuẩn hoá về `high` và kết quả là `FAIL` — fail-closed, không rơi về mức thấp

#### Scenario: không có finding chặn
- **WHEN** mọi finding đều ở mức `medium` hoặc `low`, hoặc không có finding nào
- **THEN** kết quả là `PASS`, và `probe_stats` vẫn có mặt với số kế hoạch, số ghi nhận và vùng xám

#### Scenario: lượt chạy trong môi trường cô lập
- **WHEN** probe chạy trong môi trường cô lập
- **THEN** verdict khai mức cô lập ấy kèm runtime đã dùng

#### Scenario: lượt chạy trên nền không cô lập được
- **WHEN** nền đang chạy không có runtime cô lập
- **THEN** verdict khai rõ là chạy KHÔNG cô lập — không vắng mặt, không để người đọc suy

#### Scenario: lượt chấm phải cách ly probe để chạy được
- **WHEN** engine loại một số probe vì lỗi nạp rồi chạy tiếp
- **THEN** `probe_stats` khai số probe bị cách ly, và số ấy KHÔNG bị gộp vào các nhóm khác

#### Scenario: probe thư viện chạy mà không có kết quả
- **WHEN** một probe thư viện nằm trong danh sách chạy nhưng không có kết quả
- **THEN** nó được đếm là thất lạc — không nhóm probe nào chạy mà không được đếm

### Requirement: Hồi quy máy-xác-nhận có sàn cứng high, model không hạ được

Probe mà MÁY đã xác nhận là hồi quy (pass ở nhánh gốc, fail ở nhánh PR) hoặc vi phạm luật mới SHALL dẫn
tới một finding mức `high` — bất kể model gán mức nào (gốc: R1.12). Model gán thấp hơn thì máy **ép về
`high`** và nói ra trong log. Model **bỏ sót** một hồi quy thì máy **tự bổ sung** finding mức `high` với
bằng chứng lấy từ chính kết quả chạy — fail-closed.

Vì sao phải thành luật: câu «có hồi quy thì FAIL» không được cưỡng chế ở chỗ ai cũng tưởng. Kết quả verdict
chỉ nhìn finding mức `high`; nếu model gán `medium` cho một hồi quy máy đã xác nhận, verdict ra `PASS` trên
một PR vừa làm gãy hành vi đang chạy. Hai lưới máy này — sàn cứng và bù thiếu — là chỗ luật thật sự sống,
nên chúng phải có test riêng chứ không dựa vào việc model biết điều.

Nhãn `hoi_quy` và `vi_pham_luat_moi` cùng sàn `high` nhưng MUST phân biệt được ở lời văn: một bên là «PR
làm hỏng thứ đang chạy đúng», bên kia là «PR khai một luật rồi chưa thực hiện được chính luật vừa khai».

#### Scenario: model gán mức thấp cho hồi quy
- **WHEN** máy phân loại một probe là `hoi_quy` và model viết finding mức `medium`
- **THEN** finding đó được nâng lên `high`, log nói rõ đã ép sàn, và verdict là `FAIL`

#### Scenario: model bỏ sót hồi quy
- **WHEN** máy phân loại hai probe là `hoi_quy` mà model chỉ viết finding cho một
- **THEN** máy tự bổ sung finding mức `high` cho probe còn lại, kèm bằng chứng chạy thật

#### Scenario: trạng thái KHÔNG phải hồi quy
- **WHEN** máy phân loại một probe là `nghi_van` và model viết finding mức `medium`
- **THEN** mức của model được giữ nguyên — sàn cứng chỉ áp cho hồi quy máy đã xác nhận

### Requirement: PASS phải có bằng chứng — không probe nào chứng minh được gì thì KHÔNG ra verdict

Một lượt chấm SHALL chỉ đủ cơ sở kết luận khi có ít nhất một probe ở trạng thái `pass`, `hoi_quy`,
`vi_pham_luat_moi` hoặc `cai_thien` (gốc: R6.13). Đó là những trạng thái duy nhất nói được điều gì đó về
pull request. Không có cái nào thì lượt chấm MUST kết thúc bằng **lỗi**, và MUST NOT ra `PASS`.

Vì sao phải là luật riêng, ngoài lưới chống PASS-rỗng: lưới kia chỉ hỏi «có probe nào được GHI NHẬN
không», mà probe ghi nhận đầy đủ vẫn có thể không chứng minh được gì. `ngoai_pham_vi` là **trạng thái
hút** — cả bộ probe import sai module sẽ đỏ trên cả hai nhánh cùng nguyên nhân, bị dán nhãn đó rồi bị
loại khỏi finding, và verdict ra `PASS` trên một lượt không có lấy một phép thử chạy được.

Thông điệp lỗi MUST nêu số probe và lý do của vài probe đầu — người đọc phải biết vì sao lượt chấm không
kết luận được, chứ không chỉ biết là nó hỏng.

#### Scenario: mọi probe đều ngoài phạm vi
- **WHEN** mọi probe của lượt chấm mang nhãn `ngoai_pham_vi` hoặc `nghi_loi_co_san`
- **THEN** lượt chấm KHÔNG đủ cơ sở, kết thúc bằng lỗi nêu số probe và lý do — không ra `PASS`

#### Scenario: có đúng một probe pass
- **WHEN** một probe `pass` và mọi probe khác `ngoai_pham_vi`
- **THEN** lượt chấm đủ cơ sở kết luận

#### Scenario: chỉ có hồi quy
- **WHEN** không probe nào `pass` nhưng có một probe `hoi_quy`
- **THEN** lượt chấm đủ cơ sở — hồi quy cũng là một điều nói được về pull request

### Requirement: Trước khi bỏ cuộc phải sinh lại probe một lần, kèm nguyên nhân thật

Khi lượt chấm không đủ cơ sở kết luận, hệ thống SHALL sinh lại file probe **một lần** trước khi bỏ cuộc
(gốc: R6.14), và lượt sinh lại MUST được cho biết **nguyên nhân thật** kèm nhắc rằng import sai module là
ca thường gặp nhất. Sinh lại quá một lần MUST NOT xảy ra — lặp vô hạn đốt tiền model mà không thêm bằng chứng.

Khi nhánh gốc không chạy được probe nào (thường vì pull request thêm module mới), lượt sinh lại MUST được
nói rõ điều đó — không nói thì model tưởng mình import sai đường và đi sửa nhầm chỗ, mất trọn một lượt sinh.

#### Scenario: lần sinh đầu không đủ cơ sở
- **WHEN** lần sinh thứ nhất cho ra bộ probe không chứng minh được gì
- **THEN** hệ thống sinh lại một lần, prompt kèm nguyên nhân thật và nhắc về import sai module

#### Scenario: lần sinh thứ hai vẫn không đủ cơ sở
- **WHEN** sau lần sinh thứ hai vẫn không probe nào chứng minh được gì
- **THEN** lượt chấm kết thúc bằng lỗi nêu rõ «không đủ cơ sở kết luận» — KHÔNG sinh lần thứ ba, KHÔNG ra `PASS`

### Requirement: Kết cục «không đủ cơ sở» là DỮ LIỆU, không phải một câu chữ

Khi một lượt chấm kết thúc vì không đủ cơ sở kết luận, engine SHALL ghi kết cục ấy thành **trường có
kiểu** trên lượt chấm, phân biệt được với mọi loại lỗi khác bằng máy.

Trường ấy SHALL khai **loại** nguyên nhân, và số probe đã chạy. Hai loại phải phân biệt được:

- **không phép thử nào chạy được đến nơi** — probe viết sai, không probe nào ở trạng thái nói được điều
  gì về pull request;
- **nhánh gốc không có đối chứng** — nhánh gốc không chạy được probe nào, và không probe nào pass trên
  nhánh PR.

Không bề mặt đọc nào (màn chấm, lịch sử, API) được phép nhận diện kết cục này bằng cách **so khớp nội
dung thông điệp lỗi**.

Trạng thái của lượt chấm SHALL vẫn là **lỗi**. Đây là lượt chấm THẤT BẠI, không phải một kết cục thứ ba
ngang hàng PASS/FAIL; trường mới trả lời câu «thất bại kiểu gì», không tạo thêm một kết cục.

*Vì sao phải là dữ liệu chứ không phải câu chữ — đo được: bản trước nhận diện kết cục này bằng
`/không đủ cơ sở/i.test(thông_điệp_lỗi)` ở đúng đường render của màn chấm. Sửa lời văn của thông điệp là
mất tính năng, và không lưới nào đỏ: card biến mất, lượt chấm thất bại hiện thành lỗi hạ tầng, test vẫn
xanh. Một luật mà một lần sửa chính tả xoá được thì không phải luật đang thi hành.*

*Vì sao hai loại phải phân biệt: việc người đọc phải làm khác hẳn nhau. Loại thứ nhất nói probe viết sai —
đọc lại probe. Loại thứ hai nói pull request thêm module mới nên nhánh gốc không có gì để đối chứng — đó
là chuyện bình thường của một PR mở rộng, không phải lỗi của ai.*

#### Scenario: không probe nào nói được điều gì
- **WHEN** lượt chấm kết thúc mà không probe nào ở trạng thái `pass`, `hoi_quy`, `vi_pham_luat_moi` hay `cai_thien`
- **THEN** lượt chấm mang trường kết cục loại «không phép thử nào chạy được đến nơi», kèm số probe

#### Scenario: nhánh gốc không chạy được probe nào
- **WHEN** nhánh gốc chạy được 0 probe VÀ không probe nào pass trên nhánh PR
- **THEN** lượt chấm mang trường kết cục loại «nhánh gốc không có đối chứng» — khác loại ở scenario trên

#### Scenario: lỗi hạ tầng KHÔNG được mang trường này
- **WHEN** lượt chấm hỏng vì nguyên nhân khác — hết token, mạng đứt, clone hỏng
- **THEN** lượt chấm vẫn là lỗi, và KHÔNG mang trường kết cục không-đủ-cơ-sở

#### Scenario: đổi lời văn thông điệp lỗi không đổi hành vi
- **WHEN** nội dung thông điệp lỗi đổi chữ
- **THEN** kết cục vẫn được nhận diện đúng, vì không bề mặt đọc nào so khớp nội dung thông điệp

#### Scenario: lượt chấm cũ trong sổ
- **WHEN** đọc một lượt chấm đã ghi sổ trước khi có trường này
- **THEN** kết cục của nó được suy ra một lần bằng đường di trú tự động và ghi xuống trường mới; đường
  suy ấy MUST NOT sống ở bề mặt đọc

### Requirement: Lượt không đủ cơ sở phải đếm được và lọc được, tách khỏi rổ lỗi hạ tầng

Bề mặt lịch sử SHALL bày kết cục không-đủ-cơ-sở bằng **nhãn riêng**, khác nhãn của lỗi hạ tầng, và SHALL
cho lọc riêng theo kết cục ấy.

Lượt chấm không đủ cơ sở MUST NOT ghi `PASS` hay `FAIL` vào sổ cái, và MUST NOT đổi trạng thái cổng.

*Vì sao phải tách khỏi rổ lỗi: «engine không kết luận được» và «máy chủ hỏng» là hai chuyện có hai người
chịu trách nhiệm khác nhau và hai cách sửa khác nhau. Trộn chúng vào một nhãn «lỗi» thì con số nói lên
chỗ yếu của engine bị con số nói lên chỗ yếu của hạ tầng che mất — mà đó chính là con số cần đo để biết
bộ sinh probe đang khoẻ hay yếu.*

#### Scenario: lọc theo kết cục không đủ cơ sở
- **WHEN** người dùng lọc lịch sử theo «không đủ cơ sở»
- **THEN** chỉ những lượt mang trường kết cục ấy hiện ra — không lẫn lượt lỗi hạ tầng

#### Scenario: nhãn phân biệt được ở bề mặt đọc
- **WHEN** một lượt không đủ cơ sở và một lượt lỗi hạ tầng cùng nằm trong danh sách
- **THEN** hai lượt mang hai nhãn khác nhau

#### Scenario: sổ cái không nhận lượt không đủ cơ sở
- **WHEN** một lượt chấm kết thúc vì không đủ cơ sở
- **THEN** sổ cái không có hàng nào cho lượt ấy, và trạng thái cổng của pull request giữ nguyên như trước
