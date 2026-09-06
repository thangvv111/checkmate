# Tasks — probe-handover-replaces-library

⛔ **Change này GỠ một lớp phủ.** Rủi ro chính không phải «code mới sai» mà **«gỡ nhầm thứ vẫn còn hiệu
lực»**. Nên mọi mục gỡ đều phải soi từng ca một, và ca nào khoá một luật còn sống thì **chuyển nhà**, không
xoá.

## 0. Đếm bề mặt bằng máy — chạy TRƯỚC khi gỡ

```bash
grep -rln "probe-library\|probes-lib\|admitToLibrary" packages/*/src apps/web/src --include=*.ts   # 6 file
wc -l packages/harness/src/probe-library.ts packages/harness/src/dedup-probe.ts apps/web/src/ui-probes.ts
#   973 + 122 + 350 = 1445 dong
for f in probe-library probe-library-screen probe-quarantine thu-vien dedup-probe; do grep -c "  it(" test/$f.test.ts; done
#   15 + 47 + 37 + 30 + 26 = 155 ca
grep -rn "nghi_loi_co_san" packages/ apps/ --include=*.ts | grep -v test   # 1 duong SINH: skill-code.ts:737
```

- [x] 0.1 Ghi số thật vào đây trước khi sửa dòng nào.
- [x] 0.2 ⛔ Với **mỗi** trong 155 ca: quyết **xoá** hay **chuyển nhà**, ghi lý do một dòng. Không xoá cả
      file rồi tính sau — đó là cách mất một luật còn sống mà không ai thấy.

## 1. Luật (capability)

- [x] 1.1 `probe-handover` — capability MỚI, 6 requirement ADDED. Lưới: `test/probe-handover.test.ts`.
- [x] 1.2 `probe-library` — 11 REMOVED (kèm Reason + Migration) · 1 MODIFIED (máy tách **chuyển nhà**).
- [x] 1.3 `probe-quarantine` — 3 REMOVED. Cái mất phải khai: probe **sinh mới** không nạp được vẫn phải
      được xử qua nhãn `khong_chay`, thứ bị gỡ là cách ly probe **cũ**.
- [x] 1.4 `probe-library-screen` — 4 MODIFIED (đổi đối tượng, giữ nguyên tinh thần).
- [x] 1.5 `probe-classification` — **KHÔNG delta**. `nghi_loi_co_san` chưa bao giờ được spec khai; gỡ thư
      viện làm code thôi làm một việc spec không cho phép ⇒ spec **đúng hơn**, không cần sửa.
- [x] 1.6a `docs/r-rules-map.md` — 26 hàng `housed` trỏ cơ chế của kho đã đổi rổ sang `obsolete` kèm lý do
      (đo được: 0/7 probe từng bắt hồi quy).
- [x] 1.6b ⛔ **LÚC ARCHIVE, không sớm hơn:** hàng «Máy tách phải hiểu regex literal» phải dời sang
      `probe-handover › Tách một probe ra khỏi file nhiều probe phải hiểu regex literal`. Dời TRƯỚC archive
      thì lưới `r-rules-map` đỏ vì capability chưa tồn tại trong `openspec/specs/`; dời SAU thì nó đỏ vì
      requirement cũ đã bị archive gỡ. Đúng một khoảnh khắc để làm, và nó nằm trong bước archive.
- [x] 1.6c `docs/r-rules-map.md` — mã R10.* trỏ `probe-library` đổi rổ sang `obsolete` hoặc đổi nhà sang
      `probe-handover`. Lưới `r-rules-map` đỏ nếu còn mã trích mà không có hàng.

## 2. Kiểu & hợp đồng

- [x] 2.1 `packages/shared/src/types.ts` — thêm `handover?: Array<{ probe_id, spec_rule, hang, ly_do, code }>`.
- [x] 2.2 ⛔ **GIỮ optional, KHÔNG xoá khỏi kiểu**: `library_changes` · `probe_stats.cach_ly` ·
      `probe_stats.nghi_loi_co_san`. Bản ghi cũ trên prod mang chúng; xoá khỏi kiểu là làm bản ghi đời cũ
      không đọc được. Vắng trường = **KHÔNG BIẾT**, không phải «bằng 0» — cùng ranh giới `diff_blind_spots`.
- [x] 2.3 ⛔C5 — `checkmate.yml`: gỡ hàng `probe-library.js` và `dedup-probe.js`, thêm module xếp hạng mới,
      cập nhật hàng `ui-probes.js` và `config.js` (bỏ `LIBRARY_CAP*`).

## 3. Engine (packages/harness)

- [x] 3.1 `skill-code.ts` — gỡ `readProbeLibrary` (dòng 533) và việc trộn `nguon: 'thu_vien'` vào bộ chạy
      (dòng 725). Đây là chỗ chi phí thật nằm.
- [x] 3.2 `skill-code.ts` — gỡ toàn bộ khối nạp B1–B5 (~dòng 957–1070) và khối cách ly.
- [x] 3.3 `skill-code.ts:737` — gỡ dòng `nguon === 'thu_vien' → nghi_loi_co_san` (D4).
- [x] 3.4 **MỚI** — xếp hạng theo bằng chứng: hạng 1 (`hoi_quy`/`vi_pham_luat_moi`) · hạng 2 (xanh hai
      nhánh + `refHitsNew` + chưa được `ruleCoverage` phủ) · hạng 3 (còn lại). Danh sách **đóng**.
- [x] 3.5 **MỚI** — cửa đột biến hạng 2: phủ định từng khẳng định trong probe, chạy lại, probe **phải đỏ**.
      Không đỏ ⇒ vứt, nói lý do.
- [x] 3.6 Giữ `splitOneProbe` + `checkBalanced` — **chuyển nhà** sang đường giao, không xoá.
- [x] 3.7 Gỡ `probe-library.ts` (973 dòng) và `dedup-probe.ts` (122 dòng).

## 4. Web (apps/web)

- [x] 4.1 `ui-probes.ts` — đổi vai sang **hàng đợi giao**. Giữ ba luật giao diện đã có, đổi đối tượng.
- [x] 4.2 ⛔ Mã probe vẫn chèn bằng `textContent`, KHÔNG `innerHTML` (⛔C4) — nay quan trọng hơn vì mã ấy
      sắp được copy sang một repo khác.
- [x] 4.3 `config.ts` — gỡ `LIBRARY_CAP`, `LIBRARY_CAP_SUGGESTED`, và ô cấu hình trần thư viện ở màn Cấu hình.
- [x] 4.4 `server.ts` — gỡ route thư viện/cách ly/bỏ-cách-ly/dọn; thêm route hàng đợi giao.
- [x] 4.5 ⛔ Hàng đợi giao **KHÔNG có trần** (D6). Đề xuất rỗng dần vì repo nhận, không vì bị loại.
- [x] 4.6 Trạng thái rỗng nói **đã chấm bao nhiêu lượt mà chưa đủ bằng chứng** — im lặng phải có số đo đi kèm.

## 5. Test

- [x] 5.1 `test/probe-handover.test.ts` — ca khoá cho 6 requirement mới.
- [x] 5.2 ⛔ **Ca khoá danh sách hạng ĐÓNG** — probe không thuộc hạng 1/2 thì phải là hạng 3, không có
      nhánh «giữ tạm». Đây là ca giữ cho việc giữ probe không trôi về tích luỹ mặc định.
- [x] 5.3 ⛔ **Ca khoá: hạng 1 KHÔNG chạy đột biến** — đếm số lần cửa đột biến được gọi, phải là 0.
- [x] 5.4 ⛔ **Ca khoá: lượt chấm mới KHÔNG nạp probe nào từ lượt trước** — quét source, không có lời gọi
      đọc `probes-lib/`. Cặp fixture bắt buộc (lưới tầng 3).
- [x] 5.5 Ca khoá cái mất: verdict PASS phải nói rõ phạm vi đã dò, không khẳng định toàn repo còn nguyên.
- [x] 5.6 Ca đời cũ: bản ghi mang `library_changes`/`cach_ly`/`nghi_loi_co_san` vẫn đọc được.
- [x] 5.7 155 ca cũ — xử theo quyết định ở §0.2.
- [x] 5.8 Mutation mỗi chiều HAI lượt, kiểm chứng đột biến đã tới đĩa.
- [x] 5.9 `npx tsc --noEmit` sạch + `npm test` xanh **toàn bộ**.

## 6. Tài liệu

- [x] 6.1 `DEPLOY.md` — mục «Trần thư viện probe» không còn đối tượng: **viết lại**, không xoá. Nó là chỗ
      người sau đọc để hiểu vì sao `probes-lib/` vẫn nằm trên đĩa mà không ai đọc.
- [x] 6.2 `DEPLOY.md` — `probes-lib/` vẫn trong nhóm không-đè khi deploy (D3), ghi rõ lý do mới.
- [x] 6.3 Đóng nợ #18 («thư viện chạy toàn bộ mỗi lượt») — change này làm nó không còn đối tượng.

## § Phân loại 155 ca (§0.2) — quyết TỪNG ca, kết quả

| lưới | ca | quyết | vì sao |
|---|---|---|---|
| `probe-library` | 15 | **xoá** | cơ chế của kho: đặt tên file, khoá, nạp, trần env, ghi atomic |
| `thu-vien` | 30 | **xoá** | cơ chế của kho: đào thải bốn nấc, lịch sử, di trú, khoá |
| `probe-quarantine` | 37 | **xoá** | cách ly hết đối tượng — probe không sống qua lượt thì không mục |
| `dedup-probe` | 26 | **13 xoá · 13 CHUYỂN NHÀ** | ⛔ file chứa CẢ dedup (chết) LẪN máy tách (sống) |
| `probe-library-screen` | 47 | **33 xoá · 14 viết lại** | ⛔C4/⛔C3/⛔C1 + đầu vào khuyết còn sống, đổi đối tượng |
| `operator-settings` | 5 | **xoá** | ô trần thư viện; luật «kẹp đúng khoảng» GIỮ, fixture viết lại |

⛔ **`dedup-probe` là chỗ nợ cảnh báo trúng.** Xoá cả file là mất 13 ca đang khoá máy tách — một luật
**vẫn thi hành** — và việc đó **sẽ không làm gì đỏ**. Chỉ đọc tên từng ca mới thấy.

**Đối chiếu tổng (T7.6):** 1309 − 138 (cố ý xoá) + 38 (mới + chuyển nhà) = **1209**, khớp số đo được.
Sau khi bổ sung 8 ca còn thiếu ở lượt rà cuối: **1217**.

## 7. Deploy

- [x] 7.1 Deploy theo 4 bước `DEPLOY.md`.
- [x] 7.2 ⛔ **Đối chiếu: `probes-lib/` trên máy chủ còn NGUYÊN 7 file + `meta.json` sau deploy.** Đây là
      phép kiểm quan trọng nhất của lượt deploy này — gỡ code đọc mà lỡ xoá dữ liệu là việc một chiều.
- [x] 7.3 ✅ **ĐÃ CHẠY 06/09 lúc 22:30** — lượt chấm thật trên PR #7, commit `66abacf`, tức đúng vùng
      mà 7 probe thư viện cũ được sinh ra. Kết quả và bốn bằng chứng ở «§ T9.2» bên dưới.

## § Đo được ở §7 (06/09, prod)

```
DU LIEU — doi chieu truoc/sau deploy:
  probes-lib/demo-credit-approval   8 -> 8   (7 probe + meta.json)  <- phep kiem QUAN TRONG NHAT
  so_cai · so_cong · run            3·4·7 -> 3·4·7
  nguoi_dung · phien                1·9 -> 1·9
  runs/                             10 -> 10
  quyen DB                          600 ca ba file
  HTTP noi bo                       303 (chuyen ve /login)

MA NGUON DANG CHAY tren prod:
  route probe con lai   2, ca hai deu GET  (/probes · /api/probes)
  ba duong PHA HUY cu   da di  (remove · unquarantine · purge)
  doc probes-lib        0 loi goi — 2 cho khop grep deu la CHU THICH giai thich
```

⛔ **`tar` KHÔNG xoá file đã gỡ.** `probe-library.ts` và `dedup-probe.ts` vẫn nằm trên máy chủ sau khi giải
nén — không ai import (đã kiểm bằng `grep` trước khi xoá), nhưng code chết trông như code sống. Đã xoá tay.
Đây là bẫy đã có tiền lệ trong `DEPLOY.md` («DỌN MỘT LẦN»), và nó sẽ lặp lại ở mọi change có gỡ file.

⚠ Log khởi động báo `config.json có khoá KHÔNG được hỗ trợ: tran_thu_vien`. Đó là **hành vi đúng** — khoá
ấy nay vô tác dụng, và cảnh báo chính là thứ nói cho người vận hành biết nên bỏ nó. Không sửa cấu hình prod
cho gọn log: đó là dữ liệu của chủ máy.

### ⛔ T9.2 (chạy một lượt chấm thật) chưa chạy được — và bản ĐẦU của mục này CHẨN ĐOÁN SAI

**Bản đầu viết:** *«xác thực Claude CLI trên máy chủ đã mất từ 16:52»*, kèm bảng bốn lượt chấm hỏng làm
bằng chứng, và một nợ có tên về một sự cố xác thực.

**Sai. PO bác bỏ bằng một điều em không hỏi:** *«anh nhớ là đã đăng nhập bằng token, có đặt thời gian dài»*.
Kiểm lại thì token có thật và **vẫn hợp lệ**:

```
.secrets.json          ->  claude_code_oauth_token, 108 ky tu, tien to sk-ant-oat01…
agentEnv()             ->  CO truyen CLAUDE_CODE_OAUTH_TOKEN khi phuong_thuc = thue_bao
claude -p (voi token)  ->  "OK"        <- CLI nhan token, khong het han
```

**Nguyên nhân thật, đo được:** bốn lượt chấm ấy bị **chính deploy của em giết**. Mỗi lượt bắt đầu ngay
trước một lần `systemctl restart`:

| lượt bắt đầu | restart | cách nhau |
|---|---|---|
| 16:52:08 | 16:54:31 | 2 phút |
| 18:06:14 | 18:09:03 | 3 phút |
| 18:23:52 | 18:24:10 | **18 giây** |
| 21:21:16 | 21:47:55 | 26 phút (PR 34 file, còn đang chạy) |

`checkmate.log` có **đúng bốn** dòng `Đánh dấu lỗi 1 lượt có tiến trình đã chết: <id>` — khớp một-một.
Lượt chấm của riêng em thì hỏng vì lý do khác hẳn: shell SSH nạp `/etc/checkmate.env`, mà token thuê bao
**không nằm ở đó** — nó nằm trong kho khoá `.secrets.json` và chỉ được `agentEnv()` bơm vào tiến trình con.

**Ba bài học, ghi vì cái giá đã trả:**

1. **Em suy từ MỘT lượt hỏng của mình sang BỐN lượt hỏng của dịch vụ**, dù hai môi trường khác nhau ở đúng
   biến quyết định. Thông điệp lỗi giống nhau nên em coi nguyên nhân là một.
2. **«Bốn lượt hỏng liên tiếp» trông như một xu hướng**, nên em đọc nó thành một sự cố hệ thống thay vì
   hỏi *cái gì xảy ra ngay trước mỗi lượt*. Bảng mốc thời gian trả lời trong ba mươi giây, và em có nó
   sẵn — em chỉ không đặt hai cột cạnh nhau.
3. **`DEPLOY.md` hứa sai và em tin nó**: nó viết *«restart giữa lúc đang chấm nay không còn mất lượt»*, nên
   em loại bỏ giả thuyết «restart giết lượt» trước cả khi xét. Câu ấy nay đã sửa — sổ sự kiện cứu được
   **sự kiện**, không cứu **lượt chấm**.

**Việc còn lại (không tick):** chạy một lượt chấm thật trên repo demo — xác nhận không probe thư viện nào
chạy, và đo thời gian so với trước. Chạy khi **không có lượt nào đang chấm** và **không deploy chen vào**.
Prod hiện KHÔNG có sự cố nào cản việc đó.

### ✅ T9.2 — lượt chấm thật trên prod, 06/09 lúc 22:30

Chạy lại PR #7 trên đúng commit `66abacf` — commit từng sinh ra 7 probe thư viện, tức vùng mà thư viện cũ
phủ dày nhất. Nếu còn probe nào được nạp, lượt này sẽ lộ.

```
ke_hoach: 6 · ghi_nhan: 6          <- dung bang max_probe, KHONG probe nao them tu thu vien
                                      (truoc change: 6 moi + 7 thu vien = 13, chay tren CA HAI nhanh)
VERDICT: PASS · 1 finding (0 high · 1 medium)
```

**Bốn bằng chứng độc lập rằng thư viện thật sự đã đứt khỏi đường chấm:**

| bằng chứng | kết quả |
|---|---|
| `probes-lib/*/meta.json` sửa lần cuối | **12:20** — lượt 22:30 **không ghi vào** lần nào |
| số file trong `probes-lib/` | 8 → **8**, không mất, không thêm |
| `verdict.library_changes` | **vắng** — không còn được sinh |
| `verdict.probe_stats` | **không còn** `nghi_loi_co_san` lẫn `cach_ly` |

**⛔C2 chạy đúng trên bề mặt thật** — log lượt chấm có dòng:

> *«Phạm vi đã dò: probe của lượt này sinh quanh DIFF của PR. Hành vi cũ mà PR không chạm tới không được
> dò — verdict không khẳng định toàn bộ hành vi repo còn nguyên.»*

**Hàng đợi giao: 0 đề xuất** — và đó là kết quả ĐÚNG, không phải cơ chế hỏng. Lượt này có `hoi_quy: 0` nên
không có hạng 1; ba probe `cai_thien` (fail→pass, tức PR sửa được thứ gì đó) **cố ý không** thuộc hạng nào —
chúng chứng minh PR làm đúng, không chứng minh probe canh được gì. Đây đúng cái «dòng giao rất thưa» mà
`design.md` dự đoán trước khi chạy.

**Một chỗ bản đầu còn sót, chỉ chạy thật mới thấy:** dòng log tóm tắt vẫn in `0 nghi lỗi có sẵn (thư viện)`
— một con số nay không bao giờ khác 0. Đã gỡ, và ca T4.3 khoá cả hai vế (không còn đường sinh, không còn
nhắc trong log). Không lưới nào bắt được nó; thứ bắt được là **chạy thật rồi ĐỌC output**.

#### Đo thời gian: KHÔNG kết luận được, và đây là lý do

Nhiệm vụ 7.3 đòi «đo thời gian lượt chấm so với trước». Em đo, và **phép đo không cô lập được biến cần
đo**. Ghi ra thay vì chọn con số đẹp:

| lượt | cấu hình | thư viện | thời gian | ghi chú |
|---|---|---|---|---|
| 10:18 (trước change) | max_probe 12 | **có** (7 probe) | 210s | |
| 12:16 (trước change) | max_probe 12 | **có** (7 probe) | 234s | |
| 22:30 (sau change) | max_probe 6 | không | **170s** | 6 probe, không sinh lại |
| 22:34 (sau change) | max_probe 12 | không | **397s** | 11 probe, **có một lượt SINH LẠI** |

Lượt 22:34 chậm hơn hẳn, và nguyên nhân **không phải** thư viện: bộ probe đầu tiên hỏng — `0/11 pass` trên
**cả hai nhánh** — nên engine kích hoạt đường sinh lại (lưới «>50% probe mới hỏng»), tức chạy **hai vòng
sandbox trên hai nhánh** thay vì một. Lần hai cho `10/11` trên nhánh PR.

Ba biến cùng đổi giữa các lượt: **số probe** (6 · 11 · 12), **có sinh lại hay không**, và **model sinh ra
bộ probe khác nhau mỗi lượt**. Thư viện chỉ là biến thứ tư. Với bốn điểm dữ liệu và ba biến nhiễu, một
con số «nhanh hơn X%» rút ra từ đây sẽ là con số bịa.

**Thứ nói được chắc chắn, vì nó là số học chứ không phải suy đoán:** mỗi lượt chấm nay chạy **ít hơn 7
probe × 2 nhánh = 14 lượt thực thi test**, và con số ấy **thôi tăng theo thời gian**. Trước change nó tăng
tới trần 100 probe, tức tối đa 200 lượt thực thi mỗi lượt chấm, không liên quan gì tới PR đang xét. Phần
tiết kiệm quy ra bao nhiêu giây thì tuỳ bộ test của repo đích nhanh hay chậm — và đó là câu chỉ đo được
trên chính repo ấy, không phải trên repo demo.

*(Lượt 22:34 vẫn in `0 nghi lỗi có sẵn (thư viện)` vì prod đang chạy bản trước bản sửa dòng log — bản sửa
ấy nằm ở commit sau lần deploy này.)*

⚠ **Một quan sát ngoài lề, đáng giữ:** đường sinh lại đã chạy đúng khi cần — bộ probe hỏng toàn tập bị
phát hiện và sinh lại thay vì cho ra một verdict dựa trên 11 probe vô nghĩa. Không có nó, lượt ấy sẽ báo
«9 ngoài phạm vi» rồi PASS trong im lặng.

## § Sau-merge — nợ có tên

- [ ] N1 **Cửa đột biến mạnh hơn**: phủ định khẳng định là điều kiện CẦN, không ĐỦ — `expect(1).toBe(1)`
      phủ định cũng đỏ mà chẳng canh gì. Cửa mạnh hơn là đột biến **hiện thực** repo đích, nhưng nó đòi
      biết phá chỗ nào cho đúng, mà engine không có tri thức ấy. Chưa có lời giải, ghi để không ai tưởng
      cửa hiện tại là kín.
- [ ] N2 **Repo đích NHẬN đề xuất bằng cách nào** — change này dừng ở verdict + màn hàng đợi.
      ➜ **ĐÃ CHUYỂN thành nợ #28 ở `named-debts`, và hình dạng ĐÃ ĐỔI.** PO cho biết 06/09 rằng CheckMate
      được xây cho **nhiều đội** dùng. Dữ kiện ấy loại phương án «mở PR sang repo đích» (nó biến CheckMate
      thành *maker* trong repo nó *check*, và cần quyền ghi nhánh trên repo đội khác), và làm hỏng phương
      án «màn hàng đợi làm điểm giao» (người vận hành thành nút cổ chai giữa N đội).
      Nó cũng lộ ra **một chỗ thiết kế sai trong chính change này**: hạng 2 không nên giao CODE. Thứ nó
      tìm ra là một **khoảng hở** — «PR thêm luật mới mà bộ test của đội chưa phủ» — tức thông tin thuộc
      loại finding, chỗ verdict vốn đã chở. Con probe chỉ là bằng chứng khoảng hở ấy kiểm được.
      Hình dạng mới: cả hai hạng cưỡi `commentPr` (bề mặt đã có, đã cấp quyền, đang chạy hằng ngày), và
      màn hàng đợi trở về vai **xem lại**, không phải vai vận chuyển. Chi tiết + hai việc nhiều-đội đẻ ra
      (comment dài dìm finding · danh tính bot khi repo thiếu token riêng) ghi ở nợ #28.
