import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { Sandbox } from '../packages/harness/src/sandbox.js';
import { parseJUnit } from '../packages/harness/src/runner.js';

/**
 * Lưới cho capability `target-contract` — ba điều chưa được ca nào khoá.
 *
 * 15 điều còn lại đã có ca ở `runner-cfg` (13 ca) · `loi-nap-file` (7) · `phan-loai` + `nhan-probe-log`
 * (ba dạng tên probe); file này không lặp lại chúng.
 *
 * Ba điều ở đây đều nằm ở `sandbox.ts` — đúng chặng hợp đồng-trên-giấy thành lệnh-chạy-thật. Cả ba khoá
 * bằng CHẠY THẬT (repo git tạm, worktree thật, shell thật): chúng là loại hỏng IM LẶNG, không ném lỗi mà
 * làm kết quả sai đi, nên ca đọc source sẽ khoá chữ chứ không khoá hành vi.
 */

// Mỗi ca dựng worktree git và spawn shell — chậm hơn hẳn test thuần, trần mặc định 5 s không đủ.
const TRAN_MS = 60_000;

// Bộ chạy test giả: nhận đường dẫn probe ở đối số 1, đường ra XML ở đối số 2, rồi ghi JUnit XML mang
// CHÍNH chuỗi nhận được làm tên testcase. Nhờ vậy ca đọc lại được giá trị đã thay vào, thay vì chỉ biết
// «lệnh đã chạy xong».
const SCRIPT_GHI_XML = `
const fs = require('fs');
const nhan = process.argv[2];
const out = process.argv[3];
fs.writeFileSync(out, '<?xml version="1.0"?><testsuite name="s" tests="1"><testcase classname="c" name="' + nhan + '"/></testsuite>');
`;

const SCRIPT_HONG = `
process.stderr.write('NGUYEN_NHAN_THAT_SU_XYZ: thieu goi abc');
process.exit(1);
`;

const CODE_PROBE = "import { it, expect } from 'vitest';\n\nit('P1: thử', () => { expect(1).toBe(1); });\n";

const goc = mkdtempSync(join(tmpdir(), 'cm-tc-'));
afterAll(() => {
  try {
    rmSync(goc, { recursive: true, force: true });
  } catch {
    /* Windows giữ file .git một lúc — không phải lỗi của test */
  }
});

const gitRun = (d: string, args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], {
    cwd: d,
    encoding: 'utf8',
  }).trim();

let dem = 0;
/** Repo git tạm có một commit và một thư mục `node_modules` rỗng. Trả về `{dir, sha}`. */
const repoMoi = (): { dir: string; sha: string } => {
  const dir = join(goc, `r${dem++}`);
  mkdirSync(dir);
  gitRun(dir, ['init', '-q', '-b', 'main']);
  writeFileSync(join(dir, 'a.ts'), 'export const a = 1;\n');
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  gitRun(dir, ['add', '-A']);
  gitRun(dir, ['commit', '-q', '-m', 'goc']);
  return { dir, sha: gitRun(dir, ['rev-parse', 'HEAD']) };
};

describe('R2.3 — `test_cmd` là template hai chỗ thay, và đường dẫn phải chịu được khoảng trắng', () => {
  it(
    'hai chỗ thay nhận ĐÚNG hai đường dẫn — đọc lại được từ XML mà bộ chạy ghi ra',
    () => {
      const { dir, sha } = repoMoi();
      const sb = new Sandbox(dir, sha);
      try {
        writeFileSync(join(sb.dir, 'ghi-junit.cjs'), SCRIPT_GHI_XML, 'utf8');
        const rel = sb.ghiProbe(CODE_PROBE, 'p.probe.test.ts', 'test');
        const kq = sb.chayTheoRunner([rel], { test_cmd: 'node ghi-junit.cjs {files} {out}', timeout_s: 60 }, parseJUnit);

        expect(kq.ok, `lệnh phải chạy được: ${kq.loiThu}`).toBe(true);
        expect(kq.probes).toHaveLength(1);
        // Chỗ thay thứ nhất: nếu KHÔNG được thay thì tên testcase là chuỗi placeholder nguyên văn.
        expect(kq.probes[0].title, 'chỗ thay thứ nhất phải nhận đường dẫn probe').toContain('p.probe.test.ts');
        expect(kq.probes[0].title).not.toContain('{files}');
        // Chỗ thay thứ hai: nếu KHÔNG được thay thì không có file XML nào và `ok` đã là false ở trên.
      } finally {
        sb.huy();
      }
    },
    TRAN_MS,
  );

  it(
    'thư mục probe có KHOẢNG TRẮNG → lệnh vẫn chạy đúng, XML vẫn đọc được',
    () => {
      // Ca load-bearing của nhóm. Không bọc thì shell tách một đường dẫn thành HAI tham số: bộ chạy nhận
      // sai đối số, không ghi được XML, và lượt chấm báo «không ghi nhận được probe nào». Người đọc sẽ đi
      // tìm lỗi trong probe hoặc trong repo đích, trong khi nguyên nhân nằm ở tên thư mục của máy chủ
      // (`C:\Users\Nguyen Van A\...`).
      const { dir, sha } = repoMoi();
      const sb = new Sandbox(dir, sha);
      try {
        writeFileSync(join(sb.dir, 'ghi-junit.cjs'), SCRIPT_GHI_XML, 'utf8');
        const rel = sb.ghiProbe(CODE_PROBE, 'p.probe.test.ts', 'thu muc co dau cach');
        expect(rel).toContain(' ');
        const kq = sb.chayTheoRunner([rel], { test_cmd: 'node ghi-junit.cjs {files} {out}', timeout_s: 60 }, parseJUnit);

        expect(kq.ok, `đường dẫn có khoảng trắng phải chạy được: ${kq.loiThu}`).toBe(true);
        expect(kq.probes).toHaveLength(1);
        expect(kq.probes[0].title, 'phải nhận nguyên đường dẫn, không bị cắt ở dấu cách').toContain('thu muc co dau cach');
      } finally {
        sb.huy();
      }
    },
    TRAN_MS,
  );
});

describe('R2.16 — không ghi nhận được probe nào thì lỗi phải mang NGUYÊN NHÂN bộ chạy đã báo', () => {
  it(
    'bộ chạy không xuất XML → thất bại, và thông điệp mang stderr của nó kèm tên file probe',
    () => {
      // Dừng lại là đúng (⛔C2 — không chứng minh được thì không PASS). Nhưng dừng mà không nói vì sao là
      // fail-closed MÙ: người nhận không biết đó là thiếu gói, sai lệnh, sai thư mục hay sai phiên bản.
      // Nguyên nhân đã có sẵn trong stderr; việc duy nhất phải làm là đừng nuốt nó.
      const { dir, sha } = repoMoi();
      const sb = new Sandbox(dir, sha);
      try {
        writeFileSync(join(sb.dir, 'hong.cjs'), SCRIPT_HONG, 'utf8');
        const rel = sb.ghiProbe(CODE_PROBE, 'p.probe.test.ts', 'test');
        const kq = sb.chayTheoRunner([rel], { test_cmd: 'node hong.cjs {files} {out}', timeout_s: 60 }, parseJUnit);

        expect(kq.ok).toBe(false);
        expect(kq.loiThu, 'phải mang nguyên nhân bộ chạy báo').toContain('NGUYEN_NHAN_THAT_SU_XYZ');
        expect(kq.loiThu, 'và nêu file probe liên quan').toContain('p.probe.test.ts');
      } finally {
        sb.huy();
      }
    },
    TRAN_MS,
  );
});

describe('R2.17 — đích của symlink node_modules phải là đường dẫn TUYỆT ĐỐI', () => {
  it(
    'dựng sandbox từ đường dẫn repo TƯƠNG ĐỐI → symlink vẫn trỏ đúng repo đích, không trỏ vào sandbox',
    () => {
      // Ca load-bearing. Hỏng ở đây KHÔNG ném lỗi: `npx` vẫn chạy được bộ chạy test vì nó tự tải về cache,
      // nên lượt chấm nhìn như đang chạy bình thường — trong khi mọi `import` gói từ trong worktree đều
      // «Cannot find package». Kết quả là một loạt probe đỏ với lý do sai hẳn bản chất: không phải «code có
      // lỗi» mà là «sandbox dựng sai», và người đọc verdict không có cách nào biết.
      //
      // Phải gọi bằng đường dẫn TƯƠNG ĐỐI thì ca mới load-bearing — với đường dẫn tuyệt đối, phép đưa về
      // tuyệt đối là no-op và ca sẽ xanh ở cả hai phía. Trên Windows không có đường tương đối giữa hai ổ
      // đĩa, nên cách duy nhất là đổi thư mục làm việc (design D4 — ca duy nhất đụng trạng thái toàn cục).
      const { dir, sha } = repoMoi();
      const tenRepo = dir.split(/[\\/]/).pop()!;
      const cwd0 = process.cwd();
      let sb: Sandbox | null = null;
      try {
        process.chdir(goc);
        sb = new Sandbox(tenRepo, sha);
        const link = readlinkSync(join(sb.dir, 'node_modules'));
        expect(isAbsolute(link.replace(/^\\\\\?\\/, '')), `đích phải tuyệt đối, nhận được: ${link}`).toBe(true);
        expect(link, 'phải trỏ tới node_modules của repo đích').toContain(tenRepo);
        expect(link, 'KHÔNG được trỏ ngược vào chính thư mục sandbox').not.toContain('checker-sb-');
      } finally {
        try {
          sb?.huy();
        } catch {
          /* dọn được tới đâu hay tới đó */
        }
        process.chdir(cwd0);
      }
    },
    TRAN_MS,
  );
});
