# Tasks — named-debts

Không có commit. Mỗi ô tick khi mục đó **RỜI** danh sách theo một trong ba đường PO chốt — ghi rõ đường nào
(thành change `<tên>` · làm nốt trong change `<tên>` · bỏ hẳn, mất gì).

- [ ] 1. Bộ chia spec cho OpenAPI · JSON Schema · Gherkin `.feature`. Đường đơn vị-có-địa-chỉ đã mở
      (`packages/harness/src/spec-units.ts` — địa chỉ = đường tiêu đề; Gherkin = tên kịch bản, OpenAPI = đường
      khoá), mỗi loại cần một bộ chia riêng và lưới riêng. Nguồn: `stop-forcing-target-repo-shape` §6.1.
- [ ] 2. Mức 3 — chạy tiếp lượt dở sau khi server dừng. Điều kiện trước: luật ghim SHA cho lượt chạy tiếp
      (head đổi giữa chừng thì lượt cũ vô hiệu). Nguồn: `man-run-va-cong-merge`.
- [ ] 3. Webhook GitHub realtime, xác thực chữ ký HMAC. Là cửa vào **không xác thực người dùng** đầu tiên của
      sản phẩm → security review riêng, không gộp việc khác. Nguồn: `man-run-va-cong-merge`.
- [ ] 4. Bỏ Basic Auth ở nginx — gói ba việc, **rào `/login` (giới hạn tần suất / khoá tạm) đi trước**, rồi mới
      bỏ lớp ngoài. Nguồn: `man-run-va-cong-merge`.
- [ ] 5. Dựng lại nội dung 5 màn còn lại theo gói design CCS (vỏ chung đã có). Nguồn: `dong-bo-giao-dien-ccs`.
- [x] 6. ✅ RỜI 03/09 — nửa «danh sách tự dò nguồn spec» đã xong từ `retire-r-rules`; nửa «thư mục tài liệu
      quy trình» thành change riêng `declarable-process-docs` (đã merge). Repo đích **khai đè** hai tri thức mặc định về quy ước repo đích: thư mục tài liệu quy trình của
      router (`openspec/**` là văn bản thuần — `apps/web/src/github.ts`) và danh sách tự dò nguồn spec
      (`SPEC_CANDIDATES` — `packages/shared/src/spec-source.ts`) qua `checkmate.yml`. Gỡ mặc định chỉ khi cửa
      khai đã có. Nguồn: `product-independent-of-openspec` (PO chốt 02/09: giữ mặc định, thêm cửa khai sau).
- [ ] 8. Đổi tên chế độ `demo` → **chỉ-đọc** trong code, thông điệp và unit systemd prod (cần một lần deploy
      có kiểm). Spec đã gọi đúng tên; code giữ giá trị cũ để không đụng prod. Nguồn: `merge-gate` §6.1.
- [x] 9. ✅ RỜI 03/09 — thành change riêng `rerun-guard-testable` (schema fix, đã merge). Tách điều kiện «chấm lại cùng commit» của handler `/api/runs` (`server.ts:708–717`) thành hàm thuần
      như đã làm cho merge/reject, để scenario R6.10 khoá được cả nửa route — hiện chỉ khoá nửa dữ liệu
      (`findByPr`, `test/kho-run.test.ts`). Nguồn: `merge-gate` §6.2.
- [ ] 10. `isPrRunning` ở handler `/api/runs` mang CÙNG LỖI với nợ #9: nửa dữ liệu có test
      (`test/kho-run.test.ts:123,140,145`), nửa route (409 «đang được chấm») không gọi được. Khác #9 ở chỗ nó
      chỉ là một điều kiện boolean nên tách ra được ít giá trị hơn. PO chốt 03/09: làm ngay sau khi đóng
      `verdict-contract`. Nguồn: soi trong `rerun-guard-testable`.
- [ ] 7. **Xoá / archive một repo khỏi CheckMate** — ưu tiên THẤP (PO 02/09). Hiện trạng: hành vi «gỡ khỏi
      danh sách» đã có luật cũ (R4.7 giữ clone + lịch sử, R4.27 xoá token riêng — tra `docs/r-rules-map.md`);
      «archive» (ẩn khỏi danh sách và chế độ trực nhưng giữ lịch sử/sổ, mở lại được) chưa có. Khi làm: soi
      cả hai đường trong một change, đặt tên tiếng Anh.
