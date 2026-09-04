import type { VerdictLedgerEntry } from './ledger.js';
import type { AuthorProfile } from './trust.js';
import { shell, escHtml, artifactCell } from './ui.js';

// Ô lọc repo dùng chung cho thang tin cậy và hồ sơ từng tác giả.
function locRepoBox(duong: string, repos: string[], locRepo?: string): string {
  if (!repos.length) return '';
  return `<form method="get" action="${duong}" style="margin:0 0 12px;display:flex;gap:9px;align-items:center">
  <label style="font-size:12px;font-weight:600;color:var(--muted)">Repo</label>
  <select name="repo" style="padding:6px 9px;border:1px solid var(--line);border-radius:var(--radius-md);font-size:13px">
    <option value="">tất cả repo</option>
    ${repos.map((r) => `<option value="${escHtml(r)}" ${locRepo === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
  </select>
  <button class="phu-nho">Lọc</button>
  ${locRepo ? `<a class="btn phu" href="${duong}">Bỏ lọc</a>` : ''}
</form>`;
}

export function trustPage(hoSo: AuthorProfile[], repos: string[] = [], locRepo?: string, nguoi = ''): string {
  const rows = hoSo
    .map(
      (h) => `<tr>
<td><a href="/tin-cay/${encodeURIComponent(h.tacGia)}${locRepo ? `?repo=${encodeURIComponent(locRepo)}` : ''}"><b>${escHtml(h.tacGia)}</b></a></td>
<td class="mono">${h.soVerdict}</td>
<td class="mono">${h.soPr}</td>
<td class="mono"><b>${Math.round(h.tiLePass * 100)}%</b></td>
<td class="mono">${h.pass}P / ${h.fail}F</td>
<td class="mono">${h.soPr ? Math.round((h.prPassVongDau / h.soPr) * 100) : 0}% (${h.prPassVongDau}/${h.soPr})</td>
<td class="mono">${h.streakPass > 0 ? `✓×${h.streakPass}` : '—'}</td>
<td class="mono" style="color:${h.high ? 'var(--fail)' : 'var(--muted)'}">${h.high}</td>
<td class="mono" style="font-size:12px">${h.lanCuoi.slice(0, 16).replace('T', ' ')}</td>
</tr>`,
    )
    .join('');
  return shell(
    'Thang tin cậy tác giả — CheckMate',
    `<h1>Thang tin cậy tác giả</h1>
<p class="sub">Track record tính từ <a href="/ledger">sổ cái verdict</a> — máy đếm, không tự khai. Sắp theo <b>tỉ lệ PASS giảm dần</b>.${
      locRepo ? ` Đang xem riêng <b>${escHtml(locRepo)}</b>.` : ' Đang gộp mọi repo — lọc lại nếu muốn xem riêng một repo.'
    } <a href="/">← về trang chính</a></p>
${locRepoBox('/tin-cay', repos, locRepo)}
${hoSo.length ? `<table class="runs"><tr><th>Tác giả</th><th>Verdict</th><th>PR</th><th title="pass / tổng verdict — trục sắp xếp của bảng này">Tỉ lệ PASS</th><th>PASS/FAIL</th><th>PASS vòng đầu</th><th>Streak PASS</th><th title="số finding mức high bị bắt">High bị bắt</th><th>Gần nhất</th></tr>${rows}</table>` : '<p class="sub">Chưa có verdict nào gắn tác giả (run tự động / chạy qua PR mới có tác giả).</p>'}
<div class="card" style="max-width:640px;margin-top:16px"><b>Nguyên tắc:</b> điểm tin cậy KHÔNG nới lỏng cổng — PR của ai cũng bị chấm như nhau. Hồ sơ dùng để nhìn sức khoẻ đội và (về sau) xếp thứ tự ưu tiên chấm tự động.</div>`,
    '',
    { muc: 'trust', nguoi },
  );
}

export function authorProfilePage(tacGia: string, hoSo: AuthorProfile | undefined, verdicts: VerdictLedgerEntry[], locRepo?: string, nguoi = ''): string {
  if (!hoSo) {
    return shell(
      'Hồ sơ tác giả — CheckMate',
      `<h1>${escHtml(tacGia)}</h1><p class="sub">Chưa có verdict nào của tác giả này${locRepo ? ` trong ${escHtml(locRepo)}` : ''}. <a href="/tin-cay">← thang tin cậy</a></p>`,
    '',
    { muc: 'trust', nguoi },
    );
  }
  const rows = [...verdicts]
    .sort((a, b) => b.luc.localeCompare(a.luc))
    .map(
      (m) => `<tr><td class="mono" style="font-size:12px">${m.luc.slice(0, 16).replace('T', ' ')}</td>
<td>${artifactCell({ ten: m.artifact.replace(/^PR #\d+ · /, ''), duong: `/runs/${m.run_id}`, repo: m.repo, pr: m.pr, sha: m.sha })}</td>
<td><span class="vd-pill vd-${m.verdict}">${m.verdict}</span></td>
<td class="mono">${m.high}H · ${m.medium}M · ${m.low}L</td></tr>`,
    )
    .join('');
  return shell(
    `${tacGia} — tin cậy CheckMate`,
    `<h1>Hồ sơ: ${escHtml(tacGia)}</h1>
<p class="sub">${locRepo ? `Chỉ tính verdict trong <b>${escHtml(locRepo)}</b>. ` : 'Gộp mọi repo. '}<a href="/tin-cay${locRepo ? `?repo=${encodeURIComponent(locRepo)}` : ''}">← thang tin cậy</a></p>
<div class="stats">
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--ink)">${hoSo.soPr}</b><br><span style="font-size:11.5px;color:var(--muted)">PR đã chấm</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--pass-ink)">${hoSo.soPr ? Math.round((hoSo.prPassVongDau / hoSo.soPr) * 100) : 0}%</b><br><span style="font-size:11.5px;color:var(--muted)">PASS ngay vòng đầu</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--fail)">${hoSo.high}</b><br><span style="font-size:11.5px;color:var(--muted)">finding HIGH tích luỹ</span></div>
  <div style="background:var(--surface);padding:12px 14px"><b style="font-size:20px;color:var(--pass-ink)">${hoSo.streakPass}</b><br><span style="font-size:11.5px;color:var(--muted)">streak PASS hiện tại</span></div>
</div>
<table class="runs"><tr><th>Lúc</th><th>Artifact</th><th>Verdict</th><th>Finding</th></tr>${rows}</table>`,
    '',
    { muc: 'trust', nguoi },
  );
}
