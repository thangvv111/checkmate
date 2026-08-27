import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Chế độ vận hành (spec §9): demo = deploy public, khoá repo demo, Settings chỉ-đọc (fail-closed);
// org = self-host trong tổ chức, mở toàn bộ cấu hình. Bật org bằng --org hoặc CHECKMATE_MODE=org.
export const MODE: 'demo' | 'org' =
  process.argv.includes('--org') || process.env.CHECKMATE_MODE === 'org' ? 'org' : 'demo';

export interface AgentConfig {
  provider: 'cli' | 'api';
  model: string;
  max_probe: number;
  skeptic: boolean;
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

const MAC_DINH: CheckmateConfig = {
  repo: {
    github: 'thangvv111/demo-credit-approval',
    base_branch: 'main',
    local_path: process.env.CHECKMATE_DEMO_REPO ?? resolve(GOC, '../demo-credit-approval'),
  },
  github_token: '',
  agent: { provider: 'cli', model: 'claude-sonnet-5', max_probe: 6, skeptic: true },
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
    agent: { ...MAC_DINH.agent, ...luu.agent },
    truc: { ...MAC_DINH.truc, ...luu.truc },
  };
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
export function envAgent(c: CheckmateConfig): NodeJS.ProcessEnv {
  return {
    CHECKER_PROVIDER: c.agent.provider,
    CHECKER_MODEL: c.agent.model,
    CHECKER_MAX_PROBE: String(c.agent.max_probe),
    CHECKER_SKEPTIC: c.agent.skeptic ? '1' : '0',
  };
}
