# Test cases — data-layer

Requirement: R-1 «Mọi truy cập dữ liệu qua lớp kho, lớp kho là nơi duy nhất biết nền lưu trữ» · R-2 «File là
NGUỒN, bảng là bản đọc» · R-3 «Sổ cái chỉ-ghi-thêm, cưỡng chế ở tầng cơ sở dữ liệu» · R-4 «Di trú không xoá
nguồn, đếm phần bỏ qua, chạy lại không nhân đôi» · R-5 «Cấu hình và kho khoá cố ý ở lại file» · R-6 «Lọc,
sắp xếp, phân trang chạy dưới cơ sở dữ liệu».

**~11 điều đã có ca** — bảng dưới đối chiếu, không lặp lại.

## Đối chiếu: scenario ↔ ca đã có

### R-3 sổ cái chỉ-ghi-thêm
- [ ] T3.1 «UPDATE lên bảng sổ cái bị TỪ CHỐI ở tầng cơ sở dữ liệu» ✓ có (R9.4).
- [ ] T3.2 «DELETE lên bảng sổ cái bị TỪ CHỐI» ✓ có (R9.4).
- [ ] T3.3 «INSERT OR REPLACE bị TỪ CHỐI, không âm thầm ghi đè» ✓ có (R9.4b).
- [ ] T3.4 «cùng một run vào sổ hai lần thì bị từ chối» ✓ có (R9.5).
- [ ] T3.5 «cũng chỉ ghi thêm — sửa và xoá đều bị từ chối» (sổ cổng) ✓ có (R9.6).
- [ ] T3.6 «hành động ngoài merge và reject bị chặn» ✓ có (R9.6).

### R-4 di trú
- [ ] T4.1 «KHÔNG xoá file gốc — chúng ở lại làm bản đối chứng» ✓ có (R9.8).
- [ ] T4.2 «dòng hỏng và bản ghi thiếu khoá bị bỏ qua nhưng ĐƯỢC ĐẾM» ✓ có (R9.9).
- [ ] T4.3 «tóm tắt nói ra số bỏ qua để người vận hành thấy» ✓ có (R9.9).
- [ ] T4.4 «chạy lại lần hai không đẻ thêm hàng nào (idempotent)» ✓ có.

### R-6 lọc và phân trang
- [ ] T6.1 «dấu nháy trong chuỗi tìm không phá được câu truy vấn» ✓ có (R9.12).
- [ ] T6.2 «phân trang bằng giới hạn và bỏ qua» ✓ có (R9.18).
- [ ] T6.3 «đếm số lượt đang chạy không cần nạp gì lên bộ nhớ» ✓ có (R9.18).
- [ ] T6.4 «các bộ lọc chồng nhau theo kiểu VÀ» / «lọc theo repo tách bạch» ✓ có (R9.10).

### R-2 dòng hỏng trong sổ sự kiện
- [ ] T2.1 «một dòng sự kiện hỏng không làm hỏng cả lượt phát lại» ✓ có (R9.9 phần sổ sự kiện).

## Ca MỚI

### R-1 lưới kiến trúc (R9.1 · R9.2 · R9.16)
- [ ] T7.1 Quét repo hiện tại → không file nào ngoài lớp kho gọi SQL trực tiếp, trừ danh sách cho phép.
- [ ] T7.2 **Fixture đối kháng**: một file giả ngoài lớp kho chạy SQL → lưới ĐỎ, nêu đúng file.
      *Ca load-bearing: phép quét trả rỗng trông giống hệt «repo sạch» và «phép quét hỏng».*
- [ ] T7.3 Danh sách ngoại lệ ghi **loại lý do**, không chỉ đường dẫn. *Danh sách chỉ có đường dẫn được nới
      bằng cách thêm dòng; danh sách đòi lý do buộc người thêm phải nói lý do ấy thuộc loại nào.*
- [ ] T7.4 Route `/api/*` không dựng HTML.

### R-2 file là nguồn (nguyên tắc chưa ai khai)
- [ ] T8.1 Bảng sự kiện trống mà sổ trên đĩa có → đọc từ đĩa, và bảng được dựng lại cho lần sau.
      *Bảng chỉ được ghi lúc lượt chấm đóng; đọc mỗi bảng nghĩa là mở lại một lượt đã chết và thấy TRỐNG
      RỖNG — đúng thứ ⛔C2 cấm.*
- [ ] T8.2 Đường dựng lại là **MỘT CHIỀU**: không có đường nào ghi từ bảng ngược ra đĩa.
      *Cho bảng ghi đè nguồn là mất dấu vết của đúng những lượt đã chết giữa chừng.*

### R-5 cấu hình cố ý ở lại file (⛔C6)
- [ ] T9.1 Sửa cấu hình trên đĩa → lượt đọc kế tiếp thấy giá trị mới.

### R-6 schema (R9.3 · R9.11)
- [ ] T10.1 Mở cơ sở dữ liệu bật khoá ngoại và chế độ nhật ký (ca đọc schema, D4).
- [ ] T10.2 Cột dùng để lọc/sắp xếp có index. *Cái mất: ca không chứng minh truy vấn THẬT SỰ dùng index —
      phần ấy thuộc quan sát lúc vận hành.*

## Mutation (load-bearing) — mỗi chiều chạy HAI lần

- [ ] T11.1 Thêm file ngoài lớp kho gọi SQL → T7.2 ĐỎ.
- [ ] T11.2 Bỏ nhánh «bảng trống thì đọc đĩa» → T8.1 ĐỎ.
- [ ] T11.3 Bỏ index khỏi schema → T10.2 ĐỎ.
- [ ] T11.4 Bỏ `PRAGMA foreign_keys` → T10.1 ĐỎ.

## Trục nhạy cảm

- [ ] T_bimat — R9.13: bí mật ở lại file **vì** bí mật trong cơ sở dữ liệu thì mọi bản sao lưu đều mang
      theo khoá. `R9.17` (không route nào trả bí mật) thuộc `response-secret-guard`.
- [ ] T_failclosed — T8.1: «không đọc được» KHÔNG được hiện thành «không có gì». Đây là chỗ ⛔C2 sống ở
      tầng dữ liệu.
- [N/A] T_cong — không đụng verdict, không đụng cổng merge.
- [ ] T_khongtincay — T6.1: giá trị người dùng nhập vào truy vấn đi qua tham số, không ghép chuỗi.
- [ ] T_hopdong — change không thêm export sản phẩm; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [ ] T12.1 Không có — mọi thứ ở change này kiểm được bằng máy.
