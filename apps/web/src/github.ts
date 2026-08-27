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

export async function mergePr(cfg: CheckmateConfig, so: number, tieuDe: string, moTa: string, sha?: string): Promise<void> {
  await goiApiGhi(cfg, 'PUT', `/repos/${cfg.repo.github}/pulls/${so}/merge`, {
    merge_method: 'merge',
    commit_title: tieuDe,
    commit_message: moTa,
    // W1: pin head SHA — GitHub tự trả 409 nếu PR nhận commit mới giữa lúc kiểm và lúc bấm (chặn TOCTOU phía server)
    ...(sha ? { sha } : {}),
  });
  xoaCachePr();
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
  xoaCachePr();
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
  try {
    const out = execFileSync('gh', ['api', path], { encoding: 'utf8', timeout: 30_000 });
    return JSON.parse(out);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error(
        'Chưa có GitHub token và máy này không có lệnh `gh` (bản chạy trên server thường vậy). ' +
          'Chủ máy điền GITHUB_TOKEN vào /etc/checkmate.env (quyền 600) rồi `sudo systemctl restart checkmate`, ' +
          'hoặc điền token trong ⚙ Cài đặt khi chạy chế độ org.',
      );
    }
    throw e;
  }
}

// L5: cache danh sách PR 30s — trang chủ + poller không dội GitHub mỗi lượt (rate limit 60/h khi không token)
let cachePr: { key: string; luc: number; data: PrTomTat[] } | null = null;
export function xoaCachePr(): void { cachePr = null; }

export async function danhSachPr(cfg: CheckmateConfig): Promise<PrTomTat[]> {
  const key = cfg.repo.github;
  if (cachePr && cachePr.key === key && Date.now() - cachePr.luc < 30_000) return cachePr.data;
  const data = (await goiApi(
    cfg,
    `/repos/${cfg.repo.github}/pulls?state=open&base=${encodeURIComponent(cfg.repo.base_branch)}&per_page=30`,
  )) as Array<{ number: number; title: string; user: { login: string }; head: { ref: string; sha: string }; updated_at: string }>;
  const ds = data.map((p) => ({
    so: p.number,
    tieuDe: p.title,
    tacGia: p.user.login,
    nhanh: p.head.ref,
    capNhat: p.updated_at,
    headSha: p.head.sha,
  }));
  cachePr = { key, luc: Date.now(), data: ds };
  return ds;
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', timeout: 120_000 }).trim();
}

// Fetch PR + nhánh đích về ref local rồi ROUTER theo nội dung diff:
// chỉ toàn .md → skill doc (chọn file .md đổi nhiều dòng nhất); còn lại → skill code.
export function fetchVaRouter(cfg: CheckmateConfig, so: number): PrDaFetch {
  const lp = cfg.repo.local_path;
  const headRef = `refs/checkmate/pr${so}`;
  // Ref riêng theo PR: hai lượt song song cùng dùng chung một ref base thì lượt sau force-update ref
  // đó, và lượt trước có thể đối chứng nhầm sang commit base mới hơn commit nó định so.
  const baseRef = `refs/checkmate/base-pr${so}`;
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

// ---- Kết nối repo: liệt kê repo mà token nhìn thấy, rồi clone về máy chủ ----

export interface RepoGithub {
  full_name: string; // owner/repo
  private: boolean;
  default_branch: string;
  updated_at: string;
  mo_ta?: string;
}

/** Repo mà token hiện tại truy cập được — dùng cho màn "chọn repo" thay vì bắt gõ tay owner/repo. */
export async function danhSachRepoCuaToken(cfg: CheckmateConfig): Promise<RepoGithub[]> {
  const ra: RepoGithub[] = [];
  for (let trang = 1; trang <= 3; trang++) {
    const lo = (await goiApi(cfg, `/user/repos?per_page=100&sort=updated&page=${trang}`)) as Array<{
      full_name: string;
      private: boolean;
      default_branch: string;
      updated_at: string;
      description?: string;
    }>;
    ra.push(
      ...lo.map((r) => ({
        full_name: r.full_name,
        private: r.private,
        default_branch: r.default_branch,
        updated_at: r.updated_at,
        mo_ta: r.description ?? undefined,
      })),
    );
    if (lo.length < 100) break;
  }
  return ra;
}

/**
 * Clone repo về thư mục do CheckMate quản (harness cần một clone local để dựng sandbox).
 * Token chỉ dùng LÚC clone rồi gỡ khỏi remote URL — không để token nằm lại trong .git/config.
 */
export function cloneRepo(cfg: CheckmateConfig, github: string, dich: string): void {
  const sach = `https://github.com/${github}.git`;
  const coToken = cfg.github_token ? `https://x-access-token:${cfg.github_token}@github.com/${github}.git` : sach;
  execFileSync('git', ['clone', '--no-single-branch', coToken, dich], { encoding: 'utf8', timeout: 600_000 });
  // gỡ token khỏi remote ngay: lần fetch sau dùng credential helper / token trong môi trường
  execFileSync('git', ['remote', 'set-url', 'origin', sach], { cwd: dich, encoding: 'utf8', timeout: 30_000 });
}
