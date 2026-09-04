import type { Request, Response, NextFunction } from 'express';
import { readVault } from './secret-vault.js';

/**
 * Gác BÍ MẬT Ở BỀ MẶT RESPONSE (capability `response-secret-guard`).
 *
 * Ba luật cùng họ đòi điều này — `R11.20` (danh sách tài khoản), `R9.17` (khoá, token), `R4.26` (token kể
 * cả đã che) — và trước gác này chúng chỉ đúng vì **chưa ai viết route trả bí mật ra**, không phải vì có gì
 * chặn.
 *
 * Vì sao gác được bằng so khớp CHÍNH XÁC, khác hẳn `error-message-egress-gate`:
 *
 *   error-message-egress-gate:  bi mat cua REPO DICH     -> KHONG biet gia tri
 *                               -> danh sach cho phep theo cau truc, chap nhan am tinh gia
 *   gac nay:                    bi mat cua CHINH CHECKER -> BIET gia tri
 *                               -> so khop chinh xac, khong am tinh gia
 *
 * Nên một đường rò lọt qua đây là **lỗi cài đặt**, không phải giới hạn của phương pháp.
 */

/**
 * Bí mật ngắn hơn ngưỡng này bị bỏ qua khi đối chiếu.
 *
 * Một khoá rỗng hoặc vài ký tự sẽ khớp MỌI response và biến gác thành cỗ máy chặn mù — toàn bộ giao diện
 * chết ngay khi ai đó lưu nhầm một chuỗi ngắn. Token GitHub và khoá API thật đều dài hơn 30, nên 12 vừa đủ
 * xa để một chuỗi tình cờ trùng gần như không xảy ra.
 */
export const MIN_SECRET_LENGTH = 12;

/** Biến môi trường mà checker THẬT SỰ đọc — danh sách cho phép về phía nguồn, không phải dò theo tên. */
const SECRET_ENV_NAMES = ['GITHUB_TOKEN', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'];

/** Một bí mật đang lưu: `source` là thứ ĐƯỢC PHÉP nói ra, `value` thì không bao giờ. */
export interface KnownSecret {
  source: string;
  value: string;
}

/**
 * Thu thập bí mật đang lưu. Hàm thuần — nhận kho và môi trường, không tự đọc đĩa, để mỗi nhánh nguồn là
 * một ca test.
 *
 * Đây là **danh sách CHO PHÉP về phía nguồn**: thêm một chỗ lưu bí mật mà quên khai vào đây thì gác không
 * biết nó tồn tại. Giảm nhẹ được vì kho bí mật đã là một cửa duy nhất, nên thêm chỗ lưu là thay đổi nhìn
 * thấy rõ trong diff.
 */
export function collectSecrets(
  vault: ReturnType<typeof readVault> | null,
  env: NodeJS.ProcessEnv = process.env,
): KnownSecret[] {
  const ra: KnownSecret[] = [];
  const them = (source: string, value: unknown) => {
    if (typeof value === 'string' && value.trim().length >= MIN_SECRET_LENGTH) ra.push({ source, value: value.trim() });
  };
  if (vault) {
    them('oauth_token', vault.claude_code_oauth_token);
    // `github-webhook` S1.3 — cửa mới không được là chỗ hở của gác cũ. Chữ ký là một hàm của bí mật,
    // nên rò bí mật ra bất kỳ response nào là rò thứ mở được cả cửa.
    them('github_webhook_secret', vault.github_webhook_secret);
    for (const [ma, khoa] of Object.entries(vault.khoa ?? {})) them(`khoa.${ma}`, khoa);
    for (const [repo, tok] of Object.entries(vault.repo_token ?? {})) them(`repo_token.${repo}`, tok);
  }
  for (const ten of SECRET_ENV_NAMES) them(`env.${ten}`, env[ten]);
  return ra;
}

/**
 * Dò bí mật trong một thân response. Trả về **TÊN NGUỒN** khớp đầu tiên, hoặc `null`.
 *
 * MUST NOT trả giá trị: bẫy tự nhiên nhất của một gác bảo mật là báo «response chứa `ghp_abc…`» — lời báo
 * ấy đưa bí mật vào log và lên màn hình, tức gác sinh ra để chặn rò lại thành đường rò, ở một bề mặt DAI
 * HƠN response vì log lưu lại.
 */
export function findSecret(body: unknown, secrets: readonly KnownSecret[]): string | null {
  const van = toText(body);
  if (!van) return null;
  for (const s of secrets) if (van.includes(s.value)) return s.source;
  return null;
}

/** Đưa thân response về chuỗi để dò. Đầu vào méo KHÔNG được làm gác ném (D6). */
function toText(body: unknown): string {
  if (typeof body === 'string') return body;
  if (body === null || body === undefined) return '';
  if (Buffer.isBuffer(body)) {
    try {
      return body.toString('utf8');
    } catch {
      return '';
    }
  }
  try {
    return JSON.stringify(body) ?? '';
  } catch {
    // Tham chiếu vòng: JSON.stringify ném. Gác chạy trên MỌI response nên nó ném là toàn bộ giao diện
    // chết vì một nhánh phụ — fail theo hướng mở, có chủ đích (security S7.2).
    return '';
  }
}

/** Thông điệp chặn — nêu TÊN NGUỒN, tuyệt đối không nêu giá trị (D4). */
export function blockMessage(source: string): string {
  return `Chặn: response chứa bí mật đang lưu (nguồn: ${source}). Không gửi ra ngoài.`;
}

/**
 * Gắn gác vào một response. Bọc cả hai bề mặt, và chúng chặn khác nhau vì trạng thái lúc bắt khác nhau:
 *
 *   route JSON  chua gui gi        -> doi sang loi may chu, bo than
 *   luong SSE   header 200 DA gui  -> chi cat duoc ket noi
 *
 * Cách thứ hai **yếu hơn**: mẩu mang bí mật không được gửi, nhưng client đã nhận `200` và các mẩu trước.
 * Nó chặn được rò bí mật, không chặn được việc client tưởng lượt chấm đang chạy bình thường.
 *
 * Luồng sự kiện là bề mặt dễ quên nhất — nó không đi qua đường trả JSON, mà nó đúng là đường phát log của
 * lượt chấm, nơi bí mật hay lọt vào nhất.
 */
export function attachSecretGuard(_req: Request, res: Response, next: NextFunction): void {
  // Đọc kho ở MỖI response, không nhớ lại: ⛔C6 đòi sửa file bằng tay có hiệu lực ở lượt đọc kế tiếp, và
  // một bí mật vừa thêm mà gác chưa biết là đúng cái lỗ này sinh ra để bịt. File nhỏ, hệ điều hành cache.
  const secrets = readSecretsSafely();

  // Bọc `send`, KHÔNG bọc `json`: Express dựng `res.json` bằng cách stringify rồi gọi `this.send(...)`,
  // nên một lớp bọc ở `send` phủ cả JSON lẫn **HTML** — và HTML là bề mặt lớn nhất (10 chỗ `res.send`
  // trong `server.ts`, tức mọi màn hình).
  //
  // Bản đầu của gác chỉ bọc `json` và `write`. Mười sáu ca test và năm đột biến đều xanh, nhưng lượt kiểm
  // tay đầu tiên trên máy chủ thật cho thấy trang login **không** bị chặn dù chứa đúng chuỗi đã đặt làm
  // bí mật — vì nó đi qua `send`. Đó đúng là thứ ca T7.1 sinh ra để bắt: ca test chỉ kiểm được bề mặt mà
  // người viết NGHĨ RA, còn máy chủ thật thì kiểm mọi bề mặt nó có.
  let dangChan = false;
  const sendGoc = res.send.bind(res);
  res.send = ((body: unknown) => {
    if (dangChan) return sendGoc(body as never);
    const nguon = findSecret(body, secrets);
    if (nguon === null) return sendGoc(body as never);
    console.error(blockMessage(nguon));
    dangChan = true; // thông điệp chặn không chứa bí mật, nhưng không quét lại cho khỏi tốn một vòng
    return res.status(500).type('application/json').send(JSON.stringify({ loi: blockMessage(nguon) }));
  }) as Response['send'];

  const writeGoc = res.write.bind(res);
  res.write = ((chunk: unknown, ...rest: unknown[]) => {
    const nguon = findSecret(chunk, secrets);
    if (nguon === null) return (writeGoc as (...a: unknown[]) => boolean)(chunk, ...rest);
    console.error(blockMessage(nguon));
    res.end();
    return false;
  }) as Response['write'];

  next();
}

/**
 * Đọc kho bí mật, và NÓI RA khi không đọc được.
 *
 * Gác không biết bí mật nào tồn tại là gác không gác gì — mà trạng thái ấy trông y hệt «không có bí mật nào
 * để rò». Đúng mệnh đề mà ca load-bearing của `identifier-language-gate` nói: một phép quét trả rỗng giống
 * hệt hai chuyện khác nhau.
 */
function readSecretsSafely(): KnownSecret[] {
  try {
    return collectSecrets(readVault());
  } catch (e) {
    console.error(
      `Gác bí mật response: KHÔNG đọc được kho bí mật — gác đang chạy mà không có nguồn đối chiếu (${(e as Error).message.slice(0, 120)})`,
    );
    return collectSecrets(null);
  }
}
