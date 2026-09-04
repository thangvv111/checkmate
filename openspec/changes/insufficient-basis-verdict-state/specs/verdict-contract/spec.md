## ADDED Requirements

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
