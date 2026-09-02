# Design — màn Run và cổng merge

## Đo trước: cái gì đã có, cái gì chỉ là câu chữ

Trước khi thiết kế, em đếm trên chính engine xem gói design đòi gì mà mình chưa có. Kết quả đổi hẳn
cách chia việc:

```
ENGINE (da tinh du)            BIEN RunEvent            UI (goi doi khoi CO CAU TRUC)
--------------------------     ------------------       ------------------------------
probe_stats (14 truong)   -->  verdict.probe_stats  --> bang meta 2 cot          CO CAU TRUC
findings                  -->  finding              --> finding card             CO CAU TRUC
quan_sat_ngoai_pr         -->  verdict.*            --> khoi vien dash           CO CAU TRUC
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
ngoaiTamNhin + lyDo       -->  log: "3 file KHONG..."-> banner "Vung mu cua diff"  CHI LA CHUOI
admitToLibrary(ket qua)   -->  log (neu co)          -> khoi "Thu vien"            CHI LA CHUOI
doi chung = 0 probe       -->  log                   -> banner "khong doi chung"   CHI LA CHUOI
khong du co so            -->  throw Error           -> card "KHONG RA VERDICT"    LA MOT LOI
```

Điều đáng mừng: `probe_stats` đã có **đủ mười bốn trường**, trong đó có nguyên bốn số «vùng xám» mà
README của gói in đậm (`nghi_van` · `bo_qua` · `that_lac` · `nghi_loi_co_san`). Bảng meta của verdict
dựng được ngay, không cần engine làm gì thêm.

Điều đáng lo: bốn khối còn lại chỉ tồn tại dưới dạng **câu chữ tiếng Việt trong `msg`**. Muốn dựng
banner vùng mù, giao diện sẽ phải bắt ký tự `⚠` trong lời văn log — và vỡ ngay lần ai đó sửa một chữ.

## Quyết định 1 — nới hợp đồng, không dò chuỗi

Giao diện đọc **dữ liệu**, không đọc **lời văn**. Ba đường nới, theo thứ tự rủi ro tăng dần:

| Cách | Rủi ro | Dùng cho |
|---|---|---|
| Thêm trường **tuỳ chọn** vào `Verdict` | thấp — cộng thêm, bản ghi cũ vẫn đọc | vùng mù · thư viện · đối chứng |
| Thêm **loại** `RunEvent` mới | thấp — chỗ nhận bỏ qua loại lạ | mốc thời gian từng bước |
| Đổi **hình dạng** trường đã có | **cao** | không làm |

`Verdict` bị `JSON.stringify` **nguyên khối** xuống cột `run.verdict` (`run-store.ts:86`) — tức nó là
lớp dữ liệu đóng băng. Thêm trường tuỳ chọn thì bản ghi cũ parse vẫn ra (trường mới là `undefined`,
giao diện không hiện khối đó). Đổi tên hay đổi kiểu thì hai mươi chín bản ghi đang có sẽ đọc sai mà
không ai biết. Nên luật của change này: **chỉ thêm, không sửa.**

## Quyết định 2 — lượt đã xong thì server dựng; luồng chỉ để theo dõi lượt đang chạy

Hôm nay **mọi** lượt, kể cả lượt kết thúc tuần trước, được dựng bằng cách đổ lại toàn bộ dòng sự kiện
vào DOM:

```
server.ts:  for (const ev of st.events) gui(ev)     <-- do het, tuc thi
ui.ts:      es.onmessage = ... ve(e)                <-- JS dung lai stage/finding/verdict
```

Ba hệ quả đo được, không phải suy đoán:

1. **Không kịch bản thì trang trắng** — `meta.verdict` nằm sẵn trên máy chủ mà không được dựng.
2. **Chuyển cảnh và tải-trước vừa làm xong vô tác dụng ở đúng màn này** — nội dung tới sau điều hướng.
3. Và bằng chứng đắt nhất, chính mã nguồn đang thú nhận:

```js
if (!document.querySelector('.cong') && meta.pr) {
  a.innerHTML = '<a class="btn" href="">↻ Tải lại trang để mở cổng Merge / Trả về dev</a>';
```

Cổng merge **server dựng**, verdict **client dựng**. Nên khi một lượt vừa chạy xong trực tiếp, cổng
chưa có mặt — và ứng dụng bảo người dùng **tự tải lại trang**. Người dùng đang gánh chỗ nối giữa hai
nửa kiến trúc.

```
DE XUAT
  trang thai = xong   -->  server-render tu meta.verdict  (doc duoc ngay, khong can JS)
  trang thai = chay   -->  server-render phan da co + noi luong cho phan con lai
                           xong thi doi cho tai cho, KHONG bat tai lai
```

Dòng sự kiện vẫn lưu — nó còn cần cho log từng bước và cho bản trình diễn. Chỉ là nó thôi làm **cách
render**.

## Quyết định 3 — trình diễn: nhịp chuyển sang phía client, `?timed=1` biến mất

Máy chủ hiện có **hai** đường phát sự kiện: `?timed=1` xếp `setTimeout` cho từng sự kiện theo nhịp
gốc (mã nguồn gọi thẳng là «chế độ sân khấu»), còn mặc định thì đổ hết. Tốc độ nằm trong URL, nên đổi
tốc độ nghĩa là tải lại trang.

Mỗi sự kiện đã mang sẵn `t` — số mili giây từ lúc bắt đầu. Client hoàn toàn tự canh nhịp được.

| | Máy chủ | Đổi tốc độ giữa chừng | Cổng trong lúc phát lại |
|---|---|---|---|
| Hiện nay | hai đường, có `timed`/`speed` | tải lại trang | **nút Merge THẬT** |
| **Đề xuất** | **một đường** | tức thì | chỉ-đọc, theo cấu trúc |

Chọn phía client vì nó **xoá** mã chứ không thêm: bỏ nhánh `timed`, bỏ tham số `speed`, bỏ luôn khái
niệm «URL phát lại». Và nó chữa tận gốc lỗi nút Merge — khi trình diễn là **trạng thái của màn** chứ
không phải một địa chỉ, thì «đang trình diễn ⇒ cổng chỉ-đọc» đọc thẳng từ trạng thái, không phải một
tham số ai đó phải nhớ truyền qua bốn lớp hàm.

*(PO cân nhắc một hộp thoại chọn tốc độ trước khi phát. Bỏ vì nó bắt chọn khi chưa có ngữ cảnh — chưa
xem thì chưa biết muốn ×2 hay ×16 — và không cho đổi khi đang xem, vốn là lúc người ta thật sự muốn
đổi.)*

## Quyết định 4 — sổ sự kiện trên đĩa là nguồn sự thật, không phải đường ống

Đây là phần nặng nhất của change, và là câu trả lời cho «lượt chấm có mất khi server restart không».

```
HIEN NAY
  server  --spawn--> cli.ts  --stdout pipe--> server RAM --(chi luc dong)--> DB
                                                  ^
                                          server chet o day = mat sach

DE XUAT
  cli.ts  --append--> runs/<id>/events.jsonl   <-- NGUON SU THAT
  server  --doc file-->  DB + luong SSE
```

Vì sao đây là chỗ đúng để cắt: hôm nay nếu tiến trình web chết, tiến trình con **vẫn chạy tiếp** —
nhưng nó đang nói vào một đường ống mà đầu kia đã tắt. Công việc vẫn diễn ra, kết quả bay hết. Cho nó
ghi ra file thì công việc tích luỹ được giữ lại bất kể ai còn đang nghe.

Đổi lại phải chấp nhận: **hai nơi ghi cùng một dữ liệu** (file `.jsonl` và bảng `run_su_kien`). Quy
ước dứt khoát để chúng không trôi khỏi nhau — file là nguồn, DB là bản đọc; khi lệch thì tin file, và
việc dựng lại DB từ file phải làm được.

Ba điều **không** thuộc mức này, nói rõ để không ai tưởng đã có:

- Không cứu được lời gọi model đang bay. Đường gói thuê bao chạy `claude -p --no-session-persistence`
  — mình **cố ý** bảo nó đừng lưu phiên; đường API là request/response, không có chỗ nào để lấy lại
  câu trả lời cũ. Bật lưu phiên lên để cứu thì đổi lấy một vấn đề khác: transcript chứa nguyên văn
  diff của repo đích, nằm trên đĩa.
- Không tự chạy tiếp lượt dở. Xem mức 3 dưới đây.
- Không cứu được nếu tiến trình con bị giết cùng tiến trình cha (deploy giết cả nhóm). Nó chỉ bảo đảm
  giữ được **mọi thứ tới đúng lúc chết**, và nói được lượt chấm dừng ở bước nào.

## Mức 3 — chạy tiếp lượt dở: TÁCH RA, và vì sao

Việc đắt nhất khi mất một lượt không phải lời gọi đang bay, mà là **các bước đã xong đã trả tiền**.
Lượt chấm gọi model nhiều lần qua năm bước; chết ở bước 4 là vứt kết quả của bước 3 — chỗ đốt token
nhiều nhất.

Chạy tiếp được thì tiết kiệm thật. Nhưng nó mang một cái bẫy **không phải chi tiết kỹ thuật**:

> Chạy tiếp nghĩa là một phần bằng chứng thu ở thời điểm cũ. Nếu giữa lúc chết và lúc chạy tiếp mà
> pull request có commit mới, verdict sẽ ghim một **hỗn hợp** — phá đúng bất biến «verdict ghim
> commit» mà cổng merge dựa vào.

Nên mức 3 buộc phải có luật riêng: ghim SHA lúc bắt đầu và **từ chối chạy tiếp nếu SHA đã đổi**; và
sổ phải phân biệt được lượt chạy liền một mạch với lượt chạy tiếp sau gián đoạn. Đó là yêu cầu mới,
không phải tối ưu — nên nó là change riêng, làm ngay sau change này (PO chốt).

## Ba lỗi hành vi vá luôn ở đây

Chúng lộ ra trong lúc đọc mã nguồn, không phải khi nhìn gói design:

**1. Chế độ phát lại bày nút Merge thật.** `khoiCong(meta)` không nhận tham số `replay`, và máy chủ
không có khái niệm phát-lại — nó thuần tuý là một tham số URL. Nên mở `/runs/<id>?replay=1` cho ra
một nút Merge bấm được và **merge thật**. Mã nguồn ghi `⏩ ×8` là để «tua nhanh cho tổng duyệt», tức
đúng lúc đứng trước khán giả. Quyết định 3 chữa tận gốc.

**2. Mất mạng thì màn hình nhân đôi.** Kết nối tự nối lại, nhưng máy chủ không đọc `Last-Event-ID`
nên đổ lại **toàn bộ** từ đầu, còn giao diện chỉ nối thêm. Một lần rớt mạng cho ra hai bản finding
giống hệt. Vá bằng `id:` trên mỗi sự kiện và tiếp từ chỗ đứt — khoảng năm dòng.

**3. Verdict hết hiệu lực nhưng trang không nói.** Đường ghi đã chặn đúng và chặn ba lớp: máy chủ so
lại head trước khi merge, rồi gửi SHA kỳ vọng lên GitHub để GitHub tự từ chối — lớp cuối đóng cửa sổ
giữa lúc kiểm và lúc gọi. Nhưng **trang** thì không nói gì: mở một lượt cũ vẫn thấy PASS to và nút
Merge sáng, chỉ biết verdict đã chết sau khi đã bấm. Hệ an toàn mà không trung thực sớm. Gói có sẵn
banner cho việc này; đưa vào đây.

## «Không ra verdict» — vào tới đâu ở change này

Gói muốn một **trạng thái kết thúc thứ ba**: card riêng, không ghi sổ cái, cổng giữ nguyên trạng thái
trước, và Lịch sử có pill với bộ lọc riêng. Hôm nay engine `throw new Error('Không đủ cơ sở kết
luận: …')`, nên giao diện nhận `{type:'error'}` và bày hộp lỗi đỏ chung.

Change này làm **nửa nhìn thấy được**: khi lỗi mang đúng dấu hiệu «không đủ cơ sở», màn Run dựng card
riêng nền tối theo gói thay vì hộp lỗi chung, kèm đủ số probe. Không làm: đổi `result` thành ba giá
trị, đổi bộ lọc Lịch sử, đổi ràng buộc sổ cái — những cái đó chạm mô hình trạng thái và bảng `so_cai`
(cột `verdict` có ràng buộc `CHECK (verdict IN ('PASS','FAIL'))`).

Ranh giới này là cố ý và có giá: người dùng thấy đúng bản chất trên màn Run, nhưng trong Lịch sử lượt
đó vẫn nằm chung nhóm «lỗi». Ghi ra thành nợ có tên chứ không lờ đi.

## Bố cục màn Run — đọc từ template của gói

```
+--------------------------------------------------------------+
| <- Dashboard                                                  |
| h6 accent  Luot cham · skill code                             |
| h3         <tieu de PR>                    [trang thai] [>]   |
| mono       repo · nhanh @ SHA <- base · tac gia   [x1 x8 ||]  |
+--------------------------------------------------------------+
| [!] Verdict stale — co commit moi        [Cham lai commit moi]|   <- moi
+--------------------------------------------------------------+
| rule 2px                                                      |
| 40px | Buoc 1  Nhan artifact              12s                 |
|      |   [khoi log nen neutral-900, mm:ss trai]               |
| 40px | Buoc 4  Chay & doi chieu           88s                 |
|      |   [!] Khong co doi chung ...                           |   <- moi, DAU buoc 4
+--------------------------------------------------------------+
| [!] Vung mu cua diff — n file ma nguon bi loai                |   <- moi
+--------------------------------------------------------------+
| Finding  n                                                    |
|  |6px| tag sev + tieu de dam                                  |
|       dieu gi sai · hau qua — · $ lenh probe                  |
|       +----------------+----------------+                    |
|       | KY VONG (jade) | THUC TE (crim) |                    |
+--------------------------------------------------------------+
| Quan sat ngoai pham vi PR (vien dash)                         |
+--------------------------------------------------------------+
| grid 2fr | 3fr, vien 2px                                      |
| PASS/FAIL |  finding · probe stats · VUNG XAM (4 so)          |   <- vung xam moi
| 54px      |  provider · model · token · thoi gian             |
|           |  NGUOI CHAY · bat dau · che do                    |   <- nguoi chay moi
+--------------------------------------------------------------+
| Thu vien: nhan 3/5 probe pass-goc                             |   <- moi
|   |- (x) go khoi thu vien  probe-12  ...                      |
|   `- (o) khong nap vao     probe-19  ...                      |
+--------------------------------------------------------------+
| Cong merge  (noi lien duoi verdict, KHONG phai khoi roi)      |
+--------------------------------------------------------------+
```

Cổng merge trong gói **nối liền** dưới thẻ verdict (`border-top:none`), không phải một khối rời. Nó
nói bằng bố cục điều mà sản phẩm nói bằng luật: cổng đọc từ verdict, không đứng độc lập.

## Rủi ro đã biết

- **Hai nơi ghi cùng một dữ liệu** (file `.jsonl` và bảng `run_su_kien`). Chúng sẽ trôi khỏi nhau nếu
  không có quy ước rõ. Chốt: file là nguồn, DB là bản đọc, dựng lại DB từ file phải làm được.
- **`runs/` thành dữ liệu sống.** Trước đây nó chỉ chứa kết xuất cuối; nay giữ dòng sự kiện đang
  chạy. `DEPLOY.md` phải xếp nó vào nhóm không-đè-khi-deploy, cùng `web-runs/` và `probes-lib/`.
- **Hai đường dựng cùng một màn** (server dựng lúc xong, client dựng lúc đang chạy) sẽ lệch nhau nếu
  viết hai lần. Cách chặn: hàm dựng HTML của finding và verdict phải là **một** và dùng được ở cả hai
  phía — client gọi qua chuỗi đã dựng sẵn, không tự ghép lại.
- **Ghi từng sự kiện xuống đĩa làm tăng số lần ghi.** Một lượt trung vị 3,6 phút sinh vài trăm sự
  kiện — rẻ, nhưng phải ghi nối tiếp chứ không ghi đè cả tệp mỗi lần.
