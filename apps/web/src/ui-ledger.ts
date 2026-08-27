import type { MucSoCai } from './ledger.js';
import { khung } from './ui.js';

export function trangLedger(muc: MucSoCai[], congTheoRun: Map<string, string>): string {
  const sx = [...muc].sort((a, b) => b.luc.localeCompare(a.luc));
  const demPass = sx.filter((m) => m.verdict === 'PASS').length;
  const demFail = sx.length - demPass;
  const rows = sx
    .map((m) => {
      const cong = congTheoRun.get(m.run_id);
      return `<tr>
<td class="mono" style="white-space:nowrap">${m.luc.slice(0, 16).replace('T', ' ')}</td>
<td><a href="/runs/${m.run_id}">${m.pr && !m.artifact.startsWith('PR #') ? `PR #${m.pr} · ` : ''}${m.artifact}</a>${m.backfill ? ' <span style="font-size:10.5px;color:var(--muted)">(backfill)</span>' : ''}</td>
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
  return khung(
    'Sổ cái verdict — CheckMate',
    `<h1>Sổ cái verdict</h1>
<p class="sub">Append-only — mọi kết luận chấm đều vào sổ, không sửa không xoá. ${sx.length} verdict (${demPass} PASS · ${demFail} FAIL)${tongVao ? ` · tổng ${(tongVao / 1000).toFixed(0)}k token vào + ${(tongRa / 1000).toFixed(0)}k ra` : ''} · <a href="/">← về trang chính</a></p>
${sx.length ? `<table class="runs"><tr><th>Lúc</th><th>Artifact</th><th>Commit</th><th>Tác giả</th><th>Verdict</th><th>Finding</th><th title="token vào / token ra — dấu ~ nghĩa là ước tính (đường Claude Code CLI không trả usage)">Token (vào/ra)</th><th>Cổng</th></tr>${rows}</table>` : '<p class="sub">Chưa có verdict nào.</p>'}
<p class="goiy" style="margin-top:12px">Sổ hành động cổng (ai merge/trả-về, xác nhận cảnh báo nào) nằm ở <code>web-runs/review-log.jsonl</code>; sổ này ghi KẾT LUẬN chấm — hai sổ đối chiếu được với nhau qua run id.</p>`,
  );
}
