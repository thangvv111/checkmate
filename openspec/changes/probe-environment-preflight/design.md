## Bối cảnh

CheckMate chuyển từ **một** repo đích sang **nhiều** repo đích ngày 07/09. Mọi giả định chưa nói ra về môi
trường đều vỡ ở repo thứ hai, vì với repo thứ nhất chúng luôn đúng một cách tình cờ:

| giả định ngầm | đúng với repo #1 vì | vỡ ở repo #2 vì |
|---|---|---|
| bản clone có phụ thuộc đã cài | chính là repo của CheckMate, cài từ lâu | clone mới, chưa ai cài |
| runtime của repo = runtime của ảnh | cùng Node 22 | `admin-fe` đòi Node `^24` |
| lỗi bước chạy probe là lỗi của probe | không có lỗi môi trường nào | ba loại lỗi môi trường cùng lúc |

## Bề mặt đã ĐẾM BẰNG MÁY

Đếm **trước** khi viết ca test — luật `test-grid-integrity` tầng 2. Lệnh và số ghi ở đây để lần sau đếm lại
được, chứ không liệt kê bằng trí nhớ.

```bash
grep -c "await callJson\|await callCode" packages/harness/src/skill-code.ts   # 8  <- moi loi goi model
grep -c "chayVitest("                    packages/harness/src/skill-code.ts   # 2  <- duong mac dinh
grep -c "chayTheoRunner("                packages/harness/src/skill-code.ts   # 2  <- duong runner
grep -c "300_000\|300s"                  packages/harness/src/sandbox.ts      # 2  <- CHI trong chu thich
```

- **8 lời gọi model**, sớm nhất ở `skill-code.ts:585`. Cửa kiểm môi trường phải đứng **trên** dòng ấy —
  đó là mệnh đề lưới sẽ khoá, và nó kiểm được bằng máy (so số dòng), không phải bằng mắt.
- **2 chỗ gọi `chayVitest`** (`:624` lượt chính, `:1029` lượt hạng hai). Khoá timeout phải tới **cả hai**;
  vá một chỗ là dựng lại đúng cửa song sinh vừa gỡ.
- **2 lần xuất hiện `300`** còn lại nằm trong **chú thích** giải thích vì sao hằng ấy đã bị gỡ — không phải
  hằng còn sống. Lưới đếm phải phân biệt được hai thứ này.

## Quyết định

### D1. Chặn hay cảnh báo — không phải một thang, là hai loại

| điều kiện | mức | vì sao |
|---|---|---|
| thiếu phụ thuộc | **CHẶN** | chắc chắn hỏng; không ca nào chạy được; sửa được bằng một lệnh |
| runtime lệch | **CẢNH BÁO** | có thể vẫn chạy; `engines` thường khai chặt hơn mức cần |
| thiếu vế để so | **KHÔNG KẾT LUẬN** | đoán ở đây tạo cảnh báo sai, và cảnh báo sai giết cảnh báo thật |

Cái giá của hai loại sai không cân nhau. Chặn oan một lượt chạy được thì người vận hành mất một lượt chấm
và phải đi hiểu vì sao. Bỏ sót thì mất khoảng 100 000 token và một thông điệp nói sai bệnh. Ở chỗ **chắc
chắn hỏng** thì chặn rẻ hơn; ở chỗ **có thể chạy** thì bỏ sót rẻ hơn.

### D2. Phân loại lỗi bằng MÃ, không bằng lời văn

Danh sách ĐÓNG, mỗi mục một bệnh **đã gặp thật**:

| mã / hình dạng | bệnh |
|---|---|
| `EAI_AGAIN` · `ENOTFOUND` · `getaddrinfo` | thiếu phụ thuộc (đi tải, không có mạng) |
| `EROFS`, hoặc `ENOENT` **và** đường dẫn chứa thư mục phụ thuộc | môi trường không ghi được |
| `notsup` · «không tương thích phiên bản node» | runtime từ chối |
| `ENOENT` **và** tên một bộ chạy test | không tìm thấy bộ chạy |

Vì sao không dò lời văn: thông điệp đến từ npm, từ Node, và từ **chính repo đích** — nó là dữ liệu ngoài
(⛔C4). Repo đích in ra một chuỗi giống lỗi môi trường sẽ tự chọn được lượt chấm nào của chính nó bị dừng.
Đây đúng khuôn lý lẽ engine đã dùng để **không** dò `Cannot find module` khi nhận lỗi nạp file probe.

Danh sách đóng nghĩa là nó **sẽ bỏ sót** bệnh chưa gặp. Đó là hướng an toàn: bỏ sót ⇒ rơi về hành vi hôm
nay (sinh lại một lần rồi dừng). Nhận nhầm ⇒ chặn một lượt lẽ ra chạy được.

### D3. Hỏi phiên bản của ảnh — chỉ khi có gì để so

Hỏi phiên bản Node của ảnh là **dựng một container**, tốn khoảng một giây mỗi lượt. Repo không khai
`engines.node` thì câu trả lời không dùng vào đâu. Nên cửa gọi truyền một **thunk**, và nó chỉ được gọi khi
repo có khai. Đây là lý do chữ ký nhận `(() => string | null) | string | null` chứ không nhận thẳng giá trị.

### D4. Timeout — một nguồn, hai đường

`TIMEOUT_RANGE` sống ở `runner.ts` (chỗ đã sở hữu `readRunnerCfg`), `sandbox.ts` import giá trị từ đó.
Chiều ngược lại `runner.ts → sandbox.ts` là `import type`, bị xoá lúc biên dịch, nên **không có vòng lúc
chạy**. Luật `kien-truc-tang` cho phép đúng khuôn này và đã khai lý lẽ ấy thành scenario riêng.

Dải: `[30, 3600]`, mặc định **3600**. Mặc định bằng cận trên là **có chủ đích**, không phải quên kẹp — kẹp
còn tác dụng ở cận dưới và ở giá trị vượt trần.

### D5. Vì sao KHÔNG tự chạy `npm ci`

Cài phụ thuộc là **chạy code cài đặt của repo đích** — script `postinstall` chạy tuỳ ý, ngoài sandbox, với
quyền của người chạy CheckMate. Đó là một trục an toàn riêng, không phải một dòng tiện tay trong change về
thông điệp lỗi. Nhịp hai: cài **trong container**, có change riêng.

## Rủi ro đã biết, khai ra chứ không giấu

- **Nâng `probe_cap` mặc định 20 → 100 khi các điều kiện tiên quyết CHƯA đủ.** Hồ sơ
  `finding-cap-and-density-standard` (tasks 7.2) liệt bảy điều kiện (a)–(g) trước khi nâng. Tới 07/09 mới
  xong **(c)** — timeout theo khoá, chính là change này. Đã kiểm bằng máy:

  | điều kiện | trạng thái đo được |
  |---|---|
  | (a) đọc `stop_reason`, trả lời cụt ⇒ lỗi có tên | **CHƯA** — `model.ts` không có `stop_reason`; `max_tokens: 8000` vẫn là hằng |
  | (b) `that_lac > 0` ⇒ không PASS | **CHƯA** — `that_lac` có ghi log ở `skill-code.ts`, không thấy ở `verdict.ts` |
  | (c) timeout theo cap | **XONG** — change này |
  | (d)–(g) | **CHƯA** |

  Cái (a) là cái duy nhất có thể cắn ngay: nhiều probe hơn ⇒ JSON trả lời dài hơn ⇒ chạm trần output.
  **Prod hôm nay KHÔNG dính** vì đang chạy `phuong_thuc: thue_bao` (đường CLI), không phải đường API — đo
  bằng `config.json` trên máy chủ. Đổi sang `api` là chạm ngay. Đây là **nợ có tên**, không phải rủi ro đã
  xử lý.

- **Trần hiệu dụng trên prod đi từ 20 lên 80** (`min(khoá repo 100, núm người vận hành 80)`). Nghĩa là mỗi
  lượt chấm code sinh nhiều probe hơn tối đa bốn lần. Đó là điều PO chốt, và núm 80 là chỗ siết.

## Open Questions

- Nên có **một trần thời gian cho cả lượt chấm** (không chỉ cho từng lệnh test) không? Trần 3600 giây mỗi
  lệnh nhân với nhiều file probe có thể thành nhiều giờ. Chưa gặp thật, chưa làm — nhưng ghi ra để lần sau
  không phải phát hiện lại.
