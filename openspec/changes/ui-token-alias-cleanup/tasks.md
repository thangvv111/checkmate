# Tasks — ui-token-alias-cleanup

## 0. Tầng 2 — ĐẾM BỀ MẶT BẰNG MÁY (đã chạy trước khi viết ca)

```bash
grep -ro "var(--teal)"       apps/web/src/*.ts | wc -l   # 20
grep -ro "var(--teal-soft)"  apps/web/src/*.ts | wc -l   # 5
grep -ro "var(--amber)"      apps/web/src/*.ts | wc -l   # 5
grep -ro "var(--amber-soft)" apps/web/src/*.ts | wc -l   # 4
grep -ro "var(--fail-soft)"  apps/web/src/*.ts | wc -l   # 4    (tong 38)
```

- [x] 0.1 Cả năm phép đếm về **0** (`--teal` · `--teal-soft` · `--amber` · `--amber-soft` · `--fail-soft`).
      Kiểm thêm ở trình duyệt thật: `getComputedStyle(:root)` trả `--teal` và `--amber` là **rỗng** —
      chúng không còn tồn tại, chứ không phải chỉ không còn được dùng.
- [x] 0.2 Số bí danh còn lại trong khối `:root` thứ ba: **5** (toàn look→look), và lưới mới cho chúng XANH.

## 1. Luật (capability)

- [x] 1.1 Delta MODIFIED `specs/giao-dien-ccs/spec.md` — chép nguyên khối cũ rồi thêm hai đoạn quy phạm và
      ba scenario mới (đã viết).

## 2. Xoá bí danh

- [x] 2.1 `ui.ts`: xoá `--teal` · `--teal-soft` · `--amber` · `--amber-soft` · `--fail-soft` khỏi khối
      `:root` thứ ba. Giữ nguyên năm bí danh look→look.

## 3. Định tuyến lại 38 chỗ dùng (theo bảng D1)

- [x] 3.1 `ui-provider.ts` (8): «✓ đã kiểm» · «✓/✗» khoá và gói thuê bao · kết quả kiểm → **semantic**;
      viền thẻ đang dùng + tag «đang dùng» → **accent**; tag «ngừng» giữ nguyên nghĩa, chỉ đổi tên biến.
- [x] 3.2 `ui-repo.ts` (10): «chìa riêng / chìa chung / thiếu token» là ba mức của một trục → **semantic**;
      viền thẻ đang chọn + tag «đang chọn» → **accent**; tag «trực» → **jade** (D2); kết quả kiểm kết nối
      và «đã thêm» → **semantic**.
- [x] 3.3 `ui-trust.ts` (3): «PR đã chấm» → **ink**; «% PASS vòng đầu» và «streak PASS» → **semantic**.
- [x] 3.4 `ui-docs.ts` (5): mục nav đang mở + số bước + callout tóm tắt → **accent**; callout «lưu ý» và
      ô `kq-ok` → **semantic**.
- [x] 3.5 `ui.ts` (1): card «✓ Đã lưu cấu hình» → **accent**.
      ⚠ Em định tuyến nó sang **semantic** trước, lập luận «xác nhận một thao tác đã ĐẠT» — và **lưới mới
      của chính change này bắt được**. Phép thử một dòng của D1 phân xử: lưu cấu hình không KIỂM gì cả,
      nên đổi màu ở đó không làm ai kết luận sai về chất lượng của thứ gì — nó là trạng thái giao diện.

## 4. Lưới

- [x] 4.1 `test/design-tokens.test.ts`: `export function scanTokenAliases(css)` — quét khai báo trong
      `:root`, ĐỎ khi hai vế khác họ.
- [x] 4.2 Cặp fixture (tầng 3): bí danh khác họ ĐỎ · bí danh cùng họ XANH.
- [x] 4.3 Ca khoá **hướng rò thứ hai**: không chỗ nào của «đang chọn / đang dùng / nav đang mở / đã lưu»
      lấy màu từ bộ semantic — tức scenario «đổi màu PASS không đổi vẻ của trạng thái giao diện».
- [x] 4.4 Ca đối chứng: năm bí danh look→look còn lại phải XANH.

## 5. Mutation — mỗi chiều HAI lần, CHẠY NỀN, so với bản chụp trước khi commit

- [x] 5.1 Dựng lại `--teal: var(--pass)` → ca ĐỎ.
- [x] 5.2 Dựng bí danh chiều ngược (`--pass: var(--color-accent)`) → ca ĐỎ.
- [x] 5.3 Đổi `--surface: var(--color-bg)` (look→look) → ca vẫn XANH *(chiều đối chứng — lưới không được
      báo oan)*.
- [x] 5.4 Cho tag «đang chọn» quay về `--pass` → ca ĐỎ.
- [x] 5.5 Làm hỏng phép nhận diện họ (coi mọi tên là look) → ca ĐỎ *(kẻo lưới xanh vì không thấy gì)*.
- [x] 5.6 **Không đột biến nào sống sót.** 4/4 chiều đối kháng GIẾT cả hai lượt, và chiều ĐỐI CHỨNG
      (5.3 — đổi một bí danh look→look) vẫn XANH cả hai lượt, đúng kỳ vọng: lưới không báo oan.

## 6. Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] 6.1 Đã dựng thật khối Repo + khối Nhà cung cấp trong vỏ app và nhìn ở 1400px. Đọc được ngay:
      «TRỰC» và «CHÌA RIÊNG» jade · «CHÌA CHUNG» amber · «THIẾU TOKEN» crimson · «ĐANG DÙNG» accent ·
      viền thẻ nhà cung cấp đang dùng accent · mục sidebar đang mở accent.
- [x] 6.2 Không dừng ở nhìn — **đo giá trị thật** bằng `getComputedStyle` trên trang đang chạy:

      | chỗ | nền | chữ |
      |---|---|---|
      | «đang dùng» (trạng thái giao diện) | `#ffe0d9` accent-200 | `#ae1800` accent-700 |
      | «trực» · «chìa riêng» (kết quả kiểm) | `#e2f3ee` pass-tint | `#08655a` pass-ink |
      | «chìa chung» | `#f7ecda` medium-tint | `#8f5810` medium-ink |
      | «thiếu token» | `#f9e4e2` fail-tint | `#d0342c` fail |

      Bốn cặp khác nhau cả sắc lẫn độ sáng — phân biệt được ở khoảng cách đọc bình thường.

## 7. Kiểm cơ học

- [x] 7.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 7.2 `npx openspec validate --changes` xanh.
- [x] 7.3 Tầng 3: `test-grid-integrity` xanh với hàm quét mới.
