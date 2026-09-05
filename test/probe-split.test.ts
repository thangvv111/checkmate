import { describe, it, expect } from 'vitest';
import { splitOneProbe, cutTestBlock, hasTestBlock, checkBalanced } from '../packages/harness/src/probe-split.js';

/**
 * Lưới cho MÁY TÁCH — `packages/harness/src/probe-split.ts`.
 *
 * Các ca dưới đây CHUYỂN NHÀ nguyên văn từ `test/dedup-probe.test.ts` khi change
 * `probe-handover-replaces-library` gỡ thư viện probe. Luật chúng khoá **vẫn còn hiệu lực**, chỉ đổi
 * việc: trước tách probe ra để NẠP VÀO KHO, nay tách ra để GIAO CHO REPO ĐÍCH.
 *
 * ⛔ Đây đúng chỗ mà `tasks.md §0.2` cảnh báo: file cũ chứa CẢ ca dedup (chết cùng kho) LẪN ca máy tách
 * (còn sống). Xoá cả file là mất 13 ca đang khoá một luật vẫn thi hành — và nó **sẽ không làm gì đỏ**.
 *
 * Tách sai thì thứ giao cho repo đích là code KHÔNG CHẠY ĐƯỢC — hỏng uy tín cơ chế giao ở lần đầu.
 */

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
