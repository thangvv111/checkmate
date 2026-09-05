import type { HistoryEntry, LibraryIndex, ProbeLibEntry, RemovalLog } from '../../../packages/harness/src/probe-library.js';
import { shell, escHtml } from './ui.js';

/**
 * Thư viện probe — màn đọc tài sản regression của repo đang chọn.
 *
 * Bản trước của file này là một tấm biển «chưa dựng», và nó đúng ở thời điểm ấy: dữ liệu có thật trong
 * `probes-lib/` nhưng chưa có đường đọc nào lên tới đây. Nay có.
 *
 * Hai điều phải giữ trong đầu suốt file này:
 *
 * 1. **Mọi trường ở đây là dữ liệu ngoài** (⛔C4). Probe do model sinh từ nội dung repo đích — tên file,
 *    mục đích, luật spec, và nhất là CODE. Code là thứ dài nhất, giống «code của mình» nhất, nên là thứ
 *    dễ được miễn thoát nhất. Nó không được miễn.
 * 2. **Không đo được ≠ không có.** Thư viện rỗng, thư viện đời cũ chưa di trú, và `meta.json` rách là BA
 *    câu khác nhau. Cả ba đều không phải `0 probe`.
 */

/** Năm sắc thái của dải hành vi — gói design CCS §5b, và mỗi cái có NHÃN CHỮ vì màu không được là kênh duy nhất. */
const TONE_BY_STATE: Record<string, { mau: string; nhan: string }> = {
  pass: { mau: 'var(--pass)', nhan: 'pass' },
  hoi_quy: { mau: 'var(--fail)', nhan: 'hồi quy' },
  vi_pham_luat_moi: { mau: 'var(--fail)', nhan: 'vi phạm luật mới' },
  cai_thien: { mau: 'var(--pass)', nhan: 'cải thiện' },
  ngoai_pham_vi: { mau: 'var(--medium)', nhan: 'ngoài phạm vi' },
  nghi_van: { mau: 'var(--medium-soft)', nhan: 'nghi vấn' },
  nghi_loi_co_san: { mau: 'var(--medium-soft)', nhan: 'nghi lỗi có sẵn' },
  bo_qua: { mau: 'var(--color-neutral-300)', nhan: 'bỏ qua' },
  khong_chay: { mau: 'var(--color-neutral-300)', nhan: 'không chạy' },
};

/** Trạng thái lạ (sổ sửa tay, nhãn engine đời sau) vẫn phải vẽ được — và phải nói ra là nó lạ. */
export function behaviorTone(trangThai: unknown): { mau: string; nhan: string } {
  const k = typeof trangThai === 'string' ? trangThai : '';
  return TONE_BY_STATE[k] ?? { mau: 'var(--color-neutral-400)', nhan: k ? `trạng thái lạ: ${k}` : 'không rõ' };
}

/**
 * Dòng tóm tắt BẰNG CHỮ dưới dải hành vi.
 *
 * Đây là chỗ màn trả lời câu người vận hành thật sự hỏi — «probe này có đáng giữ không» — nên nó phải
 * nói cả khi câu trả lời khó nghe. Ba câu, không gộp:
 *   - từng bắt hồi quy  → nói SỐ LẦN, vì một lần và mười lần không cùng một thứ
 *   - fail cả hai nhánh → **lỗi có sẵn**, KHÔNG được đếm thành thành tích bắt hồi quy
 *   - im lặng suốt      → nói thẳng «chưa bắt được hồi quy nào», không để trống
 *
 * Vế thứ ba là vế dễ bị bỏ nhất và cũng là vế quan trọng nhất: một probe im lặng có thể đang canh đúng
 * một biên chưa ai phá (giữ), hoặc đang vô dụng (bỏ). Màn không quyết hộ, nhưng phải nói ra.
 */
export function summarizeBehavior(lichSu: readonly HistoryEntry[] | null | undefined): string {
  const ls = Array.isArray(lichSu) ? lichSu.filter((h) => h && typeof h.trang_thai === 'string') : [];
  if (!ls.length) return 'chưa chạy lượt nào — probe mới nạp';
  const hoiQuy = ls.filter((h) => h.trang_thai === 'hoi_quy' || h.trang_thai === 'vi_pham_luat_moi').length;
  if (hoiQuy) return `${hoiQuy} lần bắt được hồi quy`;
  const coSan = ls.filter((h) => h.trang_thai === 'nghi_loi_co_san' || h.trang_thai === 'khong_chay').length;
  if (coSan >= 3 && coSan >= ls.length - 1) return 'fail cả hai nhánh — lỗi có sẵn, không phải hồi quy';
  return 'chưa bắt được hồi quy nào';
}

/**
 * Dải hành vi — vẽ ĐÚNG số lượt đã có, KHÔNG đệm cho đủ 20 ô.
 *
 * Ô xám trong gói design mang nghĩa `không chạy` — một trạng thái THẬT của probe ở một lượt THẬT. Đệm
 * cho đủ khung là vẽ ra những phép đo chưa từng xảy ra, và dùng đúng ký hiệu của «đã đo, probe không
 * chạy được» để nói «chưa đo lần nào». Đó là cặp mà cả sản phẩm này tồn tại để tách.
 */
function behaviorStrip(lichSu: readonly HistoryEntry[] | null | undefined): string {
  const ls = Array.isArray(lichSu) ? lichSu.filter((h) => !!h) : [];
  if (!ls.length) return '<span class="hv-trong">chưa có lượt nào</span>';
  return ls
    .map((h) => {
      const t = behaviorTone(h.trang_thai);
      const sha = typeof h.sha === 'string' ? h.sha.slice(0, 7) : '?';
      const luc = typeof h.luc === 'string' ? h.luc.slice(0, 10) : '?';
      return `<span class="hv-o" style="--o:${t.mau}" title="${escHtml(`${sha} · ${luc} · ${t.nhan}`)}"></span>`;
    })
    .join('');
}

function ruleTags(specRule: unknown): string {
  const tho = typeof specRule === 'string' ? specRule : '';
  const ds = tho
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!ds.length) return '<span class="probe-tag probe-tag-trong">không neo luật nào</span>';
  return ds.map((r) => `<span class="probe-tag">${escHtml(r)}</span>`).join('');
}

/** Trần lịch sử của engine — dải chỉ «gần nhất» khi đã chạm trần; dưới trần thì nó là TOÀN BỘ. */
const TRAN_LICH_SU = 20;

/**
 * Nhãn của dải: «gần nhất» ngụ ý có lượt cũ hơn đã bị cắt. Với probe mới chạy 7 lượt thì 7 ấy là TẤT
 * CẢ những gì nó từng chạy, và gọi đó là «7 lượt gần nhất» làm người đọc tưởng còn lịch sử ở đâu đó.
 * Sai nhỏ, nhưng đúng loại sai mà màn này tồn tại để chống.
 */
function stripLabel(n: number): string {
  if (!n) return 'chưa có lượt nào';
  return n >= TRAN_LICH_SU ? `${n} lượt gần nhất — mới nhất bên phải` : `${n} lượt · mới nhất bên phải`;
}

/**
 * Khối cách ly — nói ĐỦ ba điều: đang bị loại, vì sao, và từ bao giờ.
 *
 * Nó KHÔNG ẩn probe đi. Một probe biến mất không lời giải thích đúng là thứ màn này vừa mất công đóng
 * lại ở change trước; cách ly mà giấu thì chỉ đổi chỗ cùng một lỗi.
 */
function quarantineBox(m: ProbeLibEntry): string {
  if (!m.cach_ly) return '';
  return `<div class="probe-cachly">
<div class="probe-cachly-dau"><b>Đang bị cách ly</b> — probe này KHÔNG nạp được trên nhánh gốc, nên nó bị loại khỏi mọi lượt chấm cho tới khi được gỡ dấu. Nó vẫn còn nguyên trong thư viện.</div>
<div class="probe-cachly-ly">${escHtml(String(m.cach_ly.ly_do ?? '').slice(0, 400) || '(không có lý do ghi kèm)')}</div>
<div class="probe-cachly-luc">phát hiện ${escHtml(String(m.cach_ly.luc ?? '').slice(0, 16).replace('T', ' '))} · nhánh gốc ${escHtml(String(m.cach_ly.sha_goc ?? '?').slice(0, 7))}</div>
</div>`;
}

function probeRow(m: ProbeLibEntry): string {
  const plan = m.plan ?? ({} as ProbeLibEntry['plan']);
  const ten = escHtml(m.ten);
  const soLuot = (m.lich_su ?? []).length;
  // Nút phá huỷ phải nói trước CÁI MẤT, và bước xác nhận tách khỏi cú bấm đầu (data-mat đọc ở lượt hai).
  const nutGo = `<button class="btn phu probe-nut-go" data-ten="${ten}" data-mat="${soLuot} lượt lịch sử hành vi${m.da_bat_hoi_quy ? ' · probe NÀY ĐÃ TỪNG BẮT HỒI QUY' : ''}" type="button">Gỡ khỏi thư viện</button>`;
  const nutGoDau = m.cach_ly ? `<button class="btn phu probe-nut-godau" data-ten="${ten}" type="button">Gỡ dấu cách ly</button>` : '';
  return `<div class="probe-dong${m.cach_ly ? ' probe-dong-cachly' : ''}">
  <div class="probe-grid">
    <div style="min-width:0">
      <div class="probe-ten-hang"><span class="probe-ten">${ten}</span>${ruleTags(plan.spec_rule)}</div>
      <div class="probe-mucdich">${escHtml(plan.muc_dich ?? '(probe không khai mục đích)')}</div>
      <div class="probe-meta">sinh tại ${escHtml(String(m.sha_sinh ?? '?').slice(0, 7))} · nạp ${escHtml(String(m.luc ?? '').slice(0, 10) || '?')}${
        m.da_bat_hoi_quy ? ' · <b>đã bắt hồi quy</b>' : ''
      }${(m.flaky_diem ?? 0) >= 2 ? ` · flaky ${m.flaky_diem}` : ''}</div>
    </div>
    <div>
      <div class="probe-nhan-dai">${stripLabel((m.lich_su ?? []).length)}</div>
      <div class="hv-dai">${behaviorStrip(m.lich_su)}</div>
      <div class="probe-tomtat">${escHtml(summarizeBehavior(m.lich_su))}</div>
    </div>
    <div class="probe-nut-cot">
      <button class="btn phu probe-nut-code" data-ten="${ten}" type="button">Xem code probe</button>
      ${nutGoDau}
      ${nutGo}
    </div>
  </div>
  ${quarantineBox(m)}
  <pre class="probe-code" hidden></pre>
</div>`;
}

/**
 * Xoá TOÀN BỘ thư viện — đường một chiều nhất của màn này.
 *
 * Xác nhận bằng cách GÕ LẠI tên repo, không phải một hộp «có/không». Một hộp có/không cạnh một nút bấm
 * nhầm không phải một quyết định — nó là một cú bấm thứ hai. Máy chủ kiểm lại chuỗi ấy, nên ô này là
 * lớp thứ hai chứ không phải lớp duy nhất.
 */
function purgeBlock(repoFull: string, soProbe: number): string {
  if (!soProbe) return '';
  return `<section class="probe-khu probe-xoa">
<h4 style="margin:0 0 2px">Xoá toàn bộ thư viện</h4>
<p class="sub" style="margin:0 0 10px">Xoá <b>${soProbe} probe</b> của <span class="mono">${escHtml(repoFull)}</span> và toàn bộ lịch sử hành vi của chúng.
Đây là <b>tài sản tích luỹ qua từng lượt chấm</b> và không dựng lại được — thư viện sẽ mọc lại từ đầu, mất hết những probe đã từng bắt hồi quy.
Sổ gỡ vẫn giữ nguyên: mỗi probe ra đi để lại một dòng, kèm tên người xoá.</p>
<div class="probe-xoa-hang">
  <input id="xac-nhan-xoa" placeholder="gõ lại: ${escHtml(repoFull)}" autocomplete="off" spellcheck="false">
  <button class="btn phu probe-nut-xoa" data-repo="${escHtml(repoFull)}" type="button">Xoá thư viện</button>
</div>
</section>`;
}

/** Bốn loại gỡ — hai do máy quyết, hai do người. Chỉ hai loại sau có ai chịu trách nhiệm. */
const REMOVAL_KIND_LABEL: Record<string, string> = {
  trung_lap: 'gỡ vì trùng lặp',
  dao_thai: 'đào thải vì vượt trần',
  nguoi_go: 'người vận hành gỡ',
  nguoi_xoa_thu_vien: 'người vận hành xoá cả thư viện',
};

function removalsBlock(so: RemovalLog): string {
  if (!so.ton_tai && !so.dong_hong) {
    return `<section class="probe-khu"><h4 style="margin:0 0 2px">Probe đã gỡ</h4>
<p class="sub" style="margin:0">Chưa có lần gỡ nào được ghi trên repo này. Sổ gỡ bắt đầu từ lần gỡ đầu tiên sau khi tính năng này có mặt — trước đó, đào thải vì trần chỉ để lại một dòng log trên máy chủ.</p></section>`;
  }
  const hang = so.ban_ghi
    .slice()
    .reverse()
    .map(
      (b) => `<div class="go-hang">
<span class="go-ten">${escHtml(b.go)}</span>
<span class="mono">${b.giu ? escHtml(b.giu) : '<span class="go-trong">— không có probe thay thế</span>'}</span>
<span>${escHtml(REMOVAL_KIND_LABEL[b.loai] ?? String(b.loai))}${b.boi ? ` · <b>${escHtml(b.boi)}</b>` : ''} · ${escHtml(b.ly_do ?? '')}</span>
<span class="go-bc">${escHtml(b.bang_chung ?? '—')}</span>
</div>`,
    )
    .join('');
  return `<section class="probe-khu">
<h4 style="margin:0 0 2px">Probe đã gỡ</h4>
<p class="sub" style="margin:0 0 10px">Chỉ đọc, chỉ ghi thêm. <b>Bốn lý do khác nhau</b>: gỡ vì trùng lặp có probe được giữ thay; đào thải vì vượt trần thì không có gì thay nó; hai loại do người vận hành gỡ thì mang tên người.</p>
${so.dong_hong ? `<div class="card" style="border-left:4px solid var(--medium);background:var(--medium-tint);margin-bottom:10px"><b>${so.dong_hong} dòng trong sổ gỡ không đọc được</b> — đã bỏ qua. Sổ ghi bằng cách nối thêm dòng, nên một tiến trình chết giữa chừng để lại dòng cụt. Con số này hiện ra thay vì bị nuốt: một sổ hỏng dần trông y hệt một sổ trống.</div>` : ''}
<div class="go-dau"><span>Gỡ</span><span>Giữ</span><span>Lý do</span><span>Bằng chứng</span></div>
${hang || '<p class="sub">Sổ có mặt nhưng chưa dòng nào đọc được.</p>'}
</section>`;
}

const CODE_PANEL_JS = `
document.addEventListener('click', async (e) => {
  const nut = e.target.closest('.probe-nut-code');
  if (!nut) return;
  const o = nut.closest('.probe-dong').querySelector('.probe-code');
  if (!o.hidden) { o.hidden = true; nut.textContent = 'Xem code probe'; return; }
  nut.disabled = true;
  try {
    const r = await fetch('/api/probes/code?ten=' + encodeURIComponent(nut.dataset.ten));
    const d = await r.json();
    // textContent, KHONG innerHTML: code probe do model sinh tu repo dich la du lieu ngoai (C4).
    // Dat bang textContent thi trinh duyet khong bao gio phan tich no thanh phan tu — day la rao,
    // khong phai mot lua chon phong cach.
    o.textContent = r.ok ? d.code : (d.loi || 'không đọc được probe này');
  } catch (err) {
    o.textContent = 'không gọi được máy chủ: ' + err;
  }
  o.hidden = false;
  nut.disabled = false;
  nut.textContent = 'Ẩn code';
});

// Ba hanh dong pha huy. Buoc XAC NHAN tach khoi cu bam dau: lan bam thu nhat doi nut thanh mot cau
// noi ro CAI MAT, lan thu hai moi goi may chu. Khong dung confirm() vi no khong noi duoc cai mat.
function callLibraryApi(duong, than, nut) {
  nut.disabled = true;
  fetch(duong, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) })
    .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
    .then(({ ok, d }) => { if (ok) location.reload(); else { alert(d.loi || 'không thực hiện được'); nut.disabled = false; } })
    .catch((e) => { alert('không gọi được máy chủ: ' + e); nut.disabled = false; });
}

document.addEventListener('click', (e) => {
  const goDau = e.target.closest('.probe-nut-godau');
  if (goDau) return callLibraryApi('/api/probes/unquarantine', { ten: goDau.dataset.ten }, goDau);

  const go = e.target.closest('.probe-nut-go');
  if (go) {
    if (go.dataset.xn !== '1') {
      go.dataset.xn = '1';
      go.textContent = 'Bấm lần nữa để gỡ — mất ' + go.dataset.mat;
      return;
    }
    return callLibraryApi('/api/probes/remove', { ten: go.dataset.ten }, go);
  }

  const xoa = e.target.closest('.probe-nut-xoa');
  if (xoa) {
    const o = document.getElementById('xac-nhan-xoa');
    // Kiem o CA HAI phia: o day de noi ngay, va o may chu vi day la thu nguoi ta bo qua duoc.
    if (o.value.trim() !== xoa.dataset.repo) { alert('Gõ đúng tên repo để xác nhận: ' + xoa.dataset.repo); o.focus(); return; }
    return callLibraryApi('/api/probes/purge', { xac_nhan: o.value.trim() }, xoa);
  }
});`;

const LEGEND = ['pass', 'hoi_quy', 'ngoai_pham_vi', 'nghi_van', 'khong_chay']
  .map((k) => {
    const t = behaviorTone(k);
    return `<span class="hv-chu"><span class="hv-o" style="--o:${t.mau}"></span>${escHtml(t.nhan)}</span>`;
  })
  .join('');

export interface ProbesPageData {
  /** repo đang chọn; rỗng nghĩa là CHƯA KẾT NỐI REPO NÀO — câu khác hẳn «thư viện trống». */
  repoFull: string;
  index: LibraryIndex | null;
  removals: RemovalLog;
  nguoi?: string;
}

export function probesPage(d: ProbesPageData): string {
  const than = !d.repoFull || !d.index ? noRepoBody() : libraryBody(d.repoFull, d.index, d.removals);
  return shell('Thư viện probe — CheckMate', than, d.repoFull && d.index ? CODE_PANEL_JS : '', {
    muc: 'probes',
    nguoi: d.nguoi ?? '',
  });
}

/** Chưa kết nối repo nào — KHÔNG nói «thư viện trống»: chưa có gì để tra khác với đã tra mà không có gì. */
function noRepoBody(): string {
  return `<h1>Thư viện probe</h1>
<p class="sub">Tài sản regression tích luỹ theo từng repo.</p>
<div class="card" style="max-width:720px">
  <div class="card-kicker">Chưa kết nối repo nào</div>
  <p style="margin:0 0 10px">Thư viện probe dựng theo repo, nên chưa có repo thì chưa có thư viện nào để mở —
  đây không phải một thư viện trống.</p>
  <a class="btn btn-primary" href="/settings">Vào Cấu hình</a>
</div>`;
}

/**
 * `chuGiai`: chỉ vẽ chú giải màu KHI CÓ dải để giải. Bảng chú giải cho một dải không tồn tại là trang trí,
 * và trang trí ở một màn rỗng làm nó trông như đang hỏng — đúng thứ luật «rỗng ≠ hỏng» cấm. Nó cũng là chỗ
 * DUY NHẤT của màn hợp lệ mang sắc FAIL, nên để nó lọt vào nhánh rỗng là để trạng thái rỗng mặc màu hỏng.
 */
function screenHeader(repoFull: string, ix: LibraryIndex, chuGiai: boolean): string {
  const dem =
    ix.trang_thai === 'khong_doc_duoc'
      ? '<span class="tv-dem tv-dem-hong">không đo được</span>'
      : `<span class="tv-dem">${ix.probes.length}/${ix.tran} probe</span>`;
  return `<h6 style="color:var(--color-accent);margin:0 0 2px">${escHtml(repoFull)} · tài sản regression tích luỹ</h6>
<h1 style="margin:0">Thư viện probe</h1>
<div class="tv-dau">${dem}<span class="tv-ghi">trần đếm theo probe</span>${
    ix.di_tru ? '<button class="btn phu" type="button" onclick="this.nextElementSibling.hidden=!this.nextElementSibling.hidden">+ ghi chú di trú</button><div class="tv-ditru" hidden>' + escHtml(ix.di_tru) + '</div>' : ''
  }</div>
${chuGiai ? `<div class="hv-chugiai">${LEGEND}</div>` : ''}`;
}

function libraryBody(repoFull: string, ix: LibraryIndex, so: RemovalLog): string {
  const dau = screenHeader(repoFull, ix, ix.trang_thai === 'ok');

  if (ix.trang_thai === 'khong_doc_duoc') {
    // KHÔNG hiện «0 probe»: `0` là một khẳng định ĐÃ ĐẾM. Ở đây phép đếm không chạy được.
    return `${dau}
<div class="card" style="max-width:760px;border-left:4px solid var(--medium);background:var(--medium-tint)">
  <div class="card-kicker" style="color:var(--medium-ink)">Không đọc được sổ thư viện</div>
  <p style="margin:0"><code>probes-lib/&lt;repo&gt;/meta.json</code> không phân tích được. Màn này cố ý
  <b>không</b> hiện «0 probe»: số không nghĩa là đã đếm và thư viện trống, còn ở đây phép đếm không chạy
  được. Probe trên đĩa có thể vẫn nguyên.</p>
</div>`;
  }

  if (ix.trang_thai === 'doi_cu') {
    return `${dau}
<div class="card" style="max-width:760px;border-left:4px solid var(--medium);background:var(--medium-tint)">
  <div class="card-kicker" style="color:var(--medium-ink)">Thư viện còn ở định dạng đời cũ</div>
  <p style="margin:0">Thư viện này lưu theo <b>bộ</b> (mỗi lượt chấm một file), chưa tách theo probe. Nó sẽ
  được di trú tự động ở <b>lượt chấm kế tiếp</b>. Màn này không tự di trú — di trú là một lượt ghi, còn đây
  là màn đọc.</p>
</div>`;
  }

  if (!ix.probes.length) {
    return `${dau}
<p class="mono" style="padding:36px 0;color:var(--color-neutral-600)">Chưa có probe nào — thư viện dựng dần
từ các lượt chấm trên repo này.</p>
${removalsBlock(so)}`;
  }

  const dong = ix.probes
    .slice()
    .sort((a, b) => String(b.luc ?? '').localeCompare(String(a.luc ?? '')))
    .map(probeRow)
    .join('');
  return `${dau}${dong}${removalsBlock(so)}${purgeBlock(repoFull, ix.probes.length)}`;
}
