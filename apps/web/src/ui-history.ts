import { shell, escHtml, tokenField, splitSource, artifactCell } from './ui.js';
import type { RunMeta } from './runs.js';

// Trang Lịch sử chạy — tách khỏi trang chính vì danh sách lớn dần theo thời gian và theo số repo.
// Lọc bằng query string (server-side): repo · verdict · skill · nhà cung cấp · ngày · tìm chữ. Phân trang 8 dòng.

export interface HistoryFilter {
  repo?: string;
  /**
   * PASS | FAIL | loi | khong_du_co_so
   *
   * `khong_du_co_so` TÁCH khỏi `loi` có chủ đích: «engine không kết luận được» và «máy chủ hỏng» là hai
   * chuyện có hai người chịu trách nhiệm và hai cách sửa khác nhau. Trộn chúng vào một nhãn thì con số
   * nói lên chỗ yếu của engine bị con số nói lên chỗ yếu của hạ tầng che mất.
   */
  verdict?: string;
  skill?: string; // code | doc
  ncc?: string; // claude-cli | anthropic-api | google-gemini | openai | github-models
  q?: string;
  /** Lọc theo KHOẢNG ngày, so trên chuỗi ISO cắt 10 ký tự đầu — `batDau` đã là ISO UTC. */
  tu?: string;
  den?: string;
  trang: number;
}

/**
 * Số dòng mỗi trang. Gói design CCS ghi thẳng «Phân trang thống nhất 8 dòng — con số chốt cho cả code».
 * Đổi ở đây là đổi cho cả màn; đừng rải con số này ra chỗ khác.
 */
const MOI_TRANG = 8;

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
    if (loc.verdict === 'khong_du_co_so') {
      if (!r.khongDuCoSo) return false;
    } else if (loc.verdict === 'loi') {
      // «lỗi» ở đây nghĩa là LỖI HẠ TẦNG: lượt không đủ cơ sở có nhãn riêng, không nằm trong rổ này.
      if (r.trangThai !== 'loi' || r.khongDuCoSo) return false;
    } else if (loc.verdict) {
      if ((r.verdict?.result ?? '') !== loc.verdict) return false;
    }
    if (loc.ncc && splitSource(r.verdict?.model).nguonMa !== loc.ncc) return false;
    // So trên chuỗi ISO cắt 10 ký tự, KHÔNG dựng `Date`: `batDau` đã là ISO UTC nên so chuỗi cho
    // đúng thứ tự, và không kéo múi giờ vào một phép lọc. Hai vế độc lập — chỉ có «từ» thì lọc một
    // phía; khoảng đảo ngược tự nhiên cho tập rỗng, không cần nhánh riêng.
    const ngay = r.batDau.slice(0, 10);
    if (loc.tu && ngay < loc.tu) return false;
    if (loc.den && ngay > loc.den) return false;
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
    `<label>${nhan}<br>
      <select name="${ten}">
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
            : r.khongDuCoSo
              ? '<span class="vd-pill vd-thieu-co-so" title="lượt chấm chạy xong nhưng không chứng minh được gì — khác với lỗi hạ tầng">Không đủ cơ sở</span>'
              : '<span style="color:var(--fail)">lỗi</span>';
      return `<tr>
<td>${artifactCell({ ten: r.tieuDe, duong: `/runs/${r.id}`, repo: r.repo, pr: r.pr?.so, sha: r.verdict?.artifact_ref.sha_or_hash ?? r.pr?.headSha })}</td>
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

<form method="get" action="/lich-su" class="loc-bar">
  ${chon('repo', 'Repo', repos.map((r) => [r, r] as [string, string]), loc.repo)}
  ${chon('verdict', 'Kết quả', [['PASS', 'PASS'], ['FAIL', 'FAIL'], ['khong_du_co_so', 'Không đủ cơ sở'], ['loi', 'lỗi hạ tầng']], loc.verdict)}
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
  <label>Từ ngày<br><input name="tu" type="date" value="${escHtml(loc.tu ?? '')}"></label>
  <label>Đến ngày<br><input name="den" type="date" value="${escHtml(loc.den ?? '')}"></label>
  <label class="loc-tim">Tìm (tiêu đề · SHA · số PR)<br>
    <input name="q" value="${escHtml(loc.q ?? '')}" placeholder="vd: PR #8 hoặc e711ced"></label>
  <button>Lọc</button>
  ${loc.repo || loc.verdict || loc.skill || loc.ncc || loc.q || loc.tu || loc.den ? '<a class="btn phu" href="/lich-su">Bỏ lọc</a>' : ''}
</form>

${
  cua.length
    ? `<div style="overflow-x:auto"><table class="runs">
<tr><th>Artifact</th><th>Loại</th><th>Kết quả</th><th>Provider</th><th>Model</th><th>Token (vào/ra)</th><th>Bắt đầu</th><th>Kết thúc</th></tr>
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
