## Unit — `test/sandbox-isolation.test.ts`

- [x] T1.1 **Ca mới `T1.10b` ghim NỘI DUNG danh sách**: cả `/work/node_modules/.vite-temp` lẫn
      `/work/node_modules/.vitest` phải có mặt.

      Vì sao cần ca này khi đã có T1.10: T1.10 so **đối số container** với **danh sách**, nên xoá một mục
      khỏi danh sách làm đối số cũng mất mục ấy — hai vế cùng đổi, lưới vẫn XANH. Đó đúng là loại 1 trong
      luật `test-grid-integrity`: ca xanh trên hệ thống đã hỏng.
- [x] T1.2 Ca cũ vẫn xanh, không sửa ca nào: T1.10 (đối số khớp danh sách) · T1.11 (không phụ thuộc thì
      không phủ) · T1.12 (mọi đường nằm trong thư mục phụ thuộc, `node_modules` vẫn `:ro`) · T1.13 (lớp
      phủ là tmpfs chứ không phải bind).
- [x] T1.3 T1.12 tự động phủ hàng mới: `/work/node_modules/.vitest` nằm trong `/work/node_modules/`.
- [x] T1.4 T1.13 tự động phủ hàng mới: vẫn đúng **2** bind, và hàng mới không phải bind.

## Ca đối kháng

- [x] T3.1 **Mutation, chạy HAI lần, kiểm chứng đột biến đã vào đĩa trước khi đọc kết quả:**

      | # | gác bị gỡ | ca đỏ vòng 1 | vòng 2 |
      |---|---|---|---|
      | M1 | xoá hàng `.vitest` khỏi danh sách | 1 | 1 |
      | M2 | xoá hàng `.vite-temp` khỏi danh sách | 1 | 1 |
      | M3 | đổi lớp phủ từ `--tmpfs` sang bind ghi được | 2 | 2 |

      M1/M2 làm ĐỎ đúng ca `T1.10b` — tức ca mới thật sự load-bearing, không phải ca trang trí. M3 làm ĐỎ
      T1.13 (và T1.10), chứng minh lưới cũ vẫn gác đúng vế nặng.

## Chạy thật — ĐÃ CHẠY, đây là gốc của change

- [x] T7.1 ✅ **Đo trên prod 07/09**, dựng đúng khuôn engine dùng (`git archive` ra thư mục tạm ·
      `node_modules` mount `:ro` · `--read-only` · `--network=none` · ba trần tài nguyên), repo
      `thangvv111/admin-fe` nhánh `accessibility-floor`:

      | ảnh | `.vitest` | kết quả |
      |---|---|---|
      | Node 22 | không | `Startup Error: Failed to create Vitest API token` · không có `vitest-out.json` |
      | Node 24 | không | y hệt |
      | Node 22 | **có** | **158/158 pass** |
      | Node 24 | **có** | **158/158 pass** |

- [x] T7.2 ✅ **Ca bác bỏ một kết luận đã viết**: hai hàng cuối chứng minh Node 22 chạy đủ 158 ca, tức
      `engines.node: ^24` của repo **chặt hơn mức thật sự cần**, và bản đồ ảnh **không phải** thứ chặn
      lượt chấm code. Hồ sơ `dependency-install-in-container` đã sửa theo.
- [x] T7.3 ✅ **Vế đáng giữ**: `checkRuntime` cảnh báo chứ không chặn — đây là ca thật đầu tiên chứng minh
      lựa chọn ấy đúng. Chặn cứng thì `admin-fe` đã bị từ chối oan trong khi test của nó chạy sạch.
- [ ] T7.4 Sau deploy: chạy lượt chấm **code** trên `admin-fe` PR #8 **qua sản phẩm** (không qua shell
      tay) — engine sinh probe, chạy hai nhánh, ra verdict. run_id: ____
- [ ] T7.5 Lượt chấm `checkmate` không đổi hành vi. run_id: ____

## Trục nhạy cảm

- [x] T_colap — **change này KHÔNG nới luật cô lập.** `node_modules` vẫn `:ro`; lớp phủ vẫn là **tmpfs**
      (bộ nhớ, biến mất cùng container, không chạm bản clone); danh sách vẫn ĐÓNG và vẫn nằm trong mã, không
      khoá `checkmate.yml` nào chạm được. T1.12 và T1.13 là hai ca khoá, cả hai có sẵn và vẫn xanh.
- [x] T_bimat ⛔C3 — token vitest sinh ra nằm trong tmpfs, chết cùng container, không ghi ra đĩa host và
      không vào log.
- [x] T_failclosed ⛔C2 — không đổi nhánh quyết định nào. Trước bản vá: chết ở sandbox ⇒ lượt hỏng, không
      PASS. Sau: chạy được ⇒ verdict có căn cứ thật.
- [N/A] T_cong · T_khongtincay · T_hopdong — không chạm cổng, không thêm bề mặt nhận dữ liệu ngoài, không
      thêm export.
