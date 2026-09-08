import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_IMAGE, safeImageName } from './sandbox.js';
import { checkDependencies, detectEcosystem } from './probe-preflight.js';

/**
 * Cài phụ thuộc cho bản clone repo đích — capability `dependency-provisioning`.
 *
 * ⛔ Đây là container DUY NHẤT của sản phẩm **có mạng**. Mọi quyết định trong file này là quyết định thu
 * hẹp bề mặt ấy; đọc `openspec/changes/dependency-install-in-container/security.md` trước khi nới bất cứ gì.
 */

/**
 * Ảnh chạy theo phiên bản Node chính — **bảng ĐÓNG, ghim theo DIGEST**.
 *
 * Thẻ trôi (`node:24`) làm hai lần cài cho ra hai cây phụ thuộc khác nhau, và trôi trong im lặng. Thêm
 * một hàng là một change, không phải một lần `pull`.
 *
 * ⛔ Số phiên bản đọc từ repo đích chỉ là **khoá tra bảng này** — MUST NOT ghép vào tên ảnh (⛔C4).
 * Ghép được nghĩa là repo bị chấm tự chọn môi trường mà bằng chứng của chính nó được tạo ra.
 */
export const IMAGE_BY_NODE_MAJOR: ReadonlyMap<number, string> = new Map([
  // node:22.17-bookworm-slim — ảnh mặc định đang dùng cho đường chạy probe, đo 07/09
  [22, DEFAULT_IMAGE],
  // node:24-bookworm-slim — kiểm trong ảnh 08/09: v24.20.0, npm 11.19.0, 235 MB
  [24, 'docker.io/library/node@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e'],
]);

/**
 * File khai phụ thuộc được chép sang thư mục cài — **danh sách ĐÓNG**.
 *
 * ⛔ Vì sao đóng, và vì sao KHÔNG chép cả bản clone: cờ chuyển-chủ-sở-hữu của runtime container chown
 * **đệ quy toàn bộ cây được mount**. Đo 07/09: mount cả bản clone làm nó chạm `.git`, hỏng giữa chừng, và
 * để lại **78 mục của bản clone thuộc một subuid** mà tài khoản dịch vụ không đọc được.
 *
 * Lý do sâu hơn chuyện chown: bản clone chứa **đối chứng của lượt chấm**. Cho bước cài ghi được vào đó là
 * mở một đường sửa `main` trong clone — tức đổi nhánh gốc mà verdict so sánh vào.
 *
 * Danh sách này SẼ bỏ sót hình dạng repo chưa gặp (workspace, `patches/`). Đó là hướng an toàn: cài hỏng
 * thì cửa kiểm của lượt chấm vẫn chặn và vẫn nói đúng bệnh.
 */
export const INSTALL_COPY_FILES: readonly string[] = ['package.json', 'package-lock.json', '.npmrc', '.nvmrc'];

/** Trần tài nguyên bước CÀI — lỏng hơn lượt chạy probe vì giải nén vài trăm gói cần nhiều hơn. */
export const INSTALL_MEMORY_CAP = '2g';
export const INSTALL_CPU_CAP = '2';
export const INSTALL_PIDS_CAP = 512;
/** Trần thời gian một lần cài (giây). Đo 08/09: `admin-fe` 246 gói mất 9 giây. */
export const INSTALL_TIMEOUT_S = 900;

export interface InstallResult {
  ok: boolean;
  /** Ảnh đã dùng — ghi ra để người vận hành biết cây phụ thuộc xây bằng runtime nào. */
  anh?: string;
  lenh?: string;
  giay?: number;
  /** Kết quả kiểm LẠI bằng chính cửa của `probe-environment`. `null` = đủ điều kiện. */
  con_thieu?: string | null;
  ly_do?: string;
}

/**
 * Ảnh dùng để cài, tra theo phiên bản Node repo đích khai.
 *
 * Thứ tự nguồn: `runner.image` repo khai thẳng → `.nvmrc` → `engines.node`. Không hàng nào khớp ⇒ **từ
 * chối**, MUST NOT lặng lẽ rơi về ảnh mặc định: rơi về mặc định là tái tạo đúng con bệnh mà cửa kiểm vừa
 * mất công làm cho nhìn thấy được (cây `node_modules` xây cho runtime này, chạy trên runtime khác).
 */
export function resolveInstallImage(repo: string, runnerImage?: string, doc = docFile): { anh?: string; ly_do?: string } {
  if (typeof runnerImage === 'string' && runnerImage.trim()) return { anh: safeImageName(runnerImage) };
  const major = nodeMajorWanted(repo, doc);
  if (major === null) return { anh: DEFAULT_IMAGE };
  const anh = IMAGE_BY_NODE_MAJOR.get(major);
  if (!anh) {
    return { ly_do: `Repo đích đòi Node ${major}, nhưng CheckMate chưa ghim ảnh cho phiên bản ấy. Thêm một hàng vào bản đồ ảnh là một change, không phải một lần pull.` };
  }
  return { anh };
}

/** Nội dung file trong repo đích, hoặc chuỗi rỗng. Tách thành tham số để lưới gọi được mà không cần đĩa. */
function docFile(p: string): string {
  try {
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  } catch {
    return '';
  }
}

/**
 * Phiên bản Node chính mà repo đích đòi: `.nvmrc` (chính xác) thắng `engines.node` (dải).
 *
 * ⛔ Chỉ lấy **số**; chuỗi gốc không bao giờ đi tiếp (⛔C4).
 */
export function nodeMajorWanted(repo: string, doc = docFile): number | null {
  const nvmrc = doc(join(repo, '.nvmrc')).trim();
  const tuNvmrc = nvmrc.match(/^v?(\d+)/);
  if (tuNvmrc) return Number(tuNvmrc[1]);
  const pkg = doc(join(repo, 'package.json'));
  if (!pkg) return null;
  try {
    const v = (JSON.parse(pkg) as { engines?: { node?: unknown } })?.engines?.node;
    if (typeof v !== 'string') return null;
    const m = v.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Đối số container cho bước CÀI — hàm THUẦN, và là **chỗ duy nhất trong sản phẩm bật mạng**.
 *
 * Bốn điều kiện đi cùng nhau, gỡ một cái là phá luật `sandbox-isolation › Ngoại lệ mạng CHỈ cho bước cài`:
 *   1. `--ignore-scripts` nằm trong lệnh ⇒ không code nào của repo đích chạy ở đây;
 *   2. chỉ mount **thư mục tạm**, không mount bản clone;
 *   3. không mount tài sản nào của CheckMate;
 *   4. vẫn đủ ba trần tài nguyên + cờ không-leo-quyền.
 *
 * Thứ nguy hiểm không phải mạng, cũng không phải code repo đích — mà là **giao** của hai cái. Điều kiện 1
 * cắt đúng giao ấy: thứ duy nhất chạy trong container có mạng là trình quản lý gói, chương trình của bên
 * **chấm**, không phải của bên **bị chấm**.
 */
export function buildInstallContainerArgs(spec: { thuMucCai: string; anh: string; lenh: readonly string[] }): string[] {
  return [
    'run', '--rm',
    `--memory=${INSTALL_MEMORY_CAP}`,
    `--cpus=${INSTALL_CPU_CAP}`,
    `--pids-limit=${INSTALL_PIDS_CAP}`,
    '--user', '1000:1000',
    '--security-opt', 'no-new-privileges',
    // Cache của trình quản lý gói vào tmpfs: nó có thể mang thông tin đăng nhập registry, và nó không
    // được ghi ra đĩa host.
    '--tmpfs', '/tmp',
    '-e', 'npm_config_cache=/tmp/npm',
    '-v', `${spec.thuMucCai}:/work:Z,U`,
    '-w', '/work',
    safeImageName(spec.anh),
    ...spec.lenh,
  ];
}

/** Lệnh cài — `--ignore-scripts` KHÔNG có công tắc (PO chốt 08/09). */
export function installCommand(coLockFile: boolean): string[] {
  return ['npm', coLockFile ? 'ci' : 'install', '--ignore-scripts', '--no-audit', '--no-fund'];
}

/**
 * Cài phụ thuộc cho bản clone. Hỏng ở BẤT KỲ bước nào ⇒ bản clone **nguyên trạng**.
 *
 * ⛔ Không tin mã thoát của trình cài: `npm ci` từng thoát 0 sau khi cài dở dang và để lại thư mục rỗng —
 * đo trên prod 07/09. Cài xong chạy **lại đúng cửa** `checkDependencies` của `probe-environment`; còn báo
 * thiếu ⇒ ghi **thất bại**. Dùng lại cửa cũ chứ không viết cửa thứ hai: hai biểu thức cho một luật thì sẽ
 * lệch, và khuôn ấy đã bị bắt chín lần ở repo này.
 */
export function installDependencies(repo: string, runnerImage?: string, chay = spawnSync): InstallResult {
  const he = detectEcosystem(repo);
  if (he !== 'node') {
    return { ok: false, ly_do: `CheckMate chỉ cài được phụ thuộc cho dự án Node; repo đích ${he === null ? 'không nhận ra hệ nào' : `là dự án ${he}`}.` };
  }
  const anhRa = resolveInstallImage(repo, runnerImage);
  if (!anhRa.anh) return { ok: false, ly_do: anhRa.ly_do };

  const w = mkdtempSync(join(tmpdir(), 'cm-install-'));
  const t0 = Date.now();
  try {
    let coPkg = false;
    for (const f of INSTALL_COPY_FILES) {
      const nguon = join(repo, f);
      if (!existsSync(nguon)) continue;
      copyFileSync(nguon, join(w, f));
      if (f === 'package.json') coPkg = true;
    }
    if (!coPkg) return { ok: false, anh: anhRa.anh, ly_do: 'Không tìm thấy package.json ở gốc repo đích — không có gì để cài.' };

    const lenh = installCommand(existsSync(join(repo, 'package-lock.json')));
    const argv = buildInstallContainerArgs({ thuMucCai: w, anh: anhRa.anh, lenh });
    const kq = chay('podman', argv, { encoding: 'utf8', timeout: INSTALL_TIMEOUT_S * 1000 });
    const giay = Math.round((Date.now() - t0) / 100) / 10;
    const moTaLenh = `podman run … ${anhRa.anh} ${lenh.join(' ')}`;
    if (kq.status !== 0 || kq.error) {
      return { ok: false, anh: anhRa.anh, lenh: moTaLenh, giay, ly_do: `Trình cài thất bại: ${(kq.stderr || kq.stdout || kq.error?.message || 'không có output').slice(0, 600)}` };
    }
    // Trả quyền sở hữu TRƯỚC khi chuyển: đảo hai bước là để lại một thư mục phụ thuộc không đọc được
    // nằm trong clone — hỏng im lặng, chỉ lộ ở lượt chấm sau.
    const tra = chay('podman', ['unshare', 'chown', '-R', '0:0', w], { encoding: 'utf8', timeout: 120_000 });
    if (tra.status !== 0) {
      return { ok: false, anh: anhRa.anh, lenh: moTaLenh, giay, ly_do: `Không trả được quyền sở hữu thư mục cài: ${(tra.stderr || '').slice(0, 300)}` };
    }
    const nguonNm = join(w, 'node_modules');
    if (!existsSync(nguonNm)) {
      return { ok: false, anh: anhRa.anh, lenh: moTaLenh, giay, ly_do: 'Trình cài báo thành công nhưng không sinh thư mục phụ thuộc nào.' };
    }
    const dichNm = join(repo, 'node_modules');
    rmSync(dichNm, { recursive: true, force: true });
    renameSync(nguonNm, dichNm);

    // ⛔C6 — kiểm LẠI bằng chính cửa đã báo thiếu, đọc đĩa ở thời điểm kiểm.
    const conThieu = checkDependencies(repo);
    if (conThieu) {
      return { ok: false, anh: anhRa.anh, lenh: moTaLenh, giay, con_thieu: conThieu.thong_diep, ly_do: 'Trình cài thoát 0 nhưng phép kiểm vẫn báo môi trường chưa đủ điều kiện.' };
    }
    return { ok: true, anh: anhRa.anh, lenh: moTaLenh, giay, con_thieu: null };
  } catch (e) {
    return { ok: false, anh: anhRa.anh, ly_do: `Bước cài hỏng: ${(e as Error).message.slice(0, 300)}` };
  } finally {
    try {
      // Thư mục tạm có thể còn mục thuộc subuid nếu hỏng trước bước trả quyền — dọn qua podman trước.
      if (existsSync(w) && readdirSync(w).length > 0) chay('podman', ['unshare', 'rm', '-rf', w], { encoding: 'utf8', timeout: 120_000 });
      rmSync(w, { recursive: true, force: true });
    } catch {
      /* dọn là best-effort; thư mục tạm không ảnh hưởng tính đúng của lượt chấm */
    }
  }
}
