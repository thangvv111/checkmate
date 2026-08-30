import { execFileSync } from 'node:child_process';
import type { CheckmateConfig } from './config.js';
import { docTokenRepo } from './kho-bi-mat.js';

/**
 * Chìa dùng cho một lời gọi API, suy từ CHÍNH path đang gọi (R4.18).
 *
 * Suy từ path thay vì bắt mỗi chỗ gọi tự truyền token: đường dẫn GitHub luôn mang `owner/repo` ở đầu,
 * nên không có cách nào gọi nhầm chìa của repo khác — kể cả khi nhiều repo chạy song song trong một
 * tiến trình (R8). Bắt 11 chỗ gọi tự nhớ truyền token là mời một chỗ quên.
 */
export function repoTuPath(path: string): string {
  const m = /^\/repos\/([^/?#]+)\/([^/?#]+)/.exec(path);
  return m ? `${m[1]}/${m[2]}` : '';
}

/**
 * Máy này có `gh` đã đăng nhập hay không — bậc 3 của R4.20. Hỏi một lần rồi nhớ: `gh auth status` tốn
 * vài trăm mili giây, mà câu trả lời không đổi trong một lần chạy tiến trình.
 *
 * Thiếu hàm này thì cổng chặn R4.25 chặn nhầm cả máy dev vốn chạy được bằng `gh` — đúng kiểu "báo sai
 * bản chất" mà repo này sinh ra để chống.
 */
let ghSan: boolean | null = null;
export function coGhCli(): boolean {
  if (ghSan !== null) return ghSan;
  try {
    execFileSync('gh', ['auth', 'status'], { encoding: 'utf8', timeout: 10_000, stdio: 'pipe' });
    ghSan = true;
  } catch (e) {
    // `gh` có mà CHƯA đăng nhập cũng vô dụng như không có — exit khác 0 đều tính là không có đường vào
    ghSan = false;
  }
  return ghSan;
}

/** R4.20 đủ ba bậc: chìa riêng của repo → GITHUB_TOKEN của môi trường → `gh` của máy */
export function coDuongVaoGithub(github: string): boolean {
  return docTokenRepo(github) !== '' || coGhCli();
}

function tokenChoPath(path: string): string {
  const repo = repoTuPath(path);
  // path không nhắm vào repo cụ thể (`/user/repos`…) — chỉ còn chìa chung của môi trường
  return repo ? docTokenRepo(repo) : (process.env.GITHUB_TOKEN?.trim() ?? '');
}

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
async function goiApiGhi(_cfg: CheckmateConfig, method: string, path: string, body: unknown): Promise<unknown> {
  const token = tokenChoPath(path);
  if (token) {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
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

async function goiApi(_cfg: CheckmateConfig | null, path: string, tokenEp?: string): Promise<unknown> {
  const token = tokenEp ?? tokenChoPath(path);
  if (token) {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
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
      const repo = repoTuPath(path);
      throw new Error(
        (repo ? `Repo ${repo} chưa có GitHub token` : 'Chưa có GitHub token') +
          ' và máy này không có lệnh `gh` (bản chạy trên server thường vậy). ' +
          (repo
            ? `Vào ⚙ Cài đặt → repo ${repo} → dán token của repo đó, `
            : '') +
          'hoặc chủ máy điền GITHUB_TOKEN vào /etc/checkmate.env (quyền 600) rồi `sudo systemctl restart checkmate`.',
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
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8', timeout: 120_000 }).trim();
  } catch (e) {
    // git nhắc lại nguyên URL trong lời kêu — URL đó có thể đang mang token. Che trước khi lỗi này đi
    // tiếp vào log, sự kiện run và màn hình người dùng.
    throw new Error(cheTokenTrongVan((e as Error).message));
  }
}

/** Gột token khỏi bất kỳ URL dạng `https://x-access-token:ghp_…@github.com/…` nào trong văn bản */
export function cheTokenTrongVan(van: string): string {
  return van.replace(/(https:\/\/)[^@\s/]+(@github\.com)/g, '$1***$2');
}

/**
 * Nguồn để `git fetch` kéo PR về. Clone xong thì remote `origin` đã bị gỡ token (R4.6), nên với repo
 * riêng tư, fetch qua `origin` sẽ đứng chờ credential rồi chết — chỉ lộ ra ở lượt chấm thứ hai trở đi,
 * lúc người dùng tưởng repo đã kết nối xong. Đưa chìa vào URL của CHÍNH lệnh fetch: dùng một lần,
 * không ghi vào `.git/config`.
 */
function nguonFetch(github: string): string {
  const token = docTokenRepo(github);
  return token ? `https://x-access-token:${token}@github.com/${github}.git` : 'origin';
}

// Fetch PR + nhánh đích về ref local rồi ROUTER theo nội dung diff:
// chỉ toàn .md → skill doc (chọn file .md đổi nhiều dòng nhất); còn lại → skill code.
export function fetchVaRouter(cfg: CheckmateConfig, so: number): PrDaFetch {
  const lp = cfg.repo.local_path;
  const headRef = `refs/checkmate/pr${so}`;
  // Ref riêng theo PR: hai lượt song song cùng dùng chung một ref base thì lượt sau force-update ref
  // đó, và lượt trước có thể đối chứng nhầm sang commit base mới hơn commit nó định so.
  const baseRef = `refs/checkmate/base-pr${so}`;
  git(lp, ['fetch', '-f', nguonFetch(cfg.repo.github), `+refs/pull/${so}/head:${headRef}`, `+refs/heads/${cfg.repo.base_branch}:${baseRef}`]);
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
export async function danhSachRepoCuaToken(token: string): Promise<RepoGithub[]> {
  const ra: RepoGithub[] = [];
  for (let trang = 1; trang <= 3; trang++) {
    const lo = (await goiApi(null, `/user/repos?per_page=100&sort=updated&page=${trang}`, token || undefined)) as Array<{
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
export function cloneRepo(github: string, dich: string, tokenEp?: string): void {
  const sach = `https://github.com/${github}.git`;
  const token = tokenEp ?? docTokenRepo(github);
  const coToken = token ? `https://x-access-token:${token}@github.com/${github}.git` : sach;
  try {
    execFileSync('git', ['clone', '--no-single-branch', coToken, dich], { encoding: 'utf8', timeout: 600_000 });
  } catch (e) {
    // Hàm này gọi execFileSync THẲNG, không qua helper `git()`, nên lưới gột token ở đó KHÔNG che nó.
    // Clone hỏng thì git nhắc lại nguyên URL — mà URL đang mang chìa — và chỗ gọi trả thẳng chuỗi lỗi
    // về trình duyệt. Chìa thật lên màn hình, vào log truy cập, vào ảnh chụp màn hình người dùng gửi đi.
    // Vi phạm chính R4.29. Gột ngay tại đây, trước khi lỗi rời khỏi hàm.
    throw new Error(cheTokenTrongVan((e as Error).message));
  }
  // gỡ token khỏi remote ngay: lần fetch sau dùng credential helper / token trong môi trường
  execFileSync('git', ['remote', 'set-url', 'origin', sach], { cwd: dich, encoding: 'utf8', timeout: 30_000 });
}

// ---------- Cổng kiểm kết nối repo (R4.22–R4.24) ----------

export interface KetQuaKiemRepo {
  ok: boolean;
  /** Vì sao hỏng — ba kết cục phải nói ba lời khác nhau (R4.23), gộp lại là đẩy người dùng đi mò */
  ly_do?: 'token_sai' | 'khong_thay' | 'mang';
  thong_diep: string;
  github?: string; // owner/repo GitHub xác nhận (viết đúng hoa thường của nó)
  nhanh_mac_dinh?: string;
  rieng_tu?: boolean;
  quyen_ghi?: boolean;
}

/**
 * Tách `owner/repo` từ thứ người dùng dán vào: URL đầy đủ, dạng `git@`, hay chính `owner/repo`.
 * Người dùng dán nguyên URL trên thanh địa chỉ là chuyện thường — bắt họ tự cắt là mời gõ sai (R4.5).
 */
export function tachOwnerRepo(dan: string): string {
  const s = dan.trim().replace(/\s+/g, '');
  if (!s) return '';
  const m =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/.exec(s) ??
    /^git@github\.com:([^/]+)\/([^/#?]+)/.exec(s) ??
    /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/.exec(s);
  if (!m) return '';
  return `${m[1]}/${m[2].replace(/\.git$/, '')}`;
}

/** R4.23 — gọi THẬT `GET /repos/{owner}/{repo}` bằng chính chìa vừa nhập, không đoán từ hình dạng token */
export async function kiemTraRepo(github: string, token: string): Promise<KetQuaKiemRepo> {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${github}`, {
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        accept: 'application/vnd.github+json',
        'user-agent': 'checkmate',
      },
    });
  } catch (e) {
    return {
      ok: false,
      ly_do: 'mang',
      thong_diep: `Không gọi được tới GitHub (${(e as Error).message.slice(0, 120)}). Kiểm tra mạng hoặc proxy của máy chạy CheckMate rồi thử lại — token chưa bị đánh giá.`,
    };
  }
  if (res.status === 401) {
    return {
      ok: false,
      ly_do: 'token_sai',
      thong_diep: 'GitHub từ chối token này (401) — token sai, đã hết hạn hoặc đã bị thu hồi. Tạo token mới rồi dán lại.',
    };
  }
  if (res.status === 404) {
    // Nói đúng bối cảnh: không có chìa nào thì "token hợp lệ nhưng thiếu quyền" là câu SAI, và nó
    // đẩy người dùng đi kiểm cái quyền mà họ chưa hề cấp cho ai.
    return {
      ok: false,
      ly_do: 'khong_thay',
      thong_diep: token
        ? `Token hợp lệ nhưng không thấy ${github} (404). Với repo riêng tư, GitHub trả 404 thay vì 403 khi token thiếu quyền — hãy kiểm hai điều: đường dẫn repo có gõ đúng không, và token có được cấp quyền đọc CHÍNH repo này không.`
        : `Không thấy ${github} (404), mà bước 2 chưa có token nào. Repo này hoặc không tồn tại (kiểm lại đường dẫn), hoặc là repo riêng tư — repo riêng tư thì phải dán token ở bước 2 mới nhìn thấy.`,
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      ly_do: 'mang',
      thong_diep: `GitHub trả lỗi ${res.status}: ${(await res.text()).slice(0, 200)}`,
    };
  }
  const r = (await res.json()) as {
    full_name: string;
    default_branch: string;
    private: boolean;
    permissions?: { push?: boolean };
  };
  return {
    ok: true,
    thong_diep: `Kết nối được ${r.full_name}${r.private ? ' (riêng tư)' : ''}. Nhánh mặc định: ${r.default_branch}.`,
    github: r.full_name,
    nhanh_mac_dinh: r.default_branch,
    rieng_tu: r.private,
    // quyền ghi quyết định cổng Merge/Reject có dùng được không — nói trước còn hơn để hỏng lúc bấm
    quyen_ghi: r.permissions?.push === true,
  };
}

/** Nhánh của repo — để bước 4 cho chọn thay vì gõ tay (R4.24) */
export async function danhSachNhanh(github: string, token: string): Promise<string[]> {
  const res = await fetch(`https://api.github.com/repos/${github}/branches?per_page=100`, {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      accept: 'application/vnd.github+json',
      'user-agent': 'checkmate',
    },
  });
  if (!res.ok) return [];
  return ((await res.json()) as Array<{ name: string }>).map((b) => b.name);
}
