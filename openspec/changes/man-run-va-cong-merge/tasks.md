# Tasks — màn Run và cổng merge

Năm commit tách bạch: hợp đồng → bền dòng sự kiện → server-render → màn Run → cổng merge.

## 1. Commit 1 — HỢP ĐỒNG (chỉ thêm, không sửa)

- [ ] 1.1 `packages/shared/src/types.ts` — thêm trường **tuỳ chọn** vào `Verdict`:
      `vung_mu_diff?: { file: string; ly_do: string }[]` · `thu_vien?: { probe_id: string; viec:
      'khong_nap' | 'go_khoi'; ly_do: string }[]` · `khong_co_doi_chung?: boolean` ·
      `nguoi_chay?: string` (vắng = lượt do máy chạy).
      ⛔ CHỈ THÊM. `Verdict` bị `JSON.stringify` nguyên khối xuống cột `run.verdict`, nên đổi tên hay
      đổi kiểu là 29 bản ghi đang có đọc sai mà không ai biết.
- [ ] 1.2 Lưới đọc-được-bản-cũ: nạp fixture verdict đời cũ (không có trường mới) → parse ra được, và
      màn Run dựng được, các khối mới đơn giản không hiện.
- [ ] 1.3 `packages/harness/src/skill-code.ts` — điền các trường trên khi dựng verdict. Dữ liệu đã có
      sẵn trong engine (`t.ngoaiTamNhin` kèm `lyDo`, kết quả `admitToLibrary`), hiện chỉ đang bị ném
      vào câu chữ log.
- [ ] 1.4 **Giữ nguyên các dòng log hiện có.** Chúng là bản đọc cho người; trường mới là bản đọc cho
      máy. Bỏ log đi thì mất dấu vết trong bản ghi cũ.
- [ ] 1.5 ⛔C5 — khai export mới vào bảng module `checkmate.yml`.

## 2. Commit 2 — BỀN DÒNG SỰ KIỆN

- [ ] 2.1 `packages/harness/src/cli.ts` — ghi nối tiếp mỗi sự kiện vào `runs/<id>/events.jsonl` NGAY
      khi nó sinh ra, song song với việc in ra stdout. Ghi nối, không ghi đè cả tệp.
- [ ] 2.2 `apps/web/src/runs.ts` — `RunManager` đọc dòng sự kiện từ **file** thay vì từ pipe stdout.
      File là nguồn sự thật; bảng `run_su_kien` là bản đọc.
- [ ] 2.3 Khởi động lại giữa chừng: đọc tiếp file của lượt còn đang chạy thay vì bỏ nó. Chỉ lượt nào
      tiến trình con đã thật sự chết mới thành mồ côi.
- [ ] 2.4 `cleanupOrphanRuns` — giữ nguyên hành vi đánh dấu hỏng + ghi lý do, nhưng chỉ áp cho lượt
      không còn tiến trình sống.
- [ ] 2.5 SSE phát `id:` theo số thứ tự sự kiện; máy chủ đọc `Last-Event-ID` và tiếp từ chỗ đứt.
- [ ] 2.6 `DEPLOY.md` — `runs/` vào danh sách **không đè khi deploy**, cùng `web-runs/` và
      `probes-lib/`. Nó nay giữ dòng sự kiện của lượt đang chạy, không còn chỉ là kết xuất cuối.
- [ ] 2.7 Dựng lại được bảng `run_su_kien` từ file — chứng minh quy ước «file là nguồn» có hiệu lực
      chứ không phải lời hứa.

## 3. Commit 3 — SERVER-RENDER LƯỢT ĐÃ XONG

- [ ] 3.1 Tách hàm dựng HTML cho **finding** và cho **thẻ verdict** thành hàm dùng được ở CẢ hai
      phía. Đây là chỗ dễ đẻ ra hai bản lệch nhau nhất — client phải nhận chuỗi đã dựng, không tự ghép.
- [ ] 3.2 `runPage` — trạng thái `xong`: server dựng thẳng từ `meta.verdict`. Không mở luồng.
- [ ] 3.3 Trạng thái `dang_chay`: server dựng phần đã có, luồng nối phần còn lại. Lượt kết thúc thì
      cổng merge hiện **tại chỗ**.
- [ ] 3.4 Xoá cái hack `↻ Tải lại trang để mở cổng Merge / Trả về dev`. Nó là triệu chứng của nửa
      server nửa client, và người dùng đang gánh chỗ nối.
- [ ] 3.5 Bỏ nhánh `timed`/`speed` khỏi `server.ts` — máy chủ còn MỘT đường phát sự kiện.

## 4. Commit 4 — MÀN RUN

- [ ] 4.1 Header theo gói: kicker «Lượt chấm · skill x» · tiêu đề · metaline mono (repo · nhánh @ SHA
      ← base · tác giả) · trạng thái · điều khiển trình diễn.
- [ ] 4.2 Năm bước: lưới `40px 1fr`, mark (`0n` muted / `●` accent nháy / `✓` jade / `✗` crimson) +
      nhãn + thời lượng mono; log mono trong khối nền `--color-neutral-900`, timestamp mm:ss bên trái.
- [ ] 4.3 **Thanh điều khiển trình diễn** — nhịp canh ở client từ mốc `t` sẵn có: ×1 ×2 ×8 ×16 · tạm
      dừng · thoát. Đổi tốc độ giữa chừng không tải lại trang.
- [ ] 4.4 Finding card theo gói: vạch severity 6px trái · tag · tiêu đề · điều-gì-sai · «hậu quả —» ·
      dòng lệnh `$` · khối bằng chứng 2 cột **KỲ VỌNG** (tint jade) / **THỰC TẾ** (tint crimson).
- [ ] 4.5 Thẻ verdict grid `2fr 3fr` viền 2px: khối đặc PASS/FAIL chữ 54px + artifact @ SHA mono;
      bảng meta 2 cột.
- [ ] 4.6 Bảng meta phải có **vùng xám probe** — nghi vấn · bỏ qua · thất lạc · nghi lỗi có sẵn — kể
      cả khi bằng không. Bốn số này nói lượt chấm KHÔNG nhìn thấy gì; giấu đi thì PASS mỏng trông
      giống PASS dày.
- [ ] 4.7 Banner **vùng mù của diff** — chỉ khi có file MÃ NGUỒN bị loại vì vượt trần. File sinh tự
      động (lockfile, kết quả build) vẫn ghi log nhưng KHÔNG dựng banner: nó không đổi cách đọc verdict.
- [ ] 4.8 Banner **không có đối chứng** đặt ở ĐẦU bước 4, không phải chú thích cuối — nó đổi cách đọc
      toàn bộ phần sau.
- [ ] 4.9 Banner **verdict stale** + nút «Chấm lại commit mới», cổng khoá. Vá chỗ NÓI; đường ghi đã
      chặn sẵn ba lớp và không đụng tới.
- [ ] 4.10 Khối **Thư viện** — phân biệt `⊘ không nạp vào` (amber) với `✕ gỡ khỏi thư viện` (crimson).
      Hai việc hậu quả khác hẳn: một cái không thêm tài sản, cái kia MẤT tài sản đã có.
- [ ] 4.11 Card **KHÔNG RA VERDICT** nền `--color-neutral-800` chữ sáng, khác hẳn PASS/FAIL, kèm lý
      do và đủ số probe. Chỉ phần nhìn thấy được — xem `design.md` mục ranh giới.
- [ ] 4.12 Khối quan sát ngoài phạm vi PR: viền dash, nền surface.

## 5. Commit 5 — CỔNG MERGE

- [ ] 5.1 Cổng **nối liền** dưới thẻ verdict (`border-top:none`), không phải khối rời — bố cục nói
      điều mà luật nói: cổng đọc từ verdict, không đứng độc lập.
- [ ] 5.2 FAIL → banner «⛔ Merge khoá cứng» + lý do; Merge vô hiệu; **Trả về dev vẫn hoạt động**.
- [ ] 5.3 PASS + medium → checklist tick từng cảnh báo, Merge chỉ sáng khi tick đủ, hint mono «còn n
      cảnh báo chưa tick».
- [ ] 5.4 **Ghi chú trả về dev thành BẮT BUỘC** — nút vô hiệu khi ô trống, và nói rõ vì sao. Trả về
      mà không nói lý do thì dev không biết vá gì, mà hành động đó đã vào sổ chỉ-ghi-thêm.
- [ ] 5.5 Lượt không gắn PR → nói thẳng «không có cổng merge», KHÔNG để khối biến mất im lặng.
- [ ] 5.6 Đang trình diễn → cổng chỉ-đọc, nói rõ đây là bản phát lại. Điều kiện đọc thẳng từ trạng
      thái màn, KHÔNG phải tham số truyền qua nhiều lớp hàm.
- [ ] 5.7 Receipt sau merge / trả về dev theo gói, kèm hướng dẫn reopen.
- [ ] 5.8 **Người chạy** vào bảng meta; lượt do chế độ trực khởi động khai là lượt máy chạy, không
      gán cho ai.

## 6. Lưới

- [ ] 6.1 Bản ghi verdict đời cũ (thiếu mọi trường mới) vẫn parse và vẫn dựng được màn.
- [ ] 6.2 Lượt đã xong: phản hồi ĐẦU TIÊN đã chứa verdict và finding — không cần lượt gọi thứ hai.
- [ ] 6.3 Trình diễn: cổng chỉ-đọc; và không đường nào từ chế độ đó gọi được hành động cổng.
- [ ] 6.4 Nối lại sau khi đứt: không finding hay dòng log nào lặp.
- [ ] 6.5 Vùng xám probe hiện đủ bốn số kể cả khi bằng không.
- [ ] 6.6 Vùng mù: file mã nguồn vượt trần → CÓ banner; chỉ lockfile → KHÔNG banner.
- [ ] 6.7 Ghi chú trống → không trả về dev được.
- [ ] 6.8 Verdict stale → cổng khoá và trang nói ra trước khi người dùng bấm.
- [ ] 6.9 Dựng lại `run_su_kien` từ `events.jsonl` cho ra đúng dòng sự kiện.
- [ ] 6.10 Chứng minh các lưới trên **load-bearing**: tạm bỏ banner stale và tạm cho ghi chú rỗng đi
      qua, thấy chúng ĐỎ đúng chỗ, rồi khôi phục.

## 7. Kiểm cơ học

- [ ] 7.1 `npx tsc --noEmit` sạch · `npm test` xanh TOÀN BỘ.
- [ ] 7.2 Chạy thật một lượt trên gốc dữ liệu riêng: mở màn Run **đang chạy**, rồi **đã xong**.
- [ ] 7.3 **Giết tiến trình web giữa lượt chấm rồi khởi động lại** — dòng sự kiện phải còn, và lượt
      dựng lại đúng tới thời điểm đó. Đây là ca không test đơn vị nào thay được.
- [ ] 7.4 Tắt kịch bản trình duyệt → màn Run của lượt đã xong vẫn đọc đủ.
- [ ] 7.5 Mở màn Run ở chế độ trình diễn, thử mọi đường tới hành động cổng → không đường nào đi được.

## 8. Sau-merge — nợ có tên, KHÔNG thuộc change này

- [ ] 8.1 **Mức 3 — chạy tiếp lượt dở** (PO chốt làm ngay sau change này): checkpoint bước 3 (kế
      hoạch + code probe) và bước 4 (kết quả chạy hai nhánh) để không đốt lại token. Cần luật riêng:
      ghim SHA lúc bắt đầu và **từ chối chạy tiếp nếu SHA đã đổi**, vì chạy tiếp trên commit mới sẽ
      cho verdict ghim một hỗn hợp — phá đúng bất biến mà cổng merge dựa vào.
- [ ] 8.2 «Không ra verdict» thành trạng thái kết thúc thứ ba đầy đủ: pill riêng và bộ lọc trong Lịch
      sử. Chạm mô hình trạng thái và ràng buộc `CHECK (verdict IN ('PASS','FAIL'))` của bảng sổ cái.
- [ ] 8.3 Dựng lại nội dung 5 màn còn lại theo gói (lịch sử · sổ cái · tin cậy · cấu hình · nguyên tắc).
