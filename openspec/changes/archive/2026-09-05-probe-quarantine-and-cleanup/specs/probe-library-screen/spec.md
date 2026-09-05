## MODIFIED Requirements

### Requirement: Màn thư viện bày cả phần YẾU của tài sản, không chỉ phần đẹp

Màn thư viện probe SHALL hiện, cho **từng** probe: dấu vết hành vi qua các lượt gần nhất, và một dòng tóm
tắt **bằng chữ** nói probe ấy đã bắt được hồi quy hay chưa.

Probe **chưa từng bắt hồi quy nào** SHALL được nói ra bằng đúng câu ấy, MUST NOT bị bỏ trống hay trộn lẫn
với probe có thành tích. Probe **fail ở cả hai nhánh** SHALL được khai là lỗi có sẵn, không phải hồi quy.

Màu SHALL KHÔNG là kênh duy nhất mang một trạng thái: mỗi ô hành vi phải đọc được bằng chữ khi rê chuột, và
dòng tóm tắt phải nói cùng điều ấy bằng chữ.

Probe đang bị **cách ly** SHALL hiện rõ là đang cách ly, kèm lý do và thời điểm, và SHALL phân biệt được với
probe đang chạy bình thường. Nó MUST NOT bị ẩn khỏi màn.

Hành động **phá huỷ** trên màn (gỡ một probe, xoá cả thư viện của một repo) SHALL nói trước **cái mất** —
đây là gì, mất đi thì mất những gì — và SHALL đòi một bước xác nhận tách khỏi cú bấm đầu. Xoá cả thư viện
SHALL đòi người dùng gõ lại đúng tên repo.

*Vì sao bước xác nhận phải đòi gõ tay: thư viện probe là tài sản tích luỹ qua nhiều tháng chấm, và xoá nó là
một chiều. Một hộp thoại «có/không» ở cạnh một nút bấm nhầm không phải một quyết định — nó là một cú bấm
thứ hai.*

*Vì sao: thư viện là tài sản người vận hành phải QUYẾT ĐỊNH trên nó — giữ hay bỏ, tin hay nghi. Một màn chỉ
đếm «89 probe» làm mọi probe trông ngang giá nhau, trong khi 20 cái trong đó có thể đang chết. Bày số đẹp
và giấu chỗ yếu là đúng thứ mà luật «verdict phải khai vùng xám của chính nó» (`man-run`) đã cấm ở một màn
khác của cùng sản phẩm này.*

#### Scenario: probe từng bắt hồi quy
- **WHEN** một probe có ít nhất một lượt mang nhãn hồi quy
- **THEN** dòng tóm tắt của nó nói số lần bắt được hồi quy

#### Scenario: probe im lặng suốt
- **WHEN** một probe chưa từng bắt hồi quy nào
- **THEN** màn nói thẳng «chưa bắt được hồi quy nào», không để trống chỗ ấy

#### Scenario: probe chết kéo dài
- **WHEN** một probe fail ở cả hai nhánh qua nhiều lượt
- **THEN** nó được khai là lỗi có sẵn, không bị đếm như một lần bắt hồi quy

#### Scenario: đọc được khi không phân biệt được màu
- **WHEN** người đọc không dựa vào màu
- **THEN** trạng thái từng lượt vẫn đọc được bằng chữ, và dòng tóm tắt vẫn nói đủ kết luận
