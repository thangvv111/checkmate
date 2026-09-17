import { execFileSync } from 'node:child_process';
import type { CauHinhCoRepo, CheckmateConfig } from './config.js';
import { readRepoToken } from './secret-vault.js';
// Hợp đồng nguồn spec ở TẦNG NỀN: app không được import engine (lưới kien-truc-tang) — web và engine
// chỉ nói chuyện qua tiến trình CLI. Một glob, một cửa đọc `sources` cho cả router lẫn engine.
import { matchPattern, readSourcesCfg, isProcessDocDir, PROCESS_DOC_DIRS, PROCESS_DOC_EXTS, SPEC_CANDIDATES } from '../../../packages/shared/src/spec-source.js';

/**
 * Chìa dùng cho một lời gọi API, suy từ CHÍNH path đang gọi (R4.18).
 *
 * Suy từ path thay vì bắt mỗi chỗ gọi tự truyền token: đường dẫn GitHub luôn mang `owner/repo` ở đầu,
 * nên không có cách nào gọi nhầm chìa của repo khác — kể cả khi nhiều repo chạy song song trong một
 * tiến trình (R8). Bắt 11 chỗ gọi tự nhớ truyền token là mời một chỗ quên.
 */
export function repoFromPath(path: string): string {
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
let ghSan = false;
let ghHoiLuc = 0;
const GH_HOI_LAI_MS = 60_000;
export function hasGhCli(): boolean {
  // Nhớ kết quả CÓ thì vĩnh viễn (gh đã đăng nhập không tự mất giữa chừng), nhưng kết quả KHÔNG thì chỉ
  // nhớ một phút: `gh auth status` gọi mạng, nên một cú chập hay một lần quá hạn sẽ bị đóng đinh thành
  // «máy này không có gh» cho tới khi khởi động lại — và mọi repo chưa có chìa riêng bị cổng R4.25 chặn
  // với thông điệp «chưa có token», tức báo sai hẳn nguyên nhân.
  if (ghSan) return true;
  const gio = Date.now();
  if (gio - ghHoiLuc < GH_HOI_LAI_MS) return false;
  ghHoiLuc = gio;
  try {
    execFileSync('gh', ['auth', 'status'], { encoding: 'utf8', timeout: 10_000, stdio: 'pipe' });
    ghSan = true;
  } catch {
    // `gh` có mà CHƯA đăng nhập cũng vô dụng như không có — exit khác 0 đều tính là không có đường vào
    ghSan = false;
  }
  return ghSan;
}

/** R4.20 đủ ba bậc: chìa riêng của repo → GITHUB_TOKEN của môi trường → `gh` của máy */
export function hasGithubAccess(github: string): boolean {
  return readRepoToken(github) !== '' || hasGhCli();
}

function tokenChoPath(path: string): string {
  const repo = repoFromPath(path);
  // path không nhắm vào repo cụ thể (`/user/repos`…) — chỉ còn chìa chung của môi trường
  return repo ? readRepoToken(repo) : (process.env.GITHUB_TOKEN?.trim() ?? '');
}

export interface PrSummary {
  so: number;
  tieuDe: string;
  tacGia: string;
  nhanh: string;
  capNhat: string;
  headSha: string;
}

export interface FetchedPr {
  so: number;
  headSha: string;
  baseRef: string; // ref local trỏ nhánh đích
  headRef: string; // ref local trỏ head PR
  filesDoi: string[];
  loai: 'code' | 'doc';
  fileDoc?: string; // file .md được chọn khi loai=doc
  lyDoDinhTuyen: string; // R13.6 — vì sao chọn skill đó, nêu đúng file gây ra quyết định
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

export interface CurrentPr {
  headSha: string;
  state: string;
  merged: boolean;
  tacGia?: string;
}

export async function getCurrentPr(cfg: CauHinhCoRepo, so: number): Promise<CurrentPr> {
  const p = (await goiApi(cfg, `/repos/${cfg.repo.github}/pulls/${so}`)) as {
    head: { sha: string };
    state: string;
    merged: boolean;
    user?: { login: string };
  };
  return { headSha: p.head.sha, state: p.state, merged: p.merged, tacGia: p.user?.login };
}

/**
 * Trạng thái THẬT của một pull request trên GitHub — dùng cho đối soát cổng (R6.20).
 *
 * Tách khỏi `getCurrentPr` vì hai câu hỏi khác nhau: cái kia hỏi «head sha bây giờ là gì» để chặn
 * verdict hết hiệu lực; cái này hỏi «chuyện gì đã xảy ra với PR» để biết sổ có đang im lặng không.
 */
export async function prState(
  cfg: CauHinhCoRepo,
  so: number,
  repoGithub?: string,
): Promise<{ trang_thai: 'mo' | 'merged' | 'dong'; nguoi_merge?: string; tac_gia?: string }> {
  // Repo phải TƯỜNG MINH: đối soát duyệt run của MỌI repo, còn `cfg.repo` là repo đang được CHỌN
  // trên giao diện. Lấy chìa từ repo đang chọn để hỏi PR của repo khác là hỏi sai cửa và nhận về
  // câu trả lời của một PR khác trùng số (vòng hai của cổng bắt đúng chỗ nối dây này).
  const repo = repoGithub || cfg.repo.github;
  const p = (await goiApi(cfg, `/repos/${repo}/pulls/${so}`)) as {
    state: string;
    merged: boolean;
    merged_by?: { login?: string } | null;
    user?: { login?: string };
  };
  const trang_thai = p.merged ? 'merged' : p.state === 'open' ? 'mo' : 'dong';
  return { trang_thai, nguoi_merge: p.merged_by?.login ?? undefined, tac_gia: p.user?.login };
}

export async function commentPr(cfg: CauHinhCoRepo, so: number, body: string): Promise<void> {
  await goiApiGhi(cfg, 'POST', `/repos/${cfg.repo.github}/issues/${so}/comments`, { body });
}

export async function mergePr(cfg: CauHinhCoRepo, so: number, tieuDe: string, moTa: string, sha?: string): Promise<void> {
  await goiApiGhi(cfg, 'PUT', `/repos/${cfg.repo.github}/pulls/${so}/merge`, {
    merge_method: 'merge',
    commit_title: tieuDe,
    commit_message: moTa,
    // W1: pin head SHA — GitHub tự trả 409 nếu PR nhận commit mới giữa lúc kiểm và lúc bấm (chặn TOCTOU phía server)
    ...(sha ? { sha } : {}),
  });
  clearPrCache();
}

// Trả về dev: thử review Request-changes; GitHub cấm author tự request-changes PR của mình → fallback comment
export async function returnToDev(cfg: CauHinhCoRepo, so: number, body: string): Promise<'review' | 'comment'> {
  try {
    await goiApiGhi(cfg, 'POST', `/repos/${cfg.repo.github}/pulls/${so}/reviews`, {
      event: 'REQUEST_CHANGES',
      body,
    });
    return 'review';
  } catch {
    await commentPr(cfg, so, body);
    return 'comment';
  }
}

// Chế độ trực (B4.3): gắn check status lên commit — PR hiện dấu xanh/đỏ của CheckMate
export async function setCommitStatus(
  cfg: CauHinhCoRepo,
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

export async function closePr(cfg: CauHinhCoRepo, so: number): Promise<void> {
  await goiApiGhi(cfg, 'PATCH', `/repos/${cfg.repo.github}/pulls/${so}`, { state: 'closed' });
  clearPrCache();
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
      const repo = repoFromPath(path);
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
let cachePr: { key: string; luc: number; data: PrSummary[] } | null = null;
export function clearPrCache(): void { cachePr = null; }

export async function listPrs(cfg: CauHinhCoRepo): Promise<PrSummary[]> {
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
    throw new Error(maskTokenInText((e as Error).message));
  }
}

/** Gột token khỏi bất kỳ URL dạng `https://x-access-token:ghp_…@github.com/…` nào trong văn bản */
export function maskTokenInText(van: string): string {
  return van.replace(/(https:\/\/)[^@\s/]+(@github\.com)/g, '$1***$2');
}

/**
 * Nguồn để `git fetch` kéo PR về. Clone xong thì remote `origin` đã bị gỡ token (R4.6), nên với repo
 * riêng tư, fetch qua `origin` sẽ đứng chờ credential rồi chết — chỉ lộ ra ở lượt chấm thứ hai trở đi,
 * lúc người dùng tưởng repo đã kết nối xong. Đưa chìa vào URL của CHÍNH lệnh fetch: dùng một lần,
 * không ghi vào `.git/config`.
 */
function nguonFetch(github: string): string {
  const token = readRepoToken(github);
  return token ? `https://x-access-token:${token}@github.com/${github}.git` : 'origin';
}

/**
 * Phân loại PR theo loại file đã đổi (specs/R13) — hàm THUẦN, không I/O, để mọi scenario của luật
 * thành một ca test chạy bằng danh sách tên file.
 *
 * Allowlist HẸP chứ không phải blocklist (R13.2): hai hướng sai không đối xứng. Doc bị đẩy sang code
 * chỉ tốn tiền và ồn; code bị đẩy sang doc thì KHÔNG probe nào chạy và verdict xanh trên vùng chưa ai
 * thử — xanh giả, đúng thứ công cụ này sinh ra để chống. Nghi ngờ thì chọn code.
 */
export function classifyPr(
  dsVao: readonly string[],
  mauNguonSpec?: readonly unknown[],
  mauThuMucQuyTrinh?: readonly unknown[],
): { loai: 'code' | 'doc'; lyDo: string; fileDocUngVien: string[]; khongDoc: string[] } {
  // R13.8 áp cho CẢ CỤM, không chỉ từng phần tử: gọi với null/undefined/chuỗi/đối tượng đều phải rơi
  // về code, không ném — hàm đứng đầu pipeline mà ném là cả lượt chấm chết (vòng ba của cổng bắt).
  const laMang = Array.isArray(dsVao);
  const filesDoi: readonly string[] = laMang ? dsVao : [];
  // Mẫu NGUỒN SPEC: repo khai qua `sources.specs` của checkmate.yml; vắng hoặc méo → danh sách tự dò
  // mặc định. Mẫu là DỮ LIỆU của repo đích: chỉ được đem so TÊN file (`matchPattern`), không chạy,
  // không vào prompt — và nó chỉ có thể làm router CHẶT hơn (thêm file bị coi là luật), không lỏng hơn.
  const mauKhai = Array.isArray(mauNguonSpec) ? mauNguonSpec.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
  const nguonMacDinh = mauKhai.length === 0;
  const mauDung: readonly string[] = nguonMacDinh ? SPEC_CANDIDATES : mauKhai;
  const laNguonSpec = (f: string): string | undefined => mauDung.find((p) => matchPattern(p, [{ path: f }]).length > 0);
  // Thư mục TÀI LIỆU QUY TRÌNH: repo đích khai (`sources.process_docs`), không khai thì mặc định như trước.
  // Mẫu méo hoặc rỗng sau khi lọc → mặc định, KHÔNG rơi về «mọi thứ là tài liệu» (fail-closed).
  const mauQt = Array.isArray(mauThuMucQuyTrinh) ? mauThuMucQuyTrinh.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
  const thuMucQuyTrinh: readonly string[] = mauQt.length ? mauQt : PROCESS_DOC_DIRS;
  // Đuôi VĂN BẢN THUẦN — áp ở mọi nơi trong repo.
  const DUOI_VAN_BAN = ['.md', '.txt'];
  // Đuôi CẤU HÌNH QUY TRÌNH — chỉ có nghĩa BÊN TRONG thư mục tài liệu quy trình. Hằng của engine.
  const DUOI_QUY_TRINH = PROCESS_DOC_EXTS;

  const laVanBan = (f: unknown): boolean => {
    // Phần tử không phải chuỗi → KHÔNG phải văn bản (fail-closed R13.8). Ném ở đây là làm sập cả
    // lượt chấm ngay hàm đứng đầu pipeline — hỏng an toàn ngược hướng.
    if (typeof f !== 'string' || !f.trim()) return false;
    const t = f.toLowerCase();
    // ĐƯỜNG DẪN so ĐÚNG HOA THƯỜNG (Linux: `OpenSpec/` ≠ `openspec/`); ĐUÔI thì không phân biệt.
    // File thuộc NGUỒN SPEC engine đọc thật (so luật hai nhánh, đếm độ phủ) — cùng tiêu chí đã xếp
    // `checkmate.yml` vào code: sửa luật của chính cổng phải đi đường code, kẻo PR tự nới cổng rồi tự
    // qua cổng bằng rubric tài liệu (vòng hai của cổng bắt). Nguồn do repo KHAI, không phải một thư mục
    // cố định: bản trước gắn cứng `specs/`, nên sau khi luật của repo này dời sang `openspec/specs/**`,
    // PR chỉ sửa luật đi đường tài liệu — đúng cái lỗ router sinh ra để bịt (change retire-r-rules).
    if (laNguonSpec(f) !== undefined) return false;
    // Dưới thư mục TÀI LIỆU QUY TRÌNH (repo khai, mặc định `openspec/`): chỉ các đuôi cấu hình quy trình.
    // Cho cả THƯ MỤC là văn bản thuần thì `openspec/hack.ts` cũng thành tài liệu — cửa né probe rộng nhất,
    // do chính luật này mở ra. Đuôi là HẰNG của engine: repo nói tài liệu của nó NẰM ĐÂU, không nói cái gì
    // là tài liệu.
    if (isProcessDocDir(f, thuMucQuyTrinh)) return DUOI_QUY_TRINH.some((d) => t.endsWith(d));
    // KHÔNG chuẩn hoá dấu `\`: `git diff --name-only` luôn trả `/`, nên `\` là TÊN FILE thật do
    // maker đặt. KHÔNG nhận `openspec` trơ: git liệt kê FILE, không liệt kê thư mục.
    return DUOI_VAN_BAN.some((d) => t.endsWith(d));
  };

  // R13.6 — lý do nói CÓ thủ phạm thì phải nêu được dấu hiệu đọc được của nó; in nguyên chuỗi rỗng
  // ra thì phần liệt kê trống trơn, người đọc không biết file nào (vòng ba của cổng bắt).
  const ten = (f: unknown, i = -1): string => {
    const oViTri = i >= 0 ? ` ở vị trí ${i}` : '';
    if (typeof f === 'string') return f.trim() ? f : `(tên file rỗng${oViTri}, ${f.length} ký tự trắng)`;
    // String() ném với object không prototype (Object.create(null)) hoặc toString bị vô hiệu — hàm
    // MÔ TẢ lỗi mà tự ném thì cả lượt chấm chết, đúng thứ R13.8 cấm (vòng bốn của cổng bắt).
    let mo: string;
    try {
      mo = String(f);
    } catch {
      mo = Object.prototype.toString.call(f);
    }
    // Kèm vị trí: hai object khác nhau đều cho «[object Object]», không có vị trí thì lý do không
    // phân biệt được thủ phạm nào (R13.6).
    return `(phần tử${oViTri} không phải chuỗi: ${mo})`;
  };
  // Chỉ số THẬT theo danh sách gốc, không dùng indexOf: `indexOf` trả vị trí KHỚP ĐẦU TIÊN nên hai
  // phần tử méo giống hệt nhau (vd [null, null]) đều báo cùng một vị trí — nợ medium công khai của
  // PR #19, cùng họ với lỗi nhãn probe trùng nhau trong log.
  const viTri = new Map<unknown, number[]>();
  filesDoi.forEach((f, i) => viTri.set(f, [...(viTri.get(f) ?? []), i]));
  const daDung = new Map<unknown, number>();
  const keTen = (ds: readonly unknown[]): string[] =>
    ds.map((f) => {
      const ds2 = viTri.get(f) ?? [];
      const lan = daDung.get(f) ?? 0;
      daDung.set(f, lan + 1);
      return ten(f, ds2[Math.min(lan, ds2.length - 1)] ?? -1);
    });
  const ke = (ds: readonly unknown[], tran = 20): string =>
    ds.length <= tran ? keTen(ds).join(', ') : `${keTen(ds.slice(0, tran)).join(', ')} và ${ds.length - tran} file nữa`;

  // Nói ĐÚNG BẢN CHẤT đầu vào: mượn lời R13.4 («toàn văn bản thuần nhưng không có .md») cho một cụm
  // không phải mảng là khẳng định sai về thứ mình vừa nhận (vòng bốn của cổng bắt).
  if (!laMang) {
    return { loai: 'code', lyDo: `danh sách file không phải mảng (${Object.prototype.toString.call(dsVao)}) — không phân loại được, fail-closed về code theo R13.8`, fileDocUngVien: [], khongDoc: [] };
  }
  if (filesDoi.length === 0) {
    return { loai: 'code', lyDo: 'danh sách file RỖNG — không có gì để phân loại, fail-closed về code theo R13.8', fileDocUngVien: [], khongDoc: [] };
  }
  const md = filesDoi.filter((f) => typeof f === 'string' && f.toLowerCase().endsWith('.md') && laNguonSpec(f) === undefined);
  const thucThi = filesDoi.filter((f) => !laVanBan(f));
  if (thucThi.length > 0) {
    // Nói ra vì sao một file khớp nguồn spec bị coi là luật: người đọc phải thấy MẪU nào bắt nó, và
    // mẫu đó đến từ cấu hình repo hay từ danh sách mặc định — quyết định không ai thấy là không ai kiểm được.
    const nguon = thucThi.filter((f): f is string => typeof f === 'string' && laNguonSpec(f) !== undefined);
    const chuNguon = nguon.length
      ? ` — file thuộc nguồn spec engine đọc (${nguonMacDinh ? 'danh sách mặc định, repo không khai sources.specs' : 'sources.specs của checkmate.yml'}): ${nguon
          .slice(0, 10)
          .map((f) => `${f} ↔ ${laNguonSpec(f)}`)
          .join(', ')}`
      : '';
    return { loai: 'code', lyDo: `có ${thucThi.length} file không phải văn bản thuần: ${ke(thucThi)} — R13.1${chuNguon}`, fileDocUngVien: md, khongDoc: [] };
  }
  // R13.4 — skill doc chấm MỘT tài liệu bằng trích dẫn nguyên văn; không .md nào thì không có gì để đọc
  if (md.length === 0) {
    return { loai: 'code', lyDo: 'toàn văn bản thuần nhưng không có file .md nào để skill doc đọc — R13.4', fileDocUngVien: [], khongDoc: [] };
  }
  // R13.7 — KHAI VÙNG MÙ: skill doc đọc đúng MỘT tài liệu, nên mọi file còn lại của PR không ai xem.
  // Nêu cái ĐƯỢC xem không thay được nghĩa vụ nêu cái KHÔNG được xem (cùng nguyên tắc R7 về diff bị cắt).
  // Skill doc đọc ĐÚNG MỘT tài liệu, nên các tài liệu ứng viên CÒN LẠI cũng là vùng mù — loại cả
  // nhóm .md ra khỏi vùng mù là giấu đúng phần người đọc cần biết (vòng ba của cổng bắt).
  // Ở tầng này chưa biết tài liệu nào sẽ được chọn (fetchAndRoute chọn theo số dòng đổi), nên lấy
  // ứng viên đầu làm dự kiến; fetchAndRoute dựng lại vùng mù theo tài liệu THẬT sau khi chốt.
  // Ở TẦNG NÀY chưa biết tài liệu nào sẽ được chấm — fetchAndRoute chọn theo số dòng đổi nhiều nhất.
  // Nên `khongDoc` chỉ gồm những file CHẮC CHẮN không ai đọc; các ứng viên .md được nêu riêng kèm
  // câu «chỉ MỘT được chấm». Khai đích danh một ứng viên là «sẽ được chấm» khi chưa chốt là nói sai
  // sự thật ngay lúc nói (vòng bốn của cổng bắt) — vùng mù THẬT do fetchAndRoute dựng lại sau.
  const khongDoc = keTen(filesDoi.filter((f) => !md.includes(f as string)));
  const lyDo =
    `${filesDoi.length} file đổi đều là văn bản thuần. Tài liệu ứng viên (${md.length}): ${ke(md)} — CHỈ MỘT được chấm, ` +
    (md.length > 1 ? `${md.length - 1} ứng viên còn lại KHÔNG được đọc (chốt ở bước chọn tài liệu)` : 'không có ứng viên nào bị bỏ') +
    (khongDoc.length ? `; CHẮC CHẮN không được đọc (${khongDoc.length}): ${ke(khongDoc)}` : '') +
    ' — R13.1/R13.7';
  return { loai: 'doc', lyDo, fileDocUngVien: md, khongDoc };
}

/**
 * Tên ref tạm của một lượt chấm — RIÊNG theo pull request, cả ref nhánh PR lẫn ref nhánh gốc.
 *
 * Dùng chung một tên ref cho nhánh gốc thì lượt sau force-update ref đó, và lượt trước có thể đối chứng
 * nhầm sang commit mới hơn commit nó định so. Verdict vẫn ra, nhưng ra TRÊN ĐỐI CHỨNG SAI — không dấu
 * hiệu nào cho người đọc. Đó là loại hỏng im lặng nguy hiểm nhất của việc chạy song song, nên tên ref
 * dựng ở MỘT chỗ và có test, không nối chuỗi tại chỗ dùng.
 */
export function refNames(so: number): { headRef: string; baseRef: string } {
  return { headRef: `refs/checkmate/pr${so}`, baseRef: `refs/checkmate/base-pr${so}` };
}

/** SHA của HEAD bản clone — cửa thêm repo chạy mồi hợp đồng runner trên đúng cây vừa clone. Qua `git()` có che token. */
export function localHeadSha(localPath: string): string {
  return git(localPath, ['rev-parse', 'HEAD']);
}

// Fetch PR + nhánh đích về ref local rồi ROUTER theo loại file đã đổi (specs/R13).
export function fetchAndRoute(cfg: CauHinhCoRepo, so: number): FetchedPr {
  const lp = cfg.repo.local_path;
  const { headRef, baseRef } = refNames(so);
  git(lp, ['fetch', '-f', nguonFetch(cfg.repo.github), `+refs/pull/${so}/head:${headRef}`, `+refs/heads/${cfg.repo.base_branch}:${baseRef}`]);
  const headSha = git(lp, ['rev-parse', headRef]);
  const filesDoi = git(lp, ['diff', '--name-only', `${baseRef}...${headRef}`]).split('\n').filter(Boolean);
  if (filesDoi.length === 0) throw new Error(`PR #${so} không có file thay đổi so với ${cfg.repo.base_branch}`);

  // Nguồn spec đọc từ checkmate.yml TRÊN ĐĨA của bản clone (không từ nhánh PR): PR không đổi được đầu
  // vào của router bằng nội dung của chính nó, và PR đụng checkmate.yml vốn đã bị kéo về code.
  const nguonSpec = readSourcesCfg(lp);
  if (!nguonSpec?.specs?.length) console.log(`Định tuyến PR #${so}: repo không khai sources.specs (hoặc không đọc được) — dùng danh sách tự dò mặc định, lệch về phía code`);
  // Mẫu bị loại phải NÓI RA: im lặng bỏ qua khiến người khai tin thư mục của họ đã được nhận.
  for (const r of nguonSpec?.rejected ?? []) console.log(`Định tuyến PR #${so}: bỏ mẫu sources.${r.key} «${r.pattern}» — ${r.reason}`);
  const pl = classifyPr(filesDoi, nguonSpec?.specs, nguonSpec?.process_docs);
  // R13.6 — nói ra quyết định: router quyết trong im lặng thì người đọc verdict không biết vì sao PR
  // của mình đi đường nào, và một quyết định không ai thấy là quyết định không ai kiểm được.
  // Đường doc log SAU khi chốt fileDoc, để dòng log nêu đúng tài liệu được đem đi chấm.
  if (pl.loai === 'code') {
    console.log(`Định tuyến PR #${so}: skill code — ${pl.lyDo}`);
    return { so, headSha, baseRef, headRef, filesDoi, loai: 'code', lyDoDinhTuyen: pl.lyDo };
  }

  // chọn file .md đổi nhiều dòng nhất TRONG SỐ ứng viên .md (numstat liệt kê cả file không phải .md)
  const ungVien = new Set(pl.fileDocUngVien);
  const numstat = git(lp, ['diff', '--numstat', `${baseRef}...${headRef}`])
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [them, xoa, file] = l.split('\t');
      return { file, doi: (Number(them) || 0) + (Number(xoa) || 0) };
    })
    .filter((x) => ungVien.has(x.file))
    .sort((a, b) => b.doi - a.doi);
  // numstat có thể không khớp ứng viên nào (đổi tên, file nhị phân) — rơi về ứng viên đầu, không ném
  const fileDoc = numstat[0]?.file ?? pl.fileDocUngVien[0];
  // Vùng mù THẬT chỉ chốt được ở đây, khi đã biết tài liệu nào được đem đi chấm (R13.7)
  const muThat = filesDoi.filter((f) => f !== fileDoc);
  const lyDo = `${pl.lyDo}; chấm tài liệu ${fileDoc}; KHÔNG đọc (${muThat.length}): ${muThat.slice(0, 20).join(', ')}${muThat.length > 20 ? ` và ${muThat.length - 20} file nữa` : ''}`;
  console.log(`Định tuyến PR #${so}: skill doc — ${lyDo}`);
  return { so, headSha, baseRef, headRef, filesDoi, loai: 'doc', fileDoc, lyDoDinhTuyen: lyDo };
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
export async function listReposForToken(token: string): Promise<RepoGithub[]> {
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
  const token = tokenEp ?? readRepoToken(github);
  const hasToken = token ? `https://x-access-token:${token}@github.com/${github}.git` : sach;
  try {
    execFileSync('git', ['clone', '--no-single-branch', hasToken, dich], { encoding: 'utf8', timeout: 600_000 });
  } catch (e) {
    // Hàm này gọi execFileSync THẲNG, không qua helper `git()`, nên lưới gột token ở đó KHÔNG che nó.
    // Clone hỏng thì git nhắc lại nguyên URL — mà URL đang mang chìa — và chỗ gọi trả thẳng chuỗi lỗi
    // về trình duyệt. Chìa thật lên màn hình, vào log truy cập, vào ảnh chụp màn hình người dùng gửi đi.
    // Vi phạm chính R4.29. Gột ngay tại đây, trước khi lỗi rời khỏi hàm.
    throw new Error(maskTokenInText((e as Error).message));
  }
  // gỡ token khỏi remote ngay: lần fetch sau dùng credential helper / token trong môi trường
  execFileSync('git', ['remote', 'set-url', 'origin', sach], { cwd: dich, encoding: 'utf8', timeout: 30_000 });
}

// ---------- Cổng kiểm kết nối repo (R4.22–R4.24) ----------

export interface RepoCheckResult {
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
export function splitOwnerRepo(dan: string): string {
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
export async function checkRepo(github: string, token: string): Promise<RepoCheckResult> {
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
export async function listBranches(github: string, token: string): Promise<string[]> {
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
