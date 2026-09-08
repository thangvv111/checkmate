import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * THỨ TỰ các bước nạp kho Maven, và cái gì xảy ra khi từng bước hỏng.
 *
 * ⛔ Vì sao file này tách riêng và vì sao nó dựng `CHECKMATE_GOC` TRƯỚC mọi import: gốc dữ liệu được tính
 * một lần lúc nạp module. Đặt biến sau đó là đặt vào hư không, và bộ lưới sẽ ghi kho thật vào cây mã.
 *
 * ⛔ Vì sao dùng bộ chạy GIẢ chứ không chạy podman: máy dev không có podman, và một ca chỉ xanh trên máy có
 * podman là một ca **không gác gì** ở nơi nó hay được chạy nhất. Thứ file này khoá là **trình tự** — thứ
 * quyết định kho hỏng có bị coi là kho tốt hay không — và trình tự thì kiểm được không cần container.
 * Phần chỉ chạy thật mới trả lời được nằm ở mục «chạy thật một lượt» của tài liệu ca test, không ở đây.
 */

const GOC_TAM = mkdtempSync(join(tmpdir(), 'cm-goc-'));
process.env.CHECKMATE_GOC = GOC_TAM;

const { installDependencies } = await import('../packages/harness/src/dependency-install.js');
const { repoStoreDir, storeIsPopulated } = await import('../packages/harness/src/probe-preflight.js');

const don: string[] = [GOC_TAM];
afterAll(() => {
  for (const d of don) rmSync(d, { recursive: true, force: true });
});

function repoMaven(): string {
  const d = mkdtempSync(join(tmpdir(), 'cm-mvnrepo-'));
  don.push(d);
  writeFileSync(join(d, 'pom.xml'), '<project/>', 'utf8');
  return d;
}

/**
 * Bộ chạy giả: ghi lại lệnh, cho phép ép một bước hỏng, và **giả lập việc container ghi vào kho** ở lệnh
 * `podman run` — vì bước kiểm «kho có mục nào không» đọc đĩa thật.
 */
function bochayGia(opts: { hong?: (argv: string[]) => boolean; nap?: boolean } = {}) {
  const nhatKy: string[][] = [];
  const chay = ((lenh: string, argv: string[]) => {
    nhatKy.push([lenh, ...argv]);
    if (lenh === 'podman' && argv[0] === 'run' && (opts.nap ?? true)) {
      // Container ghi jar vào kho. ⛔ Cắt theo mỏ neo `:/m2:`, KHÔNG `split(':')[0]` — đường Windows bắt
      // đầu bằng `C:` nên cách kia trả về `C`, và bộ lưới sẽ xanh oan vì «kho rỗng» ở mọi ca.
      const mount = argv.find((x) => x.includes(':/m2:'));
      const kho = mount?.slice(0, mount.indexOf(':/m2:'));
      if (kho && existsSync(kho)) mkdirSync(join(kho, 'org'), { recursive: true });
    }
    const hong = opts.hong?.([lenh, ...argv]) ?? false;
    return { status: hong ? 1 : 0, stderr: hong ? 'ép hỏng' : '', stdout: '', pid: 1, output: [], signal: null };
  }) as never;
  return { chay, nhatKy };
}

/** Chỉ số của bước đầu tiên khớp mẫu trong nhật ký — `-1` nếu không có. */
function buoc(nhatKy: string[][], mau: RegExp): number {
  return nhatKy.findIndex((c) => mau.test(c.join(' ')));
}

beforeEach(() => {
  rmSync(join(GOC_TAM, 'dep-stores'), { recursive: true, force: true });
});

describe('T2.5c — THỨ TỰ: trả quyền → mở quyền đọc → mới đổi tên đè', () => {
  it('ba bước đúng thứ tự, và đổi tên đè là bước CUỐI', () => {
    const r = repoMaven();
    const g = bochayGia();
    const kq = installDependencies(r, undefined, g.chay);
    expect(kq.ok, kq.ly_do).toBe(true);

    const iNap = buoc(g.nhatKy, /^podman run /);
    const iChown = buoc(g.nhatKy, /unshare chown -R 0:0/);
    const iChmod = buoc(g.nhatKy, /^chmod -R a\+rX/);
    expect(iNap).toBeGreaterThanOrEqual(0);
    expect(iChown, 'thiếu bước trả quyền sở hữu').toBeGreaterThan(iNap);
    // ⛔ Đảo hai bước này là để lại một kho không đọc được ở đúng đường lượt chấm sau sẽ mount.
    expect(iChmod, 'mở quyền đọc phải SAU khi trả quyền sở hữu').toBeGreaterThan(iChown);

    // Đổi tên đè xảy ra SAU cả hai — kiểm bằng KẾT QUẢ trên đĩa: kho thật tồn tại, `.new` đã biến mất.
    expect(existsSync(repoStoreDir(r)), 'kho thật chưa được dựng').toBe(true);
    expect(existsSync(`${repoStoreDir(r)}.new`), 'kho tạm còn sót lại').toBe(false);
    expect(storeIsPopulated(r)).toBe(true);
  });

  it('nạp vào `<kho>.new`, KHÔNG ghi thẳng vào kho đang được mount', () => {
    const r = repoMaven();
    const g = bochayGia();
    installDependencies(r, undefined, g.chay);
    const dongNap = g.nhatKy.find((c) => c[0] === 'podman' && c[1] === 'run')!.join(' ');
    expect(dongNap).toContain(`${repoStoreDir(r)}.new:/m2:Z,U`);
    expect(dongNap, 'kho THẬT không được xuất hiện trong lệnh nạp').not.toContain(`${repoStoreDir(r)}:/m2`);
  });
});

describe('T2.3–T2.5b — hỏng ở bước nào cũng KHÔNG báo thành công, và kho THẬT không bị chạm', () => {
  /** Dựng sẵn một kho thật «đời trước» để xem lần nạp hỏng có phá nó không. */
  function khoDoiTruoc(r: string): string {
    const kho = repoStoreDir(r);
    mkdirSync(join(kho, 'cu'), { recursive: true });
    return kho;
  }

  it('T2.4 trình nạp rc khác 0 ⇒ hỏng, mang log thật, kho cũ NGUYÊN VẸN', () => {
    const r = repoMaven();
    const kho = khoDoiTruoc(r);
    const kq = installDependencies(r, undefined, bochayGia({ hong: (c) => c[1] === 'run' }).chay);
    expect(kq.ok).toBe(false);
    expect(kq.ly_do).toContain('ép hỏng');
    expect(readdirSync(kho)).toEqual(['cu']);
  });

  it('T2.3 trả quyền sở hữu thất bại ⇒ hỏng, kho cũ NGUYÊN VẸN', () => {
    const r = repoMaven();
    const kho = khoDoiTruoc(r);
    const kq = installDependencies(r, undefined, bochayGia({ hong: (c) => c.join(' ').includes('chown') }).chay);
    expect(kq.ok).toBe(false);
    expect(kq.ly_do).toContain('quyền sở hữu');
    expect(readdirSync(kho)).toEqual(['cu']);
  });

  it('⛔ M2 — mở quyền đọc thất bại ⇒ hỏng, KHÔNG đổi tên đè', () => {
    // Kho mode 0700 làm Maven báo «artifact absent» — nói về THIẾU GÓI trong khi bệnh là KHÔNG ĐỌC ĐƯỢC.
    // Bỏ bước này mà vẫn báo thành công là ship đúng con bệnh cửa kiểm môi trường tồn tại để diệt.
    const r = repoMaven();
    const kho = khoDoiTruoc(r);
    const kq = installDependencies(r, undefined, bochayGia({ hong: (c) => c[0] === 'chmod' }).chay);
    expect(kq.ok).toBe(false);
    expect(kq.ly_do).toContain('quyền đọc');
    expect(readdirSync(kho)).toEqual(['cu']);
  });

  it('trình nạp thoát 0 nhưng kho rỗng ⇒ hỏng — KHÔNG tin mã thoát', () => {
    const r = repoMaven();
    const kq = installDependencies(r, undefined, bochayGia({ nap: false }).chay);
    expect(kq.ok).toBe(false);
    expect(kq.ly_do).toContain('không có mục nào');
  });

  it('T2.5b kho tạm dở dang KHÔNG được để lại sau lần nạp hỏng', () => {
    const r = repoMaven();
    installDependencies(r, undefined, bochayGia({ hong: (c) => c[0] === 'chmod' }).chay);
    expect(existsSync(`${repoStoreDir(r)}.new`)).toBe(false);
  });

  it('⛔C3 — kết quả trả về chỉ mang SỐ ĐẾM của kho, không mang tên tệp nào', () => {
    const r = repoMaven();
    const kq = installDependencies(r, undefined, bochayGia().chay);
    expect(typeof kq.so_muc_kho).toBe('number');
    // Kho có thể chứa `settings.xml` mang credential repo nội bộ — số đếm ra được, nội dung thì không.
    expect(JSON.stringify(kq)).not.toContain('org');
  });
});

describe('cửa sớm và bước nạp nói chuyện được với nhau (⛔C6)', () => {
  it('trước khi nạp: cửa sớm báo THIẾU; sau khi nạp: cửa sớm im', () => {
    const r = repoMaven();
    expect(storeIsPopulated(r), 'chưa nạp mà đã báo có kho').toBe(false);
    expect(installDependencies(r, undefined, bochayGia().chay).ok).toBe(true);
    // Đọc đĩa ở THỜI ĐIỂM KIỂM, không đọc bộ nhớ đệm nào.
    expect(storeIsPopulated(r)).toBe(true);
  });

  it('hai repo khác nhau ⇒ hai kho khác nhau, nạp repo này không làm repo kia thành đủ', () => {
    const a = repoMaven();
    const b = repoMaven();
    expect(installDependencies(a, undefined, bochayGia().chay).ok).toBe(true);
    expect(storeIsPopulated(a)).toBe(true);
    expect(storeIsPopulated(b), 'phụ thuộc của repo A lọt vào bản dựng của repo B').toBe(false);
  });
});
