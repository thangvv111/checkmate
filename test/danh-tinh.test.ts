import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Danh tính và phiên (specs/R11). Lát này tồn tại vì đúng một câu hỏi: «ai đã bấm Merge».
// Bản trước trả lời bằng userInfo().username — tài khoản hệ điều hành — nên sổ ghi cùng một cái tên
// cho mọi người, và một cổng phê duyệt không truy được ai phê duyệt thì không phải cổng.

const thuMuc = mkdtempSync(join(tmpdir(), 'checkmate-dt-'));
process.env.CHECKMATE_DB = join(thuMuc, 'dt.db');

const { moDb, dongDb } = await import('../apps/web/src/kho/db.js');
const dt = await import('../apps/web/src/danh-tinh.js');

const req = (cookie?: string) => ({ headers: cookie ? { cookie } : {} }) as never;
const cookiePhien = (token: string) => `${dt.TEN_COOKIE_PHIEN}=${token}`;

beforeEach(() => {
  moDb().exec('DELETE FROM phien');
  moDb().exec('DELETE FROM nguoi_dung');
});
afterAll(() => {
  dongDb();
  rmSync(thuMuc, { recursive: true, force: true });
});

describe('tên đăng nhập ép khuôn tại nguồn (R11.9)', () => {
  it('nhận tên sạch', () => {
    expect(dt.hopLeTen('thang.vv')).toBe(true);
    expect(dt.hopLeTen('ci-bot_01')).toBe(true);
  });

  it('từ chối thứ có thể phá HTML hoặc markdown của comment PR', () => {
    // Hai bề mặt sau ĐĂNG CÔNG KHAI và không thu hồi được — chặn ở gốc rẻ hơn nhớ gột ở từng chỗ
    for (const xau of ['<script>', 'a b', 'Thang', 'ab', 'x'.repeat(33), 'ten[md](http://x)', '']) {
      expect(dt.hopLeTen(xau), `«${xau}» phải bị từ chối`).toBe(false);
    }
  });

  it('tạo tài khoản với tên xấu thì ném lỗi, không lặng lẽ chuẩn hoá', () => {
    expect(() => dt.taoTaiKhoan('Thang VV', 'matkhaudumanh1', 'van_hanh')).toThrow(/không hợp lệ/);
  });
});

describe('mật khẩu (R11.5, R11.6, R11.10)', () => {
  it('đúng mật khẩu thì ra danh tính, sai thì null', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'duyet_cong');
    expect(dt.kiemMatKhau('thang', 'matkhaudumanh1')).toEqual({ ten: 'thang', vai: 'duyet_cong' });
    expect(dt.kiemMatKhau('thang', 'matkhausai0000')).toBeNull();
  });

  it('không có tài khoản cũng trả null y như sai mật khẩu — không xác nhận tài khoản nào có thật', () => {
    expect(dt.kiemMatKhau('khong-ton-tai', 'matkhaudumanh1')).toBeNull();
  });

  it('mật khẩu KHÔNG nằm ở dạng đọc được trong cơ sở dữ liệu', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'van_hanh');
    const hang = moDb().prepare('SELECT * FROM nguoi_dung WHERE ten = ?').get('thang') as Record<string, string>;
    expect(JSON.stringify(hang)).not.toContain('matkhaudumanh1');
  });

  it('mật khẩu ngắn bị từ chối — đây là tài khoản mở được cổng merge', () => {
    expect(() => dt.taoTaiKhoan('thang', 'ngan', 'van_hanh')).toThrow(/12 ký tự/);
  });
});

describe('phiên (R11.11 → R11.13)', () => {
  it('cơ sở dữ liệu chỉ giữ HASH của token, không giữ token thô', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'duyet_cong');
    const { token } = dt.taoPhien('thang');
    const hang = moDb().prepare('SELECT * FROM phien').get() as Record<string, string>;
    expect(JSON.stringify(hang)).not.toContain(token);
  });

  it('phiên hợp lệ đọc ra đúng người và đúng vai', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'duyet_cong');
    const { token } = dt.taoPhien('thang');
    expect(dt.layDanhTinh(req(cookiePhien(token)))).toEqual({ ten: 'thang', vai: 'duyet_cong' });
  });

  it('đăng xuất xoá phiên ở PHÍA MÁY CHỦ — không phải chỉ xoá cookie', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.taoPhien('thang');
    dt.xoaPhien(token);
    // token cũ vẫn nằm trong tay trình duyệt, nhưng phải hết hiệu lực
    expect(() => dt.layDanhTinh(req(cookiePhien(token)))).toThrow(dt.LoiDanhTinh);
  });

  it('phiên hết hạn bị từ chối và bị dọn luôn', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.taoPhien('thang');
    moDb().prepare('UPDATE phien SET het_han = ?').run('2020-01-01T00:00:00.000Z');
    expect(() => dt.layDanhTinh(req(cookiePhien(token)))).toThrow(/hết hạn/);
    expect(moDb().prepare('SELECT COUNT(*) AS n FROM phien').get()).toEqual({ n: 0 });
  });

  it('gỡ tài khoản huỷ mọi phiên đang sống của nó (R11.21)', () => {
    // Gỡ mà phiên còn chạy là người đã bị thu quyền vẫn bấm được cổng cho tới khi phiên hết hạn
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'duyet_cong');
    const { token } = dt.taoPhien('thang');
    dt.xoaTaiKhoan('thang');
    expect(() => dt.layDanhTinh(req(cookiePhien(token)))).toThrow(dt.LoiDanhTinh);
  });

  it('đổi mật khẩu cũng giết phiên cũ — đổi vì nghi lộ mà để phiên sống là không đổi gì', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.taoPhien('thang');
    dt.doiMatKhau('thang', 'matkhaumoidumanh2');
    expect(() => dt.layDanhTinh(req(cookiePhien(token)))).toThrow(dt.LoiDanhTinh);
  });
});

describe('KHÔNG có giá trị mặc định (R11.3)', () => {
  it('không cookie thì NÉM LỖI, không trả về một cái tên nào đó', () => {
    // Chính một `catch { return 'operator' }` đã sinh ra lỗi mà R11 tồn tại để sửa
    expect(() => dt.layDanhTinh(req())).toThrow(dt.LoiDanhTinh);
  });

  it('cookie rác thì ném lỗi, không dựng ra danh tính', () => {
    expect(() => dt.layDanhTinh(req(cookiePhien('token-bia-dat')))).toThrow(dt.LoiDanhTinh);
  });

  it('đọc đúng cookie phiên giữa nhiều cookie khác', () => {
    dt.taoTaiKhoan('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.taoPhien('thang');
    const nhieu = `theme=dark; ${cookiePhien(token)}; khac=1`;
    expect(dt.layDanhTinh(req(nhieu)).ten).toBe('thang');
  });
});

describe('máy không bao giờ tự merge (R11.18)', () => {
  it('chỉ vai duyet_cong mới bấm được cổng', () => {
    expect(dt.duocBamCong({ ten: 'a', vai: 'duyet_cong' })).toBe(true);
    expect(dt.duocBamCong({ ten: 'ci-bot', vai: 'van_hanh' })).toBe(false);
    expect(dt.duocBamCong({ ten: 'b', vai: 'nguoi_xem' })).toBe(false);
  });

  it('tài khoản tự động bị chặn ở TẦNG VAI, không phải bằng kỷ luật', () => {
    expect(() => dt.epBamCong({ ten: 'ci-bot', vai: 'van_hanh' })).toThrow(/không được thao tác cổng/);
  });
});
