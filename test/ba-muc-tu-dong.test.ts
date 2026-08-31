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

describe('cửa ĐỌC cấu hình cũng phải gác giới hạn model (R5.15) — Opus bắt ở vòng ba', () => {
  it('config sửa tay mang tổ hợp cấm thì đọc lên đã rơi về model hợp lệ, có kêu', () => {
    // Ba cửa giao diện (form, cổng kiểm, select) đều gác — nhưng config.json sửa tay là đường cứu hộ
    // hợp lệ (R9.13), và MỌI lượt chấm đi qua cửa đọc. Khai «mọi cửa phải tôn trọng» rồi bỏ sót đúng
    // cửa thật là pull request tự mâu thuẫn.
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'api', model: 'claude-fable-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    const c = cfg.docConfig();
    // R5.17 — đường CHẤM từ chối với lời rõ (không dùng nguyên, không thay hộ: tổ hợp thay chưa qua
    // cổng kiểm — vòng năm của Opus bắt đúng bản vá rơi-mềm vì lý do đó)
    expect(() => cfg.cauHinhDeCham(c)).toThrow(/không được phép|Kiểm tra/);
    // còn đường HIỂN THỊ trả nguyên vẹn để màn Cấu hình render được cho người dùng sửa
    const hienTai = cfg.cauHinhHienTai(c);
    expect(hienTai.model).toBe('claude-fable-5');
    expect(hienTai.phuong_thuc).toBe('api');
  });

  it('tổ hợp hợp lệ thì đi qua nguyên vẹn — không được âm thầm đổi model của người ta', () => {
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'thue_bao', model: 'claude-fable-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(cfg.cauHinhHienTai(cfg.docConfig()).model).toBe('claude-fable-5');
    // và đường chấm cũng đi qua nguyên vẹn — không được âm thầm đổi model của người ta
    expect(cfg.cauHinhDeCham(cfg.docConfig()).model).toBe('claude-fable-5');
  });
});

describe('cửa đọc không được ném với config KHUYẾT — vòng bốn của Opus', () => {
  it('config sửa tay thiếu trường model thì rơi về mặc định, không TypeError', () => {
    // Đường cứu hộ (R9.13) không hứa hình dạng đủ — đường cứu hộ ném TypeError thì hết là đường cứu hộ
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'api' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    const hienTai = cfg.cauHinhHienTai(cfg.docConfig());
    expect(typeof hienTai.model).toBe('string');
    expect(hienTai.model.length).toBeGreaterThan(0);
  });

  it('đường CHẤM: phương thức lạ thì HỎI như model khuyết — áp đều tay (vòng bảy)', () => {
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'phuong-thuc-bia', model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhDeCham(cfg.docConfig())).toThrow(/phương thức không hỗ trợ/);
  });

  it('đường CHẤM: nhà cung cấp KHUYẾT CẢ CỤM cấu hình thì hỏi, không tự điền (vòng bảy)', () => {
    // Dùng ncc 'google' — anthropic LUÔN có cấu hình mặc định sản phẩm (bản cài mới chạy được demo,
    // tổ hợp lành, có chủ đích qua nangCapAgent). Ca khuyết-cả-cụm thật là đổi sang ncc chưa từng
    // được cấu hình: đường chấm phải hỏi, không tự dựng cấu hình từ không khí.
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'google', ncc_cau_hinh: {}, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhDeCham(cfg.docConfig())).toThrow(/chưa được cấu hình/);
  });

  it('phương thức lạ trong config tay cũng rơi về mặc định', () => {
    writeFileSync(
      join(goc, 'config.json'),
      JSON.stringify({ agent: { ncc: 'anthropic', ncc_cau_hinh: { anthropic: { phuong_thuc: 'phuong-thuc-bia', model: 'claude-sonnet-5' } }, max_probe: 6, skeptic: true } }),
      'utf8',
    );
    expect(() => cfg.cauHinhHienTai(cfg.docConfig())).not.toThrow();
  });
});
