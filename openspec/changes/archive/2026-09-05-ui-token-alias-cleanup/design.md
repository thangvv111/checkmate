## Context

Khối bí danh ở `apps/web/src/ui.ts` (khối `:root` thứ ba, mục «LỚP RIÊNG CỦA APP») nối năm tên đời cũ vào
token mới. Năm cái đầu nối look→look và vô hại; năm cái sau nối **look→semantic**:

```css
--teal: var(--pass);   --teal-soft: var(--pass-tint);
--amber: var(--medium); --amber-soft: var(--medium-tint);
--fail-soft: var(--fail-tint);
```

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -ro "var(--teal)"       apps/web/src/*.ts | wc -l   # 20
grep -ro "var(--teal-soft)"  apps/web/src/*.ts | wc -l   # 5
grep -ro "var(--amber)"      apps/web/src/*.ts | wc -l   # 5
grep -ro "var(--amber-soft)" apps/web/src/*.ts | wc -l   # 4
grep -ro "var(--fail-soft)"  apps/web/src/*.ts | wc -l   # 4   -> tong 38
grep -rn "var(--teal\|var(--amber\|var(--fail-soft" apps/web/src/*.ts | sed 's/:.*//' | sort | uniq -c
#   5 ui-docs.ts · 8 ui-provider.ts · 10 ui-repo.ts · 3 ui-trust.ts · 1 ui.ts
```

Sau change: cả năm phép đếm phải về **0**.

## Goals / Non-Goals

**Goals**
- Xoá năm bí danh trộn họ; mỗi chỗ dùng gọi thẳng tên họ mà nó THẬT SỰ thuộc về.
- Có lưới bắt được việc dựng lại bí danh, kèm cặp fixture.
- Hai chỗ màu về đúng gói design (tag «đang dùng» accent · badge «trực» jade).

**Non-Goals**
- Không đụng năm bí danh look→look (`--bg` · `--surface` · `--ink` · `--muted` · `--line`).
- Không dựng lại bố cục màn nào — chỉ đổi chỗ lấy màu.
- Không đổi màu «ngừng» của nhà cung cấp khai tử (xem Open Questions).

## Decisions

### D1 — LUẬT PHÂN LOẠI: semantic là «kết quả một phép kiểm», không phải «trạng thái giao diện»

Đây là quyết định trung tâm của change, vì không có nó thì 38 chỗ chỉ là 38 lần đoán.

> **Bộ semantic** (`--pass` · `--fail` · `--medium` và tint của chúng) trả lời câu *«phép kiểm này ra
> sao?»* — đạt · hỏng · cảnh báo.
> **Accent và ramp trung tính** trả lời câu *«giao diện đang ở trạng thái nào?»* — đang chọn · đang dùng ·
> đang xem · vừa lưu · số đếm.

Phép thử một dòng để phân loại một chỗ: **nếu màu ở đó đổi, người đọc có kết luận sai về CHẤT LƯỢNG của
thứ gì không?** Có ⇒ semantic. Không ⇒ look.

Áp vào 38 chỗ:

| Nhóm | Chỗ | Về đâu |
|---|---|---|
| kết quả phép kiểm | «✓ đã kiểm» · «✗ thất bại» · «⚠ cấu hình đã đổi» của nhà cung cấp; kết quả kiểm kết nối repo; ô `kq-ok` bảng tài liệu; callout «lưu ý» | giữ semantic, đổi sang tên đúng |
| mức nghiêm trọng | «chìa riêng» / «chìa chung» / «thiếu token» — ba mức của cùng một trục | giữ semantic |
| trạng thái giao diện | «đang chọn» · «đang dùng» · viền thẻ đang dùng · mục nav đang mở · số bước · callout tóm tắt | **accent** |
| số đếm trung tính | «PR đã chấm» ở màn Tin cậy | **ink** |
| kết quả tích luỹ | «% PASS vòng đầu» · «streak PASS» ở màn Tin cậy | giữ semantic (`--pass`) |

Ba dòng cuối là chỗ thấy rõ nhất vì sao cần luật: ba con số nằm cạnh nhau trong cùng một hàng thẻ, và
trước change **cả ba đều tô màu PASS**. Hai trong ba là tỉ lệ pass thật; cái còn lại chỉ là số PR.

### D2 — «trực» đổi từ amber sang jade

Gói design khai `badge trực ● Trực · 300s (jade khi bật)`. Hiện tag «trực» ở thẻ repo dùng `--amber`, tức
mức **cảnh báo**. Bật chế độ trực không phải một cảnh báo; tô nó amber là nói với người đọc rằng có gì đó
cần chú ý.

Cân nhắc để nguyên và ghi nợ: **bác**. Nó nằm đúng trong tập 38 chỗ change này phải đụng, và để lại thì
change sau phải mở lại cùng dòng code vì một lý do khác — tức sửa hai lần cùng một chỗ.

### D3 — Lưới bắt bí danh: quét KHAI BÁO, không quét chỗ dùng

Cân nhắc: cấm `var(--teal)` ở mọi file.

**Bác.** Đó là cấm *triệu chứng*. Ai đó đặt bí danh tên khác (`--xanh`, `--ok`) là lại lọt, và danh sách
cấm phải nuôi bằng tay mãi mãi.

Chọn: quét **khối `:root`**, tìm dòng dạng `--<tên>: var(--<token>)` và hỏi **hai vế có cùng họ không**.
Họ suy từ tên: `pass|fail|medium` là semantic, còn lại là look. Bí danh cùng họ XANH, khác họ ĐỎ — đúng
hai scenario của spec.

Hàm quét là `export function scan*` nên tầng 3 của `test-grid-integrity` tự đòi cặp fixture; đó là điều
muốn, không phải thủ tục.

### D4 — Không đụng năm bí danh look→look

`--bg` · `--surface` · `--ink` · `--muted` · `--line` nối tên cũ vào token **cùng họ**. Chúng không trộn
nghĩa, và lưới D3 sẽ để chúng xanh — đúng theo scenario «bí danh trong CÙNG một họ». Gỡ tên chúng là
việc của change refactor tên định danh đã xếp lịch; trộn vào đây thì diff phình gấp ba mà không thêm một
tính chất nào.

## Architecture

Chỉ chạm `apps/web/src` (lớp dựng chuỗi HTML) và `test/`. Không chạm `packages/harness`, không chạm
`packages/shared`. Không có luồng dữ liệu nào đổi.

## Data Model

N/A — change không đụng dữ liệu trên đĩa, không đụng SQLite, không đụng cấu hình. Không có gì để di trú:
màu là thứ dựng lại mỗi lần render.

## Risks / Trade-offs

**[Định tuyến nhầm một chỗ — một trạng thái giao diện vẫn ở lại bộ semantic]** → Sau change cả năm phép
đếm ở Tầng 2 về 0, nên không chỗ nào «vẫn ở lại» được. Rủi ro thật là định tuyến *sai hướng*: một kết quả
phép kiểm bị đẩy sang accent. Giảm thiểu bằng bảng phân loại của D1 nằm ngay trong change, và bằng ca
khoá rằng ba chỗ đại diện của mỗi nhóm dùng đúng họ.

**[Đổi vẻ một số chỗ mà PO chưa nhìn]** → Đúng, và đó là mục đích: những chỗ ấy đang mang màu sai nghĩa.
Thay đổi lớn nhất nhìn thấy được là tag «đang chọn»/«đang dùng» chuyển từ xanh jade sang đỏ accent — đúng
gói design khai. Ghi vào PR để PO thấy trước khi merge.

**[Lưới D3 báo oan trên bí danh cùng họ]** → Đây là lỗi lưới loại 3 (đỏ trên hệ thống đang đúng), và nó
có ca đối chứng riêng: năm bí danh look→look hiện có phải XANH.

## Migration Plan

Không có dữ liệu để di trú. Đường lùi: revert commit, khối bí danh trở lại, mọi chỗ dùng vẫn hợp lệ.

## Open Questions

**Màu «ngừng» của nhà cung cấp khai tử** (`ui-provider.ts`, tag của provider `ngung`) đang dùng tint FAIL.
«Ngừng» không phải một thất bại — đây cũng là một chỗ trộn nghĩa, nhưng nó thuộc **màn Cấu hình**, mà màn
ấy được dựng lại trọn vẹn ở change `settings-screen-ccs`. Sửa ở đây thì change kia mở lại đúng dòng ấy.
Ghi vào phần «Không làm» của proposal và chuyển sang change đó.
