import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DEFAULT_IMAGE, MAVEN_STORE_MOUNT, safeImageName } from './sandbox.js';
import { checkDependencies, detectEcosystem, repoStoreDir, type Ecosystem } from './probe-preflight.js';

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

/**
 * Ảnh cài cho hệ KHÔNG phải Node — bảng ĐÓNG, ghim theo DIGEST, cùng luật với bảng Node ở trên.
 *
 * ⛔ Cái giá của việc bỏ trình bao bọc của repo đích (`./mvnw`), khai thẳng vì làn `oapi-portal-be` khai
 * đúng nó: từ đây **phiên bản Maven do ảnh này quyết, repo đích không còn tiếng nói ở khâu ấy** — spine của
 * họ ghim công cụ cho máy lập trình viên và CI, còn máy chấm là môi trường thứ ba mà spine chưa nói tới.
 * Ghim digest không xoá được rủi ro ấy; nó chỉ biến một thay đổi vô hình thành **một dòng diff phải có
 * người duyệt**.
 */
export const IMAGE_BY_ECOSYSTEM: ReadonlyMap<Ecosystem, string> = new Map([
  // maven:3.9-eclipse-temurin-21 — kiểm TRONG ảnh 08/09: Maven 3.9.16, Java 21.0.12, 538 MB.
  // Digest đọc từ `podman images --digests` trên chính máy chấm, không chép từ ghi chú.
  ['maven' as Ecosystem, 'docker.io/library/maven@sha256:8f6ac126f7810bb5549c4cd122d2bf0e9cda5bdeb0838aa928f09e779fd8bef8'],
]);

/**
 * File khai phụ thuộc của hệ Maven — **danh sách ĐÓNG**, và cố ý HẸP HƠN thứ Maven thường đọc.
 *
 * ⛔ Vì sao KHÔNG chép `.mvn/`: thư mục ấy không phải dữ liệu, nó là **cần điều khiển**. `.mvn/maven.config`
 * thêm được cờ tuỳ ý vào chính lệnh CheckMate chạy (kể cả đè đường kho), và `.mvn/extensions.xml` nạp được
 * mã của bên thứ ba vào tiến trình Maven — trong **container duy nhất có mạng** của sản phẩm. Đó là để repo
 * **bị chấm** lái môi trường tạo ra bằng chứng chấm chính nó.
 *
 * Đo 08/09 trên cả hai repo Java đang dùng: `.mvn/` chỉ chứa `wrapper/maven-wrapper.properties`, mà trình
 * bao bọc thì change này đã bỏ. Nên cái giá của việc không chép là **bằng không** hôm nay, còn cái mở ra
 * nếu chép thì không đo được.
 */
export const INSTALL_COPY_FILES_MAVEN: readonly string[] = ['pom.xml'];

// ⛔ Đường mount kho sống ở `sandbox.ts` — MỘT chỗ cho cả hai đường (nạp và chạy probe). Khai lại ở đây
// là đúng khuôn cửa song sinh: hai hằng cho một luật, sửa một chỗ thì bước nạp ghi vào đường mà bước chạy
// không mount. Khuôn ấy đã bị bắt 11 lần trong repo này.

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
  /** Kho đã nạp (hệ có kho riêng). Vắng với hệ Node — nó cài thẳng vào bản clone. */
  kho?: string;
  /** Số mục ở tầng đầu của kho. ⛔ CHỈ số đếm, không bao giờ là tên tệp (⛔C3). */
  so_muc_kho?: number;
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
export function buildInstallContainerArgs(spec: { thuMucCai: string; anh: string; lenh: readonly string[]; thuMucKho?: string }): string[] {
  const a = [
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
  ];
  // Kho ĐÍCH của bước nạp — thư mục do CheckMate tạo và sở hữu, KHÔNG phải bản clone. Điều kiện 2 của
  // ngoại lệ mạng vẫn giữ nguyên: không mount tài sản nào của repo đích, không mount tài sản nào của
  // CheckMate ngoài chính cái kho đang được ghi.
  if (spec.thuMucKho) a.push('-v', `${spec.thuMucKho}:${MAVEN_STORE_MOUNT}:Z,U`);
  a.push('-w', '/work', safeImageName(spec.anh), ...spec.lenh);
  return a;
}

/** Lệnh cài — `--ignore-scripts` KHÔNG có công tắc (PO chốt 08/09). */
export function installCommand(coLockFile: boolean): string[] {
  return ['npm', coLockFile ? 'ci' : 'install', '--ignore-scripts', '--no-audit', '--no-fund'];
}

/**
 * Lệnh nạp kho Maven — **KHÔNG tham số**, cùng lý do `installCommand` không có tham số thứ hai: một tham
 * số ở đây là chỗ để ai đó nhét một công tắc.
 *
 * ⛔ MUST NOT mang cờ tắt cổng chất lượng của repo đích (`-D*.skip`, `-DskipTests`). `dependency:go-offline`
 * là lời gọi goal trực tiếp nên không kéo theo pha nào của vòng đời — nhưng cái ngăn cờ ấy xuất hiện ở đây
 * là **luật + lưới** `scanNoQualityGateBypass`, không phải sự tình cờ rằng hôm nay chưa ai cần nó.
 */
export function mavenInstallCommand(): string[] {
  return ['mvn', '-B', '-q', 'dependency:go-offline', `-Dmaven.repo.local=${MAVEN_STORE_MOUNT}`];
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
  if (he === 'maven') return installMavenStore(repo, chay);
  if (he !== 'node') {
    return { ok: false, ly_do: `CheckMate chưa cài được phụ thuộc cho hệ này; repo đích ${he === null ? 'không nhận ra hệ nào' : `là dự án ${he}`}.` };
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

/**
 * Nạp kho phụ thuộc RIÊNG cho một repo Maven.
 *
 * Khác hệ Node ở một điểm quyết định: kho **bền**, sống qua nhiều lượt chấm, nên có một cửa sổ mà hệ Node
 * không có — nạp lại **trong khi một lượt chấm đang mount kho ấy**. Probe chỉ đọc nên nó không hỏng kho,
 * nhưng nó đọc trúng một jar đang tải dở và chết với lỗi nói về artifact, tức lại **sai tên bệnh**.
 *
 * ⇒ Nạp vào `<kho>.new`, xong xuôi và đã mở quyền đọc mới **đổi tên đè**. Đổi tên là nguyên tử ở tầng thư
 * mục; container đang chạy giữ kho cũ qua inode nên nó chạy hết lượt với bản nguyên vẹn, còn lượt sau lấy
 * bản mới. Đây đúng nếp «ghi bản mới trước rồi mới xoá bản cũ» mà repo đã đặt cho dữ liệu prod.
 */
function installMavenStore(repo: string, chay: typeof spawnSync): InstallResult {
  const anh = IMAGE_BY_ECOSYSTEM.get('maven');
  if (!anh) return { ok: false, ly_do: 'CheckMate chưa ghim ảnh cho hệ Maven. Thêm một hàng vào bản đồ ảnh là một change, không phải một lần pull.' };

  const kho = repoStoreDir(repo);
  const khoMoi = `${kho}.new`;
  const w = mkdtempSync(join(tmpdir(), 'cm-install-'));
  const t0 = Date.now();
  const moTaLenh = `podman run … ${anh} ${mavenInstallCommand().join(' ')}`;
  try {
    let coPom = false;
    for (const f of INSTALL_COPY_FILES_MAVEN) {
      const nguon = join(repo, f);
      if (!existsSync(nguon)) continue;
      copyFileSync(nguon, join(w, f));
      if (f === 'pom.xml') coPom = true;
    }
    if (!coPom) return { ok: false, anh, ly_do: 'Không tìm thấy pom.xml ở gốc repo đích — không có gì để nạp.' };

    // Kho đích LUÔN dựng lại từ trống: nạp chồng lên một kho cũ làm «nạp thành công» không còn nghĩa là
    // «kho khớp pom.xml hiện tại», và không ai phát hiện được sai lệch ấy.
    donKho(khoMoi, chay);
    mkdirSync(khoMoi, { recursive: true });

    const argv = buildInstallContainerArgs({ thuMucCai: w, anh, lenh: mavenInstallCommand(), thuMucKho: khoMoi });
    const kq = chay('podman', argv, { encoding: 'utf8', timeout: INSTALL_TIMEOUT_S * 1000 });
    const giay = Math.round((Date.now() - t0) / 100) / 10;
    if (kq.status !== 0 || kq.error) {
      return { ok: false, anh, lenh: moTaLenh, giay, kho, ly_do: `Trình nạp thất bại: ${(kq.stderr || kq.stdout || kq.error?.message || 'không có output').slice(0, 600)}` };
    }

    // Trả quyền sở hữu TRƯỚC khi mở quyền đọc, và cả hai TRƯỚC khi đổi tên đè. Đảo thứ tự là để lại một
    // kho không đọc được ở đúng đường mà lượt chấm sau sẽ mount — hỏng im lặng.
    const tra = chay('podman', ['unshare', 'chown', '-R', '0:0', khoMoi], { encoding: 'utf8', timeout: 120_000 });
    if (tra.status !== 0) {
      return { ok: false, anh, lenh: moTaLenh, giay, kho, ly_do: `Không trả được quyền sở hữu kho: ${(tra.stderr || '').slice(0, 300)}` };
    }
    // ⛔ Đo 08/09: kho ở mode 0700 làm tiến trình trong container không vào được, và Maven báo «artifact
    // absent» — một câu nói về THIẾU GÓI trong khi bệnh là KHÔNG ĐỌC ĐƯỢC. Đúng họ con bệnh mà cả cửa
    // kiểm môi trường tồn tại để diệt, nên bước này là bắt buộc chứ không phải gia cố.
    const mo = chay('chmod', ['-R', 'a+rX', khoMoi], { encoding: 'utf8', timeout: 120_000 });
    if (mo.status !== 0) {
      return { ok: false, anh, lenh: moTaLenh, giay, kho, ly_do: `Không mở được quyền đọc kho: ${(mo.stderr || '').slice(0, 300)}` };
    }

    let soMuc = 0;
    try {
      soMuc = existsSync(khoMoi) ? readdirSync(khoMoi).length : 0;
    } catch {
      soMuc = 0;
    }
    if (soMuc === 0) {
      return { ok: false, anh, lenh: moTaLenh, giay, kho, ly_do: 'Trình nạp báo thành công nhưng kho không có mục nào.' };
    }

    mkdirSync(dirname(kho), { recursive: true });
    donKho(kho, chay);
    renameSync(khoMoi, kho);

    // ⛔C6 — kiểm LẠI bằng chính cửa đã báo thiếu, đọc đĩa ở thời điểm kiểm. Không tin mã thoát của trình nạp.
    const conThieu = checkDependencies(repo);
    if (conThieu) {
      return { ok: false, anh, lenh: moTaLenh, giay, kho, so_muc_kho: soMuc, con_thieu: conThieu.thong_diep, ly_do: 'Trình nạp thoát 0 nhưng phép kiểm vẫn báo môi trường chưa đủ điều kiện.' };
    }
    return { ok: true, anh, lenh: moTaLenh, giay, kho, so_muc_kho: soMuc, con_thieu: null };
  } catch (e) {
    return { ok: false, anh, kho, ly_do: `Bước nạp hỏng: ${(e as Error).message.slice(0, 300)}` };
  } finally {
    try {
      if (existsSync(w) && readdirSync(w).length > 0) chay('podman', ['unshare', 'rm', '-rf', w], { encoding: 'utf8', timeout: 120_000 });
      rmSync(w, { recursive: true, force: true });
      // Kho dở dang KHÔNG được để lại: lần nạp sau sẽ dựng lại nó, nhưng để lại thì nó chiếm vài trăm MB
      // mà không ai biết nó là gì. Kho THẬT không bị chạm ở đây — đó là điểm của lối đổi-tên-đè.
      if (existsSync(khoMoi)) donKho(khoMoi, chay);
    } catch {
      /* dọn là best-effort; nó không ảnh hưởng tính đúng của lượt chấm */
    }
  }
}

/** Xoá một thư mục kho, kể cả khi trong đó còn mục thuộc subuid của container. */
function donKho(duong: string, chay: typeof spawnSync): void {
  if (!existsSync(duong)) return;
  try {
    rmSync(duong, { recursive: true, force: true });
  } catch {
    /* rơi sang đường podman ngay dưới */
  }
  if (existsSync(duong)) chay('podman', ['unshare', 'rm', '-rf', duong], { encoding: 'utf8', timeout: 120_000 });
}
