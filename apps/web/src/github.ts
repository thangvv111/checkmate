import { execFileSync } from 'node:child_process';
import type { CheckmateConfig } from './config.js';

export interface PrTomTat {
  so: number;
  tieuDe: string;
  tacGia: string;
  nhanh: string;
  capNhat: string;
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
  )) as Array<{ number: number; title: string; user: { login: string }; head: { ref: string }; updated_at: string }>;
  return data.map((p) => ({
    so: p.number,
    tieuDe: p.title,
    tacGia: p.user.login,
    nhanh: p.head.ref,
    capNhat: p.updated_at,
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
