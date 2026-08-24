import type { Preset } from './presets.js';
import type { RunMeta } from './runs.js';

const CSS = `
  :root { --bg:#F2F5F4; --surface:#fff; --ink:#15242A; --muted:#5C6E74; --line:#DDE4E2;
    --teal:#0B6E66; --teal-soft:#DFEeea; --fail:#A83A2C; --fail-soft:#F7E5E1; --amber:#96590F; --amber-soft:#F6ECDC; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 "Segoe UI",system-ui,sans-serif; }
  .top { background:#132b30; color:#fff; padding:14px 0; }
  .top .wrap { display:flex; align-items:baseline; gap:14px; }
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
  .finding.nb { border-left-color:var(--amber); }
  .finding .sev { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--fail); }
  .finding.nb .sev { color:var(--amber); }
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
  .err { background:var(--fail-soft); border-left:4px solid var(--fail); padding:11px 15px; border-radius:0 8px 8px 0; margin:14px 0; display:none; }
`;

export function khung(tieuDe: string, than: string, js = ''): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${tieuDe}</title><style>${CSS}</style></head>
<body><div class="top"><div class="wrap"><span class="logo">Check<span class="mate">Mate</span> ♞</span>
<span class="tag">maker–checker cho code và tài liệu — checker không tin ai, chỉ tin bằng chứng</span></div></div>
<main class="wrap">${than}</main>${js ? `<script>${js}</script>` : ''}</body></html>`;
}

export function trangChu(presets: Preset[], runs: RunMeta[]): string {
  const cards = presets
    .map(
      (p) => `<div class="card"><span class="badge b-${p.skill}">${p.skill === 'code' ? 'Code-PR · skill A' : 'Tài liệu · skill B'}</span>
<h3>${p.tieuDe}</h3><p>${p.moTa}</p>
<form method="post" action="/api/runs"><input type="hidden" name="kieu" value="preset"><input type="hidden" name="preset" value="${p.id}">
<button>Chạy kiểm</button></form></div>`,
    )
    .join('');
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
<p class="sub">Chọn một PR / tài liệu mẫu, hoặc dán tài liệu của bạn. CheckMate đọc spec, tự sinh phép thử, chạy bằng chứng thật rồi mới phán.</p>
<h2>Bộ mẫu demo</h2><div class="grid">${cards}</div>
<h2>Hoặc dán tài liệu yêu cầu của bạn (PRD / BA doc / spec)</h2>
<form method="post" action="/api/runs"><input type="hidden" name="kieu" value="doc">
<textarea name="noi_dung" id="noidung" placeholder="Dán nội dung tài liệu (text / markdown)…"></textarea>
<p class="goiy" id="goiy">Router: dán vào để nhận diện loại artifact.</p>
<button>Chạy kiểm tài liệu</button></form>
<p class="goiy">Bản public chỉ nhận bộ mẫu + tài liệu dán tay. Dán URL PR GitHub: sắp mở (kèm rào an toàn). Diff code tự do chỉ chạy ở chế độ trình diễn local.</p>
${rows ? `<h2>Lượt chạy gần đây</h2><table class="runs"><tr><th>Artifact</th><th>Skill</th><th>Kết quả</th><th>Lúc</th></tr>${rows}</table>` : ''}`,
    `const ta=document.getElementById('noidung'),gy=document.getElementById('goiy');
ta.addEventListener('input',()=>{const v=ta.value;
if(/^diff --git|^@@|^index [0-9a-f]+\\.\\./m.test(v)) gy.textContent='Router: nội dung giống DIFF CODE — bản public chỉ kiểm tài liệu; PR code hãy dùng bộ mẫu.';
else if(v.trim()) gy.textContent='Router: nhận diện TÀI LIỆU YÊU CẦU → skill B (rubric 4 loại lỗi khách quan).';
else gy.textContent='Router: dán vào để nhận diện loại artifact.';});`,
  );
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
  d.className='finding'+(f.severity==='blocking'?'':' nb');
  d.innerHTML='<div class="sev">'+(f.severity==='blocking'?'✗ mức chặn':'△ không chặn')+'</div><h3>'+esc(f.title_vi)+'</h3>'+
   '<div class="row"><b>Điều gì sai:</b> '+esc(f.what_vi)+'</div><div class="row"><b>Hậu quả:</b> '+esc(f.consequence_vi)+'</div>'+evHtml(f.evidence);
  document.getElementById('findings').appendChild(d);}
 else if(e.type==='verdict'){const v=e.verdict;document.querySelectorAll('.stages li').forEach(li=>li.className='done');
  const kv=document.getElementById('verdict');kv.className='verdict '+v.result;
  kv.querySelector('.kq').textContent=v.result==='FAIL'?'✗ FAIL — bị bác':'✓ PASS — qua cổng';
  kv.querySelector('.chitiet').textContent=v.artifact_ref.name+' @ '+v.artifact_ref.sha_or_hash.slice(0,10)+
   ' · '+v.findings.length+' finding ('+v.findings.filter(f=>f.severity==='blocking').length+' chặn) · '+v.model;}
 else if(e.type==='error'){const er=document.getElementById('err');er.style.display='block';er.textContent='LỖI: '+e.msg;}
}
const es=new EventSource('/api/runs/${meta.id}/events${replay ? '?timed=1' : ''}');
es.onmessage=m=>{const{e}=JSON.parse(m.data);if(e.type==='log'&&e.msg==='__END__'){es.close();return;}ve(e);};
es.onerror=()=>{};`,
  );
}
