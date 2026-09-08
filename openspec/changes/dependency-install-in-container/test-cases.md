> ⛔ **Tài liệu này viết TRƯỚC khi có code** (chuẩn OpenSpec của repo). Mọi ô đều `[ ]` trừ những ô ghi rõ
> là kết quả đo từ **nguyên mẫu đã chạy thật** trên prod 07/09 — những ô ấy nói về một phép thử đã xảy ra,
> không phải về code chưa viết.

## Unit / hàm thuần

### `resolveRuntimeImage` — chọn ảnh theo phiên bản, tra bản đồ đóng

- [ ] T1.1 [Scenario: repo khai phiên bản có trong bản đồ]: `.nvmrc` = `24` ⇒ digest của hàng 24
- [ ] T1.2 Thứ tự nguồn: `runner.image` thắng `.nvmrc`, `.nvmrc` thắng `engines.node`. Ba fixture, ba kết quả
- [ ] T1.3 [⛔ Scenario: repo khai phiên bản KHÔNG có trong bản đồ]: `.nvmrc` = `20` ⇒ **từ chối** kèm
      thông điệp nêu `20`; MUST NOT trả ảnh mặc định. Đây là ca chống tái phát: rơi về mặc định là dựng
      lại đúng con bệnh nhịp một vừa làm cho nhìn thấy được
- [ ] T1.4 [Scenario: repo không khai phiên bản nào] ⇒ ảnh mặc định, không từ chối
- [ ] T1.5 [⛔C4 Scenario: chuỗi phiên bản kỳ lạ]: `.nvmrc` chứa `24; rm -rf /` · `lts/*` ·
      `node@sha256:beef…` · chuỗi rỗng · 5 000 ký tự ⇒ **không chuỗi nào xuất hiện trong tên ảnh trả về**.
      Ca này khoá mệnh đề «số chỉ là khoá tra bản đồ»
- [ ] T1.6 `engines.node` = `^24` và `.nvmrc` = `22` (repo tự mâu thuẫn) ⇒ `.nvmrc` thắng, và **log nêu
      mâu thuẫn** — im lặng ở đây là giấu một lỗi của repo đích

### `buildInstallContainerArgs` — hàm thuần, chỗ DUY NHẤT bật mạng

- [ ] T1.7 [Scenario: container cài phụ thuộc]: đối số có mạng · có `--ignore-scripts` trong lệnh · có cả
      ba trần tài nguyên · có `no-new-privileges`
- [ ] T1.8 [⛔ Scenario: thư mục làm việc là thư mục tạm]: **không** đối số `-v` nào trỏ tới bản clone,
      kho khoá, sổ cái, hay thư viện probe. Kiểm bằng cách dò đường dẫn trong mảng đối số, không bằng mắt
- [ ] T1.9 [⛔ `.git` không nhìn thấy được]: không mount nào chứa `.git`
- [ ] T1.10 `npm_config_cache` trỏ vào tmpfs — cache không ghi ra host
- [ ] T1.11 [Scenario: container chạy probe]: `buildContainerArgs` (đường cũ) **vẫn** có cờ tắt mạng. Ca
      hồi quy: change này MUST NOT nới đường cũ

### `installDependencies` — thứ tự bước, và cái gì xảy ra khi hỏng

- [ ] T1.12 [Scenario: cài xong thì kết quả vào bản clone]: trả quyền sở hữu **trước** khi chuyển. Ca khoá
      thứ tự, vì đảo hai bước là để lại `node_modules` không đọc được trong clone
- [ ] T1.13 [⛔ Scenario: cài hỏng giữa chừng]: bốn cách hỏng — mã thoát khác 0 · quá hạn · trả quyền hỏng
      · chuyển hỏng — **cả bốn** để clone nguyên trạng và dọn thư mục tạm
- [ ] T1.14 [Scenario: repo có hình dạng ngoài danh sách đóng]: thiếu `package.json` ⇒ thất bại kèm tên
      file thiếu; MUST NOT chép file ngoài danh sách
- [ ] T1.15 [⛔ Scenario: trình cài báo thành công nhưng phép kiểm vẫn báo thiếu]: mã thoát 0 + thư mục
      rỗng ⇒ **thất bại**. Đây là trạng thái đã đo thật 07/09, không phải ca tưởng tượng
- [ ] T1.16 [⛔C6 Scenario: sửa tay rồi kiểm lại]: cài tay xong, kiểm lại đọc đĩa hiện tại, không cache

### Bản đồ ảnh — lưới nội dung

- [ ] T1.17 **Mọi hàng** trong bản đồ là digest (`@sha256:` + 64 hex), không hàng nào là thẻ. Cặp fixture:
      bản đồ có một hàng dùng thẻ ⇒ ĐỎ; bản đồ toàn digest ⇒ XANH
- [ ] T1.18 Bản đồ có hàng cho **22** và **24**, và digest của hàng 22 **bằng** ảnh mặc định đang dùng —
      chống việc thêm bản đồ mà vô tình đổi ảnh của repo đang chạy tốt

## Lưới tầng 3 — CẶP fixture bắt buộc

- [ ] T2.1 `scanNetworkExceptions` **ĐỎ**: fixture bật mạng ở đường dựng đối số container **chạy probe**
- [ ] T2.2 **XANH**: fixture có đúng một chỗ bật mạng và chỗ ấy là đường cài
- [ ] T2.3 **ĐỎ khi mỏ neo biến mất** — chống xanh oan
- [ ] T2.4 [Scenario: đọc mã nguồn tìm chỗ bật mạng] mã nguồn HIỆN TẠI: đúng **một** chỗ
- [ ] T2.5 `scanInstallCopyList` **ĐỎ**: danh sách chép có `.git`, hoặc có glob · **XANH**: danh sách đóng
      toàn tên file cụ thể · **ĐỎ** khi mỏ neo biến mất
- [ ] T2.6 `scanImageSelectionSites` **ĐỎ**: fixture có một chỗ chọn ảnh không đi qua bản đồ (một trong
      **sáu** chỗ đã đếm) · **XANH**: cả sáu đi qua · **ĐỎ** khi số chỗ chọn ảnh đổi mà lưới không biết

## Tích hợp

- [ ] T4.1 Cài với một registry giả trong container (không ra Internet thật): đường đi đủ bước, kết quả
      kiểm lại đúng. *(Nếu không dựng được registry giả rẻ thì ghi N/A kèm lý do — không tick khống.)*

## Ca đối kháng & hồi quy

- [x] T3.1 ✅ **Mutation, chạy HAI lần**, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả; số ca đỏ
      **khớp hệt** hai vòng, không mục nào SKIP:

      | # | gác bị gỡ | ca đỏ |
      |---|---|---|
      | M1 | `--ignore-scripts` trong lệnh cài | 3 |
      | M2 | chỉ mount thư mục tạm, không mount bản clone | 2 |
      | M3 | phiên bản không có hàng ⇒ TỪ CHỐI (không rơi về mặc định) | 2 |
      | M4 | mọi hàng trong bảng ảnh ghim theo digest | 2 |
      | M5 | trình cài thoát 0 mà không sinh thư mục phụ thuộc ⇒ thất bại | 1 |
      | M6 | danh sách chép ĐÓNG, không có `.git` | 1 |
      | M7 | trả quyền sở hữu TRƯỚC khi chuyển | 1 |

- [x] T3.1b ⛔ **M7 ban đầu cho 0 ca đỏ — gác ấy KHÔNG có lưới nào.** Đúng thứ mutation sinh ra để bắt:
      xoá bước trả quyền thì mọi ca vẫn xanh, trong khi hậu quả thật là một thư mục phụ thuộc mà chính tài
      khoản dịch vụ không đọc được nằm lại trong clone — hỏng im lặng, chỉ lộ ở lượt chấm sau. Đã thêm ca
      «trả quyền HỎNG ⇒ dừng, không chuyển vào clone»; chạy lại M7 ⇒ **1 ca đỏ**.

- [x] T3.1c ⚠️ **Bộ chạy đột biến của chính mình có lỗi, và nó để lại file BẨN.** Phép kiểm «đột biến đã
      vào đĩa» viết là `chuoi_cu not in file`, nhưng M2 là đột biến **cộng thêm** (chuỗi cũ vẫn nằm trong
      chuỗi mới) ⇒ phép kiểm báo động giả ⇒ script thoát **ngoài** khối `finally` ⇒ file ở lại trạng thái
      đã sửa. Vòng sau chạy trên nền hỏng: M1 đi từ 3 ca đỏ thành **5**, và con số ấy vô nghĩa.

      Bắt được vì luật đòi **chạy hai lần và so** — không so thì «5 ca đỏ» trông vẫn như kết quả tốt. Và
      file bẩn khó thấy hơn thường: nó **chưa được git theo dõi** nên `git status` chỉ hiện `??`, không
      hiện diff. Đã sửa: phép kiểm so **toàn văn** và nằm **trong** `try`.

- [x] T3.2 ✅ **Ca đã gãy THẬT — và nó là sự cố tự gây ra trên prod 07/09.** Mount cả bản clone với cờ
      chuyển-chủ-sở-hữu ⇒ chown đệ quy chạm `.git`, hỏng giữa chừng, để lại **78 mục** của bản clone thuộc
      subuid `100999`. Khôi phục: `podman unshare chown -R 0:0` (78 → 37) rồi `sudo chown -R ubuntu:ubuntu`
      (37 mục thuộc `root`, do một lệnh `sudo git fetch` trước đó). Kết thúc **0 mục lệch**, `git fsck`
      sạch, hai nhánh đúng sha, clone `checkmate` không bị chạm. Đây là lý do requirement đầu tiên tồn tại
- [x] T3.3 ✅ **Nguyên mẫu đường đúng đã chạy thật**: thư mục tạm + danh sách đóng + `--ignore-scripts` +
      ảnh Node 24 ⇒ **246 gói, 9 giây, 220 MB, 174 mục cấp một**; trả quyền xong `node_modules` thuộc
      `ubuntu:ubuntu`; chuyển vào clone xong `git fsck` sạch và **0 mục lệch**
- [x] T3.4 ⛔ **CA BÁC BỎ MỘT KẾT LUẬN ĐÃ VIẾT — bản trước của ô này SAI.** Nó khai «số đo bắt phải làm
      D3», suy từ việc cửa kiểm nhịp một vẫn trả `canhBao: ["runtime_lech"]` sau khi cài. Suy sai, không
      kiểm bằng một lần chạy thật. Chạy thật cho:

      | ảnh | tmpfs `.vitest` | kết quả |
      |---|---|---|
      | Node 22 | không | Startup Error · 0 test |
      | Node 24 | không | Startup Error · 0 test |
      | Node 22 | **có** | **158/158 pass** |
      | Node 24 | **có** | **158/158 pass** |

      `engines.node: ^24` chặt hơn mức repo thật sự cần. Thứ chặn lượt chấm code là **một hàng tmpfs
      thiếu** (change `fix-vitest-token-scratch-path`), không phải bản đồ ảnh. D3 tụt từ **chặn** xuống
      **nên làm** — nếu phải cắt phạm vi, đây là mục cắt trước
- [x] T3.6 ✅ **Vế đáng giữ của cái sai trên**: `checkRuntime` cảnh báo chứ không chặn. Đây là ca thật đầu
      tiên chứng minh lựa chọn ấy đúng — chặn cứng thì `admin-fe` đã bị **từ chối oan** trong khi test của
      nó chạy sạch 158/158
- [ ] T3.5 Ca hồi quy cho nhịp một: sau change này, repo **đủ điều kiện** vẫn không bị chặn và không bị
      cảnh báo oan

## Trục nhạy cảm

- [ ] T_bimat ⛔C3 — log của bước cài mang tên gói và tên ảnh; MUST NOT mang nội dung `.npmrc` (file ấy có
      thể chứa token registry). Ca khoá: `.npmrc` chứa `//registry:_authToken=bimat` ⇒ chuỗi ấy không
      xuất hiện trong log, thông điệp, hay kết quả trả về
- [ ] T_failclosed ⛔C2 — cài hỏng ⇒ lượt chấm vẫn **bị chặn** như trước; MUST NOT có đường nào biến «đã
      thử cài» thành «đủ điều kiện»
- [ ] T_cong ⛔C1 — không chạm cổng merge. Bước cài là hành động của người vận hành, vai `tu_dong` không
      gọi được
- [ ] T_khongtincay ⛔C4 — T1.5 là ca khoá: `.nvmrc`, `engines.node`, `.npmrc` đều là dữ liệu repo đích
- [ ] T_colap — T1.8 · T1.9 · T1.11 · T2.1–T2.4. **Trục nặng nhất của change**: đây là container duy nhất
      có mạng trong toàn sản phẩm
- [ ] T_hopdong ⛔C5 — mọi export mới khai trong bảng module của `checkmate.yml`

## Chạy thật — KHÔNG tick trước khi chạy

- [ ] T7.1 Cài `admin-fe` **qua sản phẩm** (không qua shell tay). Log nêu ảnh Node 24, kết quả kiểm lại sạch
- [ ] T7.2 Chạy lượt chấm **code** `admin-fe` PR #8: qua cửa kiểm, **không** cảnh báo runtime, tới bước
      sinh probe. run_id: ____
- [ ] T7.3 Lượt chấm `checkmate` không đổi hành vi. run_id: ____
- [ ] T7.4 Sau khi cài qua sản phẩm: `git fsck` sạch, **0 mục lệch chủ sở hữu**
- [ ] T7.5 Ca hỏng: repo khai phiên bản không có hàng ⇒ từ chối, clone nguyên trạng

## Kiểm tay

- [ ] T8.1 Đọc log một lần cài: có đủ để biết đã kéo gì về máy chủ, bằng ảnh nào, mất bao lâu không?
- [ ] T8.2 Đọc thông điệp từ chối khi phiên bản không có hàng: người vận hành có biết phải làm gì tiếp không?
