import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { costMetrics, measureCost, authLost } from '../packages/harness/src/model.js';
import { readKey } from '../apps/web/src/provider.js';

// Kho khoá giả: ca «thứ tự lấy khoá» chỉ có nghĩa khi kho THẬT SỰ có khoá. Đo lúc apply — mutation đảo
// thứ tự (kho trước env) KHÔNG giết được ca nào, vì kho trên máy chạy test rỗng nên cả hai thứ tự đều
// rơi xuống env. Ca xanh trên một hệ thống đã hỏng.
vi.mock('../apps/web/src/secret-vault.js', async (goc) => ({
  ...(await goc<typeof import('../apps/web/src/secret-vault.js')>()),
  readVault: () => ({ khoa: { anthropic: 'khoa-tu-KHO-dai-du-nguong-xyz' } }),
}));

/**
 * Lưới cho capability `provider-gate` — những điều chưa được ca nào khoá.
 *
 * ~15 điều còn lại đã có ca ở `model-hop-le` · `mat-xac-thuc` · `env-cli` · `web-loc` ·
 * `ba-muc-tu-dong`; file này không lặp lại chúng.
 */

describe('kế toán token: cờ ước-tính phải ĐÚNG, không chỉ tồn tại (R5.14)', () => {
  const goc = { ...measureCost };
  const dat = (v: Partial<typeof measureCost>) => Object.assign(measureCost, goc, v);
  afterEach(() => Object.assign(measureCost, goc));

  it('có usage thật → cờ ước-tính là FALSE và số lấy từ usage', () => {
    dat({ calls: 2, tokenVao: 1000, tokenRa: 500, kyTuVao: 999999, kyTuRa: 999999 });
    const m = costMetrics();
    expect(m.uoc_tinh).toBe(false);
    expect(m.token_vao).toBe(1000);
    expect(m.token_ra).toBe(500);
  });

  it('không có usage → ước theo ký tự và cờ ước-tính là TRUE', () => {
    // Công cụ dòng lệnh không trả `usage`. Một con số ước mà trình bày như số thật là báo sai bản chất —
    // người đọc sẽ dựng ngân sách trên nó.
    dat({ calls: 1, tokenVao: 0, tokenRa: 0, kyTuVao: 3500, kyTuRa: 700 });
    const m = costMetrics();
    expect(m.uoc_tinh).toBe(true);
    expect(m.token_vao).toBe(1000);
    expect(m.token_ra).toBe(200);
  });

  it('ca sẵn có chỉ khoá TRƯỜNG TỒN TẠI — ca này khoá GIÁ TRỊ đúng', () => {
    // `doc-du-lieu-cu.test.ts` khẳng định `chi_phi` có đủ bốn trường kể cả `uoc_tinh`. Nó vẫn xanh nếu
    // `uoc_tinh` luôn `false`. Trường tồn tại ≠ trường mang giá trị đúng.
    dat({ tokenVao: 0, tokenRa: 0, kyTuVao: 100, kyTuRa: 100 });
    const uoc = costMetrics().uoc_tinh;
    dat({ tokenVao: 5, tokenRa: 5, kyTuVao: 100, kyTuRa: 100 });
    const that = costMetrics().uoc_tinh;
    expect(uoc).not.toBe(that);
  });
});

describe('thứ tự lấy khoá nhà cung cấp (R5.9)', () => {
  const goc = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    if (goc === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = goc;
  });

  it('biến môi trường của dịch vụ đi TRƯỚC kho khoá', () => {
    // Kho ĐANG CÓ khoá (mock ở đầu file) — nếu không thì ca này xanh với cả hai thứ tự.
    process.env.ANTHROPIC_API_KEY = 'khoa-tu-moi-truong-dai-du-nguong';
    expect(readKey('anthropic')).toBe('khoa-tu-moi-truong-dai-du-nguong');
  });

  it('không có biến môi trường thì rơi về KHO, và lấy đúng khoá trong kho', () => {
    expect(readKey('anthropic')).toBe('khoa-tu-KHO-dai-du-nguong-xyz');
  });

  it('khoảng trắng thừa bị cắt — «   » không được tính là đã có khoá', () => {
    process.env.ANTHROPIC_API_KEY = '   ';
    // Chuỗi toàn khoảng trắng không phải khoá; nó phải rơi xuống bậc sau chứ không chặn ở bậc một.
    expect(readKey('anthropic')).toBe('khoa-tu-KHO-dai-du-nguong-xyz');
  });
});

describe('mất xác thực là lỗi CẤU HÌNH, không thử lại (R3.12 · R3.13 · R3.14)', () => {
  it('R3.13 — stderr khớp mẫu là chắc chắn; stdout chỉ tính khi không mang hình dạng câu trả lời', () => {
    const mau = 'Invalid API key · Please run /login';
    expect(authLost('', mau), 'stderr khớp mẫu → chắc chắn').toBe(true);
    expect(authLost(mau, ''), 'stdout ngắn và trơ → cũng là mất xác thực').toBe(true);
    // Câu trả lời hợp lệ của model có thể chứa đúng chữ ấy — đo được 3/4 câu hợp lệ bị bắt nhầm khi chỉ
    // xét mẫu chữ, và một lượt chấm chết oan dù đăng nhập vừa chạy tốt.
    const traLoiHopLe = '```json\n{"findings":[{"what":"' + mau + '"}]}\n```';
    expect(authLost(traLoiHopLe, ''), 'khối fence là câu trả lời, không phải lỗi công cụ').toBe(false);
  });

  it('R3.14 — nhánh mất xác thực TỪ CHỐI ngay, không đi vào đường thử lại', () => {
    // Phiên hết hạn không tự sống lại ở lượt thứ hai; thử lại chỉ tốn thêm một lượt gọi rồi hỏng y hệt.
    // Ca đọc source: chứng minh thứ tự trong code, không chứng minh hành vi lúc chạy (design D3 của
    // `repo-history` khai cùng cái mất).
    const src = readFileSync('packages/harness/src/model.ts', 'utf8');
    const i = src.indexOf('if (authLost(out, err))');
    expect(i, 'phải có nhánh nhận diện mất xác thực').toBeGreaterThan(0);
    const nhanh = src.slice(i, i + 700);
    expect(nhanh, 'phải TỪ CHỐI ngay').toMatch(/return reject\(/);
    expect(nhanh, 'lỗi phải mang loại riêng để chỗ gọi biết là lỗi cấu hình').toContain('CliConfigError');
    for (const cam of ['retry', 'thuLai', 'lan2', 'goiMotLan(']) {
      expect(nhanh, `nhánh mất xác thực không được ${cam}`).not.toContain(cam);
    }
  });
});

describe('cổng kiểm nhà cung cấp (R5.4 · R5.6 · R5.11)', () => {
  const src = (f: string) => readFileSync(f, 'utf8');

  it('R5.6 — phản hồi RỖNG là kiểm THẤT BẠI, và nói đúng bản chất', () => {
    // «Khoá hợp lệ nhưng model chưa sinh được nội dung» vẫn là không chấm được — một cổng báo xanh ở đây
    // là cổng vô nghĩa. Thông điệp phải nói đúng chuyện đó, không nói khoá sai.
    const s = src('apps/web/src/model-source.ts');
    const i = s.indexOf('if (!ra) {');
    expect(i, 'phải có nhánh phản hồi rỗng').toBeGreaterThan(0);
    const nhanh = s.slice(i, i + 700);
    expect(nhanh).toMatch(/ok:\s*false/);
    expect(nhanh).toContain('RỖNG');
    expect(nhanh, 'phải nói là model chưa sinh được nội dung, không đổ cho khoá').toContain('chưa sinh được nội dung');
  });

  it('R5.4 — phép kiểm «còn hiệu lực» đứng TRƯỚC cửa chọn nhà cung cấp', () => {
    const web = src('apps/web/src/server.ts');
    expect(web).toContain('checkStillValid');
    const i = web.indexOf('const kiem = checkStillValid(');
    expect(i).toBeGreaterThan(0);
    // Sau khi kiểm phải có nhánh từ chối khi chưa kiểm được.
    expect(web.slice(i, i + 500)).toMatch(/!kiem|kiem === null|kiem\?/);
  });

  it('R5.11 — kho khoá được siết quyền (kiểm LỜI GỌI, không kiểm quyền thật)', () => {
    // Ca đọc quyền thật đỏ trên Windows, xanh trên Linux — lưới nói khác nhau tuỳ máy là lưới người ta sẽ
    // bỏ qua. Cùng quyết định với `identity-session` D4 cho kho SQLite.
    const s = src('apps/web/src/secret-vault.ts');
    expect(s).toMatch(/chmodSync\([^)]*0o600\)/);
  });
});
