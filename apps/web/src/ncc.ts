import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { docKho, ghiKho } from './kho-bi-mat.js';

// Lớp NHÀ CUNG CẤP MODEL — tách hai khái niệm vốn bị gộp làm một:
//   • Nhà cung cấp (Anthropic / GitHub / OpenAI…) — ai chạy model
//   • Phương thức (gói thuê bao / API)            — tiền ra từ đâu
// Mỗi nhà cung cấp cấu hình độc lập; chỉ nhà cung cấp đã KIỂM THÀNH CÔNG mới được chọn để chấm.

export type MaNcc = 'anthropic' | 'github' | 'openai' | 'google';
export type PhuongThuc = 'thue_bao' | 'api';

export interface DinhNghiaNcc {
  ma: MaNcc;
  ten: string;
  /** Dịch vụ đã ngừng hoạt động — giữ trong danh mục để giải thích, nhưng KHÔNG cho chọn */
  ngung?: string;
  phuong_thuc: PhuongThuc[]; // những phương thức nhà cung cấp này hỗ trợ
  models: string[];
  khoa: { ten_bien: string; nhan: string; goi_y: string } | null; // khoá/token cần cho phương thức api
  ghi_chu: string;
}

export const DANH_MUC_NCC: DinhNghiaNcc[] = [
  {
    ma: 'anthropic',
    ten: 'Anthropic (Claude)',
    phuong_thuc: ['thue_bao', 'api'],
    models: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'],
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

export function dinhNghia(ma: MaNcc): DinhNghiaNcc {
  return DANH_MUC_NCC.find((n) => n.ma === ma) ?? DANH_MUC_NCC[0];
}

export interface CauHinhNcc {
  phuong_thuc: PhuongThuc;
  model: string;
}

export interface KetQuaKiem {
  ok: boolean;
  luc: string;
  thong_diep: string;
  model: string;
  phuong_thuc: PhuongThuc;
}

const GOC = resolve('.');
const FILE_KIEM = join(GOC, '.ncc-verify.json');

// Khoá của một nhà cung cấp: ưu tiên biến môi trường của dịch vụ, sau đó tới khoá dán qua giao diện.
export function docKhoa(ma: MaNcc): string {
  const dn = dinhNghia(ma);
  if (!dn.khoa) return '';
  const env = process.env[dn.khoa.ten_bien]?.trim();
  if (env) return env;
  return docKho().khoa?.[ma]?.trim() ?? '';
}

export function ghiKhoa(ma: MaNcc, khoa: string): void {
  const kho = docKho();
  ghiKho({ ...kho, khoa: { ...(kho.khoa ?? {}), [ma]: khoa } });
}

export function cheKhoa(k: string): string {
  return k ? `đã có (${k.length} ký tự, ${k.slice(0, 8)}…)` : 'chưa có';
}

// ---- Sổ kiểm: nhà cung cấp chỉ được chọn sau khi kiểm THÀNH CÔNG ----

export function docSoKiem(): Partial<Record<MaNcc, KetQuaKiem>> {
  try {
    if (!existsSync(FILE_KIEM)) return {};
    return JSON.parse(readFileSync(FILE_KIEM, 'utf8')) as Partial<Record<MaNcc, KetQuaKiem>>;
  } catch {
    return {};
  }
}

export function ghiSoKiem(ma: MaNcc, kq: KetQuaKiem): void {
  const so = docSoKiem();
  writeFileSync(FILE_KIEM, JSON.stringify({ ...so, [ma]: kq }, null, 2), 'utf8');
}

// Kiểm còn hiệu lực = đã kiểm OK VỚI ĐÚNG cấu hình hiện tại (đổi model hay phương thức là phải kiểm lại,
// vì cái chạy được với model này chưa chắc chạy được với model kia).
export function kiemConHieuLuc(ma: MaNcc, cfg: CauHinhNcc): KetQuaKiem | null {
  const k = docSoKiem()[ma];
  if (!k?.ok) return null;
  if (k.model !== cfg.model || k.phuong_thuc !== cfg.phuong_thuc) return null;
  return k;
}
