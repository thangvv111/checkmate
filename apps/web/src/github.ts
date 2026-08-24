import { execFileSync } from 'node:child_process';
import type { CheckmateConfig } from './config.js';

export interface PrTomTat {
  so: number;
  tieuDe: string;
  tacGia: string;
  nhanh: string;
  capNhat: string;
  headSha: string;
}

export interface PrDaFetch {
  so: number;
  headSha: string;
  baseRef: string; // ref local trỏ nhánh đích
  headRef: string; // ref local trỏ head PR
  filesDoi: string[];
  loai: 'code' | 'doc';
  fileDoc?: string; // file .md được chọn khi loai=doc
}

// Ghi lên GitHub (merge / comment / review) — token hoặc gh CLI của máy
async function goiApiGhi(cfg: CheckmateConfig, method: string, path: string, body: unknown): Promise<unknown> {
  if (cfg.github_token) {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        authorization: `Bearer ${cfg.github_token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'checkmate',
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.status === 204 ? {} : res.json();
  }
  const out = execFileSync('gh', ['api', '-X', method, path.replace(/^\//, ''), '--input', '-'], {
    encoding: 'utf8',
    timeout: 60_000,
    input: JSON.stringify(body ?? {}),
  });
  return out ? JSON.parse(out) : {};
}

export interface PrHienTai {
  headSha: string;
  state: string;
  merged: boolean;
  tacGia?: string;
}

export async function layPrHienTai(cfg: CheckmateConfig, so: number): Promise<PrHienTai> {
  const p = (await goiApi(cfg, `/repos/${cfg.repo.github}/pulls/${so}`)) as {
    head: { sha: string };
    state: string;
    merged: boolean;
    user?: { login: string };
  };
  return { headSha: p.head.sha, state: p.state, merged: p.merged, tacGia: p.user?.login };
}

export async function binhLuanPr(cfg: CheckmateConfig, so: number, body: string): Promise<void> {
  await goiApiGhi(cfg, 'POST', `/repos/${cfg.repo.github}/issues/${so}/comments`, { body });
}

export async function mergePr(cfg: CheckmateConfig, so: number, tieuDe: string, moTa: string): Promise<void> {
  await goiApiGhi(cfg, 'PUT', `/repos/${cfg.repo.github}/pulls/${so}/merge`, {
    merge_method: 'merge',
    commit_title: tieuDe,
    commit_message: moTa,
  });
}

// Trả về dev: thử review Request-changes; GitHub cấm author tự request-changes PR của mình → fallback comment
export async function traVeDev(cfg: CheckmateConfig, so: number, body: string): Promise<'review' | 'comment'> {
  try {
    await goiApiGhi(cfg, 'POST', `/repos/${cfg.repo.github}/pulls/${so}/reviews`, {
      event: 'REQUEST_CHANGES',
      body,
    });
    return 'review';
  } catch {
    await binhLuanPr(cfg, so, body);
    return 'comment';
  }
}

// Chế độ trực (B4.3): gắn check status lên commit — PR hiện dấu xanh/đỏ của CheckMate
export async function ganTrangThaiCommit(
  cfg: CheckmateConfig,
  sha: string,
  state: 'success' | 'failure' | 'pending',
  moTa: string,
): Promise<void> {
  await goiApiGhi(cfg, 'POST', `/repos/${cfg.repo.github}/statuses/${sha}`, {
    state,
    context: 'checkmate',
    description: moTa.slice(0, 138),
  });
}

export async function dongPr(cfg: CheckmateConfig, so: number): Promise<void> {
  await goiApiGhi(cfg, 'PATCH', `/repos/${cfg.repo.github}/pulls/${so}`, { state: 'closed' });
}

async function goiApi(cfg: CheckmateConfig, path: string): Promise<unknown> {
  if (cfg.github_token) {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        authorization: `Bearer ${cfg.github_token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'checkmate',
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
  // không có token trong config → thử gh CLI của máy (dev local)
  // gh là .exe — không dùng shell kẻo '&' trong query bị cmd nuốt
  const out = execFileSync('gh', ['api', path], { encoding: 'utf8', timeout: 30_000 });
  return JSON.parse(out);
}

export async function danhSachPr(cfg: CheckmateConfig): Promise<PrTomTat[]> {
  const data = (await goiApi(
    cfg,
    `/repos/${cfg.repo.github}/pulls?state=open&base=${encodeURIComponent(cfg.repo.base_branch)}&per_page=30`,
  )) as Array<{ number: number; title: string; user: { login: string }; head: { ref: string; sha: string }; updated_at: string }>;
  return data.map((p) => ({
    so: p.number,
    tieuDe: p.title,
    tacGia: p.user.login,
    nhanh: p.head.ref,
    capNhat: p.updated_at,
    headSha: p.head.sha,
  }));
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', timeout: 120_000 }).trim();
}

// Fetch PR + nhánh đích về ref local rồi ROUTER theo nội dung diff:
// chỉ toàn .md → skill doc (chọn file .md đổi nhiều dòng nhất); còn lại → skill code.
export function fetchVaRouter(cfg: CheckmateConfig, so: number): PrDaFetch {
  const lp = cfg.repo.local_path;
  const headRef = `refs/checkmate/pr${so}`;
  const baseRef = 'refs/checkmate/base';
  git(lp, ['fetch', '-f', 'origin', `+refs/pull/${so}/head:${headRef}`, `+refs/heads/${cfg.repo.base_branch}:${baseRef}`]);
  const headSha = git(lp, ['rev-parse', headRef]);
  const filesDoi = git(lp, ['diff', '--name-only', `${baseRef}...${headRef}`]).split('\n').filter(Boolean);
  if (filesDoi.length === 0) throw new Error(`PR #${so} không có file thay đổi so với ${cfg.repo.base_branch}`);

  const toanMd = filesDoi.every((f) => f.toLowerCase().endsWith('.md'));
  if (!toanMd) return { so, headSha, baseRef, headRef, filesDoi, loai: 'code' };

  // chọn file .md đổi nhiều dòng nhất
  const numstat = git(lp, ['diff', '--numstat', `${baseRef}...${headRef}`])
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [them, xoa, file] = l.split('\t');
      return { file, doi: (Number(them) || 0) + (Number(xoa) || 0) };
    })
    .sort((a, b) => b.doi - a.doi);
  return { so, headSha, baseRef, headRef, filesDoi, loai: 'doc', fileDoc: numstat[0].file };
}
