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
- [x] 10. ✅ RỜI 03/09 — gộp vào change `concurrent-runs` (đã merge): `evaluateStartRun` quyết cả hai gác,
      dùng chung cho đường bấm tay và chế độ trực. `isPrRunning` ở handler `/api/runs` mang CÙNG LỖI với nợ #9: nửa dữ liệu có test
      (`test/kho-run.test.ts:123,140,145`), nửa route (409 «đang được chấm») không gọi được. Khác #9 ở chỗ nó
      chỉ là một điều kiện boolean nên tách ra được ít giá trị hơn. PO chốt 03/09: làm ngay sau khi đóng
      `verdict-contract`. Nguồn: soi trong `rerun-guard-testable`.
- [ ] 11. Trần lượt chạy đồng thời **cấu hình được** — hôm nay là hằng `TRAN_SONG_SONG = 2`
      (`apps/web/src/runs.ts`). R8.2 nói nâng trần là quyết định TÀI NGUYÊN MÁY CHỦ, nên cửa khai phải kèm
      giới hạn trên và lời cảnh báo, không phải một ô nhập trơ. Nguồn: `concurrent-runs` §6.2.
- [ ] 7. **Xoá / archive một repo khỏi CheckMate** — ưu tiên THẤP (PO 02/09). Hiện trạng: hành vi «gỡ khỏi
      danh sách» đã có luật cũ (R4.7 giữ clone + lịch sử, R4.27 xoá token riêng — tra `docs/r-rules-map.md`);
      «archive» (ẩn khỏi danh sách và chế độ trực nhưng giữ lịch sử/sổ, mở lại được) chưa có. Khi làm: soi
      cả hai đường trong một change, đặt tên tiếng Anh.
- [ ] 12. **Thông điệp lỗi nguyên văn từ repo đích lên comment PR** — ứng viên ⛔C3. Lỗi do bộ chạy test của
      repo đích sinh ra đi vào `evidence.actual` của finding, và finding lên comment pull request: **bề mặt
      công khai, không thu hồi được**. Nếu bộ chạy test in secret vào thông điệp lỗi thì secret ra comment.
      Hai hàm vân tay đã gột hex dài trước khi SO SÁNH, nhưng bản gột chỉ dùng để so — bản nguyên văn vẫn đi
      tiếp. Khi làm: quyết xem che ở đâu (lúc dựng evidence hay lúc dựng comment) và che thế nào để hai lỗi
      khác nhau vẫn phân biệt được (⛔C3 đòi bản che PHÂN BIỆT ĐƯỢC). Nguồn: `probe-classification` S1.2.
- [ ] 13. **`vi_pham_luat_moi` phân biệt được với `hoi_quy` ở BỀ MẶT ĐỌC** — hôm nay chỉ phân biệt trong dữ
      liệu. Dòng log tóm tắt gộp hai nhãn thành một số (`skill-code.ts:1024`), bảng từng hàng dùng **cùng mũi
      tên** `✓→✗` (`skill-code.ts:1029`, `ui.ts:1333`). Màn run CÓ dịch thành chữ riêng «vi phạm luật PR vừa
      khai» (`ui.ts:1339`) nhưng **không ca test nào khoá** — `grep 'vi phạm luật PR vừa khai' test/` trả
      rỗng. Hai nhãn cùng chặn merge nhưng nói hai chuyện khác nhau, và người sửa cần biết mình đang sửa cái
      gì. Nguồn: `probe-classification` task 1.2 (chỗ spec nói quá code, đã sửa spec theo code).
- [ ] 14. **Biến cục bộ tiếng Việt (~135)** — chỉ mở nếu PO muốn siết. Lưới
      `test/identifier-language.test.ts` cố ý dừng ở **cấp module** (khai báo cột 0): cấp module có 10 vi
      phạm, tính cả thân hàm thì lên ~135. Mở rộng lưới xuống thân hàm là **một dòng đổi regex** (bỏ neo cột
      0 — đã có ca mutation M3 chứng minh), nhưng phải kèm một đợt đổi ~135 tên trong thân hàm: rủi ro cao,
      giá trị thấp, và đúng thứ CLAUDE.md cảnh báo về trạng thái nửa nạc nửa mỡ. Nguồn:
      `identifier-language-gate` D2.
- [ ] 16. **Đưa thông điệp lỗi vào lượt hai của `callCode`** — hôm nay chỉ đường JSON làm thế. `callJson`
      khi parse hỏng đưa CHÍNH thông điệp lỗi vào prompt lượt hai (đã rào bằng nonce), và đo được là nó
      giúp model sửa đúng chỗ; `callCode` thì chỉ nhắc chung theo loại lỗi («bạn dùng tool» / «bạn quên
      fence»). R3.16 chỉ áp cho đường JSON — đọc bản gốc thì nó nằm trong mục «Lỗi của công cụ», ngay sau
      R3.15 nói về JSON parse fail — nên đây KHÔNG phải vi phạm, mà là cải tiến chưa làm. Khi làm: phải
      **rào y như đường JSON**, vì thông điệp ấy cũng dẫn xuất từ diff pull request. Đổi hành vi nên là
      change riêng, không phải backfill. Nguồn: `model-reply-parsing` D2.
- [ ] 15. **Phát hiện dữ liệu nhạy cảm TRONG pull request và cảnh báo** (PO 03/09 — chưa làm ngay). Khác
      #12 ở hướng: #12 chặn secret ĐI RA khỏi CheckMate, còn mục này phát hiện secret ĐI VÀO cùng PR —
      `.env` bị commit, khoá hardcode, file credential. Lý do tách: #12 chọn đối chiếu với diff/source PR
      làm cửa cho phép, nên **thứ đã nằm trong diff thì qua cửa** — đúng, vì lúc đó secret đã công khai
      với mọi người đọc PR rồi, CheckMate chỉ nhắc lại. Nhưng «đã lộ sẵn» không có nghĩa là «không đáng
      báo»: một PR commit nhầm `.env` là thứ người review cần biết NGAY. Đây là finding, không phải bộ
      lọc — và nó là danh sách CẤM theo hình dạng (`ghp_`, `sk-`, `AKIA`, JWT, entropy cao), chấp nhận
      được ở vai CẢNH BÁO vì âm tính giả chỉ làm sót một lời nhắc, không mở đường rò. Nguồn:
      `error-message-egress-gate` (explore 03/09).
