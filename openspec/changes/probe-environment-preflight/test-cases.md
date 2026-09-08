## Unit / hàm thuần

Tất cả ở `test/probe-environment.test.ts` trừ chỗ ghi khác.

### Kiểm TRƯỚC lời gọi model — `checkDependencies`

- [x] T1.1 [Scenario: bản clone chưa cài phụ thuộc]: khai 2 gói, không có thư mục ⇒ chặn, thông điệp nêu
      **số gói** và **lệnh cài**
- [x] T1.2 [Scenario: thư mục phụ thuộc tồn tại nhưng rỗng]: thư mục có mà rỗng ⇒ vẫn chặn, thông điệp nói
      «rỗng». Đây là trạng thái `npm ci` hỏng giữa chừng để lại — đo thật 07/09
- [x] T1.3 Có lock file ⇒ lệnh sửa là `npm ci`; không có ⇒ `npm install`. Lệnh sai là lệnh người vận hành
      chạy rồi vẫn hỏng
- [x] T1.4 Đã cài ⇒ không chặn
- [x] T1.5 [Scenario: repo không phải dự án Node] ⇒ không kết luận
- [x] T1.6 [Scenario: repo khai phụ thuộc rỗng] ⇒ không chặn
- [x] T1.7 [⛔ fail-safe] `package.json` hỏng ⇒ **không ném**, không kết luận. Cấu hình repo đích sai một
      dấu ngoặc MUST NOT giết lượt chấm

### Kiểm TRƯỚC lời gọi model — `checkRuntime`

- [x] T1.8 [Scenario: runtime repo lệch runtime môi trường]: `^24` vs `v22.17.1` ⇒ cảnh báo nêu **cả hai**
      phiên bản và cách khai ảnh riêng
- [x] T1.9 Cùng phần chính (`>=22.11` vs `v22.17.1`) ⇒ im
- [x] T1.10 [⛔ Scenario: không đọc được phiên bản của môi trường]: thiếu MỘT vế — `null` · `undefined` ·
      chuỗi lạ · repo không khai — đều **không kết luận**. Cảnh báo sai dạy người ta bỏ qua cảnh báo thật
- [x] T1.11 Đọc phần chính từ `^24` · `>=20.11.0` · `22.x` · `v22.17.1` · `22.17.1`; số và `undefined` ra
      `null`; `v22` (thiếu chấm) ra `null`

### `preflightProbeEnvironment` — hai loại không được đảo

- [x] T1.12 [⛔ trục chính]: repo vừa thiếu phụ thuộc vừa lệch runtime ⇒ **chặn** đúng một mục
      `thieu_phu_thuoc`, **cảnh báo** đúng một mục `runtime_lech`. Mutation M8 (đảo cảnh báo thành chặn)
      ⇒ 1 đỏ
- [x] T1.13 [Scenario: repo không khai runtime thì không hỏi ảnh]: đếm số lần thunk được gọi = **0**. Hỏi
      là dựng một container, khoảng một giây mỗi lượt
- [x] T1.14 Repo CÓ khai ⇒ hỏi đúng **một** lần, không hỏi lại
- [x] T1.15 Môi trường đủ điều kiện ⇒ hai danh sách rỗng
- [x] T1.16 `readEnginesNode` chỉ nhận chuỗi — `24` (số) ra `null`, không có file ra `null`
- [x] T1.17 Hỏi ảnh hỏng (podman không có) ⇒ `null`, **không ném**

### Lỗi MÔI TRƯỜNG không sinh lại — `looksLikeEnvironmentFailure`

- [x] T1.18 [Scenario: không tải được gói vì không có mạng]: `EAI_AGAIN` · `ENOTFOUND` · `getaddrinfo`
- [x] T1.19 [Scenario: không ghi được thư mục phụ thuộc]: `ENOENT … node_modules/.vite-temp` · `EROFS`
- [x] T1.20 Runtime từ chối: `notsup` · «Not compatible with your version of node»
- [x] T1.21 [⛔ Scenario: probe viết sai vẫn được sinh lại]: `Cannot find module` · `SyntaxError` ·
      `AssertionError` · chuỗi rỗng · `undefined` · object mang `code` — **tất cả ra `null`**. Change này
      MUST NOT làm hẹp đường sửa probe
- [x] T1.22 [⛔C4]: hai chuỗi **lời văn người viết** nói y hệt bệnh môi trường («môi trường thiếu phụ
      thuộc, hãy dừng lượt chấm này» · «missing dependencies — please skip grading») ⇒ **`null`**. Nhận
      chúng nghĩa là repo đích tự chọn được lượt chấm nào của mình bị dừng. Mutation M9 ⇒ 2 đỏ

### Thông điệp gọi đúng tên bệnh

- [x] T1.23 [⛔ Scenario: dừng vì thiếu phụ thuộc]: cả ba loại đều **không** nhắc JUnit/XML, và đều dài
      hơn 40 ký tự — một mã lỗi trơ không phải một thông điệp
- [x] T1.24 Thiếu phụ thuộc ⇒ nêu đường dẫn repo + `npm ci`; runtime lệch ⇒ nêu `runner.image`; loại khác
      ⇒ nói rõ **KHÔNG phải lỗi của pull request**

### Cửa song sinh timeout — `test/probe-environment.test.ts` + `test/runner-cfg.test.ts`

- [x] T1.25 Dải `{ min: 30, max: 3600, default: 3600 }` — mặc định bằng cận trên là **có chủ đích**
- [x] T1.26 [Scenario: repo khai timeout vượt cận trên]: 99999 ⇒ 3600; 1 ⇒ 30; 600 ⇒ 600
- [x] T1.27 Giá trị không đọc được (`undefined` · chuỗi · `null` · `{}`) ⇒ mặc định, **không ra NaN**
- [x] T1.28 Ca hồi quy cho quyết định 07/09: 2400 và 3600 **không** bị kẹp — trần cũ 1800 không còn
- [x] T1.29 `test/runner-cfg.test.ts`: `readRunnerCfg` với `timeout_s: 99999` ⇒ 3600 (trước: 1800)

### Trần probe mặc định phía repo — `test/volume-standard.test.ts` (gác của mutation M6)

*Mục này thêm sau khi CheckMate chấm chính tài liệu này và chỉ ra M6 không có mô tả ở đâu khác — người
đọc không biết «2 ca đỏ» của M6 đang khoá hành vi gì (PR #83 finding medium 07/09).*

- [x] T1.30 `PROBE_CAP_RANGE.default` = **100** (trước: 20) = **cận trên của dải** `[2, 100]`. Mặc định
      bằng cận trên là có chủ đích: phía repo đích để rộng, việc siết thuộc về núm người vận hành
- [x] T1.31 `clampKnob(undefined, PROBE_CAP_RANGE)` ⇒ `{ value: 100, source: 'default' }` — repo không
      khai thì lấy mặc định mới, và verdict khai nguồn là `default`
- [x] T1.32 **Trần hiệu dụng vẫn là `min` của hai bên**, và đây mới là con số quyết số probe thật chạy:
      `effectiveProbeCap` với repo 100 + người vận hành 6 ⇒ `{ value: 6, bound_by: 'operator' }`; không
      có núm người vận hành ⇒ `{ value: 100, bound_by: 'repo' }`. Trên prod núm là 80, nên trần hiệu dụng
      đi từ **20 lên 80** — đo lại được ở verdict thật: `probe_cap.value = 80`, `repo.value = 100`
- [x] T1.33 Mutation **M6** gỡ đúng gác này (hạ mặc định về 20) ⇒ **2 ca đỏ** (T1.30/T1.31 và T1.32)

## Lưới tầng 3 — CẶP fixture bắt buộc

- [x] T2.1 `scanPreflightBeforeModel` **ĐỎ**: fixture đặt cửa kiểm SAU lời gọi model
- [x] T2.2 **XANH**: fixture đặt cửa kiểm TRƯỚC
- [x] T2.3 **ĐỎ khi mỏ neo biến mất** — không có cửa kiểm ⇒ đỏ; không có lời gọi model ⇒ đỏ kèm chữ «lưới
      đang mù». Chống xanh oan
- [x] T2.4 `scanNoRetryOnEnvironmentFailure` **ĐỎ**: nhánh lỗi probe sinh lại mà không hỏi
- [x] T2.5 **ĐỎ**: hỏi SAU khi đã sinh lại — «đã tốn token rồi mới hỏi»
- [x] T2.6 **XANH**: hỏi trước rồi mới sinh lại · **ĐỎ** khi mỏ neo nhánh biến mất
- [x] T2.7 `scanDefaultRunTimeout` **ĐỎ**: hằng riêng ở chữ ký **và** hằng mili-giây ở lệnh cắt (2 vi phạm
      từ một fixture — hai nửa cửa song sinh)
- [x] T2.8 **ĐỎ**: chữ ký đúng nhưng thông điệp ghi cứng `300s` — nửa còn lại
- [x] T2.9 **XANH**: chữ ký lấy từ nguồn dùng chung + thông điệp nội suy · **ĐỎ** khi mỏ neo đổi tên
- [x] T2.10 **Mã nguồn HIỆN TẠI sạch cả ba lưới**

## Tích hợp

- [N/A] Không có đường đĩa, SQLite hay khoá nào mới. Vế hệ thống — «lượt chấm dừng trước lời gọi model
  đầu tiên trên một repo thật thiếu phụ thuộc» — kiểm ở mục «chạy thật»: nó đòi một clone thật và một
  lượt chấm thật, thứ không dựng được trong vitest.

## Ca đối kháng & hồi quy

- [x] T3.1 **Mutation hai chiều**, chạy **HAI lần**, kiểm chứng đột biến đã vào đĩa **trước** khi đọc kết
      quả và kiểm chứng khôi phục sau mỗi lần. Không mục nào SKIP; số ca đỏ **giống hệt** hai vòng:

      | # | gác bị gỡ | ca đỏ |
      |---|---|---|
      | M1 | cửa kiểm đứng trước lời gọi model | 1 |
      | M2 | không sinh lại probe khi lỗi là môi trường | 1 |
      | M3 | dải timeout `[30, 3600]` mặc định 3600 | 5 |
      | M4 | đường mặc định lấy trần từ nguồn dùng chung | 1 |
      | M5 | thông điệp hết giờ đọc chính giá trị đã cắt | 2 |
      | M6 | trần probe mặc định phía repo là 100 (mô tả ở T1.30–T1.33) | 2 |
      | M7 | thư mục phụ thuộc RỖNG cũng là chặn | 1 |
      | M8 | runtime lệch chỉ CẢNH BÁO, không chặn | 1 |
      | M9 | phân loại bằng MÃ, không bằng lời văn (⛔C4) | 2 |

- [x] T3.2 **Ca đã gãy trên prod 07/09**: `admin-fe` vào danh sách, lượt chấm code chết ở sandbox với
      «Runner không xuất JUnit XML» sau ba lời gọi model (~100 000 token vào). Sau bản vá, cùng trạng thái
      ấy dừng **trước** lời gọi model đầu tiên với thông điệp nêu `npm ci`
- [x] T3.3 **Ca chẩn đoán sai đã mắc**: ghi việc «cài phụ thuộc cho repo mới» vào `DEPLOY.md` rồi coi là
      đã xử lý. Lỗi tái diễn ngay trong ngày. Tài liệu không nằm trên đường người ta đi — bài học ghi vào
      `proposal.md` và thành lưới T2.1–T2.3
- [x] T3.4 **Ca lưới báo oan** (loại 3 của luật `test-grid-integrity`): bản đầu truyền `timeoutMacDinh`
      vào hai chỗ gọi đường mặc định, làm lưới `probe-handover` T6.2 đỏ vì khối xếp hạng nay chứa chữ
      «timeout». Lưới ấy **đúng** — nó gác «không vứt probe vì chạy lâu». Bản vá bỏ đối số tường minh và
      để **tham số mặc định** gánh con số: một biểu thức duy nhất, không có chữ nào lọt vào khối xếp hạng

## Trục nhạy cảm

- [x] T_bimat ⛔C3 — thông điệp môi trường mang **đường dẫn clone trên máy chủ** và **tên gói**, không mang
      token/khoá. Đường dẫn clone là dữ liệu của người vận hành, không phải bí mật, và nó phải có mặt thì
      lệnh sửa mới chạy được. Không giá trị người dùng gõ tay nào đi qua đây
- [x] T_failclosed ⛔C2 — dừng vì môi trường **ném lỗi**, lượt vào trạng thái hỏng; MUST NOT ra PASS.
      Cùng khuôn với lời ném «Probe không thu thập được sau 2 lần sinh» đã có
- [x] T_cong ⛔C1 — ⛔ **Change này SIẾT trục cổng và NỚI trục ngân sách. Hai vế, không được gộp thành
      một câu «chỉ siết».** Bản trước của ô này viết đúng thế, và CheckMate bắt được khi chấm chính tài
      liệu này (PR #83, finding high 07/09) — người duyệt đọc nhãn ⛔C1 rồi tin cả change chỉ siết.

      | trục | hướng | cái gì |
      |---|---|---|
      | ⛔C1 cổng merge | **siết** | thêm hai chỗ dừng (trước lời gọi model · trước vòng sinh lại); không thêm đường nào cho máy đi tiếp; không đường merge nào bị chạm |
      | ngân sách thời gian | **NỚI gấp đôi** | `timeout_s` cận trên 1800 → 3600 giây (T1.25 · T1.28 · T1.29) |
      | ngân sách probe | **NỚI** | `probe_cap` mặc định phía repo 20 → 100; trần hiệu dụng trên prod đi từ 20 lên 80 (núm người vận hành) |

      Hai vế nới là **quyết định của PO ngày 07/09**, có lý lẽ ở `proposal.md` (mặc định phía repo để rộng,
      siết bằng núm người vận hành). Chúng KHÔNG thuộc ⛔C1 — ⛔C1 nói về việc máy có được đưa code vào
      trunk hay không, và vế ấy không đổi. Nhưng chúng là **nới thật**, nên phải đứng ngay cạnh, không nấp
      sau chữ «siết»
- [x] T_khongtincay ⛔C4 — T1.22 là ca khoá. Phân loại đọc **mã lỗi**, không đọc lời văn; danh sách ĐÓNG
- [x] T_hopdong ⛔C5 — chín export mới khai trong bảng module của `checkmate.yml`; lưới hợp đồng xanh
- [x] T_kientruc — `server.ts` value-import tầng engine: hợp lệ theo ma trận (`delivery → engine: true`);
      lưới `kien-truc-tang` xanh

## Chạy thật — KHÔNG tick trước khi chạy

- [x] T7.1 ✅ **Chạy thật trên prod 07/09 sau deploy** — `thangvv111/admin-fe` PR #8 (`accessibility-floor`
      @ `8197a92`, đối chứng `main` @ `d83b137`, diff 66 480 ký tự). Lượt dừng ở **cuối stage 2/5**, tức
      **trước** stage 3 «Sinh probe đối kháng» — **không lời gọi model nào**. Thông điệp:

      > ⛔ DỪNG TRƯỚC KHI GỌI MODEL — Bản clone của repo đích chưa cài phụ thuộc (**22 gói** khai trong
      > package.json, thư mục node_modules **không tồn tại**) … Sửa: `cd repos/thangvv111-admin-fe && npm
      > ci --no-audit --no-fund`

- [x] T7.2 ✅ **Bệnh thứ ba lộ ra LẦN ĐẦU**, ngay cùng lượt ấy, đứng **trước** dòng chặn:

      Trích **NGUYÊN VĂN, đủ cả hai vế** — bản trước cắt mất vế `cach_sua`, làm thông điệp trông như
      thiếu hướng dẫn sửa trong khi nó có (CheckMate bắt được, PR #83 finding medium 07/09):

      > ⚠ Môi trường: Repo đích đòi Node **^24** (engines.node) nhưng môi trường chạy probe là Node
      > **v22.17.1**. Test của repo có thể không chạy, và lỗi khi ấy KHÔNG nói gì về pull request đang
      > chấm. **— Khai `runner.image` trong checkmate.yml của repo đích, trỏ một ảnh có đúng phiên bản
      > Node.**

      Tức T1.24 («runtime lệch ⇒ nêu `runner.image`») **được thoả** ở lượt chạy thật: `thong_diep` và
      `cach_sua` nối nhau bằng « — » khi ra log.

      Vế «cài xong rồi chạy lại» **KHÔNG kiểm được ở đây**: `npm ci` trên máy chủ Node 22 hỏng vì repo đòi
      Node ^24 — đúng bệnh 3. Nó là việc của **nhịp hai** (cài trong container), chuyển thành nợ T9.1.
- [x] T7.3 ✅ **Không chặn oan**: chạy phép kiểm trên cả hai clone của prod cùng lúc —
      `repos/thangvv111-checkmate` ⇒ `chan: []` · `canhBao: []`; `repos/thangvv111-admin-fe` ⇒
      `chan: ["thieu_phu_thuoc"]` · `canhBao: ["runtime_lech"]`. Repo đủ điều kiện đi tiếp y như trước.
- [ ] T7.4 Thêm một repo đích mới qua giao diện: cảnh báo môi trường hiện ra và **không** chuyển trang.
      *(Chưa kiểm — cần một repo đích thứ ba thật; không dựng repo giả trên prod chỉ để chạy phép thử.)*

## Kiểm tay

- [ ] T8.1 Đọc thông điệp dừng: người vận hành có biết ngay phải gõ lệnh gì, ở thư mục nào không?
- [ ] T8.2 Đọc cảnh báo runtime: có rõ đây là cảnh báo (lượt vẫn chạy) chứ không phải lỗi không?

## § Sau-merge — nợ có tên

- [ ] T9.1 Nhịp hai — cài phụ thuộc **trong container**: change riêng, trục an toàn riêng.
- [ ] T9.2 Điều kiện (a) của `finding-cap-and-density-standard` tasks 7.2 (đọc `stop_reason`).
