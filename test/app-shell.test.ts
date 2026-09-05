import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { NAV_ITEMS, shell, homePage, settingsPage, runPage, type SettingsView } from '../apps/web/src/ui.js';
import { historyPage } from '../apps/web/src/ui-history.js';
import { ledgerPage } from '../apps/web/src/ui-ledger.js';
import { trustPage } from '../apps/web/src/ui-trust.js';
import { docsPage } from '../apps/web/src/ui-docs.js';
import { probesPage } from '../apps/web/src/ui-probes.js';
import type { RunMeta } from '../apps/web/src/runs.js';

/**
 * Lưới vỏ — canh ba thứ mà `tsc` không nhìn thấy:
 *   1. mọi trang đi qua MỘT hàm vỏ, không trang nào tự dựng thẻ html/body
 *   2. sidebar khai đủ mục, và mục đang xem được đánh dấu đúng
 *   3. chuyển cảnh là lớp trang trí THOÁI HOÁ SẠCH, không phải đường sống của điều hướng
 *
 * Vì sao lưới 1 tồn tại: vỏ dùng chung là điều kiện để «làm đến đâu cập nhật đến đó». Trang nào tự
 * dựng vỏ riêng thì nó rơi lại phía sau trong im lặng — đổi vỏ, sáu trang mới, một trang cũ, và
 * không có lỗi nào nổ ra để ai đó biết.
 */

const THU_MUC_UI = 'apps/web/src';

/**
 * Ngoại lệ DUY NHẤT, khai tường minh: màn đăng nhập không có header và sidebar, vì người chưa đăng
 * nhập thì chưa có repo để điều hướng. Nó vẫn dùng CHUNG hằng CSS, nên palette không thể trôi.
 * Danh sách này có đúng một tên; thêm tên thứ hai là phải giải trình.
 */
const NGOAI_LE_TU_DUNG_VO = new Set(['ui-login.ts']);

describe('lưới vỏ — mọi trang đi qua một hàm vỏ', () => {
  it('không trang nào tự dựng thẻ html/body ngoài vỏ chung', () => {
    const pham: string[] = [];
    for (const ten of readdirSync(THU_MUC_UI).filter((t) => /^ui.*\.ts$/.test(t))) {
      if (ten === 'ui.ts' || NGOAI_LE_TU_DUNG_VO.has(ten)) continue;
      const src = readFileSync(join(THU_MUC_UI, ten), 'utf8');
      if (/<!doctype html|<html\b|<body\b/i.test(src)) pham.push(ten);
    }
    expect(pham, `Trang tự dựng vỏ riêng — sẽ rơi lại khi vỏ đổi:\n${pham.join('\n')}`).toEqual([]);
  });

  it('vỏ chung không có đường nào chạm tới bí mật (⛔C3)', () => {
    // Vỏ mới bày thêm dữ liệu: tên repo, chế độ trực, tên người đăng nhập. Không thứ nào là bí mật —
    // và lưới này giữ cho nó ở nguyên như vậy. Nếu mai ai đó muốn hiện «token đã đặt chưa» ngay trên
    // header, họ sẽ phải sửa lưới, tức phải nghĩ trước một nhịp thay vì tiện tay gọi hàm đọc kho.
    const src = readFileSync(join(THU_MUC_UI, 'ui.ts'), 'utf8');
    const than = /export function shell\([\s\S]*?\n\}/.exec(src)?.[0] ?? '';
    expect(than.length, 'không tách được thân hàm shell').toBeGreaterThan(500);
    for (const cam of ['readRepoToken', 'readOwnToken', 'readVault', 'readSubscriptionToken', 'hasToken']) {
      expect(than, `vỏ chung gọi ${cam} — đó là đường tới bí mật`).not.toContain(cam);
    }
    // Và vỏ dựng ra không được mang hình dạng của một token GitHub
    expect(shell('t', '<p>x</p>', '', { nguoi: 'ai-do' })).not.toMatch(/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_/);
  });

  it('ngoại lệ đăng nhập vẫn dùng chung hằng CSS, không tự khai bảng màu', () => {
    const src = readFileSync(join(THU_MUC_UI, 'ui-login.ts'), 'utf8');
    expect(src, 'màn đăng nhập phải nhập hằng CSS chung').toMatch(/import \{[^}]*\bCSS\b[^}]*\} from '\.\/ui\.js'/);
    expect(src.includes('--color-bg:'), 'màn đăng nhập tự khai lại token — hai bảng màu song song').toBe(false);
  });
});

describe('lưới sidebar', () => {
  it('khai đủ bảy mục điều hướng của gói design', () => {
    // Bảy, không phải tám: gói khai 8 ROUTE nhưng «run» không có mục sidebar — vào một lượt chấm là
    // từ Dashboard hoặc Lịch sử, không từ điều hướng.
    expect(NAV_ITEMS.map((n) => n.nhan)).toEqual([
      'Dashboard',
      'Lịch sử chạy',
      'Sổ cái',
      'Thư viện probe',
      'Tin cậy',
      'Cấu hình',
      'Nguyên tắc',
    ]);
  });

  it('mọi mục đều hiện ra trong HTML vỏ dựng', () => {
    const html = shell('t', '<p>x</p>');
    for (const n of NAV_ITEMS) {
      expect(html, `sidebar thiếu mục ${n.nhan}`).toContain(`href="${n.duong}"`);
      expect(html).toContain(n.nhan);
    }
  });

  it('đúng một mục được đánh dấu đang-chọn, và là mục được yêu cầu', () => {
    for (const n of NAV_ITEMS) {
      const html = shell('t', '<p>x</p>', '', { muc: n.key });
      const danhDau = [...html.matchAll(/<a href="([^"]+)" class="on" aria-current="page">/g)];
      expect(danhDau.length, `mục ${n.nhan}: phải đánh dấu đúng MỘT mục`).toBe(1);
      expect(danhDau[0]![1], `mục ${n.nhan}: đánh dấu nhầm chỗ`).toBe(n.duong);
    }
  });

  it('không yêu cầu mục nào thì không mục nào bị đánh dấu — không đoán bừa', () => {
    expect(shell('t', '<p>x</p>')).not.toContain('aria-current="page"');
  });

  it('chân sidebar nói chế độ và phiên bản', () => {
    expect(shell('t', '<p>x</p>')).toMatch(/chế độ (org|demo) · v/);
  });
});

describe('lưới chuyển cảnh — trang trí, không phải đường sống', () => {
  it('không thêm gói phụ thuộc nào cho việc chuyển cảnh', () => {
    // Lưới chống «thêm framework cho tiện» — điều dễ xảy ra nhất ở đợt sau, khi ai đó muốn thêm một
    // hiệu ứng nữa và thấy cài một thư viện là nhanh hơn.
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const cam = ['barba', 'swup', 'turbo', 'htmx', 'unpoly', 'pjax', 'astro', 'next', 'react', 'vue'];
    const co = Object.keys(pkg.dependencies ?? {}).filter((d) => cam.some((c) => d.includes(c)));
    expect(co, `Chuyển cảnh phải là API sẵn có của trình duyệt, không phải thư viện: ${co}`).toEqual([]);
  });

  it('vỏ phát đủ hai khai báo tĩnh', () => {
    const html = shell('t', '<p>x</p>');
    expect(html, 'thiếu @view-transition').toContain('@view-transition');
    expect(html, 'thiếu speculation rules').toContain('<script type="speculationrules">');
  });

  it('prerender chỉ nhắm link trong sidebar — cùng origin, toàn GET', () => {
    // Prerender là lời gọi HTTP thật kèm cookie phiên. Nới ra `/*` là prerender cả những đường
    // không thuộc điều hướng; nhắm đúng `.app-nav a` giữ nó trong bảy đường GET đã biết.
    const rule = /<script type="speculationrules">(.+?)<\/script>/s.exec(shell('t', '<p>x</p>'))?.[1] ?? '';
    const doc = JSON.parse(rule) as { prerender: { where: { selector_matches: string }; eagerness: string }[] };
    expect(doc.prerender[0]!.where.selector_matches).toBe('.app-nav a');
    expect(doc.prerender[0]!.eagerness, 'immediate sẽ tải trước cả bảy trang ngay khi mở').toBe('moderate');
    expect(rule, 'không được prerender đường API').not.toContain('/api');
  });

  it('thoái hoá sạch: bỏ hai khai báo ra thì nội dung và mọi link vẫn nguyên', () => {
    const html = shell('t', '<p>nội dung thật</p>', '', { muc: 'dashboard' });
    const khongHoTro = html
      .replace(/<script type="speculationrules">.*?<\/script>/s, '')
      .replace(/@view-transition\s*\{[^}]*\}/g, '')
      .replace(/view-transition-name:[^;]+;/g, '');
    expect(khongHoTro).toContain('nội dung thật');
    for (const n of NAV_ITEMS) expect(khongHoTro, `mất link ${n.nhan}`).toContain(`href="${n.duong}"`);
    expect(khongHoTro).toContain('aria-current="page"');
  });
});

describe('mọi trang thật render được qua vỏ mới', () => {
  const run: RunMeta = {
    id: 'r1',
    tieuDe: 'PR #1',
    skill: 'code',
    trangThai: 'xong',
    batDau: '2026-09-01T00:00:00.000Z',
  };
  const cauHinh: SettingsView = {
    mode: 'org',
    repoGithub: 'a/b',
    baseBranch: 'main',
    localPath: '/tmp/b',
    tokenChe: 'ghp_••••',
    khoiNccHtml: '',
    khoiRepoHtml: '',
    maxProbe: 10,
    skeptic: false,
    trucBat: false,
    trucChuKy: 300,
    trucComment: true,
    trucTrangThai: true,
    trucTraVe: false,
  };

  const trang: [string, () => string][] = [
    ['dashboard', () => homePage([run])],
    ['run', () => runPage(run, false)],
    ['lịch sử', () => historyPage([run], {} as Parameters<typeof historyPage>[1], ['a/b'])],
    ['sổ cái', () => ledgerPage([], new Map(), ['a/b'])],
    ['tin cậy', () => trustPage([], ['a/b'])],
    ['cấu hình', () => settingsPage(cauHinh)],
    ['nguyên tắc', () => docsPage()],
    [
      'hàng đợi giao',
      () => probesPage({ repoFull: 'a/one', queue: [], soLuot: 3 }),
    ],
  ];

  for (const [ten, dung] of trang) {
    it(`${ten} — dựng được, và nhận đúng vỏ chung`, () => {
      let html = '';
      expect(() => (html = dung()), `trang ${ten} ném lỗi khi dựng`).not.toThrow();
      expect(html, `trang ${ten} không đi qua vỏ chung`).toContain('<nav class="app-nav">');
      expect(html, `trang ${ten} thiếu header vỏ`).toContain('class="nav app-hd"');
      expect(html.startsWith('<!doctype html>'), `trang ${ten} không phải tài liệu đầy đủ`).toBe(true);
    });
  }
});

/**
 * Lưới «class dùng thì phải có định nghĩa».
 *
 * Án lệ đắt: trong chính change này, hai lần CSS bị hụt mà không gì kêu.
 *   1. chép gói design nhưng SÓT khối `.nav` — header khai `class="nav app-hd"` nên nó mất luôn
 *      `display:flex` và rule 2px, cả header xếp chồng thành ba dòng;
 *   2. một lần splice theo số dòng cắt nhầm `.sub` `.goiy` `.grid` `.wrap` — 29 chỗ trong bảy trang
 *      dùng chúng, không chỗ nào báo lỗi.
 *
 * `tsc` không thấy: chuỗi nào cũng là chuỗi. Lưới token cũng không thấy: nó soi màu và bo góc, không
 * soi việc một tên class có tồn tại hay không. Lưới này lấp đúng khe đó — nó so tên class trong
 * markup với tên class có rule trong hằng CSS.
 */
describe('lưới CSS — class dùng trong markup phải có định nghĩa', () => {
  it('không class nào bị dùng mà không có rule ở đâu cả', () => {
    // Bể rule = hằng CSS dùng chung CỘNG mọi khối style cục bộ của các trang (màn đăng nhập, docs,
    // nhà cung cấp, repo đều có style riêng và đó là hợp lệ). Lưới không phán được chuyện «định
    // nghĩa nhầm ở trang khác»; nó nhắm đúng lỗi đắt hơn nhiều: class không được định nghĩa ở BẤT
    // KỲ ĐÂU, tức nó nằm trong markup mà không có tác dụng gì và chẳng ai biết.
    const files = readdirSync(THU_MUC_UI).filter((t) => /^ui.*\.ts$/.test(t));
    const nguon = files.map((t) => readFileSync(join(THU_MUC_UI, t), 'utf8'));

    const coRule = new Set<string>();
    for (const src of nguon) {
      for (const m of src.matchAll(/\.([a-zA-Z][\w-]*)(?=[\s,.:[>+~{])/g)) coRule.add(m[1]!);
      // Class chỉ làm móc cho JS (querySelectorAll('.nut-kiem')) vẫn là class CÓ tác dụng —
      // nó không cần rule CSS nào. Lưới chỉ săn class không làm gì ở đâu cả.
      for (const m of src.matchAll(/(?:querySelector(?:All)?|closest)\(\s*'\.([a-zA-Z][\w-]*)/g)) {
        coRule.add(m[1]!);
      }
    }

    const dung = new Map<string, string>();
    files.forEach((ten, i) => {
      for (const m of nguon[i]!.matchAll(/class="([^"]*)"/g)) {
        const gia = m[1]!;
        if (gia.includes('${')) continue; // tên ghép động — lưới này không phán được
        for (const c of gia.split(/\s+/).filter(Boolean)) if (!dung.has(c)) dung.set(c, ten);
      }
    });

    const thieu = [...dung].filter(([c]) => !coRule.has(c)).map(([c, f]) => `${c}  (dùng ở ${f})`);
    expect(thieu, `Class dùng mà không có rule ở đâu cả:\n${thieu.join('\n')}`).toEqual([]);
  });
});
