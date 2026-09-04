# data-table-screens Specification

## Purpose
TBD - created by archiving change data-table-screens-ccs. Update Purpose after archive.

## Requirements

### Requirement: Trục sắp xếp phải khớp câu hỏi mà bảng ấy trả lời

Bảng nào tồn tại để trả lời một câu hỏi cụ thể thì SHALL sắp theo **đúng đại lượng của câu hỏi đó**, và
SHALL bày đại lượng ấy thành một **cột nhìn thấy được**.

Bảng thang tin cậy trả lời câu *«ai hay bị bắt lỗi»*. Nó SHALL sắp theo **tỉ lệ PASS giảm dần** và SHALL
có cột tỉ lệ PASS. Nó MUST NOT sắp theo số lượng verdict.

*Vì sao đây không phải chuyện thẩm mỹ: sắp theo số verdict đưa người chấm NHIỀU pull request nhất lên đầu
bảng. Người đọc lướt một bảng đã sắp xếp thì mặc định hiểu «đầu bảng là đáng chú ý nhất» — và ở đây đáng
chú ý nghĩa là hay bị bắt lỗi. Bảng vì thế nói một điều SAI về một con người, bằng đúng cơ chế mà người
đọc tin nhất là thứ tự.*

*Và đại lượng phải HIỆN RA: sắp theo một con số không có trong bảng thì người đọc không kiểm được thứ tự,
chỉ có thể tin nó.*

#### Scenario: thứ tự theo tỉ lệ PASS
- **WHEN** một tác giả có 20 verdict với tỉ lệ PASS 50%, một tác giả khác có 4 verdict với tỉ lệ 100%
- **THEN** người có tỉ lệ cao đứng trước — thứ tự không đổi theo số verdict

#### Scenario: tỉ lệ PASS là một cột
- **WHEN** bảng thang tin cậy hiện ra
- **THEN** tỉ lệ PASS có cột riêng, đọc được cho từng tác giả

#### Scenario: chưa có verdict nào
- **WHEN** một tác giả có 0 verdict
- **THEN** tỉ lệ PASS không được là một phép chia cho 0 hay một con số bịa; hàng vẫn đọc được

### Requirement: Con số tổng tính trên phần ĐÃ LỌC, và đứng trước bảng

Màn nào có bộ lọc VÀ có dòng tổng thì dòng tổng SHALL tính trên **phần đã lọc**, không phải trên toàn bộ
dữ liệu, và SHALL đứng **trước** bảng.

Sổ cái verdict SHALL có dòng tổng gồm: số verdict · số PASS · số FAIL · tổng high/medium/low · tổng token.

*Vì sao phải tính trên phần đã lọc: người lọc theo một repo rồi đọc dòng tổng của MỌI repo sẽ rút ra kết
luận về repo mình vừa lọc. Con số đúng đặt cạnh bộ lọc sai là một câu nói dối không ai cố ý nói ra.*

*Vì sao phải đứng trước: dòng tổng là câu trả lời, bảng là chứng cứ. Đặt câu trả lời sau chứng cứ thì
người đọc phải cuộn hết bảng mới biết mình đang xem cái gì — mà bảng thì dài dần theo thời gian.*

#### Scenario: lọc theo một repo
- **WHEN** người dùng lọc sổ cái theo một repo
- **THEN** mọi con số trong dòng tổng chỉ tính các hàng của repo ấy

#### Scenario: không lọc
- **WHEN** không có bộ lọc nào đang bật
- **THEN** dòng tổng tính trên toàn bộ, và trang nói rõ đang gộp mọi repo

#### Scenario: lọc ra tập rỗng
- **WHEN** bộ lọc không khớp hàng nào
- **THEN** dòng tổng hiện các số 0 — không ẩn đi, không hiện số của tập chưa lọc

### Requirement: Định danh artifact có một khuôn dùng chung trên mọi bảng

Mọi bảng bày một lượt chấm hay một verdict SHALL dựng định danh artifact bằng **một khuôn dùng chung**:
tên artifact ở dòng chính, và `repo`, số pull request, mã commit ở **dòng phụ mono** dưới nó.

Repo và mã commit MUST NOT là cột riêng.

*Vì sao một khuôn: ba bảng bày cùng một thứ theo ba kiểu thì mắt phải học lại cách đọc ở mỗi màn. Và mỗi
kiểu là một chỗ để lệch — khuôn dùng chung làm việc sửa một lần có hiệu lực ở cả ba.*

*Vì sao không tách cột: repo và SHA là **phần định danh của cùng một artifact**, không phải hai thuộc tính
độc lập. Tách ra thì bảng rộng thêm hai cột và mắt phải ghép ba ô mới biết một hàng nói về cái gì.*

#### Scenario: lượt chấm gắn pull request
- **WHEN** một hàng bày lượt chấm của một pull request
- **THEN** dòng phụ có `repo`, số pull request và bảy ký tự đầu của commit

#### Scenario: tài liệu rời
- **WHEN** một hàng bày lượt chấm một tài liệu rời, không có pull request
- **THEN** dòng phụ vẫn đọc được và không bịa ra số pull request nào

#### Scenario: thiếu trường
- **WHEN** một hàng thiếu repo hoặc thiếu commit
- **THEN** khuôn vẫn dựng được, phần thiếu không hiện ra như một giá trị rỗng gây hiểu nhầm
