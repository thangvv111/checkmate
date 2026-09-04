import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { verifyWebhookSignature, decideWebhookAction } from '../apps/web/src/webhook.js';
import { OPEN_PATHS } from '../apps/web/src/session-gate.js';

/**
 * Lưới cho capability `github-webhook`.
 *
 * Đây là CỬA VÀO KHÔNG XÁC THỰC NGƯỜI DÙNG đầu tiên của sản phẩm, và sau khi bỏ Basic Auth ở nginx (nợ #4)
 * thì `OPEN_PATHS` là hàng rào DUY NHẤT giữa Internet và ứng dụng. Nên mỗi nhánh từ chối là MỘT ca —
 * không gộp. Với một cửa như thế, «mỗi nhánh một ca» là điều kiện tối thiểu, không phải sự kỹ tính.
 */

const BI_MAT = 'bi-mat-webhook-du-dai-de-khong-bi-doan';
const ky = (than: string, biMat = BI_MAT): string => `sha256=${createHmac('sha256', biMat).update(than).digest('hex')}`;
const than = (p: Record<string, unknown> = {}): string =>
  JSON.stringify({
    action: 'opened',
    number: 7,
    repository: { full_name: 'thangvv111/demo-credit-approval' },
    pull_request: { head: { sha: 'abcdef1234567' } },
    ...p,
  });
const DA_KHAI = ['thangvv111/demo-credit-approval', 'thangvv111/checkmate'];

/**
 * Phép so chữ ký có còn là LỜI GỌI timing-safe không.
 *
 * Bản đầu của ca này chỉ `toContain('timingSafeEqual')`, và đột biến 6.2 (thay lời gọi bằng `===` trên hai
 * chuỗi hex) đã SỐNG SÓT qua nó — vì chuỗi ấy vẫn còn ở dòng `import`. Ca xanh, cửa đã hỏng. Đó là lỗi lưới
 * loại 1 của `test-grid-integrity`, và thứ bắt được nó là mutation chứ không phải đọc lại ca.
 *
 * Nên phải đòi đúng HÌNH DẠNG LỜI GỌI, và cấm kiểu so thứ hai — hai vế, vì chỉ đòi lời gọi thì code vẫn
 * có thể gọi nó rồi bỏ kết quả, so lại bằng `===` ngay bên cạnh.
 */
export function scanTimingSafeCall(src: string): string[] {
  const loi: string[] = [];
  if (!/timingSafeEqual\([A-Za-z_$][\w$]*,\s*[A-Za-z_$][\w$]*\)/.test(src)) {
    loi.push('thiếu lời gọi timingSafeEqual(a, b) — chữ ký đang so bằng cách khác');
  }
  for (const d of src.split(String.fromCharCode(10))) {
    if (/(digest|toString\('hex'\))[^=]*[!=]==/.test(d)) loi.push(`so chữ ký bằng toán tử thường: ${d.trim()}`);
  }
  return loi;
}

describe('R-1 xác thực chữ ký — mỗi nhánh từ chối là một ca', () => {
  it('chữ ký đúng → chấp nhận', () => {
    const b = than();
    expect(verifyWebhookSignature(b, ky(b), BI_MAT)).toEqual({ ok: true });
  });

  it('chữ ký sai → từ chối', () => {
    const b = than();
    expect(verifyWebhookSignature(b, ky(b, 'bi-mat-khac-han-nhung-du-dai'), BI_MAT)).toEqual({
      ok: false,
      ly_do: 'chu_ky_khong_khop',
    });
  });

  it('THIẾU chữ ký → từ chối, và lý do KHÁC «chữ ký sai»', () => {
    // Nhánh riêng: người vận hành cần phân biệt «GitHub chưa gửi header» với «bí mật hai bên lệch nhau».
    for (const xau of [undefined, null, '', 123]) {
      expect(verifyWebhookSignature(than(), xau, BI_MAT)).toEqual({ ok: false, ly_do: 'thieu_chu_ky' });
    }
  });

  it('chữ ký sai ĐỊNH DẠNG → từ chối', () => {
    for (const xau of ['deadbeef', 'sha1=deadbeef', 'sha256=', 'sha256=khong-phai-hex']) {
      const kq = verifyWebhookSignature(than(), xau, BI_MAT);
      expect(kq.ok).toBe(false);
      expect(kq.ok === false && kq.ly_do).toBe('chu_ky_sai_dinh_dang');
    }
  });

  it('chữ ký SAI ĐỘ DÀI → từ chối, và KHÔNG ném', () => {
    // Ca load-bearing: `timingSafeEqual` NÉM khi hai bên khác độ dài. Không kiểm độ dài trước thì cả cửa
    // đổ vì một chuỗi ngắn — và đổ ở đây là 500, tức nói cho người gửi biết họ vừa chạm đúng chỗ.
    expect(() => verifyWebhookSignature(than(), 'sha256=abcd', BI_MAT)).not.toThrow();
    expect(verifyWebhookSignature(than(), 'sha256=abcd', BI_MAT)).toEqual({ ok: false, ly_do: 'chu_ky_sai_do_dai' });
  });

  it('BODY sửa một byte, chữ ký giữ nguyên → từ chối', () => {
    // Ca load-bearing của cả requirement: đây là thứ chứng minh HMAC tính trên RAW BODY.
    const b = than();
    const chuKy = ky(b);
    expect(verifyWebhookSignature(b.replace('opened', 'opened '), chuKy, BI_MAT).ok).toBe(false);
  });

  it('body «cùng nghĩa» nhưng khác chuỗi byte → VẪN từ chối', () => {
    // Vế ngược của ca trên. Hai JSON tương đương về nghĩa vẫn là hai chuỗi byte khác nhau — nên một bản
    // dựng lại từ `JSON.parse` không bao giờ khớp, và đó chính là lý do phải giữ raw.
    const goc = '{"action":"opened","number":7}';
    const chuKy = ky(goc);
    const dungLai = JSON.stringify(JSON.parse('{"number":7,"action":"opened"}'));
    expect(dungLai).not.toBe(goc);
    expect(verifyWebhookSignature(dungLai, chuKy, BI_MAT).ok).toBe(false);
  });

  it('CHƯA cấu hình bí mật → từ chối MỌI webhook, kể cả cái ký hợp lệ theo bí mật nào đó', () => {
    // Gác ⛔C2 của một cửa mở ra Internet. «Chưa cấu hình xong» phải nghiêng về phía đóng: một máy chủ
    // nhận webhook khi chưa có bí mật nghĩa là ai cũng chạy được lượt chấm trên nó.
    const b = than();
    for (const xau of [undefined, '', '   ']) {
      expect(verifyWebhookSignature(b, ky(b), xau)).toEqual({ ok: false, ly_do: 'chua_cau_hinh_bi_mat' });
    }
  });

  it('thiếu bí mật được kiểm TRƯỚC mọi thứ khác — không rò trạng thái qua thứ tự nhánh', () => {
    // Nếu «thiếu chữ ký» được kiểm trước, người gửi biết được máy chủ đã cấu hình bí mật hay chưa chỉ
    // bằng cách gửi một request rỗng.
    expect(verifyWebhookSignature('x', undefined, undefined)).toEqual({ ok: false, ly_do: 'chua_cau_hinh_bi_mat' });
  });

  it('phép so là TIMING-SAFE — fixture ĐỐI CHỨNG trên code hiện tại', () => {
    expect(scanTimingSafeCall(readFileSync('apps/web/src/webhook.ts', 'utf8'))).toEqual([]);
  });

  it('phép quét timing-safe BẮT được cái sai — fixture ĐỐI KHÁNG', () => {
    // Đây đúng đột biến 6.2 đã sống sót qua bản đầu của ca này: `timingSafeEqual` vẫn còn ở dòng import,
    // phép so thật thì đã thành `===` dừng sớm.
    const sai =
      "import { createHmac, timingSafeEqual } from 'node:crypto';" +
      String.fromCharCode(10) +
      "  return nhan.toString('hex') === mong.toString('hex') ? { ok: true } : { ok: false };";
    expect(scanTimingSafeCall(sai).length).toBeGreaterThan(0);
  });
});

describe('R-2 payload: chỉ pull request, và repo phải ĐÃ KHAI', () => {
  it('pull request + hành động cần chấm + repo đã khai → chấm', () => {
    expect(decideWebhookAction('pull_request', JSON.parse(than()), DA_KHAI)).toEqual({
      lam: 'cham',
      repo: 'thangvv111/demo-credit-approval',
      so: 7,
      headSha: 'abcdef1234567',
    });
  });

  it('repo KHÔNG có trong cấu hình → TỪ CHỐI', () => {
    // Ca load-bearing: gác thứ hai, độc lập với chữ ký. Thiếu nó, một webhook hợp lệ trỏ repo lạ khiến
    // CheckMate clone và chạy test của repo chưa ai khai — tức chạy code lạ trên máy chủ.
    const kq = decideWebhookAction('pull_request', JSON.parse(than({ repository: { full_name: 'ke-la/repo-la' } })), DA_KHAI);
    expect(kq.lam).toBe('tu_choi');
  });

  it('repo đã khai nhưng KHÁC HOA THƯỜNG → vẫn nhận, và trả về tên trong CẤU HÌNH', () => {
    const kq = decideWebhookAction('pull_request', JSON.parse(than({ repository: { full_name: 'ThangVV111/Demo-Credit-Approval' } })), DA_KHAI);
    expect(kq.lam === 'cham' && kq.repo, 'phải dùng tên trong cấu hình, không dùng tên trong payload').toBe(
      'thangvv111/demo-credit-approval',
    );
  });

  it('sự kiện khác pull_request → BỎ QUA, không phải lỗi', () => {
    // Trả lỗi cho sự kiện ta không quan tâm thì GitHub thử lại rồi tự tắt webhook — hỏng một đường vào
    // vì một thứ không phải lỗi.
    for (const ev of ['push', 'issues', 'ping', undefined]) {
      expect(decideWebhookAction(ev, JSON.parse(than()), DA_KHAI).lam).toBe('bo_qua');
    }
  });

  it('hành động không cần chấm → bỏ qua', () => {
    for (const act of ['labeled', 'closed', 'edited']) {
      expect(decideWebhookAction('pull_request', JSON.parse(than({ action: act })), DA_KHAI).lam).toBe('bo_qua');
    }
  });

  it('payload méo → TỪ CHỐI, không ném', () => {
    const meo: unknown[] = [
      than({ repository: undefined }),
      than({ repository: { full_name: '' } }),
      than({ number: 'bảy', pull_request: { head: { sha: 'abcdef1234567' } } }),
      than({ number: -1, pull_request: { head: { sha: 'abcdef1234567' } } }),
      than({ pull_request: { head: { sha: 'khong-phai-sha' } } }),
      than({ pull_request: undefined }),
    ];
    for (const m of meo) {
      expect(() => decideWebhookAction('pull_request', JSON.parse(m as string), DA_KHAI)).not.toThrow();
      expect(decideWebhookAction('pull_request', JSON.parse(m as string), DA_KHAI).lam).toBe('tu_choi');
    }
  });

  it('danh sách repo RỖNG → từ chối tất', () => {
    expect(decideWebhookAction('pull_request', JSON.parse(than()), []).lam).toBe('tu_choi');
  });
});

/**
 * Thân route webhook, cắt tới route KẾ TIẾP.
 *
 * Cắt theo số ký tự cố định thì khi route dài thêm vài dòng, đoạn đọc được sẽ liếm sang route sau —
 * ca vẫn xanh nhưng đang đọc nhầm chỗ, tức đúng loại lỗi lưới hạng 1 mà repo này đo được.
 */
/**
 * Dòng LỆNH nào mount `express.json` kèm `verify` toàn cục.
 *
 * Chỉ đọc dòng bắt đầu bằng `app.use(` — bản đầu của ca này quét cả file bằng một regex, và nó ĐỎ trên
 * chính CÂU BÌNH LUẬN giải thích vì sao không dùng `verify`. Đó đúng lỗi lưới loại 3 của
 * `test-grid-integrity`: ca đỏ trên hệ thống đang đúng — nên nó phải có cặp fixture, và có rồi.
 */
export function scanGlobalJsonVerify(src: string): string[] {
  return src
    .split(String.fromCharCode(10))
    .map((d) => d.trim())
    .filter((d) => d.startsWith('app.use(') && d.includes('express.json(') && d.includes('verify'));
}

function thanRoute(): string {
  const src = readFileSync('apps/web/src/server.ts', 'utf8');
  const i = src.indexOf("app.post('/api/webhook/github'");
  if (i < 0) throw new Error('không tìm thấy route webhook trong server.ts');
  // Mốc là ĐẦU DÒNG + `app.` — dựng bằng `fromCharCode` để không có ký tự thoát nào trong file.
  const j = src.indexOf(String.fromCharCode(10) + 'app.', i + 10);
  return src.slice(i, j < 0 ? src.length : j);
}

describe('R-3 đường vào: OPEN_PATHS và cửa route', () => {
  it('OPEN_PATHS có đúng bốn đường, và webhook là đường POST duy nhất trong đó', () => {
    expect([...OPEN_PATHS].sort()).toEqual(['/api/webhook/github', '/health', '/login', '/logout']);
  });

  it('raw body chỉ mounted cho ĐƯỜNG webhook, và đặt TRƯỚC express.json', () => {
    // Cách kia (`express.json({ verify })`) bắt MỌI request giữ thêm một bản body trong bộ nhớ, kể cả
    // request mang mật khẩu đăng nhập.
    const src = readFileSync('apps/web/src/server.ts', 'utf8');
    const iRaw = src.indexOf("app.use('/api/webhook/github', express.raw(");
    const iJson = src.indexOf("app.use(express.json(");
    expect(iRaw, 'phải mount raw theo đường').toBeGreaterThan(0);
    expect(iRaw, 'raw phải đứng TRƯỚC express.json').toBeLessThan(iJson);
    // Fixture ĐỐI CHỨNG của `scanGlobalJsonVerify`: code hiện tại KHÔNG dùng `verify` toàn cục.
    expect(scanGlobalJsonVerify(src)).toEqual([]);
  });

  it('phép quét `verify` toàn cục BẮT được cái sai — fixture đối kháng', () => {
    const sai = "app.use(express.json({ limit: '300kb', verify: (q, r, buf) => { q.rawBody = buf; } }));";
    expect(scanGlobalJsonVerify(sai)).toHaveLength(1);
    // Và KHÔNG bắt câu bình luận nhắc tới nó — vế làm cho ca đối chứng ở trên có nghĩa.
    expect(scanGlobalJsonVerify('// Cách kia (`express.json({ verify })`) giữ thêm một bản body.')).toEqual([]);
  });

  it('route webhook đi qua ĐÚNG evaluateStartRun, không phải đường tắt', () => {
    const khoi = thanRoute();
    expect(khoi, 'phải qua cửa điều kiện chạy').toContain('evaluateStartRun(');
    expect(khoi, 'phải chặn chế độ chỉ-đọc').toMatch(/MODE === 'demo'/);
    expect(khoi, 'phải xác thực chữ ký').toContain('verifyWebhookSignature(');
    expect(khoi, 'phải dựng cấu hình theo repo trong payload').toContain('findRepo(cfg, quyet.repo)');
  });

  it('phản hồi KHÔNG nói lý do từ chối — lý do thuộc về log máy chủ', () => {
    // Trả lời khác nhau cho «chữ ký sai» và «chưa cấu hình bí mật» là nói cho người gửi biết trạng thái
    // bên trong máy chủ. Phân biệt ấy có ích cho người vận hành, nên nó thuộc LOG.
    const khoi = thanRoute();
    const traLoi = [...khoi.matchAll(/res\.status\(\d+\)\.json\(([^)]*)\)/g)].map((m) => m[1]);
    expect(traLoi.length, 'phải có nhánh từ chối').toBeGreaterThan(0);
    for (const t of traLoi) {
      expect(t, `phản hồi rò lý do: ${t}`).not.toMatch(/ly_do|xac\.|quyet\.|cho\.lyDo/);
    }
  });

  it('một commit một verdict: cửa điều kiện chạy được hỏi ĐÚNG pull request trong payload', () => {
    // Không phải chi tiết vặt: webhook tới dồn dập (một lần push nhiều commit, hoặc gửi lặp). Hỏi trần
    // mà không hỏi «pull request này đang chạy chưa» thì hai lượt cùng chấm một commit.
    expect(thanRoute()).toContain('prDangChay: rm.isPrRunning(quyet.so)');
  });

  it('không phản hồi nào mang bí mật, chữ ký nhận được, hay raw body', () => {
    const khoi = thanRoute();
    const traLoi = [...khoi.matchAll(/res\.(?:status\(\d+\)\.)?json\(([^)]*)\)/g)].map((m) => m[1]);
    expect(traLoi.length).toBeGreaterThan(0);
    for (const t of traLoi) {
      expect(t, `phản hồi mang thứ không được mang: ${t}`).not.toMatch(/biMat|Secret|chuKy|signature|raw/i);
    }
  });

  it('⛔C1 — cửa webhook KHÔNG merge được gì, nó chỉ khởi một lượt chấm', () => {
    // Máy không bao giờ merge. Một cửa vào không xác thực người dùng mà chạm tới đường merge thì chính
    // nó là đường để một tác nhân ngoài cho code vào trunk.
    expect(thanRoute()).not.toMatch(/merge|approve|ghiReceipt/i);
  });

  it('⛔C5 — export mới đã khai bảng module của checkmate.yml', () => {
    // Quên khai thì probe chết với «... is not a function» và biến thành finding sai hẳn bản chất — đã
    // xảy ra 5 lần trong repo này.
    const yml = readFileSync('checkmate.yml', 'utf8');
    for (const ten of ['verifyWebhookSignature', 'decideWebhookAction', 'readWebhookSecret', 'writeWebhookSecret']) {
      expect(yml, `${ten} chưa khai trong checkmate.yml`).toContain(ten);
    }
  });

  it('bí mật webhook nằm trong danh sách response-secret-guard gác', () => {
    // Cửa mới không được là chỗ hở của gác cũ: chữ ký là một hàm của bí mật, nên rò bí mật ra bất kỳ
    // response nào là rò thứ mở được cả cửa.
    const src = readFileSync('apps/web/src/response-secret-guard.ts', 'utf8');
    expect(src).toContain('github_webhook_secret');
  });
});
