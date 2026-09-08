import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
}> = [
  { he: 'node', ten: 'Node.js', dauHieu: ['package.json'], engineCapPhuThuoc: true },
  { he: 'maven', ten: 'Java/Maven', dauHieu: ['pom.xml'], engineCapPhuThuoc: false },
  { he: 'gradle', ten: 'Java/Gradle', dauHieu: ['build.gradle', 'build.gradle.kts'], engineCapPhuThuoc: false },
  { he: 'python', ten: 'Python', dauHieu: ['requirements.txt', 'pyproject.toml'], engineCapPhuThuoc: false },
];

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
    // ⛔ Hệ nhận ra được nhưng engine KHÔNG có kho phụ thuộc cho nó. Chặn SỚM và nói đúng tên hệ —
    // MUST NOT kê lệnh của hệ khác. Đo 08/09: kê `npm ci` cho repo Maven làm người vận hành chạy một
    // lệnh vô tác dụng rồi gặp lại đúng lỗi cũ, tức đi sai hướng một cách tự tin.
    const h = ecosystemRow(he);
    return {
      kind: 'he_chua_ho_tro',
      thong_diep:
        `Repo đích là dự án ${h.ten}, và CheckMate chưa cấp được phụ thuộc cho hệ này: môi trường chạy probe ` +
        'không có mạng và chưa có kho phụ thuộc nào ngoài Node. Lượt chấm code sẽ không chạy được test nào.',
      // KHÔNG có `cach_sua`: engine không biết lệnh nào đúng ở đây, và đoán một lệnh là tệ hơn im lặng.
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
export function preflightProbeEnvironment(input: { repo: string; nodeMoiTruong?: (() => string | null) | string | null }): {
  chan: PreflightIssue[];
  canhBao: PreflightIssue[];
} {
  const chan: PreflightIssue[] = [];
  const canhBao: PreflightIssue[] = [];
  const phuThuoc = checkDependencies(input.repo);
  if (phuThuoc) chan.push(phuThuoc);
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
export function looksLikeEnvironmentFailure(loi: unknown): PreflightIssueKind | 'moi_truong_khac' | null {
  const s = typeof loi === 'string' ? loi : '';
  if (!s) return null;
  // Bệnh 1 — không có mạng để tải gói: npm nói bằng mã, không bằng lời văn dịch được.
  if (/\bEAI_AGAIN\b|\bENOTFOUND\b|getaddrinfo/i.test(s)) return 'thieu_phu_thuoc';
  // Bệnh 2 — không ghi được vào thư mục phụ thuộc (mount chỉ đọc).
  if (/\bEROFS\b/i.test(s) || (/\bENOENT\b/i.test(s) && /node_modules/i.test(s))) return 'moi_truong_khac';
  // Bệnh 3 — runtime từ chối chạy: npm `engines`, hoặc Node từ chối cú pháp của bản mới hơn.
  if (/\bnotsup\b/i.test(s) || /Not compatible with your version of node/i.test(s)) return 'runtime_lech';
  // Không tìm thấy chính bộ chạy test.
  if (/\bENOENT\b/i.test(s) && /(vitest|jest|pytest|mvn|gradle)/i.test(s)) return 'moi_truong_khac';
  return null;
}

/** Lời cho người vận hành khi dừng vì môi trường — nói đúng bệnh, không nói về JUnit XML. */
export function describeEnvironmentFailure(kind: PreflightIssueKind | 'moi_truong_khac', repo: string): string {
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
      return `Môi trường chạy probe không có phụ thuộc của repo đích (dự án ${h?.ten ?? he}), và không có mạng để tải. CheckMate chưa cấp được phụ thuộc cho hệ này — không có lệnh nào chạy trong bản clone sửa được việc đó.`;
    }
    return `Môi trường chạy probe không có phụ thuộc của repo đích, và không có mạng để tải. Cài trong bản clone rồi chấm lại: cd ${repo} && npm ci --no-audit --no-fund`;
  }
  if (kind === 'runtime_lech') {
    return 'Môi trường chạy probe không đúng phiên bản runtime mà repo đích đòi. Khai `runner.image` trong checkmate.yml của repo đích, trỏ ảnh có đúng phiên bản.';
  }
  return 'Môi trường chạy probe không dựng được (không ghi được thư mục cần ghi, hoặc không tìm thấy bộ chạy test). Đây KHÔNG phải lỗi của pull request đang chấm.';
}
