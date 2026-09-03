import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { promptPhanTich } from '../packages/harness/src/skill-code.js';
import { readTarget } from '../packages/harness/src/target.js';
import { makeFence } from '../packages/harness/src/fence.js';
import type { TargetInfo } from '../packages/harness/src/target.js';

/**
 * Lưới cho capability `diff-visibility` — ba điều chưa được ca nào khoá.
 *
 * 8 điều còn lại đã có ca ở `dung-diff.test.ts` (9 ca: loại file sinh tự động · mẫu riêng của repo ·
 * regex sai cú pháp · cắt theo trần · giữ file duy nhất · giữ thứ tự git · trả `{file, kyTu, lyDo}`);
 * file này không lặp lại chúng.
 *
 * Ba điều ở đây là MỘT nguyên tắc trên BA bề mặt — «cắt được, nhưng không cắt âm thầm»:
 *   log    -> người vận hành      prompt -> model      thông điệp lỗi -> người đọc lỗi
 * Ba người khác nhau đọc ba bề mặt; mất nó ở bề mặt nào thì đúng người đọc bề mặt ấy bị lừa.
 */

// Ca dựng repo git spawn `git` nhiều lần; trên Windows lúc lưới chạy song song vượt trần mặc định 5 s.
const GIT_TIMEOUT = 30_000;

const nguonRong = { declared: false, probes: [], files: [] };
const target = (p: Partial<TargetInfo> = {}): TargetInfo => ({
  repo: '.',
  branch: 'pr',
  base: 'main',
  branchSha: 'a'.repeat(40),
  baseSha: 'b'.repeat(40),
  diff: 'diff --git a/src/a.ts b/src/a.ts\n+export const a = 2;\n',
  ngoaiTamNhin: [],
  specs: [],
  units: [],
  luatMoi: [],
  apiDoc: '',
  testMau: '',
  sources: { specs: nguonRong, api_doc: nguonRong, test_sample: nguonRong, rejected: [] },
  ...p,
});

describe('R7.10 — prompt phải mang khối «file bạn không được xem», kèm CHỈ DẪN', () => {
  const coFileBiLoai = () =>
    target({
      ngoaiTamNhin: [
        { file: 'package-lock.json', kyTu: 45000, lyDo: 'lockfile sinh tự động' },
        { file: 'src/thanh-toan.ts', kyTu: 90000, lyDo: 'vượt trần kích thước diff' },
      ],
    });

  it('khối liệt kê mang TÊN FILE, SỐ KÝ TỰ và LÝ DO của từng file', () => {
    // Model phải biết tầm nhìn của nó khuyết ở đâu. Giấu chuyện này đi là mời nó kết luận chắc nịch về
    // phần nó chưa từng đọc — đúng kiểu xanh giả mà cả công cụ này sinh ra để chống.
    const p = promptPhanTich(coFileBiLoai(), null, makeFence());
    expect(p).toContain('KHÔNG ĐƯỢC XEM');
    expect(p).toContain('package-lock.json');
    expect(p).toContain('45000');
    expect(p).toContain('lockfile sinh tự động');
    expect(p).toContain('src/thanh-toan.ts');
    expect(p).toContain('vượt trần kích thước diff');
  });

  it('khối mang CHỈ DẪN không đề xuất probe và không kết luận về chúng', () => {
    // Hai vế tách bạch: bỏ danh sách thì model không biết mình khuyết; bỏ chỉ dẫn thì nó biết mà VẪN suy
    // đoán — suy đoán là việc model làm rất tự nhiên khi thiếu dữ liệu.
    const p = promptPhanTich(coFileBiLoai(), null, makeFence());
    expect(p, 'phải cấm nhắm probe vào file không thấy').toMatch(/Đừng đề xuất probe/);
    expect(p, 'phải cấm kết luận về chúng').toMatch(/đừng kết luận gì|không có dữ liệu/);
  });

  it('KHÔNG có file nào bị loại → khối ấy biến mất hẳn', () => {
    // Ca load-bearing của nhóm này. Một khối rỗng đứng đó dạy model rằng luôn có phần khuất, tức mời nó
    // dè dặt ngay cả khi đã nhìn đủ — và một lượt chấm dè dặt vô cớ cũng sai như một lượt chấm chắc nịch
    // vô căn cứ.
    const p = promptPhanTich(target(), null, makeFence());
    expect(p).not.toContain('KHÔNG ĐƯỢC XEM');
    expect(p).not.toMatch(/Đừng đề xuất probe/);
  });
});

describe('R7.11 — diff chỉ còn file sinh tự động thì lỗi phải nói ĐÚNG nguyên nhân đó', () => {
  const goc = mkdtempSync(join(tmpdir(), 'cm-diffview-'));
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

  it(
    'PR chỉ đổi file sinh tự động → thông điệp nói rõ điều đó, KÈM TÊN FILE',
    () => {
      // «Chỉ gồm file sinh tự động» nghĩa là PR CÓ thay đổi thật, chỉ là chúng đều bị luật lọc bỏ. Người
      // nhận cần biết file nào — để hoặc chấp nhận rằng PR này không có gì để chấm, hoặc sửa mẫu lọc vì
      // nó đang bắt nhầm file mã nguồn.
      const d = repoMoi();
      ghi(d, { 'src/a.ts': 'export const a = 1;\n', 'package-lock.json': '{"v":1}\n' }, 'goc');
      gitRun(d, ['checkout', '-q', '-b', 'pr']);
      ghi(d, { 'package-lock.json': '{"v":2}\n' }, 'chi doi lockfile');

      expect(() => readTarget(d, 'pr', 'main')).toThrow(/chỉ gồm file sinh tự động/);
      expect(() => readTarget(d, 'pr', 'main')).toThrow(/package-lock\.json/);
    },
    GIT_TIMEOUT,
  );

  it(
    'PR không đổi gì → thông điệp KHÁC hẳn: diff rỗng',
    () => {
      // Ca đối chứng, và nó mới là chỗ khoá được luật: một hiện thực ném CÙNG MỘT CÂU cho cả hai trạng
      // thái vẫn qua được ca trên. Hai trạng thái này khác nhau về việc người nhận phải làm gì — «diff
      // rỗng» thì đi kiểm lại nhánh và base; «toàn file sinh tự động» thì đi xem mẫu lọc.
      const d = repoMoi();
      ghi(d, { 'src/a.ts': 'export const a = 1;\n' }, 'goc');
      gitRun(d, ['checkout', '-q', '-b', 'pr']);

      expect(() => readTarget(d, 'pr', 'main')).toThrow(/Diff rỗng/);
      expect(() => readTarget(d, 'pr', 'main')).not.toThrow(/chỉ gồm file sinh tự động/);
    },
    GIT_TIMEOUT,
  );
});

describe('R7.8 — log phải nêu file không vào diff, và PHÂN BIỆT hai lý do', () => {
  // Ca ĐỌC SOURCE. Cái mất, nói thẳng (design D1): không chứng minh log thực sự phát ra lúc chạy — chạm
  // được nhánh ấy cần cả model, sandbox và một lượt chấm thật. Ca này khoá cấu trúc: nhánh lọc theo lý do
  // phải có mặt, và cảnh báo riêng phải đi kèm. Bỏ nhánh ấy thì ca đỏ.
  const src = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
  const i = src.indexOf('if (t.ngoaiTamNhin.length) {');
  const khoi = src.slice(i, i + 1200);

  it('log nêu SỐ LƯỢNG, tên từng file và lý do', () => {
    expect(i, 'phải có nhánh log file ngoài tầm nhìn').toBeGreaterThan(0);
    expect(khoi).toContain('t.ngoaiTamNhin.length');
    expect(khoi, 'nêu tên file').toContain('f.file');
    expect(khoi, 'nêu lý do').toContain('f.lyDo');
  });

  it('có cảnh báo RIÊNG cho file bị loại vì TRẦN, nói verdict không kết luận gì về chúng', () => {
    // Vế quan trọng hơn của R7.8. File sinh tự động bị loại là đúng — đó là rác. File mã nguồn bị loại vì
    // trần là MẤT PHỦ THẬT: nó có hành vi, nó nằm trong PR, và không ai nhìn nó. Gộp cả hai vào một dòng
    // «đã bỏ N file» thì người vận hành đọc xong yên tâm, trong khi đúng nửa nguy hiểm của N nằm im đó.
    expect(khoi, 'phải lọc riêng nhóm vượt trần').toContain("lyDo === 'vượt trần kích thước diff'");
    expect(khoi, 'và phát một thông điệp riêng cho nhóm ấy').toMatch(/KHÔNG nói gì về chúng|không kết luận/);
  });
});
