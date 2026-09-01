import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Sổ hành động cổng (specs/R9.6): ai merge, ai trả về, và CHẤP NHẬN CẢNH BÁO NÀO.
// Câu người kiểm toán hỏi là «ai đã đồng ý bỏ qua cảnh báo nào» — một con số đếm không trả lời được.

const thuMuc = mkdtempSync(join(tmpdir(), 'checkmate-cong-'));
process.env.CHECKMATE_DB = join(thuMuc, 'cong.db');

const { openDb, closeDb } = await import('../apps/web/src/store/db.js');
const { readGateLedger } = await import('../apps/web/src/store/ledger-store.js');
const { appendGateLedgerEntry } = await import('../apps/web/src/gate.js');

afterAll(() => {
  closeDb();
  rmSync(thuMuc, { recursive: true, force: true });
});

describe('sổ hành động cổng giữ đủ dấu vết', () => {
  it('giữ DANH SÁCH cảnh báo medium đã chấp nhận, không chỉ con số đếm', () => {
    appendGateLedgerEntry({ hanhDong: 'merge', run_id: 'r-ds', nguoi: 'thang', xac_nhan_medium: ['F2', 'F5', 'F9'] });
    const ct = readGateLedger('r-ds')[0]?.chi_tiet ?? '';
    expect(ct).toContain('F2');
    expect(ct).toContain('F5');
    expect(ct).toContain('F9');
  });

  it('ghi chú của người và danh sách đã chấp nhận trả lời hai câu khác nhau — giữ cả hai', () => {
    appendGateLedgerEntry({ hanhDong: 'merge', run_id: 'r-hai', nguoi: 'thang', ghi_chu: 'gấp cho demo', xac_nhan_medium: ['F1'] });
    const ct = readGateLedger('r-hai')[0]?.chi_tiet ?? '';
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
      appendGateLedgerEntry({ hanhDong: 'merge', nguoi: 'thang' }); // thiếu run_id
    } finally {
      console.error = cu;
    }
    expect(kêu.join('\n')).toMatch(/KHÔNG ghi được|mất khỏi sổ/i);
  });
});

describe('tự duyệt: ghi dấu, không chặn (R11.17)', () => {
  it('người bấm trùng tác giả PR thì sổ ghi dấu cảnh báo — nhưng vẫn ghi được hàng', () => {
    appendGateLedgerEntry({ hanhDong: 'merge', run_id: 'r-tu', nguoi: 'thang.vv', tac_gia_pr: 'thang.vv' });
    const h = readGateLedger('r-tu')[0];
    expect(h?.chi_tiet ?? '').toMatch(/tự duyệt/i);
    expect(h?.tac_gia_pr).toBe('thang.vv');
  });

  it('người bấm KHÁC tác giả PR thì không dựng cảnh báo oan', () => {
    appendGateLedgerEntry({ hanhDong: 'merge', run_id: 'r-khac', nguoi: 'thang.vv', tac_gia_pr: 'nguoi-khac' });
    expect(readGateLedger('r-khac')[0]?.chi_tiet ?? '').not.toMatch(/tự duyệt/i);
  });

  it('đóng băng tác giả PR vào chính hàng sổ, không phải tra sang bảng run (R11.16)', () => {
    appendGateLedgerEntry({ hanhDong: 'reject', run_id: 'r-bang', nguoi: 'ai-do', tac_gia_pr: 'tac-gia-x' });
    expect(readGateLedger('r-bang')[0]?.tac_gia_pr).toBe('tac-gia-x');
  });
});

describe('so tên người bấm với tác giả PR', () => {
  it('bỏ qua khác biệt dấu chấm/gạch và hoa thường', async () => {
    const { samePerson } = await import('../apps/web/src/gate.js');
    expect(samePerson('thang.vv', 'thang-vv')).toBe(true);
    expect(samePerson('Thang_VV', 'thangvv')).toBe(true);
  });

  it('cố ý bắt SÓT hơn bắt OAN — hai người khác nhau không bị gộp', async () => {
    const { samePerson } = await import('../apps/web/src/gate.js');
    // Bắt oan thì cảnh báo dựng lên đúng lúc cần merge gấp, và lần sau không ai đọc cảnh báo nữa
    expect(samePerson('thang.vv', 'thang.vy')).toBe(false);
    expect(samePerson('', 'thang.vv')).toBe(false);
  });
});

describe('sổ phân biệt người trả về với máy trả về (R6.18)', () => {
  it('hành động do máy được ghi dấu rõ trong sổ', () => {
    // Hai chuyện có mức trách nhiệm khác nhau — kiểm toán phải phân biệt được
    appendGateLedgerEntry({ hanhDong: 'reject', run_id: 'r-may', nguoi: 'ci-bot', tu_dong: true, tac_gia_pr: 'ai-do' });
    expect(readGateLedger('r-may')[0]?.chi_tiet ?? '').toMatch(/TÁC NHÂN MÁY/i);
  });

  it('hành động do người thì KHÔNG mang dấu đó', () => {
    appendGateLedgerEntry({ hanhDong: 'reject', run_id: 'r-nguoi', nguoi: 'thang.vv', tac_gia_pr: 'ai-do' });
    expect(readGateLedger('r-nguoi')[0]?.chi_tiet ?? '').not.toMatch(/TÁC NHÂN MÁY/i);
  });
});
