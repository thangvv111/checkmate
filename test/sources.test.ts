import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  globToRegExp,
  matchPattern,
  readSources,
  describeSources,
  skipReason,
  SPEC_CANDIDATES,
  MAX_SOURCE_BYTES,
  type TreeFile,
} from '../packages/harness/src/sources.js';
import { readSourcesCfg } from '../packages/harness/src/runner.js';
import { laThuMucQuyTrinh, PROCESS_DOC_DIRS } from '../packages/shared/src/spec-source.js';
import { readTarget, listTree } from '../packages/harness/src/target.js';

/**
 * Lưới canh NGUỒN — engine đọc spec / tài liệu API / file test mẫu từ đâu.
 *
 * Bản trước đọc cứng `specs/*.md` phẳng, `README.md`, `test/*.test.ts` — sản phẩm chỉ chạy trên repo
 * được dựng vừa khớp. Lưới này canh ba điều: repo KHAI thì đọc đúng chỗ khai (nhiều đường, glob, thư
 * mục con); KHÔNG khai thì tự dò và BÁO CÁO đã dò ở đâu; và chỗ nào không thấy gì thì nói ra chứ
 * không im lặng — im lặng ở đây khiến người dùng tin spec đã được nạp.
 */

const tree = (...paths: string[]): TreeFile[] => paths.map((path) => ({ path }));

const SPEC_A = '# Duyệt\n\n## Ngưỡng theo vai\nChuyên viên tối đa 500 triệu.\n\n## Người duyệt khác người tạo\nKhông tự duyệt.\n';
const SPEC_B = '## Khoá sau 5 lần sai\nKhoá 15 phút.\n';
const DOCS: Record<string, string> = {
  'docs/spec/rules.md': SPEC_A,
  'requirements/auth/login.md': SPEC_A,
  'requirements/auth/lockout.md': SPEC_B,
  'specs/a.md': SPEC_B,
  'specs/empty.md': '',
  'docs/specs/real.md': SPEC_A,
  'openspec/specs/x/spec.md': SPEC_A,
  'README.md': '# API\nGET /x',
  'docs/api.md': 'POST /y',
  'tests/unit/a_test.py': 'def test_a(): pass',
  'test/zzz.test.ts': 'it()',
  'test/checker_probe.probe.test.ts': 'probe',
};
const read = (p: string): string => DOCS[p] ?? '';

describe('glob tối thiểu', () => {
  it('`**` mọi tầng · `*` một tầng · `{a,b}` · `?`', () => {
    const re = globToRegExp('specs/**/*.md');
    expect(re.test('specs/a.md')).toBe(true);
    expect(re.test('specs/x/y/b.md')).toBe(true);
    expect(re.test('docs/a.md')).toBe(false);
    expect(re.test('specs/a.txt')).toBe(false);
    const goc = globToRegExp('*.{md,txt}');
    expect(goc.test('a.md')).toBe(true);
    expect(goc.test('b.txt')).toBe(true);
    expect(goc.test('d/a.md')).toBe(false);
    expect(globToRegExp('openapi.{yaml,yml,json}').test('openapi.yml')).toBe(true);
    expect(globToRegExp('a?.md').test('ab.md')).toBe(true);
    expect(globToRegExp('a?.md').test('abc.md')).toBe(false);
  });

  it('không phân biệt hoa thường — README.md khai trên Windows vẫn khớp readme.md trên Linux', () => {
    expect(globToRegExp('README.md').test('readme.MD')).toBe(true);
  });
});

describe('matchPattern — mẫu không glob là một file hoặc một thư mục', () => {
  const t = tree(...Object.keys(DOCS));
  it('đúng tên file → file đó; tên thư mục → mọi file bên dưới, kể cả tầng con; xếp theo tên', () => {
    expect(matchPattern('README.md', t).map((f) => f.path)).toEqual(['README.md']);
    expect(matchPattern('requirements', t).map((f) => f.path)).toEqual(['requirements/auth/lockout.md', 'requirements/auth/login.md']);
    expect(matchPattern('requirements/', t)).toEqual(matchPattern('requirements', t));
    expect(matchPattern('khong-co', t)).toEqual([]);
    expect(matchPattern('', t)).toEqual([]);
  });
});

describe('repo KHAI nguồn trong checkmate.yml', () => {
  const t = tree(...Object.keys(DOCS));
  const kq = readSources(
    { specs: ['requirements/**/*.md', 'docs/nope/*.md'], api_doc: ['README.md', 'docs/api.md'], test_sample: ['tests/**/*_test.py'] },
    t,
    read,
  );

  it('đọc đúng chỗ khai: thư mục không tên specs/, có tầng con, spec KHÔNG mã nào', () => {
    expect(kq.specs.map((s) => s.file)).toEqual(['requirements/auth/lockout.md', 'requirements/auth/login.md']);
    expect(kq.report.specs.declared).toBe(true);
    expect(kq.report.specs.probes[0]).toMatchObject({ pattern: 'requirements/**/*.md', files: 2, units: 3, used: true });
  });

  it('đường khai không khớp file nào → nói rõ đường đó, không im lặng bỏ qua', () => {
    expect(kq.report.specs.probes[1]).toMatchObject({ pattern: 'docs/nope/*.md', files: 0, used: false });
    expect(kq.report.specs.probes[1]!.note).toContain('không khớp file nào');
    const dong = describeSources(kq.report);
    expect(dong.some((d) => d.includes('⚠ docs/nope/*.md'))).toBe(true);
    expect(dong[0]).toContain('khai trong checkmate.yml: 2 file · 3 đơn vị');
  });

  it('tài liệu API nhiều file → nối có đề tên file; file test mẫu là MỘT file', () => {
    expect(kq.apiDoc).toContain('--- README.md ---');
    expect(kq.apiDoc).toContain('--- docs/api.md ---');
    expect(kq.apiDoc).toContain('POST /y');
    expect(kq.testMau).toBe('def test_a(): pass');
    expect(kq.report.test_sample.files).toEqual(['tests/unit/a_test.py']);
  });

  it('một file API thì nguyên văn như trước, không thêm tiêu đề', () => {
    const mot = readSources({ api_doc: ['README.md'] }, t, read);
    expect(mot.apiDoc).toBe('# API\nGET /x');
  });
});

describe('repo KHÔNG khai — tự dò và báo cáo', () => {
  it('spec ở docs/spec/ (không phải specs/) vẫn tìm ra; báo đã dò chỗ nào, chỗ nào không có', () => {
    const kq = readSources(null, tree('docs/spec/rules.md', 'README.md', 'test/zzz.test.ts', 'test/checker_probe.probe.test.ts', 'src/a.ts'), read);
    expect(kq.report.specs.declared).toBe(false);
    expect(kq.report.specs.files).toEqual(['docs/spec/rules.md']);
    expect(kq.report.specs.probes.find((p) => p.used)?.pattern).toBe('docs/spec/**/*.md');
    expect(kq.report.specs.probes.find((p) => p.pattern === 'specs/**/*.md')).toMatchObject({ files: 0, used: false });
    expect(kq.report.specs.probes).toHaveLength(SPEC_CANDIDATES.length);
    const dong = describeSources(kq.report);
    expect(dong[0]).toContain(`đã dò ${SPEC_CANDIDATES.length} chỗ: dùng docs/spec/**/*.md (1 file · 2 đơn vị)`);
    expect(dong.some((d) => d.includes('không có: specs/**/*.md'))).toBe(true);
  });

  it('tài liệu API dò ra README.md; file test mẫu bỏ qua probe của chính engine', () => {
    const kq = readSources(null, tree('README.md', 'test/zzz.test.ts', 'test/checker_probe.probe.test.ts'), read);
    expect(kq.apiDoc).toBe('# API\nGET /x');
    expect(kq.report.api_doc).toMatchObject({ declared: false, files: ['README.md'] });
    expect(kq.testMau).toBe('it()');
    expect(kq.report.test_sample.files).toEqual(['test/zzz.test.ts']);
  });

  it('có cả specs/ lẫn openspec/specs/ → ứng viên đầu thắng, chỗ kia báo «có, không dùng»', () => {
    const kq = readSources(null, tree('specs/a.md', 'openspec/specs/x/spec.md'), read);
    expect(kq.report.specs.files).toEqual(['specs/a.md']);
    const os = kq.report.specs.probes.find((p) => p.pattern === 'openspec/specs/**/*.md')!;
    expect(os).toMatchObject({ files: 1, units: 2, used: false });
    expect(os.note).toContain('có, không dùng');
    expect(describeSources(kq.report).some((d) => d.includes('openspec/specs/**/*.md — 1 file · 2 đơn vị — có, không dùng'))).toBe(true);
  });

  it('specs/ chỉ có file trống → KHÔNG phải spec, dò tiếp; báo lý do', () => {
    const kq = readSources(null, tree('specs/empty.md', 'docs/specs/real.md'), read);
    expect(kq.report.specs.files).toEqual(['docs/specs/real.md']);
    const sp = kq.report.specs.probes.find((p) => p.pattern === 'specs/**/*.md')!;
    expect(sp).toMatchObject({ files: 1, units: 0, used: false });
    expect(sp.note).toContain('không chia được đơn vị nào');
  });

  it('không thấy gì ở đâu → nói THẲNG là chấm không có luật đối chiếu, và chỉ chỗ khai', () => {
    const kq = readSources(null, tree('src/a.ts'), read);
    expect(kq.specs).toEqual([]);
    expect(kq.apiDoc).toBe('');
    expect(kq.testMau).toBe('');
    expect(kq.report.specs.probes.every((p) => p.files === 0 && !p.used)).toBe(true);
    const dong = describeSources(kq.report);
    expect(dong[0]).toMatch(/^⚠ Nguồn spec/);
    expect(dong[0]).toContain('KHÔNG thấy spec nào');
    expect(dong[0]).toContain('sources.specs');
    expect(dong.some((d) => d.startsWith('Tài liệu API — tự dò, không thấy'))).toBe(true);
  });
});

describe('file khớp mẫu mà không được đọc — nói ra, không nuốt', () => {
  it('symlink · nhị phân · quá lớn bị bỏ và ghi lý do; file thường thì đọc', () => {
    expect(skipReason({ path: 'specs/l.md', symlink: true })).toBe('symlink');
    expect(skipReason({ path: 'specs/i.png' })).toBe('nhị phân');
    expect(skipReason({ path: 'specs/b.md', size: MAX_SOURCE_BYTES + 1 })).toContain('quá lớn');
    expect(skipReason({ path: 'specs/a.md', size: 10 })).toBeNull();
    const kq = readSources(
      { specs: ['specs'] },
      [{ path: 'specs/a.md' }, { path: 'specs/link.md', symlink: true }, { path: 'specs/big.md', size: MAX_SOURCE_BYTES + 1 }, { path: 'specs/img.png' }],
      read,
    );
    expect(kq.report.specs.files).toEqual(['specs/a.md']);
    expect(kq.report.specs.probes[0]!.note).toContain('bỏ');
    expect(kq.report.specs.probes[0]!.note).toContain('symlink');
  });
});

describe('readSourcesCfg — cửa đọc mục sources của checkmate.yml', () => {
  const thuMuc = mkdtempSync(join(tmpdir(), 'cm-sources-cfg-'));
  afterAll(() => rmSync(thuMuc, { recursive: true, force: true }));
  let dem = 0;
  const viet = (yml: string): string => {
    const d = join(thuMuc, `r${dem++}`);
    mkdirSync(d);
    writeFileSync(join(d, 'checkmate.yml'), yml);
    return d;
  };

  it('chuỗi hay danh sách đều thành danh sách; khoá không khai thì vắng', () => {
    const c = readSourcesCfg(viet('sources:\n  specs: specs/**/*.md\n  api_doc: README.md\n'));
    expect(c).toEqual({ specs: ['specs/**/*.md'], api_doc: ['README.md'], test_sample: undefined });
  });

  it('đường tuyệt đối hay có `..` bị loại NGAY Ở CỬA và mang theo lý do — nguồn phải nằm trong repo', () => {
    const c = readSourcesCfg(viet('sources:\n  specs:\n    - ../shared/*.md\n    - /etc/*.md\n    - "C:\\\\x\\\\*.md"\n    - docs/../../x.md\n    - specs/*.md\n'))!;
    expect(c.specs).toEqual(['specs/*.md']);
    expect(c.rejected?.map((r) => r.pattern)).toEqual(['../shared/*.md', '/etc/*.md', 'C:\\x\\*.md', 'docs/../../x.md']);
    expect(c.rejected?.every((r) => r.key === 'specs')).toBe(true);
    // Lời loại phải đi tới log của lượt chấm, không dừng ở stderr tiến trình con.
    const kq = readSources(c, tree('specs/a.md'), read);
    expect(kq.report.rejected).toHaveLength(4);
    expect(describeSources(kq.report)[0]).toContain("⚠ checkmate.yml sources.specs: '../shared/*.md' bị loại");
  });

  it('khai toàn đường bị loại → rơi về tự dò, nhưng lời loại vẫn còn', () => {
    const c = readSourcesCfg(viet('sources:\n  specs: ../x/*.md\n'))!;
    expect(c.specs).toEqual([]);
    const kq = readSources(c, tree('specs/a.md'), read);
    expect(kq.report.specs.declared).toBe(false);
    expect(kq.report.specs.files).toEqual(['specs/a.md']);
    expect(kq.report.rejected).toHaveLength(1);
  });

  it('yml hỏng → null, không ném (fail-safe như hai cửa song sinh); không có mục sources → null', () => {
    expect(() => readSourcesCfg(viet('sources:\n  specs: [\n'))).not.toThrow();
    expect(readSourcesCfg(viet('sources:\n  specs: [\n'))).toBeNull();
    expect(readSourcesCfg(viet('runner:\n  test_cmd: x\n'))).toBeNull();
    expect(readSourcesCfg(viet('sources: 5\n'))).toBeNull();
    expect(readSourcesCfg(join(thuMuc, 'khong-ton-tai'))).toBeNull();
  });
});

// Mỗi ca dưới đây spawn git ~20 lần; trên Windows lúc lưới chạy song song, ca đầu đo được 6.4 s —
// trần mặc định 5 s là trần cho test thuần, không phải cho test có tiến trình con.
const GIT_TIMEOUT = 30_000;

describe('readTarget trên repo git thật — đọc từ cây nhánh, không đọc đĩa', () => {
  const goc = mkdtempSync(join(tmpdir(), 'cm-target-'));
  afterAll(() => {
    try {
      rmSync(goc, { recursive: true, force: true });
    } catch {
      /* Windows giữ file .git một lúc — không phải lỗi của test */
    }
  });
  const gitRun = (d: string, args: string[]): string =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd: d, encoding: 'utf8' }).trim();
  const ghi = (d: string, files: Record<string, string>, msg: string): void => {
    for (const [p, c] of Object.entries(files)) {
      mkdirSync(dirname(join(d, p)), { recursive: true });
      writeFileSync(join(d, p), c);
    }
    gitRun(d, ['add', '-A']);
    gitRun(d, ['commit', '-q', '-m', msg]);
  };
  let dem = 0;
  const repoMoi = (): string => {
    const d = join(goc, `r${dem++}`);
    mkdirSync(d);
    gitRun(d, ['init', '-q', '-b', 'main']);
    return d;
  };

  it('repo khai spec ở thư mục không tên specs/, có tầng con, không mã nào → đọc ra đơn vị; PR thêm mục → luật mới', () => {
    const d = repoMoi();
    ghi(d, { 'checkmate.yml': 'sources:\n  specs:\n    - requirements/**/*.md\n    - docs/nope/*.md\n', 'requirements/auth/login.md': SPEC_A, 'src/a.ts': 'export const a = 1;\n' }, 'goc');
    gitRun(d, ['checkout', '-q', '-b', 'pr']);
    ghi(d, { 'requirements/auth/lockout.md': SPEC_B }, 'them luat');
    const t = readTarget(d, 'pr', 'main');
    expect(t.specs.map((s) => s.file)).toEqual(['requirements/auth/lockout.md', 'requirements/auth/login.md']);
    expect(t.units.map((u) => u.address)).toEqual(['Khoá sau 5 lần sai', 'Duyệt › Ngưỡng theo vai', 'Duyệt › Người duyệt khác người tạo']);
    expect(t.luatMoi).toEqual(['Khoá sau 5 lần sai']);
    expect(t.sources.specs.declared).toBe(true);
    expect(t.sources.specs.probes[1]!.note).toContain('không khớp file nào');
    const cay = listTree(d, 'pr');
    expect(cay.map((f) => f.path)).toContain('requirements/auth/lockout.md');
    expect(cay.every((f) => f.symlink === false && typeof f.size === 'number')).toBe(true);
  }, GIT_TIMEOUT);

  it('repo không khai → tự dò ra docs/spec/, README.md và file test python; đọc đúng bản của NHÁNH PR dù cây làm việc đang ở nhánh khác', () => {
    const d = repoMoi();
    ghi(d, { 'docs/spec/rules.md': SPEC_A, 'README.md': '# API\nGET /x', 'tests/unit/a_test.py': 'def test_a(): pass', 'src/a.ts': 'export const a = 1;\n' }, 'goc');
    gitRun(d, ['checkout', '-q', '-b', 'pr']);
    ghi(d, { 'src/a.ts': 'export const a = 2;\n', 'README.md': '# API v2\nGET /x' }, 'sua');
    gitRun(d, ['checkout', '-q', 'main']); // cây làm việc ở nhánh gốc — đọc đĩa sẽ ra bản cũ
    const t = readTarget(d, 'pr', 'main');
    expect(t.sources.specs.declared).toBe(false);
    expect(t.specs.map((s) => s.file)).toEqual(['docs/spec/rules.md']);
    expect(t.units).toHaveLength(2);
    expect(t.luatMoi).toEqual([]);
    expect(t.apiDoc).toBe('# API v2\nGET /x');
    expect(t.testMau).toBe('def test_a(): pass');
    expect(t.sources.test_sample.files).toEqual(['tests/unit/a_test.py']);
  }, GIT_TIMEOUT);

  it('repo không có spec nào → vẫn đọc được target, spec rỗng và báo cáo nói rõ đã dò ở đâu', () => {
    const d = repoMoi();
    ghi(d, { 'src/a.ts': 'export const a = 1;\n' }, 'goc');
    gitRun(d, ['checkout', '-q', '-b', 'pr']);
    ghi(d, { 'src/a.ts': 'export const a = 2;\n' }, 'sua');
    const t = readTarget(d, 'pr', 'main');
    expect(t.specs).toEqual([]);
    expect(t.units).toEqual([]);
    expect(t.luatMoi).toEqual([]);
    expect(describeSources(t.sources)[0]).toContain('KHÔNG thấy spec nào');
  }, GIT_TIMEOUT);
});

describe('readSourcesCfg — khoá process_docs (thư mục tài liệu quy trình)', () => {
  const thuMuc = mkdtempSync(join(tmpdir(), 'cm-pd-'));
  afterAll(() => rmSync(thuMuc, { recursive: true, force: true }));
  let dem = 0;
  const viet = (yml: string): string => {
    const d = join(thuMuc, `r${dem++}`);
    mkdirSync(d);
    writeFileSync(join(d, 'checkmate.yml'), yml);
    return d;
  };

  it('[T2.1] chuỗi hay danh sách đều nhận', () => {
    expect(readSourcesCfg(viet('sources:\n  process_docs: rfcs/\n'))?.process_docs).toEqual(['rfcs/']);
    expect(readSourcesCfg(viet('sources:\n  process_docs:\n    - rfcs/\n    - adr\n'))?.process_docs).toEqual(['rfcs/', 'adr']);
  });

  it('[T2.2] đường ngoài repo bị loại kèm lý do, phần hợp lệ giữ lại — cùng luật với sources.specs', () => {
    const c = readSourcesCfg(viet('sources:\n  process_docs:\n    - /etc/\n    - ../x/\n    - rfcs/\n'))!;
    expect(c.process_docs).toEqual(['rfcs/']);
    expect(c.rejected?.map((r) => r.pattern)).toEqual(['/etc/', '../x/']);
    expect(c.rejected?.every((r) => r.key === 'process_docs')).toBe(true);
  });

  it('[T2.3] mẫu chạm gốc repo bị TỪ CHỐI — khai báo này NỚI nên phải gác', () => {
    // `**` biến mọi .md/.yaml của repo thành tài liệu quy trình, kể cả file CI.
    for (const m of ['**', '*', '.']) {
      const c = readSourcesCfg(viet(`sources:\n  process_docs: '${m}'\n`))!;
      expect(c.process_docs, `mẫu «${m}» phải bị loại`).toEqual([]);
      expect(c.rejected?.[0]!.reason).toMatch(/ít nhất một tầng thư mục|không nhận mẫu glob/);
    }
    // `/` cũng bị loại, nhưng bởi gác ĐƯỜNG TUYỆT ĐỐI (chạy trước) — lý do khác, kết quả cùng chiều.
    const goc = readSourcesCfg(viet("sources:\n  process_docs: '/'\n"))!;
    expect(goc.process_docs).toEqual([]);
    expect(goc.rejected?.[0]!.reason).toContain('đường tuyệt đối');
  });

  it('[T2.3b] mẫu glob cũng bị từ chối — khoá này nhận ĐƯỜNG THƯ MỤC, không nhận glob', () => {
    const c = readSourcesCfg(viet('sources:\n  process_docs: docs/*/notes\n'))!;
    expect(c.process_docs).toEqual([]);
    expect(c.rejected?.[0]!.reason).toContain('không nhận mẫu glob');
  });

  it('[T2.4] không khai → trường vắng; khai mỗi process_docs vẫn ra cấu hình (không cần specs)', () => {
    expect(readSourcesCfg(viet('sources:\n  specs: specs/**/*.md\n'))?.process_docs).toBeUndefined();
    expect(readSourcesCfg(viet('sources:\n  process_docs: rfcs/\n'))).not.toBeNull();
  });
});

describe('laThuMucQuyTrinh — so tiền tố thư mục, giữ ba tính chất của luật định tuyến', () => {
  it('khớp theo CẤU TRÚC, không theo tiền tố chuỗi', () => {
    expect(laThuMucQuyTrinh('rfcs/x.md', ['rfcs'])).toBe(true);
    expect(laThuMucQuyTrinh('rfcs/x.md', ['rfcs/'])).toBe(true);
    expect(laThuMucQuyTrinh('rfcs-notes.md', ['rfcs'])).toBe(false);
  });

  it('so ĐÚNG HOA THƯỜNG cho tên thư mục (Linux: OpenSpec/ ≠ openspec/)', () => {
    expect(laThuMucQuyTrinh('OpenSpec/a.md', ['openspec/'])).toBe(false);
    expect(laThuMucQuyTrinh('openspec/a.md', ['openspec/'])).toBe(true);
  });

  it('KHÔNG chuẩn hoá dấu chéo ngược — `openspec\hack.ts` là tên file thật ở gốc repo', () => {
    expect(laThuMucQuyTrinh(String.raw`openspec\hack.ts`, ['openspec/'])).toBe(false);
  });

  it('mặc định của engine là openspec/, và danh sách rỗng thì không khớp gì', () => {
    expect(PROCESS_DOC_DIRS).toEqual(['openspec/']);
    expect(laThuMucQuyTrinh('openspec/a.md', [])).toBe(false);
  });
});
