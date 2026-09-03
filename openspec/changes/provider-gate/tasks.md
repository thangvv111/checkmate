# Tasks — provider-gate

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/provider-gate/spec.md` (8 requirement) — đã viết.
- [x] 1.2 Đối chiếu từng requirement với ca đang xanh ở `model-hop-le` · `mat-xac-thuc` · `env-cli` ·
      `web-loc` · `ba-muc-tu-dong`. **ĐỌC, không đếm mã trích** — đây là change thứ ba liên tiếp phép đếm
      cho ra con số cao hơn thực tế.

## 2. Test — những điều chưa khoá

- [x] 2.1 `R5.6` — phản hồi **rỗng** từ nhà cung cấp là kiểm THẤT BẠI, và thông điệp nói đúng bản chất
      («model chưa sinh được nội dung», không phải «khoá sai»).
- [x] 2.2 `R5.14` **vế hành vi** (D1): `uoc_tinh` là `false` khi có `usage` thật, `true` khi phải ước theo
      ký tự. Ca sẵn có chỉ khoá *trường tồn tại*.
- [x] 2.3 `R3.14` — mất xác thực thì **KHÔNG thử lại**: phát hiện xong là dừng, không gọi lần hai.
- [x] 2.4 `R5.4` — chưa kiểm thành công thì không chọn được nhà cung cấp để chấm (ca đọc source: phép kiểm
      đứng trước cửa chọn).
- [x] 2.5 `R5.9` — vá lúc mutation (D5): ca đầu không phân biệt được thứ tự vì kho rỗng. — thứ tự lấy khoá: biến môi trường của dịch vụ trước, kho khoá sau.
- [x] 2.6 `R5.11` — kho khoá được siết quyền (kiểm LỜI GỌI, D2).

## 3. Mutation — mỗi chiều chạy HAI lần

- [x] 3.1 Đổi nhánh «phản hồi rỗng» thành không-bao-giờ-vào → ĐỎ đúng ca 2.1.
- [x] 3.2 Ép `uoc_tinh` luôn `false` → ĐỎ 2 ca (kể cả ca đối chứng «giá trị đúng»).
- [x] 3.3 Chèn đường thử lại vào nhánh mất-xác-thực → ĐỎ đúng ca 2.3.
- [x] 3.4 Đảo thứ tự lấy khoá → **lần đầu KHÔNG giết được ca nào** (D5): kho trên máy chạy test rỗng nên
      cả hai thứ tự cùng rơi xuống env. Vá ca bằng `vi.mock` cho kho khoá, chạy lại thì ĐỎ đúng ca.
      **Bốn đột biến, mỗi cái chạy hai lần, nhất quán.**

## 4. Kiểm cơ học

- [x] 4.1 `npx tsc --noEmit` sạch · `npm test` **53 file / 869 ca xanh** (858 + 11 ca mới). Vế «không ca
      cũ nào đỏ» — ĐÚNG.
- [x] 4.2 `npx openspec validate --changes` xanh.
- [x] 4.3 Task 1.2 KHÔNG phát hiện spec nói quá code lần này — mọi requirement khớp hành vi đang chạy.

## 5. Bảng tra (ở commit archive)

- [ ] 5.1 `docs/r-rules-map.md`: 23 điều → `housed` `provider-gate › <tiêu đề>`.
- [ ] 5.2 Đo neo thư viện probe — **dự đoán TRƯỚC: KHÔNG đổi, vẫn 14/15** (D4). Sai thì ghi rõ sai ở đâu.
