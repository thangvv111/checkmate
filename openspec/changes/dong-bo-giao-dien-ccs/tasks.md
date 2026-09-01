# Tasks — đồng bộ giao diện theo gói CCS

Bốn commit tách bạch: token → shell → dashboard → màn probes.

## 1. Commit 1 — TOKEN

- [x] 1.1 Chép **cả `design-ccs/styles.css`** vào hằng `CSS` của `apps/web/src/ui.ts` — không port tay
      từng token. Nó mang **12 nhóm token** (`--color-bg/surface/text/accent` + ramp 100–900 · ramp
      neutral · `--color-divider` · `--shadow-sm/md/lg` · `--font-heading/body` · `--space-*` ·
      `--radius-*`) **và cả 22 class component** template dùng (`.btn` + 5 biến thể · `.input`
      `.field` · `.card` `.card-kicker` · `.tag` `.tag-accent` · `.hr` `.nav` `.seg` `.elev-sm`
      `.text-muted` · `.dialog` + 4 phần). Chép nguyên là có luôn bộ component; port tay là tự tạo
      chỗ lệch.
- [x] 1.1b Sau khi chép, **đọc lại** phần token: `radius: 0` mọi nơi (pill 99px là ngoại lệ duy nhất),
      và `--font-heading-weight` phải theo `theme.json` của gói.
- [x] 1.2 Khai bộ **semantic CheckMate** thành biến riêng, KHÔNG gộp vào accent (xem `design.md`
      quyết định 2): PASS `#0E9F7E` / đậm `#08655A` / tint `#E2F3EE` · FAIL `#D0342C` / chữ `#A3271F`
      / tint `#F9E4E2` · medium `#C77A16` / chữ `#8F5810` / tint `#F7ECDA`.
- [x] 1.3 Font: `styles.css` **tự `@import` Archivo** ở dòng 2, nên việc còn lại là (a) nạp IBM Plex
      Mono — template gói nạp riêng, `styles.css` không mang — và (b) thêm **fallback stack thật** vào
      `--font-heading`/`--font-body`. Trang phải đọc được khi Google Fonts không tải: prod chạy sau
      nginx, không giả định mạng ra ngoài luôn thông.
- [x] 1.4 Rule 2px giữa section lớn, 1px giữa dòng — thay các đường kẻ hiện tại.
- [x] 1.5 Gỡ hard-code màu cũ trong 7 file `ui-*.ts`; giữ nguyên nội dung, chỉ đổi màu sang biến.
      `ui-docs.ts` (320 dòng) nhiều khả năng là chỗ đỏ nhất.
- [x] 1.6 `ui-login.ts`: bỏ đoạn ghi chú «giữ PALETTE hiện tại, L4 đổi toàn cục» — nợ đó trả ở đây.

## 2. Commit 2 — SHELL

- [x] 2.1 `shell()` dựng lại: header (wordmark → Dashboard · repo switcher mono · badge trực · user
      menu) rule 2px dưới; sidebar 210px rule 2px phải; main `max-width:1240px; padding:26px 32px 64px`.
- [x] 2.2 Sidebar **đủ 7 mục** (PO chốt B): Dashboard · Lịch sử chạy · Sổ cái · **Thư viện probe** ·
      Tin cậy · Cấu hình · Nguyên tắc — cộng mục đang-chọn được đánh dấu (nền accent, chữ đảo, nhãn
      flush-left theo Modernist).
- [x] 2.3 Chân sidebar: dòng mono nhỏ «chế độ ‹mode› · v‹version›».
- [x] 2.4 Bỏ panel Handoff của prototype — công cụ bàn giao, không phải tính năng (ghi rõ trong commit).
- [x] 2.5 **Chuyển cảnh** (PO chốt 01/09): khối `@view-transition { navigation: auto }` trong hằng
      `CSS` + `<script type="speculationrules">` prerender-on-hover trong `shell()`. Đặt tên
      `view-transition-name` cho header và sidebar để chúng đứng yên khi main đổi.
- [x] 2.6 Bọc trong `@supports` / khai báo tĩnh sao cho trình duyệt không hỗ trợ **chạy y như cũ** —
      và kiểm bằng cách tắt hỗ trợ, không chỉ tin vào lý thuyết.
- [x] 2.7 Xác nhận **7 trang hiện có đều nhận vỏ mới** mà không sửa nội dung: mở lần lượt, không trang
      nào vỡ layout hay mất chức năng.

## 3. Commit 3 — DASHBOARD

- [x] 3.1 `homePage` dựng lại: kicker accent ‹repo› · h2 Dashboard · dòng định vị muted.
- [x] 3.2 Hàng đợi PR theo grid gói: `52px minmax(220px,1.5fr) 1.1fr 90px 170px 290px`, header cột
      rule 2px, mỗi dòng rule 1px. Cột: PR · tiêu đề (+sub skill) · nhánh@SHA₇ mono · tác giả ·
      pill trạng thái per-commit · hành động.
- [x] 3.3 Hai trạng thái phân biệt được (spec «rỗng ≠ hỏng»): **hàng đợi sạch** (dòng mono, không
      giống lỗi) · **thiếu token repo** (viền 2px crimson, nêu CẢ nguyên nhân LẪN cách sửa + nút vào
      Cấu hình).
- [x] 3.4 Khối «Đã trả về dev — chờ vá & reopen»: dòng rule 1px + ghi chú + nút xem phán quyết.
- [x] 3.5 Card «Kiểm nhanh tài liệu rời» + card «Lượt chấm gần đây» (5 dòng, link toàn bộ lịch sử).

## 4. Commit 4 — MÀN THƯ VIỆN PROBE (có design, thiếu API)

- [x] 4.1 Route mới cho màn Thư viện probe.
- [x] 4.2 Màn nói **thẳng vì sao chưa có** — API chưa dựng. **KHÔNG** dựng màn thật rồi cho hiện trạng
      thái rỗng của gói («thư viện dựng dần từ các lượt chấm trên repo này»): câu đó nghĩa là *đã tra,
      chưa có gì*, còn sự thật là *chưa hề tra*. Mượn trạng thái rỗng để khoả lấp chỗ chưa dựng đúng là
      thứ spec «rỗng ≠ hỏng» của change này cấm — làm thế thì lưới của chính mình mất nghĩa.
- [x] 4.3 Ghi vào commit rằng markup màn này **đã có sẵn trong gói** (5.809 ký tự, có dải hành vi 20 ô)
      — khi API xong thì là việc chép thẳng, không phải thiết kế lại.

## 5. Lưới

- [x] 5.1 Lưới token: cấm hard-code hex trong `apps/web/src/ui*.ts`, **trừ** đúng bộ semantic đã khai.
      Cấm hết là lưới báo oan — mà lưới báo oan thì người ta tắt chứ không sửa code.
- [x] 5.2 Lưới shell: mọi trang đi qua `shell()`; không trang nào tự dựng thẻ `html`/`body`.
- [x] 5.3 Lưới sidebar: đủ 7 mục, mục đang-chọn đánh dấu đúng.
- [x] 5.4 Lưới chuyển cảnh: **không gói phụ thuộc nào được thêm** cho việc này (đọc `package.json`),
      và `shell()` phát đủ hai khai báo. Đây là lưới chống «thêm framework cho tiện».
- [x] 5.5 Chứng minh các lưới trên **load-bearing**: tạm hard-code một hex lạ và tạm gỡ một mục
      sidebar, thấy chúng ĐỎ đúng chỗ, rồi khôi phục.

## 6. Kiểm cơ học

- [x] 6.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [x] 6.2 Kiểm chuyển cảnh **trên trình duyệt thật**: có hỗ trợ thì mượt; giả lập không hỗ trợ thì
      điều hướng vẫn đúng và nội dung đầy đủ.
- [x] 6.3 **Mở thật 8 màn trong trình duyệt** — `tsc` không bắt được layout vỡ; chụp lại Dashboard để
      đối chiếu với template của gói.

## 7. Sau-merge — nợ có tên, KHÔNG thuộc change này

- [ ] 7.1 Dựng lại **nội dung** 6 màn còn lại theo gói (run · lịch sử · sổ cái · tin cậy · cấu hình ·
      nguyên tắc) — đợt này chúng mới chỉ nhận vỏ.
- [ ] 7.2 **Thư viện probe thật** — cần API trước (README gói ghi rõ backend làm sau khi chốt design).
- [ ] 7.3 *(tuỳ chọn, KHÔNG chặn)* Xin gói bổ sung `support.js` + `_ds_bundle.js` nếu muốn xem
      prototype chạy sống. Đã kiểm: chúng là **runtime** của Claude Design, không mang thông tin
      design — gói hiện tại đủ để dựng mà không cần chúng.
