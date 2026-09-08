import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lưới GÓI DEPLOY — capability `kien-truc-tang` › «Gói deploy chỉ mang sản phẩm, không mang hồ sơ xây dựng».
 *
 * PO chốt 02/09: CheckMate vận hành độc lập với `openspec/` — OpenSpec chỉ dùng để xây, không phải một
 * phần của sản phẩm; hồ sơ cũ `specs/R*.md` cũng vậy. Đo cùng ngày: sản phẩm chạy nguyên khi cắt các thư
 * mục đó trên máy dev, nhưng gói deploy vẫn đẩy chúng lên máy chủ. Lưới này kiểm ở đúng chỗ: danh sách
 * `--exclude` của script đóng gói. Danh sách SẢN PHẨM là danh sách CHO PHÉP hẹp — mọi mục cấp một khác
 * của repo phải bị loại; thêm thư mục xây dựng mới mà quên loại là đỏ.
 */

const GOC = process.cwd();
const SCRIPT = join(GOC, 'scripts', 'pack-deploy.sh');

/** Những gì sản phẩm cần để chạy trên máy chủ. Sửa danh sách này là quyết định về gói deploy, không phải tiện tay. */
const PRODUCT_ALLOW = ['apps', 'packages', 'package.json', 'package-lock.json', 'tsconfig.json', 'README.md', 'DEPLOY.md'];
/** Có trên đĩa máy dev nhưng git không theo dõi — tar vẫn gói nếu không loại. */
const KHONG_THEO_DOI_NHUNG_CO = ['_ref'];
/** Tên dữ liệu chung, được phép loại dạng trơ vì áp cho cả repo demo đóng gói cùng. */
const TRO_DUOC_PHEP = new Set(['node_modules', '.git', 'config.json', '.secrets.json', '.ncc-verify.json', 'web-runs', 'probes-lib', 'probes-lib-*', 'runs', 'repos', 'dep-stores', '*.log', 'bench/kq', '.worktrees', '*.tar.gz', '*.tmp.*']);

function docExclude(): string[] {
  // Chỉ đọc dòng LỆNH — chú thích trong script có nhắc `--exclude=test` làm ví dụ về cái KHÔNG được làm.
  const src = readFileSync(SCRIPT, 'utf8')
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');
  return [...src.matchAll(/--exclude=('([^']+)'|(\S+))/g)].map((m) => m[2] ?? m[3]!);
}

function mucCapMot(): string[] {
  // Cả file chưa add (không bị ignore): một thư mục xây dựng mới phải bị bắt TRƯỚC khi nó được commit.
  const tracked = execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files', '--cached', '--others', '--exclude-standard'], { cwd: GOC, encoding: 'utf8' })
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((p) => p.split('/')[0]!);
  return [...new Set([...tracked, ...KHONG_THEO_DOI_NHUNG_CO])].sort();
}

describe('scripts/pack-deploy.sh — gói deploy chỉ mang sản phẩm', () => {
  const excludes = docExclude();

  it('parse được danh sách --exclude (lưới không xanh trên script rỗng)', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    expect(excludes.length).toBeGreaterThan(10);
  });

  it('danh sách sản phẩm không có mục chết — mọi mục trong PRODUCT_ALLOW tồn tại trong repo', () => {
    const thieu = PRODUCT_ALLOW.filter((m) => !existsSync(join(GOC, m)));
    expect(thieu).toEqual([]);
  });

  it('[Scenario: thêm thư mục xây dựng mới mà quên loại] mọi mục cấp một ngoài danh sách sản phẩm đều bị loại', () => {
    const ex = new Set(excludes);
    const chuaLoai = mucCapMot().filter((m) => !PRODUCT_ALLOW.includes(m) && !ex.has(`checkmate/${m}`) && !ex.has(m));
    expect(chuaLoai, 'mục cấp một chưa có --exclude=checkmate/<tên> trong scripts/pack-deploy.sh').toEqual([]);
  });

  it('[Scenario: đóng gói đúng] hồ sơ xây dựng bị loại theo đường neo, kể cả checkmate.yml và luật của agent', () => {
    const ex = new Set(excludes);
    for (const m of ['openspec', 'docs', 'test', 'bench', '_ref', '.claude', 'checkmate.yml', 'AGENTS.md', 'CLAUDE.md']) {
      expect(ex.has(`checkmate/${m}`), `thiếu --exclude=checkmate/${m}`).toBe(true);
    }
  });

  it('[Scenario: repo demo không bị cắt nhầm] không loại trơ các tên mà repo đích cũng có (test · docs · openspec · specs)', () => {
    const tro = excludes.filter((e) => !e.startsWith('checkmate/') && !TRO_DUOC_PHEP.has(e));
    expect(tro, 'exclude trơ ngoài danh sách dữ liệu chung — sẽ cắt nhầm repo demo đóng gói cùng').toEqual([]);
  });

  it('danh sách cho phép trong script (CHO_PHEP) khớp PRODUCT_ALLOW — một nguồn, không hai cửa lệch nhau', () => {
    // Án lệ: file tạm bị git ignore (`mcp-client-check.tmp.ts`) lọt vào gói vì lưới chỉ nhìn git, tar thì gói tất.
    // Script kiểm cấp một của gói theo CHO_PHEP; lưới đòi CHO_PHEP đúng bằng PRODUCT_ALLOW.
    const m = /^CHO_PHEP="([^"]+)"/m.exec(readFileSync(SCRIPT, 'utf8'));
    expect(m, 'script thiếu dòng CHO_PHEP="…"').not.toBeNull();
    expect(m![1]!.split(/\s+/).sort()).toEqual([...PRODUCT_ALLOW].sort());
  });

  it('tự kiểm trong script phủ đủ ba lớp: bí mật · dữ liệu prod · hồ sơ xây dựng', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    for (const dau of ['secrets', 'web-runs/', 'probes-lib/', 'dep-stores/', 'checkmate/runs/', 'openspec|docs|test', 'checkmate\\.yml']) {
      expect(src, `tự kiểm thiếu dấu hiệu: ${dau}`).toContain(dau);
    }
  });
});
