# Tasks — màn Run và cổng merge

Năm commit tách bạch: hợp đồng → bền dòng sự kiện → server-render → màn Run → cổng merge.

## 1. Commit 1 — HỢP ĐỒNG (chỉ thêm, không sửa)

- [x] 1.1 `packages/shared/src/types.ts` — thêm trường **tuỳ chọn** vào `Verdict`:
      `diff_blind_spots?: { file, reason }[]` · `library_changes?: { probe_id, action:
      'not_admitted' | 'evicted', reason }[]` · `no_baseline?: boolean` · `run_by?: string`
      (vắng = lượt do máy chạy) · `head_moved?: { new_sha, at }`. Thêm loại sự kiện `head_moved`.
      **Tên tiếng Anh** — bản artifact đầu em viết tên tiếng Việt, trái luật «định danh mới sinh dùng
      tiếng Anh» (PO chốt 01/09). Ở đây nó nặng hơn thường lệ: tên trường thành **khoá JSON trên
      đĩa**, nên đặt sai bây giờ là một lần di trú lớp B về sau.
      ⛔ CHỈ THÊM. `Verdict` bị `JSON.stringify` nguyên khối xuống cột `run.verdict`, nên đổi tên hay
      đổi kiểu là 29 bản ghi đang có đọc sai mà không ai biết.
- [x] 1.2 Lưới đọc-được-bản-cũ: nạp fixture verdict đời cũ (không có trường mới) → parse ra được, và
      màn Run dựng được, các khối mới đơn giản không hiện.
- [x] 1.3 `packages/harness/src/skill-code.ts` — điền các trường trên khi dựng verdict. Dữ liệu đã có
      sẵn trong engine (`t.ngoaiTamNhin` kèm `lyDo`, kết quả `admitToLibrary`), hiện chỉ đang bị ném
      vào câu chữ log.
- [x] 1.4 **Giữ nguyên các dòng log hiện có.** Chúng là bản đọc cho người; trường mới là bản đọc cho
      máy. Bỏ log đi thì mất dấu vết trong bản ghi cũ.
- [x] 1.5 ⛔C5 — kiểm rồi: đợt này **không sinh export nào mới**. Chỉ thêm trường tuỳ chọn vào một
      interface đã có và một nhánh cho `RunEvent`. Bảng module giữ nguyên.

## 2. Commit 2 — BỀN DÒNG SỰ KIỆN

- [x] 2.1 `packages/harness/src/cli.ts` — ghi nối tiếp mỗi sự kiện vào `runs/<id>/events.jsonl` NGAY
      khi nó sinh ra, song song với việc in ra stdout. Ghi nối, không ghi đè cả tệp.
- [x] 2.2 `apps/web/src/runs.ts` — `RunManager` đọc dòng sự kiện từ **file** thay vì từ pipe stdout.
      File là nguồn sự thật; bảng `run_su_kien` là bản đọc.
- [x] 2.3 Khởi động lại giữa chừng: đọc tiếp file của lượt còn đang chạy thay vì bỏ nó. Chỉ lượt nào
      tiến trình con đã thật sự chết mới thành mồ côi.
- [x] 2.4 `cleanupOrphanRuns` — giữ nguyên hành vi đánh dấu hỏng + ghi lý do, nhưng chỉ áp cho lượt
      không còn tiến trình sống.
- [x] 2.5 SSE phát `id:` theo số thứ tự sự kiện; máy chủ đọc `Last-Event-ID` và tiếp từ chỗ đứt.
- [x] 2.6 `DEPLOY.md` — `runs/` vào danh sách **không đè khi deploy**, cùng `web-runs/` và
      `probes-lib/`. Nó nay giữ dòng sự kiện của lượt đang chạy, không còn chỉ là kết xuất cuối.
- [x] 2.7 Dựng lại được bảng `run_su_kien` từ file — chứng minh quy ước «file là nguồn» có hiệu lực
      chứ không phải lời hứa.

## 3. Commit 3 — SERVER-RENDER LƯỢT ĐÃ XONG

- [x] 3.1 Tách hàm dựng HTML cho **finding** và cho **thẻ verdict** thành hàm dùng được ở CẢ hai
      phía. Đây là chỗ dễ đẻ ra hai bản lệch nhau nhất — client phải nhận chuỗi đã dựng, không tự ghép.
- [x] 3.2 `runPage` — trạng thái `xong`: server dựng thẳng từ `meta.verdict`. Không mở luồng.
- [x] 3.3 Trạng thái `dang_chay`: server dựng phần đã có, luồng nối phần còn lại. Lượt kết thúc thì
      cổng merge hiện **tại chỗ**.
- [x] 3.4 Xoá cái hack `↻ Tải lại trang để mở cổng Merge / Trả về dev`. Nó là triệu chứng của nửa
      server nửa client, và người dùng đang gánh chỗ nối.
- [x] 3.5 Bỏ nhánh `timed`/`speed` khỏi `server.ts` — máy chủ còn MỘT đường phát sự kiện.

## 4. Commit 4 — MÀN RUN

- [x] 4.1 Header theo gói: kicker «Lượt chấm · skill x» · tiêu đề · metaline mono (repo · nhánh @ SHA
      ← base · tác giả) · trạng thái · điều khiển trình diễn.
- [x] 4.2 Năm bước: lưới `40px 1fr`, mark (`0n` muted / `●` accent nháy / `✓` jade / `✗` crimson) +
      nhãn + thời lượng mono; log mono trong khối nền `--color-neutral-900`, timestamp mm:ss bên trái.
- [x] 4.3 **Thanh điều khiển trình diễn** — nhịp canh ở client từ mốc `t` sẵn có: ×1 ×2 ×8 ×16 · tạm
      dừng · thoát. Đổi tốc độ giữa chừng không tải lại trang.
- [x] 4.4 Finding card theo gói: vạch severity 6px trái · tag · tiêu đề · điều-gì-sai · «hậu quả —» ·
      dòng lệnh `$` · khối bằng chứng 2 cột **KỲ VỌNG** (tint jade) / **THỰC TẾ** (tint crimson).
- [x] 4.5 Thẻ verdict grid `2fr 3fr` viền 2px: khối đặc PASS/FAIL chữ 54px + artifact @ SHA mono;
      bảng meta 2 cột.
- [x] 4.6 Bảng meta phải có **vùng xám probe** — nghi vấn · bỏ qua · thất lạc · nghi lỗi có sẵn — kể
      cả khi bằng không. Bốn số này nói lượt chấm KHÔNG nhìn thấy gì; giấu đi thì PASS mỏng trông
      giống PASS dày.
- [x] 4.7 Banner **vùng mù của diff** — chỉ khi có file MÃ NGUỒN bị loại vì vượt trần. File sinh tự
      động (lockfile, kết quả build) vẫn ghi log nhưng KHÔNG dựng banner: nó không đổi cách đọc verdict.
- [x] 4.8 Banner **không có đối chứng** đặt ở ĐẦU bước 4, không phải chú thích cuối — nó đổi cách đọc
      toàn bộ phần sau.
- [x] 4.9 Banner **verdict stale** + nút «Chấm lại commit mới», cổng khoá. Vá chỗ NÓI; đường ghi đã
      chặn sẵn ba lớp và không đụng tới.
- [x] 4.9b **Theo dõi head TRONG lúc chấm** (PO chốt): trong khi lượt chạy trên một pull request, hỏi
      lại head theo nhịp (~30s); head đổi thì đánh dấu hết-hiệu-lực NGAY — phát sự kiện để người đang
      xem thấy mà không phải tải lại, và ghi vào bản ghi lượt chấm.
      Lượt chấm **vẫn chạy tới hết**: dừng giữa chừng là vứt phần việc gần xong, mà verdict trên commit
      cũ vẫn còn giá trị ĐỌC — không dùng được ở cổng nhưng phần lớn finding vẫn đúng với mã nguồn.
      Huỷ lượt chấm KHÔNG thuộc change này (PO hoãn tới khi thực tế cần).
      ~30s là đủ: một lượt trung vị 3,6 phút thì chậm nhất nửa phút. Webhook rút xuống ~1s, tức lợi
      thêm ≤29 giây — không đáng đổi lấy một cửa vào không-xác-thực. Xem nợ 8.4.
- [x] 4.10 Khối **Thư viện** — phân biệt `⊘ không nạp vào` (amber) với `✕ gỡ khỏi thư viện` (crimson).
      Hai việc hậu quả khác hẳn: một cái không thêm tài sản, cái kia MẤT tài sản đã có.
- [x] 4.11 Card **KHÔNG RA VERDICT** nền `--color-neutral-800` chữ sáng, khác hẳn PASS/FAIL, kèm lý
      do và đủ số probe. Chỉ phần nhìn thấy được — xem `design.md` mục ranh giới.
- [x] 4.12 Khối quan sát ngoài phạm vi PR: viền dash, nền surface.

## 5. Commit 5 — CỔNG MERGE

- [ ] 5.1 Cổng **nối liền** dưới thẻ verdict (`border-top:none`), không phải khối rời — bố cục nói
      điều mà luật nói: cổng đọc từ verdict, không đứng độc lập.
- [ ] 5.2 FAIL → banner «⛔ Merge khoá cứng» + lý do; Merge vô hiệu; **Trả về dev vẫn hoạt động**.
- [ ] 5.3 PASS + medium → checklist tick từng cảnh báo, Merge chỉ sáng khi tick đủ, hint mono «còn n
      cảnh báo chưa tick».
- [ ] 5.4 **Ghi chú trả về dev thành BẮT BUỘC** — nút vô hiệu khi ô trống, và nói rõ vì sao. Trả về
      mà không nói lý do thì dev không biết vá gì, mà hành động đó đã vào sổ chỉ-ghi-thêm.
- [ ] 5.5 Lượt không gắn PR → nói thẳng «không có cổng merge», KHÔNG để khối biến mất im lặng.
- [x] 5.6 Đang trình diễn → cổng chỉ-đọc, nói rõ đây là bản phát lại. Điều kiện đọc thẳng từ trạng
      thái màn, KHÔNG phải tham số truyền qua nhiều lớp hàm.
- [ ] 5.7 Receipt sau merge / trả về dev theo gói, kèm hướng dẫn reopen.
- [x] 5.8 **Người chạy** vào bảng meta; lượt do chế độ trực khởi động khai là lượt máy chạy, không
      gán cho ai.

## 6. Lưới

- [ ] 6.1 Bản ghi verdict đời cũ (thiếu mọi trường mới) vẫn parse và vẫn dựng được màn.
- [x] 6.2 Lượt đã xong: phản hồi ĐẦU TIÊN đã chứa verdict và finding — không cần lượt gọi thứ hai.
- [x] 6.3 Trình diễn: cổng chỉ-đọc; và không đường nào từ chế độ đó gọi được hành động cổng.
- [ ] 6.4 Nối lại sau khi đứt: không finding hay dòng log nào lặp.
- [x] 6.5 Vùng xám probe hiện đủ bốn số kể cả khi bằng không.
- [x] 6.6 Vùng mù: file mã nguồn vượt trần → CÓ banner; chỉ lockfile → KHÔNG banner.
- [ ] 6.7 Ghi chú trống → không trả về dev được.
- [x] 6.8 Verdict stale → cổng khoá và trang nói ra trước khi người dùng bấm.
- [x] 6.9b Head đổi giữa lượt chấm → đánh dấu ngay, lượt vẫn chạy tới hết, và cổng khoá ngay ở lần
      mở đầu tiên. Head KHÔNG đổi → không thêm lời gọi GitHub nào sau khi lượt kết thúc.
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
- [ ] 8.4 **Webhook GitHub** — change riêng (PO chốt). Đáng làm, nhưng payoff thật KHÔNG nằm ở việc
      biết push giữa lượt chấm (poll 30s đã lấy gần hết): nó nằm ở chỗ **thay hẳn poller 300 giây** —
      hôm nay một PR mới chờ tới 5 phút mới được ngó tới.
      Vì sao tách: đây sẽ là **cửa vào không-xác-thực-người-dùng đầu tiên** của sản phẩm, hồ sơ rủi ro
      khác hẳn phần còn lại của change này. Nó kéo theo: HMAC-SHA256 `X-Hub-Signature-256` so
      timing-safe · giữ raw body (`express.json()` ăn mất là hết ký được) · chống phát lại theo
      `X-GitHub-Delivery` · trần payload · secret theo TỪNG repo + UI nhập · **và nginx phải miễn
      Basic Auth cho đúng đường đó** — prod đang nằm sau Basic Auth, chỉ `/.well-known/acme-challenge/`
      được miễn. Tức đục lỗ thứ hai xuyên lớp bảo vệ ngoài cùng, làm ở tầng nginx chứ không phải code.
- [ ] 8.5 **Bỏ HTTP Basic Auth ở nginx** (PO chốt hướng) — đi thành gói BA việc, không tách rời:
      (a) **rào đăng nhập trước đã**: đếm theo IP + lùi dần theo tài khoản, tự viết, không thêm gói phụ
      thuộc; (b) bỏ Basic Auth ở nginx; (c) **viết lại** câu biện minh trong `DEPLOY.md` — dòng «đã an
      toàn nhờ lớp Basic Auth nginx bên dưới» phải thành lập luận mới chứ không xoá đi, vì đó là chỗ
      người sau đọc để hiểu vì sao `MODE=org` được phép mở.
      Đo trước khi chốt: lớp trong ĐỦ chắc để đứng một mình — middleware là allowlist mặc-định-chặn,
      `DUONG_MO` đúng ba đường, `/health` chỉ trả `{ok:true}`, cookie HttpOnly+SameSite+Secure, và
      comment R11.2 ghi rõ app vốn được viết để KHÔNG tựa vào lớp ngoài. Thiếu đúng một thứ: **không
      có rào chống dò mật khẩu nào**. Chỗ đó sắc hơn vẻ ngoài vì scrypt N=16384 cố ý chậm — mỗi lần
      thử tốn CPU của máy chủ, nên vòng lặp gõ /login vừa là dò mật khẩu vừa là đòn DoS rẻ, trên một
      Lightsail dùng chung máy với tingpos.vn.
      Độc lập với 8.4: đi sớm được nếu cần link chia sẻ cho ban giám khảo trước 23/09.
- [ ] 8.3 Dựng lại nội dung 5 màn còn lại theo gói (lịch sử · sổ cái · tin cậy · cấu hình · nguyên tắc).
