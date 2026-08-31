import { chuanMuc } from '../../../packages/shared/src/types.js';
import { docConfig } from './config.js';
import type { RunMeta } from './runs.js';
import { JS_NCC } from './ui-ncc.js';
import { JS_REPO } from './ui-repo.js';

const CSS = `
  :root { --bg:#F2F5F4; --surface:#fff; --ink:#15242A; --muted:#5C6E74; --line:#DDE4E2;
    --teal:#0B6E66; --teal-soft:#DFEeea; --fail:#A83A2C; --fail-soft:#F7E5E1; --amber:#96590F; --amber-soft:#F6ECDC; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 "Segoe UI",system-ui,sans-serif; }
  .top { background:#132b30; color:#fff; padding:14px 0; }
  .top .wrap { display:flex; align-items:center; gap:14px; }
  .gear { margin-left:auto; color:#9db8b3; font-size:21px; line-height:1; text-decoration:none;
    padding:4px 8px; border-radius:7px; }
  .gear:hover { color:#fff; background:rgba(255,255,255,.08); }
  .gear:focus-visible { outline:2px solid #5FC7B4; outline-offset:2px; }
  .navlink { color:#9db8b3; font-size:13px; font-weight:600; text-decoration:none; padding:5px 10px; border-radius:7px; }
  .navlink:hover { color:#fff; background:rgba(255,255,255,.08); }
  .navlink:focus-visible { outline:2px solid #5FC7B4; outline-offset:2px; }
  .logo { font-size:19px; font-weight:700; letter-spacing:.02em; color:#fff; text-decoration:none; }
  a.logo:hover .mate { color:#8FE9D5; }
  a.logo:focus-visible { outline:2px solid #5FC7B4; outline-offset:3px; border-radius:4px; }
  .logo .mate { color:#5FC7B4; }
  .tag { font-size:12.5px; color:#9db8b3; }
  .wrap { max-width:980px; margin:0 auto; padding:0 20px; }
  main.wrap { padding-top:26px; padding-bottom:80px; }
  h1 { font-size:21px; margin:0 0 4px; } h2 { font-size:16px; margin:28px 0 10px; }
  .sub { color:var(--muted); font-size:13.5px; margin:0 0 18px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
  .card h3 { margin:0 0 4px; font-size:14.5px; }
  .card p { margin:0 0 12px; font-size:13px; color:var(--muted); }
  .badge { display:inline-block; font-size:10.5px; font-weight:650; letter-spacing:.05em; text-transform:uppercase;
    padding:2px 8px; border-radius:99px; margin-bottom:8px; }
  .b-code { background:var(--teal-soft); color:var(--teal); } .b-doc { background:var(--amber-soft); color:var(--amber); }
  button, .btn { background:var(--teal); color:#fff; border:0; border-radius:7px; padding:8px 16px; font-size:13.5px;
    font-weight:600; cursor:pointer; text-decoration:none; display:inline-block; }
  button:disabled { background:#9fb4b0; cursor:not-allowed; }
  .btn.phu { background:transparent; color:var(--teal); border:1px solid var(--teal); }
  textarea { width:100%; min-height:150px; border:1px solid var(--line); border-radius:8px; padding:12px; font:13px/1.5 Consolas,monospace; }
  .goiy { font-size:12.5px; color:var(--muted); margin:6px 0 10px; }
  .stages { list-style:none; padding:0; margin:0 0 20px; }
  .stages li { padding:8px 12px 8px 34px; position:relative; color:var(--muted); border-left:2px solid var(--line); }
  .stages li.on { color:var(--ink); font-weight:600; border-left-color:var(--teal); }
  .stages li.done { color:var(--ink); border-left-color:var(--teal); }
  .stages li.on::before { content:''; position:absolute; left:10px; top:13px; width:12px; height:12px; border-radius:50%;
    border:2px solid var(--teal); border-top-color:transparent; animation:quay 0.9s linear infinite; }
  .stages li.done::before { content:'✓'; position:absolute; left:10px; top:8px; color:var(--teal); font-weight:700; }
  @keyframes quay { to { transform:rotate(360deg); } }
  .logline { font-size:12px; color:var(--muted); padding:1px 12px 1px 34px; font-family:Consolas,monospace; white-space:pre-wrap; }
  .finding { border-left:4px solid var(--fail); background:var(--surface); border-radius:0 10px 10px 0;
    border-top:1px solid var(--line); border-right:1px solid var(--line); border-bottom:1px solid var(--line);
    padding:13px 16px; margin:12px 0; }
  .finding.sev-medium { border-left-color:var(--amber); }
  .finding.sev-low { border-left-color:#8a97a0; }
  .finding .sev { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--fail); }
  .finding.sev-medium .sev { color:var(--amber); }
  .finding.sev-low .sev { color:#5C6E74; }
  .cong { border:1px solid var(--line); border-radius:12px; background:var(--surface); padding:18px 22px; margin:18px 0; }
  .cong h3 { margin:0 0 8px; font-size:16px; }
  .cong .canhbao { border:1px solid var(--line); border-left:4px solid var(--amber); border-radius:0 8px 8px 0;
    padding:8px 12px; margin:8px 0; font-size:13px; display:flex; gap:9px; align-items:flex-start; }
  .cong button:disabled { background:#9fb4b0; }
  .cong .khoa { color:var(--fail); font-size:13px; font-weight:600; }
  .cong form.inline { display:inline-block; margin:8px 12px 0 0; vertical-align:top; }
  .cong input[type=text] { padding:7px 10px; border:1px solid var(--line); border-radius:7px; width:280px; font-size:13px; }
  .finding h3 { margin:3px 0 6px; font-size:14.5px; }
  .finding .row { font-size:13px; margin:3px 0; } .finding .row b { color:var(--muted); font-weight:600; }
  .ev { background:#f6f8f7; border:1px solid var(--line); border-radius:7px; padding:9px 12px; margin-top:8px;
    font-size:12.5px; }
  .ev .q { font-family:Georgia,serif; } .ev .loc { color:var(--muted); font-size:11.5px; }
  .ev pre { margin:4px 0 0; white-space:pre-wrap; font:11.5px/1.5 Consolas,monospace; overflow-x:auto; }
  .verdict { border-radius:12px; padding:20px 24px; margin:20px 0; color:#fff; display:none; }
  .verdict.PASS { background:linear-gradient(135deg,#0B6E66,#0d8a72); display:block; }
  .verdict.FAIL { background:linear-gradient(135deg,#A83A2C,#c2503b); display:block; }
  .verdict .kq { font-size:30px; font-weight:800; letter-spacing:.04em; }
  .verdict .chitiet { font-size:13px; opacity:.92; margin-top:4px; font-family:Consolas,monospace; }
  table.runs { border-collapse:collapse; width:100%; background:var(--surface); font-size:13.5px;
    border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  table.runs th { text-align:left; font-size:11px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted);
    padding:9px 13px; background:#e9eeec; }
  table.runs td { padding:9px 13px; border-top:1px solid var(--line); }
  .vd-pill { font-weight:700; } .vd-PASS { color:var(--teal); } .vd-FAIL { color:var(--fail); }
  button.phu-nho { background:transparent; color:var(--muted); border:1px solid var(--line); font-weight:500; }
  button.phu-nho:hover { color:var(--ink); border-color:var(--muted); }
  .err { background:var(--fail-soft); border-left:4px solid var(--fail); padding:11px 15px; border-radius:0 8px 8px 0; margin:14px 0; display:none; }
`;

// W8: mọi chuỗi ngoại lai (PR title từ GitHub, tên file upload, finding do model viết) phải qua đây trước khi vào DOM
export function escHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function khung(tieuDe: string, than: string, js = '', repoNhanEp = ''): string {
  // Badge repo đang chọn hiện trên MỌI trang — đọc thẳng config thay vì bắt từng trang truyền xuống
  let repoNhan = repoNhanEp;
  if (!repoNhan) {
    try {
      const c = docConfig();
      repoNhan = c.repos.length > 1 ? `${c.repo_dang_chon} ▾` : c.repo_dang_chon;
    } catch {
      repoNhan = '';
    }
  }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${tieuDe}</title><style>${CSS}</style></head>
<body><div class="top"><div class="wrap"><a class="logo" href="/" title="Về trang chính">Check<span class="mate">Mate</span> ♞</a>
<span class="tag">maker–checker cho code và tài liệu — checker không tin ai, chỉ tin bằng chứng</span>
${repoNhan ? `<span class="mono" style="margin-left:auto;font-size:12px;color:#9db8b3;border:1px solid rgba(255,255,255,.14);border-radius:99px;padding:3px 11px" title="repo đang chọn — đổi trong Cấu hình">${escHtml(repoNhan)}</span>` : ''}
<a class="navlink" href="/docs" ${repoNhan ? '' : 'style="margin-left:auto"'}>Nguyên tắc</a>
<a class="gear" href="/tin-cay" title="Thang tin cậy tác giả" aria-label="Thang tin cậy tác giả" style="margin-left:0">👤</a>
<a class="gear" href="/ledger" title="Sổ cái verdict" aria-label="Sổ cái verdict" style="margin-left:0">📒</a>
<a class="gear" href="/settings" title="Cài đặt" aria-label="Cài đặt" style="margin-left:0">⚙</a></div></div>
<main class="wrap">${than}</main>${js ? `<script>${js}</script>` : ''}</body></html>`;
}

export interface PrHienThi {
  so: number;
  tieuDe: string;
  tacGia: string;
  nhanh: string;
  headSha: string;
  // trạng thái review của ĐÚNG commit đang là head PR (nếu đã chấm)
  daCham?: { runId: string; ketQua: 'PASS' | 'FAIL'; soFinding: number };
}

export function khoiPrList(repoGithub: string, baseBranch: string, prs: PrHienThi[] | null, loiPr: string): string {
  const rows = (prs ?? [])
    .map(
      (p) => {
        const nutChay = `<form method="post" action="/api/runs" style="margin:0"><input type="hidden" name="kieu" value="pr"><input type="hidden" name="so" value="${p.so}">
<button${p.daCham ? ' class="phu-nho"' : ''}>${p.daCham ? 'Chạy lại' : 'Chạy kiểm'}</button></form>`;
        const trangThai = p.daCham
          ? `<span class="vd-pill vd-${p.daCham.ketQua}">${p.daCham.ketQua}</span> · ${p.daCham.soFinding} finding<br><a href="/runs/${p.daCham.runId}" style="font-size:12px">xem verdict &amp; cổng merge →</a>`
          : `<span style="color:var(--muted)">chưa kiểm</span>`;
        return `<tr><td class="mono">#${p.so}</td><td>${escHtml(p.tieuDe)}<br><span class="mono" style="font-size:11.5px;color:var(--muted)">${escHtml(p.nhanh)} @ ${p.headSha.slice(0, 7)}</span></td><td>${escHtml(p.tacGia)}</td>
<td>${trangThai}</td><td>${nutChay}</td></tr>`;
      },
    )
    .join('');
  return `<h2>PR chờ review — <span class="mono">${repoGithub}</span> → <span class="mono">${baseBranch}</span></h2>
<p class="sub">Tự nạp từ GitHub. Router quyết theo nội dung diff: PR code → skill A · PR chỉ tài liệu (.md) → skill B trên bản tài liệu của PR. <a href="/">↻ làm mới</a></p>
${loiPr ? `<div class="err" style="display:block">Không nạp được PR: ${loiPr}</div>` : ''}
${prs && prs.length ? `<table class="runs"><tr><th>#</th><th>Tiêu đề · nhánh</th><th>Tác giả</th><th>Trạng thái review</th><th></th></tr>${rows}</table>` : prs ? '<p class="sub">Không có PR mở nào nhắm vào nhánh đích.</p>' : ''}`;
}

export function khoiDaTraVe(runs: RunMeta[], repoGithub: string): string {
  if (!runs.length) return '';
  const rows = runs
    .slice(0, 10)
    .map(
      (m) => `<tr><td class="mono">#${m.pr!.so}</td><td>${escHtml(m.tieuDe)}</td>
<td class="mono" style="font-size:12px">${m.pr!.headSha.slice(0, 7)}</td>
<td style="font-size:12.5px">${m.ketQuaCong!.nguoi} · ${m.ketQuaCong!.luc.slice(0, 16).replace('T', ' ')}<br>
<a href="/runs/${m.id}" style="font-size:12px">xem phán quyết →</a> · <a href="https://github.com/${repoGithub}/pull/${m.pr!.so}" style="font-size:12px" target="_blank" rel="noopener">mở PR trên GitHub →</a></td></tr>`,
    )
    .join('');
  return `<h2>Đã trả về dev — chờ vá &amp; reopen</h2>
<p class="sub">PR đã đóng nên không còn trong hàng đợi chờ duyệt. Dev vá xong, push lên nhánh cũ rồi Reopen chính PR đó là nó quay lại hàng đợi.</p>
<table class="runs"><tr><th>#</th><th>Artifact</th><th>Commit đã chấm</th><th>Trả về bởi</th></tr>${rows}</table>`;
}

// Token vào/ra mỗi lượt — theo dõi chi phí ngay trên bảng, không phải đào log.
// Đường CLI không trả usage nên số là ước từ ký tự: đánh dấu ~ để không ai nhầm là số đo thật.
export function oToken(v?: { chi_phi?: { calls: number; token_vao: number; token_ra: number; uoc_tinh: boolean } }): string {
  const c = v?.chi_phi;
  if (!c) return '<span style="color:var(--muted)">—</span>';
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const dau = c.uoc_tinh ? '~' : '';
  return `<span class="mono" style="font-size:12px" title="${c.calls} call model · ${c.uoc_tinh ? 'ƯỚC TÍNH từ số ký tự (đường Claude Code CLI không trả usage)' : 'usage thật do API trả về'}">${dau}${k(c.token_vao)} / ${dau}${k(c.token_ra)}</span>`;
}

// verdict.model có dạng "<provider>/<model>" — tách ra hai cột để nhìn phát biết lượt đó
// chạy bằng nguồn nào (gói thuê bao hay ví API) và model gì.
export function tachNguon(model?: string): { nguon: string; ten: string; nguonMa: string } {
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
  const n = tachNguon(model);
  if (n.nguon === '—') return '<span style="color:var(--muted)">—</span>';
  const giaiThich = n.nguon === 'Gói thuê bao' ? 'Claude Code CLI — không tiêu credit API' : n.nguon === 'API' ? 'Anthropic API — tính tiền theo token' : n.nguon;
  return `<span title="${giaiThich}">${n.nguon}</span>`;
}

export function trangChu(runs: RunMeta[], prBlock = '', daTraVeBlock = ''): string {
  const rows = runs
    .map((r) => {
      // run cũ (trước khi có trường ketThuc) vẫn lấy được mốc kết thúc từ verdict
      const kt = r.ketThuc ?? r.verdict?.finished_at;
      const tg = thoiGianChay(r.batDau, kt);
      const ketQua =
        r.trangThai === 'dang_chay'
          ? 'đang chạy…'
          : `${r.verdict ? `<span class="vd-pill vd-${r.verdict.result}">${r.verdict.result}</span> · ${r.verdict.findings.length} finding` : 'lỗi'}${
              tg ? ` <span style="color:var(--muted);font-size:12px">· ${tg}</span>` : ''
            }`;
      return `<tr><td><a href="/runs/${r.id}">${escHtml(r.tieuDe)}</a></td><td>${r.skill}</td>
<td>${ketQua}</td>
<td style="font-size:12.5px">${nguonO(r.verdict?.model)}</td>
<td class="mono" style="font-size:12px;color:var(--muted)">${tachNguon(r.verdict?.model).ten}</td>
<td>${oToken(r.verdict)}</td>
<td style="color:var(--muted);white-space:nowrap;font-size:12.5px">${gio(r.batDau)}</td>
<td style="color:var(--muted);white-space:nowrap;font-size:12.5px">${gio(kt)}</td></tr>`;
    })
    .join('');
  return khung(
    'CheckMate',
    `<h1>Đưa artifact vào cổng kiểm</h1>
<p class="sub">Chọn PR từ repo đã kết nối, hoặc kiểm nhanh một tài liệu rời. CheckMate đọc spec, tự sinh phép thử, chạy bằng chứng thật rồi mới phán.</p>
${prBlock}
${daTraVeBlock}
<p class="sub" style="margin:-6px 0 16px"><a href="/lich-su">Xem toàn bộ lịch sử chạy →</a></p>
<h2>Kiểm nhanh một tài liệu rời (PRD / BA doc / spec)</h2>
<p class="sub">Đường phụ quick-check — tài liệu sống trong repo thì đi qua PR (bên trên) để có ngữ cảnh đầy đủ hơn.</p>
<form method="post" action="/api/runs" enctype="multipart/form-data" style="margin-bottom:14px">
<input type="hidden" name="kieu" value="upload">
<input type="file" name="tep" accept=".md,.txt,.docx,.pdf" style="font-size:13px">
<button style="margin-left:8px">Tải lên &amp; kiểm</button>
<span class="goiy" style="margin-left:8px">.md · .txt · .docx · .pdf (≤5MB; bản scan/ảnh chưa hỗ trợ)</span>
</form>
<form method="post" action="/api/runs"><input type="hidden" name="kieu" value="doc">
<textarea name="noi_dung" id="noidung" placeholder="…hoặc dán thẳng nội dung tài liệu (text / markdown)"></textarea>
<p class="goiy" id="goiy">Router: dán vào để nhận diện loại artifact.</p>
<button>Chạy kiểm tài liệu</button></form>
<p class="goiy">Code chỉ được kiểm qua PR của repo đã kết nối (skill A thực thi code thật). Dán diff code tự do không hỗ trợ.</p>
${rows ? `<h2>Lượt chạy gần đây</h2><table class="runs"><tr><th>Artifact</th><th>Skill</th><th>Kết quả</th><th title="nguồn model: gói thuê bao Claude Code hay ví API">Provider</th><th>Model</th><th title="token vào / token ra mỗi lượt chấm">Token (vào/ra)</th><th>Bắt đầu</th><th>Kết thúc</th></tr>${rows}</table>` : ''}`,
    `const ta=document.getElementById('noidung'),gy=document.getElementById('goiy');
ta.addEventListener('input',()=>{const v=ta.value;
if(/^diff --git|^@@|^index [0-9a-f]+\\.\\./m.test(v)) gy.textContent='Router: nội dung giống DIFF CODE — code chỉ kiểm qua PR trong danh sách bên trên.';
else if(v.trim()) gy.textContent='Router: nhận diện TÀI LIỆU YÊU CẦU → skill B (rubric 4 loại lỗi khách quan).';
else gy.textContent='Router: dán vào để nhận diện loại artifact.';});`,
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

export function trangSettings(v: SettingsView): string {
  const ro = v.mode === 'demo' ? 'disabled' : '';
  return khung(
    'Cấu hình — CheckMate',
    `<h1>Cấu hình</h1>
<p class="sub">Chế độ: <b>${v.mode === 'demo' ? 'DEMO (chỉ đọc — bản public khoá vào repo demo)' : 'ORG (self-host, chỉnh được)'}</b> · <a href="/">← về trang chính</a></p>
${v.daLuu ? '<div class="card" style="border-color:var(--teal);margin-bottom:14px">✓ Đã lưu cấu hình.</div>' : ''}
<form method="post" action="/settings">
<div class="card" style="max-width:760px;margin-bottom:14px">
  <h3>GitHub token — repo <span class="mono">${v.repoGithub}</span></h3>
  <p style="font-size:12.5px;color:var(--muted)">Mỗi repo giữ chìa riêng. Token dán ở đây CHỈ áp cho repo đang chọn; repo khác đặt chìa của nó ở khối “Repo đã kết nối” bên dưới. Fine-grained PAT cần: Pull requests (read &amp; write) · Contents (read) · Commit statuses (write) trên chính repo đó.</p>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Token — hiện tại: <span class="mono">${v.tokenChe}</span></label>
  <input name="github_token" type="password" placeholder="dán token mới để thay, bỏ trống để giữ nguyên" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  <p style="font-size:11.5px;color:var(--muted);margin:6px 0 0">Thêm repo mới thì đi bốn bước ở khối dưới — dán đường dẫn, dán chìa, kiểm kết nối, chọn nhánh.</p>
  <details style="margin-top:10px">
    <summary style="font-size:12.5px;cursor:pointer;color:var(--muted)">Sửa tay repo đang chọn (nâng cao)</summary>
    <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Repo (owner/tên)</label>
    <input name="repo_github" value="${v.repoGithub}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
    <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Nhánh đích</label>
    <input name="base_branch" value="${v.baseBranch}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
    <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Đường dẫn clone local</label>
    <input name="local_path" value="${v.localPath}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  </details>
</div>
${v.khoiRepoHtml}
${v.khoiNccHtml}
<div class="card" style="max-width:760px;margin-bottom:14px">
  <h3>Độ sâu review</h3>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Số phép thử tối đa mỗi lượt (2–12)</label>
  <input name="max_probe" type="number" min="2" max="12" value="${v.maxProbe}" ${ro} style="width:90px;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  <label style="display:block;font-size:12.5px;margin:10px 0 4px"><input type="checkbox" name="skeptic" value="1" ${v.skeptic ? 'checked' : ''} ${ro}> Bật vòng phản biện (skeptic) cho review tài liệu</label>
</div>
<div class="card" style="max-width:640px;margin-bottom:14px">
  <h3>Chế độ trực (PR-bot)</h3>
  <p style="font-size:12.5px;color:var(--muted)">Bật thì CheckMate tự quét hàng đợi theo chu kỳ: PR mới / commit mới được chấm tự động, verdict post lên PR kèm check status. Tắt = chỉ chấm khi bấm tay.</p>
  <label style="display:block;font-size:12.5px;margin:8px 0"><input type="checkbox" name="truc_bat" value="1" ${v.trucBat ? 'checked' : ''} ${ro}> Bật chế độ trực</label>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:8px 0 4px">Chu kỳ quét (giây, 60–3600)</label>
  <input name="truc_chu_ky" type="number" min="60" max="3600" value="${v.trucChuKy}" ${ro} style="width:110px;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
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
    JS_NCC + JS_REPO,
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

export function trangRun(meta: RunMeta, replay: boolean, speed = 1): string {
  const stages = ['Nhận artifact', 'Nạp spec / rubric', 'Sinh phép thử đối kháng', 'Chạy & đối chiếu bằng chứng', 'Kết luận'];
  return khung(
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
  d.innerHTML='<div class="sev">'+nhan+'</div><h3>'+esc(f.title_vi)+'</h3>'+
   '<div class="row"><b>Điều gì sai:</b> '+esc(f.what_vi)+'</div><div class="row"><b>Hậu quả:</b> '+esc(f.consequence_vi)+'</div>'+evHtml(f.evidence);
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
  );
}
