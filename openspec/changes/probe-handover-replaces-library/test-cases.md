# Test cases — probe-handover-replaces-library

**Bề mặt đếm bằng máy** (chạy trước khi viết ca — luật lưới tầng 2):

```bash
grep -rln "probe-library\|probes-lib\|admitToLibrary" packages/*/src apps/web/src --include=*.ts  # 6 file
wc -l packages/harness/src/{probe-library,dedup-probe}.ts apps/web/src/ui-probes.ts               # 1445 dong
for f in probe-library probe-library-screen probe-quarantine thu-vien dedup-probe; \
  do grep -c "  it(" test/$f.test.ts; done                                                        # 155 ca
grep -rn "nghi_loi_co_san" packages/ apps/ --include=*.ts | grep -v test                          # 1 duong SINH
grep -rn "readProbeLibrary\|admitToLibrary" packages/harness/src/skill-code.ts                    # 2 diem noi
```

⛔ Con số **155** là con số quan trọng nhất của tài liệu này: rủi ro lớn nhất của change không phải «code
mới sai» mà **«gỡ nhầm ca đang khoá một luật còn sống»**.

## Xếp hạng theo bằng chứng

- [x] T1.1 [Happy · hạng 1] probe `hoi_quy` → hạng 1, được đề xuất giao.
- [x] T1.2 [Happy · hạng 1] probe `vi_pham_luat_moi` → hạng 1.
- [x] T1.3 [hạng 2] xanh hai nhánh + neo luật MỚI + luật chưa được `ruleCoverage` phủ → hạng 2.
- [x] T1.4 [ranh giới] xanh hai nhánh + neo luật mới nhưng luật ĐÃ được phủ → hạng 3 (vứt).
- [x] T1.5 [ranh giới] xanh hai nhánh + neo luật CŨ → hạng 3.
- [x] T1.6 ⛔ **Danh sách hạng ĐÓNG** — mọi tổ hợp trạng thái × neo luật đều rơi vào đúng một trong ba
      hạng; không tổ hợp nào cho ra «giữ tạm» hay `undefined`.
- [x] T1.7 [Đầu vào khuyết] probe thiếu `spec_rule` · `trangThai` lạ · `null` → hạng 3, không ném.

## Cửa đột biến

- [x] T2.1 ⛔ **Hạng 1 KHÔNG chạy đột biến** — spy đếm số lần cửa được gọi, phải là **0**. *(Bắt nó chứng
      minh lại một điều đã quan sát được là tốn công vô ích; và đó cũng là chỗ chi phí change này gỡ.)*
- [x] T2.2 [hạng 2 qua cửa] phủ định khẳng định → probe ĐỎ → được đề xuất.
- [x] T2.3 ⛔ [hạng 2 trượt cửa] phủ định khẳng định mà probe **vẫn xanh** → vứt, và lý do được nói ra.
      *(Đây là ca bắt đúng thứ đã đo được trên prod: probe chưa bao giờ ở trạng thái nào ngoài xanh.)*
- [x] T2.4 [khẳng định không chạy] probe có `expect` sau một `return` sớm → phủ định không đổi kết quả →
      trượt cửa.
- [x] T2.5 [giới hạn đã khai] `expect(1).toBe(1)` phủ định thì ĐỎ ⇒ **qua cửa**. Ca này khoá **giới hạn**
      của cửa, không khoá năng lực: nó tồn tại để tài liệu không nói dối rằng cửa này là đủ (nợ N1).

## Gỡ thư viện — ca chứng minh nó thật sự đi rồi

- [x] T3.1 ⛔ **Quét source: không chỗ nào đọc `probes-lib/`.** Cặp fixture bắt buộc (tầng 3): mã đọc thư
      viện → ĐỎ · mã không đọc → XANH.
- [x] T3.2 ⛔ **Lượt chấm mới không nạp probe nào từ lượt trước** — bộ ứng viên chỉ có `nguon: 'moi'`.
- [x] T3.3 Không lời gọi `admitToLibrary` nào còn tồn tại.
- [x] T3.4 `nghi_loi_co_san` không còn đường SINH nào (quét source, 0 chỗ gán).

## Đời cũ — bản ghi prod phải còn đọc được

- [x] T4.1 Verdict cũ mang `library_changes` → đọc được, không ném.
- [x] T4.2 Verdict cũ mang `probe_stats.cach_ly` và `nghi_loi_co_san` → đọc được.
- [x] T4.3 ⛔ **Vắng trường = KHÔNG BIẾT, không phải «bằng 0»** — giao diện không được hiện «0 probe cách
      ly» cho một bản ghi đời mới vốn không có khái niệm ấy.

## Cái mất phải hiện ra

- [x] T5.1 ⛔ Verdict PASS nói rõ **phạm vi đã dò là quanh diff**, không khẳng định toàn bộ hành vi repo
      còn nguyên. *(⛔C2: «thôi kiểm» không được thành «đã kiểm và sạch».)*
- [x] T5.2 Màn hàng đợi: trạng thái rỗng «chưa có gì để giao» nói rõ **đã chấm bao nhiêu lượt**.
- [x] T5.3 Hai trạng thái rỗng vẫn nói hai câu khác nhau (chưa chấm lượt nào ≠ chấm rồi mà chưa đủ bằng chứng).

## Hàng đợi giao

- [x] T6.1 Đề xuất mang đủ bốn thứ: mã probe · luật neo · lý do (hạng) · mã nguồn chạy được.
- [x] T6.2 Hạng 1 và hạng 2 phân biệt được trên màn — hai mức bằng chứng khác nhau.
- [x] T6.3 ⛔ **Không có trần hàng đợi** — thêm 1000 đề xuất thì cả 1000 còn đó, không cái nào bị loại.
- [x] T6.4 [⛔C4] mã probe chứa `<script>` → hiện nguyên văn dưới dạng văn bản, không thực thi.
- [x] T6.5 Probe không tách được thành file độc lập → hiện ra kèm lý do, không biến mất im lặng.

## Trục nhạy cảm

- [N/A] T_bimat — change không đưa giá trị nhạy cảm nào qua bề mặt mới; mã probe là code repo đích, đã có
      luật «là dữ liệu» ở T6.4.
- [x] T_failclosed — ⛔ **Trục CHÍNH.** Gỡ một lớp phủ mà không chỗ nào biến «thôi kiểm» thành «đã kiểm và
      sạch» (T5.1); cửa đột biến lỗi → probe bị **vứt**, không được mặc định đề xuất.
- [N/A] T_cong — không chạm cổng merge, không đổi vai, không thêm đường cho máy merge.
- [x] T_khongtincay — mã probe và nội dung repo đích vẫn là DỮ LIỆU trên bề mặt mới (T6.4).
- [x] T_hopdong — `checkmate.yml` gỡ đúng hàng đã gỡ, thêm đúng hàng mới (lưới hợp đồng đã bắt hụt 5 lần).

## 155 ca cũ — quyết từng ca, không xoá cả file

- [x] T7.1 `test/probe-library.test.ts` (15) — soi từng ca: xoá hay chuyển nhà, ghi lý do một dòng.
- [x] T7.2 `test/probe-library-screen.test.ts` (47) — ba luật giao diện **còn sống**, ca của chúng phải
      chuyển nhà sang màn hàng đợi chứ không xoá.
- [x] T7.3 `test/probe-quarantine.test.ts` (37) — cách ly hết đối tượng; nhưng ca nào khoá «lượt chấm yếu
      đi thì phải hiện ra» thì chuyển nhà.
- [x] T7.4 `test/thu-vien.test.ts` (30) · T7.5 `test/dedup-probe.test.ts` (26).
- [x] T7.6 ⛔ **Đối chiếu tổng:** số ca sau change = số ca trước − số ca **cố ý xoá** + số ca mới. Lệch một
      ca là một ca biến mất mà không ai quyết.

## Mutation — mỗi chiều HAI lượt, kiểm chứng đột biến đã tới đĩa

- [x] T8.1 Cho hạng 1 chạy qua cửa đột biến → T2.1 ĐỎ.
- [x] T8.2 Bỏ cửa đột biến cho hạng 2 (đề xuất thẳng) → T2.3 ĐỎ.
- [x] T8.3 Thêm nhánh «giữ tạm» ngoài ba hạng → T1.6 ĐỎ.
- [x] T8.4 Thêm lại một lời gọi đọc `probes-lib/` → T3.1 ĐỎ.
- [x] T8.5 Đặt trần cho hàng đợi giao → T6.3 ĐỎ.
- [x] T8.6 Bỏ câu khai phạm vi ở verdict PASS → T5.1 ĐỎ.
- [x] T8.7 Bỏ khối bày probe KHÔNG giao được → ca hiện-ra ĐỎ.
- [x] T8.8 Đột biến sống sót → bảng ba đường. **Không đột biến nào sống sót**: 8 đột biến × 2 lượt, giết
      2/1/1/1/2/1/1/2 ca, hai lượt trùng khớp, mỗi lượt kiểm chứng đột biến đã tới đĩa.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [ ] T9.1 ⛔ **Sau deploy: `probes-lib/` trên máy chủ còn NGUYÊN 7 file + `meta.json`.** Phép kiểm quan
      trọng nhất của lượt deploy — gỡ code đọc mà lỡ xoá dữ liệu là việc một chiều.
- [ ] T9.2 Chạy một lượt chấm thật trên repo demo: **không probe thư viện nào chạy**, và đo thời gian lượt
      chấm so với trước khi gỡ.
- [ ] T9.3 Mắt người: màn hàng đợi giao ở trạng thái rỗng đọc có hiểu không — người vận hành phải biết đây
      là **bình thường**, không phải cơ chế hỏng.
