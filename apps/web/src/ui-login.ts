import { CSS, escHtml } from './ui.js';

/**
 * Màn đăng nhập (gói design CCS mục «1. Đăng nhập»).
 *
 * Trang này KHÔNG đi qua `shell()` — nó không có header và sidebar, vì người chưa đăng nhập thì chưa
 * có repo để điều hướng. Nhưng nó dùng CHUNG hằng `CSS`: nền, chữ, accent, phông, khoảng cách và bộ
 * semantic đều đến từ đúng một nguồn. Trước đây trang này tự khai lại cả bảng màu để giữ palette cũ
 * trong khi chờ đổi toàn cục; nay palette đã đổi nên bản sao đó bị gỡ — hai bảng màu song song là
 * cách chắc chắn để một bên trôi đi mà không ai thấy.
 */

export type LoginState = 'moi' | 'sai_mat_khau' | 'phien_het_han' | 'chua_co_tai_khoan';

export interface LoginView {
  trangThai: LoginState;
  /** đường quay lại sau khi đăng nhập — chỉ nhận đường nội bộ */
  tiep?: string;
}

const BANNER: Record<Exclude<LoginState, 'moi'>, { nen: string; chu: string; loi: string }> = {
  sai_mat_khau: {
    nen: 'var(--fail-tint)',
    chu: 'var(--fail-ink)',
    // R11.10 — cùng một câu cho sai tên lẫn sai mật khẩu: nói "không có tài khoản này" là xác nhận
    // tài khoản nào có thật, tức giúp người dò biết mình dò đúng chỗ.
    loi: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  },
  phien_het_han: {
    nen: 'var(--medium-tint)',
    chu: 'var(--medium-ink)',
    loi: 'Phiên làm việc đã hết hạn — đăng nhập lại để tiếp tục.',
  },
  chua_co_tai_khoan: {
    nen: 'var(--medium-tint)',
    chu: 'var(--medium-ink)',
    loi: 'Hệ thống chưa có tài khoản nào. Chủ máy chủ tạo tài khoản đầu tiên bằng lệnh bên dưới.',
  },
};

/** Lớp riêng của màn đăng nhập — dựng trên token, không tự đẻ mã màu. */
const CSS_LOGIN = `
  body { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
    background-color:var(--color-accent-800);
    /* motif bàn cờ mờ — nhắc cái tên mà không ồn ào */
    background-image:conic-gradient(color-mix(in srgb, white 4%, transparent) 90deg, transparent 90deg 180deg,
      color-mix(in srgb, white 4%, transparent) 180deg 270deg, transparent 270deg);
    background-size:168px 168px; }
  .the { width:430px; max-width:100%; background:var(--color-bg); padding:32px;
    box-shadow:var(--shadow-lg); }
  .dau { font-family:var(--font-heading); font-weight:var(--font-heading-weight); font-size:30px;
    letter-spacing:-0.015em; }
  .dau .mate { color:var(--color-accent); }
  .kicker { font-family:var(--font-mono); font-size:11px; letter-spacing:0.1em; text-transform:uppercase;
    color:var(--color-neutral-600); margin-top:4px; }
  .o + .o { margin-top:12px; }
  .banner { padding:10px 12px; font-size:13px; margin-bottom:14px; }
  .chan { margin-top:20px; padding-top:15px; border-top:1px solid var(--color-divider);
    font-size:12px; color:var(--color-neutral-600); }
  code { font:12px/1.5 var(--font-mono); background:var(--color-surface); padding:2px 5px; }
  pre { font:11.5px/1.7 var(--font-mono); background:var(--color-surface); padding:10px 12px;
    overflow-x:auto; margin:9px 0 0; }
`;

export function loginPage(v: LoginView): string {
  const b = v.trangThai === 'moi' ? null : BANNER[v.trangThai];
  const chuaCoTk = v.trangThai === 'chua_co_tai_khoan';

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Đăng nhập — CheckMate</title>
<style>${CSS}${CSS_LOGIN}</style></head>
<body>
  <div class="the">
    <div class="dau">Check<span class="mate">Mate</span> ♞</div>
    <div class="kicker">Checker độc lập trước nút merge</div>
    <div class="hr"></div>
    ${b ? `<div class="banner" style="background:${b.nen};color:${b.chu}">${escHtml(b.loi)}</div>` : ''}
    ${
      chuaCoTk
        ? `<p style="font-size:13px;color:var(--color-neutral-600);margin:0">Chạy trên máy chủ, rồi tải lại trang:</p>
    <pre>npm run tai-khoan -- them &lt;tên&gt; --vai duyet_cong</pre>
    <p class="chan" style="margin-top:15px">Ai vào được máy chủ thì đã có quyền cao hơn mọi thứ giao diện cấp được — nên vòng đời tài khoản nằm ở dòng lệnh, không nằm ở đây.</p>`
        : `<form method="post" action="/login" autocomplete="on">
      ${v.tiep ? `<input type="hidden" name="tiep" value="${escHtml(v.tiep)}">` : ''}
      <div class="o field">
        <label for="ten">Tên đăng nhập</label>
        <input class="input" id="ten" name="ten" type="text" required autofocus autocapitalize="none" autocomplete="username">
      </div>
      <div class="o field">
        <label for="mk">Mật khẩu</label>
        <input class="input" id="mk" name="mk" type="password" required autocomplete="current-password">
      </div>
      <button class="btn btn-primary btn-block" type="submit" id="nut">Đăng nhập</button>
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
