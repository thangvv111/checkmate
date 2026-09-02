import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProbePlan } from '../packages/harness/src/skill-code.js';

// Thư viện probe hạt TỪNG-PROBE (specs/R10) + khoá liên tiến trình (specs/R8).
// Hai điểm xương sống được kiểm ở đây: di trú đời bộ phải loại được bản chạy-lại (đo được 4 cặp
// trong thư viện thật), và tầng 4 chỉ gỡ khi có BẰNG CHỨNG hành vi — cùng xanh suốt không phải bằng chứng.

// Hai ca dưới làm I/O THẬT (ghi/xoá file thư viện) nên chậm hơn hẳn test thuần: đo 5.7–6.9 s khi 44
// file lưới chạy song song, trong khi trần mặc định của vitest là 5 s. Nới trần cho ĐÚNG hai ca đó,
// không nới toàn cục — trần 5 s vẫn là lưới cho mọi test thuần còn lại.
const TRAN_IO_MS = 20_000;

const goc = mkdtempSync(join(tmpdir(), 'checkmate-lib-'));
process.env.CHECKER_LIB_DIR = goc;
// Ghim trần 40 cho các ca đào thải bên dưới (mặc định sản phẩm nay là 100 — R10.4, PO chốt 31/08)
process.env.CHECKER_LIB_TRAN = '40';

const tv = await import('../packages/harness/src/probe-library.js');

const SLUG = 'repo-thu';
const plan = (id: string, rule = 'R1'): ProbePlan => ({ id, ten: `thử ${id}`, muc_dich: 'm', spec_rule: rule, ky_vong: 'k' });
const codeProbe = (id: string, ruot = '1'): string =>
  `import { it, expect } from 'vitest';\n\nit('${id}: thử', () => {\n  expect(${ruot}).toBe(${ruot});\n  });\n`;

beforeEach(() => {
  rmSync(join(goc, SLUG), { recursive: true, force: true });
});
afterAll(() => {
  rmSync(goc, { recursive: true, force: true });
});

describe('nhận theo từng probe', () => {
  it('nhận probe mới và đọc lại được kèm code', () => {
    const kq = tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    expect(kq.ten).toBeTruthy();
    const ds = tv.readProbeLibrary(SLUG);
    expect(ds).toHaveLength(1);
    expect(ds[0].plan.id).toBe('P1');
    expect(ds[0].code).toContain("it('P1:");
  });

  it('trùng nội dung thì từ chối kèm lý do và tên probe bị trùng', () => {
    tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P1'), 'abc1234def');
    const kq = tv.admitToLibrary(SLUG, codeProbe('P1'), plan('P9', 'R5'), 'zzz9999aaa');
    expect(kq.ten).toBeUndefined();
    expect(kq.bo).toMatch(/trùng nội dung/);
    expect(kq.voi).toBeTruthy();
  });

  it('bản chạy-lại cùng commit (sha + id + luật) bị chặn ngay trong khoá', () => {
    tv.admitToLibrary(SLUG, codeProbe('P1', '1'), plan('P1', 'R2'), 'abc1234def');
    const kq = tv.admitToLibrary(SLUG, codeProbe('P1', '2'), plan('P1', 'R2'), 'abc1234def');
    expect(kq.bo).toMatch(/chạy-lại/);
  });

  it('cùng commit nhưng LUẬT khác thì vẫn nhận — chạy lại sâu hơn là thêm phủ, không phải bản sao', () => {
    tv.admitToLibrary(SLUG, codeProbe('P1', '1'), plan('P1', 'R2'), 'abc1234def');
    const kq = tv.admitToLibrary(SLUG, codeProbe('P1', '2'), plan('P1', 'R5'), 'abc1234def');
    expect(kq.ten).toBeTruthy();
    expect(tv.readProbeLibrary(SLUG)).toHaveLength(2);
  });

  it('trần đếm theo PROBE, đào thải theo điểm (R10.22) và xoá cả file trên đĩa', () => {
    // Không probe nào mang cờ/thành tích → nấc 3 «cũ nhất chưa từng bắt hồi quy» trùng hành vi FIFO
    for (let i = 0; i < 45; i++) tv.admitToLibrary(SLUG, codeProbe(`P${i}`, String(i)), plan(`P${i}`), `sha${i}0000`);
    const con = tv.readProbeLibrary(SLUG);
    expect(con).toHaveLength(40);
    expect(con[0].plan.id).toBe('P5'); // 5 probe đầu bị đẩy ra
    const trenDia = readdirSync(join(goc, SLUG)).filter((f) => f.endsWith('.probe.test.ts'));
    expect(trenDia).toHaveLength(40); // không để lại file mồ côi
  }, TRAN_IO_MS); // đào thải + xoá file trên đĩa — I/O thật, đo 5.7–6.9s khi 44 file chạy song song
});

describe('di trú đời bộ sang đời probe', () => {
  const vietBoCu = (): void => {
    mkdirSync(join(goc, SLUG), { recursive: true });
    const bo1 = `import { it, expect } from 'vitest';\n\nit('P1: một', () => {\n  expect(1).toBe(1);\n  });\n\nit('P2: hai', () => {\n  expect(2).toBe(2);\n  });\n`;
    // bộ 2 chấm CÙNG commit với bộ 1, P1 cùng luật (bản chạy-lại) còn P3 là probe mới thật
    const bo2 = `import { it, expect } from 'vitest';\n\nit('P1: một bản hai', () => {\n  expect(1).toBe(1);\n  });\n\nit('P3: ba', () => {\n  expect(3).toBe(3);\n  });\n`;
    writeFileSync(join(goc, SLUG, 'lib-abc1234-1.probe.test.ts'), bo1, 'utf8');
    writeFileSync(join(goc, SLUG, 'lib_abc1234_2.probe.test.ts'), bo2, 'utf8');
    writeFileSync(
      join(goc, SLUG, 'meta.json'),
      JSON.stringify({
        files: [
          { ten: 'lib-abc1234-1.probe.test.ts', sha_sinh: 'abc1234def', luc: '2026-08-20T01:00:00.000Z', hash: 'x1', plan: [plan('P1', 'R1'), plan('P2', 'R2')] },
          { ten: 'lib_abc1234_2.probe.test.ts', sha_sinh: 'abc1234def', luc: '2026-08-21T01:00:00.000Z', hash: 'x2', plan: [plan('P1', 'R1'), plan('P3', 'R3')] },
        ],
      }),
      'utf8',
    );
  };

  it('tách từng probe, loại bản chạy-lại, xoá file bộ cũ', () => {
    vietBoCu();
    const ds = tv.readProbeLibrary(SLUG);
    expect(ds.map((d) => d.plan.id).sort()).toEqual(['P1', 'P2', 'P3']); // P1 bản hai bị loại
    expect(existsSync(join(goc, SLUG, 'lib-abc1234-1.probe.test.ts'))).toBe(false);
    // mỗi file tách chỉ còn ĐÚNG một it()
    for (const d of ds) expect(d.code.match(/\bit\(/g)).toHaveLength(1);
  });

  it('di trú chạy đúng một lần — đọc lại không nhân đôi', () => {
    vietBoCu();
    tv.readProbeLibrary(SLUG);
    expect(tv.readProbeLibrary(SLUG)).toHaveLength(3);
  });
});

describe('tầng 4 — lịch sử hành vi và gỡ trùng đo được', () => {
  const nap = (id: string, rule: string, luc: string): string => {
    const kq = tv.admitToLibrary(SLUG, codeProbe(id, `'${id}'`), plan(id, rule), `sha_${id}_0`);
    // luc quyết định ai là "cũ hơn" — ghi đè trực tiếp qua lịch sử meta không cần, dùng thứ tự nạp
    return kq.ten!;
  };

  it('lịch sử ghi theo lượt, cùng lượt chạy lại thì thay chứ không nhân đôi', () => {
    const ten = nap('P1', 'R1', '');
    tv.updateHistory(SLUG, 'luot1sha', [{ ten, trangThai: 'pass' }]);
    tv.updateHistory(SLUG, 'luot1sha', [{ ten, trangThai: 'hoi_quy' }]);
    const d = tv.readProbeLibrary(SLUG)[0];
    expect(d.lich_su).toHaveLength(1);
    expect(d.lich_su[0].trang_thai).toBe('hoi_quy');
  });

  it('gỡ probe MỚI hơn khi ≥3 lượt chung giống hệt và có lượt cả hai cùng bắt được hồi quy', () => {
    const a = nap('P1', 'R2', '');
    const b = nap('P2', 'R2', '');
    for (const [sha, tt] of [['s1', 'pass'], ['s2', 'hoi_quy'], ['s3', 'pass']] as const) {
      tv.updateHistory(SLUG, sha, [{ ten: a, trangThai: tt }, { ten: b, trangThai: tt }]);
    }
    const go = tv.findAndDropBehaviorDuplicates(SLUG);
    expect(go).toHaveLength(1);
    expect(go[0].go).toBe(b); // giữ bản cũ hơn
    expect(go[0].giu).toBe(a);
    expect(go[0].bangChung).toMatch(/3 lượt chung/);
    expect(tv.readProbeLibrary(SLUG).map((d) => d.ten)).toEqual([a]);
    expect(existsSync(join(goc, SLUG, b))).toBe(false);
  });

  it('cùng hỏng vì MỘT NGUYÊN NHÂN CHUNG thì KHÔNG gỡ — đó là chuyện của môi trường, không phải của probe', () => {
    // Ca thật: repo đích đổi mã lỗi nghiệp vụ 400 → 422. Mọi probe neo cùng luật đều đỏ cả hai nhánh
    // với cùng vân tay lỗi ⇒ đồng loạt mang `ngoai_pham_vi` / `nghi_loi_co_san`. Chúng giống nhau vì
    // spec đổi, không phải vì chúng kiểm cùng một thứ — gỡ là xoá vĩnh viễn cả nhóm phép thử tốt.
    const a = nap('P1', 'R2', '');
    const b = nap('P2', 'R2', '');
    for (const [sha, tt] of [
      ['s1', 'ngoai_pham_vi'],
      ['s2', 'nghi_loi_co_san'],
      ['s3', 'ngoai_pham_vi'],
      ['s4', 'nghi_van'],
    ] as const) {
      tv.updateHistory(SLUG, sha, [{ ten: a, trangThai: tt }, { ten: b, trangThai: tt }]);
    }
    expect(tv.findAndDropBehaviorDuplicates(SLUG)).toHaveLength(0);
    expect(tv.readProbeLibrary(SLUG)).toHaveLength(2);
  });

  it('nhãn hoàn cảnh chung KHÔNG được tính vào số lượt chung tối thiểu', () => {
    // Hai lượt hành vi thật + hai lượt hoàn cảnh chung = vẫn chưa đủ ba lượt có thông tin
    const a = nap('P1', 'R2', '');
    const b = nap('P2', 'R2', '');
    for (const [sha, tt] of [
      ['s1', 'hoi_quy'],
      ['s2', 'pass'],
      ['s3', 'ngoai_pham_vi'],
      ['s4', 'nghi_loi_co_san'],
    ] as const) {
      tv.updateHistory(SLUG, sha, [{ ten: a, trangThai: tt }, { ten: b, trangThai: tt }]);
    }
    expect(tv.findAndDropBehaviorDuplicates(SLUG)).toHaveLength(0);
  });

  it('cùng XANH suốt thì KHÔNG gỡ — đồng thuận khi không có gì xảy ra không phải bằng chứng', () => {
    const a = nap('P1', 'R2', '');
    const b = nap('P2', 'R2', '');
    for (const sha of ['s1', 's2', 's3', 's4']) {
      tv.updateHistory(SLUG, sha, [{ ten: a, trangThai: 'pass' }, { ten: b, trangThai: 'pass' }]);
    }
    expect(tv.findAndDropBehaviorDuplicates(SLUG)).toHaveLength(0);
    expect(tv.readProbeLibrary(SLUG)).toHaveLength(2);
  });

  it('khác luật spec thì không gỡ dù hành vi giống hệt', () => {
    const a = nap('P1', 'R2', '');
    const b = nap('P2', 'R7', '');
    for (const [sha, tt] of [['s1', 'hoi_quy'], ['s2', 'pass'], ['s3', 'hoi_quy']] as const) {
      tv.updateHistory(SLUG, sha, [{ ten: a, trangThai: tt }, { ten: b, trangThai: tt }]);
    }
    expect(tv.findAndDropBehaviorDuplicates(SLUG)).toHaveLength(0);
  });

  it('mới có 2 lượt chung thì chưa đủ bằng chứng', () => {
    const a = nap('P1', 'R2', '');
    const b = nap('P2', 'R2', '');
    for (const [sha, tt] of [['s1', 'hoi_quy'], ['s2', 'hoi_quy']] as const) {
      tv.updateHistory(SLUG, sha, [{ ten: a, trangThai: tt }, { ten: b, trangThai: tt }]);
    }
    expect(tv.findAndDropBehaviorDuplicates(SLUG)).toHaveLength(0);
  });
});

describe('đào thải theo điểm GIỮ/LOẠI (R10.22–R10.24) — thay FIFO mù', () => {
  type Muc = import('../packages/harness/src/probe-library.js').ProbeLibEntry;
  const muc = (ten: string, phu: Partial<Muc> = {}): Muc => ({
    ten, sha_sinh: 's', luc: '2026-01-01', hash: ten, plan: plan(ten), lich_su: [], ...phu,
  });
  const ls = (...tt: string[]) => tt.map((t, i) => ({ sha: `s${i}`, luc: '', trang_thai: t }));

  it('nấc 1: probe chết kéo dài bị loại trước — kể cả từng bắt hồi quy (giữ là giữ xác)', () => {
    const kq = tv.pickEvictionVictim([
      muc('a'),
      muc('chet', { da_bat_hoi_quy: true, lich_su: ls('nghi_loi_co_san', 'nghi_loi_co_san', 'khong_chay', 'nghi_loi_co_san', 'nghi_loi_co_san') }),
      muc('c'),
    ]);
    expect(kq.i).toBe(1);
    expect(kq.ly_do).toContain('chết kéo dài');
  });

  it('chưa đủ ngưỡng lượt chết liên tiếp thì KHÔNG tính là chết — spec đổi tạm không giết probe', () => {
    const kq = tv.pickEvictionVictim([
      muc('a', { lich_su: ls('pass', 'nghi_loi_co_san', 'nghi_loi_co_san', 'nghi_loi_co_san', 'nghi_loi_co_san') }),
      muc('b'),
    ]);
    expect(kq.ly_do).not.toContain('chết kéo dài');
  });

  it('nấc 2: không ai chết thì flaky cao nhất (≥2) bị loại', () => {
    const kq = tv.pickEvictionVictim([muc('a', { flaky_diem: 1 }), muc('b', { flaky_diem: 3 }), muc('c', { flaky_diem: 2 })]);
    expect(kq.i).toBe(1);
    expect(kq.ly_do).toContain('flaky');
  });

  it('nấc 3: probe từng bắt hồi quy được MIỄN TRỪ — loại probe cũ nhất chưa từng bắt', () => {
    const kq = tv.pickEvictionVictim([muc('a', { da_bat_hoi_quy: true }), muc('b'), muc('c')]);
    expect(kq.i).toBe(1);
    expect(kq.ly_do).toContain('chưa từng bắt hồi quy');
  });

  it('nấc 4 (van chống kẹt trần): cả kho toàn hàng miễn trừ thì loại cũ nhất tuyệt đối', () => {
    const kq = tv.pickEvictionVictim([muc('a', { da_bat_hoi_quy: true }), muc('b', { da_bat_hoi_quy: true })]);
    expect(kq.i).toBe(0);
    expect(kq.ly_do).toContain('van chống kẹt trần');
  });

  it('nấc 3 KHÔNG đá probe VỪA NẠP: kho toàn miễn trừ + probe mới → van nấc 4 mở, không hoá thạch', () => {
    // Quan sát P1 vòng một: probe vừa push là đứa duy nhất chưa-từng-bắt — nấc 3 mù sẽ đá đúng nó.
    const kq = tv.pickEvictionVictim([muc('a', { da_bat_hoi_quy: true }), muc('b', { da_bat_hoi_quy: true }), muc('moi')], 'moi');
    expect(kq.i).toBe(0); // loại probe MIỄN TRỪ cũ nhất, không phải probe mới
    expect(kq.ly_do).toContain('van chống kẹt trần');
  });

  it('«vừa nạp» nhận diện bằng TÊN, không đoán vị trí — nạn nhân hợp lệ đứng cuối vẫn bị chọn (vòng hai)', () => {
    // pickEvictionVictim là hàm export: bản đoán slice(0,-1) bỏ sót probe thường đứng cuối và xoá nhầm
    // probe từng bắt hồi quy ở nấc 4 trong khi tiền đề nấc 4 không thoả.
    const kq = tv.pickEvictionVictim([muc('a', { da_bat_hoi_quy: true }), muc('b', { da_bat_hoi_quy: true }), muc('c')]);
    expect(kq.i).toBe(2); // không có tenVuaNap → c là nạn nhân nấc 3 hợp lệ
    expect(kq.ly_do).toContain('chưa từng bắt hồi quy');
  });

  it('nhãn hoàn cảnh KHÔNG đè nhãn hành-vi-riêng cùng sha — chuỗi pass→nghi_loi→hoi_quy vẫn ra flaky (P2)', () => {
    const kq = tv.admitToLibrary(SLUG, codeProbe('PG', `'PG'`), plan('PG'), 'shaG');
    tv.updateHistory(SLUG, 'z1', [{ ten: kq.ten!, trangThai: 'pass' }]);
    tv.updateHistory(SLUG, 'z1', [{ ten: kq.ten!, trangThai: 'nghi_loi_co_san' }]); // hoàn cảnh — không đè
    let d = tv.readProbeLibrary(SLUG)[0];
    expect(d.lich_su.find((h) => h.sha === 'z1')?.trang_thai).toBe('pass');
    tv.updateHistory(SLUG, 'z1', [{ ten: kq.ten!, trangThai: 'hoi_quy' }]); // so được với pass còn giữ → +1
    d = tv.readProbeLibrary(SLUG)[0];
    expect(d.flaky_diem).toBe(1);
    expect(d.da_bat_hoi_quy).toBe(true);
  });

  it('updateHistory: nhãn hoi_quy đóng cờ VĨNH VIỄN — không trôi theo trần lịch sử 20 lượt', () => {
    const kq = tv.admitToLibrary(SLUG, codeProbe('PV', `'PV'`), plan('PV'), 'shaV');
    tv.updateHistory(SLUG, 'x0', [{ ten: kq.ten!, trangThai: 'hoi_quy' }]);
    for (let i = 1; i <= 25; i++) tv.updateHistory(SLUG, `x${i}`, [{ ten: kq.ten!, trangThai: 'pass' }]);
    const d = tv.readProbeLibrary(SLUG)[0];
    expect(d.lich_su.length).toBe(20); // hàng hoi_quy đã trôi khỏi lịch sử...
    expect(d.da_bat_hoi_quy).toBe(true); // ...nhưng thành tích thì không
  }, TRAN_IO_MS); // lịch sử 20 lượt, ghi/đọc sổ nhiều lượt — I/O thật, đo 5.7–6.9s khi 44 file chạy song song

  it('updateHistory: cùng sha đổi trạng thái hành-vi-riêng → flaky_diem tăng; nhãn hoàn cảnh không tính', () => {
    const kq = tv.admitToLibrary(SLUG, codeProbe('PF', `'PF'`), plan('PF'), 'shaF');
    tv.updateHistory(SLUG, 'y1', [{ ten: kq.ten!, trangThai: 'pass' }]);
    tv.updateHistory(SLUG, 'y1', [{ ten: kq.ten!, trangThai: 'hoi_quy' }]); // cùng sha, khác kết quả → +1
    tv.updateHistory(SLUG, 'y1', [{ ten: kq.ten!, trangThai: 'hoi_quy' }]); // giống hệt → không tăng
    tv.updateHistory(SLUG, 'y1', [{ ten: kq.ten!, trangThai: 'nghi_loi_co_san' }]); // hoàn cảnh → không tăng
    const d = tv.readProbeLibrary(SLUG)[0];
    expect(d.flaky_diem).toBe(1);
  });
});

describe('withLibraryLock', () => {
  it('nhả khoá sau khi xong để lượt sau vào được', () => {
    tv.withLibraryLock(SLUG, () => 1);
    expect(existsSync(join(goc, SLUG, '.khoa'))).toBe(false);
    expect(tv.withLibraryLock(SLUG, () => 2)).toBe(2);
  });

  it('việc bên trong ném lỗi thì khoá vẫn phải được nhả', () => {
    expect(() =>
      tv.withLibraryLock(SLUG, () => {
        throw new Error('hỏng');
      }),
    ).toThrow('hỏng');
    expect(existsSync(join(goc, SLUG, '.khoa'))).toBe(false);
  });

  it('khoá của tiến trình đã chết bị phá, thư viện không đứng hình vĩnh viễn', () => {
    mkdirSync(join(goc, SLUG, '.khoa'), { recursive: true });
    const cu = new Date(Date.now() - 5 * 60_000);
    utimesSync(join(goc, SLUG, '.khoa'), cu, cu);
    expect(tv.withLibraryLock(SLUG, () => 'vào được')).toBe('vào được');
  });
});

describe('an toàn dữ liệu — bài học dàn review (R10.12–R10.13)', () => {
  it('meta.json rách: giữ bằng chứng .hong-*, thư viện coi như rỗng, KHÔNG ghi đè mất', () => {
    mkdirSync(join(goc, SLUG), { recursive: true });
    writeFileSync(join(goc, SLUG, 'meta.json'), '{"probes": [{"ten": "lib_x', 'utf8'); // file cụt vì sập giữa ghi
    expect(tv.readProbeLibrary(SLUG)).toEqual([]);
    const bangChung = readdirSync(join(goc, SLUG)).filter((f) => f.startsWith('meta.json.hong-'));
    expect(bangChung).toHaveLength(1);
  });

  it('di trú GIỮ file bộ khi có probe không tách được — không xoá tài sản chưa cứu ra', () => {
    mkdirSync(join(goc, SLUG), { recursive: true });
    // P2 viết qua chuỗi trung gian nên không cắt/tách được — cả file bộ phải được giữ lại
    const boKho = `import { it, expect } from 'vitest';\nconst ke = "it('P2: hai'";\n\nit('P1: một', () => {\n  expect(1).toBe(1);\n  });\n`;
    writeFileSync(join(goc, SLUG, 'lib-kho-1.probe.test.ts'), boKho, 'utf8');
    writeFileSync(
      join(goc, SLUG, 'meta.json'),
      JSON.stringify({ files: [{ ten: 'lib-kho-1.probe.test.ts', sha_sinh: 'abc1234def', luc: '2026-08-20T01:00:00.000Z', hash: 'x', plan: [plan('P1'), plan('P2', 'R2')] }] }),
      'utf8',
    );
    tv.readProbeLibrary(SLUG);
    expect(existsSync(join(goc, SLUG, 'lib-kho-1.probe.test.ts'))).toBe(true); // file bộ được GIỮ
    const meta = JSON.parse(readFileSync(join(goc, SLUG, 'meta.json'), 'utf8')) as { di_tru: string };
    expect(meta.di_tru).toMatch(/KHÔNG tách được 1/);
    expect(meta.di_tru).toMatch(/lib-kho-1\.probe\.test\.ts·P2/); // truy được ĐÚNG probe kẹt
  });

  it('di trú ghi chi tiết TỪNG probe bị loại: trùng với ai, vì sao', () => {
    mkdirSync(join(goc, SLUG), { recursive: true });
    const bo1 = `import { it, expect } from 'vitest';\n\nit('P1: một', () => {\n  expect(1).toBe(1);\n  });\n`;
    const bo2 = `import { it, expect } from 'vitest';\n\nit('P1: một bản hai', () => {\n  expect(1).toBe(1);\n  });\n`;
    writeFileSync(join(goc, SLUG, 'bo1.probe.test.ts'), bo1, 'utf8');
    writeFileSync(join(goc, SLUG, 'bo2.probe.test.ts'), bo2, 'utf8');
    writeFileSync(
      join(goc, SLUG, 'meta.json'),
      JSON.stringify({ files: [
        { ten: 'bo1.probe.test.ts', sha_sinh: 'abc1234def', luc: '2026-08-20T01:00:00.000Z', hash: 'x1', plan: [plan('P1')] },
        { ten: 'bo2.probe.test.ts', sha_sinh: 'abc1234def', luc: '2026-08-21T01:00:00.000Z', hash: 'x2', plan: [plan('P1')] },
      ] }),
      'utf8',
    );
    tv.readProbeLibrary(SLUG);
    const meta = JSON.parse(readFileSync(join(goc, SLUG, 'meta.json'), 'utf8')) as { di_tru: string };
    expect(meta.di_tru).toMatch(/bo2\.probe\.test\.ts·P1 chạy-lại của lib_abc1234/);
  });
});
