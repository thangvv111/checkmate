import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOC } from '../../../packages/shared/src/paths.js';
import { chuanMuc } from '../../../packages/shared/src/types.js';
import { MODE, readConfig } from './config.js';
import type { RunMeta } from './runs.js';
import { JS_PROVIDER } from './ui-provider.js';
import { JS_REPO } from './ui-repo.js';

/** Phiên bản hiện ở chân sidebar — đọc từ package.json để không trôi khỏi bản thật. */
const PHIEN_BAN: string = (() => {
  try {
    return (JSON.parse(readFileSync(join(GOC, 'package.json'), 'utf8')) as { version?: string }).version ?? '?';
  } catch {
    return '?';
  }
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

function khoiCong(meta: RunMeta): string {
  if (!meta.pr || meta.trangThai !== 'xong' || !meta.verdict) return '';
  const so = meta.pr.so;
  if (meta.ketQuaCong) {
    const k = meta.ketQuaCong;
    return `<div class="cong" style="border-color:var(--teal)"><h3>Cổng merge — PR #${so}</h3>
<p style="font-size:13.5px;margin:0">${k.hanhDong === 'merge' ? '✓ <b>ĐÃ MERGE</b>' : '↩ <b>ĐÃ TRẢ VỀ DEV</b>'} · ${k.chiTiet} · bởi <b>${k.nguoi}</b> lúc ${k.luc.slice(0, 16).replace('T', ' ')} · đã ghi receipt lên PR + sổ review-log</p></div>`;
  }
  const v = meta.verdict;
  const cao = v.findings.filter((f) => chuanMuc(f.severity) === 'high').length;
  const vua = v.findings.filter((f) => chuanMuc(f.severity) === 'medium');
  const nutMerge =
    cao > 0
      ? `<p class="khoa">✗ Có ${cao} finding HIGH — nút Merge khoá theo luật cổng. Vá xong push lên nhánh, chạy kiểm lại.</p>`
      : `${vua.length ? `<p style="font-size:13px;margin:8px 0 4px">Xác nhận TỪNG cảnh báo MEDIUM trước khi merge (được ghi vào receipt):</p>` : ''}
${vua.map((f) => `<label class="canhbao"><input type="checkbox" class="tick-med" data-fid="${escHtml(f.id)}"> <span><b>${escHtml(f.title_vi)}</b><br><span style="color:var(--muted)">${escHtml(f.what_vi)}</span></span></label>`).join('')}
<form class="inline" method="post" action="/api/runs/${meta.id}/merge" id="form-merge">
  <input type="hidden" name="tick_ids" id="tick_ids" value="">
  <button id="nut-merge" ${vua.length ? 'disabled' : ''}>✓ Merge PR #${so}</button>
</form>`;
  return `<div class="cong"><h3>Cổng merge — PR #${so} <span style="font-weight:400;color:var(--muted);font-size:12.5px">verdict ghim ${meta.pr.headSha.slice(0, 7)} · push mới là verdict hết hiệu lực</span></h3>
${nutMerge}
<form class="inline" method="post" action="/api/runs/${meta.id}/reject">
  <input type="text" name="ghi_chu" placeholder="Ghi chú thêm cho dev (tuỳ chọn)">
  <button class="phu" style="background:var(--fail)">↩ Trả về dev &amp; đóng PR</button>
</form>
<p class="goiy" style="margin-top:8px">Trả về dev = post phán quyết đầy đủ lên PR <b>và đóng PR</b> để nó rời hàng đợi chờ duyệt (khỏi bị chạy kiểm lại vô ích). Dev vá xong push lên nhánh cũ rồi <b>Reopen</b> chính PR này — lịch sử review giữ nguyên.</p></div>`;
}

export function runPage(meta: RunMeta, replay: boolean, speed = 1, nguoi = ''): string {
  const stages = ['Nhận artifact', 'Nạp spec / rubric', 'Sinh phép thử đối kháng', 'Chạy & đối chiếu bằng chứng', 'Kết luận'];
  return shell(
    `${escHtml(meta.tieuDe)} — CheckMate`,
    `<h1>${escHtml(meta.tieuDe)}</h1>
<p class="sub">Run <code>${meta.id}</code> · skill ${meta.skill} · ${replay ? 'PHÁT LẠI từ cache (nhịp thời gian thật)' : 'chạy trực tiếp'}
&nbsp;·&nbsp;<a href="/">← về trang chọn</a>${meta.trangThai === 'xong' && !replay ? ` &nbsp;·&nbsp; <a class="btn phu" href="/runs/${meta.id}?replay=1">▶ Phát lại</a> <a class="btn phu" href="/runs/${meta.id}?replay=1&speed=8" title="tua nhanh cho tổng duyệt">⏩ ×8</a>` : ''}</p>
<ul class="stages" id="stages">${stages.map((s, i) => `<li data-s="${i + 1}">${s}<div class="logs" id="logs-${i + 1}"></div></li>`).join('')}</ul>
<div id="findings"></div>
<div class="verdict" id="verdict"><div class="kq"></div><div class="chitiet"></div></div>
${khoiCong(meta)}
<div class="err" id="err"></div>`,
    `const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let cur=0;
function evHtml(ev){
 if(ev.type==='quote_pair')return '<div class="ev"><div class="loc">'+esc(ev.loc_a)+'</div><div class="q">«'+esc(ev.quote_a)+'»</div>'+
  '<div class="loc" style="margin-top:6px">đối lại — '+esc(ev.loc_b)+'</div><div class="q">«'+esc(ev.quote_b)+'»</div></div>';
 if(ev.type==='quote')return '<div class="ev"><div class="loc">'+esc(ev.rule)+' — '+esc(ev.loc)+'</div><div class="q">«'+esc(ev.quote)+'»</div></div>';
 return '<div class="ev"><div class="loc">'+esc(ev.probe_name)+'</div><pre>kỳ vọng:  '+esc(ev.expected)+'\\nthực tế:  '+esc((ev.actual||'').split('\\n')[0])+'</pre></div>';
}
function ve(e){
 if(e.type==='stage'){for(let i=1;i<e.stage;i++)document.querySelector('[data-s="'+i+'"]').className='done';
  document.querySelector('[data-s="'+e.stage+'"]').className='on';cur=e.stage;}
 else if(e.type==='log'&&e.msg!=='__END__'){const b=document.getElementById('logs-'+(cur||1));
  if(b){const d=document.createElement('div');d.className='logline';d.textContent=e.msg;b.appendChild(d);}}
 else if(e.type==='finding'){const f=e.finding,d=document.createElement('div');
  const muc=f.severity==='blocking'?'high':(f.severity==='non_blocking'?'medium':f.severity);
  d.className='finding sev-'+muc;
  const nhan={high:'✗ HIGH — chặn merge',medium:'⚠ MEDIUM — cảnh báo',low:'△ LOW'}[muc]||muc;
  /* Phân loại ODC — telemetry, chỉ hiện khi CÓ; vắng thì không chiếm chỗ, và "unknown" vẫn hiện
     để người đọc biết model đã trả một giá trị không đọc được (khác hẳn với model im lặng). */
  const pl=[f.odc_type&&('type: '+f.odc_type),f.qualifier&&('qualifier: '+f.qualifier)].filter(Boolean).join(' · ');
  d.innerHTML='<div class="sev">'+nhan+(pl?' <span style="opacity:.72;font-weight:400">· '+esc(pl)+'</span>':'')+'</div><h3>'+esc(f.title_vi)+'</h3>'+
   '<div class="row"><b>Điều gì sai:</b> '+esc(f.what_vi)+'</div><div class="row"><b>Hậu quả:</b> '+esc(f.consequence_vi)+'</div>'+
   (f.minimal_fix?'<div class="row"><b>Bản vá tối thiểu:</b> '+esc(f.minimal_fix)+'</div>':'')+evHtml(f.evidence);
  document.getElementById('findings').appendChild(d);}
 else if(e.type==='verdict'){const v=e.verdict;document.querySelectorAll('.stages li').forEach(li=>li.className='done');
  const kv=document.getElementById('verdict');kv.className='verdict '+v.result;
  kv.querySelector('.kq').textContent=v.result==='FAIL'?'✗ FAIL — bị bác':'✓ PASS — qua cổng';
  const dm=m=>v.findings.filter(f=>(f.severity==='blocking'?'high':(f.severity==='non_blocking'?'medium':f.severity))===m).length;
  var cp=v.chi_phi, sCp='';
  if(cp){ var kk=function(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);};
    sCp=' · '+(cp.uoc_tinh?'~':'')+kk(cp.token_vao)+' token vào / '+(cp.uoc_tinh?'~':'')+kk(cp.token_ra)+' ra ('+cp.calls+' call'+(cp.uoc_tinh?', ước tính':'')+')'; }
  kv.querySelector('.chitiet').textContent=v.artifact_ref.name+' @ '+v.artifact_ref.sha_or_hash.slice(0,10)+
   ' · '+v.findings.length+' finding ('+dm('high')+' high · '+dm('medium')+' medium · '+dm('low')+' low) · '+v.model+sCp;
  const qs=v.quan_sat_ngoai_pr||[];
  if(qs.length){const box=document.createElement('div');box.className='ev';box.style.marginTop='10px';
   box.innerHTML='<div class="loc">Quan sát NGOÀI phạm vi PR — không tính vào verdict (lỗi tồn tại trên cả nhánh gốc, nên mở việc riêng)</div>'+
   qs.map(q=>'<div class="logline" style="padding-left:0">'+(q.loai==='nghi_loi_co_san'?'⚠ nghi LỖI CÓ SẴN':'· ngoài phạm vi')+' — '+esc(q.probe_id)+' ('+esc(q.spec_rule)+'): '+esc(q.ten)+'</div>').join('');
   kv.after(box);}
  if(!document.querySelector('.cong')&&${meta.pr ? 'true' : 'false'}){const a=document.createElement('p');
   a.innerHTML='<a class="btn" href="">↻ Tải lại trang để mở cổng Merge / Trả về dev</a>';kv.after(a);}}
 else if(e.type==='error'){const er=document.getElementById('err');er.style.display='block';const d=document.createElement('div');d.style.marginBottom='6px';d.innerHTML='<b>LỖI:</b> '+esc(e.msg);er.appendChild(d);}
}
document.querySelectorAll('.tick-med').forEach(c=>c.addEventListener('change',()=>{
  const t=document.querySelectorAll('.tick-med');const n=[...t].filter(x=>x.checked).length;
  document.getElementById('tick_ids').value=[...t].filter(x=>x.checked).map(x=>x.dataset.fid).join(',');
  document.getElementById('nut-merge').disabled = n!==t.length;
}));
const es=new EventSource('/api/runs/${meta.id}/events${replay ? (speed > 1 ? `?timed=1&speed=${speed}` : '?timed=1') : ''}');
es.onmessage=m=>{const{e}=JSON.parse(m.data);if(e.type==='log'&&e.msg==='__END__'){es.close();return;}ve(e);};
es.onerror=()=>{};`,
    { nguoi },
  );
}
