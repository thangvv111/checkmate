import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProbePlan } from '../packages/harness/src/skill-code.js';
import { summarizeBehavior, behaviorTone, probesPage } from '../apps/web/src/ui-probes.js';

/**
 * Lưới cho capability `probe-library-screen`.
 *
 * Màn này làm một việc chưa màn nào của sản phẩm làm: đưa **mã nguồn do model sinh từ repo đích** lên
 * HTML. Đó là dữ liệu ngoài hạng cao nhất (⛔C4), và nó là thứ trông giống «code của mình» nhất — nên
 * phần T_khongtincay ở cuối file mới là phần nặng nhất, không phải phần bí mật.
 *
 * Trục thứ hai: **không đo được ≠ không có**. Thư viện rỗng · thư viện đời cũ chưa di trú · `meta.json`
 * rách là ba câu khác nhau, và không câu nào là `0 probe`.
 */

// Gốc thư viện RIÊNG, đặt TRƯỚC khi nạp module — hằng `GOC_LIB` và `TRAN_PROBE` đọc env lúc nạp, nên
// import tĩnh sẽ chạy trước mọi `beforeEach` và ca test sẽ ghi vào thư viện thật của máy dev.
const goc = mkdtempSync(join(tmpdir(), 'checkmate-pls-'));
process.env.CHECKER_LIB_DIR = goc;
process.env.CHECKER_LIB_TRAN = '6'; // cận dưới — để ca đào thải chạy nhanh mà vẫn là đường thật
const tv = await import('../packages/harness/src/probe-library.js');

const SLUG = 'repo-man';
const NL = String.fromCharCode(10);
const UI_PROBES = readFileSync('apps/web/src/ui-probes.ts', 'utf8');

const plan = (id: string, rule = 'R1'): ProbePlan => ({ id, ten: `thử ${id}`, muc_dich: 'm', spec_rule: rule, ky_vong: 'k' });
const codeProbe = (id: string, ruot = '1'): string =>
  `import { it, expect } from 'vitest';${NL}${NL}it('${id}: thử', () => {${NL}  expect(${ruot}).toBe(${ruot});${NL}});${NL}`;
const lichSu = (...ds: string[]) => ds.map((tt, i) => ({ sha: `sha${i}00000`, luc: `2026-09-0${(i % 9) + 1}T00:00:00Z`, trang_thai: tt }));

// GÁC: nếu gốc riêng không ăn thì mọi ca dưới đây ghi vào thư viện THẬT. Đã xảy ra một lần ở lưới khác
// trong repo này (năm hàng giả lọt vào sổ cái của máy dev), nên nó là một CA, không phải một giả định.
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

/** Trường CHUỖI do model/repo đích sinh ra. Số (`flaky_diem`, `.length`) không thuộc diện này. */
const TRUONG_NGOAI = ['m.ten', 'm.sha_sinh', 'm.luc', 'plan.muc_dich', 'plan.spec_rule', 'b.go', 'b.giu', 'b.ly_do', 'b.bang_chung', 'h.sha', 'h.luc'];

/**
 * Mọi trường chuỗi không tin cậy nội suy vào HTML phải nằm TRONG một lời gọi `escHtml`.
 *
 * Quét theo từng biểu thức `${…}` chứ không theo dòng: một dòng có thể mang nhiều nội suy, và chỉ một
 * trong số đó thiếu rào là đủ.
 */
export function scanEscapedFields(src: string, quaHam: readonly string[] = []): string[] {
  const loi: string[] = [];
  for (const m of src.matchAll(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    const bt = m[1] ?? '';
    if (!TRUONG_NGOAI.some((f) => bt.includes(f))) continue;
    if (bt.includes('escHtml(')) continue;
    // Trường đi qua một hàm thoát trung gian trong CÙNG file thì thân hàm ấy đã bị chính phép quét này
    // soi. Không có ngoại lệ này, lưới đỏ oan trên code đang đúng — lỗi lưới loại 3.
    if (quaHam.some((h) => bt.trim().startsWith(h))) continue;
    loi.push(`nội suy KHÔNG thoát: \${${bt.trim().slice(0, 90)}}`);
  }
  return loi;
}

/** Hàm thoát trung gian được miễn ở trên — danh sách phải NGẮN, và mỗi cái có ca riêng bên dưới. */
const HAM_THOAT = ['ruleTags('];

/**
 * Panel code phải đặt bằng `textContent`, KHÔNG BAO GIỜ `innerHTML`.
 *
 * Đây là rào, không phải một lựa chọn phong cách: `textContent` khiến trình duyệt không bao giờ phân
 * tích chuỗi ấy thành phần tử, còn `innerHTML` thì có. Code probe là thứ dài nhất và giống mã nhất trên
 * màn — nếu có một chỗ nào đó trong file này dùng `innerHTML`, đây là chỗ nó sẽ nằm.
 */
export function scanNoInnerHtml(src: string): string[] {
  const loi: string[] = [];
  for (const d of src.split(NL)) {
    if (/\.innerHTML\s*=/.test(d)) loi.push(`đặt nội dung bằng innerHTML: ${d.trim()}`);
    if (/\.outerHTML\s*=/.test(d)) loi.push(`đặt nội dung bằng outerHTML: ${d.trim()}`);
  }
  if (!/\.textContent\s*=/.test(src)) loi.push('panel code không đặt nội dung bằng textContent');
  return loi;
}

/**
 * Mọi lời gọi ghi sổ phải nằm TRONG `withLibraryLock`.
 *
 * Sổ là file dùng chung, và hai lượt chấm song song trên prod là trạng thái BÌNH THƯỜNG. Ghi ngoài khoá
 * thì hai lần gỡ đồng thời có thể ra một dòng lai giữa hai bản ghi — và một sổ chỉ-ghi-thêm mà có dòng
 * lai thì mất đúng thứ nó tồn tại để giữ.
 */
export function scanRemovalInsideLock(src: string): string[] {
  const loi: string[] = [];
  // Khoảng của TỪNG khối `withLibraryLock(...)`: khớp ngoặc nhọn thật từ dấu `{` đầu tiên sau nó.
  // Bản đầu của hàm này chỉ đòi chuỗi `withLibraryLock(` XUẤT HIỆN TRƯỚC lời gọi trong file — mà nó
  // được định nghĩa ở đầu file, nên mọi lời gọi phía sau đều qua, kể cả lời gọi nằm hẳn ngoài khoá.
  // Xanh trên một hệ đã hỏng: lỗi lưới loại 1, và thứ bắt được nó là đọc lại chính phép quét.
  const khoang: [number, number][] = [];
  for (const m of src.matchAll(/withLibraryLock\(/g)) {
    const mo = src.indexOf('{', (m.index ?? 0) + 'withLibraryLock('.length);
    if (mo < 0) continue;
    let sau = 0;
    for (let k = mo; k < src.length; k++) {
      if (src[k] === '{') sau++;
      else if (src[k] === '}') {
        sau--;
        if (!sau) {
          khoang.push([mo, k]);
          break;
        }
      }
    }
  }
  let dem = 0;
  for (const m of src.matchAll(/^[ 	]*recordRemoval\(/gm)) {
    const i = m.index ?? 0;
    dem++;
    if (!khoang.some(([a, b]) => i > a && i < b)) loi.push(`ghi sổ NGOÀI khoá, vị trí ${i}`);
  }
  if (!dem) loi.push('không tìm thấy lời gọi ghi sổ nào — phép quét đang mù');
  return loi;
}

/** Trần trên màn phải đến từ dữ liệu, không phải một con số gõ tay. *//** Trần trên màn phải đến từ dữ liệu, không phải một con số gõ tay. */
export function scanHardCodedCap(src: string): string[] {
  const loi: string[] = [];
  for (const d of src.split(NL)) {
    if (/\/\s*\d+\s*probe/.test(d)) loi.push(`trần hard-code trên màn: ${d.trim()}`);
  }
  if (!src.includes('ix.tran')) loi.push('màn không đọc trần từ dữ liệu');
  return loi;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('sổ gỡ — chỉ ghi thêm, và nói ra thứ nó không đọc được (T1)', () => {
  it('T1.1 [Scenario «một probe đã có bị gỡ vì trùng lặp»] — ghi rồi đọc lại đủ cả cặp gỡ/giữ', () => {
    tv.recordRemoval(SLUG, { luc: '2026-09-05T01:00:00Z', loai: 'trung_lap', go: 'a.ts', giu: 'b.ts', ly_do: 'hành vi trùng đo được', bang_chung: '3 lượt chung' });
    const so = tv.readRemovalLog(SLUG);
    expect(so.ban_ghi).toHaveLength(1);
    expect(so.ban_ghi[0]).toMatchObject({ loai: 'trung_lap', go: 'a.ts', giu: 'b.ts', bang_chung: '3 lượt chung' });
  });

  it('T1.2 [Scenario «một probe bị đào thải vì trần»] — không có `giu`, vì không gì thay nó', () => {
    tv.recordRemoval(SLUG, { luc: '2026-09-05T01:00:00Z', loai: 'dao_thai', go: 'a.ts', ly_do: 'chết kéo dài' });
    const b = tv.readRemovalLog(SLUG).ban_ghi[0]!;
    expect(b.loai).toBe('dao_thai');
    expect(b.giu).toBeUndefined();
    expect(b.ly_do).toContain('chết kéo dài');
  });

  it('T1.3 [Scenario «người đọc phân biệt hai lý do gỡ»] — hai loại đọc ra hai nhóm', () => {
    tv.recordRemoval(SLUG, { luc: 'a', loai: 'trung_lap', go: 'x.ts', giu: 'y.ts', ly_do: 'trùng' });
    tv.recordRemoval(SLUG, { luc: 'b', loai: 'dao_thai', go: 'z.ts', ly_do: 'flaky' });
    const ds = tv.readRemovalLog(SLUG).ban_ghi;
    expect(ds.filter((b) => b.loai === 'trung_lap')).toHaveLength(1);
    expect(ds.filter((b) => b.loai === 'dao_thai')).toHaveLength(1);
  });

  it('T1.4 [Scenario «thư viện đổi sau khi đã ghi sổ gỡ»] — bản ghi cũ NGUYÊN VĂN', () => {
    for (const i of [1, 2, 3]) tv.recordRemoval(SLUG, { luc: `luc-${i}`, loai: 'dao_thai', go: `p${i}.ts`, ly_do: `ly-do-${i}` });
    const truoc = tv.readRemovalLog(SLUG).ban_ghi;
    tv.admitToLibrary(SLUG, codeProbe('P9'), plan('P9'), 'abc1234def');
    tv.recordRemoval(SLUG, { luc: 'luc-4', loai: 'trung_lap', go: 'p4.ts', giu: 'p1.ts', ly_do: 'trùng' });
    expect(tv.readRemovalLog(SLUG).ban_ghi.slice(0, 3)).toEqual(truoc);
  });

  it('T1.5 [biên] sổ VẮNG MẶT khác sổ HỎNG — hai câu, không gộp', () => {
    const so = tv.readRemovalLog(SLUG);
    expect(so).toEqual({ ban_ghi: [], dong_hong: 0, ton_tai: false });
  });

  it('T1.6 [hỏng] dòng CUỐI cụt → các dòng trước còn đủ, và số dòng bỏ được TRẢ VỀ', () => {
    // Sổ ghi bằng cách nối thêm dòng, nên tiến trình chết giữa chừng để lại một dòng dở. Nuốt nó trong
    // im lặng thì một sổ hỏng dần trông y hệt một sổ trống.
    tv.recordRemoval(SLUG, { luc: 'a', loai: 'dao_thai', go: 'x.ts', ly_do: 'l' });
    appendFileSync(join(goc, SLUG, 'removals.jsonl'), '{"luc":"b","loai":"dao_th', 'utf8');
    const so = tv.readRemovalLog(SLUG);
    expect(so.ban_ghi).toHaveLength(1);
    expect(so.dong_hong).toBe(1);
    expect(so.ton_tai).toBe(true);
  });

  it('T1.7 [hỏng] dòng GIỮA hỏng → các dòng SAU nó vẫn đọc được', () => {
    mkdirSync(join(goc, SLUG), { recursive: true });
    writeFileSync(
      join(goc, SLUG, 'removals.jsonl'),
      [JSON.stringify({ luc: 'a', loai: 'dao_thai', go: 'x.ts', ly_do: 'l' }), 'khong-phai-json', JSON.stringify({ luc: 'c', loai: 'dao_thai', go: 'z.ts', ly_do: 'l' })].join(NL) + NL,
      'utf8',
    );
    const so = tv.readRemovalLog(SLUG);
    expect(so.ban_ghi.map((b) => b.go)).toEqual(['x.ts', 'z.ts']);
    expect(so.dong_hong).toBe(1);
  });
});

describe('readLibraryIndex — bốn trạng thái, không cái nào là «0 probe» (T2)', () => {
  it('T2.1 [Scenario «nhiều repo đã khai»] — đọc slug này không thấy probe của slug kia', () => {
    tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    tv.admitToLibrary('repo-khac', codeProbe('P2'), plan('P2'), 'def5678abc');
    expect(tv.readLibraryIndex(SLUG).probes).toHaveLength(1);
    expect(tv.readLibraryIndex('repo-khac').probes).toHaveLength(1);
    expect(tv.readLibraryIndex(SLUG).probes[0]!.plan.id).toBe('P1');
    rmSync(join(goc, 'repo-khac'), { recursive: true, force: true });
  });

  it('T2.2 — chỉ mục KHÔNG kèm code', () => {
    tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    const m = tv.readLibraryIndex(SLUG).probes[0] as unknown as Record<string, unknown>;
    expect(m.code).toBeUndefined();
    expect(tv.readProbeLibrary(SLUG)[0]!.code).toContain('P1: thử'); // đường chấm vẫn có code
  });

  it('T2.3 [đời cũ] thư viện theo BỘ được nhận ra, và màn KHÔNG tự di trú', () => {
    // Di trú là một lượt GHI. Màn đọc không được ghi — nó nói ra trạng thái và để lượt chấm làm việc đó.
    mkdirSync(join(goc, SLUG), { recursive: true });
    writeFileSync(join(goc, SLUG, 'meta.json'), JSON.stringify({ files: [{ ten: 'x', sha_sinh: 'a', luc: 'b', hash: 'h', plan: [] }] }), 'utf8');
    const ix = tv.readLibraryIndex(SLUG);
    expect(ix.trang_thai).toBe('doi_cu');
    expect(JSON.parse(readFileSync(join(goc, SLUG, 'meta.json'), 'utf8')).files).toHaveLength(1);
  });

  it('T2.4 [hỏng] meta rách → «không đọc được», KHÔNG phải 0 probe, và KHÔNG đổi tên file của ai', () => {
    mkdirSync(join(goc, SLUG), { recursive: true });
    writeFileSync(join(goc, SLUG, 'meta.json'), '{"probes": [ hong', 'utf8');
    const ix = tv.readLibraryIndex(SLUG);
    expect(ix.trang_thai).toBe('khong_doc_duoc');
    // Màn CHỈ ĐỌC không được đổi tên file — `napMeta` của đường chấm có làm thế, và đó là lý do màn
    // không đi qua nó.
    expect(readFileSync(join(goc, SLUG, 'meta.json'), 'utf8')).toBe('{"probes": [ hong');
  });

  it('T2.5 — thư viện rỗng thật thì trạng thái là «rỗng», khác hẳn hai ca trên', () => {
    expect(tv.readLibraryIndex(SLUG).trang_thai).toBe('rong');
  });
});

describe('readProbeCode — sổ là nguồn sự thật, tên không bao giờ ghép vào đường dẫn (T3)', () => {
  it('T3.1 [happy] tên có trong sổ → đúng nội dung', () => {
    const { ten } = tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    expect(tv.readProbeCode(SLUG, ten)).toContain('P1: thử');
  });

  it('T3.2 [đối kháng] đi ngược thư mục · đường tuyệt đối · kiểu sai → null, không đọc file nào ngoài kho', () => {
    tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    for (const xau of [
      '../../../../../../etc/passwd',
      '..\\..\\meta.json',
      'meta.json',
      '/etc/hosts',
      join(goc, SLUG, 'meta.json'),
      '',
      null,
      undefined,
      123,
      { ten: 'x' },
    ]) {
      expect(tv.readProbeCode(SLUG, xau), `đầu vào ${JSON.stringify(xau)}`).toBeNull();
    }
  });

  it('T3.3 — tên KHÔNG có trong sổ nhưng file có trên đĩa → vẫn null', () => {
    // Một phép kiểm đóng cả bốn đường cùng lúc. Chặn riêng `..` là vá một đường trong bốn.
    mkdirSync(join(goc, SLUG), { recursive: true });
    writeFileSync(join(goc, SLUG, 'la-mat.probe.test.ts'), 'bí mật', 'utf8');
    writeFileSync(join(goc, SLUG, 'meta.json'), JSON.stringify({ probes: [] }), 'utf8');
    expect(tv.readProbeCode(SLUG, 'la-mat.probe.test.ts')).toBeNull();
  });

  it('T3.4 — tên có trong sổ mà file đã bị dọn → null, không ném', () => {
    const { ten } = tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    rmSync(join(goc, SLUG, ten!));
    expect(() => tv.readProbeCode(SLUG, ten)).not.toThrow();
    expect(tv.readProbeCode(SLUG, ten)).toBeNull();
  });
});

describe('dòng tóm tắt hành vi — nói cả khi câu trả lời khó nghe (T4)', () => {
  it('T4.1 [Scenario «probe từng bắt hồi quy»] — nói SỐ LẦN', () => {
    expect(summarizeBehavior(lichSu('pass', 'hoi_quy', 'pass', 'hoi_quy'))).toBe('2 lần bắt được hồi quy');
  });

  it('T4.2 [Scenario «probe im lặng suốt»] — nói thẳng, KHÔNG để trống', () => {
    expect(summarizeBehavior(lichSu('pass', 'pass', 'pass'))).toBe('chưa bắt được hồi quy nào');
  });

  it('T4.3 [Scenario «probe chết kéo dài»] — lỗi có sẵn, KHÔNG đếm thành hồi quy', () => {
    const s = summarizeBehavior(lichSu('nghi_loi_co_san', 'khong_chay', 'nghi_loi_co_san', 'khong_chay'));
    expect(s).toContain('lỗi có sẵn');
    expect(s).not.toContain('bắt được hồi quy');
  });

  it('T4.4 [biên] lịch sử RỖNG → «chưa có lượt nào», khác hẳn «không chạy»', () => {
    // Chưa đo lần nào ≠ đã đo và probe không chạy được. Dùng chung một câu cho hai ca là trộn đúng cặp
    // mà cả sản phẩm này tồn tại để tách.
    expect(summarizeBehavior([])).toContain('chưa chạy lượt nào');
    expect(summarizeBehavior(null)).toContain('chưa chạy lượt nào');
    expect(behaviorTone('khong_chay').nhan).toBe('không chạy');
  });

  it('T4.5 — dải vẽ ĐÚNG số lượt đã có, không đệm cho đủ 20', () => {
    const man = (n: number) =>
      probesPage({
        repoFull: 'a/one',
        index: { probes: [{ ten: 't.ts', sha_sinh: 'abc1234', luc: '2026-09-01T00:00:00Z', hash: 'h', plan: plan('P1'), lich_su: lichSu(...Array(n).fill('pass')) }], tran: 100, trang_thai: 'ok' },
        removals: { ban_ghi: [], dong_hong: 0, ton_tai: false },
      });
    const demO = (h: string) => (h.match(/class="hv-o"/g) ?? []).length;
    // Trừ 5 ô của chú giải màu.
    expect(demO(man(3)) - 5).toBe(3);
    expect(demO(man(20)) - 5).toBe(20);
    // T8.2 [biên trùng ngưỡng] — sổ sửa tay có thể mang 21 mục dù engine cắt ở 20; vẽ đúng cái CÓ.
    expect(demO(man(21)) - 5).toBe(21);
  });

  it('T4.7 — nhãn dải chỉ nói «gần nhất» khi ĐÃ chạm trần lịch sử', () => {
    // Đọc bằng mắt bắt được: «7 lượt gần nhất» ngụ ý có lượt cũ hơn đã bị cắt, trong khi 7 ấy là TẤT
    // CẢ những gì probe từng chạy. Sai nhỏ, nhưng đúng loại sai mà màn này tồn tại để chống.
    const man = (n: number) =>
      probesPage({
        repoFull: 'a/one',
        index: { probes: [{ ten: 't.ts', sha_sinh: 'abc1234', luc: '2026-09-01T00:00:00Z', hash: 'h', plan: plan('P1'), lich_su: lichSu(...Array(n).fill('pass')) }], tran: 100, trang_thai: 'ok' },
        removals: { ban_ghi: [], dong_hong: 0, ton_tai: false },
      });
    expect(man(7)).toContain('7 lượt · mới nhất bên phải');
    expect(man(7)).not.toContain('7 lượt gần nhất');
    expect(man(20)).toContain('20 lượt gần nhất');
  });

  it('T4.6 — trạng thái LẠ vẫn vẽ được, và nói ra là nó lạ', () => {
    expect(behaviorTone('nhan_doi_sau').nhan).toContain('trạng thái lạ');
    expect(behaviorTone(null).nhan).toBe('không rõ');
  });
});

describe('hai đường gỡ đều ghi sổ, và cách chọn nạn nhân KHÔNG đổi (T5 · T6)', () => {
  it('T5.1 [happy] vượt trần → probe bị loại VÀ sổ có đúng một bản ghi tương ứng', () => {
    for (let i = 0; i < 7; i++) tv.admitToLibrary(SLUG, codeProbe(`P${i}`, String(i + 1)), plan(`P${i}`, `R${i}`), `sha${i}0000abc`);
    expect(tv.readLibraryIndex(SLUG).probes.length).toBeLessThanOrEqual(6);
    const so = tv.readRemovalLog(SLUG);
    expect(so.ban_ghi.filter((b) => b.loai === 'dao_thai')).toHaveLength(1);
    expect(so.ban_ghi[0]!.ly_do).toBeTruthy();
  });

  it('T5.2 [khoá KHÔNG-ĐỔI-HÀNH-VI] bốn nấc chọn nạn nhân y nguyên sau khi thêm ghi sổ', () => {
    // Change này chỉ được THÊM một bản ghi. Đổi cách chọn nạn nhân là đổi một luật nó không xin phép đổi.
    const m = (ten: string, x: Partial<Parameters<typeof tv.pickEvictionVictim>[0][number]> = {}) =>
      ({ ten, sha_sinh: 's', luc: '2026-09-01T00:00:00Z', hash: 'h', plan: plan('P'), lich_su: [], ...x }) as never;
    const chet = m('chet.ts', { lich_su: lichSu('khong_chay', 'khong_chay', 'khong_chay', 'khong_chay', 'khong_chay') });
    const flaky = m('flaky.ts', { flaky_diem: 3 });
    const thuong = m('thuong.ts');
    const cong = m('cong.ts', { da_bat_hoi_quy: true });
    expect(tv.pickEvictionVictim([thuong, flaky, chet]).i).toBe(2); // nấc 1
    expect(tv.pickEvictionVictim([thuong, flaky]).i).toBe(1); // nấc 2
    expect(tv.pickEvictionVictim([cong, thuong]).i).toBe(1); // nấc 3
    expect(tv.pickEvictionVictim([cong, m('cong2.ts', { da_bat_hoi_quy: true })]).i).toBe(0); // nấc 4
  });

  it('T6.1 [happy, ĐƯỜNG THẬT] gỡ vì trùng hành vi → sổ có cặp gỡ/giữ và BẰNG CHỨNG', () => {
    // Ca này sinh từ mutation: chiều «bỏ ghi sổ ở đường gỡ trùng» SỐNG SÓT ở lượt đầu. Bảng ba đường
    // cho hàng thứ nhất — mọi ca sổ gỡ khi ấy gọi thẳng `recordRemoval`, không ca nào lái
    // `findAndDropBehaviorDuplicates`. Lời gọi ghi sổ trong nhánh ấy không được ca nào khoá, và một
    // lời gọi không ai khoá thì gỡ đi cũng không ai biết.
    const a = tv.admitToLibrary(SLUG, codeProbe('P1', '1'), plan('P1', 'PRD §3.2'), 'aaa1234def');
    const b = tv.admitToLibrary(SLUG, codeProbe('P2', '2'), plan('P2', 'PRD §3.2'), 'bbb1234def');
    expect(a.ten && b.ten).toBeTruthy();
    // Ba lượt CHUNG, kết quả giống hệt, và ít nhất một lượt không phải pass — cùng xanh suốt KHÔNG
    // phải bằng chứng trùng nhau.
    for (const [sha, tt] of [['s1000000', 'hoi_quy'], ['s2000000', 'pass'], ['s3000000', 'pass']] as [string, string][]) {
      tv.updateHistory(SLUG, sha, [
        { ten: a.ten!, trangThai: tt },
        { ten: b.ten!, trangThai: tt },
      ]);
    }
    const go = tv.findAndDropBehaviorDuplicates(SLUG);
    expect(go, 'không gỡ được gì thì ca này không kiểm được điều nó định kiểm').toHaveLength(1);

    const so = tv.readRemovalLog(SLUG);
    const ban = so.ban_ghi.filter((x) => x.loai === 'trung_lap');
    expect(ban).toHaveLength(1);
    expect(ban[0]!.go).toBe(go[0]!.go);
    expect(ban[0]!.giu).toBe(go[0]!.giu);
    expect(ban[0]!.bang_chung).toContain('lượt chung');
    // Probe được giữ vẫn còn; sổ nói đúng cái đã đi.
    expect(tv.readLibraryIndex(SLUG).probes.map((m) => m.ten)).toEqual([go[0]!.giu]);
  });

  it('T5.3 — vượt trần NHIỀU probe một lúc → mỗi probe MỘT dòng, không gộp', () => {
    for (let i = 0; i < 10; i++) tv.admitToLibrary(SLUG, codeProbe(`Q${i}`, String(i + 1)), plan(`Q${i}`, `R${i}`), `qsa${i}0000abc`);
    const con = tv.readLibraryIndex(SLUG).probes.length;
    const go = tv.readRemovalLog(SLUG).ban_ghi.filter((b) => b.loai === 'dao_thai');
    // 10 lần nạp, trần 6 ⇒ đúng 4 lần đào thải. Gộp nhiều lần gỡ vào một dòng là mất dấu vết của
    // những cái còn lại, và mất im lặng.
    expect(con).toBe(6);
    expect(go).toHaveLength(4);
    expect(new Set(go.map((b) => b.go)).size).toBe(4); // bốn probe KHÁC NHAU, không lặp một tên
  });

  it('T7.1 — ghi sổ nằm TRONG khoá thư viện, và nhiều lần ghi liên tiếp không mất dòng nào', () => {
    // Hai lượt chấm song song là trạng thái bình thường trên prod. Vế liên-tiến-trình do `withLibraryLock`
    // gánh (đã có lưới riêng ở `thu-vien`); ca này khoá vế mà change NÀY thêm vào: lời gọi ghi sổ có nằm
    // trong khoá ấy không, và một chuỗi ghi dài có mất dòng nào không.
    expect(scanRemovalInsideLock(readFileSync('packages/harness/src/probe-library.ts', 'utf8'))).toEqual([]);
    for (let i = 0; i < 50; i++) tv.recordRemoval(SLUG, { luc: `t${i}`, loai: 'dao_thai', go: `p${i}.ts`, ly_do: 'l' });
    const so = tv.readRemovalLog(SLUG);
    expect(so.ban_ghi).toHaveLength(50);
    expect(so.dong_hong).toBe(0);
    expect(so.ban_ghi.map((b) => b.go)).toEqual(Array.from({ length: 50 }, (_, i) => `p${i}.ts`));
  });

  it('T7.1 [fixture đối kháng] — lời gọi ghi sổ đứng NGOÀI mọi khoá thì lưới ĐỎ', () => {
    // Đối kháng ĐÚNG hình dạng bản cũ trượt: khoá được ĐỊNH NGHĨA trước, lời gọi nằm hẳn bên ngoài.
    const xau = ['function withLibraryLock(f) { return f(); }', 'function go() {', '  recordRemoval(slug, x);', '}'].join(NL);
    expect(scanRemovalInsideLock(xau)).toHaveLength(1);
    expect(scanRemovalInsideLock(xau)[0]).toContain('NGOÀI khoá');
  });

  it('T6.2 [Scenario «probe MỚI không được nạp»] — KHÔNG có dòng nào trong sổ gỡ', () => {
    // Không nạp ≠ đã gỡ. Gộp hai chuyện là báo sai bản chất: thư viện đâu có mất gì.
    tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    const lai = tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    expect(lai.bo).toBeTruthy();
    expect(tv.readRemovalLog(SLUG).ban_ghi).toEqual([]);
  });
});

describe('bề mặt màn (T_khongtincay · T_bimat · T_cong)', () => {
  const doc = (ten: string) => readFileSync(ten, 'utf8');

  it('T_khongtincay ⛔C4 — mọi trường chuỗi ngoài đi qua escHtml', () => {
    expect(scanEscapedFields(UI_PROBES, HAM_THOAT)).toEqual([]);
  });

  it('T_khongtincay — mỗi hàm thoát trung gian được miễn phải TỰ thoát', () => {
    // Miễn trừ mà không kiểm là một lỗ: thêm một hàm vào danh sách rồi quên thoát trong thân nó thì
    // lưới vẫn xanh. Ca này đóng lỗ ấy.
    for (const h of HAM_THOAT) {
      const i = UI_PROBES.indexOf(`function ${h}`);
      expect(i, `không tìm thấy hàm ${h} — danh sách miễn trừ đang trỏ vào chỗ không còn`).toBeGreaterThan(0);
      const than = UI_PROBES.slice(i, UI_PROBES.indexOf(`${NL}}`, i));
      expect(than).toContain('escHtml(');
      expect(scanEscapedFields(than)).toEqual([]);
    }
  });

  it('T_khongtincay [fixture đối kháng] — bỏ escHtml quanh MỘT trường thì lưới ĐỎ', () => {
    const xau = '`<div>${m.ten}</div><div>${escHtml(plan.muc_dich)}</div>`';
    expect(scanEscapedFields(xau)).toHaveLength(1);
    expect(scanEscapedFields(xau)[0]).toContain('m.ten');
  });

  it('T_khongtincay [fixture đối chứng] — trường số và biến đã thoát sẵn KHÔNG bị báo oan', () => {
    const tot = '`<b>${(m.lich_su ?? []).length}</b>${escHtml(m.ten)}<i>${so.dong_hong}</i>`';
    expect(scanEscapedFields(tot)).toEqual([]);
  });

  it('T_khongtincay — code probe đặt bằng textContent, KHÔNG BAO GIỜ innerHTML', () => {
    expect(scanNoInnerHtml(UI_PROBES)).toEqual([]);
  });

  it('T_khongtincay [fixture đối kháng] — đổi sang innerHTML thì lưới ĐỎ', () => {
    expect(scanNoInnerHtml('o.innerHTML = d.code;').length).toBeGreaterThan(0);
  });

  it('T_khongtincay — chuỗi cài bẫy trong THÂN probe hiện ra dưới dạng chữ, không thành phần tử', () => {
    // Thân probe là chỗ DÀI NHẤT trên màn và là chỗ dễ được miễn nhất. Bẫy đặt ở đây, không ở tiêu đề.
    const bay = '</pre><script>alert(1)</script>';
    const html = probesPage({
      repoFull: 'a/one',
      index: {
        probes: [{ ten: `p${bay}.ts`, sha_sinh: 'abc1234', luc: '2026-09-01T00:00:00Z', hash: 'h', plan: { ...plan('P1'), muc_dich: bay, spec_rule: bay }, lich_su: lichSu('pass') }],
        tran: 100,
        trang_thai: 'ok',
      },
      removals: { ban_ghi: [{ luc: 'a', loai: 'trung_lap', go: bay, giu: bay, ly_do: bay, bang_chung: bay }], dong_hong: 0, ton_tai: true },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('T_khongtincay — trường đi vào THUỘC TÍNH `title` cũng phải thoát', () => {
    // Thoát cho thân và thoát cho thuộc tính không phải một chuyện: một dấu nháy kép chưa thoát trong
    // `title` là thoát ra khỏi thuộc tính, không cần thẻ nào.
    const html = probesPage({
      repoFull: 'a/one',
      index: { probes: [{ ten: 't.ts', sha_sinh: 'abc1234', luc: '2026-09-01T00:00:00Z', hash: 'h', plan: plan('P1'), lich_su: [{ sha: 'a" onmouseover="alert(1)', luc: '2026-09-01', trang_thai: 'pass' }] }], tran: 100, trang_thai: 'ok' },
      removals: { ban_ghi: [], dong_hong: 0, ton_tai: false },
    });
    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).toContain('&quot;');
  });

  it('T_bimat ⛔C3 — màn không mang đường dẫn máy chủ hay token nào', () => {
    const html = probesPage({
      repoFull: 'a/one',
      index: { probes: [{ ten: 't.ts', sha_sinh: 'abc1234', luc: '2026-09-01T00:00:00Z', hash: 'h', plan: plan('P1'), lich_su: lichSu('pass') }], tran: 100, trang_thai: 'ok' },
      removals: { ban_ghi: [], dong_hong: 0, ton_tai: false },
    });
    for (const cam of ['ghp_', 'sk-', 'local_path', '/home/', 'C:\\']) expect(html).not.toContain(cam);
  });

  it('T_bimat — lý do từ chối của đường đọc code KHÔNG vọng lại đường dẫn đã thử', () => {
    // Cắt tới MỐC KẾ TIẾP, không cắt cứng theo số ký tự: bản đầu của ca này cắt 900 ký tự nên lấn sang
    // route sau và báo vi phạm không có thật. Cùng cái bẫy đã ghi ở `test-grid-integrity`.
    const src = doc('apps/web/src/server.ts');
    const i = src.indexOf("app.get('/api/probes/code'");
    expect(i).toBeGreaterThan(0);
    const khoi = src.slice(i, src.indexOf('app.get(', i + 10));
    expect(khoi).toContain('Probe không có trong thư viện');
    // Luật là về THÔNG ĐIỆP TRẢ RA, không về thân hàm: đọc `local_path` để tính slug là việc bắt buộc.
    const thongDiep = [...khoi.matchAll(/loi: '([^']*)'/g)].map((m) => m[1]!);
    expect(thongDiep.length).toBeGreaterThan(0);
    for (const m of thongDiep) expect(m, `thông điệp vọng đường dẫn: ${m}`).not.toMatch(/[/\\]|GOC_LIB|probes-lib/);
  });

  it('T_cong ⛔C1 — ba đường mới đều là GET, không đường nào chạm cổng merge', () => {
    const src = doc('apps/web/src/server.ts');
    for (const d of ['/probes', '/api/probes', '/api/probes/code']) {
      expect(src, `đường ${d} phải khai bằng app.get`).toContain(`app.get('${d}'`);
      expect(src).not.toContain(`app.post('${d}'`);
    }
    const i = src.indexOf("app.get('/probes'");
    expect(src.slice(i, src.indexOf("app.get('/lich-su'"))).not.toMatch(/mergePr|returnToDev|closePr/);
  });

  it('T_hopdong ⛔C5 — bốn export mới khai đủ checkmate.yml', () => {
    const yml = doc('checkmate.yml');
    for (const ten of ['readLibraryIndex', 'readProbeCode', 'readRemovalLog', 'recordRemoval']) expect(yml).toContain(ten);
  });
});

describe('trần đọc từ cấu hình, không hard-code (T2 · T9.6)', () => {
  it('màn đọc trần từ dữ liệu — đổi trần thì con số trên màn đổi theo', () => {
    const man = (tran: number) =>
      probesPage({ repoFull: 'a/one', index: { probes: [], tran, trang_thai: 'rong' }, removals: { ban_ghi: [], dong_hong: 0, ton_tai: false } });
    expect(man(60)).toContain('0/60 probe');
    expect(man(100)).toContain('0/100 probe');
    expect(scanHardCodedCap(UI_PROBES)).toEqual([]);
  });

  it('[fixture đối kháng] trần gõ tay trên màn thì lưới ĐỎ', () => {
    expect(scanHardCodedCap('const x = `${n}/40 probe`; const y = ix.tran;').length).toBeGreaterThan(0);
  });

  it('tầng web tính trần từ CẤU HÌNH, không từ biến môi trường của tiến trình chấm', () => {
    // `readLibraryIndex().tran` đọc CHECKER_LIB_TRAN — biến mà tiến trình web không đặt cho chính nó.
    // Dùng thẳng số ấy thì màn luôn hiện mặc định dù người vận hành đã đổi trần.
    const src = readFileSync('apps/web/src/server.ts', 'utf8');
    expect(src).toContain('clampToRange(readConfig().agent.tran_thu_vien, LIBRARY_CAP)');
    expect(src).toContain('tran: effectiveLibraryCap()');
  });
});

describe('đầu vào KHUYẾT mọi tầng (T8)', () => {
  it('T8.1 — plan thiếu trường · lịch sử null · phần tử null → màn dựng được, không ném', () => {
    const rac = [
      { ten: 'a.ts' },
      { ten: 'b.ts', plan: {} },
      { ten: 'c.ts', plan: plan('P'), lich_su: null },
      { ten: 'd.ts', plan: plan('P'), lich_su: [null, undefined] },
      { ten: 'e.ts', sha_sinh: null, luc: 12345, plan: { spec_rule: 99 } },
    ];
    for (const m of rac) {
      expect(
        () =>
          probesPage({
            repoFull: 'a/one',
            index: { probes: [m as never], tran: 100, trang_thai: 'ok' },
            removals: { ban_ghi: [{ luc: 'x', loai: 'dao_thai', go: 'g' } as never], dong_hong: 0, ton_tai: true },
          }),
        JSON.stringify(m),
      ).not.toThrow();
    }
  });

  it('T8.3 [ca đã gãy trên PROD 31/08] — probe import module đã đổi tên phải BÀY ĐƯỢC, kèm lịch sử không-chạy', () => {
    // Năm lượt webhook chết liên tiếp vì một probe thư viện import ba module đã đổi tên. Triệu chứng
    // nhìn từ giao diện là «lượt chấm hỏng không rõ lý do»; thứ giải thích được nằm ở đây và hồi ấy
    // phải đọc bằng ssh.
    const html = probesPage({
      repoFull: 'thangvv111/checkmate',
      index: {
        probes: [{ ten: 'lib_e43d1c3_b7fbd4.probe.test.ts', sha_sinh: 'e43d1c3', luc: '2026-08-31T00:00:00Z', hash: 'h', plan: plan('P1'), lich_su: lichSu('khong_chay', 'khong_chay', 'khong_chay', 'khong_chay') }],
        tran: 100,
        trang_thai: 'ok',
      },
      removals: { ban_ghi: [], dong_hong: 0, ton_tai: false },
    });
    expect(html).toContain('lib_e43d1c3_b7fbd4.probe.test.ts');
    expect(html).toContain('lỗi có sẵn');
  });
});
