import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Sổ hành động cổng (specs/R9.6): ai merge, ai trả về, và CHẤP NHẬN CẢNH BÁO NÀO.
// Câu người kiểm toán hỏi là «ai đã đồng ý bỏ qua cảnh báo nào» — một con số đếm không trả lời được.

const thuMuc = mkdtempSync(join(tmpdir(), 'checkmate-cong-'));
process.env.CHECKMATE_DB = join(thuMuc, 'cong.db');

const { moDb, dongDb } = await import('../apps/web/src/kho/db.js');
const { docSoCong } = await import('../apps/web/src/kho/kho-socai.js');
const { ghiSo } = await import('../apps/web/src/cong.js');

afterAll(() => {
  dongDb();
  rmSync(thuMuc, { recursive: true, force: true });
});

describe('sổ hành động cổng giữ đủ dấu vết', () => {
  it('giữ DANH SÁCH cảnh báo medium đã chấp nhận, không chỉ con số đếm', () => {
    ghiSo({ hanhDong: 'merge', run_id: 'r-ds', nguoi: 'thang', xac_nhan_medium: ['F2', 'F5', 'F9'] });
    const ct = docSoCong('r-ds')[0]?.chi_tiet ?? '';
    expect(ct).toContain('F2');
    expect(ct).toContain('F5');
    expect(ct).toContain('F9');
  });

  it('ghi chú của người và danh sách đã chấp nhận trả lời hai câu khác nhau — giữ cả hai', () => {
    ghiSo({ hanhDong: 'merge', run_id: 'r-hai', nguoi: 'thang', ghi_chu: 'gấp cho demo', xac_nhan_medium: ['F1'] });
    const ct = docSoCong('r-hai')[0]?.chi_tiet ?? '';
    expect(ct).toContain('gấp cho demo');
    expect(ct).toContain('F1');
  });

  it('hành động không dựng được hàng thì phải KÊU, không nuốt im lặng', () => {
    // Sổ kiểm toán mất hàng mà không ai hay còn tệ hơn sổ có hàng xấu: người merge vẫn merge thật,
    // chỉ có sổ là không biết.
    const kêu: string[] = [];
    const cu = console.error;
    console.error = (...a: unknown[]) => { kêu.push(a.join(' ')); };
    try {
      ghiSo({ hanhDong: 'merge', nguoi: 'thang' }); // thiếu run_id
    } finally {
      console.error = cu;
    }
    expect(kêu.join('\n')).toMatch(/KHÔNG ghi được|mất khỏi sổ/i);
  });
});
