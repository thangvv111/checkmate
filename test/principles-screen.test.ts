import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRINCIPLES, PRINCIPLES_POSTER, type Principle } from '../apps/web/src/principles.js';
import { docsPage } from '../apps/web/src/ui-docs.js';

/**
 * Lưới cho `principles-screen-ccs`.
 *
 * Trang tuyên ngôn của một sản phẩm mà cả nghề là ĐÒI BẰNG CHỨNG thì không được là chỗ duy nhất nói mà
 * không phải chứng minh. Gói design viết «giữ liên kết này khi sửa màn khác — nó là bằng chứng rằng
 * nguyên tắc không chỉ là khẩu hiệu». Một lời dặn thì trôi; đây là chỗ nó thành phép kiểm.
 */

/**
 * Route GET có thật, đọc THẲNG từ `server.ts`.
 *
 * Vì sao không khai tay một danh sách trong test: danh sách khai tay là bản sao thứ hai của sự thật, và
 * nó lệch ngay lần đầu ai đó đổi route — rồi lưới xanh trong khi liên kết đã chết.
 */
export function scanRoutes(serverSrc: string): string[] {
  return [...String(serverSrc ?? '').matchAll(/app\.get\('([^']+)'/g)].map((m) => m[1]!);
}

/**
 * Nguyên tắc nào trỏ tới một route KHÔNG tồn tại.
 *
 * Nghiêng về phía BÁO: không nhận diện được thì coi là chết và ĐỎ. Đỏ oan thì có người nhìn và sửa lưới;
 * xanh oan thì liên kết chết nằm đó mãi.
 */
export function scanDeadLinks(ds: readonly Principle[], routes: readonly string[]): string[] {
  const co = new Set(routes);
  return (Array.isArray(ds) ? ds : [])
    .filter((n) => {
      // Query string không phải một route — so phần trước dấu `?`.
      const duong = String(n?.thayO?.duong ?? '').split('?')[0];
      return !duong || !co.has(duong);
    })
    .map((n) => `${n?.so}: ${n?.thayO?.duong ?? '(thiếu đường)'}`);
}

const SERVER = readFileSync('apps/web/src/server.ts', 'utf8');
const HTML = docsPage('thang.vv');

describe('Chín nguyên tắc là DỮ LIỆU, đủ và liên tục', () => {
  it('T1.1 đúng chín điều, số 01–09, không trùng và không đứt quãng', () => {
    expect(PRINCIPLES).toHaveLength(9);
    expect(PRINCIPLES.map((n) => n.so)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);
  });

  it('T1.2 đếm được TỪ DỮ LIỆU, không phải dò chuỗi trong HTML', () => {
    expect(Array.isArray(PRINCIPLES)).toBe(true);
    expect(PRINCIPLES.length).toBe(9);
  });

  it('T1.3 mỗi điều đủ tiêu đề, thân, và thayO có nhãn + đường', () => {
    for (const n of PRINCIPLES) {
      expect(n.tieuDe.trim().length, `${n.so} thiếu tiêu đề`).toBeGreaterThan(5);
      expect(n.than.trim().length, `${n.so} thân quá ngắn`).toBeGreaterThan(40);
      expect(n.thayO.nhan.trim().length, `${n.so} thiếu nhãn`).toBeGreaterThan(3);
      expect(n.thayO.duong.startsWith('/'), `${n.so} đường phải là đường nội bộ`).toBe(true);
    }
  });

  it('T1.4 chín tiêu đề khác nhau', () => {
    expect(new Set(PRINCIPLES.map((n) => n.tieuDe)).size).toBe(9);
  });
});

describe('scanDeadLinks — liên kết «thấy ở:» phải sống', () => {
  it('T2.5 tập route đọc TỪ server.ts, không khai tay', () => {
    const r = scanRoutes(SERVER);
    expect(r.length, 'không quét được route nào — lưới đang canh một danh sách rỗng').toBeGreaterThanOrEqual(9);
    for (const d of ['/', '/lich-su', '/ledger', '/tin-cay', '/settings', '/docs']) {
      expect(r, `thiếu route ${d}`).toContain(d);
    }
  });

  it('T2.1 fixture ĐỐI CHỨNG: chín đường hiện tại đều sống', () => {
    expect(scanDeadLinks(PRINCIPLES, scanRoutes(SERVER))).toEqual([]);
  });

  it('T2.2 fixture ĐỐI KHÁNG: một đường chết → ĐỎ, nêu nguyên tắc nào và đường nào', () => {
    const hong = [...PRINCIPLES.slice(0, 8), { ...PRINCIPLES[8]!, thayO: { nhan: 'x', duong: '/man-da-bi-go' } }];
    const loi = scanDeadLinks(hong, scanRoutes(SERVER));
    expect(loi).toHaveLength(1);
    expect(loi[0]).toContain('09');
    expect(loi[0]).toContain('/man-da-bi-go');
  });

  it('T2.3 đường có query string so ở phần trước dấu ?', () => {
    expect(scanDeadLinks([{ so: '01', tieuDe: 't', than: 'x', thayO: { nhan: 'n', duong: '/lich-su?a=b' } }], ['/lich-su'])).toEqual([]);
    expect(scanDeadLinks([{ so: '01', tieuDe: 't', than: 'x', thayO: { nhan: 'n', duong: '/khong-co?a=b' } }], ['/lich-su'])).toHaveLength(1);
  });

  it('T2.4 đầu vào khuyết → không ném', () => {
    expect(() => scanDeadLinks([], [])).not.toThrow();
    expect(() => scanDeadLinks(null as never, [])).not.toThrow();
    expect(scanDeadLinks([{ so: '01' } as never], ['/'])).toHaveLength(1);
    expect(scanRoutes('')).toEqual([]);
    expect(scanRoutes(null as never)).toEqual([]);
  });
});

describe('Poster và bố cục', () => {
  it('T3.1 poster mang ĐÚNG NGUYÊN VĂN câu đã chốt', () => {
    // Gói design liệt kê câu này ở mục «Copy đáng giữ nguyên». Một câu tuyên bố bị sửa dần qua vài lần
    // refactor thì đến lúc nó không còn là tuyên bố nữa, và không ai nhớ nó đã đổi lúc nào.
    expect(PRINCIPLES_POSTER).toBe('Checker không tin ai. Chỉ tin bằng chứng.');
    expect(HTML).toContain('Checker không tin ai. Chỉ tin bằng chứng.');
  });

  it('T3.2 poster dùng accent NỀN ĐẶC, không tint và không semantic', () => {
    const src = readFileSync('apps/web/src/ui-docs.ts', 'utf8');
    const dong = src.split('\n').filter((d) => d.includes('.nt-poster {'));
    expect(dong).toHaveLength(1);
    expect(dong[0]).toContain('background:var(--color-accent)');
    expect(dong[0], 'không được là tint').not.toMatch(/accent-[12]00/);
    expect(dong[0], 'không được mượn màu semantic').not.toMatch(/var\(--pass|var\(--fail|var\(--medium/);
  });

  it('T3.3 chín mục hiện đủ trong HTML, mỗi mục có số, tiêu đề và dòng «thấy ở:»', () => {
    for (const n of PRINCIPLES) {
      expect(HTML, `thiếu số ${n.so}`).toContain(`<div class="nt-so">${n.so}</div>`);
      expect(HTML, `thiếu tiêu đề ${n.so}`).toContain(n.tieuDe);
      expect(HTML, `thiếu liên kết ${n.so}`).toContain(`href="${n.thayO.duong}"`);
    }
    expect((HTML.match(/thấy ở:/g) ?? []).length).toBe(9);
  });

  it('T3.4 khối nguyên tắc giới hạn 900px', () => {
    const src = readFileSync('apps/web/src/ui-docs.ts', 'utf8');
    expect(src).toContain('max-width:900px');
  });

  it('T3.5 bài giải thích mười mục CÒN NGUYÊN — change không xoá nội dung viết tay', () => {
    for (const id of ['triet-ly', 'verdict', 'cham-code', 'doi-chung', 'luoi-may', 'cham-tai-lieu', 'cong-merge', 'thu-vien', 'truc-va-agent', 'gioi-han']) {
      expect(HTML, `mất mục ${id}`).toContain(`id="${id}"`);
    }
  });

  it('T4.1 nội dung đi qua thoát HTML', () => {
    const src = readFileSync('apps/web/src/ui-docs.ts', 'utf8');
    expect(src).toContain('escHtml(n.tieuDe)');
    expect(src).toContain('escHtml(PRINCIPLES_POSTER)');
  });
});
