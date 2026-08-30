import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Bảng đường dẫn module trong `checkmate.yml` phải KHỚP với export thật của repo.
 *
 * Bảng đó là thứ model đọc để biết import cái gì từ đâu. Nó được khai bằng tay, và ba lượt chấm liên
 * tiếp đã hỏng vì nó sai theo ba kiểu khác nhau: thiếu một thư mục (`kho/`), khai thiếu chữ ký, và
 * khai một tên hàm ở nhầm file cộng một tên chỉ là alias cục bộ. Mỗi lần hỏng tốn một lượt chấm đầy
 * đủ và trả về "không đủ cơ sở kết luận".
 *
 * Tài liệu khai tay thì sai bằng tay. Lưới này biến nó thành tài liệu được kiểm tự động.
 */

const GOC = resolve('.');
const YML = readFileSync(join(GOC, 'checkmate.yml'), 'utf8');

// Dòng bảng có dạng:  ../duong/dan/mod.js   → tenA · tenB · tenC
const DONG_BANG = /^\s*(\.\.\/[\w./-]+\.js)\s+→\s+(.+)$/gm;

function exportThat(fileTs: string): Set<string> {
  const src = readFileSync(fileTs, 'utf8');
  const ten = new Set<string>();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/gm)) {
    ten.add(m[1]);
  }
  // `export { a, b as c }` — tên xuất ra là tên SAU `as`
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const phan of m[1].split(',')) {
      const t = phan.trim().split(/\s+as\s+/).pop()?.trim();
      if (t) ten.add(t);
    }
  }
  return ten;
}

describe('bảng đường dẫn module trong checkmate.yml khớp export thật', () => {
  const dong = [...YML.matchAll(DONG_BANG)];

  it('bảng có tồn tại và không rỗng — model dựa vào nó để viết import', () => {
    expect(dong.length).toBeGreaterThan(5);
  });

  it('mọi file khai trong bảng đều có thật trong repo', () => {
    const thieu = dong
      .map(([, duong]) => duong)
      .filter((d) => !existsSync(join(GOC, d.replace(/^\.\.\//, '').replace(/\.js$/, '.ts'))));
    expect(thieu, `file khai trong bảng nhưng không có trong repo: ${thieu.join(', ')}`).toEqual([]);
  });

  it('mọi TÊN khai trong bảng đều là export thật của đúng file đó', () => {
    const sai: string[] = [];
    for (const [, duong, dsTen] of dong) {
      const fileTs = join(GOC, duong.replace(/^\.\.\//, '').replace(/\.js$/, '.ts'));
      if (!existsSync(fileTs)) continue;
      const that = exportThat(fileTs);
      for (const ten of dsTen.split('·').map((x) => x.trim()).filter(Boolean)) {
        if (!that.has(ten)) sai.push(`${duong} khai '${ten}' — file đó KHÔNG export tên này`);
      }
    }
    expect(sai, `\n${sai.join('\n')}`).toEqual([]);
  });
});
