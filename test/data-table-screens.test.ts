import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { artifactCell } from '../apps/web/src/ui.js';
import { computeProfile } from '../apps/web/src/trust.js';
import { filterRuns, historyPage } from '../apps/web/src/ui-history.js';
import { ledgerPage, LOOSE_DOC_FILTER } from '../apps/web/src/ui-ledger.js';
import { trustPage } from '../apps/web/src/ui-trust.js';
import type { RunMeta } from '../apps/web/src/runs.js';
import type { VerdictLedgerEntry } from '../apps/web/src/ledger.js';

/**
 * Lưới cho `data-table-screens-ccs`.
 *
 * Ba màn này CHỈ ĐỌC, nên hỏng của chúng không phải mất dữ liệu mà là **nói sai**. Bốn đường nói sai
 * độc lập nhau, và mỗi đường có ca riêng: sai trục sắp xếp · tổng tính trên tập khác tập đang hiện ·
 * phân trang cắt mất hàng · định danh artifact hiện nhầm hàng nào là hàng nào.
 */

const sc = (p: Partial<VerdictLedgerEntry>): VerdictLedgerEntry =>
  ({
    run_id: 'r',
    luc: '2026-09-01T01:00:00.000Z',
    skill: 'code',
    artifact: 'PR #1 · Sửa gì đó',
    sha: 'abc1234def',
    verdict: 'PASS',
    high: 0,
    medium: 0,
    low: 0,
    repo: 'o/r',
    pr: 1,
    tac_gia: 'a',
    ...p,
  }) as VerdictLedgerEntry;

// ── artifactCell ──────────────────────────────────────────────────────────────

describe('artifactCell — MỘT khuôn định danh cho cả ba bảng', () => {
  it('T1.1 có repo + PR + SHA → dòng phụ đủ ba, SHA cắt 7 ký tự', () => {
    const h = artifactCell({ ten: 'Lọc trạng thái', duong: '/runs/x', repo: 'o/r', pr: 7, sha: 'abcdef1234567890' });
    expect(h).toContain('<b>Lọc trạng thái</b>');
    expect(h).toContain('o/r#7');
    expect(h).toContain('@ abcdef1');
    expect(h, 'SHA phải cắt, không in cả chuỗi').not.toContain('abcdef1234567890');
  });

  it('T1.2 tài liệu rời — không PR thì KHÔNG bịa số nào', () => {
    const h = artifactCell({ ten: 'Đặc tả phê duyệt.docx', sha: 'sha256:aa11bb22' });
    expect(h).toContain('Đặc tả phê duyệt.docx');
    expect(h, 'không được sinh dấu #').not.toContain('#');
    expect(h, 'hash tài liệu giữ nguyên tiền tố, không cắt như SHA git').toContain('sha256:aa11bb22');
  });

  it('T1.3 thiếu trường → không ném, không in ô rỗng gây hiểu nhầm', () => {
    for (const a of [{ ten: 'x' }, { ten: 'x', repo: 'o/r' }, { ten: 'x', sha: 'abc1234' }, {} as never]) {
      expect(() => artifactCell(a)).not.toThrow();
    }
    // Thiếu cả hai mảnh phụ ⇒ KHÔNG có dòng phụ. Một dấu gạch ngang ở chỗ định danh trông giống một
    // giá trị chứ không giống một chỗ trống.
    expect(artifactCell({ ten: 'x' })).not.toContain('class="mono"');
  });

  it('T1.4 ĐỐI KHÁNG: tên artifact là dữ liệu ngoài — phải thoát HTML', () => {
    // Tiêu đề pull request do NGƯỜI NGOÀI repo đặt được. Đây là bề mặt dựng HTML dùng chung cho ba
    // màn, nên một lỗ thoát ở đây rò ra cả ba cùng lúc.
    const h = artifactCell({ ten: '<script>alert(1)</script>', repo: '<img onerror=x>', sha: 'abc1234' });
    expect(h).not.toContain('<script>');
    expect(h).not.toContain('<img');
    expect(h).toContain('&lt;script&gt;');
  });
});

// ── Tin cậy: trục sắp xếp ─────────────────────────────────────────────────────

describe('computeProfile — trục sắp xếp là TỈ LỆ PASS', () => {
  it('T2.1 20 verdict 50% đứng SAU 4 verdict 100%', () => {
    const soCai = [
      ...Array.from({ length: 10 }, (_, i) => sc({ tac_gia: 'nhieu', pr: i + 1, verdict: 'PASS' })),
      ...Array.from({ length: 10 }, (_, i) => sc({ tac_gia: 'nhieu', pr: i + 100, verdict: 'FAIL' })),
      ...Array.from({ length: 4 }, (_, i) => sc({ tac_gia: 'it', pr: i + 200, verdict: 'PASS' })),
    ];
    const hs = computeProfile(soCai);
    expect(hs.map((h) => h.tacGia), 'người tỉ lệ cao đứng trước, dù ít verdict hơn').toEqual(['it', 'nhieu']);
    expect(hs[0]!.tiLePass).toBe(1);
    expect(hs[1]!.tiLePass).toBe(0.5);
  });

  it('T2.2 0 verdict → tỉ lệ 0, không NaN và không 100%', () => {
    // Đầu vào không sinh được tác giả 0 verdict qua `computeProfile`, nên khoá bằng biểu thức: chia
    // cho 0 phải nghiêng về 0. Nghiêng nhầm chiều đưa người KHÔNG có dữ liệu lên đầu bảng «đáng tin
    // nhất» — bịa ra một kết luận từ chỗ trống.
    const src = readFileSync('apps/web/src/trust.ts', 'utf8');
    expect(src).toContain('sx.length ? pass / sx.length : 0');
    expect(Number.isNaN(0 / 0), 'đây là thứ ta đang tránh').toBe(true);
  });

  it('T2.3 mẫu số là SỐ VERDICT, không phải số PR', () => {
    // Một pull request chấm 3 lần: 2 PASS 1 FAIL → 2/3, không phải 1/1.
    const hs = computeProfile([
      sc({ tac_gia: 'a', pr: 5, verdict: 'PASS', luc: '2026-09-01T01:00:00.000Z' }),
      sc({ tac_gia: 'a', pr: 5, verdict: 'FAIL', luc: '2026-09-01T02:00:00.000Z' }),
      sc({ tac_gia: 'a', pr: 5, verdict: 'PASS', luc: '2026-09-01T03:00:00.000Z' }),
    ]);
    expect(hs[0]!.soPr).toBe(1);
    expect(hs[0]!.soVerdict).toBe(3);
    expect(hs[0]!.tiLePass).toBeCloseTo(2 / 3, 6);
  });

  it('T2.4 cùng tỉ lệ → khoá phụ quyết, và thứ tự XÁC ĐỊNH giữa hai lần gọi', () => {
    const soCai = [
      sc({ tac_gia: 'zeta', pr: 1, verdict: 'PASS' }),
      sc({ tac_gia: 'alpha', pr: 2, verdict: 'PASS' }),
      sc({ tac_gia: 'beta', pr: 3, verdict: 'PASS' }),
      sc({ tac_gia: 'beta', pr: 4, verdict: 'PASS' }),
    ];
    const a = computeProfile(soCai).map((h) => h.tacGia);
    const b = computeProfile([...soCai].reverse()).map((h) => h.tacGia);
    expect(a, 'nhiều bằng chứng hơn đứng trước, rồi tới tên').toEqual(['beta', 'alpha', 'zeta']);
    expect(b, 'đảo thứ tự đầu vào KHÔNG đổi thứ tự đầu ra').toEqual(a);
  });

  it('T2.5 tỉ lệ PASS hiện thành CỘT — sắp theo con số không có trong bảng thì không ai kiểm được', () => {
    const html = trustPage(computeProfile([sc({ tac_gia: 'a', verdict: 'PASS' })]), [], undefined, 'x');
    expect(html).toContain('Tỉ lệ PASS');
    expect(html).toContain('100%');
  });
});

// ── Lịch sử: lọc ngày + phân trang ────────────────────────────────────────────

const run = (p: Partial<RunMeta>): RunMeta =>
  ({ id: 'r', tieuDe: 'PR', skill: 'code', trangThai: 'xong', batDau: '2026-09-05T01:00:00.000Z', ...p }) as RunMeta;

describe('Lịch sử — bộ lọc ngày là một KHOẢNG', () => {
  const ds = [
    run({ id: 'a', batDau: '2026-09-01T10:00:00.000Z' }),
    run({ id: 'b', batDau: '2026-09-05T10:00:00.000Z' }),
    run({ id: 'c', batDau: '2026-09-09T10:00:00.000Z' }),
  ];
  const ids = (loc: Parameters<typeof filterRuns>[1]) => filterRuns(ds, loc).map((r) => r.id);

  it('T3.1 trong khoảng · ngoài khoảng · ĐÚNG BIÊN hai đầu đều tính', () => {
    expect(ids({ tu: '2026-09-02', den: '2026-09-08', trang: 1 })).toEqual(['b']);
    expect(ids({ tu: '2026-09-01', den: '2026-09-09', trang: 1 })).toEqual(['a', 'b', 'c']);
    expect(ids({ tu: '2026-09-10', den: '2026-09-20', trang: 1 })).toEqual([]);
  });

  it('T3.2 chỉ có một vế thì lọc một phía', () => {
    expect(ids({ tu: '2026-09-05', trang: 1 })).toEqual(['b', 'c']);
    expect(ids({ den: '2026-09-05', trang: 1 })).toEqual(['a', 'b']);
  });

  it('T3.3 khoảng ĐẢO NGƯỢC → tập rỗng, không ném', () => {
    expect(() => ids({ tu: '2026-09-09', den: '2026-09-01', trang: 1 })).not.toThrow();
    expect(ids({ tu: '2026-09-09', den: '2026-09-01', trang: 1 })).toEqual([]);
  });

  it('T3.4 chuỗi ngày rác không làm sập, và không lọc bừa', () => {
    expect(() => ids({ tu: 'hom qua', trang: 1 })).not.toThrow();
    expect(ids({ trang: 1 }), 'không lọc thì còn nguyên').toHaveLength(3);
  });
});

describe('Lịch sử — phân trang 8', () => {
  const nhieu = Array.from({ length: 9 }, (_, i) =>
    run({ id: `r${i}`, tieuDe: `PR #${i}`, batDau: `2026-09-0${(i % 9) + 1}T01:00:00.000Z` }),
  );

  it('T5.1/T6.2 đúng 8 hàng → một trang; 9 hàng → hai trang', () => {
    expect(historyPage(nhieu.slice(0, 8), { trang: 1 }, []), '8 hàng thì không có thanh phân trang').not.toContain('trang sau');
    expect(historyPage(nhieu, { trang: 1 }, []), '9 hàng thì có').toContain('trang 1 / 2');
  });

  it('hằng phân trang đúng 8 — gói design chốt con số này cho cả code', () => {
    expect(readFileSync('apps/web/src/ui-history.ts', 'utf8')).toContain('const MOI_TRANG = 8;');
  });

  it('T5.3 bộ lọc đủ SÁU: repo · verdict · skill · nhà cung cấp · ngày · tìm chữ', () => {
    const html = historyPage(nhieu, { trang: 1 }, ['o/r']);
    for (const ten of ['name="repo"', 'name="verdict"', 'name="skill"', 'name="ncc"', 'name="tu"', 'name="den"', 'name="q"']) {
      expect(html, `thiếu bộ lọc ${ten}`).toContain(ten);
    }
  });
});

// ── Sổ cái: dòng tổng ─────────────────────────────────────────────────────────

describe('Sổ cái — dòng tổng tính trên phần ĐÃ LỌC và đứng TRƯỚC bảng', () => {
  const muc = [
    sc({ run_id: '1', repo: 'o/a', verdict: 'PASS', high: 0, medium: 1, low: 0, token_vao: 1000, token_ra: 500 }),
    sc({ run_id: '2', repo: 'o/a', verdict: 'FAIL', high: 2, medium: 0, low: 1, token_vao: 3000, token_ra: 700 }),
    // `o/b` PHẢI có high/medium riêng: nếu mọi đại lượng đếm được của hai tập bằng nhau thì ca «tính trên
    // phần đã lọc» không phân biệt được với «tính trên toàn bộ» — đột biến 7.4 đã sống sót đúng vì chỗ này.
    sc({ run_id: '3', repo: 'o/b', verdict: 'PASS', high: 5, medium: 3, low: 2, token_vao: 9000, token_ra: 9000 }),
    sc({ run_id: '4', repo: '', pr: 0, artifact: 'Tài liệu rời.docx', sha: 'sha256:zz', verdict: 'PASS' }),
  ];
  const tong = (html: string): string => html.slice(html.indexOf('verdict</span>') - 400, html.indexOf('<table'));

  it('T4.1 lọc theo một repo → mọi con số đổi theo', () => {
    const t = tong(ledgerPage(muc, new Map(), ['o/a', 'o/b'], 'o/a'));
    expect(t).toContain('>2</b> verdict');
    expect(t).toContain('>1</b> PASS');
    expect(t).toContain('>1</b> FAIL');
    expect(t, 'tổng H·M·L của riêng o/a').toContain('>2</b>H');
    expect(t, 'không được rơi về tổng của toàn bộ (7H)').not.toContain('>7</b>H');
    expect(t, 'medium của riêng o/a').toContain('>1</b>M');
  });

  it('T4.2 lọc ra tập RỖNG → các số 0, không ẩn và không hiện số của tập chưa lọc', () => {
    const t = tong(ledgerPage(muc, new Map(), ['o/a', 'o/b'], 'khong/co'));
    expect(t).toContain('>0</b> verdict');
    expect(t, 'không được rơi về tổng của tập chưa lọc').not.toContain('>4</b> verdict');
  });

  it('T4.3 không lọc → tính trên toàn bộ', () => {
    expect(tong(ledgerPage(muc, new Map(), ['o/a', 'o/b']))).toContain('>4</b> verdict');
  });

  it('T4.4 dòng tổng có đủ năm mục', () => {
    const t = tong(ledgerPage(muc, new Map(), ['o/a']));
    for (const m of ['verdict', 'PASS', 'FAIL', 'H · ', 'token']) expect(t, `thiếu mục ${m}`).toContain(m);
  });

  it('T4.5 dòng tổng đứng TRƯỚC bảng', () => {
    // Dòng tổng là CÂU TRẢ LỜI, bảng là CHỨNG CỨ. Đặt câu trả lời sau chứng cứ thì người đọc phải cuộn
    // hết bảng mới biết mình đang xem cái gì — mà bảng dài dần theo thời gian.
    const html = ledgerPage(muc, new Map(), ['o/a']);
    expect(html.indexOf('verdict</span>')).toBeLessThan(html.indexOf('<table'));
  });

  it('T5.4 lọc «tài liệu rời» là lựa chọn RIÊNG, không phải một tên repo', () => {
    const html = ledgerPage(muc, new Map(), ['o/a', 'o/b'], LOOSE_DOC_FILTER);
    expect(html).toContain('tài liệu rời');
    expect(tong(html), 'chỉ còn hàng không có repo').toContain('>1</b> verdict');
  });
});

// ── Khuôn dùng chung thật sự dùng chung ───────────────────────────────────────

describe('T5.2 ba bảng dùng CHUNG khuôn định danh, không bảng nào tự dựng riêng', () => {
  it('cả ba file đều gọi artifactCell', () => {
    for (const f of ['ui-history.ts', 'ui-ledger.ts', 'ui-trust.ts']) {
      expect(readFileSync(`apps/web/src/${f}`, 'utf8'), `${f} chưa dùng khuôn chung`).toContain('artifactCell(');
    }
  });

  it('không bảng nào còn cột Repo hay Commit riêng', () => {
    for (const f of ['ui-history.ts', 'ui-ledger.ts', 'ui-trust.ts']) {
      const src = readFileSync(`apps/web/src/${f}`, 'utf8');
      expect(src, `${f} còn cột Repo riêng`).not.toContain('<th>Repo</th>');
      expect(src, `${f} còn cột Commit riêng`).not.toContain('<th>Commit</th>');
    }
  });
});

describe('T6.1 đầu vào KHUYẾT ở mọi tầng — không hàm nào ném', () => {
  it('sổ cái rỗng · thiếu tác giả · thiếu token', () => {
    expect(() => ledgerPage([], new Map(), [])).not.toThrow();
    expect(() => computeProfile([])).not.toThrow();
    expect(() => trustPage([], [], undefined, '')).not.toThrow();
    expect(() =>
      ledgerPage([sc({ tac_gia: undefined, token_vao: undefined, token_ra: undefined })], new Map(), []),
    ).not.toThrow();
    expect(() => historyPage([], { trang: 1 }, [])).not.toThrow();
  });
});
