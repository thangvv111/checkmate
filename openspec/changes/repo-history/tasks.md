# Tasks — repo-history

## 1. Luật (capability)

- [x] 1.1 Delta ADDED `specs/repo-history/spec.md` (6 requirement) — đã viết.
- [x] 1.2 Đối chiếu từng requirement với ca đang xanh trong `token-repo` · `web-loc` · `nhan-probe-log` ·
      `boc-model`. Chỗ nào spec nói mà không ca nào khoá thì sửa spec cho khớp code hoặc thêm ca.
      **Đọc, không đếm mã trích** — `R4.3` là ví dụ: không trích mã nhưng có ca thật.

## 2. Tách hàm thuần cho hình dạng cấu hình (D1)

- [x] 2.1 `config.ts`: tách `resolveRepoShape` — hàm thuần — nhận cấu hình thô, trả
      `{ repos, repo_dang_chon, repo }`. KHÔNG đổi một chữ nào trong logic, chỉ dời chỗ.
- [x] 2.2 Đường đọc file gọi hàm ấy; `tsc` sạch.
- [x] 2.3 `checkmate.yml` bảng module (⛔C5) + tên tiếng Anh `resolveRepoShape` — khai TRƯỚC khi lưới bắt,
      lần thứ hai liên tiếp.

## 3. Test — 13 điều chưa khoá

- [x] 3.1 Hình dạng cấu hình, mỗi luật một ca: `R4.1` (danh sách là nguồn) · `R4.2` (view khớp danh sách) ·
      `R4.3` (đời cũ nâng thành một phần tử) · `R4.4` (`repo_dang_chon` trỏ sai → phần tử đầu, không ném).
- [x] 3.2 `R4.17` — hoá ra cần **BA** ca, không phải hai (D6): vế lọc ở hàm · vế lọc ở CHỖ GỌI · vế nói ra.
      Nguyên văn task: `R4.17` **hai ca riêng** (D3): (a) lọc theo repo trước khi tính hồ sơ; (b) không lọc thì trang
      nói rõ đang **gộp mọi repo**. Ca (b) là vế dễ mất nhất — nó chỉ là một câu trên màn hình.
- [x] 3.3 `R4.7` gỡ repo: token riêng bị xoá, clone và lịch sử KHÔNG bị đụng.
- [x] 3.4 `R4.25` repo thiếu chìa: bị chặn NGAY, và phép chặn đứng **trước** khi khởi chạy (D4).
- [x] 3.5 `R4.22` bốn bước thêm repo có mặt và theo đúng thứ tự.
- [x] 3.6 `R4.8` · `R4.16` — đối chiếu task 1.2: cả hai ĐÃ có ca ở `kho-run.test.ts` («lọc theo repo tách
      bạch, lượt chưa gắn repo không lọt vào») và `kho-socai.test.ts` («lọc theo repo tách bạch từng repo»).
      Không thêm ca trùng.

## 4. Mutation — mỗi chiều chạy HAI lần

- [x] 4.1 Bỏ nhánh «`repo_dang_chon` không hợp lệ → phần tử đầu» → ĐỎ đúng ca `R4.4`.
- [x] 4.2 Bỏ câu «Đang gộp mọi repo» → ĐỎ đúng vế 2, **vế 1 vẫn xanh** — đúng điểm của việc tách ca.
- [x] 4.3 Bỏ lọc repo ở ROUTE → ĐỎ đúng ca 1b (ca mới thêm theo D6). Không có 1b thì đột biến này **không
      ai bắt** — đó là lý do nó tồn tại.
- [x] 4.4 Gỡ mốc chặn «repo thiếu chìa» → ĐỎ đúng ca `R4.25`. **Bốn đột biến, mỗi cái chạy hai lần, kết
      quả nhất quán cả hai lần.**

## 5. Kiểm cơ học

- [x] 5.1 `npx tsc --noEmit` sạch · `npm test` **52 file / 858 ca xanh** (848 + 10 ca mới). Dự đoán chỉ nêu
      vế «không ca cũ nào đỏ» — ĐÚNG.
- [x] 5.2 `npx openspec validate --changes` xanh.
- [x] 5.3 `git diff -w --stat apps/web/src/config.ts` → `28 insertions, 6 deletions`; phần thêm là JSDoc
      và chữ ký hàm, phần logic (`repos?.length ? …`, `repo_dang_chon hợp lệ ? …`, `find(...) ?? repos[0]`)
      chuyển nguyên văn.

## 6. Bảng tra (ở commit archive)

- [ ] 6.1 `docs/r-rules-map.md`: 30 điều → `housed`. **`R4.26` trỏ `response-secret-guard`** (D2), 29 điều
      còn lại trỏ `repo-history › <tiêu đề>`.
- [ ] 6.2 Đo neo thư viện probe sau archive — **dự đoán TRƯỚC: 12 → 14** (D5, `R4.18` và `R4.27` đã có ca).
      Sai thì ghi rõ sai ở đâu.
