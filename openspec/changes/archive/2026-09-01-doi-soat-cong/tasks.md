## 1. Luật (specs/R*.md)

- [x] 1.1 Thêm R6.20–R6.24 vào `specs/R6-verdict-va-cong-merge.md`: sổ phản ánh hành động ngoài cổng ·
      phân biệt bằng DỮ LIỆU · cấm suy diễn «không tick = không finding» · idempotent · lỗi thì im
      lặng bỏ qua chứ không ghi hàng suy đoán

## 2. Kiểu & hợp đồng

- [x] 2.1 `MucSoCong.ngoai_cong?: boolean` (kho-socai.ts)
- [x] 2.2 Khai hàm mới vào bảng module `checkmate.yml`: `trangThaiPr`, `runChuaCoHanhDongCong`, `doiSoatCong`

## 3. Tầng dữ liệu

- [x] 3.1 Di trú `so_cong_them_ngoai_cong`: ALTER TABLE ADD COLUMN, ghi `da_di_tru`, idempotent
- [x] 3.2 `ghiSoCong` ghi cột mới; `runChuaCoHanhDongCong()` trả run có pr_so mà chưa có hàng sổ

## 4. Web

- [x] 4.1 `trangThaiPr(cfg, so)` — đọc trạng thái PR từ GitHub, không ném ra ngoài
- [x] 4.2 `ghiSo` dựng chi_tiet nói đủ ba điều cho hàng ngoài cổng
- [x] 4.3 `doiSoatCong(cfg)` — gom theo PR, bỏ qua run đã có hàng, cập nhật `run.cong_*`
- [x] 4.4 Gọi trong chu kỳ chế độ trực, bọc try riêng

## 5. Test

- [x] 5.1 Ca cho từng scenario trong spec
- [x] 5.2 Ca idempotent: chạy hai lần không đẻ hàng trùng
- [x] 5.3 Ca lỗi GitHub: không ghi hàng nào
- [x] 5.4 `npx tsc --noEmit` sạch + `npm test` xanh toàn bộ

## 6. Vá vòng chấm (cổng bắt trên chính change này)

Vòng một — 6 finding (5 HIGH):
- [x] 6.1 Lọc theo `run_id` thay vì theo pull request → run anh em bị vu «ngoài cổng» cho một merge
      ĐÃ qua cổng. Nay xét ở mức PR.
- [x] 6.2 Trạng thái ngoài miền rơi mềm thành `reject` → nay bỏ qua + nói ra (R6.24).
- [x] 6.3 Điều kiện `verdict IS NOT NULL` là tự thêm, không có trong R6.20 → đã bỏ.
- [x] 6.4 Cờ ngoài-cổng không sang bảng `run` → thêm cột `run.cong_ngoai_cong` (R6.21).
- [x] 6.5 Một run hỏng giết trọn lượt → lưới bọc từng run (R6.25).
- [x] 6.6 `chiTietNgoaiCong` ném với `findings` méo → lọc phần tử méo.

Vòng hai — 6 finding (4 HIGH):
- [x] 6.7 **Nối dây sai repo**: `server.ts` gọi `(so) => trangThaiPr(cfg, so)` — vứt đối số repo, nên
      hỏi PR của repo khác bằng chìa của repo ĐANG CHỌN. `trangThaiPr` nay nhận repo tường minh.
- [x] 6.8 Lọc «đã có hàng sổ» thay vì «đã có HÀNH ĐỘNG merge» → lượt mang hàng `reject` của người bị
      loại khỏi diện, lần merge sau đó không được ghi. Nay `prCanDoiSoat` không lọc theo hàng sổ;
      quyết định thuộc về phép so hành động.
- [x] 6.9 Hàng merge ngoài cổng rơi xuống lượt CŨ (hệ quả của 6.8) → `prCanDoiSoat` trả lượt MỚI NHẤT
      của mỗi cặp (repo, PR).
- [x] 6.10 **Đối soát bị hàn vào chu kỳ trực**: `truc.bat=false` (mặc định máy chỉ chấm tay) thì sổ
      KHÔNG BAO GIỜ được đối chiếu. Nay tách thành `chayDoiSoat()` chạy lúc khởi động + nhịp riêng
      15 phút, không phụ thuộc công tắc trực.
- [x] 6.11 Lỗi không phải `Error` (chuỗi trần, `{code:404}`) làm chính khối bắt lỗi ném → `moTaLoi()`
      không bao giờ tự ném; lỗi đếm đúng một lần, nguyên nhân giữ được.
- [x] 6.12 Hàng đối soát đóng dấu tên người vào ô người-thực-hiện → `chi_tiet` nay nói rõ máy chỉ
      GHI LẠI chứ không thực hiện, kèm danh tính tác nhân máy (R6.18).

Vòng ba — 6 finding (3 HIGH):
- [x] 6.13 **HIGH RÒ BÍ MẬT**: `moTaLoi()` cắt 120 ký tự thông điệp lỗi rồi đẩy thẳng vào log — lỗi
      mạng của lệnh fetch mang nguyên URL `https://x-access-token:ghp_…@github.com`, nên token đi
      thẳng ra sổ. Hàm che `cheTokenTrongVan()` ĐÃ CÓ SẴN trong repo; không dùng nó là bỏ quên chứ
      không phải thiếu công cụ. Nay CHE TRƯỚC KHI CẮT.
- [x] 6.14 **HIGH**: `hanhDongCongCuaPr()` không kèm cờ `ngoai_cong` — hàng người-bấm và hàng máy-ghi
      trả về giống hệt nhau, trái R6.21 («mọi phép đếm/lọc phải xét trường này»).
- [x] 6.15 **HIGH**: chế độ demo vẫn ghi sổ thật — trái R6.12. Đối soát tuy chỉ GHI LẠI nhưng hàng nó
      ghi nằm trong đúng cuốn sổ ấy, và sổ chỉ ghi thêm nên một hàng demo là sai VĨNH VIỄN.
- [x] 6.16 MEDIUM: ô «người» mang tên tài khoản GitHub — dữ liệu của dịch vụ NGOÀI chiếm chỗ của
      danh tính trong hệ (R11.1/R11.15). Hàng do máy ghi nay mang danh tính tác nhân máy (R6.18),
      tên GitHub chuyển sang phần mô tả.
- [x] 6.17 MEDIUM: logger do chỗ gọi đưa vào ném thì kéo cả lượt xuống — nay bọc ngay tại hàm thay vì
      mong mọi chỗ gọi tự cẩn thận.
- [x] 6.18 MEDIUM: gọi GitHub TRƯỚC rồi mới kiểm hành động đã ghi — phép kiểm RẺ phải chặn trước phép
      gọi ĐẮT (R6.23), và danh sách phải cạn dần về 0 đúng như change tự khai.

Vòng bốn — 3 finding (1 HIGH), trong đó một cái lộ MÂU THUẪN GIỮA HAI LUẬT của chính change này:
- [x] 6.19 **HIGH — R6.24 vs R6.18 đá nhau**: vòng ba cổng bảo «hàng máy ghi phải mang danh tính tác
      nhân máy» (R6.18) nên em đổi cột «người» thành `ci-bot`; vòng bốn cổng bác lại vì R6.24 nói
      «KHÔNG mượn tên tài khoản nào trong hệ». **Chốt dứt điểm bằng R6.24b**: cột «người» trả lời câu
      *AI ĐÃ THỰC HIỆN*, không phải *ai đã ghi lại*. Máy chỉ CHÉP LẠI nên cột đó mang login GitHub
      hoặc «không rõ»; ghi `ci-bot merge` vào sổ là tự mâu thuẫn với chính R6.19 («máy KHÔNG BAO GIỜ
      merge»). Việc máy ghi nhận thể hiện bằng cờ `ngoai_cong` + phần mô tả.
- [x] 6.20 MEDIUM — phép kiểm rẻ đòi ĐỦ CẢ `merge` lẫn `reject` nên PR đã merge vẫn bị hỏi GitHub
      mãi. Đã có `merge` là HẾT: PR đã merge không còn hành động cổng nào khác để phát hiện.
- [x] 6.21 MEDIUM — `chiTietNgoaiCong` lọc theo «là object» nên phần tử khuyết `severity` rơi về mức
      cao nhất (fail-closed của `chuanMuc`) và báo «2 high» khi chỉ có 1. Nay lọc theo THỨ ĐẾM ĐƯỢC.

Vòng năm — 1 MEDIUM (verdict PASS, vẫn vá cho sạch):
- [x] 6.22 `chiTietNgoaiCong` lọc severity theo đúng ba giá trị nên finding mang nhãn lạ
      (`'critical'`, `'HIGH'` viết hoa, `'blocker'`) bị NUỐT lặng lẽ và số liệu trong sổ khai THIẾU.
      Đúng lớp lỗi «vá bằng cách nuốt dữ liệu» mà chuỗi vá này đã bị bắt hai lần. Nay chỉ loại phần
      tử KHÔNG PHẢI finding; `chuanMuc` lo chuẩn hoá (mọi nhãn lạ fail-closed về high).

Vòng sáu — 1 HIGH:
- [x] 6.23 **Cửa song sinh lần thứ SÁU trong cùng chuỗi**: cột `cong_ngoai_cong` được dạy cho đường
      ĐỌC (`veMeta`) và cho `capNhatCongRun`, nhưng `luuMeta` — cửa ghi CẢ HÀNG run — thì không. Một
      vòng `luuMeta(docMeta(id))` làm rơi cờ, và hàng máy-ghi hoá thành hàng người-bấm trong im lặng.
      Đây là loại hỏng nguy hiểm vì nó KHÔNG ném, KHÔNG log, chỉ lặng lẽ đổi ý nghĩa một hàng kiểm toán.

Vòng sáu (verdict PASS) — 1 MEDIUM, vẫn vá vì là LỚP LỖI LẶP LẦN THỨ TƯ:
- [x] 6.24 Bộ lọc đếm nuốt finding THẬT mang severity méo (`null`, số, khoảng trắng) trước khi tới
      bước chuẩn hoá fail-closed → sổ khai THIẾU. Vòng bốn bắt đầu kia của cùng ranh giới (đếm rác
      thành high → khai THỪA). **Chốt ranh giới**: không phải object, hoặc object không có khoá
      `severity` → loại; CÓ khoá `severity` → là finding thật, đếm, `chuanMuc` fail-closed nhãn lạ về
      high. Kèm ép chuỗi vì `chuanMuc` chỉ nhận string — severity là số thì `.toLowerCase` sẽ ném.

Vòng chín — 3 finding (2 HIGH + 1 BÁO OAN):
- [x] 6.25 **HIGH — cửa song sinh lần thứ BẢY**: `doiSoatCong` chặn demo đúng, nhưng gọi THẲNG
      `capNhatCongRun` vẫn đặt được `ketQuaCong='merge'` lên bề mặt run trong khi sổ chỉ-ghi-thêm
      KHÔNG có hàng nào — bề mặt khai một hành động cổng mà sổ không có bằng chứng, đúng thứ cuốn sổ
      sinh ra để chống. Nay gác R6.12 nằm ở CỬA GHI, không chỉ ở một đường gọi.
- [x] 6.26 **HIGH — khai dữ liệu KHÔNG ĐỌC ĐƯỢC thành BẰNG KHÔNG**: `findings` có mặt nhưng sai kiểu
      (chuỗi/số/object) thì rơi mềm về mảng rỗng và ghi «0 high · không có cảnh báo» — người đọc sổ
      tưởng lượt chấm sạch. Nay nói thẳng «danh sách finding KHÔNG ĐỌC ĐƯỢC (kiểu X) — KHÔNG đếm
      được, đừng đọc thành không có finding».
- [x] 6.27 **BÁO OAN** — «nhãn lạ bị bỏ khỏi phép đếm»: tái lập cho thấy `chuanMuc` fail-closed đưa
      `critical`/`blocker`/`HIGH` về high và phép đếm ĐÚNG (3 high · 1 medium · 1 low). Không sửa gì;
      đã khoá bằng test để lần sau khỏi phải tái lập lại.

Vòng mười — 1 finding HIGH, **khuôn «cửa song sinh» lần thứ TÁM**:
- [x] 6.28 **HIGH — gác vòng chín chỉ bịt một lối vào.** Vòng chín chặn chế độ demo; vòng mười đi
      bằng chế độ `org`: một lời gọi thẳng `capNhatCongRun`, không phiên, không vai, vẫn đặt được
      `ketQuaCong={hanhDong:'merge', nguoi:'ke-gia-mao', ngoaiCong:false}` lên bề mặt run trong khi
      `docSoCong` cho run đó **rỗng hoàn toàn**.
      Bài học: **gác theo lối vào là đuổi theo lối vào.** Nay bỏ hẳn khả năng truyền giá trị —
      `capNhatCongRun(id, hanhDong)` tự tìm hàng sổ làm bằng chứng rồi **chép đúng hàng đó**; không
      có hàng thì không ghi gì. Thành luật R6.26.

Vòng mười một — 1 finding HIGH, khuôn «khai dữ liệu không-đọc-được thành BẰNG KHÔNG» lần thứ HAI:
- [x] 6.29 **HIGH — vá vòng chín chỉ bịt ca ở NGOÀI.** Vòng chín chặn `findings` sai kiểu (chuỗi/số/
      object). Vòng mười một đi vào bằng lối trong: `findings` LÀ mảng hợp lệ nhưng mọi phần tử đều bị
      bộ lọc loại (null, chuỗi, số, object thiếu `severity`) — danh sách còn rỗng và mô tả ghi «0 high
      · 0 medium · 0 low · không có cảnh báo medium/low nào», trông y hệt một lượt chấm sạch.
      Cùng bài học với 6.28: phép đếm chuyển về **CHỖ LỌC** thay vì gác từng ca đầu vào — số mục bị
      loại luôn được đếm và nói ra, và còn mục bị loại thì cấm viết câu «không có cảnh báo nào».
      Thành luật R6.27.

Vòng mười hai — 4 finding (3 HIGH + 1 MEDIUM), **PO chốt sửa GỐC thay vì vá tiếp**:
- [x] 6.30 Cả bốn finding cùng một gốc: cụm cột `cong_*` trên bảng `run` là **nguồn sự thật thứ hai**
      đứng cạnh sổ chỉ-ghi-thêm. `luuMeta` đóng dấu được khi sổ trống · `luuMeta` xoá trắng được khi
      sổ còn hàng · gác demo chỉ nằm ở một cửa · và `chiTietNgoaiCong` không kiểm chính tham số
      verdict. Vá theo cửa đã thất bại **chín lần liên tiếp**.
- [x] 6.31 **Bỏ hẳn cụm cột `cong_*` khỏi bảng `run`.** Bề mặt suy từ sổ lúc ĐỌC bằng một phép nối
      lấy hàng sổ mới nhất. `capNhatCongRun` xoá; `luuMeta` không còn cột nào để ghi; `ghiKetQuaCong`
      thành `dongBoCongTuSo` (chỉ đọc lại). Bất biến thành tính chất của CẤU TRÚC.
- [x] 6.32 **Di trú dữ liệu prod trước khi bỏ cột**: hàng bề mặt khai hành động mà sổ không có được
      cứu vào sổ kèm ghi chú nguồn (không phải suy đoán — là bản ghi thật đời cũ); hàng đã có không
      bị nhân đôi; chạy lại idempotent. Khoá bằng file test riêng dựng DB đời cũ bằng tay.
- [x] 6.33 Kiểm chính tham số `verdict` trong `chiTietNgoaiCong` (cửa thứ ba của khuôn «khai dữ liệu
      không đọc được thành bằng không»).
- [x] 6.34 **Gộp R6.28 vừa viết vào R6.26** thay vì để hai điều chồng nhau — luật bị thay thì sửa tại
      chỗ. Đây cũng là bước đầu chống thói quen mỗi vòng chấm lại đắp một lớp vào `specs/`.

Vòng mười ba — 4 finding, **PO chốt DỪNG VÁ, tách thành nợ rồi merge**:
- [x] *(chuyển giao khi archive: đã vá ở change `va-no-doi-soat` (PR #22, PASS 0 finding, đang chờ PO bấm cổng merge))* **M14 (HIGH — `daTraVe()` không xét cờ ngoài-cổng)**. Câu truy vấn lọc `sc.hanh_dong = 'reject'`
      mà bỏ qua cột `ngoai_cong`, trong khi [R6.21](../../../specs/R6-verdict-va-cong-merge.md) đòi
      **mọi phép đếm/lọc hành động cổng phải xét trường này**. Hậu quả: một PR bị đóng trên GitHub
      (không ai bấm cổng) vẫn lọt vào khối «đã trả về dev» ở trang chủ — đúng cái khối sinh ra để hàng
      đợi không đánh mất việc. **Vá là một mệnh đề `WHERE` cộng một ca test.**
- [x] *(chuyển giao khi archive: đã xử ở change `va-no-doi-soat` — sửa mô tả R6.24b + trỏ ngược từ R11.2)* **M15 (BÁO OAN — cột «người» của hàng đối soát)**. Cổng đề nghị đúng điều
      [R6.24b](../../../specs/R6-verdict-va-cong-merge.md) đã bác sau hai vòng đẩy qua lại; R11.2 mà nó
      viện dẫn nói về *hành động cổng*, còn đối soát là **ghi nhận một hành động đã xảy ra ở nơi khác**
      và chạy trong chu kỳ chế độ trực, không có phiên người dùng nào. Không sửa code. Nợ ở đây là
      **R6.24b viết chưa đủ chặn hiểu nhầm — ba vòng chấm liên tiếp vấp cùng một chỗ.**
- [x] *(chuyển giao khi archive: đã xử ở change `va-no-doi-soat` — PO ủy quyền, chọn A: khai rõ phạm vi R6.12)* **M16 (CẦN PO QUYẾT — phạm vi chế độ demo)**. Gác R6.12 nằm ở đầu `doiSoatCong`; cửa di trú bỏ
      cột không có gác nào, nên ở chế độ demo hàng cũ vẫn được nạp vào sổ một lần lúc khởi động.
      Gác nó lại thì **tệ hơn**: cột vẫn bị bỏ mà dữ liệu không được cứu. Hai đường: (A) giữ nguyên,
      ghi rõ phạm vi R6.12 là *thao tác cổng* chứ không phải *di trú dữ liệu lúc khởi động*; (B) demo
      không di trú và không bỏ cột — đổi lại hai schema song song, mọi đường đọc phải chịu được cả hai.
- [x] *(chuyển giao khi archive: đã vá ở change `va-no-doi-soat` — thêm `chuoiAnToan()`)* **M17 (LOW — `chiTietNgoaiCong` còn đường ném)**. Nội suy `${v?.result}` và `String(severity)`
      trên giá trị ngoài đưa vào, đứng ngay trước `ghiSoCong` nên về nguyên tắc R6.25 đòi lưới bọc.
      Chính lượt chấm ghi rõ đầu vào kích hoạt được (Symbol, `toString` tự ném) **không phát sinh từ
      dữ liệu JSON/SQLite thực tế** — chưa đổi hành vi hiện có.

## 7. Nợ ghi nhận, chưa xử trong change này

- [x] 7.1 *(chuyển giao khi archive: M12 nằm trong sổ nợ ở Lộ trình CheckMate, chưa xử)* **M12 — test phụ thuộc mạng thật**: `token-repo.test.ts` gọi GitHub API không token, nên
      đỏ khi bị rate-limit (xác nhận bằng `curl` → HTTP 403). Không liên quan change này, nhưng nó
      làm bộ test không tự-đủ: một lượt CI vào lúc hết quota sẽ đỏ oan.

