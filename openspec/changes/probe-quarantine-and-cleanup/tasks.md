# Tasks — probe-quarantine-and-cleanup

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -c "library.map((f) => sb.ghiProbe" packages/harness/src/skill-code.ts   # 1
grep -o "ok: data.numTotalTests > 0"     packages/harness/src/sandbox.ts      # dieu kien «chay duoc»
grep -o "that_lac = keHoach[^;]*"        packages/harness/src/skill-code.ts   # tinh TREN keHoach
grep -c "app.post('/api/probes"          apps/web/src/server.ts               # 0
```

- [ ] 0.1 Sau change: **0** nhóm probe chạy mà không được đếm — `that_lac` tính trên mọi probe đã đưa vào
      chạy, đo bằng ca chứ không bằng mắt.
- [ ] 0.2 Đếm lại số route ghi lên thư viện: phải là **3**, tất cả `POST`, tất cả qua `canOperate`.

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/probe-quarantine/spec.md` — 3 requirement (đã viết).
- [ ] 1.2 Delta MODIFIED `probe-library` · `probe-library-screen` · `verdict-contract` · `man-run` (đã viết).
- [ ] 1.3 Chỗ sống của luật: hành vi cách ly ở `sandbox.ts` + `skill-code.ts` + ca khoá; trần vòng chạy lại
      là **hằng có test khoá**. Không viết luật vào `docs/archive/r-rules/`.

## 2. Kiểu & hợp đồng

- [ ] 2.1 `ProbeLibEntry.cach_ly?: { luc; ly_do; sha_goc }`.
- [ ] 2.2 `probe_stats.cach_ly` ở `packages/shared/src/types.ts` — **tuỳ chọn**, verdict đời cũ không có.
- [ ] 2.3 Sổ gỡ: thêm `loai: 'nguoi_go' | 'nguoi_xoa_thu_vien'` và trường `boi`.
- [ ] 2.4 ⛔C5 — khai export mới vào `checkmate.yml`.

## 3. Engine — nhận diện lỗi nạp

- [ ] 3.1 `chayVitest` trả thêm `loiNap: string[]` — nhận diện bằng **hình dạng** (`assertionResults` rỗng
      + có `message`), KHÔNG bắt chuỗi lời văn lỗi.
- [ ] 3.2 `outFile` không tồn tại → không quy được về file → giữ hành vi cũ (lượt chấm thất bại).
- [ ] 3.3 Ca khoá: probe **chạy được mà fail** KHÔNG bao giờ vào `loiNap`.
- [ ] 3.4 ⛔ **Danh sách ĐÓNG (PO chốt 05/09):** chỉ lỗi NẠP kích hoạt cách ly. Đường `treo` (timeout)
      giữ NGUYÊN hành vi cũ — «chạy lâu» không phải «không nạp được», và nó đã có finding riêng.
- [ ] 3.5 Lưới gác: quét source đòi đúng MỘT chỗ kích hoạt cách ly, đọc từ danh sách lỗi nạp; không nhánh
      nào cách ly từ `treo` · `status: failed` · `flaky_diem`. Cặp fixture.

## 4. Engine — vòng cách ly

- [ ] 4.1 Khi nhánh PR có lỗi nạp: **vẫn chạy nhánh gốc** để biết file nào hỏng độc lập với PR.
- [ ] 4.2 ⛔ Cách ly CHỈ những file lỗi nạp trên **nhánh gốc** (bảng ba hàng ở design D2).
- [ ] 4.3 File chỉ hỏng trên nhánh PR → KHÔNG cách ly, đi đường phân loại bình thường.
- [ ] 4.4 Vòng chạy lại có trần **2**, hằng có test khoá; hết trần → lượt chấm thất bại (⛔C2).
- [ ] 4.5 Ghi dấu `cach_ly` vào sổ **sau khi lượt chấm kết thúc**, trong khoá — không ghi giữa chừng.
- [ ] 4.6 Probe MỚI của lượt không nạp được → đường sinh-lại đã có, KHÔNG ghi dấu vào thư viện.

## 5. Engine — đếm cho đúng

- [ ] 5.1 `that_lac` tính trên **mọi** probe đã đưa vào chạy, gồm probe thư viện.
- [ ] 5.2 `probe_stats.cach_ly` = số probe bị cách ly trong lượt.
- [ ] 5.3 `readProbeLibrary` (đường chạy chấm) bỏ mục có `cach_ly`; `readLibraryIndex` (đường màn) giữ.

## 6. Web — ba hành động của người

- [ ] 6.1 `POST /api/probes/remove` — gỡ một probe; `canOperate`; ghi sổ `nguoi_go` kèm `boi`.
- [ ] 6.2 `POST /api/probes/unquarantine` — gỡ dấu; `canOperate`; không xoá gì.
- [ ] 6.3 `POST /api/probes/purge` — xoá cả thư viện của repo; `canOperate`; **đòi gõ đúng tên repo**.
- [ ] 6.4 Vai `tu_dong` bị chặn ở cả ba — cùng cơ chế đã chặn nó ở cổng merge.
- [ ] 6.5 Ghi sổ TRƯỚC, xoá file SAU.

## 7. Web — màn

- [ ] 7.1 Probe bị cách ly hiện rõ, kèm lý do + thời điểm, không bị ẩn.
- [ ] 7.2 Nút gỡ / gỡ dấu / xoá thư viện; hộp xác nhận nêu **cái mất**.
- [ ] 7.3 Bảng số liệu verdict (`man-run`) bày thêm số probe cách ly.
- [ ] 7.4 Verdict đời cũ thiếu trường → khai **không đo được**, KHÔNG phải `0`.

## 8. Lưới

- [ ] 8.1 Lưới mới `test/probe-quarantine.test.ts` theo `test-cases.md`.
- [ ] 8.2 Ca cho **cả ba hàng** của bảng D2 — hàng «✓ gốc / ✗ PR» là ca quan trọng nhất.
- [ ] 8.3 Ca trần vòng chạy lại: hết trần → thất bại, KHÔNG ra verdict.
- [ ] 8.4 Ca vai: `tu_dong` gọi ba đường → bị chặn.

## 9. Mutation — mỗi chiều HAI lượt, CHẠY NỀN, so với bản chụp

- [ ] 9.1 Cách ly cả file chỉ hỏng trên nhánh PR → ca ĐỎ *(chiều nguy hiểm nhất)*.
- [ ] 9.2 Bỏ trần vòng chạy lại → ca ĐỎ.
- [ ] 9.3 `readProbeLibrary` thôi lọc probe cách ly → ca ĐỎ.
- [ ] 9.4 `that_lac` quay về chỉ tính `keHoach` → ca ĐỎ.
- [ ] 9.5 Bỏ kiểm vai ở một trong ba route → ca ĐỎ.
- [ ] 9.6 `purge` thôi đòi gõ tên repo → ca ĐỎ.
- [ ] 9.7 Nhận diện lỗi nạp đổi sang bắt chuỗi lời văn → ca ĐỎ.
- [ ] 9.9 Nới danh sách đóng — cách ly thêm probe TREO → ca ĐỎ *(ranh giới PO chốt)*.
- [ ] 9.10 Nới danh sách đóng — cách ly thêm probe flaky → ca ĐỎ.
- [ ] 9.8 Đột biến sống sót → bảng ba đường. Không im lặng khai bừa.

## 10. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [ ] 10.1 Dựng một thư viện có probe import module không tồn tại, chạy chấm thật: lượt chấm RA verdict,
      probe kia mang dấu cách ly. *(Tái hiện đúng sự cố prod 31/08.)*
- [ ] 10.2 Probe hỏng chỉ trên nhánh PR: KHÔNG bị cách ly.
- [ ] 10.3 Bấm gỡ một probe, gỡ dấu, và xoá cả thư viện trên màn — sổ ghi đủ ba lần, kèm tên người.
- [ ] 10.4 Verdict của lượt có cách ly: bảng số liệu hiện số ấy.

## 11. Kiểm cơ học

- [ ] 11.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 11.2 `npx openspec validate --changes` xanh.
- [ ] 11.3 Tầng 3: mọi hàm quét `scan*` mới có CẶP fixture.
