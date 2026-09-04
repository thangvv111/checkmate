# Test cases — settings-screen-ccs

## Unit / hàm thuần

### Một nguồn cho khoảng giá trị

- [x] T1.1 [Scenario «nhãn và ô nhập cùng một khoảng»]: quét `ui.ts` — `min`/`max` của ô độ sâu và con số
      trong nhãn đều suy từ `PROBE_DEPTH`, không có chữ số chép tay.
- [x] T1.2 [Scenario «mặc định nằm trong khoảng»]: `PROBE_DEPTH.mac_dinh` nằm giữa `min` và `max`; ý ấy
      đúng cả với `LIBRARY_CAP`.
- [x] T1.3 [Scenario «giá trị ngoài khoảng»]: cấu hình `max_probe: 99` → kẹp về 12 (biên của CHÍNH khoảng
      ấy); `max_probe: 1` → kẹp về 2.
- [x] T1.4 [Đối kháng] `max_probe` là chuỗi · null · NaN → không ném, ra giá trị trong khoảng.

### Trần thư viện

- [x] T2.1 [Scenario «cấu hình đời cũ chưa có trường»]: `config` thiếu `tran_thu_vien` → đọc ra **100**,
      KHÔNG ra 40. Đây là ca giữ cho một lần cập nhật không đào thải probe.
- [x] T2.2 [Scenario «nâng cấp bản cài đang chạy»]: đọc rồi ghi lại một cấu hình đời cũ KHÔNG làm đổi trần
      đang áp.
- [x] T2.3 `agentEnv` phát `CHECKER_LIB_TRAN` đúng giá trị đang cấu hình.
- [x] T2.4 `probe-library` kẹp trần về đúng biên `LIBRARY_CAP`; env rác → mặc định, không đoán.

## Tích hợp (giao diện thật)

- [x] T3.1 [Scenario «hạ trần thư viện probe»]: HTML của ô có **cả hai** vế — con số gói đề xuất (40) và
      câu nói hạ trần thì đào thải probe đang có.
- [x] T3.2 Slider độ sâu có `type="range"`, đúng `min`/`max`, và một chỗ hiện số.
- [x] T3.3 Card grid có `owner/repo`, nhánh đích, token che, **lần chấm cuối**.
- [x] T3.4 Repo chưa chấm lần nào → KHÔNG hiện ngày bịa.
- [x] T3.5 Repo thiếu chìa riêng → có banner, không phải một dòng chữ nhỏ.

## Ca đối kháng & hồi quy

- [x] T4.1 [Scenario «nhà cung cấp đã khai tử»]: nhãn «đã ngừng» KHÔNG dùng `--fail`.
- [x] T4.2 [Scenario «repo thiếu chìa riêng» — VẾ ĐỐI CHỨNG]: cảnh báo thiếu chìa VẪN dùng semantic. Thiếu
      vế này thì T4.1 xanh cả khi ai đó xoá sạch màu semantic khỏi màn Cấu hình.
- [x] T4.3 [Đầu vào KHUYẾT] `repos` rỗng · repo thiếu `nhanh` · thiếu token · `lanChamCuoi` undefined →
      không ném.
- [x] T4.4 [Ca đã gãy trong lịch sử repo] Chính bệnh sinh ra change: bốn con số cho một khoảng. Ca mới
      khoá một nguồn.

## Trục nhạy cảm

- [x] T_bimat — ⛔C3: token repo gõ vào màn này KHÔNG vọng nguyên văn ra HTML, log hay thông điệp lỗi;
      bản che phân biệt được hai token khác nhau.
- [N/A] T_failclosed — không chạm đường verdict. Nhánh khuyết duy nhất (giá trị ngoài khoảng) kẹp về biên,
  không mở rộng phạm vi chấm.
- [x] T_cong — màn Cấu hình KHÔNG có nút cổng nào; ba công tắc tự động giữ nguyên nghĩa và mặc định an
  toàn với cấu hình đời cũ thiếu cờ.
- [N/A] T_khongtincay — không đưa dữ liệu ngoài vào prompt.
- [x] T_hopdong — export mới khai đủ `checkmate.yml`.

## Mutation (load-bearing) — mỗi chiều HAI lần, CHẠY NỀN

- [x] T5.1 Chép tay `max="20"` trở lại → T1.1 ĐỎ.
- [x] T5.2 Mặc định `tran_thu_vien` thành 40 → T2.1 ĐỎ *(đúng chiều hại)*.
- [x] T5.3 Bỏ `CHECKER_LIB_TRAN` khỏi `agentEnv` → T2.3 ĐỎ.
- [x] T5.4 Bỏ vế «hạ trần thì mất gì» → T3.1 ĐỎ.
- [x] T5.5 Kẹp về biên của khoảng khác → T1.3 ĐỎ.
- [x] T5.6 «Đã ngừng» về `--fail` → T4.1 ĐỎ.
- [x] T5.7 Bỏ «lần chấm cuối» khỏi card → T3.3 ĐỎ.
- [x] T5.8 T5.5 sống sót lượt đầu: ca cũ kiểm HÀM kẹp chứ không kiểm ĐƯỜNG ĐỌC dùng khoảng nào. Thêm
      `scanRangeMismatch` kèm cặp fixture; chạy lại 8/8 GIẾT cả hai lượt.

## Kiểm tay — CHẠY THẬT (KHÔNG tick trước khi chạy)

- [x] T6.1 Đã dựng thật ở 1400px; card grid 2 card/hàng, slider hiện số, hint đủ hai vế.
- [x] T6.2 Banner crimson-tint viền trái 3px, thấy ngay.
