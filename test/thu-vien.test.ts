import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync, readdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Thư viện probe tích luỹ (specs/R8-chay-song-song.md).
// Hai lượt chấm cùng repo chạy song song là bình thường, và mỗi lượt là một TIẾN TRÌNH riêng —
// nên đọc→sửa→ghi vào sổ thư viện phải nằm trong khoá, kẻo lượt sau nuốt mất probe của lượt trước.

const goc = mkdtempSync(join(tmpdir(), 'checkmate-lib-'));
process.env.CHECKER_LIB_DIR = goc;

const { nhanVaoThuVien, docThuVien, voiKhoaThuVien } = await import('../packages/harness/src/thu-vien.js');

const SLUG = 'repo-thu';
const plan = [{ id: 'P1', ten: 't', muc_dich: 'm', spec_rule: 'R1', ky_vong: 'k' }];

beforeEach(() => {
  rmSync(join(goc, SLUG), { recursive: true, force: true });
});
afterAll(() => {
  rmSync(goc, { recursive: true, force: true });
});

describe('nhanVaoThuVien', () => {
  it('nhận probe mới và đọc lại được', () => {
    const ten = nhanVaoThuVien(SLUG, 'const a = 1;', plan, 'abc1234def');
    expect(ten).toBeTruthy();
    expect(docThuVien(SLUG).map((b) => b.code)).toEqual(['const a = 1;']);
  });

  it('trùng nội dung thì từ chối, không đẻ file thứ hai', () => {
    nhanVaoThuVien(SLUG, 'const a = 1;', plan, 'abc1234def');
    expect(nhanVaoThuVien(SLUG, 'const a = 1;', plan, 'zzz9999aaa')).toBeNull();
    expect(docThuVien(SLUG)).toHaveLength(1);
  });

  it('tên file lấy hậu tố từ hash nội dung, không từ số thứ tự', () => {
    // Hai probe khác nội dung sinh ra TỪ CÙNG một commit vẫn phải ra hai tên khác nhau —
    // số thứ tự thì hai lượt song song cùng tính ra một số rồi đạp lên file của nhau.
    const a = nhanVaoThuVien(SLUG, 'const a = 1;', plan, 'abc1234def');
    const b = nhanVaoThuVien(SLUG, 'const b = 2;', plan, 'abc1234def');
    expect(a).not.toBe(b);
    expect(docThuVien(SLUG)).toHaveLength(2);
  });

  it('giữ trần 12 file, đẩy file cũ nhất ra và xoá khỏi đĩa', () => {
    for (let i = 0; i < 15; i++) nhanVaoThuVien(SLUG, `const x = ${i};`, plan, `sha${i}0000`);
    const con = docThuVien(SLUG);
    expect(con).toHaveLength(12);
    expect(con[0].code).toBe('const x = 3;'); // ba file đầu bị đẩy ra
    const trenDia = readdirSync(join(goc, SLUG)).filter((f) => f.endsWith('.probe.test.ts'));
    expect(trenDia).toHaveLength(12); // không để lại file mồ côi
  });
});

describe('voiKhoaThuVien', () => {
  it('nhả khoá sau khi xong để lượt sau vào được', () => {
    voiKhoaThuVien(SLUG, () => 1);
    expect(existsSync(join(goc, SLUG, '.khoa'))).toBe(false);
    expect(voiKhoaThuVien(SLUG, () => 2)).toBe(2);
  });

  it('việc bên trong ném lỗi thì khoá vẫn phải được nhả', () => {
    expect(() =>
      voiKhoaThuVien(SLUG, () => {
        throw new Error('hỏng');
      }),
    ).toThrow('hỏng');
    expect(existsSync(join(goc, SLUG, '.khoa'))).toBe(false);
  });

  it('khoá của tiến trình đã chết bị phá, thư viện không đứng hình vĩnh viễn', () => {
    // Khoá cũ hơn ngưỡng quá hạn = chủ của nó đã chết. Đặt mtime lùi lại để khỏi chờ thật.
    mkdirSync(join(goc, SLUG, '.khoa'), { recursive: true });
    const cu = new Date(Date.now() - 5 * 60_000);
    utimesSync(join(goc, SLUG, '.khoa'), cu, cu);
    expect(voiKhoaThuVien(SLUG, () => 'vào được')).toBe('vào được');
  });
});
