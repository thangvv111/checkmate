import { escHtml } from './ui.js';

/**
 * Màn đăng nhập (specs/R11, gói design CCS mục «1. Đăng nhập»).
 *
 * Theo CẤU TRÚC của gói design — card hẹp, wordmark, kicker mono, hr, banner trạng thái tại chỗ, câu
 * khẩu quyết ở chân — nhưng giữ PALETTE của giao diện hiện tại. Gói design dùng accent đỏ cho toàn bộ
 * SPA; đổi màu ở đúng một trang trong khi mọi trang khác còn teal thì được một trang đẹp và một sản
 * phẩm lệch. L4 đổi palette toàn cục một lần, trang này đi theo.
 */

export type TrangThaiLogin = 'moi' | 'sai_mat_khau' | 'phien_het_han' | 'chua_co_tai_khoan';

export interface LoginView {
  trangThai: TrangThaiLogin;
  /** đường quay lại sau khi đăng nhập — chỉ nhận đường nội bộ */
  tiep?: string;
}

const BANNER: Record<Exclude<TrangThaiLogin, 'moi'>, { mau: string; nen: string; chu: string }> = {
  sai_mat_khau: {
    mau: 'var(--fail)',
    nen: 'var(--fail-soft)',
    // R11.10 — cùng một câu cho sai tên lẫn sai mật khẩu: nói "không có tài khoản này" là xác nhận
    // tài khoản nào có thật, tức giúp người dò biết mình dò đúng chỗ.
    chu: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  },
  phien_het_han: {
    mau: 'var(--amber)',
    nen: 'var(--amber-soft)',
    chu: 'Phiên làm việc đã hết hạn — đăng nhập lại để tiếp tục.',
  },
  chua_co_tai_khoan: {
    mau: 'var(--amber)',
    nen: 'var(--amber-soft)',
    chu: 'Hệ thống chưa có tài khoản nào. Chủ máy chủ tạo tài khoản đầu tiên bằng lệnh bên dưới.',
  },
};

export function trangLogin(v: LoginView): string {
  const b = v.trangThai === 'moi' ? null : BANNER[v.trangThai];
  const chuaCoTk = v.trangThai === 'chua_co_tai_khoan';
  const o = 'width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:7px;font-size:14px;box-sizing:border-box';

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Đăng nhập — CheckMate</title>
<style>
  :root { --bg:#F2F5F4; --surface:#fff; --ink:#15242A; --muted:#5C6E74; --line:#DDE4E2;
    --teal:#0B6E66; --teal-soft:#DFEEEA; --fail:#A83A2C; --fail-soft:#F7E5E1; --amber:#96590F; --amber-soft:#F6ECDC; }
  * { box-sizing:border-box }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:var(--teal); color:var(--ink); font:15px/1.6 "Segoe UI",system-ui,sans-serif;
    /* motif bàn cờ mờ — nhắc cái tên mà không ồn ào */
    background-image:
      linear-gradient(45deg, rgba(255,255,255,.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.04) 75%),
      linear-gradient(45deg, rgba(255,255,255,.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.04) 75%);
    background-size:112px 112px; background-position:0 0, 56px 56px; padding:24px; }
  .the { width:430px; max-width:100%; background:var(--surface); padding:30px 30px 24px;
    box-shadow:0 18px 44px rgba(0,0,0,.22); }
  .dau { font-size:29px; font-weight:700; letter-spacing:-.02em; }
  .dau .mate { color:var(--teal); }
  .kicker { font:11.5px/1.5 Consolas,monospace; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); margin-top:5px; }
  hr { border:0; border-top:2px solid var(--ink); margin:17px 0 19px; }
  label { display:block; font-size:12px; color:var(--muted); margin-bottom:4px; }
  .o + .o { margin-top:13px; }
  button { width:100%; margin-top:19px; background:var(--teal); color:#fff; border:0; border-radius:7px;
    padding:11px 16px; font-size:14px; font-weight:600; cursor:pointer; text-align:left; }
  button:disabled { opacity:.6; cursor:default; }
  .banner { border-radius:7px; padding:9px 12px; font-size:13px; margin-bottom:17px; }
  .chan { margin-top:20px; padding-top:15px; border-top:1px solid var(--line); font-size:12px; color:var(--muted); }
  code { font:12px/1.5 Consolas,monospace; background:var(--bg); padding:2px 5px; border-radius:4px; }
  pre { font:11.5px/1.7 Consolas,monospace; background:var(--bg); padding:10px 12px; border-radius:6px;
    overflow-x:auto; margin:9px 0 0; }
</style></head>
<body>
  <div class="the">
    <div class="dau">Check<span class="mate">Mate</span> ♞</div>
    <div class="kicker">Checker độc lập trước nút merge</div>
    <hr>
    ${b ? `<div class="banner" style="background:${b.nen};color:${b.mau}">${escHtml(b.chu)}</div>` : ''}
    ${
      chuaCoTk
        ? `<p style="font-size:13px;color:var(--muted);margin:0">Chạy trên máy chủ, rồi tải lại trang:</p>
    <pre>npm run tai-khoan -- them &lt;tên&gt; --vai duyet_cong</pre>
    <p class="chan" style="margin-top:15px">Ai vào được máy chủ thì đã có quyền cao hơn mọi thứ giao diện cấp được — nên vòng đời tài khoản nằm ở dòng lệnh, không nằm ở đây.</p>`
        : `<form method="post" action="/login" autocomplete="on">
      ${v.tiep ? `<input type="hidden" name="tiep" value="${escHtml(v.tiep)}">` : ''}
      <div class="o">
        <label for="ten">Tên đăng nhập</label>
        <input id="ten" name="ten" type="text" required autofocus autocapitalize="none" autocomplete="username" style="${o}">
      </div>
      <div class="o">
        <label for="mk">Mật khẩu</label>
        <input id="mk" name="mk" type="password" required autocomplete="current-password" style="${o}">
      </div>
      <button type="submit" id="nut">Đăng nhập</button>
    </form>
    <div class="chan">Tên đăng nhập sẽ được ghi vào sổ hành động cổng — sổ đó chỉ ghi thêm, không sửa được.</div>`
    }
  </div>
  ${
    chuaCoTk
      ? ''
      : `<script>
    // Đổi nhãn nút lúc gửi: lần đăng nhập tốn vài trăm mili giây vì hàm băm cố ý chậm, không phải vì mạng
    document.querySelector('form').addEventListener('submit', function () {
      var n = document.getElementById('nut');
      n.disabled = true; n.textContent = 'Đang xác thực…';
    });
  </script>`
  }
</body></html>`;
}
