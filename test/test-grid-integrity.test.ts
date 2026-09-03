import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Lưới CHO LƯỚI — capability `test-grid-integrity`, tầng 3.
 *
 * Mọi hàm quét source cưỡng chế một luật kiến trúc phải có CẶP fixture: cái sai ĐỎ **và** cái đúng XANH.
 * Chỉ có fixture đối kháng là chưa đủ — một phép quét quá rộng vẫn bắt được cái sai, nên nó qua fixture
 * đối kháng dễ dàng, rồi báo động giả trên code đang đúng.
 *
 * Đo được: lưới `data-layer` bản đầu báo SÁU vi phạm và không cái nào là thật. Thứ bắt được lỗi ấy là đọc
 * code bằng mắt — không có cơ chế nào. File này là cơ chế ấy.
 */

const THU_MUC_TEST = 'test';

/** Kỳ vọng «không có vi phạm». */
const RONG = /\.toEqual\(\[\]\)|\.toStrictEqual\(\[\]\)|\.toHaveLength\(0\)/;

/**
 * Kỳ vọng «có vi phạm» — BỐN dạng, vì bốn hàm quét đang có trong repo dùng bốn cách viết khác nhau.
 * Một mẫu duy nhất sẽ bỏ sót ba hàm và báo động giả trên chúng.
 */
const KHONG_RONG: readonly RegExp[] = [
  /\.toHaveLength\([1-9]/, //            scanDirectSql · scanAccountReaders
  /\.toEqual\(\s*$/m, //                 scanSource — mảng kỳ vọng nằm ở các dòng sau
  /\.toEqual\(\[[^\]\s]/, //             scanCookieReaders — toEqual([`...`])
  /\.not\.toEqual\(\[\]\)|\.toContain\(|toBeGreaterThan\(0\)/,
];

/** Tên các hàm quét được export trong một file test. */
export function listScanners(text: string): string[] {
  return [...text.matchAll(/^export function (scan[A-Za-z0-9_]*)/gm)].map((m) => m[1]);
}

/**
 * Cắt file thành từng khối `it(...)`. Cắt tới MỐC KẾ TIẾP, không cắt cứng theo số ký tự — bản đầu của
 * lưới `data-layer` cắt cứng 1500 ký tự nên khối dính sang route sau và báo 5 vi phạm không có thật.
 */
function khoiCa(text: string): string[] {
  const moc = [...text.matchAll(/\bit\(/g)].map((m) => m.index ?? 0);
  return moc.map((v, k) => text.slice(v, k + 1 < moc.length ? moc[k + 1] : text.length));
}

/** Hàm quét thiếu một trong hai vế của cặp fixture. */
export function scanGridPairs(files: readonly string[], doc: (f: string) => string): string[] {
  const thieu: string[] = [];
  for (const f of files) {
    const text = doc(f);
    const khoi = khoiCa(text);
    for (const ten of listScanners(text)) {
      // So chuỗi thẳng, KHÔNG dựng regex từ tên hàm: một regex dựng động phải escape đúng, và lần viết
      // đầu của file này escape sai (`\b` thành ký tự backspace) làm NĂM ca đỏ oan.
      const cua = khoi.filter((k) => k.includes(`${ten}(`));
      const coRong = cua.some((k) => RONG.test(k));
      const coKhongRong = cua.some((k) => KHONG_RONG.some((r) => r.test(k)));
      if (!coRong) thieu.push(`${f}: ${ten} thiếu fixture ĐỐI CHỨNG (không ca nào kỳ vọng rỗng)`);
      if (!coKhongRong) thieu.push(`${f}: ${ten} thiếu fixture ĐỐI KHÁNG (không ca nào kỳ vọng không rỗng)`);
    }
  }
  return thieu;
}

const fileTest = readdirSync(THU_MUC_TEST)
  .filter((n) => n.endsWith('.test.ts'))
  .map((n) => `${THU_MUC_TEST}/${n}`);

describe('tầng 3 — lưới quét source phải có CẶP fixture', () => {
  it('mã nguồn hiện tại: mọi hàm quét đều có cả fixture đối kháng lẫn đối chứng', () => {
    const thieu = scanGridPairs(fileTest, (f) => readFileSync(f, 'utf8'));
    expect(thieu, `hàm quét thiếu một vế của cặp fixture:\n  ${thieu.join('\n  ')}`).toEqual([]);
  });

  it('phép quét TÌM THẤY đúng những hàm quét đang có — nếu không thì ca trên xanh oan', () => {
    // Ca load-bearing quan trọng nhất của file này. `scanGridPairs` trả rỗng trong HAI trường hợp trông
    // giống hệt nhau: «mọi hàm đều đủ cặp» và «phép nhận diện hỏng, không thấy hàm nào». Không có ca này
    // thì một regex gãy làm cả tầng 3 thành trang trí mà lưới vẫn xanh.
    const thay = fileTest.flatMap((f) => listScanners(readFileSync(f, 'utf8')));
    for (const ten of ['scanSource', 'scanDirectSql', 'scanAccountReaders', 'scanCookieReaders', 'scanGridPairs']) {
      expect(thay, `không nhận diện được hàm quét ${ten}`).toContain(ten);
    }
  });

  it('fixture đối kháng: hàm quét chỉ có ca đối kháng thì lưới ĐỎ, và nêu tên hàm', () => {
    const gia = `
export function scanThuNghiem(files, doc) { return []; }
describe('x', () => {
  it('bắt được cái sai', () => {
    expect(scanThuNghiem(['a.ts'], () => 'xau')).toHaveLength(1);
  });
});
`;
    const ra = scanGridPairs(['test/gia.test.ts'], () => gia);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('scanThuNghiem');
    expect(ra[0]).toContain('ĐỐI CHỨNG');
  });

  it('fixture đối kháng chiều ngược: chỉ có ca đối chứng cũng ĐỎ', () => {
    // Một phép quét luôn trả rỗng cũng qua được ca đối chứng. Thiếu vế nào cũng là thiếu.
    const gia = `
export function scanThuNghiem(files, doc) { return []; }
describe('x', () => {
  it('code đúng thì im', () => {
    expect(scanThuNghiem(['a.ts'], () => 'tot')).toEqual([]);
  });
});
`;
    const ra = scanGridPairs(['test/gia.test.ts'], () => gia);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('ĐỐI KHÁNG');
  });

  it('fixture đối chứng: hàm quét đủ cặp thì XANH', () => {
    // Chính capability này đòi cặp fixture, nên lưới của nó phải có cặp — không được miễn luật nó cưỡng chế.
    const gia = `
export function scanThuNghiem(files, doc) { return []; }
describe('x', () => {
  it('bắt được cái sai', () => {
    expect(scanThuNghiem(['a.ts'], () => 'xau')).toHaveLength(1);
  });
  it('code đúng thì im', () => {
    expect(scanThuNghiem(['b.ts'], () => 'tot')).toEqual([]);
  });
});
`;
    expect(scanGridPairs(['test/gia.test.ts'], () => gia)).toEqual([]);
  });

  it('file không có hàm quét nào → xanh, không báo gì', () => {
    expect(scanGridPairs(['test/gia.test.ts'], () => `it('x', () => { expect(1).toBe(1); });`)).toEqual([]);
  });

  it('lời gọi NGOÀI mọi khối ca không được tính là fixture', () => {
    // Gọi hàm quét ở cấp `describe` rồi assert ở đâu đó khác không phải một ca fixture — luật đòi CA.
    const gia = `
export function scanThuNghiem(files, doc) { return []; }
const ra = scanThuNghiem(['a.ts'], () => 'xau');
describe('x', () => {
  it('không dùng hàm quét', () => { expect(ra).toHaveLength(1); });
});
`;
    const thieu = scanGridPairs(['test/gia.test.ts'], () => gia);
    expect(thieu).toHaveLength(2);
  });
});

describe('tầng 1 và 2 sống ở AGENTS.md — chỗ ở của chúng phải còn đó', () => {
  const agents = readFileSync('AGENTS.md', 'utf8');

  it('AGENTS.md mang cả ba tầng, kèm án lệ có số', () => {
    // Hai tầng đầu không có lưới cưỡng chế (design D1) — thứ duy nhất giữ chúng là chữ trong file này.
    // Một lần dọn tài liệu là đủ để mất chúng, nên ca này khoá sự CÓ MẶT.
    expect(agents, 'tầng 1 — mutation bắt buộc').toContain('chạy HAI lần');
    expect(agents, 'tầng 2 — đếm bề mặt bằng máy').toContain('ĐẾM bề mặt');
    expect(agents, 'tầng 3 — cặp fixture').toContain('CẶP fixture');
    expect(agents, 'án lệ res.send phải còn số').toMatch(/res\.send/);
  });

  it('mục ấy khai thẳng rằng ba tầng KHÔNG đủ', () => {
    // Bỏ câu này thì tài liệu thành lời tuyên bố đã kín — và người ta thôi đọc, đúng chỗ loại lỗi thứ tư
    // sống (security S7.2).
    expect(agents).toContain('KHÔNG đủ');
  });
});
