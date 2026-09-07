## S1. Bí mật & rò rỉ

- N/A S1.1 — change không đọc/ghi bí mật. Khoá mới là **số cấu hình nằm trong repo đích**, đã công khai
  với ai đọc được repo ấy; không phải «giá trị người dùng gõ tay vào ô cấu hình» của CheckMate mà ⛔C3
  nói tới.
- ⚠️ S1.2 — bề mặt CÔNG KHAI: khoá hình dạng đi lên **comment PR** (task 4.3), không thu hồi được. Cái
  chảy ra là số của chính repo đích. **Việc phải làm khi apply:** khẳng định mọi khoá hình dạng là
  **số**, và `image` — khoá chuỗi duy nhất trong họ này — vẫn đi qua `IMAGE_NAME_SHAPE`
  (`packages/harness/src/sandbox.ts:147`) trước khi tới bất kỳ bề mặt nào.
- N/A S1.3 — không có giá trị nào cần che.

## S2. Danh tính, phiên, vai (R11)

- N/A S2.1 — cửa đọc mới và trường verdict mới không đọc danh tính.
- N/A S2.2 — change không thêm route.

## S3. Cổng & quyền của máy (R6, R11.18)

- ✅ S3.1 — máy KHÔNG merge được thêm đường nào. Luật nhị phân giữ nguyên từng ký tự ở
  `packages/harness/src/verdict.ts:41`; không nhánh nào của change sinh `PASS`.
- ✅ S3.2 — vai `tu_dong` không có quyền mới. Khoá hình dạng đọc từ `checkmate.yml` **repo đích**
  (`packages/harness/src/runner.ts` — cửa đọc mới), không từ cấu hình vận hành của CheckMate
  (`apps/web/src/gate.ts`), nên không bề mặt tự động nào chạm được.

## S4. Dữ liệu không tin cậy & prompt injection (R7)

- ✅ S4.1 — **đây là trục chính của change**, và nó nâng đúng chỗ repo đang yếu. Ba lớp:
  kẹp dải (khuôn có sẵn `packages/harness/src/runner.ts:117`) · đọc nhánh gốc (luật có sẵn
  `openspec/specs/sandbox-isolation/spec.md:97`) · khai lên verdict (lớp MỚI). Giá trị khoá hình dạng
  **không đi vào prompt nào** — chúng điều khiển phép cắt, phép chia đơn vị, và thời hạn chạy, đều là
  việc của máy.
  ⚠ Ngoại lệ phải soi khi apply: `runner.huong_dan_probe` là **chuỗi tự do ĐI THẲNG VÀO PROMPT**
  (`packages/harness/src/skill-code.ts:392`, `promptSinhCode`). Nó nằm ngoài phạm vi change này nhưng
  **phải có hàng trong sổ khoá** với ghi chú ấy — sổ khoá mà bỏ sót đúng khoá nguy hiểm nhất thì nó
  đang trấn an chứ không đang gác.
- ✅ S4.2 — change không đổi đường tin trả lời model; các lưới hình dạng hiện có giữ nguyên.

## S5. Sandbox & thực thi (R8)

- ⚠️ S5.1 — change **đổi thời hạn** của lệnh chạy trong sandbox (`sandbox.ts:305`), tức đổi tham số của
  một đường đã thực thi code không tin cậy. Không đổi **nơi** chạy, không đổi mức cô lập. Rủi ro thật:
  repo đích nới timeout rất dài để giữ tài nguyên máy chấm lâu hơn → **kẹp dải phải có đầu trên chặt**,
  và mặc định phải là giá trị hôm nay chứ không phải đầu trên của dải.
- ✅ S5.2 — không thêm worktree/thư mục tạm. Đường dọn (`sandbox.ts:418`, `:436`) và ranh giới treo
  (`sandbox.ts:311` — treo KHÔNG kèm `loiNap`) không đổi; ca T2.7 khoá ranh giới ấy.

## S6. Tầng dữ liệu & quyền file (R9)

- N/A S6.1 — không tạo file mới trên đĩa của prod. Sổ khoá là **tài liệu trong repo này**, không phải dữ
  liệu prod, không vào gói deploy.
- ✅ S6.2 — không thêm đường ghi. Trường mới đi theo verdict qua đúng đường ghi sổ cái đang có; trường
  tuỳ chọn nên bản ghi cũ không bị sửa ⇒ không có bước ghi-đè nào để làm rách.
  ⛔C6: cửa đọc khoá hình dạng **không cache** (task 3.1) — sửa `checkmate.yml` bằng tay có hiệu lực ở
  lượt chấm kế tiếp.

## S7. Fail-closed & bất biến verdict (R1, R6)

- ⚠️ S7.1 — nhánh lỗi mới và đích của chúng:

  | nhánh | đi về đâu |
  |---|---|
  | `checkmate.yml` hỏng cú pháp | mọi khoá về mặc định — và mặc định phải NGHIÊM HƠN (D2, ca T3.4) |
  | giá trị ngoài dải | kẹp + ghi `clamped_from` |
  | **giá trị sai kiểu → `NaN`** | ⛔ `NaN` dùng làm trần cắt ⇒ cắt sạch ⇒ **ít finding hơn** ⇒ có thể `PASS`. Chặn ở cửa đọc, ca T1.2 |
  | độ sâu = 0 hoặc âm | 0 đơn vị luật ⇒ độ phủ «KHÔNG ĐO ĐƯỢC» ⇒ **verdict không được vì thế mà nhẹ đi** — kẹp đầu dưới ≥ 1 |

  ⛔ **Bất biến D2 là thứ giữ cả nhóm này:** nếu có khoá nào mà bỏ trống lỏng hơn khai, thì cách rẻ nhất
  để nới cổng là **làm hỏng `checkmate.yml`** — một dấu nháy sai, trông hệt lỗi gõ vô tình. Task 0.2 đo
  bất biến ấy cho **mọi khoá đang có**, không chỉ khoá mới.
- ✅ S7.2 — change không chạm `classifyByMachine`, nên không đổi cách probe hỏng được đếm.

## S8. Leo quyền & cô lập (per-vector)

- ✅ S8.1 **Enumerate vectors — mục tiêu «làm cho phép chấm nhìn thấy ít hơn hoặc kết luận nhẹ hơn»**:

  | # | đường | trạng thái |
  |---|---|---|
  | 1 | **siết** trần diff xuống rất nhỏ ⇒ engine không nhìn thấy phần lớn PR | ⛔ **vector thật, ngược chiều trực giác** — nới trần vô hại, **siết** mới là vector. Chặn bằng kẹp đầu dưới + requirement «file bị bỏ vẫn phải khai đủ» |
  | 2 | đặt độ sâu = 1 ⇒ cả spec thành 1 đơn vị ⇒ độ phủ `1/1` trông hoàn hảo | ⛔ **vector thật** — chặn bằng kẹp dải + **bắt buộc khai mẫu số lên verdict** |
  | 3 | đặt độ sâu rất sâu ⇒ hàng trăm đơn vị ⇒ độ phủ tí xíu | tự hại, không phải vector nới |
  | 4 | nới timeout rất dài ⇒ giữ tài nguyên máy chấm | chặn bằng kẹp đầu trên (S5.1) |
  | 5 | sửa khoá trên **nhánh PR** | chặn bằng «đọc nhánh gốc» — nhưng xem task 0.1, **chưa đo** |
  | 6 | làm hỏng `checkmate.yml` để rơi về mặc định | chặn bằng bất biến D2 — task 0.2 đo cho mọi khoá |
  | 7 | `huong_dan_probe` — chuỗi tự do vào thẳng prompt | **ngoài phạm vi change**, nhưng phải có hàng trong sổ khoá kèm ghi chú (S4.1) |

  Vector 1 và 2 là hai đường em suýt bỏ sót vì đi **ngược chiều trực giác**: bản năng canh «nới», còn
  hai cái này nới cổng bằng cách **siết** khoá. Vá đường 2 mà quên đường 1 là không đóng được lớp.
- ⚠️ S8.2 — **không dismiss vector 5 bằng «đã có luật»**. Luật có
  (`openspec/specs/sandbox-isolation/spec.md:97`) nhưng **hiện thực chưa đo** (task 0.1). Test
  LOAD-BEARING hai chiều: code hiện tại → giá trị nhánh PR **bị chặn** (T2.1); tạm no-op gác → **lọt**.
  Nếu 0.1 cho ra «đọc từ nhánh PR» thì đó là lỗ đang mở cho `runner.image`, `runner.test_cmd` và
  `sources.specs` — **change này chờ** cho tới khi vá xong, vì luật chung ở §1 đứng trên hiện thực ấy.
- ✅ S8.3 **Đối xứng** — hai chỗ:
  · «đọc nhánh gốc» đối xứng: PR nới **và** PR siết đều không ăn (T2.1, T2.2). Gác chỉ chặn chiều nới là
    gác đang đoán ý đồ.
  · kẹp dải đối xứng: mọi khoá kẹp **cả hai đầu**, vì vector 1 và 2 tấn công bằng đầu dưới.

## Notes

- **Rủi ro lớn nhất của change không nằm ở code mà ở SỔ KHOÁ.** Một sổ ai cũng thêm hàng cho qua lưới là
  một sổ trấn an. Lưới chỉ khẳng định «khoá đã được khai và đã có người xét» — spec nói thẳng ranh giới
  ấy (`target-knob-defense › Mọi khoá … SHALL có hàng trong sổ khoá`), đúng theo luật lưới của
  `CLAUDE.md`: loại lỗi thứ tư — lưới đúng nhưng luật sai — chỉ lộ ra khi có người ĐỌC.
- **Bốn khoá không được phép vào họ này**, dù trông giống: `TOOL_CAM` (`model.ts:37` — repo cấp tool cho
  chính người chấm nó), `MODEL_MAC_DINH` (`model.ts:29` — chọn model yếu cho dễ qua), `CAN_HAI_VE`
  (`skill-doc.ts:72` — hạ chuẩn bằng chứng), `RE_OWN_PROBE` (`sources.ts:69` — giấu probe khỏi tầm nhìn).
  Chúng trông y như số cấu hình bình thường, và đó chính là lý do phải ghi tên chúng ra đây.
- **`TRAN_GOI_MS` (`model.ts:88`) cố ý ở lại env.** Đó là hạ tầng của máy chủ CheckMate; repo đích kéo
  dài timeout là kéo dài tiền và thời gian máy của **bên chấm**, không phải của họ.
