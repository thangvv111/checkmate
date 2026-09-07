> ⛔ **Change này mở bề mặt nặng nhất sản phẩm từng mở**: một container **có mạng**, chạy trên máy chủ của
> bên chấm, để kéo về mã do repo **bị chấm** chỉ định. Tài liệu này là chỗ lập luận vì sao nó vẫn đứng
> được — và chỗ khai những gì nó **không** đóng.

## S1. Bí mật & rò rỉ

- ⚠️ S1.1 **Bề mặt mới có thật: `.npmrc` của repo đích được chép vào thư mục cài.** File ấy là chỗ chuẩn để
  đặt token registry (`//registry.npmjs.org/:_authToken=…`). Với `admin-fe` nó chỉ chứa
  `engine-strict=true` (19 byte, đã đọc), nhưng repo sau có thể khác.

  Ràng buộc: nội dung `.npmrc` MUST NOT vào log, thông điệp, hay kết quả trả về — ca khoá `T_bimat`. Nó
  được chép **để dùng**, không để đọc ra.

  Không chép nó cũng không phải lựa chọn an toàn hơn: `engine-strict=true` là thứ làm `npm ci` từ chối
  đúng lúc cần từ chối. Bỏ nó đi là làm bước cài **im lặng thành công sai**.
- ✅ S1.2 — kho khoá, `config.json`, `.ncc-verify.json` không nằm trong mount nào của container cài (T1.8).
- ✅ S1.3 — cache của trình quản lý gói trỏ vào tmpfs, không ghi ra host (T1.10). Nó có thể mang thông tin
  đăng nhập registry.
- ✅ S1.4 — log ghi **tên gói** và **tên ảnh**; đó là thứ người vận hành cần để biết cái gì vừa được kéo về
  máy của họ.

## S2. Danh tính, phiên, vai

- ✅ S2.1 — bước cài là hành động của **người vận hành**, đi qua cửa phiên như mọi route khác.
- ✅ S2.2 — vai `tu_dong` MUST NOT gọi được (T_cong). Đây là hệ quả trực tiếp của D5.

## S3. Cổng & quyền của máy (⛔C1)

- ✅ S3.1 — không chạm cổng merge, không chạm `decideResult`, không thêm đường nào cho máy nói CÓ.
- ✅ S3.2 — **ranh giới «máy không tự cài» KHÔNG phải ⛔C1 và không được nhầm với nó.** ⛔C1 nói máy không
  được đưa code vào trunk. Ở đây máy không bị cấm hành động — nó bị cấm hành động **im lặng**, vì cài là
  quyết định về *cái gì được phép nằm trên máy chủ này*. Ghi rõ để người sau không nới nó bằng lý lẽ «⛔C1
  chỉ nói về merge».

## S4. Dữ liệu không tin cậy & prompt injection (⛔C4)

- ✅ S4.1 — **ba nguồn dữ liệu ngoài mới**: `.nvmrc` · `engines.node` · `.npmrc`. Hai cái đầu chỉ dùng làm
  **khoá tra một bản đồ đóng**; số đọc ra MUST NOT ghép vào tên ảnh. Ca khoá T1.5 thử `24; rm -rf /`,
  `lts/*`, `node@sha256:beef…`, chuỗi rỗng, 5 000 ký tự.

  Vì sao vế này nặng: ghép chuỗi từ repo đích vào tên ảnh nghĩa là **repo bị chấm tự chọn được ảnh chạy
  trên máy chủ bên chấm** — tức chọn được cả môi trường mà bằng chứng của chính nó được tạo ra.
- ✅ S4.2 — `runner.image` vẫn qua `safeImageName` như cũ; change này không nới phép kiểm ấy.
- ⚠️ S4.3 — **registry công cộng là nguồn không tin cậy, và change này KHÔNG đóng được điều đó.**
  `--ignore-scripts` chặn thực thi **lúc cài**; mã của gói vẫn nằm trên đĩa và vẫn chạy **lúc chạy probe** —
  trong container không mạng, chỉ đọc, có ba trần tài nguyên. Đó là mức bảo vệ hiện có, không hơn, và nó
  giống hệt mức mà mọi `npm install` trên máy dev có.

  Điều change này **thêm** so với `npm ci` gõ tay: script cài không chạy, và cây phụ thuộc được xây trong
  một container dùng-một-lần thay vì trên máy chủ trần.

## S5. Sandbox & thực thi — TRỤC NẶNG NHẤT

- ✅ S5.1 **Ngoại lệ mạng có TÊN.** `sandbox-isolation` khai «mạng ra ngoài SHALL tắt mặc định». Chữ «mặc
  định» cho phép ngoại lệ; điều nó không cho phép là ngoại lệ **không ai rà lại được**. Nên nó thành một
  requirement, và có scenario bắt **đếm bằng máy** số chỗ bật mạng — phải đúng **một** (T2.1–T2.4).
- ✅ S5.2 **Điều kiện then chốt là D2, không phải cờ mạng.** Mạng một mình không nguy hiểm; code repo đích
  một mình đã bị chặn bởi `--network=none`. Thứ nguy hiểm là **giao** của hai cái, và `--ignore-scripts`
  cắt đúng giao ấy: thứ duy nhất chạy trong container có mạng là trình quản lý gói — chương trình của bên
  **chấm**, không phải của bên **bị chấm**.

  Số đo ủng hộ cái giá: toàn cây phụ thuộc `admin-fe` có **1/246** gói khai script cài, và nó chỉ chạy trên
  macOS.
- ✅ S5.3 **Repo đích MUST NOT tự bật script cài.** Một khoá `checkmate.yml` xin chạy script cài là maker
  chỉnh checker ở đúng chỗ nguy hiểm nhất — repo bị chấm tự mở đường chạy code tuỳ ý trên máy chủ đang
  chấm nó. Không có khoá ấy, và requirement khai thẳng là nó MUST NOT có tác dụng nếu ai đó viết vào.
- ⚠️ S5.4 **Ba trần tài nguyên của bước cài LỎNG HƠN của lượt chạy probe** — `2g` / `2` CPU / `512` tiến
  trình, so với `512m` / `1` / `128`. Lý do: cài 246 gói giải nén song song thì trần của lượt chạy probe
  không đủ. Khai ra vì đây là một sự nới thật, không phải một chi tiết: nó vẫn có trần, và trần ấy vẫn
  chặn được một lần cài chạy loạn kéo sập máy chủ.
- ✅ S5.5 `no-new-privileges` và `--user` giữ nguyên như đường probe.

## S6. Tầng dữ liệu & quyền file — chỗ ĐÃ GÃY THẬT

- ✅ S6.1 **Bản clone MUST NOT được mount, dù chỉ đọc.** Đây là requirement đầu tiên và cứng nhất, và nó
  tồn tại vì một sự cố **đã xảy ra trên prod 07/09** trong lúc thử nguyên mẫu:

  | | |
  |---|---|
  | thử | mount cả bản clone với cờ chuyển-chủ-sở-hữu |
  | hỏng | chown đệ quy chạm `.git`, `operation not permitted`, dừng giữa chừng |
  | hậu quả | **78 mục** của bản clone thuộc subuid `100999` — tài khoản dịch vụ không đọc được |
  | khôi phục | `podman unshare chown -R 0:0` (78 → 37) + `sudo chown -R ubuntu:ubuntu` (37 mục thuộc `root`) |
  | kết thúc | **0 mục lệch**, `git fsck` sạch, hai nhánh đúng sha, clone `checkmate` không bị chạm |

- ✅ S6.2 **`.git` là thứ phải GIẤU, không chỉ thứ nên giấu.** Bản clone ghi được nghĩa là **đối tượng bị
  chấm sửa được đối chứng của chính nó**: viết lại `main` trong clone là đổi nhánh gốc mà verdict so sánh
  vào. Cùng loại tấn công với «probe sửa thư viện probe», chỉ khác cửa — và cửa này chưa ai khai trước
  change này.
- ✅ S6.3 — trả quyền sở hữu **trước** khi chuyển vào clone (T1.12). Đảo hai bước là để lại một
  `node_modules` không đọc được nằm trong clone — hỏng im lặng, chỉ lộ ở lượt chấm sau.
- ✅ S6.4 — hỏng ở bất kỳ bước nào ⇒ clone **nguyên trạng**, thư mục tạm được dọn (T1.13, bốn cách hỏng).

## S7. Fail-closed & bất biến verdict (⛔C2)

- ✅ S7.1 — **không tin mã thoát, tin phép kiểm.** `npm ci` đã từng thoát 0 sau khi cài dở dang và để lại
  thư mục rỗng — trạng thái đo thật 07/09. Cài xong chạy **lại đúng cửa của nhịp một**; còn báo thiếu ⇒
  ghi thất bại (T1.15).
- ✅ S7.2 — dùng LẠI cửa cũ chứ không viết cửa thứ hai. Hai biểu thức cho một luật thì sẽ lệch — khuôn cửa
  song sinh, đã bị bắt chín lần ở repo này. Ở đây lệch nghĩa là bảng điều khiển báo «đã cài» còn lượt chấm
  vẫn chặn.
- ✅ S7.3 — cài hỏng ⇒ lượt chấm vẫn bị chặn như trước. Không đường nào biến «đã thử cài» thành «đủ điều
  kiện» (T_failclosed).
- ✅ S7.4 — phiên bản không có hàng trong bản đồ ⇒ **từ chối**, không rơi về ảnh mặc định. Rơi về mặc định
  là tái tạo đúng con bệnh nhịp một vừa mất công làm cho nhìn thấy được.

## S8. Leo quyền & cô lập

- ✅ S8.1 — không dùng `--userns=keep-id` cho container cài, dù nó tránh được lỗi chown. Lý do: nó đặt uid
  trong container thành **chính tài khoản dịch vụ**, tức thoát container là thoát ra thành tài khoản ấy.
  Ở container **có mạng** thì đó là hướng sai — và đây đúng là lý lẽ mã nguồn đã ghi khi chọn `U` cho
  đường probe.
- ✅ S8.2 — thư mục tạm dùng-một-lần, dọn sau mỗi lần cài. Không trạng thái nào sống qua hai lần cài trừ
  chính `node_modules` đã chuyển vào clone.
- ⚠️ S8.3 — **chưa đóng, khai ra:** không có đường xoá `node_modules` của một repo đích, và không có phép
  đối chiếu lock file để biết cây phụ thuộc đã cũ. Lock đổi mà không cài lại ⇒ cây lệch với khai báo, và
  **không gì phát hiện được**. Nợ 8.1 · 8.2.

## Notes

- **Vì sao change này đi sau nhịp một chứ không cùng lúc.** Nhịp một làm cho bệnh **nhìn thấy được**; nhịp
  hai mới **chữa**. Làm ngược lại thì bước cài sẽ được viết mà không ai biết nó phải chữa đúng cái gì — và
  đúng điều đó đã suýt xảy ra: nguyên mẫu chạy xong, cửa kiểm của nhịp một vẫn cảnh báo runtime, và **chính
  cảnh báo ấy** là thứ bắt phải thêm bản đồ ảnh vào change. Không có nhịp một thì bản đồ ảnh không có
  trong hồ sơ này, và `admin-fe` sẽ cài bằng Node 24 rồi chạy probe bằng Node 22 mà không ai biết.
- **Một sự cố tự gây ra là bằng chứng, không phải điều đáng giấu.** Requirement cứng nhất của change này
  (S6.1) đứng trên một lần làm hỏng bản clone trên prod. Nếu nguyên mẫu ấy không được chạy, đường mount
  clone đã đi thẳng vào code — nó là đường hiển nhiên, và nó hỏng theo kiểu chỉ lộ ra ở lượt chấm sau.
