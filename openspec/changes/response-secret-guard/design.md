# Design — response-secret-guard

## Context

Đo trên `main` 03/09 (`067ec82`):

```
Nguon bi mat cua CHECKER (apps/web/src/secret-vault.ts)
  claude_code_oauth_token   token goi thue bao
  khoa[<nha cung cap>]      khoa API tung nha cung cap
  repo_token[<owner/repo>]  token GitHub tung repo
  + bien moi truong checker doc: GITHUB_TOKEN, ANTHROPIC_API_KEY, CLAUDE_CODE_OAUTH_TOKEN

Be mat tra du lieu (apps/web/src/server.ts)
  19 route  res.json(...)
   1 luong  text/event-stream  -> res.write(...) nhieu lan + nhip giu ket noi 15s

Cho tang route DANG goi ham doc token, ca ba deu DUNG
  :392  Boolean(readOwnToken(...))   chi lay CO/KHONG
  :551  Boolean(readOwnToken(...))   chi lay CO/KHONG
  :438  chiaCu = readOwnToken(tenCu) GIU gia tri de chuyen chia khi doi ten repo
```

## Goals / Non-Goals

**Goals**
- Bí mật của chính checker không rời máy chủ qua thân response, **cưỡng chế lúc chạy**.
- Phủ cả hai bề mặt, kể cả luồng sự kiện — bề mặt dễ quên nhất.
- Gác hỏng không làm hỏng giao diện.

**Non-Goals**
- KHÔNG đụng `secret-vault.ts`, `provider.ts`, `config.ts` — nguồn bí mật giữ nguyên.
- KHÔNG cấm tầng route **đọc** bí mật (D1).
- KHÔNG lo bí mật của **repo đích** — đó là `error-message-egress-gate`, bài toán khác hẳn (D2).
- KHÔNG đổi hàng bảng tra: `R4.26`/`R9.17` vẫn `pending` ở change của chúng (PO chốt phương án (a)).

## Decisions

### D1 — Cấm TRẢ VỀ, không cấm ĐỌC

Khuôn lưới của `R11.20` («tầng route không gọi hàm đọc nguồn bí mật») **không mở rộng được** sang đây:
`server.ts` đang gọi hàm đọc token ở ba chỗ và cả ba đều đúng — hai chỗ chỉ lấy có/không, một chỗ giữ giá
trị để chuyển chìa khi đổi tên repo.

Luật viết là «không route nào **trả** token về». Một lưới cấm gọi sẽ đỏ trên code đúng, và danh sách cho
phép sẽ bị nới cho tới khi lưới thành hình thức. `R11.20` mở rộng được chỉ vì ở đó không chỗ nào cần gọi
ngoài công cụ dòng lệnh.

### D2 — So khớp CHÍNH XÁC, và đây là chỗ khác căn bản với change trước

```
error-message-egress-gate:  bi mat cua REPO DICH   -> KHONG biet gia tri
                            -> danh sach CHO PHEP theo CAU TRUC, chap nhan am tinh gia

change nay:                 bi mat cua CHINH CHECKER -> BIET gia tri
                            -> SO KHOP CHINH XAC, khong am tinh gia
```

Vì biết giá trị nên không cần dò hình dạng, không cần đoán, không có âm tính giả về nguyên tắc. Một đường
rò lọt qua gác này là **lỗi cài đặt**, không phải giới hạn của phương pháp — khác hẳn `S8.1` của change
trước, nơi âm tính giả là thuộc tính không gỡ được.

Hệ quả: tiêu chí «đủ ca» ở đây cao hơn. Ở change trước, một đường mở được phép khai là mở; ở đây thì không.

### D3 — Hai bề mặt, hai cách chặn, và cách yếu hơn phải khai là yếu hơn

| bề mặt | trạng thái lúc bắt | chặn thế nào | mạnh yếu |
|---|---|---|---|
| 19 route JSON | chưa gửi gì | đổi sang lỗi máy chủ, bỏ thân | chặn trọn |
| luồng SSE | header `200` **đã gửi** | cắt kết nối | **yếu hơn** |

Với SSE, mẩu mang bí mật không được gửi — nhưng client đã nhận `200` và các mẩu trước. Gác chặn được **rò
bí mật**, không chặn được việc client tưởng lượt chấm đang chạy bình thường. Đó là giới hạn của giao thức,
không phải của thiết kế, và requirement khai thẳng để người sau không đọc thành «đã phủ như nhau».

Bề mặt SSE là bề mặt **dễ quên nhất**: nó không đi qua đường trả JSON, và nó đúng là đường phát log của
lượt chấm — nơi bí mật hay lọt vào nhất. Một gác chỉ bọc đường JSON sẽ để trống đúng chỗ nguy hiểm nhất.

### D4 — Thông điệp chặn nêu TÊN NGUỒN, tuyệt đối không nêu giá trị

Bẫy tự nhiên nhất của một gác bảo mật: báo «response chứa `ghp_abc…`» thì chính lời báo đưa bí mật vào log
và lên màn hình — gác sinh ra để chặn rò lại thành đường rò, ở một bề mặt **dai hơn** (log lưu lại,
response thì không).

Nên gác trả về **tên nguồn** (`repo_token`, `khoa.<nhà cung cấp>`, `oauth_token`), không kèm giá trị, không
kèm bản che, không kèm độ dài của giá trị. Ca test khoá điều này, và mutation phải giết được nó.

### D5 — Ngưỡng độ dài, và vì sao nó là gác chứ không phải tinh chỉnh

Bí mật rỗng hoặc vài ký tự sẽ khớp **mọi** response và biến gác thành cỗ máy chặn mù — toàn bộ giao diện
chết ngay khi ai đó lưu một khoá rỗng. Nên chuỗi ngắn hơn ngưỡng bị bỏ qua khi đối chiếu.

Chọn ngưỡng **12 ký tự**: token GitHub và khoá API thật đều dài hơn nhiều (≥ 30), còn 12 đủ để một chuỗi
tình cờ trùng gần như không xảy ra. Ghi số vào hằng có tên, không rải trong điều kiện.

### D6 — Gác hỏng: fail-safe theo hướng KHÔNG chặn oan, nhưng phải NÓI RA

Gác chạy trên mọi response nên lỗi trong nó làm hỏng toàn bộ giao diện. Đầu vào méo không được làm nó ném.

Nhưng có một trạng thái nguy hiểm phải phân biệt: **gác không đọc được kho bí mật**. Khi ấy nó không biết
bí mật nào tồn tại, tức không gác gì — và trạng thái đó trông **y hệt** «không có bí mật nào để rò». Nên
gác phải ghi log khi nguồn đối chiếu rỗng vì lỗi đọc.

Đây đúng mệnh đề của ca T1.1 ở `identifier-language-gate`: một phép quét trả rỗng giống hệt hai chuyện —
không có gì để thấy, và công cụ hỏng.

## Architecture

- `apps/web/src/<gác>.ts` (MỚI): hàm thuần thu thập bí mật + hàm thuần dò trong thân + lớp bọc response.
  Đặt ngoài `server.ts` theo bài học D7 của `identity-session`: `import` file có side effect làm ca test
  chạm trần thời gian.
- `apps/web/src/server.ts`: gắn gác, giữ nguyên thứ tự middleware hiện có.
- `checkmate.yml` bảng module (⛔C5) · tên tiếng Anh (lưới `identifier-language`).

## Data Model

N/A — không đổi schema, không ghi file.

## Risks / Trade-offs

- [Gác chạy trên mọi response → chi phí] → phép dò là vài lời gọi `includes` trên chuỗi đã có; số bí mật
  thường dưới mười. Đo lại sau khi làm nếu response lớn nhất chậm thấy được.
- [Dương tính giả chặn oan giao diện] → D5 (ngưỡng) + so khớp chính xác. Một response bị chặn nghĩa là nó
  **thật sự** chứa bí mật.
- [Gác thành đường rò qua thông điệp] → D4 + ca khoá + mutation.
- [SSE chặn yếu hơn] → D3 khai thẳng; không giấu bằng cách viết requirement chung chung.
- [Đây không phải backfill] → proposal ghi rõ. Cơ chế mới thì rủi ro nằm ở chính cơ chế, nên test-cases có
  mục riêng cho đầu vào méo và cho trạng thái «gác không có nguồn đối chiếu».

## Migration Plan

N/A. Đường lùi: revert PR — gác là một lớp bọc, gỡ ra thì hành vi về như cũ.

## Open Questions

- Không.
