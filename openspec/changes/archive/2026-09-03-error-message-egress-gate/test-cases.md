# Test cases — error-message-egress-gate

Requirement: R-1 «Thông điệp lỗi rời máy chủ phải qua cổng phát, và cổng là danh sách CHO PHÉP» ·
R-2 «Cửa ô giá trị có ba tầng, tầng cuối đối chiếu với thứ bề mặt đó đã có» · R-3 «Cổng chỉ lọc bản PHÁT RA,
không đụng bản dùng để suy luận».

## R-1 — cổng, cấu trúc và ô

- [x] T1.1 [mọi ô an toàn] `expected 500 to be 200 // Object.is equality` → phát **nguyên vẹn**. Hai con số
      ấy chính là thứ người sửa cần; gột chúng là che quá tay.
- [x] T1.2 [một ô lạ] `expected undefined to be '<chuỗi không có trong PR>'` → `expected undefined to be
      <chuỗi N ký tự>`. Cấu trúc và ô an toàn giữ nguyên.
- [x] T1.3 [tiền tố không đủ] Chuỗi bắt đầu bằng `AssertionError:` nhưng phần sau không khớp cấu trúc nào →
      phần sau KHÔNG được phát nguyên văn. *Đây là ca bác bỏ hướng thiết kế đã loại: đo trên dữ liệu thật,
      khuôn tiền tố phủ 76% và chặn được 0.*
- [x] T1.4 [ngoài mọi khuôn] → giữ lớp lỗi + độ dài, không nội dung.

## R-2 — ba tầng cửa

- [x] T2.1 [tầng 1 số] số ngắn qua; số dài quá ngưỡng KHÔNG qua.
- [x] T2.2 [tầng 1 từ khoá] `undefined` · `null` · `true` · `false` · `NaN` · tên kiểu qua.
- [x] T2.3 [tầng 2 mảng số] `[ 166666667, 166666667, 166666667 ]` qua **nguyên vẹn**.
- [x] T2.4 [tầng 2 object một field lạ] chỉ field đó bị gột; khung và field còn lại giữ nguyên.
- [x] T2.5 [tầng 2 lồng sâu] chuỗi lạ đặt trong mảng-trong-object vẫn bị gột — đệ quy phải xuống tận đáy.
- [x] T2.6 [tầng 3, bề mặt người, có trong source] chuỗi tiếng Việt xuất hiện trong source PR → qua cửa.
- [x] T2.7 [tầng 3, bề mặt người, có trong diff] chuỗi chỉ xuất hiện trong diff → qua cửa.
- [x] T2.8 [tầng 3 không có ở đâu cả] chuỗi trông vô hại nhưng không có trong diff lẫn source → **bị gột**.
      Cửa quyết theo NGUỒN, không theo vẻ ngoài.
- [x] T2.9 [tầng 3, BỀ MẶT MODEL, chuỗi model chưa thấy] chuỗi có trong source PR (hoặc trong phần diff đã
      bị cắt theo trần) nhưng KHÔNG nằm trong khối nào đã gửi tới model → **bị gột** khi phát sang prompt,
      dù cùng chuỗi ấy được phép qua ở bề mặt comment. *Đây là ca khoá S1.3 — một nguồn đối chiếu dùng
      chung cho mọi bề mặt sẽ làm ca này xanh sai.*
- [x] T2.10 [tầng 3, bề mặt model, chuỗi model đã thấy] chuỗi nằm trong `t.diff` bản đã cắt (thứ thật sự vào
      `promptPhanTich`) → qua cửa cho bề mặt prompt.
- [x] T2.11 [ranh giới trần cắt] cùng một PR, chuỗi nằm SAU điểm cắt `TRAN_DIFF`: qua ở bề mặt comment,
      bị gột ở bề mặt model. Hai kết quả khác nhau trên cùng một đầu vào — đúng thiết kế.

## R-3 — không đụng bản dùng để suy luận

- [x] T3.1 [vân tay không đổi] Hai kết quả đỏ cùng nguyên nhân, một mang chuỗi sẽ bị gột khi phát → phép so
      vân tay vẫn cho cùng vân tay, nhãn không đổi. *Lọc trước khi so là đổi kết quả phân loại: hai lỗi khác
      nhau gột thành cùng chuỗi sẽ trùng vân tay và một vi phạm thật bị dán `ngoai_pham_vi`.*
- [x] T3.2 [sổ giữ nguyên văn] `evidence.actual` ghi vào sổ không đổi.
- [x] T3.3 [phần thay thế nói được bản chất] Thông điệp ngoài khuôn vẫn nêu lớp lỗi + độ dài, đủ phân biệt
      «hạ tầng test hỏng» với «probe sai» — ranh giới mà án lệ `loiHaTang` nói tới.

## D4 — verdict cũ

- [x] T4.1 [fail-closed] Verdict ghi trước change (không có trường mới) → comment KHÔNG chứa nội dung
      `actual`. *Cám dỗ ở đây là rơi về `actual`; đó chính là lỗ đang vá, mở lại bằng một dòng fallback.*

## Đối kháng — mục tiêu: đưa được một chuỗi bí mật ra bề mặt công khai

- [x] T5.1 [sau tiền tố hợp lệ] bí mật đặt ngay sau `AssertionError:` → bị gột.
- [x] T5.2 [trong object lồng] bí mật là field của object trong mảng → bị gột.
- [x] T5.3 [giả dạng số] bí mật gồm toàn chữ số, dài → không qua tầng 1 (ngưỡng số chữ số).
- [x] T5.4 [chèn vào khuôn] bí mật đặt ở vị trí ô của một khuôn đã biết → vẫn phải qua cửa ô, không được qua
      chỉ vì khuôn khớp.

## Mutation (load-bearing)

- [x] T6.1 Bỏ tầng 3 → T2.6 / T2.7 đỏ.
- [x] T6.2 Bỏ tầng 2 → T2.3 đỏ.
- [x] T6.3 Đổi cổng thành khớp tiền tố → T1.3 và T5.1 đỏ.
- [x] T6.4 Bỏ fail-closed của D4 → T4.1 đỏ.
- [x] T6.5 Dùng nguồn bề mặt người cho chỗ gọi của model → T2.9 và T2.11 đỏ.

## Trục nhạy cảm

- [x] T_bimat — cả mục «Đối kháng» là trục này. Đây là change ⛔C3, nên tiêu chí không phải «có ca test»
      mà «có ca cho MỖI đường đưa bí mật ra ngoài mà người viết nghĩ ra được».
- [x] T_failclosed — T1.4 · T4.1: không nhận dạng được thì KHÔNG phát nội dung; thiếu bản đã lọc thì KHÔNG
      rơi về nguyên văn.
- [N/A] T_cong — không đụng cổng merge, không đụng verdict PASS/FAIL.
- [x] T_khongtincay — thông điệp lỗi là dữ liệu do code repo đích sinh ra; T5.x kiểm nó không lái được cổng.
- [x] T_hopdong — hàm mới khai bảng module `checkmate.yml`; `test/hop-dong-repo.test.ts` xanh.

## Kiểm tay

- [x] T7.1 Đọc mắt bản phát ra của 20 thông điệp thật lấy ngẫu nhiên từ `runs/`: có cái nào bị gột tới mức
      người sửa không hiểu chuyện gì không. Máy đo được tỉ lệ giữ nguyên vẹn, không đo được «còn hiểu được».
