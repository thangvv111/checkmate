import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Hợp đồng NGUỒN SPEC của repo đích — phần DÙNG CHUNG giữa engine (đọc spec để chấm) và app (router
 * định tuyến PR: file thuộc nguồn spec là luật engine đọc, phải đi đường code).
 *
 * Nằm ở tầng nền vì hai tầng kia không được import nhau: engine không biết web, web nói chuyện với
 * engine qua tiến trình CLI (lưới `kien-truc-tang`). Cùng một glob, cùng một cửa đọc `sources` — MỘT
 * định nghĩa, để router và engine không bao giờ lệch nhau về «file nào là luật» (khuôn «cửa song sinh»
 * đã bị bắt chín lần ở nơi khác). Phần đọc nội dung, chia đơn vị và báo cáo vẫn ở
 * `packages/harness/src/sources.ts`.
 */

export type SourceKey = 'specs' | 'api_doc' | 'test_sample' | 'process_docs';

/** Một file trong cây nguồn của nhánh đang chấm — đường repo-relative, dấu `/`. */
export interface TreeFile {
  path: string;
  size?: number;
  symlink?: boolean;
}

/** Mục `sources` của `checkmate.yml`, đã chuẩn hoá: mỗi khoá là danh sách mẫu đường. */
export interface SourcesCfg {
  specs?: string[];
  api_doc?: string[];
  test_sample?: string[];
  /**
   * Thư mục chứa TÀI LIỆU QUY TRÌNH của repo đích (`openspec/`, `rfcs/`, `adr/`…). Router định tuyến coi
   * file dưới đây — với các đuôi cố định của engine — là văn bản thuần, tức PR chỉ đổi chúng đi đường doc.
   * Không khai → mặc định `PROCESS_DOC_DIRS`.
   */
  process_docs?: string[];
  /** Đường bị loại ngay ở cửa đọc (tuyệt đối, có `..`, hoặc mẫu chạm gốc repo) — mang theo để báo ra, không im lặng. */
  rejected?: Array<{ key: SourceKey; pattern: string; reason: string }>;
}

/**
 * Thư mục tài liệu quy trình MẶC ĐỊNH khi repo đích không khai. Giữ đúng hành vi đã có từ trước khi có
 * khoá `process_docs`.
 */
export const PROCESS_DOC_DIRS = ['openspec/'];

/**
 * Đuôi được coi là tài liệu quy trình — HẰNG CỦA ENGINE, repo đích KHÔNG khai đè được.
 *
 * Cho repo khai đuôi thì `rfcs/tool.ts` thành «tài liệu» và PR có mã thực thi đi đường doc: cửa né probe
 * rộng nhất. Repo được quyền nói tài liệu quy trình của nó NẰM ĐÂU, không được quyền nói cái gì là tài liệu.
 */
export const PROCESS_DOC_EXTS = ['.md', '.txt', '.yaml', '.yml', '.json'];

/**
 * File có nằm dưới một thư mục tài liệu quy trình đã khai không.
 *
 * So TIỀN TỐ THƯ MỤC, không dùng glob, và giữ đúng ba tính chất đã chốt của luật định tuyến:
 *  - tên thư mục so ĐÚNG HOA THƯỜNG (engine chạy trên Linux, `OpenSpec/` là thư mục KHÁC `openspec/`);
 *    dùng `matchPattern` ở đây sẽ so không phân biệt hoa thường và phá đúng tính chất này;
 *  - KHÔNG chuẩn hoá `\` thành `/`: `git diff --name-only` luôn trả `/`, nên `\` là TÊN FILE thật;
 *  - khớp theo CẤU TRÚC: mẫu `rfcs` khớp `rfcs/x.md` nhưng KHÔNG khớp `rfcs-notes.md`.
 */
export function isProcessDocDir(file: string, mau: readonly string[]): boolean {
  return mau.some((m) => {
    const d = m.endsWith('/') ? m : `${m}/`;
    return file.startsWith(d);
  });
}

/**
 * Thứ tự dò khi repo không khai. HẸP có chủ ý: `docs/` của nhiều repo là tài liệu marketing, nạp
 * nhầm rồi chấm theo nó tệ hơn báo «không thấy». Muốn rộng hơn thì repo khai — đó là việc của nó.
 * Ứng viên ĐẦU TIÊN có ít nhất một đơn vị luật thắng; chỗ khác có file thì báo «có, không dùng».
 */
export const SPEC_CANDIDATES = [
  'specs/**/*.md',
  'spec/**/*.md',
  'openspec/specs/**/*.md',
  'docs/specs/**/*.md',
  'docs/spec/**/*.md',
  'requirements/**/*.md',
  'docs/requirements/**/*.md',
];
export const API_DOC_CANDIDATES = ['README.md', 'docs/README.md', 'API.md', 'docs/api.md', 'openapi.{yaml,yml,json}'];
/** Thứ tự = thứ tự ưu tiên; trong một mẫu lấy file đầu theo tên. */
export const TEST_SAMPLE_CANDIDATES = [
  'test/**/*.test.*',
  'tests/**/*.test.*',
  'test/**/*.spec.*',
  'tests/**/*.spec.*',
  'src/**/*.test.*',
  'src/**/*.spec.*',
  'test/**/*_test.*',
  'tests/**/test_*.*',
  'src/test/**/*Test.*',
  'test/**/*test*',
  'tests/**/*test*',
];

const GLOB_META = /[*?{[]/;

function normalizePattern(p: string): string {
  return p.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function escapeRe(c: string): string {
  return /[.+^$()|[\]\\{}]/.test(c) ? `\\${c}` : c;
}

/**
 * Glob tối thiểu đủ dùng: `**` mọi tầng · `*` trong một tầng · `?` một ký tự · `{a,b}` một trong hai
 * (không lồng). Không phân biệt hoa thường: `README.md` khai trên Windows phải vẫn khớp `readme.md`
 * trên máy chủ Linux — sai lệch này không đáng để một repo mất tài liệu API.
 *
 * Mẫu là DỮ LIỆU của repo đích: mọi ký tự regex bị escape, chỉ phát bốn mảnh cố định (một tầng, mọi tầng,
 * tầng tuỳ chọn kèm dấu chéo, một ký tự) — không lồng định lượng nên không có ReDoS; đầu vào so là đường file ngắn.
 */
export function globToRegExp(pattern: string): RegExp {
  const p = normalizePattern(pattern);
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i]!;
    if (c === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = p.indexOf('}', i);
      if (end < 0) {
        re += '\\{';
        continue;
      }
      re += `(?:${p.slice(i + 1, end).split(',').map((x) => [...x.trim()].map(escapeRe).join('')).join('|')})`;
      i = end;
    } else re += escapeRe(c);
  }
  return new RegExp(`^${re}$`, 'i');
}

/**
 * Khớp một mẫu với cây file. Không có ký tự glob thì mẫu là MỘT file, hoặc một THƯ MỤC (mọi file bên
 * dưới) — người khai `specs/` mong thư mục, không mong một regex. Kết quả xếp theo tên để chọn «file
 * đầu» là chọn có thể lặp lại.
 */
export function matchPattern(pattern: string, tree: TreeFile[]): TreeFile[] {
  const p = normalizePattern(pattern);
  if (!p) return [];
  let hit: TreeFile[];
  if (!GLOB_META.test(p)) {
    const lower = p.toLowerCase();
    hit = tree.filter((f) => f.path.toLowerCase() === lower);
    if (!hit.length) hit = tree.filter((f) => f.path.toLowerCase().startsWith(`${lower}/`));
  } else {
    const re = globToRegExp(p);
    hit = tree.filter((f) => re.test(f.path));
  }
  return [...hit].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * Lời báo lỗi cú pháp AN TOÀN: chỉ lấy DÒNG ĐẦU của thông điệp parser.
 *
 * Bộ parse YAML kèm shell mã trích NGUYÊN DÒNG NGUỒN vào thông điệp, nên in nguyên message là in
 * nội dung `checkmate.yml` ra log — và file đó có thể chứa chìa (vòng bảy của cổng bắt token chảy
 * theo đường này). Dòng đầu mang loại lỗi + vị trí, đủ để sửa, không mang nội dung.
 */
export function loiCuPhapAnToan(e: unknown): string {
  const van = e instanceof Error ? e.message : String(e);
  return van.split('\n')[0]!.slice(0, 120);
}

/**
 * Đường khai phải nằm TRONG repo. Đường tuyệt đối hay có `..` bị loại ngay ở cửa đọc và MANG THEO lý
 * do để lượt chấm ghi ra — không `console.error` rồi thôi, vì stderr của tiến trình con không phải
 * chỗ người vận hành đọc. (Biên repo còn được giữ bằng cấu trúc ở engine: mẫu chỉ khớp với danh sách
 * file của cây git; đây là lời BÁO cho người khai, không phải hàng rào thứ hai.)
 */
function outsideRepoReason(duong: string): string | null {
  const t = duong.replace(/\\/g, '/');
  if (/^([a-zA-Z]:)?\//.test(t) || t.startsWith('//')) return 'đường tuyệt đối — nguồn phải nằm trong repo';
  if (t.split('/').some((seg) => seg === '..')) return 'có `..` — không được trỏ ra ngoài repo';
  return null;
}

/**
 * `process_docs` NỚI phía tài liệu (ngược với `specs` — khai đè đó chỉ SIẾT), nên nó có gác riêng: mẫu
 * phải nêu ÍT NHẤT MỘT TẦNG THƯ MỤC.
 *
 * `**`, `*`, `.`, `/` hay chuỗi rỗng biến mọi `.md`/`.yaml` của repo thành tài liệu quy trình — kể cả
 * file CI. Gác này không chặn được người CỐ Ý khai `.github/` (đó là quyền của repo đích, và `checkmate.yml`
 * vốn đi đường code nên PR mở cửa ấy vẫn bị chấm bằng probe), nhưng chặn ca VÔ TÌNH rộng tay — ca thường gặp.
 */
function notADirectoryReason(duong: string): string | null {
  const t = duong.replace(/\\/g, '/').replace(/\/+$/, '').trim();
  if (t === '' || t === '.' || t === '*' || t === '**') return 'phải nêu ít nhất một tầng thư mục — mẫu chạm gốc repo biến mọi tài liệu của repo thành tài liệu quy trình';
  if (/[*?[\]{}]/.test(t)) return 'thư mục tài liệu quy trình nhận đường thư mục, không nhận mẫu glob';
  return null;
}

/**
 * Mục `sources` — repo khai spec, tài liệu API, file test mẫu của nó nằm đâu. Mỗi khoá nhận một
 * chuỗi hay một danh sách; không khai (hoặc file hỏng) thì null và engine tự dò rồi báo cáo.
 * Cửa song sinh thứ ba của `readRunnerCfg`/`readReviewCfg` (harness): cùng luật fail-safe, cùng lời báo an toàn.
 */
export function readSourcesCfg(repoPath: string): SourcesCfg | null {
  const f = join(repoPath, 'checkmate.yml');
  if (!existsSync(f)) return null;
  let raw: { sources?: Record<string, unknown> } | undefined;
  try {
    raw = parseYaml(readFileSync(f, 'utf8')) as { sources?: Record<string, unknown> };
  } catch (e) {
    console.error(`checkmate.yml của repo đích sai cú pháp — bỏ qua cấu hình sources, rơi về tự dò: ${loiCuPhapAnToan(e)}`);
    return null;
  }
  const s = raw?.sources;
  if (!s || typeof s !== 'object') return null;
  const rejected: NonNullable<SourcesCfg['rejected']> = [];
  const doc = (key: SourceKey): string[] | undefined => {
    const x = s[key];
    if (x == null) return undefined;
    const ok: string[] = [];
    // Mọi khoá đi qua ĐÚNG MỘT cửa đọc: luật loại đường ngoài repo và cơ chế `rejected` áp y nguyên.
    // Khoá `process_docs` có thêm một gác riêng vì nó nới chứ không siết (xem `notADirectoryReason`).
    for (const d of (Array.isArray(x) ? x : [x]).map((v) => String(v).trim()).filter(Boolean)) {
      const ly = outsideRepoReason(d) ?? (key === 'process_docs' ? notADirectoryReason(d) : null);
      if (ly) rejected.push({ key, pattern: d, reason: ly });
      else ok.push(d);
    }
    return ok;
  };
  const cfg: SourcesCfg = { specs: doc('specs'), api_doc: doc('api_doc'), test_sample: doc('test_sample'), process_docs: doc('process_docs') };
  if (rejected.length) cfg.rejected = rejected;
  return cfg.specs || cfg.api_doc || cfg.test_sample || cfg.process_docs ? cfg : null;
}
