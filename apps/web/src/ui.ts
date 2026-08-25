import { chuanMuc } from '../../../packages/shared/src/types.js';
import type { RunMeta } from './runs.js';

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
  .logo { font-size:19px; font-weight:700; letter-spacing:.02em; }
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

export function khung(tieuDe: string, than: string, js = ''): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${tieuDe}</title><style>${CSS}</style></head>
<body><div class="top"><div class="wrap"><span class="logo">Check<span class="mate">Mate</span> ♞</span>
<span class="tag">maker–checker cho code và tài liệu — checker không tin ai, chỉ tin bằng chứng</span>
<a class="gear" href="/tin-cay" title="Thang tin cậy tác giả" aria-label="Thang tin cậy tác giả" style="margin-left:auto">👤</a>
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
        return `<tr><td class="mono">#${p.so}</td><td>${p.tieuDe}<br><span class="mono" style="font-size:11.5px;color:var(--muted)">${p.nhanh} @ ${p.headSha.slice(0, 7)}</span></td><td>${p.tacGia}</td>
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
      (m) => `<tr><td class="mono">#${m.pr!.so}</td><td>${m.tieuDe}</td>
<td class="mono" style="font-size:12px">${m.pr!.headSha.slice(0, 7)}</td>
<td style="font-size:12.5px">${m.ketQuaCong!.nguoi} · ${m.ketQuaCong!.luc.slice(0, 16).replace('T', ' ')}<br>
<a href="/runs/${m.id}" style="font-size:12px">xem phán quyết →</a> · <a href="https://github.com/${repoGithub}/pull/${m.pr!.so}" style="font-size:12px" target="_blank" rel="noopener">mở PR trên GitHub →</a></td></tr>`,
    )
    .join('');
  return `<h2>Đã trả về dev — chờ vá &amp; reopen</h2>
<p class="sub">PR đã đóng nên không còn trong hàng đợi chờ duyệt. Dev vá xong, push lên nhánh cũ rồi Reopen chính PR đó là nó quay lại hàng đợi.</p>
<table class="runs"><tr><th>#</th><th>Artifact</th><th>Commit đã chấm</th><th>Trả về bởi</th></tr>${rows}</table>`;
}

export function trangChu(runs: RunMeta[], prBlock = '', daTraVeBlock = ''): string {
  const rows = runs
    .map(
      (r) => `<tr><td><a href="/runs/${r.id}">${r.tieuDe}</a></td><td>${r.skill}</td>
<td>${r.trangThai === 'dang_chay' ? 'đang chạy…' : r.verdict ? `<span class="vd-pill vd-${r.verdict.result}">${r.verdict.result}</span> · ${r.verdict.findings.length} finding` : 'lỗi'}</td>
<td style="color:var(--muted)">${r.batDau.slice(0, 16).replace('T', ' ')}</td></tr>`,
    )
    .join('');
  return khung(
    'CheckMate',
    `<h1>Đưa artifact vào cổng kiểm</h1>
<p class="sub">Chọn PR từ repo đã kết nối, hoặc kiểm nhanh một tài liệu rời. CheckMate đọc spec, tự sinh phép thử, chạy bằng chứng thật rồi mới phán.</p>
${prBlock}
${daTraVeBlock}
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
${rows ? `<h2>Lượt chạy gần đây</h2><table class="runs"><tr><th>Artifact</th><th>Skill</th><th>Kết quả</th><th>Lúc</th></tr>${rows}</table>` : ''}`,
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
  provider: string;
  model: string;
  maxProbe: number;
  skeptic: boolean;
  trucBat: boolean;
  trucChuKy: number;
  trucComment: boolean;
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
<div class="card" style="max-width:640px;margin-bottom:14px">
  <h3>Kết nối repo GitHub</h3>
  <p style="font-size:12.5px;color:var(--muted)">Tool review PR nhắm vào nhánh đích của repo này. Token dạng PAT chỉ cần quyền đọc repo + pull request.</p>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Repo (owner/tên)</label>
  <input name="repo_github" value="${v.repoGithub}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Nhánh đích (PR merge vào đây thì cần review)</label>
  <input name="base_branch" value="${v.baseBranch}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Đường dẫn clone local (harness chạy trên đây)</label>
  <input name="local_path" value="${v.localPath}" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">GitHub token — hiện tại: <span class="mono">${v.tokenChe}</span></label>
  <input name="github_token" type="password" placeholder="dán token mới để thay, bỏ trống để giữ nguyên" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
</div>
<div class="card" style="max-width:640px;margin-bottom:14px">
  <h3>Agent review</h3>
  <p style="font-size:12.5px;color:var(--muted)">Trước mắt hỗ trợ Claude Code (CLI của máy) và Anthropic API. Độ sâu review là proxy cho effort — effort nội bộ của agent sẽ cắm thêm khi CLI/API mở tham số.</p>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Provider</label>
  <select name="provider" ${ro} style="padding:7px 10px;border:1px solid var(--line);border-radius:7px">
    <option value="cli" ${v.provider === 'cli' ? 'selected' : ''}>Claude Code CLI (đăng nhập của máy)</option>
    <option value="api" ${v.provider === 'api' ? 'selected' : ''}>Anthropic API (cần ANTHROPIC_API_KEY)</option>
  </select>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Model</label>
  <select name="model" ${ro} style="padding:7px 10px;border:1px solid var(--line);border-radius:7px">
    ${['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'].map((m) => `<option value="${m}" ${v.model === m ? 'selected' : ''}>${m}</option>`).join('')}
  </select>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Độ sâu review — số phép thử tối đa mỗi lượt (2–12)</label>
  <input name="max_probe" type="number" min="2" max="12" value="${v.maxProbe}" ${ro} style="width:90px;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  <label style="display:block;font-size:12.5px;margin:10px 0 4px"><input type="checkbox" name="skeptic" value="1" ${v.skeptic ? 'checked' : ''} ${ro}> Bật vòng phản biện (skeptic) cho review tài liệu</label>
</div>
<div class="card" style="max-width:640px;margin-bottom:14px">
  <h3>Chế độ trực (PR-bot)</h3>
  <p style="font-size:12.5px;color:var(--muted)">Bật thì CheckMate tự quét hàng đợi theo chu kỳ: PR mới / commit mới được chấm tự động, verdict post lên PR kèm check status. Tắt = chỉ chấm khi bấm tay.</p>
  <label style="display:block;font-size:12.5px;margin:8px 0"><input type="checkbox" name="truc_bat" value="1" ${v.trucBat ? 'checked' : ''} ${ro}> Bật chế độ trực</label>
  <label style="display:block;font-size:12.5px;font-weight:600;margin:8px 0 4px">Chu kỳ quét (giây, 60–3600)</label>
  <input name="truc_chu_ky" type="number" min="60" max="3600" value="${v.trucChuKy}" ${ro} style="width:110px;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
  <label style="display:block;font-size:12.5px;margin:10px 0 4px"><input type="checkbox" name="truc_comment" value="1" ${v.trucComment ? 'checked' : ''} ${ro}> Tự post verdict comment + check status lên GitHub khi chấm xong</label>
</div>
${v.mode === 'org' ? '<button>Lưu cấu hình</button>' : '<p class="goiy">Bản demo public không cho sửa — self-host với cờ <code>--org</code> để mở cấu hình.</p>'}
</form>`,
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
${vua.map((f, i) => `<label class="canhbao"><input type="checkbox" class="tick-med" data-i="${i}"> <span><b>${f.title_vi}</b><br><span style="color:var(--muted)">${f.what_vi}</span></span></label>`).join('')}
<form class="inline" method="post" action="/api/runs/${meta.id}/merge" id="form-merge">
  <input type="hidden" name="da_tick" id="da_tick" value="0">
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

export function trangRun(meta: RunMeta, replay: boolean): string {
  const stages = ['Nhận artifact', 'Nạp spec / rubric', 'Sinh phép thử đối kháng', 'Chạy & đối chiếu bằng chứng', 'Kết luận'];
  return khung(
    `${meta.tieuDe} — CheckMate`,
    `<h1>${meta.tieuDe}</h1>
<p class="sub">Run <code>${meta.id}</code> · skill ${meta.skill} · ${replay ? 'PHÁT LẠI từ cache (nhịp thời gian thật)' : 'chạy trực tiếp'}
&nbsp;·&nbsp;<a href="/">← về trang chọn</a>${meta.trangThai === 'xong' && !replay ? ` &nbsp;·&nbsp; <a class="btn phu" href="/runs/${meta.id}?replay=1">▶ Phát lại</a>` : ''}</p>
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
  kv.querySelector('.chitiet').textContent=v.artifact_ref.name+' @ '+v.artifact_ref.sha_or_hash.slice(0,10)+
   ' · '+v.findings.length+' finding ('+dm('high')+' high · '+dm('medium')+' medium · '+dm('low')+' low) · '+v.model;
  if(!document.querySelector('.cong')&&${meta.pr ? 'true' : 'false'}){const a=document.createElement('p');
   a.innerHTML='<a class="btn" href="">↻ Tải lại trang để mở cổng Merge / Trả về dev</a>';kv.after(a);}}
 else if(e.type==='error'){const er=document.getElementById('err');er.style.display='block';const d=document.createElement('div');d.style.marginBottom='6px';d.innerHTML='<b>LỖI:</b> '+esc(e.msg);er.appendChild(d);}
}
document.querySelectorAll('.tick-med').forEach(c=>c.addEventListener('change',()=>{
  const t=document.querySelectorAll('.tick-med');const n=[...t].filter(x=>x.checked).length;
  document.getElementById('da_tick').value=String(n);
  document.getElementById('nut-merge').disabled = n!==t.length;
}));
const es=new EventSource('/api/runs/${meta.id}/events${replay ? '?timed=1' : ''}');
es.onmessage=m=>{const{e}=JSON.parse(m.data);if(e.type==='log'&&e.msg==='__END__'){es.close();return;}ve(e);};
es.onerror=()=>{};`,
  );
}
