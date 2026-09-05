import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lưới cho capability `identity-session`.
 *
 * Phần lớn nhóm R11 đã được `test/danh-tinh.test.ts` khoá (22 ca). File này lo đúng bảy điều KHÔNG ca nào
 * khoá, và hai trong số đó đang được giữ bằng **kỷ luật** chứ không bằng máy — đó là phần đáng giá nhất.
 */

const WEB = 'apps/web/src';

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkTs(p, acc);
    else if (name.endsWith('.ts')) acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
}

// ---------------------------------------------------------------- R11.20

/**
 * Chỗ hợp lệ duy nhất được đọc bảng tài khoản. Danh sách CHO PHÉP — file mới mặc định KHÔNG được đọc,
 * không phải nhớ cấm.
 */
const ACCOUNT_READERS_ALLOWED = [
  `${WEB}/identity.ts`, // cửa duy nhất của luật danh tính
  `${WEB}/store/db.ts`, // khai schema
  `${WEB}/cli-tai-khoan.ts`, // công cụ quản trị chạy TRÊN MÁY CHỦ (R11.19)
];

/** Bảng tài khoản, và hàm liệt kê nó — hai đường dẫn tới cùng một dữ liệu. */
export function scanAccountReaders(files: readonly string[], doc: (f: string) => string): string[] {
  const viPham: string[] = [];
  for (const f of files) {
    if (ACCOUNT_READERS_ALLOWED.includes(f)) continue;
    const txt = doc(f);
    // Quét tên hàm THÔI thì một route đọc thẳng SQL sẽ lọt — nên bắt cả tên bảng.
    if (/\blistAccounts\s*\(/.test(txt)) viPham.push(`${f}: gọi listAccounts()`);
    if (/\bnguoi_dung\b/.test(txt)) viPham.push(`${f}: chạm bảng nguoi_dung`);
  }
  return viPham;
}

describe('R11.20 — không bề mặt nào phát danh sách tài khoản', () => {
  it('mã nguồn hiện tại: không file nào ngoài danh sách cho phép đọc bảng tài khoản', () => {
    // Luật này TRƯỚC change chỉ đúng vì chưa ai viết route ấy — giữ bằng kỷ luật, không bằng máy. Danh
    // sách tài khoản của một hệ mở được cổng merge cho biết đúng những cái tên đáng đi đoán mật khẩu.
    const viPham = scanAccountReaders(walkTs(WEB), (f) => readFileSync(f, 'utf8'));
    expect(viPham, `đọc bảng tài khoản ngoài chỗ cho phép:\n  ${viPham.join('\n  ')}`).toEqual([]);
  });

  it('fixture đối kháng: một route gọi listAccounts thì lưới ĐỎ', () => {
    // Ca load-bearing. Một phép quét trả rỗng trông giống hệt «repo sạch» và «phép quét hỏng»; ca này
    // phân biệt hai trạng thái đó.
    const ra = scanAccountReaders(
      [`${WEB}/route-gia.ts`],
      () => `app.get('/api/accounts', (_q, res) => res.json(listAccounts()));`,
    );
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('route-gia.ts');
    expect(ra[0]).toContain('listAccounts');
  });

  it('fixture đối kháng: một route đọc THẲNG SQL cũng bị bắt', () => {
    const ra = scanAccountReaders([`${WEB}/route-gia.ts`], () => `db.prepare('SELECT ten, vai FROM nguoi_dung').all()`);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('nguoi_dung');
  });

  it('công cụ dòng lệnh gọi được — đó là chỗ hợp lệ duy nhất (R11.19)', () => {
    const ra = scanAccountReaders([`${WEB}/cli-tai-khoan.ts`], () => 'const ds = listAccounts();');
    expect(ra).toEqual([]);
  });
});

// ---------------------------------------------------------------- R11.4

/**
 * Chỗ được phép đọc cookie phiên, kèm LÝ DO — hai chỗ này làm hai việc khác nhau:
 * `identity.ts` dựng danh tính (cửa duy nhất của luật), `server.ts` xoá phiên lúc đăng xuất (R11.13).
 *
 * Lưới không phân biệt được «đọc để dựng danh tính» với «đọc để xoá» — nên nó dùng danh sách vị trí, và
 * chỗ thứ ba phải giải trình trong pull request chứ không lặng lẽ đi qua.
 */
const COOKIE_READERS_ALLOWED = [`${WEB}/identity.ts`, `${WEB}/server.ts`];

export function scanCookieReaders(files: readonly string[], doc: (f: string) => string): string[] {
  return files.filter((f) => !COOKIE_READERS_ALLOWED.includes(f) && /\breadCookie\s*\(/.test(doc(f)));
}

describe('R11.4 — danh tính đọc qua đúng một cửa', () => {
  it('mã nguồn hiện tại: không cửa thứ ba nào đọc cookie phiên', () => {
    const viPham = scanCookieReaders(walkTs(WEB), (f) => readFileSync(f, 'utf8'));
    expect(viPham, `đọc cookie phiên ngoài chỗ cho phép:\n  ${viPham.join('\n  ')}`).toEqual([]);
  });

  it('fixture đối kháng: một cửa thứ hai đọc thẳng cookie thì lưới ĐỎ', () => {
    // Cửa thứ hai là chỗ luật KHÔNG đi qua — không kiểm hạn, không kiểm tài khoản còn tồn tại — và nó
    // trông y hệt code đúng.
    const ra = scanCookieReaders([`${WEB}/cua-hai.ts`], () => `const t = readCookie(req, 'cm_sess');`);
    expect(ra).toEqual([`${WEB}/cua-hai.ts`]);
  });

  it('hàm bao ngoài phải GỌI LẠI cửa duy nhất, không tự đọc cookie', async () => {
    // `identityIfAny` chỉ được biến lỗi thành null; nếu nó tự đọc cookie thì có hai đường vào và một
    // đường sẽ quên kiểm hạn.
    const src = readFileSync(`${WEB}/identity.ts`, 'utf8');
    const than = src.slice(src.indexOf('export function identityIfAny'));
    expect(than).toContain('getIdentity(req)');
  });
});

// ---------------------------------------------------------------- R11.14

describe('R11.14 — cookie phiên: ba cờ, ba đường tấn công khác nhau', () => {
  const dungCookie = async (proto: unknown) => {
    const { buildSessionCookie } = await import('../apps/web/src/session-gate.js');
    return buildSessionCookie(proto, 'cm_sess', 'tok', new Date('2026-09-04T00:00:00Z'));
  };

  it('HTTP: có HttpOnly — thiếu nó thì một lỗ XSS đọc được token phiên', async () => {
    expect(await dungCookie(undefined)).toContain('HttpOnly');
  });

  it('HTTP: có SameSite — thiếu nó thì trang khác bấm được cổng merge thay người dùng', async () => {
    expect(await dungCookie(undefined)).toContain('SameSite=Lax');
  });

  it('HTTP: KHÔNG có Secure', async () => {
    expect(await dungCookie('http')).not.toContain('Secure');
  });

  it('HTTPS: đủ cả ba cờ', async () => {
    const c = await dungCookie('https');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Secure');
  });

  it('header proxy nhiều giá trị thì lấy giá trị ĐẦU', async () => {
    // `x-forwarded-proto: https, http` xảy ra khi có nhiều lớp proxy. Lấy nhầm giá trị cuối là mất
    // `Secure` trên đúng những triển khai có nhiều lớp nhất.
    expect(await dungCookie('https, http')).toContain('Secure');
  });
});

// ---------------------------------------------------------------- R11.2

describe('R11.2 — không phiên hợp lệ thì chặn, kể cả khi lớp ngoài đã cho qua', () => {
  const gate = async () => (await import('../apps/web/src/session-gate.js')).evaluateSessionGate;

  it('đường thường + không phiên → CHẶN', async () => {
    const qd = (await gate())({ path: '/runs', hasSession: false, method: 'GET', originalUrl: '/runs' });
    expect(qd.pass).toBe(false);
  });

  it('đường trong danh sách cho phép + không phiên → cho qua', async () => {
    for (const p of ['/login', '/logout', '/health']) {
      expect((await gate())({ path: p, hasSession: false }).pass).toBe(true);
    }
  });

  it('có phiên → cho qua', async () => {
    expect((await gate())({ path: '/runs', hasSession: true }).pass).toBe(true);
  });

  it('đường API bị chặn → trả JSON, KHÔNG trả HTML chuyển hướng', async () => {
    // Client gọi API mà nhận HTML thì lỗi biến thành «JSON hỏng» — lại một ca báo sai bản chất.
    const qd = (await gate())({ path: '/api/runs', hasSession: false });
    expect(qd).toMatchObject({ pass: false, as: 'json', status: 401 });
  });

  it('⛔ văn bản của gác không còn biện minh bằng «đã có lớp ngoài»', () => {
    // Sau khi Basic Auth bị gỡ, một comment nói «kể cả khi lớp ngoài đã cho qua» là văn bản ĐANG SAI —
    // và người sửa sau đọc comment chứ không đọc lịch sử change. Gỡ lớp ngoài KHÔNG đổi hành vi của gác
    // này; nó đổi HẬU QUẢ của một lỗ trong gác: trước còn một lớp nữa che, nay là lỗ ra thẳng Internet.
    const src = readFileSync(join(process.cwd(), 'apps/web/src/session-gate.ts'), 'utf8');
    expect(src).toMatch(/lớp DUY NHẤT/);
    expect(src, 'phải nói rõ Basic Auth ĐÃ ĐƯỢC GỠ, không phải «sẽ gỡ»').toMatch(/đã được gỡ|ĐÃ ĐƯỢC GỠ/);
  });

  it('đường trang bị chặn → chuyển hướng về màn đăng nhập, mang theo đường quay lại', async () => {
    const qd = (await gate())({ path: '/runs', hasSession: false, method: 'GET', originalUrl: '/runs?x=1' });
    expect(qd).toMatchObject({ pass: false, as: 'redirect', status: 303 });
    if (qd.pass === false && qd.as === 'redirect') expect(qd.to).toContain(encodeURIComponent('/runs?x=1'));
  });

  it('danh sách đường mở đúng nội dung đã chốt — thêm một đường làm ca này ĐỎ', async () => {
    // Nới danh sách này là mở một cửa vào hệ thống. Khoá nội dung để việc đó thành thay đổi nhìn thấy
    // được, chứ không lặng lẽ đi qua review.
    //
    // 05/09 — `github-webhook` thêm `/api/webhook/github`. Ca này ĐÃ ĐỎ đúng như thiết kế của nó
    // (change ấy D6: «nó đỏ là Ý MUỐN, không phải phiền toái phải né»), và đây là lần sửa có lý do:
    // đó là đường ĐẦU TIÊN vừa không cần phiên vừa gây tác dụng phụ. Nó đứng được trong danh sách này
    // nhờ hai gác riêng — HMAC trên raw body, và repo phải đã khai — chứ không nhờ được miễn.
    const { OPEN_PATHS } = await import('../apps/web/src/session-gate.js');
    expect([...OPEN_PATHS].sort()).toEqual(['/api/webhook/github', '/health', '/login', '/logout']);
  });
});

// ------------------------------------------- R11.10 × login-throttle

describe('R11.10 + login-throttle — từ chối vì TẦN SUẤT là trạng thái RIÊNG', () => {
  it('trạng thái tần suất tách bạch với «sai mật khẩu»', async () => {
    // R11.10 giấu *tài khoản nào có thật*. Thông điệp tần suất chỉ nói về *hành vi của chính người đang
    // gõ*, thứ họ đã biết — nên nó được phép nói ra, và PHẢI nói ra: gộp vào «sai mật khẩu» thì người
    // vận hành gõ sai vài lần sẽ thấy mật khẩu ĐÚNG bị báo là sai rồi đi đổi mật khẩu, tức hỏng một thứ
    // đang không hỏng.
    const { loginPage } = await import('../apps/web/src/ui-login.js');
    const sai = loginPage({ trangThai: 'sai_mat_khau' });
    const chan = loginPage({ trangThai: 'bi_chan_tan_suat', choGiay: 4 });

    expect(sai).toContain('Tên đăng nhập hoặc mật khẩu không đúng');
    expect(sai).not.toMatch(/Chờ khoảng/);
    expect(chan).toMatch(/Chờ khoảng 4 giây/);
    expect(chan).not.toContain('Tên đăng nhập hoặc mật khẩu không đúng');
  });

  it('⛔ rào KHÔNG phân biệt tên có thật với tên không tồn tại', async () => {
    // Nếu rào bỏ qua tên không tồn tại (để «đỡ tốn bộ nhớ») thì hành vi chặn tự tố cáo tài khoản nào có
    // thật — cửa dò mà R11.10 đóng ở tầng THÔNG ĐIỆP bị mở lại ở tầng THỜI GIAN.
    const lt = await import('../apps/web/src/login-throttle.js');
    const dau = (khoa: string) => {
      const st = lt.newThrottleState();
      for (let i = 0; i < 6; i++) lt.recordFailure({ ipKey: `ip-${i}`, accountKey: khoa, state: st, now: 0 });
      return lt.evaluateLoginAttempt({ ipKey: 'ip-sach', accountKey: khoa, state: st, now: 0 });
    };
    expect(dau(lt.maskAccountKey('co-that'))).toEqual(dau(lt.maskAccountKey('khong-ton-tai-7c1e')));
  });
});

// ---------------------------------------------------------------- R11.8

describe('R11.8 — file cơ sở dữ liệu và file đi kèm đều ở quyền 600', () => {
  it('chmod được gọi cho đủ ba đuôi với mode 0o600', async () => {
    // Kiểm LỜI GỌI, không kiểm quyền thật trên đĩa: ca đọc quyền sẽ đỏ trên Windows và xanh trên Linux,
    // mà một lưới nói khác nhau tuỳ máy là lưới người ta sẽ bỏ qua. Phần không với tới — quyền THẬT sau
    // một lần deploy — thuộc DEPLOY.md, và test-cases ghi nó ở mục «Kiểm tay» chứ không giả vờ đã phủ.
    const src = readFileSync(`${WEB}/store/db.ts`, 'utf8');
    expect(src).toMatch(/chmodSync\([^)]*0o600\)/);
    // Ba đuôi: file chính, -wal, -shm. Hai file đi kèm mang CÙNG dữ liệu — chmod mỗi file chính là khoá
    // cửa trước rồi mở cửa sau.
    const i = src.indexOf('function sietQuyenDb');
    const khoi = src.slice(i, i + 400);
    for (const duoi of ['-wal', '-shm']) expect(khoi).toContain(duoi);
  });
});

// ---------------------------------------------------------------- R11.7 / R11.19

describe('R11.7 · R11.19 — tài khoản ở cơ sở dữ liệu, quản trị bằng lệnh trên máy chủ', () => {
  it('schema có bảng tài khoản mang cột vai', () => {
    const src = readFileSync(`${WEB}/store/db.ts`, 'utf8');
    const bang = src.slice(src.indexOf('CREATE TABLE IF NOT EXISTS nguoi_dung'));
    expect(bang.slice(0, 400)).toContain('vai');
  });

  it('không route nào tạo, đổi hay gỡ tài khoản', async () => {
    // Một bề mặt web quản trị tài khoản là bề mặt tấn công có sẵn cho thứ mở được cổng merge.
    const viPham: string[] = [];
    for (const f of walkTs(WEB)) {
      if (f === `${WEB}/identity.ts` || f === `${WEB}/cli-tai-khoan.ts`) continue;
      const txt = readFileSync(f, 'utf8');
      for (const ham of ['createAccount', 'changeRole', 'deleteAccount']) {
        if (new RegExp(`\\b${ham}\\s*\\(`).test(txt)) viPham.push(`${f}: ${ham}`);
      }
    }
    expect(viPham, `quản trị tài khoản ngoài công cụ dòng lệnh:\n  ${viPham.join('\n  ')}`).toEqual([]);
  });
});
