import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { historyPage } from '../apps/web/src/ui-history.js';

/**
 * Lưới cho lỗi bố cục khối lọc màn Lịch sử (PO báo 05/09).
 *
 * Lỗi này đáng ghi lại vì **nó đi qua toàn bộ lưới hiện có mà không một ca nào đỏ**: hai câu lệnh đúng
 * đặt cạnh nhau thành một cái sai.
 *
 *   `.card { flex-direction: column }`                          ← đúng cho card
 *   `<form class="card" style="display:flex; align-items:flex-end">`  ← đúng cho một hàng ngang
 *
 * Form quên khai lại hướng, nên nó thừa hưởng `column`; `align-items:flex-end` thành dồn PHẢI thay vì căn
 * đáy, và `flex:1` nở theo chiều DỌC. Không lỗi nào nổ, không kiểu nào sai — chỉ có một màn vỡ.
 *
 * Nên ca chính của file này KHÔNG phải «màn Lịch sử đã sửa» mà là **cái bẫy đã đóng**: ai viết một hàng
 * ngang trên nền `.card` mà quên khai hướng thì lưới đỏ ngay, không đợi tới lúc có người mở màn ra nhìn.
 */

const THU_MUC = 'apps/web/src';
const NL = String.fromCharCode(10);

const fileUi = (): string[] =>
  readdirSync(THU_MUC)
    .filter((n) => n.endsWith('.ts'))
    .map((n) => join(THU_MUC, n));

/**
 * `.card` ép `flex-direction: column`. Phần tử nào vừa mang class ấy vừa tự khai `display:flex` là đang
 * muốn một bố cục KHÁC — và nó phải nói ra hướng, vì không nói thì nó nhận `column` một cách im lặng.
 */
export function scanCardFlexDirection(files: readonly string[], doc: (f: string) => string): string[] {
  const loi: string[] = [];
  for (const f of files) {
    for (const m of doc(f).matchAll(/class="[^"]*\bcard\b[^"]*"[^>]*?style="([^"]*)"/g)) {
      const style = m[1] ?? '';
      if (!/display\s*:\s*flex/.test(style)) continue; // dùng cột mặc định của .card — đúng ý
      if (!/flex-direction\s*:/.test(style)) {
        loi.push(`${f}: phần tử .card khai display:flex mà KHÔNG khai flex-direction — nó sẽ thừa hưởng column`);
      }
    }
  }
  return loi;
}

describe('cái bẫy .card + display:flex (T2)', () => {
  it('T2.1 — mã nguồn hiện tại: không phần tử .card nào khai display:flex mà quên hướng', () => {
    expect(scanCardFlexDirection(fileUi(), (f) => readFileSync(f, 'utf8'))).toEqual([]);
  });

  it('T2.2 [fixture đối kháng] — quên khai hướng thì lưới ĐỎ, và nêu tên file', () => {
    const xau = '<form class="card" style="display:flex;gap:8px;align-items:flex-end">';
    const ra = scanCardFlexDirection(['apps/web/src/gia.ts'], () => xau);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('gia.ts');
    expect(ra[0]).toContain('flex-direction');
  });

  it('T2.3 [fixture đối chứng] — có khai hướng thì XANH', () => {
    const tot = '<form class="card" style="display:flex;flex-direction:row;gap:8px">';
    expect(scanCardFlexDirection(['apps/web/src/gia.ts'], () => tot)).toEqual([]);
  });

  it('T2.4 [đối chứng] — .card KHÔNG khai display:flex thì không bị bắt', () => {
    // Nó đang dùng đúng bố cục cột mặc định của `.card` — không có gì để nói.
    const tot = '<div class="card" style="max-width:720px">';
    expect(scanCardFlexDirection(['apps/web/src/gia.ts'], () => tot)).toEqual([]);
  });
});

describe('khối lọc màn Lịch sử dựng ra HÀNG NGANG (T1)', () => {
  const CSS = readFileSync('apps/web/src/ui.ts', 'utf8');
  const html = historyPage([], { trang: 1 }, []);

  it('T1.1 — khối lọc mang class riêng, và class ấy khai flex-direction:row', () => {
    expect(html).toContain('class="loc-bar"');
    // Không còn dựa vào `.card` rồi ghi đè lắt nhắt: hướng khai thẳng, ở một chỗ.
    expect(html).not.toMatch(/<form[^>]*class="[^"]*\bcard\b/);
    const i = CSS.indexOf('.loc-bar {');
    expect(i, 'không tìm thấy class .loc-bar — phép quét này đang mù').toBeGreaterThan(-1);
    expect(CSS.slice(i, CSS.indexOf('}', i))).toMatch(/flex-direction\s*:\s*row/);
  });

  it('T1.2 — ô tìm kiếm là ô co giãn duy nhất, và nở theo chiều NGANG', () => {
    expect(html).toContain('class="loc-tim"');
    const i = CSS.indexOf('.loc-bar .loc-tim {');
    expect(i).toBeGreaterThan(-1);
    const than = CSS.slice(i, CSS.indexOf('}', i));
    expect(than).toMatch(/flex\s*:\s*1/);
    expect(than).toMatch(/min-width/);
  });

  it('T1.3 — hẹp màn xếp DỌC là một quyết định KHAI RA, không phải tai nạn thừa kế', () => {
    const i = CSS.indexOf('@media (max-width: 720px)');
    expect(i).toBeGreaterThan(-1);
    expect(CSS.slice(i, i + 400)).toContain('.loc-bar');
  });
});

describe('hồi quy — sửa bố cục không được làm rơi bộ lọc nào (T3)', () => {
  const html = historyPage([], { trang: 1 }, ['a/one', 'b/two']);

  it('T3.1 — vẫn đủ BẢY ô lọc và nút Lọc', () => {
    for (const ten of ['repo', 'verdict', 'skill', 'ncc', 'tu', 'den', 'q']) {
      expect(html, `mất ô lọc «${ten}»`).toContain(`name="${ten}"`);
    }
    expect(html).toContain('>Lọc<');
    // Danh sách repo vẫn đổ vào ô lọc repo.
    expect(html).toContain('a/one');
    expect(html).toContain('b/two');
  });

  it('T3.2 — «Bỏ lọc» chỉ hiện khi có bộ lọc đang bật', () => {
    expect(historyPage([], { trang: 1 }, [])).not.toContain('Bỏ lọc');
    expect(historyPage([], { trang: 1, q: 'PR #8' }, [])).toContain('Bỏ lọc');
  });

  it('T3.3 — giá trị người dùng gõ vẫn được THOÁT trước khi trả lại vào ô', () => {
    // Ô tìm kiếm nhận chuỗi tự do; bỏ style nội tuyến không được kéo theo phép thoát.
    const doc = historyPage([], { trang: 1, q: '"><script>alert(1)</script>' }, []);
    expect(doc).not.toContain('<script>alert(1)</script>');
    expect(doc).toContain('&lt;script&gt;');
  });

  it('T3.4 — markup khối lọc gọn hẳn: không còn chuỗi style nội tuyến dài trong form', () => {
    const i = html.indexOf('<form');
    const form = html.slice(i, html.indexOf('</form>', i));
    // Layout thuộc về bảng kiểu. Một chuỗi style dài trong markup là chỗ mà lần sau lại quên một thuộc tính.
    expect(form).not.toContain('font-size:12px;font-weight:600');
    expect(form.split(NL).filter((d) => d.includes('style="')).length).toBe(0);
  });
});
