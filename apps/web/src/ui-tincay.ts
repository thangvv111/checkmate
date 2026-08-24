import type { MucSoCai } from './ledger.js';
import type { HoSoTacGia } from './tincay.js';
import { khung } from './ui.js';

export function trangTinCay(hoSo: HoSoTacGia[]): string {
  const rows = hoSo
    .map(
      (h) => `<tr>
<td><a href="/tin-cay/${encodeURIComponent(h.tacGia)}"><b>${h.tacGia}</b></a></td>
<td class="mono">${h.soPr}</td>
<td class="mono">${h.soVerdict} (${h.pass}P/${h.fail}F)</td>
<td class="mono">${h.soPr ? Math.round((h.prPassVongDau / h.soPr) * 100) : 0}% (${h.prPassVongDau}/${h.soPr})</td>
<td class="mono">${h.high}H · ${h.medium}M · ${h.low}L</td>
<td class="mono">${h.streakPass > 0 ? `✓×${h.streakPass}` : '—'}</td>
<td class="mono" style="font-size:12px">${h.lanCuoi.slice(0, 16).replace('T', ' ')}</td>
</tr>`,
    )
    .join('');
  return khung(
    'Thang tin cậy tác giả — CheckMate',
    `<h1>Thang tin cậy tác giả</h1>
<p class="sub">Track record tính từ <a href="/ledger">sổ cái verdict</a> — máy đếm, không tự khai. <a href="/">← về trang chính</a></p>
${hoSo.length ? `<table class="runs"><tr><th>Tác giả</th><th>PR</th><th>Verdict</th><th>PASS vòng đầu</th><th>Finding tích luỹ</th><th>Streak PASS</th><th>Gần nhất</th></tr>${rows}</table>` : '<p class="sub">Chưa có verdict nào gắn tác giả (run tự động / chạy qua PR mới có tác giả).</p>'}
<div class="card" style="max-width:640px;margin-top:16px"><b>Nguyên tắc:</b> điểm tin cậy KHÔNG nới lỏng cổng — PR của ai cũng bị chấm như nhau. Hồ sơ dùng để nhìn sức khoẻ đội và (về sau) xếp thứ tự ưu tiên chấm tự động.</div>`,
  );
}

export function trangHoSoTacGia(tacGia: string, hoSo: HoSoTacGia | undefined, verdicts: MucSoCai[]): string {
  if (!hoSo) {
    return khung('Hồ sơ tác giả — CheckMate', `<h1>${tacGia}</h1><p class="sub">Chưa có verdict nào của tác giả này. <a href="/tin-cay">← thang tin cậy</a></p>`);
  }
  const rows = [...verdicts]
    .sort((a, b) => b.luc.localeCompare(a.luc))
    .map(
      (m) => `<tr><td class="mono" style="font-size:12px">${m.luc.slice(0, 16).replace('T', ' ')}</td>
<td><a href="/runs/${m.run_id}">PR #${m.pr} · ${m.artifact.replace(/^PR #\d+ · /, '')}</a></td>
<td class="mono">${m.sha.slice(0, 7)}</td>
<td><span class="vd-pill vd-${m.verdict}">${m.verdict}</span></td>
<td class="mono">${m.high}H · ${m.medium}M · ${m.low}L</td></tr>`,
    )
    .join('');
  return khung(
    `${tacGia} — tin cậy CheckMate`,
    `<h1>Hồ sơ: ${tacGia}</h1>
<p class="sub"><a href="/tin-cay">← thang tin cậy</a></p>
<div class="stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:18px">
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--teal)">${hoSo.soPr}</b><br><span style="font-size:11.5px;color:var(--muted)">PR đã chấm</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--teal)">${hoSo.soPr ? Math.round((hoSo.prPassVongDau / hoSo.soPr) * 100) : 0}%</b><br><span style="font-size:11.5px;color:var(--muted)">PASS ngay vòng đầu</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--fail)">${hoSo.high}</b><br><span style="font-size:11.5px;color:var(--muted)">finding HIGH tích luỹ</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--teal)">${hoSo.streakPass}</b><br><span style="font-size:11.5px;color:var(--muted)">streak PASS hiện tại</span></div>
</div>
<table class="runs"><tr><th>Lúc</th><th>Artifact</th><th>Commit</th><th>Verdict</th><th>Finding</th></tr>${rows}</table>`,
  );
}
