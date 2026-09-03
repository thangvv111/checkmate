import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProbePlan } from '../packages/harness/src/skill-code.js';

/**
 * Lưới cho capability `probe-library` — bảy điều chưa được ca nào khoá.
 *
 * 20 điều còn lại đã có ca ở `thu-vien` (30 ca) · `dedup-probe` (26 ca) · `kho-run` · `phan-loai`;
 * file này không lặp lại chúng. `R8.9` (đào thải FIFO) là điều LỖI THỜI — cơ chế đã thay bằng chấm điểm
 * bốn nấc, nên nó thành `obsolete` chứ không có ca.
 */

// I/O thật (ghi/xoá file thư viện) nên chậm hơn hẳn test thuần — cùng lý do `thu-vien.test.ts` nới trần.
const TRAN_IO_MS = 20_000;
// Ca R8.8 phải CHỜ HẾT thời hạn chờ khoá (10 s) rồi mới đo — xem design D4.
const TRAN_CHO_KHOA_MS = 25_000;

const goc = mkdtempSync(join(tmpdir(), 'checkmate-probelib-'));
process.env.CHECKER_LIB_DIR = goc;

const tv = await import('../packages/harness/src/probe-library.js');

const SLUG = 'repo-thu';
const plan = (id: string, rule = 'R1'): ProbePlan => ({ id, ten: `thử ${id}`, muc_dich: 'm', spec_rule: rule, ky_vong: 'k' });
const codeProbe = (id: string, ruot = '1'): string =>
  `import { it, expect } from 'vitest';\n\nit('${id}: thử', () => {\n  expect(${ruot}).toBe(${ruot});\n});\n`;
const bam = (s: string): string => createHash('sha256').update(s).digest('hex');

beforeEach(() => {
  rmSync(join(goc, SLUG), { recursive: true, force: true });
});
afterAll(() => {
  rmSync(goc, { recursive: true, force: true });
});

describe('R8.5 — tên file probe suy từ NỘI DUNG, không từ số thứ tự', () => {
  it('hai probe khác nội dung cùng một commit → hai tên khác nhau, mỗi tên mang hash của CHÍNH NÓ', () => {
    // Hai lượt chấm song song cùng chấm một commit sẽ sinh probe cùng lúc. Tên theo số thứ tự thì cả hai
    // tính ra cùng một số và ghi đè file của nhau.
    const c1 = codeProbe('P1', '1');
    const c2 = codeProbe('P2', '2');
    const k1 = tv.admitToLibrary(SLUG, c1, plan('P1'), 'abc1234def');
    const k2 = tv.admitToLibrary(SLUG, c2, plan('P2'), 'abc1234def');
    expect(k1.ten).toBeTruthy();
    expect(k2.ten).toBeTruthy();
    expect(k1.ten).not.toBe(k2.ten);
    expect(k1.ten, 'tên phải mang hash của chính probe đó').toContain(bam(c1).slice(0, 6));
    expect(k2.ten).toContain(bam(c2).slice(0, 6));
  });

  it('tên KHÔNG mang số thứ tự nạp', () => {
    tv.admitToLibrary(SLUG, codeProbe('P1', '1'), plan('P1'), 'abc1234def');
    const k2 = tv.admitToLibrary(SLUG, codeProbe('P2', '2'), plan('P2'), 'abc1234def');
    // Hình dạng đóng: `lib_<7 hex commit>_<hex hash><đuôi>` — không có chỗ cho số đếm.
    expect(k2.ten).toMatch(/^lib_[0-9a-f]{7}_[0-9a-f]+\.probe\.test\.ts$/);
  });

  it('tên tính ra đã thuộc probe có HASH KHÁC → nới hậu tố dài hơn, file cũ KHÔNG bị ghi đè', () => {
    // Ca load-bearing. Đụng tên ở đây là một probe ghi đè file của probe kia TRONG IM LẶNG: sổ vẫn hai
    // mục, đĩa chỉ còn một file, và lượt sau chạy hai mục ấy trên cùng một nội dung mà không ai biết.
    //
    // Chạm nhánh nới hậu tố cần một hash đụng 6 hex đầu với một mục mang hash khác — brute-force 16^6 thì
    // không ai chạy. Cách rẻ: dựng sổ bằng tay mang ĐÚNG cái tên probe mới sẽ tính ra (design D3).
    const sha = 'abc1234def';
    const codeMoi = codeProbe('P9', '9');
    const hashMoi = bam(codeMoi);
    const tenSeTinhRa = `lib_${sha.slice(0, 7)}_${hashMoi.slice(0, 6)}.probe.test.ts`;

    mkdirSync(join(goc, SLUG), { recursive: true });
    writeFileSync(join(goc, SLUG, tenSeTinhRa), 'NOI DUNG CU — KHONG DUOC MAT', 'utf8');
    writeFileSync(
      join(goc, SLUG, 'meta.json'),
      JSON.stringify({
        probes: [
          { ten: tenSeTinhRa, sha_sinh: sha, luc: '2026-01-01T00:00:00Z', hash: 'hash-khac-han', plan: plan('P8'), lich_su: [] },
        ],
      }),
      'utf8',
    );

    const kq = tv.admitToLibrary(SLUG, codeMoi, plan('P9'), sha);
    expect(kq.ten, 'không được nhận đúng cái tên đang bị chiếm').not.toBe(tenSeTinhRa);
    expect(kq.ten, 'hậu tố phải nới DÀI hơn 6 hex').toContain(hashMoi.slice(0, 12));
    expect(readFileSync(join(goc, SLUG, tenSeTinhRa), 'utf8'), 'file của mục cũ phải còn nguyên').toBe(
      'NOI DUNG CU — KHONG DUOC MAT',
    );
  });

  it('⛔C6 — sổ vừa sửa bằng tay có hiệu lực ngay ở lượt đọc kế tiếp', () => {
    // Đường cứu hộ của người vận hành: sửa `meta.json` rồi lượt đọc sau phải thấy. Ca R8.5 ở trên dựa
    // hẳn vào tính chất này, nên nó phải được khẳng định riêng chứ không nằm ngầm.
    mkdirSync(join(goc, SLUG), { recursive: true });
    writeFileSync(join(goc, SLUG, 'tay.probe.test.ts'), codeProbe('PT'), 'utf8');
    writeFileSync(
      join(goc, SLUG, 'meta.json'),
      JSON.stringify({
        probes: [{ ten: 'tay.probe.test.ts', sha_sinh: 'sha0000', luc: '2026-01-01T00:00:00Z', hash: 'h', plan: plan('PT'), lich_su: [] }],
      }),
      'utf8',
    );
    const ds = tv.readProbeLibrary(SLUG);
    expect(ds).toHaveLength(1);
    expect(ds[0].plan.id).toBe('PT');
  });
});

describe('R8.8 — chờ khoá hết giờ thì VẪN làm việc, không bỏ probe', () => {
  it(
    'khoá còn tươi giữ suốt thời hạn chờ → phần việc vẫn chạy và trả về giá trị',
    () => {
      // Hai lựa chọn khi hết giờ chờ: bỏ probe, hoặc đua nhau ghi. Bỏ probe là mất VĨNH VIỄN một probe đã
      // bắt được lỗi thật — thiệt hại một chiều. Đua nhau thì tệ nhất là mất một mục sổ ở lần ghi cuối, và
      // lượt sau sinh lại được. Luật chọn cái đảo-ngược-được.
      //
      // Khoá dựng ở đây có mtime MỚI nên không bị phá theo đường quá hạn (R8.7, đã có ca riêng) — ca này
      // đo đúng nhánh «hết giờ chờ», và vì thế nó phải chờ thật.
      mkdirSync(join(goc, SLUG, '.khoa'), { recursive: true });
      let daChay = false;
      const ra = tv.withLibraryLock(SLUG, () => {
        daChay = true;
        return 42;
      });
      expect(daChay, 'phần việc PHẢI chạy dù không lấy được khoá').toBe(true);
      expect(ra).toBe(42);
      // Khoá của tiến trình khác không được nhả nhầm — lượt này biết mình không giữ nó.
      expect(existsSync(join(goc, SLUG, '.khoa'))).toBe(true);
      rmSync(join(goc, SLUG, '.khoa'), { recursive: true, force: true });
    },
    TRAN_CHO_KHOA_MS,
  );
});

describe('R9.15 — code probe ở lại dạng FILE vì nó là mã nguồn phải chạy được', () => {
  it('nạp probe → file có mặt trên đĩa, đọc lại nguyên văn', () => {
    const code = codeProbe('P1');
    const kq = tv.admitToLibrary(SLUG, code, plan('P1'), 'abc1234def');
    expect(existsSync(join(goc, SLUG, kq.ten!))).toBe(true);
    expect(readFileSync(join(goc, SLUG, kq.ten!), 'utf8')).toBe(code);
  });

  it('lớp thư viện KHÔNG có đường nào đưa code probe vào cơ sở dữ liệu', () => {
    // Ngoại lệ CÓ CHỦ ĐÍCH của luật «mọi truy cập dữ liệu qua lớp kho» (`data-layer`): probe không phải
    // bản ghi, nó là mã nguồn mà trình chạy test phải nạp được từ đĩa. Đưa vào bảng thì mỗi lượt chấm phải
    // ghi ngược ra file tạm trước khi chạy — thêm một bước hỏng được vào đúng đường nóng.
    //
    // Cái mất: ca khoá lớp thư viện, không khoá toàn hệ. Lưới `data-layer` gác phần còn lại.
    const src = readFileSync('packages/harness/src/probe-library.ts', 'utf8');
    expect(src).not.toMatch(/\bDatabaseSync\b/);
    expect(src).not.toMatch(/\.prepare\s*\(/);
  });
});

describe('R10.3 — probe tách ra là artifact MỚI chưa từng chạy', () => {
  it('probe được nhận có lịch sử RỖNG — không mang lịch sử của file gốc', () => {
    // Mảnh tách chưa từng chạy dưới dạng đó. Gán lịch sử của file gốc cho nó là gán bằng chứng của một
    // artifact cho một artifact khác — và tầng 4 gỡ trùng đọc đúng cái lịch sử ấy để quyết định.
    const kq = tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    expect(kq.ten).toBeTruthy();
    const ds = tv.readProbeLibrary(SLUG);
    expect(ds[0].lich_su).toEqual([]);
  });

  it('đường nạp BỎ mảnh tách không chạy sạch một mình, và lý do nói đúng bản chất', () => {
    // File gốc chạy được KHÔNG chứng minh mảnh tách chạy được: mảnh có thể mất helper cấp module, mất
    // import, hoặc dính nửa khối của probe anh em. Nạp mù thì lượt sau cho ra finding sai hẳn bản chất —
    // không phải «code có lỗi» mà là «probe không chạy nổi».
    //
    // Ca đọc source: chứng minh nhánh có mặt, không chứng minh hành vi lúc chạy (cùng cái mất với D6).
    const src = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
    const i = src.indexOf('file tách không chạy sạch một mình');
    expect(i, 'phải có nhánh bỏ mảnh không chạy sạch').toBeGreaterThan(0);
    const khoi = src.slice(Math.max(0, i - 400), i + 200);
    expect(khoi, 'chỉ nhận khi chạy PASSED').toContain("=== 'passed'");
    expect(khoi, 'không chạy sạch thì trả false — tức bị loại').toMatch(/return false/);
  });
});

describe('R10.11 — lời gọi model phân xử nằm NGOÀI khoá thư viện', () => {
  it('lớp thư viện KHÔNG biết tới model — không có cách nào gọi model từ trong khoá', () => {
    // Ca mạnh hơn ca thứ tự: nó khoá KHẢ NĂNG, không khoá một lần viết. Một lời gọi model mất từ vài giây
    // tới vài phút; giữ khoá suốt thời gian đó làm mọi lượt song song đứng chờ rồi lần lượt hết giờ — biến
    // một tối ưu thành điểm nghẽn toàn hệ.
    const src = readFileSync('packages/harness/src/probe-library.ts', 'utf8');
    expect(src, 'không import lớp model').not.toMatch(/from '\.\/model\.js'/);
    for (const cam of ['callJson', 'callCode', 'promptDuplicateRuling']) {
      expect(src, `lớp thư viện không được gọi ${cam}`).not.toContain(cam);
    }
  });

  it('ở đường nạp, lời gọi model đứng TRƯỚC vòng admitToLibrary', () => {
    // Cái mất: ca đọc source, không chứng minh hành vi lúc chạy (design D6).
    const src = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
    const iModel = src.indexOf('promptDuplicateRuling(');
    const iNap = src.indexOf('admitToLibrary(slug,');
    expect(iModel, 'phải có lời gọi model phân xử').toBeGreaterThan(0);
    expect(iNap, 'phải có vòng nạp').toBeGreaterThan(0);
    expect(iModel, 'model phải được hỏi TRƯỚC khi vào khoá nạp').toBeLessThan(iNap);
  });
});

describe('R10.14 — trần thư viện đọc từ env chỉ nhận số nguyên sạch, và bị kẹp', () => {
  const goc0 = process.env.CHECKER_LIB_TRAN;

  /** Nạp lại module với một giá trị env, rồi ĐO TRẦN QUA HÀNH VI: nạp 7 probe rồi đếm cái còn lại. */
  async function soConLaiSauKhiNap7(tran: string | undefined, slug: string): Promise<number> {
    vi.resetModules();
    if (tran === undefined) delete process.env.CHECKER_LIB_TRAN;
    else process.env.CHECKER_LIB_TRAN = tran;
    const m = await import('../packages/harness/src/probe-library.js');
    rmSync(join(goc, slug), { recursive: true, force: true });
    for (let k = 1; k <= 7; k++) m.admitToLibrary(slug, codeProbe(`P${k}`, String(k)), plan(`P${k}`), 'abc1234def');
    return m.readProbeLibrary(slug).length;
  }

  afterAll(() => {
    if (goc0 === undefined) delete process.env.CHECKER_LIB_TRAN;
    else process.env.CHECKER_LIB_TRAN = goc0;
  });

  it('giá trị hỏng → dùng MẶC ĐỊNH, không đoán phần đầu chuỗi', { timeout: TRAN_IO_MS }, async () => {
    // `parseInt('3abc')` cho 3 — và một trần 3 nghĩa là đào thải gần hết thư viện ngay lượt sau, mất vĩnh
    // viễn những probe đã bắt được lỗi thật. Loại hỏng nguy hiểm nhất ở tầng này không dừng hệ thống, nó
    // chạy tiếp trong khi đang xoá tài sản.
    expect(await soConLaiSauKhiNap7('3abc', 'tran-hong')).toBe(7);
  });

  it('giá trị dưới cận → KẸP lên cận dưới, không dùng số đã đặt', { timeout: TRAN_IO_MS }, async () => {
    // Ca phân biệt được BA khả năng, không chỉ hai: kẹp lên 6 → còn 6; dùng thẳng 3 → còn 3; coi như
    // hỏng → còn 7.
    expect(await soConLaiSauKhiNap7('3', 'tran-thap')).toBe(6);
  });
});

describe('R10.15 — đọc ngoài khoá phải chịu được file bị lượt song song dọn', () => {
  it('sổ có mục mà file đã mất → bỏ qua mục ấy, các probe còn lại về ĐỦ, không ném', () => {
    // Đọc diễn ra ngoài khoá (R10.11), nên giữa lúc đọc sổ và lúc đọc file, một lượt song song có thể đã
    // đào thải đúng probe ấy. Mất một probe ở lượt này là thiệt hại nhỏ và tự khỏi; đổ cả lượt chấm vì một
    // file vừa bị dọn là biến một cuộc đua bình thường thành một lượt hỏng khó hiểu.
    const k1 = tv.admitToLibrary(SLUG, codeProbe('P1', '1'), plan('P1'), 'abc1234def');
    const k2 = tv.admitToLibrary(SLUG, codeProbe('P2', '2'), plan('P2'), 'abc1234def');
    expect(tv.readProbeLibrary(SLUG)).toHaveLength(2);

    rmSync(join(goc, SLUG, k1.ten!)); // lượt song song vừa đào thải probe này

    const ds = tv.readProbeLibrary(SLUG);
    expect(ds).toHaveLength(1);
    expect(ds[0].ten).toBe(k2.ten);
  });
});
