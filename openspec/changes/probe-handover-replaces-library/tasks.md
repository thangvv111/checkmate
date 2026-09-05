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

- [ ] 0.1 Ghi số thật vào đây trước khi sửa dòng nào.
- [ ] 0.2 ⛔ Với **mỗi** trong 155 ca: quyết **xoá** hay **chuyển nhà**, ghi lý do một dòng. Không xoá cả
      file rồi tính sau — đó là cách mất một luật còn sống mà không ai thấy.

## 1. Luật (capability)

- [ ] 1.1 `probe-handover` — capability MỚI, 6 requirement ADDED. Lưới: `test/probe-handover.test.ts`.
- [ ] 1.2 `probe-library` — 11 REMOVED (kèm Reason + Migration) · 1 MODIFIED (máy tách **chuyển nhà**).
- [ ] 1.3 `probe-quarantine` — 3 REMOVED. Cái mất phải khai: probe **sinh mới** không nạp được vẫn phải
      được xử qua nhãn `khong_chay`, thứ bị gỡ là cách ly probe **cũ**.
- [ ] 1.4 `probe-library-screen` — 4 MODIFIED (đổi đối tượng, giữ nguyên tinh thần).
- [ ] 1.5 `probe-classification` — **KHÔNG delta**. `nghi_loi_co_san` chưa bao giờ được spec khai; gỡ thư
      viện làm code thôi làm một việc spec không cho phép ⇒ spec **đúng hơn**, không cần sửa.
- [ ] 1.6 `docs/r-rules-map.md` — mã R10.* trỏ `probe-library` đổi rổ sang `obsolete` hoặc đổi nhà sang
      `probe-handover`. Lưới `r-rules-map` đỏ nếu còn mã trích mà không có hàng.

## 2. Kiểu & hợp đồng

- [ ] 2.1 `packages/shared/src/types.ts` — thêm `handover?: Array<{ probe_id, spec_rule, hang, ly_do, code }>`.
- [ ] 2.2 ⛔ **GIỮ optional, KHÔNG xoá khỏi kiểu**: `library_changes` · `probe_stats.cach_ly` ·
      `probe_stats.nghi_loi_co_san`. Bản ghi cũ trên prod mang chúng; xoá khỏi kiểu là làm bản ghi đời cũ
      không đọc được. Vắng trường = **KHÔNG BIẾT**, không phải «bằng 0» — cùng ranh giới `diff_blind_spots`.
- [ ] 2.3 ⛔C5 — `checkmate.yml`: gỡ hàng `probe-library.js` và `dedup-probe.js`, thêm module xếp hạng mới,
      cập nhật hàng `ui-probes.js` và `config.js` (bỏ `LIBRARY_CAP*`).

## 3. Engine (packages/harness)

- [ ] 3.1 `skill-code.ts` — gỡ `readProbeLibrary` (dòng 533) và việc trộn `nguon: 'thu_vien'` vào bộ chạy
      (dòng 725). Đây là chỗ chi phí thật nằm.
- [ ] 3.2 `skill-code.ts` — gỡ toàn bộ khối nạp B1–B5 (~dòng 957–1070) và khối cách ly.
- [ ] 3.3 `skill-code.ts:737` — gỡ dòng `nguon === 'thu_vien' → nghi_loi_co_san` (D4).
- [ ] 3.4 **MỚI** — xếp hạng theo bằng chứng: hạng 1 (`hoi_quy`/`vi_pham_luat_moi`) · hạng 2 (xanh hai
      nhánh + `refHitsNew` + chưa được `ruleCoverage` phủ) · hạng 3 (còn lại). Danh sách **đóng**.
- [ ] 3.5 **MỚI** — cửa đột biến hạng 2: phủ định từng khẳng định trong probe, chạy lại, probe **phải đỏ**.
      Không đỏ ⇒ vứt, nói lý do.
- [ ] 3.6 Giữ `splitOneProbe` + `checkBalanced` — **chuyển nhà** sang đường giao, không xoá.
- [ ] 3.7 Gỡ `probe-library.ts` (973 dòng) và `dedup-probe.ts` (122 dòng).

## 4. Web (apps/web)

- [ ] 4.1 `ui-probes.ts` — đổi vai sang **hàng đợi giao**. Giữ ba luật giao diện đã có, đổi đối tượng.
- [ ] 4.2 ⛔ Mã probe vẫn chèn bằng `textContent`, KHÔNG `innerHTML` (⛔C4) — nay quan trọng hơn vì mã ấy
      sắp được copy sang một repo khác.
- [ ] 4.3 `config.ts` — gỡ `LIBRARY_CAP`, `LIBRARY_CAP_SUGGESTED`, và ô cấu hình trần thư viện ở màn Cấu hình.
- [ ] 4.4 `server.ts` — gỡ route thư viện/cách ly/bỏ-cách-ly/dọn; thêm route hàng đợi giao.
- [ ] 4.5 ⛔ Hàng đợi giao **KHÔNG có trần** (D6). Đề xuất rỗng dần vì repo nhận, không vì bị loại.
- [ ] 4.6 Trạng thái rỗng nói **đã chấm bao nhiêu lượt mà chưa đủ bằng chứng** — im lặng phải có số đo đi kèm.

## 5. Test

- [ ] 5.1 `test/probe-handover.test.ts` — ca khoá cho 6 requirement mới.
- [ ] 5.2 ⛔ **Ca khoá danh sách hạng ĐÓNG** — probe không thuộc hạng 1/2 thì phải là hạng 3, không có
      nhánh «giữ tạm». Đây là ca giữ cho việc giữ probe không trôi về tích luỹ mặc định.
- [ ] 5.3 ⛔ **Ca khoá: hạng 1 KHÔNG chạy đột biến** — đếm số lần cửa đột biến được gọi, phải là 0.
- [ ] 5.4 ⛔ **Ca khoá: lượt chấm mới KHÔNG nạp probe nào từ lượt trước** — quét source, không có lời gọi
      đọc `probes-lib/`. Cặp fixture bắt buộc (lưới tầng 3).
- [ ] 5.5 Ca khoá cái mất: verdict PASS phải nói rõ phạm vi đã dò, không khẳng định toàn repo còn nguyên.
- [ ] 5.6 Ca đời cũ: bản ghi mang `library_changes`/`cach_ly`/`nghi_loi_co_san` vẫn đọc được.
- [ ] 5.7 155 ca cũ — xử theo quyết định ở §0.2.
- [ ] 5.8 Mutation mỗi chiều HAI lượt, kiểm chứng đột biến đã tới đĩa.
- [ ] 5.9 `npx tsc --noEmit` sạch + `npm test` xanh **toàn bộ**.

## 6. Tài liệu

- [ ] 6.1 `DEPLOY.md` — mục «Trần thư viện probe» không còn đối tượng: **viết lại**, không xoá. Nó là chỗ
      người sau đọc để hiểu vì sao `probes-lib/` vẫn nằm trên đĩa mà không ai đọc.
- [ ] 6.2 `DEPLOY.md` — `probes-lib/` vẫn trong nhóm không-đè khi deploy (D3), ghi rõ lý do mới.
- [ ] 6.3 Đóng nợ #18 («thư viện chạy toàn bộ mỗi lượt») — change này làm nó không còn đối tượng.

## 7. Deploy

- [ ] 7.1 Deploy theo 4 bước `DEPLOY.md`.
- [ ] 7.2 ⛔ **Đối chiếu: `probes-lib/` trên máy chủ còn NGUYÊN 7 file + `meta.json` sau deploy.** Đây là
      phép kiểm quan trọng nhất của lượt deploy này — gỡ code đọc mà lỡ xoá dữ liệu là việc một chiều.
- [ ] 7.3 Chạy một lượt chấm thật trên repo demo: xác nhận **không probe thư viện nào chạy**, và đo thời
      gian lượt chấm so với trước.

## § Sau-merge — nợ có tên

- [ ] N1 **Cửa đột biến mạnh hơn**: phủ định khẳng định là điều kiện CẦN, không ĐỦ — `expect(1).toBe(1)`
      phủ định cũng đỏ mà chẳng canh gì. Cửa mạnh hơn là đột biến **hiện thực** repo đích, nhưng nó đòi
      biết phá chỗ nào cho đúng, mà engine không có tri thức ấy. Chưa có lời giải, ghi để không ai tưởng
      cửa hiện tại là kín.
- [ ] N2 **Repo đích NHẬN đề xuất bằng cách nào** — change này dừng ở verdict + màn hàng đợi. Đẩy PR sang
      repo đích hay comment vào PR đang chấm là bề mặt khác, cần PO chốt.
