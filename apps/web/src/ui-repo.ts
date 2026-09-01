import { escHtml } from './ui.js';
import type { RepoConfig } from './config.js';

// Khối "Repo đã kết nối" trong Cấu hình. Từ L2, mỗi repo mang CHÌA RIÊNG (R4.18) nên khối này phải
// nói được ba chuyện cho từng repo: chìa nào đang mở nó, repo nào đang thiếu chìa, và thêm repo mới
// thì đi qua bốn bước có cổng kiểm thật (R4.22) thay vì gõ tay rồi hy vọng.

export interface RepoView extends RepoConfig {
  co_token: boolean;
  token_rieng: boolean;
  /** Máy chủ có `gh` đã đăng nhập — bậc 3 của R4.20, vẫn chấm được dù repo chưa có chìa riêng */
  co_gh: boolean;
}

export interface RepoSectionView {
  repos: RepoView[];
  dangChon: string;
  hasToken: boolean;
  moKhoa: boolean;
}

const CHIP = 'font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:99px;margin-left:4px';

function chipToken(r: RepoView): string {
  if (r.token_rieng) return `<span style="${CHIP};background:var(--teal-soft);color:var(--teal)">chìa riêng</span>`;
  if (r.co_token)
    return `<span style="${CHIP};background:var(--amber-soft);color:var(--amber)" title="Đang dùng GITHUB_TOKEN của máy chủ — chìa chung cho mọi repo chưa có chìa riêng">chìa chung</span>`;
  if (r.co_gh)
    return `<span style="${CHIP};background:var(--amber-soft);color:var(--amber)" title="Đang đi bằng lệnh gh đã đăng nhập trên máy chủ — chạy được, nhưng chìa là của người đăng nhập gh chứ không phải của repo">chìa máy (gh)</span>`;
  return `<span style="${CHIP};background:var(--fail-soft);color:var(--fail)" title="Không chấm được repo này cho tới khi có token">thiếu token</span>`;
}

export function repoSection(v: RepoSectionView): string {
  const ro = v.moKhoa ? '' : 'disabled';
  const dong = v.repos
    .map((r) => {
      const chon = r.github === v.dangChon;
      const vien = !r.co_token && !r.co_gh ? 'var(--fail-soft)' : chon ? 'var(--teal)' : 'var(--line)';
      return `<div class="repo-row" style="display:flex;align-items:center;gap:10px;border:1px solid ${vien};border-radius:8px;padding:9px 12px;margin:6px 0;background:var(--surface)">
  <div style="flex:1;min-width:0">
    <div style="font-size:13.5px;font-weight:600">${escHtml(r.github)}
      ${chon ? `<span style="${CHIP};background:var(--teal-soft);color:var(--teal)">đang chọn</span>` : ''}
      ${r.truc ? `<span style="${CHIP};background:var(--amber-soft);color:var(--amber)">trực</span>` : ''}
      ${chipToken(r)}
    </div>
    <div class="mono" style="font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">nhánh đích ${escHtml(r.base_branch)} · ${escHtml(r.local_path)}</div>
    ${r.co_token || r.co_gh ? '' : '<div style="font-size:11.5px;color:var(--fail);margin-top:3px">Chưa có token — repo này không đem đi chấm được. Bấm “Đặt token” để dán chìa cho nó.</div>'}
  </div>
  <button type="button" class="phu-nho nut-token-repo" data-repo="${escHtml(r.github)}" ${ro}>${r.token_rieng ? 'Đổi token' : 'Đặt token'}</button>
  ${chon ? '' : `<button type="button" class="phu-nho nut-chon-repo" data-repo="${escHtml(r.github)}" ${ro}>Chọn</button>`}
  <button type="button" class="phu-nho nut-go-repo" data-repo="${escHtml(r.github)}" ${ro} style="color:var(--fail);border-color:var(--fail-soft)">Gỡ</button>
</div>`;
    })
    .join('');

  const o = 'width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px';
  return `<div class="card" style="max-width:760px;margin-bottom:14px">
  <h3>Repo đã kết nối</h3>
  <p style="font-size:12.5px;color:var(--muted)">Mỗi repo giữ chìa, nhánh đích và clone riêng. Repo đang chọn quyết định hàng đợi PR ở trang chính; lịch sử chấm lưu theo từng repo.</p>
  ${dong || '<p class="sub">Chưa có repo nào.</p>'}

  <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Thêm repo</div>

    <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:3px">1 · Đường dẫn repo</label>
    <input id="repo-url" type="text" placeholder="https://github.com/owner/repo — hoặc owner/repo" ${ro} style="${o}">

    <label style="display:block;font-size:12px;color:var(--muted);margin:9px 0 3px">2 · Token của repo này</label>
    <input id="repo-token" type="password" placeholder="ghp_… — quyền đọc repo và pull request (thêm quyền ghi nếu dùng cổng Merge)" ${ro} style="${o}">

    <div style="margin-top:10px">
      <button type="button" id="nut-kiem-repo" class="phu-nho" ${ro}>3 · Kiểm kết nối</button>
      <span id="kq-kiem" style="font-size:12.5px;margin-left:10px;color:var(--muted)">gọi thật GitHub bằng chìa vừa dán, chưa lưu gì</span>
    </div>

    <div id="buoc4" style="display:none;margin-top:11px;border-top:1px dashed var(--line);padding-top:11px">
      <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:3px">4 · Nhánh gốc để đối chứng</label>
      <select id="repo-nhanh" style="${o}"></select>
      <button type="button" id="nut-them-repo" class="phu-nho" style="margin-top:9px">Thêm repo và clone</button>
      <span id="kq-them" style="font-size:12.5px;margin-left:10px;color:var(--muted)"></span>
    </div>

    <div style="margin-top:12px">
      <button type="button" id="nut-nap-repo" class="phu-nho" ${ro}>Không nhớ tên repo? Liệt kê repo mà chìa này mở được</button>
      <div id="ds-repo" style="margin-top:10px"></div>
    </div>
  </div>
</div>`;
}

export const JS_REPO = String.raw`
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var oKiem=document.getElementById('kq-kiem'), oThem=document.getElementById('kq-them'), oDs=document.getElementById('ds-repo');
  var iUrl=document.getElementById('repo-url'), iToken=document.getElementById('repo-token');
  var sNhanh=document.getElementById('repo-nhanh'), dBuoc4=document.getElementById('buoc4');
  var githubDaKiem='';

  function bao(o, ok, van){ if(!o) return; o.style.color = ok ? 'var(--teal)' : 'var(--fail)'; o.textContent=(ok?'✓ ':'✗ ')+van; }

  // Đổi URL hay token thì kết quả kiểm cũ hết giá trị — đóng bước 4 lại, kẻo thêm repo bằng chìa đã bỏ
  function huyKiem(){
    githubDaKiem='';
    if(dBuoc4) dBuoc4.style.display='none';
    if(oKiem){ oKiem.style.color='var(--muted)'; oKiem.textContent='đã đổi thông tin — kiểm lại kết nối'; }
  }
  if(iUrl) iUrl.addEventListener('input', huyKiem);
  if(iToken) iToken.addEventListener('input', huyKiem);

  var nutKiem=document.getElementById('nut-kiem-repo');
  if(nutKiem) nutKiem.addEventListener('click', function(){
    if(!iUrl.value.trim()){ bao(oKiem,false,'Dán đường dẫn repo ở bước 1 trước.'); return; }
    nutKiem.disabled=true; oKiem.style.color='var(--muted)'; oKiem.textContent='Đang hỏi GitHub…';
    fetch('/api/repo/kiem',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({url:iUrl.value, token:iToken.value})})
      .then(function(r){return r.json();}).then(function(d){
        if(!d.ok){ bao(oKiem,false,d.thong_diep||d.loi||'không kiểm được'); return; }
        githubDaKiem=d.github;
        var canhBao = d.quyen_ghi ? '' : (iToken.value.trim()
          ? ' Chìa này CHỈ ĐỌC — cổng Merge/Reject sẽ không dùng được.'
          : ' Chưa dán token nên chỉ đọc được repo công khai — cổng Merge/Reject sẽ không dùng được.');
        bao(oKiem,true,d.thong_diep+canhBao);
        var ds=(d.nhanh&&d.nhanh.length)?d.nhanh:[d.nhanh_mac_dinh];
        sNhanh.innerHTML=ds.map(function(n){
          return '<option value="'+esc(n)+'"'+(n===d.nhanh_mac_dinh?' selected':'')+'>'+esc(n)+(n===d.nhanh_mac_dinh?' (mặc định)':'')+'</option>';
        }).join('');
        dBuoc4.style.display='block';
      }).catch(function(e){ bao(oKiem,false,'Không gọi được: '+e); })
      .finally(function(){ nutKiem.disabled=false; });
  });

  var nutThem=document.getElementById('nut-them-repo');
  if(nutThem) nutThem.addEventListener('click', function(){
    if(!githubDaKiem){ bao(oThem,false,'Kiểm kết nối ở bước 3 trước đã.'); return; }
    nutThem.disabled=true; oThem.style.color='var(--muted)';
    oThem.textContent='Đang clone '+githubDaKiem+' về máy chủ (repo lớn có thể mất một lúc)…';
    fetch('/api/repo/them',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({github:githubDaKiem, base_branch:sNhanh.value, token:iToken.value})})
      .then(function(r){return r.json();}).then(function(d){
        if(d.ok){ location.href='/settings?luu=1'; return; }
        bao(oThem,false,d.loi||'không thêm được'); nutThem.disabled=false;
      }).catch(function(e){ bao(oThem,false,'Không gọi được: '+e); nutThem.disabled=false; });
  });

  var nutNap=document.getElementById('nut-nap-repo');
  if(nutNap) nutNap.addEventListener('click', function(){
    nutNap.disabled=true; oKiem.style.color='var(--muted)'; oKiem.textContent='Đang hỏi GitHub…';
    fetch('/api/github/repos',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({token:iToken?iToken.value:''})}).then(function(r){return r.json();}).then(function(d){
      if(d.loi){ bao(oKiem,false,d.loi); return; }
      oKiem.style.color='var(--muted)'; oKiem.textContent='Chìa này mở được '+d.length+' repo — bấm để điền vào bước 1:';
      oDs.innerHTML='<div style="max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:8px">'+
        d.map(function(r){
          return '<div style="display:flex;align-items:center;gap:8px;padding:7px 11px;border-bottom:1px solid var(--line);font-size:13px">'+
            '<span style="flex:1;min-width:0">'+esc(r.full_name)+
              (r.private?' <span style="font-size:10px;color:var(--muted)">riêng tư</span>':'')+
              '<br><span class="mono" style="font-size:11px;color:var(--muted)">nhánh mặc định '+esc(r.default_branch)+'</span></span>'+
            (r.da_them
              ? '<span style="font-size:11.5px;color:var(--teal)">đã thêm</span>'
              : '<button type="button" class="phu-nho nut-dien-repo" data-repo="'+esc(r.full_name)+'">Dùng repo này</button>')+
          '</div>';
        }).join('')+'</div>';
      document.querySelectorAll('.nut-dien-repo').forEach(function(b){
        b.addEventListener('click', function(){ iUrl.value=b.dataset.repo; huyKiem(); nutKiem.click(); });
      });
    }).catch(function(e){ bao(oKiem,false,'Không gọi được: '+e); })
      .finally(function(){ nutNap.disabled=false; });
  });

  function goiRepo(duong, body, nut){
    if(nut) nut.disabled=true;
    fetch(duong,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json();}).then(function(d){
        if(d.ok){ location.href='/settings?luu=1'; }
        else { bao(oKiem,false,d.loi||d.thong_diep||'không thực hiện được'); if(nut) nut.disabled=false; }
      }).catch(function(e){ bao(oKiem,false,'Không gọi được: '+e); if(nut) nut.disabled=false; });
  }
  document.querySelectorAll('.nut-token-repo').forEach(function(b){
    b.addEventListener('click', function(){
      var t=prompt('Token GitHub cho '+b.dataset.repo+' (để trống rồi OK = xoá chìa riêng của repo này)');
      if(t===null) return;
      goiRepo('/api/repo/token',{github:b.dataset.repo, token:t}, b);
    });
  });
  document.querySelectorAll('.nut-chon-repo').forEach(function(b){
    b.addEventListener('click', function(){ goiRepo('/api/repo/chon',{github:b.dataset.repo}, b); });
  });
  document.querySelectorAll('.nut-go-repo').forEach(function(b){
    b.addEventListener('click', function(){
      if(!confirm('Gỡ '+b.dataset.repo+' khỏi danh sách? (clone trên đĩa và lịch sử chấm vẫn giữ; chìa riêng của nó bị xoá)')) return;
      goiRepo('/api/repo/go',{github:b.dataset.repo}, b);
    });
  });`;
