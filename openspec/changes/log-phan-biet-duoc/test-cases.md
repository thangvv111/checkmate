## Ca khoá lỗi

- [x] T1.1 [reproduce A]: GIVEN hai probe cùng `describe` khác `it`
      (`'nhóm chung > P1: một'`, `'nhóm chung > P2: hai'`) WHEN dựng nhãn log THEN hai nhãn phải KHÁC
      nhau và mỗi nhãn phải chứa mã probe (`P1`, `P2`)
      (trước fix: đỏ vì cả hai đều ra `nhóm chung` sau khi `split(':')[0].slice(0,24)`)
- [x] T1.2 [reproduce B]: GIVEN `phanLoaiPr(['docs.md', null, null])` WHEN đọc `lyDo` THEN hai phần
      tử méo phải mang HAI vị trí khác nhau (1 và 2)
      (trước fix: đỏ vì `indexOf` trả 1 cho cả hai)

## Ca lân cận (chống vá-một-vá-hụt)

- [x] T2.1 Nhãn vẫn đọc được khi title KHÔNG có dấu `>` (probe thư viện đời cũ) — không được rỗng
- [x] T2.2 Nhãn trùng nhau thật (hai probe cùng tên) vẫn phải phân biệt được
- [x] T2.3 Title rỗng / chỉ khoảng trắng → nhãn không rỗng, không ném

## Ca cho bốn quan sát ngoài phạm vi (test/quan-sat-ngoai-pham-vi.test.ts + test/ba-muc-tu-dong.test.ts)

- [x] T4.1 [P8] `checkmate.yml` YAML hỏng → CẢ HAI cửa (`docRunnerCfg`, `docReviewCfg`) trả `null`, không cửa nào ném
- [x] T4.2 [P8] YAML đúng vẫn đọc được bình thường — lưới không nuốt cấu hình thật
- [x] T4.3 [P10] khoá lạ mang chữ `merge` trong `truc` bị bỏ hết; khoá THẬT vẫn đi qua nguyên vẹn
- [x] T4.4 [P6] `timLuatMoi` với undefined/null/chuỗi/số/phần tử lạ → trả `[]`, không ném
- [x] T4.5 [P4] `phanLoaiMay(đỏ, undefined)` = `nghi_van`; `(đỏ, xanh)` = `hoi_quy`; `(undefined, undefined)` = `khong_chay`

## Ca cho finding vòng năm

- [x] T5.1 Mã probe khớp DÀI NHẤT: title `P1 hay P2 > P10: …` với idBiet `['P1','P10']` → nhãn mang `P10`, không mang `P1`

