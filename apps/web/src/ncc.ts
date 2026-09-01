import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { readVault, writeVault } from './kho-bi-mat.js';

// Lớp NHÀ CUNG CẤP MODEL — tách hai khái niệm vốn bị gộp làm một:
//   • Nhà cung cấp (Anthropic / GitHub / OpenAI…) — ai chạy model
//   • Phương thức (gói thuê bao / API)            — tiền ra từ đâu
// Mỗi nhà cung cấp cấu hình độc lập; chỉ nhà cung cấp đã KIỂM THÀNH CÔNG mới được chọn để chấm.

export type ProviderId = 'anthropic' | 'github' | 'openai' | 'google';
export type Method = 'thue_bao' | 'api';

// MIỀN CHE của trường phuong_thuc là enum HỆ THỐNG này, KHÔNG phải danh mục của từng nhà cung cấp:
// «thue_bao» với một ncc chỉ-API là tổ hợp không hỗ trợ nhưng vẫn là giá trị hệ thống người dùng chọn
// từ dropdown — băm nó là giấu chính nguyên nhân trong thông điệp lỗi (vòng mười một của cổng bắt).
// Chỉ giá trị ngoài enum này (gõ tay/khoá dán nhầm) mới đáng che theo R5.20.
export const METHODS: readonly Method[] = ['thue_bao', 'api'];

export interface ProviderDefinition {
  ma: ProviderId;
  ten: string;
  /** Dịch vụ đã ngừng hoạt động — giữ trong danh mục để giải thích, nhưng KHÔNG cho chọn */
  ngung?: string;
  phuong_thuc: Method[]; // những phương thức nhà cung cấp này hỗ trợ
  models: string[];
  /** R5.15 — model CHỈ dùng được với gói thuê bao, không mở cho đường API */
  chi_thue_bao?: string[];
  khoa: { ten_bien: string; nhan: string; goi_y: string } | null; // khoá/token cần cho phương thức api
  ghi_chu: string;
}

/**
 * R5.15 — tổ hợp model + phương thức có nằm trong giới hạn của danh mục không.
 * MỌI cửa (form lưu, cổng kiểm, giao diện) hỏi cùng một hàm này — chặn ở một cửa mà hở cửa khác thì
 * giới hạn chỉ là lời dặn.
 */
export function validModel(dn: ProviderDefinition, phuongThuc: Method, model: string): boolean {
  // NGHĨA HẸP có chủ đích (R5.18, chốt sau vòng sáu của cổng): chỉ chặn vi phạm ràng buộc KHAI TƯỜNG
  // MINH. Model ngoài danh mục KHÔNG làm false — danh mục là gợi ý cho giao diện, không phải trần
  // cứng; nhà cung cấp là trọng tài về việc model có tồn tại. Bản đầu coi danh mục là trần đã chặn
  // luôn đường cứu hộ config với model mới ra — hồi quy do gác quá tay.
  if (!dn.phuong_thuc.includes(phuongThuc)) return false;
  if (phuongThuc !== 'thue_bao' && dn.chi_thue_bao?.includes(model)) return false;
  return true;
}

export const PROVIDER_CATALOG: ProviderDefinition[] = [
  {
    ma: 'anthropic',
    ten: 'Anthropic (Claude)',
    phuong_thuc: ['thue_bao', 'api'],
    models: ['claude-sonnet-5', 'claude-opus-5', 'claude-fable-5', 'claude-haiku-4-5-20251001'],
    // Fable 5 đi theo gói thuê bao của chủ máy — cố ý KHÔNG mở cho đường API (PO chốt 31/08)
    chi_thue_bao: ['claude-fable-5'],
    khoa: { ten_bien: 'ANTHROPIC_API_KEY', nhan: 'API key Anthropic', goi_y: 'sk-ant-api03-…' },
    ghi_chu:
      'Gói thuê bao chạy qua Claude Code CLI trên máy chủ (không tiêu credit API) — cần đăng nhập bằng `claude login` hoặc dán token `claude setup-token`. Phương thức API tính tiền theo token.',
  },
  {
    ma: 'github',
    ten: 'GitHub Models',
    ngung: 'GitHub đã khai tử dịch vụ này ngày 30/07/2026 — endpoint trả HTTP 410. Không còn dùng được, giữ ở đây để khỏi ai mất công cấu hình lại.',
    phuong_thuc: ['api'],
    models: ['openai/gpt-4o'],
    khoa: { ten_bien: 'GITHUB_MODELS_TOKEN', nhan: 'GitHub token (scope models:read)', goi_y: 'không còn dùng được' },
    ghi_chu: 'Đã ngừng hoạt động. Muốn chạy các model của OpenAI thì dùng thẳng nhà cung cấp OpenAI bên dưới.',
  },
  {
    ma: 'google',
    ten: 'Google Gemini',
    phuong_thuc: ['api'],
    models: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.5-flash-lite'],
    khoa: { ten_bien: 'GOOGLE_API_KEY', nhan: 'API key Google AI Studio', goi_y: 'AQ.… hoặc AIza…' },
    ghi_chu: 'Chạy qua Google Generative Language API (đường tương thích chuẩn chat/completions). Lấy key ở aistudio.google.com — có hạn mức miễn phí. Google hay khoá model đời cũ với tài khoản mới, nếu báo 404 thì đổi sang model mới hơn trong danh sách.',
  },
  {
    ma: 'openai',
    ten: 'OpenAI',
    phuong_thuc: ['api'],
    models: ['gpt-4o', 'gpt-4o-mini', 'o4-mini'],
    khoa: { ten_bien: 'OPENAI_API_KEY', nhan: 'API key OpenAI', goi_y: 'sk-…' },
    ghi_chu: 'Chạy qua API OpenAI (api.openai.com). Tính tiền theo token của tài khoản OpenAI.',
  },
];

export function providerDefinition(ma: ProviderId): ProviderDefinition {
  return PROVIDER_CATALOG.find((n) => n.ma === ma) ?? PROVIDER_CATALOG[0];
}

export interface ProviderConfig {
  phuong_thuc: Method;
  model: string;
}

export interface CheckResult {
  ok: boolean;
  luc: string;
  thong_diep: string;
  model: string;
  phuong_thuc: Method;
}

const GOC = resolve('.');
const FILE_KIEM = join(GOC, '.ncc-verify.json');

// Khoá của một nhà cung cấp: ưu tiên biến môi trường của dịch vụ, sau đó tới khoá dán qua giao diện.
export function readKey(ma: ProviderId): string {
  const dn = providerDefinition(ma);
  if (!dn.khoa) return '';
  const env = process.env[dn.khoa.ten_bien]?.trim();
  if (env) return env;
  return readVault().khoa?.[ma]?.trim() ?? '';
}

export function writeKey(ma: ProviderId, khoa: string): void {
  const kho = readVault();
  writeVault({ ...kho, khoa: { ...(kho.khoa ?? {}), [ma]: khoa } });
}

export function maskKey(k: string): string {
  return k ? `đã có (${k.length} ký tự, ${k.slice(0, 8)}…)` : 'chưa có';
}

// ---- Sổ kiểm: nhà cung cấp chỉ được chọn sau khi kiểm THÀNH CÔNG ----

export function readProviderCheck(): Partial<Record<ProviderId, CheckResult>> {
  try {
    if (!existsSync(FILE_KIEM)) return {};
    return JSON.parse(readFileSync(FILE_KIEM, 'utf8')) as Partial<Record<ProviderId, CheckResult>>;
  } catch {
    return {};
  }
}

export function writeProviderCheck(ma: ProviderId, kq: CheckResult): void {
  const so = readProviderCheck();
  writeFileSync(FILE_KIEM, JSON.stringify({ ...so, [ma]: kq }, null, 2), 'utf8');
}

// Kiểm còn hiệu lực = đã kiểm OK VỚI ĐÚNG cấu hình hiện tại (đổi model hay phương thức là phải kiểm lại,
// vì cái chạy được với model này chưa chắc chạy được với model kia).
/**
 * PHÉP CHIẾU chung cho giá trị cấu hình trước khi vào sổ kiểm hay đem đối chiếu (R5.20 + R5.5).
 * Giá trị NGOÀI danh mục có thể là khoá dán nhầm → che, nhưng che phải PHÂN BIỆT được (vân tay sha256
 * 8 hex) và phép đối chiếu hiệu lực phải dùng CÙNG phép chiếu — vòng tám của cổng bắt đúng ca sổ lưu
 * bản che còn đối chiếu so bản thô, làm tổ hợp đã kiểm không bao giờ còn hiệu lực.
 */
export function projectValue(giaTri: unknown, danhMuc: readonly string[]): string {
  // TOÀN PHẦN có chủ đích: phép chiếu đứng ở cuối nhiều đường (thông điệp lỗi, sổ kiểm, đối chiếu,
  // giao diện) — nó mà ném với đầu vào khuyết/sai kiểu là đánh sập cả lượt chấm ở đúng chỗ chỉ định
  // hiển thị (vòng mười của cổng bắt: tryProvider nổ .length trên undefined). Khuyết → «(thiếu)»; sai
  // kiểu → ép chuỗi rồi chiếu như thường (giá trị CÓ MẶT phải giữ dấu vết, không được nuốt).
  if (giaTri == null || giaTri === '') return '(thiếu)';
  const s = String(giaTri);
  if (danhMuc.includes(s)) return s;
  return `(ngoài danh mục — ${s.length} ký tự, sha256:${createHash('sha256').update(s).digest('hex').slice(0, 8)})`;
}

export function checkStillValid(ma: ProviderId, cfg: ProviderConfig): CheckResult | null {
  const k = readProviderCheck()[ma];
  if (!k?.ok) return null;
  // So bằng CÙNG phép chiếu với lúc ghi sổ: sổ giữ bản che của giá trị ngoài danh mục (R5.20), nên so
  // bản thô là tổ hợp model-lạ vừa kiểm xong đã «hết hiệu lực» ngay — người dùng model mới không bao
  // giờ chọn được nhà cung cấp.
  // Cấu hình khuyết trường → từ chối ÊM (null), không ném: đường cứu hộ config (R9.13) không hứa
  // hình dạng đủ, và cửa kiểm nổ TypeError là đánh sập cả lượt chấm thay vì bỏ qua một nhà cung cấp
  // (vòng chín của cổng bắt hồi quy này trên chính bản vá vòng tám).
  if (typeof cfg.model !== 'string' || !cfg.model.trim() || !cfg.phuong_thuc) return null;
  const dn = providerDefinition(ma);
  // R5.15 — «MỌI cửa phải tôn trọng giới hạn model», và cửa quyết định một nhà cung cấp có được dùng
  // để chấm hay không chính là cửa này: hàng sổ đời cũ hay sửa tay mang tổ hợp cấm không được mở cổng,
  // dù sổ nói đã kiểm OK (vòng chín).
  if (!validModel(dn, cfg.phuong_thuc, cfg.model)) return null;
  // Sổ luôn lưu ẢNH của phép chiếu (xong() ghi bản che cho giá trị lạ) — nên chiếu vế cấu hình rồi so
  // ảnh với ảnh, ĐỀU TAY cả hai trường (R5.20 gồm cả phuong_thuc — vòng chín bắt vế so lệch). Chiếu
  // vế sổ thêm lần nữa là che-của-che, không bao giờ khớp — test của bản vá vòng tám bắt ra.
  // Sổ đời cũ lỡ lưu giá trị lạ dạng thô thì so ảnh sẽ lệch → coi như hết hiệu lực, phải Kiểm tra
  // lại — lệch về phía nói KHÔNG, đúng chiều an toàn.
  if ((k.model ?? '') !== projectValue(cfg.model, dn.models)) return null;
  if ((k.phuong_thuc ?? '') !== projectValue(String(cfg.phuong_thuc), METHODS)) return null;
  return k;
}
