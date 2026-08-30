import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { goiYDuongDanModule } from '../packages/harness/src/target.js';

// Lượt sinh lại probe phải được đưa ĐƯỜNG ĐÚNG, không chỉ được đưa lời kêu (specs/R3).
// Ca thật đã giết một lượt chấm: probe import '../apps/web/src/di-tru.js' trong khi module nằm ở
// 'apps/web/src/kho/di-tru.ts' — lệch đúng một thư mục, và lượt sinh lại đoán trượt y hệt lượt đầu.

const REPO = resolve('.');

describe('gợi ý đường dẫn module cho lượt sinh lại', () => {
  it('module lệch thư mục thì chỉ ra đường ĐÚNG có thật trong repo', () => {
    const ra = goiYDuongDanModule("Cannot find module '../apps/web/src/di-tru.js' imported from x", REPO);
    expect(ra).toContain('../apps/web/src/kho/di-tru.js');
    expect(ra).toMatch(/KHÔNG có thật/);
  });

  it('gộp nhiều module thiếu trong cùng một lời kêu, không bỏ sót cái nào', () => {
    const ra = goiYDuongDanModule(
      "Cannot find module '../apps/web/src/di-tru.js'\nCannot find module '../packages/harness/src/thu-vien.js'",
      REPO,
    );
    expect(ra).toContain('kho/di-tru.js');
    // thu-vien.js vốn CÓ thật ở đúng chỗ đó — vẫn phải liệt kê để model thấy mình gõ đúng hay sai
    expect(ra).toContain('thu-vien.js');
  });

  it('repo không có file nào tên đó thì nói THẲNG, không bịa ra một đường dẫn gần đúng', () => {
    const ra = goiYDuongDanModule("Cannot find module '../apps/web/src/khong-ton-tai-dau.js'", REPO);
    expect(ra).toMatch(/KHÔNG có file nào tên/);
    expect(ra).not.toMatch(/Đường ĐÚNG/);
  });

  it('lời kêu không phải lỗi module thì im lặng, không bôi thêm nhiễu vào prompt', () => {
    expect(goiYDuongDanModule('Unterminated string literal', REPO)).toBe('');
  });
});
