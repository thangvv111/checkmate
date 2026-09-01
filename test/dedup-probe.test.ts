import { describe, it, expect } from 'vitest';
import { applyRuling, splitRule, findSuspectedDuplicate, findRerunDuplicate, type RulingCandidate } from '../packages/harness/src/dedup-probe.js';
import { splitOneProbe, cutTestBlock, hasTestBlock, checkBalanced, type LibraryProbe } from '../packages/harness/src/thu-vien.js';
import type { ProbePlan } from '../packages/harness/src/skill-code.js';

// Ba tầng đầu của luật xử trùng lặp (specs/R10.6–R10.8) + máy tách file per-probe (R10.2).
// Luật xương sống: mọi đường mờ đều nghiêng về GIỮ — loại nhầm là mất tài sản regression trong im lặng.

const plan = (id: string, rule = 'R1'): ProbePlan => ({ id, ten: `thử ${id}`, muc_dich: 'm', spec_rule: rule, ky_vong: 'k' });
const mucLib = (ten: string, id: string, rule: string, sha: string): LibraryProbe => ({
  ten,
  sha_sinh: sha,
  luc: '2026-08-20T01:00:00.000Z',
  hash: 'h',
  plan: plan(id, rule),
  lich_su: [],
  code: `it('${id}: x', () => {});`,
});

describe('splitRule — chuẩn hoá chuỗi luật trước khi so', () => {
  it('nhận đủ các kiểu viết thật đã gặp trong thư viện: R1,R2 · R3+R4 · R3, R4', () => {
    expect(splitRule('R1,R2')).toEqual(['R1', 'R2']);
    expect(splitRule('R3+R4')).toEqual(['R3', 'R4']);
    expect(splitRule('R3, R4')).toEqual(['R3', 'R4']);
    expect(splitRule('R7, R4, R5')).toEqual(['R7', 'R4', 'R5']);
  });

  it('rỗng và undefined ra tập rỗng, không ném', () => {
    expect(splitRule('')).toEqual([]);
    expect(splitRule(undefined)).toEqual([]);
  });
});

describe('tầng 1 — bản chạy-lại cùng commit', () => {
  const lib = [mucLib('lib_a.ts', 'P1', 'R2', 'abc1234')];

  it('trùng cả sha + id + luật thì bắt', () => {
    expect(findRerunDuplicate(lib, plan('P1', 'R2'), 'abc1234')?.ten).toBe('lib_a.ts');
  });

  it('chỉ cần lệch MỘT trong ba là không phải bản chạy-lại', () => {
    expect(findRerunDuplicate(lib, plan('P1', 'R2'), 'khac999')).toBeNull();
    expect(findRerunDuplicate(lib, plan('P2', 'R2'), 'abc1234')).toBeNull();
    expect(findRerunDuplicate(lib, plan('P1', 'R5'), 'abc1234')).toBeNull();
  });
});

describe('tầng 2 — diện nghi', () => {
  const lib = [mucLib('lib_r2.ts', 'P1', 'R2', 'sha_a'), mucLib('lib_r7.ts', 'P2', 'R7', 'sha_b')];

  it('luật giao nhau thì vào diện nghi, kể cả chuỗi ghép R2+R9', () => {
    expect(findSuspectedDuplicate(lib, plan('P5', 'R2'), 'sha_moi').map((m) => m.ten)).toEqual(['lib_r2.ts']);
    expect(findSuspectedDuplicate(lib, plan('P5', 'R2+R9'), 'sha_moi').map((m) => m.ten)).toEqual(['lib_r2.ts']);
  });

  it('cùng commit sinh cũng vào diện nghi dù luật khác hẳn', () => {
    expect(findSuspectedDuplicate(lib, plan('P5', 'R9'), 'sha_b').map((m) => m.ten)).toEqual(['lib_r7.ts']);
  });

  it('không giao gì thì diện nghi rỗng — nạp thẳng, không tốn model', () => {
    expect(findSuspectedDuplicate(lib, plan('P5', 'R9'), 'sha_moi')).toEqual([]);
  });
});

describe('tầng 3 — áp phán xử của model, nghiêng về GIỮ', () => {
  const ung: RulingCandidate[] = [
    { ma: 'N1', moi: { plan: plan('P1', 'R2'), code: 'x' }, nghi: [mucLib('lib_a.ts', 'P9', 'R2', 's')] },
    { ma: 'N2', moi: { plan: plan('P2', 'R2'), code: 'y' }, nghi: [mucLib('lib_b.ts', 'P8', 'R2', 's')] },
  ];

  it('chỉ bỏ khi trung VÀ chắc chắn VÀ trỏ đúng tên trong diện nghi', () => {
    const q = applyRuling(ung, [
      { ma: 'N1', trung: true, chac_chan: true, voi: 'lib_a.ts', ly_do: 'cùng biên' },
      { ma: 'N2', trung: true, chac_chan: false, voi: 'lib_b.ts' },
    ]);
    expect(q.get('N1')).toMatchObject({ bo: true, voi: 'lib_a.ts' });
    expect(q.get('N2')).toMatchObject({ bo: false }); // không chắc chắn = giữ
  });

  it('model trỏ tên KHÔNG nằm trong diện nghi thì không tin — giữ', () => {
    const q = applyRuling(ung, [{ ma: 'N1', trung: true, chac_chan: true, voi: 'lib_la_hoac.ts' }]);
    expect(q.get('N1')).toMatchObject({ bo: false });
  });

  it('model trả thiếu ứng viên thì ứng viên đó được giữ', () => {
    const q = applyRuling(ung, []);
    expect(q.get('N1')).toMatchObject({ bo: false });
    expect(q.get('N2')).toMatchObject({ bo: false });
  });
});

describe('tách file per-probe', () => {
  const boVitest = `import { it, expect } from 'vitest';
const app = taoApp();

it('P1: biên dưới', () => {
  expect(app.tinh(0)).toBe(0);
  });

it('P2: biên trên', () => {
  expect(app.tinh(100)).toBe(100);
  });
`;

  it('giữ phần đầu + đúng một it(), cắt sạch anh em', () => {
    const ra = splitOneProbe(boVitest, 'P1', ['P2'], '.probe.test.ts')!;
    expect(ra).toContain('taoApp()');
    expect(ra).toContain("it('P1:");
    expect(ra).not.toContain("it('P2:");
    expect(ra.match(/\bit\(/g)).toHaveLength(1);
  });

  it('probe cần giữ không có trong code thì trả null — không nạp mù', () => {
    expect(splitOneProbe(boVitest, 'P9', ['P1', 'P2'], '.probe.test.ts')).toBeNull();
  });

  it('tách kiểu python theo def test_', () => {
    const boPy = `import pytest\nfrom app import tinh\n\ndef test_P1_bien_duoi():\n    assert tinh(0) == 0\n\ndef test_P2_bien_tren():\n    assert tinh(100) == 100\n`;
    const ra = splitOneProbe(boPy, 'P1', ['P2'], '.py')!;
    expect(ra).toContain('def test_P1');
    expect(ra).not.toContain('def test_P2');
  });

  it('it lồng trong describe (indent 4) vẫn tách được — máy quét cân bằng ngoặc không phụ thuộc indent', () => {
    // Đo trên thư viện thật: 5/41 probe không tách được chỉ vì model bọc describe — regex đời đầu chịu thua ca này
    const boDescribe = `import { describe, it, expect } from 'vitest';

describe('nhóm', () => {
  it('P1: một', () => {
    expect(1).toBe(1);
    });
  it('P2: hai (chuỗi có ngoặc ")" và "})" gài bẫy)', () => {
    // chú thích có ngoặc ) gài bẫy
    expect(hai(2)).toBe(2);
    });
});
`;
    const ra = splitOneProbe(boDescribe, 'P1', ['P2'], '.probe.test.ts')!;
    expect(ra).not.toBeNull();
    expect(ra).toContain("it('P1:");
    expect(ra).not.toContain('P2:');
    expect(ra).toContain('describe('); // shell describe còn nguyên, file vẫn chạy được
  });

  it("nhắc tới it('P2:' trong một CHUỖI văn bản không phải là khối test — soi trên bản che", () => {
    // Đời soi trên bản thô từng vừa chặn oan P1 (tưởng có sibling không cắt được), vừa suýt nhận
    // P2 làm probe ma không mang phép thử nào. Bản che phân biệt code thật với chữ trong chuỗi.
    const boLa = `import { it, expect } from 'vitest';\nconst ke = "it('P2: hai'";\n\nit('P1: một', () => {\n  expect(1).toBe(1);\n  });\n`;
    expect(hasTestBlock(boLa, 'P2', '.ts')).toBe(false); // P2 chỉ là chữ, không phải khối
    const ra = splitOneProbe(boLa, 'P1', ['P2'], '.probe.test.ts')!;
    expect(ra).not.toBeNull(); // P1 tách được — sibling ma không chặn oan nữa
    expect(splitOneProbe(boLa, 'P2', ['P1'], '.probe.test.ts')).toBeNull(); // probe ma thì không nạp
  });

  it('sibling THẤY ĐƯỢC nhưng cắt không nổi (khối lệch cân bằng) thì trả null — không nạp file mang lậu', () => {
    // P2 chứa template literal không đóng: máy quét trôi tới hết file, khối không khép được
    const boLech = `it('P1: một', () => {\n  expect(1).toBe(1);\n  });\n\nit('P2: hai', () => {\n  const x = \`chuoi khong dong\n  expect(2).toBe(2);\n  });\n`;
    expect(splitOneProbe(boLech, 'P1', ['P2'], '.probe.test.ts')).toBeNull();
    expect(splitOneProbe(boLech, 'P2', ['P1'], '.probe.test.ts')).toBeNull();
  });

  it('cutTestBlock không tìm thấy khối thì trả nguyên văn, không phá code', () => {
    expect(cutTestBlock(boVitest, 'P9', '.probe.test.ts')).toBe(boVitest);
  });

  it('một probe có NHIỀU it cùng id (2 phía của biên) — cắt là cắt hết, giữ là giữ cả', () => {
    // Đo trên thư viện thật: P2 kiểm biên đóng 500tr bằng HAI it (đúng trần → 200, vượt 1 đồng → 403)
    const boHaiIt = `import { it, expect } from 'vitest';\n\nit('P1: một', () => {\n  expect(1).toBe(1);\n  });\n\nit('P2: đúng trần', () => {\n  expect(duyet(500)).toBe(200);\n  });\n\nit('P2: vượt trần', () => {\n  expect(duyet(501)).toBe(403);\n  });\n`;
    const giuP1 = splitOneProbe(boHaiIt, 'P1', ['P2'], '.probe.test.ts')!;
    expect(giuP1).not.toContain('P2:');
    const giuP2 = splitOneProbe(boHaiIt, 'P2', ['P1'], '.probe.test.ts')!;
    expect(giuP2).not.toContain('P1:');
    expect(giuP2.match(/\bit\(/g)).toHaveLength(2); // probe = một id, có thể nhiều phép đo
  });

  it('python: cắt P1 không được nuốt P10 — ranh giới id như luật R2.14', () => {
    const boPy = `import pytest\n\ndef test_P1_bien():\n    assert 1\n\ndef test_P10_muoi():\n    assert 10\n`;
    const ra = cutTestBlock(boPy, 'P1', '.py');
    expect(ra).not.toContain('def test_P1_bien');
    expect(ra).toContain('def test_P10_muoi');
  });

  it('hasTestBlock phân biệt P1 với P10', () => {
    const code = "it('P10: mười', () => {\n  x;\n  });";
    expect(hasTestBlock(code, 'P10', '.ts')).toBe(true);
    expect(hasTestBlock(code, 'P1', '.ts')).toBe(false);
  });
});

describe('máy quét hiểu regex literal — bài học dàn review', () => {
  const boRegex = `import { it, expect } from 'vitest';

it('P1: gột hex', () => {
  expect(chuan.replace(/x\)/, '')).toBe('a');
  });

it('P2: biên trên', () => {
  expect(tinh(100)).toBe(100);
  });
`;

  it('cắt probe chứa regex literal /x\)/ không bị cắt cụt giữa khối', () => {
    const ra = splitOneProbe(boRegex, 'P2', ['P1'], '.probe.test.ts')!;
    expect(ra).not.toBeNull();
    expect(ra).not.toContain('P1:');
    expect(ra).not.toContain('.toBe(\'a\')'); // không để lại mảnh vỡ của P1
    expect(checkBalanced(ra)).toBe(true);
  });

  it('checkBalanced: file cân bằng qua, mảnh vỡ dính lại thì trượt', () => {
    expect(checkBalanced("const a = fn(1, [2, {b: 3}]);")).toBe(true);
    expect(checkBalanced("const re = /x\)/; fn(re);")).toBe(true);
    expect(checkBalanced(".toBe('a');\n  });\n")).toBe(false); // đuôi thừa sau một pha cắt cụt
  });

  it('python: helper cấp module nằm giữa hai def KHÔNG bị nuốt theo khối bị cắt', () => {
    const boPy = `import pytest\n\ndef test_P1_a():\n    assert 1\n\nHELPER = {"x": 1}\n\ndef test_P2_b():\n    assert HELPER["x"] == 1\n`;
    const ra = cutTestBlock(boPy, 'P1', '.py');
    expect(ra).toContain('HELPER = ');
    expect(ra).toContain('def test_P2_b');
    expect(ra).not.toContain('def test_P1_a');
  });
});

describe('phán xử mơ hồ — model tự mâu thuẫn', () => {
  it('model trả CÙNG một mã hai lần thì probe được GIỮ, không lấy bản đầu', () => {
    const ung: RulingCandidate[] = [{ ma: 'N1', moi: { plan: plan('P1', 'R2'), code: 'x' }, nghi: [mucLib('lib_a.ts', 'P9', 'R2', 's')] }];
    const q = applyRuling(ung, [
      { ma: 'N1', trung: true, chac_chan: true, voi: 'lib_a.ts' },
      { ma: 'N1', trung: false, chac_chan: true, ly_do: 'xem lại: hai biên khác nhau' },
    ]);
    expect(q.get('N1')).toMatchObject({ bo: false });
  });
});
