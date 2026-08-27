import { escHtml } from './ui.js';
import type { RepoConfig } from './config.js';

// Khối "Repo đã kết nối" trong Cấu hình: danh sách repo + nút nạp danh sách từ token để CHỌN,
// thay vì bắt người dùng gõ tay owner/repo và tự clone.

export interface KhoiRepoView {
  repos: RepoConfig[];
  dangChon: string;
  coToken: boolean;
  moKhoa: boolean;
}

export function khoiRepo(v: KhoiRepoView): string {
  const ro = v.moKhoa ? '' : 'disabled';
  const dong = v.repos
    .map((r) => {
      const chon = r.github === v.dangChon;
      return `<div class="repo-row" style="display:flex;align-items:center;gap:10px;border:1px solid ${chon ? 'var(--teal)' : 'var(--line)'};border-radius:8px;padding:9px 12px;margin:6px 0;background:var(--surface)">
  <div style="flex:1;min-width:0">
    <div style="font-size:13.5px;font-weight:600">${escHtml(r.github)}
      ${chon ? '<span style="font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:var(--teal-soft);color:var(--teal);padding:2px 7px;border-radius:99px;margin-left:6px">đang chọn</span>' : ''}
      ${r.truc ? '<span style="font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:var(--amber-soft);color:var(--amber);padding:2px 7px;border-radius:99px;margin-left:4px">trực</span>' : ''}
    </div>
    <div class="mono" style="font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">nhánh đích ${escHtml(r.base_branch)} · ${escHtml(r.local_path)}</div>
  </div>
  ${chon ? '' : `<button type="button" class="phu-nho nut-chon-repo" data-repo="${escHtml(r.github)}" ${ro}>Chọn</button>`}
  <button type="button" class="phu-nho nut-go-repo" data-repo="${escHtml(r.github)}" ${ro} style="color:var(--fail);border-color:var(--fail-soft)">Gỡ</button>
</div>`;
    })
    .join('');

  return `<div class="card" style="max-width:760px;margin-bottom:14px">
  <h3>Repo đã kết nối</h3>
  <p style="font-size:12.5px;color:var(--muted)">Mỗi repo giữ nhánh đích và clone riêng. Repo đang chọn quyết định hàng đợi PR ở trang chính; lịch sử chấm được lưu theo từng repo.</p>
  ${dong || '<p class="sub">Chưa có repo nào.</p>'}
  <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
    <button type="button" id="nut-nap-repo" class="phu-nho" ${ro}>Nạp danh sách repo từ token</button>
    <span id="kq-nap-repo" style="font-size:12.5px;margin-left:10px;color:var(--muted)">${
      v.coToken ? 'lấy các repo mà token nhìn thấy, rồi chọn để thêm' : 'cần GitHub token ở khối bên trên trước'
    }</span>
    <div id="ds-repo" style="margin-top:10px"></div>
  </div>
</div>`;
}

export const JS_REPO = `
  var oNap=document.getElementById('kq-nap-repo'), oDs=document.getElementById('ds-repo');
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var nutNap=document.getElementById('nut-nap-repo');
  if(nutNap) nutNap.addEventListener('click', function(){
    nutNap.disabled=true; oNap.style.color='var(--muted)'; oNap.textContent='Đang hỏi GitHub...';
    fetch('/api/github/repos').then(function(r){return r.json();}).then(function(d){
      if(d.loi){ oNap.style.color='var(--fail)'; oNap.textContent='✗ '+d.loi; return; }
      oNap.style.color='var(--muted)'; oNap.textContent=d.length+' repo token này nhìn thấy — chọn để thêm:';
      oDs.innerHTML='<div style="max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:8px">'+
        d.map(function(r){
          return '<div style="display:flex;align-items:center;gap:8px;padding:7px 11px;border-bottom:1px solid var(--line);font-size:13px">'+
            '<span style="flex:1;min-width:0">'+esc(r.full_name)+
              (r.private?' <span style="font-size:10px;color:var(--muted)">riêng tư</span>':'')+
              '<br><span class="mono" style="font-size:11px;color:var(--muted)">nhánh mặc định '+esc(r.default_branch)+'</span></span>'+
            (r.da_them
              ? '<span style="font-size:11.5px;color:var(--teal)">đã thêm</span>'
              : '<button type="button" class="phu-nho nut-them-repo" data-repo="'+esc(r.full_name)+'" data-nhanh="'+esc(r.default_branch)+'">Thêm</button>')+
          '</div>';
        }).join('')+'</div>';
      ganNutThem();
    }).catch(function(e){ oNap.style.color='var(--fail)'; oNap.textContent='Không gọi được: '+e; })
      .finally(function(){ nutNap.disabled=false; });
  });

  function goiRepo(duong, body, nut, khiXong){
    if(nut) nut.disabled=true;
    fetch(duong,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json();}).then(function(d){
        if(d.ok){ location.href='/settings?luu=1'; }
        else { oNap.style.color='var(--fail)'; oNap.textContent='✗ '+(d.loi||'không thực hiện được'); if(nut) nut.disabled=false; }
      }).catch(function(e){ oNap.style.color='var(--fail)'; oNap.textContent='Không gọi được: '+e; if(nut) nut.disabled=false; });
  }
  function ganNutThem(){
    document.querySelectorAll('.nut-them-repo').forEach(function(b){
      b.addEventListener('click', function(){
        oNap.style.color='var(--muted)'; oNap.textContent='Đang clone '+b.dataset.repo+' về máy chủ (repo lớn có thể mất một lúc)...';
        goiRepo('/api/repo/them',{github:b.dataset.repo, base_branch:b.dataset.nhanh}, b);
      });
    });
  }
  document.querySelectorAll('.nut-chon-repo').forEach(function(b){
    b.addEventListener('click', function(){ goiRepo('/api/repo/chon',{github:b.dataset.repo}, b); });
  });
  document.querySelectorAll('.nut-go-repo').forEach(function(b){
    b.addEventListener('click', function(){
      if(!confirm('Gỡ '+b.dataset.repo+' khỏi danh sách? (clone trên đĩa và lịch sử chấm vẫn giữ)')) return;
      goiRepo('/api/repo/go',{github:b.dataset.repo}, b);
    });
  });`;
