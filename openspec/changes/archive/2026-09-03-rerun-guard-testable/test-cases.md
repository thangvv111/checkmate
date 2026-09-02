# Test cases — rerun-guard-testable

## Ca khoá lỗi

- [x] T1.1 [reproduce]: GIVEN một run đã có verdict cho đúng `(pr, headSha)` WHEN người dùng khởi động lượt
      chấm mới mà chưa xác nhận (`ep` khác `'1'`) THEN quyết định là KHÔNG chạy, kèm id run đã có và kết quả
      verdict để dựng lời cảnh báo.
      *(Trước fix: KHÔNG viết được ca — điều kiện nằm trong handler `/api/runs`, không có bề mặt nào gọi
      tới. «Đỏ» ở đây là không compile được, và đó chính là lỗi cần vá: luật đã khai mà không khoá được.)*
- [x] T1.2 [xác nhận]: `ep === '1'` với cùng run đã có → quyết định là CHẠY (người dùng đã đọc cảnh báo và
      chọn tiếp).
- [x] T1.3 [chưa chấm]: `daCham` vắng → CHẠY, bất kể `ep`.

## Ca lân cận (chống vá-một-vá-hụt)

- [x] T2.1 Hai nhánh dùng CHUNG một quyết định — KIỂM 03/09: `grep "ep !== '1'|ep === '1'" server.ts`
      trả RỖNG; cả hai nhánh đọc `lai.chay`, và lời cảnh báo HTML lấy `lai.verdict`/`lai.soFinding`/
      `lai.runDaCo` từ chính quyết định (TypeScript bắt được chỗ này: sau khi bỏ `if (daCham && …)` thì
      `daCham` mất narrow, buộc lời văn phải đi qua quyết định thay vì đọc lại bản ghi — hai nguồn thành một).
- [x] T2.2 Biên: `ep` là `undefined` · `''` · `'0'` · `'1 '` (có khoảng trắng) · số `1` → chỉ đúng chuỗi
      `'1'` mới là xác nhận; mọi giá trị khác giữ nguyên cảnh báo (fail-closed về phía CẢNH BÁO, vì chạy
      lại tốn tiền và thời gian).
- [x] T2.3 Biên: run đã chấm nhưng `verdict` vắng (bản ghi cũ/lượt lỗi) → vẫn KHÔNG chạy, trường verdict
      trong quyết định để trống, không ném.

## Trục nhạy cảm (chỉ khi fix chạm tới)

Không chạm bí mật, danh tính, vai, cổng merge, hay đường quyết định verdict — đây là cửa KHỞI ĐỘNG lượt
chấm, quyết định duy nhất là «chạy lại hay không». Không có trục nào phải điền.
