# Tasks — repo-history

## 1. Luật (capability)

- [ ] 1.1 Delta ADDED `specs/repo-history/spec.md` (6 requirement) — đã viết.
- [ ] 1.2 Đối chiếu từng requirement với ca đang xanh trong `token-repo` · `web-loc` · `nhan-probe-log` ·
      `boc-model`. Chỗ nào spec nói mà không ca nào khoá thì sửa spec cho khớp code hoặc thêm ca.
      **Đọc, không đếm mã trích** — `R4.3` là ví dụ: không trích mã nhưng có ca thật.

## 2. Tách hàm thuần cho hình dạng cấu hình (D1)

- [ ] 2.1 `config.ts`: tách phần **quyết định** thành hàm thuần — nhận cấu hình thô, trả
      `{ repos, repo_dang_chon, repo }`. KHÔNG đổi một chữ nào trong logic, chỉ dời chỗ.
- [ ] 2.2 Đường đọc file gọi hàm ấy. `tsc` bắt mọi chỗ gọi.
- [ ] 2.3 `checkmate.yml` bảng module (⛔C5) + tên tiếng Anh — **lưới `identifier-language` đã bắt em một
      lần ở change trước**, lần này khai trước.

## 3. Test — 13 điều chưa khoá

- [ ] 3.1 Hình dạng cấu hình, mỗi luật một ca: `R4.1` (danh sách là nguồn) · `R4.2` (view khớp danh sách) ·
      `R4.3` (đời cũ nâng thành một phần tử) · `R4.4` (`repo_dang_chon` trỏ sai → phần tử đầu, không ném).
- [ ] 3.2 `R4.17` **hai ca riêng** (D3): (a) lọc theo repo trước khi tính hồ sơ; (b) không lọc thì trang
      nói rõ đang **gộp mọi repo**. Ca (b) là vế dễ mất nhất — nó chỉ là một câu trên màn hình.
- [ ] 3.3 `R4.7` gỡ repo: token riêng bị xoá, clone và lịch sử KHÔNG bị đụng.
- [ ] 3.4 `R4.25` repo thiếu chìa: bị chặn NGAY, và phép chặn đứng **trước** khi khởi chạy (D4).
- [ ] 3.5 `R4.22` bốn bước thêm repo có mặt và theo đúng thứ tự.
- [ ] 3.6 `R4.8` lượt chấm mang trường `repo` gán tại thời điểm chạy · `R4.16` sổ cái lọc được theo repo.

## 4. Mutation — mỗi chiều chạy HAI lần

- [ ] 4.1 Bỏ nhánh «`repo_dang_chon` không hợp lệ → phần tử đầu» → ca `R4.4` ĐỎ.
- [ ] 4.2 Bỏ câu «Đang gộp mọi repo» khỏi trang → ca `R4.17` (b) ĐỎ **và ca (a) vẫn xanh** — đó là điểm của
      hai ca riêng.
- [ ] 4.3 Bỏ lọc repo trước `computeProfile` → ca `R4.17` (a) ĐỎ.
- [ ] 4.4 Dời phép chặn «repo thiếu chìa» xuống sau khi khởi chạy → ca `R4.25` ĐỎ.

## 5. Kiểm cơ học

- [ ] 5.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ — **dự đoán TRƯỚC: 848 + số ca mới, không ca cũ
      nào đỏ**. Ghi số thật; hai lần gần nhất em đoán lệch số ca nên lần này chỉ đoán vế «không ca cũ đỏ».
- [ ] 5.2 `npx openspec validate --changes` xanh.
- [ ] 5.3 `git diff apps/web/src/config.ts` — phần logic chỉ **dời chỗ**, không đổi chữ. Kiểm bằng
      `git diff -w` và đọc mắt.

## 6. Bảng tra (ở commit archive)

- [ ] 6.1 `docs/r-rules-map.md`: 30 điều → `housed`. **`R4.26` trỏ `response-secret-guard`** (D2), 29 điều
      còn lại trỏ `repo-history › <tiêu đề>`.
- [ ] 6.2 Đo neo thư viện probe sau archive — **dự đoán TRƯỚC: 12 → 14** (D5, `R4.18` và `R4.27` đã có ca).
      Sai thì ghi rõ sai ở đâu.
