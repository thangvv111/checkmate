import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  ECOSYSTEMS,
  checkDependencies,
  checkRuntime,
  detectEcosystem,
  readEnginesNode,
  majorFromRange,
  majorFromVersion,
  nodeVersionOfImage,
  preflightProbeEnvironment,
  looksLikeEnvironmentFailure,
  describeEnvironmentFailure,
} from '../packages/harness/src/probe-preflight.js';
import { TIMEOUT_RANGE, clampTimeout } from '../packages/harness/src/runner.js';

/**
 * Lưới cho capability `probe-environment` + cửa song sinh timeout của `target-contract`.
 *
 * Ba tầng theo luật `test-grid-integrity`:
 *   1. ca khoá từng gác, có đột biến làm ĐỎ (chạy tay, ghi ở test-cases.md)
 *   2. bề mặt xuyên suốt ĐẾM BẰNG MÁY — 8 lời gọi model, 2 chỗ gọi đường mặc định (số ở design.md)
 *   3. lưới quét mã nguồn có CẶP fixture — cái sai ĐỎ, cái đúng XANH
 */

// ---------- dựng repo giả trên đĩa ----------

function repoGia(pkg: unknown | null, nodeModules: 'khong' | 'rong' | 'day'): string {
  const d = mkdtempSync(join(tmpdir(), 'cm-preflight-'));
  if (pkg !== null) writeFileSync(join(d, 'package.json'), typeof pkg === 'string' ? pkg : JSON.stringify(pkg), 'utf8');
  if (nodeModules !== 'khong') {
    mkdirSync(join(d, 'node_modules'), { recursive: true });
    if (nodeModules === 'day') mkdirSync(join(d, 'node_modules', 'vitest'), { recursive: true });
  }
  return d;
}

const donDep: string[] = [];
function tam(pkg: unknown | null, nm: 'khong' | 'rong' | 'day'): string {
  const d = repoGia(pkg, nm);
  donDep.push(d);
  return d;
}

// ---------- TẦNG 3: lưới quét mã nguồn, có CẶP fixture ----------

/**
 * Cửa kiểm môi trường có đứng TRƯỚC mọi lời gọi model trong lượt chấm code không.
 *
 * So bằng **số dòng**, không bằng mắt: file dài hơn 1000 dòng và người sửa sau sẽ không đọc lại thứ tự.
 * Trả về danh sách vi phạm; rỗng nghĩa là đúng.
 */
export function scanPreflightBeforeModel(files: readonly string[], doc: (f: string) => string): string[] {
  const loi: string[] = [];
  for (const f of files) {
    const dong = doc(f).split(/\r?\n/);
    const iKiem = dong.findIndex((l) => l.includes('preflightProbeEnvironment('));
    const iModel = dong.findIndex((l) => /await (callJson|callCode)\b/.test(l));
    if (iKiem < 0) {
      loi.push(`${f}: KHÔNG tìm thấy cửa kiểm môi trường — lượt chấm code đang gọi model mà chưa kiểm gì`);
      continue;
    }
    if (iModel < 0) {
      loi.push(`${f}: không tìm thấy lời gọi model nào — mỏ neo của lưới đã đổi tên, lưới đang mù`);
      continue;
    }
    if (iKiem > iModel) {
      loi.push(`${f}: cửa kiểm ở dòng ${iKiem + 1} nằm SAU lời gọi model sớm nhất ở dòng ${iModel + 1}`);
    }
  }
  return loi;
}

/**
 * Đường chạy MẶC ĐỊNH có lấy trần thời gian từ MỘT nguồn không.
 *
 * Bắt hai cách hỏng khác nhau, và **cả hai đã cùng tồn tại** trước change này: (a) hằng mili-giây viết
 * thẳng vào lệnh cắt; (b) thông điệp hết giờ ghi cứng số giây thay vì đọc chính giá trị đã cắt. Đó đúng
 * là cửa song sinh — sửa một chỗ thì chỗ kia nói dối, và không ai biết cho tới khi đọc log.
 */
export function scanDefaultRunTimeout(files: readonly string[], doc: (f: string) => string): string[] {
  const loi: string[] = [];
  for (const f of files) {
    const nguon = doc(f);
    const chuKy = nguon.split(/\r?\n/).find((l) => /\bchayVitest\s*\(/.test(l) && !l.trim().startsWith('*'));
    if (chuKy === undefined) {
      loi.push(`${f}: không thấy đường chạy mặc định — mỏ neo đã đổi tên, lưới đang mù`);
      continue;
    }
    if (!/=\s*TIMEOUT_RANGE\.default/.test(chuKy)) {
      loi.push(`${f}: đường chạy mặc định KHÔNG lấy trần từ nguồn dùng chung — ${chuKy.trim().slice(0, 90)}`);
    }
    const than = nguon.slice(nguon.indexOf(chuKy)).slice(0, 2500);
    const catCung = than.match(/chayTrongSandbox\([^)]*,\s*\d[\d_]*\s*\)/);
    if (catCung) loi.push(`${f}: lệnh cắt dùng hằng thời gian viết thẳng — ${catCung[0]}`);
    const thongDiep = than.match(/TIMEOUT: [^`]*/);
    if (thongDiep && /\d+s\b/.test(thongDiep[0])) {
      loi.push(`${f}: thông điệp hết giờ ghi CỨNG số giây — ${thongDiep[0].slice(0, 70)}`);
    }
  }
  return loi;
}

/**
 * Nhánh «không thu thập được probe» có nhận diện lỗi MÔI TRƯỜNG **trước** khi sinh lại không.
 *
 * Ca đơn vị của `looksLikeEnvironmentFailure` chứng minh hàm phân loại đúng; nó KHÔNG chứng minh có ai
 * gọi hàm ấy đúng chỗ. Gỡ lời gọi ra khỏi nhánh thì mọi ca đơn vị vẫn xanh và engine lại đốt thêm một
 * lời gọi sinh code cho mỗi lỗi môi trường — đúng loại lưới-xanh-trên-hệ-thống-đã-hỏng mà luật
 * `test-grid-integrity` tầng 1 sinh ra để chặn.
 */
export function scanNoRetryOnEnvironmentFailure(files: readonly string[], doc: (f: string) => string): string[] {
  const loi: string[] = [];
  for (const f of files) {
    const nguon = doc(f);
    const iNhanh = nguon.indexOf('if (loiThu !== undefined) {');
    if (iNhanh < 0) {
      loi.push(`${f}: không thấy nhánh «không thu thập được probe» — mỏ neo đã đổi, lưới đang mù`);
      continue;
    }
    const than = nguon.slice(iNhanh, iNhanh + 2500);
    const iKiem = than.indexOf('looksLikeEnvironmentFailure(');
    const iSinhLai = than.indexOf('callCode(');
    if (iKiem < 0) {
      loi.push(`${f}: nhánh lỗi probe KHÔNG nhận diện lỗi môi trường — mọi lỗi môi trường sẽ được sinh lại`);
      continue;
    }
    if (iSinhLai >= 0 && iKiem > iSinhLai) {
      loi.push(`${f}: phép nhận diện lỗi môi trường nằm SAU lời gọi sinh lại — đã tốn token rồi mới hỏi`);
    }
  }
  return loi;
}

const NGUON_SKILL_CODE = resolve('packages/harness/src/skill-code.ts');
const NGUON_SANDBOX = resolve('packages/harness/src/sandbox.ts');

/** Fixture dựng bằng mảng rồi nối — tránh mọi ký tự thoát trong chuỗi nguồn giả. */
const noi = (...d: string[]): string => d.join('\n');

describe('tầng 3 — lưới quét mã nguồn có cặp fixture', () => {
  it('ĐỎ: fixture đặt cửa kiểm SAU lời gọi model', () => {
    const gia = noi('const runner = doc();', 'const ke = await callJson(model, p);', 'preflightProbeEnvironment({ repo });');
    const ra = scanPreflightBeforeModel(['gia.ts'], () => gia);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('nằm SAU');
  });

  it('XANH: fixture đặt cửa kiểm TRƯỚC lời gọi model', () => {
    const gia = noi('preflightProbeEnvironment({ repo });', 'const ke = await callJson(model, p);');
    expect(scanPreflightBeforeModel(['gia.ts'], () => gia)).toEqual([]);
  });

  it('ĐỎ khi mỏ neo biến mất — chống xanh oan', () => {
    expect(scanPreflightBeforeModel(['gia.ts'], () => 'const x = 1;')).toHaveLength(1);
    expect(scanPreflightBeforeModel(['gia.ts'], () => 'preflightProbeEnvironment({ repo });')[0]).toContain('lưới đang mù');
  });

  it('ĐỎ: fixture lấy trần từ hằng riêng thay vì nguồn dùng chung', () => {
    const gia = noi('  chayVitest(files: string[], timeoutS = 300): X {', '    this.chayTrongSandbox(lenh, 300_000);', '  }');
    const ra = scanDefaultRunTimeout(['gia.ts'], () => gia);
    expect(ra.some((x) => x.includes('KHÔNG lấy trần từ nguồn dùng chung'))).toBe(true);
    expect(ra.some((x) => x.includes('hằng thời gian viết thẳng'))).toBe(true);
  });

  it('ĐỎ: fixture ghi CỨNG số giây trong thông điệp — nửa còn lại của cửa song sinh', () => {
    const gia = noi(
      '  chayVitest(files: string[], timeoutS: number = TIMEOUT_RANGE.default): X {',
      '    this.chayTrongSandbox(lenh, timeoutS * 1000);',
      '    return { loiThu: `TIMEOUT: lệnh test không kết thúc trong 300s` };',
      '  }',
    );
    const ra = scanDefaultRunTimeout(['gia.ts'], () => gia);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('ghi CỨNG số giây');
  });

  it('XANH: fixture lấy trần từ nguồn dùng chung và thông điệp nội suy', () => {
    const gia = noi(
      '  chayVitest(files: string[], timeoutS: number = TIMEOUT_RANGE.default): X {',
      '    this.chayTrongSandbox(lenh, timeoutS * 1000);',
      '    return { loiThu: `TIMEOUT: lệnh test không kết thúc trong ${timeoutS}s` };',
      '  }',
    );
    expect(scanDefaultRunTimeout(['gia.ts'], () => gia)).toEqual([]);
  });

  it('ĐỎ khi mỏ neo đường chạy mặc định biến mất', () => {
    expect(scanDefaultRunTimeout(['gia.ts'], () => 'const kq = sb.chayGiKhac(files);')[0]).toContain('lưới đang mù');
  });

  it('ĐỎ: fixture nhánh lỗi probe sinh lại mà không hỏi có phải lỗi môi trường không', () => {
    const gia = noi('if (loiThu !== undefined) {', '  code = await callCode(model, p);', '  continue;', '}');
    const ra = scanNoRetryOnEnvironmentFailure(['gia.ts'], () => gia);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toContain('KHÔNG nhận diện lỗi môi trường');
  });

  it('ĐỎ: fixture hỏi SAU khi đã sinh lại — đã tốn token rồi mới hỏi', () => {
    const gia = noi(
      'if (loiThu !== undefined) {',
      '  code = await callCode(model, p);',
      '  if (looksLikeEnvironmentFailure(loiThu)) throw new Error(x);',
      '}',
    );
    expect(scanNoRetryOnEnvironmentFailure(['gia.ts'], () => gia)[0]).toContain('nằm SAU');
  });

  it('XANH: fixture hỏi TRƯỚC rồi mới sinh lại', () => {
    const gia = noi(
      'if (loiThu !== undefined) {',
      '  if (looksLikeEnvironmentFailure(loiThu)) throw new Error(x);',
      '  code = await callCode(model, p);',
      '}',
    );
    expect(scanNoRetryOnEnvironmentFailure(['gia.ts'], () => gia)).toEqual([]);
  });

  it('ĐỎ khi mỏ neo nhánh lỗi probe biến mất', () => {
    expect(scanNoRetryOnEnvironmentFailure(['gia.ts'], () => 'const x = 1;')[0]).toContain('lưới đang mù');
  });

  it('mã nguồn HIỆN TẠI sạch cả ba lưới', () => {
    const doc = (f: string): string => readFileSync(f, 'utf8');
    expect(scanPreflightBeforeModel([NGUON_SKILL_CODE], doc)).toEqual([]);
    expect(scanNoRetryOnEnvironmentFailure([NGUON_SKILL_CODE], doc)).toEqual([]);
    expect(scanDefaultRunTimeout([NGUON_SANDBOX], doc)).toEqual([]);
  });
});

// ---------- Requirement: kiểm TRƯỚC lời gọi model đầu tiên ----------

describe('checkDependencies — điều kiện mức CHẶN', () => {
  it('repo khai phụ thuộc, không có thư mục ⇒ chặn, thông điệp có lệnh cài', () => {
    const d = tam({ dependencies: { vitest: '^1' }, devDependencies: { typescript: '^5' } }, 'khong');
    const v = checkDependencies(d);
    expect(v?.kind).toBe('thieu_phu_thuoc');
    expect(v?.thong_diep).toContain('2 gói');
    expect(v?.cach_sua).toContain('npm install');
  });

  it('thư mục phụ thuộc RỖNG cũng là chặn — npm ci hỏng giữa chừng để lại đúng trạng thái này', () => {
    const d = tam({ dependencies: { vitest: '^1' } }, 'rong');
    expect(checkDependencies(d)?.kind).toBe('thieu_phu_thuoc');
    expect(checkDependencies(d)?.thong_diep).toContain('rỗng');
  });

  it('có lock file ⇒ lệnh sửa là npm ci, không phải npm install', () => {
    const d = tam({ dependencies: { vitest: '^1' } }, 'khong');
    writeFileSync(join(d, 'package-lock.json'), '{}', 'utf8');
    expect(checkDependencies(d)?.cach_sua).toContain('npm ci');
  });

  it('đã cài ⇒ không chặn', () => {
    expect(checkDependencies(tam({ dependencies: { vitest: '^1' } }, 'day'))).toBeNull();
  });

  it('không phải dự án Node ⇒ không kết luận', () => {
    expect(checkDependencies(tam(null, 'khong'))).toBeNull();
  });

  it('khai phụ thuộc RỖNG ⇒ không chặn, không có gì để cài', () => {
    expect(checkDependencies(tam({ dependencies: {} }, 'khong'))).toBeNull();
  });

  it('package.json hỏng ⇒ không kết luận, MUST NOT ném', () => {
    expect(() => checkDependencies(tam('{ hong', 'khong'))).not.toThrow();
    expect(checkDependencies(tam('{ hong', 'khong'))).toBeNull();
  });
});

describe('checkRuntime — điều kiện mức CẢNH BÁO', () => {
  it('repo đòi Node 24, môi trường Node 22 ⇒ cảnh báo nêu CẢ HAI phiên bản', () => {
    const d = tam({ engines: { node: '^24' } }, 'day');
    const v = checkRuntime(d, 'v22.17.1');
    expect(v?.kind).toBe('runtime_lech');
    expect(v?.thong_diep).toContain('^24');
    expect(v?.thong_diep).toContain('v22.17.1');
    expect(v?.cach_sua).toContain('runner.image');
  });

  it('cùng phần chính ⇒ im', () => {
    expect(checkRuntime(tam({ engines: { node: '>=22.11' } }, 'day'), 'v22.17.1')).toBeNull();
  });

  it('thiếu MỘT vế ⇒ không kết luận, không cảnh báo sai', () => {
    const d = tam({ engines: { node: '^24' } }, 'day');
    expect(checkRuntime(d, null)).toBeNull();
    expect(checkRuntime(d, undefined)).toBeNull();
    expect(checkRuntime(d, 'khong-phai-phien-ban')).toBeNull();
    expect(checkRuntime(tam({}, 'day'), 'v22.17.1')).toBeNull();
  });

  it('đọc phần chính từ nhiều dạng dải', () => {
    expect(majorFromRange('^24')).toBe(24);
    expect(majorFromRange('>=20.11.0')).toBe(20);
    expect(majorFromRange('22.x')).toBe(22);
    expect(majorFromRange(24)).toBeNull();
    expect(majorFromRange(undefined)).toBeNull();
    expect(majorFromVersion('v22.17.1')).toBe(22);
    expect(majorFromVersion('22.17.1')).toBe(22);
    expect(majorFromVersion('v22')).toBeNull();
    expect(majorFromVersion(null)).toBeNull();
  });
});

describe('preflightProbeEnvironment — chặn vs cảnh báo, và chi phí hỏi ảnh', () => {
  it('thiếu phụ thuộc ⇒ CHẶN; runtime lệch ⇒ CẢNH BÁO — không đảo hai loại', () => {
    const d = tam({ dependencies: { vitest: '^1' }, engines: { node: '^24' } }, 'khong');
    const r = preflightProbeEnvironment({ repo: d, nodeMoiTruong: 'v22.17.1' });
    expect(r.chan.map((x) => x.kind)).toEqual(['thieu_phu_thuoc']);
    expect(r.canhBao.map((x) => x.kind)).toEqual(['runtime_lech']);
  });

  it('repo KHÔNG khai engines ⇒ MUST NOT hỏi phiên bản của ảnh', () => {
    const d = tam({ dependencies: { vitest: '^1' } }, 'day');
    let hoi = 0;
    const r = preflightProbeEnvironment({
      repo: d,
      nodeMoiTruong: () => {
        hoi++;
        return 'v22.17.1';
      },
    });
    expect(hoi, 'hỏi ảnh là dựng một container — repo không khai thì câu trả lời vô dụng').toBe(0);
    expect(r.chan).toEqual([]);
    expect(r.canhBao).toEqual([]);
  });

  it('repo CÓ khai engines ⇒ hỏi đúng MỘT lần', () => {
    const d = tam({ dependencies: { vitest: '^1' }, engines: { node: '^24' } }, 'day');
    let hoi = 0;
    preflightProbeEnvironment({
      repo: d,
      nodeMoiTruong: () => {
        hoi++;
        return 'v22.17.1';
      },
    });
    expect(hoi).toBe(1);
  });

  it('môi trường đủ điều kiện ⇒ hai danh sách rỗng', () => {
    const r = preflightProbeEnvironment({ repo: tam({ dependencies: { vitest: '^1' } }, 'day'), nodeMoiTruong: 'v22.17.1' });
    expect(r.chan).toEqual([]);
    expect(r.canhBao).toEqual([]);
  });

  it('readEnginesNode chỉ nhận chuỗi', () => {
    expect(readEnginesNode(tam({ engines: { node: '^24' } }, 'day'))).toBe('^24');
    expect(readEnginesNode(tam({ engines: { node: 24 } }, 'day'))).toBeNull();
    expect(readEnginesNode(tam(null, 'day'))).toBeNull();
  });

  it('hỏi ảnh hỏng ⇒ null, MUST NOT ném', () => {
    const nem = (): never => {
      throw new Error('podman không có');
    };
    expect(nodeVersionOfImage('anh:1', nem as never)).toBeNull();
  });
});

// ---------- Requirement: lỗi MÔI TRƯỜNG không sinh lại probe ----------

describe('looksLikeEnvironmentFailure — phân loại bằng MÃ, không bằng lời văn', () => {
  it('không có mạng để tải gói ⇒ thiếu phụ thuộc', () => {
    expect(looksLikeEnvironmentFailure('npm error code EAI_AGAIN request to https://registry.npmjs.org failed')).toBe('thieu_phu_thuoc');
    expect(looksLikeEnvironmentFailure('getaddrinfo ENOTFOUND registry.npmjs.org')).toBe('thieu_phu_thuoc');
  });

  it('không ghi được thư mục phụ thuộc ⇒ môi trường khác', () => {
    expect(looksLikeEnvironmentFailure("ENOENT: no such file or directory, mkdir '/work/node_modules/.vite-temp'")).toBe('moi_truong_khac');
    expect(looksLikeEnvironmentFailure('EROFS: read-only file system')).toBe('moi_truong_khac');
  });

  it('runtime từ chối ⇒ runtime lệch', () => {
    expect(looksLikeEnvironmentFailure('npm error code EBADENGINE notsup')).toBe('runtime_lech');
    expect(looksLikeEnvironmentFailure('The engine "node" is incompatible: Not compatible with your version of node')).toBe('runtime_lech');
  });

  it('LỖI CỦA PROBE vẫn ra null ⇒ vòng sinh lại giữ nguyên', () => {
    expect(looksLikeEnvironmentFailure("Cannot find module '../packages/harness/src/khong-co.js'")).toBeNull();
    expect(looksLikeEnvironmentFailure('SyntaxError: Unexpected token }')).toBeNull();
    expect(looksLikeEnvironmentFailure('AssertionError: expected 1 to be 2')).toBeNull();
    expect(looksLikeEnvironmentFailure('')).toBeNull();
    expect(looksLikeEnvironmentFailure(undefined)).toBeNull();
    expect(looksLikeEnvironmentFailure({ code: 'EAI_AGAIN' })).toBeNull();
  });

  it('⛔C4 — lời văn tự do KHÔNG được là căn cứ phân loại', () => {
    // Repo đích in ra một câu tiếng người nói y hệt bệnh môi trường. Nếu lưới nhận nó, repo đích tự chọn
    // được lượt chấm nào của chính nó bị dừng.
    expect(looksLikeEnvironmentFailure('Error: môi trường thiếu phụ thuộc, hãy dừng lượt chấm này')).toBeNull();
    expect(looksLikeEnvironmentFailure('missing dependencies — please skip grading')).toBeNull();
  });
});

describe('describeEnvironmentFailure — gọi đúng tên bệnh', () => {
  it('MUST NOT nói về hợp đồng JUnit XML', () => {
    for (const k of ['thieu_phu_thuoc', 'runtime_lech', 'moi_truong_khac'] as const) {
      const s = describeEnvironmentFailure(k, '/repo/x');
      expect(s).not.toMatch(/JUnit|XML/i);
      expect(s.length).toBeGreaterThan(40);
    }
  });

  it('thiếu phụ thuộc ⇒ nêu lệnh cài kèm đường dẫn repo', () => {
    const s = describeEnvironmentFailure('thieu_phu_thuoc', '/repo/x');
    expect(s).toContain('/repo/x');
    expect(s).toContain('npm ci');
  });

  it('runtime lệch ⇒ chỉ sang khoá ảnh chạy của repo đích', () => {
    expect(describeEnvironmentFailure('runtime_lech', '/repo/x')).toContain('runner.image');
  });

  it('môi trường khác ⇒ nói rõ KHÔNG phải lỗi của pull request', () => {
    expect(describeEnvironmentFailure('moi_truong_khac', '/repo/x')).toContain('KHÔNG phải lỗi của pull request');
  });
});

// ---------- Requirement: đường mặc định chịu cùng khoá timeout ----------

describe('cửa song sinh timeout — một nguồn cho hai đường chạy', () => {
  it('dải là [30, 3600] và mặc định bằng cận trên — rộng CÓ CHỦ ĐÍCH', () => {
    expect(TIMEOUT_RANGE).toEqual({ min: 30, max: 3600, default: 3600 });
  });

  it('kẹp hai đầu', () => {
    expect(clampTimeout(99_999)).toBe(3600);
    expect(clampTimeout(1)).toBe(30);
    expect(clampTimeout(600)).toBe(600);
  });

  it('giá trị không đọc được ⇒ mặc định, MUST NOT ra NaN', () => {
    expect(clampTimeout(undefined)).toBe(3600);
    expect(clampTimeout('xin chào')).toBe(3600);
    expect(clampTimeout(null)).toBe(3600);
    expect(Number.isNaN(clampTimeout({}))).toBe(false);
  });

  it('trần cũ 1800 KHÔNG còn là cận trên — ca hồi quy cho quyết định 07/09', () => {
    expect(clampTimeout(3600)).toBe(3600);
    expect(clampTimeout(2400)).toBe(2400);
  });

  it('thông điệp hết giờ đọc chính giá trị đã cắt, không giữ hằng thứ hai', () => {
    const dong = readFileSync(NGUON_SANDBOX, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('TIMEOUT: lệnh test không kết thúc'));
    expect(dong).toHaveLength(1);
    expect(dong[0], 'thông điệp phải nội suy biến, không ghi cứng số giây').toContain('{timeoutS}');
  });
});

// ---------- Requirement: cửa kiểm và thông điệp đi theo HỆ SINH THÁI ----------

/** Bảng nhận diện hệ phải ĐÓNG, nằm trong mã, và mỗi hàng đủ trường. */
export function scanEcosystemTable(bang: readonly { he: string; ten: string; dauHieu: readonly string[]; engineCapPhuThuoc: boolean }[]): string[] {
  const loi: string[] = [];
  if (bang.length === 0) return ['bảng hệ sinh thái RỖNG — lưới đang mù'];
  for (const h of bang) {
    if (!h.ten.trim()) loi.push(`${h.he}: thiếu tên hiển thị — thông điệp sẽ nói trống`);
    if (h.dauHieu.length === 0) loi.push(`${h.he}: không có file dấu hiệu nào — không bao giờ nhận ra được`);
    for (const f of h.dauHieu) {
      if (f.includes('*') || f.includes('/')) loi.push(`${h.he}: dấu hiệu «${f}» là mẫu/đường dẫn, phải là TÊN FILE ở gốc`);
    }
  }
  if (!bang.some((h) => h.engineCapPhuThuoc)) loi.push('không hệ nào engine cấp được phụ thuộc — bảng sai, Node phải cấp được');
  return loi;
}

describe('nhận diện hệ sinh thái — bảng ĐÓNG (cặp fixture)', () => {
  it('ĐỎ: hàng thiếu file dấu hiệu, hoặc dấu hiệu là mẫu đường dẫn', () => {
    const xau = [
      { he: 'node', ten: 'Node.js', dauHieu: ['package.json'], engineCapPhuThuoc: true },
      { he: 'maven', ten: 'Java/Maven', dauHieu: [], engineCapPhuThuoc: false },
      { he: 'gradle', ten: '', dauHieu: ['**/build.gradle'], engineCapPhuThuoc: false },
    ];
    const ra = scanEcosystemTable(xau);
    expect(ra.some((x) => x.includes('không có file dấu hiệu'))).toBe(true);
    expect(ra.some((x) => x.includes('thiếu tên hiển thị'))).toBe(true);
    expect(ra.some((x) => x.includes('là mẫu/đường dẫn'))).toBe(true);
  });

  it('ĐỎ khi bảng rỗng — chống xanh oan', () => {
    expect(scanEcosystemTable([])[0]).toContain('lưới đang mù');
  });

  it('XANH: bảng HIỆN TẠI trong mã sạch, và có đủ bốn hệ', () => {
    expect(scanEcosystemTable(ECOSYSTEMS)).toEqual([]);
    expect(ECOSYSTEMS.map((e) => e.he)).toEqual(['node', 'maven', 'gradle', 'python']);
    // Change `maven-dependency-provisioning` nhận thêm Maven. Ca này khoá DANH SÁCH, không khoá số lượng:
    // thêm một hệ mà quên khai đường cấp phụ thuộc cho nó thì lưới phải đỏ ở đây.
    expect(ECOSYSTEMS.filter((e) => e.engineCapPhuThuoc).map((e) => e.he)).toEqual(['node', 'maven']);
  });

  it('detectEcosystem đọc đúng file dấu hiệu ở gốc', () => {
    const d = mkdtempSync(join(tmpdir(), 'cm-eco-'));
    donDep.push(d);
    expect(detectEcosystem(d), 'không có dấu hiệu nào ⇒ không kết luận').toBeNull();
    writeFileSync(join(d, 'pom.xml'), '<project/>', 'utf8');
    expect(detectEcosystem(d)).toBe('maven');
    // `package.json` đứng đầu bảng nên thắng khi có cả hai — repo lai vẫn đi đường Node, là đường duy
    // nhất engine cấp được phụ thuộc.
    writeFileSync(join(d, 'package.json'), '{}', 'utf8');
    expect(detectEcosystem(d)).toBe('node');
  });

  it('nhận ra Gradle qua cả hai tên file, và Python qua cả hai tên file', () => {
    for (const [f, mong] of [['build.gradle', 'gradle'], ['build.gradle.kts', 'gradle'], ['requirements.txt', 'python'], ['pyproject.toml', 'python']] as const) {
      const d = mkdtempSync(join(tmpdir(), 'cm-eco2-'));
      donDep.push(d);
      writeFileSync(join(d, f), 'x', 'utf8');
      expect(detectEcosystem(d), f).toBe(mong);
    }
  });
});

describe('⛔ CA CHỐNG TÁI PHÁT 08/09 — thông điệp KHÔNG được kê lệnh của hệ khác', () => {
  /**
   * Lỗi thật: repo `admin-be` (Java/Maven, không có `package.json` nào) nhận được thông điệp
   * «Cài trong bản clone rồi chấm lại: cd … && npm ci --no-audit --no-fund».
   * Lệnh ấy trong repo Maven không làm gì cả. Đây là ca giữ cho nó không quay lại.
   */
  const heKhongPhaiNode: Array<[string, string]> = [
    // ⛔ `pom.xml` ĐÃ RỜI danh sách này: change `maven-dependency-provisioning` cấp được phụ thuộc cho
    // Maven, nên bệnh của nó đổi từ «hệ chưa hỗ trợ» sang «chưa nạp kho». Phần KHÔNG đổi — thông điệp
    // không được kê lệnh của hệ khác — khoá cho CẢ HAI bệnh, xem ca ngay dưới.
    ['build.gradle', 'Java/Gradle'],
    ['requirements.txt', 'Python'],
  ];

  it('checkDependencies CHẶN repo không phải Node, và thông điệp nêu ĐÚNG TÊN HỆ', () => {
    for (const [f, ten] of heKhongPhaiNode) {
      const d = mkdtempSync(join(tmpdir(), 'cm-eco3-'));
      donDep.push(d);
      writeFileSync(join(d, f), 'x', 'utf8');
      const v = checkDependencies(d);
      expect(v?.kind, f).toBe('he_chua_ho_tro');
      expect(v?.thong_diep, f).toContain(ten);
      expect(v?.cach_sua, 'engine KHÔNG biết lệnh nào đúng ⇒ không kê lệnh nào').toBeUndefined();
    }
  });

  it('⛔ ca gốc 08/09 vẫn khoá cho Maven — đổi BỆNH chứ không đổi luật: không kê lệnh của hệ khác', () => {
    const d = mkdtempSync(join(tmpdir(), 'cm-eco3b-'));
    donDep.push(d);
    writeFileSync(join(d, 'pom.xml'), '<project/>', 'utf8');
    const v = checkDependencies(d);
    expect(v?.kind, 'Maven nay CẤP ĐƯỢC phụ thuộc ⇒ bệnh là chưa nạp kho').toBe('thieu_phu_thuoc');
    expect(v?.thong_diep).toContain('Java/Maven');
    expect(v?.cach_sua ?? '', 'lệnh npm trong repo Maven không làm gì cả — đây là lỗi thật 08/09').not.toContain('npm');
  });

  it('KHÔNG thông điệp nào của hệ không-Node chứa lệnh npm', () => {
    for (const [f] of heKhongPhaiNode) {
      const d = mkdtempSync(join(tmpdir(), 'cm-eco4-'));
      donDep.push(d);
      writeFileSync(join(d, f), 'x', 'utf8');
      const loi = [checkDependencies(d)?.thong_diep, checkDependencies(d)?.cach_sua, describeEnvironmentFailure('thieu_phu_thuoc', d), describeEnvironmentFailure('he_chua_ho_tro', d)]
        .filter((x): x is string => typeof x === 'string')
        .join(' | ');
      expect(loi, `${f}: thông điệp vẫn kê lệnh npm`).not.toMatch(/npm (ci|install)/);
      expect(loi).not.toMatch(/node_modules/);
    }
  });

  it('describeEnvironmentFailure cho hệ chưa hỗ trợ nói rõ KHÔNG phải lỗi của pull request', () => {
    const d = mkdtempSync(join(tmpdir(), 'cm-eco5-'));
    donDep.push(d);
    writeFileSync(join(d, 'pom.xml'), '<project/>', 'utf8');
    const s = describeEnvironmentFailure('he_chua_ho_tro', d);
    expect(s).toContain('Java/Maven');
    expect(s).toContain('KHÔNG phải lỗi của pull request');
    expect(s).not.toMatch(/npm|JUnit|XML/i);
  });

  it('⛔ HỒI QUY: repo Node đi Y HỆT đường cũ — không nhánh nào đổi', () => {
    const thieu = tam({ dependencies: { vitest: '^1' } }, 'khong');
    const v = checkDependencies(thieu);
    expect(v?.kind).toBe('thieu_phu_thuoc');
    expect(v?.cach_sua).toContain('npm install');
    expect(describeEnvironmentFailure('thieu_phu_thuoc', thieu)).toContain('npm ci');
    expect(checkDependencies(tam({ dependencies: { vitest: '^1' } }, 'day')), 'đã cài ⇒ vẫn không chặn').toBeNull();
    expect(checkDependencies(tam({ dependencies: {} }, 'khong')), 'khai rỗng ⇒ vẫn không chặn').toBeNull();
    expect(checkDependencies(tam(null, 'khong')), 'không dấu hiệu nào ⇒ vẫn không kết luận').toBeNull();
  });

  it('preflightProbeEnvironment chặn hệ chưa hỗ trợ TRƯỚC lời gọi model, và không hỏi ảnh', () => {
    const d = mkdtempSync(join(tmpdir(), 'cm-eco6-'));
    donDep.push(d);
    writeFileSync(join(d, 'build.gradle'), '', 'utf8');
    let hoi = 0;
    const r = preflightProbeEnvironment({
      repo: d,
      nodeMoiTruong: () => {
        hoi++;
        return 'v22.17.1';
      },
    });
    expect(r.chan.map((x) => x.kind)).toEqual(['he_chua_ho_tro']);
    expect(hoi, 'repo không khai engines.node ⇒ không dựng container hỏi phiên bản').toBe(0);
  });
});

// ---------- dọn ----------

describe('dọn thư mục tạm', () => {
  it('xoá hết repo giả đã dựng', () => {
    for (const d of donDep) rmSync(d, { recursive: true, force: true });
    expect(donDep.length).toBeGreaterThan(10);
  });
});
