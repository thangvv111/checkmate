## 1. Fix

- [x] 1.1 root cause A — `skill-code.ts:440` dựng nhãn probe bằng `title.split(':')[0].slice(0, 24)`:
      cắt 24 ký tự TỪ ĐẦU title, mà đầu title là tên `describe` DÙNG CHUNG cho nhiều probe → 5 test
      khác nhau hiện ra y hệt (`cửa đọc cấu hình máy chủ=f` ×5). Phần phân biệt (mã probe P1…Pn nằm
      ở đoạn cuối sau `>`) bị cắt mất đúng phần cần giữ.
- [x] 1.2 fix A — lấy ĐOẠN CUỐI của title (sau dấu `>`, tức tên `it` mang mã probe) làm nhãn; cắt từ
      đầu ĐOẠN RIÊNG chứ không phải đầu title chung. Nhãn trùng nhau thì đánh số phân biệt.
- [x] 1.3 root cause B — `github.ts` `phanLoaiPr` dựng vị trí phần tử bằng `filesDoi.indexOf(f)`:
      `indexOf` trả vị trí KHỚP ĐẦU TIÊN, nên hai phần tử méo giống hệt nhau (`[null, null]`) đều báo
      «vị trí 1». Đây là nợ medium công khai của PR #19, cùng họ với A: bề mặt hiển thị không phân
      biệt được hai thứ khác nhau.
- [x] 1.4 fix B — dùng chỉ số THẬT từ `map((f, i) => …)` thay cho `indexOf`.

## 2. Lân cận

- [x] 2.1 Cửa song sinh: soi mọi chỗ khác dựng nhãn hiển thị từ `title` hoặc `indexOf` trong
      `packages/harness/src` và `apps/web/src`
- [x] 2.2 ⚠ Xác nhận lại thì SAI: `nhanProbe` LÀ export mới — lưới hợp đồng bắt đỏ đúng lúc, đã khai
      vào bảng module `checkmate.yml`. Ghi lại để lần sau đừng đoán trước rồi mới kiểm.

## 3. Bốn quan sát «ngoài phạm vi PR» của cổng — PO chốt 01/09 xử luôn trong change này

<!-- «Ngoài phạm vi» = probe đỏ trên CẢ HAI nhánh: hoặc probe sai contract, hoặc LỖI CÓ SẴN. Máy cố ý
     không dám phán cái nào, nên phải TÁI LẬP từng cái rồi mới kết luận. -->

- [x] 3.1 **P8 — LỖI THẬT (R2.12)**: `docRunnerCfg` NÉM khi `checkmate.yml` sai cú pháp, trong khi
      cửa song sinh `docReviewCfg` đã fail-safe về `null` từ lâu — hợp đồng repo đích sai một dấu
      nháy là cả lượt chấm chết ở bước đọc thay vì rơi về đường vitest mặc định. Đúng khuôn KL9
      «cửa song sinh», lần này nằm trong chính engine. Đã bọc try, trả `null` + nói ra.
- [x] 3.2 **P10 — LỖI THẬT (R6.19)**: `docConfig` cho khoá LẠ của `truc` đi qua nguyên vẹn, nên một
      `config.json` sửa tay dựng được `truc.tu_dong_merge: true`. Không dòng code nào đọc nó, nhưng
      nó hiện lên trong `/api/cau-hinh` và mọi bản dump như một công tắc ĐANG BẬT — công tắc ma làm
      hỏng đúng lời bảo đảm «không công tắc nào bật được máy tự merge». Nay chỉ giữ khoá đã biết,
      khoá lạ bị bỏ VÀ nói ra (bỏ im lặng thì người vừa gõ không biết nó vô tác dụng).
- [x] 3.3 **P6 — THIẾU LƯỚI**: `timLuatMoi` ném với danh sách spec méo. Hàm nằm trên đường quyết
      định nhãn `vi_pham_luat_moi`; ném ở đây là cả lượt chấm chết thay vì rơi về «không có luật
      mới» (hướng an toàn). Nay chịu được khuyết/không-phải-mảng/phần-tử-lạ.
- [x] 3.4 **P4 — KHÔNG có lỗi**: tái lập cho thấy `phanLoaiMay(đỏ, undefined)` trả đúng `nghi_van`
      như R1.5/R1.14 khai; probe của cổng sai contract chứ engine không sai. Đã khoá hành vi bằng
      test để lần sau không ai phải tái lập lần nữa.

## 4. Vòng sáu — cổng bắt lỗi DO CHÍNH BẢN VÁ ở mục 3 đẻ ra

- [x] 4.1 **HIGH — ô nhiễm prototype**: bộ lọc khoá lạ (mục 3.2) dùng `k in macDinh`, mà phép `in`
      duyệt CẢ chuỗi prototype nên `'__proto__' in macDinh` là true → khoá `__proto__` lọt bộ lọc và
      phép gán kích hoạt setter của `Object.prototype`. Kết quả: `{"truc":{"__proto__":{"tu_dong_merge":true}}}`
      làm `truc.tu_dong_merge` thành `true` — **bản vá công-tắc-ma mở lại đúng công tắc đó bằng một
      đường nguy hiểm hơn**. Nay chặn tên nguy hiểm tường minh + chỉ nhận khoá SỞ HỮU RIÊNG
      (`hasOwnProperty`).
- [x] 4.2 **MEDIUM — vá một nửa**: `docRunnerCfg` được thêm `console.error` còn cửa song sinh
      `docReviewCfg` vẫn nuốt lỗi im lặng. Hai cửa cùng vai nói hai lời (khuôn KL9). Nay cùng nói ra.
- [x] 4.3 **MEDIUM — `nhanProbe` ném với `title` không phải chuỗi**: bộ đọc JUnit XML của repo đích
      ép kiểu thuộc tính số, nên test tên «123» đến đây là số. Lưới `.filter(Boolean)` nằm ở CHỖ GỌI
      nên không bảo vệ được hàm. Nay ép kiểu trong hàm (KL16 — hàm cuối đường không được ném).

## 5. Vòng bảy — ba HIGH nữa, cả ba do bản vá mục 3–4 đẻ ra, + ba quan sát mới

- [x] 5.1 **HIGH — vá «không ném» bằng cách NUỐT dữ liệu**: `timLuatMoi` đổi `x.noiDung` thành
      `typeof === 'string' ? … : ''`, nên nội dung spec ở dạng Buffer/String-object biến thành rỗng →
      mã luật biến mất → mất luôn nhãn chặn merge. Nhánh gốc dùng `join()` nên vẫn ép được. Nay ÉP
      KIỂU (`String(...)`) thay vì đánh rơi.
- [x] 5.2 **HIGH — heuristic chọn mã lại sai lần ba**: «khớp dài nhất» lấy `P10` của describe cho
      probe thật là `P2`. Ba lối chọn đều sai vì title không nói được đoạn nào là describe. Nay MƠ HỒ
      THÌ KHÔNG DÁN: từ hai mã khớp trở lên → không mang mã nào (mã sai tệ hơn không mã).
- [x] 5.3 **HIGH — log fail-safe vọng nội dung file**: thông điệp bộ parse YAML kèm khung mã trích
      NGUYÊN DÒNG NGUỒN, nên `checkmate.yml` chứa chìa thì chìa chảy vào log. Nay chỉ lấy DÒNG ĐẦU
      (loại lỗi + vị trí), không mang nội dung.
- [x] 5.4 **P9 — công tắc ma ở cửa song sinh**: chỉ lọc khoá lạ cho `truc`, bỏ quên `agent` (khuôn
      KL9 lần nữa). Nay áp cho cả hai cụm.
- [x] 5.5 **P10 — cờ boolean bị lật bằng giá trị SAI KIỂU**: `tu_dong_tra_ve: "khong"` là chuỗi
      TRUTHY → công tắc đóng pull request tự bật. Nay kiểm kiểu: sai kiểu thì giữ mặc định + nói ra.
- [x] 5.6 **P6 — mẫu `bo_qua_diff` sai cú pháp regex** đi tiếp tới `new RegExp` sẽ ném và làm sập
      lượt chấm. Nay bỏ ngay tại cửa đọc + nói ra. (Ca test cũ KHẲNG ĐỊNH giữ cả mẫu hỏng — đã sửa.)
- [x] 5.7 **P5 — KHÔNG có lỗi**: `timeout_s` kẹp đúng biên [30,1800]; tái lập cho thấy engine đúng.

## 6. Nợ ghi nhận, chưa xử trong change này

- [x] 6.1 *(chuyển giao khi archive: đây là mục NỢ, không phải task của change — đã truy ra gốc là M11 `ncc.ts` không đọc `CHECKMATE_GOC`, nằm đầu hàng đợi ở Lộ trình CheckMate)* **Test flaky**: `ba-muc-tu-dong.test.ts > hàng sổ mang tổ hợp BỊ CẤM…` đỏ 2 lần trong ~12
      lượt chạy TOÀN BỘ, nhưng chạy RIÊNG file thì 5/5 xanh (cả trên bản chưa có thay đổi của change
      này) → nhiễu CHÉO GIỮA CÁC FILE test, không phải lỗi của change. Repo coi flaky là lỗi nên ghi
      thành nợ M11 thay vì im lặng bỏ qua.

