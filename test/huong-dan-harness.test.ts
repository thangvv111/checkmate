import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Lưới chống TRÔI cho các file hướng dẫn harness.
 *
 * Repo chạy qua nhiều harness, mỗi cái tự nạp một tên file khác nhau (Claude Code → CLAUDE.md,
 * Codex/Grok/Copilot/Cursor/Cline/opencode → AGENTS.md, Gemini CLI → GEMINI.md). Luật repo vì thế
 * phải có mặt ở nhiều chỗ — và nhiều bản sao chép tay là công thức chuẩn để chúng lệch nhau trong
 * im lặng, đúng khuôn lỗi mà chính repo này bắt suốt (sửa một chỗ, quên chỗ kia).
 *
 * Trừ Gemini CLI (có cú pháp `@./file.md` nạp xác định), các harness còn lại KHÔNG bảo đảm đi theo
 * con trỏ: Codex ráp prompt bằng thuật toán duyệt thư mục và không có directive import; tài liệu
 * opencode nói thẳng là không tự parse tham chiếu file trong AGENTS.md. Nên bản sao nguyên văn là
 * lựa chọn có chủ đích, và lưới này là cái giá phải trả cho lựa chọn đó.
 */

const GOC = resolve('.');
const doc = (f: string): string => readFileSync(join(GOC, f), 'utf8');

describe('file hướng dẫn harness đồng bộ với nguồn chuẩn AGENTS.md', () => {
  it('AGENTS.md tồn tại và mang đủ luật cứng — đây là nguồn chuẩn liên-công-cụ', () => {
    const s = doc('AGENTS.md');
    expect(s.length).toBeGreaterThan(2000);
    for (const luat of ['⛔C1', '⛔C2', '⛔C3', '⛔C4', '⛔C5', '⛔C6']) {
      expect(s, `AGENTS.md thiếu luật cứng ${luat}`).toContain(luat);
    }
  });

  it('CLAUDE.md khớp AGENTS.md TỪNG KÝ TỰ — sửa một bên là lưới này đỏ', () => {
    // Cách sửa đúng: sửa AGENTS.md rồi `cp AGENTS.md CLAUDE.md`. Đừng sửa tay hai nơi.
    expect(doc('CLAUDE.md')).toBe(doc('AGENTS.md'));
  });

  it('GEMINI.md dùng cú pháp import XÁC ĐỊNH của Gemini CLI, không phải câu văn xuôi', () => {
    // Gemini CLI không tự nạp AGENTS.md, nhưng `@./path.md` được Memory Import Processor chèn
    // nội dung vào lúc nạp — chắc chắn, không phụ thuộc model có chịu mở file hay không.
    const s = doc('GEMINI.md');
    expect(s).toMatch(/^@\.\/AGENTS\.md$/m);
  });

  it('file hướng dẫn Copilot trỏ đúng nguồn chuẩn và tự mang theo luật không-được-quên', () => {
    const s = doc('.github/copilot-instructions.md');
    expect(s).toContain('AGENTS.md');
    // Con trỏ có thể không được đi theo → ba điều nguy hiểm nhất phải nằm ngay trong file
    expect(s).toMatch(/không bao giờ merge/i);
    expect(s).toMatch(/fail-closed/i);
    expect(s).toContain('npm test');
  });

  it('mọi file hướng dẫn đều tồn tại — thêm harness mới thì thêm vào cả bảng lẫn lưới này', () => {
    for (const f of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md']) {
      expect(existsSync(join(GOC, f)), `thiếu ${f}`).toBe(true);
    }
  });

  it('AGENTS.md có bảng liệt kê đúng các file harness — người sửa luật phải thấy ngay còn chỗ nào', () => {
    const s = doc('AGENTS.md');
    for (const f of ['`AGENTS.md`', '`CLAUDE.md`', '`GEMINI.md`', '`.github/copilot-instructions.md`']) {
      expect(s, `bảng file harness trong AGENTS.md thiếu ${f}`).toContain(f);
    }
  });
});
