import type { MucSoCai } from './ledger.js';
import { khung, escHtml } from './ui.js';

// Sổ cái là một dạng lịch sử, nên nó cũng phải tách được theo repo (specs/R4.9) — trộn verdict của
// nhiều repo vào một bảng thì con số tổng ở đầu trang không nói lên điều gì về repo nào cả.
export function trangLedger(muc: MucSoCai[], congTheoRun: Map<string, string>, repos: string[] = [], locRepo?: string): string {
  const theoRepo = locRepo ? muc.filter((m) => (m.repo ?? '') === locRepo) : muc;
  const sx = [...theoRepo].sort((a, b) => b.luc.localeCompare(a.luc));
  const demPass = sx.filter((m) => m.verdict === 'PASS').length;
  const demFail = sx.length - demPass;
  const rows = sx
    .map((m) => {
      const cong = congTheoRun.get(m.run_id);
      return `<tr>
<td class="mono" style="white-space:nowrap">${m.luc.slice(0, 16).replace('T', ' ')}</td>
<td><a href="/runs/${m.run_id}">${m.pr && !m.artifact.startsWith('PR #') ? `PR #${m.pr} · ` : ''}${m.artifact}</a>${m.backfill ? ' <span style="font-size:10.5px;color:var(--muted)">(backfill)</span>' : ''}</td>
<td class="mono" style="font-size:11.5px;color:var(--muted)">${escHtml(m.repo ?? '—')}</td>
<td class="mono" style="font-size:12px">${m.sha.slice(0, 7)}</td>
<td>${m.tac_gia ?? '—'}</td>
<td><span class="vd-pill vd-${m.verdict}">${m.verdict}</span></td>
<td class="mono" style="font-size:12px">${m.high}H · ${m.medium}M · ${m.low}L</td>
<td class="mono" style="font-size:12px">${m.token_vao === undefined ? '<span style="color:var(--muted)">—</span>' : `${m.token_uoc ? '~' : ''}${(m.token_vao / 1000).toFixed(1)}k / ${m.token_uoc ? '~' : ''}${((m.token_ra ?? 0) / 1000).toFixed(1)}k`}</td>
<td style="font-size:12.5px">${cong ?? '—'}</td>
</tr>`;
    })
    .join('');
  const tongVao = sx.reduce((t, m) => t + (m.token_vao ?? 0), 0);
  const tongRa = sx.reduce((t, m) => t + (m.token_ra ?? 0), 0);
  const locBox = repos.length
    ? `<form method="get" action="/ledger" style="margin:0 0 12px;display:flex;gap:9px;align-items:center">
  <label style="font-size:12px;font-weight:600;color:var(--muted)">Repo</label>
  <select name="repo" style="padding:6px 9px;border:1px solid var(--line);border-radius:7px;font-size:13px">
    <option value="">tất cả</option>
    ${repos.map((r) => `<option value="${escHtml(r)}" ${locRepo === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
  </select>
  <button class="phu-nho">Lọc</button>
  ${locRepo ? '<a class="btn phu" href="/ledger">Bỏ lọc</a>' : ''}
</form>`
    : '';
  return khung(
    'Sổ cái verdict — CheckMate',
    `<h1>Sổ cái verdict</h1>
<p class="sub">Append-only — mọi kết luận chấm đều vào sổ, không sửa không xoá. ${sx.length} verdict${locRepo ? ` của ${escHtml(locRepo)} (lọc từ ${muc.length})` : ''} (${demPass} PASS · ${demFail} FAIL)${tongVao ? ` · tổng ${(tongVao / 1000).toFixed(0)}k token vào + ${(tongRa / 1000).toFixed(0)}k ra` : ''} · <a href="/">← về trang chính</a></p>
${locBox}
${sx.length ? `<div style="overflow-x:auto"><table class="runs"><tr><th>Lúc</th><th>Artifact</th><th>Repo</th><th>Commit</th><th>Tác giả</th><th>Verdict</th><th>Finding</th><th title="token vào / token ra — dấu ~ nghĩa là ước tính (đường Claude Code CLI không trả usage)">Token (vào/ra)</th><th>Cổng</th></tr>${rows}</table></div>` : '<p class="sub">Chưa có verdict nào.</p>'}
<p class="goiy" style="margin-top:12px">Sổ hành động cổng (ai merge/trả-về, chấp nhận cảnh báo nào) nay nằm trong bảng <code>so_cong</code> của cơ sở dữ liệu, không còn ở <code>web-runs/review-log.jsonl</code> — file cũ chỉ giữ lại làm bản lưu trước khi di trú. Sổ trên trang này ghi KẾT LUẬN chấm; hai sổ đối chiếu với nhau qua <code>run_id</code>.</p>`,
  );
}
