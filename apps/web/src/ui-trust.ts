import type { VerdictLedgerEntry } from './ledger.js';
import type { AuthorProfile } from './trust.js';
import { shell, escHtml } from './ui.js';

// Ô lọc repo dùng chung cho thang tin cậy và hồ sơ từng tác giả.
function locRepoBox(duong: string, repos: string[], locRepo?: string): string {
  if (!repos.length) return '';
  return `<form method="get" action="${duong}" style="margin:0 0 12px;display:flex;gap:9px;align-items:center">
  <label style="font-size:12px;font-weight:600;color:var(--muted)">Repo</label>
  <select name="repo" style="padding:6px 9px;border:1px solid var(--line);border-radius:7px;font-size:13px">
    <option value="">tất cả repo</option>
    ${repos.map((r) => `<option value="${escHtml(r)}" ${locRepo === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
  </select>
  <button class="phu-nho">Lọc</button>
  ${locRepo ? `<a class="btn phu" href="${duong}">Bỏ lọc</a>` : ''}
</form>`;
}

export function trustPage(hoSo: AuthorProfile[], repos: string[] = [], locRepo?: string): string {
  const rows = hoSo
    .map(
      (h) => `<tr>
<td><a href="/tin-cay/${encodeURIComponent(h.tacGia)}${locRepo ? `?repo=${encodeURIComponent(locRepo)}` : ''}"><b>${escHtml(h.tacGia)}</b></a></td>
<td class="mono">${h.soPr}</td>
<td class="mono">${h.soVerdict} (${h.pass}P/${h.fail}F)</td>
<td class="mono">${h.soPr ? Math.round((h.prPassVongDau / h.soPr) * 100) : 0}% (${h.prPassVongDau}/${h.soPr})</td>
<td class="mono">${h.high}H · ${h.medium}M · ${h.low}L</td>
<td class="mono">${h.streakPass > 0 ? `✓×${h.streakPass}` : '—'}</td>
<td class="mono" style="font-size:12px">${h.lanCuoi.slice(0, 16).replace('T', ' ')}</td>
</tr>`,
    )
    .join('');
  return shell(
    'Thang tin cậy tác giả — CheckMate',
    `<h1>Thang tin cậy tác giả</h1>
<p class="sub">Track record tính từ <a href="/ledger">sổ cái verdict</a> — máy đếm, không tự khai.${
      locRepo ? ` Đang xem riêng <b>${escHtml(locRepo)}</b>.` : ' Đang gộp mọi repo — lọc lại nếu muốn xem riêng một repo.'
    } <a href="/">← về trang chính</a></p>
${locRepoBox('/tin-cay', repos, locRepo)}
${hoSo.length ? `<table class="runs"><tr><th>Tác giả</th><th>PR</th><th>Verdict</th><th>PASS vòng đầu</th><th>Finding tích luỹ</th><th>Streak PASS</th><th>Gần nhất</th></tr>${rows}</table>` : '<p class="sub">Chưa có verdict nào gắn tác giả (run tự động / chạy qua PR mới có tác giả).</p>'}
<div class="card" style="max-width:640px;margin-top:16px"><b>Nguyên tắc:</b> điểm tin cậy KHÔNG nới lỏng cổng — PR của ai cũng bị chấm như nhau. Hồ sơ dùng để nhìn sức khoẻ đội và (về sau) xếp thứ tự ưu tiên chấm tự động.</div>`,
  );
}

export function authorProfilePage(tacGia: string, hoSo: AuthorProfile | undefined, verdicts: VerdictLedgerEntry[], locRepo?: string): string {
  if (!hoSo) {
    return shell(
      'Hồ sơ tác giả — CheckMate',
      `<h1>${escHtml(tacGia)}</h1><p class="sub">Chưa có verdict nào của tác giả này${locRepo ? ` trong ${escHtml(locRepo)}` : ''}. <a href="/tin-cay">← thang tin cậy</a></p>`,
    );
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
  return shell(
    `${tacGia} — tin cậy CheckMate`,
    `<h1>Hồ sơ: ${escHtml(tacGia)}</h1>
<p class="sub">${locRepo ? `Chỉ tính verdict trong <b>${escHtml(locRepo)}</b>. ` : 'Gộp mọi repo. '}<a href="/tin-cay${locRepo ? `?repo=${encodeURIComponent(locRepo)}` : ''}">← thang tin cậy</a></p>
<div class="stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:18px">
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--teal)">${hoSo.soPr}</b><br><span style="font-size:11.5px;color:var(--muted)">PR đã chấm</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--teal)">${hoSo.soPr ? Math.round((hoSo.prPassVongDau / hoSo.soPr) * 100) : 0}%</b><br><span style="font-size:11.5px;color:var(--muted)">PASS ngay vòng đầu</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--fail)">${hoSo.high}</b><br><span style="font-size:11.5px;color:var(--muted)">finding HIGH tích luỹ</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--teal)">${hoSo.streakPass}</b><br><span style="font-size:11.5px;color:var(--muted)">streak PASS hiện tại</span></div>
</div>
<table class="runs"><tr><th>Lúc</th><th>Artifact</th><th>Commit</th><th>Verdict</th><th>Finding</th></tr>${rows}</table>`,
  );
}
