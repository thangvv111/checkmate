import { shell } from './ui.js';

// Trang "Nguyên tắc làm việc" — tài liệu tự thân của checker: vì sao verdict tin được.
// Bố cục: menu điều hướng trái (sticky + scroll-spy), nội dung phải. CSS gói riêng trong trang
// để không đụng CSS chung của các màn nghiệp vụ.

const CSS_DOCS = `
  .docs { display:grid; grid-template-columns:218px minmax(0,1fr); gap:34px; align-items:start; }
  .docs-nav { position:sticky; top:22px; }
  .docs-nav .nhom { font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted);
    font-weight:650; margin:16px 0 6px; }
  .docs-nav .nhom:first-child { margin-top:0; }
  .docs-nav a { display:block; font-size:13px; color:var(--muted); text-decoration:none;
    padding:5px 10px; border-left:2px solid var(--line); line-height:1.4; }
  .docs-nav a:hover { color:var(--ink); }
  .docs-nav a.on { color:var(--teal); border-left-color:var(--teal); font-weight:600; background:var(--teal-soft); }
  .docs-body section { margin:0 0 34px; scroll-margin-top:18px; }
  .docs-body h2 { font-size:19px; margin:0 0 10px; }
  .docs-body h3 { font-size:14.5px; margin:18px 0 6px; }
  .docs-body p, .docs-body li { font-size:14px; line-height:1.65; color:var(--ink); }
  .docs-body p { margin:0 0 10px; max-width:68ch; }
  .docs-body ul { margin:0 0 10px; padding-left:22px; }
  .docs-body li { margin:3px 0; }
  .docs-body .tomtat { border-left:3px solid var(--teal); background:var(--teal-soft); border-radius:var(--radius-md);
    padding:10px 14px; margin:0 0 14px; font-size:13.5px; max-width:66ch; }
  .docs-body .luuy { border-left:3px solid var(--amber); background:var(--amber-soft); border-radius:var(--radius-md);
    padding:10px 14px; margin:12px 0; font-size:13.5px; max-width:66ch; }
  .docs-body table.ca { border-collapse:collapse; margin:12px 0 14px; font-size:13.5px; background:var(--surface);
    border:1px solid var(--line); border-radius:var(--radius-md); overflow:hidden; }
  .docs-body table.ca th { text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase;
    color:var(--muted); background:var(--color-surface); padding:8px 14px; }
  .docs-body table.ca td { padding:8px 14px; border-top:1px solid var(--line); }
  .docs-body table.ca td.kq-ok { color:var(--teal); font-weight:600; }
  .docs-body table.ca td.kq-no { color:var(--fail); font-weight:600; }
  .docs-body code { font:12.5px/1.5 Consolas,monospace; background:var(--color-surface); border-radius:var(--radius-md); padding:1px 5px; }
  .docs-body .vidu { background:var(--color-surface); border:1px solid var(--line); border-radius:var(--radius-md); padding:10px 14px;
    margin:10px 0 14px; font-size:12.5px; font-family:Consolas,monospace; line-height:1.6; overflow-x:auto; }
  .docs-body .vidu b { color:var(--fail); font-weight:600; }
  .docs-body .buoc { display:flex; gap:10px; margin:4px 0 10px; flex-wrap:wrap; }
  .docs-body .buoc span { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-pill);
    padding:4px 12px; font-size:12.5px; color:var(--ink); white-space:nowrap; }
  .docs-body .buoc span b { color:var(--teal); font-weight:700; margin-right:4px; }
  @media (max-width:800px) { .docs { grid-template-columns:1fr; } .docs-nav { position:static; display:none; } }
`;

const JS_SPY = `
  var links=[].slice.call(document.querySelectorAll('.docs-nav a[href^="#"]'));
  var muc=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));});
  function danhDau(){
    var i=0;
    for(var k=0;k<muc.length;k++){ if(muc[k] && muc[k].getBoundingClientRect().top<=90) i=k; }
    links.forEach(function(a,k){ a.classList.toggle('on',k===i); });
  }
  document.addEventListener('scroll',danhDau,{passive:true}); danhDau();
`;

export function docsPage(): string {
  const nav = `
  <nav class="docs-nav" aria-label="Mục lục">
    <div class="nhom">Nền tảng</div>
    <a href="#triet-ly">Triết lý maker–checker</a>
    <a href="#verdict">Verdict &amp; vòng đời</a>
    <div class="nhom">Chấm code</div>
    <a href="#cham-code">Chạy thật trong sandbox</a>
    <a href="#doi-chung">Đối chứng hai nhánh</a>
    <a href="#luoi-may">Ba lưới máy chống báo sai</a>
    <div class="nhom">Chấm tài liệu</div>
    <a href="#cham-tai-lieu">Rubric &amp; trích dẫn nguyên văn</a>
    <div class="nhom">Cổng &amp; vận hành</div>
    <a href="#cong-merge">Ba mức finding, một cổng</a>
    <a href="#thu-vien">Thư viện probe tích luỹ</a>
    <a href="#truc-va-agent">Trực · sổ cái · tin cậy · MCP</a>
    <div class="nhom">Trung thực</div>
    <a href="#gioi-han">Giới hạn nói thẳng</a>
  </nav>`;

  const body = `
  <div class="docs-body">
    <section id="triet-ly">
      <h2>Triết lý maker–checker</h2>
      <p class="tomtat">Mọi giao dịch ngân hàng đều qua hai người: một người làm (maker), một người kiểm (checker).
      CheckMate đem đúng nguyên tắc đó vào code và tài liệu.</p>
      <p>Checker của CheckMate là một agent <b>độc lập</b>, được thiết kế để <b>bác bỏ</b> — không phải trợ lý gợi ý.
      Nó không đọc diff rồi đoán; nó tìm cách chứng minh thay đổi này sai, và chỉ khi không chứng minh được mới cho qua.</p>
      <p>Maker là ai cũng được: người, người + copilot, hay một AI agent khác. Checker không quan tâm ai viết —
      nó chỉ kiểm sản phẩm. Và checker <b>không thay người approve cuối</b>: chuỗi luôn là
      maker → checker → <b>người bấm merge</b>.</p>

      <h3>Ý kiến của model không chặn được merge</h3>
      <p>Đây là ranh giới quan trọng nhất của CheckMate, và nó là ranh giới <b>cơ học</b> chứ không phải lời hứa.
      Model đề xuất probe (phép thử đối kháng) và viết diễn giải cho finding — nhưng model <b>không có tool nào</b>.
      Máy chủ mới là bên chạy probe thật, trong sandbox, trên cả nhánh PR lẫn nhánh gốc để đối chứng.</p>
      <p>Việc <b>phân loại kết quả</b> cũng do máy quyết theo bảng chân trị, model không được tự giác luật đó.
      Và chỉ một nhãn duy nhất — <b>hồi quy</b>, tức đỏ ở nhánh PR nhưng xanh ở nhánh gốc — mới đủ tư cách chặn
      merge. Model có viết hay đến đâu, nghi ngờ nhiều đến đâu, mà máy không dán được nhãn đó thì cổng vẫn mở.</p>
      <p>Đi kèm là các lưới chống xanh giả theo chiều ngược lại: probe bị <code>skip</code> không được tính là pass;
      thiếu dữ liệu đối chứng thì không được phong hồi quy; và nếu không probe nào chứng minh được gì thì lượt chấm
      <b>kết thúc bằng lỗi, không ra PASS</b> — thà không kết luận còn hơn kết luận rỗng.</p>
    </section>

    <section id="verdict">
      <h2>Verdict &amp; vòng đời</h2>
      <p>Mỗi lượt chấm kết thúc bằng một verdict <b>nhị phân</b> — PASS hoặc FAIL, không có "tạm ổn".
      Verdict ghim vào <b>đúng một commit</b>:</p>
      <ul>
        <li>Dev push commit mới → verdict cũ <b>tự hết hiệu lực</b>, cổng merge khoá lại chờ chấm lại.</li>
        <li>Cùng một commit đã có verdict → không chấm lại lặng lẽ; muốn chấm lại phải xác nhận tường minh.</li>
        <li>Mọi verdict vào <b>sổ cái append-only</b> (chỉ ghi thêm theo quy trình — mọi thao tác của hệ chỉ nối thêm dòng; chống-sửa-mật-mã hoá bằng hash-chain là bước kế tiếp).</li>
      </ul>
      <p>FAIL khi và chỉ khi có ít nhất một finding mức <b>High</b>. Finding nào cũng phải mang bằng chứng
      mà người thật kiểm lại được trong khoảng 10 giây.</p>
    </section>

    <section id="cham-code">
      <h2>Chấm code: chạy thật trong sandbox</h2>
      <p class="tomtat">Checker không "đọc code rồi nhận xét". Nó sinh probe (phép thử) từ spec, chạy code thật,
      và chỉ nói những gì kết quả chạy chứng minh được.</p>
      <div class="buoc">
        <span><b>1</b>Đọc spec + diff</span>
        <span><b>2</b>Sinh probe đối kháng</span>
        <span><b>3</b>Chạy trên cả hai nhánh</span>
        <span><b>4</b>Máy phân loại kết quả</span>
        <span><b>5</b>Model viết finding</span>
      </div>
      <p class="luuy"><b>Hai nhân vật trong tài liệu này:</b> <b>model</b> là phần AI (Claude, gọi qua adapter) —
      sinh probe, viết finding, phân xử ca mơ hồ; sáng tạo nhưng không tất định. <b>Máy</b> là harness
      (phần code cố định của CheckMate, không có AI) — chạy probe, so fingerprint, phân loại, đếm severity,
      đóng/mở cổng; tất định, cùng input luôn cùng output. Phân công xuyên suốt:
      <b>model được sáng tạo, máy được quyết định</b> — mọi điểm ra phán quyết đều nằm ở máy.</p>
      <p><b>Probe</b> (phép thử đối kháng do checker tự sinh) được tạo <b>neo vào từng luật trong spec</b> của repo — mỗi probe khai báo nó kiểm luật nào.
      Toàn bộ chạy trong sandbox tách biệt (git worktree) với biến môi trường được lọc allowlist — code PR
      không thấy secrets của checker; trên chính bộ shell test của repo: repo nào chạy test được — dù chưa có CI —
      là chấm được. Stack khác khai cách chạy qua <code>checkmate.yml</code>, hợp đồng kết quả là JUnit XML
      (Python đã chạy end-to-end; Java đi cùng hợp đồng, chưa kiểm end-to-end).</p>
      <p>Finding của skill code luôn có dạng: <b>kỳ vọng theo spec</b> đối chiếu <b>kết quả chạy thật</b>.
      Đó là AssertionError, không phải ý kiến.</p>
    </section>

    <section id="doi-chung">
      <h2>Đối chứng hai nhánh</h2>
      <p class="tomtat">Cùng một bộ probe chạy trên <b>nhánh PR</b> (code mới) và <b>nhánh gốc</b>
      (code đang chạy ổn). So kết quả hai bên mới kết luận được lỗi nằm ở đâu.</p>
      <table class="ca">
        <tr><th>Nhánh gốc</th><th>Nhánh PR</th><th>Máy kết luận</th></tr>
        <tr><td class="kq-ok">đạt</td><td class="kq-no">hỏng</td><td><b>Regression (hồi quy) — finding bắt buộc.</b> PR làm gãy hành vi đang đúng.</td></tr>
        <tr><td class="kq-ok">đạt</td><td class="kq-ok">đạt</td><td>Không có gì để nói.</td></tr>
        <tr><td class="kq-no">hỏng</td><td class="kq-ok">đạt</td><td>PR sửa được lỗi cũ — không phải finding.</td></tr>
        <tr><td class="kq-no">hỏng</td><td class="kq-no">hỏng</td><td><b>Ngoài phạm vi PR</b> — máy không quy tội PR (probe sai contract HOẶC lỗi có sẵn); không thành finding nhưng được <b>báo tách</b> trong verdict (xem bên dưới).</td></tr>
      </table>
      <p>Vế cuối là chốt chặn quan trọng nhất — và máy nói <b>đúng mức những gì nó chứng minh được</b>:
      fail cả hai nhánh chỉ chứng minh "không phải lỗi của PR", chứ KHÔNG phân biệt được probe hỏi sai câu hỏi
      hay repo có lỗi từ trước. Vì vậy nhóm này không thành finding (không quy oan tác giả PR) nhưng cũng
      <b>không bị im lặng</b>: chúng vào mục <b>«Quan sát ngoài phạm vi PR»</b> của verdict để đội mở việc riêng.
      Riêng <b>probe thư viện</b> fail cả hai nhánh thì máy suy được mạnh hơn: nó đã chứng minh khớp contract
      ở lượt trước, nên không thể "hỏi sai" — nhãn <b>nghi lỗi có sẵn</b> (lỗi mới lộ, hoặc spec/code đã đổi).
      Ví dụ probe hỏi sai câu hỏi:</p>
      <div class="vidu">probe kiểm tra <b>response.message</b> — nhưng API của repo trả về trường <code>error</code>.<br>
      → probe fail trên CẢ HAI nhánh, cùng một thông báo lỗi → máy loại trước khi model nhìn thấy.</div>
      <h3>Error fingerprint (vân tay lỗi)</h3>
      <p>Để phân biệt hai ca "hỏng–hỏng", máy rút mỗi thông báo lỗi về một <b>fingerprint</b> — chữ ký ngắn
      đại diện cho <i>nguyên nhân</i>, đã gột sạch phần ngẫu nhiên:</p>
      <ul>
        <li>Chỉ lấy <b>dòng đầu</b> của thông báo — stack trace (vết gọi hàm) phía dưới chứa đường dẫn file,
        số dòng… vốn khác nhau giữa hai sandbox, toàn nhiễu;</li>
        <li><b>Chuẩn hoá phần ngẫu nhiên</b>: mọi con số và chuỗi hex dài (id bản ghi, SHA, thời lượng ms, port)
        thay bằng <code>#</code>; về chữ thường; gộp khoảng trắng.</li>
      </ul>
      <div class="vidu">nhánh gốc: expected 201 but got 500 (request id <b>8f3a2c1d9</b>, <b>34</b>ms)<br>
      nhánh PR:&nbsp; expected 201 but got 500 (request id <b>77b04e2aa</b>, <b>41</b>ms)<br>
      → cùng fingerprint <code>expected # but got # (request id #, #ms)</code> — cùng nguyên nhân → probe hỏng, loại.</div>
      <p><b>Cùng fingerprint = cùng nguyên nhân → loại thẳng.</b> Khác fingerprint thì máy <b>không tự quyết</b> —
      chuyển model phân xử, vì đó có thể vẫn là lỗi thật: nhánh gốc fail kiểu <code>TypeError</code>
      (tính năng <i>chưa có</i>), nhánh PR fail kiểu <code>AssertionError</code> (tính năng <i>làm sai</i>).
      Chiều nghiêng của thiết kế: mơ hồ thì đưa lên xét, không lặng lẽ vứt.</p>
    </section>

    <section id="luoi-may">
      <h2>Ba lưới máy chống báo sai</h2>
      <p class="tomtat">Câu hỏi lớn nhất với AI review: "nó bịa thì sao?" — Trả lời của CheckMate:
      <b>nó không được phép bịa</b>. Ba lưới dưới đây là code cố định, không phải lời hứa của model.</p>
      <ul>
        <li><b>Lưới 1 — loại probe ngoài phạm vi:</b> fail trên cả hai nhánh với cùng fingerprint → không được
        làm bằng chứng chống PR, loại <b>trước khi model nhìn thấy</b> (nhưng vẫn báo tách trong verdict). Lý do phải để máy làm: khi cho model tự phân loại, nó có xu hướng
        "thương" probe của chính mình — giữ lại một cái hỏng rồi viết thành finding, khiến hai lượt chấm
        cùng một commit ra hai kết quả khác nhau. Chuyển quyền phân loại cho máy thì dao động đó biến mất.</li>
        <li><b>Lưới 2 — regression không được bỏ sót:</b> probe "gốc đạt + PR hỏng" là regression máy đã xác nhận.
        Model <b>bắt buộc</b> phải viết nó thành finding; nếu model bỏ sót, máy tự bổ sung một finding mức High
        (fail-closed — thà chặn nhầm còn hơn cho lọt).</li>
        <li><b>Lưới 3 — finding trỏ bậy bị vứt:</b> finding nào trỏ vào probe không hề fail thì bị máy vứt
        trước khi ra verdict. Model không thể "kể thêm" lỗi mà không có bằng chứng chạy.</li>
      </ul>
      <p>Cả ba lưới đều <b>ghi vết trong log lượt chạy</b> — loại bao nhiêu probe, bổ sung finding nào — ai xem cũng thấy.</p>
    </section>

    <section id="cham-tai-lieu">
      <h2>Chấm tài liệu: rubric &amp; trích dẫn nguyên văn</h2>
      <p class="tomtat">PRD, tài liệu BA, spec đi qua PR thì được review <b>trước khi merge, trong ngữ cảnh repo</b> —
      chặn lỗi ở cổng rẻ nhất, trước khi ai viết dòng code nào.</p>
      <p>Checker <b>bị cấm "chê văn"</b>. Nó chỉ được báo <b>bảy</b> loại lỗi khách quan — bốn trục lõi:</p>
      <ul>
        <li><b>Mâu thuẫn nội tại</b> — hai chỗ trong tài liệu nói ngược nhau (bảng ghi ≤ 500 triệu, ví dụ lại duyệt 1 tỷ);</li>
        <li><b>Tiêu chí không đo được</b> — "hệ thống phải nhanh" mà không có con số;</li>
        <li><b>Thiếu tiêu chí nghiệm thu</b> — luồng được mô tả nhưng không có cách biết khi nào là xong;</li>
        <li><b>Lệch chéo mô tả–bảng</b> — phần chữ và bảng/biểu không khớp nhau.</li>
      </ul>
      <p>và ba trục bổ sung theo nghiên cứu requirements smells (ambiguity — mơ hồ — là loại lỗi practitioner
      xếp nặng nhất; các dạng con dưới đây được chọn vì máy neo/kiểm được):</p>
      <ul>
        <li><b>Tham chiếu chết</b> — "xem mục 7.2" mà tài liệu không có mục 7.2; <b>máy tự quét</b> toàn bộ
        tài liệu xác nhận nhãn được tham chiếu có tồn tại hay không — nhãn tìm thấy là finding bị vứt;</li>
        <li><b>Khoảng ngưỡng hở/chồng</b> — bảng ghi "dưới 500 triệu" và "trên 500 triệu": hồ sơ đúng 500 triệu
        thuộc ai? Bắt buộc hai trích dẫn (hai vế ngưỡng);</li>
        <li><b>Điều kiện thiếu vế</b> — quy tắc "nếu X thì A" mà cả tài liệu không nói không-X xử lý ra sao.</li>
      </ul>
      <p>Mỗi finding phải <b>neo trích dẫn nguyên văn</b> — máy đối chiếu từng ký tự với tài liệu gốc;
      trích dẫn không khớp thì finding bị vứt. Sau đó một vòng <b>skeptic</b> (phản biện đối kháng) rà lại từng
      finding: GIỮ, SỬA, hay LOẠI — finding yếu tự rụng trước khi ra verdict.</p>
    </section>

    <section id="cong-merge">
      <h2>Ba mức finding, một cổng nhị phân</h2>
      <ul>
        <li><b>High</b> — khoá merge tuyệt đối: sai phân quyền, sai tiền, mất dữ liệu, lỗi kỹ thuật lộ ra ngoài. Không có đường vòng.</li>
        <li><b>Medium</b> — merge được nhưng phải <b>tick xác nhận từng cảnh báo</b>; receipt ghi danh ai chấp nhận điều gì.</li>
        <li><b>Low</b> — cho qua, không chặn nhịp làm việc, nhưng vẫn vào sổ.</li>
      </ul>
      <p>Trước khi merge, một <b>receipt review</b> được post thẳng lên PR: verdict, commit, danh sách finding,
      ai chấp nhận cảnh báo nào. Chiều ngược lại, <b>Trả về dev</b> post phán quyết đầy đủ lên PR và
      <b>đóng PR</b> — PR bị trả về không được nằm lại trong hàng đợi chờ duyệt; dev sửa xong mở lại (Reopen) với commit mới.</p>
      <p>Mức severity nào không nhận diện được thì bị ép về High — <b>fail-closed</b>: mọi đường mơ hồ đều dẫn về phía chặn.</p>
    </section>

    <section id="thu-vien">
      <h2>Thư viện probe tích luỹ</h2>
      <p class="tomtat">Mỗi lượt chấm để lại một lớp regression: probe đã chứng minh được giữ lại, chạy lại ở
      mọi lượt sau mà không tốn thêm một lời gọi model nào.</p>
      <p>Phần lớn thứ trong một lượt chấm là chi phí dùng một lần — prompt, lời gọi model, thời gian sandbox.
      Thư viện probe thì khác: nó ở lại. Repo chạy càng nhiều lượt thì lớp regression càng dày, và lớp đó chạy
      <b>miễn phí về mặt model</b> vì probe đã có sẵn, chỉ tốn thời gian sandbox.</p>
      <p>Nói cho đúng phạm vi: cơ chế thì có và đo được — thư viện của một repo demo hiện có 41 probe, trong đó
      11 là bản chạy-lại trùng lặp bị cơ chế lọc loại ra. Nhưng <b>đường cong tích luỹ thì chưa đo</b>: CheckMate
      mới chạy trên repo demo, chưa phục vụ dự án thật nào, nên chưa có dữ liệu theo thời gian để nói "càng lâu
      càng tốt". Đó là kỳ vọng của thiết kế, không phải kết quả đã quan sát.</p>
      <p>Sau mỗi lượt chấm, probe nào đã <b>chứng minh khớp contract</b> (hợp đồng vào/ra của API — chạy đạt
      trên nhánh gốc) được nhận vào thư viện theo repo. Lượt sau, checker chạy: probe mới sinh
      <b>+ toàn bộ thư viện</b> — lớp regression này không tốn thêm call model nào.</p>
      <ul>
        <li>Nhận vào <b>từng probe một</b>: mỗi probe được tách thành một file độc lập chạy được một mình,
        và file tách đó phải chạy sạch trên nhánh gốc mới được nhận — nó là artifact mới chưa từng chạy.</li>
        <li><b>Trùng lặp xử theo bốn tầng.</b> Hai tầng đầu cơ học, không tốn model: bản chạy-lại của cùng
        một commit bị loại thẳng; probe neo vào cùng luật spec thì vào diện nghi. Tầng ba mới hỏi model,
        và hỏi đúng một câu hẹp — <i>hai phép thử này có cho ra cùng một finding không</i> — chứ không hỏi
        "có giống nhau không". Tầng bốn không hỏi ai: nó nhìn <b>hành vi đo được</b> — hai probe cùng luật
        cho kết quả giống hệt nhau qua ít nhất ba lượt chấm chung, trong đó có ít nhất một lượt không phải
        pass, thì mới bị coi là trùng.</li>
        <li><b>Mọi đường mờ đều nghiêng về GIỮ.</b> Loại nhầm một probe thật là mất tài sản trong im lặng;
        giữ nhầm một bản sao chỉ tốn chỗ. Model phân vân, trả lời thiếu, hay tự mâu thuẫn đều thành giữ
        lại — và mọi lần loại đều ghi rõ probe nào, trùng với cái nào, vì sao.</li>
        <li>Hai probe cùng xanh suốt <b>không</b> bị coi là trùng: đồng thuận khi không có gì xảy ra thì
        không phải bằng chứng.</li>
        <li>Thư viện có trần đếm theo probe; đầy thì loại cái cũ nhất và xoá cả file, không để lại file mồ côi.</li>
        <li>Probe thư viện cũng đi qua đúng ba lưới máy như probe mới — không có "ghế VIP".</li>
      </ul>
    </section>

    <section id="truc-va-agent">
      <h2>Chế độ trực · sổ cái · thang tin cậy · MCP</h2>
      <p>CheckMate không chỉ là một trang web có nút bấm — nó là một <b>thành viên trong dàn agent</b>:</p>
      <ul>
        <li><b>Chế độ trực (PR-bot):</b> bật lên là checker tự quét hàng đợi theo chu kỳ; PR mở ra hoặc push commit mới
        là tự chấm, verdict + dấu ✓/✗ tự lên GitHub — không ai phải bấm gì.</li>
        <li><b>Sổ cái verdict:</b> mọi kết luận vào sổ append-only, có trang truy vết cho kiểm soát/kiểm toán.
        Khâu review vốn không để lại vết — giờ vết tự sinh.</li>
        <li><b>Thang tin cậy tác giả:</b> track record per maker do máy đếm từ sổ cái (tỷ lệ PASS vòng đầu,
        số lần bị chặn bởi High). Điểm tin cậy để <b>nhìn</b>, không để <b>nới</b>: tác giả điểm cao đến đâu
        thì cổng vẫn chấm nghiêm như nhau.</li>
        <li><b>MCP:</b> agent khác gọi checker như gọi một đồng nghiệp — giao PR, chờ verdict, đọc finding —
        qua giao thức chuẩn, không cần biết nội bộ CheckMate.</li>
      </ul>
    </section>

    <section id="gioi-han">
      <h2>Giới hạn nói thẳng</h2>
      <p class="tomtat">Một checker đòi người khác trưng bằng chứng thì phải tự khai giới hạn của mình.</p>
      <ul>
        <li><b>PR rất lớn / monorepo</b> — diff hàng nghìn dòng làm probe trải mỏng; hướng xử là trần kích thước diff
        + cấu hình <code>checkmate.yml</code> per-package, chưa phải hôm nay.</li>
        <li><b>Maker chủ đích tấn công checker</b> (prompt injection trong diff/tài liệu) — đã có rào delimiter
        ngẫu nhiên + lưới đếm assert thật, nhưng đây là cuộc rượt đuổi liên tục, không phải bài toán đóng.</li>
        <li><b>Lỗi có sẵn từ trước</b> — tồn tại trên cả hai nhánh — không đổi được verdict: cổng này trả lời
        "PR này có làm hỏng gì không", không phải "toàn bộ codebase có sạch không". Nhưng nó không bị nuốt:
        mục «Quan sát ngoài phạm vi PR» liệt kê từng probe fail-cả-hai-nhánh kèm luật spec nó neo — đầu vào
        để đội mở việc sửa riêng, tách khỏi phán quyết dành cho tác giả PR.</li>
        <li><b>Spec càng rõ, checker càng sắc.</b> Chưa có spec thì vẫn chạy được chế độ đối chứng hai nhánh
        (bắt breaking change), nhưng probe neo-luật cần spec. Vài file markdown mỏng trong <code>specs/</code>
        là đủ khởi động — và đó cũng là kỷ luật tổ chức nên có sẵn.</li>
        <li><b>Tầng chỉ quan sát được sau khi deploy</b> (hạ tầng, tích hợp thật) nằm ngoài sandbox —
        CheckMate đứng trên nền test của repo, không thay thế giám sát production.</li>
        <li><b>Verdict là của máy, quyết định là của người.</b> Merge một PR có cảnh báo Medium là lựa chọn
        có ghi danh — CheckMate bảo đảm lựa chọn đó tỉnh táo và có vết, không bảo đảm nó đúng.</li>
        <li><b>Probe do model sinh, và model có lúc viết hỏng.</b> Có lượt nó viết vỡ cú pháp, có lượt nó
        đoán sai module chứa hàm. Hệ có lưới đỡ — sinh lại kèm đúng thông báo lỗi, và không đủ cơ sở thì
        lượt chấm kết thúc bằng lỗi chứ không ra PASS — nhưng đây là chỗ mong manh nhất, và repo nào có
        spec nói về chính việc xử lý chuỗi hay xác thực thì probe cho nó càng khó viết đúng.</li>
        <li><b>Mỗi lượt chấm tốn vài phút và vài chục nghìn token.</b> Đó là cái giá của việc chạy thật
        trên hai nhánh thay vì đọc diff rồi đoán. Chi phí từng lượt được ghi ngay trong verdict để không
        ai phải suy từ log.</li>
      </ul>
    </section>
  </div>`;

  return shell(
    'Nguyên tắc làm việc — CheckMate',
    `<style>${CSS_DOCS}</style>
     <h1>Nguyên tắc làm việc</h1>
     <p class="sub">Vì sao một verdict của CheckMate đáng tin — và nó không được phép làm gì.</p>
     <div class="docs">${nav}${body}</div>`,
    JS_SPY,
  );
}
