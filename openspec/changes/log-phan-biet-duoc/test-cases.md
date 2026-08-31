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
