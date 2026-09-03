# Test cases — verdict-contract

Requirement: R-1 «Verdict nhị phân, ghim commit, kèm thống kê probe đầy đủ» · R-2 «Hồi quy có sàn cứng
high» · R-3 «PASS phải có bằng chứng» · R-4 «Sinh lại một lần trước khi bỏ cuộc».

## Unit / hàm thuần

### decideResult
- [x] T1.1 [R-1 high → FAIL]: một finding `high` giữa các medium → `'FAIL'`.
- [x] T1.2 [R-1 không chặn]: toàn medium/low → `'PASS'`; danh sách rỗng → `'PASS'`.
- [x] T1.3 [R-1 severity lạ/đời cũ]: `blocking` → FAIL; chuỗi rác → FAIL (fail-closed qua `chuanMuc`);
      `non_blocking` → medium nên PASS.
- [x] T1.4 [Biên]: `findings` không phải mảng → không ném, và KHÔNG trả `'PASS'` (fail-closed).

### regressionFloor
- [x] T1.5 [R-2 ép sàn]: `('hoi_quy', 'medium')` → `'high'`; `('vi_pham_luat_moi', 'low')` → `'high'`.
- [x] T1.6 [R-2 đã high]: `('hoi_quy', 'high')` → `'high'` (không đổi gì).
- [x] T1.7 [R-2 đối chứng]: `('nghi_van', 'medium')` → `'medium'` — sàn KHÔNG lan sang nhãn khác;
      `('pass', 'low')` → `'low'`.
- [x] T1.8 [Biên]: severity lạ với nhãn hồi quy → `'high'`; severity lạ với `nghi_van` → `'high'` (theo
      `chuanMuc` fail-closed), không phải `'medium'`.

### missingRegressionFindings
- [x] T1.9 [R-2 bù thiếu]: hai ứng viên `hoi_quy`, model chỉ viết cho một → trả đúng ứng viên còn lại.
- [x] T1.10 [R-2 đủ]: model viết cho cả hai → trả mảng rỗng.
- [x] T1.11 [R-2 phạm vi]: ứng viên `nghi_van` model bỏ qua → KHÔNG bị bù (chỉ hồi quy mới bắt buộc).
- [x] T1.12 [Biên]: `maDaCo` rỗng/không phải tập → trả mọi ứng viên hồi quy, không ném.

### hasBasis
- [x] T1.13 [R-3 không cơ sở]: mọi ứng viên `ngoai_pham_vi`/`nghi_loi_co_san` → `{ok:false}`, `lyDo` nêu
      số probe và mã probe đầu.
- [x] T1.14 [R-3 có cơ sở]: một `pass` giữa các `ngoai_pham_vi` → `{ok:true}`; chỉ một `hoi_quy` →
      `{ok:true}`; chỉ một `cai_thien` → `{ok:true}`; chỉ `vi_pham_luat_moi` → `{ok:true}`.
- [x] T1.15 [Biên]: danh sách rỗng → `{ok:false}` (không có gì để kết luận), không ném.

## Tích hợp (đĩa, SQLite, khoá)

### chỗ gọi dùng đúng hàm
- [x] T2.1 [Đối chứng refactor]: `git diff` của `cli.ts` và `skill-code.ts` không có dòng thêm nào mang
      chuỗi thông điệp; `grep` số lần xuất hiện chuỗi «Không đủ cơ sở kết luận» và «máy ép về high» trước/sau
      bằng nhau (chỉ đổi chỗ).
- [x] T2.2 [Đời cũ]: verdict đã lưu với `result: 'FAIL'` và severity `blocking` vẫn đọc lại đúng (ca có sẵn
      `doc-du-lieu-cu` — trích dẫn, không lặp).

## Ca đối kháng & hồi quy

- [x] T3.1 [Kịch bản R1.12 thật]: ứng viên `hoi_quy`, model trả finding `medium` → sau khi qua sàn cứng,
      `decideResult` cho `'FAIL'`. Đây là ca chứng minh «có hồi quy thì FAIL» — nối hai hàm lại.
- [x] T3.2 [Kịch bản model im lặng]: ứng viên `hoi_quy`, model trả `findings: []` → `missingRegressionFindings`
      trả ứng viên đó → finding bù mức `high` → `decideResult` cho `'FAIL'`.
- [x] T3.3 [Trạng thái hút]: 8 probe `ngoai_pham_vi` cùng nguyên nhân → `hasBasis` `{ok:false}` — không
      được ra PASS. Đây là án lệ của R6.13.
- [x] T3.4 [Mutation]: bỏ sàn cứng / bỏ bù-thiếu / bỏ điều kiện `hasBasis` / `some`→`every` → lưới đỏ đúng ca.

## Trục nhạy cảm

- [N/A] T_bimat — không chạm bí mật; hàm thuần chỉ nhận nhãn, mức và mô tả probe.
- [x] T_failclosed — T1.3 · T1.4 · T1.8 · T1.13 · T1.15: severity không đọc được → `high`; không có bằng
      chứng → KHÔNG ra verdict; đầu vào méo không ném và không rơi về PASS.
- [x] T_cong — T3.1 · T3.2: hồi quy máy-xác-nhận LUÔN dẫn tới FAIL, model không hạ được — đây là đường
      bảo vệ ⛔C2 ở tầng verdict.
- [x] T_khongtincay — T1.5 · T1.9: severity và danh sách finding do MODEL trả về là dữ liệu; máy ép sàn và
      bù thiếu chứ không tin.
- [x] T_hopdong — bốn export mới khai bảng `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [x] T5.1 KIỂM 03/09 bằng grep thay vì mắt (mạnh hơn, lặp lại được): bốn chuỗi thông điệp còn ĐÚNG một
      chỗ trong `skill-code.ts`; hai dòng diff có chứa chuỗi là sửa biến, không sửa lời (ghi ở task 4.2).
      Không dựng lượt chấm mới — lượt thật cần khoá model và vài phút, mà nó không chứng minh thêm gì so
      với grep + 18 ca gọi thẳng hàm.
