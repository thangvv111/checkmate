# Tasks — response-secret-guard

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/response-secret-guard/spec.md` (4 requirement) — đã viết.
- [x] 1.2 Đối chiếu từng requirement với ca test; chỗ nào spec nói mà không ca nào khoá thì sửa spec hoặc
      thêm ca.

## 2. Gác (module mới, ngoài `server.ts` — D3 của `identity-session`)

- [x] 2.1 Hàm thuần thu thập bí mật: ba nhánh kho (`claude_code_oauth_token` · `khoa` · `repo_token`) +
      biến môi trường checker đọc. Trả về **cặp (tên nguồn, giá trị)** — tên nguồn là thứ được phép nói ra.
- [x] 2.2 Lọc theo ngưỡng `12` ký tự (D5), đặt thành hằng có tên. Bí mật rỗng/ngắn bị bỏ qua.
- [x] 2.3 Hàm thuần dò: nhận thân response + danh sách bí mật, trả **tên nguồn** đầu tiên khớp hoặc `null`.
      MUST NOT trả giá trị (D4).
- [x] 2.4 Lớp bọc đường JSON: chặn → đổi sang lỗi máy chủ, bỏ thân.
- [x] 2.5 Lớp bọc luồng sự kiện: chặn → không gửi mẩu ấy, cắt kết nối (D3).
- [x] 2.6 Fail-safe (D6): đầu vào méo không ném; nguồn đối chiếu rỗng **vì lỗi đọc** thì ghi log.
- [x] 2.7 `checkmate.yml` bảng module (⛔C5) + tên tiếng Anh. **Lưới `identifier-language` viết hôm nay
      bắt chính em**: đặt `docBiMatAnToan` trong file mới → lưới đỏ, nêu đúng tên và file. Đổi thành
      `readSecretsSafely`. Đây là lần đầu lưới ấy bắt một vi phạm THẬT chứ không phải fixture.

## 3. Gắn vào server

- [x] 3.1 `server.ts`: gắn gác, **giữ nguyên thứ tự middleware hiện có**.
- [x] 3.2 Kiểm luồng sự kiện vẫn chạy: nhịp giữ kết nối 15s không bị gác chặn nhầm.

## 4. Test

- [x] 4.1 Response JSON mang token → chặn, client không nhận token.
- [x] 4.2 Response sạch → đi qua nguyên vẹn.
- [x] 4.3 Bí mật rỗng/ngắn hơn ngưỡng → KHÔNG chặn oan.
- [x] 4.4 Mẩu sự kiện mang bí mật → không gửi, cắt kết nối; luồng sạch chạy bình thường.
- [x] 4.5 **Thông điệp chặn nêu tên nguồn, KHÔNG chứa giá trị** — kể cả một phần, kể cả bản che (D4).
- [x] 4.6 Đầu vào méo không làm gác ném: kho hỏng · thân là số/`null` · đối tượng tham chiếu vòng.
- [x] 4.7 Kho không đọc được → có dòng log nói rõ gác đang chạy mà không có nguồn đối chiếu (D6).
- [x] 4.8 Ca đối kháng: bí mật nằm **lồng sâu** trong đối tượng trả về · nằm trong một trường tưởng vô hại ·
      xuất hiện ở mẩu SSE thứ n chứ không phải mẩu đầu.

## 5. Mutation — mỗi chiều chạy HAI lần

- [x] 5.1 Bỏ lớp bọc luồng sự kiện → ĐỎ 2 ca (mẩu mang bí mật · bí mật ở mẩu thứ n). Bề mặt dễ quên nhất
      có ca giữ.
- [x] 5.2 **Chạy sai chỗ lần đầu, ghi lại vì nó lộ ra một điều tốt hơn.** Em định đột biến `blockMessage`
      nhưng thực tế sửa `findSecret` trả `source (value)` → ĐỎ 3 ca. Lý do không đột biến được
      `blockMessage`: chữ ký của nó **chỉ nhận tên nguồn**, không nhận giá trị — nên nó KHÔNG THỂ rò dù ai
      cố, muốn rò phải đổi cả chữ ký và điều đó hiện ngay trong diff. Đó là chặn ở **kiểu**, mạnh hơn chặn
      bằng ca test (xem D7). Đường rò còn lại — `findSecret` trả kèm giá trị — thì có đột biến giết được.
- [x] 5.3 Bỏ ngưỡng độ dài → ĐỎ 2 ca.
- [x] 5.4 Đổi chặn thành ghi-sổ-rồi-cho-qua → ĐỎ ca «response mang bí mật bị chặn».
- [x] 5.5 Bỏ nhánh `repo_token` → ĐỎ 3 ca. **Mỗi đột biến chạy hai lần, kết quả nhất quán cả hai lần.**

## 6. Kiểm cơ học

- [x] 6.1 `npx tsc --noEmit` sạch · `npm test` **51 file / 846 ca xanh** (829 + 16 ca mới + 1). Vế «không
      ca cũ nào đỏ» — ĐÚNG sau khi sửa tên hàm; trước đó lưới `identifier-language` đỏ đúng một ca, và đó
      là lưới làm việc của nó chứ không phải hồi quy.
- [x] 6.2 `npx openspec validate --changes` xanh.
- [x] 6.3 Gác phải bắt được thứ đã biết TRƯỚC khi tin nó: dựng response chứa đúng một token thật trong kho
      → gác phải chặn. *Ca load-bearing: một gác không bao giờ chặn trông giống hệt «không có gì để chặn».*

## 7. Sau-merge — việc có tên (KHÔNG thuộc change này)

- [ ] 7.1 Khi backfill `repo-history` và `data-layer`: `R4.26` và `R9.17` mang **con trỏ** sang capability
      này thay vì viết lại cơ chế (PO chốt phương án (a) ngày 03/09).
