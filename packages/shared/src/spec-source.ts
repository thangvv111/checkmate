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

export type SourceKey = 'specs' | 'api_doc' | 'test_sample';

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
  /** Đường bị loại ngay ở cửa đọc (tuyệt đối, hoặc có `..`) — mang theo để báo ra, không im lặng. */
  rejected?: Array<{ key: SourceKey; pattern: string; reason: string }>;
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
function lyDoNgoaiRepo(duong: string): string | null {
  const t = duong.replace(/\\/g, '/');
  if (/^([a-zA-Z]:)?\//.test(t) || t.startsWith('//')) return 'đường tuyệt đối — nguồn phải nằm trong repo';
  if (t.split('/').some((seg) => seg === '..')) return 'có `..` — không được trỏ ra ngoài repo';
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
    for (const d of (Array.isArray(x) ? x : [x]).map((v) => String(v).trim()).filter(Boolean)) {
      const ly = lyDoNgoaiRepo(d);
      if (ly) rejected.push({ key, pattern: d, reason: ly });
      else ok.push(d);
    }
    return ok;
  };
  const cfg: SourcesCfg = { specs: doc('specs'), api_doc: doc('api_doc'), test_sample: doc('test_sample') };
  if (rejected.length) cfg.rejected = rejected;
  return cfg.specs || cfg.api_doc || cfg.test_sample ? cfg : null;
}
