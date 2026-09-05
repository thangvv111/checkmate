# Tasks — probe-quarantine-and-cleanup

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -c "library.map((f) => sb.ghiProbe" packages/harness/src/skill-code.ts   # 1
grep -o "ok: data.numTotalTests > 0"     packages/harness/src/sandbox.ts      # dieu kien «chay duoc»
grep -o "that_lac = keHoach[^;]*"        packages/harness/src/skill-code.ts   # tinh TREN keHoach
grep -c "app.post('/api/probes"          apps/web/src/server.ts               # 0
```

- [x] 0.1 Sau change: `that_lac` tính trên **mọi** probe đã đưa vào chạy (probe mới + probe thư viện),
      probe bị cách ly đếm riêng ở `probe_stats.cach_ly`. Mutation M4 (trả `that_lac` về chỉ tính
      `keHoach`) làm ca ĐỎ 1/1 cả hai lượt — đó là phép đo, không phải lời hứa.
- [x] 0.2 **3** route ghi lên thư viện, tất cả `POST`, tất cả qua `openLibraryRoute` → `canOperate`.
      `scanOperatorGate` đếm bằng máy; mutation M5 (một đường tự đi) làm ca ĐỎ.

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/probe-quarantine/spec.md` — 3 requirement (đã viết).
- [x] 1.2 Delta MODIFIED `probe-library` · `probe-library-screen` · `verdict-contract` · `man-run` (đã viết).
- [x] 1.3 Chỗ sống của luật: hành vi cách ly ở `sandbox.ts` + `skill-code.ts` + ca khoá; trần vòng chạy lại
      là **hằng có test khoá**. Không viết luật vào `docs/archive/r-rules/`.

## 2. Kiểu & hợp đồng

- [x] 2.1 `ProbeLibEntry.cach_ly?: { luc; ly_do; sha_goc }`.
- [x] 2.2 `probe_stats.cach_ly` ở `packages/shared/src/types.ts` — **tuỳ chọn**, verdict đời cũ không có.
- [x] 2.3 Sổ gỡ: thêm `loai: 'nguoi_go' | 'nguoi_xoa_thu_vien'` và trường `boi`.
- [x] 2.4 ⛔C5 — khai export mới vào `checkmate.yml`.

## 3. Engine — nhận diện lỗi nạp

- [x] 3.1 `chayVitest` trả thêm `loiNap: string[]` — nhận diện bằng **hình dạng** (`assertionResults` rỗng
      + có `message`), KHÔNG bắt chuỗi lời văn lỗi.
- [x] 3.2 `outFile` không tồn tại → không quy được về file → giữ hành vi cũ (lượt chấm thất bại).
- [x] 3.3 Ca khoá: probe **chạy được mà fail** KHÔNG bao giờ vào `loiNap`.
- [x] 3.4 ⛔ **Danh sách ĐÓNG (PO chốt 05/09):** chỉ lỗi NẠP kích hoạt cách ly. Đường `treo` (timeout)
      giữ NGUYÊN hành vi cũ — «chạy lâu» không phải «không nạp được», và nó đã có finding riêng.
- [x] 3.5 `scanQuarantineTriggers` — đòi nhánh `treo` thoát TRƯỚC phép cách ly, và ứng viên không dựng
      từ `treo` · `'failed'` · `flaky_diem`. Cặp fixture đủ hai vế; mutation M8 (nới cho probe TREO) và M9
      (dựng từ `flaky_diem`) đều ĐỎ 1/1 hai lượt.

## 4. Engine — vòng cách ly

- [x] 4.1 Khi nhánh PR có lỗi nạp: **vẫn chạy nhánh gốc** để biết file nào hỏng độc lập với PR.
- [x] 4.2 ⛔ Cách ly CHỈ những file lỗi nạp trên **nhánh gốc** (bảng ba hàng ở design D2).
- [x] 4.3 File chỉ hỏng trên nhánh PR → KHÔNG cách ly, đi đường phân loại bình thường.
- [x] 4.4 Vòng chạy lại có trần **2**, hằng có test khoá; hết trần → lượt chấm thất bại (⛔C2).
- [x] 4.5 Ghi dấu `cach_ly` vào sổ **sau khi lượt chấm kết thúc**, trong khoá — không ghi giữa chừng.
- [x] 4.6 Probe MỚI của lượt không nạp được → đường sinh-lại đã có, KHÔNG ghi dấu vào thư viện.

## 5. Engine — đếm cho đúng

- [x] 5.1 `that_lac` tính trên **mọi** probe đã đưa vào chạy, gồm probe thư viện.
- [x] 5.2 `probe_stats.cach_ly` = số probe bị cách ly trong lượt.
- [x] 5.3 `readProbeLibrary` (đường chạy chấm) bỏ mục có `cach_ly`; `readLibraryIndex` (đường màn) giữ.

## 6. Web — ba hành động của người

- [x] 6.1 `POST /api/probes/remove` — gỡ một probe; `canOperate`; ghi sổ `nguoi_go` kèm `boi`.
- [x] 6.2 `POST /api/probes/unquarantine` — gỡ dấu; `canOperate`; không xoá gì.
- [x] 6.3 `POST /api/probes/purge` — xoá cả thư viện của repo; `canOperate`; **đòi gõ đúng tên repo**.
- [x] 6.4 Vai `tu_dong` bị chặn ở cả ba — cùng cơ chế đã chặn nó ở cổng merge.
- [x] 6.5 Ghi sổ TRƯỚC, xoá file SAU.

## 7. Web — màn

- [x] 7.1 Probe bị cách ly hiện rõ, kèm lý do + thời điểm, không bị ẩn.
- [x] 7.2 Nút gỡ / gỡ dấu / xoá thư viện; hộp xác nhận nêu **cái mất**.
- [x] 7.3 Bảng số liệu verdict (`man-run`) bày thêm số probe cách ly.
- [x] 7.4 Verdict đời cũ thiếu trường → khai **không đo được**, KHÔNG phải `0`.

## 8. Lưới

- [x] 8.1 Lưới mới `test/probe-quarantine.test.ts` theo `test-cases.md`.
- [x] 8.2 Ca cho **cả ba hàng** của bảng D2 — hàng «✓ gốc / ✗ PR» là ca quan trọng nhất.
- [x] 8.3 Ca trần vòng chạy lại: hết trần → thất bại, KHÔNG ra verdict.
- [x] 8.4 Ca vai: `tu_dong` gọi ba đường → bị chặn.

## 9. Mutation — mỗi chiều HAI lượt, CHẠY NỀN, so với bản chụp

- [x] 9.1 Cách ly cả file chỉ hỏng trên nhánh PR → ca ĐỎ *(chiều nguy hiểm nhất)*.
- [x] 9.2 Bỏ trần vòng chạy lại → ca ĐỎ.
- [x] 9.3 `readProbeLibrary` thôi lọc probe cách ly → ca ĐỎ.
- [x] 9.4 `that_lac` quay về chỉ tính `keHoach` → ca ĐỎ.
- [x] 9.5 Bỏ kiểm vai ở một trong ba route → ca ĐỎ.
- [x] 9.6 `purge` thôi đòi gõ tên repo → ca ĐỎ.
- [x] 9.7 Nhận diện lỗi nạp đổi sang bắt chuỗi lời văn → ca ĐỎ.
- [x] 9.9 Nới danh sách đóng — cách ly thêm probe TREO → ca ĐỎ *(ranh giới PO chốt)*.
- [x] 9.10 Nới danh sách đóng — cách ly thêm probe flaky → ca ĐỎ.
- [x] 9.8 **Đã xảy ra, và đã phân loại.** Chiều M6 («`purge` thôi đòi gõ tên repo») SỐNG SÓT lượt đầu,
      0/0 ca đỏ hai lượt — **hàng thứ NHẤT** của bảng ba đường: ca không load-bearing. Nó quét chuỗi
      `xacNhan !== g.repo` trong source, mà đột biến `if (false && xacNhan !== g.repo)` **vẫn khớp chuỗi
      ấy**. Ca xanh trên một cửa đã hỏng — đúng lỗi lưới loại 1 mà `test-grid-integrity` mô tả.
      Sửa: tách `evaluatePurgeRequest` thành hàm THUẦN ở `apps/web/src/probe-gate.ts` và khoá bằng
      HÀNH VI (tám đầu vào sai → từ chối), cộng một ca kiểm route gọi nó TRƯỚC khi xoá. Chạy lại: ĐỎ 1/1.

## 10. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 10.1 Dựng một thư viện có probe import module không tồn tại, chạy chấm thật: lượt chấm RA verdict,
      probe kia mang dấu cách ly. *(Tái hiện đúng sự cố prod 31/08.)*
- [x] 10.2 Probe hỏng chỉ trên nhánh PR: KHÔNG bị cách ly.
- [x] 10.3 Bấm gỡ một probe, gỡ dấu, và xoá cả thư viện trên màn — sổ ghi đủ ba lần, kèm tên người.
- [x] 10.4 Verdict của lượt có cách ly: bảng số liệu hiện số ấy.

## 11. Kiểm cơ học

- [x] 11.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 11.2 `npx openspec validate --changes` xanh.
- [x] 11.3 Tầng 3: mọi hàm quét `scan*` mới có CẶP fixture.

## 12. Kết quả đo

**Mutation — 10/10 chiều BỊ BẮT**, mỗi chiều hai lượt nhất quán (nền xanh trước khi đột biến; so với BẢN
CHỤP nội dung file):

| chiều | ca đỏ (lượt 1 / 2) | thứ bắt được |
|---|---|---|
| M1 cách ly cả file chỉ hỏng trên **nhánh PR** | 1 / 1 | T2.2 — *chiều nguy hiểm nhất* |
| M2 bỏ trần vòng cách ly | 1 / 1 | T_failclosed |
| M3 `readProbeLibrary` thôi lọc probe cách ly | 3 / 3 | T4.1 · T4.5 |
| M4 `that_lac` quay về chỉ tính `keHoach` | 1 / 1 | T5.1 |
| M5 bỏ kiểm vai ở một đường | 1 / 1 | `scanOperatorGate` |
| M6 `purge` thôi đòi gõ tên repo | 1 / 1 | *(sống sót lượt đầu — xem §9.8)* |
| M7 nhận diện lỗi nạp bằng chuỗi lời văn | 2 / 2 | T1.4 |
| M8 **nới danh sách đóng: cách ly cả probe TREO** | 1 / 1 | `scanQuarantineTriggers` — *ranh giới PO chốt* |
| M9 dựng ứng viên từ `flaky_diem` | 1 / 1 | `scanQuarantineTriggers` |
| M10 lý do cách ly không qua đường che | 1 / 1 | T_bimat |

**Kiểm tay — CHẠY THẬT**, tái hiện đúng sự cố prod 31/08: repo đích git thật (hai commit), thư viện ba
probe trong đó MỘT probe `import { chonNcc } from '../src/ncc.js'` — module không tồn tại. Sandbox thật,
`chayVitest` thật, không gọi model:

```
GOC : {"ok":true,"tong":2,"loiNap":["lib_64e1b21_d3a487.probe.test.ts"]}
PR  : {"ok":true,"tong":2,"loiNap":["lib_64e1b21_d3a487.probe.test.ts"]}
UNG VIEN CACH LY            : ["lib_64e1b21_d3a487.probe.test.ts"]
SAU CACH LY — duong CHAM    : hai probe con lai        (probe hong bi loai)
SAU CACH LY — duong MAN     : ba probe, cai thu ba co co cach_ly=true
LY DO                       : "Cannot find module '../src/ncc.js' imported from …"
CHI HONG TREN PR -> cach ly : []                        (chieu doi khang)
```

Hai điều đáng ghi từ lượt chạy này:
- Lượt chấm **sống sót** với hai probe còn lại — trước change, cùng đầu vào ấy để lại một probe biến mất
  mà **không con số nào đếm**.
- Dòng cuối là chiều đối kháng: probe chỉ hỏng trên nhánh PR **không** bị cách ly.
