import { shell } from './ui.js';

/**
 * Thư viện probe — màn CÓ thiết kế, CHƯA có đường đọc dữ liệu.
 *
 * Gói design CCS vẽ màn này đầy đủ (dải hành vi 20 ô, bộ lọc, trạng thái rỗng). Thứ chưa có là API:
 * README của gói ghi rõ backend làm sau khi chốt design.
 *
 * Vì sao KHÔNG dựng màn thật rồi cho nó hiện trạng thái rỗng của gói («thư viện dựng dần từ các
 * lượt chấm trên repo này»): câu đó nghĩa là ĐÃ TRA, CHƯA CÓ GÌ. Sự thật ở đây là CHƯA HỀ TRA — thư
 * viện đang tích luỹ thật trong `probes-lib/` qua từng lượt chấm, chỉ là chưa có đường đưa nó lên
 * màn hình. Mượn trạng thái rỗng để khoả lấp chỗ chưa dựng đúng là thứ mà luật «rỗng ≠ hỏng» của
 * chính sản phẩm này cấm; làm thế thì lưới của mình mất nghĩa.
 */
export function probesPage(nguoi = ''): string {
  return shell(
    'Thư viện probe — CheckMate',
    `<h1>Thư viện probe</h1>
<p class="sub">Màn này chưa dựng xong — và đây là lý do, không phải một trang chờ.</p>

<div class="card" style="max-width:720px;border-left:4px solid var(--medium);background:var(--medium-tint)">
  <div class="card-kicker" style="color:var(--medium-ink)">Chưa dựng</div>
  <p style="margin:0 0 10px"><b>Vì sao:</b> giao diện đã có thiết kế đầy đủ trong gói design, nhưng
  <b>đường đọc dữ liệu chưa dựng</b> — chưa có API trả thư viện probe ra cho trang web. Không có nguồn
  thì không có gì để bày.</p>
  <p style="margin:0">Trang này cố ý <b>không</b> hiện câu «chưa có probe nào». Câu đó nghĩa là đã tra
  và thư viện rỗng; sự thật là chưa tra lần nào. Một màn rỗng trông giống một màn chưa dựng là chỗ
  người dùng ngồi đợi thứ không bao giờ tới.</p>
</div>

<div class="card" style="max-width:720px;margin-top:14px">
  <div class="card-kicker">Trong lúc chờ</div>
  <p style="margin:0">Thư viện <b>vẫn đang tích luỹ thật</b> sau mỗi lượt chấm — probe được giữ lại
  nằm trong thư mục <code>probes-lib/</code> trên máy chủ, tách theo repo. Nó không mất đi vì màn này
  chưa có; chỉ là chưa có cửa sổ nhìn vào.</p>
</div>

<p class="goiy" style="margin-top:14px">Xem <a href="/lich-su">lịch sử chạy</a> để biết probe nào đã
chạy trong từng lượt chấm.</p>`,
    '',
    { muc: 'probes', nguoi },
  );
}
