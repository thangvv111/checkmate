import { describe, it, expect } from 'vitest';
import { buildDiff } from '../packages/harness/src/target.js';
import { diffIgnorePatterns } from '../packages/harness/src/runner.js';

// Dựng diff đưa vào prompt (specs/R7-tam-nhin-diff.md).
// Luật xương sống: cắt được, nhưng KHÔNG cắt âm thầm — mọi file bị bỏ phải trả về để log và
// prompt nói ra. Một checker im lặng về phần nó chưa xem sẽ ra PASS trên vùng mù.

const noiDung = (n: number) => 'x'.repeat(n);
const diffGia = (kichThuoc: Record<string, number>) => (f: string) => noiDung(kichThuoc[f] ?? 10);

describe('buildDiff — loại file sinh tự động', () => {
  it('bỏ lockfile và nêu tên kèm lý do', () => {
    const kq = buildDiff(['src/a.ts', 'package-lock.json'], diffGia({ 'src/a.ts': 100, 'package-lock.json': 45000 }));
    expect(kq.diff).toHaveLength(100);
    expect(kq.ngoaiTamNhin).toEqual([{ file: 'package-lock.json', kyTu: 45000, lyDo: 'lockfile sinh tự động' }]);
  });

  it('bỏ file nhị phân, file minify và thư mục build', () => {
    const ds = ['logo.png', 'app.min.js', 'dist/bundle.js', 'src/a.ts'];
    const kq = buildDiff(ds, diffGia({}));
    expect(kq.ngoaiTamNhin.map((f) => f.file).sort()).toEqual(['app.min.js', 'dist/bundle.js', 'logo.png']);
  });

  it('nhận thêm mẫu repo tự khai trong checkmate.yml', () => {
    const mau = diffIgnorePatterns({ bo_qua_diff: ['^_ref/'] });
    const kq = buildDiff(['_ref/design/x.html', 'src/a.ts'], diffGia({}), mau);
    expect(kq.ngoaiTamNhin[0]).toMatchObject({ file: '_ref/design/x.html', lyDo: 'repo khai bỏ qua trong checkmate.yml' });
  });

  it('mẫu regex repo khai sai cú pháp thì bỏ qua chứ không làm sập lượt chấm', () => {
    expect(() => diffIgnorePatterns({ bo_qua_diff: ['[chua-dong-ngoac'] })).not.toThrow();
    expect(diffIgnorePatterns({ bo_qua_diff: ['[chua-dong-ngoac', '^ok/'] })).toHaveLength(1);
  });
});

describe('buildDiff — trần kích thước', () => {
  it('dưới trần thì giữ nguyên mọi file, không bỏ gì', () => {
    const kq = buildDiff(['a.ts', 'b.ts'], diffGia({ 'a.ts': 50, 'b.ts': 50 }), [], 1000);
    expect(kq.ngoaiTamNhin).toEqual([]);
    expect(kq.diff).toHaveLength(101); // 50 + '\n' + 50
  });

  it('vượt trần thì giữ file nhỏ để phủ được nhiều bề mặt hành vi nhất', () => {
    const kq = buildDiff(['to.ts', 'nho1.ts', 'nho2.ts'], diffGia({ 'to.ts': 900, 'nho1.ts': 100, 'nho2.ts': 100 }), [], 500);
    expect(kq.ngoaiTamNhin.map((f) => f.file)).toEqual(['to.ts']);
  });

  it('file bị loại vì trần PHẢI được nêu tên và đúng lý do — đây là luật chống cắt âm thầm', () => {
    const kq = buildDiff(['to.ts', 'nho.ts'], diffGia({ 'to.ts': 900, 'nho.ts': 100 }), [], 500);
    expect(kq.ngoaiTamNhin).toEqual([{ file: 'to.ts', kyTu: 900, lyDo: 'vượt trần kích thước diff' }]);
  });

  it('một file duy nhất mà vượt trần thì vẫn giữ — thà quá dài còn hơn chấm trên diff rỗng', () => {
    const kq = buildDiff(['to.ts'], diffGia({ 'to.ts': 900 }), [], 500);
    expect(kq.diff).toHaveLength(900);
    expect(kq.ngoaiTamNhin).toEqual([]);
  });

  it('giữ nguyên thứ tự file như git trả về, không theo thứ tự sắp xếp nội bộ', () => {
    // Bản đầu của ca này dùng hai file CÙNG ĐỘ DÀI (`--- b.ts` và `--- a.ts`). `Array.sort` của V8 ổn
    // định, nên thứ tự giữ nguyên dù engine có sắp lại theo git hay không — ca xanh ở cả hai hiện thực.
    // Đo được bằng đột biến ở change `requirements-for-covered-rules`: bỏ hẳn phép sắp lại, không ca nào đỏ.
    //
    // Ca đúng phải cho thứ tự git NGƯỢC với thứ tự chọn: engine sắp theo kích thước để CHỌN (file nhỏ
    // trước), nên file to phải đứng trước trong danh sách git thì mới phân biệt được hai đường.
    const kq = buildDiff(['to.ts', 'nho.ts'], diffGia({ 'to.ts': 200, 'nho.ts': 50 }), [], 1000);
    expect(kq.ngoaiTamNhin, 'trần đủ rộng — ca này nói về THỨ TỰ, không nói về cắt').toEqual([]);
    expect(kq.diff.startsWith(noiDung(200)), 'file to phải đứng trước vì git trả về nó trước').toBe(true);
  });
});
