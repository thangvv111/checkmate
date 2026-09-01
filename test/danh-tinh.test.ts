import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Danh tính và phiên (specs/R11). Lát này tồn tại vì đúng một câu hỏi: «ai đã bấm Merge».
// Bản trước trả lời bằng userInfo().username — tài khoản hệ điều hành — nên sổ ghi cùng một cái tên
// cho mọi người, và một cổng phê duyệt không truy được ai phê duyệt thì không phải cổng.

const thuMuc = mkdtempSync(join(tmpdir(), 'checkmate-dt-'));
process.env.CHECKMATE_DB = join(thuMuc, 'dt.db');

const { openDb, closeDb } = await import('../apps/web/src/store/db.js');
const dt = await import('../apps/web/src/identity.js');

const req = (cookie?: string) => ({ headers: cookie ? { cookie } : {} }) as never;
const cookiePhien = (token: string) => `${dt.SESSION_COOKIE_NAME}=${token}`;

beforeEach(() => {
  openDb().exec('DELETE FROM phien');
  openDb().exec('DELETE FROM nguoi_dung');
});
afterAll(() => {
  closeDb();
  rmSync(thuMuc, { recursive: true, force: true });
});

describe('tên đăng nhập ép khuôn tại nguồn (R11.9)', () => {
  it('nhận tên sạch', () => {
    expect(dt.validName('thang.vv')).toBe(true);
    expect(dt.validName('ci-bot_01')).toBe(true);
  });

  it('từ chối thứ có thể phá HTML hoặc markdown của comment PR', () => {
    // Hai bề mặt sau ĐĂNG CÔNG KHAI và không thu hồi được — chặn ở gốc rẻ hơn nhớ gột ở từng chỗ
    for (const xau of ['<script>', 'a b', 'Thang', 'ab', 'x'.repeat(33), 'ten[md](http://x)', '']) {
      expect(dt.validName(xau), `«${xau}» phải bị từ chối`).toBe(false);
    }
  });

  it('tạo tài khoản với tên xấu thì ném lỗi, không lặng lẽ chuẩn hoá', () => {
    expect(() => dt.createAccount('Thang VV', 'matkhaudumanh1', 'van_hanh')).toThrow(/không hợp lệ/);
  });
});

describe('mật khẩu (R11.5, R11.6, R11.10)', () => {
  it('đúng mật khẩu thì ra danh tính, sai thì null', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'duyet_cong');
    expect(dt.verifyPassword('thang', 'matkhaudumanh1')).toEqual({ ten: 'thang', vai: 'duyet_cong' });
    expect(dt.verifyPassword('thang', 'matkhausai0000')).toBeNull();
  });

  it('không có tài khoản cũng trả null y như sai mật khẩu — không xác nhận tài khoản nào có thật', () => {
    expect(dt.verifyPassword('khong-ton-tai', 'matkhaudumanh1')).toBeNull();
  });

  it('mật khẩu KHÔNG nằm ở dạng đọc được trong cơ sở dữ liệu', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'van_hanh');
    const hang = openDb().prepare('SELECT * FROM nguoi_dung WHERE ten = ?').get('thang') as Record<string, string>;
    expect(JSON.stringify(hang)).not.toContain('matkhaudumanh1');
  });

  it('mật khẩu ngắn bị từ chối — đây là tài khoản mở được cổng merge', () => {
    expect(() => dt.createAccount('thang', 'ngan', 'van_hanh')).toThrow(/12 ký tự/);
  });
});

describe('phiên (R11.11 → R11.13)', () => {
  it('cơ sở dữ liệu chỉ giữ HASH của token, không giữ token thô', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'duyet_cong');
    const { token } = dt.createSession('thang');
    const hang = openDb().prepare('SELECT * FROM phien').get() as Record<string, string>;
    expect(JSON.stringify(hang)).not.toContain(token);
  });

  it('phiên hợp lệ đọc ra đúng người và đúng vai', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'duyet_cong');
    const { token } = dt.createSession('thang');
    expect(dt.getIdentity(req(cookiePhien(token)))).toEqual({ ten: 'thang', vai: 'duyet_cong' });
  });

  it('đăng xuất xoá phiên ở PHÍA MÁY CHỦ — không phải chỉ xoá cookie', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.createSession('thang');
    dt.deleteSession(token);
    // token cũ vẫn nằm trong tay trình duyệt, nhưng phải hết hiệu lực
    expect(() => dt.getIdentity(req(cookiePhien(token)))).toThrow(dt.IdentityError);
  });

  it('phiên hết hạn bị từ chối và bị dọn luôn', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.createSession('thang');
    openDb().prepare('UPDATE phien SET het_han = ?').run('2020-01-01T00:00:00.000Z');
    expect(() => dt.getIdentity(req(cookiePhien(token)))).toThrow(/hết hạn/);
    expect(openDb().prepare('SELECT COUNT(*) AS n FROM phien').get()).toEqual({ n: 0 });
  });

  it('gỡ tài khoản huỷ mọi phiên đang sống của nó (R11.21)', () => {
    // Gỡ mà phiên còn chạy là người đã bị thu quyền vẫn bấm được cổng cho tới khi phiên hết hạn
    dt.createAccount('thang', 'matkhaudumanh1', 'duyet_cong');
    const { token } = dt.createSession('thang');
    dt.deleteAccount('thang');
    expect(() => dt.getIdentity(req(cookiePhien(token)))).toThrow(dt.IdentityError);
  });

  it('đổi mật khẩu cũng giết phiên cũ — đổi vì nghi lộ mà để phiên sống là không đổi gì', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.createSession('thang');
    dt.changePassword('thang', 'matkhaumoidumanh2');
    expect(() => dt.getIdentity(req(cookiePhien(token)))).toThrow(dt.IdentityError);
  });
});

describe('KHÔNG có giá trị mặc định (R11.3)', () => {
  it('không cookie thì NÉM LỖI, không trả về một cái tên nào đó', () => {
    // Chính một `catch { return 'operator' }` đã sinh ra lỗi mà R11 tồn tại để sửa
    expect(() => dt.getIdentity(req())).toThrow(dt.IdentityError);
  });

  it('cookie rác thì ném lỗi, không dựng ra danh tính', () => {
    expect(() => dt.getIdentity(req(cookiePhien('token-bia-dat')))).toThrow(dt.IdentityError);
  });

  it('đọc đúng cookie phiên giữa nhiều cookie khác', () => {
    dt.createAccount('thang', 'matkhaudumanh1', 'van_hanh');
    const { token } = dt.createSession('thang');
    const nhieu = `theme=dark; ${cookiePhien(token)}; khac=1`;
    expect(dt.getIdentity(req(nhieu)).ten).toBe('thang');
  });
});

describe('máy không bao giờ tự merge (R11.18)', () => {
  it('chỉ vai duyet_cong mới bấm được cổng', () => {
    expect(dt.canOperateGate({ ten: 'a', vai: 'duyet_cong' })).toBe(true);
    expect(dt.canOperateGate({ ten: 'ci-bot', vai: 'van_hanh' })).toBe(false);
    expect(dt.canOperateGate({ ten: 'b', vai: 'nguoi_xem' })).toBe(false);
  });

  it('tài khoản tự động bị chặn ở TẦNG VAI, không phải bằng kỷ luật', () => {
    expect(() => dt.requireGateRole({ ten: 'ci-bot', vai: 'van_hanh' })).toThrow(/không được thao tác cổng/);
  });
});

describe('vai tác nhân máy (R11.18b, R6.19)', () => {
  it('vai tu_dong chạy chấm được nhưng KHÔNG sửa cấu hình, KHÔNG merge', () => {
    const bot = { ten: 'ci-bot', vai: 'tu_dong' } as const;
    expect(dt.canRunReview(bot)).toBe(true);
    expect(dt.canEditConfig(bot), 'không cần quyền sửa token và nhà cung cấp model').toBe(false);
    expect(dt.canOperateGate(bot), 'máy không bao giờ tự merge — điều khoản, không phải tuỳ chọn').toBe(false);
  });

  it('tách khỏi van_hanh vì vai đó sửa được cấu hình', () => {
    expect(dt.canEditConfig({ ten: 'a', vai: 'van_hanh' })).toBe(true);
    expect(dt.canEditConfig({ ten: 'ci-bot', vai: 'tu_dong' })).toBe(false);
  });

  it('người xem không chạy chấm được', () => {
    expect(dt.canRunReview({ ten: 'b', vai: 'nguoi_xem' })).toBe(false);
  });

  it('KHÔNG vai nào ngoài duyet_cong mở được cổng merge', () => {
    for (const vai of ['nguoi_xem', 'tu_dong', 'van_hanh'] as const) {
      expect(dt.canOperateGate({ ten: 'x', vai }), `vai ${vai} không được merge`).toBe(false);
    }
    expect(dt.canOperateGate({ ten: 'y', vai: 'duyet_cong' })).toBe(true);
  });
});
