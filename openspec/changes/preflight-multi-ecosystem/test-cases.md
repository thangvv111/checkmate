## Unit — `test/probe-environment.test.ts`

### Nhận diện hệ sinh thái — bảng ĐÓNG, cặp fixture

- [x] T1.1 **ĐỎ**: hàng thiếu file dấu hiệu · hàng thiếu tên hiển thị · dấu hiệu là **mẫu/đường dẫn**
      (`**/build.gradle`) thay vì tên file ở gốc
- [x] T1.2 **ĐỎ khi bảng rỗng** — chống xanh oan
- [x] T1.3 **XANH**: bảng HIỆN TẠI sạch, đủ **bốn** hệ theo đúng thứ tự `node · maven · gradle · python`,
      và **chỉ Node** mang cờ `engineCapPhuThuoc` — ghim đúng sự thật hôm nay
- [x] T1.4 [Scenario: repo không khớp hệ nào] thư mục rỗng ⇒ `null`
- [x] T1.5 Repo **lai** (có cả `pom.xml` lẫn `package.json`) ⇒ **`node`** thắng, vì đó là đường duy nhất
      engine cấp được phụ thuộc
- [x] T1.6 Gradle nhận qua **cả hai** tên file (`build.gradle`, `build.gradle.kts`); Python qua **cả hai**
      (`requirements.txt`, `pyproject.toml`)

### ⛔ Ca chống tái phát lỗi 08/09 — thông điệp không kê lệnh của hệ khác

- [x] T2.1 [Scenario: repo dùng hệ engine chưa cấp được phụ thuộc]: Maven · Gradle · Python đều ⇒
      `kind = 'he_chua_ho_tro'`, thông điệp nêu **đúng tên hệ**, và `cach_sua` **vắng** — engine không biết
      lệnh nào đúng thì không kê lệnh nào
- [x] T2.2 [⛔ trục chính, Scenario: thông điệp không bao giờ kê nhầm hệ]: gom **cả bốn** bề mặt chữ
      (`thong_diep` · `cach_sua` · `describeEnvironmentFailure('thieu_phu_thuoc')` ·
      `describeEnvironmentFailure('he_chua_ho_tro')`) cho từng hệ không-Node, khẳng định **không** khớp
      `/npm (ci|install)/` và **không** chứa `node_modules`. Đây là ca của **chính lỗi đã xảy ra**
- [x] T2.3 [Scenario: dừng vì hệ chưa được hỗ trợ]: thông điệp nêu «Java/Maven», nói rõ **KHÔNG phải lỗi
      của pull request**, và không nhắc `npm`/JUnit/XML
- [x] T2.4 ⛔ **HỒI QUY — repo Node đi Y HỆT đường cũ**: thiếu phụ thuộc ⇒ `thieu_phu_thuoc` + `npm install`
      · `describeEnvironmentFailure` vẫn nêu `npm ci` · đã cài ⇒ không chặn · khai rỗng ⇒ không chặn ·
      không dấu hiệu nào ⇒ không kết luận
- [x] T2.5 `preflightProbeEnvironment` chặn hệ chưa hỗ trợ **trước lời gọi model**, và **không dựng
      container** hỏi phiên bản (repo Maven không khai `engines.node`)

### Ca cũ vẫn xanh

- [x] T3.1 Toàn bộ 44 ca của change `probe-environment-preflight` giữ nguyên, không sửa ca nào.
      Tổng file: **54 ca** (44 cũ + 10 mới).

## Ca đối kháng

- [x] T4.1 **Mutation, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả; số ca đỏ
      **khớp hệt** hai vòng:

      | # | gác bị gỡ | ca đỏ |
      |---|---|---|
      | M1 | hệ không phải Node thì CHẶN sớm | 2 |
      | M2 | hàng `maven` có mặt trong bảng đóng | 6 |
      | M3 | thông điệp không kê lệnh npm cho hệ khác | 1 |
      | M4 | thông điệp riêng cho hệ chưa hỗ trợ | 1 |
      | M5 | `detectEcosystem` nhận ra hệ qua file dấu hiệu | 11 |

- [x] T4.2 **Lưới định danh bắt được lỗi của chính change này**: bản đầu đặt tên hàm `hangHe` (tiếng
      Việt, cấp module) — `test/identifier-language.test.ts` ĐỎ ngay ở lượt chạy toàn bộ. Đổi thành
      `ecosystemRow`. Ghi lại vì đây là lưới làm đúng việc trên chính người viết nó

## Trục nhạy cảm

- [x] T_khongtincay ⛔C4 — **trục chính**. Tên file dấu hiệu là **hằng trong mã**; thứ đến từ repo đích chỉ
      là *file ấy có tồn tại không*. Repo đích **không tự khai được** hệ của mình — nếu khai được, nó sẽ tự
      chọn nhánh «Node, đủ phụ thuộc» để lách cửa kiểm. T1.1 khoá vế «dấu hiệu phải là tên file, không phải
      mẫu»
- [x] T_failclosed ⛔C2 — bốn nhánh: Node thiếu ⇒ chặn · Node đủ ⇒ đi tiếp · hệ chưa hỗ trợ ⇒ **chặn (mới)**
      · không nhận ra ⇒ đi tiếp. Không nhánh nào ra PASS; hướng bỏ sót rơi về hành vi hôm nay
- [x] T_cong ⛔C1 — change **siết**: thêm một lớp repo bị chặn sớm hơn. Không chạm cổng merge
- [x] T_bimat ⛔C3 — chỉ đọc **sự tồn tại** của file, không đọc nội dung `pom.xml` hay `.npmrc`; thông điệp
      mang tên hệ và đường dẫn clone, không mang khoá
- [x] T_hopdong ⛔C5 — `detectEcosystem` và `ECOSYSTEMS` khai trong bảng module `checkmate.yml`; lưới xanh
- [N/A] T_colap — không nới mount, không mở mạng, không chạy lệnh mới

## Chạy thật — KHÔNG tick trước khi chạy

- [ ] T7.1 Sau deploy, chấm lại `admin-be` PR #13: kỳ vọng dừng **trước stage 3**, thông điệp nêu
      **Java/Maven**, **không** có chữ `npm`. run_id: ____
- [ ] T7.2 Chấm `checkmate` (Node, đủ phụ thuộc): đi hết như cũ, không cảnh báo mới. run_id: ____
- [ ] T7.3 Chấm `portal-fe` (Node, **chưa** cài phụ thuộc): chặn với thông điệp **Node** kèm `npm ci` —
      vế hồi quy, chứng minh đường Node không bị đổi. run_id: ____
