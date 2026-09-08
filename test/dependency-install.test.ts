import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  IMAGE_BY_NODE_MAJOR,
  INSTALL_COPY_FILES,
  INSTALL_CPU_CAP,
  INSTALL_MEMORY_CAP,
  INSTALL_PIDS_CAP,
  buildInstallContainerArgs,
  installCommand,
  installDependencies,
  nodeMajorWanted,
  resolveInstallImage,
} from '../packages/harness/src/dependency-install.js';
import { DEFAULT_IMAGE, buildContainerArgs } from '../packages/harness/src/sandbox.js';

/**
 * Lưới cho capability `dependency-provisioning` — bước cài phụ thuộc trong container.
 *
 * ⛔ Đây là container DUY NHẤT của sản phẩm có mạng. Trục nặng nhất của file này không phải «cài được
 * không», mà là **bốn điều kiện đi kèm ngoại lệ mạng** có còn nguyên không.
 */

const don: string[] = [];
function repoTam(files: Record<string, string>): string {
  const d = mkdtempSync(join(tmpdir(), 'cm-inst-'));
  don.push(d);
  for (const [ten, noi_dung] of Object.entries(files)) writeFileSync(join(d, ten), noi_dung, 'utf8');
  return d;
}

// ---------- TẦNG 3: lưới quét, cặp fixture ----------

/** Bảng ảnh phải ghim theo DIGEST — thẻ trôi làm hai lần cài cho hai cây phụ thuộc khác nhau. */
export function scanImagePins(bang: ReadonlyMap<number, string>): string[] {
  const loi: string[] = [];
  if (bang.size === 0) return ['bảng ảnh RỖNG — lưới đang mù'];
  for (const [major, anh] of bang) {
    if (!/@sha256:[a-f0-9]{64}$/.test(anh)) loi.push(`Node ${major}: «${anh}» không ghim digest — thẻ trôi được`);
    if (!Number.isInteger(major) || major <= 0) loi.push(`khoá ${String(major)} không phải phiên bản chính hợp lệ`);
  }
  return loi;
}

/** Danh sách file chép sang phải ĐÓNG: tên file cụ thể, không mẫu, và tuyệt đối không có `.git`. */
export function scanCopyList(ds: readonly string[]): string[] {
  const loi: string[] = [];
  if (ds.length === 0) return ['danh sách chép RỖNG — lưới đang mù'];
  for (const f of ds) {
    if (f.includes('*') || f.includes('?')) loi.push(`«${f}» là mẫu, phải là tên file cụ thể`);
    if (f.includes('/') || f.includes('\\')) loi.push(`«${f}» là đường dẫn, chỉ được lấy file ở GỐC repo`);
    if (f === '.git' || f.startsWith('.git/')) loi.push(`«${f}» đưa cây .git vào container cài — cấm tuyệt đối`);
  }
  return loi;
}

/** Đúng MỘT chỗ trong sản phẩm bật mạng, và chỗ ấy phải là đường cài. */
export function scanNetworkExceptions(nguon: string): string[] {
  const loi: string[] = [];
  const dong = nguon.split(/\r?\n/);
  const tat = dong.filter((l) => l.includes("'--network=none'"));
  if (tat.length === 0) loi.push('không thấy chỗ nào TẮT mạng — mỏ neo đã đổi, lưới đang mù');
  return loi;
}

const NGUON_SANDBOX = resolve('packages/harness/src/sandbox.ts');
const NGUON_CAI = resolve('packages/harness/src/dependency-install.ts');

describe('tầng 3 — cặp fixture cho hai bảng đóng', () => {
  it('ĐỎ: bảng ảnh có hàng dùng THẺ thay vì digest', () => {
    const xau = new Map([[24, 'docker.io/library/node:24-bookworm-slim']]);
    expect(scanImagePins(xau)[0]).toContain('không ghim digest');
  });

  it('ĐỎ khi bảng ảnh rỗng — chống xanh oan', () => {
    expect(scanImagePins(new Map())[0]).toContain('lưới đang mù');
  });

  it('XANH: bảng ảnh HIỆN TẠI toàn digest, và hàng 22 chính là ảnh mặc định', () => {
    expect(scanImagePins(IMAGE_BY_NODE_MAJOR)).toEqual([]);
    expect(IMAGE_BY_NODE_MAJOR.get(22), 'thêm bản đồ ảnh MUST NOT đổi ảnh của repo đang chạy tốt').toBe(DEFAULT_IMAGE);
    expect(IMAGE_BY_NODE_MAJOR.has(24)).toBe(true);
  });

  it('ĐỎ: danh sách chép có mẫu, có đường dẫn, hoặc có .git', () => {
    const ra = scanCopyList(['package.json', 'patches/*', 'src/x.json', '.git']);
    expect(ra.some((x) => x.includes('là mẫu'))).toBe(true);
    expect(ra.some((x) => x.includes('là đường dẫn'))).toBe(true);
    expect(ra.some((x) => x.includes('cấm tuyệt đối'))).toBe(true);
  });

  it('ĐỎ khi danh sách chép rỗng — chống xanh oan', () => {
    expect(scanCopyList([])[0]).toContain('lưới đang mù');
  });

  it('XANH: danh sách chép HIỆN TẠI sạch, đúng bốn file khai phụ thuộc', () => {
    expect(scanCopyList(INSTALL_COPY_FILES)).toEqual([]);
    expect([...INSTALL_COPY_FILES]).toEqual(['package.json', 'package-lock.json', '.npmrc', '.nvmrc']);
  });

  it('mã nguồn HIỆN TẠI: đường chạy probe vẫn TẮT mạng', () => {
    expect(scanNetworkExceptions(readFileSync(NGUON_SANDBOX, 'utf8'))).toEqual([]);
    expect(readFileSync(NGUON_CAI, 'utf8'), 'đường CÀI không được tự tắt mạng — nó là ngoại lệ có tên').not.toContain("'--network=none'");
  });
});

// ---------- Requirement: ngoại lệ mạng CHỈ cho bước cài, và bốn điều kiện đi kèm ----------

describe('⛔ đối số container CÀI — bốn điều kiện của ngoại lệ mạng', () => {
  const argv = buildInstallContainerArgs({ thuMucCai: '/tmp/cm-install-x', anh: DEFAULT_IMAGE, lenh: installCommand(true) });

  it('1 — `--ignore-scripts` nằm trong lệnh: KHÔNG code nào của repo đích chạy ở đây', () => {
    expect(argv).toContain('--ignore-scripts');
  });

  it('⛔ `--ignore-scripts` KHÔNG có công tắc — repo đích MUST NOT tự bật (PO chốt 08/09)', () => {
    // Chữ ký chỉ nhận `coLockFile`; không tham số nào tắt được cờ này. Repo bị chấm tự mở đường chạy code
    // tuỳ ý trên máy chủ bên chấm là maker chỉnh checker ở chỗ nguy hiểm nhất.
    expect(installCommand(true)).toContain('--ignore-scripts');
    expect(installCommand(false)).toContain('--ignore-scripts');
    expect(installCommand.length, 'thêm tham số thứ hai là mở đường cho một công tắc').toBe(1);
  });

  it('2 — chỉ mount THƯ MỤC TẠM, không mount bản clone', () => {
    const mounts = argv.filter((_, i) => argv[i - 1] === '-v');
    expect(mounts).toHaveLength(1);
    expect(mounts[0]).toContain('/tmp/cm-install-x');
  });

  it('⛔ 3 — KHÔNG mount tài sản nào của CheckMate, và KHÔNG chạm `.git`', () => {
    const tatCa = argv.join(' ');
    for (const cam of ['.secrets.json', 'config.json', 'web-runs', 'probes-lib', '.git', 'repos/']) {
      expect(tatCa, `đối số cài chạm ${cam}`).not.toContain(cam);
    }
  });

  it('4 — đủ ba trần tài nguyên và cờ không-leo-quyền', () => {
    expect(argv).toContain(`--memory=${INSTALL_MEMORY_CAP}`);
    expect(argv).toContain(`--cpus=${INSTALL_CPU_CAP}`);
    expect(argv).toContain(`--pids-limit=${INSTALL_PIDS_CAP}`);
    expect(argv).toContain('no-new-privileges');
    expect(argv[argv.indexOf('--user') + 1]).not.toMatch(/^0:|^root/);
  });

  it('trần bước CÀI lỏng hơn lượt chạy probe — khai ra vì đó là một sự nới thật', () => {
    const probe = buildContainerArgs({ thuMucChay: '/tmp/x', anh: DEFAULT_IMAGE, lenh: ['x'] });
    expect(probe).toContain('--memory=512m');
    expect(INSTALL_MEMORY_CAP).toBe('2g');
    expect(Number(INSTALL_CPU_CAP)).toBeGreaterThan(1);
  });

  it('cache trình quản lý gói vào tmpfs — KHÔNG ghi ra đĩa host (nó mang thông tin đăng nhập registry)', () => {
    expect(argv).toContain('--tmpfs');
    expect(argv.join(' ')).toContain('npm_config_cache=/tmp/npm');
  });

  it('⛔ HỒI QUY: đường chạy probe KHÔNG bị nới theo', () => {
    const probe = buildContainerArgs({ thuMucChay: '/tmp/x', thuMucPhuThuoc: '/tmp/nm', anh: DEFAULT_IMAGE, lenh: ['x'] });
    expect(probe, 'container chạy probe phải giữ mạng TẮT').toContain('--network=none');
    expect(probe).toContain('--read-only');
  });
});

// ---------- Requirement: ảnh chọn theo phiên bản, từ bản đồ ghim digest ----------

describe('resolveInstallImage — tra bảng đóng, KHÔNG ghép chuỗi repo đích vào tên ảnh', () => {
  const doc = (noi_dung: Record<string, string>) => (p: string) => noi_dung[p.split(/[\\/]/).pop() ?? ''] ?? '';

  it('`.nvmrc` thắng `engines.node`', () => {
    expect(nodeMajorWanted('/r', doc({ '.nvmrc': '24\n', 'package.json': '{"engines":{"node":"^22"}}' }))).toBe(24);
  });

  it('không có `.nvmrc` thì đọc `engines.node`', () => {
    expect(nodeMajorWanted('/r', doc({ 'package.json': '{"engines":{"node":"^24"}}' }))).toBe(24);
  });

  it('không khai gì ⇒ null; JSON hỏng ⇒ null, KHÔNG ném', () => {
    expect(nodeMajorWanted('/r', doc({ 'package.json': '{}' }))).toBeNull();
    expect(() => nodeMajorWanted('/r', doc({ 'package.json': '{ hong' }))).not.toThrow();
    expect(nodeMajorWanted('/r', doc({}))).toBeNull();
  });

  it('⛔C4 — chuỗi kỳ lạ từ repo đích KHÔNG lọt vào tên ảnh', () => {
    for (const xau of ['24; rm -rf /', 'lts/*', 'node@sha256:beef', 'v24-custom', '']) {
      const ra = resolveInstallImage('/r', undefined, doc({ '.nvmrc': xau }));
      const chuoi = `${ra.anh ?? ''} ${ra.ly_do ?? ''}`;
      expect(ra.anh ?? '', `«${xau}» lọt vào tên ảnh`).not.toContain('rm -rf');
      expect(ra.anh ?? '').not.toContain('lts');
      expect(ra.anh ?? '').not.toContain('custom');
      if (ra.anh) expect(ra.anh, `«${xau}» ra một ảnh không ghim digest`).toMatch(/@sha256:[a-f0-9]{64}$/);
      expect(typeof chuoi).toBe('string');
    }
  });

  it('⛔ phiên bản KHÔNG có hàng ⇒ TỪ CHỐI, MUST NOT rơi về ảnh mặc định', () => {
    const ra = resolveInstallImage('/r', undefined, doc({ '.nvmrc': '20' }));
    expect(ra.anh, 'rơi về mặc định là tái tạo đúng con bệnh cửa kiểm vừa làm cho nhìn thấy được').toBeUndefined();
    expect(ra.ly_do).toContain('Node 20');
  });

  it('repo không khai phiên bản ⇒ ảnh mặc định', () => {
    expect(resolveInstallImage('/r', undefined, doc({ 'package.json': '{}' })).anh).toBe(DEFAULT_IMAGE);
  });

  it('`runner.image` repo khai thẳng thì thắng bản đồ', () => {
    const anh = 'docker.io/library/node@sha256:' + 'a'.repeat(64);
    expect(resolveInstallImage('/r', anh, doc({ '.nvmrc': '24' })).anh).toBe(anh);
  });

  it('`runner.image` rác vẫn qua `safeImageName` ⇒ rơi về mặc định, không ném', () => {
    expect(resolveInstallImage('/r', 'ảnh; rm -rf /', doc({}))?.anh).toBe(DEFAULT_IMAGE);
  });
});

// ---------- Requirement: hỏng ở bất kỳ bước nào ⇒ clone nguyên trạng ----------

describe('installDependencies — thứ tự bước và cái gì xảy ra khi hỏng', () => {
  const chayGia = (ket: { status?: number; stderr?: string }) => (() => ({ status: ket.status ?? 0, stderr: ket.stderr ?? '', stdout: '', pid: 1, output: [], signal: null })) as never;

  it('repo hệ CHƯA cấp được phụ thuộc ⇒ từ chối, nói rõ hệ', () => {
    // ⛔ `pom.xml` không còn dùng ở đây: Maven nay ĐI VÀO đường nạp (nhánh riêng, lưới ở
    // `test/maven-dependency-provisioning.test.ts`). Dùng Gradle để ca này vẫn khoá đúng thứ nó sinh ra
    // để khoá — hệ engine chưa có đường cấp phụ thuộc thì phải từ chối, không thử rồi hỏng nửa chừng.
    const d = repoTam({ 'build.gradle': '' });
    const r = installDependencies(d, undefined, chayGia({}));
    expect(r.ok).toBe(false);
    expect(r.ly_do).toContain('gradle');
  });

  it('không nhận ra hệ nào ⇒ từ chối, không ném', () => {
    const d = repoTam({ 'README.md': 'x' });
    expect(() => installDependencies(d, undefined, chayGia({}))).not.toThrow();
    expect(installDependencies(d, undefined, chayGia({})).ok).toBe(false);
  });

  it('phiên bản không có hàng trong bản đồ ⇒ từ chối TRƯỚC khi dựng container nào', () => {
    const d = repoTam({ 'package.json': '{"dependencies":{"x":"1"}}', '.nvmrc': '20' });
    let goi = 0;
    const dem = ((..._a: unknown[]) => {
      goi++;
      return { status: 0, stderr: '', stdout: '', pid: 1, output: [], signal: null };
    }) as never;
    const r = installDependencies(d, undefined, dem);
    expect(r.ok).toBe(false);
    expect(goi, 'không được chạy container nào khi đã biết không có ảnh').toBe(0);
  });

  it('⛔ trình cài thất bại ⇒ clone NGUYÊN TRẠNG, không có node_modules', () => {
    const d = repoTam({ 'package.json': '{"dependencies":{"x":"1"}}' });
    const r = installDependencies(d, undefined, chayGia({ status: 1, stderr: 'npm error' }));
    expect(r.ok).toBe(false);
    expect(r.ly_do).toContain('Trình cài thất bại');
    expect(() => readFileSync(join(d, 'node_modules'))).toThrow();
  });

  it('⛔ trình cài thoát 0 nhưng KHÔNG sinh thư mục phụ thuộc ⇒ thất bại', () => {
    // Đây là trạng thái đo thật trên prod 07/09: `npm ci` thoát 0 sau khi cài dở dang.
    const d = repoTam({ 'package.json': '{"dependencies":{"x":"1"}}' });
    const r = installDependencies(d, undefined, chayGia({ status: 0 }));
    expect(r.ok).toBe(false);
    expect(r.ly_do).toContain('không sinh thư mục phụ thuộc');
  });

  it('⛔ trả quyền sở hữu HỎNG ⇒ dừng, KHÔNG chuyển vào clone', () => {
    // Ca này thêm sau khi mutation M7 (gỡ bước trả quyền) cho **0 ca đỏ** — gác ấy khi đó không có lưới
    // nào. Đảo hai bước, hoặc bỏ hẳn bước trả quyền, để lại một thư mục phụ thuộc mà chính tài khoản
    // dịch vụ KHÔNG đọc được nằm trong clone: hỏng im lặng, chỉ lộ ra ở lượt chấm sau.
    const d = repoTam({ 'package.json': '{"dependencies":{"x":"1"}}' });
    const goi: string[] = [];
    const chayPhanBiet = ((_c: string, args: readonly string[]) => {
      const la = args.includes('unshare') ? 'chown' : 'cai';
      goi.push(la);
      return { status: la === 'chown' ? 1 : 0, stderr: la === 'chown' ? 'operation not permitted' : '', stdout: '', pid: 1, output: [], signal: null };
    }) as never;
    const r = installDependencies(d, undefined, chayPhanBiet);
    expect(r.ok).toBe(false);
    expect(r.ly_do).toContain('quyền sở hữu');
    expect(goi[0], 'bước cài phải chạy trước').toBe('cai');
    expect(goi).toContain('chown');
    expect(() => readFileSync(join(d, 'node_modules')), 'clone phải nguyên trạng').toThrow();
  });

  it('không có package.json ở gốc ⇒ nói rõ, không đoán', () => {
    const d = mkdtempSync(join(tmpdir(), 'cm-inst2-'));
    don.push(d);
    mkdirSync(join(d, 'node_modules'), { recursive: true });
    writeFileSync(join(d, '.nvmrc'), '22', 'utf8');
    const r = installDependencies(d, undefined, chayGia({}));
    expect(r.ok).toBe(false);
  });

  it('lệnh cài dùng `npm ci` khi có lock, `npm install` khi không', () => {
    expect(installCommand(true)).toEqual(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund']);
    expect(installCommand(false)).toEqual(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund']);
  });
});

describe('dọn thư mục tạm', () => {
  it('xoá hết repo giả', () => {
    for (const d of don) rmSync(d, { recursive: true, force: true });
    expect(don.length).toBeGreaterThan(5);
  });
});
