import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { shell, NAV_ITEMS } from '../apps/web/src/ui.js';

/**
 * Lưới cho capability `giao-dien-ccs` › «vỏ phải dùng được ở màn hẹp».
 *
 * ⛔ **ĐỌC TRƯỚC KHI TIN FILE NÀY.** vitest không có trình duyệt, nên **không ca nào ở đây đo được
 * `scrollWidth` thật**. Những gì file này làm là quét CSS: media query có tồn tại không, sidebar có thôi
 * cố định bề rộng không, nút repo có trần không, và có ai giấu bớt mục điều hướng không.
 *
 * Nghĩa là:
 *   - Lưới XANH **không** chứng minh màn đã hết tràn.
 *   - Phép chứng minh là **số đo trên trình duyệt thật**, ghi trong `tasks.md` §0 và §6 của change.
 *   - Vai của file này là **chốt chống hồi quy** cho lần sửa vỏ sau.
 *
 * Nhầm hai vai ấy là đúng lỗi lưới loại 1 mà `test-grid-integrity` mô tả — và nó nguy hiểm ở đây hơn chỗ
 * khác, vì một lưới tự nhận là đủ sẽ làm người sau thôi mở trình duyệt ra nhìn. Đó chính là cách lỗi này
 * lọt vào lần đầu: nó đi qua toàn bộ lưới hiện có mà không ca nào đỏ.
 */

// Chuẩn hoá xuống dòng NGAY khi đọc: file nguồn trên máy này là CRLF, và một phép quét viết bằng LF sẽ
// im lặng không khớp gì — trả rỗng, trông y hệt «code đang đúng». Đã tốn một lượt chạy ở đây.
const NL = String.fromCharCode(10);
const CSS = readFileSync('apps/web/src/ui.ts', 'utf8').split(String.fromCharCode(13) + NL).join(NL);

/** Cắt khối media query của VỎ ra khỏi bảng kiểu — cắt tới mốc kế tiếp, không cắt cứng. */
function khoiVoHep(css: string): string {
  const i = css.indexOf('@media (max-width: 720px) {' + NL + '  .app-body');
  if (i < 0) return '';
  // Media query của vỏ là khối duy nhất mở bằng `.app-body`; kết thúc ở dòng `}` cột 0 đầu tiên sau đó.
  const het = css.indexOf(NL + '}', i);
  return het < 0 ? '' : css.slice(i, het + 2);
}

/**
 * Ba vế của vỏ hẹp, quét từ bảng kiểu.
 *
 * Trả danh sách vế THIẾU, nêu tên từng vế — người đọc sửa được ngay mà không phải dò.
 */
export function scanNarrowShell(css: string): string[] {
  const loi: string[] = [];
  const vo = khoiVoHep(css);
  if (!vo) return ['không tìm thấy media query của vỏ — phép quét này đang mù'];

  if (!/\.app-nav\s*{[^}]*width\s*:\s*auto/.test(vo)) {
    loi.push('sidebar vẫn cố định bề rộng ở màn hẹp — cột nội dung sẽ còn 165px hoặc ít hơn');
  }
  if (!/\.app-nav\s*{[^}]*flex-direction\s*:\s*row/.test(vo)) {
    loi.push('sidebar không đổi hướng ở màn hẹp');
  }
  if (!/\.app-hd\s*{[^}]*flex-wrap\s*:\s*wrap/.test(css)) {
    loi.push('header không cho xuống dòng — các con sẽ đẩy cả tài liệu rộng ra');
  }
  if (!/\.repo-btn\s*{[^}]*max-width\s*:/.test(css) || !/\.repo-btn\s*{[^}]*text-overflow\s*:\s*ellipsis/.test(css)) {
    loi.push('nút chuyển repo không có trần bề rộng + ellipsis — bề rộng của nó do tên repo quyết định');
  }
  return loi;
}

/**
 * Không được GIẤU mục điều hướng để hết tràn.
 *
 * Đây là cách làm hại thật của một change bố cục: `display:none` cho vài mục thì con số tràn về 0 ngay,
 * và cái mất không hiện ra ở bất kỳ phép đo nào. Ở sản phẩm này, cổng merge và màn Cấu hình nằm SAU điều
 * hướng — giấu một mục là lấy mất đường tới đúng thứ người vận hành cần lúc gấp.
 */
export function scanHiddenNavItems(css: string): string[] {
  const loi: string[] = [];
  for (const d of css.split(NL)) {
    if (/\.app-nav\s+a[^{]*{[^}]*display\s*:\s*none/.test(d)) loi.push(`ẩn mục điều hướng: ${d.trim()}`);
    if (/\.app-nav\s+a:nth-child[^{]*{[^}]*display\s*:\s*none/.test(d)) loi.push(`ẩn mục điều hướng: ${d.trim()}`);
  }
  return loi;
}

describe('vỏ ở màn hẹp — quét CSS (T1)', () => {
  it('T1.1 · T1.2 · T1.3 — mã nguồn hiện tại có đủ ba vế của vỏ hẹp', () => {
    expect(scanNarrowShell(CSS)).toEqual([]);
  });

  it('T1.4 [fixture đối kháng] — thiếu vế nào thì lưới ĐỎ và nêu đúng vế đó', () => {
    const thieuNav = [
      '@media (max-width: 720px) {',
      '  .app-body { flex-direction:column; }',
      '  .app-nav { width:210px; flex-direction:row; }',
      '}',
      '.app-hd { flex-wrap:wrap; }',
      '.repo-btn { max-width:46vw; text-overflow:ellipsis; }',
    ].join(NL);
    const ra = scanNarrowShell(thieuNav);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('cố định bề rộng');

    const thieuHd = thieuNav.replace('.app-nav { width:210px;', '.app-nav { width:auto;').replace('.app-hd { flex-wrap:wrap; }', '.app-hd { gap:14px; }');
    expect(scanNarrowShell(thieuHd).join(' ')).toContain('header không cho xuống dòng');

    const thieuTran = thieuNav.replace('.app-nav { width:210px;', '.app-nav { width:auto;').replace('.repo-btn { max-width:46vw; text-overflow:ellipsis; }', '.repo-btn { white-space:nowrap; }');
    expect(scanNarrowShell(thieuTran).join(' ')).toContain('trần bề rộng');
  });

  it('T1.5 [fixture đối chứng] — đủ ba vế thì XANH', () => {
    const du = [
      '@media (max-width: 720px) {',
      '  .app-body { flex-direction:column; }',
      '  .app-nav { width:auto; flex-direction:row; flex-wrap:wrap; }',
      '}',
      '.app-hd { flex-wrap:wrap; }',
      '.repo-btn { max-width:46vw; overflow:hidden; text-overflow:ellipsis; }',
    ].join(NL);
    expect(scanNarrowShell(du)).toEqual([]);
  });

  it('T1.6 — phép quét biết khi nó đang MÙ, không im lặng trả rỗng', () => {
    // Một hàm quét không tìm thấy thứ nó định quét mà trả rỗng thì trông y hệt «code đang đúng».
    expect(scanNarrowShell('.app-hd { flex-wrap:wrap; }')).toEqual(['không tìm thấy media query của vỏ — phép quét này đang mù']);
  });
});

describe('không giấu mục, không cần JS (T2)', () => {
  const html = shell('x', '<p>nội dung</p>', '', { muc: 'hist', nguoi: 'thang.vv', repoNhan: 'a/one' });

  it('T2.1 — vỏ dựng ra ĐỦ bảy mục điều hướng', () => {
    expect(NAV_ITEMS).toHaveLength(7);
    for (const n of NAV_ITEMS) expect(html, `thiếu mục ${n.nhan}`).toContain(`href="${n.duong}"`);
  });

  it('T2.2 — CSS KHÔNG ẩn mục điều hướng nào', () => {
    expect(scanHiddenNavItems(CSS)).toEqual([]);
  });

  it('T2.2 [fixture đối kháng] — ẩn một mục để hết tràn thì lưới ĐỎ', () => {
    const xau = '@media (max-width: 720px) { .app-nav a:nth-child(n+5) { display:none; } }';
    expect(scanHiddenNavItems(xau).length).toBeGreaterThan(0);
  });

  it('T2.3 — dải điều hướng không phụ thuộc script nào', () => {
    const i = html.indexOf('<nav class="app-nav">');
    const nav = html.slice(i, html.indexOf('</nav>', i));
    for (const cam of ['onclick', 'data-toggle', '<script']) {
      expect(nav, `điều hướng phụ thuộc ${cam} — vỏ phải chạy khi JS tắt`).not.toContain(cam);
    }
  });

  it('T2.4 — thứ tự bảy mục KHÔNG đổi theo trang đang mở', () => {
    // Đổi thứ tự theo trang là làm người dùng mất bản đồ.
    const thu = (muc: 'dashboard' | 'hist' | 'config') =>
      NAV_ITEMS.map((n) => shell('x', '', '', { muc, repoNhan: 'a/one' }).indexOf(`href="${n.duong}"`));
    const a = thu('dashboard');
    for (const m of ['hist', 'config'] as const) {
      const b = thu(m);
      // So THỨ TỰ, không so vị trí tuyệt đối: độ dài chuỗi đổi theo mục đang chọn.
      expect(b.map((_, k) => k).sort((x, y) => b[x]! - b[y]!)).toEqual(a.map((_, k) => k).sort((x, y) => a[x]! - a[y]!));
    }
  });

  it('T2.5 — tên repo đầy đủ vẫn đọc được dù hiển thị bị cắt', () => {
    // Ellipsis cắt HIỂN THỊ, không cắt dữ liệu. (Và nó KHÔNG phải một phép che — ⛔C3 đòi bản che phân
    // biệt được hai giá trị khác nhau; ellipsis không đạt, nên đừng dùng lại cho token.)
    const dai = shell('x', '', '', { repoNhan: 'thangvv111/mot-cai-ten-repo-rat-dai-de-thu' });
    expect(dai).toContain('title="thangvv111/mot-cai-ten-repo-rat-dai-de-thu"');
  });
});

describe('hồi quy desktop (T3)', () => {
  it('T3.1 — ngoài media query, sidebar vẫn 210px: bố cục desktop KHÔNG đổi', () => {
    const i = CSS.indexOf('.app-nav { width:210px;');
    expect(i, 'mất khai báo desktop của sidebar').toBeGreaterThan(-1);
    // Và khai báo ấy nằm NGOÀI media query hẹp.
    expect(khoiVoHep(CSS)).not.toContain('width:210px');
  });

  it('T3.2 — mục đang mở vẫn được đánh dấu', () => {
    const html = shell('x', '', '', { muc: 'ledger', repoNhan: 'a/one' });
    expect(html).toMatch(/href="\/ledger"[^>]*class="on"[^>]*aria-current="page"/);
  });
});
