import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseJUnit, docRunnerCfg, docReviewCfg } from '../packages/harness/src/runner.js';

// Hợp đồng với repo đích (specs/R2-hop-dong-repo-dich.md): checkmate.yml khai cách chạy test và
// tri thức nghiệp vụ; kết quả về theo JUnit XML. Repo khai sai KHÔNG được làm sập lượt chấm.

let thuMuc = '';
const viet = (yml: string): string => {
  writeFileSync(join(thuMuc, 'checkmate.yml'), yml, 'utf8');
  return thuMuc;
};

beforeAll(() => {
  thuMuc = mkdtempSync(join(tmpdir(), 'checkmate-test-'));
});
afterAll(() => {
  rmSync(thuMuc, { recursive: true, force: true });
});

describe('docRunnerCfg', () => {
  it('không có checkmate.yml thì trả null để rơi về đường vitest mặc định', () => {
    expect(docRunnerCfg(join(thuMuc, 'khong-ton-tai'))).toBeNull();
  });

  it('thiếu test_cmd thì coi như không khai runner', () => {
    expect(docRunnerCfg(viet('runner:\n  framework: pytest\n'))).toBeNull();
  });

  it('đọc đủ trường và điền mặc định cho phần repo không khai', () => {
    const c = docRunnerCfg(viet('runner:\n  test_cmd: "pytest {files} --junitxml={out}"\n  framework: pytest\n'));
    expect(c?.test_cmd).toContain('{files}');
    expect(c?.probe_dir).toBe('test');
  });

  it('kẹp timeout vào dải an toàn — repo khai 99999 không được giữ máy chủ mãi mãi', () => {
    expect(docRunnerCfg(viet('runner:\n  test_cmd: "x {files} {out}"\n  timeout_s: 99999\n'))?.timeout_s).toBe(1800);
    expect(docRunnerCfg(viet('runner:\n  test_cmd: "x {files} {out}"\n  timeout_s: 1\n'))?.timeout_s).toBe(30);
  });
});

describe('docReviewCfg', () => {
  it('yml hỏng thì fail-safe về mặc định, không ném lỗi làm hỏng lượt chấm', () => {
    expect(docReviewCfg(viet('review:\n  khuon_loi: [\n'))).toBeNull();
  });

  it('trả về ReviewCfg TRỰC TIẾP, không bọc trong {review}', () => {
    // Hợp đồng này từng bị một probe hiểu nhầm và đẻ ra finding báo sai — ghim lại cho rõ.
    const c = docReviewCfg(viet('review:\n  bo_qua_diff:\n    - "^_ref/"\n'));
    expect((c as unknown as { review?: unknown })?.review).toBeUndefined();
    expect(c?.bo_qua_diff).toEqual(['^_ref/']);
  });

  it('chỉ khai bo_qua_diff (không khuôn lỗi, không severity) vẫn đọc được, không trả null', () => {
    const c = docReviewCfg(viet('review:\n  bo_qua_diff:\n    - "^_ref/"\n    - "^build/"\n'));
    expect(c).not.toBeNull();
    expect(c?.bo_qua_diff).toHaveLength(2);
  });

  it('mẫu SAI CÚ PHÁP regex bị bỏ ngay tại cửa đọc, mẫu đúng vẫn giữ (P6, vòng bảy)', () => {
    // Để mẫu hỏng đi tiếp thì `new RegExp` ở chỗ dùng sẽ ném và làm sập lượt chấm — repo đích gõ
    // nhầm một dấu ngoặc không được phép giết cổng. Ca này trước đây KHẲNG ĐỊNH giữ cả mẫu hỏng.
    const c = docReviewCfg(viet('review:\n  bo_qua_diff:\n    - "^_ref/"\n    - "[chua-dong-ngoac"\n'));
    expect(c?.bo_qua_diff).toEqual(['^_ref/']);
  });

  it('đọc được khuôn lỗi và thang severity riêng của repo', () => {
    const c = docReviewCfg(viet('review:\n  khuon_loi:\n    - "vượt quyền giữa hai chi nhánh"\n  severity_map:\n    high: "rò dữ liệu sang tenant khác"\n'));
    expect(c?.khuon_loi).toEqual(['vượt quyền giữa hai chi nhánh']);
    expect(c?.severity_map?.high).toContain('tenant');
  });
});

describe('parseJUnit', () => {
  const xml = (than: string): string => `<?xml version="1.0"?><testsuites><testsuite name="s">${than}</testsuite></testsuites>`;

  it('đọc được pass / fail / skip trong một suite', () => {
    const kq = parseJUnit(
      xml('<testcase name="P1: ok"/><testcase name="P2: đỏ"><failure message="expected 500 to be 200"/></testcase><testcase name="P3: bỏ"><skipped/></testcase>'),
      'checker.probe.test.ts',
    );
    expect(kq.map((k) => k.status)).toEqual(['passed', 'failed', 'skipped']);
    expect(kq[1].message).toContain('expected 500');
  });

  it('<failure/> RỖNG vẫn là failed — kiểm sự có mặt của thẻ, không kiểm nội dung', () => {
    const kq = parseJUnit(xml('<testcase name="P1"><failure/></testcase>'), 'f.ts');
    expect(kq[0].status).toBe('failed');
  });

  it('gom được testcase trong suite lồng nhau (pytest/surefire hay xuất kiểu này)', () => {
    const kq = parseJUnit(
      '<testsuites><testsuite name="ngoai"><testsuite name="trong"><testcase name="P1"/></testsuite></testsuite></testsuites>',
      'f.ts',
    );
    expect(kq).toHaveLength(1);
    expect(kq[0].title).toBe('P1');
  });

  it('XML không phải JUnit thì trả danh sách rỗng, không ném', () => {
    expect(parseJUnit('<khac/>', 'f.ts')).toEqual([]);
  });
});
