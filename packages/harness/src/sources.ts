import { splitAllSpecUnits } from './spec-units.js';

/**
 * Nguồn engine đọc từ repo đích — spec, tài liệu API, file test mẫu — và CÁCH tìm ra chúng.
 *
 * Bản trước đọc cứng `specs/*.md` phẳng, `README.md`, `test/*.test.ts`. Repo demo của chính dự án
 * được viết vừa khớp bộ ba đó, nên sản phẩm chỉ chạy trên repo dựng cho nó. Nay: repo khai trong
 * `checkmate.yml` (mục `sources`); không khai thì engine TỰ DÒ theo thứ tự thông dụng — và dù đường
 * nào, nó cũng ghi ra ĐÃ TÌM Ở ĐÂU, MỖI CHỖ THẤY GÌ. Dò tìm là một phán đoán; phán đoán không nói ra
 * thì người dùng không sửa được, và đọc nhầm chỗ là cách êm nhất để chấm theo một văn bản không
 * phải spec (cùng nguyên tắc «không cắt âm thầm» của `ngoaiTamNhin`).
 *
 * Mọi hàm ở đây làm việc trên MỘT DANH SÁCH FILE của nhánh đang chấm (từ `git ls-tree`), không đụng
 * đĩa: đường khai không thể trỏ ra ngoài repo vì danh sách không có file nào ngoài repo, và symlink
 * bị loại ngay từ danh sách. Biên repo giữ bằng cấu trúc, không bằng một phép kiểm dễ quên.
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

/** Một chỗ đã tìm: mẫu, thấy bao nhiêu file, có dùng không, và vì sao không. */
export interface SourceProbe {
  pattern: string;
  files: number;
  /** Chỉ có với spec: số đơn vị luật chia được từ các file khớp. */
  units?: number;
  used: boolean;
  note?: string;
}

export interface SourceReport {
  /** true = repo khai trong checkmate.yml · false = engine tự dò. */
  declared: boolean;
  /** Từng chỗ đã tìm — kể cả chỗ không thấy gì. */
  probes: SourceProbe[];
  /** File thật sự nạp. */
  files: string[];
}

export interface SourcesReport {
  specs: SourceReport;
  api_doc: SourceReport;
  test_sample: SourceReport;
  rejected: Array<{ key: SourceKey; pattern: string; reason: string }>;
}

export interface LoadedSources {
  specs: Array<{ file: string; noiDung: string }>;
  apiDoc: string;
  testMau: string;
  report: SourcesReport;
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

/** File to hơn mức này không vào prompt: một spec 5 MB làm lượt chấm chết vì ngân sách, không vì nội dung. */
export const MAX_SOURCE_BYTES = 512 * 1024;
const RE_BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|7z|rar|woff2?|ttf|otf|eot|mp4|mov|mp3|wav|exe|dll|so|dylib|class|jar|pyc|wasm|db|sqlite)$/i;
/** Probe do chính engine sinh không phải «file test mẫu» của repo — lấy nó làm khuôn là tự soi gương. */
const RE_OWN_PROBE = /(^|\/)checker[._]probe/i;

/** Vì sao một file khớp mẫu vẫn không được đọc — null là đọc được. */
export function skipReason(f: TreeFile): string | null {
  if (f.symlink) return 'symlink';
  if (RE_BINARY.test(f.path)) return 'nhị phân';
  if (f.size !== undefined && f.size > MAX_SOURCE_BYTES) return `quá lớn (${Math.round(f.size / 1024)} KB)`;
  return null;
}

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
 * `union` — nạp mọi mẫu (repo khai spec ở nhiều chỗ thì lấy hết).
 * `first` — ứng viên đầu có gì thì dùng, các ứng viên sau chỉ báo cáo (đường tự dò).
 * `single` — MỘT file: file đầu của mẫu đầu khớp (file test mẫu là một cái khuôn, không phải một tập).
 */
type Pick = 'union' | 'first' | 'single';

interface Resolved {
  report: SourceReport;
  files: TreeFile[];
}

function resolve(
  patterns: string[],
  tree: TreeFile[],
  declared: boolean,
  pick: Pick,
  countUnits: ((files: TreeFile[]) => number) | null,
  exclude: ((f: TreeFile) => boolean) | null,
): Resolved {
  const probes: SourceProbe[] = [];
  const chosen: TreeFile[] = [];
  const seen = new Set<string>();
  let done = false;
  for (const pattern of patterns) {
    const hit = matchPattern(pattern, tree).filter((f) => !(exclude && exclude(f)));
    const ok: TreeFile[] = [];
    const boQua = new Map<string, number>();
    for (const f of hit) {
      const ly = skipReason(f);
      if (ly) boQua.set(ly, (boQua.get(ly) ?? 0) + 1);
      else ok.push(f);
    }
    const units = countUnits && ok.length ? countUnits(ok) : undefined;
    // Đường tự dò chỉ nhận ứng viên CÓ ĐƠN VỊ: một thư mục `specs/` chỉ có file trống không phải
    // spec. Đường khai thì repo đã nói «đọc chỗ này» — có file là nạp, đơn vị chỉ để báo cáo.
    const coGi = pick === 'first' && countUnits ? (units ?? 0) > 0 : ok.length > 0;
    let used = false;
    const ghiChu: string[] = [];
    if (hit.length === 0) {
      if (declared) ghiChu.push('không khớp file nào — kiểm lại đường trong checkmate.yml');
    } else if (!coGi) {
      ghiChu.push(ok.length ? 'có file nhưng không chia được đơn vị nào' : 'chỉ có file không đọc được');
    } else if (pick === 'union' || !done) {
      used = true;
      done = true;
    } else {
      ghiChu.push('có, không dùng — muốn nạp thì khai trong checkmate.yml (sources)');
    }
    if (boQua.size) ghiChu.push(`bỏ ${[...boQua].map(([ly, n]) => `${n} file ${ly}`).join(', ')}`);
    if (used) {
      for (const f of pick === 'single' ? ok.slice(0, 1) : ok) {
        if (seen.has(f.path)) continue;
        seen.add(f.path);
        chosen.push(f);
      }
    }
    probes.push({ pattern, files: ok.length, ...(units === undefined ? {} : { units }), used, ...(ghiChu.length ? { note: ghiChu.join(' · ') } : {}) });
  }
  return { report: { declared, probes, files: chosen.map((f) => f.path) }, files: chosen };
}

/**
 * Nạp ba nguồn theo cấu hình (hoặc tự dò), trả về nội dung + báo cáo đã tìm ở đâu.
 * `read` nhận đường repo-relative và trả nội dung — người gọi quyết định đọc từ đâu (cây git).
 */
export function readSources(cfg: SourcesCfg | null, tree: TreeFile[], read: (path: string) => string): LoadedSources {
  const cache = new Map<string, string>();
  const doc = (p: string): string => {
    let v = cache.get(p);
    if (v === undefined) {
      v = read(p);
      cache.set(p, v);
    }
    return v;
  };
  const countUnits = (files: TreeFile[]): number => splitAllSpecUnits(files.map((f) => ({ file: f.path, noiDung: doc(f.path) }))).length;

  const specR = cfg?.specs?.length
    ? resolve(cfg.specs, tree, true, 'union', countUnits, null)
    : resolve(SPEC_CANDIDATES, tree, false, 'first', countUnits, null);
  const apiR = cfg?.api_doc?.length
    ? resolve(cfg.api_doc, tree, true, 'union', null, null)
    : resolve(API_DOC_CANDIDATES, tree, false, 'first', null, null);
  const testR = cfg?.test_sample?.length
    ? resolve(cfg.test_sample, tree, true, 'single', null, (f) => RE_OWN_PROBE.test(f.path))
    : resolve(TEST_SAMPLE_CANDIDATES, tree, false, 'single', null, (f) => RE_OWN_PROBE.test(f.path));

  const specs = specR.files.map((f) => ({ file: f.path, noiDung: doc(f.path) }));
  // Một file thì nguyên văn như trước; nhiều file thì đề tên từng file để model biết đoạn nào của đâu.
  const apiDoc = apiR.files.length === 1 ? doc(apiR.files[0]!.path) : apiR.files.map((f) => `--- ${f.path} ---\n${doc(f.path)}`).join('\n\n');
  const testMau = testR.files.length ? doc(testR.files[0]!.path) : '';
  return {
    specs,
    apiDoc,
    testMau,
    report: { specs: specR.report, api_doc: apiR.report, test_sample: testR.report, rejected: cfg?.rejected ?? [] },
  };
}

const TEN: Record<SourceKey, string> = { specs: 'Nguồn spec', api_doc: 'Tài liệu API', test_sample: 'File test mẫu' };

function taSo(p: SourceProbe): string {
  return p.units === undefined ? `${p.files} file` : `${p.files} file · ${p.units} đơn vị`;
}

/**
 * Báo cáo nguồn thành dòng log cho người đọc. Spec được nhiều dòng vì nó là đầu vào QUYẾT ĐỊNH luật;
 * hai nguồn kia mỗi thứ một dòng. Chỗ khai mà không khớp gì, chỗ bị loại — đều phải có mặt ở đây.
 */
export function describeSources(r: SourcesReport): string[] {
  const out: string[] = [];
  for (const x of r.rejected) out.push(`⚠ checkmate.yml sources.${x.key}: '${x.pattern}' bị loại — ${x.reason}`);

  const s = r.specs;
  const tongDonVi = s.probes.filter((p) => p.used).reduce((a, p) => a + (p.units ?? 0), 0);
  if (s.declared) {
    out.push(`${TEN.specs} — khai trong checkmate.yml: ${s.files.length} file · ${tongDonVi} đơn vị`);
    for (const p of s.probes) {
      out.push(p.files > 0 ? `  ✓ ${p.pattern} — ${taSo(p)}${p.note ? ` · ${p.note}` : ''}` : `  ⚠ ${p.pattern} — ${p.note ?? 'không khớp file nào'}`);
    }
  } else {
    const dung = s.probes.find((p) => p.used);
    const coMaKhongDung = s.probes.filter((p) => !p.used && p.files > 0);
    const khong = s.probes.filter((p) => !p.used && p.files === 0);
    if (dung) {
      out.push(`${TEN.specs} — không khai trong checkmate.yml, đã dò ${s.probes.length} chỗ: dùng ${dung.pattern} (${taSo(dung)})`);
    } else {
      out.push(
        `⚠ ${TEN.specs} — không khai trong checkmate.yml, đã dò ${s.probes.length} chỗ (${s.probes.map((p) => p.pattern).join(' · ')}): KHÔNG thấy spec nào. ` +
          'Lượt này chấm KHÔNG có luật đối chiếu — repo có spec thì khai đường trong checkmate.yml (sources.specs).',
      );
    }
    for (const p of coMaKhongDung) out.push(`  · ${p.pattern} — ${taSo(p)} — ${p.note}`);
    if (dung && khong.length) out.push(`  · không có: ${khong.map((p) => p.pattern).join(' · ')}`);
  }

  for (const key of ['api_doc', 'test_sample'] as const) {
    const x = r[key];
    if (x.files.length) out.push(`${TEN[key]} — ${x.declared ? 'khai trong checkmate.yml' : 'tự dò'}: ${x.files.join(', ')}`);
    else if (x.declared) out.push(`⚠ ${TEN[key]} — khai trong checkmate.yml nhưng không nạp được file nào`);
    else out.push(`${TEN[key]} — tự dò, không thấy (đã dò: ${x.probes.map((p) => p.pattern).join(' · ')})`);
    if (x.declared) for (const p of x.probes) if (p.files === 0) out.push(`  ⚠ ${p.pattern} — ${p.note ?? 'không khớp file nào'}`);
  }
  return out;
}
