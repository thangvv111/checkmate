import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProbePlan } from '../packages/harness/src/skill-code.js';
import { detectLoadFailures } from '../packages/harness/src/sandbox.js';
import { evaluatePurgeRequest } from '../apps/web/src/probe-gate.js';

/**
 * Lưới cho capability `probe-quarantine`.
 *
 * Change này dạy hệ thống một phản xạ mới — **«gặp trở ngại thì bỏ bớt phép thử rồi đi tiếp»**. Phản xạ
 * ấy đúng cho ca đang sửa (probe thư viện mục làm chết cả lượt chấm) và nguy hiểm nếu bị nới ra. Nên hai
 * điều kiện hẹp giữ ranh giới, và cả hai đều có ca ở đây:
 *
 *   1. **Chỉ LỖI NẠP** — không phải fail, không phải treo, không phải flaky (PO chốt 05/09).
 *   2. **Chỉ khi hỏng trên NHÁNH GỐC** — hỏng riêng trên nhánh PR là bằng chứng VỀ PR.
 *
 * Vế 2 là vế nguy hiểm nhất: cách ly nhầm ở đó nghĩa là lấy một finding thật rồi biến nó thành một dòng
 * bảo trì — XANH GIẢ, hướng hỏng tệ nhất của một cổng chấm.
 */

// Gốc thư viện RIÊNG, đặt TRƯỚC khi nạp module — `GOC_LIB`/`TRAN_PROBE` đọc env lúc nạp, nên import tĩnh
// sẽ chạy trước mọi `beforeEach` và ca test ghi thẳng vào thư viện thật của máy dev.
const goc = mkdtempSync(join(tmpdir(), 'checkmate-pq-'));
process.env.CHECKER_LIB_DIR = goc;
process.env.CHECKER_LIB_TRAN = '6';
const tv = await import('../packages/harness/src/probe-library.js');

const SLUG = 'repo-cl';
const NL = String.fromCharCode(10);
const SANDBOX = readFileSync('packages/harness/src/sandbox.ts', 'utf8');
const SKILL = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
const SERVER = readFileSync('apps/web/src/server.ts', 'utf8');
const LIB = readFileSync('packages/harness/src/probe-library.ts', 'utf8');

const plan = (id: string, rule = 'R1'): ProbePlan => ({ id, ten: `thử ${id}`, muc_dich: 'm', spec_rule: rule, ky_vong: 'k' });
const codeProbe = (id: string, ruot = '1'): string =>
  `import { it, expect } from 'vitest';${NL}${NL}it('${id}: thử', () => {${NL}  expect(${ruot}).toBe(${ruot});${NL}});${NL}`;
const nap = (id: string, ruot: string, sha: string) => tv.admitToLibrary(SLUG, codeProbe(id, ruot), plan(id), sha);

// GÁC: gốc riêng không ăn thì mọi ca dưới đây ghi vào thư viện THẬT. Đã xảy ra một lần trong repo này
// (năm hàng giả lọt vào sổ cái của máy dev), nên nó là một CA chứ không phải một giả định.
it('gác — thư viện của lưới này nằm trong gốc riêng, không phải probes-lib/ thật', () => {
  tv.recordRemoval(SLUG, { luc: 'x', loai: 'dao_thai', go: 'g', ly_do: 'l' });
  expect(readFileSync(join(goc, SLUG, 'removals.jsonl'), 'utf8')).toContain('"go":"g"');
  rmSync(join(goc, SLUG), { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(join(goc, SLUG), { recursive: true, force: true });
});
afterAll(() => {
  rmSync(goc, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hàm quét — tầng 3, mỗi hàm một CẶP fixture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Danh sách ĐÓNG (PO chốt 05/09): chỉ lỗi NẠP kích hoạt cách ly.
 *
 * Quét khối `chayCaHaiNhanh` và đòi hai điều: đường `treo` thoát ra TRƯỚC mọi phép cách ly, và không
 * nhánh nào dựng ứng viên cách ly từ `treo` · `status: failed` · `flaky_diem`.
 *
 * Vì sao cần lưới chứ không chỉ một câu trong tài liệu: mỗi lần nới thêm một nguyên nhân đều có vẻ hợp lý
 * một mình — bỏ probe chạy lâu cho nhanh, bỏ probe flaky cho đỡ nhiễu — và điểm đến là một cổng chỉ chạy
 * những phép thử dễ. Ranh giới không giữ được bằng thiện chí.
 */
export function scanQuarantineTriggers(src: string): string[] {
  const loi: string[] = [];
  const dau = src.indexOf('const chayCaHaiNhanh');
  if (dau < 0) return ['không tìm thấy vòng chạy hai nhánh — phép quét này đang mù'];
  const het = src.indexOf('const findingTreo', dau);
  const than = src.slice(dau, het > 0 ? het : dau + 4000);

  const iTreo = than.indexOf('.treo)');
  const iCachLy = than.indexOf('chooseQuarantineTargets');
  if (iTreo < 0) loi.push('không còn nhánh thoát cho lệnh test TREO — «chạy lâu» đang lẫn vào đường cách ly');
  if (iCachLy < 0) loi.push('không tìm thấy chỗ chọn ứng viên cách ly — phép quét này đang mù');
  if (iTreo >= 0 && iCachLy >= 0 && iTreo > iCachLy) {
    loi.push('nhánh TREO đứng SAU phép cách ly — một PR làm treo test sẽ tự gỡ được phép thử bắt nó');
  }
  for (const cam of ['treo', "'failed'", 'flaky_diem']) {
    // Chỉ soi phần DỰNG ứng viên, không soi cả khối: `treo` xuất hiện hợp lệ ở nhánh thoát phía trên.
    const doan = iCachLy >= 0 ? than.slice(iCachLy, than.indexOf('});', iCachLy) + 3) : '';
    if (doan.includes(cam)) loi.push(`ứng viên cách ly dựng từ «${cam}» — ngoài danh sách đóng`);
  }
  return loi;
}

/** Ba đường phá huỷ phải đi qua CÙNG một cửa vai; không đường nào tự kiểm lấy. */
export function scanOperatorGate(src: string): string[] {
  const loi: string[] = [];
  const duong = ['/api/probes/remove', '/api/probes/unquarantine', '/api/probes/purge'];
  for (const d of duong) {
    const i = src.indexOf(`app.post('${d}'`);
    if (i < 0) {
      loi.push(`không tìm thấy đường ${d} — phép quét này đang mù`);
      continue;
    }
    const than = src.slice(i, src.indexOf('});', i) + 3);
    if (!than.includes('openLibraryRoute(')) loi.push(`đường ${d} KHÔNG qua cửa vai chung`);
  }
  if (!/canOperate\(dt\)/.test(src)) loi.push('cửa vai không hỏi canOperate — vai tự động sẽ lọt');
  return loi;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('nhận diện LỖI NẠP — theo hình dạng, không theo lời văn (T1)', () => {
  const muc = (p: Record<string, unknown>) => ({ name: 'test/lib_a.probe.test.ts', assertionResults: [], ...p });

  it('T1.1 — mục có `message` và KHÔNG assert nào → là lỗi nạp', () => {
    const ra = detectLoadFailures([muc({ message: "Cannot find module './ncc.js'" })]);
    expect(ra).toHaveLength(1);
    expect(ra[0]!.file).toBe('lib_a.probe.test.ts');
    expect(ra[0]!.ly_do).toContain('ncc.js');
  });

  it('T1.2 — probe CHẠY ĐƯỢC mà fail → KHÔNG phải lỗi nạp', () => {
    // Lẫn hai thứ này là biến một bằng chứng về code đích thành một dòng bảo trì.
    const ra = detectLoadFailures([
      muc({ message: 'có lỗi', assertionResults: [{ title: 'P1: thử', status: 'failed', failureMessages: ['x'] }] }),
    ]);
    expect(ra).toEqual([]);
  });

  it('T1.3 [biên] — file test RỖNG (không assert, không lỗi) → không phải lỗi nạp', () => {
    expect(detectLoadFailures([muc({ message: '' })])).toEqual([]);
    expect(detectLoadFailures([muc({})])).toEqual([]);
  });

  it('T1.4 [đối kháng] — nhận diện KHÔNG dựa vào lời văn lỗi', () => {
    // Lời văn đến từ Node/vitest/repo đích: nó đổi theo phiên bản, và nó là dữ liệu ngoài (⛔C4). Một
    // repo đích in ra chuỗi giống lỗi nạp mà điều khiển được phép cách ly thì nó tự chọn được phép thử
    // nào bị gỡ khỏi lượt chấm của chính nó.
    for (const msg of ['ERR_MODULE_NOT_FOUND', 'モジュールが見つかりません', 'boom', '???']) {
      expect(detectLoadFailures([muc({ message: msg })]), msg).toHaveLength(1);
    }
    // Và chiều ngược: lời văn TRÔNG như lỗi nạp mà file vẫn thu được test → không tính.
    expect(
      detectLoadFailures([muc({ message: 'Cannot find module', assertionResults: [{ title: 'a', status: 'passed', failureMessages: [] }] })]),
    ).toEqual([]);
  });

  it('T7.2 [đầu vào KHUYẾT mọi tầng] — không ném', () => {
    for (const xau of [null, undefined, 'chuỗi', 42, [null], [{ name: 5, message: 7 }], [{}]]) {
      expect(() => detectLoadFailures(xau), JSON.stringify(xau)).not.toThrow();
    }
    expect(detectLoadFailures([{ name: 5, message: 'x' }])[0]!.file).toBe('');
  });
});

describe('quyết định cách ly — bảng ba hàng (T2)', () => {
  const l = (f: string) => ({ file: f, ly_do: 'không nạp được' });
  const THU_VIEN = ['a.ts', 'b.ts'];

  it('T2.1 ✗gốc ✗PR → CÁCH LY', () => {
    const ra = tv.chooseQuarantineTargets({ loiNapGoc: [l('a.ts')], loiNapPr: [l('a.ts')], tenThuVien: THU_VIEN });
    expect(ra.map((x) => x.file)).toEqual(['a.ts']);
  });

  it('T2.2 ✓gốc ✗PR → KHÔNG cách ly — ca quan trọng nhất của change', () => {
    // Probe nạp được trên nhánh gốc mà hỏng trên nhánh PR là bằng chứng VỀ PR. Cách ly nó là lấy một
    // finding thật rồi biến thành im lặng: XANH GIẢ, hướng hỏng nguy hiểm nhất của một cổng chấm.
    const ra = tv.chooseQuarantineTargets({ loiNapGoc: [], loiNapPr: [l('a.ts')], tenThuVien: THU_VIEN });
    expect(ra).toEqual([]);
  });

  it('T2.3 ✗gốc ✓PR → cách ly (PR sửa được, nhưng probe vẫn mục trên gốc)', () => {
    const ra = tv.chooseQuarantineTargets({ loiNapGoc: [l('b.ts')], loiNapPr: [], tenThuVien: THU_VIEN });
    expect(ra.map((x) => x.file)).toEqual(['b.ts']);
  });

  it('T2.4 [biên] — không lỗi nạp ở nhánh nào → không cách ly gì', () => {
    expect(tv.chooseQuarantineTargets({ loiNapGoc: [], loiNapPr: [], tenThuVien: THU_VIEN })).toEqual([]);
  });

  it('T2.5 — tên KHÔNG có trong thư viện thì không thành mục cách ly', () => {
    // Tên file đến từ bộ chạy test trên repo đích — dữ liệu ngoài (⛔C4). Một tên lạ không được trở
    // thành một mục cách ly.
    expect(tv.chooseQuarantineTargets({ loiNapGoc: [l('la.ts'), l('../x.ts')], tenThuVien: THU_VIEN })).toEqual([]);
  });

  it('T2.6 — tên đã bỏ qua ở vòng trước không lặp lại; trùng tên chỉ tính một lần', () => {
    expect(tv.chooseQuarantineTargets({ loiNapGoc: [l('a.ts')], tenThuVien: THU_VIEN, daBoQua: ['a.ts'] })).toEqual([]);
    expect(tv.chooseQuarantineTargets({ loiNapGoc: [l('a.ts'), l('a.ts')], tenThuVien: THU_VIEN })).toHaveLength(1);
  });

  it('T2.7 [đầu vào khuyết] — null · phần tử rác → không ném, không cách ly nhầm', () => {
    for (const goc2 of [null, undefined, [], [null], [{ file: 5 }]]) {
      expect(() => tv.chooseQuarantineTargets({ loiNapGoc: goc2 as never, tenThuVien: THU_VIEN })).not.toThrow();
      expect(tv.chooseQuarantineTargets({ loiNapGoc: goc2 as never, tenThuVien: THU_VIEN })).toEqual([]);
    }
  });
});

describe('danh sách ĐÓNG — chỉ lỗi NẠP kích hoạt cách ly (T1.6 · T1.7)', () => {
  it('T1.7 — mã nguồn hiện tại: treo thoát TRƯỚC, và ứng viên không dựng từ treo/fail/flaky', () => {
    expect(scanQuarantineTriggers(SKILL)).toEqual([]);
  });

  it('T1.7 [fixture đối kháng] — nhánh TREO đặt SAU phép cách ly thì lưới ĐỎ', () => {
    // Chiều dễ trượt nhất: «treo» cũng làm lượt chấm không chạy được, nên nó trông như cùng một ca.
    const xau = [
      'const chayCaHaiNhanh = (codeMoi) => {',
      '  const ungVien = chooseQuarantineTargets({ loiNapGoc: bs.loiNap });',
      '  if (br.treo) return {};',
      '};',
      'const findingTreo = () => ({});',
    ].join(NL);
    const ra = scanQuarantineTriggers(xau);
    expect(ra.length).toBeGreaterThan(0);
    expect(ra.join(' ')).toContain('TREO');
  });

  it('T1.6 [fixture đối kháng] — dựng ứng viên từ `flaky_diem` thì lưới ĐỎ', () => {
    const xau = [
      'const chayCaHaiNhanh = (codeMoi) => {',
      '  if (br.treo) return {};',
      '  const ungVien = chooseQuarantineTargets({ loiNapGoc: bs.loiNap, them: x.flaky_diem });',
      '};',
      'const findingTreo = () => ({});',
    ].join(NL);
    expect(scanQuarantineTriggers(xau).join(' ')).toContain('flaky_diem');
  });
});

describe('cách ly là ĐÁNH DẤU, không phải xoá (T4 · T6)', () => {
  it('T4.1 · T4.2 — đường CHẤM bỏ probe cách ly; đường MÀN vẫn thấy nó', () => {
    const a = nap('P1', '1', 'aaa1111bbb');
    const b = nap('P2', '2', 'bbb2222ccc');
    expect(tv.quarantineProbes(SLUG, [{ ten: a.ten!, ly_do: 'không nạp được', sha_goc: 'ggg3333' }])).toBe(1);

    // Đường chạy chấm: probe cách ly KHÔNG được chọn.
    expect(tv.readProbeLibrary(SLUG).map((m) => m.ten)).toEqual([b.ten]);
    // Đường màn: vẫn thấy CẢ HAI, và biết cái nào đang bị cách ly. Giấu nó khỏi màn là lặp lại đúng lỗi
    // «probe biến mất không lời giải thích» mà change trước vừa đóng.
    const ix = tv.readLibraryIndex(SLUG);
    expect(ix.probes.map((m) => m.ten).sort()).toEqual([a.ten, b.ten].sort());
    expect(ix.probes.find((m) => m.ten === a.ten)?.cach_ly?.ly_do).toContain('không nạp được');
  });

  it('T6.1 — cách ly KHÔNG xoá file, và KHÔNG ghi vào sổ gỡ', () => {
    const a = nap('P1', '1', 'aaa1111bbb');
    tv.quarantineProbes(SLUG, [{ ten: a.ten!, ly_do: 'l', sha_goc: 'g' }]);
    expect(existsSync(join(goc, SLUG, a.ten!)), 'file probe phải còn nguyên').toBe(true);
    // Sổ gỡ ghi những lần probe RỜI thư viện. Cách ly không phải một lần rời — gộp vào là báo sai.
    expect(tv.readRemovalLog(SLUG).ban_ghi).toEqual([]);
  });

  it('T4.3 [đảo ngược] — gỡ dấu thì lượt chấm sau chạy lại probe ấy', () => {
    // Đây chính là lý do cách ly được phép do MÁY quyết: nó có một đường về. Xoá thì không.
    const a = nap('P1', '1', 'aaa1111bbb');
    tv.quarantineProbes(SLUG, [{ ten: a.ten!, ly_do: 'l', sha_goc: 'g' }]);
    expect(tv.readProbeLibrary(SLUG)).toHaveLength(0);
    expect(tv.unquarantineProbe(SLUG, a.ten!)).toBe(true);
    expect(tv.readProbeLibrary(SLUG).map((m) => m.ten)).toEqual([a.ten]);
    expect(tv.unquarantineProbe(SLUG, a.ten!), 'gỡ dấu hai lần thì lần sau không có gì để gỡ').toBe(false);
  });

  it('T4.4 [đời cũ] — mục sổ không có trường `cach_ly` đọc như không cách ly', () => {
    nap('P1', '1', 'aaa1111bbb');
    expect(tv.readProbeLibrary(SLUG)).toHaveLength(1);
    expect(tv.readLibraryIndex(SLUG).probes[0]!.cach_ly).toBeUndefined();
  });

  it('T6.2 — tên không có trong sổ thì không tạo mục mới', () => {
    nap('P1', '1', 'aaa1111bbb');
    expect(tv.quarantineProbes(SLUG, [{ ten: 'khong-co.ts', ly_do: 'l', sha_goc: 'g' }])).toBe(0);
    expect(tv.readLibraryIndex(SLUG).probes).toHaveLength(1);
  });
});

describe('ba hành động của NGƯỜI (T6.3)', () => {
  it('gỡ một probe — ghi sổ TRƯỚC, xoá file SAU, và sổ mang tên người', () => {
    const a = nap('P1', '1', 'aaa1111bbb');
    expect(tv.removeProbeByOperator(SLUG, a.ten!, 'thang.vv')).toBe(true);
    expect(tv.readLibraryIndex(SLUG).probes).toEqual([]);
    expect(existsSync(join(goc, SLUG, a.ten!))).toBe(false);
    const so = tv.readRemovalLog(SLUG).ban_ghi;
    expect(so).toHaveLength(1);
    expect(so[0]!.loai).toBe('nguoi_go');
    // Hai loại gỡ do máy không có ai chịu trách nhiệm; loại này thì có, và đó là thông tin không được mất.
    expect(so[0]!.boi).toBe('thang.vv');
  });

  it('gỡ probe không có trong sổ → false, và KHÔNG ghi dòng nào', () => {
    nap('P1', '1', 'aaa1111bbb');
    expect(tv.removeProbeByOperator(SLUG, 'khong-co.ts', 'thang.vv')).toBe(false);
    expect(tv.readRemovalLog(SLUG).ban_ghi).toEqual([]);
  });

  it('xoá cả thư viện — MỖI probe một dòng sổ, và sổ KHÔNG bị xoá theo', () => {
    nap('P1', '1', 'aaa1111bbb');
    nap('P2', '2', 'bbb2222ccc');
    nap('P3', '3', 'ccc3333ddd');
    expect(tv.purgeLibrary(SLUG, 'thang.vv')).toBe(3);
    expect(tv.readLibraryIndex(SLUG).probes).toEqual([]);
    const so = tv.readRemovalLog(SLUG).ban_ghi;
    expect(so).toHaveLength(3);
    expect(so.every((b) => b.loai === 'nguoi_xoa_thu_vien' && b.boi === 'thang.vv')).toBe(true);
    // Gộp ba lần gỡ vào một dòng là mất dấu vết của hai cái còn lại.
    expect(new Set(so.map((b) => b.go)).size).toBe(3);
  });

  it('xoá thư viện rỗng → 0 dòng, không ném', () => {
    expect(() => tv.purgeLibrary(SLUG, 'thang.vv')).not.toThrow();
    expect(tv.purgeLibrary(SLUG, 'thang.vv')).toBe(0);
  });

  it('sổ gỡ đọc được CẢ BỐN loại, không nuốt hai loại mới', () => {
    for (const loai of ['trung_lap', 'dao_thai', 'nguoi_go', 'nguoi_xoa_thu_vien'] as const) {
      tv.recordRemoval(SLUG, { luc: 't', loai, go: `${loai}.ts`, ly_do: 'l' });
    }
    const so = tv.readRemovalLog(SLUG);
    expect(so.ban_ghi.map((b) => b.loai)).toEqual(['trung_lap', 'dao_thai', 'nguoi_go', 'nguoi_xoa_thu_vien']);
    expect(so.dong_hong).toBe(0);
  });
});

describe('trục nhạy cảm', () => {
  it('T_cong ⛔C1 — ba đường phá huỷ đều qua CÙNG một cửa vai', () => {
    expect(scanOperatorGate(SERVER)).toEqual([]);
  });

  it('T_cong [fixture đối kháng] — một đường tự đi, không qua cửa vai → lưới ĐỎ', () => {
    const xau = [
      "app.post('/api/probes/remove', (req, res) => {",
      '  const g = openLibraryRoute(req, res);',
      '});',
      "app.post('/api/probes/unquarantine', (req, res) => {",
      '  res.json({ ok: true });',
      '});',
      "app.post('/api/probes/purge', (req, res) => {",
      '  const g = openLibraryRoute(req, res);',
      '});',
      'function x() { canOperate(dt); }',
    ].join(NL);
    const ra = scanOperatorGate(xau);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('unquarantine');
  });

  it('T_cong — không đường TỰ ĐỘNG nào của engine xoá probe vì lý do không nạp được', () => {
    // Ranh giới ⛔C1: máy được phép ĐÁNH DẤU (đảo ngược được), không được phép XOÁ (một chiều).
    const than = SKILL.slice(SKILL.indexOf('const chayCaHaiNhanh'));
    for (const cam of ['removeProbeByOperator', 'purgeLibrary', 'rmSync']) {
      expect(than, `engine gọi ${cam} trên đường tự động`).not.toContain(cam);
    }
    expect(SKILL).toContain('quarantineProbes(');
  });

  it('T_cong — `purge` chỉ đi tiếp khi gõ ĐÚNG tên repo (hàm thuần, kiểm bằng HÀNH VI)', () => {
    // Bản đầu của ca này quét chuỗi `xacNhan !== g.repo` trong source, và đột biến
    // `if (false && xacNhan !== g.repo)` VẪN KHỚP — ca xanh trên một cửa đã hỏng. Lỗi lưới loại 1,
    // và thứ bắt được nó là mutation. Nay quyết định là một hàm gọi được, nên không còn chỗ trượt.
    expect(evaluatePurgeRequest({ xacNhan: 'a/one', repo: 'a/one' })).toEqual({ ok: true });
    for (const sai of ['', 'a/On', 'a/one2', 'one', null, undefined, 42, {}]) {
      const kq = evaluatePurgeRequest({ xacNhan: sai, repo: 'a/one' });
      expect(kq.ok, JSON.stringify(sai)).toBe(false);
      expect(kq.ok === false && kq.status).toBe(400);
    }
    // Khoảng trắng hai đầu được cắt; hoa thường thì KHÔNG bỏ qua — người gõ đúng tên là người đã đọc tên.
    expect(evaluatePurgeRequest({ xacNhan: '  a/one  ', repo: 'a/one' }).ok).toBe(true);
    // Repo rỗng: không có gì để xác nhận, và chuỗi rỗng KHÔNG được thành lời xác nhận.
    expect(evaluatePurgeRequest({ xacNhan: '', repo: '' }).ok).toBe(false);
  });

  it('T_cong — route `purge` GỌI hàm thuần ấy, và gọi TRƯỚC khi xoá', () => {
    // Cắt tới MỐC KẾ TIẾP (`app.` đầu tiên sau đó), không cắt ở `});` gần nhất: chuỗi ấy khép lại ngay
    // ở `json({ … });` của nhánh từ chối, nên khối bị cụt và phép so thứ tự thành vô nghĩa. Bài học này
    // đã tốn một lượt ở lưới `data-layer` và vừa tốn thêm một lượt ở đây.
    const i = SERVER.indexOf("app.post('/api/probes/purge'");
    const cuoi = SERVER.indexOf(`${NL}app.`, i);
    const than = SERVER.slice(i, cuoi > 0 ? cuoi : SERVER.length);
    expect(than).toContain('evaluatePurgeRequest(');
    expect(than.indexOf('evaluatePurgeRequest(')).toBeLessThan(than.indexOf('purgeLibrary('));
    expect(than).toContain('if (!q.ok) return res.status(q.status)');
  });

  it('T_bimat ⛔C3 — lý do cách ly qua đường CHE và bị cắt độ dài', () => {
    // Thông điệp lỗi nạp do Node/vitest sinh trên repo đích: nó mang đường dẫn sandbox và có thể mang
    // nội dung dòng code. Nó nằm lại trong `meta.json` — file ở lại LÂU, khác log xoay vòng.
    const i = SKILL.indexOf('cachLyTrongLuot.push(');
    expect(i).toBeGreaterThan(-1);
    const dong = SKILL.slice(i, SKILL.indexOf(');', i));
    expect(dong).toContain('redactMessage(');
    expect(dong).toMatch(/slice\(0, \d+\)/);
  });

  it('T_bimat — `quarantineProbes` cắt lý do trước khi ghi xuống đĩa', () => {
    const a = nap('P1', '1', 'aaa1111bbb');
    tv.quarantineProbes(SLUG, [{ ten: a.ten!, ly_do: 'x'.repeat(5000), sha_goc: 'g' }]);
    expect(tv.readLibraryIndex(SLUG).probes[0]!.cach_ly!.ly_do.length).toBeLessThanOrEqual(600);
  });

  it('T_failclosed ⛔C2 — trần vòng cách ly là HẰNG đọc được, và nó chặn thật', () => {
    expect(SKILL).toMatch(/const QUARANTINE_ROUND_CAP = \d+;/);
    // Hết trần thì DỪNG loại, và lượt chấm đi tiếp theo nhánh thất bại cũ — không loại mãi cho tới khi xanh.
    expect(SKILL).toContain('vong < QUARANTINE_ROUND_CAP');
    expect(SKILL).toContain('Hết trần');
  });

  it('T_hopdong ⛔C5 — export mới khai đủ `checkmate.yml`', () => {
    const yml = readFileSync('checkmate.yml', 'utf8');
    for (const ten of ['detectLoadFailures', 'chooseQuarantineTargets', 'quarantineProbes', 'unquarantineProbe', 'removeProbeByOperator', 'purgeLibrary']) {
      expect(yml, `thiếu khai ${ten}`).toContain(ten);
    }
  });

  it('T5.1 — đếm thất lạc trên MỌI nguồn, không chỉ probe mới', () => {
    // Bản trước lọc `nguon === 'moi'`, nên probe THƯ VIỆN biến mất không được đếm ở đâu cả: verdict
    // trông bình thường trong khi hàng chục phép thử đã không chạy.
    expect(SKILL).not.toContain("ungVienTatCa.filter((u) => u.nguon === 'moi').map((u) => u.probe.id)");
    expect(SKILL).toContain('const idGhiNhan = new Set(ungVienTatCa.map((u) => u.probe.id));');
    expect(SKILL).toContain('thongKe.cach_ly = cachLyTrongLuot.length;');
  });

  it('T4.5 — `readProbeLibrary` lọc probe cách ly, `readLibraryIndex` KHÔNG lọc', () => {
    const i = LIB.indexOf('export function readProbeLibrary');
    expect(LIB.slice(i, LIB.indexOf('export function', i + 10))).toContain('if (m.cach_ly) continue;');
    const j = LIB.indexOf('export function readLibraryIndex');
    expect(LIB.slice(j, LIB.indexOf('export function', j + 10))).not.toContain('cach_ly');
  });

  it('T1.5 — `outFile` vắng thì KHÔNG đoán bừa file nào để cách ly', () => {
    const i = SANDBOX.indexOf('if (!existsSync(outFile))');
    const than = SANDBOX.slice(i, SANDBOX.indexOf('}', SANDBOX.indexOf('return', i)));
    expect(than).not.toContain('loiNap');
  });
});
