import { describe, it, expect } from 'vitest';
import { readTrackedText, scanBlindness, SCAN_FLOOR } from './tracked-files.js';

/**
 * Ca test cho `test/tracked-files.ts` — phép đọc chịu được chỉ mục git lệch đĩa.
 *
 * Ca đã gãy BA lần trong ngày 05/09, cả ba ngay sau `openspec archive`, và chưa lần nào có ca test.
 * Lý do đầy đủ nằm ở đầu `test/tracked-files.ts`.
 */

const doc = (co: Record<string, string>) => (p: string) => {
  if (!(p in co)) {
    const e = new Error(`ENOENT: no such file or directory, open '${p}'`) as NodeJS.ErrnoException;
    e.code = 'ENOENT';
    throw e;
  }
  return co[p]!;
};

describe('đọc danh sách file git theo dõi — chịu được chỉ mục lệch đĩa (T1)', () => {
  it('T1.1 [happy] — mọi file tồn tại thì đọc hết, không bỏ qua gì', () => {
    const kq = readTrackedText(['a.ts', 'b.md'], doc({ 'a.ts': 'x', 'b.md': 'y' }));
    expect(kq.daDoc.map((d) => d.p)).toEqual(['a.ts', 'b.md']);
    expect(kq.daDoc.map((d) => d.text)).toEqual(['x', 'y']);
    expect(kq.boQua).toEqual([]);
  });

  it('T1.2 [ca đã gãy BA lần] — file trong chỉ mục mà không còn trên đĩa: bỏ qua, KHÔNG ném, và ĐẾM', () => {
    const co = { 'a.ts': 'x' };
    const daDoi = ['a.ts', 'openspec/changes/history-filter-layout/.openspec.yaml'];
    expect(() => readTrackedText(daDoi, doc(co))).not.toThrow();
    const kq = readTrackedText(daDoi, doc(co));
    expect(kq.daDoc.map((d) => d.p)).toEqual(['a.ts']);
    // Bỏ qua thì phải ĐẾM. Nuốt im lặng là đổi một lỗi ồn ào lấy một lỗi im.
    expect(kq.boQua).toEqual(['openspec/changes/history-filter-layout/.openspec.yaml']);
  });

  it('T1.3 — bỏ qua nhiều file thì đếm đúng số và giữ đúng tên', () => {
    const kq = readTrackedText(['a', 'b', 'c', 'd'], doc({ b: '1' }));
    expect(kq.daDoc.map((d) => d.p)).toEqual(['b']);
    expect(kq.boQua).toEqual(['a', 'c', 'd']);
  });

  it('T1.4 [đầu vào khuyết] — rỗng · phần tử rỗng · null → không ném', () => {
    for (const xau of [[], null, undefined, ['', null, 42]]) {
      expect(() => readTrackedText(xau as never, doc({}))).not.toThrow();
    }
    expect(readTrackedText(null as never, doc({})).daDoc).toEqual([]);
    expect(readTrackedText(['', null, 42] as never, doc({})).boQua).toEqual([]);
  });

  it('T1.5 — lỗi đọc KHÁC (quyền, thư mục) cũng vào `boQua`, không làm đổ cả lượt', () => {
    const nemKhac = (p: string) => {
      if (p === 'cam') {
        const e = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        e.code = 'EACCES';
        throw e;
      }
      return 'ok';
    };
    const kq = readTrackedText(['a', 'cam', 'b'], nemKhac);
    expect(kq.daDoc).toHaveLength(2);
    expect(kq.boQua).toEqual(['cam']);
  });
});

describe('gác chống-mù (T2)', () => {
  it('T2.1 [đối kháng] — cả danh sách vắng mặt → phép quét BIẾT nó đang mù', () => {
    // Không có gác này thì bỏ-qua-im-lặng biến một lỗi ỒN ÀO (ENOENT) thành một lỗi IM: lưới xanh mà
    // không quét gì — đúng lỗi lưới loại 1.
    const kq = readTrackedText(['a', 'b', 'c'], doc({}));
    expect(kq.daDoc).toEqual([]);
    expect(scanBlindness(kq)).toHaveLength(1);
  });

  it('T2.2 — thông điệp phân biệt «chỉ mục lệch đĩa» với «phép quét mù»', () => {
    const than = scanBlindness(readTrackedText(['a', 'b'], doc({})))[0]!;
    expect(than).toContain('đọc được 0');
    expect(than).toContain('bỏ qua 2');
    expect(than, 'phải nêu ví dụ để người đọc lần ra ngay').toContain('ví dụ: a, b');
  });

  it('T2.3 [đối chứng] — đọc được trên sàn thì KHÔNG đỏ, dù có vài file bị bỏ qua', () => {
    const co: Record<string, string> = {};
    for (let i = 0; i < SCAN_FLOOR + 50; i++) co[`f${i}`] = 'x';
    const kq = readTrackedText([...Object.keys(co), 'mat-1', 'mat-2'], doc(co));
    expect(kq.boQua).toHaveLength(2);
    expect(scanBlindness(kq)).toEqual([]);
  });

  it('T2.4 — sàn nằm giữa «không quét gì» và số thật đo được (245)', () => {
    // Đo bằng máy: 245 file. Sàn phải đủ cao để một lần sụt bậc-độ-lớn không lọt, đủ thấp để repo co
    // lại đôi chút không đỏ oan.
    expect(SCAN_FLOOR).toBeGreaterThan(50);
    expect(SCAN_FLOOR).toBeLessThan(245);
  });
});
