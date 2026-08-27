import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dinhNghia, docKhoa, type CauHinhNcc, type MaNcc } from './ncc.js';

// Chế độ vận hành (spec §9): demo = deploy public, khoá repo demo, Settings chỉ-đọc (fail-closed);
// org = self-host trong tổ chức, mở toàn bộ cấu hình. Bật org bằng --org hoặc CHECKMATE_MODE=org.
export const MODE: 'demo' | 'org' =
  process.argv.includes('--org') || process.env.CHECKMATE_MODE === 'org' ? 'org' : 'demo';

export interface AgentConfig {
  /** Nhà cung cấp đang dùng để chấm — chỉ đặt được sau khi kiểm thành công */
  ncc: MaNcc;
  /** Cấu hình riêng của TỪNG nhà cung cấp, giữ lại khi đổi qua đổi lại */
  ncc_cau_hinh: Partial<Record<MaNcc, CauHinhNcc>>;
  max_probe: number;
  skeptic: boolean;
  /** @deprecated giữ để đọc được config đời cũ (provider cli|api + model phẳng) */
  provider?: 'cli' | 'api';
  /** @deprecated */
  model?: string;
}

export interface RepoConfig {
  github: string; // owner/repo
  base_branch: string;
  local_path: string; // clone local mà harness chạy trên đó
}

export interface TrucConfig {
  bat: boolean; // chế độ trực: poller tự chấm PR mới — mặc định TẮT (không tự đốt model khi chưa ai bật)
  chu_ky_giay: number;
  tu_dong_comment: boolean; // post verdict comment + commit status lên GitHub khi run xong
}

export interface CheckmateConfig {
  repo: RepoConfig;
  github_token: string; // rỗng = thử dùng gh CLI của máy
  agent: AgentConfig;
  truc: TrucConfig;
}

const GOC = resolve('.');
const FILE = join(GOC, 'config.json');
// Secrets KHÔNG nằm chung config.json: file riêng quyền 600, gitignore, để lộ file cấu hình
// (chụp màn hình, gửi log) không kéo theo chìa khoá.
const FILE_SECRET = join(GOC, '.secrets.json');

const MAC_DINH: CheckmateConfig = {
  repo: {
    github: 'thangvv111/demo-credit-approval',
    base_branch: 'main',
    local_path: process.env.CHECKMATE_DEMO_REPO ?? resolve(GOC, '../demo-credit-approval'),
  },
  github_token: '',
  agent: {
    ncc: 'anthropic',
    ncc_cau_hinh: { anthropic: { phuong_thuc: 'thue_bao', model: 'claude-sonnet-5' } },
    max_probe: 6,
    skeptic: true,
  },
  truc: { bat: false, chu_ky_giay: 300, tu_dong_comment: true },
};

export function docConfig(): CheckmateConfig {
  // Deploy trên server: secrets nên nằm ở file env quyền 600 (EnvironmentFile của systemd),
  // không nằm trong config.json cạnh source. Env THẮNG config để chủ máy đổi một chỗ rồi restart.
  const tokenEnv = process.env.GITHUB_TOKEN?.trim() ?? '';
  if (!existsSync(FILE)) {
    const c = structuredClone(MAC_DINH);
    if (tokenEnv) c.github_token = tokenEnv;
    return c;
  }
  const luu = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<CheckmateConfig>;
  return {
    repo: { ...MAC_DINH.repo, ...luu.repo },
    github_token: tokenEnv || (luu.github_token ?? ''),
    agent: nangCapAgent(luu.agent),
    truc: { ...MAC_DINH.truc, ...luu.truc },
  };
}

// Config đời cũ chỉ có provider 'cli'|'api' + model phẳng — nâng lên mô hình nhà-cung-cấp
// mà không bắt người dùng cấu hình lại từ đầu.
function nangCapAgent(a?: Partial<AgentConfig>): AgentConfig {
  if (!a) return structuredClone(MAC_DINH.agent);
  if (a.ncc && a.ncc_cau_hinh) {
    return { ...MAC_DINH.agent, ...a, ncc_cau_hinh: { ...MAC_DINH.agent.ncc_cau_hinh, ...a.ncc_cau_hinh } } as AgentConfig;
  }
  return {
    ncc: 'anthropic',
    ncc_cau_hinh: {
      anthropic: { phuong_thuc: a.provider === 'api' ? 'api' : 'thue_bao', model: a.model ?? 'claude-sonnet-5' },
    },
    max_probe: a.max_probe ?? 6,
    skeptic: a.skeptic ?? true,
  };
}

export function cauHinhHienTai(c: CheckmateConfig): CauHinhNcc {
  const dn = dinhNghia(c.agent.ncc);
  return c.agent.ncc_cau_hinh[c.agent.ncc] ?? { phuong_thuc: dn.phuong_thuc[0], model: dn.models[0] };
}

export function ghiConfig(c: CheckmateConfig): void {
  if (MODE === 'demo') throw new Error('Chế độ demo không cho sửa cấu hình');
  writeFileSync(FILE, JSON.stringify(c, null, 2) + '\n', 'utf8');
}

export function cheToken(token: string): string {
  if (!token) return '(chưa đặt — dùng đăng nhập gh của máy nếu có)';
  return token.slice(0, 7) + '****' + token.slice(-4);
}

// Env truyền xuống harness CLI theo cấu hình agent
// Token gói thuê bao Claude Code (tạo bằng `claude setup-token` trên máy có trình duyệt).
// Ưu tiên biến môi trường của dịch vụ; không có thì lấy từ file secrets do người dùng dán qua giao diện.
export function docTokenThueBao(): string {
  const env = process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
  if (env) return env;
  try {
    if (!existsSync(FILE_SECRET)) return '';
    const s = JSON.parse(readFileSync(FILE_SECRET, 'utf8')) as { claude_code_oauth_token?: string };
    return s.claude_code_oauth_token?.trim() ?? '';
  } catch {
    return '';
  }
}

export function ghiTokenThueBao(token: string): void {
  const cu = existsSync(FILE_SECRET) ? (JSON.parse(readFileSync(FILE_SECRET, 'utf8')) as Record<string, unknown>) : {};
  writeFileSync(FILE_SECRET, JSON.stringify({ ...cu, claude_code_oauth_token: token }, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(FILE_SECRET, 0o600); // file đã tồn tại thì mode ở writeFileSync không áp — siết lại cho chắc
  } catch {
    /* hệ thống không hỗ trợ chmod (Windows) — bỏ qua */
  }
}

export function cheToken2(t: string): string {
  return t ? `đã lưu (${t.length} ký tự, ${t.slice(0, 8)}…)` : 'chưa có';
}

export function envAgent(c: CheckmateConfig): NodeJS.ProcessEnv {
  const cfg = cauHinhHienTai(c);
  const ncc = c.agent.ncc;
  const tokenTb = docTokenThueBao();
  const khoa = docKhoa(ncc);
  return {
    CHECKER_NCC: ncc,
    // anthropic giữ hai đường cũ (cli = gói thuê bao, api = ví API); nhà cung cấp khác luôn đi API
    CHECKER_PROVIDER: ncc === 'anthropic' ? (cfg.phuong_thuc === 'thue_bao' ? 'cli' : 'api') : 'api',
    CHECKER_MODEL: cfg.model,
    CHECKER_MAX_PROBE: String(c.agent.max_probe),
    CHECKER_SKEPTIC: c.agent.skeptic ? '1' : '0',
    ...(ncc === 'anthropic' && cfg.phuong_thuc === 'thue_bao' && tokenTb ? { CLAUDE_CODE_OAUTH_TOKEN: tokenTb } : {}),
    ...(ncc === 'anthropic' && cfg.phuong_thuc === 'api' && khoa ? { ANTHROPIC_API_KEY: khoa } : {}),
    ...(ncc === 'github' && khoa ? { GITHUB_MODELS_TOKEN: khoa } : {}),
    ...(ncc === 'openai' && khoa ? { OPENAI_API_KEY: khoa } : {}),
  };
}
