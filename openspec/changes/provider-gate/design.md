# Design — provider-gate

## Context

Đo trên `main` 03/09 (`2c1754c`) bằng cách **đọc**:

```
23 dieu (R5 + R5.1-R5.19 + R3.12-R3.14)
  DA co ca   ~15   model-hop-le (12) · mat-xac-thuc (10) · env-cli (9) · web-loc (3) · ba-muc-tu-dong
  CHUA co ca  ~8   R5 R3.14 R5.4 R5.6 R5.9 R5.11 R5.14(ve hanh vi) (+1)

Cho thi hanh cua nhung dieu chua khoa
  model-source.ts:85   phan hoi RONG -> ok:false                      R5.6
  server.ts:652        checkStillValid truoc khi cho chon             R5.4
  config.ts:~358       env dich vu truoc, kho sau                     R5.9
  secret-vault.ts:54   chmodSync(FILE_SECRET, 0o600)                  R5.11
  model.ts:12-18       uoc_tinh = !that                               R5.14
```

## Goals / Non-Goals

**Goals**
- 23 điều có nhà.
- Ba điều đáng kể được khoá: `R5.6` (rỗng là thất bại) · `R5.14` vế hành vi (`uoc_tinh` đặt đúng) ·
  `R3.14` (không thử lại).

**Non-Goals**
- KHÔNG đổi hành vi. Backfill.
- KHÔNG đụng `provider.ts`, `model-source.ts`, `secret-vault.ts`.

## Decisions

### D1 — `R5.14` phải khoá vế HÀNH VI, không chỉ vế «trường tồn tại»

`doc-du-lieu-cu.test.ts` đã khoá rằng `chi_phi` có đủ bốn trường kể cả `uoc_tinh`. Nhưng nó không khoá rằng
`uoc_tinh` được đặt **đúng**: `true` khi số token ước theo ký tự, `false` khi lấy từ `usage` thật.

Một con số ước mà trình bày như số thật là báo sai bản chất, và người đọc sẽ dựng ngân sách trên nó. Nên ca
phải gọi hàm kế toán với cả hai trạng thái và khẳng định cờ đảo đúng chiều.

Cùng họ với ba lần trước: `error-message-egress-gate` D1 (ca «có thông điệp lỗi» vs «thông điệp được rào»),
`repo-history` D6 (ca «hàm lọc đúng» vs «route lọc trước khi gọi»). **Trường tồn tại ≠ trường mang giá trị
đúng.**

### D2 — `R5.11` kiểm LỜI GỌI chmod, cùng lý do với `R11.8`

Ca đọc quyền thật đỏ trên Windows, xanh trên Linux — lưới nói khác nhau tuỳ máy là lưới người ta sẽ bỏ qua.
`identity-session` D4 đã quyết đúng ca này cho kho SQLite; ở đây kho khoá `.secrets.json` cùng bài toán, nên
cùng cách. Cái mất giống hệt và đã khai ở đó.

### D3 — `R3.12`–`R3.14` ở đây, không ở `model-reply-parsing`

Ba điều này nằm trong mục «Lỗi của công cụ, không phải câu trả lời của model» của văn bản gốc, và bảng chia
xếp chúng vào `provider-gate` — đúng, vì chúng nói về **nhà cung cấp hỏng**, không về **cách bóc trả lời**.
`model-reply-parsing` đã archive và không nhắc chúng.

Ranh giới: `unwrapJson` không tìm thấy JSON là chuyện của `model-reply-parsing`; **vì sao** không có JSON —
do công cụ báo mất xác thực — là chuyện của capability này.

### D4 — Dự đoán TRƯỚC khi đo

Thư viện probe tự chấm neo **14/15**, còn trôi đúng `R9.6` thuộc `data-layer`. Nhóm này không chứa mã nào
đang trôi, nên **dự đoán: neo KHÔNG đổi, vẫn 14/15**.

### D5 — Ca «thứ tự lấy khoá» chỉ có nghĩa khi kho THẬT SỰ có khoá (phát hiện lúc mutation)

Ca đầu em viết: đặt biến môi trường rồi khẳng định `readKey` trả về nó. Mutation đảo thứ tự (kho trước env)
**không giết được ca nào** — vì kho trên máy chạy test rỗng, nên cả hai thứ tự đều rơi xuống env và ca vẫn
xanh. Ca không phân biệt được hai hiện thực khác nhau.

Vá bằng `vi.mock` cho kho khoá: kho có khoá riêng, khác giá trị env. Chạy lại mutation thì nó giết đúng ca.

**Đây là lần thứ NĂM trong ngày cùng một họ lỗi:**

| change | ca xanh trên hệ thống đã hỏng |
|---|---|
| `error-message-egress-gate` D1 | ca «prompt có thông điệp lỗi» xanh sau khi bỏ rào |
| `response-secret-guard` T7.1 | 16 ca xanh mà máy chủ thật không chặn gì |
| `repo-history` D6 | ca «hồ sơ lọc đúng» xanh sau khi bỏ lọc ở route |
| `provider-gate` D1 | ca «trường `uoc_tinh` tồn tại» xanh dù giá trị luôn sai |
| `provider-gate` D5 | ca «env thắng kho» xanh dù thứ tự bị đảo — vì kho rỗng |

Mẫu chung: **ca dựng một hiện thực thì phải dựng đủ để hai hiện thực khác nhau cho hai kết quả khác nhau.**
Mutation là thứ duy nhất phát hiện được điều đó — không có nó thì cả năm ca trên đều trông như đang gác.

## Architecture

- Lưới mới cho cổng kiểm, kế toán token, và ba điều mất-xác-thực.
- Code sản phẩm: **không đổi**, trừ khi task 1.2 phát hiện lệch giữa spec và code.

## Data Model

N/A.

## Risks / Trade-offs

- [Ca cho `R5.6` cần dựng phản hồi rỗng từ nhà cung cấp] → dùng hàm thuần chỗ nào có; chỗ nào phải gọi mạng
  thì khoá bằng ca đọc source như `repo-history` D4, và khai rõ là yếu hơn.
- [`R5.4` thi hành trong route] → cùng cách: ca đọc source khẳng định `checkStillValid` đứng trước cửa chọn.
- [23 điều là nhiều] → khoảng 15 đã có ca; change này thêm ca cho ~8 và khai cả 23.

## Migration Plan

N/A. Đường lùi: revert PR.

## Open Questions

- Không.
