import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chuanMuc } from '../../../packages/shared/src/types.js';
import type { Finding, Verdict } from '../../../packages/shared/src/types.js';
import { MODE, readConfig } from './config.js';
import type { RunMeta, StoredEvent } from './runs.js';
import { JS_PROVIDER } from './ui-provider.js';
import { JS_REPO } from './ui-repo.js';

/**
 * Phiên bản hiện ở chân sidebar — đọc từ package.json để không trôi khỏi bản thật.
 *
 * Tìm theo vị trí của CHÍNH MODULE NÀY, không theo GOC: GOC là gốc DỮ LIỆU và được phép trỏ chỗ
 * khác (test dựng gốc riêng để không đụng dữ liệu thật). Lấy package.json theo GOC thì hễ ai đặt
 * CHECKMATE_GOC là chân sidebar im lặng tụt về «v?» — đã thấy đúng như vậy khi mở thử.
 */
const PHIEN_BAN: string = (() => {
  let d = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      const v = (JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')) as { version?: string }).version;
      if (v) return v;
    } catch {
      /* leo tiếp lên thư mục cha */
    }
    d = dirname(d);
  }
  return '?';
})();

export const CSS = `
/* ═══════════════════════════════════════════════════════════════════════════
   1. MODERNIST — chép từ design-ccs/styles.css (nguồn: Claude Design project
      Modernist a23baac0, kéo về 27/08/2026). Đừng sửa tay ở đây: sửa gói rồi
      chép lại, nếu không hai bên trôi khỏi nhau mà không ai thấy.
   ═════════════════════════════════════════════════════════════════════════ */
@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap");

:root {
  --color-bg: #f3f2f2;
  --color-surface: #eae9e9;
  --color-text: #201e1d;
  --color-accent: #ec3013;
  --color-accent-2: #e15b47;
  --color-divider: color-mix(in srgb, #201e1d 40%, transparent);

  --color-neutral-100: #f8f4f4;
  --color-neutral-200: #eae7e7;
  --color-neutral-300: #d7d3d3;
  --color-neutral-400: #bab6b6;
  --color-neutral-500: #9b9797;
  --color-neutral-600: #7d7979;
  --color-neutral-700: #605d5d;
  --color-neutral-800: #444141;
  --color-neutral-900: #2d2b2b;

  --color-accent-100: #fff2ef;
  --color-accent-200: #ffe0d9;
  --color-accent-300: #ffc4b8;
  --color-accent-400: #ff9783;
  --color-accent-500: #ff563c;
  --color-accent-600: #dd2b0f;
  --color-accent-700: #ae1800;
  --color-accent-800: #7c1405;
  --color-accent-900: #4d170e;

  --font-heading: "Archivo", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-heading-weight: 800;
  --font-body: "Archivo", system-ui, -apple-system, "Segoe UI", sans-serif;
  /* IBM Plex Mono không nằm trong gói Modernist — template CCS nạp riêng.
     Fallback thật: prod chạy sau nginx, không giả định mạng ra ngoài luôn thông. */
  --font-mono: "IBM Plex Mono", Consolas, "Courier New", monospace;

  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;

  --radius-sm: 0px; --radius-md: 0px; --radius-lg: 0px;
  /* Pill là ngoại lệ radius DUY NHẤT của hệ — Modernist radius 0 mọi nơi. */
  --radius-pill: 99px;

  --shadow-sm: 0 1px 2px color-mix(in srgb, #2d2b2b 14%, transparent);
  --shadow-md: 0 3px 10px color-mix(in srgb, #2d2b2b 16%, transparent);
  --shadow-lg: 0 12px 32px color-mix(in srgb, #2d2b2b 22%, transparent);
}

*, *::before, *::after { box-sizing: border-box; }
body { margin:0; background:var(--color-bg); color:var(--color-text);
  font-family:var(--font-body); font-size:15px; line-height:1.55; font-weight:400; }
h1, h2, h3, h4, h5, h6 { font-family:var(--font-heading); font-weight:var(--font-heading-weight);
  line-height:1.12; letter-spacing:-0.015em; margin:0 0 var(--space-2); }
h1 { font-size:42px; } h2 { font-size:32px; } h3 { font-size:25px; }
h4 { font-size:20px; } h5 { font-size:16px; }
h6 { font-size:13px; letter-spacing:0.08em; text-transform:uppercase; }
p { margin:0 0 var(--space-3); }
a { color:var(--color-accent); text-underline-offset:3px; }
img { display:block; max-width:100%; }
.text-muted { color:color-mix(in srgb, var(--color-text) 55%, transparent); }
:focus { outline:none; }
:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }
::selection { background:color-mix(in srgb, var(--color-accent) 30%, transparent); }

.hr { height:2px; border:0; margin:var(--space-4) 0; background:var(--color-divider); }

.btn { display:inline-flex; align-items:center; justify-content:center; gap:6px;
  cursor:pointer; text-decoration:none; font-family:var(--font-heading);
  font-weight:var(--font-heading-weight); font-size:14px; line-height:1.2;
  color:var(--color-text); background:transparent; border:1px solid transparent;
  padding:var(--space-2) calc(var(--space-3) * 1.2); border-radius:var(--radius-md); }
.btn:disabled { opacity:0.45; cursor:not-allowed; }
.btn-primary { background:var(--color-accent); color:var(--color-bg); }
.btn-primary:hover { background:var(--color-accent-600); }
.btn-primary:active { background:var(--color-accent-700); }
.btn-secondary { border-color:var(--color-divider); }
.btn-secondary:hover { background:color-mix(in srgb, var(--color-text) 7%, transparent); }
.btn-secondary:active { background:color-mix(in srgb, var(--color-text) 14%, transparent); }
.btn-ghost { color:var(--color-accent); padding-inline:var(--space-1); }
.btn-ghost:hover { background:color-mix(in srgb, var(--color-accent) 10%, transparent); }
.btn-ghost:active { background:color-mix(in srgb, var(--color-accent) 18%, transparent); }
.btn-icon { width:36px; height:36px; padding:0; }
.btn-block { width:100%; margin-top:var(--space-2); justify-content:flex-start; text-align:left; }

.field > label { display:block; font-size:12px; margin-bottom:5px;
  color:color-mix(in srgb, var(--color-text) 70%, transparent); }
.input { width:100%; min-height:36px; padding:6px 10px; font:inherit; font-size:14px;
  color:var(--color-text); caret-color:var(--color-accent); background:var(--color-surface);
  border:1px solid var(--color-divider); border-radius:var(--radius-md); }
.input:hover { border-color:color-mix(in srgb, var(--color-text) 45%, transparent); }
.input:focus-visible { border-color:var(--color-accent); outline-offset:0; }
textarea.input { min-height:90px; resize:vertical; }
.seg { display:inline-flex; overflow:hidden; border:1px solid var(--color-divider);
  border-radius:var(--radius-md); }
.seg-opt { display:inline-flex; align-items:center; gap:6px; padding:7px 12px;
  font-size:13px; cursor:pointer; }
.seg-opt + .seg-opt { border-left:1px solid var(--color-divider); }
.seg-opt:has(input:checked) { background:var(--color-accent); color:var(--color-bg); }
.seg-opt:not(:has(input:checked)):hover { background:color-mix(in srgb, var(--color-text) 7%, transparent); }
.seg-opt input { position:absolute; opacity:0; width:0; height:0; pointer-events:none; }

.card { display:flex; flex-direction:column; gap:var(--space-2); padding:var(--space-3);
  border-radius:var(--radius-md); background:var(--color-surface); }
.card-kicker { font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-accent); }
.card-title { font-family:var(--font-heading); font-weight:var(--font-heading-weight);
  font-size:17px; line-height:1.2; }
.card-body { margin:0; font-size:13px; opacity:0.8; flex:1; }
.card-meta { display:flex; align-items:center; gap:6px; font-size:11px;
  color:color-mix(in srgb, var(--color-text) 50%, transparent); }
.elev-sm { box-shadow:var(--shadow-sm); }
.elev-md { box-shadow:var(--shadow-md); }
.elev-lg { box-shadow:var(--shadow-lg); }

.tag { display:inline-flex; align-items:center; font-size:11px; letter-spacing:0.02em;
  padding:3px 10px; border-radius:calc(var(--radius-md) * 0.75); }
.tag-accent { background:var(--color-accent-100); color:var(--color-accent-800); }
.tag-neutral { background:var(--color-neutral-100); color:var(--color-neutral-800); }
.tag-outline { border:1px solid var(--color-accent); color:var(--color-accent); }

.tag-accent-2 { background:var(--color-accent-2-100); color:var(--color-accent-2-800); }
.grayscale { filter:grayscale(1) contrast(1.08); }
.radio { display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; }
.radio input { position:absolute; opacity:0; width:0; height:0; pointer-events:none; }
.radio .dot { width:16px; height:16px; flex:none; border-radius:50%; border:1.5px solid var(--color-divider); }
.radio:hover .dot { border-color:var(--color-accent); }
.radio input:checked + .dot { border-color:var(--color-accent); background:var(--color-accent);
  box-shadow:inset 0 0 0 4px var(--color-bg); }

.nav { display:flex; align-items:center; gap:var(--space-4);
  padding:var(--space-3) var(--space-4); border-bottom:2px solid var(--color-divider); }
.nav-brand { font-family:var(--font-heading); font-weight:var(--font-heading-weight);
  font-size:18px; margin-right:auto; }
.nav a { color:inherit; text-decoration:none; font-size:14px; }
.nav a:hover, .nav a[aria-current='page'] { color:var(--color-accent); }

.table { width:100%; border-collapse:collapse; font-size:14px; }
.table th { text-align:left; font-size:11px; letter-spacing:0.08em; text-transform:uppercase;
  color:color-mix(in srgb, var(--color-text) 60%, transparent);
  padding:var(--space-2); border-bottom:2px solid var(--color-divider); }
.table td { padding:var(--space-2); border-bottom:1px solid var(--color-divider); }
.table tbody tr:hover { background:color-mix(in srgb, var(--color-text) 4%, transparent); }

.dialog-backdrop { position:fixed; inset:0; display:grid; place-items:center;
  padding:var(--space-4); background:color-mix(in srgb, var(--color-neutral-900) 50%, transparent); }
.dialog { width:min(440px,100%); display:flex; flex-direction:column; gap:var(--space-3);
  padding:var(--space-4); border-radius:var(--radius-lg); background:var(--color-surface);
  box-shadow:var(--shadow-lg); }
.dialog-title { font-family:var(--font-heading); font-weight:var(--font-heading-weight); font-size:20px; }
.dialog-body { font-size:14px; opacity:0.85; }
.dialog-actions { display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2); }

/* ═══════════════════════════════════════════════════════════════════════════
   2. SEMANTIC CHECKMATE — KHÔNG thuộc Modernist, KHÔNG gộp vào accent.
      Ba màu này mang NGHĨA NGHIỆP VỤ: chúng nói verdict và mức severity.
      --color-accent (#ec3013) và --fail (#D0342C) đều là đỏ và trông gần
      giống nhau; gộp lại thì một lần đổi look kéo theo đổi NGHĨA của verdict
      — nút «bấm đi» và nhãn «hỏng rồi» cùng đổi màu. Đây là chín mã hex DUY
      NHẤT được phép hard-code trong giao diện; lưới token canh phần còn lại.
   ═════════════════════════════════════════════════════════════════════════ */
:root {
  --pass:       #0E9F7E;  --pass-ink:   #08655A;  --pass-tint:   #E2F3EE;
  --fail:       #D0342C;  --fail-ink:   #A3271F;  --fail-tint:   #F9E4E2;
  --medium:     #C77A16;  --medium-ink: #8F5810;  --medium-tint: #F7ECDA;
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LỚP RIÊNG CỦA APP — dựng TRÊN token, không tự đẻ mã màu.
      Bí danh dưới đây giữ tên biến cũ đang dùng rải rác trong các file ui-*.
      Giữ bí danh thay vì đổi hàng loạt: đổi tên biến là một việc khác, và
      trộn hai việc vào một commit thì hỏng cái nào cũng không biết tại đâu.
   ═════════════════════════════════════════════════════════════════════════ */
:root {
  --bg: var(--color-bg);
  --surface: var(--color-bg);
  --ink: var(--color-text);
  --muted: var(--color-neutral-600);
  --line: var(--color-divider);
  --teal: var(--pass);
  --teal-soft: var(--pass-tint);
  --fail-soft: var(--fail-tint);
  --amber: var(--medium);
  --amber-soft: var(--medium-tint);
}

.mono { font-family:var(--font-mono); }
.repo-row { display:flex; align-items:center; gap:10px; padding:9px 12px; margin:6px 0;
  border:1px solid var(--color-divider); background:var(--color-surface); }
.stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:1px;
  margin-bottom:18px; background:var(--color-divider); border:1px solid var(--color-divider);
  overflow:hidden; }
.wrap { max-width:1240px; margin:0 auto; padding:0 var(--space-8); }
main.wrap { padding-top:26px; padding-bottom:64px; }
.sub { color:var(--color-neutral-600); font-size:13.5px; margin:0 0 18px; }
.goiy { font-size:12.5px; color:var(--color-neutral-600); margin:6px 0 10px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:var(--space-3); }
/* — vỏ ứng dụng: header 2px rule dưới · sidebar 210px 2px rule phải · main 1240 — */
body.app { display:flex; flex-direction:column; min-height:100vh; }
.app-hd { background:var(--color-bg); position:sticky; top:0; z-index:40; gap:14px;
  view-transition-name:cm-hd; }
.wordmark { font-family:var(--font-heading); font-weight:var(--font-heading-weight);
  font-size:18px; letter-spacing:-0.015em; color:var(--color-text); text-decoration:none; }
.wordmark .mate { color:var(--color-accent); }
.hd-space { flex:1; }
.hd-menu { position:relative; }
.repo-btn { font-family:var(--font-mono); font-weight:500; font-size:13px; white-space:nowrap; }
.user-btn { gap:8px; font-size:13px; }
.ava { width:22px; height:22px; flex:none; background:var(--color-text); color:var(--color-bg);
  display:inline-grid; place-items:center; font-family:var(--font-mono); font-size:10px; }
.hd-drop { position:absolute; top:calc(100% + 4px); min-width:280px; z-index:50;
  background:var(--color-bg); border:1px solid var(--color-divider); box-shadow:var(--shadow-md);
  display:flex; flex-direction:column; }
#repo-sw .hd-drop { left:0; }
#user-mn .hd-drop { right:0; min-width:220px; }
.hd-drop button, .hd-drop a { display:block; width:100%; text-align:left; padding:10px 14px;
  background:none; border:0; border-radius:0; cursor:pointer; font:inherit; font-size:14px;
  color:var(--color-text); text-decoration:none; }
.hd-drop[hidden] { display:none; }
.hd-drop form { margin:0; }
.hd-drop button:hover, .hd-drop a:hover { background:color-mix(in srgb, var(--color-text) 6%, transparent); }
.hd-drop-them { border-top:1px solid var(--color-divider); color:var(--color-accent); }
.hd-drop-trong { padding:10px 14px; font-size:13px; color:var(--color-neutral-600); }
.truc { font-family:var(--font-mono); font-size:12px; text-decoration:none; padding:4px 10px;
  border:1px solid var(--color-divider); white-space:nowrap; }
.truc.on { color:var(--pass-ink); background:var(--pass-tint); border-color:var(--pass); }
.truc.off { color:var(--color-neutral-600); }
.app-body { flex:1; display:flex; align-items:stretch; }
.app-nav { width:210px; flex:none; border-right:2px solid var(--color-divider);
  padding:16px 12px; display:flex; flex-direction:column; gap:2px; view-transition-name:cm-nav; }
.app-nav a { display:block; padding:8px 10px; text-align:left; font-size:14px;
  font-family:var(--font-heading); font-weight:600; color:var(--color-text); text-decoration:none; }
.app-nav a:hover { background:color-mix(in srgb, var(--color-text) 7%, transparent); }
.app-nav a.on { background:var(--color-accent); color:var(--color-bg); }
.app-nav-day { flex:1; }
.app-nav-chan { font-family:var(--font-mono); font-size:10px; color:var(--color-neutral-500);
  padding:0 10px; }
.app-main { flex:1; min-width:0; max-width:1240px; padding:26px 32px 64px; }

/* Chuyển cảnh — hai khai báo tĩnh, không thư viện. Trình duyệt chưa hỗ trợ bỏ qua cả khối này và
   trang chạy y như cũ: mất hiệu ứng, không mất nội dung. Header và sidebar mang tên riêng để chúng
   đứng yên trong lúc vùng nội dung đổi. */
@view-transition { navigation: auto; }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation:none; } }

.badge { display:inline-block; font-size:10.5px; font-weight:650; letter-spacing:.05em;
  text-transform:uppercase; padding:2px 8px; border-radius:var(--radius-pill); margin-bottom:8px; }
.b-code { background:var(--pass-tint); color:var(--pass-ink); }
.b-doc { background:var(--medium-tint); color:var(--medium-ink); }

button { background:var(--color-accent); color:var(--color-bg); border:0;
  border-radius:var(--radius-md); padding:8px 16px; font-family:var(--font-heading);
  font-size:13.5px; font-weight:var(--font-heading-weight); cursor:pointer;
  text-decoration:none; display:inline-block; }
button:hover { background:var(--color-accent-600); }
button:disabled { background:var(--color-neutral-400); cursor:not-allowed; }
.btn.phu { background:transparent; color:var(--color-text); border:1px solid var(--color-divider); }
.btn.phu:hover { background:color-mix(in srgb, var(--color-text) 7%, transparent); }
button.phu-nho { background:transparent; color:var(--muted);
  border:1px solid var(--color-divider); font-weight:600; }
button.phu-nho:hover { color:var(--color-text);
  background:color-mix(in srgb, var(--color-text) 7%, transparent); }

textarea { width:100%; min-height:150px; border:1px solid var(--color-divider);
  border-radius:var(--radius-md); padding:12px; font:13px/1.5 var(--font-mono);
  background:var(--color-surface); color:var(--color-text); }

.stages { list-style:none; padding:0; margin:0 0 20px; }
.stages li { padding:8px 12px 8px 34px; position:relative; color:var(--muted);
  border-left:2px solid var(--color-divider); }
.stages li.on { color:var(--color-text); font-weight:600; border-left-color:var(--color-accent); }
.stages li.done { color:var(--color-text); border-left-color:var(--pass); }
.stages li.on::before { content:""; position:absolute; left:10px; top:13px; width:12px; height:12px;
  border-radius:50%; border:2px solid var(--color-accent); border-top-color:transparent;
  animation:quay 0.9s linear infinite; }
.stages li.done::before { content:"✓"; position:absolute; left:10px; top:8px; color:var(--pass);
  font-weight:700; }
@keyframes quay { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .stages li.on::before { animation:none; } }
.logline { font-size:12px; color:var(--muted); padding:1px 12px 1px 34px;
  font-family:var(--font-mono); white-space:pre-wrap; }

.finding { border-left:4px solid var(--fail); background:var(--color-bg);
  border-top:1px solid var(--color-divider); border-right:1px solid var(--color-divider);
  border-bottom:1px solid var(--color-divider); padding:13px 16px; margin:12px 0; }
.finding.sev-medium { border-left-color:var(--medium); }
.finding.sev-low { border-left-color:var(--color-neutral-500); }
.finding .sev { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
  color:var(--fail-ink); }
.finding.sev-medium .sev { color:var(--medium-ink); }
.finding.sev-low .sev { color:var(--color-neutral-700); }
.finding h3 { margin:3px 0 6px; font-size:14.5px; }
.finding .row { font-size:13px; margin:3px 0; }
.finding .row b { color:var(--muted); font-weight:600; }

.cong { border:1px solid var(--color-divider); background:var(--color-bg);
  padding:18px 22px; margin:18px 0; }
.cong h3 { margin:0 0 8px; font-size:16px; }
.cong .canhbao { border:1px solid var(--color-divider); border-left:4px solid var(--medium);
  padding:8px 12px; margin:8px 0; font-size:13px; display:flex; gap:9px; align-items:flex-start; }
.cong .khoa { color:var(--fail-ink); font-size:13px; font-weight:600; }
.cong form.inline { display:inline-block; margin:8px 12px 0 0; vertical-align:top; }
.cong input[type=text] { padding:7px 10px; border:1px solid var(--color-divider);
  border-radius:var(--radius-md); width:280px; font-size:13px; background:var(--color-surface); }

.ev { background:var(--color-surface); border:1px solid var(--color-divider); padding:9px 12px;
  margin-top:8px; font-size:12.5px; }
.ev .q { font-family:var(--font-body); font-style:italic; }
.ev .loc { color:var(--muted); font-size:11.5px; }
.ev pre { margin:4px 0 0; white-space:pre-wrap; font:11.5px/1.5 var(--font-mono); overflow-x:auto; }

.verdict { padding:20px 24px; margin:20px 0; display:none; }
.verdict.PASS { background:var(--pass); color:var(--color-bg); display:block; }
.verdict.FAIL { background:var(--fail); color:var(--color-bg); display:block; }
.verdict .kq { font-family:var(--font-heading); font-weight:var(--font-heading-weight);
  font-size:30px; letter-spacing:.04em; }
.verdict .chitiet { font-size:13px; opacity:.92; margin-top:4px; font-family:var(--font-mono); }

table.runs { border-collapse:collapse; width:100%; background:var(--color-bg); font-size:13.5px; }
table.runs th { text-align:left; font-size:11px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--muted); padding:9px 13px; border-bottom:2px solid var(--color-divider); }
table.runs td { padding:9px 13px; border-bottom:1px solid var(--color-divider); }
.vd-pill { font-weight:700; }
.vd-PASS { color:var(--pass-ink); }
.vd-FAIL { color:var(--fail-ink); }

.err { background:var(--fail-tint); border-left:4px solid var(--fail); padding:11px 15px;
  margin:14px 0; display:none; }

/* — Dashboard: hàng đợi PR theo lưới cột của gói — */
.dash-kicker { color:var(--color-accent); margin:0 0 2px; }
.dash-sub { color:color-mix(in srgb, var(--color-text) 55%, transparent); font-size:13px; margin:0; }
.q-dau { display:flex; align-items:baseline; gap:12px; }
.q-dem { font-family:var(--font-mono); font-size:12px; color:var(--color-neutral-600); }
.q-grid { display:grid; grid-template-columns:52px minmax(220px,1.5fr) 1.1fr 90px 170px 290px; gap:12px; }
.q-head { padding:8px; margin-top:8px; border-bottom:2px solid var(--color-divider);
  font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--color-neutral-600); }
.q-row { align-items:center; padding:10px 8px; border-bottom:1px solid var(--color-divider); }
.q-so { font-family:var(--font-mono); font-size:13px; }
.q-tieu { display:block; font-weight:600; font-size:14px; }
.q-skill { font-family:var(--font-mono); font-size:11px; color:var(--color-neutral-600); }
.q-nhanh { font-family:var(--font-mono); font-size:12px; }
.q-tacgia { font-size:13px; }
.q-pill { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.q-nut { display:flex; gap:8px; justify-content:flex-end; align-items:center; }
.q-nut .btn { font-size:13px; padding:6px 12px; }
.q-nut form { margin:0; }
/* Hàng đợi SẠCH — dòng mono, cố ý không giống một lỗi */
.q-trong { padding:36px 0; font-family:var(--font-mono); font-size:13px; color:var(--color-neutral-600); }
/* Không ĐỌC ĐƯỢC hàng đợi — khác hẳn hàng đợi rỗng, và phải nói được cách sửa */
.q-loi { margin-top:20px; padding:16px 18px; display:flex; gap:16px; align-items:center;
  border:2px solid var(--fail); background:var(--color-bg); }
.q-loi-tieu { font-weight:600; }
.q-loi-cach { font-size:13px; margin-top:2px; color:color-mix(in srgb, var(--color-text) 55%, transparent); }

.pill-pass { background:var(--pass-tint); color:var(--pass-ink); }
.pill-fail { background:var(--fail-tint); color:var(--fail-ink); }
.pill-chua { background:var(--color-neutral-100); color:var(--color-neutral-800); }
.pill-merge { background:var(--color-neutral-800); color:var(--color-bg); }
.pill-stale { background:var(--medium-tint); color:var(--medium-ink); font-family:var(--font-mono); font-size:11px; }
.dang-cham { font-family:var(--font-mono); font-size:12px; color:var(--color-neutral-600);
  animation:cmblink 1.4s infinite; }
@keyframes cmblink { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
@media (prefers-reduced-motion: reduce) { .dang-cham { animation:none; } }

.tra-ve-row { display:flex; align-items:center; gap:14px; padding:10px 0;
  border-bottom:1px solid var(--color-divider); }
.tra-ve-row .giua { flex:1; }
.tra-ve-row .ten { display:block; font-weight:600; font-size:14px; }
.tra-ve-row .chu { font-size:12px; color:var(--color-neutral-600); }

.dash-the { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:28px; }
.rc-row { display:flex; gap:10px; align-items:center; padding:6px 0;
  border-bottom:1px solid var(--color-divider); text-decoration:none; color:var(--color-text); }
.rc-row:hover { background:color-mix(in srgb, var(--color-text) 4%, transparent); }
.rc-ten { flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rc-gio { font-family:var(--font-mono); font-size:11px; color:var(--color-neutral-600); }
@media (max-width: 1080px) { .dash-the { grid-template-columns:1fr; }
  .q-grid { grid-template-columns:44px minmax(160px,1.4fr) 1fr 80px 150px 200px; } }

/* — Màn Run: đầu trang, năm bước, finding, verdict, cổng — theo gói CCS — */
.run-hd { display:flex; align-items:flex-end; gap:16px; margin-top:6px; flex-wrap:wrap; }
.run-hd-trai { flex:1; min-width:320px; }
.run-meta { font-family:var(--font-mono); font-size:12px; color:var(--color-neutral-600); margin-top:4px; }
.run-dk { display:flex; gap:8px; align-items:center; }
.run-tt { font-family:var(--font-mono); font-size:11px; color:var(--color-neutral-600); }

/* Thanh điều khiển trình diễn — nhịp canh ở phía trình duyệt, đổi tốc độ không tải lại trang */
.td-bar { display:flex; gap:8px; align-items:center; margin:14px 0 0; padding:8px 12px;
  border:1px solid var(--color-divider); background:var(--color-surface); }
.td-nhan { font-family:var(--font-mono); font-size:11px; letter-spacing:0.08em;
  text-transform:uppercase; color:var(--color-neutral-600); }
.td-toc { display:inline-flex; border:1px solid var(--color-divider); }
.td-toc button { background:none; border:0; border-radius:0; padding:5px 11px; cursor:pointer;
  font-family:var(--font-mono); font-size:12px; color:var(--color-text); }
.td-toc button + button { border-left:1px solid var(--color-divider); }
.td-toc button.on { background:var(--color-accent); color:var(--color-bg); }

/* Năm bước */
.buoc { display:grid; grid-template-columns:40px 1fr; gap:8px; padding:12px 0;
  border-bottom:1px solid var(--color-divider); }
.buoc-mark { font-family:var(--font-mono); font-size:13px; color:var(--color-neutral-500); }
.buoc.on   > .buoc-mark { color:var(--color-accent); animation:cmblink 1.4s infinite; }
.buoc.done > .buoc-mark { color:var(--pass); }
.buoc.loi  > .buoc-mark { color:var(--fail); }
.buoc-dau { display:flex; gap:10px; align-items:baseline; }
.buoc-ten { font-weight:600; font-size:14.5px; }
.buoc-lau { font-family:var(--font-mono); font-size:11px; color:var(--color-neutral-500); }
.buoc-log { margin-top:8px; background:var(--color-neutral-900); padding:10px 14px; }
.buoc-log:empty { display:none; }
.buoc-log .d { display:flex; gap:12px; font-family:var(--font-mono); font-size:12px; line-height:1.75;
  color:var(--color-neutral-200); }
.buoc-log .d > .ts { color:var(--color-neutral-500); flex:none; }
.buoc-log .d > .tx { white-space:pre-wrap; min-width:0; }

/* Cảnh báo đổi CÁCH ĐỌC verdict — phải đứng trước verdict, không phải chú thích cuối */
.ban-canh { margin-top:16px; padding:12px 16px; border:2px solid var(--medium);
  background:var(--medium-tint); color:var(--medium-ink); }
.ban-canh h6 { margin:0 0 4px; color:var(--medium-ink); }
.ban-canh .n { font-size:13px; }
.ban-canh.tra-lai { display:flex; gap:14px; align-items:center; }
.ban-canh.tra-lai .n { flex:1; }

/* Finding */
.fnd { display:flex; margin-top:12px; background:var(--color-bg); border:1px solid var(--color-divider); }
.fnd-vach { width:6px; flex:none; background:var(--fail); }
.fnd.sev-medium > .fnd-vach { background:var(--medium); }
.fnd.sev-low    > .fnd-vach { background:var(--color-neutral-400); }
.fnd-than { flex:1; padding:14px 18px; min-width:0; }
.fnd-dau { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.fnd-ten { font-weight:700; font-size:15px; }
.fnd-gi { font-size:13.5px; margin-top:8px; }
.fnd-hq { font-size:13px; margin-top:6px; }
.fnd-nhan { font-family:var(--font-mono); font-size:10px; letter-spacing:0.08em;
  text-transform:uppercase; color:var(--color-neutral-600); }
.fnd-lenh { font-family:var(--font-mono); font-size:11.5px; color:var(--color-neutral-600); margin-top:8px; }
.fnd-bc { display:grid; grid-template-columns:1fr 1fr; border:1px solid var(--color-divider); margin-top:10px; }
.fnd-bc > div { min-width:0; }
.fnd-bc > div + div { border-left:1px solid var(--color-divider); }
.fnd-bc .dau { font-family:var(--font-mono); font-size:10px; letter-spacing:0.08em;
  text-transform:uppercase; padding:5px 10px; }
.fnd-bc .dau-a { background:var(--pass-tint); color:var(--pass-ink); }
.fnd-bc .dau-b { background:var(--fail-tint); color:var(--fail-ink); }
.fnd-bc .than { padding:10px; font-family:var(--font-mono); font-size:12px; line-height:1.6;
  white-space:pre-wrap; overflow-wrap:anywhere; }

/* Verdict */
.vd { margin-top:24px; display:grid; grid-template-columns:2fr 3fr; border:2px solid var(--color-divider); }
.vd-khoi { padding:24px 22px; display:flex; flex-direction:column; justify-content:center; }
.vd-khoi.PASS { background:var(--pass); color:var(--color-bg); }
.vd-khoi.FAIL { background:var(--fail); color:var(--color-bg); }
.vd-khoi.trong { background:var(--color-neutral-800); color:var(--color-neutral-100); }
.vd-kq { font-family:var(--font-heading); font-weight:var(--font-heading-weight); font-size:54px;
  line-height:1; letter-spacing:-0.02em; }
.vd-khoi.trong .vd-kq { font-size:30px; line-height:1.1; letter-spacing:-0.01em; }
.vd-phu { font-family:var(--font-mono); font-size:12px; margin-top:10px; opacity:0.92; }
.vd-meta { background:var(--color-bg); padding:14px 20px; display:grid;
  grid-template-columns:1fr 1fr; gap:2px 24px; align-content:start; }
.vd-hang { display:flex; justify-content:space-between; gap:10px; padding:6px 0;
  border-bottom:1px solid var(--color-divider); font-size:12.5px; }
.vd-hang > .k { color:color-mix(in srgb, var(--color-text) 55%, transparent); }
.vd-hang > .v { font-family:var(--font-mono); font-size:12px; text-align:right; }
.vd-hang.xam > .v { color:var(--medium-ink); }

/* Thư viện — nối liền dưới verdict */
.thu-vien { border:2px solid var(--color-divider); border-top:none; background:var(--color-bg);
  padding:16px 20px; }
.thu-vien-dau { display:flex; gap:10px; align-items:baseline; }
.thu-vien-dem { font-family:var(--font-mono); font-size:12.5px; font-weight:600; }
.tv-dong { display:flex; gap:8px; align-items:center; padding:6px 0;
  border-bottom:1px solid var(--color-divider); }
.tv-nhanh { font-family:var(--font-mono); font-size:12px; color:var(--color-neutral-500); flex:none; }
.tv-icon { flex:none; font-family:var(--font-mono); }
.tv-dong.khong-nap .tv-icon { color:var(--medium-ink); }
.tv-dong.go-khoi  .tv-icon { color:var(--fail-ink); }
.tv-tx { flex:1; font-family:var(--font-mono); font-size:12.5px; min-width:0; overflow-wrap:anywhere; }

/* Quan sát ngoài phạm vi PR */
.oos { margin-top:16px; padding:12px 16px; border:1px dashed var(--color-neutral-500);
  background:var(--color-surface); }
.oos h6 { margin:0 0 4px; }
.oos .d { font-family:var(--font-mono); font-size:12.5px; line-height:1.7; }

@media (max-width: 1080px) {
  .vd { grid-template-columns:1fr; }
  .vd-meta { grid-template-columns:1fr; }
  .fnd-bc { grid-template-columns:1fr; }
  .fnd-bc > div + div { border-left:0; border-top:1px solid var(--color-divider); }
}

/* — Cổng merge: NỐI LIỀN dưới thẻ verdict, không phải khối rời — */
.cong-o { border:2px solid var(--color-divider); border-top:none; background:var(--color-bg);
  padding:18px 20px; }
.cong-o.chi-doc { border-top:2px solid var(--color-divider); border-style:dashed; margin-top:18px; }
.cong-o.receipt-merge { border-color:var(--pass); background:var(--pass-tint); }
.cong-o.receipt-tra { border-color:var(--medium); background:var(--medium-tint); }
.cong-khoa { display:flex; gap:10px; align-items:flex-start; padding:10px 12px; margin-bottom:12px;
  background:var(--fail-tint); color:var(--fail-ink); font-size:13.5px; }
.cong-tick { display:flex; gap:10px; align-items:flex-start; padding:8px 10px; margin-top:6px;
  border:1px solid var(--color-divider); background:var(--color-surface); cursor:pointer; font-size:13.5px; }
.cong-tick input { margin-top:3px; accent-color:var(--medium); }
.cong-hd { display:flex; gap:16px; align-items:flex-start; margin-top:14px; flex-wrap:wrap; }
.cong-tra { flex:1; min-width:300px; display:flex; gap:8px; }
.cong-goiy { font-size:11px; color:var(--color-neutral-600); margin-top:4px; }

/* — Bảng đối chiếu hai nhánh: chỉ probe KHÔNG pass-cả-hai — */
.dc { border:2px solid var(--color-divider); border-top:none; background:var(--color-bg); padding:16px 20px; }
.dc-dau { display:flex; gap:10px; align-items:baseline; }
.dc-tom { font-family:var(--font-mono); font-size:12.5px; font-weight:600; }
.dc-hang { display:grid; grid-template-columns:46px 96px 116px 1fr 150px; gap:10px; align-items:baseline;
  padding:7px 0; border-bottom:1px solid var(--color-divider); font-size:12.5px; }
.dc-hang.dau { border-bottom:2px solid var(--color-divider); font-family:var(--font-mono);
  font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:var(--color-neutral-600); }
.dc-mui { font-family:var(--font-mono); font-weight:600; }
.dc-hang.hoi_quy .dc-mui, .dc-hang.vi_pham_luat_moi .dc-mui { color:var(--fail-ink); }
.dc-hang.cai_thien .dc-mui { color:var(--pass-ink); }
.dc-hang.ngoai_pham_vi .dc-mui, .dc-hang.nghi_loi_co_san .dc-mui, .dc-hang.nghi_van .dc-mui { color:var(--medium-ink); }
.dc-ma { font-family:var(--font-mono); }
/* Có tooltip thì phải TRÔNG như có — gạch chân chấm là dấu hiệu rẻ nhất và quen nhất. */
.dc-luat, .dc-ten { border-bottom:1px dotted var(--color-neutral-500); cursor:help; }
.dc-ten { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dc-kl { color:color-mix(in srgb, var(--color-text) 60%, transparent); }
.dc-con { font-family:var(--font-mono); font-size:12px; color:var(--color-neutral-600); padding-top:8px; }
@media (max-width: 1080px) { .dc-hang { grid-template-columns:44px 92px 1fr; }
  .dc-hang > .dc-ten, .dc-hang > .dc-kl { grid-column:1 / -1; } }
`;

// W8: mọi chuỗi ngoại lai (PR title từ GitHub, tên file upload, finding do model viết) phải qua đây trước khi vào DOM
export function escHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Mục điều hướng của sidebar — BẢY mục, đúng như gói design CCS khai ở mục «App shell». */
export type NavKey = 'dashboard' | 'hist' | 'ledger' | 'probes' | 'trust' | 'config' | 'rules';

export const NAV_ITEMS: { readonly key: NavKey; readonly nhan: string; readonly duong: string }[] = [
  { key: 'dashboard', nhan: 'Dashboard', duong: '/' },
  { key: 'hist', nhan: 'Lịch sử chạy', duong: '/lich-su' },
  { key: 'ledger', nhan: 'Sổ cái', duong: '/ledger' },
  { key: 'probes', nhan: 'Thư viện probe', duong: '/probes' },
  { key: 'trust', nhan: 'Tin cậy', duong: '/tin-cay' },
  { key: 'config', nhan: 'Cấu hình', duong: '/settings' },
  { key: 'rules', nhan: 'Nguyên tắc', duong: '/docs' },
];

export interface ShellOpts {
  /** mục sidebar đang mở — để đánh dấu đang-chọn */
  muc?: NavKey;
  /** tên người đang đăng nhập; rỗng thì ô danh tính hiện nhãn chung, KHÔNG bịa tên */
  nguoi?: string;
  /** nhãn repo ép sẵn (test / trang lỗi) — thường để trống, shell tự đọc config */
  repoNhan?: string;
}

/**
 * Chuyển cảnh giữa hai trang, bằng đúng thứ trình duyệt có sẵn.
 *
 * Hai khai báo tĩnh, không thư viện, không build step, không router phía máy khách:
 *   - `@view-transition { navigation: auto }` trong hằng CSS — chuyển cảnh cross-document
 *   - speculation rules dưới đây — prerender khi chuột đi vào link sidebar
 *
 * Trình duyệt chưa hỗ trợ thì bỏ qua cả hai và trang chạy Y NHƯ CŨ: mất hiệu ứng, không mất nội
 * dung, không mất chức năng. Đó là điều kiện phải giữ chứ không phải lời hứa miệng — lưới chuyển
 * cảnh canh đúng chỗ đó.
 *
 * Prerender là một LỜI GỌI HTTP THẬT, kèm cookie phiên. Nên nó bị giới hạn vào đúng link trong
 * sidebar: cùng origin, và toàn bộ là điều hướng GET. Mọi hành động đổi trạng thái (merge, trả về
 * dev, đăng xuất) đều là POST, mà speculation rules không áp cho POST — nhưng ranh giới đó phải
 * khai tường minh ở đây chứ không dựa vào may.
 */
const RULE_PRERENDER = JSON.stringify({
  prerender: [{ where: { selector_matches: '.app-nav a' }, eagerness: 'moderate' }],
});

/**
 * Đóng/mở hai menu của header, và đổi repo đang chọn.
 *
 * Đây là lớp tiện, không phải đường sống: không có JS thì menu không bung, nhưng mọi trang vẫn đọc
 * được đủ nội dung và mọi link sidebar vẫn đi đúng chỗ.
 */
const JS_SHELL = `
(function(){
  var mo=null;
  function dong(){
    if(!mo) return;
    mo.querySelector('.hd-drop').hidden=true;
    mo.querySelector('button[aria-haspopup]').setAttribute('aria-expanded','false');
    mo=null;
  }
  document.addEventListener('click',function(e){
    var nut=e.target.closest('.hd-menu > button[aria-haspopup]');
    if(nut){
      var hop=nut.parentElement, dangMo=(mo===hop);
      dong();
      if(!dangMo){ hop.querySelector('.hd-drop').hidden=false; nut.setAttribute('aria-expanded','true'); mo=hop; }
      e.stopPropagation();
      return;
    }
    var b=e.target.closest('[data-repo]');
    if(b){
      b.disabled=true;
      fetch('/api/repo/chon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({github:b.dataset.repo})})
        .then(function(r){ return r.json(); })
        .then(function(k){ if(k.ok){ location.reload(); } else { b.disabled=false; b.textContent=b.dataset.repo+' — '+(k.loi||'không đổi được'); } })
        .catch(function(){ b.disabled=false; });
      return;
    }
    if(!e.target.closest('.hd-drop')) dong();
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') dong(); });
})();`;

export function shell(tieuDe: string, than: string, js = '', opts: ShellOpts = {}): string {
  // Repo đang chọn hiện trên MỌI trang — đọc thẳng config thay vì bắt từng trang truyền xuống
  let repoNhan = opts.repoNhan ?? '';
  let repoKhac: string[] = [];
  let truc: { bat: boolean; chuKy: number } | null = null;
  if (!repoNhan) {
    try {
      const c = readConfig();
      repoNhan = c.repo_dang_chon;
      repoKhac = c.repos.map((r) => r.github).filter((g) => g !== c.repo_dang_chon);
      truc = { bat: c.truc.bat, chuKy: c.truc.chu_ky_giay };
    } catch {
      repoNhan = '';
    }
  }

  const navHtml = NAV_ITEMS.map(
    (n) =>
      `<a href="${n.duong}"${n.key === opts.muc ? ' class="on" aria-current="page"' : ''}>${escHtml(n.nhan)}</a>`,
  ).join('');

  const repoHtml = repoNhan
    ? `<div class="hd-menu" id="repo-sw">
<button type="button" class="btn btn-secondary repo-btn" aria-haspopup="true" aria-expanded="false">${escHtml(repoNhan)} ▾</button>
<div class="hd-drop" hidden>${
        repoKhac.length
          ? repoKhac.map((g) => `<button type="button" data-repo="${escHtml(g)}">${escHtml(g)}</button>`).join('')
          : '<div class="hd-drop-trong">Chỉ có một repo trong danh sách.</div>'
      }<a class="hd-drop-them" href="/settings">＋ Thêm repo…</a></div></div>`
    : '';

  const trucHtml = truc
    ? `<a class="truc ${truc.bat ? 'on' : 'off'}" href="/settings" title="chế độ trực — đổi trong Cấu hình">${
        truc.bat ? `● Trực · ${truc.chuKy}s` : '○ Trực tắt'
      }</a>`
    : '';

  // Chưa biết tên thì hiện nhãn chung — ô danh tính vẫn đúng chỗ, và không bịa ra một cái tên
  const ten = opts.nguoi ?? '';
  const userHtml = `<div class="hd-menu" id="user-mn">
<button type="button" class="btn btn-secondary user-btn" aria-haspopup="true" aria-expanded="false"><span class="ava">${
    ten ? escHtml(ten.slice(0, 2).toUpperCase()) : '··'
  }</span>${ten ? escHtml(ten) : 'Tài khoản'} ▾</button>
<div class="hd-drop" hidden><form method="post" action="/logout"><button type="submit">Đăng xuất</button></form></div></div>`;

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${tieuDe}</title>
<style>${CSS}</style>
<script type="speculationrules">${RULE_PRERENDER}</script></head>
<body class="app">
<header class="nav app-hd">
<a class="wordmark" href="/" title="Về Dashboard">Check<span class="mate">[Mate]♞</span></a>
${repoHtml}<div class="hd-space"></div>${trucHtml}${userHtml}</header>
<div class="app-body">
<nav class="app-nav">${navHtml}<div class="app-nav-day"></div>
<div class="app-nav-chan">chế độ ${MODE} · v${PHIEN_BAN}</div></nav>
<main class="app-main">${than}</main></div>
<script>${JS_SHELL}</script>${js ? `<script>${js}</script>` : ''}</body></html>`;
}

export interface PrDisplay {
  so: number;
  tieuDe: string;
  tacGia: string;
  nhanh: string;
  headSha: string;
  // trạng thái review của ĐÚNG commit đang là head PR (nếu đã chấm)
  daCham?: { runId: string; ketQua: 'PASS' | 'FAIL'; soFinding: number };
  /** verdict ghim một commit CŨ hơn head hiện tại — verdict còn đó nhưng không còn nói về commit này */
  stale?: boolean;
  /** đang có lượt chấm chạy trên PR này — nút khoá để không đẻ hai verdict trùng */
  dangCham?: boolean;
  skill?: 'code' | 'doc';
}

/**
 * Hàng đợi PR — lưới sáu cột đúng như gói design CCS khai.
 *
 * Ba trạng thái PHẢI phân biệt được, vì việc người dùng cần làm ở mỗi trạng thái khác hẳn nhau:
 *   prs = danh sách  → hàng đợi có việc
 *   prs = []         → hàng đợi SẠCH; đây là trạng thái bình thường, không phải lỗi
 *   prs = null       → KHÔNG ĐỌC ĐƯỢC (thiếu token / hết hạn); phải nêu cả nguyên nhân LẪN cách sửa
 *
 * Một màn rỗng trông giống một màn hỏng là chỗ người dùng ngồi đợi thứ không bao giờ tới.
 */
export function prListSection(repoGithub: string, baseBranch: string, prs: PrDisplay[] | null, loiPr: string): string {
  if (prs === null) {
    return `<div class="q-loi">
<div style="flex:1">
<div class="q-loi-tieu">Không đọc được PR — GitHub token thiếu hoặc hết hạn.</div>
<div class="q-loi-cach">Repo này không chạy kiểm được cho tới khi có token riêng. Cách sửa: vào Cấu hình ▸ Repos, bấm «Nhập token» trên card <span class="mono">${escHtml(repoGithub)}</span> và dán PAT riêng của repo (đọc repo + pull request; thêm quyền ghi nếu dùng cổng Merge).${
      loiPr ? `<br><span class="mono" style="font-size:12px">${escHtml(loiPr)}</span>` : ''
    }</div>
</div>
<a class="btn btn-secondary" href="/settings" style="flex:none">Vào Cấu hình</a>
</div>`;
  }

  const dong = prs
    .map((p) => {
      const pill = p.dangCham
        ? '<span class="dang-cham">● đang chấm — nút khoá</span>'
        : p.daCham
          ? `<span class="tag pill-${p.daCham.ketQua === 'PASS' ? 'pass' : 'fail'}">${p.daCham.ketQua}·${p.daCham.soFinding}</span>`
          : '<span class="tag pill-chua">chưa chấm</span>';
      const nut = p.dangCham
        ? ''
        : p.daCham
          ? `<a class="btn btn-secondary" href="/runs/${p.daCham.runId}">Xem verdict</a>
<form method="post" action="/api/runs"><input type="hidden" name="kieu" value="pr"><input type="hidden" name="so" value="${p.so}">
<button class="btn btn-ghost" type="submit">Vẫn chạy lại</button></form>`
          : `<form method="post" action="/api/runs"><input type="hidden" name="kieu" value="pr"><input type="hidden" name="so" value="${p.so}">
<button class="btn btn-primary" type="submit">Chạy kiểm</button></form>`;
      return `<div class="q-grid q-row">
<span class="q-so">#${p.so}</span>
<span><span class="q-tieu">${escHtml(p.tieuDe)}</span><span class="q-skill">skill ${p.skill ?? 'code'}</span></span>
<span class="q-nhanh">${escHtml(p.nhanh)} @ ${escHtml(p.headSha.slice(0, 7))}</span>
<span class="q-tacgia">${escHtml(p.tacGia)}</span>
<span class="q-pill">${pill}${p.stale ? '<span class="tag pill-stale">stale</span>' : ''}</span>
<span class="q-nut">${nut}</span>
</div>`;
    })
    .join('');

  return `<div class="hr" style="margin:18px 0 0"></div>
<section style="margin-top:16px">
<div class="q-dau"><h4 style="margin:0">Hàng đợi PR chờ review</h4>
<span class="q-dem">${escHtml(repoGithub)} → ${escHtml(baseBranch)}${prs.length ? ` · ${prs.length}` : ''}</span></div>
${
  prs.length
    ? `<div class="q-grid q-head"><span>PR</span><span>Tiêu đề</span><span>Nhánh @ SHA</span><span>Tác giả</span><span>Review per-commit</span><span></span></div>${dong}`
    : '<div class="q-trong">Hàng đợi sạch — không có PR chờ chấm.</div>'
}
</section>`;
}

export function returnedToDevSection(runs: RunMeta[], repoGithub: string): string {
  if (!runs.length) return '';
  const dong = runs
    .slice(0, 10)
    .map(
      (m) => `<div class="tra-ve-row">
<span class="q-so">#${m.pr!.so}</span>
<span class="giua"><span class="ten">${escHtml(m.tieuDe)}</span>
<span class="chu">đóng ${escHtml(m.ketQuaCong!.luc.slice(0, 16).replace('T', ' '))} · bởi ${escHtml(m.ketQuaCong!.nguoi)}${
        m.ketQuaCong!.chiTiet ? ` · ghi chú: ${escHtml(m.ketQuaCong!.chiTiet)}` : ''
      }</span></span>
<a class="btn btn-ghost" href="/runs/${m.id}">Xem phán quyết</a>
<a class="btn btn-ghost" href="https://github.com/${escHtml(repoGithub)}/pull/${m.pr!.so}" target="_blank" rel="noopener">Mở PR ↗</a>
</div>`,
    )
    .join('');
  return `<section style="margin-top:28px">
<h4 style="margin:0">Đã trả về dev — chờ vá &amp; reopen</h4>
<p class="dash-sub" style="margin:2px 0 6px">PR đã đóng nên không còn trong hàng đợi. Dev vá xong, push lên nhánh cũ rồi Reopen chính PR đó là nó quay lại hàng đợi.</p>
${dong}</section>`;
}

// Token vào/ra mỗi lượt — theo dõi chi phí ngay trên bảng, không phải đào log.
// Đường CLI không trả usage nên số là ước từ ký tự: đánh dấu ~ để không ai nhầm là số đo thật.
export function tokenField(v?: { chi_phi?: { calls: number; token_vao: number; token_ra: number; uoc_tinh: boolean } }): string {
  const c = v?.chi_phi;
  if (!c) return '<span style="color:var(--muted)">—</span>';
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const dau = c.uoc_tinh ? '~' : '';
  return `<span class="mono" style="font-size:12px" title="${c.calls} call model · ${c.uoc_tinh ? 'ƯỚC TÍNH từ số ký tự (đường Claude Code CLI không trả usage)' : 'usage thật do API trả về'}">${dau}${k(c.token_vao)} / ${dau}${k(c.token_ra)}</span>`;
}

// verdict.model có dạng "<provider>/<model>" — tách ra hai cột để nhìn phát biết lượt đó
// chạy bằng nguồn nào (gói thuê bao hay ví API) và model gì.
export function splitSource(model?: string): { nguon: string; ten: string; nguonMa: string } {
  if (!model) return { nguon: '—', ten: '—', nguonMa: '' };
  const i = model.indexOf('/');
  if (i < 0) return { nguon: '—', ten: model, nguonMa: '' };
  const p = model.slice(0, i);
  const nhan =
    p === 'claude-cli' ? 'Gói thuê bao' : p === 'anthropic-api' ? 'Anthropic API' : p === 'google-gemini' ? 'Google Gemini' : p === 'openai' ? 'OpenAI' : p;
  return { nguon: nhan, ten: model.slice(i + 1), nguonMa: p };
}

// Thời gian chạy — nguồn sự thật là mốc bắt đầu/kết thúc của tiến trình, không phải mốc trong verdict
// (run lỗi không có verdict nhưng vẫn tốn thời gian, vẫn cần đo).
function thoiGianChay(batDau: string, ketThuc?: string): string {
  if (!ketThuc) return '';
  const giay = Math.max(0, Math.round((Date.parse(ketThuc) - Date.parse(batDau)) / 1000));
  if (!Number.isFinite(giay)) return '';
  return giay < 60 ? `${giay}s` : `${Math.floor(giay / 60)}p${String(giay % 60).padStart(2, '0')}`;
}

function gio(iso?: string): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '<span style="color:var(--muted)">—</span>';
}

function nguonO(model?: string): string {
  const n = splitSource(model);
  if (n.nguon === '—') return '<span style="color:var(--muted)">—</span>';
  const giaiThich = n.nguon === 'Gói thuê bao' ? 'Claude Code CLI — không tiêu credit API' : n.nguon === 'API' ? 'Anthropic API — tính tiền theo token' : n.nguon;
  return `<span title="${giaiThich}">${n.nguon}</span>`;
}

export function homePage(
  runs: RunMeta[],
  prBlock = '',
  daTraVeBlock = '',
  nguoi = '',
  repoFull = '',
): string {
  // Năm lượt gần nhất, dạng thẻ — Provider/Model/Token đầy đủ nằm ở /lich-su, cách đây một cú bấm
  const gan = runs
    .slice(0, 5)
    .map((r) => {
      const kq = r.verdict?.result;
      const pill =
        r.trangThai === 'dang_chay'
          ? '<span class="dang-cham">● đang chạy</span>'
          : kq
            ? `<span class="tag pill-${kq === 'PASS' ? 'pass' : 'fail'}">${kq}</span>`
            : '<span class="tag pill-chua">lỗi</span>';
      return `<a class="rc-row" href="/runs/${r.id}">${pill}
<span class="rc-ten">${escHtml(r.tieuDe)}</span>
<span class="rc-gio">${gio(r.batDau)}</span></a>`;
    })
    .join('');

  return shell(
    'CheckMate',
    `<h6 class="dash-kicker">${escHtml(repoFull)}</h6>
<h2 style="margin:0 0 4px">Dashboard</h2>
<p class="dash-sub">Verdict ghim commit · mọi kết luận vào sổ cái append-only · trust không nới cổng.</p>
${prBlock}
${daTraVeBlock}
<div class="dash-the">
<section class="card">
<div class="card-kicker">Kiểm nhanh tài liệu rời</div>
<div style="font-size:13px">Upload .md / .txt / .docx / .pdf hoặc dán text — chấm bằng skill doc, không cần PR.</div>
<form method="post" action="/api/runs" enctype="multipart/form-data" style="margin:0">
<input type="hidden" name="kieu" value="upload">
<input type="file" name="tep" accept=".md,.txt,.docx,.pdf" style="font-size:12px">
<button class="btn btn-secondary" type="submit" style="margin-left:8px">Tải lên &amp; kiểm</button>
<span class="goiy" style="display:block;margin-top:4px">≤5MB · bản scan/ảnh chưa hỗ trợ OCR</span>
</form>
<form method="post" action="/api/runs" style="margin:0"><input type="hidden" name="kieu" value="doc">
<textarea class="input" name="noi_dung" id="noidung" rows="3" placeholder="…hoặc dán nội dung tài liệu vào đây"></textarea>
<p class="goiy" id="goiy">Router: dán vào để nhận diện loại artifact.</p>
<button class="btn btn-primary" type="submit" style="align-self:flex-start">Chạy kiểm tài liệu</button></form>
<p class="goiy" style="margin:0">Code chỉ kiểm qua PR của repo đã kết nối — skill code thực thi code thật, nên nó cần cả hai nhánh chứ không chỉ một đoạn diff dán vào.</p>
</section>
<section class="card">
<div class="card-kicker">Lượt chấm gần đây</div>
${gan || '<div class="q-trong" style="padding:18px 0">Chưa có lượt chấm nào.</div>'}
<a class="btn btn-ghost" href="/lich-su" style="align-self:flex-start">Toàn bộ lịch sử →</a>
</section>
</div>`,
    `const ta=document.getElementById('noidung'),gy=document.getElementById('goiy');
ta.addEventListener('input',()=>{const v=ta.value;
if(/^diff --git|^@@|^index [0-9a-f]+\\.\\./m.test(v)) gy.textContent='Router: nội dung giống DIFF CODE — code chỉ kiểm qua PR trong hàng đợi bên trên.';
else if(v.trim()) gy.textContent='Router: nhận diện TÀI LIỆU YÊU CẦU → skill doc (rubric 4 loại lỗi khách quan).';
else gy.textContent='Router: dán vào để nhận diện loại artifact.';});`,
    { muc: 'dashboard', nguoi },
  );
}

export interface SettingsView {
  mode: 'demo' | 'org';
  repoGithub: string;
  baseBranch: string;
  localPath: string;
  tokenChe: string;
  khoiNccHtml: string; // khối nhà cung cấp (ui-ncc.ts) — dựng sẵn để trang này chỉ lắp
  khoiRepoHtml: string; // khối repo đã kết nối (ui-repo.ts)
  maxProbe: number;
  skeptic: boolean;
  trucBat: boolean;
  trucChuKy: number;
  trucComment: boolean;
  trucTrangThai: boolean;
  trucTraVe: boolean;
  daLuu?: boolean;
}

export function settingsPage(v: SettingsView, nguoi = ''): string {
  const ro = v.mode === 'demo' ? 'disabled' : '';
  return shell(
    'Cấu hình — CheckMate',
    `<h1>Cấu hình</h1>
<p class="sub">Chế độ: <b>${v.mode === 'demo' ? 'DEMO (chỉ đọc — bản public khoá vào repo demo)' : 'ORG (self-host, chỉnh được)'}</b> · <a href="/">← về trang chính</a></p>
${v.daLuu ? '<div class="card" style="border-color:var(--teal);margin-bottom:14px">✓ Đã lưu cấu hình.</div>' : ''}
<form method="post" action="/settings">
<div class="card" style="max-width:760px;margin-bottom:14px">
  <h3>GitHub token — repo <span class="mono">${v.repoGithub}</span></h3>
  <p style="font-size:12.5px;color:var(--muted)">Mỗi repo giữ chìa riêng. Token dán ở đây CHỈ áp cho repo đang chọn; repo khác đặt chìa của nó ở khối “Repo đã kết nối” bên dưới. Fine-grained PAT cần: Pull requests (read &amp; write) · Contents (read) · Commit statuses (write) trên chính repo đó.</p>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Token — hiện tại: <span class="mono">${v.tokenChe}</span></label>
  <input name="github_token" type="password" placeholder="dán token mới để thay, bỏ trống để giữ nguyên" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:var(--radius-md)">
  <p style="font-size:11.5px;color:var(--muted);margin:6px 0 0">Thêm repo mới thì đi bốn bước ở khối dưới — dán đường dẫn, dán chìa, kiểm kết nối, chọn nhánh.</p>
  <details style="margin-top:10px">
    <summary style="font-size:12.5px;cursor:pointer;color:var(--muted)">Sửa tay repo đang chọn (nâng cao)</summary>
    <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Repo (owner/tên)</label>
    <input name="repo_github" value="${v.repoGithub}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:var(--radius-md)">
    <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Nhánh đích</label>
    <input name="base_branch" value="${v.baseBranch}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:var(--radius-md)">
    <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Đường dẫn clone local</label>
    <input name="local_path" value="${v.localPath}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:var(--radius-md)">
  </details>
</div>
${v.khoiRepoHtml}
${v.khoiNccHtml}
<div class="card" style="max-width:760px;margin-bottom:14px">
  <h3>Độ sâu review</h3>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Số phép thử tối đa mỗi lượt (2–12)</label>
  <input name="max_probe" type="number" min="2" max="20" value="${v.maxProbe}" ${ro} style="width:90px;padding:7px 10px;border:1px solid var(--line);border-radius:var(--radius-md)">
  <label style="display:block;font-size:12.5px;margin:10px 0 4px"><input type="checkbox" name="skeptic" value="1" ${v.skeptic ? 'checked' : ''} ${ro}> Bật vòng phản biện (skeptic) cho review tài liệu</label>
</div>
<div class="card" style="max-width:640px;margin-bottom:14px">
  <h3>Chế độ trực (PR-bot)</h3>
  <p style="font-size:12.5px;color:var(--muted)">Bật thì CheckMate tự quét hàng đợi theo chu kỳ: PR mới / commit mới được chấm tự động, verdict post lên PR kèm check status. Tắt = chỉ chấm khi bấm tay.</p>
  <label style="display:block;font-size:12.5px;margin:8px 0"><input type="checkbox" name="truc_bat" value="1" ${v.trucBat ? 'checked' : ''} ${ro}> Bật chế độ trực</label>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:8px 0 4px">Chu kỳ quét (giây, 60–3600)</label>
  <input name="truc_chu_ky" type="number" min="60" max="3600" value="${v.trucChuKy}" ${ro} style="width:110px;padding:7px 10px;border:1px solid var(--line);border-radius:var(--radius-md)">
  <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
    <div style="font-size:12.5px;font-weight:600;margin-bottom:3px">Tự động ở cổng</div>
    <p style="font-size:12px;color:var(--muted);margin:0 0 9px">Ba việc riêng, không gộp — mức gây hại khác hẳn nhau. Ba việc này chạy cho MỌI lượt chấm, không riêng chế độ trực.</p>
    <label style="display:block;font-size:12.5px;margin:7px 0"><input type="checkbox" name="truc_comment" value="1" ${v.trucComment ? 'checked' : ''} ${ro}> Đăng verdict và finding lên pull request <span style="color:var(--muted)">— dev đọc ngay tại chỗ họ làm việc</span></label>
    <label style="display:block;font-size:12.5px;margin:7px 0"><input type="checkbox" name="truc_trang_thai" value="1" ${v.trucTrangThai ? 'checked' : ''} ${ro}> Gắn trạng thái commit <span style="color:var(--muted)">— chặn nút merge trên GitHub, gỡ được</span></label>
    <label style="display:block;font-size:12.5px;margin:7px 0"><input type="checkbox" name="truc_tra_ve" value="1" ${v.trucTraVe ? 'checked' : ''} ${ro}> <b>Tự trả về dev</b> khi verdict FAIL có finding mức chặn <span style="color:var(--fail)">— ĐÓNG pull request, người viết phải mở lại</span></label>
    <p style="font-size:11.5px;color:var(--muted);margin:9px 0 0">Máy không bao giờ tự merge — không có công tắc nào bật được điều đó. Hành động do máy thực hiện được ghi vào sổ cổng dưới tên <code>ci-bot</code>, không mượn tên người.</p>
  </div>
</div>
${v.mode === 'org' ? '<button>Lưu cấu hình</button>' : '<p class="goiy">Bản demo public không cho sửa — self-host với cờ <code>--org</code> để mở cấu hình.</p>'}
</form>`,
    JS_PROVIDER + JS_REPO,
    { muc: 'config', nguoi },
  );
}

function khoiCong(meta: RunMeta, trinhDien = false): string {
  // Trình diễn là một CHẾ ĐỘ XEM. Điều kiện chỉ-đọc đọc thẳng từ đây, không phải từ một tham số ai
  // đó phải nhớ truyền qua bốn lớp hàm — bản trước hỏng đúng vì lý do đó: hàm này không hề biết
  // mình đang nằm trong một bản phát lại, nên nó bày một nút Merge THẬT.
  if (trinhDien) {
    return `<div class="cong-o chi-doc"><h6 style="margin:0 0 6px">Cổng merge — chỉ đọc</h6>
<p class="goiy" style="margin:0">Đang xem bản trình diễn của lượt chấm này. Mọi hành động cổng đều
khoá ở đây; thoát trình diễn để thao tác thật.</p></div>`;
  }

  // Lượt không gắn pull request thì NÓI RA, đừng để khối cổng biến mất im lặng: một chỗ trống trông
  // giống hệt một chỗ hỏng, và người dùng sẽ đi tìm cái nút không tồn tại.
  if (!meta.pr) {
    return `<div class="cong-o chi-doc"><h6 style="margin:0 0 6px">Không có cổng merge</h6>
<p class="goiy" style="margin:0">Lượt chấm này không gắn pull request nào — nó chấm một tài liệu rời,
nên không có gì để merge. Verdict ở trên vẫn đầy đủ và vẫn vào sổ cái.</p></div>`;
  }
  if (meta.trangThai !== 'xong' || !meta.verdict) return '';

  const so = meta.pr.so;
  if (meta.ketQuaCong) {
    const k = meta.ketQuaCong;
    const merge = k.hanhDong === 'merge';
    return `<div class="cong-o ${merge ? 'receipt-merge' : 'receipt-tra'}">
<div style="font-weight:700">${merge ? '✓ ĐÃ MERGE' : '↩ ĐÃ TRẢ VỀ DEV'} — PR #${so}</div>
<div class="mono" style="font-size:12px;margin-top:6px">${escHtml(k.chiTiet)} · bởi ${escHtml(k.nguoi)} lúc ${escHtml(k.luc.slice(0, 16).replace('T', ' '))}${
      k.ngoaiCong ? ' · ghi bởi ĐỐI SOÁT (hành động xảy ra ngoài cổng)' : ''
    }</div>
${
  merge
    ? ''
    : `<div style="font-size:13px;margin-top:8px">Hướng dẫn reopen: dev vá trên <b>chính nhánh cũ</b> → push → bấm
<b>Reopen pull request</b> trên GitHub. PR quay lại hàng đợi; verdict cũ vẫn nằm nguyên trong sổ cái.</div>`
}</div>`;
  }

  const v = meta.verdict;
  const cao = v.findings.filter((f) => chuanMuc(f.severity) === 'high').length;
  const vua = v.findings.filter((f) => chuanMuc(f.severity) === 'medium');
  const stale = Boolean(v.head_moved);

  const khoa = stale
    ? `<div class="cong-khoa">⛔ <b>Merge khoá cứng.</b> Verdict này ghim commit <span class="mono">${escHtml(meta.pr.headSha.slice(0, 7))}</span>,
mà PR đã có commit mới hơn — verdict không còn nói về thứ sắp được merge. Chấm lại rồi mới merge được.</div>`
    : cao > 0
      ? `<div class="cong-khoa">⛔ <b>Merge khoá cứng.</b> ${cao} finding HIGH — vá xong push lên nhánh rồi chạy kiểm lại.
Trả về dev vẫn dùng được ở đây.</div>`
      : '';

  const checklist = vua.length
    ? `<div style="font-size:13.5px;margin-bottom:2px">PASS kèm ${vua.length} cảnh báo medium — tick từng cảnh báo để mở nút Merge.
Người tick được ghi danh vào receipt.</div>
${vua
  .map(
    (f) => `<label class="cong-tick"><input type="checkbox" class="tick-med" data-fid="${escHtml(f.id)}">
<span><b>${escHtml(f.title_vi)}</b><br><span class="text-muted">${escHtml(f.what_vi)}</span></span></label>`,
  )
  .join('')}`
    : '';

  const nutMerge = khoa
    ? ''
    : `<div><form method="post" action="/api/runs/${escHtml(meta.id)}/merge" id="form-merge" style="margin:0">
<input type="hidden" name="tick_ids" id="tick_ids" value="">
<button class="btn btn-primary" id="nut-merge" type="submit"${vua.length ? ' disabled' : ''}>Merge PR #${so}</button>
</form><div class="cong-goiy mono" id="goiy-merge"></div></div>`;

  return `<div class="cong-o"><h6 style="margin:0 0 10px">Cổng merge — PR #${so}
<span class="text-muted" style="font-weight:400">verdict ghim <span class="mono">${escHtml(meta.pr.headSha.slice(0, 7))}</span> · push mới là verdict hết hiệu lực</span></h6>
${khoa}${checklist}
<div class="cong-hd">
${nutMerge}
<form method="post" action="/api/runs/${escHtml(meta.id)}/reject" class="cong-tra" style="margin:0">
<input class="input" id="ghi-chu-tra-ve" name="ghi_chu" placeholder="Ghi chú trả về dev (bắt buộc)" required>
<button class="btn" id="nut-tra-ve" type="submit" style="background:var(--fail);color:var(--color-bg);flex:none" disabled>Trả về dev</button>
</form></div>
<p class="goiy" style="margin-top:10px">Trả về dev = đăng phán quyết đầy đủ lên PR <b>và đóng PR</b> để nó rời hàng đợi.
Ghi chú là <b>bắt buộc</b>: trả về mà không nói vì sao thì dev không biết vá gì, mà hành động này đã vào sổ chỉ-ghi-thêm.
Dev vá xong push lên nhánh cũ rồi <b>Reopen</b> chính PR này — lịch sử review giữ nguyên.</p></div>`;
}

/**
 * Áp MỘT sự kiện lên DOM. Dùng chung cho luồng trực tiếp và cho bản trình diễn.
 *
 * `html` là chuỗi ĐÃ DỰNG SẴN từ máy chủ — trình duyệt không tự ghép HTML của finding hay verdict.
 * Đó là điều kiện để chỉ có MỘT hàm dựng: bản nào ít người nhìn hơn sẽ lệch trước, và lệch im lặng.
 */
const JS_VE = `
function mmss(ms){var g=Math.max(0,Math.round(ms/1000));
  return String(Math.floor(g/60)).padStart(2,'0')+':'+String(g%60).padStart(2,'0');}
function danhDauXong(u){
  u.classList.remove('on');u.classList.add('done');
  var m=u.querySelector('.buoc-mark');if(m)m.textContent='✓';
}
function ve(e, html, t){
  if(e.type==='stage'){
    for(var i=1;i<e.stage;i++){var u=document.querySelector('.buoc[data-s="'+i+'"]');if(u)danhDauXong(u);}
    var c=document.querySelector('.buoc[data-s="'+e.stage+'"]');
    if(c){c.classList.add('on');var m2=c.querySelector('.buoc-mark');if(m2)m2.textContent='●';}
    window.__buoc=e.stage;
  } else if(e.type==='log'){
    if(e.msg==='__END__')return;
    var b=document.getElementById('logs-'+(window.__buoc||1));
    if(b){
      var d=document.createElement('div');d.className='d';
      var s1=document.createElement('span');s1.className='ts';s1.textContent=mmss(t||0);
      var s2=document.createElement('span');s2.className='tx';s2.textContent=e.msg;
      d.appendChild(s1);d.appendChild(s2);b.appendChild(d);
    }
  } else if(e.type==='finding'){
    if(html) document.getElementById('findings').insertAdjacentHTML('beforeend', html);
  } else if(e.type==='verdict'){
    document.querySelectorAll('.buoc').forEach(danhDauXong);
    if(html) document.getElementById('verdict-o').innerHTML = html;
  } else if(e.type==='head_moved'){
    if(!document.getElementById('stale-bn')){
      var w=document.createElement('div');w.id='stale-bn';w.className='ban-canh';
      var n=document.createElement('div');n.className='n';
      var bb=document.createElement('b');bb.textContent='Verdict sẽ hết hiệu lực.';
      n.appendChild(bb);
      n.appendChild(document.createTextNode(' PR đã nhận commit mới ('+String(e.new_sha||'').slice(0,7)+
        ') trong lúc đang chấm — lượt này vẫn chạy tới hết để đọc, nhưng cổng merge sẽ khoá.'));
      w.appendChild(n);
      var k=document.getElementById('cac-buoc');k.parentNode.insertBefore(w,k);
    }
  } else if(e.type==='error'){
    var er=document.getElementById('err');er.style.display='block';
    var x=document.createElement('div');x.style.marginBottom='6px';
    var eb=document.createElement('b');eb.textContent='LỖI: ';
    x.appendChild(eb);x.appendChild(document.createTextNode(String(e.msg)));
    er.appendChild(x);
    var c2=document.querySelector('.buoc.on');
    if(c2){c2.classList.add('loi');var m3=c2.querySelector('.buoc-mark');if(m3)m3.textContent='✗';}
  }
}`;

/** Cổng merge: mở nút Merge khi đã tick đủ cảnh báo medium, và ép ghi chú trả-về-dev. */
const JS_CONG = `
(function(){
  var tick=document.querySelectorAll('.tick-med');
  if(tick.length||document.getElementById('nut-merge')){
    var capNhat=function(){
      var n=0;tick.forEach(function(x){if(x.checked)n++;});
      var o=document.getElementById('tick_ids');
      if(o)o.value=[].filter.call(tick,function(x){return x.checked;}).map(function(x){return x.dataset.fid;}).join(',');
      var nut=document.getElementById('nut-merge');
      if(nut)nut.disabled = n!==tick.length;
      var g=document.getElementById('goiy-merge');
      if(g)g.textContent = n===tick.length?'':'còn '+(tick.length-n)+' cảnh báo chưa tick';
    };
    tick.forEach(function(c){c.addEventListener('change',capNhat);});
    capNhat();
  }
  // Ghi chú trả về dev là BẮT BUỘC: trả về mà không nói vì sao thì dev không biết vá gì, mà hành
  // động đó đã đi vào sổ chỉ-ghi-thêm.
  var oGhi=document.getElementById('ghi-chu-tra-ve'), nutTra=document.getElementById('nut-tra-ve');
  if(oGhi&&nutTra){
    var doi=function(){nutTra.disabled = oGhi.value.trim().length===0;};
    oGhi.addEventListener('input',doi);doi();
  }
})();`;

/** Nối luồng cho lượt ĐANG CHẠY. `tu` = số sự kiện máy chủ đã dựng sẵn, để không nhận lại. */
function jsLuong(id: string, tu: number): string {
  return `
var es=new EventSource('/api/runs/${id}/events?tu=${tu}');
es.onmessage=function(m){
  var g=JSON.parse(m.data);
  if(g.e.type==='log'&&g.e.msg==='__END__'){es.close();location.reload();return;}
  ve(g.e,g.html,g.t);
};
es.onerror=function(){};`;
}

/**
 * Trình diễn: nhịp canh Ở PHÍA NÀY, từ mốc `t` sẵn có trên mỗi sự kiện.
 *
 * Trước đợt này nhịp do máy chủ xếp `setTimeout` cho từng sự kiện, tốc độ nằm trong URL, và đổi tốc
 * độ nghĩa là tải lại trang. Chuyển sang đây thì máy chủ còn MỘT đường phát sự kiện, đổi tốc độ và
 * tạm dừng thành tức thì — và quan trọng hơn: «đang trình diễn» thành TRẠNG THÁI CỦA MÀN chứ không
 * còn là một địa chỉ, nên cổng chỉ-đọc đọc thẳng từ đó.
 */
function jsTrinhDien(id: string): string {
  return `
(function(){
  var SU=[],i=0,tocDo=8,hen=null,moc=0,dung=false;
  var oTocDo=document.getElementById('td-toc'), oDung=document.getElementById('td-dung');
  function chay(){
    if(dung||i>=SU.length)return;
    var ev=SU[i];
    hen=setTimeout(function(){moc=ev.t;ve(ev.e,ev.html,ev.t);i++;chay();},Math.max(0,(ev.t-moc)/tocDo));
  }
  function ngat(){if(hen){clearTimeout(hen);hen=null;}}
  if(oTocDo)oTocDo.addEventListener('click',function(e){
    var b=e.target.closest('[data-toc]');if(!b)return;
    tocDo=Number(b.dataset.toc);
    oTocDo.querySelectorAll('[data-toc]').forEach(function(x){x.classList.toggle('on',x===b);});
    ngat();chay();               // đổi tốc độ GIỮA CHỪNG: chỉ đổi nhịp chờ kế tiếp, không mất chỗ
  });
  if(oDung)oDung.addEventListener('click',function(){
    dung=!dung;oDung.textContent=dung?'▶ Tiếp':'❚❚ Tạm dừng';
    if(dung)ngat();else chay();
  });
  fetch('/api/runs/${id}/su-kien').then(function(r){return r.json();}).then(function(d){SU=d;chay();});
})();`;
}

function JS_RUN(meta: RunMeta, trinhDien: boolean, daDung: number): string {
  if (trinhDien) return JS_VE + JS_CONG + jsTrinhDien(meta.id);
  if (meta.trangThai !== 'dang_chay') return JS_CONG; // tĩnh hoàn toàn — không mở luồng nào
  return JS_VE + JS_CONG + jsLuong(meta.id, daDung);
}

/** Năm bước của một lượt chấm — dùng chung cho cả đường server dựng lẫn đường luồng. */
/** Năm bước của một lượt chấm — dùng chung cho cả đường server dựng lẫn đường luồng. */
const BUOC = ['Nhận artifact', 'Nạp spec / rubric', 'Sinh phép thử đối kháng', 'Chạy & đối chiếu bằng chứng', 'Kết luận'];

/**
 * Khối bằng chứng HAI CỘT — kỳ vọng bên trái (tint jade), thực tế bên phải (tint crimson).
 *
 * Hai cột cạnh nhau là cách bày duy nhất cho phép đọc SO SÁNH bằng mắt; xếp trên dưới thì người đọc
 * phải tự nhớ vế trên trong lúc đọc vế dưới. Với finding tài liệu, hai cột là hai đoạn trích đối
 * nhau — cùng hình dạng, khác nội dung.
 */
function bangChungHtml(ev: Finding['evidence']): string {
  const o = (
    dauA: string,
    thanA: string,
    dauB: string,
    thanB: string,
  ): string => `<div class="fnd-bc">
<div><div class="dau dau-a">${escHtml(dauA)}</div><div class="than">${escHtml(thanA)}</div></div>
<div><div class="dau dau-b">${escHtml(dauB)}</div><div class="than">${escHtml(thanB)}</div></div>
</div>`;
  if (ev.type === 'quote_pair') return o(ev.loc_a, `«${ev.quote_a}»`, ev.loc_b, `«${ev.quote_b}»`);
  if (ev.type === 'quote') return o(ev.rule, ev.loc, 'trích dẫn', `«${ev.quote}»`);
  return o('KỲ VỌNG', ev.expected, 'THỰC TẾ', (ev.actual || '').split('\n').slice(0, 6).join('\n'));
}

/**
 * HTML của MỘT finding — hàm DUY NHẤT dựng nó.
 *
 * Trước đây có một bản ghép chuỗi trong JS phía trình duyệt (đường duy nhất, vì lượt đã xong cũng
 * phải phát lại dòng sự kiện mới có nội dung). Nay lượt đã xong do máy chủ dựng, còn lượt đang chạy
 * nhận HTML ĐÃ DỰNG SẴN qua luồng. Một hàm, một cách hiện — để hai bản thì bản ít người nhìn hơn sẽ
 * lệch trước, và lệch im lặng.
 */
export function findingHtml(f: Finding): string {
  const muc = chuanMuc(f.severity);
  const nhan = { high: 'HIGH — chặn merge', medium: 'MEDIUM — cảnh báo', low: 'LOW' }[muc] ?? muc;
  const pill = { high: 'pill-fail', medium: 'pill-stale', low: 'pill-chua' }[muc] ?? 'pill-chua';
  // Phân loại ODC — telemetry, chỉ hiện khi CÓ. Giá trị 'unknown' VẪN hiện: model trả một mã không
  // đọc được khác hẳn model im lặng, và gộp hai cái là mất một tín hiệu về chính model.
  const pl = [f.odc_type && `type: ${f.odc_type}`, f.qualifier && `qualifier: ${f.qualifier}`].filter(Boolean).join(' · ');
  const lenh = f.evidence.type === 'test_run' ? f.evidence.probe_name : '';
  return `<div class="fnd sev-${muc}"><div class="fnd-vach"></div><div class="fnd-than">
<div class="fnd-dau"><span class="tag ${pill}">${escHtml(nhan)}</span><span class="fnd-ten">${escHtml(f.title_vi)}</span>${
    pl ? `<span class="fnd-nhan">${escHtml(pl)}</span>` : ''
  }</div>
<div class="fnd-gi">${escHtml(f.what_vi)}</div>
<div class="fnd-hq"><span class="fnd-nhan">hậu quả — </span>${escHtml(f.consequence_vi)}</div>
${f.minimal_fix ? `<div class="fnd-hq"><span class="fnd-nhan">vá tối thiểu — </span>${escHtml(f.minimal_fix)}</div>` : ''}
${lenh ? `<div class="fnd-lenh">$ ${escHtml(lenh)}</div>` : ''}
${bangChungHtml(f.evidence)}</div></div>`;
}

/** Một hàng của bảng số liệu verdict. */
function hangMeta(k: string, v: string, xam = false): string {
  return `<div class="vd-hang${xam ? ' xam' : ''}"><span class="k">${escHtml(k)}</span><span class="v">${escHtml(v)}</span></div>`;
}

/**
 * HTML của thẻ verdict + khối Thư viện + khối quan sát ngoài phạm vi.
 *
 * Bảng số liệu BẮT BUỘC hiện **vùng xám probe** — nghi vấn · bỏ qua · thất lạc · nghi lỗi có sẵn —
 * kể cả khi bằng không. Bốn số đó nói lượt chấm này KHÔNG nhìn thấy gì. Giấu chúng đi thì một
 * verdict PASS mỏng trông giống hệt một verdict PASS dày, và người đọc mất đúng thứ cần để biết nên
 * tin đến đâu.
 */
export function verdictHtml(v: Verdict): string {
  const dem = (m: string): number => v.findings.filter((f) => chuanMuc(f.severity) === m).length;
  const ps = v.probe_stats;
  const ss = v.spec_source;
  const cp = v.chi_phi;
  const kk = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const giay = Math.max(0, Math.round((Date.parse(v.finished_at) - Date.parse(v.started_at)) / 1000));
  const ng = splitSource(v.model);

  const hang = [
    hangMeta('Finding', `${v.findings.length} · ${dem('high')} high · ${dem('medium')} med · ${dem('low')} low`),
    ps ? hangMeta('Probe', `${ps.ghi_nhan}/${ps.ke_hoach} ghi nhận · ${ps.pass} pass · ${ps.hoi_quy} hồi quy`) : '',
    ps ? hangMeta('Ngoài phạm vi', String(ps.ngoai_pham_vi)) : '',
    // Nguồn luật và độ phủ. Có `spec_source` mà VẮNG `luat_tong` = KHÔNG ĐO ĐƯỢC, không phải 0 — hai
    // tình trạng khác nhau, không được chung một chữ số. Bản ghi đời cũ không có `spec_source` thì
    // không bày hàng nào: vắng là không biết, không phải «không có».
    ss
      ? hangMeta(
          'Luật đối chiếu',
          ss.units === 0 ? 'KHÔNG CÓ — chấm không có luật đối chiếu' : `${ss.units} đơn vị · ${ss.files.length} file · ${ss.declared ? 'khai trong checkmate.yml' : 'tự dò'}`,
          ss.units === 0,
        )
      : '',
    ps && ps.luat_tong !== undefined
      ? hangMeta('Độ phủ luật', `${ps.luat_da_phu?.length ?? 0}/${ps.luat_tong} đơn vị có probe`)
      : ss
        ? hangMeta('Độ phủ luật', 'không đo được', true)
        : '',
    // Vùng xám — bốn số PHẢI hiện, kể cả bằng không. Im lặng và số không là hai điều khác nhau.
    ps ? hangMeta('◍ nghi vấn', String(ps.nghi_van), true) : '',
    ps ? hangMeta('◍ bỏ qua', String(ps.bo_qua), true) : '',
    ps ? hangMeta('◍ thất lạc', String(ps.that_lac.length), true) : '',
    ps ? hangMeta('◍ nghi lỗi có sẵn', String(ps.nghi_loi_co_san), true) : '',
    hangMeta('Nguồn model', ng.nguon),
    hangMeta('Model', ng.ten),
    cp ? hangMeta('Token vào/ra', `${cp.uoc_tinh ? '~' : ''}${kk(cp.token_vao)} / ${cp.uoc_tinh ? '~' : ''}${kk(cp.token_ra)}`) : '',
    hangMeta('Thời gian chạy', `${giay}s`),
    // Vắng người chạy là một KHẲNG ĐỊNH — lượt do máy chạy — chứ không phải thiếu dữ liệu.
    hangMeta('Người chạy', v.run_by || 'máy chạy (chế độ trực)'),
    hangMeta('Bắt đầu', v.started_at.slice(0, 16).replace('T', ' ')),
    hangMeta('Chế độ', v.mode),
  ]
    .filter(Boolean)
    .join('');

  const the = `<div class="vd"><div class="vd-khoi ${v.result}">
<div class="vd-kq">${v.result}</div>
<div class="vd-phu">${escHtml(v.artifact_ref.name)} @ ${escHtml(v.artifact_ref.sha_or_hash.slice(0, 10))}</div></div>
<div class="vd-meta">${hang}</div></div>`;

  return the + doiChieuHtml(v) + thuVienHtml(v) + quanSatHtml(v);
}

/**
 * Bảng đối chiếu hai nhánh — thay chỗ của hai dòng dump `P1·8213=p P2·bc87=p …`.
 *
 * Bản cũ in từng probe của từng nhánh rồi bỏ mặc người đọc so 39 cặp bằng mắt. Máy đã so rồi: nhãn
 * `state` ở đây là nhãn MÁY phong, không tính lại — hai nơi cùng tính là hai nơi sẽ lệch.
 *
 * Chỉ bày probe KHÔNG pass-cả-hai. Một probe xanh ở cả hai nhánh không nói gì về PR này, và 35 dòng
 * như thế chôn mất 4 dòng có nghĩa; số của chúng nằm ở dòng cuối.
 *
 * Cột LUẬT là thứ bản cũ vứt đi hoàn toàn: một probe là PHÉP THỬ CỦA MỘT LUẬT, nên nói nó thử luật
 * nào là nói nó tồn tại để làm gì. Chi tiết dài (`purpose`) nằm ở tooltip — hover mới hiện, để dòng
 * vẫn đọc lướt được.
 */
function doiChieuHtml(v: Verdict): string {
  const dc = v.probe_compare;
  if (!dc || (!dc.rows.length && !dc.pass_both)) return '';

  const MUI: Record<string, string> = {
    hoi_quy: '✓→✗', vi_pham_luat_moi: '✓→✗', cai_thien: '✗→✓',
    ngoai_pham_vi: '✗→✗', nghi_loi_co_san: '✗→✗', nghi_van: '?→✗',
    bo_qua: 'skip', khong_chay: '—',
  };
  const KET_LUAN: Record<string, string> = {
    hoi_quy: 'PR làm hỏng',
    vi_pham_luat_moi: 'vi phạm luật PR vừa khai',
    cai_thien: 'PR sửa được',
    ngoai_pham_vi: 'đỏ cả hai — không quy tội PR',
    nghi_loi_co_san: 'nghi lỗi có sẵn',
    nghi_van: 'nghi vấn — không có đối chứng',
    bo_qua: 'bị skip — không tính là pass',
    khong_chay: 'không chạy tới nơi',
  };
  const NHAN_KQ: Record<string, string> = {
    pass: 'pass', fail: 'fail', skip: 'skip', missing: 'thất lạc', no_baseline: 'không có',
  };

  const hang = dc.rows
    .map(
      (r) => `<div class="dc-hang ${escHtml(r.state)}">
<span class="dc-mui">${MUI[r.state] ?? '?'}</span>
<span class="dc-ma"${r.purpose ? ` title="${escHtml(r.purpose)}"` : ''}>${escHtml(r.label)}</span>
<span class="${r.purpose ? 'dc-luat' : ''}"${r.purpose ? ` title="${escHtml(r.purpose)}"` : ''}>${escHtml(r.rule ?? '(không rõ luật)')}</span>
<span class="dc-ten"${r.name ? ` title="${escHtml(r.name)}"` : ''}>${escHtml(r.name ?? '')}</span>
<span class="dc-kl">${escHtml(KET_LUAN[r.state] ?? r.state)} <span class="mono" style="font-size:11px">${escHtml(
        NHAN_KQ[r.pr] ?? r.pr,
      )}/${escHtml(NHAN_KQ[r.base] ?? r.base)}</span></span>
</div>`,
    )
    .join('');

  const dem = (t: string[]): number => dc.rows.filter((r) => t.includes(r.state)).length;
  return `<div class="dc"><div class="dc-dau"><h6 style="margin:0">Đối chiếu hai nhánh</h6>
<span class="dc-tom">${dem(['hoi_quy', 'vi_pham_luat_moi'])} hồi quy · ${dem(['cai_thien'])} cải thiện · ${dem(
    ['ngoai_pham_vi', 'nghi_loi_co_san'],
  )} đỏ cả hai · ${dem(['nghi_van'])} nghi vấn</span></div>
<div class="text-muted" style="font-size:12.5px;margin-top:2px">Chỉ probe KHÔNG pass cả hai nhánh — probe xanh ở cả hai không nói gì về PR này. Trỏ chuột vào mã probe hoặc luật để xem probe đó thử gì.</div>
<div style="margin-top:10px">
<div class="dc-hang dau"><span></span><span>Probe</span><span>Luật</span><span>Tên</span><span>Kết luận · PR/gốc</span></div>
${hang}</div>
<div class="dc-con">+ ${dc.pass_both} probe pass cả hai nhánh</div></div>`;
}

/**
 * Khối Thư viện — quyết định làm THAY ĐỔI TÀI SẢN regression của lượt này.
 *
 * Hai loại việc phải phân biệt được ở mức DẤU HIỆU, không chỉ ở lời văn: `⊘ không nạp vào` là không
 * thêm tài sản; `✕ gỡ khỏi thư viện` là MẤT một tài sản đã tự chứng minh được mình ở lượt trước.
 * Dùng chung một ký hiệu là để người đọc lướt qua cái đắt hơn.
 */
function thuVienHtml(v: Verdict): string {
  const ds = v.library_changes ?? [];
  if (!ds.length) return '';
  const dong = ds
    .map((x, i) => {
      const cuoi = i === ds.length - 1;
      const go = x.action === 'evicted';
      return `<div class="tv-dong ${go ? 'go-khoi' : 'khong-nap'}">
<span class="tv-nhanh">${cuoi ? '└' : '├'}</span>
<span class="tv-icon">${go ? '✕' : '⊘'}</span>
<span class="tv-tx">${escHtml(x.probe_id)} — ${escHtml(x.reason)}</span>
<span class="tag ${go ? 'pill-fail' : 'pill-stale'}">${go ? 'gỡ khỏi thư viện' : 'không nạp vào'}</span></div>`;
    })
    .join('');
  const go = ds.filter((x) => x.action === 'evicted').length;
  return `<div class="thu-vien"><div class="thu-vien-dau"><h6 style="margin:0">Thư viện</h6>
<span class="thu-vien-dem">${ds.length} quyết định${go ? ` · ${go} gỡ` : ''}</span></div>
<div class="text-muted" style="font-size:12.5px;margin-top:2px">Quyết định làm thay đổi tài sản regression — ⊘ không nạp vào, ✕ gỡ cái đã có.</div>
<div style="margin-top:10px">${dong}</div></div>`;
}

/** Quan sát ngoài phạm vi PR — không đổi verdict, nhưng không được im lặng. */
function quanSatHtml(v: Verdict): string {
  const qs = v.quan_sat_ngoai_pr ?? [];
  if (!qs.length) return '';
  return `<div class="oos"><h6>Quan sát ngoài phạm vi PR — không đổi verdict</h6>
<div class="d">${qs
    .map(
      (q) =>
        `${q.loai === 'nghi_loi_co_san' ? '⚠ nghi LỖI CÓ SẴN' : '· ngoài phạm vi'} — ${escHtml(q.probe_id)} (${escHtml(q.spec_rule)}): ${escHtml(q.ten)}<br>`,
    )
    .join('')}</div>
<div class="goiy" style="margin:6px 0 0">Lỗi tồn tại trên CẢ nhánh gốc, nên cổng không quy tội PR này — nhưng nó có thật, và đáng mở một việc riêng.</div></div>`;
}

/**
 * Card KHÔNG RA VERDICT — lượt chấm THẤT BẠI, không phải trạng thái thứ ba.
 *
 * Lượt kết thúc mà không probe nào pass, hồi quy hay cải thiện thì nó không chứng minh được gì. Bày
 * nó như một lỗi chung («Run dừng giữa chừng») là báo sai bản chất: người đọc cần biết lượt chấm ĐÃ
 * CHẠY nhưng KHÔNG CÓ CƠ SỞ, chứ không phải hệ thống hỏng.
 */
function khongRaVerdictHtml(loi: string): string {
  return `<div class="vd"><div class="vd-khoi trong">
<div class="vd-kq">KHÔNG RA VERDICT</div>
<div class="vd-phu">không đủ cơ sở kết luận — lượt chấm thất bại, KHÔNG phải PASS hay FAIL</div></div>
<div class="vd-meta" style="grid-template-columns:1fr"><div style="font-size:13px">${escHtml(loi)}</div>
<div class="goiy" style="margin:10px 0 0">Không ghi vào sổ cái, và cổng merge giữ nguyên trạng thái trước đó. Chạy lại sau khi sửa nguyên nhân bên trên.</div></div></div>`;
}

export function runPage(meta: RunMeta, trinhDien: boolean, suKien: StoredEvent[] = [], nguoi = ''): string {
  const xong = meta.trangThai !== 'dang_chay';
  // Máy chủ dựng sẵn ở MỌI trạng thái trừ trình diễn — lượt đang chạy cũng không nên mở ra trống rồi
  // đợi luồng đổ lại từ đầu. Luồng nối tiếp từ đúng chỗ đã dựng (`?tu=`), nên không gì hiện hai lần.
  const dungSan = !trinhDien;
  const daDung = dungSan ? suKien.length : 0;
  const v = meta.verdict;

  const buocCuoi = suKien.reduce((n, x) => (x.e.type === 'stage' ? x.e.stage : n), 0);
  const coLoi = suKien.some((x) => x.e.type === 'error');
  const mocBuoc = new Map<number, number>();
  for (const x of suKien) if (x.e.type === 'stage') mocBuoc.set(x.e.stage, x.t);
  const ketThuc = suKien.length ? suKien[suKien.length - 1]!.t : 0;

  const banKhongDoiChung = v?.no_baseline
    ? `<div class="ban-canh"><div class="n"><b>Không có đối chứng.</b> Nhánh gốc không chạy được probe nào —
thường vì PR này thêm module mới. Probe đỏ khi đó chỉ là <b>nghi vấn</b>, không thành hồi quy.</div></div>`
    : '';

  const buocHtml = BUOC.map((s, i) => {
    const so = i + 1;
    const daXong = xong || so < buocCuoi;
    const dangChay = !xong && so === buocCuoi;
    const lop = !dungSan ? '' : daXong ? ' done' : dangChay ? ' on' : '';
    const mark = !dungSan || (!daXong && !dangChay) ? String(so).padStart(2, '0') : dangChay ? '●' : coLoi && so === buocCuoi ? '✗' : '✓';
    const batDau = mocBuoc.get(so);
    const ke = mocBuoc.get(so + 1) ?? (daXong ? ketThuc : undefined);
    const lau = dungSan && batDau !== undefined && ke !== undefined ? `${Math.max(0, Math.round((ke - batDau) / 1000))}s` : '';
    return `<div class="buoc${lop}" data-s="${so}"><div class="buoc-mark">${mark}</div><div>
<div class="buoc-dau"><span class="buoc-ten">${escHtml(s)}</span><span class="buoc-lau">${lau}</span></div>
${so === 4 ? banKhongDoiChung : ''}
<div class="buoc-log" id="logs-${so}">${
      dungSan
        ? suKien
            .filter((x) => x.e.type === 'log' && (x.e as { msg: string }).msg !== '__END__' && thuocBuoc(suKien, x, so))
            .map(
              (x) =>
                `<div class="d"><span class="ts">${mmss(x.t)}</span><span class="tx">${escHtml((x.e as { msg: string }).msg)}</span></div>`,
            )
            .join('')
        : ''
    }</div></div></div>`;
  }).join('');

  // Cảnh báo này ĐỔI CÁCH ĐỌC verdict, nên nó đứng trước verdict chứ không thành chú thích cuối.
  const vungMu = v?.diff_blind_spots ?? [];
  const banVungMu = vungMu.length
    ? `<div class="ban-canh"><h6>Vùng mù của diff — ${vungMu.length} file mã nguồn bị loại vì vượt trần</h6>
<div class="n">Verdict lượt này <b>KHÔNG nói gì</b> về những file đó: <span class="mono">${escHtml(
        vungMu.map((x) => x.file).join(' · '),
      )}</span></div></div>`
    : '';

  // Cùng hạng với vùng-mù và không-đối-chứng: không có luật đối chiếu ĐỔI CÁCH ĐỌC verdict — không
  // phong được «vi phạm luật mới», độ phủ không đo được — nên nó đứng trước verdict, không ở chú thích.
  const ss = v?.spec_source;
  const banKhongLuat =
    ss && ss.units === 0
      ? `<div class="ban-canh"><h6>Chấm KHÔNG có luật đối chiếu</h6>
<div class="n">${
          ss.declared
            ? `Nguồn spec khai trong <span class="mono">checkmate.yml</span> không cho ra đơn vị luật nào: <span class="mono">${escHtml(
                ss.probes.map((p) => `${p.pattern} (${p.note ?? `${p.files} file`})`).join(' · '),
              )}</span>.`
            : `Repo không khai nguồn spec và engine không thấy spec ở chỗ thông dụng nào (đã dò: <span class="mono">${escHtml(
                ss.probes.map((p) => p.pattern).join(' · '),
              )}</span>).`
        }
Probe lượt này suy từ diff và tài liệu API — verdict <b>yếu hơn</b> lượt có luật: không phong được «vi phạm luật mới», độ phủ luật <b>không đo được</b>.
Repo có spec thì khai <span class="mono">sources.specs</span> trong <span class="mono">checkmate.yml</span>.</div></div>`
      : '';

  const dsFinding = xong && v ? v.findings : suKien.filter((x) => x.e.type === 'finding').map((x) => (x.e as { finding: Finding }).finding);

  const headDoi = v?.head_moved ?? (suKien.find((x) => x.e.type === 'head_moved')?.e as { new_sha: string } | undefined);
  const banStale = dungSan && headDoi
    ? `<div class="ban-canh tra-lai" id="stale-bn"><div class="n"><b>Verdict hết hiệu lực.</b>
PR đã nhận commit mới (<span class="mono">${escHtml(headDoi.new_sha.slice(0, 7))}</span>) kể từ lúc lượt chấm này
bắt đầu — cổng merge khoá. Chấm lại commit mới rồi mới merge được.</div>
${meta.pr ? `<form method="post" action="/api/runs" style="margin:0;flex:none"><input type="hidden" name="kieu" value="pr"><input type="hidden" name="so" value="${meta.pr.so}"><button class="btn btn-secondary" type="submit">Chấm lại commit mới</button></form>` : ''}</div>`
    : '';

  // Lượt kết thúc KHÔNG ra verdict là lượt THẤT BẠI, không phải trạng thái thứ ba. Bày nó như một lỗi
  // chung là báo sai bản chất: nó ĐÃ CHẠY nhưng không chứng minh được gì.
  const loiCuoi = suKien.filter((x) => x.e.type === 'error').map((x) => (x.e as { msg: string }).msg);
  const khongCoSo = !v && loiCuoi.some((m) => /không đủ cơ sở/i.test(m));

  const dieuKhien = trinhDien
    ? `<div class="td-bar"><span class="td-nhan">Trình diễn</span>
<span class="td-toc" id="td-toc"><button data-toc="1">×1</button><button data-toc="2">×2</button><button data-toc="8" class="on">×8</button><button data-toc="16">×16</button></span>
<button class="btn btn-secondary" id="td-dung" type="button">❚❚ Tạm dừng</button>
<a class="btn btn-ghost" href="/runs/${escHtml(meta.id)}">✕ Thoát</a>
<span class="td-nhan" style="margin-left:auto">cổng merge chỉ đọc trong chế độ này</span></div>`
    : '';

  return shell(
    `${escHtml(meta.tieuDe)} — CheckMate`,
    `<a class="btn btn-ghost" href="/" style="padding-inline:0">← Dashboard</a>
<div class="run-hd"><div class="run-hd-trai">
<h6 class="dash-kicker">Lượt chấm · skill ${escHtml(meta.skill)}</h6>
<h3 style="margin:0">${escHtml(meta.tieuDe)}</h3>
<div class="run-meta">${escHtml(meta.repo ?? '')}${meta.pr ? ` · #${meta.pr.so} @ ${escHtml(meta.pr.headSha.slice(0, 7))}` : ''}${
      meta.pr?.tacGia ? ` · ${escHtml(meta.pr.tacGia)}` : ''
    } · run ${escHtml(meta.id)}</div></div>
<div class="run-dk"><span class="run-tt">${trinhDien ? 'đang trình diễn' : xong ? (meta.trangThai === 'loi' ? 'kết thúc — lỗi' : 'đã kết thúc') : '● đang chạy'}</span>
${xong && !trinhDien ? `<a class="btn btn-secondary" href="/runs/${escHtml(meta.id)}?trinh_dien=1">▶ Trình diễn</a>` : ''}</div></div>
${dieuKhien}${banStale}
<div class="hr"></div>
<div id="cac-buoc">${buocHtml}</div>
${banKhongLuat}${banVungMu}
<section id="findings">${dungSan ? dsFinding.map(findingHtml).join('') : ''}</section>
<div id="verdict-o">${dungSan ? (v ? verdictHtml(v) : khongCoSo ? khongRaVerdictHtml(loiCuoi[0]!) : '') : ''}</div>
${khoiCong(meta, trinhDien)}
<div class="err" id="err"${dungSan && loiCuoi.length && !khongCoSo ? ' style="display:block"' : ''}>${
      dungSan && !khongCoSo ? loiCuoi.map((m) => `<div style="margin-bottom:6px"><b>LỖI:</b> ${escHtml(m)}</div>`).join('') : ''
    }</div>`,
    JS_RUN(meta, trinhDien, daDung),
    { nguoi },
  );
}

/** mm:ss từ mốc ms — timestamp bên trái mỗi dòng log, đúng như gói khai. */
function mmss(ms: number): string {
  const g = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(g / 60)).padStart(2, '0')}:${String(g % 60).padStart(2, '0')}`;
}

/** Dòng log thuộc bước nào — suy từ mốc `stage` gần nhất trước nó. */
function thuocBuoc(suKien: StoredEvent[], x: StoredEvent, buoc: number): boolean {
  let hienTai = 1;
  for (const s of suKien) {
    if (s.e.type === 'stage') hienTai = s.e.stage;
    if (s === x) return hienTai === buoc;
  }
  return false;
}