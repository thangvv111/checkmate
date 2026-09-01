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

## 7. Nợ ghi nhận, chưa xử trong change này

- [ ] 7.1 **M12 — test phụ thuộc mạng thật**: `token-repo.test.ts` gọi GitHub API không token, nên
      đỏ khi bị rate-limit (xác nhận bằng `curl` → HTTP 403). Không liên quan change này, nhưng nó
      làm bộ test không tự-đủ: một lượt CI vào lúc hết quota sẽ đỏ oan.

