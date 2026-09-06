# Tasks — named-debts

Không có commit. Mỗi ô tick khi mục đó **RỜI** danh sách theo một trong ba đường PO chốt — ghi rõ đường nào
(thành change `<tên>` · làm nốt trong change `<tên>` · bỏ hẳn, mất gì).

- [ ] 1. Bộ chia spec cho OpenAPI · JSON Schema · Gherkin `.feature`. Đường đơn vị-có-địa-chỉ đã mở
      (`packages/harness/src/spec-units.ts` — địa chỉ = đường tiêu đề; Gherkin = tên kịch bản, OpenAPI = đường
      khoá), mỗi loại cần một bộ chia riêng và lưới riêng. Nguồn: `stop-forcing-target-repo-shape` §6.1.
- [ ] 2. Mức 3 — chạy tiếp lượt dở sau khi server dừng. Điều kiện trước: luật ghim SHA cho lượt chạy tiếp
      (head đổi giữa chừng thì lượt cũ vô hiệu). Nguồn: `man-run-va-cong-merge`.
- [x] 3. ✅ XONG 05/09 — change `github-webhook` (đã merge + archive, deploy lên prod). Hai gác độc lập:
      HMAC-SHA256 trên raw body (so timing-safe) và repo phải nằm trong danh sách đã khai. `security.md` viết
      riêng trước khi có dòng code nào, đúng yêu cầu của mục nợ này. nginx miễn Basic Auth cho ĐÚNG một đường
      bằng `location =`; đường anh em vẫn ăn 401 của nginx (đã đo từ ngoài Internet). Nguồn: `man-run-va-cong-merge`.
- [x] 4. ✅ XONG 06/09 — change `login-gate-replaces-basic-auth` (PR #71 rào · #72 sửa log · #73 thông điệp). Rào lên trước, đo trên prod, rồi mới gỡ nginx — đúng thứ tự PO chốt. Bỏ Basic Auth ở nginx — gói ba việc, **rào `/login` (giới hạn tần suất / khoá tạm) đi trước**, rồi mới
      bỏ lớp ngoài. Nguồn: `man-run-va-cong-merge`.
- [x] 5. ✅ XONG 05/09 — cả năm màn về khớp gói design CCS qua ba change:
      **Lịch sử · Sổ cái · Tin cậy** (`data-table-screens-ccs`) · **Cấu hình** (`settings-screen-ccs`) ·
      **Nguyên tắc** (`principles-screen-ccs`). Hai chỗ đi chệch gói có ghi lý do: «PR chờ» trên card
      Cấu hình thành nợ #19, và màn Nguyên tắc giữ nav trái vì trang còn mang bài giải thích mười mục.
      Nguồn: `dong-bo-giao-dien-ccs`.
- [ ] 19. «PR chờ» trên card repo ở màn Cấu hình — gói design CCS khai, `settings-screen-ccs` CỐ Ý
      không làm. Lý do: nó cần một lời gọi GitHub CHO TỪNG REPO ở MỖI lần mở màn, tức màn chậm dần
      theo số repo và ăn hạn ngạch API cho một con số trang trí — mà màn Cấu hình phải mở được cả khi
      mạng hỏng, vì đó là màn người ta vào để SỬA khi có gì đó hỏng.
      **Điều kiện mở lại:** có bộ đệm số PR chờ đọc được không cần gọi mạng (ví dụ chế độ trực ghi
      lại số PR nó thấy ở mỗi chu kỳ). Nguồn: `settings-screen-ccs` D3.
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
- [x] 12. ✅ **ĐÃ ĐÓNG từ trước, xác nhận bằng ĐO 04/09** — nợ này sống lâu hơn vấn đề nó mô tả.
      Hai câu hỏi mục nợ để ngỏ («che ở đâu» · «che thế nào») đều đã được `error-message-egress-gate`
      trả lời và thi hành:
      · **che ở đâu** — `skill-code.ts:831` sinh `actual_redacted` bằng `redactMessage(…, humanSurfaceSource(t))`,
        và comment ngay đó ghi lý do: chỉ chỗ ấy mới có `t`, tức mới có nguồn đối chiếu của tầng 3;
      · **che thế nào** — `redactSlot` giữ vân tay sha256 nên hai lỗi khác nhau vẫn phân biệt được (⛔C3);
      · **bề mặt công khai** — `gate.ts:334` `dongFinding` CHỈ đọc `actual_redacted` và **fail-closed** khi
        thiếu (verdict đời cũ ra «nội dung không phát ra bề mặt công khai, xem màn hình run»).

      **Đếm bề mặt bằng máy (04/09):** 5 đường ghi lên GitHub — `renderReceipt` · `renderAutoVerdict` ·
      `renderRuling` (cả ba đi qua `dongFinding`) · `mergePr` (moTa = sha + run_id + số cảnh báo) ·
      `setCommitStatus` (moTa = «CheckMate: FAIL — N finding», chỉ đếm số). Không đường nào dùng
      `evidence.actual`. Hai chỗ còn dùng nguyên văn là màn hình run (nội bộ, sau đăng nhập) và CLI trên
      máy chủ — đúng phạm vi.

      **Mutation chứng minh gác LOAD-BEARING** (mỗi cái hai lần, nhất quán):
      · rơi về `actual` khi thiếu bản che — đúng «cám dỗ» mà comment trong code cảnh báo → **1 ca ĐỎ**;
      · dùng thẳng `actual` → **2 ca ĐỎ** (cả vế verdict cũ lẫn vế verdict mới).

      *Bài học ở tầng backlog:* mục nợ này ĐÚNG lúc viết và SAI lúc đọc — không cơ chế nào bắt được, chỉ
      có người đọc. Cùng họ với loại lỗi thứ tư mà `test-grid-integrity` khai.
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
- [ ] 17. **Trần số đầu dò không nhìn ARTIFACT** (PO 04/09 — ghi backlog, chưa làm ngay). Hôm nay skill code cắt
      cứng `keHoach.slice(0, MAX_PROBE)` với `max_probe` từ cấu hình (mặc định 10, kẹp [2,20]), còn skill doc
      dùng **hằng số cứng trong code** `MAX_FINDING = 8` và KHÔNG đọc cấu hình. Cả hai không nhìn độ dài, số
      mục luật hay số bảng của artifact: tài liệu 3 trang và 30 trang đều tối đa 8 finding.
      *Cái mất khi chưa làm:* artifact lớn bị chấm nông mà không có tín hiệu nào nói ra — người đọc verdict
      không phân biệt được «tài liệu sạch» với «đã chạm trần».

- [x] 18. ✅ XONG 06/09 — **không còn đối tượng**: change `probe-handover-replaces-library` gỡ hẳn thư
      viện. Nợ này hỏi «lọc theo diff thế nào»; câu trả lời hoá ra là «không giữ probe qua lượt nữa», nên
      không có gì để lọc. PO chất vấn tiền đề, em đo: 0/7 probe trên prod từng bắt hồi quy.
      ~~**Thư viện probe chạy TOÀN BỘ mỗi lượt, không lọc theo diff**~~ (PO 04/09 — ghi backlog). Đo được:
      một lượt chạy 36 probe thư viện dù PR chỉ đổi 3 file. Không sai kết quả (mọi probe vẫn so hai nhánh),
      nhưng là chi phí thời gian tuyến tính theo kích thước thư viện — trần thư viện mặc định 100.
      *Cẩn thận khi làm:* lọc theo diff là đánh đổi phủ lấy tốc độ, và probe không khớp diff vẫn có thể bắt
      được hồi quy do tác dụng phụ. Phải khai rõ cái mất trước khi siết.

- [ ] 15. **Phát hiện dữ liệu nhạy cảm TRONG pull request và cảnh báo** (PO 03/09 — chưa làm ngay). Khác
      #12 ở hướng: #12 chặn secret ĐI RA khỏi CheckMate, còn mục này phát hiện secret ĐI VÀO cùng PR —
      `.env` bị commit, khoá hardcode, file credential. Lý do tách: #12 chọn đối chiếu với diff/source PR
      làm cửa cho phép, nên **thứ đã nằm trong diff thì qua cửa** — đúng, vì lúc đó secret đã công khai
      với mọi người đọc PR rồi, CheckMate chỉ nhắc lại. Nhưng «đã lộ sẵn» không có nghĩa là «không đáng
      báo»: một PR commit nhầm `.env` là thứ người review cần biết NGAY. Đây là finding, không phải bộ
      lọc — và nó là danh sách CẤM theo hình dạng (`ghp_`, `sk-`, `AKIA`, JWT, entropy cao), chấp nhận
      được ở vai CẢNH BÁO vì âm tính giả chỉ làm sót một lời nhắc, không mở đường rò. Nguồn:
      `error-message-egress-gate` (explore 03/09).

- [ ] 20. **Chế độ trực chỉ quét repo ĐANG CHỌN, không quét mọi repo đã khai** (ghi từ
      `empty-repo-list-is-a-real-state`, 05/09). Hôm nay vòng trực đọc `cfg.repo` — tức khung nhìn của repo
      đang chọn — nên khai ba repo thì chỉ một repo được canh, hai repo kia im lặng không ai chấm. Không sai
      kết quả và không mở đường nào: gác repo-đã-khai vẫn chặn đúng phía nghiêng an toàn (quét ÍT hơn số đã
      khai). Nhưng nó là một giả định ngầm nữa của thời một-repo, và nó **im lặng** — người vận hành thêm
      repo thứ hai sẽ tưởng trực đang canh cả hai.
      *Cẩn thận khi làm:* quét N repo mỗi chu kỳ là N lần hạn ngạch GitHub và N lần chi phí; phải có trần
      đồng thời và thứ tự công bằng trước khi mở, chứ không phải chỉ đổi `cfg.repo` thành `cfg.repos`.

- [x] 21. **Lưới `r-rules-map` nổ ENOENT mỗi lần archive** (đo được HAI lần trong ngày 05/09: archive
      `empty-repo-list-is-a-real-state` và archive `probe-library-screen`). Nguyên nhân: nó đọc mọi file
      `git ls-files` theo dõi mà không kiểm tồn tại; archive DỜI cả thư mục change nên chỉ mục git còn trỏ
      vào đường cũ cho tới lúc commit. Triệu chứng là `ENOENT` giữa một lượt `npm test` đang xanh — nhìn
      như lưới hỏng chứ không như «chỉ mục lệch đĩa», nên tốn một lượt chẩn đoán mỗi lần.
      *Cẩn thận khi làm:* bỏ qua file không tồn tại là làm phép quét **bớt phủ** đi một cách im lặng — đúng
      thứ loại lỗi lưới số 1. Muốn sửa thì phải nói ra: đếm số file bỏ qua và đỏ nếu con số ấy khác 0 mà
      không phải đang ở giữa một lượt archive. Vì nó đổi hành vi của một lưới, phải đi qua change riêng.
      ✅ **Xong 05/09** — change `stale-index-file-scan` (PR #70). Đã tái hiện lần thứ BA ở `history-filter-layout`
      trước khi sửa; sau khi merge, archive chính change này chạy sạch, không `ENOENT`.
      ⚠ **Gác làm ra KHÁC gác đề xuất ở trên — khai để khỏi ai tưởng đã có:** nợ này đề xuất «đỏ nếu số bỏ
      qua khác 0 mà không phải đang giữa lượt archive». Em không làm vế ấy, vì nó đòi lưới phân biệt được
      «đang giữa lượt archive» với «không» — mà đó đúng là trạng thái lưới KHÔNG nhìn thấy đáng tin (không
      có tín hiệu nào trên đĩa nói lượt archive đang chạy; suy từ `git status` thì mọi lần đổi tên/dời file
      của người dùng cũng trông y hệt). Kết quả sẽ là một lưới đỏ oan thường xuyên, tức lưới người ta học
      cách bỏ qua. Thay vào đó gác đặt trên thứ THẬT SỰ quan trọng: **số file đọc được phải trên sàn 150**
      (đo thật 245). Số bỏ qua vẫn được đếm và in ra trong thông điệp, nhưng tự nó không làm đỏ — vì một
      file vắng mặt là chuyện bình thường, còn phép quét mất phủ thì không.

- [ ] 22. **Đếm SỐ VÒNG cách ly chưa có ca khoá** (từ `probe-quarantine-and-cleanup`, 05/09). Trần vòng
      (`QUARANTINE_ROUND_CAP`) đã có ca và có mutation; thứ chưa khoá là «không còn ứng viên thì KHÔNG chạy
      thừa một vòng». Kiểm được nó đòi lái `chayCaHaiNhanh` với sandbox giả, mà vòng lặp nằm trong closure
      không export — tách ra là đổi hình dạng đường chạy chấm.
      *Hại nếu sai:* tốn tối đa hai lượt sandbox thừa mỗi lượt chấm, không sai kết quả. Nên nó là nợ chứ
      không phải chặn.

- [x] 23. ✅ **XONG 05/09** — change `app-shell-narrow-viewport` (merge + archive + deploy). Đo trước/sau,
      bốn màn @375px: `scrollWidth` 685→375, phần tử tràn 23/22/45/30→**0**, cột nội dung 64–165→375.
      Luật mới ở `giao-dien-ccs`. Nội dung cũ của mục:
      **Vỏ app cuộn ngang ở màn hẹp (≤375px)** (đo 05/09 khi sửa khối lọc màn Lịch sử). Header đẩy
      tài liệu ra **685px** trên viewport 375px — thủ phạm đo được: `div.hd-menu` và nút tài khoản
      (`button.user-btn`), cả hai có mép phải 685. Sidebar 210px cố định cũng góp phần.
      *Vì sao tách riêng:* nó là lỗi của VỎ, chạm mọi màn, và sửa nó là một lượt rà responsive toàn app —
      không phải phần đuôi của một fix bố cục một màn. Khối lọc đã tự nó không tràn (mép phải 343 < 375).

- [ ] 24. **Rà mọi chỗ dùng `.card` bằng MẮT** (từ `history-filter-layout` §6.3, 05/09). Lưới đã chặn ca
      «`.card` + `display:flex` nội tuyến mà quên `flex-direction`», nhưng một card KHÔNG khai
      `display:flex` vẫn có thể đang xếp dọc oan mà không lưới nào thấy. Việc này đọc từng màn trên trình
      duyệt, không quét được bằng chuỗi.

- [ ] 25. **Đặt bí mật webhook trên prod** (PO quyết, không phải việc kỹ thuật). Chưa đặt thì PR mở phải
      đợi chu kỳ trực 300s thay vì chấm ngay. Quy trình ở `DEPLOY.md` › «Đặt bí mật». Ghi vào đây để nó
      không rơi khỏi tầm nhìn — cái giá của việc chưa đặt chỉ là độ trễ, không mất gì.

- [ ] 26. ⛔ **Một lượt chấm bị GIẾT đọc giống hệt một lượt chấm HỎNG** (đo 05/09, bốn lần). Bốn lượt chấm
      chết vì `systemctl restart` lúc deploy đều vào trạng thái `loi`, không phân biệt được với lượt hỏng
      vì code hay vì hạ tầng. Log có nói lý do — «tiến trình đã chết» — nhưng nó nằm ở `checkmate.log`
      chứ không ở màn nào, nên người vận hành nhìn màn chủ chỉ thấy bốn dấu đỏ giống nhau.
      *Cái mất khi chưa làm:* hai thứ khác hẳn nhau bị trộn. «Bị giết» là **không có kết luận** và chấm lại
      là xong; «hỏng» là có thể có chuyện thật. Trộn chúng làm người đọc hoặc lo quá, hoặc bỏ qua cả hai.
      *Đo được cái giá:* chính em đọc bốn dấu đỏ ấy rồi kết luận nhầm là prod mất xác thực model, viết cả
      một nợ có tên về một sự cố **không tồn tại** — trong khi token vẫn hợp lệ và CLI vẫn trả lời. PO là
      người bác bỏ, bằng cách nhớ ra mình đã đặt token.
      *Hướng:* tách trạng thái `bi_giet` (hoặc một lý do đọc được trên màn) khỏi `loi`, và cho phép **chấm
      lại** thẳng từ đó — vì lượt bị giết không cần chẩn đoán, nó chỉ cần chạy lại.

- [ ] 27. **Chưa có phép đếm «đang chấm» trước khi deploy.** `DEPLOY.md` nay đã cảnh báo restart giết lượt
      đang chạy và kèm lệnh đếm thủ công, nhưng bước 1 của quy trình deploy vẫn không bắt buộc chạy nó.
      *Hướng:* đưa phép đếm vào chính `scripts/pack-deploy.sh` hoặc một bước bắt buộc của quy trình, để
      người deploy phải NHÌN con số ấy chứ không phải nhớ ra là nên nhìn.

- [ ] 28. **Đề xuất giao chưa có đường sang repo đích — và hình dạng đúng ĐÃ ĐỔI khi biết CheckMate phục
      vụ NHIỀU ĐỘI** (PO cho biết 06/09). Đây là N2 của change `probe-handover-replaces-library`, viết lại.

      **Trạng thái hiện tại:** đề xuất dừng ở hai chỗ, cả hai nằm TRONG CheckMate — trường
      `verdict.handover` và màn Hàng đợi giao. Đội repo đích không bao giờ nhìn thấy. Không có gì mang
      chúng qua ranh giới thì ta đã thay **một kho vô dụng** bằng **một hàng đợi vô dụng**.

      **Dữ kiện nhiều-đội loại bỏ một phương án và làm hỏng một phương án khác:**

      · *Mở PR sang repo đích* — **loại**. Với repo của chính chủ máy đó chỉ là nới quyền; với repo của
        đội khác nó là ba việc cùng lúc: xin quyền GHI NHÁNH trên repo người ta · bot review tự mở PR
        trên repo họ · và CheckMate **viết code vào repo mà nó đi chấm**, rồi sau này chấm chính PR chạm
        vào code ấy. Đó là phá tách bạch maker–checker, thứ cả sản phẩm đứng trên.
      · *Màn Hàng đợi làm điểm giao* — **không mở rộng được**. Người xem màn ấy là người vận hành
        CheckMate, không phải đội sở hữu repo. Với N đội, người vận hành thành **nút cổ chai**: mở N hàng
        đợi, đọc N bộ đề xuất, chuyển tay sang N đội.

      **⛔ Và nó lộ ra một chỗ thiết kế sai ở HẠNG 2.** Bản đầu coi cả hai hạng đều là «giao một cái
      test», nên hạng 2 thừa hưởng một bài toán vận chuyển nó vốn không có. Thứ hạng 2 thật sự tìm ra
      **không phải một cái test** — nó là: *PR này vừa cam kết một luật mới, và bộ test của đội KHÔNG có
      gì canh luật ấy*. Đó là một khoảng hở đo được bằng máy, tức thông tin thuộc loại **finding**, chỗ
      verdict vốn đã chở. Con probe chỉ là **bằng chứng khoảng hở ấy kiểm được**, không phải sản phẩm
      cần bàn giao.

      **Hình dạng đề xuất — cả hai hạng đi CHUNG một đường ĐÃ CÓ:**

      | hạng | đi ra bằng gì | thêm quyền |
      |---|---|---|
      | 1 — probe đã nổ | mã probe ghép vào **khối bằng chứng của finding** trên comment verdict | không |
      | 2 — luật mới chưa phủ | một **quan sát** trên cùng comment: «PR thêm luật R7, bộ test chưa phủ; đây là probe chứng minh nó kiểm được» | không |

      Cả hai cưỡi `commentPr` — bề mặt **đã có, đã được cấp quyền, đang chạy hằng ngày** cho verdict.
      Không quyền mới, không bề mặt mới, không người đứng giữa; mở rộng sang đội thứ N tốn **không công
      gì**. Màn Hàng đợi trở về đúng vai: chỗ người vận hành **xem lại** cái gì đã đề xuất, không phải
      đường vận chuyển.

      **Cửa đột biến VẪN phải giữ** dù hạng 2 thôi giao code: nếu probe không thật sự kiểm luật R7 thì
      câu «bộ test của các anh chưa phủ R7» cũng thành lời nói suông — ta khẳng định một khoảng hở dựa
      trên một phép thử không chứng minh được gì.

      **Hai việc nhiều-đội đẻ ra, phải xử cùng lúc chứ không sau:**

      · **Comment verdict dài thêm.** Mã probe vài chục dòng nhét cùng finding có thể **dìm phần
        finding** — mà finding mới là thứ chặn merge. Cần hình dạng gấp gọn hoặc trần độ dài, và đó là
        quyết định trình bày phải **đo trên comment thật**, không chốt trên giấy.
      · **Danh tính bot theo đội.** `readRepoToken` đã có token riêng từng repo — đúng. Nhưng khi THIẾU
        token riêng nó rơi về `GITHUB_TOKEN` chung, tức comment lên repo đội khác dưới danh tính của chủ
        máy. Với một repo thì không sao; với N đội thì cần quyết định rõ, và hướng an toàn là **từ chối
        chạy** khi repo chưa có token riêng, chứ không lặng lẽ mượn danh tính.

- [ ] 29. ⛔ **Phép kiểm cô lập YẾU HƠN yêu cầu thật** (lộ ra 06/09 khi prod chết vì podman). `detectIsolation`
      chạy `podman --version` — nó trả lời «podman có cài không», không trả lời «podman có chạy nổi một
      container ở đây không». Hai câu ấy tách nhau đúng ở ca đã gặp: podman cài đủ, nhưng `/run/user/1000`
      bị systemd xoá khi phiên SSH cuối đóng, nên `podman run` chết ở bước tạo tmpdir.
      *Cái mất khi chưa làm:* verdict ghi `co_lap: container` là một **khẳng định**, và nếu nó dựa trên một
      phép kiểm không chạm tới đường thật thì đó là khẳng định không có bằng chứng — đúng loại «xanh trên
      hệ đã hỏng» mà luật lưới của repo cấm. Thêm nữa, khi hỏng thì thứ hiện ra là cảnh báo thô của podman,
      không đọc được: người vận hành thấy `mkdir /run/user/1000: permission denied` chứ không thấy «môi
      trường cô lập không dùng được».
      *Chưa đo được:* lượt hỏng 03:34 chết TRƯỚC khi ghi verdict nên không biết engine đã báo mức nào —
      đừng suy, hãy đo lại khi dựng được ca tái hiện.
      *Hướng:* đổi phép kiểm sang thứ CHẠM đường thật (ví dụ chạy hẳn một container rỗng, hoặc `podman
      info`), và khi nó hỏng thì nói bằng câu người đọc hiểu chứ không dội log podman ra verdict.
