import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildContainerArgs,
  detectIsolation,
  safeImageName,
  DEFAULT_IMAGE,
  type ContainerSpec,
} from '../packages/harness/src/sandbox.js';

/**
 * Lưới cho capability `sandbox-isolation`.
 *
 * ⛔ **ĐỌC TRƯỚC KHI TIN FILE NÀY.** Không ca nào ở đây **dựng container thật** — vitest chạy trên máy dev
 * Windows, nơi không có runtime. File này khoá **QUYẾT ĐỊNH**: dựng đối số gì, mount gì, khai mức nào.
 *
 *   - Lưới XANH **không** chứng minh lượt chạy đã cô lập.
 *   - **Phép chứng minh** là sáu phép đo chạy lại TỪ TRONG container, ghi ở `tasks.md` §0.1 và §8.1 —
 *     đúng sáu phép đã dùng để phát hiện lỗ, chạy lại ở phía bên kia.
 *   - Vai của file này là **chốt chống hồi quy**.
 *
 * Nhầm hai vai ấy nguy hiểm ở đây hơn mọi chỗ khác trong repo: một lưới xanh có thể đứng cạnh một
 * container không hề cô lập, và cái tên «sandbox» sẽ làm người đọc sau thôi kiểm.
 */

const SANDBOX_SRC = readFileSync('packages/harness/src/sandbox.ts', 'utf8');
const SKILL_SRC = readFileSync('packages/harness/src/skill-code.ts', 'utf8');
const NL = String.fromCharCode(10);

const spec = (p: Partial<ContainerSpec> = {}): ContainerSpec => ({
  thuMucChay: '/tmp/checker-sb-abc',
  thuMucPhuThuoc: '/home/ubuntu/checkmate-app/checkmate/repos/x/node_modules',
  anh: DEFAULT_IMAGE,
  lenh: ['npx', 'vitest', 'run'],
  ...p,
});

/** Các cặp `-v` trong argv, tách thành {nguon, dich, cach}. */
function binds(argv: readonly string[]): { nguon: string; dich: string; cach: string }[] {
  const ra: { nguon: string; dich: string; cach: string }[] = [];
  for (let i = 0; i < argv.length - 1; i++) {
    if (argv[i] !== '-v') continue;
    const p = (argv[i + 1] ?? '').split(':');
    ra.push({ nguon: p[0] ?? '', dich: p[1] ?? '', cach: p[2] ?? '' });
  }
  return ra;
}

/**
 * ⛔ Ca nặng nhất của change: **không bind nào ghi được ra ngoài thư mục lượt chạy**.
 *
 * Container KHÔNG chặn gì nếu vẫn mount ghi được. Thư viện probe và sổ cái verdict — hai thứ nặng nhất —
 * chỉ được bảo vệ bởi việc chúng **không có mặt** trong cây, chứ không bởi cái container. Nên bề mặt cần
 * soi là danh sách `-v`, không phải cờ `--network`.
 */
export function scanWritableBinds(argv: readonly string[], thuMucChay: string): string[] {
  const loi: string[] = [];
  for (const b of binds(argv)) {
    if (b.nguon === thuMucChay) continue; // thư mục lượt chạy — được ghi, đó là chỗ duy nhất
    if (!/(^|,)ro(,|$)/.test(b.cach)) loi.push(`bind GHI ĐƯỢC ra ngoài thư mục lượt chạy: ${b.nguon}`);
  }
  return loi;
}

/** Nguồn mã phải trải từ `git archive`, KHÔNG từ worktree — worktree để lại đường ghi vào .git của clone. */
export function scanNoWorktree(src: string): string[] {
  const loi: string[] = [];
  const i = src.indexOf('constructor(');
  if (i < 0) return ['không tìm thấy constructor của Sandbox — phép quét này đang mù'];
  const than = src.slice(i, src.indexOf('ghiProbe(', i));
  if (!/archive/.test(than)) loi.push('nguồn mã không dựng bằng git archive');
  for (const d of than.split(NL)) {
    if (/^\s*(?!\/\/|\*)/.test(d) && /'worktree'/.test(d)) loi.push(`vẫn dùng worktree: ${d.trim()}`);
  }
  return loi;
}

describe('đối số dựng môi trường — ba cơ chế cô lập (T1)', () => {
  const argv = buildContainerArgs(spec());

  it('T1.1 — mạng TẮT', () => {
    expect(argv).toContain('--network=none');
  });

  it('T1.2 — đủ BA trần: bộ nhớ · CPU · số tiến trình', () => {
    // Namespace không tự giới hạn gì. Thiếu một trần là một đường làm hỏng sản phẩm KHÁC trên cùng máy.
    for (const co of ['--memory=', '--cpus=', '--pids-limit=']) {
      expect(argv.some((x) => x.startsWith(co)), `thiếu trần ${co}`).toBe(true);
    }
  });

  it('T1.3 — chạy user KHÔNG đặc quyền, và không leo quyền được', () => {
    expect(argv).toContain('--user');
    expect(argv[argv.indexOf('--user') + 1]).not.toMatch(/^0:|^root/);
    expect(argv).toContain('no-new-privileges');
  });

  it('T1.4 — danh sách bind KHÔNG chứa tài sản nào của CheckMate', () => {
    const nguon = binds(argv).map((b) => b.nguon).join(' ');
    for (const cam of ['.secrets.json', 'config.json', 'web-runs', 'probes-lib']) {
      expect(nguon, `bind vào tài sản CheckMate: ${cam}`).not.toContain(cam);
    }
  });

  it('T1.5 — phụ thuộc bind CHỈ ĐỌC', () => {
    const nm = binds(argv).find((b) => b.dich.endsWith('node_modules'));
    expect(nm, 'không thấy bind phụ thuộc').toBeTruthy();
    expect(nm!.cach).toContain('ro');
  });

  it('T1.6 — KHÔNG bind nào ghi được ra ngoài thư mục lượt chạy', () => {
    expect(scanWritableBinds(argv, spec().thuMucChay)).toEqual([]);
  });

  it('T1.7 [fixture đối kháng] — thêm một bind ghi được thì lưới ĐỎ và nêu đúng đường dẫn', () => {
    const xau = [...argv, '-v', '/home/ubuntu/checkmate-app/checkmate/probes-lib:/lib:Z'];
    const ra = scanWritableBinds(xau, spec().thuMucChay);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('probes-lib');
  });

  it('T1.8 [fixture đối chứng] — bind chỉ-đọc ra ngoài thì XANH', () => {
    const tot = [...argv, '-v', '/opt/cache:/cache:ro,Z'];
    expect(scanWritableBinds(tot, spec().thuMucChay)).toEqual([]);
  });

  it('T1.10 — thư mục lượt chạy mang cờ đổi-chủ-sở-hữu sang SUBUID, không ánh xạ về tài khoản dịch vụ', () => {
    // Đo được trên prod: không có cờ này thì vitest KHÔNG ghi nổi kết quả, cả lượt chấm chết. Hướng khác
    // (`--userns=keep-id`) chạy được nhưng ánh xạ uid trong container về CHÍNH tài khoản dịch vụ — thoát
    // container là thoát ra thành tài khoản ấy. Hai đường đo được cùng ~0.35s, nên chọn đường hỏng nhẹ hơn.
    const chay = binds(argv).find((b) => b.dich === '/work');
    expect(chay?.cach).toContain('U');
    expect(argv).not.toContain('--userns=keep-id');
  });

  it('T5.3 — dọn thư mục lượt chạy đi qua podman, vì tài khoản dịch vụ không xoá nổi nó', () => {
    // Đo được: sau khi đổi chủ sở hữu, `rm -rf` bằng tài khoản dịch vụ THẤT BẠI và thư mục ở lại.
    const i = SANDBOX_SRC.indexOf('huy(): void {');
    const than = SANDBOX_SRC.slice(i, SANDBOX_SRC.indexOf(NL + '}', i));
    expect(than).toContain("'unshare', 'rm', '-rf'");
    expect(than.indexOf('unshare'), 'dọn qua podman phải chạy TRƯỚC rmSync').toBeLessThan(than.indexOf('rmSync'));
  });

  it('T1.9 — không có phụ thuộc thì không bind gì thêm', () => {
    const argv2 = buildContainerArgs(spec({ thuMucPhuThuoc: undefined }));
    expect(binds(argv2)).toHaveLength(1);
  });
});

describe('nguồn mã: git archive, không worktree (T2)', () => {
  it('T2.1 — mã nguồn hiện tại dựng bằng git archive', () => {
    expect(scanNoWorktree(SANDBOX_SRC)).toEqual([]);
  });

  it('T2.2 [fixture đối kháng] — quay lại worktree thì lưới ĐỎ', () => {
    const xau = ["constructor(repo, sha) {", "  git(repo, ['worktree', 'add', '--detach', dir, sha]);", '}', 'ghiProbe() {}'].join(NL);
    expect(scanNoWorktree(xau).length).toBeGreaterThan(0);
  });

  it('T2.3 — huỷ sandbox không còn gọi worktree remove, và xoá thư mục lượt chạy', () => {
    const i = SANDBOX_SRC.indexOf('huy(): void {');
    const than = SANDBOX_SRC.slice(i, SANDBOX_SRC.indexOf(NL + '}', i));
    expect(than).not.toContain("'worktree'");
    expect(than).toContain('rmSync');
  });
});

describe('ảnh chạy do repo đích khai (T3)', () => {
  it('T3.1 — khai hợp lệ thì dùng đúng ảnh ấy', () => {
    expect(safeImageName('docker.io/library/python:3.12-slim')).toBe('docker.io/library/python:3.12-slim');
    expect(safeImageName('ghcr.io/acme/tool@sha256:' + 'a'.repeat(64))).toContain('@sha256:');
  });

  it('T3.2 — ảnh đọc từ ĐĨA CLONE, không từ nhánh PR', () => {
    // `readRunnerCfg(repo)` nhận đường dẫn bản clone; Sandbox nhận `runner?.image` từ đó. PR không đổi
    // được môi trường mà chính code của nó sẽ chạy — cùng luật đã áp cho `test_cmd` và `sources.specs`.
    expect(SKILL_SRC).toContain('readRunnerCfg(repo)');
    expect(SKILL_SRC).toContain('new Sandbox(repo, sha, runner?.image)');
  });

  it('T3.3 — ảnh mặc định GHIM theo digest, không thẻ trôi', () => {
    expect(DEFAULT_IMAGE).toMatch(/@sha256:[a-f0-9]{64}$/);
    expect(DEFAULT_IMAGE).not.toMatch(/:latest$/);
  });

  it('T3.4 [đầu vào khuyết] — rác thì rơi về mặc định, KHÔNG ném', () => {
    for (const xau of [undefined, null, 42, {}, '', '   ', 'ảnh có dấu cách', 'a;rm -rf /', '../../etc/passwd', 'A'.repeat(400)]) {
      expect(() => safeImageName(xau), JSON.stringify(xau)).not.toThrow();
      expect(safeImageName(xau), JSON.stringify(xau)).toBe(DEFAULT_IMAGE);
    }
  });

  it('T3.5 — tên ảnh KHÔNG bao giờ ghép vào chuỗi shell', () => {
    // Nó đi vào MẢNG đối số. Ghép chuỗi là mở lại đúng cửa mà kiểm hình dạng vừa đóng.
    const argv = buildContainerArgs(spec({ anh: 'ghcr.io/acme/x:1.2.3' }));
    expect(argv).toContain('ghcr.io/acme/x:1.2.3');
    expect(argv.every((x) => !x.includes(' && ') && !x.includes(';'))).toBe(true);
  });
});

describe('mức cô lập là THỰC TẾ, không phải cấu hình (T4)', () => {
  it('T4.1 — runtime chạy được → khai `container` kèm runtime', () => {
    const gia = (() => ({ status: 0, stdout: 'podman version 3.4.4', stderr: '', error: undefined })) as never;
    const ra = detectIsolation(gia);
    expect(ra.muc).toBe('container');
    expect(ra.runtime).toContain('podman');
  });

  it('T4.2 — runtime vắng mặt → khai `none` KÈM LÝ DO', () => {
    const gia = (() => ({ status: null, stdout: '', stderr: '', error: new Error('ENOENT') })) as never;
    const ra = detectIsolation(gia);
    expect(ra.muc).toBe('none');
    expect(ra.ly_do_khong, 'khai none mà không nói vì sao thì người đọc không sửa được').toBeTruthy();
  });

  it('T4.3 — có runtime nhưng chạy LỖI → vẫn khai `none`, KHÔNG khai container', () => {
    // «Đã cấu hình để cô lập» ≠ «đã cô lập». Dán nhãn container lên một lượt không cô lập tệ hơn không
    // dán gì: nó là một phép đo bịa ra.
    const gia = (() => ({ status: 125, stdout: '', stderr: 'cgroup controller not available', error: undefined })) as never;
    expect(detectIsolation(gia).muc).toBe('none');
  });

  it('T4.4 — dò bằng cách CHẠY, không bằng cách kiểm tên file', () => {
    // `podman` có mặt trên PATH không chứng minh nó chạy được rootless trên nền này (thiếu uỷ quyền
    // cgroup, thiếu subuid, kernel cấm user namespace). Hỏi sai câu thì mức khai ra là mức MONG MUỐN.
    const i = SANDBOX_SRC.indexOf('export function detectIsolation');
    const than = SANDBOX_SRC.slice(i, SANDBOX_SRC.indexOf(NL + '}', i));
    expect(than).toContain("chay('podman'");
    expect(than).not.toContain('existsSync');
  });
});

describe('trục nhạy cảm', () => {
  it('T_bimat ⛔C3 — kho khoá không nằm trong cây nhìn thấy được (mức quyết định)', () => {
    // Vế thực tế do sáu phép đo ở tasks.md §8.1 chứng minh; ở đây chỉ khoá quyết định dựng.
    expect(scanWritableBinds(buildContainerArgs(spec()), spec().thuMucChay)).toEqual([]);
  });

  it('T_failclosed ⛔C2 — nền không cô lập được thì VẪN CHẠY và NÓI RA', () => {
    // Fail-closed ở đây nghĩa là không giấu, KHÔNG phải không chạy: máy dev là Windows, từ chối ở đó
    // nghĩa là không ai phát triển được sản phẩm này nữa.
    const i = SANDBOX_SRC.indexOf('private chayTrongSandbox');
    const than = SANDBOX_SRC.slice(i, SANDBOX_SRC.indexOf(NL + '  }', i));
    expect(than).toContain("this.coLap.muc === 'container'");
    expect(than, 'đường không cô lập phải còn — không được ném').toContain('shell: true');
    expect(SKILL_SRC).toContain('thongKe.co_lap = coLapThucTe;');
  });

  it('T_cong ⛔C1 — change không thêm đường nào cho máy merge', () => {
    for (const cam of ['mergePr', 'app.post']) expect(SANDBOX_SRC).not.toContain(cam);
  });

  it('T_hopdong ⛔C5 — export mới khai đủ `checkmate.yml`', () => {
    const yml = readFileSync('checkmate.yml', 'utf8');
    for (const ten of ['buildContainerArgs', 'detectIsolation', 'safeImageName', 'DEFAULT_IMAGE']) {
      expect(yml, `thiếu khai ${ten}`).toContain(ten);
    }
  });

  it('T5.1 — huỷ môi trường nằm ở nhánh dọn dẹp, chạy cả khi phần việc bên trong NÉM', () => {
    // Một container không huỷ là một tiến trình còn sống mang theo code của pull request.
    const i = SKILL_SRC.indexOf('const sb = new Sandbox(');
    const than = SKILL_SRC.slice(i, i + 700);
    expect(than).toContain('finally');
    expect(than).toContain('sb.huy()');
  });
});
