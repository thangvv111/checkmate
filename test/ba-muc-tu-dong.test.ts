import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Ba mức tự động ở cổng (specs/R6.15–R6.19). Nguyên tắc chi phối: tự động hoá được phép nói KHÔNG,
// không được phép nói CÓ. Merge là cho code vào trunk — rủi ro một chiều, phải người quyết. Trả về dev
// là KHÔNG cho vào trunk — sai thì chỉ tốn công mở lại.

const goc = mkdtempSync(join(tmpdir(), 'checkmate-tudong-'));
process.env.CHECKMATE_GOC = goc;
const cfg = await import('../apps/web/src/config.js');

describe('ba công tắc RIÊNG, không gộp (R6.15)', () => {
  it('mặc định: đăng verdict và gắn trạng thái BẬT, đóng PR TẮT', () => {
    // Mức gây hại khác hẳn nhau: một comment gần như vô hại, còn đóng PR thì người viết phải mở lại.
    // Gộp làm một nghĩa là ai muốn có comment tự động cũng phải chấp nhận máy đóng PR của mình.
    const c = cfg.docConfig();
    expect(c.truc.tu_dong_comment).toBe(true);
    expect(c.truc.tu_dong_trang_thai).toBe(true);
    expect(c.truc.tu_dong_tra_ve, 'đóng PR phải mặc định TẮT').toBe(false);
  });

  it('ba cờ độc lập — bật cái này không kéo theo cái kia', () => {
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ truc: { bat: false, chu_ky_giay: 300, tu_dong_comment: false, tu_dong_trang_thai: true, tu_dong_tra_ve: true } }),
      'utf8',
    );
    const c = cfg.docConfig();
    expect(c.truc.tu_dong_comment).toBe(false);
    expect(c.truc.tu_dong_trang_thai).toBe(true);
    expect(c.truc.tu_dong_tra_ve).toBe(true);
  });

  it('cấu hình đời cũ thiếu hai cờ mới thì nhận mặc định, không thành undefined', () => {
    // Máy chủ đang chạy có config chỉ với tu_dong_comment — nâng cấp không được làm nó mất cờ nào
    writeFileSync(join(goc, 'config.json'), JSON.stringify({ truc: { bat: true, chu_ky_giay: 300, tu_dong_comment: true } }), 'utf8');
    const c = cfg.docConfig();
    expect(c.truc.tu_dong_trang_thai).toBe(true);
    expect(c.truc.tu_dong_tra_ve).toBe(false);
  });
});

afterAll(() => rmSync(goc, { recursive: true, force: true }));
