import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  clientKey,
  maskAccountKey,
  evaluateLoginAttempt,
  recordFailure,
  clearAccount,
  accountPenaltyMs,
  evictWhenFull,
  shouldLog,
  newThrottleState,
  IP_FAIL_CAP,
  IP_WINDOW_MS,
  ACCOUNT_FREE_TRIES,
  ACCOUNT_BACKOFF_CAP_MS,
  THROTTLE_MAX_ENTRIES,
  LOG_MIN_INTERVAL_MS,
  FALLBACK_CLIENT_KEY,
  runLoginAttempt,
  type ThrottleState,
} from '../apps/web/src/login-throttle.js';
import { loginPage, describeWaitTime } from '../apps/web/src/ui-login.js';

/**
 * Lưới cho capability `login-throttle` — rào chống dò mật khẩu ở `/login`.
 *
 * Change `login-gate-replaces-basic-auth` gỡ HTTP Basic Auth ở nginx. Lớp trong vốn đã được viết để không
 * tựa vào lớp ngoài, và thiếu đúng một thứ: rào chống dò. Lưới này giữ thứ ấy.
 */

const GOC_SRC = process.cwd();
const IP = '203.0.113.7';
const TK = maskAccountKey('nguoi-van-hanh');

function newState(): ThrottleState {
  return newThrottleState();
}

/** Gõ sai `n` lần liên tiếp tại cùng một mốc thời gian. */
function saiNLan(st: ThrottleState, n: number, now = 0, ipKey = IP, accountKey = TK): void {
  for (let i = 0; i < n; i++) recordFailure({ ipKey, accountKey, state: st, now });
}

describe('clientKey — nguồn danh tính (T1)', () => {
  it('T1.1 [happy] lấy từ X-Real-IP', () => {
    expect(clientKey({ 'x-real-ip': IP })).toBe(IP);
  });

  it('T1.2 ⛔ [đối kháng] client tự khai X-Forwarded-For KHÔNG tách được xô đếm', () => {
    // nginx đặt `X-Forwarded-For $proxy_add_x_forwarded_for` — NỐI THÊM vào giá trị client gửi, nên phần
    // tử đầu do client viết. Đọc phần tử đầu thì đổi header mỗi request là mỗi request thành một IP mới:
    // rào biến mất hoàn toàn trong khi mọi ca khác vẫn xanh.
    const a = clientKey({ 'x-real-ip': IP, 'x-forwarded-for': '1.1.1.1, ' + IP });
    const b = clientKey({ 'x-real-ip': IP, 'x-forwarded-for': '2.2.2.2, ' + IP });
    expect(a).toBe(b);
    expect(a).toBe(IP);
  });

  it('T1.3 không có X-Real-IP → lấy địa chỉ socket', () => {
    expect(clientKey({}, '198.51.100.4')).toBe('198.51.100.4');
  });

  it('T1.4 [⛔C2] không có nguồn nào → khoá chung, KHÔNG trả rỗng để rồi bỏ đếm', () => {
    expect(clientKey({})).toBe(FALLBACK_CLIENT_KEY);
    expect(clientKey(null)).toBe(FALLBACK_CLIENT_KEY);
    expect(clientKey(undefined, undefined)).toBe(FALLBACK_CLIENT_KEY);
    expect(clientKey({ 'x-real-ip': '   ' })).toBe(FALLBACK_CLIENT_KEY);
  });

  it('T1.5 [biên] header là mảng · có khoảng trắng thừa', () => {
    expect(clientKey({ 'x-real-ip': [IP, '9.9.9.9'] })).toBe(IP);
    expect(clientKey({ 'x-real-ip': `  ${IP}  ` })).toBe(IP);
    expect(clientKey({ 'x-real-ip': 42 }, '198.51.100.4')).toBe('198.51.100.4');
  });
});

describe('evaluateLoginAttempt — hai gác độc lập (T2)', () => {
  it('T2.1 [happy] trạng thái sạch → cho qua', () => {
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: TK, state: newState(), now: 0 })).toEqual({ choQua: true });
  });

  it('T2.2 sai liên tiếp → thời gian chờ tăng dần', () => {
    expect(accountPenaltyMs(1)).toBe(0);
    expect(accountPenaltyMs(2)).toBe(0);
    expect(accountPenaltyMs(3)).toBe(1_000);
    expect(accountPenaltyMs(4)).toBe(2_000);
    expect(accountPenaltyMs(5)).toBe(4_000);
    expect(accountPenaltyMs(6)).toBe(8_000);
  });

  it('T2.3 [biên trùng ngưỡng] đúng ACCOUNT_FREE_TRIES lần sai → vẫn cho qua; lần kế → chờ', () => {
    const st = newState();
    saiNLan(st, ACCOUNT_FREE_TRIES);
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: TK, state: st, now: 0 }).choQua).toBe(true);
    saiNLan(st, 1);
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: TK, state: st, now: 0 }).choQua).toBe(false);
  });

  it('T2.4 thời gian chờ không vượt trần', () => {
    for (const n of [20, 50, 200]) expect(accountPenaltyMs(n)).toBe(ACCOUNT_BACKOFF_CAP_MS);
    // Mỗi lần sai từ một IP khác ⇒ gác IP không tích, nên con số đo được là của RIÊNG gác tài khoản.
    // (Dùng chung một IP thì thứ ràng buộc là IP_BLOCK_MS = 900s, và ca sẽ đo nhầm gác.)
    const st = newState();
    for (let i = 0; i < 200; i++) recordFailure({ ipKey: `ip-${i}`, accountKey: TK, state: st, now: 0 });
    const q = evaluateLoginAttempt({ ipKey: 'ip-sach', accountKey: TK, state: st, now: 0 });
    expect(q.choQua).toBe(false);
    if (!q.choQua) expect(q.choGiay).toBeLessThanOrEqual(ACCOUNT_BACKOFF_CAP_MS / 1000);
  });

  it('T2.5 [biên trùng ngưỡng] gác IP: đúng IP_FAIL_CAP lần → vẫn qua; lần kế → chặn', () => {
    // Tên khác nhau mỗi lần ⇒ gác tài khoản không chạm; chỉ gác IP quyết định.
    const st = newState();
    for (let i = 0; i < IP_FAIL_CAP; i++) recordFailure({ ipKey: IP, accountKey: `tk${i}`, state: st, now: 0 });
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: 'tk-moi', state: st, now: 0 }).choQua).toBe(true);
    recordFailure({ ipKey: IP, accountKey: 'tk-cuoi', state: st, now: 0 });
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: 'tk-moi-2', state: st, now: 0 }).choQua).toBe(false);
  });

  it('T2.6 sai rải ra ngoài cửa sổ → không cộng dồn thành chặn', () => {
    const st = newState();
    for (let i = 0; i <= IP_FAIL_CAP + 5; i++) {
      recordFailure({ ipKey: IP, accountKey: `tk${i}`, state: st, now: i * (IP_WINDOW_MS + 1) });
    }
    const cuoi = (IP_FAIL_CAP + 5) * (IP_WINDOW_MS + 1);
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: 'khac', state: st, now: cuoi }).choQua).toBe(true);
  });

  it('T2.7 hai gác ĐỘC LẬP — chỉ một cái đỏ cũng đủ từ chối', () => {
    // Chỉ gác tài khoản đỏ: mỗi lần sai từ một IP khác nhau nên xô IP không tích.
    const st = newState();
    for (let i = 0; i < 6; i++) recordFailure({ ipKey: `ip-${i}`, accountKey: TK, state: st, now: 0 });
    expect(evaluateLoginAttempt({ ipKey: 'ip-hoan-toan-moi', accountKey: TK, state: st, now: 0 }).choQua).toBe(false);
  });

  it('T2.8 đăng nhập đúng xoá chuỗi tài khoản, KHÔNG xoá xô IP', () => {
    const st = newState();
    for (let i = 0; i <= IP_FAIL_CAP; i++) recordFailure({ ipKey: IP, accountKey: TK, state: st, now: 0 });
    clearAccount(st, TK);
    expect(st.theoTaiKhoan.has(TK)).toBe(false);
    // Một người vừa vào được không phải lý do xoá án của cả một IP đang bị dò: kẻ tấn công có một tài
    // khoản hợp lệ sẽ dùng đúng đường đó để reset xô IP sau mỗi loạt thử.
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: 'tk-khac', state: st, now: 0 }).choQua).toBe(false);
  });

  it('T2.9 [đường sai — DoS ngược] bị người khác gõ sai liên tục vẫn vào được sau khoảng chờ CÓ TRẦN', () => {
    const st = newState();
    saiNLan(st, 500, 0, 'ip-ke-tan-cong', TK);
    // Người thật, từ IP của mình, sau khi chờ hết trần:
    const sauTran = ACCOUNT_BACKOFF_CAP_MS + 1;
    expect(evaluateLoginAttempt({ ipKey: 'ip-nguoi-that', accountKey: TK, state: st, now: sauTran }).choQua).toBe(true);
  });
});

describe('trần bảng & phép loại bỏ (T3)', () => {
  it('T3.1 bơm rất nhiều tên khác nhau → số mục không vượt trần', () => {
    const st = newState();
    for (let i = 0; i < THROTTLE_MAX_ENTRIES * 3; i++) {
      recordFailure({ ipKey: IP, accountKey: `rac-${i}`, state: st, now: 0 });
    }
    expect(st.theoTaiKhoan.size).toBeLessThanOrEqual(THROTTLE_MAX_ENTRIES);
  });

  it('T3.2 ⛔ [đường sai] bơm tên rác KHÔNG đẩy được mục phạt nặng ra khỏi bảng', () => {
    // LRU thuần sẽ đỏ ở đây — và đó là điểm của ca: kẻ tấn công bơm tên rác để tự xoá án phạt của mình.
    const bang = new Map();
    bang.set('nan-nhan', { soLanSai: 99, phatToiLuc: 10_000, lanCuoi: 0 });
    for (let i = 0; i < THROTTLE_MAX_ENTRIES + 50; i++) {
      bang.set(`rac-${i}`, { soLanSai: 1, phatToiLuc: 5_000, lanCuoi: 1_000 + i });
    }
    evictWhenFull(bang, 0);
    expect(bang.size).toBeLessThanOrEqual(THROTTLE_MAX_ENTRIES);
    expect(bang.has('nan-nhan'), 'mục phạt nặng phải ở lại — nó đắt nhất để mất').toBe(true);
  });

  it('T3.3 mục đã hết hạn phạt bị loại trước mục còn hạn', () => {
    const bang = new Map();
    for (let i = 0; i < THROTTLE_MAX_ENTRIES + 20; i++) {
      // Nửa đầu hết hạn, nửa sau còn hạn — nhưng nửa hết hạn có chuỗi sai CAO hơn, nên nếu phép loại bỏ
      // chỉ nhìn chuỗi sai thì nó sẽ giữ nhầm.
      const hetHan = i < 100;
      bang.set(`m-${i}`, { soLanSai: hetHan ? 50 : 1, phatToiLuc: hetHan ? 0 : 9_999_999, lanCuoi: i });
    }
    evictWhenFull(bang, 1_000);
    expect(bang.size).toBeLessThanOrEqual(THROTTLE_MAX_ENTRIES);
    expect(bang.has('m-0'), 'mục hết hạn phải ra trước').toBe(false);
  });

  it('T3.4 [đầu vào khuyết] state rỗng · null · thiếu trường · NaN → không ném', () => {
    expect(() => evaluateLoginAttempt({ ipKey: IP, accountKey: TK, state: null as never, now: 0 })).not.toThrow();
    expect(() => evaluateLoginAttempt({ ipKey: IP, accountKey: TK, state: {} as never, now: 0 })).not.toThrow();
    expect(() => recordFailure({ ipKey: IP, accountKey: TK, state: null as never, now: 0 })).not.toThrow();
    expect(() => clearAccount(null as never, TK)).not.toThrow();
    expect(() => evictWhenFull(null as never, 0)).not.toThrow();
    const st = newState();
    st.theoTaiKhoan.set(TK, { soLanSai: 3, phatToiLuc: NaN, lanCuoi: 0 });
    expect(evaluateLoginAttempt({ ipKey: IP, accountKey: TK, state: st, now: NaN as never }).choQua).toBe(true);
  });

  it('T3.5 [⛔C3] tên gốc không xuất hiện trong bản che', () => {
    for (const ten of ['nguoi-van-hanh', 'MatKhauGoNhamVaoOTen!2026']) {
      expect(maskAccountKey(ten)).not.toContain(ten);
    }
    // Tên một ký tự: mọi chuỗi hex đều 'chứa' nó, nên phép kiểm đúng ở đây là 'không bằng chính nó'.
    for (const ten of ['a', 'x', '1']) expect(maskAccountKey(ten)).not.toBe(ten);
    for (const ten of ['nguoi-van-hanh', 'a', '', 'Mật Khẩu']) {
      expect(maskAccountKey(ten)).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it('T3.6 [⛔C3 — bản che PHẢI phân biệt] hai tên khác nhau → hai bản che khác nhau', () => {
    // Che thành một hằng (`***`) làm người vận hành mất khả năng phân biệt «một tên bị dò 10 nghìn lần»
    // với «10 nghìn tên khác nhau bị thử một lần» — hai trận tấn công khác nhau, hai phản ứng khác nhau.
    expect(maskAccountKey('admin')).not.toBe(maskAccountKey('root'));
    const bo = new Set(Array.from({ length: 200 }, (_, i) => maskAccountKey(`tk-${i}`)));
    expect(bo.size).toBe(200);
  });

  it('T3.7 cùng một tên → cùng một bản che', () => {
    expect(maskAccountKey('admin')).toBe(maskAccountKey('admin'));
    expect(maskAccountKey(null)).toBe(maskAccountKey(undefined));
  });
});

describe('ghi sổ — có trần, và con số phải TRUNG THỰC (T4)', () => {
  /** Chạy `n` lượt chặn dồn dập trong một đợt; trả về các lần phát. */
  function motDot(n: number, buoc = 1): { donLai: number; tongDot: number }[] {
    const st = newState();
    const phat: { donLai: number; tongDot: number }[] = [];
    for (let i = 0; i < n; i++) {
      const r = shouldLog(st, i * buoc);
      if (r.ghi) phat.push({ donLai: r.donLai, tongDot: r.tongDot });
    }
    return phat;
  }

  it('T4.1 ⛔ [ca đo được trên prod] đợt 13 lượt KHÔNG còn chỉ ghi «1 lượt»', () => {
    // 06/09 trên prod: 13 lượt bị chặn, log ghi đúng một dòng «chặn 1 lượt». Đúng luật trần tần suất,
    // nhưng sai sự thật — người vận hành ước lượng thấp đi một bậc độ lớn.
    const phat = motDot(13);
    expect(phat.length).toBeGreaterThan(1);
    expect(Math.max(...phat.map((p) => p.tongDot)), 'phải cho thấy đợt lớn hơn 1').toBeGreaterThanOrEqual(10);
  });

  it('T4.2 mốc luỹ tiến: phát ở lượt 1, 10, 100, 1000', () => {
    expect(motDot(1_500).map((p) => p.tongDot)).toEqual([1, 10, 100, 1_000]);
  });

  it('T4.3 ⛔ [trần vẫn còn] đợt rất lớn → số dòng theo bậc logarit, không theo số lượt', () => {
    // Vế đối trọng của T4.1: thêm tín hiệu KHÔNG được mở lại đường làm đầy đĩa.
    //
    // Trần là TỔNG của hai điều kiện phát, không phải chỉ mốc — chỗ này lần đầu viết đã tính thiếu:
    //   mốc  ≤ log10(N) + 1        (1, 10, 100, … )
    //   thời gian ≤ khoảng-đợt / LOG_MIN_INTERVAL_MS + 1
    const N = 200_000;
    const buoc = 1;
    const tranMoc = Math.floor(Math.log10(N)) + 1;
    const tranThoiGian = Math.ceil(((N - 1) * buoc) / LOG_MIN_INTERVAL_MS) + 1;

    const phat = motDot(N, buoc);
    expect(phat.length).toBeLessThanOrEqual(tranMoc + tranThoiGian);
    // Và điều thật sự quan trọng: ít hơn số lượt bốn bậc độ lớn.
    expect(phat.length * 10_000).toBeLessThan(N);
  });

  it('T4.4 hai con số trả lời hai câu khác nhau', () => {
    const phat = motDot(100);
    const cuoi = phat.at(-1)!;
    expect(cuoi.tongDot).toBe(100); // cả đợt
    expect(cuoi.donLai).toBe(90); // từ lần phát trước (lượt 10 → lượt 100)
  });

  it('T4.5 đợt kéo dài không chạm mốc mới → trần THỜI GIAN vẫn cho nhịp đều', () => {
    const st = newState();
    let ghi = 0;
    // 30 lượt rải đều, mỗi lượt cách nhau nửa khoảng: không chạm mốc 100, nhưng vẫn phải có nhịp.
    for (let i = 0; i < 30; i++) if (shouldLog(st, i * (LOG_MIN_INTERVAL_MS / 2)).ghi) ghi++;
    expect(ghi).toBeGreaterThan(2);
    expect(ghi).toBeLessThan(30);
  });

  it('T4.6 im lặng trọn một khoảng → ĐỢT MỚI, đếm lại từ đầu', () => {
    // Không thì đợt hôm nay thừa hưởng con số của đợt hôm qua, và mốc không bao giờ chạm nữa.
    const st = newState();
    for (let i = 0; i < 50; i++) shouldLog(st, i);
    const sau = shouldLog(st, 50 + LOG_MIN_INTERVAL_MS * 2);
    expect(sau.ghi).toBe(true);
    expect(sau.tongDot, 'đợt mới bắt đầu lại từ 1').toBe(1);
  });

  it('T4.7 [đầu vào khuyết] state null · now NaN → không ném', () => {
    expect(() => shouldLog(null as never, 0)).not.toThrow();
    expect(shouldLog(null as never, 0)).toEqual({ ghi: false, donLai: 0, tongDot: 0 });
    expect(() => shouldLog(newState(), NaN)).not.toThrow();
  });
});

describe('runLoginAttempt — THỨ TỰ, đo bằng số lời gọi (T6)', () => {
  /** Phép kiểm mật khẩu giả, đếm số lần bị gọi. */
  function spy(ketQua: string | null) {
    let goi = 0;
    return { verify: () => (goi++, ketQua), soLanGoi: () => goi };
  }

  it('T6.1 ⛔ CA LOAD-BEARING NHẤT — đang bị chặn thì verify được gọi ĐÚNG 0 LẦN', () => {
    // Ca «có bị chặn không» KHÔNG đủ: gác đặt SAU phép băm vẫn cho ra «bị chặn», mà lúc đó rào chống được
    // đoán mật khẩu và KHÔNG chống được DoS — tức mất đúng nửa lý do change này tồn tại. Băm ở đây là
    // scrypt N=16384, chậm CÓ CHỦ ĐÍCH, nên mỗi lượt lọt qua là CPU của máy chủ, không phải của người gõ.
    const st = newState();
    for (let i = 0; i <= IP_FAIL_CAP; i++) recordFailure({ ipKey: IP, accountKey: `tk-${i}`, state: st, now: 0 });

    const s = spy('danh-tinh');
    const kq = runLoginAttempt({ ipKey: IP, accountKey: TK, state: st, now: 0, verify: s.verify });

    expect(kq.ket).toBe('bi_chan');
    expect(s.soLanGoi(), 'gác phải đứng TRƯỚC phép băm, không phải sau').toBe(0);
  });

  it('T6.2 [đối chứng] không bị chặn thì verify ĐƯỢC gọi đúng một lần', () => {
    // Vế còn lại của cặp: nếu ai đó «sửa» T6.1 bằng cách không bao giờ gọi verify thì ca này đỏ.
    const s = spy('danh-tinh');
    const kq = runLoginAttempt({ ipKey: IP, accountKey: TK, state: newState(), now: 0, verify: s.verify });
    expect(kq).toEqual({ ket: 'dung', danhTinh: 'danh-tinh' });
    expect(s.soLanGoi()).toBe(1);
  });

  it('T6.3 sai → ghi nhận vào CẢ HAI xô', () => {
    const st = newState();
    const s = spy(null);
    expect(runLoginAttempt({ ipKey: IP, accountKey: TK, state: st, now: 0, verify: s.verify }).ket).toBe('sai');
    expect(st.theoIp.get(IP)?.soLanSai).toBe(1);
    expect(st.theoTaiKhoan.get(TK)?.soLanSai).toBe(1);
  });

  it('T6.4 đúng → xoá chuỗi phạt của tài khoản', () => {
    const st = newState();
    saiNLan(st, 5, 0, 'ip-khac', TK);
    expect(st.theoTaiKhoan.has(TK)).toBe(true);
    // Phải chạy SAU khi hết hạn phạt. Còn trong hạn thì lượt này bị chặn và không tới được `clearAccount`
    // — đúng như T6.1 đòi, và đó là chỗ ca đầu tiên viết ra đã sai.
    const sauHan = ACCOUNT_BACKOFF_CAP_MS + 1;
    expect(runLoginAttempt({ ipKey: IP, accountKey: TK, state: st, now: sauHan, verify: () => 'ok' }).ket).toBe('dung');
    expect(st.theoTaiKhoan.has(TK)).toBe(false);
  });

  it('T6.5 verify ném thì lỗi KHÔNG bị nuốt thành «sai mật khẩu»', () => {
    // Nuốt lỗi ở đây là biến một sự cố cơ sở dữ liệu thành «sai mật khẩu» — người vận hành sẽ đi đổi mật
    // khẩu trong khi thứ hỏng là chỗ khác.
    const st = newState();
    expect(() =>
      runLoginAttempt({
        ipKey: IP,
        accountKey: TK,
        state: st,
        now: 0,
        verify: () => {
          throw new Error('cơ sở dữ liệu đóng');
        },
      }),
    ).toThrow('cơ sở dữ liệu đóng');
  });
});

describe('đường /login trong server.ts — nối dây đúng (T7)', () => {
  const src = readFileSync(join(GOC_SRC, 'apps/web/src/server.ts'), 'utf8');
  const than = (() => {
    const i = src.indexOf("app.post('/login'");
    const j = src.indexOf(String.fromCharCode(10) + 'app.', i + 10);
    return src.slice(i, j < 0 ? src.length : j);
  })();

  it('T7.1 route KHÔNG gọi verifyPassword ngoài tham số của runLoginAttempt', () => {
    // T6.1 khoá thứ tự BÊN TRONG `runLoginAttempt`. Ca này đóng đường vòng còn lại: gọi thẳng
    // `verifyPassword` ở handler TRƯỚC khi hỏi gác thì T6.1 vẫn xanh mà rào vẫn mất tác dụng.
    expect(than).toContain('runLoginAttempt(');
    expect((than.match(/verifyPassword\(/g) ?? []).length, 'đúng một lời gọi, và nó là callback').toBe(1);
    expect(than.indexOf('runLoginAttempt('), 'lời gọi ấy nằm TRONG runLoginAttempt').toBeLessThan(
      than.indexOf('verifyPassword('),
    );
  });

  it('T7.2 nhánh bị chặn không rơi xuống nhánh «sai mật khẩu»', () => {
    expect(than).toMatch(/ket === 'bi_chan'/);
    expect(than.indexOf("ket === 'bi_chan'")).toBeLessThan(than.indexOf("ket === 'sai'"));
    expect(than).toContain('?cho=');
  });

  it('T7.3 [⛔C3] route ghi log tên đã CHE, không ghi `ten` nguyên văn', () => {
    const dongLog = than.split(/\r?\n/).filter((l) => /console\.(error|log|warn)/.test(l));
    expect(dongLog.length).toBeGreaterThan(0);
    for (const l of dongLog) {
      expect(l, 'log phải dùng accountKey (đã che), không dùng biến tên thô').not.toMatch(/\$\{ten\}/);
      expect(l).not.toMatch(/b\.mk/);
    }
  });
});

describe('thông điệp cho người bị chặn (T8)', () => {
  const trang = (choGiay?: number) => loginPage({ trangThai: 'bi_chan_tan_suat', choGiay });

  it('T8.1 báo «chờ», KHÔNG báo «sai mật khẩu»', () => {
    // Gộp hai trạng thái làm một thì người vận hành gõ sai vài lần sẽ thấy mật khẩu ĐÚNG bị báo là sai,
    // rồi đi đổi mật khẩu — hỏng một thứ đang không hỏng.
    const h = trang(8);
    expect(h).toContain('Chờ khoảng 8 giây');
    expect(h).not.toContain('Tên đăng nhập hoặc mật khẩu không đúng');
    expect(h, 'phải nói rõ mật khẩu không bị đổi').toContain('mật khẩu của bạn không bị đổi');
  });

  it('T8.2 [không thành cửa dò] không nói gác nào chặn, không nói còn mấy lần', () => {
    const h = trang(8).toLowerCase();
    for (const lo of ['ip', 'tài khoản', 'còn lại', 'lần thử', 'ngưỡng']) {
      expect(h, `thông điệp lộ «${lo}» là cho người đang dò biết mình đang chạm gác nào`).not.toContain(
        `quá nhiều lần thử. ${lo}`,
      );
    }
    // Không nêu tên gác, không nêu số lần còn lại — chỉ nêu thời gian chờ.
    expect(trang(8)).not.toMatch(/x-real-ip|IP_FAIL_CAP|còn \d+ lần/i);
  });

  it('T8.5 [kiểm tay prod 06/09] số lớn hiện bằng PHÚT, không bắt người đọc tự chia', () => {
    // Gác IP chặn 900 giây và trang từng hiện «Chờ khoảng 900 giây» — đúng số, nhưng bắt người đọc làm
    // phép chia giữa lúc họ đang không vào được hệ thống. Hai gác có hai thang khác hẳn nhau
    // (tài khoản 1–60 giây · IP 900 giây) nên một đơn vị không phục vụ được cả hai.
    expect(describeWaitTime(900)).toBe('15 phút');
    expect(trang(900)).toContain('Chờ khoảng 15 phút');
    expect(trang(900)).not.toContain('900 giây');
  });

  it('T8.6 số nhỏ vẫn hiện bằng GIÂY — lùi dần theo tài khoản đo bằng giây', () => {
    for (const g of [1, 2, 8, 60, 89]) expect(describeWaitTime(g)).toBe(`${g} giây`);
    expect(trang(4)).toContain('Chờ khoảng 4 giây');
  });

  it('T8.7 [biên trùng ngưỡng] 89 → giây · 90 → phút, và luôn làm tròn LÊN', () => {
    expect(describeWaitTime(89)).toBe('89 giây');
    expect(describeWaitTime(90)).toBe('2 phút');
    // Làm tròn lên: nói ngắn hơn thực tế thì người ta thử lại sớm rồi lại bị chặn.
    expect(describeWaitTime(61)).toBe('61 giây');
    expect(describeWaitTime(119)).toBe('2 phút');
    expect(describeWaitTime(899)).toBe('15 phút');
  });

  it('T8.3 [biên] thiếu số giây · số vô nghĩa → vẫn ra câu chờ, không ném', () => {
    for (const g of [undefined, 0, -5, NaN, Infinity]) {
      expect(() => trang(g)).not.toThrow();
      expect(trang(g)).toContain('Chờ');
    }
    expect(trang(undefined)).toContain('Chờ một lát');
  });

  it('T8.4 trạng thái cũ không đổi hành vi (hồi quy)', () => {
    expect(loginPage({ trangThai: 'sai_mat_khau' })).toContain('Tên đăng nhập hoặc mật khẩu không đúng');
    expect(loginPage({ trangThai: 'moi' })).not.toContain('Chờ khoảng');
  });
});

describe('rào không tố cáo tài khoản nào có thật (T9)', () => {
  it('T9.1 ⛔ tên CÓ THẬT và tên KHÔNG TỒN TẠI bị lùi dần y hệt nhau', () => {
    // Nếu rào bỏ qua tên không tồn tại (để «đỡ tốn bộ nhớ») thì hành vi chặn tự tố cáo tài khoản nào có
    // thật — đúng cửa dò mà R11.10 đã đóng ở tầng thông điệp, mở lại ở tầng thời gian.
    const coThat = maskAccountKey('nguoi-van-hanh');
    const khong = maskAccountKey('khong-he-ton-tai-9f3a');

    const chay = (khoa: string) => {
      const st = newState();
      const ra: unknown[] = [];
      for (let i = 0; i < 8; i++) {
        // `verify` trả null cho CẢ HAI — rào không biết và không được biết tên nào có thật.
        ra.push(runLoginAttempt({ ipKey: `ip-${i}`, accountKey: khoa, state: st, now: i * 100, verify: () => null }));
        ra.push(evaluateLoginAttempt({ ipKey: 'ip-sach', accountKey: khoa, state: st, now: i * 100 }));
      }
      return JSON.stringify(ra);
    };

    expect(chay(coThat)).toBe(chay(khong));
  });

  it('T9.2 rào không nhận mật khẩu, nên nó không có gì để rò', () => {
    // Ràng buộc kiểu: `runLoginAttempt` chỉ nhận `accountKey` (đã che) và một callback. Mật khẩu không đi
    // vào file này lần nào — cách chắc nhất để một giá trị không rò là nó không có mặt.
    const src = readFileSync(join(GOC_SRC, 'apps/web/src/login-throttle.ts'), 'utf8');
    expect(src).not.toMatch(/\bmatKhau\b|\bpassword\b|\bb\.mk\b/);
  });
});

describe('đầu vào khuyết và đồng hồ nhảy (T10)', () => {
  it('T10.1 body thiếu trường · sai kiểu → không ném, vẫn tính vào rào', () => {
    const st = newState();
    for (const tho of [undefined, null, 42, {}, [], '']) {
      expect(() => maskAccountKey(tho)).not.toThrow();
      expect(() =>
        runLoginAttempt({
          ipKey: clientKey(tho),
          accountKey: maskAccountKey(tho),
          state: st,
          now: 0,
          verify: () => null,
        }),
      ).not.toThrow();
    }
    // Vẫn ĐẾM: đầu vào rác không phải lý do bỏ qua việc đếm (⛔C2).
    expect(st.theoIp.get(FALLBACK_CLIENT_KEY)?.soLanSai).toBeGreaterThan(0);
  });

  it('T10.2 ⛔ đồng hồ nhảy LÙI → án phạt KHÔNG hết sớm', () => {
    // Hết sớm là fail-OPEN, đúng thứ ⛔C2 cấm. Đây là lý do rào dùng đồng hồ đơn điệu
    // (`performance.now()`) chứ không dùng `Date.now()` — NTP chỉnh giờ làm `Date.now()` nhảy.
    const st = newState();
    saiNLan(st, 6, 10_000, 'ip-x', TK);
    const phat = st.theoTaiKhoan.get(TK)!.phatToiLuc;
    expect(phat).toBeGreaterThan(10_000);
    // Mốc lùi về quá khứ: án phạt phải CÒN, không được coi là đã qua.
    expect(evaluateLoginAttempt({ ipKey: 'ip-sach', accountKey: TK, state: st, now: 0 }).choQua).toBe(false);
    expect(evaluateLoginAttempt({ ipKey: 'ip-sach', accountKey: TK, state: st, now: -99_999 }).choQua).toBe(false);
  });
});

// ---------- Lưới quét mã nguồn: cặp fixture bắt buộc (tầng 3) ----------

const GOC = process.cwd();
const NGUON = ['apps/web/src/login-throttle.ts', 'apps/web/src/server.ts'];

/**
 * ⛔ Không file nào trong đường đăng nhập được đọc `x-forwarded-for`.
 *
 * Đây là lỗi mà **mọi ca đơn vị vẫn xanh khi mắc phải** — rào biến mất còn log vẫn trông như đang chặn.
 * Nên nó cần một ca nhìn thẳng vào mã nguồn, không nhìn vào hành vi.
 */
export function scanForwardedForReads(files: readonly string[], doc: (f: string) => string): string[] {
  const xau: string[] = [];
  for (const f of files) {
    doc(f)
      .split(/\r?\n/)
      .forEach((l, i) => {
        // Bỏ dòng chú thích: chú thích GIẢI THÍCH vì sao không dùng XFF là thứ ta muốn giữ, không phải cấm.
        const code = l.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
        if (/x-forwarded-for/i.test(code)) xau.push(`${f}:${i + 1} đọc x-forwarded-for`);
      });
  }
  return xau;
}

/**
 * ⛔ `app.listen` phải gắn `'127.0.0.1'`.
 *
 * Đây là TIỀN ĐỀ làm `X-Real-IP` tin được: nghe loopback ⇒ proxy là đường vào duy nhất ⇒ header do nginx
 * ghi đè. Đổi sang `0.0.0.0` thì header thành client-tự-khai và rào mất hiệu lực **không triệu chứng** —
 * không có ca nào khác đỏ, không có log nào lạ.
 */
export function scanListenAddress(files: readonly string[], doc: (f: string) => string): string[] {
  const xau: string[] = [];
  for (const f of files) {
    for (const m of doc(f).matchAll(/app\.listen\(([^)]*)\)/g)) {
      if (!/['"]127\.0\.0\.1['"]/.test(m[1]!)) xau.push(`${f}: app.listen không gắn 127.0.0.1 — ${m[1]!.trim()}`);
    }
  }
  return xau;
}

describe('quét mã nguồn — tầng 3, cặp fixture (T5)', () => {
  const docThat = (f: string) => readFileSync(join(GOC, f), 'utf8');

  it('T5.1 mã nguồn hiện tại: không chỗ nào đọc x-forwarded-for', () => {
    expect(scanForwardedForReads(NGUON, docThat)).toEqual([]);
  });

  it('T5.2 [đối kháng] mã đọc XFF → ĐỎ', () => {
    const gia = `const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0];`;
    expect(scanForwardedForReads(['gia.ts'], () => gia)).toHaveLength(1);
  });

  it('T5.3 [đối chứng] mã đọc X-Real-IP → XANH, và chú thích nhắc XFF không bị tính là vi phạm', () => {
    const gia = [
      `// nginx dat X-Forwarded-For bang \$proxy_add_x_forwarded_for — NOI THEM, khong tin duoc`,
      `const ip = String(req.headers['x-real-ip'] ?? '');`,
    ].join('\n');
    expect(scanForwardedForReads(['gia.ts'], () => gia)).toEqual([]);
  });

  it('T5.4 mã nguồn hiện tại: app.listen gắn 127.0.0.1', () => {
    expect(scanListenAddress(['apps/web/src/server.ts'], docThat)).toEqual([]);
  });

  it('T5.5 [đối kháng] app.listen(port) trần hoặc 0.0.0.0 → ĐỎ', () => {
    expect(scanListenAddress(['g.ts'], () => `app.listen(port, () => {})`)).toHaveLength(1);
    expect(scanListenAddress(['g.ts'], () => `app.listen(port, '0.0.0.0', () => {})`)).toHaveLength(1);
  });

  it('T5.6 [đối chứng] app.listen(port, "127.0.0.1", …) → XANH', () => {
    expect(scanListenAddress(['g.ts'], () => `app.listen(port, '127.0.0.1', () => {})`)).toEqual([]);
  });
});
