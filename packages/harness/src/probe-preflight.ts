import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { GOC } from '../../shared/src/paths.js';

/**
 * Kiểm ĐIỀU KIỆN MÔI TRƯỜNG trước khi tốn một lời gọi model nào — capability `probe-environment`.
 *
 * ⛔ Vì sao tồn tại, đo được 07/09: một repo đích thiếu thư mục phụ thuộc làm lượt chấm đi hết ba lời gọi
 * model (lập kế hoạch → sinh code → **sinh lại**) rồi mới chết ở bước sandbox, với thông điệp «Runner
 * không xuất JUnit XML» — một câu nói về hợp đồng kết quả, trong khi bệnh là không có `node_modules`.
 * Đo trên sổ: khoảng 100 nghìn token vào cho ba lời gọi, tất cả bỏ đi. Một phép kiểm thư mục tốn vài
 * mili giây đứng trước chặn được toàn bộ.
 *
 * ⛔ Và MỘT thông điệp đang gánh BA bệnh khác hẳn nhau, cùng gặp trong một ngày:
 *   1. thiếu phụ thuộc          → `npx` đi tải, container `--network=none` ⇒ `EAI_AGAIN`
 *   2. phụ thuộc chỉ đọc         → vite không ghi được thư mục tạm ⇒ `ENOENT mkdir .vite-temp`
 *   3. runtime repo ≠ runtime ảnh → repo đòi Node 24, ảnh sandbox là Node 22
 * Bệnh 3 chưa từng lộ ra vì bệnh 1 chặn trước. File này phân biệt chúng và nói đúng tên bệnh.
 */

/** Vì sao môi trường chưa chạy được probe. Mã máy đọc — bề mặt đọc MUST NOT so khớp lời văn. */
export type PreflightIssueKind = 'thieu_phu_thuoc' | 'runtime_lech' | 'he_chua_ho_tro';

export interface PreflightIssue {
  kind: PreflightIssueKind;
  /** Lời cho NGƯỜI VẬN HÀNH: nói đúng bệnh và đúng việc phải làm. Không nói về JUnit XML. */
  thong_diep: string;
  /** Lệnh sửa, nếu có một lệnh sửa được. ⛔ Vắng khi engine KHÔNG biết lệnh nào đúng — xem `ECOSYSTEMS`. */
  cach_sua?: string;
}

/** Hệ sinh thái của repo đích. Mã máy đọc, KHÔNG phải nhãn hiển thị. */
export type Ecosystem = 'node' | 'maven' | 'gradle' | 'python';

/**
 * Bảng nhận diện hệ sinh thái — **ĐÓNG**, nằm trong mã.
 *
 * ⛔ Vì sao đóng và vì sao repo đích KHÔNG tự khai được hệ của mình: nếu khai được, một repo sẽ tự chọn
 * nhánh xử lý cho chính nó — kể cả chọn nhánh «Node, phụ thuộc đã đủ» để lách cửa kiểm. Thứ đến từ repo
 * đích ở đây chỉ là **một file có tồn tại hay không**; tên file là hằng của CheckMate (⛔C4).
 *
 * `engineCapPhuThuoc` = engine có đường nào cấp phụ thuộc cho môi trường chạy probe không. Hôm nay
 * container chỉ mount `node_modules` của bản clone — không có kho Maven, Gradle hay pip nào. Cờ này là
 * chỗ ghi sự thật ấy, để thông điệp không hứa một lệnh sửa không tồn tại.
 *
 * Vì sao bảng này ra đời — đo trên prod 08/09: `admin-be` (Java/Maven) nhận thông điệp «chạy `npm ci`».
 * Repo ấy không có `package.json` nào. Lượt chấm đã chạy 17 phút và tiêu 2 lời gọi model trước khi chết.
 */
export const ECOSYSTEMS: ReadonlyArray<{
  he: Ecosystem;
  ten: string;
  dauHieu: readonly string[];
  engineCapPhuThuoc: boolean;
  /**
   * Cách hệ này NÓI khi không tải được gói. Trống là hợp lệ với hệ engine chưa cấp phụ thuộc.
   *
   * ⛔ Cột này ra đời từ finding `F2` của làn `oapi-portal-be`. Trước nó, bệnh «không có mạng để tải gói»
   * được khai như một KHÁI NIỆM nhưng hiện thực bằng **từ vựng lỗi của đúng một hệ** (`EAI_AGAIN`,
   * `ENOTFOUND`, `getaddrinfo` — toàn npm). Thêm một hàng vào bảng này mà quên từ vựng thì hệ mới **lặng
   * lẽ mất khả năng chẩn đoán** mà chính bảng vừa hứa cho nó, và KHÔNG CÓ GÌ ĐỎ. Đó là cửa song sinh thứ
   * 11 của repo, và là cái đầu tiên có hai bản thể không nằm ở hai file cho người đọc thấy lệch — chúng
   * nằm ở một bảng và một chùm regex. Lưới `scanEcosystemDiagnosticParity` buộc hai cột đi cùng nhau.
   */
  mauLoiMang: readonly RegExp[];
}> = [
  {
    he: 'node',
    ten: 'Node.js',
    dauHieu: ['package.json'],
    engineCapPhuThuoc: true,
    mauLoiMang: [/\bEAI_AGAIN\b/i, /\bENOTFOUND\b/i, /getaddrinfo/i],
  },
  {
    he: 'maven',
    ten: 'Java/Maven',
    dauHieu: ['pom.xml'],
    engineCapPhuThuoc: true,
    // Đo trong ảnh `maven:3.9-eclipse-temurin-21` 08/09: Maven ngoại tuyến/không mạng nói bằng ba câu này.
    // ⛔ KHÔNG khớp `BUILD FAILURE` — câu ấy xuất hiện ở mọi kiểu hỏng, kể cả probe viết sai.
    mauLoiMang: [/UnknownHostException/i, /Could not resolve dependencies/i, /Could not transfer artifact/i],
  },
  { he: 'gradle', ten: 'Java/Gradle', dauHieu: ['build.gradle', 'build.gradle.kts'], engineCapPhuThuoc: false, mauLoiMang: [] },
  { he: 'python', ten: 'Python', dauHieu: ['requirements.txt', 'pyproject.toml'], engineCapPhuThuoc: false, mauLoiMang: [] },
];

/**
 * Gốc các kho phụ thuộc do CheckMate nuôi — **dữ liệu prod**, không được đè khi deploy.
 *
 * Kho sống qua nhiều lượt chấm (khác thư mục cài tạm của hệ Node, xoá ngay sau khi cài), nên nó thuộc
 * cùng hạng với `web-runs/` và `runs/`: mất nó không sai kết quả, nhưng phải nạp lại vài trăm MB.
 */
export const DEPENDENCY_STORE_ROOT = join(GOC, 'dep-stores');

/**
 * Kho phụ thuộc RIÊNG của một repo đích. Cùng repo ⇒ cùng đường; hai repo ⇒ hai đường.
 *
 * ⛔ Tên repo là **dữ liệu ngoài** (⛔C4): nó có thể mang `..`, dấu phân cách, khoảng trắng. Nên đường
 * KHÔNG ghép thẳng từ tên — phần đọc được chỉ để người vận hành nhận ra thư mục, còn phần phân biệt là
 * băm của đường tuyệt đối. Ghép thẳng là mở một đường leo ra khỏi gốc kho.
 */
export function repoStoreDir(repo: string): string {
  const day = resolve(repo);
  const doc = basename(day).replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 40) || 'repo';
  return join(DEPENDENCY_STORE_ROOT, `${doc}-${createHash('sha256').update(day).digest('hex').slice(0, 12)}`);
}

/**
 * Kho của repo này đã nạp xong chưa.
 *
 * Chỉ cần kiểm **có và không rỗng**, không cần đếm jar: bước nạp ghi vào `<kho>.new` rồi mới đổi tên đè,
 * nên một kho ĐANG TỒN TẠI ở đường thật là một kho đã nạp trọn. Nếu ngày nào đó bỏ lối đổi-tên-đè thì
 * phép kiểm này thành nói dối — đó là lý do hai thứ ấy được buộc vào nhau bằng ca test, không bằng trí nhớ.
 */
export function storeIsPopulated(repo: string): boolean {
  const kho = repoStoreDir(repo);
  try {
    return existsSync(kho) && readdirSync(kho).length > 0;
  } catch {
    return false;
  }
}

/**
 * Hệ sinh thái của repo đích, hoặc `null` khi không khớp hàng nào.
 *
 * Không khớp ⇒ **không kết luận**, và lượt chấm đi tiếp như hôm nay. Bỏ sót là hướng an toàn: nó rơi về
 * hành vi cũ, còn nhận nhầm thì chặn một lượt lẽ ra chạy được.
 */
export function detectEcosystem(repo: string): Ecosystem | null {
  for (const e of ECOSYSTEMS) {
    if (e.dauHieu.some((f) => existsSync(join(repo, f)))) return e.he;
  }
  return null;
}

/** Hàng của một hệ trong bảng đóng. */
function ecosystemRow(he: Ecosystem): (typeof ECOSYSTEMS)[number] {
  return ECOSYSTEMS.find((e) => e.he === he) ?? ECOSYSTEMS[0]!;
}

/**
 * Dự án Node có `package.json` khai phụ thuộc mà chưa cài — chặn CỨNG.
 *
 * `node_modules` rỗng và `node_modules` không tồn tại là cùng một bệnh: `npx` sẽ đi tải, và container
 * không có mạng. Đếm mục thay vì chỉ `existsSync` vì `npm ci` thất bại giữa chừng để lại thư mục rỗng —
 * đúng trạng thái gặp 07/09 với `admin-fe`.
 */
export function checkDependencies(repo: string): PreflightIssue | null {
  const he = detectEcosystem(repo);
  if (he === null) return null; // không nhận ra hệ nào — không kết luận, đi tiếp như hôm nay
  if (he !== 'node') {
    const h = ecosystemRow(he);
    // ⛔ Hệ nhận ra được nhưng engine KHÔNG có đường cấp phụ thuộc cho nó. Chặn SỚM và nói đúng tên hệ —
    // MUST NOT kê lệnh của hệ khác. Đo 08/09: kê `npm ci` cho repo Maven làm người vận hành chạy một
    // lệnh vô tác dụng rồi gặp lại đúng lỗi cũ, tức đi sai hướng một cách tự tin.
    if (!h.engineCapPhuThuoc) {
      return {
        kind: 'he_chua_ho_tro',
        thong_diep:
          `Repo đích là dự án ${h.ten}, và CheckMate chưa cấp được phụ thuộc cho hệ này: môi trường chạy probe ` +
          'không có mạng và chưa có kho phụ thuộc cho hệ ấy. Lượt chấm code sẽ không chạy được test nào.',
        // KHÔNG có `cach_sua`: engine không biết lệnh nào đúng ở đây, và đoán một lệnh là tệ hơn im lặng.
      };
    }
    // Hệ ĐƯỢC cấp phụ thuộc: bệnh không còn là «chưa hỗ trợ» mà là «chưa nạp kho». Hai câu ấy dẫn người
    // vận hành đi hai hướng khác hẳn — một câu bảo họ ngồi chờ CheckMate làm tính năng, câu kia bảo họ
    // bấm một nút. Trả nhầm câu là để họ chờ một thứ đã có.
    if (storeIsPopulated(repo)) return null;
    return {
      kind: 'thieu_phu_thuoc',
      thong_diep:
        `Repo đích là dự án ${h.ten} và CheckMate chưa nạp kho phụ thuộc cho repo này. Probe sẽ không chạy ` +
        'được: môi trường chạy test không có mạng, nên thiếu kho là thiếu toàn bộ thư viện.',
      // ⛔ KHÔNG kê một lệnh chạy trong bản clone: kho nằm phía CheckMate, không nằm trong repo đích, nên
      // không lệnh nào chạy trong clone sửa được. Đường đúng là nút cài phụ thuộc của chính CheckMate.
      cach_sua: 'Bấm «Cài phụ thuộc» cho repo này trong màn Cấu hình của CheckMate, rồi chấm lại.',
    };
  }
  const pkgPath = join(repo, 'package.json');
  if (!existsSync(pkgPath)) return null; // hệ Node nhận ra qua dấu hiệu khác — không có gì để kiểm
  let pkg: { dependencies?: unknown; devDependencies?: unknown };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as typeof pkg;
  } catch {
    return null; // package.json hỏng là chuyện của repo đích, không phải điều kiện môi trường
  }
  const soPhuThuoc = Object.keys((pkg.dependencies as object) ?? {}).length + Object.keys((pkg.devDependencies as object) ?? {}).length;
  if (soPhuThuoc === 0) return null;
  const nm = join(repo, 'node_modules');
  let soMuc = 0;
  try {
    soMuc = existsSync(nm) ? readdirSync(nm).length : 0;
  } catch {
    soMuc = 0;
  }
  if (soMuc > 0) return null;
  const lenh = existsSync(join(repo, 'package-lock.json')) ? 'npm ci --no-audit --no-fund' : 'npm install --no-audit --no-fund';
  return {
    kind: 'thieu_phu_thuoc',
    thong_diep:
      `Bản clone của repo đích chưa cài phụ thuộc (${soPhuThuoc} gói khai trong package.json, thư mục node_modules ${existsSync(nm) ? 'rỗng' : 'không tồn tại'}). ` +
      'Probe sẽ không chạy được: bộ chạy test đi tải gói từ registry, mà môi trường cô lập không có mạng.',
    cach_sua: `cd ${repo} && ${lenh}`,
  };
}

/**
 * Cờ trong `runner.test_cmd` của repo đích ĐÈ MẤT cờ CheckMate cấp qua môi trường — trả cờ vi phạm.
 *
 * ⛔ Đo trên máy chấm 08/09, và đây là lý do phép kiểm này tồn tại chứ không phải một lời khuyên:
 *
 * ```
 * MAVEN_ARGS="-o -Dmaven.repo.local=/m2"  mvn -X validate                        -> Using local repository at /m2
 * MAVEN_ARGS="-o -Dmaven.repo.local=/m2"  mvn -X validate -Dmaven.repo.local=/khac -> Using local repository at /khac
 * ```
 *
 * Cờ trên dòng lệnh **THẮNG** biến môi trường. Nên một repo đích khai `-Dmaven.repo.local` trong `test_cmd`
 * sẽ trỏ Maven vào một đường KHÔNG tồn tại trong container; cộng với `--network=none`, Maven báo «artifact
 * absent» — lại đúng con bệnh **sai tên bệnh** mà cả nhịp một sinh ra để diệt.
 *
 * Chặn ở cửa sớm thay vì để nó chạy rồi đoán: «không nên xảy ra» không phải một cơ chế.
 */
export function conflictingStoreFlags(testCmd: unknown): string | null {
  const s = typeof testCmd === 'string' ? testCmd : '';
  if (!s) return null;
  if (/-Dmaven\.repo\.local\b/.test(s)) return '-Dmaven.repo.local';
  // `-o` một mình thì vô hại (CheckMate cũng đặt nó), nhưng nó khai rằng repo đang tự lo phần kho — và
  // repo tự lo thì khi CheckMate đổi đường mount, không cổng nào ở repo đỏ. Nói ra sớm.
  if (/(^|\s)-o(\s|$)|(^|\s)--offline(\s|$)/.test(s)) return '-o';
  return null;
}

/** Lấy phần chính của dải `engines.node` (`^24`, `>=20.11`, `22.x`) — số nguyên đầu tiên. */
export function majorFromRange(range: unknown): number | null {
  if (typeof range !== 'string') return null;
  const m = range.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Lấy phần chính từ chuỗi `node -v` (`v22.17.1`). */
export function majorFromVersion(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/v?(\d+)\./);
  return m ? Number(m[1]) : null;
}

/**
 * Repo đòi một phiên bản Node chính khác phiên bản của môi trường sẽ chạy test.
 *
 * ⚠ Chỉ so PHẦN CHÍNH và chỉ khi cả hai đọc được. Thiếu một vế thì **không kết luận** — một cảnh báo sai
 * ở đây làm người vận hành đi sửa thứ không hỏng, và lần sau họ bỏ qua cả cảnh báo thật.
 */
export function checkRuntime(repo: string, nodeCuaMoiTruong: string | null | undefined): PreflightIssue | null {
  const engines = readEnginesNode(repo);
  const doi = majorFromRange(engines);
  const co = majorFromVersion(nodeCuaMoiTruong);
  if (doi === null || co === null || doi === co) return null;
  return {
    kind: 'runtime_lech',
    thong_diep:
      `Repo đích đòi Node ${String(engines)} (engines.node) nhưng môi trường chạy probe là Node ${nodeCuaMoiTruong}. ` +
      'Test của repo có thể không chạy, và lỗi khi ấy KHÔNG nói gì về pull request đang chấm.',
    cach_sua: 'Khai `runner.image` trong checkmate.yml của repo đích, trỏ một ảnh có đúng phiên bản Node.',
  };
}

/** `engines.node` của repo đích, hoặc `null`. Tách riêng để cửa gọi biết CÓ CẦN hỏi ảnh hay không. */
export function readEnginesNode(repo: string): string | null {
  const pkgPath = join(repo, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const v = (JSON.parse(readFileSync(pkgPath, 'utf8')) as { engines?: { node?: unknown } })?.engines?.node;
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** Đọc phiên bản Node của một ảnh container. `null` khi không hỏi được — KHÔNG đoán. */
export function nodeVersionOfImage(anh: string, chay: typeof execFileSync = execFileSync): string | null {
  try {
    return String(chay('podman', ['run', '--rm', '--network=none', anh, 'node', '-v'], { encoding: 'utf8', timeout: 60_000 })).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Toàn bộ phép kiểm trước lượt chấm. Trả danh sách vấn đề, rỗng nghĩa là đi tiếp được.
 *
 * `thieu_phu_thuoc` là CHẶN CỨNG — không lời gọi model nào được phát. `runtime_lech` là CẢNH BÁO: nó có
 * thể vẫn chạy được (repo khai `engines` chặt hơn thực tế cần), nên chặn cứng ở đây sẽ chặn oan.
 */
export function preflightProbeEnvironment(input: { repo: string; nodeMoiTruong?: (() => string | null) | string | null; testCmd?: string | null }): {
  chan: PreflightIssue[];
  canhBao: PreflightIssue[];
} {
  const chan: PreflightIssue[] = [];
  const canhBao: PreflightIssue[] = [];
  const phuThuoc = checkDependencies(input.repo);
  if (phuThuoc) chan.push(phuThuoc);
  // ⛔ CHẶN CỨNG, không cảnh báo: cờ ấy thắng cờ CheckMate cấp (đo được), nên chạy tiếp là cầm chắc một
  // thông điệp nói sai bệnh. Thà dừng và nói đúng chỗ phải sửa.
  const dungDo = ECOSYSTEMS.find((e) => e.he === detectEcosystem(input.repo))?.engineCapPhuThuoc && detectEcosystem(input.repo) !== 'node'
    ? conflictingStoreFlags(input.testCmd)
    : null;
  if (dungDo) {
    chan.push({
      kind: 'thieu_phu_thuoc',
      thong_diep:
        `\`runner.test_cmd\` của repo đích mang cờ \`${dungDo}\`, và cờ trên dòng lệnh ĐÈ cờ CheckMate cấp qua ` +
        'môi trường. Kết quả: bộ chạy test trỏ vào một kho không có trong container, rồi báo thiếu gói — một ' +
        'thông điệp nói sai bệnh.',
      cach_sua: `Bỏ \`${dungDo}\` khỏi \`runner.test_cmd\` trong checkmate.yml của repo đích. Repo khai CHẠY CÁI GÌ, CheckMate khai KHO Ở ĐÂU.`,
    });
  }
  // ⚠ Chỉ hỏi phiên bản Node của ảnh khi repo CÓ khai `engines.node`. Hỏi là chạy một container, tốn
  // khoảng một giây mỗi lượt; repo không khai thì câu trả lời không dùng vào đâu cả.
  if (readEnginesNode(input.repo) !== null) {
    const node = typeof input.nodeMoiTruong === 'function' ? input.nodeMoiTruong() : (input.nodeMoiTruong ?? null);
    const runtime = checkRuntime(input.repo, node);
    if (runtime) canhBao.push(runtime);
  }
  return { chan, canhBao };
}

/**
 * Lỗi từ bộ chạy test có phải lỗi MÔI TRƯỜNG không — tức thứ probe không gây ra và không sửa được.
 *
 * ⛔ Đây là ranh giới quyết định «có sinh lại probe hay không». Sinh lại chỉ đúng khi probe viết sai; với
 * lỗi môi trường nó tốn thêm một lời gọi sinh code (~80k token vào) rồi hỏng y hệt.
 *
 * Nhận diện bằng **mã lỗi và hình dạng đường dẫn**, không bằng lời văn tự do — lời văn đến từ npm, từ
 * Node, từ chính repo đích, và nó là dữ liệu ngoài (⛔C4). Danh sách ĐÓNG, mỗi mục một bệnh đã gặp thật.
 */
export function looksLikeEnvironmentFailure(loi: unknown): PreflightIssueKind | 'moi_truong_khac' | 'repo_gate_blocked' | null {
  const s = typeof loi === 'string' ? loi : '';
  if (!s) return null;
  // Bệnh 1 — không có mạng để tải gói. Từ vựng lấy từ BẢNG hệ sinh thái, không viết rời ở đây: viết rời
  // là cách hệ Maven đã lặng lẽ mất chẩn đoán suốt từ lúc nó được thêm vào bảng (`F2`, làn `oapi-portal-be`).
  if (ECOSYSTEMS.some((e) => e.mauLoiMang.some((m) => m.test(s)))) return 'thieu_phu_thuoc';
  // Cổng chất lượng của repo đích chặn probe — KHÔNG phải lỗi probe, nên sinh lại là vô ích.
  if (qualityGateFromLog(s) !== null) return 'repo_gate_blocked';
  // Bệnh 2 — không ghi được vào thư mục phụ thuộc (mount chỉ đọc).
  if (/\bEROFS\b/i.test(s) || (/\bENOENT\b/i.test(s) && /node_modules/i.test(s))) return 'moi_truong_khac';
  // Bệnh 3 — runtime từ chối chạy: npm `engines`, hoặc Node từ chối cú pháp của bản mới hơn.
  if (/\bnotsup\b/i.test(s) || /Not compatible with your version of node/i.test(s)) return 'runtime_lech';
  // Không tìm thấy chính bộ chạy test.
  if (/\bENOENT\b/i.test(s) && /(vitest|jest|pytest|mvn|gradle)/i.test(s)) return 'moi_truong_khac';
  return null;
}

/**
 * Cổng chất lượng của REPO ĐÍCH đã chặn bản dựng — trả tên cổng, hoặc `null`.
 *
 * ⛔ Neo vào **tên plugin**, KHÔNG vào **pha** và KHÔNG vào chuỗi `BUILD FAILURE`. Ba lý do, tất cả đo được:
 *
 * 1. `BUILD FAILURE` xuất hiện ở **mọi** kiểu hỏng, kể cả probe do model sinh viết sai cú pháp. Khớp nó là
 *    nuốt luôn ca sinh-lại-đúng — đổi một lỗi chẩn đoán lấy một lỗi tệ hơn, vì người vận hành sẽ đi sửa
 *    cấu hình cho một thứ không hỏng.
 * 2. Pha là thứ phải đi hỏi **tài liệu của đội khác**. Đo 08/09: spine của một đội đích tự mâu thuẫn —
 *    bảng số ghim nói `validate`, bảng tóm tắt nói `verify`, và cổng kiểm của họ xanh trong khi văn bản sai.
 *    Neo theo pha là để chẩn đoán của CheckMate sai theo một nguồn nó không kiểm soát và không có quyền sửa.
 * 3. Tên plugin hiện ra trong log của **chính lượt chạy** — nó là bằng chứng tại chỗ, không phải lời khai.
 *
 * Bảng ĐÓNG. Thêm hàng là một change: mỗi hàng nói «cổng này chặn probe thì đừng sinh lại probe», và đó là
 * một quyết định về việc tiêu hay không tiêu lời gọi model.
 */
export const QUALITY_GATE_PLUGINS: ReadonlyArray<{ mau: RegExp; ten: string }> = [
  // Đo trên prod 08/09 với `admin-be`: bind vào pha chạy trước test ⇒ probe JUnit HỢP LỆ vẫn làm bản dựng
  // thất bại trước khi một test nào chạy. Repo đích tự khai cờ bỏ qua thì chạy đúng ngay.
  { mau: /spotless-maven-plugin|spotless[.:]/i, ten: 'Spotless (kiểm định dạng mã)' },
  { mau: /maven-checkstyle-plugin|checkstyle[.:]/i, ten: 'Checkstyle (kiểm quy ước mã)' },
  { mau: /spotbugs-maven-plugin|spotbugs[.:]/i, ten: 'SpotBugs (kiểm tĩnh)' },
  { mau: /maven-pmd-plugin/i, ten: 'PMD (kiểm tĩnh)' },
  { mau: /maven-enforcer-plugin/i, ten: 'Enforcer (cưỡng chế quy tắc dựng)' },
];

export function qualityGateFromLog(loi: unknown): string | null {
  const s = typeof loi === 'string' ? loi : '';
  if (!s) return null;
  // ⛔ Trình biên dịch gãy là lỗi của CHÍNH tệp probe ⇒ sinh lại ĐÚNG. Loại nó ra trước khi tra bảng, chứ
  // không dựa vào chuyện bảng «tình cờ» không có hàng nào khớp: một hàng thêm sau này sẽ phá giả định ấy.
  if (/maven-compiler-plugin|COMPILATION ERROR/i.test(s)) return null;
  return QUALITY_GATE_PLUGINS.find((g) => g.mau.test(s))?.ten ?? null;
}

/**
 * Lời cho người vận hành khi dừng vì môi trường — nói đúng bệnh, không nói về JUnit XML.
 *
 * `log` là bản NGUYÊN VĂN của lỗi, dùng để rút tên cổng đã chặn. Nó chỉ đi vào lời văn qua **tên trong
 * bảng đóng** ở trên, không bao giờ vọng nguyên văn ra (⛔C3/⛔C4).
 */
export function describeEnvironmentFailure(kind: PreflightIssueKind | 'moi_truong_khac' | 'repo_gate_blocked', repo: string, log?: unknown): string {
  if (kind === 'repo_gate_blocked') {
    const cong = qualityGateFromLog(log);
    return (
      `Bản dựng của repo đích thất bại TRƯỚC khi test chạy, do cổng chất lượng của chính repo${cong ? `: ${cong}` : ''}. ` +
      'Probe do CheckMate sinh không qua được cổng ấy, nên không có báo cáo test nào. Đây KHÔNG phải lỗi của ' +
      'pull request đang chấm, và CheckMate MUST NOT tự tắt cổng của repo đích — đội repo tự khai cờ bỏ qua ' +
      'trong `runner.test_cmd` của `checkmate.yml` nếu họ quyết định probe không phải chịu cổng ấy.'
    );
  }
  if (kind === 'he_chua_ho_tro') {
    const h = ECOSYSTEMS.find((e) => e.he === detectEcosystem(repo));
    return `Repo đích là dự án ${h?.ten ?? 'không thuộc hệ engine hỗ trợ'}, và CheckMate chưa cấp được phụ thuộc cho hệ này. Đây KHÔNG phải lỗi của pull request đang chấm, và cũng không phải thứ đội repo sửa được.`;
  }
  if (kind === 'thieu_phu_thuoc') {
    // ⛔ Lệnh sửa phải thuộc ĐÚNG hệ của repo đích. Đo 08/09: câu này từng kê `npm ci` cho một repo
    // Maven — lệnh không làm gì cả, và người vận hành chạy xong sẽ gặp lại đúng lỗi cũ. Một thông điệp
    // kê nhầm thuốc tệ hơn một thông điệp chỉ nêu triệu chứng: cái sau làm người ta đi tìm, cái trước
    // làm người ta đi sai hướng một cách tự tin.
    const he = detectEcosystem(repo);
    if (he !== null && he !== 'node') {
      const h = ECOSYSTEMS.find((e) => e.he === he);
      const chung = `Môi trường chạy probe không có phụ thuộc của repo đích (dự án ${h?.ten ?? he}), và không có mạng để tải.`;
      // Hai câu khác hẳn nhau, và trả nhầm là để người vận hành chờ một thứ đã có sẵn.
      return h?.engineCapPhuThuoc
        ? `${chung} Bấm «Cài phụ thuộc» cho repo này trong màn Cấu hình của CheckMate rồi chấm lại — kho nằm phía CheckMate, không lệnh nào chạy trong bản clone sửa được.`
        : `${chung} CheckMate chưa cấp được phụ thuộc cho hệ này — không có lệnh nào chạy trong bản clone sửa được việc đó.`;
    }
    return `Môi trường chạy probe không có phụ thuộc của repo đích, và không có mạng để tải. Cài trong bản clone rồi chấm lại: cd ${repo} && npm ci --no-audit --no-fund`;
  }
  if (kind === 'runtime_lech') {
    return 'Môi trường chạy probe không đúng phiên bản runtime mà repo đích đòi. Khai `runner.image` trong checkmate.yml của repo đích, trỏ ảnh có đúng phiên bản.';
  }
  return 'Môi trường chạy probe không dựng được (không ghi được thư mục cần ghi, hoặc không tìm thấy bộ chạy test). Đây KHÔNG phải lỗi của pull request đang chấm.';
}

// ---- Kết cục của mồi hợp đồng runner (capability `probe-environment`, change `runner-contract-selftest`) ----

/** Bối cảnh để thông điệp trỏ ĐÚNG NÚM và đúng chỗ — người vận hành sửa `checkmate.yml`, không sửa probe. */
export interface CanaryOutcomeContext {
  /** Đường file probe engine đã ghi, tương đối trong sandbox (`src/checker_probe.test.tsx`). */
  probePath: string;
  probeDir: string;
  probeExt: string;
  /** Repo có khai `runner.test_cmd` hay đi đường vitest mặc định. */
  hasTestCmd: boolean;
  /** Nhánh nơi kết cục xảy ra — chỉ đường thật đặt; mồi để trống. */
  nhanh?: 'pr' | 'goc';
}

/**
 * Câu cho người vận hành theo kết cục mồi — bảng ĐÓNG kết cục → câu, cùng nếp `describeEnvironmentFailure`.
 *
 * Luật (`probe-environment › Thông điệp môi trường…`): nêu BỆNH và VIỆC PHẢI LÀM bằng **tên núm** của
 * `checkmate.yml`, vì chỗ sửa nằm phía repo đích và đó là những cái tên duy nhất họ gõ được. MUST NOT nói
 * «probe viết sai» hay «pull request có lỗi» — đo 17/09, câu «Probe không thu thập được sau 2 lần sinh» đã
 * điều hướng người đọc đi sửa probe trong khi bệnh là `include` của vitest ở repo đích.
 *
 * Đầu ra bộ chạy (stdout/stderr) KHÔNG nối ở đây: nó là dữ liệu của repo đích (⛔C3), bên gọi che rồi nối.
 */
export function describeCanaryOutcome(
  kind: 'probe_not_collected' | 'runner_output_missing' | 'canary_not_in_output' | 'canary_not_failed',
  ctx: CanaryOutcomeContext,
): string {
  const oDau = ctx.nhanh === 'pr' ? ' (ở nhánh pull request)' : ctx.nhanh === 'goc' ? ' (ở nhánh gốc)' : '';
  const duong = ctx.hasTestCmd ? '`runner.test_cmd` của checkmate.yml' : 'đường vitest mặc định (repo không khai `runner.test_cmd`)';
  if (kind === 'probe_not_collected') {
    return (
      `Bộ chạy test của repo đích không nhặt file probe${oDau}: engine ghi probe vào \`${ctx.probePath}\` ` +
      `(\`runner.probe_dir\` = \`${ctx.probeDir}\`, \`runner.probe_ext\` = \`${ctx.probeExt}\`), nhưng phạm vi thu thập ` +
      'của bộ chạy repo đích không phủ đường ấy — 0 test được ghi nhận và không có lỗi nạp file nào. ' +
      'Sửa ở checkmate.yml của repo đích: khai `runner.probe_dir` và `runner.probe_ext` trỏ vào chỗ bộ chạy của họ ' +
      'thu thập (ví dụ `include` của vitest, `testMatch` của jest, `testpaths` của pytest, `<includes>` của surefire). ' +
      'Đây KHÔNG phải lỗi của pull request đang chấm.'
    );
  }
  if (kind === 'runner_output_missing') {
    return (
      `Bộ chạy test của repo đích không để lại file kết quả${oDau} khi chạy ${duong}. ` +
      'Thường là template nuốt thất bại (`&&` trước bước ghi kết quả, glob không khớp, hoặc bộ chạy chết trước khi ghi). ' +
      'Kiểm `runner.test_cmd` với hai chỗ thay `{files}` và `{out}`: lệnh phải ghi file `{out}` ngay cả khi test đỏ. ' +
      'Đây KHÔNG phải lỗi của pull request đang chấm.'
    );
  }
  if (kind === 'canary_not_in_output') {
    return (
      `Đầu ra của bộ chạy${oDau} có test nhưng không chứa phép thử engine vừa ghi vào \`${ctx.probePath}\`. ` +
      'Có thể `runner.test_cmd` bỏ qua `{files}` và chạy toàn bộ bộ test của repo, hoặc `{out}` trỏ vào một file cũ của ' +
      'lượt khác. Kiểm `runner.test_cmd` trong checkmate.yml của repo đích. Đây KHÔNG phải lỗi của pull request đang chấm.'
    );
  }
  return (
    `Bộ chạy test của repo đích báo đạt cho một phép thử cố tình đỏ${oDau} — một bộ chạy như thế sẽ báo xanh cho mọi hồi quy, ` +
    `nên CheckMate không thể tin bất kỳ kết quả nào từ nó. Kiểm ${duong}: cờ bỏ qua thất bại, bộ đọc kết quả sai file, ` +
    'hoặc thư viện khẳng định bị vô hiệu. Đây KHÔNG phải lỗi của pull request đang chấm.'
  );
}
