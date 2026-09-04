## Context

Màn Cấu hình là chỗ người vận hành chỉnh ba nhóm: repo · nhà cung cấp model · độ sâu review và chế độ
trực. Hai chỗ trong đó chỉnh được thứ có hệ quả trên **dữ liệu prod**.

### Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (chạy trước khi viết ca)

```bash
grep -o 'name="max_probe"[^>]*' apps/web/src/ui.ts        # min="2" max="20"  <- nhan noi 2-12
grep -n 'max_probe: 10' apps/web/src/config.ts            # mac dinh 10       <- goi chot 6
grep -rn "CHECKER_LIB_TRAN" apps/ packages/ --include=*.ts | grep -v probe-library | wc -l   # 0
grep -n "return 100" packages/harness/src/probe-library.ts   # mac dinh 100  <- chu thich lap luan cho 40
grep -c 'type="range"' apps/web/src/ui.ts                 # 0  -> goi khai slider
grep -c "repo-row" apps/web/src/ui-repo.ts                # 1  -> goi khai card grid
```

**Bốn con số cho một thứ** (2–12 · 20 · 10 · 6) và **ba con số cho một thứ khác** (0 chỗ đặt env · 100
mặc định · 40 trong chú thích và trong gói). Không chỗ nào sai rõ ràng để sửa; mỗi con số đúng ở chỗ của
nó, chỉ là chúng không nói chuyện với nhau.

## Goals / Non-Goals

**Goals**
- Mỗi khoảng giá trị có một nguồn; nhãn, ô nhập và phép kẹp ở engine cùng đọc nguồn ấy.
- Trần thư viện probe chỉnh được, và ô nhập nói ra cái mất khi hạ.
- Khối Repo thành card grid theo gói; repo thiếu chìa có banner.
- «Đã ngừng» thôi mượn màu FAIL.

**Non-Goals**
- Không hiện «PR chờ» trên card (xem D3).
- Không đổi luồng thêm repo bốn bước, không đổi gating nút «Dùng nhà cung cấp này» — hai cái đó đã đúng gói.
- Không đụng trần đầu dò theo độ dài artifact (nợ #17).

## Decisions

### D1 — Khoảng giá trị là HẰNG DÙNG CHUNG, không phải ba con số chép tay

Một `PROBE_DEPTH = { min: 2, max: 12, mac_dinh: 6 }` ở `config.ts`, và cả ba chỗ đọc nó: nhãn hiển thị,
thuộc tính `min`/`max` của ô nhập, phép kẹp khi đọc cấu hình.

Cân nhắc chỉ sửa `max="20"` thành `max="12"`: **bác**. Nó chữa triệu chứng hôm nay và để nguyên nguyên
nhân — ba chỗ vẫn chép tay, nên lần sau đổi khoảng thì lại lệch. Bốn con số hiện tại chính là kết quả của
việc chép tay hai lần.

### D2 — Trần thư viện: mặc định GIỮ 100, gói design đề xuất 40 thì BÀY RA chứ không ÁP VÀO

Đây là quyết định nặng nhất của change.

`probes-lib/` là **tài sản regression**: mỗi probe là một phép thử đã từng chứng minh được điều gì đó, và
`DEPLOY.md` xếp nó vào nhóm không-được-đè. Hạ trần từ 100 xuống 40 **đào thải tới 60 probe ngay lượt nạp
kế tiếp** — hại một chiều, không lấy lại được bằng cách nâng trần lên lại.

Gói design chốt 40, và với một bản cài MỚI thì 40 đúng: dedup đời probe làm thư viện chặt hơn nên 40 phủ
rộng hơn 12 file đời cũ. Nhưng một đề xuất đúng cho bản cài mới không phải là một lệnh đúng cho bản đang
chạy. Nên: **mặc định của trường mới = trần đang áp (100)**, và con số 40 xuất hiện ở **hint của ô nhập**
kèm câu nói rõ hạ trần thì mất gì.

Cân nhắc đặt mặc định 40 và «chỉ áp cho cài mới»: **bác** — không phân biệt được «cài mới» với «cài cũ
chưa khai trường», mà cài cũ chưa khai trường chính là mọi bản đang chạy hôm nay.

### D3 — «PR chờ» trên card: CỐ Ý không làm

Gói khai nó. Nhưng nó cần một lời gọi GitHub **cho từng repo** ở **mỗi lần mở màn Cấu hình**: 3 repo là 3
lượt gọi mạng cho một con số trang trí, và số ấy tăng tuyến tính theo số repo.

Một màn cấu hình phải mở được cả khi mạng hỏng — đó là màn người ta vào để SỬA khi có gì đó hỏng. Bắt nó
phụ thuộc mạng là đúng lúc cần nhất thì nó không mở được.

Ghi thành **nợ có tên**, kèm điều kiện mở lại: khi có bộ đệm số PR chờ đọc được không cần gọi mạng.
«Lần chấm cuối» thì làm, vì nó đọc từ bảng `run` đang có — rẻ và luôn có.

### D4 — Slider cho độ sâu, ô số cho trần thư viện

Gói khai slider cho độ sâu. Slider hợp ở đây vì khoảng hẹp (2–12) và hai đầu **nhìn thấy được** — không ai
gõ ra ngoài dải khi dải hiện ra trước mắt.

Trần thư viện giữ ô SỐ: khoảng của nó là 6–200, quá rộng để rê chuột chính xác, và đây là ô người ta gõ
một con số đã nghĩ kỹ chứ không phải rê thử.

Slider cần một con số hiện cạnh nó — không có thì người dùng không biết mình đang ở đâu. Dùng
`<output>` + một dòng script ba câu; không thư viện, và tắt script thì slider vẫn gửi được giá trị (chỉ
mất con số hiển thị, không mất chức năng).

## Architecture

`apps/web/src` — `config.ts` (hằng khoảng, trường mới, `agentEnv`) · `ui.ts` (slider, ô trần) ·
`ui-repo.ts` (card grid) · `ui-provider.ts` (màu «đã ngừng») · `server.ts` (nhận trường, truyền lần chấm
cuối). `packages/harness/src/probe-library.ts` đọc env như cũ; chỉ đổi hằng mặc định cho khớp một nguồn.

## Data Model

**`config.json` thêm `agent.tran_thu_vien: number`.** Cấu hình đời cũ không có trường ⇒ đọc ra **100**,
tức trần đang áp — không probe nào bị đào thải vì lần cập nhật. Đây là toàn bộ đường di trú: một giá trị
mặc định chọn đúng, không cần bước chuyển đổi nào.

`config.json` nằm trong nhóm **không đè khi deploy** (`DEPLOY.md`). Change không ghi vào nó lúc khởi động;
trường chỉ xuất hiện khi người vận hành bấm lưu.

**`probes-lib/` không bị change này chạm.** Trần mới chỉ ảnh hưởng lượt **nạp probe kế tiếp**, và chỉ khi
người vận hành tự hạ.

**Đường lùi:** revert; trường thừa trong `config.json` bị bỏ qua bởi bản cũ.

## Risks / Trade-offs

**[Đổi mặc định `max_probe` 10 → 6 làm lượt chấm nông hơn]** → Chỉ áp cho cấu hình **chưa khai** trường;
mọi bản đang chạy đều đã khai. Con số 6 là của gói design.

**[Người vận hành hạ trần thư viện rồi mất probe]** → Đó là quyền của họ, và ô nhập nói rõ cái mất trước
khi bấm. Cái change này chịu trách nhiệm là **không tự hạ giúp**.

**[Card grid làm màn dài hơn với nhiều repo]** → Grid `330px min` tự xuống dòng theo bề rộng; ba repo vẫn
một hàng ở 1400px.

**[Slider khó chỉnh chính xác]** → Khoảng 2–12 nên mỗi nấc là một đơn vị; con số hiện cạnh slider.

## Migration Plan

Không có bước chuyển đổi. Trường mới thiếu ⇒ đọc ra trần đang áp. Có ca khoá đúng điều đó.

## Open Questions

Không còn. Con số mặc định chốt ở D2 và ghi rõ vì sao lệch gói; «PR chờ» chốt ở D3 với điều kiện mở lại.
