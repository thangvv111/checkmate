import { describe, it, expect, vi } from 'vitest';
import {
  collectSecrets,
  findSecret,
  blockMessage,
  attachSecretGuard,
  MIN_SECRET_LENGTH,
} from '../apps/web/src/response-secret-guard.js';

/**
 * Lưới cho gác bí mật ở bề mặt response.
 *
 * Đây là cơ chế MỚI, không phải backfill — nên tiêu chí «đủ ca» cao hơn các change trước: bí mật ở đây là
 * của CHÍNH CHECKER nên so khớp chính xác được, và một đường rò lọt qua là LỖI CÀI ĐẶT chứ không phải giới
 * hạn phương pháp. Không đường nào ở mục «đối kháng» được khai là mở theo bản chất.
 */

const TOKEN = 'ghp_ZaQxSwCdEvRfBgTnHyMjUkIlOp0987';
const KHOA = 'sk-ant-api03-KHOA-THAT-RAT-DAI-KHONG-TRUNG-AI';

const khoBiMat = {
  claude_code_oauth_token: 'sk-oat-THUE-BAO-DAI-DU-NGUONG',
  khoa: { anthropic: KHOA } as Record<string, string>,
  repo_token: { 'thangvv111/checkmate': TOKEN },
};

/** `res` giả tối thiểu — đủ để gác bọc `json` và `write`. */
const resGia = () => {
  const ra = {
    daGuiJson: undefined as unknown,
    daGuiChunk: [] as unknown[],
    daKetThuc: false,
    maTrangThai: 200,
    // Express dựng `res.json` bằng cách stringify rồi gọi `this.send(...)`. `res` giả phải theo đúng
    // đường ấy, nếu không ca test sẽ xanh trên một hình dạng mà máy chủ thật không có.
    json: (b: unknown) => ra.send(JSON.stringify(b)),
    send: (b: unknown) => {
      ra.daGuiJson = b;
      return ra;
    },
    write: (c: unknown) => {
      ra.daGuiChunk.push(c);
      return true;
    },
    end: () => {
      ra.daKetThuc = true;
      return ra;
    },
    status: (m: number) => {
      ra.maTrangThai = m;
      return ra;
    },
    type: () => ra,
  };
  return ra;
};

const gan = (res: ReturnType<typeof resGia>) => {
  attachSecretGuard({} as never, res as never, () => {});
  return res;
};

describe('thu thập bí mật — danh sách CHO PHÉP về phía nguồn', () => {
  it('lấy đủ ba nhánh kho, mỗi nhánh mang TÊN NGUỒN riêng', () => {
    const ds = collectSecrets(khoBiMat, {});
    expect(ds.map((x) => x.source).sort()).toEqual(
      ['khoa.anthropic', 'oauth_token', 'repo_token.thangvv111/checkmate'].sort(),
    );
  });

  it('lấy cả biến môi trường checker thật sự đọc', () => {
    const ds = collectSecrets(null, { GITHUB_TOKEN: TOKEN });
    expect(ds).toEqual([{ source: 'env.GITHUB_TOKEN', value: TOKEN }]);
  });

  it('bỏ qua bí mật rỗng và ngắn hơn ngưỡng', () => {
    // Một khoá rỗng khớp MỌI response và biến gác thành cỗ máy chặn mù — toàn bộ giao diện chết ngay khi
    // ai đó lưu nhầm một chuỗi ngắn.
    const ds = collectSecrets({ khoa: { anthropic: '', openai: 'ngan' } } as never, {});
    expect(ds).toEqual([]);
    expect(MIN_SECRET_LENGTH).toBeGreaterThan(8);
  });

  it('kho không đọc được (null) thì trả danh sách rỗng, không ném', () => {
    expect(() => collectSecrets(null, {})).not.toThrow();
  });
});

describe('dò bí mật — trả TÊN NGUỒN, không bao giờ trả giá trị', () => {
  const ds = collectSecrets(khoBiMat, {});

  it('thân sạch thì không bắt gì', () => {
    expect(findSecret({ ok: true, ten: 'abc' }, ds)).toBeNull();
  });

  it('bắt được token nằm thẳng trong thân', () => {
    expect(findSecret({ token: TOKEN }, ds)).toBe('repo_token.thangvv111/checkmate');
  });

  it('bắt được bí mật LỒNG SÂU trong mảng-trong-object', () => {
    expect(findSecret({ a: [{ b: { c: [KHOA] } }] }, ds)).toBe('khoa.anthropic');
  });

  it('bắt được bí mật trong trường tên vô hại', () => {
    expect(findSecret({ ghi_chu: `dán nhầm: ${TOKEN}` }, ds)).not.toBeNull();
  });

  it('thông điệp chặn nêu tên nguồn và KHÔNG chứa giá trị', () => {
    // Bẫy tự nhiên nhất của gác bảo mật: báo «response chứa ghp_abc…» là đưa bí mật vào log — bề mặt
    // DAI HƠN response vì log lưu lại.
    const msg = blockMessage('repo_token.thangvv111/checkmate');
    expect(msg).toContain('repo_token.thangvv111/checkmate');
    expect(msg).not.toContain(TOKEN);
    for (const n of [40, 20, 12, 8]) expect(msg).not.toContain(TOKEN.slice(0, n));
  });

  it('đầu vào méo không làm gác ném', () => {
    const vong: Record<string, unknown> = {};
    vong.tu = vong;
    for (const x of [null, undefined, 42, '', Buffer.from('abc'), vong, [], () => {}]) {
      expect(() => findSecret(x, ds)).not.toThrow();
    }
  });
});

describe('bề mặt 1 — route trả JSON: chặn trọn', () => {
  it('response mang bí mật bị CHẶN, client không nhận được giá trị', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GITHUB_TOKEN = TOKEN;
    const res = gan(resGia());
    res.json({ repos: [{ github: 'a/b', token: TOKEN }] });
    expect(res.maTrangThai).toBe(500);
    expect(JSON.stringify(res.daGuiJson)).not.toContain(TOKEN);
    delete process.env.GITHUB_TOKEN;
    vi.restoreAllMocks();
  });

  it('response sạch đi qua NGUYÊN VẸN', () => {
    process.env.GITHUB_TOKEN = TOKEN;
    const res = gan(resGia());
    const than = { repos: [{ github: 'a/b', co_token: true }] };
    res.json(than);
    expect(res.maTrangThai).toBe(200);
    // `res` giả đi đúng đường Express: `json` stringify rồi gọi `send`, nên thứ gửi ra là CHUỖI.
    expect(res.daGuiJson).toBe(JSON.stringify(than));
    delete process.env.GITHUB_TOKEN;
  });

  it('bí mật ngắn hơn ngưỡng KHÔNG chặn oan', () => {
    process.env.GITHUB_TOKEN = 'ngan';
    const res = gan(resGia());
    res.json({ msg: 'ngan' });
    expect(res.maTrangThai).toBe(200);
    delete process.env.GITHUB_TOKEN;
  });
});

describe('bề mặt HTML — chỗ lượt kiểm tay bắt được lỗ mà 16 ca test bỏ sót', () => {
  // Bản đầu của gác chỉ bọc `json` và `write`. Mọi ca test xanh, mọi đột biến giết đúng ca — nhưng lượt
  // chạy máy chủ thật cho thấy trang login KHÔNG bị chặn dù chứa đúng chuỗi đã đặt làm bí mật, vì nó đi
  // qua `res.send`. `server.ts` có 10 chỗ `res.send`, tức mọi màn hình.
  //
  // Ca test chỉ kiểm được bề mặt mà người viết NGHĨ RA; máy chủ thật kiểm mọi bề mặt nó có.
  it('trang HTML mang bí mật bị CHẶN', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GITHUB_TOKEN = TOKEN;
    const res = gan(resGia());
    res.send(`<html><body>token: ${TOKEN}</body></html>`);
    expect(res.maTrangThai).toBe(500);
    expect(String(res.daGuiJson)).not.toContain(TOKEN);
    delete process.env.GITHUB_TOKEN;
    vi.restoreAllMocks();
  });

  it('trang HTML sạch đi qua nguyên vẹn', () => {
    process.env.GITHUB_TOKEN = TOKEN;
    const res = gan(resGia());
    const trang = '<html><body>Đăng nhập</body></html>';
    res.send(trang);
    expect(res.maTrangThai).toBe(200);
    expect(res.daGuiJson).toBe(trang);
    delete process.env.GITHUB_TOKEN;
  });
});

describe('bề mặt 2 — luồng sự kiện: chặn YẾU HƠN, và phải có ca giữ', () => {
  // Bề mặt dễ quên nhất: nó không đi qua `res.json`, mà nó đúng là đường phát log của lượt chấm.
  it('mẩu mang bí mật KHÔNG được gửi và kết nối bị cắt', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GITHUB_TOKEN = TOKEN;
    const res = gan(resGia());
    res.write(`data: ${JSON.stringify({ msg: `lỗi: ${TOKEN}` })}\n\n`);
    expect(res.daGuiChunk).toEqual([]);
    expect(res.daKetThuc).toBe(true);
    delete process.env.GITHUB_TOKEN;
    vi.restoreAllMocks();
  });

  it('luồng sạch chạy bình thường, kể cả nhịp giữ kết nối', () => {
    process.env.GITHUB_TOKEN = TOKEN;
    const res = gan(resGia());
    res.write('data: {"t":0}\n\n');
    res.write(': nhip\n\n'); // nhịp là chuỗi ngắn lặp lại — dễ thành nạn nhân của gác viết ẩu
    expect(res.daGuiChunk).toHaveLength(2);
    expect(res.daKetThuc).toBe(false);
    delete process.env.GITHUB_TOKEN;
  });

  it('bí mật ở mẩu THỨ N vẫn bị bắt, không chỉ mẩu đầu', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GITHUB_TOKEN = TOKEN;
    const res = gan(resGia());
    res.write('data: {"t":0}\n\n');
    res.write('data: {"t":1}\n\n');
    res.write(`data: ${TOKEN}\n\n`);
    expect(res.daGuiChunk).toHaveLength(2);
    expect(res.daKetThuc).toBe(true);
    delete process.env.GITHUB_TOKEN;
    vi.restoreAllMocks();
  });
});
