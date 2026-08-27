import { escHtml } from './ui.js';
import { DANH_MUC_NCC, type CauHinhNcc, type KetQuaKiem, type MaNcc, type PhuongThuc } from './ncc.js';
import type { TrangThaiNcc } from './nguon-model.js';

// Khối "Nhà cung cấp model" trong Cấu hình: mỗi nhà cung cấp một thẻ gập cho gọn,
// bên trong là phương thức + model + khoá + nút Kiểm tra. Nhà cung cấp chỉ được ĐANG DÙNG
// sau khi kiểm thành công với đúng cấu hình đó (cổng verify, không cho chọn mù).

export interface KhoiNccView {
  dangDung: MaNcc;
  cauHinh: Partial<Record<MaNcc, CauHinhNcc>>;
  trangThai: Record<string, TrangThaiNcc>;
  soKiem: Partial<Record<MaNcc, KetQuaKiem>>;
  tokenThueBaoChe: string;
  moKhoa: boolean; // chế độ org mới cho sửa
}

const NHAN_PT: Record<PhuongThuc, string> = { thue_bao: 'Gói thuê bao', api: 'API (tính theo token)' };

function huyHieu(kiem: KetQuaKiem | undefined, cfg: CauHinhNcc): string {
  if (!kiem) return '<span style="font-size:11.5px;color:var(--muted)">chưa kiểm</span>';
  const hopLe = kiem.ok && kiem.model === cfg.model && kiem.phuong_thuc === cfg.phuong_thuc;
  if (hopLe) {
    return `<span style="font-size:11.5px;color:var(--teal);font-weight:600" title="kiểm lúc ${kiem.luc.slice(0, 16).replace('T', ' ')}">✓ đã kiểm</span>`;
  }
  if (kiem.ok) {
    return '<span style="font-size:11.5px;color:var(--amber);font-weight:600" title="đã đổi model hoặc phương thức so với lần kiểm — phải kiểm lại">⚠ cấu hình đã đổi, cần kiểm lại</span>';
  }
  return '<span style="font-size:11.5px;color:var(--fail);font-weight:600">✗ kiểm thất bại</span>';
}

export function khoiNcc(v: KhoiNccView): string {
  const ro = v.moKhoa ? '' : 'disabled';
  const the = DANH_MUC_NCC.map((dn) => {
    const ro2 = dn.ngung ? 'disabled' : ro; // dịch vụ đã ngừng thì khoá hẳn, không cho cấu hình vô ích
    const cfg: CauHinhNcc = v.cauHinh[dn.ma] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
    const tt = v.trangThai[dn.ma];
    const kiem = v.soKiem[dn.ma];
    const dangDung = v.dangDung === dn.ma;
    const daKiem = !!kiem?.ok && kiem.model === cfg.model && kiem.phuong_thuc === cfg.phuong_thuc;

    const dongTrangThai = [
      dn.khoa ? `${tt?.co_khoa ? '<b style="color:var(--teal)">✓</b>' : '<b style="color:var(--fail)">✗</b>'} ${escHtml(dn.khoa.nhan)}: ${escHtml(tt?.mo_ta_khoa ?? '—')}` : '',
      tt?.mo_ta_thue_bao ? `${tt.san_sang_thue_bao ? '<b style="color:var(--teal)">✓</b>' : '<b style="color:var(--fail)">✗</b>'} Gói thuê bao: ${escHtml(tt.mo_ta_thue_bao)}` : '',
    ]
      .filter(Boolean)
      .map((d) => `<div style="margin:2px 0">${d}</div>`)
      .join('');

    return `<details class="ncc" ${dangDung ? 'open' : ''} data-ncc="${dn.ma}" style="border:1px solid ${dangDung ? 'var(--teal)' : 'var(--line)'};border-radius:9px;margin:8px 0;background:var(--surface)">
  <summary style="padding:9px 12px;cursor:pointer;font-size:13.5px;display:flex;align-items:center;gap:8px">
    <b>${escHtml(dn.ten)}</b>
    ${dangDung ? '<span style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:var(--teal-soft);color:var(--teal);padding:2px 7px;border-radius:99px">đang dùng</span>' : ''}
    <span style="margin-left:auto">${dn.ngung ? '<span style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:var(--fail-soft);color:var(--fail);padding:2px 7px;border-radius:99px">đã ngừng</span>' : huyHieu(kiem, cfg)}</span>
  </summary>
  <div style="padding:2px 12px 12px">
    ${dn.ngung ? `<div class="ev" style="border-left:3px solid var(--fail);margin:0 0 10px"><b>Dịch vụ đã ngừng.</b> ${escHtml(dn.ngung)}</div>` : ''}
    <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${escHtml(dn.ghi_chu)}</p>
    ${dongTrangThai ? `<div style="font-size:12px;border:1px solid var(--line);border-radius:7px;padding:7px 10px;margin-bottom:8px">${dongTrangThai}</div>` : ''}
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
      <label style="font-size:12.5px;font-weight:600">Phương thức<br>
        <select name="pt_${dn.ma}" ${ro2} ${dn.phuong_thuc.length < 2 ? 'disabled' : ''} style="margin-top:4px;padding:6px 9px;border:1px solid var(--line);border-radius:7px">
          ${dn.phuong_thuc.map((p) => `<option value="${p}" ${cfg.phuong_thuc === p ? 'selected' : ''}>${NHAN_PT[p]}</option>`).join('')}
        </select>
      </label>
      <label style="font-size:12.5px;font-weight:600">Model<br>
        <select name="model_${dn.ma}" ${ro2} style="margin-top:4px;padding:6px 9px;border:1px solid var(--line);border-radius:7px">
          ${dn.models.map((m) => `<option value="${m}" ${cfg.model === m ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </label>
    </div>
    ${
      dn.khoa
        ? `<label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">${escHtml(dn.khoa.nhan)}</label>
    <input name="khoa_${dn.ma}" type="password" placeholder="${escHtml(dn.khoa.goi_y)} — bỏ trống để giữ nguyên" ${ro2} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">`
        : ''
    }
    ${
      dn.ma === 'anthropic'
        ? `<label style="display:block;font-size:12.5px;font-weight:600;margin:10px 0 4px">Token gói thuê bao Claude Code — hiện tại: <span class="mono">${escHtml(v.tokenThueBaoChe)}</span></label>
    <input name="claude_oauth_token" type="password" placeholder="dán token từ lệnh claude setup-token (bỏ trống để giữ nguyên)" ${ro} style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:7px">
    <p style="font-size:11.5px;color:var(--muted);margin:5px 0 0">Chạy <code>claude setup-token</code> trên máy CÓ trình duyệt (lệnh cần cửa sổ dòng lệnh thật), rồi dán vào đây. Token lưu ở file riêng quyền 600.</p>`
        : ''
    }
    <div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button type="button" class="phu-nho nut-kiem" data-ncc="${dn.ma}" ${ro2}>Kiểm tra ${escHtml(dn.ten)}</button>
      <button type="button" class="nut-dung" data-ncc="${dn.ma}" ${ro2} ${!dn.ngung && daKiem && !dangDung ? '' : 'disabled'}>${dangDung ? 'Đang dùng' : 'Dùng nhà cung cấp này'}</button>
      <span class="kq-kiem" data-ncc="${dn.ma}" style="font-size:12px;color:var(--muted);flex:1;min-width:220px">${kiem ? escHtml(kiem.thong_diep.slice(0, 160)) : 'chưa kiểm lần nào'}</span>
    </div>
    <p style="font-size:11.5px;color:var(--muted);margin:8px 0 0">Lưu cấu hình trước, rồi bấm <b>Kiểm tra</b>. Chỉ khi kiểm thành công với đúng model + phương thức này thì nút <b>Dùng nhà cung cấp này</b> mới bật — CheckMate không cho chọn nguồn model chưa chứng minh chạy được.</p>
  </div>
</details>`;
  }).join('');

  return `<div class="card" style="max-width:760px;margin-bottom:14px">
  <h3>Nhà cung cấp model</h3>
  <p style="font-size:12.5px;color:var(--muted)">Cấu hình nhiều nhà cung cấp cùng lúc, chọn một cái để chấm. <b>Nhà cung cấp</b> = ai chạy model; <b>phương thức</b> = tiền ra từ đâu (gói thuê bao hay ví API).</p>
  ${the}
</div>`;
}

export const JS_NCC = `
  function ganKq(ma, txt, mau){ var o=document.querySelector('.kq-kiem[data-ncc="'+ma+'"]'); if(o){ o.textContent=txt; o.style.color=mau; } }
  document.querySelectorAll('.nut-kiem').forEach(function(b){
    b.addEventListener('click', function(){
      var ma=b.dataset.ncc; b.disabled=true; ganKq(ma,'Đang gọi thử nhà cung cấp...','var(--muted)');
      fetch('/api/thu-ncc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ncc:ma})})
        .then(function(r){return r.json();}).then(function(d){
          ganKq(ma,(d.ok?'✓ ':'✗ ')+d.thong_diep+' — '+d.giay+'s', d.ok?'var(--teal)':'var(--fail)');
          var nut=document.querySelector('.nut-dung[data-ncc="'+ma+'"]');
          if(nut && d.ok && nut.textContent.indexOf('Đang dùng')<0) nut.disabled=false;
        })
        .catch(function(e){ ganKq(ma,'Không gọi được: '+e,'var(--fail)'); })
        .finally(function(){ b.disabled=false; });
    });
  });
  document.querySelectorAll('.nut-dung').forEach(function(b){
    b.addEventListener('click', function(){
      var ma=b.dataset.ncc; b.disabled=true;
      fetch('/api/chon-ncc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ncc:ma})})
        .then(function(r){return r.json();}).then(function(d){
          if(d.ok){ location.href='/settings?luu=1'; }
          else { ganKq(ma,'✗ '+d.thong_diep,'var(--fail)'); b.disabled=false; }
        })
        .catch(function(e){ ganKq(ma,'Không gọi được: '+e,'var(--fail)'); b.disabled=false; });
    });
  });`;
