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
- [ ] 7.3 ⛔ **CHƯA CHẠY ĐƯỢC — và lý do KHÔNG phải change này.** Xác thực Claude CLI trên máy chủ đã mất
      từ **16:52**, tức TRƯỚC deploy 5 tiếng (bốn lượt chấm hỏng liên tiếp, tất cả chết ở bước 3). Chi tiết
      và bằng chứng ở «§ Đo được ở §7» bên trên. Việc còn lại: chạy một lượt chấm thật trên repo demo, xác
      nhận **không probe thư viện nào chạy** và đo thời gian so với trước — **làm sau khi khôi phục xác
      thực** (`claude login` bằng đúng user chạy dịch vụ, hoặc chuyển Provider sang Anthropic API).

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

### ⛔ T9.2 (chạy một lượt chấm thật) KHÔNG chạy được — và lý do KHÔNG phải change này

Lượt chấm thật dừng ở bước 3 với: *«Claude Code CLI mất xác thực trên máy này»*. Kiểm trực tiếp, không suy:

```
claude -p "..."   ->  Not logged in · Please run /login
~/.claude/        ->  KHONG co file chung thuc
config: agent.ncc = anthropic, phuong_thuc = thue_bao   (dung goi CLI, khong dung API key)
```

**Mốc thời gian cho thấy nó có TRƯỚC deploy khoảng 5 tiếng:**

| giờ | lượt | kết quả |
|---|---|---|
| 12:16 | PR #7 · code | **xong** — lượt chấm thành công gần nhất |
| 16:52 | PR #70 · code | **lỗi** — chết ở bước 3, chỗ gọi model lần đầu |
| 18:06 | PR #71 · code | lỗi |
| 18:23 | PR #72 · code | lỗi |
| 21:21 | PR #74 · code | lỗi |
| **21:47** | — | **deploy change này** |

Bốn lượt hỏng liên tiếp, tất cả chết ở đúng bước 3. Deploy đẩy file nguồn, không đụng `~/.claude/`.

⚠ **Đây là thứ đáng lo hơn cả change:** từ 16:52 CheckMate **không chấm được PR nào**, và bốn lượt hỏng ấy
chỉ nằm ở trạng thái `loi` trên màn chủ chứ không có ai/cái gì gọi ra. Cần `claude login` bằng đúng user
chạy dịch vụ, hoặc chuyển Provider sang Anthropic API ở màn Cấu hình.

**Hệ quả cho change này:** ba phép kiểm dữ liệu và mã nguồn đã xong; phép kiểm HÀNH VI (không probe thư
viện nào chạy, và lượt chấm nhanh hơn bao nhiêu) **chưa đo được**, và nó ở lại là việc phải làm sau khi
xác thực được khôi phục. Không tick nó.

## § Sau-merge — nợ có tên

- [ ] N1 **Cửa đột biến mạnh hơn**: phủ định khẳng định là điều kiện CẦN, không ĐỦ — `expect(1).toBe(1)`
      phủ định cũng đỏ mà chẳng canh gì. Cửa mạnh hơn là đột biến **hiện thực** repo đích, nhưng nó đòi
      biết phá chỗ nào cho đúng, mà engine không có tri thức ấy. Chưa có lời giải, ghi để không ai tưởng
      cửa hiện tại là kín.
- [ ] N2 **Repo đích NHẬN đề xuất bằng cách nào** — change này dừng ở verdict + màn hàng đợi. Đẩy PR sang
      repo đích hay comment vào PR đang chấm là bề mặt khác, cần PO chốt.
