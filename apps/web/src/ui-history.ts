import { shell, escHtml, tokenField, splitSource } from './ui.js';
import type { RunMeta } from './runs.js';

// Trang Lịch sử chạy — tách khỏi trang chính vì danh sách lớn dần theo thời gian và theo số repo.
// Lọc bằng query string (server-side): repo · verdict · skill · nhà cung cấp · tìm chữ. Phân trang 25 dòng.

export interface HistoryFilter {
  repo?: string;
  verdict?: string; // PASS | FAIL | loi
  skill?: string; // code | doc
  ncc?: string; // claude-cli | anthropic-api | google-gemini | openai | github-models
  q?: string;
  trang: number;
}

const MOI_TRANG = 25;

function thoiGian(batDau: string, ketThuc?: string): string {
  if (!ketThuc) return '';
  const giay = Math.max(0, Math.round((Date.parse(ketThuc) - Date.parse(batDau)) / 1000));
  if (!Number.isFinite(giay)) return '';
  return giay < 60 ? `${giay}s` : `${Math.floor(giay / 60)}p${String(giay % 60).padStart(2, '0')}`;
}

export function filterRuns(runs: RunMeta[], loc: HistoryFilter): RunMeta[] {
  const q = loc.q?.trim().toLowerCase();
  return runs.filter((r) => {
    if (loc.repo && (r.repo ?? '') !== loc.repo) return false;
    if (loc.skill && r.skill !== loc.skill) return false;
    if (loc.verdict) {
      const v = r.verdict?.result ?? (r.trangThai === 'loi' ? 'loi' : '');
      if (loc.verdict === 'loi' ? r.trangThai !== 'loi' : v !== loc.verdict) return false;
    }
    if (loc.ncc && splitSource(r.verdict?.model).nguonMa !== loc.ncc) return false;
    if (q) {
      const trong = `${r.tieuDe} ${r.verdict?.artifact_ref.sha_or_hash ?? ''} ${r.pr?.so ?? ''}`.toLowerCase();
      if (!trong.includes(q)) return false;
    }
    return true;
  });
}

export function historyPage(runs: RunMeta[], loc: HistoryFilter, repos: string[], nguoi = ''): string {
  const daLoc = filterRuns(runs, loc);
  const soTrang = Math.max(1, Math.ceil(daLoc.length / MOI_TRANG));
  const trang = Math.min(Math.max(1, loc.trang), soTrang);
  const cua = daLoc.slice((trang - 1) * MOI_TRANG, trang * MOI_TRANG);

  const chon = (ten: string, nhan: string, ds: Array<[string, string]>, dangChon?: string) =>
    `<label style="font-size:12px;font-weight:600;color:var(--muted)">${nhan}<br>
      <select name="${ten}" style="margin-top:3px;padding:6px 9px;border:1px solid var(--line);border-radius:var(--radius-md);font-size:13px">
        <option value="">tất cả</option>
        ${ds.map(([g, n]) => `<option value="${escHtml(g)}" ${dangChon === g ? 'selected' : ''}>${escHtml(n)}</option>`).join('')}
      </select></label>`;

  const rows = cua
    .map((r) => {
      const kt = r.ketThuc ?? r.verdict?.finished_at;
      const tg = thoiGian(r.batDau, kt);
      const n = splitSource(r.verdict?.model);
      const kq =
        r.trangThai === 'dang_chay'
          ? '<span style="color:var(--muted)">đang chạy…</span>'
          : r.verdict
            ? `<span class="vd-pill vd-${r.verdict.result}">${r.verdict.result}</span> · ${r.verdict.findings.length} finding`
            : '<span style="color:var(--fail)">lỗi</span>';
      return `<tr>
<td><a href="/runs/${r.id}">${escHtml(r.tieuDe)}</a></td>
<td class="mono" style="font-size:11.5px;color:var(--muted)">${escHtml(r.repo ?? '—')}</td>
<td>${r.skill}</td>
<td>${kq}${tg ? ` <span style="color:var(--muted);font-size:12px">· ${tg}</span>` : ''}</td>
<td style="font-size:12.5px">${n.nguon === '—' ? '<span style="color:var(--muted)">—</span>' : escHtml(n.nguon)}</td>
<td class="mono" style="font-size:11.5px;color:var(--muted)">${escHtml(n.ten)}</td>
<td>${tokenField(r.verdict)}</td>
<td class="mono" style="font-size:11.5px;color:var(--muted);white-space:nowrap">${r.batDau.slice(0, 16).replace('T', ' ')}</td>
<td class="mono" style="font-size:11.5px;color:var(--muted);white-space:nowrap">${kt ? kt.slice(0, 16).replace('T', ' ') : '—'}</td>
</tr>`;
    })
    .join('');

  const giuLoc = (t: number): string => {
    const p = new URLSearchParams();
    if (loc.repo) p.set('repo', loc.repo);
    if (loc.verdict) p.set('verdict', loc.verdict);
    if (loc.skill) p.set('skill', loc.skill);
    if (loc.ncc) p.set('ncc', loc.ncc);
    if (loc.q) p.set('q', loc.q);
    p.set('trang', String(t));
    return `/lich-su?${p.toString()}`;
  };

  return shell(
    'Lịch sử chạy — CheckMate',
    `<h1>Lịch sử chạy</h1>
<p class="sub">${daLoc.length} lượt chấm${daLoc.length !== runs.length ? ` (lọc từ ${runs.length})` : ''} · <a href="/">← về trang chính</a></p>

<form method="get" action="/lich-su" class="card" style="max-width:100%;margin-bottom:14px;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
  ${chon('repo', 'Repo', repos.map((r) => [r, r] as [string, string]), loc.repo)}
  ${chon('verdict', 'Kết quả', [['PASS', 'PASS'], ['FAIL', 'FAIL'], ['loi', 'lỗi']], loc.verdict)}
  ${chon('skill', 'Loại', [['code', 'code'], ['doc', 'tài liệu']], loc.skill)}
  ${chon(
    'ncc',
    'Nhà cung cấp',
    [
      ['claude-cli', 'Anthropic · gói thuê bao'],
      ['anthropic-api', 'Anthropic · API'],
      ['google-gemini', 'Google Gemini'],
      ['openai', 'OpenAI'],
    ],
    loc.ncc,
  )}
  <label style="font-size:12px;font-weight:600;color:var(--muted);flex:1;min-width:180px">Tìm (tiêu đề · SHA · số PR)<br>
    <input name="q" value="${escHtml(loc.q ?? '')}" placeholder="vd: PR #8 hoặc e711ced" style="margin-top:3px;width:100%;padding:6px 10px;border:1px solid var(--line);border-radius:var(--radius-md);font-size:13px"></label>
  <button style="margin-bottom:1px">Lọc</button>
  ${loc.repo || loc.verdict || loc.skill || loc.ncc || loc.q ? '<a class="btn phu" href="/lich-su" style="margin-bottom:1px">Bỏ lọc</a>' : ''}
</form>

${
  cua.length
    ? `<div style="overflow-x:auto"><table class="runs">
<tr><th>Artifact</th><th>Repo</th><th>Loại</th><th>Kết quả</th><th>Provider</th><th>Model</th><th>Token (vào/ra)</th><th>Bắt đầu</th><th>Kết thúc</th></tr>
${rows}</table></div>
${
  soTrang > 1
    ? `<p class="sub" style="margin-top:12px;display:flex;gap:10px;align-items:center">
  ${trang > 1 ? `<a class="btn phu" href="${giuLoc(trang - 1)}">← trang trước</a>` : ''}
  <span class="mono">trang ${trang} / ${soTrang}</span>
  ${trang < soTrang ? `<a class="btn phu" href="${giuLoc(trang + 1)}">trang sau →</a>` : ''}
</p>`
    : ''
}`
    : '<p class="sub">Không có lượt chấm nào khớp bộ lọc.</p>'
}`,
    '',
    { muc: 'hist', nguoi },
  );
}
