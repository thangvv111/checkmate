import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { suggestModulePath } from '../packages/harness/src/target.js';

// Lượt sinh lại probe phải được đưa ĐƯỜNG ĐÚNG, không chỉ được đưa lời kêu (specs/R3).
// Ca thật đã giết một lượt chấm: probe import module ở SAI THƯ MỤC — lệch đúng một bậc, và lượt
// sinh lại đoán trượt y hệt lượt đầu. Sau đợt đổi tên 01/09, ca này dùng migrate.js (thật sự nằm
// trong store/) làm mẫu; tên cũ di-tru.js không còn tồn tại nên nó không kiểm được gì nữa.

const REPO = resolve('.');

describe('gợi ý đường dẫn module cho lượt sinh lại', () => {
  it('module lệch thư mục thì chỉ ra đường ĐÚNG có thật trong repo', () => {
    const ra = suggestModulePath("Cannot find module '../apps/web/src/migrate.js' imported from x", REPO);
    expect(ra).toContain('../apps/web/src/store/migrate.js');
    expect(ra).toMatch(/KHÔNG có thật/);
  });

  it('gộp nhiều module thiếu trong cùng một lời kêu, không bỏ sót cái nào', () => {
    const ra = suggestModulePath(
      "Cannot find module '../apps/web/src/migrate.js'\nCannot find module '../packages/harness/src/probe-library.js'",
      REPO,
    );
    expect(ra).toContain('store/migrate.js');
    // probe-library.js vốn CÓ thật ở đúng chỗ đó — vẫn phải liệt kê để model thấy mình gõ đúng hay sai
    expect(ra).toContain('probe-library.js');
  });

  it('repo không có file nào tên đó thì nói THẲNG, không bịa ra một đường dẫn gần đúng', () => {
    const ra = suggestModulePath("Cannot find module '../apps/web/src/khong-ton-tai-dau.js'", REPO);
    expect(ra).toMatch(/KHÔNG có file nào tên/);
    expect(ra).not.toMatch(/Đường ĐÚNG/);
  });

  it('lời kêu không phải lỗi module thì im lặng, không bôi thêm nhiễu vào prompt', () => {
    expect(suggestModulePath('Unterminated string literal', REPO)).toBe('');
  });
});
