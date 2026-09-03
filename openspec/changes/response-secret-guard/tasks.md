# Tasks — response-secret-guard

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/response-secret-guard/spec.md` (4 requirement) — đã viết.
- [ ] 1.2 Đối chiếu từng requirement với ca test; chỗ nào spec nói mà không ca nào khoá thì sửa spec hoặc
      thêm ca.

## 2. Gác (module mới, ngoài `server.ts` — D3 của `identity-session`)

- [ ] 2.1 Hàm thuần thu thập bí mật: ba nhánh kho (`claude_code_oauth_token` · `khoa` · `repo_token`) +
      biến môi trường checker đọc. Trả về **cặp (tên nguồn, giá trị)** — tên nguồn là thứ được phép nói ra.
- [ ] 2.2 Lọc theo ngưỡng `12` ký tự (D5), đặt thành hằng có tên. Bí mật rỗng/ngắn bị bỏ qua.
- [ ] 2.3 Hàm thuần dò: nhận thân response + danh sách bí mật, trả **tên nguồn** đầu tiên khớp hoặc `null`.
      MUST NOT trả giá trị (D4).
- [ ] 2.4 Lớp bọc đường JSON: chặn → đổi sang lỗi máy chủ, bỏ thân.
- [ ] 2.5 Lớp bọc luồng sự kiện: chặn → không gửi mẩu ấy, cắt kết nối (D3).
- [ ] 2.6 Fail-safe (D6): đầu vào méo không ném; nguồn đối chiếu rỗng **vì lỗi đọc** thì ghi log.
- [ ] 2.7 `checkmate.yml` bảng module (⛔C5) + tên tiếng Anh.

## 3. Gắn vào server

- [ ] 3.1 `server.ts`: gắn gác, **giữ nguyên thứ tự middleware hiện có**.
- [ ] 3.2 Kiểm luồng sự kiện vẫn chạy: nhịp giữ kết nối 15s không bị gác chặn nhầm.

## 4. Test

- [ ] 4.1 Response JSON mang token → chặn, client không nhận token.
- [ ] 4.2 Response sạch → đi qua nguyên vẹn.
- [ ] 4.3 Bí mật rỗng/ngắn hơn ngưỡng → KHÔNG chặn oan.
- [ ] 4.4 Mẩu sự kiện mang bí mật → không gửi, cắt kết nối; luồng sạch chạy bình thường.
- [ ] 4.5 **Thông điệp chặn nêu tên nguồn, KHÔNG chứa giá trị** — kể cả một phần, kể cả bản che (D4).
- [ ] 4.6 Đầu vào méo không làm gác ném: kho hỏng · thân là số/`null` · đối tượng tham chiếu vòng.
- [ ] 4.7 Kho không đọc được → có dòng log nói rõ gác đang chạy mà không có nguồn đối chiếu (D6).
- [ ] 4.8 Ca đối kháng: bí mật nằm **lồng sâu** trong đối tượng trả về · nằm trong một trường tưởng vô hại ·
      xuất hiện ở mẩu SSE thứ n chứ không phải mẩu đầu.

## 5. Mutation — mỗi chiều chạy HAI lần

- [ ] 5.1 Bỏ lớp bọc luồng sự kiện → ca 4.4 ĐỎ (bề mặt dễ quên nhất phải có ca giữ).
- [ ] 5.2 Cho thông điệp chặn kèm giá trị → ca 4.5 ĐỎ.
- [ ] 5.3 Bỏ ngưỡng độ dài → ca 4.3 ĐỎ.
- [ ] 5.4 Đổi chặn thành ghi-sổ-rồi-cho-qua → ca 4.1 ĐỎ.
- [ ] 5.5 Bỏ một nhánh nguồn bí mật (ví dụ `repo_token`) → ca tương ứng ĐỎ.

## 6. Kiểm cơ học

- [ ] 6.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — **dự đoán TRƯỚC: 829 + số ca mới, không ca cũ
      nào đỏ**. Ghi số thật; sai thì ghi rõ sai ở đâu (lần trước dự đoán +3 mà thực tế +5).
- [ ] 6.2 `npx openspec validate --changes` xanh.
- [ ] 6.3 Gác phải bắt được thứ đã biết TRƯỚC khi tin nó: dựng response chứa đúng một token thật trong kho
      → gác phải chặn. *Ca load-bearing: một gác không bao giờ chặn trông giống hệt «không có gì để chặn».*

## 7. Sau-merge — việc có tên (KHÔNG thuộc change này)

- [ ] 7.1 Khi backfill `repo-history` và `data-layer`: `R4.26` và `R9.17` mang **con trỏ** sang capability
      này thay vì viết lại cơ chế (PO chốt phương án (a) ngày 03/09).
