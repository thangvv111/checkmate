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
