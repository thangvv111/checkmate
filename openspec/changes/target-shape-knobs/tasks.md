## 0. Đo trước khi viết

- [ ] 0.1 **Chặn cứng:** đo hiện thực có khớp luật `sandbox-isolation › Ảnh chạy do repo đích khai, và
      đọc từ NHÁNH GỐC` không — clone đứng ở sha nào lúc ba cửa đọc `checkmate.yml` chạy. Không khớp →
      tách change `checkmate-fix-bug` riêng và **change này chờ**, vì luật chung ở §1 đứng trên hiện thực
      ấy.
- [ ] 0.2 Với TỪNG khoá đang có (`test_cmd`, `framework`, `probe_dir`, `probe_ext`, `probe_file`,
      `timeout_s`, `huong_dan_probe`, `image`, `khuon_loi`, `triggers`, `severity_map`, `bo_qua_diff`,
      `sources.*`): kiểm bất biến D2 — **bỏ trống có lỏng hơn khai không**. Khoá nào vi phạm là lỗ đang
      mở, ghi ra `design.md`.
- [ ] 0.3 Đếm lại bằng máy các bề mặt ở `design.md` § Bề mặt đã ĐẾM BẰNG MÁY, xác nhận con số còn đúng.

## 1. Luật (capability)

- [ ] 1.1 `target-knob-defense` — 4 requirement ADDED; mỗi cái có test khoá ở §5.
- [ ] 1.2 `diff-visibility › Trần kích thước diff là khoá của repo đích` — ADDED. Không sửa «Vượt trần
      thì cắt tiếp theo hướng phủ nhiều nhất».
- [ ] 1.3 `spec-source › Độ sâu chia đơn vị luật là khoá của repo đích` — ADDED. Không sửa «Luật là ĐƠN
      VỊ CÓ ĐỊA CHỈ».
- [ ] 1.4 `target-contract › Đường chạy test MẶC ĐỊNH chịu cùng khoá timeout` + `› Tên file probe đi qua
      cùng cửa` — ADDED.
- [ ] 1.5 Chỗ sống của luật: hằng mặc định + dải kẹp trong engine **có test khoá** · khoá ở
      `checkmate.yml` repo đích · hồ sơ ở bốn capability trên. KHÔNG viết vào `docs/archive/r-rules/`.

## 2. Kiểu & hợp đồng

- [ ] 2.1 `packages/shared/src/types.ts`: kiểu khai khoá hình dạng trên verdict —
      `{ value, source, clamped_from? }` mỗi khoá, **tuỳ chọn, vắng = KHÔNG BIẾT**. Dùng chung khuôn với
      `volume_standard` của change `finding-cap-and-density-standard`.
- [ ] 2.2 Khai mọi export mới vào **bảng module của `checkmate.yml`** repo này (⛔C5).
- [ ] 2.3 Dựng **sổ khoá** ở chỗ đã chốt (Open Question của `design.md`): mỗi khoá một hàng — dải kẹp
      hoặc phép kiểm hình dạng · có đổi phép chấm không · có khai lên verdict không.

## 3. Engine (packages/harness)

- [ ] 3.1 `runner.ts`: hàm kẹp dải dùng chung + cửa đọc khoá hình dạng, cùng khuôn fail-safe với ba cửa
      đọc đang có (yml hỏng → `console.error` + mặc định, KHÔNG ném). Không cache (⛔C6).
- [ ] 3.2 `target.ts`: nối nguồn cấu hình vào tham số `tran` đã có (:148); `TRAN_DIFF` (:73) thành mặc
      định. Nới trần KHÔNG được làm mất khai báo file ngoài tầm nhìn.
- [ ] 3.3 `spec-units.ts`: nối nguồn cấu hình vào tham số `maxDepth` đã có (:56, :114); `MAX_UNIT_DEPTH`
      (:34) thành mặc định. Giữ nguyên cách đánh địa chỉ — **không đụng `RE_CODE`**.
- [ ] 3.4 `sandbox.ts`: `chayVitest` (:305) đọc khoá timeout; thông điệp `TIMEOUT` (:311) **đọc chính
      giá trị đã dùng để cắt**, không giữ hằng thứ hai. Ranh giới treo không đổi — vẫn KHÔNG kèm `loiNap`.
- [ ] 3.5 `skill-code.ts`: `FILE_PROBE_MOI` (:55) đi qua cùng cửa với `runner.probe_file`; chỗ ghi và
      chỗ tìm dùng cùng một giá trị.
- [ ] 3.6 Gắn khoá hình dạng đã áp + nguồn vào verdict.

## 4. Web (apps/web)

- [ ] 4.1 `ui.ts`: bày khoá hình dạng đã áp + nguồn; verdict đời cũ hiện «không biết», không hiện mặc định.
- [ ] 4.2 `cli.ts`: in cùng thông tin.
- [ ] 4.3 Comment PR mang **mẫu số độ phủ** (độ sâu đã áp) — không có nó thì con số `x/y đơn vị luật`
      trên comment không so được giữa hai lượt.

## 5. Test

- [ ] 5.1 Ca khoá cho từng requirement (4 + 1 + 1 + 2 = 8).
- [ ] 5.2 **Lưới sổ khoá** — đối chiếu khoá cửa đọc thật sự parse với sổ; ĐỎ khi thiếu hàng, ĐỎ khi thừa
      hàng. **Cặp fixture bắt buộc** (`test-grid-integrity`): fixture thiếu-hàng ĐỎ, fixture đủ-hàng XANH.
- [ ] 5.3 Ca đối xứng cho «đọc nhánh gốc»: PR **nới** không ăn, PR **siết** cũng không ăn.
- [ ] 5.4 Ca cửa song sinh timeout: đổi khoá timeout → **cả** chỗ cắt lẫn thông điệp đổi theo; lưới
      khẳng định không còn hằng thứ hai.
- [ ] 5.5 Mutation hai chiều cho mỗi gác mới, chạy **HAI lần**, và **kiểm chứng đột biến đã vào đĩa**
      trước khi đọc kết quả.
- [ ] 5.6 `npx tsc --noEmit` sạch + `npm test` xanh **toàn bộ**.

## 6. Hồ sơ

- [ ] 6.1 Tài liệu `checkmate.yml` cho repo đích: khoá mới, mặc định, dải kẹp, và **khoá nào đọc từ
      nhánh gốc**.
- [ ] 6.2 Ghi vào `design.md` kết quả đo 0.1 và 0.2 (không phải để lưu, mà vì §1 đứng trên chúng).

## § Sau-merge — nợ có tên

- [ ] 7.1 Nếu 0.1 lòi ra lỗ «đọc từ nhánh PR»: change `checkmate-fix-bug` kéo hiện thực khớp lại luật
      `sandbox-isolation › Ảnh chạy…` cho CẢ ba cửa đọc.
- [ ] 7.2 Rà lại rổ B của bản rà 06/09 sau 6 tháng — kiểm xem có hằng nào đã lặng lẽ được đưa ra
      `checkmate.yml` mà không qua sổ khoá.
