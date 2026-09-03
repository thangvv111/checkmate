# Tasks — provider-gate

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/provider-gate/spec.md` (8 requirement) — đã viết.
- [ ] 1.2 Đối chiếu từng requirement với ca đang xanh ở `model-hop-le` · `mat-xac-thuc` · `env-cli` ·
      `web-loc` · `ba-muc-tu-dong`. **ĐỌC, không đếm mã trích** — đây là change thứ ba liên tiếp phép đếm
      cho ra con số cao hơn thực tế.

## 2. Test — những điều chưa khoá

- [ ] 2.1 `R5.6` — phản hồi **rỗng** từ nhà cung cấp là kiểm THẤT BẠI, và thông điệp nói đúng bản chất
      («model chưa sinh được nội dung», không phải «khoá sai»).
- [ ] 2.2 `R5.14` **vế hành vi** (D1): `uoc_tinh` là `false` khi có `usage` thật, `true` khi phải ước theo
      ký tự. Ca sẵn có chỉ khoá *trường tồn tại*.
- [ ] 2.3 `R3.14` — mất xác thực thì **KHÔNG thử lại**: phát hiện xong là dừng, không gọi lần hai.
- [ ] 2.4 `R5.4` — chưa kiểm thành công thì không chọn được nhà cung cấp để chấm (ca đọc source: phép kiểm
      đứng trước cửa chọn).
- [ ] 2.5 `R5.9` — thứ tự lấy khoá: biến môi trường của dịch vụ trước, kho khoá sau.
- [ ] 2.6 `R5.11` — kho khoá được siết quyền (kiểm LỜI GỌI, D2).

## 3. Mutation — mỗi chiều chạy HAI lần

- [ ] 3.1 Đổi nhánh «phản hồi rỗng» thành `ok: true` → ca 2.1 ĐỎ.
- [ ] 3.2 Ép `uoc_tinh` luôn `false` → ca 2.2 ĐỎ.
- [ ] 3.3 Cho mất-xác-thực đi vào đường thử lại → ca 2.3 ĐỎ.
- [ ] 3.4 Đảo thứ tự lấy khoá → ca 2.5 ĐỎ.

## 4. Kiểm cơ học

- [ ] 4.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — dự đoán chỉ nêu vế **«không ca cũ nào đỏ»**.
- [ ] 4.2 `npx openspec validate --changes` xanh.
- [ ] 4.3 Nếu task 1.2 phát hiện spec nói quá code: sửa SPEC cho khớp code và ghi chỗ lệch thành mục riêng
      trong proposal (khuôn `probe-classification`).

## 5. Bảng tra (ở commit archive)

- [ ] 5.1 `docs/r-rules-map.md`: 23 điều → `housed` `provider-gate › <tiêu đề>`.
- [ ] 5.2 Đo neo thư viện probe — **dự đoán TRƯỚC: KHÔNG đổi, vẫn 14/15** (D4). Sai thì ghi rõ sai ở đâu.
