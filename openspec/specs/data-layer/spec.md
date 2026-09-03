# data-layer Specification

## Purpose
TBD - created by archiving change data-layer. Update Purpose after archive.

## Requirements

### Requirement: Mọi truy cập dữ liệu đi qua lớp kho, và lớp kho là nơi DUY NHẤT biết nền lưu trữ

Route, tầng dựng giao diện và harness SHALL truy cập dữ liệu **qua lớp kho**, MUST NOT gọi SQL trực tiếp
(gốc: R9.1). Lớp kho SHALL là nơi **duy nhất** biết mình đang chạy trên nền lưu trữ nào; kiểu nó trả ra là
kiểu nghiệp vụ của ứng dụng, không phải hàng của cơ sở dữ liệu (gốc: R9.2). Đây là điều kiện để đổi được
nền lưu trữ mà không phải sờ vào chỗ khác.

Route `/api/*` SHALL chỉ đọc qua lớp kho và trả **dữ liệu thuần**: không dựng HTML (gốc: R9.16).

Ba ngoại lệ SHALL được khai rõ, vì luật viết tuyệt đối sẽ nói quá code và người sau sẽ đi «sửa» đúng chỗ
không nên sửa:

| ngoại lệ | vì sao không phải vi phạm |
|---|---|
| ghi **file tạm** để truyền cho tiến trình chấm qua tham số | file tạm không phải dữ liệu của ứng dụng |
| đọc metadata build (số phiên bản) | không phải dữ liệu của ứng dụng |
| đọc **sổ sự kiện của lượt chấm** từ đĩa | file là NGUỒN, bảng là bản đọc — xem requirement riêng |

Luật «một cửa» này MUST được cưỡng chế bằng lưới quét source với **danh sách CHO PHÉP vị trí**, mỗi ngoại lệ
ghi kèm lý do — không bằng quy ước.

#### Scenario: một file ngoài lớp kho gọi SQL
- **WHEN** một file ngoài lớp kho chạy câu SQL trực tiếp
- **THEN** lưới ĐỎ, nêu đúng file

#### Scenario: ngoại lệ đã khai
- **WHEN** một chỗ trong danh sách cho phép đọc/ghi đĩa
- **THEN** lưới xanh — và danh sách ghi kèm lý do để người đọc biết vì sao

### Requirement: File là NGUỒN, bảng là bản đọc — và chỉ có đường một chiều dựng lại

Với sổ sự kiện của một lượt chấm, **file trên đĩa là nguồn** và bảng trong cơ sở dữ liệu là **bản đọc**
dựng ra từ nó.

Khi bảng trống mà sổ trên đĩa có dữ liệu, hệ SHALL **đọc sổ**. Bảng chỉ được ghi lúc lượt chấm đóng, nên
một lượt bị giết giữa chừng có đủ dấu vết trên đĩa trong khi bảng thì trống — đọc mỗi bảng ở đó nghĩa là mở
lại một lượt đã chết và thấy **trống rỗng**, đúng thứ ⛔C2 cấm: «không đọc được» hiện thành «không có gì».

Đường dựng lại SHALL là **một chiều**: từ đĩa sang bảng, không bao giờ ngược lại. Bảng là bản phái sinh; cho
nó ghi đè nguồn là mất dấu vết của đúng những lượt chấm đã chết giữa chừng — tức mất bằng chứng ở đúng ca
người ta cần nó nhất.

Dòng hỏng trong sổ SHALL bị bỏ **đúng dòng đó**, không làm hỏng cả sổ (gốc: R9.9): tiến trình chết giữa lúc
ghi để lại một dòng cụt ở cuối, và đó là chuyện bình thường chứ không phải hư hỏng — «đọc được tới đây» là
câu trả lời đúng, «không có gì» thì không.

#### Scenario: bảng trống, đĩa có
- **WHEN** mở một lượt chấm mà bảng sự kiện trống nhưng sổ trên đĩa có dữ liệu
- **THEN** đọc từ đĩa, và dựng lại bảng cho lần sau

#### Scenario: dòng cụt ở cuối sổ
- **WHEN** sổ sự kiện có một dòng hỏng
- **THEN** bỏ đúng dòng ấy, các dòng còn lại vẫn đọc được

### Requirement: Sổ cái chỉ-ghi-thêm, và điều đó được cưỡng chế ở tầng cơ sở dữ liệu

Bảng sổ cái SHALL chỉ nhận thêm hàng; `UPDATE` và `DELETE` lên bảng đó SHALL bị **từ chối ở tầng cơ sở dữ
liệu** (gốc: R9.4), không phải bằng kỷ luật của người viết code. `INSERT OR REPLACE` cũng SHALL bị từ chối —
nó là `DELETE` rồi `INSERT` đội lốt, và nó ghi đè âm thầm.

`PRAGMA recursive_triggers` là thiết lập **theo từng kết nối**, không phải theo cơ sở dữ liệu (gốc: R9.4b) —
đặt một lần lúc tạo bảng thì kết nối sau không có nó, và lưới chống ghi đè im lặng biến mất.

Một verdict SHALL chỉ vào sổ **đúng một lần** (gốc: R9.5); vào lần hai bị từ chối chứ không ghi đè.

Sổ hành động cổng — ai merge, ai trả về dev, chấp nhận cảnh báo nào — SHALL là **bảng riêng** và cũng
chỉ-ghi-thêm (gốc: R9.6). Hành động ngoài merge và trả-về-dev SHALL bị chặn.

#### Scenario: sửa hàng sổ cái
- **WHEN** chạy `UPDATE` hoặc `DELETE` lên bảng sổ cái
- **THEN** bị từ chối ở tầng cơ sở dữ liệu

#### Scenario: cùng một verdict vào sổ hai lần
- **WHEN** một run đã có trong sổ được ghi lại
- **THEN** bị từ chối, không ghi đè âm thầm

#### Scenario: hành động lạ trên sổ cổng
- **WHEN** ghi một hành động không phải merge hay trả-về-dev
- **THEN** bị chặn

### Requirement: Di trú không xoá nguồn, đếm được phần bỏ qua, và chạy lại không nhân đôi

Dữ liệu đang nằm trên đĩa SHALL được di trú vào cơ sở dữ liệu (gốc: R9.7), nhưng di trú MUST NOT xoá file
gốc (gốc: R9.8) — chúng ở lại làm **bản đối chứng**.

Dòng hỏng trong file nguồn MUST NOT làm sập cả lượt di trú, và phần bỏ qua SHALL được **đếm và nói ra**
(gốc: R9.9): một lượt di trú báo «xong» mà im lặng bỏ mất vài bản ghi là lượt di trú nói dối.

Chạy lại di trú SHALL không nhân đôi bản ghi.

#### Scenario: file gốc sau di trú
- **WHEN** di trú xong
- **THEN** file gốc còn nguyên trên đĩa

#### Scenario: dòng hỏng trong nguồn
- **WHEN** file nguồn có dòng hỏng hoặc bản ghi thiếu khoá
- **THEN** chúng bị bỏ qua NHƯNG được đếm, và tóm tắt nói ra số bỏ qua

#### Scenario: chạy lại
- **WHEN** di trú chạy lần hai
- **THEN** không bản ghi nào bị nhân đôi

### Requirement: Cấu hình và kho khoá CỐ Ý ở lại dạng file

Cấu hình và kho khoá SHALL ở lại dạng file, MUST NOT vào cơ sở dữ liệu (gốc: R9.13), vì hai lý do và cả hai
đều là lý do an toàn:

- **Đường cứu hộ**: sửa file bằng tay là cách duy nhất chữa được một cấu hình sai làm giao diện không lên
  được. Đó cũng là chỗ ⛔C6 sinh ra — sửa tay phải có hiệu lực ở lượt đọc kế tiếp.
- **Bí mật trong cơ sở dữ liệu thì mọi bản sao lưu đều mang theo khoá.** Một bản dump để gỡ lỗi, một bản
  chép sang máy khác, một file sao lưu đêm — mỗi thứ thành một bản sao của kho khoá.

Chúng vẫn SHALL đi qua một cửa đọc/ghi duy nhất, không phải mỗi chỗ tự mở file.

#### Scenario: sửa cấu hình bằng tay
- **WHEN** cấu hình được sửa trực tiếp trên đĩa
- **THEN** lượt đọc kế tiếp thấy giá trị mới

### Requirement: Lọc, sắp xếp và phân trang chạy dưới cơ sở dữ liệu, và giá trị người dùng nhập phải qua tham số

Lọc và phân trang SHALL chạy **dưới cơ sở dữ liệu**, MUST NOT nạp cả bảng lên bộ nhớ rồi lọc (gốc: R9.18).
Các cột dùng để lọc và sắp xếp thường xuyên SHALL có index (gốc: R9.11).

Mọi giá trị do người dùng nhập vào câu truy vấn SHALL đi qua **tham số**, không ghép chuỗi (gốc: R9.12).

Mở cơ sở dữ liệu SHALL bật khoá ngoại và dùng chế độ nhật ký phù hợp (gốc: R9.3).

#### Scenario: dấu nháy trong chuỗi tìm
- **WHEN** người dùng tìm một chuỗi chứa dấu nháy
- **THEN** câu truy vấn không bị phá, kết quả trả về đúng

#### Scenario: đếm số lượt đang chạy
- **WHEN** cần biết có bao nhiêu lượt đang chạy
- **THEN** đếm dưới cơ sở dữ liệu, không nạp danh sách lên bộ nhớ
