import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { openDb } from './kho/db.js';

/**
 * Danh tính người thao tác và phiên đăng nhập (specs/R11).
 *
 * Đây là CỬA DUY NHẤT đọc danh tính (R11.4). Nguồn danh tính hiện tại là kho tài khoản cục bộ; thay
 * bằng thư mục doanh nghiệp (AD/LDAP/SSO) về sau chỉ phải sửa file này. Điều kiện để câu «làm cơ chế
 * danh tính, không làm nguồn danh tính» là cam kết kiểm chứng được chứ không phải một lời hứa.
 *
 * Không dùng thư viện ngoài: `node:crypto` có đủ scrypt, so-sánh-thời-gian-hằng-định và sinh ngẫu
 * nhiên — cùng tinh thần zero-install với `node:sqlite` của lớp kho.
 */

export type Role = 'nguoi_xem' | 'tu_dong' | 'van_hanh' | 'duyet_cong';

export interface Identity {
  ten: string;
  vai: Role;
}

/** Lỗi danh tính — chỗ gọi bắt cái này để trả 401/403 thay vì 500 */
export class IdentityError extends Error {
  constructor(
    message: string,
    readonly ma: 'chua_dang_nhap' | 'phien_het_han' | 'khong_du_quyen',
  ) {
    super(message);
  }
}

const TEN_COOKIE = 'checkmate_phien';
const HAN_PHIEN_MS = Math.max(5 * 60_000, Number(process.env.CHECKMATE_HAN_PHIEN_PHUT ?? 480) * 60_000);

// scrypt: hàm chậm có chủ đích. N=16384 là mức OWASP khuyến nghị tối thiểu, đủ chậm để dò từng mật
// khẩu tốn kém mà vẫn dưới 100ms mỗi lần đăng nhập.
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const DAI_HASH = 64;

/**
 * R11.9 — ép khuôn tên LÚC TẠO TÀI KHOẢN, không phải lúc hiển thị.
 *
 * Tên chảy ra hai bề mặt khác bản chất: HTML, và markdown của comment PR cùng thân commit merge. Hai
 * thứ sau **đăng công khai và không thu hồi được**. Một tên sạch từ gốc thì không phải nhớ gột ở từng
 * chỗ — mà chỗ nào quên gột thì không ai biết cho tới lúc nó đã lên GitHub.
 */
export function validName(ten: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(ten);
}

function bam(matKhau: string, muoi: string): Buffer {
  return scryptSync(matKhau, muoi, DAI_HASH, SCRYPT);
}

/** Băm token phiên trước khi lưu (R11.11) — đọc được cơ sở dữ liệu cũng không dựng lại được phiên */
function bamToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ---------- Tài khoản ----------

export function createAccount(ten: string, matKhau: string, vai: Role): void {
  if (!validName(ten)) {
    throw new Error(`Tên đăng nhập «${ten}» không hợp lệ: chỉ chữ thường, số, dấu chấm, gạch dưới, gạch nối; 3–32 ký tự (R11.9).`);
  }
  if (matKhau.length < 12) {
    throw new Error('Mật khẩu phải từ 12 ký tự — đây là tài khoản mở được cổng merge, không phải tài khoản đọc báo.');
  }
  const muoi = randomBytes(16).toString('hex');
  openDb()
    .prepare('INSERT INTO nguoi_dung (ten, hash, muoi, vai, tao_luc) VALUES (?,?,?,?,?)')
    .run(ten, bam(matKhau, muoi).toString('hex'), muoi, vai, new Date().toISOString());
}

export function changePassword(ten: string, matKhauMoi: string): void {
  if (matKhauMoi.length < 12) throw new Error('Mật khẩu phải từ 12 ký tự.');
  const muoi = randomBytes(16).toString('hex');
  const kq = openDb()
    .prepare('UPDATE nguoi_dung SET hash = ?, muoi = ?, doi_mk_luc = ? WHERE ten = ?')
    .run(bam(matKhauMoi, muoi).toString('hex'), muoi, new Date().toISOString(), ten);
  if (kq.changes === 0) throw new Error(`Không có tài khoản «${ten}».`);
  // Đổi mật khẩu thì mọi phiên cũ phải chết: nếu đổi vì nghi lộ, để phiên cũ sống là không đổi gì cả
  openDb().prepare('DELETE FROM phien WHERE ten = ?').run(ten);
}

export function changeRole(ten: string, vai: Role): void {
  const kq = openDb().prepare('UPDATE nguoi_dung SET vai = ? WHERE ten = ?').run(vai, ten);
  if (kq.changes === 0) throw new Error(`Không có tài khoản «${ten}».`);
}

/** R11.21 — gỡ tài khoản PHẢI huỷ mọi phiên đang sống của nó */
export function deleteAccount(ten: string): void {
  openDb().prepare('DELETE FROM phien WHERE ten = ?').run(ten);
  const kq = openDb().prepare('DELETE FROM nguoi_dung WHERE ten = ?').run(ten);
  if (kq.changes === 0) throw new Error(`Không có tài khoản «${ten}».`);
}

/** Danh sách tài khoản — CHỈ cho lệnh CLI trên máy chủ. R11.20 cấm mọi route trả thứ này ra ngoài. */
export function listAccounts(): Array<{ ten: string; vai: Role; tao_luc: string; doi_mk_luc: string | null }> {
  return openDb().prepare('SELECT ten, vai, tao_luc, doi_mk_luc FROM nguoi_dung ORDER BY ten').all() as never;
}

export function hasAnyAccount(): boolean {
  return Number((openDb().prepare('SELECT COUNT(*) AS n FROM nguoi_dung').get() as { n: number }).n) > 0;
}

// ---------- Đăng nhập ----------

/**
 * Kiểm mật khẩu. Trả về danh tính, hoặc null nếu sai — KHÔNG phân biệt «sai tên» với «sai mật khẩu»
 * ở giá trị trả về (R11.10): nói rõ tài khoản nào có thật là giúp người dò biết mình dò đúng chỗ.
 *
 * Khi không có tài khoản, vẫn băm một lần với muối giả để thời gian trả lời không tố cáo điều đó.
 */
export function verifyPassword(ten: string, matKhau: string): Identity | null {
  const h = openDb().prepare('SELECT ten, hash, muoi, vai FROM nguoi_dung WHERE ten = ?').get(ten) as
    | { ten: string; hash: string; muoi: string; vai: Role }
    | undefined;
  if (!h) {
    bam(matKhau, 'muoi-gia-de-thoi-gian-tra-loi-khong-to-cao-tai-khoan-co-that');
    return null;
  }
  const thu = bam(matKhau, h.muoi);
  const that = Buffer.from(h.hash, 'hex');
  // R11.6 — so bằng `===` để lộ độ dài tiền tố khớp qua thời gian trả lời
  if (thu.length !== that.length || !timingSafeEqual(thu, that)) return null;
  return { ten: h.ten, vai: h.vai };
}

/** Tạo phiên. Trả token THÔ đúng một lần — cơ sở dữ liệu chỉ giữ hash của nó (R11.11). */
export function createSession(ten: string): { token: string; hetHan: Date } {
  const token = randomBytes(32).toString('base64url');
  const hetHan = new Date(Date.now() + HAN_PHIEN_MS);
  openDb()
    .prepare('INSERT INTO phien (token_hash, ten, tao_luc, het_han) VALUES (?,?,?,?)')
    .run(bamToken(token), ten, new Date().toISOString(), hetHan.toISOString());
  return { token, hetHan };
}

/** R11.13 — đăng xuất xoá phiên ở PHÍA MÁY CHỦ; xoá mỗi cookie là để lại token còn sống */
export function deleteSession(token: string): void {
  openDb().prepare('DELETE FROM phien WHERE token_hash = ?').run(bamToken(token));
}

/** Dọn phiên quá hạn — gọi lúc khởi động, cùng chỗ dọn lượt chấm mồ côi */
export function cleanupExpiredSessions(): number {
  return Number(openDb().prepare('DELETE FROM phien WHERE het_han <= ?').run(new Date().toISOString()).changes ?? 0);
}

// ---------- Đọc danh tính từ yêu cầu HTTP ----------

export function readCookie(req: Pick<IncomingMessage, 'headers'>, ten: string): string {
  const raw = req.headers.cookie;
  if (!raw) return '';
  for (const phan of raw.split(';')) {
    const i = phan.indexOf('=');
    if (i < 0) continue;
    if (phan.slice(0, i).trim() === ten) return decodeURIComponent(phan.slice(i + 1).trim());
  }
  return '';
}

/**
 * CỬA DUY NHẤT đọc danh tính (R11.4).
 *
 * R11.3 — KHÔNG có giá trị mặc định nào. Thiếu phiên, phiên hết hạn, tài khoản đã bị gỡ → NÉM LỖI.
 * Chính một `catch { return 'operator' }` đã sinh ra lỗi mà R11 tồn tại để sửa: sổ vẫn có hàng, chỉ là
 * hàng vô nghĩa. Vá một fallback bằng một fallback khác là không vá gì.
 */
export function getIdentity(req: Pick<IncomingMessage, 'headers'>): Identity {
  const token = readCookie(req, TEN_COOKIE);
  if (!token) throw new IdentityError('Chưa đăng nhập.', 'chua_dang_nhap');
  const h = openDb()
    .prepare(
      `SELECT p.het_han AS het_han, n.ten AS ten, n.vai AS vai
       FROM phien p JOIN nguoi_dung n ON n.ten = p.ten
       WHERE p.token_hash = ?`,
    )
    .get(bamToken(token)) as { het_han: string; ten: string; vai: Role } | undefined;
  // Tài khoản bị gỡ thì JOIN không ra hàng — cùng đường với «chưa đăng nhập», đúng ý R11.21
  if (!h) throw new IdentityError('Phiên không còn hiệu lực.', 'chua_dang_nhap');
  if (new Date(h.het_han).getTime() <= Date.now()) {
    deleteSession(token);
    throw new IdentityError('Phiên đã hết hạn — đăng nhập lại.', 'phien_het_han');
  }
  return { ten: h.ten, vai: h.vai };
}

/** Có phiên hợp lệ không, không ném lỗi — dùng cho chỗ chỉ cần biết để vẽ giao diện */
export function identityIfAny(req: Pick<IncomingMessage, 'headers'>): Identity | null {
  try {
    return getIdentity(req);
  } catch {
    return null;
  }
}

// ---------- Quyền ----------

/**
 * R11.18 — tác nhân máy KHÔNG được bấm cổng. Chỉ vai `duyet_cong` mở được cổng merge/trả-về-dev; tài
 * khoản dùng cho tự động hoá mang vai `van_hanh` và bị chặn ở đây, không phải chặn bằng kỷ luật.
 *
 * Nói cho đúng mức: ba vai này CHƯA phải phân tách nhiệm vụ đầy đủ — chúng chưa tách người viết code
 * khỏi người duyệt. Điều chúng bảo đảm được và đáng nói ra là: **máy không bao giờ tự merge**.
 */
export function canOperateGate(dt: Identity): boolean {
  return dt.vai === 'duyet_cong';
}

export function requireGateRole(dt: Identity): void {
  if (!canOperateGate(dt)) {
    throw new IdentityError(`Tài khoản «${dt.ten}» mang vai ${dt.vai}, không được thao tác cổng merge.`, 'khong_du_quyen');
  }
}

export function canOperate(dt: Identity): boolean {
  return dt.vai === 'van_hanh' || dt.vai === 'duyet_cong';
}

/**
 * R11.18b — vai `tu_dong` chạy chấm và trả về dev được, nhưng KHÔNG sửa cấu hình.
 *
 * Tách khỏi `van_hanh` vì vai đó sửa được cấu hình, trong đó có cả token và nhà cung cấp model. Một tài
 * khoản chạy không người trông không cần quyền ấy, và mọi quyền thừa của nó là bề mặt tấn công không ai canh.
 */
export function canRunReview(dt: Identity): boolean {
  return dt.vai === 'tu_dong' || dt.vai === 'van_hanh' || dt.vai === 'duyet_cong';
}

export function canEditConfig(dt: Identity): boolean {
  return dt.vai === 'van_hanh' || dt.vai === 'duyet_cong';
}

export const SESSION_COOKIE_NAME = TEN_COOKIE;
export const SESSION_TTL_MS = HAN_PHIEN_MS;
