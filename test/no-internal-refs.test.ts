import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lưới chống tái phát: mã của engine KHÔNG được nhắc tới tài liệu nội bộ của CheckMate (`specs/R…`)
 * trong CHUỖI — thứ có thể đi vào prompt hay ra màn hình của người dùng ở repo khác. Án lệ: skill-doc
 * từng ghi «khuôn đúc từ án lệ — specs/R12» ngay trong prompt chấm PRD của người khác; repo đích không
 * có file đó, và sản phẩm nói về tài liệu nội bộ của mình giữa lượt phục vụ khách là rò ranh giới.
 *
 * Chú thích KHÔNG bị lưới này bắt: 428 chú thích trỏ R* là việc của change gỡ R (retire-r-rules),
 * không đổi hàng loạt ở đây. Trường `an_le` của kho khuôn được miễn: nó là mốc định vị cho người
 * duyệt kho, KHÔNG phát vào prompt — lưới khuon-loi canh điều đó.
 */
const SRC = join(process.cwd(), 'packages', 'harness', 'src');

function stripComments(src: string): string {
  // `//` sau dấu hai chấm là URL trong chuỗi, không phải chú thích.
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('mã engine không trỏ tới tài liệu nội bộ của CheckMate trong chuỗi', () => {
  const files = readdirSync(SRC).filter((f) => f.endsWith('.ts'));

  it('có file để soi', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const f of files) {
    it(`${f}: không có 'specs/R…' ngoài chú thích và ngoài trường an_le`, () => {
      const dong = stripComments(readFileSync(join(SRC, f), 'utf8')).split('\n');
      const pham = dong
        .map((d, i) => [i + 1, d] as const)
        .filter(([, d]) => /specs\/R/.test(d) && !/\ban_le\s*:/.test(d))
        .map(([n, d]) => `${f}:${n} ${d.trim()}`);
      expect(pham).toEqual([]);
    });
  }

  it('skill-doc: số loại rubric trong nhãn bước, log và prompt SUY từ bảng rubric, không gõ tay', () => {
    // Nhãn «4 loại» sót từ đời rubric cũ đã khai sai về chính mình suốt một đời rubric 7 loại.
    const src = stripComments(readFileSync(join(SRC, 'skill-doc.ts'), 'utf8'));
    expect(src).not.toMatch(/\d+ loại lỗi khách quan/);
    expect(src).not.toMatch(/ngoài \d+ loại/);
  });

  for (const f of files.filter((x) => x !== 'sources.ts')) {
    it(`${f}: không gắn cứng thư mục 'specs/' — nguồn spec do repo khai, chỉ sources.ts giữ danh sách tự dò`, () => {
      const dong = stripComments(readFileSync(join(SRC, f), 'utf8')).split('\n');
      const pham = dong
        .map((d, i) => [i + 1, d] as const)
        .filter(([, d]) => /['"`]specs\//.test(d))
        .map(([n, d]) => `${f}:${n} ${d.trim()}`);
      expect(pham).toEqual([]);
    });
  }

  it('skill-code: đường mặc định khi repo không khai runner không mang stack của repo demo', () => {
    const src = stripComments(readFileSync(join(SRC, 'skill-code.ts'), 'utf8'));
    for (const dau of ['app.inject', "openDb(':memory:')", 'HM-2026']) expect(src, `còn dấu vết demo: ${dau}`).not.toContain(dau);
    expect(src).not.toContain('"spec_rule": "R?"');
  });
});

describe('apps/web không trỏ tài liệu nội bộ và không gắn cứng thư mục spec', () => {
  // Án lệ: router github.ts từng gắn cứng `specs/` làm «luật engine đọc thật»; sau khi luật của repo
  // dời sang openspec/specs/**, PR chỉ sửa luật đi đường tài liệu — change retire-r-rules bịt.
  const WEB = join(process.cwd(), 'apps', 'web', 'src');
  for (const f of readdirSync(WEB).filter((x) => x.endsWith('.ts'))) {
    it(`${f}: không có 'specs/R…' và không gắn cứng 'specs/' trong chuỗi`, () => {
      const dong = stripComments(readFileSync(join(WEB, f), 'utf8')).split('\n');
      const pham = dong
        .map((d, i) => [i + 1, d] as const)
        .filter(([, d]) => /specs\/R|['"`]specs\/|<code>specs\//.test(d))
        .map(([n, d]) => `${f}:${n} ${d.trim()}`);
      expect(pham).toEqual([]);
    });
  }
});
