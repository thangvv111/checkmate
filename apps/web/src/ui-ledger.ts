import type { VerdictLedgerEntry } from './ledger.js';
import { shell, escHtml, artifactCell } from './ui.js';

// Sổ cái là một dạng lịch sử, nên nó cũng phải tách được theo repo (specs/R4.9) — trộn verdict của
// nhiều repo vào một bảng thì con số tổng ở đầu trang không nói lên điều gì về repo nào cả.
export const LOOSE_DOC_FILTER = '__doc__';

export function ledgerPage(muc: VerdictLedgerEntry[], congTheoRun: Map<string, string>, repos: string[] = [], locRepo?: string, nguoi = ''): string {
  // «Tài liệu rời» là một LỰA CHỌN riêng chứ không phải một tên repo: hàng của nó không có repo, nên
  // lọc theo tên sẽ không bao giờ chạm tới nó và người dùng không có cách nào xem riêng chúng.
  const theoRepo = !locRepo
    ? muc
    : locRepo === LOOSE_DOC_FILTER
      ? muc.filter((m) => !(m.repo ?? '').trim())
      : muc.filter((m) => (m.repo ?? '') === locRepo);
  const sx = [...theoRepo].sort((a, b) => b.luc.localeCompare(a.luc));
  const demPass = sx.filter((m) => m.verdict === 'PASS').length;
  const demFail = sx.length - demPass;
  const rows = sx
    .map((m) => {
      const cong = congTheoRun.get(m.run_id);
      return `<tr>
<td class="mono" style="white-space:nowrap">${m.luc.slice(0, 16).replace('T', ' ')}</td>
<td>${artifactCell({ ten: m.artifact.replace(/^PR #\d+ · /, ''), duong: `/runs/${m.run_id}`, repo: m.repo, pr: m.pr, sha: m.sha, ghiChu: m.backfill ? 'backfill' : undefined })}</td>
<td>${escHtml(m.tac_gia ?? '—')}</td>
<td><span class="vd-pill vd-${m.verdict}">${m.verdict}</span></td>
<td class="mono" style="font-size:12px">${m.high}H · ${m.medium}M · ${m.low}L</td>
<td class="mono" style="font-size:12px">${m.token_vao === undefined ? '<span style="color:var(--muted)">—</span>' : `${m.token_uoc ? '~' : ''}${(m.token_vao / 1000).toFixed(1)}k / ${m.token_uoc ? '~' : ''}${((m.token_ra ?? 0) / 1000).toFixed(1)}k`}</td>
<td style="font-size:12.5px">${cong ?? '—'}</td>
</tr>`;
    })
    .join('');
  const tongVao = sx.reduce((t, m) => t + (m.token_vao ?? 0), 0);
  const tongRa = sx.reduce((t, m) => t + (m.token_ra ?? 0), 0);
  const tongH = sx.reduce((n, m) => n + m.high, 0);
  const tongM = sx.reduce((n, m) => n + m.medium, 0);
  const tongL = sx.reduce((n, m) => n + m.low, 0);
  /**
   * Dòng tổng — tính trên `sx`, tức phần ĐÃ LỌC, và đứng TRƯỚC bảng.
   *
   * Tính trên tập chưa lọc thì người lọc theo một repo rồi đọc dòng tổng của MỌI repo sẽ rút ra kết luận
   * về repo mình vừa lọc: một con số đúng đặt cạnh một bộ lọc sai là câu nói dối không ai cố ý nói ra.
   *
   * Đứng trước vì dòng tổng là CÂU TRẢ LỜI còn bảng là CHỨNG CỨ; đặt câu trả lời sau chứng cứ thì người
   * đọc phải cuộn hết bảng mới biết mình đang xem cái gì, mà bảng dài dần theo thời gian.
   */
  const dongTong = `<div class="mono" style="background:var(--surface);padding:10px 14px;margin:0 0 12px;display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px">
  <span><b>${sx.length}</b> verdict</span>
  <span style="color:var(--pass-ink)"><b>${demPass}</b> PASS</span>
  <span style="color:var(--fail)"><b>${demFail}</b> FAIL</span>
  <span><b>${tongH}</b>H · <b>${tongM}</b>M · <b>${tongL}</b>L</span>
  <span>${(tongVao / 1000).toFixed(1)}k / ${(tongRa / 1000).toFixed(1)}k token</span>
</div>`;
  const locBox = repos.length
    ? `<form method="get" action="/ledger" style="margin:0 0 12px;display:flex;gap:9px;align-items:center">
  <label style="font-size:12px;font-weight:600;color:var(--muted)">Repo</label>
  <select name="repo" style="padding:6px 9px;border:1px solid var(--line);border-radius:var(--radius-md);font-size:13px">
    <option value="">tất cả</option>
    ${repos.map((r) => `<option value="${escHtml(r)}" ${locRepo === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
    <option value="${LOOSE_DOC_FILTER}" ${locRepo === LOOSE_DOC_FILTER ? 'selected' : ''}>tài liệu rời</option>
  </select>
  <button class="phu-nho">Lọc</button>
  ${locRepo ? '<a class="btn phu" href="/ledger">Bỏ lọc</a>' : ''}
</form>`
    : '';
  return shell(
    'Sổ cái verdict — CheckMate',
    `<h1>Sổ cái verdict</h1>
<p class="sub">Append-only — chỉ ghi thêm, không sửa, không xoá.${locRepo ? ` Đang lọc <b>${escHtml(locRepo === LOOSE_DOC_FILTER ? 'tài liệu rời' : locRepo)}</b> (từ ${muc.length} hàng).` : ' Đang gộp mọi repo.'} <a href="/">← về trang chính</a></p>
${locBox}
${dongTong}
${sx.length ? `<div style="overflow-x:auto"><table class="runs"><tr><th>Lúc</th><th>Artifact</th><th>Tác giả</th><th>Verdict</th><th>Finding</th><th title="token vào / token ra — dấu ~ nghĩa là ước tính (đường Claude Code CLI không trả usage)">Token (vào/ra)</th><th>Cổng</th></tr>${rows}</table></div>` : '<p class="sub">Chưa có verdict nào.</p>'}
<p class="goiy" style="margin-top:12px">Sổ hành động cổng (ai merge/trả-về, chấp nhận cảnh báo nào) nay nằm trong bảng <code>so_cong</code> của cơ sở dữ liệu, không còn ở <code>web-runs/review-log.jsonl</code> — file cũ chỉ giữ lại làm bản lưu trước khi di trú. Sổ trên trang này ghi KẾT LUẬN chấm; hai sổ đối chiếu với nhau qua <code>run_id</code>.</p>`,
    '',
    { muc: 'ledger', nguoi },
  );
}
